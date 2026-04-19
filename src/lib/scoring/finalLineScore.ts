import type { LaneKey, LaneScoreBreakdown, V2ScoreResult } from "@/types/v2";
import type { ChampionTag } from "@/types/v2";
import type { RecentMatchSummary } from "@/types/match";
import type { ChampionMasteryEntry } from "@/lib/riot/mastery";
import { calcMatchupScore } from "./matchupScore";
import { calcMasteryScore } from "./masteryScore";
import spellRules from "../../../data/spell-rules.json";
import exceptionRules from "../../../data/exception-rules.json";

// ── Types for rule JSON shapes ────────────────────────────────

interface SpellCondition {
  ally_has?: number;
  ally_missing?: number;
  enemy_has?: number;
  enemy_tag?: keyof ChampionTag;
}

interface SpellRule {
  id: string;
  appliesTo: string | string[];
  condition: SpellCondition;
  adjustment: number;
  keyword: string;
}

interface ExceptionCondition {
  enemy_tag?: keyof ChampionTag;
  ally_tag?: keyof ChampionTag;
  ally_roaming_gte?: number;
  ally_gankSetup_gte?: number;
  ally_gankSetup_lte?: number;
  ally_ccLevel_gte?: number;
  ally_divePotential_gte?: number;
}

interface ExceptionRule {
  id: string;
  appliesTo: string | string[];
  condition: ExceptionCondition;
  adjustment: number;
  keyword: string;
}

// Lane key → Korean label used in rule "appliesTo" arrays
const LANE_KO: Record<LaneKey, string> = {
  top: "탑",
  mid: "미드",
  adc: "원딜",
  support: "서폿",
};

function appliesToLane(rule: { appliesTo: string | string[] }, lane: LaneKey): boolean {
  if (rule.appliesTo === "all") return true;
  if (Array.isArray(rule.appliesTo)) return rule.appliesTo.includes(LANE_KO[lane]);
  return false;
}

// ── Spell adjustment ──────────────────────────────────────────

function calcSpellAdjustment(
  lane: LaneKey,
  allySpell1: number,
  allySpell2: number,
  enemySpell1: number,
  enemySpell2: number,
  _allyTag: ChampionTag | undefined,
  enemyTag: ChampionTag | undefined
): { total: number; keywords: string[] } {
  const allySpells = new Set([allySpell1, allySpell2]);
  const enemySpells = new Set([enemySpell1, enemySpell2]);

  let total = 0;
  const keywords: string[] = [];

  for (const rule of spellRules.rules as SpellRule[]) {
    if (!appliesToLane(rule, lane)) continue;

    const c = rule.condition;
    let match = true;

    if (c.ally_has !== undefined && !allySpells.has(c.ally_has)) match = false;
    if (c.ally_missing !== undefined && allySpells.has(c.ally_missing)) match = false;
    if (c.enemy_has !== undefined && !enemySpells.has(c.enemy_has)) match = false;
    if (c.enemy_tag !== undefined) {
      if (!enemyTag || !enemyTag[c.enemy_tag]) match = false;
    }

    if (match) {
      total += rule.adjustment;
      keywords.push(rule.keyword);
    }
  }

  return { total, keywords };
}

// ── Exception adjustment ──────────────────────────────────────

function calcExceptionAdjustment(
  lane: LaneKey,
  allyTag: ChampionTag | undefined,
  enemyTag: ChampionTag | undefined
): { total: number; keywords: string[] } {
  let total = 0;
  const keywords: string[] = [];

  for (const rule of exceptionRules.rules as ExceptionRule[]) {
    if (!appliesToLane(rule, lane)) continue;

    const c = rule.condition;
    let match = true;

    if (c.enemy_tag !== undefined) {
      if (!enemyTag || !enemyTag[c.enemy_tag]) match = false;
    }
    if (c.ally_tag !== undefined) {
      if (!allyTag || !allyTag[c.ally_tag]) match = false;
    }
    if (c.ally_roaming_gte !== undefined) {
      if (!allyTag || allyTag.roaming < c.ally_roaming_gte) match = false;
    }
    if (c.ally_gankSetup_gte !== undefined) {
      if (!allyTag || allyTag.gankSetup < c.ally_gankSetup_gte) match = false;
    }
    if (c.ally_gankSetup_lte !== undefined) {
      if (!allyTag || allyTag.gankSetup > c.ally_gankSetup_lte) match = false;
    }
    if (c.ally_ccLevel_gte !== undefined) {
      if (!allyTag || allyTag.ccLevel < c.ally_ccLevel_gte) match = false;
    }
    if (c.ally_divePotential_gte !== undefined) {
      if (!allyTag || allyTag.divePotential < c.ally_divePotential_gte) match = false;
    }

    if (match) {
      total += rule.adjustment;
      keywords.push(rule.keyword);
    }
  }

  return { total, keywords };
}

