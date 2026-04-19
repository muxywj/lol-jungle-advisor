import { getSpellMap, getLatestVersion } from "@/lib/riot/ddragon";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

export async function mapSpell(spellId: number): Promise<{
  name: string;
  iconUrl: string;
}> {
  const [map, version] = await Promise.all([
    getSpellMap(),
    getLatestVersion(),
  ]);
  const spell = map.get(spellId);
  if (!spell) return { name: `Spell ${spellId}`, iconUrl: "" };
  return {
    name: spell.name,
    iconUrl: `${DDRAGON_BASE}/cdn/${version}/img/spell/${spell.image.full}`,
  };
}
