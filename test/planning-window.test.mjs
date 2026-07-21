import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlanningWindow,
  resolvePlanningSelection,
} from "../src/lib/planning-window.ts";

test("keeps the Planning Window fixed when a Schedule Source omits days", () => {
  const days = createPlanningWindow(
    [
      { date: "2026-07-21", selectable: true },
      { date: "2026-07-23", selectable: true },
      { date: "2026-07-28", selectable: true },
    ],
    new Date("2026-07-21T00:30:00+09:00"),
  );

  assert.deepEqual(
    days.map(({ date }) => date),
    [
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
    ],
  );
  assert.deepEqual(
    days.map(({ selectable }) => selectable),
    [true, false, true, false, false, false, false],
  );
  assert.equal(days[0]?.isToday, true);
});

test("falls back when the requested Selected Day is unavailable", () => {
  const now = new Date("2026-07-21T00:30:00+09:00");
  const days = createPlanningWindow(
    [
      { date: "2026-07-21", selectable: true },
      { date: "2026-07-23", selectable: true },
    ],
    now,
  );

  const selection = resolvePlanningSelection(
    ["2026-07-22", "2026-07-23"],
    days,
  );

  assert.equal(selection.selectedDate, "2026-07-21");
  assert.equal(selection.selectedDay.date, "2026-07-21");
  assert.equal(selection.days, days);
});

test("starts the Planning Window on the Tokyo Day", () => {
  const days = createPlanningWindow(
    undefined,
    new Date("2026-12-31T15:30:00Z"),
  );

  assert.equal(days[0]?.date, "2027-01-01");
  assert.equal(days[0]?.isToday, true);
  assert.equal(days[0]?.weekday, "Fri");
});
