import { Suspense } from "react";
import {
  type Cinema,
  DEFAULT_CINEMA_SLUG,
  TOKYO_CINEMAS,
  getCinemaBySlug,
} from "@/lib/cinemas";
import {
  type MovieCard,
  type PlanningDay,
  getPlanningDays,
  getSchedule,
  normalizeSelectedDate,
} from "@/lib/schedules";
import { movieHref, plannerHref } from "@/lib/routes";
import { BrandHeader } from "./brand";
import { CinemaMapLink } from "./cinema-map-link";
import { CinemaSelector } from "./cinema-selector";
import {
  DateTabs,
  LanguageBadge,
  MetaBadge,
  ShowtimeRows,
} from "./movies/components";
import { PendingLink } from "./pending-link";
import { SectionNav } from "./section-nav";

type SearchParams = Promise<{
  cinema?: string | string[];
  date?: string | string[];
}>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const cinemaSlug = firstParam(params.cinema) ?? DEFAULT_CINEMA_SLUG;
  const selectedCinema = getCinemaBySlug(cinemaSlug);
  const days = await getPlanningDays(selectedCinema);
  const selectedDate = normalizeSelectedDate(firstParam(params.date), days);
  const selectedDay = days.find((day) => day.date === selectedDate);
  const scheduleKey = `${selectedCinema.slug}-${selectedDate}`;

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <BrandHeader title="Tokyo cinema showtimes" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-stone-500">
              Showtimes are in JST
            </p>
            <SectionNav
              active="cinemas"
              cinemaSlug={selectedCinema.slug}
              selectedDate={selectedDate}
            />
          </div>
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          hrefForDate={(date) => plannerHref(selectedCinema.slug, date)}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <CinemaSelector
              cinemas={TOKYO_CINEMAS}
              selectedCinemaSlug={selectedCinema.slug}
              selectedDate={selectedDate}
            />
          </aside>

          <section id="movies" className="min-w-0 scroll-mt-4">
            <Suspense
              key={scheduleKey}
              fallback={
                <ScheduleLoadingState
                  selectedCinema={selectedCinema}
                  selectedDay={selectedDay}
                  selectedDate={selectedDate}
                />
              }
            >
              <ScheduleSection
                selectedCinema={selectedCinema}
                selectedDay={selectedDay}
                selectedDate={selectedDate}
              />
            </Suspense>
          </section>
        </div>
      </div>
    </main>
  );
}

async function ScheduleSection({
  selectedCinema,
  selectedDay,
  selectedDate,
}: {
  selectedCinema: Cinema;
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
}) {
  const schedule = await getSchedule(selectedCinema, selectedDate);
  const movieCount = schedule.ok ? schedule.cards.length : 0;
  const showtimeCount = schedule.ok
    ? schedule.cards.reduce((total, card) => total + card.showtimes.length, 0)
    : 0;
  const englishCount = schedule.ok
    ? schedule.cards.filter((card) => card.language === "english").length
    : 0;

  return (
    <>
      <ScheduleHeader
        selectedCinema={selectedCinema}
        selectedDay={selectedDay}
        selectedDate={selectedDate}
        movieCount={movieCount}
        showtimeCount={showtimeCount}
        englishCount={englishCount}
      />

      {schedule.ok ? (
        <MovieList
          cards={schedule.cards}
          cinema={selectedCinema}
          selectedDate={selectedDate}
        />
      ) : (
        <ErrorState
          error={schedule.error}
          cinemaSlug={selectedCinema.slug}
          selectedDate={selectedDate}
        />
      )}
    </>
  );
}

function ScheduleHeader({
  selectedCinema,
  selectedDay,
  selectedDate,
  movieCount,
  showtimeCount,
  englishCount,
}: {
  selectedCinema: Cinema;
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
  movieCount?: number;
  showtimeCount?: number;
  englishCount?: number;
}) {
  return (
    <div className="mb-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
            Selected cinema
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="inline-flex min-w-0 items-center gap-1 text-2xl font-semibold leading-tight text-stone-950">
              <span>{selectedCinema.name}</span>
              <CinemaMapLink
                cinema={selectedCinema}
                className="-my-1 h-5 w-5"
              />
            </h2>
            <ImaxBadge imax={selectedCinema.imax} />
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {selectedDay
              ? `${selectedDay.weekday}, ${selectedDay.label}`
              : selectedDate}
          </p>
        </div>

        {movieCount !== undefined &&
        showtimeCount !== undefined &&
        englishCount !== undefined ? (
          <dl className="grid grid-cols-3 overflow-hidden rounded-md border border-stone-200 text-center sm:min-w-[360px]">
            <div className="border-r border-stone-200 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                Movies
              </dt>
              <dd className="mt-1 text-lg font-semibold text-stone-950">
                {movieCount}
              </dd>
            </div>
            <div className="border-r border-stone-200 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                Times
              </dt>
              <dd className="mt-1 text-lg font-semibold text-stone-950">
                {showtimeCount}
              </dd>
            </div>
            <div className="px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">
                English
              </dt>
              <dd className="mt-1 text-lg font-semibold text-emerald-800">
                {englishCount}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </div>
  );
}

function ScheduleLoadingState({
  selectedCinema,
  selectedDay,
  selectedDate,
}: {
  selectedCinema: Cinema;
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <ScheduleHeader
        selectedCinema={selectedCinema}
        selectedDay={selectedDay}
        selectedDate={selectedDate}
      />
      <div className="grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonMovieCard key={index} />
        ))}
      </div>
    </div>
  );
}

