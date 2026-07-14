import { PendingLink } from "./pending-link";

type Section = "cinemas" | "movies" | "imax";

const activeClass =
  "rounded-md border border-red-700 bg-red-700 px-3 py-2 text-white shadow-sm hover:bg-red-800";

const inactiveClass =
  "rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-700 hover:border-stone-400 hover:text-stone-950";

export function SectionNav({
  active,
  cinemasHref,
  moviesHref,
  imaxHref,
}: {
  active: Section;
  cinemasHref: string;
  moviesHref: string;
  imaxHref: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm font-semibold">
      <PendingLink
        href={cinemasHref}
        aria-current={active === "cinemas" ? "page" : undefined}
        className={active === "cinemas" ? activeClass : inactiveClass}
      >
        Cinemas
      </PendingLink>
      <PendingLink
        href={moviesHref}
        aria-current={active === "movies" ? "page" : undefined}
        className={active === "movies" ? activeClass : inactiveClass}
      >
        Movies
      </PendingLink>
      <PendingLink
        href={imaxHref}
        aria-current={active === "imax" ? "page" : undefined}
        className={active === "imax" ? activeClass : inactiveClass}
      >
        IMAX
      </PendingLink>
    </nav>
  );
}
