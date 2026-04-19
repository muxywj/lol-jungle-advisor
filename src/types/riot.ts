// ──────────────────────────────────────────────
// account-v1
// ──────────────────────────────────────────────
export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

// ──────────────────────────────────────────────
// summoner-v4
// ──────────────────────────────────────────────
export interface Summoner {
  id: string;           // summonerId (encrypted)
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

// ──────────────────────────────────────────────
// spectator-v5
// ──────────────────────────────────────────────
export interface BannedChampion {
  pickTurn: number;
  championId: number;
  teamId: number;
}

export interface GameCustomizationObject {
  category: string;
  content: string;
}

export interface Perks {
  perkIds: number[];
  perkStyle: number;
  perkSubStyle: number;
}

export interface CurrentGameParticipant {
  puuid: string;
  teamId: number;
  championId: number;
  profileIconId: number;
  riotId: string;       // gameName#tagLine
  bot: boolean;
  summonerId: string;
  spell1Id: number;
  spell2Id: number;
  perks: Perks;
  gameCustomizationObjects: GameCustomizationObject[];
}

export interface ActiveGame {
  gameId: number;
  gameType: string;
  gameStartTime: number;
  mapId: number;
  gameLength: number;
  platformId: string;
  gameMode: string;
  gameQueueConfigId: number;
  participants: CurrentGameParticipant[];
  bannedChampions: BannedChampion[];
}

// ──────────────────────────────────────────────
// match-v5
// ──────────────────────────────────────────────
export interface MatchParticipant {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  teamId: number;
  teamPosition: string;        // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY
  individualPosition: string;
  lane: string;
  role: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  summoner1Id: number;
  summoner2Id: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  champLevel: number;
  goldEarned: number;
  timePlayed: number;
}

export interface MatchMetadata {
  matchId: string;
  participants: string[];   // puuid list
}

export interface MatchInfo {
  gameId: number;
  gameDuration: number;
  gameEndTimestamp: number;
  gameMode: string;
  gameType: string;
  queueId: number;
  mapId: number;
  participants: MatchParticipant[];
}

export interface Match {
  metadata: MatchMetadata;
  info: MatchInfo;
}

// ──────────────────────────────────────────────
// league-v4
// ──────────────────────────────────────────────
export interface LeagueEntry {
  queueType: string;       // "RANKED_SOLO_5x5" | "RANKED_FLEX_SR"
  tier: string;            // "IRON" | "BRONZE" | ... | "CHALLENGER"
  rank: string;            // "I" | "II" | "III" | "IV" (Master+ is empty)
  leaguePoints: number;
  wins: number;
  losses: number;
}

// ──────────────────────────────────────────────
// champion-mastery-v4
// ──────────────────────────────────────────────
export interface ChampionMastery {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
}

// ──────────────────────────────────────────────
// Data Dragon
// ──────────────────────────────────────────────
export interface DDChampion {
  id: string;     // "Ahri"
  key: string;    // "103"
  name: string;   // "아리"
  image: { full: string };
}

export interface DDragonChampionResponse {
  type: string;
  format: string;
  version: string;
  data: Record<string, DDChampion>;
}

export interface DDSpell {
  id: string;         // "SummonerFlash"
  key: string;        // "4"
  name: string;
  description: string;
  image: { full: string };
}

export interface DDragonSpellResponse {
  type: string;
  version: string;
  data: Record<string, DDSpell>;
}
