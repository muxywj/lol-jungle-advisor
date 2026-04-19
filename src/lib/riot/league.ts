import type { LeagueEntry } from "@/types/riot";
import type { PlatformRegion } from "@/types/common";
import { PLATFORM_HOST } from "@/lib/constants/regions";
import { riotFetch, RiotApiError } from "./client";

/**
 * league-v4: puuid → ranked entries (solo + flex)
 * summonerId 대신 puuid 사용 — spectator v5는 summonerId가 빈 값으로 오는 경우가 있음.
 * Returns [] when summoner is unranked or not found.
 */
export async function getRankedEntries(
  puuid: string,
  platformRegion: PlatformRegion
): Promise<LeagueEntry[]> {
  const host = PLATFORM_HOST[platformRegion];
  const url = `https://${host}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  try {
    return await riotFetch<LeagueEntry[]>(url);
  } catch (err) {
    if (err instanceof RiotApiError && err.statusCode === 404) return [];
    throw err;
  }
}