// ── Per-lane input ────────────────────────────────────────────

export interface LaneScoreInput {
  allyChampionId: number | null;
  enemyChampionId: number | null;
  allyTag: ChampionTag | undefined;
  enemyTag: ChampionTag | undefined;
  allySpell1: number;
  allySpell2: number;
  enemySpell1: number;
  enemySpell2: number;
  allyMastery: ChampionMasteryEntry | null;
  enemyMastery: ChampionMasteryEntry | null;
  allyRecentMatches: RecentMatchSummary[];
  enemyRecentMatches: RecentMatchSummary[];
  /** calcRecentMomentum().momentumScore (0~100). 없으면 중립(50) 사용 */
  allyMomentumScore?: number;
  enemyMomentumScore?: number;
  /** 최근 10판 70%+ 승률 — masteryScore에 +10pt */
  allyIsHotStreak?: boolean;
  /** 최근 3연패 이상 — masteryScore에 -5pt */
  allyIsOnTilt?: boolean;
  /** 비원딜/특수 조합 등 외부에서 주입하는 추가 키워드 */
  allyKeywordsExtra?: string[];
}

// ── Single-lane scorer ────────────────────────────────────────

/** 비율 기반 실력 차이 보정 최대치 (±pt) */
const MAX_SKILL_GAP = 20;

