export function plannerHref(cinema: string, date: string): string {
  const params = new URLSearchParams({ cinema, date });
  return `/?${params}`;
}

export function moviesHref(date: string): string {
  const params = new URLSearchParams({ date });
  return `/movies?${params}`;
}

export function imaxHref(date: string): string {
  const params = new URLSearchParams({ date });
  return `/imax?${params}`;
}

export function statsHref(date: string): string {
  const params = new URLSearchParams({ date });
  return `/stats?${params}`;
}

export function agendaHref(
  month?: string,
  filter: "all" | "english" = "all",
): string {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (filter === "english") params.set("filter", "english");
  const search = params.toString();
  return `/agenda${search ? `?${search}` : ""}`;
}

export function movieHref(movieId: string, date: string): string {
  const params = new URLSearchParams({ date });
  return `/movies/${encodeURIComponent(movieId)}?${params}`;
}
