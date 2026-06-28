import type { Cinema } from "./cinemas";

const TOHO_API_BASE = "https://api2.tohotheater.jp";
const TOHO_MOVIE_BASE = "https://hlo.tohotheater.jp/net/movie/TNPI3060J01.do";
const TOHO_IMAGE_BASE = "https://www.tohotheater.jp/images_net/movie";
const TOKYO_TIME_ZONE = "Asia/Tokyo";

export type PlanningDay = {
  date: string;
  tohoDate: string;
  weekday: string;
  label: string;
  selectable: boolean;
};

export type SeatSalesStatusCode = "A" | "B" | "C" | "D" | "G" | "unknown";

export type LanguageRank = "english" | "japanese";

export type Showtime = {
  start: string;
  end: string;
  screen: string;
  formats: string[];
  language: LanguageRank;
  languageLabel: string;
  seatStatus: SeatSalesStatusCode;
  seatStatusLabel: string;
  eventLabel: string | null;
};

export type MovieCard = {
  id: string;
  title: string;
  rawEnglishLabels: string[];
  sourceLabels: string[];
  artworkUrl: string | null;
  runtimeMinutes: number | null;
  rating: string | null;
  language: LanguageRank;
  showtimes: Showtime[];
};

export type ScheduleResult =
  | {
      ok: true;
      cards: MovieCard[];
      fetchedAt: string;
    }
  | {
      ok: false;
      error: string;
      fetchedAt: string;
    };

type TohoCalendarResponse = {
  status: string;
  data?: Array<{
    date?: string;
    dayOfWeek?: number;
    selectable?: string;
  }>;
};

type TohoScheduleResponse = {
  status: string;
  data?: Array<{
    showDay?: { date?: string };
    list?: TohoTheater[];
  }>;
};

type TohoTheater = {
  code?: string;
  name?: string;
  list?: TohoMovie[];
};

type TohoMovie = {
  code?: string;
  mcode?: string;
  ename?: string;
  name?: string;
  hours?: number;
  ratingCd?: string;
  thumbnail?: string;
  list?: TohoScreen[];
};

type TohoScreen = {
  code?: string;
  ename?: string;
  name?: string;
  iconNm1?: string;
  iconNm2?: string;
  iconNm3?: string;
  facilities?: Array<{ name?: string }>;
  list?: TohoScheduleItem[];
};

type TohoScheduleItem = {
  showingStart?: string;
  showingEnd?: string;
  eventIcon?: string;
  unsoldSeatInfo?: {
    unsoldSeatStatus?: string;
  } | null;
  code?: number;
};

type MovieGroup = {
  id: string;
  mcode: string;
  rawEnglishLabels: Set<string>;
  sourceLabels: Set<string>;
  runtimeMinutes: number | null;
  rating: string | null;
  thumbnail: string | null;
  showtimes: Showtime[];
};

export async function getPlanningDays(
  scheduleCode: string,
): Promise<PlanningDay[]> {
  const params = new URLSearchParams({
    __type__: "html",
    __useResultInfo__: "no",
    vg_cd: scheduleCode,
    show_day: "",
    term: "99",
    seq_disp_term: "7",
    enter_kbn: "",
    _dc: unixSeconds(),
  });

  try {
    const data = await fetchJson<TohoCalendarResponse>(
      `${TOHO_API_BASE}/api/schedule/v1/schedule/${scheduleCode}/TNPI3050J03?${params}`,
      6_000,
    );

    const days =
      data.data
        ?.filter((day) => typeof day.date === "string")
        .slice(0, 7)
        .map((day) => toPlanningDay(day.date!, day.selectable === "1")) ?? [];

    return days.length > 0 ? days : fallbackPlanningDays();
  } catch {
    return fallbackPlanningDays();
  }
}

export async function getSchedule(
  cinema: Cinema,
  selectedDate: string,
): Promise<ScheduleResult> {
  const fetchedAt = new Date().toISOString();
  const showDay = dateToToho(selectedDate);
  const params = new URLSearchParams({
    __type__: "html",
    __useResultInfo__: "no",
    vg_cd: cinema.scheduleCode,
    show_day: showDay,
    term: "99",
    isMember: "",
    enter_kbn: "",
    _dc: unixSeconds(),
  });

  try {
    const data = await fetchJson<TohoScheduleResponse>(
      `${TOHO_API_BASE}/api/schedule/v1/schedule/${cinema.scheduleCode}/TNPI3050J02?${params}`,
      8_000,
    );

    if (data.status !== "0") {
      return {
        ok: false,
        error: "TOHO returned an unavailable schedule response.",
        fetchedAt,
      };
    }

    const theaters = data.data?.[0]?.list ?? [];
    const theater =
      theaters.find((item) => item.code === cinema.theaterCode) ?? theaters[0];

    if (!theater?.list) {
      return {
        ok: false,
        error: "No published showtimes were returned for this Cinema and day.",
        fetchedAt,
      };
    }

    const groups = normalizeMovieGroups(theater.list);
    const artworkByCode = await getArtworkByMovieCode(groups);
    const cards = groups.map((group) => toMovieCard(group, artworkByCode));

    return {
      ok: true,
      cards: sortMovieCards(cards),
      fetchedAt,
    };
  } catch {
    return {
      ok: false,
      error: "Could not fetch live TOHO showtimes right now.",
      fetchedAt,
    };
  }
}

