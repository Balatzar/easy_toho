import type { Cinema } from "./cinemas";
import { getCinemaConfig } from "./cinemas";
import type { PlanningDay, ScheduleResult } from "./schedule-model";
import * as eigaAdapter from "./eiga-adapter";
import * as smtAdapter from "./smt-adapter";
import * as tjoyAdapter from "./tjoy-adapter";
import * as tohoAdapter from "./toho-adapter";

export {
  type LanguageRank,
  type MovieCard,
  type PlanningDay,
  type ScheduleResult,
  type Showtime,
  type ShowtimeAvailability,
  firstSelectableDate,
  isTodayTokyo,
  isImaxScreening,
  normalizeSelectedDate,
} from "./schedule-model";

export async function getPlanningDays(cinema: Cinema): Promise<PlanningDay[]> {
  const config = getCinemaConfig(cinema);

  switch (config.adapter) {
    case "toho":
      return tohoAdapter.getPlanningDays(config);
    case "smt":
      return smtAdapter.getPlanningDays(config);
    case "tjoy":
      return tjoyAdapter.getPlanningDays(config);
    case "eiga":
      return eigaAdapter.getPlanningDays(config);
  }
}

export async function getSchedule(
  cinema: Cinema,
  selectedDate: string,
): Promise<ScheduleResult> {
  const config = getCinemaConfig(cinema);

  switch (config.adapter) {
    case "toho":
      return tohoAdapter.getSchedule(config, selectedDate);
    case "smt":
      return smtAdapter.getSchedule(config, selectedDate);
    case "tjoy":
      return tjoyAdapter.getSchedule(config, selectedDate);
    case "eiga":
      return eigaAdapter.getSchedule(config, selectedDate);
  }
}
