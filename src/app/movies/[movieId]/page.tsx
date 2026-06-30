import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_CINEMA_SLUG, getCinemaBySlug } from "@/lib/cinemas";
import { getMovieProjectionList } from "@/lib/schedule-aggregate";
import { imaxHref, movieHref, moviesHref, plannerHref } from "@/lib/routes";
import {
  type PlanningDay,
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
} from "../components";
import { CinemaMapLink } from "../../cinema-map-link";
import { SectionNav } from "../../section-nav";

export const metadata: Metadata = {
  title: "Movie Projections | Easy Toho",
  description: "Cinema projections for one movie across Tokyo.",
};

type MovieParams = Promise<{
  movieId: string;
}>;

type SearchParams = Promise<{
  date?: string | string[];
}>;

export default async function MoviePage({
  params,
  searchParams,
}: {
  params: MovieParams;
  searchParams: SearchParams;
}) {
  const [{ movieId }, query] = await Promise.all([params, searchParams]);
  const defaultCinema = getCinemaBySlug(DEFAULT_CINEMA_SLUG);
  const days = await getPlanningDays(defaultCinema);
  const selectedDate = normalizeSelectedDate(firstParam(query.date), days);
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
              Movie projections
            </h1>
          </div>
          <SectionNav
            active="movies"
            cinemasHref={plannerHref(DEFAULT_CINEMA_SLUG, selectedDate)}
            moviesHref={moviesHref(selectedDate)}
            imaxHref={imaxHref(selectedDate)}
          />
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          hrefForDate={(date) => movieHref(movieId, date)}
        />

        <Suspense
          key={`${movieId}-${selectedDate}`}
          fallback={
            <ProjectionLoadingState
              selectedDay={selectedDay}
              selectedDate={selectedDate}
            />
          }
        >
          <MovieProjectionSection
            movieId={movieId}
            selectedDay={selectedDay}
            selectedDate={selectedDate}
          />
        </Suspense>
      </div>
    </main>
  );
}

async function MovieProjectionSection({
  movieId,
  selectedDay,
  selectedDate,
}: {
  movieId: string;
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
}) {
  const result = await getMovieProjectionList(movieId, selectedDate);

  if (!result.movie) {
    return (
      <section className="grid gap-3">
        <PartialScheduleWarning failedCinemas={result.failedCinemas} />
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            No projections found
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            No cinema schedule returned this movie for the selected day.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <PartialScheduleWarning failedCinemas={result.failedCinemas} />

      <div className="grid gap-4 border-b border-stone-200 pb-4 sm:grid-cols-[144px_minmax(0,1fr)]">
        <MoviePoster title={result.movie.title} artworkUrl={result.movie.artworkUrl} />
        <div className="min-w-0 self-end">
          <h2 className="break-words text-3xl font-semibold tracking-normal text-stone-950">
            {result.movie.title}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            {selectedDay
              ? `${selectedDay.weekday}, ${selectedDay.label}`
              : selectedDate}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {result.cinemas.map((projectionCinema) => (
          <article
            key={projectionCinema.cinema.slug}
            className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-1 border-b border-stone-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="inline-flex items-center gap-1 text-lg font-semibold text-stone-950">
                  <span>{projectionCinema.cinema.name}</span>
                  <CinemaMapLink
                    cinema={projectionCinema.cinema}
                    className="-my-1 h-5 w-5"
                  />
                </h3>
                <p className="text-sm text-stone-600">
                  {projectionCinema.cinema.area}
                </p>
              </div>
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
          </article>
        ))}
      </div>
    </section>
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
    <div className="mt-4">
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
              {showtime.end ? (
                <span className="text-sm text-stone-500">
                  to {showtime.end}
                </span>
              ) : null}
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

function ProjectionLoadingState({
  selectedDay,
  selectedDate,
}: {
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
}) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 border-b border-stone-200 pb-4 sm:grid-cols-[144px_minmax(0,1fr)]">
        <div className="aspect-[2/3] animate-pulse rounded-md bg-stone-200" />
        <div className="min-w-0 self-end">
          <div className="h-8 w-72 max-w-full animate-pulse rounded bg-stone-200" />
          <p className="mt-2 text-sm text-stone-600">
            {selectedDay
              ? `${selectedDay.weekday}, ${selectedDay.label}`
              : selectedDate}
          </p>
        </div>
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="h-6 w-56 animate-pulse rounded bg-stone-200" />
          <div className="mt-5 grid gap-2">
            {Array.from({ length: 3 }, (_, rowIndex) => (
              <div
                key={rowIndex}
                className="h-11 animate-pulse rounded-md bg-stone-100"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
