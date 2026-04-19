import type { ChampionTag } from "@/types/v2";
import rawData from "../../../data/champion-tags.json";

// champion-tags.json은 숫자 키 객체 형태 {"0":{...}, "1":{...}, ...}
const tags = Object.values(rawData) as unknown as ChampionTag[];

const byId = new Map<number, ChampionTag>(tags.map((c) => [c.championId, c]));

export function getTagById(championId: number): ChampionTag | undefined {
  return byId.get(championId);
}

export function getAllTags(): ChampionTag[] {
  return tags;
}
