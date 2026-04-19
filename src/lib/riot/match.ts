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

// ── Global concurrency limiter for individual match fetches ─────────────────
// Application rate limit: 20 req/s, 100 req/2min (personal key, same as dev key).
// Total API calls per search: 33 + 10×MATCH_COUNT (matchIds + matches + ranked + mastery + etc.)
// MATCH_COUNT=6 → 93 calls/search, safely within 100/2min.
// MATCH_COUNT=7 → 103 calls/search, EXCEEDS limit — do not increase without caching layer.
// Concurrency 4 at ~300ms/call → peak ≈ 13 req/s, under 20/s cap.
let _activeMatchFetches = 0;
const _MAX_MATCH_CONCURRENT = 4;
const _matchQueue: Array<() => void> = [];

async function throttledGetMatch(id: string, routingRegion: RoutingRegion): Promise<Match> {
  if (_activeMatchFetches >= _MAX_MATCH_CONCURRENT) {
    await new Promise<void>((resolve) => _matchQueue.push(resolve));
  }
  _activeMatchFetches++;
  try {
    return await getMatch(id, routingRegion);
  } finally {
    _activeMatchFetches--;
    _matchQueue.shift()?.();
  }
}

/**
 * Fetch recent matches with a global concurrency cap so multiple callers
 * (10-player live game + searched player's recent-matches) don't burst past
 * the dev API key rate limit.
 * Failed individual matches are skipped — one 429 won't blank the whole player.
 */
export async function getRecentMatches(
  puuid: string,
  routingRegion: RoutingRegion,
  count = 5
): Promise<Match[]> {
  const ids = await getMatchIds(puuid, routingRegion, count);
  const settled = await Promise.allSettled(
    ids.map((id) => throttledGetMatch(id, routingRegion))
  );
  return settled
    .filter((r): r is PromiseFulfilledResult<Match> => r.status === "fulfilled")
    .map((r) => r.value);
}