export function firstSelectableDate(days: PlanningDay[]): string {
  return days.find((day) => day.selectable)?.date ?? days[0]?.date ?? todayTokyo();
}

export function normalizeSelectedDate(
  rawDate: string | undefined,
  days: PlanningDay[],
): string {
  const normalized = normalizeUrlDate(rawDate);

  if (
    normalized &&
    days.some((day) => day.date === normalized && day.selectable)
  ) {
    return normalized;
  }

  return firstSelectableDate(days);
}

function normalizeMovieGroups(movies: TohoMovie[]): MovieGroup[] {
  const groups = new Map<string, MovieGroup>();

  for (const movie of movies) {
    const mcode = movie.mcode || movie.code;
    if (!mcode) continue;

    let group = groups.get(mcode);
    if (!group) {
      group = {
        id: mcode,
        mcode,
        rawEnglishLabels: new Set(),
        sourceLabels: new Set(),
        runtimeMinutes: null,
        rating: null,
        thumbnail: null,
        showtimes: [],
      };
      groups.set(mcode, group);
    }

    if (movie.ename) group.rawEnglishLabels.add(toHalfWidth(movie.ename));
    if (movie.name) group.sourceLabels.add(movie.name);
    group.runtimeMinutes ??= typeof movie.hours === "number" ? movie.hours : null;
    group.rating ??= ratingLabel(movie.ratingCd);
    group.thumbnail ??= normalizeThumbnail(movie.thumbnail);

    const language = classifyLanguage(movie.ename ?? "", movie.name ?? "");
    const rowFormats = extractFormats(movie.ename ?? "", movie.name ?? "");

    for (const screen of movie.list ?? []) {
      const screenFormats = extractScreenFormats(screen);
      const formats = unique([...rowFormats, ...screenFormats]);
      const screenName = toHalfWidth(screen.ename || screen.name || "Screen");

      for (const item of screen.list ?? []) {
        if (!item.showingStart || item.code === 0) continue;

        const seatStatus = seatStatusCode(
          item.unsoldSeatInfo?.unsoldSeatStatus,
        );

        group.showtimes.push({
          start: normalizeTime(item.showingStart),
          end: normalizeTime(item.showingEnd || ""),
          screen: screenName,
          formats,
          language,
          languageLabel: languageLabel(language),
          seatStatus,
          seatStatusLabel: seatStatusLabel(seatStatus),
          eventLabel: eventLabel(item.eventIcon),
        });
      }
    }
  }

  return Array.from(groups.values()).filter(
    (group) => group.showtimes.length > 0,
  );
}

async function getArtworkByMovieCode(
  groups: MovieGroup[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    groups.map(async (group) => {
      const detailUrl = await fetchArtworkFromDetailPage(group.mcode);
      const artworkUrl =
        detailUrl ?? group.thumbnail ?? deterministicArtworkUrl(group.mcode);

      return [group.mcode, artworkUrl] as const;
    }),
  );

  return new Map(entries);
}

async function fetchArtworkFromDetailPage(
  mcode: string,
): Promise<string | null> {
  const params = new URLSearchParams({ sakuhin_cd: mcode });
  const html = await fetchText(`${TOHO_MOVIE_BASE}?${params}`, 1_200);

  if (!html) return null;

  const escaped = escapeRegExp(mcode);
  const match = html.match(
    new RegExp(
      `https?://[^"'<>\\s]+/images_net/movie/${escaped}/SAKUHIN${escaped}_[^"'<>\\s]+?\\.jpg`,
      "i",
    ),
  );

  return match?.[0].replace(/^http:/, "https:") ?? null;
}

function toMovieCard(
  group: MovieGroup,
  artworkByCode: Map<string, string>,
): MovieCard {
  const rawEnglishLabels = Array.from(group.rawEnglishLabels);
  const sourceLabels = Array.from(group.sourceLabels);
  const title = displayTitle(rawEnglishLabels, sourceLabels);
  const language = bestLanguage(group.showtimes);

  return {
    id: group.id,
    title,
    rawEnglishLabels,
    sourceLabels,
    artworkUrl: artworkByCode.get(group.mcode) ?? null,
    runtimeMinutes: group.runtimeMinutes,
    rating: group.rating,
    language,
    showtimes: sortShowtimes(group.showtimes),
  };
}

