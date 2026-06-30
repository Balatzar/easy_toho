import { IMAX_CAPABLE_CINEMAS, TOKYO_CINEMAS, type Cinema } from "./cinemas";
import {
  type MovieCard,
  type ScheduleResult,
  type Showtime,
  getSchedule,
  isImaxScreening,
} from "./schedules";
import {
  earliestMinutes,
  sameMovieIdentity as sameScheduleMovieIdentity,
} from "./schedule-model";

export type CinemaScheduleFailure = {
  cinema: Cinema;
  error: string;
};

export type EnglishWatchableMovie = {
  id: string;
  title: string;
  artworkUrl: string | null;
};

export type EnglishWatchableMoviesResult = {
  movies: EnglishWatchableMovie[];
  failedCinemas: CinemaScheduleFailure[];
};

export type MovieProjectionCinema = {
  cinema: Cinema;
  card: MovieCard;
  englishShowtimes: Showtime[];
  otherShowtimes: Showtime[];
};

export type MovieProjectionResult = {
  movie: EnglishWatchableMovie | null;
  cinemas: MovieProjectionCinema[];
  failedCinemas: CinemaScheduleFailure[];
};

export type ImaxAvailableMovieCinema = {
  cinema: Cinema;
  card: MovieCard;
  englishShowtimes: Showtime[];
  otherShowtimes: Showtime[];
};

export type ImaxAvailableMovie = {
  id: string;
  title: string;
  artworkUrl: string | null;
  runtimeMinutes: number | null;
  rating: string | null;
  cinemas: ImaxAvailableMovieCinema[];
};

export type ImaxAvailableMoviesResult = {
  movies: ImaxAvailableMovie[];
  failedCinemas: CinemaScheduleFailure[];
};

type LoadedCinemaSchedule = {
  cinema: Cinema;
  cards: MovieCard[];
};

type MultiCinemaScheduleResult = {
  loaded: LoadedCinemaSchedule[];
  failedCinemas: CinemaScheduleFailure[];
};

type MovieAccumulator = EnglishWatchableMovie & {
  earliestEnglishMinutes: number;
  runtimeMinutes: number | null;
  rawEnglishLabels: string[];
};

type ImaxMovieAccumulator = Omit<ImaxAvailableMovie, "cinemas"> & {
  cinemas: ImaxAvailableMovieCinema[];
  earliestImaxMinutes: number;
  rawEnglishLabels: string[];
};

export async function getEnglishWatchableMovies(
  selectedDate: string,
): Promise<EnglishWatchableMoviesResult> {
  const schedules = await getCinemaSchedules(selectedDate);
  const movies = new Map<string, MovieAccumulator>();

  for (const schedule of schedules.loaded) {
    for (const card of schedule.cards) {
      const englishShowtimes = card.showtimes.filter(
        (showtime) => showtime.language === "english",
      );

      if (englishShowtimes.length === 0) continue;

      const earliestEnglishMinutes = earliestMinutes(englishShowtimes);
      const existing = findMatchingAccumulator(movies.values(), card);

      if (!existing) {
        movies.set(card.id, {
          id: card.id,
          title: card.title,
          artworkUrl: card.artworkUrl,
          earliestEnglishMinutes,
          runtimeMinutes: card.runtimeMinutes,
          rawEnglishLabels: card.rawEnglishLabels,
        });
        continue;
      }

      existing.earliestEnglishMinutes = Math.min(
        existing.earliestEnglishMinutes,
        earliestEnglishMinutes,
      );
      existing.title = shortestLabel(existing.title, card.title);
      existing.artworkUrl ??= card.artworkUrl;
      existing.runtimeMinutes ??= card.runtimeMinutes;
    }
  }

  return {
    movies: Array.from(movies.values())
      .sort((a, b) => {
        const time = a.earliestEnglishMinutes - b.earliestEnglishMinutes;
        if (time !== 0) return time;
        return a.title.localeCompare(b.title);
      })
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        artworkUrl: movie.artworkUrl,
      })),
    failedCinemas: schedules.failedCinemas,
  };
}

export async function getImaxAvailableMovies(
  selectedDate: string,
): Promise<ImaxAvailableMoviesResult> {
  const schedules = await getCinemaSchedules(
    selectedDate,
    IMAX_CAPABLE_CINEMAS,
  );
  const movies = new Map<string, ImaxMovieAccumulator>();

  for (const schedule of schedules.loaded) {
    for (const card of schedule.cards) {
      const imaxShowtimes = card.showtimes.filter(isImaxScreening);
      if (imaxShowtimes.length === 0) continue;

      const englishShowtimes = imaxShowtimes.filter(
        (showtime) => showtime.language === "english",
      );
      const otherShowtimes = imaxShowtimes.filter(
        (showtime) => showtime.language !== "english",
      );
      const projectionCinema = {
        cinema: schedule.cinema,
        card,
        englishShowtimes,
        otherShowtimes,
      };
      const earliestImaxMinutes = earliestMinutes(imaxShowtimes);
      const existing = findMatchingAccumulator(movies.values(), card);

      if (!existing) {
        movies.set(card.id, {
          id: card.id,
          title: card.title,
          artworkUrl: card.artworkUrl,
          runtimeMinutes: card.runtimeMinutes,
          rating: card.rating,
          cinemas: [projectionCinema],
          earliestImaxMinutes,
          rawEnglishLabels: card.rawEnglishLabels,
        });
        continue;
      }

      existing.earliestImaxMinutes = Math.min(
        existing.earliestImaxMinutes,
        earliestImaxMinutes,
      );
      existing.title = shortestLabel(existing.title, card.title);
      existing.artworkUrl ??= card.artworkUrl;
      existing.runtimeMinutes ??= card.runtimeMinutes;
      existing.rating ??= card.rating;
      existing.cinemas.push(projectionCinema);
    }
  }

  return {
    movies: Array.from(movies.values())
      .sort((a, b) => {
        const time = a.earliestImaxMinutes - b.earliestImaxMinutes;
        if (time !== 0) return time;
        return a.title.localeCompare(b.title);
      })
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        artworkUrl: movie.artworkUrl,
        runtimeMinutes: movie.runtimeMinutes,
        rating: movie.rating,
        cinemas: movie.cinemas.sort(compareImaxMovieCinemas),
      })),
    failedCinemas: schedules.failedCinemas,
  };
}

