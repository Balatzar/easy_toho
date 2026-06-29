import type { Cinema } from "@/lib/cinemas";

type CinemaMapLinkProps = {
  cinema: Cinema;
  className?: string;
};

export function CinemaMapLink({ cinema, className }: CinemaMapLinkProps) {
  const label = `Open ${cinema.name} in Google Maps`;

  return (
    <a
      href={googleMapsCinemaHref(cinema)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={[
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-stone-500 transition-colors hover:bg-stone-100 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </a>
  );
}

function googleMapsCinemaHref(cinema: Cinema): string {
  const { lat, lng } = cinema.coordinates;
  const query = `${cinema.name} ${cinema.area} Tokyo ${lat},${lng}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
