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
): { score: number; keywords: string[] } {
  // Both unknown → neutral
  if (!ally && !enemy) return { score: 50, keywords: [] };

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
        statsAdjustment = Math.round((matchupStat.winRate - 0.5) * 30);
      } else {
        const positionStat = getPositionWinRate(ally.championId, position);
        if (positionStat) {
          statsAdjustment = Math.round((positionStat.winRate - 0.5) * 20);
        }
      }
    }
  }

  const score = Math.max(0, Math.min(100, tagScore + statsAdjustment));

  // ── 키워드 추출 (점수 근거 자연어화) ──────────────────────────
  const keywords: string[] = [];
  if (ally) {
    if (ally.ccLevel >= 4)        keywords.push("강력한 CC");
    if (ally.gankSetup >= 4)      keywords.push("높은 갱 호응");
    if (ally.earlyPower >= 4)     keywords.push("초반 주도권");
    if (ally.snowballValue >= 4)  keywords.push("킬 스노우볼 기대");
    if (ally.burst >= 4)          keywords.push("즉발 폭딜");
    if (ally.divePotential >= 4)  keywords.push("다이브 가능");
  }
  if (enemy) {
    if (enemy.laneStability <= 2)         keywords.push("적 라인 불안정");
    if (enemy.hardToRecoverWhenBehind)    keywords.push("적 회복 불가");
    if (enemy.safeWhenBehind)             keywords.push("적 회복력 높음");
    if (enemy.earlyPower >= 4)            keywords.push("적 초반 강세");
  }

  return { score, keywords };
}
