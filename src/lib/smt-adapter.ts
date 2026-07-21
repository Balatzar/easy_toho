import { unstable_cache } from "next/cache";
import type { SmtCinemaConfig } from "./cinemas";
import {
  type PlanningDay,
  type SourcePlanningDay,
  createPlanningWindow,
} from "./planning-window";
import {
  SOURCE_CACHE_SECONDS,
  type LanguageRank,
  type MovieCard,
  type ScheduleResult,
  type Showtime,
  type ShowtimeAvailability,
  classifyLanguage,
  compactDateToDate,
  createMovieCard,
  dateToCompactDate,
  extractFormats,
  hidePastShowtimes,
  languageLabel,
  movieIdentityId,
  normalizeTime,
  sortMovieCards,
  toHalfWidth,
} from "./schedule-model";
import {
  fetchTextWithTimeout,
  htmlText,
} from "./source-adapter-support";

const SMT_BASE = "https://www.smt-cinema.com";
const SMT_SCHEDULE_BASE = `${SMT_BASE}/html/site/pc/schedule`;

type SmtMovieGroup = {
  rawEnglishLabels: Set<string>;
  sourceLabels: Set<string>;
  runtimeMinutes: number | null;
  rating: string | null;
  artworkUrl: string | null;
  showtimes: Showtime[];
};

export async function getPlanningDays(
  config: SmtCinemaConfig,
): Promise<PlanningDay[]> {
  try {
    const sourceDays = await getCachedPlanningDays(
      config.schedulePrefix,
      config.theaterCode,
    );

    if (sourceDays.length === 0) throw new Error("SMT returned no planning days.");
    return createPlanningWindow(sourceDays, new Date());
  } catch {
    return createPlanningWindow(undefined, new Date());
  }
}

const getCachedPlanningDays = unstable_cache(
  async (
    schedulePrefix: string,
    theaterCode: string,
  ): Promise<SourcePlanningDay[]> => {
    const html = await fetchSmtText(
      `${SMT_SCHEDULE_BASE}/${schedulePrefix}_${theaterCode}_schedule_daily_date_area.html`,
      6_000,
    );

    return parsePlanningDays(html);
  },
  ["smt-planning-days-v1"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

export async function getSchedule(
  config: SmtCinemaConfig,
  selectedDate: string,
): Promise<ScheduleResult> {
  try {
    const schedule = await getCachedScheduleSnapshot(
      config.schedulePrefix,
      config.theaterCode,
      selectedDate,
    );

    return hidePastShowtimes(schedule, selectedDate, new Date());
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not fetch live SMT showtimes right now.",
      fetchedAt: new Date().toISOString(),
    };
  }
}

const getCachedScheduleSnapshot = unstable_cache(
  async (
    schedulePrefix: string,
    theaterCode: string,
    selectedDate: string,
  ): Promise<Extract<ScheduleResult, { ok: true }>> => {
    const fetchedAt = new Date().toISOString();
    const compactDate = dateToCompactDate(selectedDate);
    const html = await fetchSmtText(
      `${SMT_SCHEDULE_BASE}/${schedulePrefix}_${theaterCode}_${compactDate}_schedule_daily_movie_area.html`,
      8_000,
    );

    return {
      ok: true,
      cards: sortMovieCards(parseMovieCards(html)),
      fetchedAt,
    };
  },
  ["smt-schedule-snapshot-v2"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

function parsePlanningDays(html: string): SourcePlanningDay[] {
  return Array.from(
    html.matchAll(/<div id="(\d{4}_\d{8})" class="([^"]*)">/g),
  ).map((match) => {
    const [, id, className] = match;
    const [, compactDate] = id.split("_");
    const classes = className.split(/\s+/);

    return {
      date: compactDateToDate(compactDate),
      selectable: !classes.includes("ng"),
    };
  });
}

function parseMovieCards(html: string): MovieCard[] {
  const groups = new Map<string, SmtMovieGroup>();
  const movieStarts = Array.from(
    html.matchAll(/<section class="(\d+)\s+([A-Z]\d+)">/g),
  );

  for (const [index, match] of movieStarts.entries()) {
    const blockStart = match.index ?? 0;
    const blockEnd = movieStarts[index + 1]?.index ?? html.length;
    const block = html.slice(blockStart, blockEnd);
    const movie = parseMovieBlock(block);

    if (!movie || movie.showtimes.length === 0) continue;

    let group = groups.get(movie.id);
    if (!group) {
      group = {
        rawEnglishLabels: new Set(),
        sourceLabels: new Set(),
        runtimeMinutes: movie.runtimeMinutes,
        rating: movie.rating,
        artworkUrl: movie.artworkUrl,
        showtimes: [],
      };
      groups.set(movie.id, group);
    }

    if (movie.rawEnglishLabel) group.rawEnglishLabels.add(movie.rawEnglishLabel);
    if (movie.sourceLabel) group.sourceLabels.add(movie.sourceLabel);
    group.runtimeMinutes ??= movie.runtimeMinutes;
    group.rating ??= movie.rating;
    group.artworkUrl ??= movie.artworkUrl;
    group.showtimes.push(...movie.showtimes);
  }

  return Array.from(groups.values()).map(toMovieCard);
}

function parseMovieBlock(block: string): {
  id: string;
  rawEnglishLabel: string | null;
  sourceLabel: string;
  runtimeMinutes: number | null;
  rating: string | null;
  artworkUrl: string | null;
  showtimes: Showtime[];
} | null {
  const h2Html = block.match(/<h2>([\s\S]*?)<\/h2>/)?.[1];
  if (!h2Html) return null;

  const rawEnglishLabel = htmlText(
    h2Html.match(/<span class="enLabel">([\s\S]*?)<\/span>/)?.[1] ?? "",
  );
  const sourceTitleHtml = h2Html.replace(
    /<span class="enLabel">[\s\S]*?<\/span>/,
    "",
  );
  const sourceTitle = htmlText(sourceTitleHtml);
  const runtimeMinutes = parseRuntimeMinutes(sourceTitle);
  const sourceLabel = cleanSourceMovieLabel(sourceTitle);
  const rowFormats = extractFormats(rawEnglishLabel, sourceLabel);
  const rowEventLabel = eventLabel(sourceLabel, parseTags(block));
  const language = classifyLanguage(rawEnglishLabel, sourceLabel);
  const showtimes = parseShowtimes(block, rowFormats, rowEventLabel, language);
  const sourceLabels = [sourceLabel];
  const rawEnglishLabels = rawEnglishLabel ? [rawEnglishLabel] : [];

  return {
    id: movieIdentityId({
      rawEnglishLabels,
      sourceLabels,
      runtimeMinutes,
      sourceId: "smt",
    }),
    rawEnglishLabel: rawEnglishLabel || null,
    sourceLabel,
    runtimeMinutes,
    rating: htmlText(block.match(/<p class="rating">([\s\S]*?)<\/p>/)?.[1] ?? "") || null,
    artworkUrl: normalizeUrl(
      block.match(/<img\s+src="([^"]+)"/)?.[1] ?? null,
    ),
    showtimes,
  };
}

function parseShowtimes(
  block: string,
  rowFormats: string[],
  rowEventLabel: string | null,
  language: LanguageRank,
): Showtime[] {
  const showtimes: Showtime[] = [];
  const innerRegex =
    /<div class="inner\s+([^"]*)" id="([^"]+)">([\s\S]*?)<\/div>/g;

  for (const match of block.matchAll(innerRegex)) {
    const [, className, , content] = match;
    const screen = findNearestScreen(block.slice(0, match.index ?? 0));
    const time = content.match(
      /<p class="time">\s*<span>\s*([^<]+?)\s*<\/span>\s*([^<]+?)\s*<\/p>/,
    );
    if (!time) continue;

    const availabilityMatch = content.match(
      /<span\s+class="sheet\s+([^"]+)">([\s\S]*?)<\/span>/,
    );
    const availabilityLabel = htmlText(availabilityMatch?.[2] ?? "");
    const availability = smtAvailability(
      availabilityMatch?.[1] ?? className,
      availabilityLabel,
    );

    showtimes.push({
      start: normalizeTime(time[1]),
      end: normalizeTime(time[2]),
      screen,
      formats: rowFormats,
      language,
      languageLabel: languageLabel(language),
      availability,
      availabilityLabel: availabilityLabel || "Unknown",
      eventLabel: rowEventLabel,
    });
  }

  return showtimes;
}

