import { Suspense, type ReactNode } from "react";
import {
  type Cinema,
  DEFAULT_CINEMA_SLUG,
  TOKYO_CINEMAS,
  getCinemaBySlug,
} from "@/lib/cinemas";
import {
  type LanguageRank,
  type MovieCard,
  type PlanningDay,
  type Showtime,
  type ShowtimeAvailability,
  firstSelectableDate,
  getPlanningDays,
  getSchedule,
  isTodayTokyo,
  normalizeSelectedDate,
} from "@/lib/schedules";
import { imaxHref, moviesHref, movieHref } from "@/lib/routes";
import { CinemaMapLink } from "./cinema-map-link";
import { CinemaSelector } from "./cinema-selector";
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
    <main className="min-h-screen bg-[#f6f6f3] text-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Tokyo Movie Times
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-stone-950 sm:text-3xl">
              Tokyo cinema showtimes
            </h1>
          </div>
          <SectionNav
            active="cinemas"
            cinemasHref={plannerHref(selectedCinema.slug, selectedDate)}
            moviesHref={moviesHref(selectedDate)}
            imaxHref={imaxHref(selectedDate)}
          />
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          selectedCinemaSlug={selectedCinema.slug}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(500px,620px)_minmax(0,1fr)]">
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

function DateTabs({
  days,
  selectedDate,
  selectedCinemaSlug,
}: {
  days: PlanningDay[];
  selectedDate: string;
  selectedCinemaSlug: string;
}) {
  const fallbackDate = firstSelectableDate(days);

  return (
    <nav
      className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-3"
      aria-label="Planning days"
    >
      {days.map((day) => {
        const active = day.date === selectedDate;
        const label = isTodayTokyo(day.date) ? "Today" : day.weekday;
        const href = plannerHref(
          selectedCinemaSlug,
          day.selectable ? day.date : fallbackDate,
        );

        if (!day.selectable) {
          return (
            <span
              key={day.date}
              className="flex min-w-24 flex-col rounded-md border border-stone-200 bg-stone-100 px-3 py-2 text-stone-400"
            >
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs">{day.label}</span>
            </span>
          );
        }

        return (
          <PendingLink
            key={day.date}
            href={href}
            className={[
              "flex min-w-24 flex-col rounded-md border px-3 py-2 transition-colors",
              active
                ? "border-stone-950 bg-stone-950 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-950",
            ].join(" ")}
          >
            <span className="text-sm font-semibold">{label}</span>
            <span className={active ? "text-xs text-stone-200" : "text-xs"}>
              {day.label}
            </span>
          </PendingLink>
        );
      })}
    </nav>
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

  return (
    <>
      <ScheduleHeader
        selectedCinema={selectedCinema}
        selectedDay={selectedDay}
        selectedDate={selectedDate}
        trailing={
          schedule.ok ? (
            <span>{schedule.cards.length} movies</span>
          ) : undefined
        }
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
  trailing,
}: {
  selectedCinema: Cinema;
  selectedDay: PlanningDay | undefined;
  selectedDate: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="inline-flex items-center gap-1 text-sm font-semibold text-stone-950">
            <span>{selectedCinema.name}</span>
            <CinemaMapLink cinema={selectedCinema} className="-my-1 h-5 w-5" />
          </p>
          <ImaxBadge imax={selectedCinema.imax} />
        </div>
        <p className="text-sm text-stone-600">
          {selectedDay
            ? `${selectedDay.weekday}, ${selectedDay.label}`
            : selectedDate}
        </p>
      </div>
      {trailing ? <p className="text-sm text-stone-600">{trailing}</p> : null}
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
        trailing={
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-700" />
            Loading showtimes
          </span>
        }
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
    <article className="grid animate-pulse gap-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)]">
      <div className="aspect-[2/3] min-h-40 rounded-md bg-stone-200" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-6 w-44 rounded bg-stone-200" />
          <div className="h-5 w-28 rounded bg-stone-100" />
        </div>
        <div className="mt-2 h-4 w-56 max-w-full rounded bg-stone-100" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-stone-100" />
        <div className="mt-5 h-3 w-36 rounded bg-stone-200" />
        <div className="mt-2 grid gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
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
      <div className="rounded-lg border border-stone-200 bg-white p-8 text-center shadow-sm">
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
    <article className="grid gap-4 rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition-colors hover:border-stone-950 sm:grid-cols-[112px_minmax(0,1fr)]">
      <PendingLink
        href={movieHref(card.id, selectedDate)}
        className="block rounded-md transition-opacity hover:opacity-90"
      >
        <div
          className="flex aspect-[2/3] min-h-40 items-end overflow-hidden rounded-md bg-stone-200 bg-cover bg-center"
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

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PendingLink
                href={movieHref(card.id, selectedDate)}
                className="min-w-0 hover:underline"
              >
                <h2 className="break-words text-xl font-semibold tracking-normal text-stone-950">
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

        {englishShowtimes.length > 0 ? (
          <ShowtimeGroup
            label="English-watchable"
            showtimes={englishShowtimes}
          />
        ) : null}
        {otherShowtimes.length > 0 ? (
          <ShowtimeGroup label="Japanese" showtimes={otherShowtimes} />
        ) : null}
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
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </h3>
      <div className="mt-2 grid gap-2">
        {showtimes.map((showtime) => (
          <div
            key={`${showtime.start}-${showtime.end}-${showtime.screen}-${showtime.languageLabel}`}
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
              {showtime.formats.map((format) => (
                <MetaBadge key={format}>{format}</MetaBadge>
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

function LanguageBadge({
  language,
  compact = false,
}: {
  language: LanguageRank;
  compact?: boolean;
}) {
  const label =
    language === "english"
      ? compact
        ? "English"
        : "English-watchable"
      : "Japanese";

  const classes =
    language === "english"
      ? "border-emerald-700 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";

  return (
    <span
      className={`rounded border px-2 py-0.5 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
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

function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-stone-300 bg-white px-2 py-0.5 text-xs font-medium text-stone-700">
      {children}
    </span>
  );
}

function SeatStatus({
  status,
  children,
}: {
  status: ShowtimeAvailability;
  children: ReactNode;
}) {
  const classes =
    status === "soldOut"
      ? "border-red-300 bg-red-100 text-red-950"
      : status === "notSelling"
        ? "border-stone-300 bg-stone-200 text-stone-800"
        : status === "limited"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-stone-300 bg-white text-stone-700";

  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {children}
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
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

function plannerHref(cinema: string, date: string): string {
  const params = new URLSearchParams({ cinema, date });
  return `/?${params}`;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
