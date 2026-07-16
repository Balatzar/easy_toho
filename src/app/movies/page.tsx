import type { Metadata } from "next";
import { Suspense } from "react";
import {
  DEFAULT_CINEMA_SLUG,
  TOKYO_CINEMAS,
  getCinemaBySlug,
} from "@/lib/cinemas";
import { getEnglishWatchableMovies } from "@/lib/schedule-aggregate";
import { moviesHref, movieHref } from "@/lib/routes";
import { getPlanningDays, normalizeSelectedDate } from "@/lib/schedules";
import {
  DateTabs,
  MoviePoster,
  PartialScheduleWarning,
} from "./components";
import { BrandHeader } from "../brand";
import { createPageMetadata } from "../metadata-utils";
import { PendingLink } from "../pending-link";
import { SectionNav } from "../section-nav";

export const metadata: Metadata = createPageMetadata({
  title: "Movies",
  description: "English-watchable cinema movies across Tokyo.",
});

type SearchParams = Promise<{
  date?: string | string[];
}>;

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const defaultCinema = getCinemaBySlug(DEFAULT_CINEMA_SLUG);
  const days = await getPlanningDays(defaultCinema);
  const selectedDate = normalizeSelectedDate(firstParam(params.date), days);
  const selectedDay = days.find((day) => day.date === selectedDate);

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <BrandHeader title="English-watchable movies" />
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
          hrefForDate={moviesHref}
        />

        <section className="min-w-0">
          <div className="mb-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
                English-watchable across Tokyo
              </p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight text-stone-950">
                {selectedDay
                  ? `${selectedDay.weekday}, ${selectedDay.label}`
                  : selectedDate}
              </h2>
              <p className="text-sm text-stone-600">
                {TOKYO_CINEMAS.length} Tokyo Cinemas
              </p>
            </div>
          </div>

          <Suspense key={selectedDate} fallback={<MovieGridLoadingState />}>
            <MovieIndexSection selectedDate={selectedDate} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

async function MovieIndexSection({
  selectedDate,
}: {
  selectedDate: string;
}) {
  const result = await getEnglishWatchableMovies(selectedDate);

  if (result.movies.length === 0) {
    return (
      <div className="grid gap-3">
        <PartialScheduleWarning failedCinemas={result.failedCinemas} />
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            No English-watchable movies
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            No cinema schedule returned English-watchable screenings for this day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <PartialScheduleWarning failedCinemas={result.failedCinemas} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {result.movies.map((movie) => (
          <PendingLink
            key={movie.id}
            href={movieHref(movie.id, selectedDate)}
            className="group rounded-md border border-stone-200 bg-white p-2 shadow-sm transition-colors hover:border-stone-400"
          >
            <MoviePoster title={movie.title} artworkUrl={movie.artworkUrl} />
            {movie.artworkUrl ? (
              <h2 className="mt-2 break-words text-sm font-semibold leading-snug text-stone-950">
                {movie.title}
              </h2>
            ) : null}
          </PendingLink>
        ))}
      </div>
    </div>
  );
}

function MovieGridLoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }, (_, index) => (
        <div
          key={index}
          className="rounded-md border border-stone-200 bg-white p-2 shadow-sm"
        >
          <div className="aspect-[2/3] animate-pulse rounded-md bg-stone-200" />
          <div className="mt-2 h-4 animate-pulse rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
