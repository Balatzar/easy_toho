import { Fragment, type ReactNode } from "react";
import type { CinemaScheduleFailure } from "@/lib/schedule-aggregate";
import {
  type LanguageRank,
  type PlanningDay,
  type Showtime,
  type ShowtimeAvailability,
} from "@/lib/schedules";
import { CinemaMapLink } from "../cinema-map-link";
import { PendingLink } from "../pending-link";

export function DateTabs({
  days,
  selectedDate,
  hrefForDate,
}: {
  days: PlanningDay[];
  selectedDate: string;
  hrefForDate: (date: string) => string;
}) {
  return (
    <nav
      className="flex overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm"
      aria-label="Planning days"
    >
      {days.map((day) => {
        const active = day.date === selectedDate;
        const label = day.isToday ? "Today" : day.weekday;

        if (!day.selectable) {
          return (
            <span
              key={day.date}
              className="flex min-w-28 flex-col border-r border-stone-200 bg-stone-50 px-4 py-3 text-stone-400 last:border-r-0"
            >
              <span className="text-sm font-semibold leading-tight">
                {label}
              </span>
              <span className="mt-1 text-xs">{day.label}</span>
            </span>
          );
        }

        return (
          <PendingLink
            key={day.date}
            href={hrefForDate(day.date)}
            className={[
              "flex min-w-28 flex-col border-r border-stone-200 px-4 py-3 transition-colors last:border-r-0",
              active
                ? "bg-red-700 text-white"
                : "bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950",
            ].join(" ")}
          >
            <span className="text-sm font-semibold leading-tight">{label}</span>
            <span className={active ? "mt-1 text-xs text-red-50" : "mt-1 text-xs"}>
              {day.label}
            </span>
          </PendingLink>
        );
      })}
    </nav>
  );
}

export function PartialScheduleWarning({
  failedCinemas,
}: {
  failedCinemas: CinemaScheduleFailure[];
}) {
  if (failedCinemas.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Could not load:{" "}
      {failedCinemas.map((failure, index) => (
        <Fragment key={failure.cinema.slug}>
          {index > 0 ? ", " : null}
          <span className="inline-flex items-center gap-1">
            <span>{failure.cinema.name}</span>
            <CinemaMapLink
              cinema={failure.cinema}
              className="-my-1 h-5 w-5 hover:bg-amber-100"
            />
          </span>
        </Fragment>
      ))}
      .
    </div>
  );
}

export function MoviePoster({
  title,
  artworkUrl,
}: {
  title: string;
  artworkUrl: string | null;
}) {
  if (!artworkUrl) {
    return (
      <div className="flex aspect-[2/3] items-end justify-start rounded-md border border-dashed border-stone-300 bg-stone-100 p-3">
        <span className="text-sm font-semibold leading-tight text-stone-700">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div
      className="aspect-[2/3] rounded-md bg-stone-200 bg-cover bg-center shadow-sm"
      style={{ backgroundImage: `url(${artworkUrl})` }}
      aria-label={`${title} poster`}
    />
  );
}

export function LanguageBadge({
  language,
  compact = false,
}: {
  language: LanguageRank;
  compact?: boolean;
}) {
  const code = language === "english" ? "EN" : "JP";
  const label = language === "english" ? "English-watchable" : "Japanese";

  const classes =
    language === "english"
      ? "border-sky-700 bg-sky-700 text-white"
      : "border-rose-700 bg-rose-700 text-white";

  return (
    <span
      className={`inline-flex items-center rounded border text-xs font-semibold ${classes}`}
    >
      <span className="px-1.5 py-0.5 font-bold tracking-[0.08em]">{code}</span>
      {!compact ? (
        <span className="border-l border-white/40 px-2 py-0.5">{label}</span>
      ) : null}
    </span>
  );
}

export function MetaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-stone-300 bg-white px-2 py-0.5 text-xs font-medium text-stone-700">
      {children}
    </span>
  );
}

export function SeatStatus({
  status,
  children,
}: {
  status: ShowtimeAvailability;
  children: ReactNode;
}) {
  const classes =
    status === "soldOut"
      ? "border-stone-300 bg-stone-100 text-stone-500"
      : status === "notSelling"
        ? "border-stone-300 bg-stone-100 text-stone-500"
        : status === "limited"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-emerald-700 bg-white text-emerald-900";

  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  );
}

