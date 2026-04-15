import type { CurrentGameParticipant, Match } from "@/types/riot";
import type { PlayerSummary, PredictedRole } from "@/types/live-game";
import type { RecentMatchSummary } from "@/types/match";
import { mapChampion } from "./championMapper";
import { mapSpell } from "./spellMapper";
import { getQueueLabel } from "@/lib/constants/queueTypes";
import { getChampionMap, getLatestVersion } from "@/lib/riot/ddragon";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

const POSITION_KO: Record<string, PredictedRole> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서폿",
};

/**
 * Infer role from recent match history.
 * Uses the most frequent teamPosition across provided matches for this puuid.
 */
function predictRoleFromMatches(
  puuid: string,
  matches: Match[]
): PredictedRole {
  const counts: Partial<Record<string, number>> = {};
  for (const match of matches) {
    const p = match.info.participants.find((p) => p.puuid === puuid);
    if (!p) continue;
    const pos = p.teamPosition || p.individualPosition;
    if (pos) counts[pos] = (counts[pos] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const top = sorted[0]?.[0];
  return (top ? POSITION_KO[top] : undefined) ?? "추정불가";
}

export async function mapRecentMatches(
  puuid: string,
  matches: Match[]
): Promise<RecentMatchSummary[]> {
  const [champMap, version] = await Promise.all([
    getChampionMap(),
    getLatestVersion(),
  ]);

  return matches.map((match) => {
    const p = match.info.participants.find((p) => p.puuid === puuid)!;
    const champ = champMap.get(p.championId);
    const iconUrl = champ
      ? `${DDRAGON_BASE}/cdn/${version}/img/champion/${champ.image.full}`
      : "";
    return {
      matchId: match.metadata.matchId,
      championName: p.championName || champ?.name || `Champ ${p.championId}`,
      championIconUrl: iconUrl,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      queueType: getQueueLabel(match.info.queueId),
      gameDuration: match.info.gameDuration,
      playedAt: match.info.gameEndTimestamp,
      teamPosition: p.teamPosition,
    };
  });
}

export async function mapParticipant(
  participant: CurrentGameParticipant,
  recentMatches: Match[]
): Promise<PlayerSummary> {
  const [champ, spell1, spell2] = await Promise.all([
    mapChampion(participant.championId),
    mapSpell(participant.spell1Id),
    mapSpell(participant.spell2Id),
  ]);

  const recentMatchSummaries = await mapRecentMatches(
    participant.puuid,
    recentMatches
  );

  const wins = recentMatchSummaries.filter((m) => m.win).length;
  const losses = recentMatchSummaries.length - wins;
  const predictedRole = predictRoleFromMatches(participant.puuid, recentMatches);

  return {
    puuid: participant.puuid,
    riotId: participant.riotId,
    summonerId: participant.summonerId,
    championId: participant.championId,
    championName: champ.name,
    championIconUrl: champ.iconUrl,
    spell1Id: participant.spell1Id,
    spell1Name: spell1.name,
    spell1IconUrl: spell1.iconUrl,
    spell2Id: participant.spell2Id,
    spell2Name: spell2.name,
    spell2IconUrl: spell2.iconUrl,
    teamId: participant.teamId,
    predictedRole,
    recentMatches: recentMatchSummaries,
    recentWins: wins,
    recentLosses: losses,
  };
}
