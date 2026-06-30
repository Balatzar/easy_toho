import { unstable_cache } from "next/cache";
import type { EigaCinemaConfig } from "./cinemas";
import {
  SOURCE_CACHE_SECONDS,
  type LanguageRank,
  type MovieCard,
  type PlanningDay,
  type ScheduleResult,
  type Showtime,
  type ShowtimeAvailability,
  bestLanguage,
  compactDateToDate,
  dateToCompactDate,
  displayTitle,
  extractFormats,
  fallbackPlanningDays,
  hidePastShowtimes,
  languageLabel,
  movieIdentityId,
  normalizeTime,
  sortMovieCards,
  sortShowtimes,
  toPlanningDay,
  unique,
  upcomingPlanningDays,
} from "./schedule-model";

const EIGA_BASE = "https://eiga.com";
const EIGA_SCREEN_LABEL = "Screen not listed";

type EigaMovieDetail = {
  originalTitle: string | null;
  runtimeMinutes: number | null;
};

type ParsedEigaMovie = {
  providerMovieId: string;
  sourceLabel: string;
  runtimeMinutes: number | null;
  rating: string | null;
  artworkUrl: string | null;
  rawShowtimes: RawEigaShowtime[];
};

type RawEigaShowtime = Omit<Showtime, "end" | "languageLabel"> & {
  explicitEnd: string | null;
};

export async function getPlanningDays(
  config: EigaCinemaConfig,
): Promise<PlanningDay[]> {
  try {
    const days = upcomingPlanningDays(
      await getCachedPlanningDays(config.theaterPath),
    );

    if (days.length === 0) throw new Error("eiga.com returned no planning days.");
    return days;
  } catch {
    return fallbackPlanningDays();
  }
}

