import type { ReactNode } from "react";
import type { CinemaScheduleFailure } from "@/lib/schedule-aggregate";
import {
  type LanguageRank,
  type PlanningDay,
  type ShowtimeAvailability,
  firstSelectableDate,
} from "@/lib/schedules";
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
  const fallbackDate = firstSelectableDate(days);

  return (
    <nav
      className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-3"
      aria-label="Planning days"
    >
      {days.map((day, index) => {
        const active = day.date === selectedDate;
        const label = index === 0 ? "Today" : day.weekday;
        const href = hrefForDate(day.selectable ? day.date : fallbackDate);

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

export function PartialScheduleWarning({
  failedCinemas,
}: {
  failedCinemas: CinemaScheduleFailure[];
}) {
  if (failedCinemas.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Could not load:{" "}
      {failedCinemas.map((failure) => failure.cinema.name).join(", ")}.
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
      <div className="flex aspect-[2/3] items-center justify-center rounded-md border border-dashed border-stone-300 bg-white p-3 text-center">
        <span className="text-sm font-semibold text-stone-700">{title}</span>
      </div>
    );
  }

  return (
    <div
      className="aspect-[2/3] rounded-md bg-stone-200 bg-cover bg-center"
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
