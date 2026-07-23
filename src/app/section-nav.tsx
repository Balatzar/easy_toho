import {
  agendaHref,
  imaxHref,
  moviesHref,
  plannerHref,
  statsHref,
} from "@/lib/routes";
import { PendingLink } from "./pending-link";

type Section = "cinemas" | "agenda" | "movies" | "imax" | "stats";

const activeClass =
  "rounded-md border border-red-700 bg-red-700 px-3 py-2 text-white shadow-sm hover:bg-red-800";

const inactiveClass =
  "rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-700 hover:border-stone-400 hover:text-stone-950";

export function SectionNav({
  active,
  cinemaSlug,
  selectedDate,
}: {
  active: Section;
  cinemaSlug: string;
  selectedDate: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm font-semibold">
      <PendingLink
        href={plannerHref(cinemaSlug, selectedDate)}
        aria-current={active === "cinemas" ? "page" : undefined}
        className={active === "cinemas" ? activeClass : inactiveClass}
      >
        Cinemas
      </PendingLink>
      <PendingLink
        href={agendaHref()}
        aria-current={active === "agenda" ? "page" : undefined}
        className={active === "agenda" ? activeClass : inactiveClass}
      >
        Agenda
      </PendingLink>
      <PendingLink
        href={moviesHref(selectedDate)}
        aria-current={active === "movies" ? "page" : undefined}
        className={active === "movies" ? activeClass : inactiveClass}
      >
        Movies
      </PendingLink>
      <PendingLink
        href={imaxHref(selectedDate)}
        aria-current={active === "imax" ? "page" : undefined}
        className={active === "imax" ? activeClass : inactiveClass}
      >
        IMAX
      </PendingLink>
      <PendingLink
        href={statsHref(selectedDate)}
        aria-current={active === "stats" ? "page" : undefined}
        className={active === "stats" ? activeClass : inactiveClass}
      >
        Stats
      </PendingLink>
    </nav>
  );
}
