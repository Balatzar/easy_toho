import { TOKYO_CINEMAS, type Cinema } from "./cinemas";
import {
  type MovieCard,
  type Showtime,
  isImaxScreening,
} from "./schedules";
import { sameMovieIdentity, timeToMinutes } from "./schedule-model";
import {
  type CinemaScheduleFailure,
  type LoadedCinemaSchedule,
  getCinemaSchedules,
} from "./schedule-aggregate";

export type CinemaStat = {
  cinema: Cinema;
  movieCount: number;
  showtimeCount: number;
  englishShowtimeCount: number;
};

export type MovieStat = {
  id: string;
  title: string;
  runtimeMinutes: number | null;
  rawEnglishLabels: string[];
  cinemaCount: number;
  showtimeCount: number;
};

export type FormatStat = {
  label: string;
  count: number;
};

export type TimeBucketStat = {
  label: string;
  count: number;
};

export type CinemaStatsResult = {
  cinemaCount: number;
  totalCinemaCount: number;
  movieCount: number;
  showtimeCount: number;
  englishShowtimeCount: number;
  premiumShowtimeCount: number;
  peakTimeLabel: string | null;
  cinemas: CinemaStat[];
  movies: MovieStat[];
  formats: FormatStat[];
  timeBuckets: TimeBucketStat[];
  failedCinemas: CinemaScheduleFailure[];
};

type MovieAccumulator = Omit<MovieStat, "cinemaCount"> & {
  cinemaSlugs: Set<string>;
};

const PREMIUM_FORMATS = new Set([
  "4DX",
  "3D",
  "Dolby Atmos",
  "Dolby Cinema",
  "IMAX",
  "IMAX Laser",
  "MX4D",
  "Premium Theater",
  "Roaring sound",
  "Screen X",
  "TCX",
]);

const TIME_BUCKETS = [
  { label: "Before 10", start: 0, end: 599 },
  { label: "10–12", start: 600, end: 779 },
  { label: "13–15", start: 780, end: 959 },
  { label: "16–18", start: 960, end: 1139 },
  { label: "19–21", start: 1140, end: 1319 },
  { label: "After 22", start: 1320, end: Infinity },
];

export async function getCinemaStats(
  selectedDate: string,
): Promise<CinemaStatsResult> {
  const schedules = await getCinemaSchedules(selectedDate);
  return aggregateCinemaStats(schedules.loaded, schedules.failedCinemas);
}

function aggregateCinemaStats(
  schedules: LoadedCinemaSchedule[],
  failedCinemas: CinemaScheduleFailure[],
): CinemaStatsResult {
  const movies: MovieAccumulator[] = [];
  const formatCounts = new Map<string, number>();
  const timeCounts = new Map(TIME_BUCKETS.map((bucket) => [bucket.label, 0]));
  let showtimeCount = 0;
  let englishShowtimeCount = 0;
  let premiumShowtimeCount = 0;

  const cinemas = schedules
    .map((schedule) => {
      const showtimes = schedule.cards.flatMap((card) => card.showtimes);
      const cinemaEnglishShowtimeCount = showtimes.filter(
        (showtime) => showtime.language === "english",
      ).length;

      showtimeCount += showtimes.length;
      englishShowtimeCount += cinemaEnglishShowtimeCount;
      premiumShowtimeCount += showtimes.filter(isPremiumShowtime).length;

      for (const card of schedule.cards) {
        addMovieStat(movies, card, schedule.cinema.slug);

        for (const showtime of card.showtimes) {
          addFormatStats(formatCounts, showtime);
          addTimeStat(timeCounts, showtime);
        }
      }

      return {
        cinema: schedule.cinema,
        movieCount: schedule.cards.length,
        showtimeCount: showtimes.length,
        englishShowtimeCount: cinemaEnglishShowtimeCount,
      };
    })
    .sort((a, b) => {
      const showtimes = b.showtimeCount - a.showtimeCount;
      if (showtimes !== 0) return showtimes;
      return a.cinema.name.localeCompare(b.cinema.name);
    });

  const timeBuckets = TIME_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: timeCounts.get(bucket.label) ?? 0,
  }));
  const peakBucket = timeBuckets.reduce<TimeBucketStat | null>(
    (peak, bucket) => (!peak || bucket.count > peak.count ? bucket : peak),
    null,
  );

  return {
    cinemaCount: schedules.length,
    totalCinemaCount: TOKYO_CINEMAS.length,
    movieCount: movies.length,
    showtimeCount,
    englishShowtimeCount,
    premiumShowtimeCount,
    peakTimeLabel: peakBucket && peakBucket.count > 0 ? peakBucket.label : null,
    cinemas,
    movies: movies
      .map(({ cinemaSlugs, ...movie }) => ({
        ...movie,
        cinemaCount: cinemaSlugs.size,
      }))
      .sort((a, b) => {
        const cinemas = b.cinemaCount - a.cinemaCount;
        if (cinemas !== 0) return cinemas;
        const showtimes = b.showtimeCount - a.showtimeCount;
        if (showtimes !== 0) return showtimes;
        return a.title.localeCompare(b.title);
      }),
    formats: Array.from(formatCounts, ([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    timeBuckets,
    failedCinemas,
  };
}

function addMovieStat(
  movies: MovieAccumulator[],
  card: MovieCard,
  cinemaSlug: string,
): void {
  const movie = movies.find((candidate) => sameMovieIdentity(candidate, card));

  if (movie) {
    movie.cinemaSlugs.add(cinemaSlug);
    movie.showtimeCount += card.showtimes.length;
    if (card.title.length < movie.title.length) movie.title = card.title;
    movie.runtimeMinutes ??= card.runtimeMinutes;
    return;
  }

  movies.push({
    id: card.id,
    title: card.title,
    runtimeMinutes: card.runtimeMinutes,
    rawEnglishLabels: card.rawEnglishLabels,
    cinemaSlugs: new Set([cinemaSlug]),
    showtimeCount: card.showtimes.length,
  });
}

function addFormatStats(
  formatCounts: Map<string, number>,
  showtime: Showtime,
): void {
  for (const format of showtime.formats) {
    if (!PREMIUM_FORMATS.has(format)) continue;
    formatCounts.set(format, (formatCounts.get(format) ?? 0) + 1);
  }
}

function addTimeStat(
  timeCounts: Map<string, number>,
  showtime: Showtime,
): void {
  const minutes = timeToMinutes(showtime.start);
  const bucket = TIME_BUCKETS.find(
    ({ start, end }) => minutes >= start && minutes <= end,
  );
  if (!bucket) return;
  timeCounts.set(bucket.label, (timeCounts.get(bucket.label) ?? 0) + 1);
}

function isPremiumShowtime(showtime: Showtime): boolean {
  return isImaxScreening(showtime) ||
    showtime.formats.some((format) => PREMIUM_FORMATS.has(format));
}
