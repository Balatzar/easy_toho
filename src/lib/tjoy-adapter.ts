import { unstable_cache } from "next/cache";
import type { TjoyCinemaConfig } from "./cinemas";
import {
  SOURCE_CACHE_SECONDS,
  type LanguageRank,
  type MovieCard,
  type PlanningDay,
  type ScheduleResult,
  type Showtime,
  type ShowtimeAvailability,
  bestLanguage,
  displayTitle,
  fallbackPlanningDays,
  hidePastShowtimes,
  languageLabel,
  movieIdentityId,
  normalizeTime,
  sortMovieCards,
  sortShowtimes,
  toHalfWidth,
  toPlanningDay,
  unique,
  upcomingPlanningDays,
} from "./schedule-model";

const TJOY_BASE = "https://tjoy.jp";

type TjoyPageSession = {
  html: string;
  csrfToken: string;
  cookie: string;
};

type ParsedTjoyMovie = {
  groupKey: string;
  rawEnglishLabel: string | null;
  sourceLabel: string;
  runtimeMinutes: number | null;
  rating: string | null;
  artworkUrl: string | null;
  showtimes: Showtime[];
};

type TjoyMovieGroup = {
  rawEnglishLabels: Set<string>;
  sourceLabels: Set<string>;
  runtimes: number[];
  rating: string | null;
  artworkUrl: string | null;
  showtimes: Showtime[];
};

export async function getPlanningDays(
  config: TjoyCinemaConfig,
): Promise<PlanningDay[]> {
  try {
    const days = upcomingPlanningDays(
      await getCachedPlanningDays(config.sitePath),
    );

    if (days.length === 0) throw new Error("T-Joy returned no planning days.");
    return days;
  } catch {
    return fallbackPlanningDays();
  }
}

const getCachedPlanningDays = unstable_cache(
  async (sitePath: string): Promise<PlanningDay[]> => {
    const session = await fetchPageSession(sitePath, 8_000);
    return parsePlanningDays(session.html);
  },
  ["tjoy-planning-days-v1"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

export async function getSchedule(
  config: TjoyCinemaConfig,
  selectedDate: string,
): Promise<ScheduleResult> {
  try {
    const schedule = await getCachedScheduleSnapshot(
      config.sitePath,
      config.theaterId,
      selectedDate,
    );

    return hidePastShowtimes(schedule, selectedDate, new Date());
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not fetch live T-Joy showtimes right now.",
      fetchedAt: new Date().toISOString(),
    };
  }
}

const getCachedScheduleSnapshot = unstable_cache(
  async (
    sitePath: string,
    theaterId: string,
    selectedDate: string,
  ): Promise<Extract<ScheduleResult, { ok: true }>> => {
    const fetchedAt = new Date().toISOString();
    const session = await fetchPageSession(sitePath, 8_000);
    const html = await fetchScheduleFragment({
      sitePath,
      theaterId,
      selectedDate,
      session,
      timeoutMs: 8_000,
    });

    return {
      ok: true,
      cards: sortMovieCards(parseMovieCards(html)),
      fetchedAt,
    };
  },
  ["tjoy-schedule-snapshot-v3"],
  { revalidate: SOURCE_CACHE_SECONDS },
);

function parsePlanningDays(html: string): PlanningDay[] {
  const days = new Map<string, PlanningDay>();
  const matches = html.matchAll(
    /<a class="calendar-item\s+d-block\s*([^"]*)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g,
  );

  for (const match of matches) {
    const [, className, date] = match;
    if (!days.has(date)) {
      days.set(date, toPlanningDay(date, !className.includes("calendar-disable")));
    }
  }

  return Array.from(days.values());
}

