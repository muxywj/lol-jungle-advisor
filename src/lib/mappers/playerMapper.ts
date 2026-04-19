import type { CurrentGameParticipant, Match } from "@/types/riot";
import type { PlayerSummary, PredictedRole } from "@/types/live-game";
import type { RecentMatchSummary } from "@/types/match";
import { mapChampion } from "./championMapper";
import { mapSpell } from "./spellMapper";
import { getQueueLabel } from "@/lib/constants/queueTypes";
import { getChampionMap, getLatestVersion } from "@/lib/riot/ddragon";
import { getTagById } from "@/lib/data/championTags";
import { analyzePlayerDNA, calcRecentMomentum } from "@/lib/analysis/playerDNA";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

const POSITION_KO: Record<string, PredictedRole> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서폿",
};

/** 소환사 스펠 ID */
const SMITE_ID   = 11;
const EXHAUST_ID = 3;
const HEAL_ID    = 7;

/** 소환사 협곡 맵 ID — 칼바람·아레나 등 비SR 게임 제외용 */
const SUMMONERS_RIFT_MAP_ID = 11;

/** champion-tags.json mainPosition → PredictedRole */
const MAIN_POSITION_TO_ROLE: Record<string, PredictedRole> = {
  top: "탑",
  mid: "미드",
  adc: "원딜",
  support: "서폿",
  jungle: "정글",
};

/**
 * Infer role from summoner spells, recent match history, then champion mainPosition.
 *
 * Priority:
 *  1. Smite → 정글 (100% certain)
 *  2. Most frequent teamPosition in recent SR matches
 *  3. champion-tags.json mainPosition fallback (covers ARAM-only / new players)
 *  4. 추정불가
 */
function predictRole(
  spell1Id: number,
  spell2Id: number,
  championId: number,
  puuid: string,
  matches: Match[]
): PredictedRole {
  // 1. 강타가 있으면 정글 확정
  if (spell1Id === SMITE_ID || spell2Id === SMITE_ID) return "정글";

  // 1.5. 소환사 스펠 조합 기반 강력 신호
  //   - 탈진(3): 서포터 전용 스펠, 90%+ 서폿
  //   - 치유(7): 원딜 전용 스펠, 80%+ 원딜 (탈진 없을 때)
  const spells = new Set([spell1Id, spell2Id]);
  if (spells.has(EXHAUST_ID)) return "서폿";
  if (spells.has(HEAL_ID))    return "원딜";

  // 2. 현재 챔피언의 주 포지션 (인게임에서 가장 직접적인 신호)
  //    단, 정글 챔피언이 스마이트 없이 라인 서는 경우는 제외
  const tag = getTagById(championId);
  if (tag?.mainPosition && tag.mainPosition !== "jungle") {
    const role = MAIN_POSITION_TO_ROLE[tag.mainPosition];
    if (role) return role;
  }

  // 3. SR 최근 전적 기반 추정 (정글 포지션 제외 — 스마이트가 없으므로 이번 게임은 정글 아님)
  const counts: Partial<Record<string, number>> = {};
  const srMatches = matches.filter((m) => m.info.mapId === SUMMONERS_RIFT_MAP_ID);
  for (const match of srMatches) {
    const p = match.info.participants.find((p) => p.puuid === puuid);
    if (!p) continue;
    const pos = p.teamPosition || p.individualPosition;
    if (pos && pos !== "JUNGLE") counts[pos] = (counts[pos] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const topPos = sorted[0]?.[0];
  if (topPos && POSITION_KO[topPos]) return POSITION_KO[topPos];

  return "추정불가";
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
      championId: p.championId,
      championName: champ?.name || p.championName || `Champ ${p.championId}`,
      championIconUrl: iconUrl,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      queueId: match.info.queueId,
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
  const playerDna = analyzePlayerDNA(recentMatchSummaries, participant.championId);
  const momentum  = calcRecentMomentum(recentMatchSummaries);
  const predictedRole = predictRole(
    participant.spell1Id,
    participant.spell2Id,
    participant.championId,
    participant.puuid,
    recentMatches
  );

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
    assignedLane: null,    // liveGameService에서 덮어씀 (buildRoleMap)
    recentMatches: recentMatchSummaries,
    recentWins: wins,
    recentLosses: losses,
    rankedInfo: null,      // liveGameService에서 덮어씀
    roleConfidence: 0,     // liveGameService에서 덮어씀
    masteryData: null,     // liveGameService에서 덮어씀
    perks: participant.perks,
    playerDna,
    momentum,
  };
}
