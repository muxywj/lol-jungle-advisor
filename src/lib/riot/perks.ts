import type { Perks } from "@/types/riot";
import type { LaneKey } from "@/types/v2";

// ── 룬 경로(perkStyle) ─────────────────────────────────────────
const PRECISION_PATH    = 8000; // 정밀
const DOMINATION_PATH   = 8100; // 지배
const SORCERY_PATH      = 8200; // 마법
const RESOLVE_PATH      = 8400; // 결의
const INSPIRATION_PATH  = 8300; // 영감

// ── 키스톤(perkIds[0]) ────────────────────────────────────────
// 결의 경로
const GRASP            = 8437; // 착취의 손아귀 — 강력한 탑 신호
const AFTERSHOCK       = 8439; // 여진            — 탑/서폿 탱커 신호
const GUARDIAN         = 8465; // 수호자          — 강력한 서폿 신호

// 지배 경로
const ELECTROCUTE      = 8112; // 감전            — 암살자/미드 신호
const HAIL_OF_BLADES   = 8128; // 칼날비          — 원딜/봇 신호

// 마법 경로
const ARCANE_COMET     = 8229; // 신비로운 혜성   — 미드/서폿 포킹 신호
const PHASE_RUSH       = 8214; // 위상 질주        — 미드/정글 신호 (but no jungle lane)

// 정밀 경로
const LETHAL_TEMPO     = 8008; // 치명적 속도      — 원딜/탑 신호
const FLEET_FOOTWORK   = 8021; // 함대 속보        — 원딜/봇 신호

// 영감 경로
const GLACIAL_AUGMENT  = 8351; // 빙결 강화        — 서폿 신호
const SUMMON_AERY      = 8214; // 소환: 에리       ← 실제 ID는 마법 경로이므로 별칭
// 소환: 에리는 8214 아님. 실제 ID: 8214 = Phase Rush, 8229 = Arcane Comet
// 소환: 에리(Summon Aery) = 8230 (Sorcery keystone)
const SUMMON_AERY_ID   = 8230; // 소환: 에리       — 서폿/봇 포킹 신호

/**
 * 룬(Perks) 데이터를 분석해 각 라인에 대한 포지션 가중치를 반환.
 * 반환값은 0~1 사이의 덧셈 보정값으로, scorePlayerForLane 공식에서
 * runeWeight 컴포넌트(×0.15 가중)로 사용됨.
 */
export function getPerkPositionalWeights(perks: Perks): Record<LaneKey, number> {
  const w: Record<LaneKey, number> = { top: 0, mid: 0, adc: 0, support: 0 };
  const keystone = perks.perkIds?.[0] ?? 0;

  // ── 경로 레벨 신호 ─────────────────────────────────────────
  if (perks.perkStyle === RESOLVE_PATH) {
    // 결의: 탑 탱커 / 탱커 서폿 공통 신호
    w.top     += 0.10;
    w.support += 0.10;
  }
  if (perks.perkStyle === INSPIRATION_PATH) {
    // 영감: 주로 서폿 또는 특이 빌드
    w.support += 0.08;
  }

  // ── 키스톤 레벨 신호 (경로 보너스와 중복 가산) ────────────
  switch (keystone) {
    // 결의 경로 키스톤
    case GRASP:
      w.top     += 0.30; // 착취의 손아귀 → 매우 강한 탑 신호
      break;
    case AFTERSHOCK:
      w.top     += 0.10; // 여진 → 탑/서폿 탱커
      w.support += 0.15;
      break;
    case GUARDIAN:
      w.support += 0.30; // 수호자 → 매우 강한 서폿 신호
      break;

    // 지배 경로 키스톤
    case ELECTROCUTE:
      w.mid     += 0.15; // 감전 → 암살자, 주로 미드
      w.top     += 0.05;
      break;
    case HAIL_OF_BLADES:
      w.adc     += 0.20; // 칼날비 → 원딜 봇 신호
      w.support += 0.05; // 일부 서폿도 사용
      break;

    // 마법 경로 키스톤
    case ARCANE_COMET:
      w.mid     += 0.10; // 신비로운 혜성 → 미드 포킹/AP
      w.support += 0.10;
      break;
    case PHASE_RUSH:
      w.mid     += 0.12; // 위상 질주 → 미드(AP 스케일러)
      break;

    // 정밀 경로 키스톤
    case LETHAL_TEMPO:
      w.adc     += 0.15; // 치명적 속도 → 원딜/일부 탑
      w.top     += 0.05;
      break;
    case FLEET_FOOTWORK:
      w.adc     += 0.12; // 함대 속보 → 원딜 서스테인
      break;

    // 영감 경로 키스톤
    case GLACIAL_AUGMENT:
      w.support += 0.25; // 빙결 강화 → 강한 서폿 신호
      break;

    // 소환: 에리 (마법 경로)
    case SUMMON_AERY_ID:
      w.support += 0.15; // 에리 서폿
      w.mid     += 0.08;
      break;

    // 정밀 경로 보조 체크 (PRECISION path non-keystone signal)
  }

  // 정밀 경로(보조) → 원딜 약한 신호
  if (perks.perkSubStyle === PRECISION_PATH) {
    w.adc     += 0.05;
  }
  // 결의 경로(보조) → 서폿/탑 약한 신호
  if (perks.perkSubStyle === RESOLVE_PATH) {
    w.support += 0.04;
    w.top     += 0.04;
  }

  return w;
}
