import type { RiotAccount } from "@/types/riot";
import type { RoutingRegion } from "@/types/common";
import { ROUTING_HOST } from "@/lib/constants/regions";
import { riotFetch } from "./client";

/**
 * account-v1: Riot ID → RiotAccount (includes puuid)
 * Uses routing region host (e.g. asia.api.riotgames.com)
 */
export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  routingRegion: RoutingRegion
): Promise<RiotAccount> {
  const host = ROUTING_HOST[routingRegion];
  const url = `https://${host}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(url);
}
