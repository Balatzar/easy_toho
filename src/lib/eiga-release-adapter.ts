import { unstable_cache } from "next/cache";
import {
  type JapanReleaseDateGroup,
  parseEigaReleaseCalendarPage,
} from "./eiga-release-calendar";
import { fetchTextWithTimeout } from "./source-adapter-support";

const EIGA_BASE_URL = "https://eiga.com";
const RELEASE_CALENDAR_CACHE_SECONDS = 6 * 60 * 60;

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
): Promise<JapanReleaseCalendarResult> {
  try {
    return await getCachedJapanReleaseCalendar(month);
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

const getCachedJapanReleaseCalendar = unstable_cache(
  async (month: string): Promise<Extract<JapanReleaseCalendarResult, { ok: true }>> => {
    const compactMonth = month.replace("-", "");
    const html = await fetchTextWithTimeout(
      `${EIGA_BASE_URL}/coming/${compactMonth}/`,
      {
        timeoutMs: 10_000,
        cache: "no-store",
        errorMessage: (response) =>
          `Eiga release calendar request failed with ${response.status}`,
      },
    );
    const groups = parseEigaReleaseCalendarPage(html, month);

    if (groups.length === 0) {
      throw new Error("Eiga returned no releases for this month.");
    }

    return {
      ok: true,
      groups,
      fetchedAt: new Date().toISOString(),
    };
  },
  ["eiga-japan-release-calendar-v1"],
  { revalidate: RELEASE_CALENDAR_CACHE_SECONDS },
);
