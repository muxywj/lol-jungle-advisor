import type { PlayerSummary } from "@/types/live-game";
import { getTagById } from "@/lib/data/championTags";
import botRules from "../../../data/bot-meta-rules.json";

// ── 소환사 스펠 ID ─────────────────────────────────────────────
const EXHAUST_ID = 3;
const IGNITE_ID  = 14;

// ── bot-meta-rules.json 파싱 ───────────────────────────────────
const NON_ADC_SET = new Set<number>([
  ...botRules.nonAdcChampions.apc,
  ...botRules.nonAdcChampions.bruiser,
  ...botRules.nonAdcChampions.tank,
]);

const SENNA_ID = botRules.sennaId;

function getNonAdcLabel(championId: number): string | undefined {
  if (botRules.nonAdcChampions.apc.includes(championId))     return "비원딜(APC)";
  if (botRules.nonAdcChampions.bruiser.includes(championId)) return "비원딜(브루저)";
  if (botRules.nonAdcChampions.tank.includes(championId))    return "비원딜(탱커)";
  return undefined;
}

// ── 서포터 닻(Anchor) 점수 산출 ────────────────────────────────

/**
 * 해당 플레이어가 서포터일 가능성 점수 (0~10).
 *
 * DNA supportRate × 5 + 스펠 신호 + 룬 신호 + 챔피언 포지션
 */
function calcSupportAnchorScore(player: PlayerSummary): number {
  let score = 0;

  // DNA: UTILITY 빈도 (0~5)
  const supportRate = player.playerDna.positionFrequency["UTILITY"] ?? 0;
  score += supportRate * 5;

  // 스펠 신호
  const spells = new Set([player.spell1Id, player.spell2Id]);
  if (spells.has(EXHAUST_ID)) score += 2.0;   // 탈진 — 강한 서폿 신호
  if (spells.has(IGNITE_ID))  score += 0.5;   // 점화 — 약한 서폿 신호 (어그로 서폿)

  // 룬 키스톤 신호
  const keystone = player.perks?.perkIds?.[0] ?? 0;
  const style    = player.perks?.perkStyle ?? 0;
  const subStyle = player.perks?.perkSubStyle ?? 0;

  if (keystone === botRules.supportRunes.guardian)        score += 2.5; // 수호자
  if (keystone === botRules.supportRunes.glacialAugment)  score += 2.0; // 빙결 강화
  if (keystone === botRules.supportRunes.aftershock)      score += 1.0; // 여진 (탱커 서폿)
  if (style    === botRules.supportRunes.resolvePath)     score += 0.5; // 결의 경로
  if (style    === botRules.supportRunes.inspirationPath) score += 0.3; // 영감 경로
  if (subStyle === botRules.supportRunes.resolvePath)     score += 0.2; // 보조 결의

  // 챔피언 태그: mainPosition이 서폿이면 가산
  const tag = getTagById(player.championId);
  if (tag?.mainPosition === "support") score += 1.0;

  return score;
}

// ── 바텀 동반자(ADC 파트너) 점수 산출 ──────────────────────────

/**
 * 서포터 닻이 확정된 후, 남은 플레이어 중 바텀 동반자 점수 (0~10).
 * DNA bottomRate × 4 + 비원딜 사전 일치 보정
 */
function calcBottomCompanionScore(
  player: PlayerSummary,
  anchorChampionId: number
): number {
  let score = 0;

  // DNA: BOTTOM 빈도 (0~4)
  const bottomRate = player.playerDna.positionFrequency["BOTTOM"] ?? 0;
  score += bottomRate * 4;

  // 챔피언 원딜 여부 (champion-tags mainPosition)
  const tag = getTagById(player.championId);
  if (tag?.mainPosition === "adc") score += 1.0; // 정석 원딜 챔피언

  // 비원딜 사전 일치 → 바텀에서 충분히 플레이 가능하다는 사전 지식
  if (NON_ADC_SET.has(player.championId)) score += 1.0;

  // 세나(Senna) 파트너: 단식 조합 → tank 선호 보정
  if (anchorChampionId === SENNA_ID) {
    if (botRules.nonAdcChampions.tank.includes(player.championId)) score += 2.0;
  }

  return score;
}

