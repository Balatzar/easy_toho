type FetchWithTimeoutOptions = {
  timeoutMs: number;
  init?: RequestInit;
  cache?: RequestCache;
  errorMessage?: (response: Response, url: string) => string;
};

export async function fetchWithTimeout(
  url: string,
  { timeoutMs, init, cache, errorMessage }: FetchWithTimeoutOptions,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: init?.cache ?? cache,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        errorMessage?.(response, url) ??
          `Schedule Source request failed with ${response.status}`,
      );
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTextWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions,
): Promise<string> {
  const response = await fetchWithTimeout(url, options);
  return response.text();
}

export function htmlText(value: string): string {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