function SkeletonMovieCard() {
  return (
    <article className="grid animate-pulse grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[128px_minmax(240px,0.9fr)_minmax(360px,1.35fr)]">
      <div className="p-3">
        <div className="aspect-[2/3] rounded-md bg-stone-200" />
      </div>
      <div className="min-w-0 p-3 sm:pl-0 lg:border-r lg:border-stone-100">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-6 w-44 rounded bg-stone-200" />
          <div className="h-5 w-28 rounded bg-stone-100" />
        </div>
        <div className="mt-2 h-4 w-56 max-w-full rounded bg-stone-100" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-stone-100" />
      </div>
      <div className="col-span-2 border-t border-stone-100 p-3 lg:col-span-1 lg:border-t-0">
        <div className="h-3 w-36 rounded bg-stone-200" />
        <div className="mt-3 grid gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 border-t border-stone-100 pt-2 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 rounded bg-stone-200" />
                <div className="h-4 w-20 rounded bg-stone-100" />
                <div className="h-4 w-16 rounded bg-stone-100" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-5 w-16 rounded bg-stone-100" />
                <div className="h-5 w-20 rounded bg-stone-100" />
                <div className="h-5 w-16 rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function MovieList({
  cards,
  cinema,
  selectedDate,
}: {
  cards: MovieCard[];
  cinema: Cinema;
  selectedDate: string;
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">
          No published showtimes
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          This cinema did not return movies for the selected day.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {cards.map((card) => (
        <MovieCardView
          key={card.id}
          card={card}
          cinema={cinema}
          selectedDate={selectedDate}
        />
      ))}
    </div>
  );
}

function MovieCardView({
  card,
  cinema,
  selectedDate,
}: {
  card: MovieCard;
  cinema: Cinema;
  selectedDate: string;
}) {
  const englishShowtimes = card.showtimes.filter(
    (showtime) => showtime.language === "english",
  );
  const otherShowtimes = card.showtimes.filter(
    (showtime) => showtime.language !== "english",
  );
  const sourceLabels = [...card.sourceLabels].sort((a, b) => a.length - b.length);
  const sourceLabelText = sourceLabels.join(" / ");
  const sourceLabelPrefix = sourceLabels.length > 1 ? "Source labels" : "Source";

  return (
    <article className="grid grid-cols-[96px_minmax(0,1fr)] overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm transition-colors hover:border-stone-400 sm:grid-cols-[112px_minmax(0,1fr)] lg:grid-cols-[128px_minmax(240px,0.9fr)_minmax(360px,1.35fr)]">
      <PendingLink
        href={movieHref(card.id, selectedDate)}
        className="block p-3 transition-opacity hover:opacity-90"
      >
        <div
          className="flex aspect-[2/3] items-end overflow-hidden rounded-md bg-stone-200 bg-cover bg-center"
          style={
            card.artworkUrl
              ? {
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.46), rgba(0,0,0,0.02)), url(${card.artworkUrl})`,
                }
              : undefined
          }
          aria-label={card.artworkUrl ? `${card.title} artwork` : undefined}
        >
          {!card.artworkUrl ? (
            <span className="p-3 text-sm font-semibold text-stone-500">
              No artwork
            </span>
          ) : null}
        </div>
      </PendingLink>

      <div className="min-w-0 p-3 sm:pl-0 lg:border-r lg:border-stone-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PendingLink
                href={movieHref(card.id, selectedDate)}
                className="min-w-0 hover:underline"
              >
                <h2 className="break-words text-xl font-semibold leading-tight tracking-normal text-stone-950">
                  {card.title}
                </h2>
              </PendingLink>
              <LanguageBadge language={card.language} />
              {card.rating ? <MetaBadge>{card.rating}</MetaBadge> : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1 text-sm text-stone-600">
              {card.runtimeMinutes ? `${card.runtimeMinutes} min · ` : ""}
              <span className="inline-flex items-center gap-1">
                <span>{cinema.name}</span>
                <CinemaMapLink cinema={cinema} className="-my-1 h-5 w-5" />
              </span>
            </p>
            {sourceLabelText ? (
              <p className="mt-1 break-words text-xs text-stone-500">
                {sourceLabelPrefix}: {sourceLabelText}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="col-span-2 border-t border-stone-100 p-3 lg:col-span-1 lg:border-t-0">
        {englishShowtimes.length > 0 ? (
          <ShowtimeRows
            label="English-watchable"
            showtimes={englishShowtimes}
          />
        ) : null}
        {otherShowtimes.length > 0 ? (
          <ShowtimeRows label="Japanese" showtimes={otherShowtimes} />
        ) : null}
      </div>
    </article>
  );
}

function ImaxBadge({
  imax,
  compact = false,
}: {
  imax: Cinema["imax"];
  compact?: boolean;
}) {
  if (!imax) return null;

  const label = imax === "imaxLaser" ? "IMAX Laser" : "IMAX";

  return (
    <span
      className={[
        "rounded border font-semibold",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        "border-sky-700 bg-sky-50 text-sky-950",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function ErrorState({
  error,
  cinemaSlug,
  selectedDate,
}: {
  error: string;
  cinemaSlug: string;
  selectedDate: string;
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-950">
        Could not load showtimes
      </h2>
      <p className="mt-2 text-sm text-red-900">{error}</p>
      <PendingLink
        href={plannerHref(cinemaSlug, selectedDate)}
        className="mt-4 inline-flex rounded-md border border-red-700 bg-white px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-100"
      >
        Retry
      </PendingLink>
    </div>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
