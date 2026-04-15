import type {
  DDChampion,
  DDSpell,
  DDragonChampionResponse,
  DDragonSpellResponse,
} from "@/types/riot";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

// ── Version ──────────────────────────────────────────────────────
let cachedVersion: string | null = null;

export async function getLatestVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  const res = await fetch(`${DDRAGON_BASE}/api/versions.json`, {
    next: { revalidate: 3600 }, // cache for 1 hour
  });
  const versions: string[] = await res.json();
  cachedVersion = versions[0];
  return cachedVersion;
}

// ── Champions ─────────────────────────────────────────────────────
/** championId (number) → DDChampion */
let cachedChampMap: Map<number, DDChampion> | null = null;

export async function getChampionMap(): Promise<Map<number, DDChampion>> {
  if (cachedChampMap) return cachedChampMap;
  const version = await getLatestVersion();
  const res = await fetch(
    `${DDRAGON_BASE}/cdn/${version}/data/ko_KR/champion.json`,
    { next: { revalidate: 3600 } }
  );
  const json: DDragonChampionResponse = await res.json();
  const map = new Map<number, DDChampion>();
  for (const champ of Object.values(json.data)) {
    map.set(Number(champ.key), champ);
  }
  cachedChampMap = map;
  return map;
}

export async function getChampionIconUrl(
  championId: number
): Promise<string> {
  const version = await getLatestVersion();
  const map = await getChampionMap();
  const champ = map.get(championId);
  if (!champ) return "";
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${champ.image.full}`;
}

// ── Spells ────────────────────────────────────────────────────────
/** spellId (number) → DDSpell */
let cachedSpellMap: Map<number, DDSpell> | null = null;

export async function getSpellMap(): Promise<Map<number, DDSpell>> {
  if (cachedSpellMap) return cachedSpellMap;
  const version = await getLatestVersion();
  const res = await fetch(
    `${DDRAGON_BASE}/cdn/${version}/data/ko_KR/summoner.json`,
    { next: { revalidate: 3600 } }
  );
  const json: DDragonSpellResponse = await res.json();
  const map = new Map<number, DDSpell>();
  for (const spell of Object.values(json.data)) {
    map.set(Number(spell.key), spell);
  }
  cachedSpellMap = map;
  return map;
}

export async function getSpellIconUrl(spellId: number): Promise<string> {
  const version = await getLatestVersion();
  const map = await getSpellMap();
  const spell = map.get(spellId);
  if (!spell) return "";
  return `${DDRAGON_BASE}/cdn/${version}/img/spell/${spell.image.full}`;
}
