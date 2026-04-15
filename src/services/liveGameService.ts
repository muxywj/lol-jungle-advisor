import type { LiveGameViewModel, PlayerSummary } from "@/types/live-game";
import type { PlatformRegion } from "@/types/common";
import { PLATFORM_TO_ROUTING } from "@/lib/constants/regions";
import { getAccountByRiotId } from "@/lib/riot/account";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { getActiveGame } from "@/lib/riot/spectator";
import { getRecentMatches } from "@/lib/riot/match";
import { mapParticipant } from "@/lib/mappers/playerMapper";
import { RiotApiError } from "@/lib/riot/client";

export type LiveGameResult =
  | { type: "live"; data: LiveGameViewModel }
  | { type: "not_in_game" }
  | { type: "account_not_found" }
  | { type: "rate_limited" }
  | { type: "server_error"; message: string };

export async function getLiveGame(
  gameName: string,
  tagLine: string,
  platformRegion: PlatformRegion
): Promise<LiveGameResult> {
  const routingRegion = PLATFORM_TO_ROUTING[platformRegion];

  // 1. Riot ID → puuid
  let account;
  try {
    account = await getAccountByRiotId(gameName, tagLine, routingRegion);
  } catch (err) {
    if (err instanceof RiotApiError) {
      if (err.statusCode === 404) return { type: "account_not_found" };
      if (err.statusCode === 429) return { type: "rate_limited" };
    }
    return { type: "server_error", message: String(err) };
  }

  // 2. puuid → summonerId
  let summoner;
  try {
    summoner = await getSummonerByPuuid(account.puuid, platformRegion);
  } catch (err) {
    if (err instanceof RiotApiError && err.statusCode === 429)
      return { type: "rate_limited" };
    return { type: "server_error", message: String(err) };
  }

  // 3. summonerId → active game
  let activeGame;
  try {
    activeGame = await getActiveGame(summoner.puuid, platformRegion);
  } catch (err) {
    if (err instanceof RiotApiError && err.statusCode === 429)
      return { type: "rate_limited" };
    return { type: "server_error", message: String(err) };
  }

  if (!activeGame) return { type: "not_in_game" };

  // 4. Fetch recent matches for all 10 participants in parallel
  //    Limit to 3 matches per player to stay within rate limits
  const MATCH_COUNT_PER_PLAYER = 3;

  const participantMatchesSettled = await Promise.allSettled(
    activeGame.participants.map((p) =>
      getRecentMatches(p.puuid, routingRegion, MATCH_COUNT_PER_PLAYER)
    )
  );

  // 5. Map each participant to PlayerSummary
  const playerSummaries: PlayerSummary[] = await Promise.all(
    activeGame.participants.map(async (p, i) => {
      const result = participantMatchesSettled[i];
      const matches = result.status === "fulfilled" ? result.value : [];
      return mapParticipant(p, matches);
    })
  );

  // 6. Split into ally / enemy based on the searched summoner's teamId
  const searchedPlayer = playerSummaries.find(
    (p) => p.puuid === account.puuid
  );
  const myTeamId = searchedPlayer?.teamId ?? 100;

  const allyTeam = playerSummaries.filter((p) => p.teamId === myTeamId);
  const enemyTeam = playerSummaries.filter((p) => p.teamId !== myTeamId);

  return {
    type: "live",
    data: {
      gameId: activeGame.gameId,
      gameMode: activeGame.gameMode,
      gameQueueConfigId: activeGame.gameQueueConfigId,
      gameStartTime: activeGame.gameStartTime,
      allyTeam,
      enemyTeam,
    },
  };
}
