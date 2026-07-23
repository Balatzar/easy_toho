import { htmlText } from "./source-adapter-support.ts";

export const EIGA_BASE_URL = "https://eiga.com";

export type JapanRelease = {
  id: string;
  title: string;
  posterUrl: string | null;
  director: string | null;
  sourceUrl: string;
  matchesEnglishFilter: boolean;
};

export type JapanReleaseDateGroup = {
  date: string;
  releases: JapanRelease[];
};

export function currentReleaseMonthTokyo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) throw new Error("Could not resolve the current month in Tokyo.");
  return `${year}-${month}`;
}

export function normalizeReleaseMonth(
  value: string | undefined,
  fallback = currentReleaseMonthTokyo(),
): string {
  if (!value?.match(/^\d{4}-\d{2}$/)) return fallback;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12 ? value : fallback;
}

export function shiftReleaseMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function releaseMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function parseEigaReleaseCalendarPage(
  html: string,
  month: string,
): JapanReleaseDateGroup[] {
  const [fallbackYear] = month.split("-");
  const groups: JapanReleaseDateGroup[] = [];
  const groupPattern =
    /<h2[^>]*class="[^"]*\btitle-square\b[^"]*"[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*class="[^"]*\btitle-square\b|<\/section>|$)/g;

  for (const match of html.matchAll(groupPattern)) {
    const [, heading, content] = match;
    const headingText = htmlText(heading);
    const year = headingText.match(/(\d{4})年/)?.[1] ?? fallbackYear;
    const monthAndDay = headingText.match(/(\d{1,2})月(\d{1,2})日/);
    if (!monthAndDay) continue;

    const date = `${year}-${monthAndDay[1].padStart(2, "0")}-${monthAndDay[2].padStart(2, "0")}`;
    const releases = parseReleaseBlocks(content);
    if (releases.length > 0) groups.push({ date, releases });
  }

  return groups;
}

function parseReleaseBlocks(content: string): JapanRelease[] {
  const releases: JapanRelease[] = [];
  const blockPattern =
    /<div\s+id="mv(\d+)"[^>]*class="[^"]*\blist-block2\b[^"]*"[^>]*>[\s\S]*?(?=<div\s+id="mv\d+"|$)/g;

  for (const match of content.matchAll(blockPattern)) {
    const [block, sourceId] = match;
    const title = htmlText(
      block.match(
        /<h3[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/h3>/,
      )?.[1] ?? "",
    );
    if (!title) continue;

    const director = optionalText(
      block.match(/<li[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>\s*監督/)?.[1],
    );
    const imageAttributes = block.match(/<img\b([^>]*)>/)?.[1] ?? "";
    const posterUrl = normalizeUrl(
      attribute(imageAttributes, "src") ?? attribute(imageAttributes, "data-src"),
    );

    releases.push({
      id: `eiga:${sourceId}`,
      title,
      posterUrl,
      director,
      sourceUrl: `${EIGA_BASE_URL}/movie/${sourceId}/`,
      matchesEnglishFilter: matchesEnglishFilter(title, director),
    });
  }

  return releases;
}

function matchesEnglishFilter(title: string, director: string | null): boolean {
  const latinLetterCount = title.match(/[a-z]/gi)?.length ?? 0;
  const japaneseCharacterCount =
    title.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.length ?? 0;
  const latinDominantTitle =
    latinLetterCount >= 4 && latinLetterCount >= japaneseCharacterCount;
  const foreignDirector = /[\u30a0-\u30ffー]{4,}/.test(director ?? "");

  return latinDominantTitle || foreignDirector;
}

function optionalText(value: string | undefined): string | null {
  if (!value) return null;
  return htmlText(value) || null;
}

function attribute(attributes: string, name: string): string | null {
  return attributes.match(new RegExp(`\\b${name}="([^"]+)"`, "i"))?.[1] ?? null;
}

function normalizeUrl(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${EIGA_BASE_URL}${value}`;
  return value;
}
