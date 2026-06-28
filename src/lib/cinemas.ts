import type { ScheduleSource } from "./schedule-model";

export type Cinema = {
  slug: string;
  name: string;
  area: string;
  imax: "imax" | "imaxLaser" | null;
  source: ScheduleSource;
};

export type TohoCinemaConfig = Cinema & {
  adapter: "toho";
  scheduleCode: string;
  theaterCode: string;
};

export type SmtCinemaConfig = Cinema & {
  adapter: "smt";
  theaterCode: string;
  schedulePrefix: string;
};

export type TjoyCinemaConfig = Cinema & {
  adapter: "tjoy";
  sitePath: string;
  theaterId: string;
};

export type CinemaConfig =
  | TohoCinemaConfig
  | SmtCinemaConfig
  | TjoyCinemaConfig;

const TOHO_SOURCE: ScheduleSource = {
  id: "toho",
  name: "TOHO Cinemas",
};

const SMT_SOURCE: ScheduleSource = {
  id: "smt",
  name: "SMT Cinemas",
};

const TJOY_SOURCE: ScheduleSource = {
  id: "tjoy",
  name: "T-Joy",
};

export const DEFAULT_CINEMA_SLUG = "ikebukuro";

const CINEMA_CONFIGS: CinemaConfig[] = [
  {
    slug: "hibiya",
    name: "Hibiya Toho",
    area: "Hibiya",
    imax: "imaxLaser",
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "081",
    theaterCode: "081",
  },
  {
    slug: "chanter",
    name: "Chanter Toho",
    area: "Hibiya",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "081",
    theaterCode: "041",
  },
  {
    slug: "marunouchi-piccadilly",
    name: "Marunouchi Piccadilly",
    area: "Marunouchi",
    imax: null,
    source: SMT_SOURCE,
    adapter: "smt",
    theaterCode: "1052",
    schedulePrefix: "s0100",
  },
  {
    slug: "shinjuku",
    name: "Shinjuku Toho",
    area: "Shinjuku",
    imax: "imaxLaser",
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "076",
    theaterCode: "076",
  },
  {
    slug: "shinjuku-wald-9",
    name: "Shinjuku Wald 9",
    area: "Shinjuku",
    imax: null,
    source: TJOY_SOURCE,
    adapter: "tjoy",
    sitePath: "shinjuku_wald9",
    theaterId: "140",
  },
  {
    slug: "t-joy-seibu-oizumi",
    name: "T-Joy SEIBU Oizumi",
    area: "Oizumi",
    imax: null,
    source: TJOY_SOURCE,
    adapter: "tjoy",
    sitePath: "t-joy_seibu_oizumi",
    theaterId: "120",
  },
  {
    slug: "shinjuku-piccadilly",
    name: "Shinjuku Piccadilly",
    area: "Shinjuku",
    imax: null,
    source: SMT_SOURCE,
    adapter: "smt",
    theaterCode: "1051",
    schedulePrefix: "s0100",
  },
  {
    slug: "t-joy-prince-shinagawa",
    name: "T-Joy PRINCE Shinagawa",
    area: "Shinagawa",
    imax: "imax",
    source: TJOY_SOURCE,
    adapter: "tjoy",
    sitePath: "tjoy-prince-shinagawa",
    theaterId: "180",
  },
  {
    slug: "ikebukuro",
    name: "Ikebukuro Toho",
    area: "Ikebukuro",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "084",
    theaterCode: "084",
  },
  {
    slug: "nihonbashi",
    name: "Nihonbashi Toho",
    area: "Nihonbashi",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "073",
    theaterCode: "073",
  },
  {
    slug: "ueno",
    name: "Ueno Toho",
    area: "Ueno",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "080",
    theaterCode: "080",
  },
  {
    slug: "roppongi-hills",
    name: "Roppongi Hills Toho",
    area: "Roppongi",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "009",
    theaterCode: "009",
  },
  {
    slug: "shibuya",
    name: "Shibuya Toho",
    area: "Shibuya",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "043",
    theaterCode: "043",
  },
  {
    slug: "oimachi",
    name: "Oimachi Toho",
    area: "Oimachi",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "090",
    theaterCode: "090",
  },
  {
    slug: "nishiarai",
    name: "Nishiarai Toho",
    area: "Nishiarai",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "040",
    theaterCode: "040",
  },
  {
    slug: "minamiosawa",
    name: "Minamiosawa Toho",
    area: "Minamiosawa",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "006",
    theaterCode: "006",
  },
  {
    slug: "fuchu",
    name: "Fuchu Toho",
    area: "Fuchu",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "012",
    theaterCode: "012",
  },
  {
    slug: "tachikawa-tachihi",
    name: "Tachikawa Tachihi Toho",
    area: "Tachikawa",
    imax: "imax",
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "085",
    theaterCode: "085",
  },
  {
    slug: "kinshicho",
    name: "Kinshicho Toho",
    area: "Kinshicho",
    imax: null,
    source: TOHO_SOURCE,
    adapter: "toho",
    scheduleCode: "029",
    theaterCode: "029",
  },
];

export const TOKYO_CINEMAS: Cinema[] = CINEMA_CONFIGS.map(toCinema);

export const IMAX_CAPABLE_CINEMAS = TOKYO_CINEMAS.filter(
  (cinema) => cinema.imax,
);

export function getCinemaBySlug(slug: string | undefined): Cinema {
  return (
    TOKYO_CINEMAS.find((cinema) => cinema.slug === slug) ??
    TOKYO_CINEMAS.find((cinema) => cinema.slug === DEFAULT_CINEMA_SLUG) ??
    TOKYO_CINEMAS[0]
  );
}

export function getCinemaConfig(cinema: Cinema): CinemaConfig {
  return getCinemaConfigBySlug(cinema.slug);
}

export function getCinemaConfigBySlug(slug: string | undefined): CinemaConfig {
  return (
    CINEMA_CONFIGS.find((cinema) => cinema.slug === slug) ??
    CINEMA_CONFIGS.find((cinema) => cinema.slug === DEFAULT_CINEMA_SLUG) ??
    CINEMA_CONFIGS[0]
  );
}

function toCinema(config: CinemaConfig): Cinema {
  return {
    slug: config.slug,
    name: config.name,
    area: config.area,
    imax: config.imax,
    source: config.source,
  };
}
