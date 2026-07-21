const TOKYO_TIME_ZONE = "Asia/Tokyo";
const PLANNING_WINDOW_DAYS = 7;

export type SourcePlanningDay = {
  date: string;
  selectable: boolean;
};

export type PlanningDay = SourcePlanningDay & {
  weekday: string;
  label: string;
  isToday: boolean;
};

export type PlanningSelection = {
  days: PlanningDay[];
  selectedDate: string;
  selectedDay: PlanningDay;
};

export function createPlanningWindow(
  sourceDays: SourcePlanningDay[] | undefined,
  now: Date,
): PlanningDay[] {
  const today = tokyoDate(now);
  const availability = sourceDays
    ? new Map(sourceDays.map((day) => [day.date, day.selectable]))
    : null;

  return Array.from({ length: PLANNING_WINDOW_DAYS }, (_, index) => {
    const date = addDays(today, index);
    const selectable = availability
      ? (availability.get(date) ?? false)
      : true;

    return toPlanningDay(date, selectable, today);
  });
}

export function resolvePlanningSelection(
  rawDate: string | string[] | undefined,
  days: PlanningDay[],
): PlanningSelection {
  if (days.length === 0) {
    throw new Error("Planning Window requires at least one Planning Day.");
  }

  const requestedDate = normalizeUrlDate(
    Array.isArray(rawDate) ? rawDate[0] : rawDate,
  );
  const selectedDay =
    days.find(
      (day) => day.date === requestedDate && day.selectable,
    ) ??
    days.find((day) => day.selectable) ??
    days[0];

  return {
    days,
    selectedDate: selectedDay.date,
    selectedDay,
  };
}

function toPlanningDay(
  date: string,
  selectable: boolean,
  today: string,
): PlanningDay {
  const parsed = parseDateParts(date);
  const instant = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));

  return {
    date,
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(instant),
    label: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(instant),
    selectable,
    isToday: date === today,
  };
}

function tokyoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(date: string, days: number): string {
  const parsed = parseDateParts(date);
  const instant = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day + days),
  );

  return [
    instant.getUTCFullYear(),
    String(instant.getUTCMonth() + 1).padStart(2, "0"),
    String(instant.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeUrlDate(rawDate: string | undefined): string | null {
  if (!rawDate) return null;
  if (/^\d{8}$/.test(rawDate)) {
    return `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  return null;
}

function parseDateParts(date: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}
