import type { ChampionTag } from "@/types/v2";
import { getMatchupWinRate, getPositionWinRate } from "@/lib/data/championStats";

// LaneKey → Riot teamPosition 값
const LANE_TO_POSITION: Record<string, string> = {
  top: "TOP", mid: "MIDDLE", adc: "BOTTOM", support: "UTILITY",
};

/**
 * Compute a 0–100 matchup score for a single lane.
 * Higher score = more worthwhile for the jungler to invest in this lane.
 *
 * Ally side (1–5 scale):
 *   gankSetup, ccLevel, burst, divePotential, snowballValue → base receptiveness
 *   earlyPower → bonus when ally is strong early (gank synergy ↑)
 *   scaling    → penalty when ally scales late (early gank ROI ↓)
 *
 * Enemy side (1–5 scale):
 *   laneStability       → low = easier to gank
 *   safeWhenBehind      → reduces vulnerability
 *   hardToRecoverWhenBehind → increases vulnerability
 *   earlyPower          → high = can fight back → reduces vulnerability
 */
export function calcMatchupScore(
  ally: ChampionTag | undefined,
  enemy: ChampionTag | undefined,
  laneKey?: string   // 통계 조회용 (옵션 — 없으면 태그 기반만 사용)
): number {
  // Both unknown → neutral
  if (!ally && !enemy) return 50;

  // ── Ally receptiveness (1–5 scale) ───────────────────────────
  let allyValue: number;
  if (ally) {
    // Base: how well the ally utilises a gank
    const base =
      (ally.gankSetup * 2 +
        ally.ccLevel * 1.5 +
        ally.divePotential +
        ally.burst +
        ally.snowballValue * 1.5) /
      7;

    // earlyPower bonus: high earlyPower = ally can fight now → better gank ROI
    // scaling penalty: high scaling = ally is a late-game champion → lower early ROI
    // Formula keeps average champions (3/3) at 0 net adjustment.
    const earlyScalingAdjust =
      (ally.earlyPower - 3) * 0.3 - (ally.scaling - 3) * 0.15;

    allyValue = base + earlyScalingAdjust;
  } else {
    allyValue = 3;
  }

  // ── Enemy vulnerability (1–5 scale) ──────────────────────────
  let enemyVulnerability: number;
  if (enemy) {
    const instability = 6 - enemy.laneStability;          // low stability → high instability
    const safetyPenalty = enemy.safeWhenBehind ? 1.5 : 0;
    const collapseBonus = enemy.hardToRecoverWhenBehind ? 1 : 0;

    // High enemy earlyPower → they can fight back → harder to gank
    const fightbackReduction = (enemy.earlyPower - 3) * 0.2;

    enemyVulnerability =
      instability - safetyPenalty + collapseBonus - fightbackReduction;
    enemyVulnerability = Math.max(1, Math.min(5, enemyVulnerability));
  } else {
    enemyVulnerability = 3;
  }

  // ── Combine and normalise to 0–100 (tag-based) ───────────────
  allyValue = Math.max(1, Math.min(5, allyValue));
  const raw = allyValue * 0.55 + enemyVulnerability * 0.45; // ~1–5 range
  const tagScore = Math.round(((raw - 1) / 4) * 100);

  // ── 외부 통계 보정 ─────────────────────────────────────────────
  // 매치업 승률 → 최대 ±15pt / 포지션 승률 → 최대 ±10pt / 없으면 0
  let statsAdjustment = 0;

  if (laneKey && ally && enemy) {
    const position = LANE_TO_POSITION[laneKey];
    if (position) {
      const matchupStat = getMatchupWinRate(ally.championId, position, enemy.championId);
      if (matchupStat) {
        // 매치업 데이터가 있으면 우선 사용 (최대 ±15pt)
        statsAdjustment = Math.round((matchupStat.winRate - 0.5) * 30);
      } else {
        // 매치업 데이터 없으면 포지션 승률로 보조 보정 (최대 ±10pt)
        const positionStat = getPositionWinRate(ally.championId, position);
        if (positionStat) {
          statsAdjustment = Math.round((positionStat.winRate - 0.5) * 20);
        }
      }
    }
  }

  return Math.max(0, Math.min(100, tagScore + statsAdjustment));
}
