import { TOKYO_CINEMAS, type Cinema } from "./cinemas";
import {
  type MovieCard,
  type ScheduleResult,
  type Showtime,
  getSchedule,
} from "./toho";

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

type LoadedCinemaSchedule = {
  cinema: Cinema;
  cards: MovieCard[];
};

type TokyoScheduleResult = {
  loaded: LoadedCinemaSchedule[];
  failedCinemas: CinemaScheduleFailure[];
};

type MovieAccumulator = EnglishWatchableMovie & {
  earliestEnglishMinutes: number;
};

export async function getEnglishWatchableMovies(
  selectedDate: string,
): Promise<EnglishWatchableMoviesResult> {
  const schedules = await getTokyoCinemaSchedules(selectedDate);
  const movies = new Map<string, MovieAccumulator>();

  for (const schedule of schedules.loaded) {
    for (const card of schedule.cards) {
      const englishShowtimes = card.showtimes.filter(
        (showtime) => showtime.language === "english",
      );

      if (englishShowtimes.length === 0) continue;

      const earliestEnglishMinutes = earliestMinutes(englishShowtimes);
      const existing = movies.get(card.id);

      if (!existing) {
        movies.set(card.id, {
          id: card.id,
          title: card.title,
          artworkUrl: card.artworkUrl,
          earliestEnglishMinutes,
        });
        continue;
      }

      existing.earliestEnglishMinutes = Math.min(
        existing.earliestEnglishMinutes,
        earliestEnglishMinutes,
      );
      existing.title = shortestLabel(existing.title, card.title);
      existing.artworkUrl ??= card.artworkUrl;
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

export async function getMovieProjectionList(
  movieCode: string,
  selectedDate: string,
): Promise<MovieProjectionResult> {
  const schedules = await getTokyoCinemaSchedules(selectedDate);
  const cinemas: MovieProjectionCinema[] = [];
  let movie: EnglishWatchableMovie | null = null;

  for (const schedule of schedules.loaded) {
    const card = schedule.cards.find((item) => item.id === movieCode);
    if (!card) continue;

    const englishShowtimes = card.showtimes.filter(
      (showtime) => showtime.language === "english",
    );
    const otherShowtimes = card.showtimes.filter(
      (showtime) => showtime.language !== "english",
    );

    cinemas.push({
      cinema: schedule.cinema,
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

async function getTokyoCinemaSchedules(
  selectedDate: string,
): Promise<TokyoScheduleResult> {
  const results = await Promise.all(
    TOKYO_CINEMAS.map(async (cinema) => {
      const schedule = await getSchedule(cinema, selectedDate);
      return { cinema, schedule };
    }),
  );

  return results.reduce<TokyoScheduleResult>(
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

function earliestMinutes(showtimes: Showtime[]): number {
  if (showtimes.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...showtimes.map((showtime) => timeToMinutes(showtime.start)));
}

function timeToMinutes(time: string): number {
  const [hour = "0", minute = "0"] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function shortestLabel(current: string, next: string): string {
  return next.length < current.length ? next : current;
}
