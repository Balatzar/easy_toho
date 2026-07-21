export const SOURCE_CACHE_SECONDS = 3_600;

const TOKYO_TIME_ZONE = "Asia/Tokyo";
const MOVIE_IDENTITY_RUNTIME_TOLERANCE_MINUTES = 3;

export type ScheduleSourceId = "toho" | "smt" | "tjoy" | "eiga";

export type ScheduleSource = {
  id: ScheduleSourceId;
  name: string;
};

export type ShowtimeAvailability =
  | "available"
  | "limited"
  | "soldOut"
  | "notSelling"
  | "unknown";

export type LanguageRank = "english" | "japanese";

export type Showtime = {
  start: string;
  end: string | null;
  screen: string;
  formats: string[];
  language: LanguageRank;
  languageLabel: string;
  availability: ShowtimeAvailability;
  availabilityLabel: string;
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

export type MovieCardInput = {
  sourceId: ScheduleSourceId;
  rawEnglishLabels: string[];
  sourceLabels: string[];
  artworkUrl: string | null;
  runtimeMinutes: number | null;
  rating: string | null;
  showtimes: Showtime[];
};

export type MovieIdentityReference = Pick<
  MovieCard,
  "id" | "rawEnglishLabels" | "runtimeMinutes"
>;

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

type LoadedScheduleResult = Extract<ScheduleResult, { ok: true }>;

export function createMovieCard({
  sourceId,
  rawEnglishLabels,
  sourceLabels,
  artworkUrl,
  runtimeMinutes,
  rating,
  showtimes: unsortedShowtimes,
}: MovieCardInput): MovieCard {
  const showtimes = sortShowtimes(unsortedShowtimes);

  return {
    id: movieIdentityId({
      rawEnglishLabels,
      sourceLabels,
      runtimeMinutes,
      sourceId,
    }),
    title: displayTitle(rawEnglishLabels, sourceLabels),
    rawEnglishLabels,
    sourceLabels,
    artworkUrl,
    runtimeMinutes,
    rating,
    language: bestLanguage(showtimes),
    showtimes,
  };
}

export function hidePastShowtimes(
  schedule: LoadedScheduleResult,
  selectedDate: string,
  now: Date,
): LoadedScheduleResult {
  const nowTokyoKey = tokyoDateTimeKey(now);
  const cards = schedule.cards
    .map((card) => {
      const showtimes = card.showtimes.filter(
        (showtime) =>
          dateTimeKey(selectedDate, timeToMinutes(showtime.start)) >=
          nowTokyoKey,
      );

      return {
        ...card,
        language: bestLanguage(showtimes),
        showtimes,
      };
    })
    .filter((card) => card.showtimes.length > 0);

  return {
    ...schedule,
    cards: sortMovieCards(cards),
  };
}

export function movieIdentityId({
  rawEnglishLabels,
  sourceLabels,
  runtimeMinutes,
  sourceId,
}: {
  rawEnglishLabels: string[];
  sourceLabels: string[];
  runtimeMinutes: number | null;
  sourceId: ScheduleSourceId;
}): string {
  const englishTitle = cleanedEnglishLabels(rawEnglishLabels)[0];
  const runtime = runtimeMinutes ? `${runtimeMinutes}m` : "runtime-unknown";

  if (englishTitle) {
    return compactSlug([slugify(englishTitle), runtime]);
  }

  const sourceTitle =
    sourceLabels
      .map(cleanSourceLabelForIdentity)
      .filter(Boolean)
      .sort((a, b) => a.length - b.length)[0] ?? "movie";
  const sourceSlug = slugify(sourceTitle) || `label-${stableHash(sourceTitle)}`;

  return compactSlug(["unmatched", sourceId, sourceSlug, runtime]);
}

export function sameMovieIdentity(
  current: MovieIdentityReference,
  next: MovieIdentityReference,
): boolean {
  if (current.id === next.id) return true;

  const currentTitleKey = movieMergeTitleKey(current.rawEnglishLabels);
  const nextTitleKey = movieMergeTitleKey(next.rawEnglishLabels);

  return (
    !!currentTitleKey &&
    currentTitleKey === nextTitleKey &&
    runtimesMatch(current.runtimeMinutes, next.runtimeMinutes)
  );
}

function displayTitle(
  rawEnglishLabels: string[],
  sourceLabels: string[],
): string {
  const englishTitle = cleanedEnglishLabels(rawEnglishLabels)[0];
  if (englishTitle) return englishTitle;

  return (
    [...sourceLabels].sort((a, b) => a.length - b.length)[0] ??
    "Unmatched movie"
  );
}

export function classifyLanguage(
  englishLabel: string,
  sourceLabel: string,
): LanguageRank {
  const normalizedEnglish = toHalfWidth(englishLabel).toUpperCase();
  const normalizedSource = toHalfWidth(sourceLabel);

  if (
    /\bSUB\b/.test(normalizedEnglish) ||
    /^SUB\s*[/:]/.test(normalizedEnglish) ||
    /字幕/.test(normalizedSource)
  ) {
    return "english";
  }

  return "japanese";
}

export function languageLabel(language: LanguageRank): string {
  switch (language) {
    case "english":
      return "English-watchable";
    case "japanese":
      return "Japanese";
  }
}

function bestLanguage(showtimes: Showtime[]): LanguageRank {
  return showtimes.reduce<LanguageRank>((best, showtime) => {
    return languageRankValue(showtime.language) < languageRankValue(best)
      ? showtime.language
      : best;
  }, "japanese");
}

export function extractFormats(
  englishLabel: string,
  sourceLabel: string,
): string[] {
  const normalized = `${toHalfWidth(englishLabel)} ${sourceLabel}`.toUpperCase();
  const formats: string[] = [];

  if (/\bSUB\b|^SUB\s*[/:]|字幕/.test(normalized)) formats.push("Subtitled");
  if (/\bDUB\b|^DUB\s*[/:]|吹替|日本語版/.test(normalized)) {
    formats.push("Dubbed");
  }
  if (/SCREEN\s*X|SCREENX/.test(normalized)) formats.push("Screen X");
  if (/DOLBY[-\s]?ATMOS|ATMOS/.test(normalized)) formats.push("Dolby Atmos");
  if (/DOLBY\s*CINEMA/.test(normalized)) formats.push("Dolby Cinema");
  if (/IMAX\s*LASER|IMAXLASER/.test(normalized)) formats.push("IMAX Laser");
  else if (/IMAX/.test(normalized)) formats.push("IMAX");
  if (/MX4D/.test(normalized)) formats.push("MX4D");
  if (/\b4DX\b|ULTRA\s*4DX|\b4D\b/.test(normalized)) formats.push("4DX");
  if (/\bTCX\b/.test(normalized)) formats.push("TCX");
  if (/PREMIUM\s*THEATER/.test(normalized)) formats.push("Premium Theater");
  if (/\b3D\b/.test(normalized)) formats.push("3D");
  if (/轟音/.test(sourceLabel)) formats.push("Roaring sound");
  if (/バリアフリー/.test(sourceLabel)) formats.push("Barrier-free");
  if (/BABY CLUB THEATER|赤ちゃん連れ限定/.test(normalized)) {
    formats.push("Baby club");
  }

  return unique(formats);
}

export function sortMovieCards(cards: MovieCard[]): MovieCard[] {
  return [...cards].sort((a, b) => {
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

export function isImaxScreening(showtime: Showtime): boolean {
  return hasImaxFormat(showtime.formats);
}

export function earliestMinutes(showtimes: Showtime[]): number {
  if (showtimes.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...showtimes.map((showtime) => timeToMinutes(showtime.start)));
}

export function timeToMinutes(time: string): number {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function normalizeTime(time: string): string {
  const [hour = "", minute = ""] = time
    .replace("～", "")
    .trim()
    .split(":");
  if (!hour || !minute) return time.trim();

  return `${Number(hour)}:${minute.padStart(2, "0")}`;
}

export function compactDateToDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

export function dateToCompactDate(date: string): string {
  return date.replaceAll("-", "");
}

export function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function toHalfWidth(value: string): string {
  return value.replace(/[！-～]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

function cleanedEnglishLabels(rawEnglishLabels: string[]): string[] {
  return rawEnglishLabels
    .map(cleanEnglishLabel)
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
}

function cleanEnglishLabel(label: string): string {
  const base = toHalfWidth(label)
    .replace(/^\s*(SUB|DUB)\s*[/:]\s*/i, "")
    .replace(/\s*\/\s*(SUB|DUB).*$/i, "")
    .replace(/\b(SCREEN\s*X|SCREENX|DOLBY[-\s]?ATMOS|ATMOS|IMAXLASER|IMAX\s*LASER|IMAX|MX4D|TCX|4DX|4D|3D|BABY CLUB THEATER)\b/gi, "")
    .replace(/\b([A-Za-z]{2,})(\d+)\b/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();

  return titleCaseIfNeeded(base);
}

function cleanSourceLabelForIdentity(label: string): string {
  return toHalfWidth(label)
    .replace(/【\s*(字幕|吹替|日本語版)\s*】/g, "")
    .replace(/＜[^＞]+＞/g, "")
    .replace(/\([^)]*本編[:：]\s*\d+\s*分[^)]*\)/g, "")
    .replace(/（[^）]*本編[:：]\s*\d+\s*分[^）]*）/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function movieMergeTitleKey(rawEnglishLabels: string[]): string | null {
  return (
    rawEnglishLabels
      .map(normalizeEnglishLabelForMerge)
      .filter(Boolean)
      .sort((a, b) => a.length - b.length)[0] ?? null
  );
}

function normalizeEnglishLabelForMerge(label: string): string {
  return toHalfWidth(label)
    .replace(/^\s*(SUB|DUB|JP\s*SUB)\s*[/:]\s*/i, "")
    .replace(
      /\s*\/\s*(SUB|DUB|ENGLISH\s*SUBTITLES?|JAPANESE\s*SUBTITLES?).*$/i,
      "",
    )
    .replace(
      /\b(SCREEN\s*X|SCREENX|DOLBY[-\s]?ATMOS|ATMOS|DOLBY\s*CINEMA|IMAXLASER|IMAX\s*LASER|IMAX|MX4D|TCX|4DX|4D|3D|BABY CLUB THEATER)\b/gi,
      "",
    )
    .replace(/\b([A-Za-z]{2,})(\d+)\b/g, "$1 $2")
    .replace(/['`\u2018\u2019]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function runtimesMatch(
  current: number | null,
  next: number | null,
): boolean {
  if (!current || !next) return true;
  return (
    Math.abs(current - next) <= MOVIE_IDENTITY_RUNTIME_TOLERANCE_MINUTES
  );
}

function titleCaseIfNeeded(value: string): string {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return value;

  const smallWords = new Set(["and", "or", "the", "of", "in", "a", "an"]);
  const parts = value.toLowerCase().split(/(\s+|-)/);

  return parts
    .map((part, index) => {
      if (/^\s+$|^-$/.test(part)) return part;
      if (/^\d+$/.test(part)) return part;
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(part)) {
        return part.toUpperCase();
      }

      const previousWord = previousNonSeparator(parts, index);
      if (index > 0 && previousWord?.endsWith(":")) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }

      if (index > 0 && smallWords.has(part)) return part;

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function previousNonSeparator(parts: string[], partIndex: number): string | null {
  for (let index = partIndex - 1; index >= 0; index -= 1) {
    if (!/^\s+$|^-$/.test(parts[index])) {
      return parts[index];
    }
  }

  return null;
}

function languageRankValue(language: LanguageRank): number {
  switch (language) {
    case "english":
      return 0;
    case "japanese":
      return 1;
  }
}

function imaxRankValue(showtimes: Showtime[], language: LanguageRank): number {
  return showtimes.some(
    (showtime) => showtime.language === language && isImaxScreening(showtime),
  )
    ? 1
    : 0;
}

function hasImaxFormat(formats: string[]): boolean {
  return formats.some((format) => format === "IMAX" || format === "IMAX Laser");
}

function tokyoDateTimeKey(date: Date): number {
  const current = tokyoDateTime(date);
  return dateTimeKey(current.date, current.minutes);
}

function tokyoDateTime(date: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour") || "0") % 24;
  const minute = Number(value("minute") || "0");

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: hour * 60 + minute,
  };
}

function dateTimeKey(date: string, minutes: number): number {
  const parsed = parseDateParts(date);
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day) / 60_000 + minutes;
}

function parseDateParts(date: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function slugify(value: string): string {
  return toHalfWidth(value)
    .toLowerCase()
    .replace(/['`\u2018\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactSlug(parts: string[]): string {
  return parts.filter(Boolean).join("-").replace(/-{2,}/g, "-");
}

function stableHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}
