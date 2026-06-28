import { PendingLink } from "./pending-link";

type Section = "cinemas" | "movies" | "imax";

const activeClass =
  "rounded border border-red-700 bg-red-50 px-2.5 py-1 text-red-950 hover:bg-red-100";

const inactiveClass =
  "rounded border border-stone-300 bg-white px-2.5 py-1 text-stone-700 hover:border-stone-950";

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
    <nav className="flex flex-wrap gap-2 text-xs font-semibold">
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