// ── 특수 듀오 검사 ─────────────────────────────────────────────

function findSpecialDuo(
  candidates: PlayerSummary[]
): { p1: PlayerSummary; p2: PlayerSummary; label: string } | null {
  const idToPlayer = new Map(candidates.map((p) => [p.championId, p]));

  for (const duo of botRules.specialDuos) {
    const [a, b] = duo.pair;
    const pa = idToPlayer.get(a);
    const pb = idToPlayer.get(b);
    if (pa && pb) return { p1: pa, p2: pb, label: duo.label };
  }
  return null;
}

// ── 공개 인터페이스 ────────────────────────────────────────────

export interface BotDuoResult {
  support:       PlayerSummary;
  adcOrNonAdc:   PlayerSummary;
  /** 비원딜/특수 조합 키워드 (없으면 undefined = 정석 원딜) */
  nonAdcLabel?:  string;
  /** 식별 신뢰도 0~1. 낮으면 전체 백트래킹 폴백 권장 */
  confidence:    number;
}

/**
 * 팀 내 바텀 듀오(서포터 + 원딜/비원딜)를 식별.
 *
 * 우선순위:
 *  1. specialDuos 목록 정확히 일치 → 즉시 확정
 *  2. 서포터 닻(Anchor) 점수 최고 플레이어를 서폿으로 확정
 *  3. 세나 파트너 → tank 우선 / 일반 → DNA bottomRate 최고 플레이어를 ADC로 확정
 *
 * @param candidates 정글(Smite) 제외 후보군
 */
export function findBotDuo(candidates: PlayerSummary[]): BotDuoResult | null {
  if (candidates.length < 2) return null;

  // ── 1. 특수 듀오 즉시 확정 ────────────────────────────────────
  const special = findSpecialDuo(candidates);
  if (special) {
    const { p1, p2, label } = special;
    // specialDuo에서 서폿 역할을 가진 쪽 판별 (더 높은 anchorScore를 서폿으로)
    const s1 = calcSupportAnchorScore(p1);
    const s2 = calcSupportAnchorScore(p2);
    const [support, adcOrNonAdc] = s1 >= s2 ? [p1, p2] : [p2, p1];
    return { support, adcOrNonAdc, nonAdcLabel: label, confidence: 0.90 };
  }

  // ── 2. 서포터 닻 식별 ─────────────────────────────────────────
  const sorted = [...candidates].sort(
    (a, b) => calcSupportAnchorScore(b) - calcSupportAnchorScore(a)
  );
  const supportAnchor = sorted[0];
  const anchorScore   = calcSupportAnchorScore(supportAnchor);

  // 앵커 점수가 너무 낮으면 신뢰도 없음 → 폴백
  if (anchorScore < 1.5) return null;

  // ── 3. 바텀 동반자 식별 ──────────────────────────────────────
  const remaining = candidates.filter((p) => p.puuid !== supportAnchor.puuid);
  const companion = [...remaining].sort(
    (a, b) =>
      calcBottomCompanionScore(b, supportAnchor.championId) -
      calcBottomCompanionScore(a, supportAnchor.championId)
  )[0];

  const companionScore = calcBottomCompanionScore(companion, supportAnchor.championId);

  // 전체 신뢰도: 앵커 강도 + 동반자 강도 합산 후 정규화
  const confidence = Math.min(1.0, (anchorScore + companionScore) / 14);

  // 동반자 챔피언이 정석 원딜이 아니면 라벨 부여
  const nonAdcLabel = getNonAdcLabel(companion.championId);

  return { support: supportAnchor, adcOrNonAdc: companion, nonAdcLabel, confidence };
}
