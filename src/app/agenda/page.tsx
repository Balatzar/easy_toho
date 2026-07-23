import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandHeader } from "@/app/brand";
import { createPageMetadata } from "@/app/metadata-utils";
import { PendingLink } from "@/app/pending-link";
import { SectionNav } from "@/app/section-nav";
import { MoviePoster } from "@/app/movies/components";
import { DEFAULT_CINEMA_SLUG } from "@/lib/cinemas";
import { getJapanReleaseCalendar } from "@/lib/eiga-release-adapter";
import {
  type JapanReleaseDateGroup,
  normalizeReleaseMonth,
  releaseMonthLabel,
  shiftReleaseMonth,
} from "@/lib/eiga-release-calendar";
import { agendaHref } from "@/lib/routes";
import { fallbackPlanningDays, firstSelectableDate } from "@/lib/schedule-model";

export const metadata: Metadata = createPageMetadata({
  title: "Agenda",
  description: "A month-by-month calendar of upcoming film releases in Japan.",
});

type AgendaFilter = "all" | "english";

type SearchParams = Promise<{
  month?: string | string[];
  filter?: string | string[];
}>;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const month = normalizeReleaseMonth(firstParam(params.month));
  const filter = normalizeFilter(firstParam(params.filter));
  const selectedDate = firstSelectableDate(fallbackPlanningDays());

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <BrandHeader title="Japan release calendar" />
          <SectionNav
            active="agenda"
            cinemaSlug={DEFAULT_CINEMA_SLUG}
            selectedDate={selectedDate}
          />
        </header>

        <AgendaControls month={month} filter={filter} />

        <Suspense key={`${month}-${filter}`} fallback={<AgendaLoadingState />}>
          <AgendaContent month={month} filter={filter} />
        </Suspense>
      </div>
    </main>
  );
}

function AgendaControls({
  month,
  filter,
}: {
  month: string;
  filter: AgendaFilter;
}) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <PendingLink
            href={agendaHref(shiftReleaseMonth(month, -1), filter)}
            aria-label="Previous month"
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 hover:text-stone-950"
          >
            ←
          </PendingLink>
          <h2 className="min-w-44 text-center text-xl font-semibold text-stone-950 sm:text-2xl">
            {releaseMonthLabel(month)}
          </h2>
          <PendingLink
            href={agendaHref(shiftReleaseMonth(month, 1), filter)}
            aria-label="Next month"
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400 hover:text-stone-950"
          >
            →
          </PendingLink>
        </div>

        <nav
          className="flex rounded-md border border-stone-200 bg-stone-50 p-1"
          aria-label="Release filter"
        >
          <FilterLink month={month} value="all" activeFilter={filter}>
            All releases
          </FilterLink>
          <FilterLink month={month} value="english" activeFilter={filter}>
            English
          </FilterLink>
        </nav>
      </div>
    </section>
  );
}

function FilterLink({
  month,
  value,
  activeFilter,
  children,
}: {
  month: string;
  value: AgendaFilter;
  activeFilter: AgendaFilter;
  children: React.ReactNode;
}) {
  const active = value === activeFilter;

  return (
    <PendingLink
      href={agendaHref(month, value)}
      aria-current={active ? "page" : undefined}
      className={[
        "flex-1 rounded px-3 py-2 text-center text-sm font-semibold sm:flex-none",
        active
          ? "bg-red-700 text-white shadow-sm"
          : "text-stone-600 hover:bg-white hover:text-stone-950",
      ].join(" ")}
    >
      {children}
    </PendingLink>
  );
}

async function AgendaContent({
  month,
  filter,
}: {
  month: string;
  filter: AgendaFilter;
}) {
  const result = await getJapanReleaseCalendar(month, filter);

  if (!result.ok) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-8 text-center text-amber-950">
        <h2 className="text-lg font-semibold">Release calendar unavailable</h2>
        <p className="mt-2 text-sm">Please try again in a few minutes.</p>
      </div>
    );
  }

  const groups = result.groups;
  const releaseCount = groups.reduce(
    (total, group) => total + group.releases.length,
    0,
  );

  if (releaseCount === 0) {
    return (
      <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">No releases found</h2>
        <p className="mt-2 text-sm text-stone-600">
          Try another month or switch to all releases.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-7">
      <p className="text-sm font-medium text-stone-600">
        {releaseCount} {releaseCount === 1 ? "release" : "releases"} in Japan
      </p>
      {groups.map((group) => (
        <ReleaseDateSection key={group.date} group={group} />
      ))}
    </div>
  );
}

function ReleaseDateSection({ group }: { group: JapanReleaseDateGroup }) {
  return (
    <section aria-labelledby={`date-${group.date}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-stone-300 pb-2">
        <h2
          id={`date-${group.date}`}
          className="text-xl font-semibold text-stone-950"
        >
          {releaseDateLabel(group.date)}
        </h2>
        <p className="shrink-0 text-sm font-medium text-stone-500">
          {group.releases.length}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {group.releases.map((release) => (
          <a
            key={release.id}
            href={release.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="group rounded-md border border-stone-200 bg-white p-2 shadow-sm transition-colors hover:border-stone-400"
          >
            <MoviePoster title={release.title} artworkUrl={release.posterUrl} />
            <h3 className="mt-2 break-words text-sm font-semibold leading-snug text-stone-950 group-hover:text-red-700">
              {release.title}
            </h3>
            {release.director ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-stone-500">
                {release.director}
              </p>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

function AgendaLoadingState() {
  return (
    <div className="grid gap-4">
      <div className="h-5 w-36 animate-pulse rounded bg-stone-200" />
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
    </div>
  );
}

function releaseDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function normalizeFilter(value: string | undefined): AgendaFilter {
  return value === "english" ? "english" : "all";
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
