export type ApiStatus =
  | "idle"
  | "loading"
  | "success"
  | "not_in_game"
  | "account_not_found"
  | "rate_limited"
  | "server_error"
  | "invalid_input";

export interface ApiError {
  status: Exclude<ApiStatus, "idle" | "loading" | "success">;
  message: string;
}

export interface SummonerSearchInput {
  gameName: string;
  tagLine: string;
  region: PlatformRegion;
}

/** Platform regions — used by summoner-v4, spectator-v5, mastery-v4 */
export type PlatformRegion =
  | "KR"
  | "JP1"
  | "NA1"
  | "BR1"
  | "LA1"
  | "LA2"
  | "EUW1"
  | "EUN1"
  | "TR1"
  | "RU"
  | "OC1"
  | "SG2"
  | "TW2"
  | "VN2"
  | "PH2";

/** Routing regions — used by account-v1, match-v5 */
export type RoutingRegion = "asia" | "americas" | "europe" | "sea";