function sortMovieCards(cards: MovieCard[]): MovieCard[] {
  return cards.sort((a, b) => {
    const rank = languageRankValue(a.language) - languageRankValue(b.language);
    if (rank !== 0) return rank;

    const imaxRank =
      imaxRankValue(b.showtimes, b.language) -
      imaxRankValue(a.showtimes, a.language);
    if (imaxRank !== 0) return imaxRank;

    return earliestMinutes(a.showtimes) - earliestMinutes(b.showtimes);
  });
}

function sortShowtimes(showtimes: Showtime[]): Showtime[] {
  return [...showtimes].sort((a, b) => {
    const language = languageRankValue(a.language) - languageRankValue(b.language);
    if (language !== 0) return language;

    const imax = Number(hasImaxFormat(b.formats)) - Number(hasImaxFormat(a.formats));
    if (imax !== 0) return imax;

    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

function imaxRankValue(showtimes: Showtime[], language: LanguageRank): number {
  return showtimes.some(
    (showtime) =>
      showtime.language === language && hasImaxFormat(showtime.formats),
  )
    ? 1
    : 0;
}

function hasImaxFormat(formats: string[]): boolean {
  return formats.some((format) => format === "IMAX" || format === "IMAX Laser");
}

function displayTitle(
  rawEnglishLabels: string[],
  sourceLabels: string[],
): string {
  const cleaned = rawEnglishLabels
    .map(cleanEnglishLabel)
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);

  if (cleaned[0]) return cleaned[0];

  return sourceLabels.sort((a, b) => a.length - b.length)[0] ?? "Unmatched movie";
}

function cleanEnglishLabel(label: string): string {
  const base = label
    .replace(/\s*\/\s*(SUB|DUB).*$/i, "")
    .replace(/\b(SCREEN\s*X|SCREENX|DOLBY[-\s]?ATMOS|ATMOS|IMAXLASER|IMAX\s*LASER|IMAX|MX4D|TCX|4DX|3D|2D|BABY CLUB THEATER)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return titleCaseIfNeeded(base);
}

function titleCaseIfNeeded(value: string): string {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return value;

  const smallWords = new Set(["and", "or", "the", "of", "in", "a", "an"]);

  return value
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part, index) => {
      if (/^\s+$|^-$/.test(part)) return part;
      if (/^\d+$/.test(part)) return part;
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(part)) {
        return part.toUpperCase();
      }

      const previousWord = previousNonSeparator(value, index);
      if (index > 0 && previousWord?.endsWith(":")) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }

      if (index > 0 && smallWords.has(part)) return part;

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function previousNonSeparator(value: string, partIndex: number): string | null {
  const parts = value.toLowerCase().split(/(\s+|-)/);

  for (let index = partIndex - 1; index >= 0; index -= 1) {
    if (!/^\s+$|^-$/.test(parts[index])) {
      return parts[index];
    }
  }

  return null;
}

function classifyLanguage(englishLabel: string, sourceLabel: string): LanguageRank {
  const normalizedEnglish = toHalfWidth(englishLabel).toUpperCase();

  if (/\bSUB\b/.test(normalizedEnglish) || /字幕/.test(sourceLabel)) {
    return "english";
  }

  return "japanese";
}

function extractFormats(englishLabel: string, sourceLabel: string): string[] {
  const normalized = `${toHalfWidth(englishLabel)} ${sourceLabel}`.toUpperCase();
  const formats: string[] = [];

  if (/\bSUB\b|字幕/.test(normalized)) formats.push("Subtitled");
  if (/\bDUB\b|吹替|日本語版/.test(normalized)) formats.push("Dubbed");
  if (/SCREEN\s*X|SCREENX/.test(normalized)) formats.push("Screen X");
  if (/DOLBY[-\s]?ATMOS|ATMOS/.test(normalized)) formats.push("Dolby Atmos");
  if (/DOLBY\s*CINEMA/.test(normalized)) formats.push("Dolby Cinema");
  if (/IMAX\s*LASER|IMAXLASER/.test(normalized)) formats.push("IMAX Laser");
  else if (/IMAX/.test(normalized)) formats.push("IMAX");
  if (/MX4D/.test(normalized)) formats.push("MX4D");
  if (/\bTCX\b/.test(normalized)) formats.push("TCX");
  if (/PREMIUM\s*THEATER/.test(normalized)) formats.push("Premium Theater");
  if (/\b3D\b/.test(normalized)) formats.push("3D");
  if (/轟音/.test(sourceLabel)) formats.push("Roaring sound");
  if (/BABY CLUB THEATER|赤ちゃん連れ限定/.test(normalized)) {
    formats.push("Baby club");
  }

  return unique(formats);
}

function extractScreenFormats(screen: TohoScreen): string[] {
  const iconNames = [screen.iconNm1, screen.iconNm2, screen.iconNm3]
    .filter(Boolean)
    .join(" ");
  const facilities = (screen.facilities ?? [])
    .map((facility) => facility.name)
    .filter(Boolean)
    .join(" ");

  return extractFormats(`${iconNames} ${facilities}`, `${iconNames} ${facilities}`);
}

function ratingLabel(ratingCd: string | undefined): string | null {
  switch (ratingCd) {
    case "01":
      return "PG12";
    case "02":
      return "R15+";
    case "03":
      return "R18+";
    default:
      return null;
  }
}

function seatStatusCode(status: string | undefined): SeatSalesStatusCode {
  if (status === "A" || status === "B" || status === "C" || status === "D" || status === "G") {
    return status;
  }

  return "unknown";
}

function seatStatusLabel(status: SeatSalesStatusCode): string {
  switch (status) {
    case "A":
      return "A · Plenty";
    case "B":
      return "B · Some";
    case "C":
      return "C · Few";
    case "D":
      return "D · Sold out";
    case "G":
      return "G · Not selling";
    default:
      return "? · Unknown";
  }
}

function eventLabel(eventIcon: string | undefined): string | null {
  const filename = eventIcon?.split("/").at(-1);

  switch (filename) {
    case "schedule_ico02-1.gif":
      return "First day";
    case "schedule_ico02-3.gif":
      return "Late show";
    case "schedule_ico02-4.gif":
      return "Night show";
    case "schedule_ico02-5.gif":
    case "cal-icon-kaiin.gif":
      return "Member day";
    case "schedule_ico02-6.gif":
      return "TOHO Cinemas day";
    case "schedule_ico02-7.gif":
      return "Mamas club theater";
    case "schedule_ico02-8.gif":
      return "Special price";
    case "schedule_ico02-9.gif":
      return "Purchase limit";
    case "schedule_ico02-10.gif":
      return "Free seating";
    case "schedule_ico02-11.gif":
      return "Matinee";
    case "schedule_ico02-12.gif":
      return "Soiree";
    case "schedule_ico02-13.gif":
      return "au Monday";
    case "001":
      return "Baby club";
    default:
      return null;
  }
}

function bestLanguage(showtimes: Showtime[]): LanguageRank {
  return showtimes.reduce<LanguageRank>((best, showtime) => {
    return languageRankValue(showtime.language) < languageRankValue(best)
      ? showtime.language
      : best;
  }, "japanese");
}

function languageLabel(language: LanguageRank): string {
  switch (language) {
    case "english":
      return "English-watchable";
    case "japanese":
      return "Japanese";
  }
}

function languageRankValue(language: LanguageRank): number {
  switch (language) {
    case "english":
      return 0;
    case "japanese":
      return 1;
  }
}

function earliestMinutes(showtimes: Showtime[]): number {
  return Math.min(...showtimes.map((showtime) => timeToMinutes(showtime.start)));
}

function timeToMinutes(time: string): number {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function normalizeTime(time: string): string {
  const [hour = "", minute = ""] = time.split(":");
  if (!hour || !minute) return time;

  return `${Number(hour)}:${minute.padStart(2, "0")}`;
}

function normalizeThumbnail(thumbnail: string | undefined): string | null {
  if (!thumbnail) return null;
  if (thumbnail.startsWith("http://")) return thumbnail.replace("http://", "https://");
  if (thumbnail.startsWith("https://")) return thumbnail;
  return `https://www.tohotheater.jp${thumbnail.startsWith("/") ? "" : "/"}${thumbnail}`;
}

function deterministicArtworkUrl(mcode: string): string {
  return `${TOHO_IMAGE_BASE}/${mcode}/SAKUHIN${mcode}_1.jpg`;
}

function toPlanningDay(tohoDate: string, selectable: boolean): PlanningDay {
  const date = tohoToDate(tohoDate);
  const parsed = parseDateParts(date);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)));

  return {
    date,
    tohoDate,
    weekday,
    label: monthDay,
    selectable,
  };
}

function fallbackPlanningDays(): PlanningDay[] {
  const today = parseDateParts(todayTokyo());
  const base = Date.UTC(today.year, today.month - 1, today.day);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base + index * 86_400_000);
    const formatted = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");

    return toPlanningDay(dateToToho(formatted), true);
  });
}

function todayTokyo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function dateToToho(date: string): string {
  return date.replaceAll("-", "");
}

function tohoToDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

function normalizeUrlDate(rawDate: string | undefined): string | null {
  if (!rawDate) return null;

  if (/^\d{8}$/.test(rawDate)) return tohoToDate(rawDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;

  return null;
}

function parseDateParts(date: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TOHO request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(
  url: string,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function unixSeconds(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toHalfWidth(value: string): string {
  return value.replace(/[！-～]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
