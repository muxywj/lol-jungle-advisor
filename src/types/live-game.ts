import type { RecentMatchSummary } from "./match";

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
  predictedRole: PredictedRole;
  recentMatches: RecentMatchSummary[];
  recentWins: number;
  recentLosses: number;
}

export interface LiveGameViewModel {
  gameId: number;
  gameMode: string;
  gameQueueConfigId: number;
  gameStartTime: number;
  allyTeam: PlayerSummary[];
  enemyTeam: PlayerSummary[];
}
