import type { PlayerSummary } from "@/types/live-game";
import type { LaneKey, LaneScoreBreakdown, V2ScoreResult } from "@/types/v2";
import { getTagById } from "@/lib/data/championTags";
import { calcLaneScore, assembleV2Result } from "./finalLineScore";

type Overrides = Record<string, LaneKey | null>;

function neutralLane(_lane: LaneKey): LaneScoreBreakdown {
  return {
    matchupScore: 50,
    allyMasteryScore: 50,
    enemyMasteryScore: 50,
    skillGapAdjustment: 0,
    spellAdjustment: 0,
    exceptionAdjustment: 0,
    finalScore: 50,
    keywords: ["라인 미식별"],
    allyChampionId: null,
    enemyChampionId: null,
    isNeutral: true,
  };
}

function effectiveLane(player: PlayerSummary, overrides: Overrides): LaneKey | null {
  return player.puuid in overrides ? overrides[player.puuid] : player.assignedLane;
}

export function recomputeV2Score(
  allyTeam: PlayerSummary[],
  enemyTeam: PlayerSummary[],
  allyOverrides: Overrides,
  enemyOverrides: Overrides
): V2ScoreResult {
  const lanes: LaneKey[] = ["top", "mid", "adc", "support"];

  // 같은 lane에 두 플레이어가 배치된 경우 첫 번째 플레이어를 우선함.
  // (buildRoleMap 정상 동작 시 발생하지 않으나 방어적으로 처리)
  const allyByLane = new Map<LaneKey, PlayerSummary>();
  for (const p of allyTeam) {
    const lane = effectiveLane(p, allyOverrides);
    if (lane !== null && !allyByLane.has(lane)) allyByLane.set(lane, p);
  }

  const enemyByLane = new Map<LaneKey, PlayerSummary>();
  for (const p of enemyTeam) {
    const lane = effectiveLane(p, enemyOverrides);
    if (lane !== null && !enemyByLane.has(lane)) enemyByLane.set(lane, p);
  }

  const laneScores = lanes.map((lane) => {
    const ally = allyByLane.get(lane);
    const enemy = enemyByLane.get(lane);

    if (!ally) return neutralLane(lane);

    return calcLaneScore(lane, {
      allyChampionId: ally.championId,
      enemyChampionId: enemy?.championId ?? null,
      allyTag: getTagById(ally.championId),
      enemyTag: enemy ? getTagById(enemy.championId) : undefined,
      allySpell1: ally.spell1Id,
      allySpell2: ally.spell2Id,
      enemySpell1: enemy?.spell1Id ?? 0,
      enemySpell2: enemy?.spell2Id ?? 0,
      allyMastery: ally.masteryData ?? null,
      enemyMastery: enemy?.masteryData ?? null,
      allyRecentMatches: ally.recentMatches,
      enemyRecentMatches: enemy?.recentMatches ?? [],
    });
  });

  return assembleV2Result(laneScores[0], laneScores[1], laneScores[2], laneScores[3]);
}
