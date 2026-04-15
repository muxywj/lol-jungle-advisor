export interface RecentMatchSummary {
  matchId: string;
  championName: string;
  championIconUrl: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  queueType: string;
  gameDuration: number;   // seconds
  playedAt: number;       // epoch ms (gameEndTimestamp)
  teamPosition: string;   // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY | ""
}
