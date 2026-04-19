import type { RecentMatchSummary } from "@/types/match";
import type { RoutingRegion } from "@/types/common";
import { getRecentMatches } from "@/lib/riot/match";
import { mapRecentMatches } from "@/lib/mappers/playerMapper";

export async function fetchRecentMatchSummaries(
  puuid: string,
  routingRegion: RoutingRegion,
  count = 5
): Promise<RecentMatchSummary[]> {
  const matches = await getRecentMatches(puuid, routingRegion, count);
  return mapRecentMatches(puuid, matches);
}
