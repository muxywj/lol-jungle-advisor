import type { Match } from "@/types/riot";
import type { RoutingRegion } from "@/types/common";
import { ROUTING_HOST } from "@/lib/constants/regions";
import { riotFetch } from "./client";

/**
 * match-v5: puuid → list of matchIds
 */
export async function getMatchIds(
  puuid: string,
  routingRegion: RoutingRegion,
  count = 5
): Promise<string[]> {
  const host = ROUTING_HOST[routingRegion];
  const url = `https://${host}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?count=${count}`;
  return riotFetch<string[]>(url);
}

/**
 * match-v5: matchId → full Match object
 */
export async function getMatch(
  matchId: string,
  routingRegion: RoutingRegion
): Promise<Match> {
  const host = ROUTING_HOST[routingRegion];
  const url = `https://${host}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return riotFetch<Match>(url);
}

/**
 * Fetch multiple matches in parallel.
 * Keep count small (≤5) to stay within rate limits.
 */
export async function getRecentMatches(
  puuid: string,
  routingRegion: RoutingRegion,
  count = 5
): Promise<Match[]> {
  const ids = await getMatchIds(puuid, routingRegion, count);
  return Promise.all(ids.map((id) => getMatch(id, routingRegion)));
}
