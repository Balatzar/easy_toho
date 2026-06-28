import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  DEFAULT_CINEMA_SLUG,
  TOKYO_CINEMAS,
  getCinemaBySlug,
} from "@/lib/cinemas";
import { getEnglishWatchableMovies } from "@/lib/toho-aggregate";
import { moviesHref, movieHref, plannerHref } from "@/lib/routes";
import { getPlanningDays, normalizeSelectedDate } from "@/lib/toho";
import {
  DateTabs,
  MoviePoster,
  PartialScheduleWarning,
} from "./components";

export const metadata: Metadata = {
  title: "Movies | Easy Toho",
  description: "English-watchable TOHO Cinemas movies across Tokyo.",
};

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
  const days = await getPlanningDays(defaultCinema.scheduleCode);
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
              English-watchable movies
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href={plannerHref(DEFAULT_CINEMA_SLUG, selectedDate)}
              className="rounded border border-stone-300 bg-white px-2.5 py-1 text-stone-700 hover:border-stone-950"
            >
              Cinemas
            </Link>
            <span className="rounded border border-red-700 bg-red-50 px-2.5 py-1 text-red-950">
              Movies
            </span>
          </nav>
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          hrefForDate={moviesHref}
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
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            No English-watchable movies
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            TOHO did not return English-watchable screenings for this day.
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
          <Link
            key={movie.id}
            href={movieHref(movie.id, selectedDate)}
            className="group rounded-lg border border-stone-200 bg-white p-2 shadow-sm transition-colors hover:border-stone-950"
          >
            <MoviePoster title={movie.title} artworkUrl={movie.artworkUrl} />
            {movie.artworkUrl ? (
              <h2 className="mt-2 break-words text-sm font-semibold leading-snug text-stone-950">
                {movie.title}
              </h2>
            ) : null}
          </Link>
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
          className="rounded-lg border border-stone-200 bg-white p-2 shadow-sm"
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