const getCachedPlanningDays = unstable_cache(
  async (theaterPath: string): Promise<PlanningDay[]> => {
    const html = await fetchText(eigaUrl(theaterPath), 8_000);
    return parsePlanningDays(html);
  },
  ["eiga-planning-days-v1"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

export async function getSchedule(
  config: EigaCinemaConfig,
  selectedDate: string,
): Promise<ScheduleResult> {
  try {
    const schedule = await getCachedScheduleSnapshot(
      config.theaterPath,
      selectedDate,
    );

    return hidePastShowtimes(schedule, selectedDate, new Date());
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not fetch live eiga.com showtimes right now.",
      fetchedAt: new Date().toISOString(),
    };
  }
}

const getCachedScheduleSnapshot = unstable_cache(
  async (
    theaterPath: string,
    selectedDate: string,
  ): Promise<Extract<ScheduleResult, { ok: true }>> => {
    const fetchedAt = new Date().toISOString();
    const html = await fetchText(eigaUrl(theaterPath), 10_000);

    return {
      ok: true,
      cards: sortMovieCards(await parseMovieCards(html, selectedDate)),
      fetchedAt,
    };
  },
  ["eiga-schedule-snapshot-v2"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

const getCachedMovieDetail = unstable_cache(
  async (providerMovieId: string): Promise<EigaMovieDetail> => {
    const html = await fetchText(`${EIGA_BASE}/movie/${providerMovieId}/`, 8_000);
    return parseMovieDetail(html);
  },
  ["eiga-movie-detail-v1"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

function parsePlanningDays(html: string): PlanningDay[] {
  const dates = new Set<string>();

  for (const match of html.matchAll(/<option[^>]*value="(\d{8})"[^>]*>/g)) {
    dates.add(compactDateToDate(match[1]));
  }

  if (dates.size === 0) {
    for (const match of html.matchAll(/<td[^>]*data-date="(\d{8})"[^>]*>/g)) {
      dates.add(compactDateToDate(match[1]));
    }
  }

  return Array.from(dates)
    .sort()
    .map((date) => toPlanningDay(date, true));
}

async function parseMovieCards(
  html: string,
  selectedDate: string,
): Promise<MovieCard[]> {
  const compactDate = dateToCompactDate(selectedDate);
  const movies = parseMovieSections(html, compactDate).filter(
    (movie) => movie.rawShowtimes.length > 0,
  );

  return Promise.all(movies.map(toMovieCard));
}

function parseMovieSections(
  html: string,
  compactDate: string,
): ParsedEigaMovie[] {
  const movies: ParsedEigaMovie[] = [];
  const sectionRegex =
    /<section\s+id="m(\d+)"[^>]*data-title="([^"]*)"[^>]*>[\s\S]*?(?=<section\s+id="m\d+"|<div class="notice-bottom-timetable"|<\/main>|$)/g;

  for (const match of html.matchAll(sectionRegex)) {
    const [section, providerMovieId, encodedTitle] = match;
    const sourceLabel = htmlText(encodedTitle);
    const runtimeMinutes = parseRuntimeMinutes(section);
    const rawShowtimes = parseSectionShowtimes(section, compactDate);

    movies.push({
      providerMovieId,
      sourceLabel,
      runtimeMinutes,
      rating: parseRating(section),
      artworkUrl: normalizeUrl(
        section.match(/<img[^>]+src="([^"]+)"[^>]*>/)?.[1] ?? null,
      ),
      rawShowtimes,
    });
  }

  return movies;
}

function parseSectionShowtimes(
  section: string,
  compactDate: string,
): RawEigaShowtime[] {
  const showtimes: RawEigaShowtime[] = [];
  const scheduleRegex =
    /<div class="movie-schedule"[^>]*>[\s\S]*?(?=<div class="movie-schedule"|<div class="more-schedule"|<\/section>|$)/g;

  for (const match of section.matchAll(scheduleRegex)) {
    const scheduleBlock = match[0];
    const typeLabels = parseTypeLabels(scheduleBlock);
    const language = classifyEigaLanguage(typeLabels);
    const formats = parseFormats(typeLabels);
    const cell = scheduleBlock.match(
      new RegExp(`<td[^>]*data-date="${compactDate}"[^>]*>([\\s\\S]*?)<\\/td>`),
    )?.[1];

    if (!cell) continue;
    showtimes.push(...parseShowtimeCell(cell, formats, language));
  }

  return showtimes;
}

function parseShowtimeCell(
  cell: string,
  formats: string[],
  language: LanguageRank,
): RawEigaShowtime[] {
  const showtimes: RawEigaShowtime[] = [];

  for (const match of cell.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const [, attributes, content] = match;
    const parsedTime = parseShowtimeText(content);
    if (!parsedTime) continue;

    const className = attr(attributes, "class") ?? "";
    const availability = eigaAvailability(className);

    showtimes.push({
      start: parsedTime.start,
      explicitEnd: parsedTime.end,
      screen: EIGA_SCREEN_LABEL,
      formats,
      language,
      availability,
      availabilityLabel: eigaAvailabilityLabel(className, availability),
      eventLabel: null,
    });
  }

  for (const match of cell.matchAll(
    /<span>\s*(\d{1,2}:\d{2})([\s\S]*?)<\/span>/g,
  )) {
    const parsedTime = parseShowtimeText(match[0]);
    if (!parsedTime) continue;

    showtimes.push({
      start: parsedTime.start,
      explicitEnd: parsedTime.end,
      screen: EIGA_SCREEN_LABEL,
      formats,
      language,
      availability: "unknown",
      availabilityLabel: "Unknown",
      eventLabel: null,
    });
  }

  return showtimes;
}

async function toMovieCard(movie: ParsedEigaMovie): Promise<MovieCard> {
  const needsDetail =
    movie.rawShowtimes.some((showtime) => showtime.language === "english") ||
    movie.runtimeMinutes === null;
  const detail = needsDetail
    ? await getCachedMovieDetail(movie.providerMovieId)
    : null;
  const rawEnglishLabels = detail?.originalTitle ? [detail.originalTitle] : [];
  const sourceLabels = [movie.sourceLabel];
  const runtimeMinutes = movie.runtimeMinutes ?? detail?.runtimeMinutes ?? null;
  const showtimes = sortShowtimes(
    movie.rawShowtimes.map((showtime) => {
      const language = resolvedEigaLanguage(
        showtime.language,
        movie.sourceLabel,
        detail,
      );

      return {
        ...showtime,
        end: showtime.explicitEnd ?? computedEnd(showtime.start, runtimeMinutes),
        language,
        languageLabel: languageLabel(language),
      };
    }),
  );

  return {
    id: movieIdentityId({
      rawEnglishLabels,
      sourceLabels,
      runtimeMinutes,
      sourceId: "eiga",
    }),
    title: displayTitle(rawEnglishLabels, sourceLabels),
    rawEnglishLabels,
    sourceLabels,
    artworkUrl: movie.artworkUrl,
    runtimeMinutes,
    rating: movie.rating,
    language: bestLanguage(showtimes),
    showtimes,
  };
}

function parseTypeLabels(block: string): string[] {
  const match = block.match(/<div class="movie-type">([\s\S]*?)<\/div>/);
  if (!match) return [];

  return Array.from(match[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g))
    .map((span) => htmlText(span[1]))
    .filter(Boolean);
}

function parseFormats(typeLabels: string[]): string[] {
  const typeText = typeLabels.join(" ");
  return unique(extractFormats(typeText, typeText));
}

function classifyEigaLanguage(typeLabels: string[]): LanguageRank {
  const typeText = typeLabels.join(" ");
  if (/字幕/.test(typeText)) return "english";
  return "japanese";
}

function resolvedEigaLanguage(
  language: LanguageRank,
  sourceLabel: string,
  detail: EigaMovieDetail | null,
): LanguageRank {
  if (language !== "english") return language;
  if (detail?.originalTitle) return language;
  if (!hasJapaneseScript(sourceLabel)) return language;

  return "japanese";
}

function hasJapaneseScript(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function parseShowtimeText(html: string): { start: string; end: string | null } | null {
  const text = htmlText(html);
  const match = text.match(/(\d{1,2}:\d{2})(?:\s*[～~-]\s*(\d{1,2}:\d{2}))?/);
  if (!match) return null;

  return {
    start: normalizeTime(match[1]),
    end: match[2] ? normalizeTime(match[2]) : null,
  };
}

function parseMovieDetail(html: string): EigaMovieDetail {
  const dataBlock = html.match(/<p class="data">([\s\S]*?)<\/p>/)?.[1] ?? "";
  const originalTitle =
    htmlText(dataBlock.match(/原題または英題：([\s\S]*?)(?:<br\s*\/?>|$)/)?.[1] ?? "") ||
    null;

  return {
    originalTitle,
    runtimeMinutes: parseRuntimeMinutes(dataBlock),
  };
}

function parseRuntimeMinutes(html: string): number | null {
  const match = htmlText(html).match(/(\d+)\s*分/);
  return match ? Number(match[1]) : null;
}

function parseRating(html: string): string | null {
  const dataBlock = html.match(/<p class="data">([\s\S]*?)<\/p>/)?.[1] ?? "";
  const spans = Array.from(dataBlock.matchAll(/<span>([\s\S]*?)<\/span>/g)).map(
    (match) => htmlText(match[1]),
  );
  const rating = spans.find((span) => /^(G|PG12|R15\+|R18\+)$/.test(span));
  return rating ?? null;
}

function computedEnd(start: string, runtimeMinutes: number | null): string | null {
  if (!runtimeMinutes) return null;

  const [hour = 0, minute = 0] = start.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + runtimeMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${endHour}:${String(endMinute).padStart(2, "0")}`;
}

function eigaAvailability(className: string): ShowtimeAvailability {
  if (/\bticket2\b|\bticket3\b/.test(className)) return "available";
  if (/\bticket4\b/.test(className)) return "limited";
  if (/\bticket5\b/.test(className)) return "soldOut";
  if (/\bticket6\b|\bticket7\b/.test(className)) return "notSelling";
  return "unknown";
}

function eigaAvailabilityLabel(
  className: string,
  fallback: ShowtimeAvailability,
): string {
  if (/\bticket1\b/.test(className)) return "残席未定";
  if (/\bticket2\b/.test(className)) return "余裕あり";
  if (/\bticket3\b/.test(className)) return "あり";
  if (/\bticket4\b/.test(className)) return "残りわずか";
  if (/\bticket5\b/.test(className)) return "残席なし";
  if (/\bticket6\b/.test(className)) return "販売期間外";
  if (/\bticket7\b/.test(className)) return "販売終了";
  return fallback === "unknown" ? "Unknown" : fallback;
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "EasyToho/0.1 (+https://eiga.com schedule adapter)",
      },
    });
    if (!response.ok) {
      throw new Error(`eiga.com returned ${response.status} for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function eigaUrl(path: string): string {
  return path.startsWith("http") ? path : `${EIGA_BASE}${path}`;
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${EIGA_BASE}${value}`;
  return value;
}

function attr(attributes: string, name: string): string | null {
  return (
    attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ??
    attributes.match(new RegExp(`\\b${name}='([^']*)'`))?.[1] ??
    null
  );
}

function htmlText(value: string): string {
  return decodeHtml(value.replace(/<br\s*\/?>/g, " "))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
