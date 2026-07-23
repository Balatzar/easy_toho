import {
  type EigaReleaseDetail,
  type JapanReleaseDateGroup,
  type JapanRelease,
  EIGA_BASE_URL,
  parseEigaReleaseDetailPage,
  parseEigaReleaseCalendarPage,
  releaseForEnglishFilter,
} from "./eiga-release-calendar";
import { fetchTextWithTimeout } from "./source-adapter-support";

const RELEASE_CALENDAR_CACHE_SECONDS = 6 * 60 * 60;
const RELEASE_DETAIL_CACHE_SECONDS = 7 * 24 * 60 * 60;
const RELEASE_DETAIL_CONCURRENCY = 12;

export type JapanReleaseCalendarResult =
  | {
      ok: true;
      groups: JapanReleaseDateGroup[];
      fetchedAt: string;
    }
  | {
      ok: false;
      error: string;
      fetchedAt: string;
    };

export async function getJapanReleaseCalendar(
  month: string,
  filter: "all" | "english" = "all",
): Promise<JapanReleaseCalendarResult> {
  try {
    const compactMonth = month.replace("-", "");
    const html = await fetchTextWithTimeout(
      `${EIGA_BASE_URL}/coming/${compactMonth}/`,
      {
        timeoutMs: 10_000,
        init: { next: { revalidate: RELEASE_CALENDAR_CACHE_SECONDS } },
        errorMessage: (response) =>
          `Eiga release calendar request failed with ${response.status}`,
      },
    );
    const parsedGroups = parseEigaReleaseCalendarPage(html, month);

    if (parsedGroups.length === 0) {
      throw new Error("Eiga returned no releases for this month.");
    }

    const groups =
      filter === "english"
        ? await filterEnglishReleaseGroups(parsedGroups)
        : parsedGroups;

    return {
      ok: true,
      groups,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not fetch the Japan release calendar right now.",
      fetchedAt: new Date().toISOString(),
    };
  }
}

async function filterEnglishReleaseGroups(
  groups: JapanReleaseDateGroup[],
): Promise<JapanReleaseDateGroup[]> {
  const releases = groups.flatMap((group) => group.releases);
  const details = await mapWithConcurrency(
    releases,
    RELEASE_DETAIL_CONCURRENCY,
    fetchReleaseDetail,
  );
  const detailsByReleaseId = new Map(
    releases.map((release, index) => [release.id, details[index]]),
  );

  return groups
    .map((group) => ({
      ...group,
      releases: group.releases.flatMap((release) => {
        const detail = detailsByReleaseId.get(release.id);
        if (!detail) return [];
        const filteredRelease = releaseForEnglishFilter(release, detail);
        return filteredRelease ? [filteredRelease] : [];
      }),
    }))
    .filter((group) => group.releases.length > 0);
}

async function fetchReleaseDetail(
  release: JapanRelease,
): Promise<EigaReleaseDetail | null> {
  try {
    const html = await fetchTextWithTimeout(release.sourceUrl, {
      timeoutMs: 8_000,
      init: { next: { revalidate: RELEASE_DETAIL_CACHE_SECONDS } },
      errorMessage: (response) =>
        `Eiga release detail request failed with ${response.status}`,
    });
    return parseEigaReleaseDetailPage(html);
  } catch {
    return null;
  }
}

async function mapWithConcurrency<Input, Output>(
  items: Input[],
  concurrency: number,
  mapper: (item: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = new Array<Output>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );
  return results;
}
