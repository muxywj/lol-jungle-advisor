// ──────────────────────────────────────────────
// V2 Champion Tag DB types
// ──────────────────────────────────────────────
export interface ChampionTag {
  championId: number;
  championName: string;
  mainPosition: string;
  damageType: "AD" | "AP" | "Mixed";
  rangeType: "Melee" | "Ranged";
  roleGroup: "암살자" | "전사" | "메이지" | "탱커" | "원딜" | "서포터";

  // 라인전 특성 (1=매우 낮음, 3=평균, 5=매우 높음)
  earlyPower: number;
  scaling: number;
  pushPower: number;
  roaming: number;
  laneStability: number;
  recoveryPower: number;

  // 정글 개입 특성
  gankSetup: number;
  ccLevel: number;
  burst: number;
  divePotential: number;
  skirmishPower: number;
  snowballValue: number;

  // 포지션별 확률 가중치 (합 = 1.0)
  // flex pick 챔피언에만 설정. 없으면 mainPosition: 0.9 으로 간주.
  positions?: Record<string, number>;

  // 예외 규칙용 불리언 특성
  safeWhenBehind: boolean;
  hardToRecoverWhenBehind: boolean;
  igniteSensitive: boolean;
  valuableWhenFed: boolean;
}

// ──────────────────────────────────────────────
// V2 Score types
// ──────────────────────────────────────────────
export interface LaneScoreBreakdown {
  matchupScore: number;
  allyMasteryScore: number;
  enemyMasteryScore: number;
  skillGapAdjustment: number;  // 비율 기반 실력 차이 보정 (±20pt)
  spellAdjustment: number;
  exceptionAdjustment: number;
  finalScore: number;
  keywords: string[];
  allyChampionId: number | null;
  enemyChampionId: number | null;
  isNeutral?: boolean;  // 라인 미식별 시 true (neutralLane fallback)
}

export type LaneKey = "top" | "mid" | "adc" | "support";

export interface V2ScoreResult {
  top: LaneScoreBreakdown;
  mid: LaneScoreBreakdown;
  adc: LaneScoreBreakdown;
  support: LaneScoreBreakdown;
  firstPriority: LaneKey;
  secondPriority: LaneKey;
}