function parseMovieCards(html: string): MovieCard[] {
  const groups = new Map<string, TjoyMovieGroup>();
  const movieStarts = Array.from(
    html.matchAll(/<section class="section-container bg-white">/g),
  );

  for (const [index, match] of movieStarts.entries()) {
    const blockStart = match.index ?? 0;
    const blockEnd = movieStarts[index + 1]?.index ?? html.length;
    const block = html.slice(blockStart, blockEnd);
    const movie = parseMovieBlock(block);

    if (!movie || movie.showtimes.length === 0) continue;

    let group = groups.get(movie.groupKey);
    if (!group) {
      group = {
        rawEnglishLabels: new Set(),
        sourceLabels: new Set(),
        runtimes: [],
        rating: movie.rating,
        artworkUrl: movie.artworkUrl,
        showtimes: [],
      };
      groups.set(movie.groupKey, group);
    }

    if (movie.rawEnglishLabel) group.rawEnglishLabels.add(movie.rawEnglishLabel);
    if (movie.sourceLabel) group.sourceLabels.add(movie.sourceLabel);
    if (movie.runtimeMinutes) group.runtimes.push(movie.runtimeMinutes);
    group.rating ??= movie.rating;
    group.artworkUrl ??= movie.artworkUrl;
    group.showtimes.push(...movie.showtimes);
  }

  return Array.from(groups.values()).map(toMovieCard);
}

function parseMovieBlock(block: string): ParsedTjoyMovie | null {
  const titleMatch = block.match(
    /<h5 class="js-title-film[^"]*"[^>]*>([\s\S]*?)<\/h5>\s*<span>([\s\S]*?)<\/span>/,
  );
  if (!titleMatch) return null;

  const sourceLabel = cleanSourceMovieLabel(htmlText(titleMatch[1]));
  const rawEnglishLabel = htmlText(titleMatch[2]) || null;
  const runtimeMinutes = parseRuntimeMinutes(block);
  const rating = parseRating(block, sourceLabel);
  const providerMovieCode = tjoyProviderMovieCode(block);
  const englishGroupKey = rawEnglishLabel
    ? `english:${normalizeGroupLabel(rawEnglishLabel)}`
    : null;
  const sourceGroupLabel = cleanSourceLabelForGrouping(sourceLabel);
  const sourceGroupKey = sourceGroupLabel
    ? `source:${normalizeGroupLabel(sourceGroupLabel)}`
    : null;
  const formatLabels = parseFormatLabels(block);
  const language = classifyTjoyLanguage(sourceLabel, formatLabels);
  const rowFormats = extractTjoyFormats(sourceLabel, formatLabels);
  const rowEventLabel = eventLabel(sourceLabel);
  const showtimes = parseShowtimes(block, rowFormats, rowEventLabel, language);

  return {
    groupKey:
      englishGroupKey ??
      sourceGroupKey ??
      (providerMovieCode ? `provider:${providerMovieCode}` : null) ??
      sourceLabel,
    rawEnglishLabel,
    sourceLabel,
    runtimeMinutes,
    rating,
    artworkUrl: normalizeUrl(
      block.match(/<img class="img-fluid" src="([^"]*)"/)?.[1] ?? null,
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
  const timeBlocks = Array.from(
    block.matchAll(/<li class="schedule-box[\s\S]*?<\/li>/g),
  );

  for (const match of timeBlocks) {
    const item = match[0];
    const time = htmlText(
      item.match(/<p class="schedule-time[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] ??
        "",
    ).match(/(\d{1,2}:\d{2})\s*～\s*(\d{1,2}:\d{2})/);
    if (!time) continue;

    const statusLabel =
      htmlText(
        item.match(
          /<p[^>]*class="schedule-status[^"]*"[^>]*>([\s\S]*?)<\/p>/,
        )?.[1] ?? "",
      ) || (item.includes("disable") ? "Unavailable" : "Unknown");
    const showtimeTag = htmlText(
      item.match(/<a[^>]*class="theater-btn[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1] ??
        "",
    );

    showtimes.push({
      start: normalizeTime(time[1]),
      end: normalizeTime(time[2]),
      screen: parseScreen(item),
      formats: rowFormats,
      language,
      languageLabel: languageLabel(language),
      availability: tjoyAvailability(statusLabel),
      availabilityLabel: statusLabel,
      eventLabel: showtimeTag || rowEventLabel,
    });
  }

  return sortShowtimes(showtimes);
}

function toMovieCard(group: TjoyMovieGroup): MovieCard {
  const rawEnglishLabels = Array.from(group.rawEnglishLabels);
  const sourceLabels = Array.from(group.sourceLabels);
  const showtimes = sortShowtimes(group.showtimes);
  const runtimeMinutes = preferredRuntime(group.runtimes);

  return {
    id: movieIdentityId({
      rawEnglishLabels,
      sourceLabels,
      runtimeMinutes,
      sourceId: "tjoy",
    }),
    title: displayTitle(rawEnglishLabels, sourceLabels),
    rawEnglishLabels,
    sourceLabels,
    artworkUrl: group.artworkUrl,
    runtimeMinutes,
    rating: group.rating,
    language: bestLanguage(showtimes),
    showtimes,
  };
}

function parseFormatLabels(block: string): string[] {
  return unique(
    Array.from(
      block.matchAll(/<span class="[^"]*lb-[^"]*"[^>]*>([\s\S]*?)<\/span>/g),
    ).map((match) => htmlText(match[1])),
  );
}

function parseRuntimeMinutes(value: string): number | null {
  const match = value.match(/本編\s*[:：]\s*(\d+)\s*分/);
  return match ? Number(match[1]) : null;
}

function parseRating(block: string, sourceLabel: string): string | null {
  return (
    htmlText(
      block.match(/<span class="coup coup-rate[^"]*"[^>]*>([\s\S]*?)<\/span>/)
        ?.[1] ?? "",
    ) ||
    sourceLabel.match(/R15\+|R18\+|PG-?12/)?.[0]?.replace("PG12", "PG-12") ||
    null
  );
}

function preferredRuntime(runtimes: number[]): number | null {
  if (runtimes.length === 0) return null;

  const counts = new Map<number, number>();
  for (const runtime of runtimes) counts.set(runtime, (counts.get(runtime) ?? 0) + 1);

  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0]?.[1] === ranked[1]?.[1]) {
    const sorted = [...runtimes].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
  }

  return ranked[0]?.[0] ?? null;
}

