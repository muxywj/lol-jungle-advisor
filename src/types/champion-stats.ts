// ──────────────────────────────────────────────────────────────
// champion-stats.json 스키마 타입
// collect-stats.ts 스크립트가 생성, matchupScore.ts가 소비
// ──────────────────────────────────────────────────────────────

/** 단순 승/패 카운터 */
export interface WinRecord {
  wins: number;
  total: number;
  winRate: number; // wins / total, 0~1
}

/**
 * 챔피언 × 포지션 단위 통계
 * key: championId (string)
 * value: { [position: string]: WinRecord }
 * position: "TOP" | "MIDDLE" | "BOTTOM" | "UTILITY" | "JUNGLE"
 */
export type ByPosition = Record<string, Record<string, WinRecord>>;

/**
 * 1:1 매치업 통계
 * key: "{allyChampId}_{position}_vs_{enemyChampId}"
 *      예: "266_TOP_vs_54"  (아트록스 탑 vs 말파이트)
 * value: 아군 챔피언 기준 승/패 기록
 */
export type Matchups = Record<string, WinRecord>;

export interface ChampionStatsFile {
  _meta: {
    patch: string;       // 수집 당시 패치 (예: "14.24")
    region: string;      // 수집 지역 (예: "KR")
    totalMatches: number;
    generatedAt: string; // ISO 8601
  };
  byPosition: ByPosition;
  matchups: Matchups;
}
