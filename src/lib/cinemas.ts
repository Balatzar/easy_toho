import type { ScheduleSource } from "./schedule-model";

export type Cinema = {
  slug: string;
  name: string;
  area: string;
  coordinates: {
    lat: number;
    lng: number;
  };
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

export type EigaCinemaConfig = Cinema & {
  adapter: "eiga";
  theaterPath: string;
};

export type CinemaConfig =
  | TohoCinemaConfig
  | SmtCinemaConfig
  | TjoyCinemaConfig
  | EigaCinemaConfig;

type WithoutSource<Config extends Cinema> = Config extends unknown
  ? Omit<Config, "source">
  : never;

type CinemaConfigReference = WithoutSource<CinemaConfig>;

const SOURCE_BY_ADAPTER = {
  toho: { id: "toho", name: "TOHO Cinemas" },
  smt: { id: "smt", name: "SMT Cinemas" },
  tjoy: { id: "tjoy", name: "T-Joy" },
  eiga: { id: "eiga", name: "eiga.com" },
} satisfies {
  [Adapter in CinemaConfig["adapter"]]: ScheduleSource & { id: Adapter };
};

export const DEFAULT_CINEMA_SLUG = "ikebukuro";

const CINEMA_CONFIG_REFERENCES: CinemaConfigReference[] = [
  {
    slug: "hibiya",
    name: "Hibiya Toho",
    area: "Hibiya",
    coordinates: { lat: 35.6730666, lng: 139.7594149 },
    imax: "imaxLaser",
    adapter: "toho",
    scheduleCode: "081",
    theaterCode: "081",
  },
  {
    slug: "chanter",
    name: "Chanter Toho",
    area: "Hibiya",
    coordinates: { lat: 35.6734305, lng: 139.7604959 },
    imax: null,
    adapter: "toho",
    scheduleCode: "081",
    theaterCode: "041",
  },
  {
    slug: "marunouchi-piccadilly",
    name: "Marunouchi Piccadilly",
    area: "Marunouchi",
    coordinates: { lat: 35.6736278, lng: 139.7627443 },
    imax: null,
    adapter: "smt",
    theaterCode: "1052",
    schedulePrefix: "s0100",
  },
  {
    slug: "shinjuku",
    name: "Shinjuku Toho",
    area: "Shinjuku",
    coordinates: { lat: 35.6951537, lng: 139.7019637 },
    imax: "imaxLaser",
    adapter: "toho",
    scheduleCode: "076",
    theaterCode: "076",
  },
  {
    slug: "shinjuku-wald-9",
    name: "Shinjuku Wald 9",
    area: "Shinjuku",
    coordinates: { lat: 35.6901173, lng: 139.7059134 },
    imax: null,
    adapter: "tjoy",
    sitePath: "shinjuku_wald9",
    theaterId: "140",
  },
  {
    slug: "t-joy-seibu-oizumi",
    name: "T-Joy SEIBU Oizumi",
    area: "Oizumi",
    coordinates: { lat: 35.752383, lng: 139.594855 },
    imax: null,
    adapter: "tjoy",
    sitePath: "t-joy_seibu_oizumi",
    theaterId: "120",
  },
  {
    slug: "shinjuku-piccadilly",
    name: "Shinjuku Piccadilly",
    area: "Shinjuku",
    coordinates: { lat: 35.6926548, lng: 139.7037539 },
    imax: null,
    adapter: "smt",
    theaterCode: "1051",
    schedulePrefix: "s0100",
  },
  {
    slug: "t-joy-prince-shinagawa",
    name: "T-Joy PRINCE Shinagawa",
    area: "Shinagawa",
    coordinates: { lat: 35.6276353, lng: 139.7367036 },
    imax: "imax",
    adapter: "tjoy",
    sitePath: "tjoy-prince-shinagawa",
    theaterId: "180",
  },
  {
    slug: "ikebukuro",
    name: "Ikebukuro Toho",
    area: "Ikebukuro",
    coordinates: { lat: 35.7323633, lng: 139.7154911 },
    imax: null,
    adapter: "toho",
    scheduleCode: "084",
    theaterCode: "084",
  },
  {
    slug: "nihonbashi",
    name: "Nihonbashi Toho",
    area: "Nihonbashi",
    coordinates: { lat: 35.6869786, lng: 139.7748976 },
    imax: null,
    adapter: "toho",
    scheduleCode: "073",
    theaterCode: "073",
  },
  {
    slug: "ueno",
    name: "Ueno Toho",
    area: "Ueno",
    coordinates: { lat: 35.7068718, lng: 139.7731586 },
    imax: null,
    adapter: "toho",
    scheduleCode: "080",
    theaterCode: "080",
  },
  {
    slug: "roppongi-hills",
    name: "Roppongi Hills Toho",
    area: "Roppongi",
    coordinates: { lat: 35.6595169, lng: 139.729227 },
    imax: null,
    adapter: "toho",
    scheduleCode: "009",
    theaterCode: "009",
  },
  {
    slug: "shibuya",
    name: "Shibuya Toho",
    area: "Shibuya",
    coordinates: { lat: 35.6591861, lng: 139.6988833 },
    imax: null,
    adapter: "toho",
    scheduleCode: "043",
    theaterCode: "043",
  },
  {
    slug: "oimachi",
    name: "Oimachi Toho",
    area: "Oimachi",
    coordinates: { lat: 35.6084367, lng: 139.7325967 },
    imax: null,
    adapter: "toho",
    scheduleCode: "090",
    theaterCode: "090",
  },
  {
    slug: "nishiarai",
    name: "Nishiarai Toho",
    area: "Nishiarai",
    coordinates: { lat: 35.7745552, lng: 139.7856383 },
    imax: null,
    adapter: "toho",
    scheduleCode: "040",
    theaterCode: "040",
  },
  {
    slug: "minamiosawa",
    name: "Minamiosawa Toho",
    area: "Minamiosawa",
    coordinates: { lat: 35.6148156, lng: 139.3805838 },
    imax: null,
    adapter: "toho",
    scheduleCode: "006",
    theaterCode: "006",
  },
  {
    slug: "fuchu",
    name: "Fuchu Toho",
    area: "Fuchu",
    coordinates: { lat: 35.6713819, lng: 139.4809623 },
    imax: null,
    adapter: "toho",
    scheduleCode: "012",
    theaterCode: "012",
  },
  {
    slug: "tachikawa-tachihi",
    name: "Tachikawa Tachihi Toho",
    area: "Tachikawa",
    coordinates: { lat: 35.7125451, lng: 139.4161569 },
    imax: "imax",
    adapter: "toho",
    scheduleCode: "085",
    theaterCode: "085",
  },
  {
    slug: "kinshicho",
    name: "Kinshicho Toho",
    area: "Kinshicho",
    coordinates: { lat: 35.6963172, lng: 139.8156414 },
    imax: null,
    adapter: "toho",
    scheduleCode: "029",
    theaterCode: "029",
  },
  {
    slug: "grand-cinema-sunshine",
    name: "Grand Cinema Sunshine",
    area: "Ikebukuro",
    coordinates: { lat: 35.730497, lng: 139.716437 },
    imax: "imaxLaser",
    adapter: "eiga",
    theaterPath: "/theater/13/130501/3291/",
  },
  {
    slug: "109-premium-shinjuku",
    name: "109 Cinemas Premium Shinjuku",
    area: "Shinjuku",
    coordinates: { lat: 35.695921, lng: 139.70072 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130201/3318/",
  },
  {
    slug: "united-cinemas-toyosu",
    name: "United Cinemas Toyosu",
    area: "Toyosu",
    coordinates: { lat: 35.655693, lng: 139.791796 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130708/3079/",
  },
  {
    slug: "cinema-sunshine-heiwajima",
    name: "Cinema Sunshine Heiwajima",
    area: "Ota",
    coordinates: { lat: 35.583436, lng: 139.738502 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130704/3077/",
  },
  {
    slug: "109-futakotamagawa",
    name: "109 Cinemas Futakotamagawa",
    area: "Setagaya",
    coordinates: { lat: 35.611305, lng: 139.629419 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130615/3264/",
  },
  {
    slug: "bunkamura-le-cinema",
    name: "Bunkamura Le Cinema Shibuya-Miyashita",
    area: "Shibuya",
    coordinates: { lat: 35.660156, lng: 139.702394 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3321/",
  },
  {
    slug: "human-trust-shibuya",
    name: "Human Trust Cinema Shibuya",
    area: "Shibuya",
    coordinates: { lat: 35.66152, lng: 139.703002 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3042/",
  },
  {
    slug: "image-forum",
    name: "Theatre Image Forum",
    area: "Shibuya",
    coordinates: { lat: 35.661337, lng: 139.70872 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3028/",
  },
  {
    slug: "eurospace",
    name: "Eurospace",
    area: "Shibuya",
    coordinates: { lat: 35.659791, lng: 139.695281 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3044/",
  },
  {
    slug: "cinema-vera",
    name: "Cinema Vera Shibuya",
    area: "Shibuya",
    coordinates: { lat: 35.659791, lng: 139.695281 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3298/",
  },
  {
    slug: "cine-quinto",
    name: "Cine Quinto",
    area: "Shibuya",
    coordinates: { lat: 35.660922, lng: 139.69949 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3283/",
  },
  {
    slug: "white-cine-quinto",
    name: "White Cine Quinto",
    area: "Shibuya",
    coordinates: { lat: 35.662194, lng: 139.698863 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3295/",
  },
  {
    slug: "shibuya-humax",
    name: "Shibuya HUMAX Cinema",
    area: "Shibuya",
    coordinates: { lat: 35.661331, lng: 139.699768 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130301/3041/",
  },
  {
    slug: "yebisu-garden-cinema",
    name: "Yebisu Garden Cinema",
    area: "Ebisu",
    coordinates: { lat: 35.642292, lng: 139.713597 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130608/3261/",
  },
  {
    slug: "shinjuku-musashinokan",
    name: "Shinjuku Musashinokan",
    area: "Shinjuku",
    coordinates: { lat: 35.691199, lng: 139.701959 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130201/3026/",
  },
  {
    slug: "theatre-shinjuku",
    name: "Theatre Shinjuku",
    area: "Shinjuku",
    coordinates: { lat: 35.691423, lng: 139.705398 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130201/3022/",
  },
  {
    slug: "cinemart-shinjuku",
    name: "Cinemart Shinjuku",
    area: "Shinjuku",
    coordinates: { lat: 35.691596, lng: 139.705401 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130201/3020/",
  },
  {
    slug: "ks-cinema",
    name: "K's cinema",
    area: "Shinjuku",
    coordinates: { lat: 35.689571, lng: 139.702752 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130201/3018/",
  },
  {
    slug: "kino-cinema-shinjuku",
    name: "kino cinema Shinjuku",
    area: "Shinjuku",
    coordinates: { lat: 35.691596, lng: 139.705401 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130201/3322/",
  },
  {
    slug: "human-trust-yurakucho",
    name: "Human Trust Cinema Yurakucho",
    area: "Yurakucho",
    coordinates: { lat: 35.674173, lng: 139.763817 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130102/3004/",
  },
  {
    slug: "kadokawa-yurakucho",
    name: "Kadokawa Cinema Yurakucho",
    area: "Yurakucho",
    coordinates: { lat: 35.675214, lng: 139.763333 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130102/3248/",
  },
  {
    slug: "cine-switch-ginza",
    name: "Cine Switch Ginza",
    area: "Ginza",
    coordinates: { lat: 35.672332, lng: 139.764657 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130101/3005/",
  },
  {
    slug: "shin-bungeiza",
    name: "Shin-Bungeiza",
    area: "Ikebukuro",
    coordinates: { lat: 35.731774, lng: 139.714584 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130501/3055/",
  },
  {
    slug: "cinema-rosa",
    name: "Cinema Rosa",
    area: "Ikebukuro",
    coordinates: { lat: 35.732439, lng: 139.710615 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130501/3052/",
  },
  {
    slug: "pole-pole-higashi-nakano",
    name: "Pole Pole Higashi-Nakano",
    area: "Higashi-Nakano",
    coordinates: { lat: 35.706115, lng: 139.68474 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130612/3292/",
  },
  {
    slug: "stranger",
    name: "Stranger",
    area: "Kikukawa",
    coordinates: { lat: 35.688731, lng: 139.806456 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130718/3319/",
  },
  {
    slug: "meguro-cinema",
    name: "Meguro Cinema",
    area: "Meguro",
    coordinates: { lat: 35.634434, lng: 139.715784 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130609/3069/",
  },
  {
    slug: "waseda-shochiku",
    name: "Waseda Shochiku",
    area: "Takadanobaba",
    coordinates: { lat: 35.711352, lng: 139.704252 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130611/3071/",
  },
  {
    slug: "laputa-asagaya",
    name: "Laputa Asagaya",
    area: "Asagaya",
    coordinates: { lat: 35.705906, lng: 139.635467 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130610/3070/",
  },
  {
    slug: "uplink-kichijoji",
    name: "Uplink Kichijoji",
    area: "Kichijoji",
    coordinates: { lat: 35.703489, lng: 139.579595 },
    imax: null,
    adapter: "eiga",
    theaterPath: "/theater/13/130809/3285/",
  },
];

const CINEMA_CONFIGS = CINEMA_CONFIG_REFERENCES.map(withScheduleSource);

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
    coordinates: config.coordinates,
    imax: config.imax,
    source: config.source,
  };
}

function withScheduleSource(config: CinemaConfigReference): CinemaConfig {
  switch (config.adapter) {
    case "toho":
      return { ...config, source: SOURCE_BY_ADAPTER.toho };
    case "smt":
      return { ...config, source: SOURCE_BY_ADAPTER.smt };
    case "tjoy":
      return { ...config, source: SOURCE_BY_ADAPTER.tjoy };
    case "eiga":
      return { ...config, source: SOURCE_BY_ADAPTER.eiga };
  }
}
