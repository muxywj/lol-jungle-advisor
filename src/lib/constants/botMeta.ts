import botRules from "../../../data/bot-meta-rules.json";

export interface SpecialDuo {
  pair: [number, number];
  label: string;
}

export const NON_ADC_APC    = new Set<number>(botRules.nonAdcChampions.apc);
export const NON_ADC_BRUISER = new Set<number>(botRules.nonAdcChampions.bruiser);
export const NON_ADC_TANK   = new Set<number>(botRules.nonAdcChampions.tank);

export const NON_ADC_ALL = new Set<number>([
  ...botRules.nonAdcChampions.apc,
  ...botRules.nonAdcChampions.bruiser,
  ...botRules.nonAdcChampions.tank,
]);

export const SPECIAL_DUOS: SpecialDuo[] = botRules.specialDuos as SpecialDuo[];

export const SENNA_ID = botRules.sennaId;

export const SUPPORT_RUNES = botRules.supportRunes as {
  guardian:         number;
  glacialAugment:   number;
  aftershock:       number;
  resolvePath:      number;
  inspirationPath:  number;
};

export function getNonAdcLabel(championId: number): string | undefined {
  if (NON_ADC_APC.has(championId))     return "비원딜(APC)";
  if (NON_ADC_BRUISER.has(championId)) return "비원딜(브루저)";
  if (NON_ADC_TANK.has(championId))    return "비원딜(탱커)";
  return undefined;
}
