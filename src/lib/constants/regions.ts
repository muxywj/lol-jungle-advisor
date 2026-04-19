import type { PlatformRegion, RoutingRegion } from "@/types/common";

/** Display label shown in the region dropdown */
export const REGION_LABELS: Record<PlatformRegion, string> = {
  KR: "한국 (KR)",
  JP1: "일본 (JP)",
  NA1: "북미 (NA)",
  BR1: "브라질 (BR)",
  LA1: "라틴아메리카 북부 (LAN)",
  LA2: "라틴아메리카 남부 (LAS)",
  EUW1: "유럽 서부 (EUW)",
  EUN1: "유럽 북동부 (EUNE)",
  TR1: "터키 (TR)",
  RU: "러시아 (RU)",
  OC1: "오세아니아 (OCE)",
  SG2: "싱가포르 (SG)",
  TW2: "대만 (TW)",
  VN2: "베트남 (VN)",
  PH2: "필리핀 (PH)",
};

/** Platform region → routing region (account-v1, match-v5) */
export const PLATFORM_TO_ROUTING: Record<PlatformRegion, RoutingRegion> = {
  KR: "asia",
  JP1: "asia",
  NA1: "americas",
  BR1: "americas",
  LA1: "americas",
  LA2: "americas",
  EUW1: "europe",
  EUN1: "europe",
  TR1: "europe",
  RU: "europe",
  OC1: "sea",
  SG2: "sea",
  TW2: "sea",
  VN2: "sea",
  PH2: "sea",
};

/** Platform region → hostname used by Riot REST APIs */
export const PLATFORM_HOST: Record<PlatformRegion, string> = {
  KR: "kr.api.riotgames.com",
  JP1: "jp1.api.riotgames.com",
  NA1: "na1.api.riotgames.com",
  BR1: "br1.api.riotgames.com",
  LA1: "la1.api.riotgames.com",
  LA2: "la2.api.riotgames.com",
  EUW1: "euw1.api.riotgames.com",
  EUN1: "eun1.api.riotgames.com",
  TR1: "tr1.api.riotgames.com",
  RU: "ru.api.riotgames.com",
  OC1: "oc1.api.riotgames.com",
  SG2: "sg2.api.riotgames.com",
  TW2: "tw2.api.riotgames.com",
  VN2: "vn2.api.riotgames.com",
  PH2: "ph2.api.riotgames.com",
};

/** Routing region → hostname */
export const ROUTING_HOST: Record<RoutingRegion, string> = {
  asia: "asia.api.riotgames.com",
  americas: "americas.api.riotgames.com",
  europe: "europe.api.riotgames.com",
  sea: "sea.api.riotgames.com",
};

export const DEFAULT_REGION: PlatformRegion = "KR";
