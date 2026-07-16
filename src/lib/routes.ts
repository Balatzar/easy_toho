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

export function movieHref(movieId: string, date: string): string {
  const params = new URLSearchParams({ date });
  return `/movies/${encodeURIComponent(movieId)}?${params}`;
}
