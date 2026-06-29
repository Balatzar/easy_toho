import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DEFAULT_CINEMA_SLUG,
  IMAX_CAPABLE_CINEMAS,
  getCinemaBySlug,
} from "@/lib/cinemas";
import {
  type ImaxAvailableMovie,
  getImaxAvailableMovies,
} from "@/lib/schedule-aggregate";
import { imaxHref, movieHref, moviesHref, plannerHref } from "@/lib/routes";
import {
  type Showtime,
  getPlanningDays,
  normalizeSelectedDate,
} from "@/lib/schedules";
import {
  DateTabs,
  LanguageBadge,
  MetaBadge,
  MoviePoster,
  PartialScheduleWarning,
  SeatStatus,
} from "../movies/components";
import { CinemaMapLink } from "../cinema-map-link";
import { PendingLink } from "../pending-link";
import { SectionNav } from "../section-nav";

export const metadata: Metadata = {
  title: "IMAX | Easy Toho",
  description: "IMAX cinema screenings across Tokyo.",
};

type SearchParams = Promise<{
  date?: string | string[];
}>;

export default async function ImaxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const planningCinema =
    IMAX_CAPABLE_CINEMAS[0] ?? getCinemaBySlug(DEFAULT_CINEMA_SLUG);
  const days = await getPlanningDays(planningCinema);
  const selectedDate = normalizeSelectedDate(firstParam(params.date), days);
  const selectedDay = days.find((day) => day.date === selectedDate);

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Easy Toho
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">
              IMAX movies
            </h1>
          </div>
          <SectionNav
            active="imax"
            cinemasHref={plannerHref(DEFAULT_CINEMA_SLUG, selectedDate)}
            moviesHref={moviesHref(selectedDate)}
            imaxHref={imaxHref(selectedDate)}
          />
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          hrefForDate={imaxHref}
        />

        <section className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-950">
                {selectedDay
                  ? `${selectedDay.weekday}, ${selectedDay.label}`
                  : selectedDate}
              </p>
              <p className="text-sm text-stone-600">
                {IMAX_CAPABLE_CINEMAS.length} IMAX Tokyo Cinemas
              </p>
            </div>
          </div>

          <Suspense key={selectedDate} fallback={<ImaxMovieListLoadingState />}>
            <ImaxMovieListSection selectedDate={selectedDate} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

async function ImaxMovieListSection({
  selectedDate,
}: {
  selectedDate: string;
}) {
  const result = await getImaxAvailableMovies(selectedDate);

  if (result.movies.length === 0) {
    return (
      <div className="grid gap-3">
        <PartialScheduleWarning failedCinemas={result.failedCinemas} />
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            No IMAX movies
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            No cinema schedule returned IMAX screenings for this day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <PartialScheduleWarning failedCinemas={result.failedCinemas} />
      {result.movies.map((movie) => (
        <ImaxMovieCard
          key={movie.id}
          movie={movie}
          selectedDate={selectedDate}
        />
      ))}
    </div>
  );
}

function ImaxMovieCard({
  movie,
  selectedDate,
}: {
  movie: ImaxAvailableMovie;
  selectedDate: string;
}) {
  const detailHref = movieHref(movie.id, selectedDate);

  return (
    <article className="grid gap-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)]">
      <PendingLink
        href={detailHref}
        className="block rounded-md transition-opacity hover:opacity-90"
      >
        <MoviePoster title={movie.title} artworkUrl={movie.artworkUrl} />
      </PendingLink>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PendingLink
                href={detailHref}
                className="min-w-0 hover:underline"
              >
                <h2 className="break-words text-xl font-semibold tracking-normal text-stone-950">
                  {movie.title}
                </h2>
              </PendingLink>
              {movie.rating ? <MetaBadge>{movie.rating}</MetaBadge> : null}
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {movie.runtimeMinutes ? `${movie.runtimeMinutes} min · ` : ""}
              {movie.cinemas.length}{" "}
              {movie.cinemas.length === 1 ? "Cinema" : "Cinemas"}
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
          {movie.cinemas.map((projectionCinema) => (
            <div key={projectionCinema.cinema.slug} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="inline-flex items-center gap-1 text-sm font-semibold text-stone-950">
                  <span>{projectionCinema.cinema.name}</span>
                  <CinemaMapLink
                    cinema={projectionCinema.cinema}
                    className="-my-1 h-5 w-5"
                  />
                </h3>
                <span className="text-xs text-stone-500">
                  {projectionCinema.cinema.area}
                </span>
              </div>

              {projectionCinema.englishShowtimes.length > 0 ? (
                <ShowtimeGroup
                  label="English-watchable"
                  showtimes={projectionCinema.englishShowtimes}
                />
              ) : null}
              {projectionCinema.otherShowtimes.length > 0 ? (
                <ShowtimeGroup
                  label="Japanese"
                  showtimes={projectionCinema.otherShowtimes}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function ShowtimeGroup({
  label,
  showtimes,
}: {
  label: string;
  showtimes: Showtime[];
}) {
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </h4>
      <div className="mt-2 grid gap-2">
        {showtimes.map((showtime, index) => (
          <div
            key={`${showtime.start}-${showtime.end}-${showtime.screen}-${index}`}
            className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-stone-950">
                {showtime.start}
              </span>
              <span className="text-sm text-stone-500">to {showtime.end}</span>
              <span className="text-sm text-stone-600">{showtime.screen}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <LanguageBadge language={showtime.language} compact />
              {showtime.formats.map((format, formatIndex) => (
                <MetaBadge key={`${format}-${formatIndex}`}>{format}</MetaBadge>
              ))}
              {showtime.eventLabel ? (
                <MetaBadge>{showtime.eventLabel}</MetaBadge>
              ) : null}
              <SeatStatus status={showtime.availability}>
                {showtime.availabilityLabel}
              </SeatStatus>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImaxMovieListLoadingState() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }, (_, index) => (
        <article
          key={index}
          className="grid gap-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)]"
        >
          <div className="aspect-[2/3] animate-pulse rounded-md bg-stone-200" />
          <div className="min-w-0">
            <div className="h-6 w-64 max-w-full animate-pulse rounded bg-stone-200" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded bg-stone-100" />
            <div className="mt-5 grid gap-2">
              {Array.from({ length: 3 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="h-11 animate-pulse rounded-md bg-stone-100"
                />
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
