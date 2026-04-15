import { getChampionMap, getLatestVersion } from "@/lib/riot/ddragon";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

export async function mapChampion(championId: number): Promise<{
  name: string;
  iconUrl: string;
}> {
  const [map, version] = await Promise.all([
    getChampionMap(),
    getLatestVersion(),
  ]);
  const champ = map.get(championId);
  if (!champ) return { name: `Champion ${championId}`, iconUrl: "" };
  return {
    name: champ.name,
    iconUrl: `${DDRAGON_BASE}/cdn/${version}/img/champion/${champ.image.full}`,
  };
}
