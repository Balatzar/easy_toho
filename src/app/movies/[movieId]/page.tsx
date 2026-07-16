import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_CINEMA_SLUG, getCinemaBySlug } from "@/lib/cinemas";
import { getMovieProjectionList } from "@/lib/schedule-aggregate";
import { movieHref } from "@/lib/routes";
import {
  type PlanningDay,
  getPlanningDays,
  normalizeSelectedDate,
} from "@/lib/schedules";
import {
  DateTabs,
  MoviePoster,
  PartialScheduleWarning,
  ShowtimeRows,
} from "../components";
import { BrandHeader } from "../../brand";
import { CinemaMapLink } from "../../cinema-map-link";
import { createPageMetadata } from "../../metadata-utils";
import { SectionNav } from "../../section-nav";

export const metadata: Metadata = createPageMetadata({
  title: "Movie Projections",
  description: "Cinema projections for one movie across Tokyo.",
});

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
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <BrandHeader title="Movie projections" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-stone-500">
              Showtimes are in JST
            </p>
            <SectionNav
              active="movies"
              cinemaSlug={DEFAULT_CINEMA_SLUG}
              selectedDate={selectedDate}
            />
          </div>
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
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
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

      <div className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[144px_minmax(0,1fr)]">
        <MoviePoster
          title={result.movie.title}
          artworkUrl={result.movie.artworkUrl}
        />
        <div className="min-w-0 self-end">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
            Movie projection list
          </p>
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
            className="rounded-md border border-stone-200 bg-white p-4 shadow-sm"
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
              <ShowtimeRows
                label="English-watchable"
                showtimes={projectionCinema.englishShowtimes}
              />
            ) : null}
            {projectionCinema.otherShowtimes.length > 0 ? (
              <ShowtimeRows
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

function ProjectionLoadingState({
  selectedDay,
  selectedDate,
}: {
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
}) {
  return (
    <div className="grid gap-4" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[144px_minmax(0,1fr)]">
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
          className="rounded-md border border-stone-200 bg-white p-4 shadow-sm"
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