export function calcLaneScore(
  lane: LaneKey,
  input: LaneScoreInput
): LaneScoreBreakdown {
  const matchupScore = calcMatchupScore(input.allyTag, input.enemyTag, lane);

  const allyMasteryResult = calcMasteryScore(
    input.allyMastery,
    input.allyChampionId ?? 0,
    input.allyRecentMatches,
    lane,
    input.allyMomentumScore
  );

  const enemyMasteryResult = calcMasteryScore(
    input.enemyMastery,
    input.enemyChampionId ?? 0,
    input.enemyRecentMatches,
    lane,
    input.enemyMomentumScore
  );

  // 연승 보너스 / 연패 페널티 (masteryScore 기반 최종 점수에 직접 반영)
  let allyBaseScore = allyMasteryResult.score;
  if (input.allyIsHotStreak) allyBaseScore = Math.min(100, allyBaseScore + 10);
  if (input.allyIsOnTilt)    allyBaseScore = Math.max(0,   allyBaseScore - 5);

  const allyScore = allyBaseScore;
  const enemyScore = enemyMasteryResult.score;

  const matchupDev = matchupScore - 50;  // [-50, +50]
  const allyDev    = allyScore    - 50;  // [-50, +50]

  // ── 아군 실력의 독립 기여 (±15pt) ──────────────────────────────
  // allyScore를 base에서 분리: matchup과 단순 합산하지 않고 독립 보정으로 처리
  const allySkillAdj = Math.round(allyDev * 0.3);

  // ── 상호작용 항: 합산 방식 (±10pt) ────────────────────────────
  // 곱연산 → 음수×음수=양수 역설 해결
  // 합산 방식: 둘 다 좋으면 양수, 둘 다 나쁘면 음수, 어긋나면 중립(0에 수렴)
  const MAX_INTERACTION = 10;
  const interactionAdj = Math.max(
    -MAX_INTERACTION,
    Math.min(MAX_INTERACTION, Math.round((matchupDev + allyDev) / 10))
  );

  // ── Base: 상성을 메인 드라이버로 ────────────────────────────────
  // 기존: matchup×0.4 + ally×0.6 → ally 과대 기여
  // 신규: matchup 주도, ally는 독립 보정 + 시너지 항으로만 영향
  const base = matchupScore + allySkillAdj + interactionAdj;

  // ── 실력 차이 보정 (비율 기반, ±20pt) ─────────────────────────
  const total = allyScore + enemyScore;
  const ratio = total > 0 ? allyScore / total : 0.5;
  let skillGapAdjustment = Math.round((ratio - 0.5) * 2 * MAX_SKILL_GAP);

  // 한쪽이 데이터 없는 경우(sampleSize=0) 보정치를 절반으로 감쇄
  if (allyMasteryResult.sampleSize === 0 || enemyMasteryResult.sampleSize === 0) {
    skillGapAdjustment = Math.round(skillGapAdjustment * 0.5);
  }

  const spell = calcSpellAdjustment(
    lane,
    input.allySpell1,
    input.allySpell2,
    input.enemySpell1,
    input.enemySpell2,
    input.allyTag,
    input.enemyTag
  );

  const exception = calcExceptionAdjustment(lane, input.allyTag, input.enemyTag);

  // 실력 차이 키워드
  const skillKeywords: string[] = [];
  if (skillGapAdjustment >= 10) skillKeywords.push("실력 우세");
  else if (skillGapAdjustment <= -10) skillKeywords.push("실력 열세");

  // clamp 없음 — assembleV2Result에서 4개 라인을 동시에 정규화한 뒤 일괄 clamp
  const finalScore = Math.round(base + skillGapAdjustment + spell.total + exception.total);

  return {
    matchupScore: Math.round(matchupScore),
    allyMasteryScore: Math.round(allyScore),
    enemyMasteryScore: Math.round(enemyScore),
    skillGapAdjustment,
    spellAdjustment: spell.total,
    exceptionAdjustment: exception.total,
    finalScore,
    keywords: [
      ...skillKeywords,
      ...spell.keywords,
      ...exception.keywords,
      ...(input.allyKeywordsExtra ?? []),
    ],
    allyChampionId: input.allyChampionId,
    enemyChampionId: input.enemyChampionId,
  };
}

// ── Priority ordering ─────────────────────────────────────────

// Meta weight used as tiebreaker (higher = prefer when scores are close)
const META_WEIGHT: Record<LaneKey, number> = {
  mid: 4,
  support: 3,
  adc: 2,
  top: 1,
};

function derivePriorities(scores: Record<LaneKey, LaneScoreBreakdown>): {
  first: LaneKey;
  second: LaneKey;
} {
  const lanes: LaneKey[] = ["top", "mid", "adc", "support"];
  const sorted = [...lanes].sort((a, b) => {
    const diff = scores[b].finalScore - scores[a].finalScore;
    if (diff !== 0) return diff;
    return META_WEIGHT[b] - META_WEIGHT[a]; // tiebreak by meta
  });
  return { first: sorted[0], second: sorted[1] };
}

// ── Full V2 result assembler ──────────────────────────────────

export function assembleV2Result(
  top: LaneScoreBreakdown,
  mid: LaneScoreBreakdown,
  adc: LaneScoreBreakdown,
  support: LaneScoreBreakdown
): V2ScoreResult {
  const lanes: LaneKey[] = ["top", "mid", "adc", "support"];
  const raw = { top, mid, adc, support };

  // ── Cross-lane normalization ──────────────────────────────────
  // 가장 높은 점수를 100으로 스케일 후 음수 clamp(0)
  const rawMax = Math.max(...lanes.map((l) => raw[l].finalScore));
  const scale = rawMax > 100 ? 100 / rawMax : 1;

  const normalized = { ...raw };
  for (const lane of lanes) {
    normalized[lane] = {
      ...raw[lane],
      finalScore: Math.max(0, Math.round(raw[lane].finalScore * scale)),
    };
  }

  const { first, second } = derivePriorities(normalized);
  return { ...normalized, firstPriority: first, secondPriority: second };
}
