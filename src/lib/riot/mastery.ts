import type { PlatformRegion } from "@/types/common";
import { PLATFORM_HOST } from "@/lib/constants/regions";
import { riotFetch, RiotApiError } from "./client";

export interface ChampionMasteryEntry {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  markRequiredForNextLevel: number;
  tokensEarned: number;
  summonerId: string;
}

/**
 * champion-mastery-v4: puuid + championId → single mastery entry.
 * Returns null if the summoner has no mastery on that champion.
 */
export async function getMasteryByChampion(
  puuid: string,
  championId: number,
  platformRegion: PlatformRegion
): Promise<ChampionMasteryEntry | null> {
  const host = PLATFORM_HOST[platformRegion];
  const url = `https://${host}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/by-champion/${championId}`;
  try {
    return await riotFetch<ChampionMasteryEntry>(url);
  } catch (err) {
    // 404 → no mastery yet; any other error → treat as missing
    if (err instanceof RiotApiError && err.statusCode === 404) return null;
    return null;
  }
}
