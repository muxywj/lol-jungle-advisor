import type { ChampionStatsFile, WinRecord } from "@/types/champion-stats";
import rawStats from "../../../data/champion-stats.json";

const stats = rawStats as ChampionStatsFile;

/** 데이터가 신뢰할 수 있는 최소 포지션 플레이 수 */
const MIN_POSITION_PLAYS = 5;

/** 데이터가 신뢰할 수 있는 최소 게임 수 */
const MIN_GAMES = 20;

/**
 * 챔피언 × 포지션 기반 승률 조회.
 * MIN_GAMES 미만이면 null 반환.
 */
export function getPositionWinRate(
  championId: number,
  position: string  // "TOP" | "MIDDLE" | "BOTTOM" | "UTILITY" | "JUNGLE"
): WinRecord | null {
  const record = stats.byPosition[String(championId)]?.[position];
  if (!record || record.total < MIN_GAMES) return null;
  return record;
}

/**
 * 1:1 매치업 승률 조회.
 * key: "{allyChampId}_{position}_vs_{enemyChampId}"
 * MIN_GAMES 미만이면 null 반환.
 */
export function getMatchupWinRate(
  allyChampionId: number,
  position: string,
  enemyChampionId: number
): WinRecord | null {
  const key = `${allyChampionId}_${position}_vs_${enemyChampionId}`;
  const record = stats.matchups[key];
  if (!record || record.total < MIN_GAMES) return null;
  return record;
}

/**
 * 챔피언이 각 포지션에서 플레이된 비율 (0~1) 반환.
 * byPosition 데이터에서 동적으로 계산 — collect-stats 재실행 불필요.
 *
 * 반환 예시: { "UTILITY": 0.65, "MIDDLE": 0.35 }
 * 데이터 없거나 총 플레이 수 부족 시 null 반환 → 태그/mainPosition 폴백.
 */
export function getPositionRates(championId: number): Record<string, number> | null {
  const byPos = stats.byPosition[String(championId)];
  if (!byPos) return null;

  const totalPlays = Object.values(byPos).reduce((sum, r) => sum + r.total, 0);
  if (totalPlays < MIN_POSITION_PLAYS) return null;

  const rates: Record<string, number> = {};
  for (const [pos, record] of Object.entries(byPos)) {
    rates[pos] = record.total / totalPlays;
  }
  return rates;
}

/** 수집된 총 매치 수 — 데이터 품질 확인용 */
export function getTotalMatchCount(): number {
  return stats._meta.totalMatches;
}
