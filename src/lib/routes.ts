export function plannerHref(cinema: string, date: string): string {
  const params = new URLSearchParams({ cinema, date });
  return `/?${params}`;
}

export function moviesHref(date: string): string {
  const params = new URLSearchParams({ date });
  return `/movies?${params}`;
}

export function movieHref(movieCode: string, date: string): string {
  const params = new URLSearchParams({ date });
  return `/movies/${encodeURIComponent(movieCode)}?${params}`;
}