function tjoyProviderMovieCode(block: string): string | null {
  const detailCode = block.match(/cinema_detail\/([A-Z]\d+)/)?.[1];
  if (detailCode) return tjoyBaseMovieCode(detailCode);

  const filmId = block.match(/id="film-([A-Z]\d+)"/)?.[1];
  return filmId ? tjoyBaseMovieCode(filmId) : null;
}

function tjoyBaseMovieCode(code: string): string {
  return code.match(/^([A-Z]\d{4})\d{3,}$/)?.[1] ?? code;
}

function cleanSourceMovieLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanSourceLabelForGrouping(value: string): string {
  return toHalfWidth(value)
    .replace(/【\s*((DolbyCinema|IMAX)・)?字幕\s*】/g, "")
    .replace(/【\s*IMAX\s*】/g, "")
    .replace(/【\s*(吹替|2D日本語版|日本語字幕付?|日本語字幕)\s*】/g, "")
    .replace(/\[[^\]]*]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGroupLabel(value: string): string {
  return toHalfWidth(value).replace(/\s+/g, " ").trim().toUpperCase();
}

function classifyTjoyLanguage(
  sourceLabel: string,
  formatLabels: string[],
): LanguageRank {
  const normalized = toHalfWidth(`${formatLabels.join(" ")} ${sourceLabel}`);

  if (/日本語字幕/.test(normalized)) return "japanese";
  if (/字幕/.test(normalized)) return "english";

  return "japanese";
}

function extractTjoyFormats(
  sourceLabel: string,
  formatLabels: string[],
): string[] {
  const normalized = toHalfWidth(`${formatLabels.join(" ")} ${sourceLabel}`);
  const formats: string[] = [];

  if (/字幕/.test(normalized) && !/日本語字幕/.test(normalized)) {
    formats.push("Subtitled");
  }
  if (/吹替|日本語版/.test(normalized)) formats.push("Dubbed");
  if (/DOLBY\s*CINEMA|DOLBYCINEMA/.test(normalized.toUpperCase())) {
    formats.push("Dolby Cinema");
  }
  if (/DOLBY[-\s]?ATMOS|ATMOS/.test(normalized.toUpperCase())) {
    formats.push("Dolby Atmos");
  }
  if (/IMAX/.test(normalized.toUpperCase())) formats.push("IMAX");
  if (/\b3D\b/.test(normalized.toUpperCase())) formats.push("3D");

  return unique(formats);
}

function eventLabel(sourceLabel: string): string | null {
  if (/ライブビューイング/.test(sourceLabel)) return "Live viewing";
  if (/応援上映/.test(sourceLabel)) return "Cheer screening";
  if (/先行上映|イベント|パブリックビューイング/.test(sourceLabel)) {
    return "Special event";
  }
  return null;
}

function parseScreen(item: string): string {
  return (
    htmlText(
      item.match(/<div class="theater-name[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)
        ?.[1] ?? "",
    ) || "Screen"
  );
}

function tjoyAvailability(label: string): ShowtimeAvailability {
  const normalized = toHalfWidth(label);

  if (/販売開始前|準備|窓口のみ/.test(normalized)) return "notSelling";
  if (/残り|わずか|△/.test(normalized)) return "limited";
  if (/満席|販売終了|終了/.test(normalized)) return "soldOut";
  if (/予約\/購入|購入|○|◎/.test(normalized)) return "available";

  return "unknown";
}

function normalizeUrl(url: string | null): string | null {
  if (!url || url.includes("no-img")) return null;
  return new URL(url, TJOY_BASE).toString();
}

async function fetchPageSession(
  sitePath: string,
  timeoutMs: number,
): Promise<TjoyPageSession> {
  const response = await fetchWithTimeout(`${TJOY_BASE}/${sitePath}`, {
    timeoutMs,
  });
  const html = await response.text();
  const csrfToken =
    html.match(/<meta name="csrf-token" content="([^"]+)"/)?.[1] ?? "";
  const cookie = responseCookie(response);

  if (!csrfToken) throw new Error("T-Joy page did not include a CSRF token.");
  if (!cookie) throw new Error("T-Joy page did not return a session cookie.");

  return { html, csrfToken, cookie };
}

async function fetchScheduleFragment({
  sitePath,
  theaterId,
  selectedDate,
  session,
  timeoutMs,
}: {
  sitePath: string;
  theaterId: string;
  selectedDate: string;
  session: TjoyPageSession;
  timeoutMs: number;
}): Promise<string> {
  const body = new URLSearchParams({
    data: JSON.stringify({ date: selectedDate, theaterId }),
    _csrfToken: session.csrfToken,
  });
  const response = await fetchWithTimeout(
    `${TJOY_BASE}/theaterTop/scheduleGetHtmlApi`,
    {
      timeoutMs,
      init: {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          cookie: session.cookie,
          origin: TJOY_BASE,
          referer: `${TJOY_BASE}/${sitePath}`,
          "x-requested-with": "XMLHttpRequest",
        },
        body,
      },
    },
  );

  return response.text();
}

async function fetchWithTimeout(
  url: string,
  {
    timeoutMs,
    init,
  }: {
    timeoutMs: number;
    init?: RequestInit;
  },
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`T-Joy request failed with ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function responseCookie(response: Response): string {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies =
    headers.getSetCookie?.() ??
    response.headers.get("set-cookie")?.split(/,(?=\s*[^;]+=)/) ??
    [];

  return cookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function htmlText(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
