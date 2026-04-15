import type { Summoner } from "@/types/riot";
import type { PlatformRegion } from "@/types/common";
import { PLATFORM_HOST } from "@/lib/constants/regions";
import { riotFetch } from "./client";

/**
 * summoner-v4: puuid → Summoner (includes summonerId)
 * Uses platform region host (e.g. kr.api.riotgames.com)
 */
export async function getSummonerByPuuid(
  puuid: string,
  platformRegion: PlatformRegion
): Promise<Summoner> {
  const host = PLATFORM_HOST[platformRegion];
  const url = `https://${host}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return riotFetch<Summoner>(url);
}
