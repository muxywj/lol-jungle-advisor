import type { ActiveGame } from "@/types/riot";
import type { PlatformRegion } from "@/types/common";
import { PLATFORM_HOST } from "@/lib/constants/regions";
import { riotFetch, RiotApiError } from "./client";

/**
 * spectator-v5: summonerId → ActiveGame | null
 * Returns null when the summoner is not currently in a game (404).
 */
export async function getActiveGame(
  puuid: string,
  platformRegion: PlatformRegion
): Promise<ActiveGame | null> {
  const host = PLATFORM_HOST[platformRegion];
  const url = `https://${host}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`;
  try {
    return await riotFetch<ActiveGame>(url);
  } catch (err) {
    if (err instanceof RiotApiError && err.statusCode === 404) return null;
    throw err;
  }
}
