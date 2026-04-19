import type { RecentMatchSummary } from "@/types/match";

// ── 시간 감쇠 가중치 (liveGameService와 동일한 step-function) ─────────────
function timeDecayWeight(playedAt: number): number {
  const ageDays = (Date.now() - playedAt) / 86_400_000;
  if (ageDays < 0.5)  return 1.00;
  if (ageDays < 2)    return 0.70;
  if (ageDays < 7)    return 0.45;
  if (ageDays < 30)   return 0.20;
  return 0.08;
}

/**
 * 포지션 분포 엔트로피 기반 안정성 지수 (0~1).
 * 1 = 단일 포지션만 플레이, 0 = 5포지션 균등 분포.
 * DNA 신뢰도 조절 및 Gate 3 판정에 사용.
 */
function calcPositionalStability(posFreq: Record<string, number>): number {
  const values = Object.values(posFreq).filter((v) => v > 0);
  if (values.length <= 1) return 1.0;
  const entropy = -values.reduce((sum, p) => sum + p * Math.log2(p), 0);
  const maxEntropy = Math.log2(5); // 5포지션 균등 분포 시 최대 엔트로피
  return Math.max(0, 1 - entropy / maxEntropy);
}

export interface PlayerDNA {
  /** 포지션별 최근 플레이 빈도 (합 = 1.0, 시간 감쇠 적용). Riot 포지션 키: TOP/MIDDLE/BOTTOM/UTILITY/JUNGLE */
  positionFrequency: Record<string, number>;
  /** DNA 계산에 사용된 유효 게임 수 */
  sampleSize: number;
  /**
   * 포지션 안정성 지수 (0~1).
   * 높을수록 특정 포지션에 집중된 플레이어 → DNA 신뢰도 높음.
   * Gate 3 임계값: ≥ 0.80 (대략 90%+ 집중)
   */
  stability: number;
  /**
   * 현재 픽 챔피언으로 플레이한 경기만의 포지션 빈도 (시간 감쇠 적용).
   * "초가스 원딜" 같은 비주류 픽 판별의 핵심 신호.
   */
  champSpecificFreq: Record<string, number>;
  /** champSpecificFreq 계산에 사용된 유효 게임 수 (0이면 미사용) */
  champSpecificSampleSize: number;
}

export interface RecentMomentum {
  winRate: number;       // 최근 10판 승률 (0~1)
  avgKda: number;        // 평균 KDA
  streak: number;        // 양수 = 연승 횟수, 음수 = 연패 횟수
  isHotStreak: boolean;  // 3연승 이상
  isColdStreak: boolean; // 3연패 이상
  momentumScore: number; // 0~100 종합 기세 점수
}

/**
 * 최근 전적을 분석해 플레이어의 포지션 분포(DNA)를 반환.
 *
 * @param matches         최근 전적 요약 배열 (최신순)
 * @param currentChampId  현재 인게임 픽 챔피언 ID — 챔피언 특이적 DNA 산출에 사용.
 *                        0이면 champSpecificFreq는 빈 객체로 반환.
 */
export function analyzePlayerDNA(
  matches: RecentMatchSummary[],
  currentChampId = 0
): PlayerDNA {
  const validMatches = matches.filter((m) => m.teamPosition && m.teamPosition !== "");

  if (validMatches.length === 0) {
    return {
      positionFrequency: {},
      sampleSize: 0,
      stability: 0,
      champSpecificFreq: {},
      champSpecificSampleSize: 0,
    };
  }

  // ── 1. 전체 포지션 빈도 (시간 감쇠 적용) ─────────────────────────────
  const weightByPos: Record<string, number> = {};
  let totalWeight = 0;

  for (const m of validMatches) {
    const w = timeDecayWeight(m.playedAt);
    weightByPos[m.teamPosition] = (weightByPos[m.teamPosition] ?? 0) + w;
    totalWeight += w;
  }

  const positionFrequency: Record<string, number> = {};
  for (const [pos, w] of Object.entries(weightByPos)) {
    positionFrequency[pos] = totalWeight > 0 ? w / totalWeight : 0;
  }

  const stability = calcPositionalStability(positionFrequency);

  // ── 2. 챔피언 특이적 포지션 빈도 (현재 픽 챔피언 게임만) ──────────────
  let champSpecificFreq: Record<string, number> = {};
  let champSpecificSampleSize = 0;

  if (currentChampId > 0) {
    const champMatches = validMatches.filter((m) => m.championId === currentChampId);
    champSpecificSampleSize = champMatches.length;

    if (champMatches.length > 0) {
      const champWeightByPos: Record<string, number> = {};
      let champTotal = 0;

      for (const m of champMatches) {
        const w = timeDecayWeight(m.playedAt);
        champWeightByPos[m.teamPosition] = (champWeightByPos[m.teamPosition] ?? 0) + w;
        champTotal += w;
      }

      for (const [pos, w] of Object.entries(champWeightByPos)) {
        champSpecificFreq[pos] = champTotal > 0 ? w / champTotal : 0;
      }
    }
  }

  return {
    positionFrequency,
    sampleSize: validMatches.length,
    stability,
    champSpecificFreq,
    champSpecificSampleSize,
  };
}

/**
 * 최근 10판 승패 및 KDA를 분석해 현재 기세(Momentum)를 산출.
 *
 * matches는 최신순(index 0 = 가장 최근) 정렬로 전달해야 함.
 */
export function calcRecentMomentum(matches: RecentMatchSummary[]): RecentMomentum {
  const recent = matches.slice(0, 10);

  if (recent.length === 0) {
    return { winRate: 0.5, avgKda: 3, streak: 0, isHotStreak: false, isColdStreak: false, momentumScore: 50 };
  }

  const wins = recent.filter((m) => m.win).length;
  const winRate = wins / recent.length;

  const totalKda = recent.reduce((sum, m) => {
    const kda = m.deaths === 0
      ? m.kills + m.assists
      : (m.kills + m.assists) / m.deaths;
    return sum + Math.min(kda, 6);
  }, 0);
  const avgKda = totalKda / recent.length;

  let streak = 0;
  const firstResult = recent[0].win;
  for (const m of recent) {
    if (m.win === firstResult) {
      streak += m.win ? 1 : -1;
    } else {
      break;
    }
  }

  const isHotStreak  = streak >= 3;
  const isColdStreak = streak <= -3;

  const winRateDev  = (winRate - 0.5) * 40;
  const kdaDev      = (Math.min(avgKda, 6) / 6) * 20 - 10;
  const streakBonus = Math.max(-10, Math.min(10, streak * 2));

  const momentumScore = Math.round(
    Math.max(0, Math.min(100, 50 + winRateDev + kdaDev + streakBonus))
  );

  return { winRate, avgKda, streak, isHotStreak, isColdStreak, momentumScore };
}
