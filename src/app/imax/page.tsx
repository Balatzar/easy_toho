import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DEFAULT_CINEMA_SLUG,
  IMAX_CAPABLE_CINEMAS,
} from "@/lib/cinemas";
import {
  type ImaxAvailableMovie,
  getImaxAvailableMovies,
} from "@/lib/schedule-aggregate";
import { imaxHref, movieHref } from "@/lib/routes";
import { resolvePlanningSelection } from "@/lib/schedules";
import {
  DateTabs,
  MetaBadge,
  MoviePoster,
  PartialScheduleWarning,
  ShowtimeRows,
} from "../movies/components";
import { BrandHeader } from "../brand";
import { CinemaMapLink } from "../cinema-map-link";
import { createPageMetadata } from "../metadata-utils";
import { PendingLink } from "../pending-link";
import { SectionNav } from "../section-nav";

export const metadata: Metadata = createPageMetadata({
  title: "IMAX",
  description: "IMAX cinema screenings across Tokyo.",
});

type SearchParams = Promise<{
  date?: string | string[];
}>;

export default async function ImaxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { days, selectedDate, selectedDay } = resolvePlanningSelection(
    params.date,
  );

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <BrandHeader title="IMAX movies" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-stone-500">
              Showtimes are in JST
            </p>
            <SectionNav
              active="imax"
              cinemaSlug={DEFAULT_CINEMA_SLUG}
              selectedDate={selectedDate}
            />
          </div>
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          hrefForDate={imaxHref}
        />

        <section className="min-w-0">
          <div className="mb-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
                Premium-format search
              </p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight text-stone-950">
                {selectedDay
                  ? `${selectedDay.weekday}, ${selectedDay.label}`
                  : selectedDate}
              </h2>
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
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
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
    <article className="grid grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-400 sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[128px_minmax(240px,0.8fr)_minmax(420px,1.5fr)]">
      <PendingLink
        href={detailHref}
        className="block p-3 transition-opacity hover:opacity-90"
      >
        <MoviePoster title={movie.title} artworkUrl={movie.artworkUrl} />
      </PendingLink>

      <div className="min-w-0 p-3 sm:pl-0 lg:border-r lg:border-stone-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PendingLink
                href={detailHref}
                className="min-w-0 hover:underline"
              >
                <h2 className="break-words text-xl font-semibold leading-tight tracking-normal text-stone-950">
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
      </div>

      <div className="col-span-2 border-t border-stone-100 p-3 lg:col-span-1 lg:border-t-0">
        <div className="divide-y divide-stone-100">
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
                <ShowtimeRows
                  language="english"
                  showtimes={projectionCinema.englishShowtimes}
                />
              ) : null}
              {projectionCinema.otherShowtimes.length > 0 ? (
                <ShowtimeRows
                  language="japanese"
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

function ImaxMovieListLoadingState() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 4 }, (_, index) => (
        <article
          key={index}
          className="grid animate-pulse grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[128px_minmax(240px,0.8fr)_minmax(420px,1.5fr)]"
        >
          <div className="p-3">
            <div className="aspect-[2/3] rounded-md bg-stone-200" />
          </div>
          <div className="min-w-0 p-3 sm:pl-0 lg:border-r lg:border-stone-100">
            <div className="h-6 w-64 max-w-full rounded bg-stone-200" />
            <div className="mt-2 h-4 w-40 rounded bg-stone-100" />
          </div>
          <div className="col-span-2 border-t border-stone-100 p-3 lg:col-span-1 lg:border-t-0">
            <div className="grid gap-2">
              {Array.from({ length: 3 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="h-11 rounded-md bg-stone-100"
                />
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
