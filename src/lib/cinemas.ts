export type Cinema = {
  slug: string;
  name: string;
  area: string;
  imax: "imax" | "imaxLaser" | null;
  scheduleCode: string;
  theaterCode: string;
};

export const DEFAULT_CINEMA_SLUG = "ikebukuro";

export const TOKYO_CINEMAS: Cinema[] = [
  {
    slug: "hibiya",
    name: "TOHO Cinemas Hibiya",
    area: "Hibiya",
    imax: "imaxLaser",
    scheduleCode: "081",
    theaterCode: "081",
  },
  {
    slug: "chanter",
    name: "TOHO Cinemas Chanter",
    area: "Hibiya",
    imax: null,
    scheduleCode: "081",
    theaterCode: "041",
  },
  {
    slug: "shinjuku",
    name: "TOHO Cinemas Shinjuku",
    area: "Shinjuku",
    imax: "imaxLaser",
    scheduleCode: "076",
    theaterCode: "076",
  },
  {
    slug: "ikebukuro",
    name: "TOHO Cinemas Ikebukuro",
    area: "Ikebukuro",
    imax: null,
    scheduleCode: "084",
    theaterCode: "084",
  },
  {
    slug: "nihonbashi",
    name: "TOHO Cinemas Nihonbashi",
    area: "Nihonbashi",
    imax: null,
    scheduleCode: "073",
    theaterCode: "073",
  },
  {
    slug: "ueno",
    name: "TOHO Cinemas Ueno",
    area: "Ueno",
    imax: null,
    scheduleCode: "080",
    theaterCode: "080",
  },
  {
    slug: "roppongi-hills",
    name: "TOHO Cinemas Roppongi Hills",
    area: "Roppongi",
    imax: null,
    scheduleCode: "009",
    theaterCode: "009",
  },
  {
    slug: "shibuya",
    name: "TOHO Cinemas Shibuya",
    area: "Shibuya",
    imax: null,
    scheduleCode: "043",
    theaterCode: "043",
  },
  {
    slug: "oimachi",
    name: "TOHO Cinemas Oimachi",
    area: "Oimachi",
    imax: null,
    scheduleCode: "090",
    theaterCode: "090",
  },
  {
    slug: "nishiarai",
    name: "TOHO Cinemas Nishiarai",
    area: "Nishiarai",
    imax: null,
    scheduleCode: "040",
    theaterCode: "040",
  },
  {
    slug: "minamiosawa",
    name: "TOHO Cinemas Minamiosawa",
    area: "Minamiosawa",
    imax: null,
    scheduleCode: "006",
    theaterCode: "006",
  },
  {
    slug: "fuchu",
    name: "TOHO Cinemas Fuchu",
    area: "Fuchu",
    imax: null,
    scheduleCode: "012",
    theaterCode: "012",
  },
  {
    slug: "tachikawa-tachihi",
    name: "TOHO Cinemas Tachikawa Tachihi",
    area: "Tachikawa",
    imax: "imax",
    scheduleCode: "085",
    theaterCode: "085",
  },
  {
    slug: "kinshicho",
    name: "TOHO Cinemas Kinshicho",
    area: "Kinshicho",
    imax: null,
    scheduleCode: "029",
    theaterCode: "029",
  },
];

export function getCinemaBySlug(slug: string | undefined): Cinema {
  return (
    TOKYO_CINEMAS.find((cinema) => cinema.slug === slug) ??
    TOKYO_CINEMAS.find((cinema) => cinema.slug === DEFAULT_CINEMA_SLUG) ??
    TOKYO_CINEMAS[0]
  );
}