function toMovieCard(group: SmtMovieGroup): MovieCard {
  const rawEnglishLabels = Array.from(group.rawEnglishLabels);
  const sourceLabels = Array.from(group.sourceLabels);

  return createMovieCard({
    sourceId: "smt",
    rawEnglishLabels,
    sourceLabels,
    artworkUrl: group.artworkUrl,
    runtimeMinutes: group.runtimeMinutes,
    rating: group.rating,
    showtimes: group.showtimes,
  });
}

function parseRuntimeMinutes(value: string): number | null {
  const match = value.match(/本編\s*[:：]\s*(\d+)\s*分/);
  return match ? Number(match[1]) : null;
}

function cleanSourceMovieLabel(value: string): string {
  return value
    .replace(/[（(]\s*本編\s*[:：]\s*\d+\s*分\s*[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findNearestScreen(prefix: string): string {
  const screens = Array.from(prefix.matchAll(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g));
  const latest = screens.at(-1)?.[1];
  return htmlText(latest ?? "") || "Screen";
}

function parseTags(block: string): string[] {
  const tagBlock = block.match(/<p class="tag">([\s\S]*?)<\/p>/)?.[1] ?? "";
  return Array.from(tagBlock.matchAll(/<span(?:\s+class="[^"]*")?>([\s\S]*?)<\/span>/g))
    .map((match) => htmlText(match[1]))
    .filter(Boolean);
}

function eventLabel(sourceLabel: string, tags: string[]): string | null {
  if (/舞台挨拶/.test(sourceLabel)) return "Stage greeting";
  if (tags.includes("特別興行")) return "Special event";
  return null;
}

function smtAvailability(
  className: string,
  label: string,
): ShowtimeAvailability {
  const normalized = toHalfWidth(label);

  if (/販売前|準備|未販売/.test(normalized)) return "notSelling";
  if (/残|△/.test(normalized)) return "limited";
  if (/販売終了|満席|完売|×/.test(normalized)) return "soldOut";
  if (/余裕|◎|○/.test(normalized) || className.includes("ok")) {
    return "available";
  }

  return "unknown";
}

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  return new URL(url, SMT_BASE).toString();
}

async function fetchSmtText(url: string, timeoutMs: number): Promise<string> {
  return fetchTextWithTimeout(url, {
    timeoutMs,
    cache: "no-store",
    errorMessage: (response) => `SMT request failed with ${response.status}`,
  });
}
