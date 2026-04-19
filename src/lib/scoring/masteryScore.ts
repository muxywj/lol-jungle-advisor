import type { LaneKey } from "@/types/v2";
import type { RecentMatchSummary } from "@/types/match";
import type { ChampionMasteryEntry } from "@/lib/riot/mastery";
import { isRankedQueue, isSrNormalQueue } from "@/lib/constants/queueTypes";

/** LaneKey → match-v5 teamPosition 값 매핑 */
const LANE_TO_POSITION: Record<LaneKey, string> = {
  top: "TOP",
  mid: "MIDDLE",
  adc: "BOTTOM",
  support: "UTILITY",
};

/**
 * 베이즈 수축 강도.
 * 샘플이 이 값과 같을 때 observed와 neutral이 50:50으로 반영됨.
 * 값이 클수록 더 많은 게임이 쌓여야 결과를 신뢰.
 */
const PRIOR_STRENGTH = 5;

/** 성과 파트(0–50)의 중립값: 승률 50% + 평균 KDA 3 기준 */
const NEUTRAL_PERFORMANCE = 25;

export interface MasteryResult {
  score: number;       // 0–100 최종 점수
  sampleSize: number;  // 계산에 사용된 경기 수 (0 = 데이터 없음)
}

/**
 * Compute a 0–100 mastery score for a single laner.
 * Higher = player is more skilled with their current champion in this lane.
 *
 * Components:
 *  1. Champion mastery points → 0–50 (항상 신뢰)
 *  2. Recent SR performance (win-rate + KDA) → 0–50
 *     - 베이즈 수축: 샘플이 적을수록 중립(25)에 가깝게 보정
 *
 * Sample priority:
 *  1. Ranked (420/440) — 포지션 + 챔피언 → 포지션 → 전체
 *  2. SR normal (400/430/490/700) — 같은 폴백 체인
 *  3. 데이터 없음 → { score: 50, sampleSize: 0 }
 */
/**
 * momentumScore: calcRecentMomentum().momentumScore (0~100).
 * 최종 점수에 40% 가중으로 반영. 없으면 중립(50) 사용.
 */
export function calcMasteryScore(
  mastery: ChampionMasteryEntry | null,
  championId: number,
  recentMatches: RecentMatchSummary[],
  laneKey: LaneKey,
  momentumScore?: number
): MasteryResult {
  // ── 1. Mastery points (0–50) ─────────────────────────────────
  const points = mastery?.championPoints ?? 0;
  let masteryPart: number;
  if (points >= 500_000) masteryPart = 50;
  else if (points >= 300_000) masteryPart = 44;
  else if (points >= 150_000) masteryPart = 38;
  else if (points >= 75_000) masteryPart = 30;
  else if (points >= 30_000) masteryPart = 22;
  else if (points >= 10_000) masteryPart = 14;
  else masteryPart = 6;

  // ── 2. Recent performance (0–50) ─────────────────────────────
  const rankedMatches = recentMatches.filter((m) => isRankedQueue(m.queueId));
  const normalMatches = recentMatches.filter((m) => isSrNormalQueue(m.queueId));

  // 랭크전 우선, 없으면 SR 일반게임으로 폴백, 둘 다 없으면 neutral 반환
  const srMatches = rankedMatches.length > 0 ? rankedMatches : normalMatches;
  if (srMatches.length === 0) return { score: 50, sampleSize: 0 };

  // 해당 포지션 → 전체 순으로 폴백
  const expectedPosition = LANE_TO_POSITION[laneKey];
  const positionMatches = srMatches.filter(
    (m) => m.teamPosition === expectedPosition
  );
  const pool = positionMatches.length > 0 ? positionMatches : srMatches;

  // 해당 챔피언 게임 → 포지션 전체 순으로 폴백
  const champMatches = pool.filter((m) => m.championId === championId);
  const sample = champMatches.length > 0 ? champMatches : pool;

  // Win-rate contributes 0–30
  const wins = sample.filter((m) => m.win).length;
  const winRate = wins / sample.length;
  const winPart = Math.round(winRate * 30);

  // KDA contributes 0–20 (capped at KDA 6 per game)
  const totalKda = sample.reduce((sum, m) => {
    const kda =
      m.deaths === 0
        ? m.kills + m.assists
        : (m.kills + m.assists) / m.deaths;
    return sum + Math.min(kda, 6);
  }, 0);
  const avgKda = totalKda / sample.length;
  const kdaPart = Math.round((avgKda / 6) * 20);

  const rawPerformancePart = winPart + kdaPart; // 0–50

  // ── 베이즈 수축: 샘플이 적을수록 중립값(25)으로 수렴 ──────────
  // sampleWeight = n / (n + PRIOR_STRENGTH)
  //   n=1 → 0.17, n=3 → 0.38, n=5 → 0.5, n=10 → 0.67
  const sampleWeight = sample.length / (sample.length + PRIOR_STRENGTH);
  const performancePart = Math.round(
    NEUTRAL_PERFORMANCE + sampleWeight * (rawPerformancePart - NEUTRAL_PERFORMANCE)
  );

  const baseScore = Math.max(0, Math.min(100, masteryPart + performancePart));

  // 모멘텀 40% 반영: 기존 점수 60% + 최근 10판 기세 점수 40%
  // 데이터 없으면 중립(50)으로 처리
  const mScore = momentumScore ?? 50;
  const finalScore = Math.round(baseScore * 0.6 + mScore * 0.4);

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    sampleSize: sample.length,
  };
}
