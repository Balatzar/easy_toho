import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DEFAULT_CINEMA_SLUG } from "@/lib/cinemas";
import {
  type CinemaStatsResult,
  getCinemaStats,
} from "@/lib/cinema-stats";
import {
  movieHref,
  plannerHref,
  statsHref,
} from "@/lib/routes";
import { resolvePlanningSelection } from "@/lib/schedules";
import { BrandHeader } from "../brand";
import { createPageMetadata } from "../metadata-utils";
import { DateTabs, PartialScheduleWarning } from "../movies/components";
import { PendingLink } from "../pending-link";
import { SectionNav } from "../section-nav";

export const metadata: Metadata = createPageMetadata({
  title: "Cinema Stats",
  description: "A daily overview of cinema screenings across Tokyo.",
});

type SearchParams = Promise<{
  date?: string | string[];
}>;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { days, selectedDate, selectedDay } = resolvePlanningSelection(
    params.date,
  );
  const dateLabel = `${selectedDay.weekday}, ${selectedDay.label}`;

  return (
    <main className="min-h-screen bg-[#f5f2ec] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <BrandHeader title="Tokyo cinema stats" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm font-medium text-stone-500">
              Showtimes are in JST
            </p>
            <SectionNav
              active="stats"
              cinemaSlug={DEFAULT_CINEMA_SLUG}
              selectedDate={selectedDate}
            />
          </div>
        </header>

        <DateTabs
          days={days}
          selectedDate={selectedDate}
          hrefForDate={statsHref}
        />

        <Suspense
          key={selectedDate}
          fallback={<StatsLoadingState dateLabel={dateLabel} />}
        >
          <StatsDashboard selectedDate={selectedDate} dateLabel={dateLabel} />
        </Suspense>
      </div>
    </main>
  );
}

