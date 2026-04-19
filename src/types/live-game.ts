import type { RecentMatchSummary } from "./match";
import type { LaneKey, V2ScoreResult } from "./v2";
import type { ChampionMasteryEntry } from "@/lib/riot/mastery";
import type { Perks } from "./riot";
import type { PlayerDNA, RecentMomentum } from "@/lib/analysis/playerDNA";

export type { PlayerDNA, RecentMomentum };

export interface RankedInfo {
  tier: string;           // "IRON" | "BRONZE" | ... | "CHALLENGER"
  rank: string;           // "I" | "II" | "III" | "IV" (Master+ 는 빈 문자열)
  leaguePoints: number;
  wins: number;
  losses: number;
}

export type PredictedRole =
  | "탑"
  | "정글"
  | "미드"
  | "원딜"
  | "서폿"
  | "추정불가";

export interface PlayerSummary {
  puuid: string;
  riotId: string;           // gameName#tagLine
  summonerId: string;
  championId: number;
  championName: string;
  championIconUrl: string;
  spell1Id: number;
  spell1Name: string;
  spell1IconUrl: string;
  spell2Id: number;
  spell2Name: string;
  spell2IconUrl: string;
  teamId: number;
  predictedRole: PredictedRole;  // 개인 추론용 (내부 로깅)
  assignedLane: LaneKey | null;  // buildRoleMap 팀 최적화 배정 결과 (null = 정글)
  recentMatches: RecentMatchSummary[];
  recentWins: number;
  recentLosses: number;
  rankedInfo: RankedInfo | null;   // null = 언랭
  roleConfidence: number;          // assignedLane 배정 신뢰도 0~1 (buildRoleMap에서 산출)
  masteryData: ChampionMasteryEntry | null; // 현재 픽 챔피언 마스터리 (클라이언트 재점수용)
  perks?: Perks;                            // 인게임 룬 데이터 (포지션 추정 보조 신호)
  playerDna: PlayerDNA;                     // 최근 전적 기반 포지션 빈도 분포
  momentum: RecentMomentum;                 // 최근 10판 기세 점수
  nonAdcLabel?: string;                     // 비원딜/특수 조합 키워드 (botDuoMatcher에서 주입)
}

export interface LiveGameViewModel {
  gameId: number;
  gameMode: string;
  gameQueueConfigId: number;
  gameStartTime: number;
  allyTeam: PlayerSummary[];
  enemyTeam: PlayerSummary[];
  v2Score: V2ScoreResult | null;
}