export function ShowtimeRows({
  language,
  showtimes,
}: {
  language: LanguageRank;
  showtimes: Showtime[];
}) {
  const rows = groupShowtimes(showtimes);
  const isEnglish = language === "english";
  const label = isEnglish ? "English-watchable" : "Japanese";

  return (
    <section
      className={[
        "mt-2 rounded-md border p-3 first:mt-0",
        isEnglish
          ? "border-sky-200 bg-sky-50/70"
          : "border-rose-200 bg-rose-50/70",
      ].join(" ")}
    >
      <h3
        className={[
          "inline-flex items-center overflow-hidden rounded border text-xs font-semibold",
          isEnglish
            ? "border-sky-700 bg-sky-700 text-white"
            : "border-rose-700 bg-rose-700 text-white",
        ].join(" ")}
      >
        <span className="px-1.5 py-0.5 font-bold tracking-[0.08em]">
          {isEnglish ? "EN" : "JP"}
        </span>
        <span className="border-l border-white/40 px-2 py-0.5">{label}</span>
      </h3>
      <div className="mt-2 grid gap-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid gap-2 border-t border-stone-100 pt-2 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(74px,108px)_minmax(0,1fr)]"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-950">
                {row.primary}
              </p>
              {row.meta.length > 0 ? (
                <p className="mt-0.5 break-words text-xs leading-snug text-stone-500">
                  {row.meta.join(" / ")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {row.showtimes.map((showtime, index) => (
                <ShowtimeChip
                  key={`${showtime.start}-${showtime.end}-${index}`}
                  showtime={showtime}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type ShowtimeRow = {
  key: string;
  primary: string;
  meta: string[];
  showtimes: Showtime[];
};

function groupShowtimes(showtimes: Showtime[]): ShowtimeRow[] {
  const rows = new Map<string, ShowtimeRow>();

  for (const showtime of showtimes) {
    const primary =
      showtime.formats.find((format) =>
        /^(IMAX|MX4D|4DX|TCX|Dolby|ScreenX)/i.test(format),
      ) ??
      showtime.formats[0] ??
      showtime.screen;
    const meta = [
      showtime.screen !== primary ? showtime.screen : null,
      ...showtime.formats.filter((format) => format !== primary),
      showtime.eventLabel,
    ].filter((value): value is string => Boolean(value));
    const key = [
      primary,
      showtime.screen,
      showtime.languageLabel,
      showtime.eventLabel ?? "",
      showtime.formats.join("|"),
    ].join("::");

    const existing = rows.get(key);

    if (existing) {
      existing.showtimes.push(showtime);
    } else {
      rows.set(key, {
        key,
        primary,
        meta,
        showtimes: [showtime],
      });
    }
  }

  return Array.from(rows.values());
}

function ShowtimeChip({ showtime }: { showtime: Showtime }) {
  const statusLabel =
    showtime.availability === "available" ||
    showtime.availability === "unknown"
      ? null
      : showtime.availabilityLabel;

  return (
    <span
      className={[
        "inline-flex min-w-20 items-baseline justify-center gap-1 rounded border px-3 py-1.5 text-center",
        showtimeChipClass(showtime.availability),
      ].join(" ")}
      aria-label={`${showtime.start}, ${showtime.availabilityLabel}`}
    >
      <span className="text-base font-semibold leading-none">
        {showtime.start}
      </span>
      {statusLabel ? (
        <span className="text-[10px] font-semibold leading-none">
          {statusLabel}
        </span>
      ) : null}
    </span>
  );
}

function showtimeChipClass(status: ShowtimeAvailability): string {
  switch (status) {
    case "soldOut":
    case "notSelling":
      return "border-stone-300 bg-stone-50 text-stone-500";
    case "limited":
      return "border-amber-400 bg-amber-50 text-amber-800";
    case "available":
      return "border-emerald-700 bg-white text-emerald-900";
    case "unknown":
      return "border-stone-300 bg-white text-stone-700";
  }
}