export async function getMovieProjectionList(
  movieId: string,
  selectedDate: string,
): Promise<MovieProjectionResult> {
  const schedules = await getCinemaSchedules(selectedDate);
  const projections = schedules.loaded.flatMap((schedule) =>
    schedule.cards.map((card) => ({
      cinema: schedule.cinema,
      card,
    })),
  );
  const seedCard = projections.find((projection) => projection.card.id === movieId)
    ?.card;
  const cinemas: MovieProjectionCinema[] = [];
  let movie: EnglishWatchableMovie | null = null;

  if (!seedCard) {
    return {
      movie,
      cinemas,
      failedCinemas: schedules.failedCinemas,
    };
  }

  for (const projection of projections) {
    const { card } = projection;
    if (!sameMovieCard(seedCard, card)) continue;

    const englishShowtimes = card.showtimes.filter(
      (showtime) => showtime.language === "english",
    );
    const otherShowtimes = card.showtimes.filter(
      (showtime) => showtime.language !== "english",
    );

    cinemas.push({
      cinema: projection.cinema,
      card,
      englishShowtimes,
      otherShowtimes,
    });

    if (!movie) {
      movie = {
        id: card.id,
        title: card.title,
        artworkUrl: card.artworkUrl,
      };
    } else {
      movie.title = shortestLabel(movie.title, card.title);
      movie.artworkUrl ??= card.artworkUrl;
    }
  }

  return {
    movie,
    cinemas: cinemas.sort(compareProjectionCinemas),
    failedCinemas: schedules.failedCinemas,
  };
}

async function getCinemaSchedules(
  selectedDate: string,
  cinemas: Cinema[] = TOKYO_CINEMAS,
): Promise<MultiCinemaScheduleResult> {
  const results = await Promise.all(
    cinemas.map(async (cinema) => {
      const schedule = await getSchedule(cinema, selectedDate);
      return { cinema, schedule };
    }),
  );

  return results.reduce<MultiCinemaScheduleResult>(
    (aggregate, result) => {
      if (isLoadedSchedule(result.schedule)) {
        aggregate.loaded.push({
          cinema: result.cinema,
          cards: result.schedule.cards,
        });
      } else {
        aggregate.failedCinemas.push({
          cinema: result.cinema,
          error: result.schedule.error,
        });
      }

      return aggregate;
    },
    { loaded: [], failedCinemas: [] },
  );
}

function isLoadedSchedule(
  schedule: ScheduleResult,
): schedule is Extract<ScheduleResult, { ok: true }> {
  return schedule.ok;
}

function compareProjectionCinemas(
  a: MovieProjectionCinema,
  b: MovieProjectionCinema,
): number {
  const aHasEnglish = a.englishShowtimes.length > 0;
  const bHasEnglish = b.englishShowtimes.length > 0;

  if (aHasEnglish !== bHasEnglish) return aHasEnglish ? -1 : 1;

  const aTime = earliestMinutes(
    aHasEnglish ? a.englishShowtimes : a.card.showtimes,
  );
  const bTime = earliestMinutes(
    bHasEnglish ? b.englishShowtimes : b.card.showtimes,
  );

  if (aTime !== bTime) return aTime - bTime;
  return a.cinema.name.localeCompare(b.cinema.name);
}

function compareImaxMovieCinemas(
  a: ImaxAvailableMovieCinema,
  b: ImaxAvailableMovieCinema,
): number {
  const aTime = earliestMinutes([...a.englishShowtimes, ...a.otherShowtimes]);
  const bTime = earliestMinutes([...b.englishShowtimes, ...b.otherShowtimes]);

  if (aTime !== bTime) return aTime - bTime;
  return a.cinema.name.localeCompare(b.cinema.name);
}

function shortestLabel(current: string, next: string): string {
  return next.length < current.length ? next : current;
}

function findMatchingAccumulator<
  T extends {
    id: string;
    runtimeMinutes: number | null;
    rawEnglishLabels: string[];
  },
>(movies: Iterable<T>, card: MovieCard): T | undefined {
  for (const movie of movies) {
    if (matchesCardIdentity(movie, card)) return movie;
  }

  return undefined;
}

function sameMovieCard(seed: MovieCard, candidate: MovieCard): boolean {
  return sameScheduleMovieIdentity(seed, candidate);
}

function matchesCardIdentity(
  movie: {
    id: string;
    runtimeMinutes: number | null;
    rawEnglishLabels: string[];
  },
  card: MovieCard,
): boolean {
  return sameScheduleMovieIdentity(movie, card);
}