async function StatsDashboard({
  selectedDate,
  dateLabel,
}: {
  selectedDate: string;
  dateLabel: string;
}) {
  const stats = await getCinemaStats(selectedDate);

  if (stats.cinemaCount === 0) {
    return (
      <section className="grid gap-3">
        <PartialScheduleWarning failedCinemas={stats.failedCinemas} />
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            No cinema stats available
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            No cinema schedule could be loaded for this day.
          </p>
        </div>
      </section>
    );
  }

  const englishShare = percentage(
    stats.englishShowtimeCount,
    stats.showtimeCount,
  );
  const premiumShare = percentage(
    stats.premiumShowtimeCount,
    stats.showtimeCount,
  );

  return (
    <section className="grid gap-4">
      <PartialScheduleWarning failedCinemas={stats.failedCinemas} />

      <div className="relative overflow-hidden rounded-lg bg-stone-950 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-red-700/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              Tokyo&apos;s cinema schedule
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {dateLabel}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
              A daily overview built from every reporting Tokyo Cinema —
              what is playing, where schedules are densest, and how start times
              are spread through the day.
            </p>
          </div>
          <div className="border-l border-white/15 pl-5 md:min-w-52">
            <p className="font-mono text-5xl font-semibold tabular-nums text-white sm:text-6xl">
              {formatNumber(stats.showtimeCount)}
            </p>
            <p className="mt-1 text-sm font-medium text-stone-300">
              published showtimes
            </p>
            <p className="mt-3 text-xs text-stone-400">
              Most programmed window: {stats.peakTimeLabel ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Movies playing"
          value={formatNumber(stats.movieCount)}
          detail="Distinct movies across Tokyo"
          icon={<FilmIcon />}
        />
        <MetricCard
          label="English-watchable"
          value={`${englishShare}%`}
          detail={`${formatNumber(stats.englishShowtimeCount)} showtimes`}
          icon={<LanguageIcon />}
          accent="emerald"
        />
        <MetricCard
          label="Premium formats"
          value={`${premiumShare}%`}
          detail={`${formatNumber(stats.premiumShowtimeCount)} showtimes`}
          icon={<SparkIcon />}
          accent="sky"
        />
        <MetricCard
          label="Cinema coverage"
          value={`${stats.cinemaCount}/${stats.totalCinemaCount}`}
          detail="Schedules reporting"
          icon={<CinemaIcon />}
          accent="amber"
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <TopCinemas stats={stats} selectedDate={selectedDate} />
        <DailyRhythm stats={stats} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <PopularMovies stats={stats} selectedDate={selectedDate} />
        <FormatMix stats={stats} />
      </div>

      <p className="px-1 pb-2 text-xs leading-5 text-stone-500">
        Counts describe published schedules, not attendance or ticket sales.
        English-watchable means original English audio with Japanese subtitles,
        or English subtitles.
      </p>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = "red",
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent?: "red" | "emerald" | "sky" | "amber";
}) {
  const accentClasses = {
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="relative">
        <div className="pr-10">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">
            {label}
          </dt>
          <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight text-stone-950 sm:text-4xl">
            {value}
          </dd>
        </div>
        <span
          className={`absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full ${accentClasses[accent]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function TopCinemas({
  stats,
  selectedDate,
}: {
  stats: CinemaStatsResult;
  selectedDate: string;
}) {
  const cinemas = stats.cinemas.slice(0, 8);
  const max = Math.max(...cinemas.map((cinema) => cinema.showtimeCount), 1);

  return (
    <DashboardCard
      eyebrow="Densest schedules"
      title="Top cinemas today"
      subtitle="Ranked by number of published showtimes"
    >
      <ol className="mt-5 grid gap-3">
        {cinemas.map((item, index) => (
          <li
            key={item.cinema.slug}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3"
          >
            <span className="font-mono text-xs font-semibold tabular-nums text-stone-400">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <PendingLink
                  href={plannerHref(item.cinema.slug, selectedDate)}
                  className="truncate text-sm font-semibold text-stone-900 hover:text-red-700 hover:underline"
                >
                  {item.cinema.name}
                </PendingLink>
                <span className="shrink-0 text-xs text-stone-500">
                  {item.movieCount} movies
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-red-700"
                  style={{ width: `${(item.showtimeCount / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="min-w-8 text-right font-mono text-sm font-semibold tabular-nums text-stone-900">
              {item.showtimeCount}
            </span>
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}

function DailyRhythm({ stats }: { stats: CinemaStatsResult }) {
  const max = Math.max(...stats.timeBuckets.map((bucket) => bucket.count), 1);

  return (
    <DashboardCard
      eyebrow="Across Tokyo"
      title="Showtime distribution"
      subtitle="Published start times by part of day"
    >
      <div className="mt-6 grid h-52 grid-cols-6 items-end gap-2 border-b border-stone-200 sm:gap-3">
        {stats.timeBuckets.map((bucket) => {
          const height = bucket.count === 0 ? 0 : (bucket.count / max) * 100;

          return (
            <div
              key={bucket.label}
              className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
            >
              <span className="font-mono text-[11px] font-semibold tabular-nums text-stone-600">
                {bucket.count}
              </span>
              <div className="flex h-36 w-full items-end overflow-hidden rounded-t-sm bg-stone-50">
                <div
                  className="w-full rounded-t-sm bg-stone-800 transition-[height]"
                  style={{ height: `${height}%`, minHeight: bucket.count ? 4 : 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2 sm:gap-3">
        {stats.timeBuckets.map((bucket) => (
          <span
            key={bucket.label}
            className="text-center text-[10px] leading-tight text-stone-500"
          >
            {bucket.label}
          </span>
        ))}
      </div>
    </DashboardCard>
  );
}

function PopularMovies({
  stats,
  selectedDate,
}: {
  stats: CinemaStatsResult;
  selectedDate: string;
}) {
  const movies = stats.movies.slice(0, 6);

  return (
    <DashboardCard
      eyebrow="Biggest reach"
      title="Movies everywhere"
      subtitle="The widest cinema coverage on the selected day"
    >
      <ol className="mt-4 divide-y divide-stone-100">
        {movies.map((movie, index) => (
          <li
            key={movie.id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 font-mono text-xs font-semibold text-stone-500">
              {index + 1}
            </span>
            <div className="min-w-0">
              <PendingLink
                href={movieHref(movie.id, selectedDate)}
                className="block truncate text-sm font-semibold text-stone-900 hover:text-red-700 hover:underline"
              >
                {movie.title}
              </PendingLink>
              <p className="mt-0.5 text-xs text-stone-500">
                {movie.showtimeCount} showtimes
                {movie.runtimeMinutes ? ` · ${movie.runtimeMinutes} min` : ""}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-semibold tabular-nums text-stone-950">
                {movie.cinemaCount}
              </span>
              <p className="text-[10px] uppercase tracking-wide text-stone-400">
                cinemas
              </p>
            </div>
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}

function FormatMix({ stats }: { stats: CinemaStatsResult }) {
  const formats = stats.formats.slice(0, 7);
  const max = Math.max(...formats.map((format) => format.count), 1);

  return (
    <DashboardCard
      eyebrow="Presentation"
      title="Premium format mix"
      subtitle="Format labels attached to published showtimes"
    >
      {formats.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {formats.map((format) => (
            <div key={format.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-stone-700">{format.label}</span>
                <span className="font-mono text-xs font-semibold tabular-nums text-stone-600">
                  {format.count}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-sky-700"
                  style={{ width: `${(format.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-stone-50 p-4 text-sm text-stone-600">
          No premium format labels were published for this day.
        </p>
      )}
    </DashboardCard>
  );
}

function DashboardCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">
        {title}
      </h3>
      <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      {children}
    </article>
  );
}

function StatsLoadingState({ dateLabel }: { dateLabel: string }) {
  return (
    <div className="grid animate-pulse gap-4" aria-busy="true" aria-live="polite">
      <div className="rounded-lg bg-stone-900 px-5 py-8 sm:px-7">
        <div className="h-3 w-40 rounded bg-stone-700" />
        <div className="mt-4 h-9 w-72 max-w-full rounded bg-stone-700" />
        <p className="sr-only">Loading cinema stats for {dateLabel}</p>
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-stone-800" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-lg border border-stone-200 bg-white shadow-sm"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-96 rounded-lg border border-stone-200 bg-white shadow-sm" />
        <div className="h-96 rounded-lg border border-stone-200 bg-white shadow-sm" />
      </div>
    </div>
  );
}

function FilmIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 5v14M17 5v14M3 9h4m10 0h4M3 15h4m10 0h4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h9M8.5 3v2m2.8 0c-.8 4.2-3.2 7.1-7.3 8.6m2.2-6c1.3 2.4 3.4 4.2 6.3 5.4M14 19l3.5-9 3.5 9m-5.8-4.3h4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 13l.7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function CinemaIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V9l8-5 8 5v11M2 20h20M8 20v-6h8v6M7 10h.01M12 10h.01M17 10h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
