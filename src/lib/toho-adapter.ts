import type { TohoCinemaConfig } from "./cinemas";
import {
  type PlanningDay,
  createPlanningWindow,
} from "./planning-window";
import {
  type MovieCard,
  type ScheduleResult,
  type Showtime,
  type ShowtimeAvailability,
  createMovieCard,
  hidePastShowtimes,
  sortMovieCards,
} from "./schedule-model";
import {
  type MovieCard as TohoMovieCard,
  type SeatSalesStatusCode,
  type Showtime as TohoShowtime,
  getPlanningDays as getTohoPlanningDays,
  getSchedule as getTohoSchedule,
} from "./toho";

export async function getPlanningDays(
  config: TohoCinemaConfig,
): Promise<PlanningDay[]> {
  try {
    return createPlanningWindow(
      await getTohoPlanningDays(config.scheduleCode),
      new Date(),
    );
  } catch {
    return createPlanningWindow(undefined, new Date());
  }
}

export async function getSchedule(
  config: TohoCinemaConfig,
  selectedDate: string,
): Promise<ScheduleResult> {
  const result = await getTohoSchedule(config, selectedDate);

  if (!result.ok) {
    return result;
  }

  const schedule = {
    ok: true as const,
    cards: sortMovieCards(result.cards.map(toMovieCard)),
    fetchedAt: result.fetchedAt,
  };

  return hidePastShowtimes(schedule, selectedDate, new Date());
}

function toMovieCard(card: TohoMovieCard): MovieCard {
  return createMovieCard({
    sourceId: "toho",
    rawEnglishLabels: card.rawEnglishLabels,
    sourceLabels: card.sourceLabels,
    artworkUrl: card.artworkUrl,
    runtimeMinutes: card.runtimeMinutes,
    rating: card.rating,
    showtimes: card.showtimes.map(toShowtime),
  });
}

function toShowtime(showtime: TohoShowtime): Showtime {
  return {
    start: showtime.start,
    end: showtime.end,
    screen: showtime.screen,
    formats: showtime.formats,
    language: showtime.language,
    languageLabel: showtime.languageLabel,
    availability: toAvailability(showtime.seatStatus),
    availabilityLabel: showtime.seatStatusLabel,
    eventLabel: showtime.eventLabel,
  };
}

function toAvailability(status: SeatSalesStatusCode): ShowtimeAvailability {
  switch (status) {
    case "A":
    case "B":
      return "available";
    case "C":
      return "limited";
    case "D":
      return "soldOut";
    case "G":
      return "notSelling";
    default:
      return "unknown";
  }
}
