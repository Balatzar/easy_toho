import { unstable_cache } from "next/cache";
import type { TohoCinemaConfig } from "./cinemas";
import {
  type LanguageRank,
  classifyLanguage,
  extractFormats,
  languageLabel,
  normalizeTime,
  toHalfWidth,
  unique,
} from "./schedule-model";

const TOHO_API_BASE = "https://api2.tohotheater.jp";
const TOHO_MOVIE_BASE = "https://hlo.tohotheater.jp/net/movie/TNPI3060J01.do";
const TOHO_IMAGE_BASE = "https://www.tohotheater.jp/images_net/movie";
const TOKYO_TIME_ZONE = "Asia/Tokyo";
const TOHO_CACHE_SECONDS = 3_600;

export type PlanningDay = {
  date: string;
  tohoDate: string;
  weekday: string;
  label: string;
  selectable: boolean;
};

export type SeatSalesStatusCode = "A" | "B" | "C" | "D" | "G" | "unknown";

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
  rawEnglishLabels: string[];
  sourceLabels: string[];
  artworkUrl: string | null;
  runtimeMinutes: number | null;
  rating: string | null;
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

type LoadedScheduleResult = Extract<ScheduleResult, { ok: true }>;

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
  try {
    return await getCachedPlanningDays(scheduleCode);
  } catch {
    return fallbackPlanningDays();
  }
}

const getCachedPlanningDays = unstable_cache(
  async (scheduleCode: string): Promise<PlanningDay[]> => {
    const days = await fetchPlanningDays(scheduleCode);
    if (days.length === 0) {
      throw new Error("TOHO returned no planning days.");
    }

    return days;
  },
  ["toho-planning-days-v1"],
  { revalidate: TOHO_CACHE_SECONDS },
);

async function fetchPlanningDays(scheduleCode: string): Promise<PlanningDay[]> {
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

  const data = await fetchJson<TohoCalendarResponse>(
    `${TOHO_API_BASE}/api/schedule/v1/schedule/${scheduleCode}/TNPI3050J03?${params}`,
    6_000,
  );

  return (
    data.data
      ?.filter((day) => typeof day.date === "string")
      .slice(0, 7)
      .map((day) => toPlanningDay(day.date!, day.selectable === "1")) ?? []
  );
}

export async function getSchedule(
  cinema: TohoCinemaConfig,
  selectedDate: string,
): Promise<ScheduleResult> {
  try {
    return await getCachedScheduleSnapshot(
      cinema.scheduleCode,
      cinema.theaterCode,
      selectedDate,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not fetch live TOHO showtimes right now.",
      fetchedAt: new Date().toISOString(),
    };
  }
}

const getCachedScheduleSnapshot = unstable_cache(
  async (
    scheduleCode: string,
    theaterCode: string,
    selectedDate: string,
  ): Promise<LoadedScheduleResult> => {
    return fetchScheduleSnapshot(scheduleCode, theaterCode, selectedDate);
  },
  ["toho-schedule-snapshot-v1"],
  { revalidate: TOHO_CACHE_SECONDS },
);

async function fetchScheduleSnapshot(
  scheduleCode: string,
  theaterCode: string,
  selectedDate: string,
): Promise<LoadedScheduleResult> {
  const fetchedAt = new Date().toISOString();
  const showDay = dateToToho(selectedDate);
  const params = new URLSearchParams({
    __type__: "html",
    __useResultInfo__: "no",
    vg_cd: scheduleCode,
    show_day: showDay,
    term: "99",
    isMember: "",
    enter_kbn: "",
    _dc: unixSeconds(),
  });

  const data = await fetchJson<TohoScheduleResponse>(
    `${TOHO_API_BASE}/api/schedule/v1/schedule/${scheduleCode}/TNPI3050J02?${params}`,
    8_000,
  );

  if (data.status !== "0") {
    throw new Error("TOHO returned an unavailable schedule response.");
  }

  const theaters = data.data?.[0]?.list ?? [];
  const theater =
    theaters.find((item) => item.code === theaterCode) ?? theaters[0];
  const groups = normalizeMovieGroups(theater?.list ?? []);
  const artworkByCode = await getArtworkByMovieCode(groups);
  const cards = groups.map((group) => toMovieCard(group, artworkByCode));

  return {
    ok: true,
    cards,
    fetchedAt,
  };
}

function normalizeMovieGroups(movies: TohoMovie[]): MovieGroup[] {
  const groups = new Map<string, MovieGroup>();

  for (const movie of movies) {
    const mcode = movie.mcode || movie.code;
    if (!mcode) continue;

    let group = groups.get(mcode);
    if (!group) {
      group = {
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

  return {
    rawEnglishLabels,
    sourceLabels,
    artworkUrl: artworkByCode.get(group.mcode) ?? null,
    runtimeMinutes: group.runtimeMinutes,
    rating: group.rating,
    showtimes: group.showtimes,
  };
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
