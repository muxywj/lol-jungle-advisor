import type { LiveGameViewModel, PlayerSummary } from "@/types/live-game";
import type { PlatformRegion } from "@/types/common";
import type { LaneKey, LaneScoreBreakdown, V2ScoreResult } from "@/types/v2";
import { PLATFORM_TO_ROUTING } from "@/lib/constants/regions";
import { getAccountByRiotId } from "@/lib/riot/account";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { getActiveGame } from "@/lib/riot/spectator";
import { getRecentMatches } from "@/lib/riot/match";
import { getMasteryByChampion } from "@/lib/riot/mastery";
import { mapParticipant } from "@/lib/mappers/playerMapper";
import { getTagById } from "@/lib/data/championTags";
import { getPositionRates } from "@/lib/data/championStats";
import { getPerkPositionalWeights } from "@/lib/riot/perks";
import { calcLaneScore, assembleV2Result, LaneScoreInput } from "@/lib/scoring/finalLineScore";
import { getRankedEntries } from "@/lib/riot/league";
import { RiotApiError } from "@/lib/riot/client";
import { findBotDuo } from "@/lib/analysis/botDuoMatcher";
import { timeDecayWeight } from "@/lib/utils/timeDecay";

export type LiveGameResult =
  | { type: "live"; data: LiveGameViewModel }
  | { type: "not_in_game" }
  | { type: "account_not_found" }
  | { type: "rate_limited" }
  | { type: "server_error"; message: string };

// Application rate limit: 20 req/s, 100 req/2min.
// Total calls = 33 + 10×MATCH_COUNT. At 6: 93/100 (safe margin 7).
// Do NOT raise MATCH_COUNT above 6 without a server-side cache (7 → 103, exceeds limit).
const MATCH_COUNT_PER_PLAYER = 6;

// LaneKey → champion-tags mainPosition / Riot teamPosition 매핑
const LANE_TO_MAIN_POSITION: Record<LaneKey, string> = {
  top: "top", mid: "mid", adc: "adc", support: "support",
};
const LANE_TO_RIOT_POSITION: Record<LaneKey, string> = {
  top: "TOP", mid: "MIDDLE", adc: "BOTTOM", support: "UTILITY",
};

// 소환사 스펠 ID
const SMITE_ID    = 11;
const EXHAUST_ID  = 3;
const HEAL_ID     = 7;
const TELEPORT_ID = 12;
const IGNITE_ID   = 14;
const CLEANSE_ID  = 1;
const BARRIER_ID  = 21;

// 비정상 메타 판정: 4라인 합산 점수가 이 임계값 미만이면 전체 confidence를 최저로 강제
const LOW_CONFIDENCE_THRESHOLD = 1.5;
// Duo-First: findBotDuo confidence 임계값 — 이 이상이면 서폿/원딜을 먼저 확정
const DUO_CONFIDENCE_THRESHOLD = 0.35;



/**
 * 전적 기반 포지션 가중 빈도 (0~1).
 * 현재 픽한 챔피언 기록 → 3배 가중, 시간 감쇠 적용.
 * 전적 없으면 0.25 (중립) 반환.
 */
function calcHistoryWeight(
  recentMatches: import("@/types/match").RecentMatchSummary[],
  currentChampionId: number,
  riotPosition: string
): number {
  const valid = recentMatches.filter((m) => m.teamPosition !== "");
  if (valid.length === 0) return 0.25;

  let totalW = 0;
  let posW   = 0;

  for (const m of valid) {
    const champMult = m.championId === currentChampionId ? 3.0 : 1.0;
    const w = timeDecayWeight(m.playedAt) * champMult;
    totalW += w;
    if (m.teamPosition === riotPosition) posW += w;
  }

  return totalW > 0 ? posW / totalW : 0.25;
}

/**
 * 소환사 스펠 조합이 특정 라인에 주는 소프트 가중치 (0~1).
 *
 * 기존의 "탈진=서폿 확정(0.95)" 하드코딩 제거.
 * 스펠은 전체 점수의 15% 가중 컴포넌트로만 작동.
 * 탈진/치유는 해당 라인에서 0.2, 텔포·점화는 0.1로 처리.
 */
function calcSpellWeight(spell1: number, spell2: number, lane: LaneKey): number {
  const has = (id: number) => spell1 === id || spell2 === id;

  let w = 0;
  if (has(EXHAUST_ID))  w += lane === "support" ? 0.2 : 0.0;
  if (has(HEAL_ID))     w += lane === "adc"     ? 0.2 : 0.0;
  if (has(TELEPORT_ID)) w += (lane === "top" || lane === "mid") ? 0.1 : 0.0;
  if (has(IGNITE_ID))   w += (lane === "mid" || lane === "support") ? 0.1 : 0.0;

  return Math.min(1.0, w);
}

/**
 * 플레이어가 특정 라인을 설 확률 점수 (0~1).
 *
 * 계층적 확정 게이트 → Adaptive Signal Fusion 순서로 평가.
 *
 * Gate 0 (buildRoleMap): 강타 → 정글 확정 (여기에 도달하지 않음)
 * Gate 1: Cleanse/Barrier → ADC 확정 (~97%)
 * Gate 2: 챔피언 특이적 DNA ≥ 0.80, 3판+ → 즉시 확정 (~93%)
 * Gate 3: 전체 DNA ≥ 0.80, 5판+ → 즉시 확정 (~90%)
 * Gate 4: Adaptive Signal Fusion (가중치 조정)
 *           sampleSize:   0     3     5+
 *           DNA  weight: 0.20  0.44  0.60
 *           champ weight:0.45  0.29  0.15  ← 챔피언 태그 비중 축소
 *           spell weight:0.35  0.27  0.25  ← 룬/스펠 비중 확대
 */
function scorePlayerForLane(player: PlayerSummary, lane: LaneKey): number {
  const riotPos = LANE_TO_RIOT_POSITION[lane];

  // ── Gate 1: Cleanse/Barrier → ADC 확정 ───────────────────────────────
  const spell1 = player.spell1Id;
  const spell2 = player.spell2Id;
  if (spell1 === CLEANSE_ID || spell2 === CLEANSE_ID ||
      spell1 === BARRIER_ID || spell2 === BARRIER_ID) {
    return lane === "adc" ? 0.90 : 0.05;
  }

  // ── Gate 2: 챔피언 특이적 DNA ≥ 0.80 (3판+) ─────────────────────────
  // "초가스 원딜"처럼 챔피언 주 포지션과 다른 라인을 서는 경우 직접 판별.
  // 현재 픽 챔피언으로 플레이한 게임만 분석한 champSpecificFreq를 사용.
  const csFreq = player.playerDna.champSpecificFreq;
  const csSampleSize = player.playerDna.champSpecificSampleSize;
  if (csSampleSize >= 3) {
    const csForLane = csFreq[riotPos] ?? 0;
    if (csForLane >= 0.80) return 0.95;
    // 다른 포지션에 ≥ 0.80 → 이 라인이 아님을 강하게 시사
    const csHighElsewhere = Object.entries(csFreq)
      .some(([pos, freq]) => pos !== riotPos && freq >= 0.80);
    if (csHighElsewhere) return 0.05;
  }

  // ── Gate 3: 전체 DNA ≥ 0.80 (5판+) ──────────────────────────────────
  // 단일 포지션만 하는 플레이어(탑만 함, 서폿만 함 등) 빠른 확정.
  const generalFreq = player.playerDna.positionFrequency[riotPos] ?? 0;
  if (player.playerDna.sampleSize >= 5) {
    if (generalFreq >= 0.80) return 0.92;
    const generalHighElsewhere = Object.entries(player.playerDna.positionFrequency)
      .some(([pos, freq]) => pos !== riotPos && freq >= 0.80);
    if (generalHighElsewhere) return 0.05;
  }

  // ── Gate 4: Adaptive Signal Fusion ───────────────────────────────────
  const pos = LANE_TO_MAIN_POSITION[lane];
  const tag = getTagById(player.championId);

  // 챔피언 태그 비중 0.45→0.15으로 축소, 룬/스펠 0.35→0.25으로 조정
  // (DNA가 충분할수록 챔피언 통계 영향력 감소, 플레이어 습관 우선)
  const dnaTrust = Math.min(1.0, player.playerDna.sampleSize / 5);
  const W_DNA   = 0.20 + dnaTrust * 0.40; // 0.20 → 0.60
  const W_CHAMP = 0.45 - dnaTrust * 0.30; // 0.45 → 0.15
  const W_SPELL = 0.35 - dnaTrust * 0.10; // 0.35 → 0.25

  // DNA: sampleSize > 0이면 포지션 빈도 직접 사용, 없으면 전적 기반 폴백
  let dnaWeight: number;
  if (player.playerDna.sampleSize > 0) {
    dnaWeight = generalFreq;
  } else {
    dnaWeight = calcHistoryWeight(player.recentMatches, player.championId, riotPos);
  }

  // 챔피언 메타 픽률 (champion-stats.json → tag.positions → mainPosition 순)
  let champWeight: number;
  const posRates = getPositionRates(player.championId);
  if (posRates) {
    champWeight = posRates[riotPos] ?? 0.033;
  } else if (tag?.positions?.[pos] !== undefined) {
    champWeight = tag.positions[pos];
  } else if (tag?.mainPosition) {
    champWeight = tag.mainPosition === pos ? 0.90 : 0.033;
  } else {
    champWeight = 0.25;
  }

  // 스펠 + 룬 소프트 신호
  const spellWeight = calcSpellWeight(player.spell1Id, player.spell2Id, lane);
  let runeWeight = 0;
  if (player.perks) {
    runeWeight = Math.min(1.0, getPerkPositionalWeights(player.perks)[lane]);
  }
  const spellAndRuneWeight = Math.min(1.0, spellWeight + runeWeight);

  let score = Math.min(1.0,
    dnaWeight          * W_DNA   +
    champWeight        * W_CHAMP +
    spellAndRuneWeight * W_SPELL
  );

  // BOTTOM DNA ≥ 0.70 → ADC 보너스 (Gate 3에 못 걸린 중간 신뢰도 케이스 보완)
  if (lane === "adc") {
    const bottomDNA = player.playerDna.positionFrequency["BOTTOM"] ?? 0;
    if (bottomDNA >= 0.70) score = Math.min(1.0, score + 0.50);
  }

  return score;
}

interface RoleMapResult {
  roleMap:    Map<LaneKey, PlayerSummary>;
  /** puuid → 해당 라인 배정 신뢰도 (0~1) */
  confidence: Map<string, number>;
}

const hasSmite = (p: PlayerSummary) =>
  p.spell1Id === SMITE_ID || p.spell2Id === SMITE_ID;

/**
 * 지정된 lanes × pool 조합을 전수 탐색, 팀 전체 점수 합산 최대 배정 반환.
 * (순수 함수 — buildRoleMap에서 Duo-First / 폴백 양 경로에서 재사용)
 */
function runBacktrack(
  lanes: LaneKey[],
  pool:  PlayerSummary[]
): { map: Map<LaneKey, PlayerSummary>; score: number } {
  let bestScore = -Infinity;
  let bestMap   = new Map<LaneKey, PlayerSummary>();

  function bt(
    idx:     number,
    used:    Set<string>,
    current: Map<LaneKey, PlayerSummary>,
    score:   number
  ) {
    if (idx === lanes.length) {
      if (score > bestScore) { bestScore = score; bestMap = new Map(current); }
      return;
    }
    const lane = lanes[idx];
    let hasCand = false;
    for (const p of pool) {
      if (used.has(p.puuid)) continue;
      hasCand = true;
      const s = scorePlayerForLane(p, lane);
      used.add(p.puuid); current.set(lane, p);
      bt(idx + 1, used, current, score + s);
      used.delete(p.puuid); current.delete(lane);
    }
    if (!hasCand) bt(idx + 1, used, current, score);
  }

  bt(0, new Set(), new Map(), 0);
  return { map: bestMap, score: bestScore === -Infinity ? 0 : bestScore };
}

/**
 * 팀 내 4개 라인(탑/미드/원딜/서폿)에 플레이어를 1:1로 배정.
 *
 * 강타(Smite) = 정글 100% 확정. 강타 보유자는 항상 정글로 고정되며
 * 라인 배정 알고리즘에 진입하지 않는다. 0강타 예외(비정상 모드)에서도
 * 비강타 플레이어가 정글로 산정되지 않도록 후처리에서 보장.
 *
 * 흐름:
 *  1. 강타 보유자 → 정글 확정, 후보 풀에서 제외
 *  2. 잔여 인원으로 Duo-First: findBotDuo() → 서폿+원딜 먼저 확정
 *     - confidence ≥ DUO_CONFIDENCE_THRESHOLD → top/mid 백트래킹
 *     - confidence 부족 → 4라인 전수 백트래킹 (폴백)
 *  3. 라인 합산 점수 < LOW_CONFIDENCE_THRESHOLD → 비정상 메타, confidence 0 강제
 */
function buildRoleMap(team: PlayerSummary[]): RoleMapResult {
  const ALL_LANES: LaneKey[] = ["top", "mid", "adc", "support"];

  // 강타 보유자 중 첫 번째만 정글로 확정.
  // 2강타+ 예외(URF 등)에서 나머지 강타 보유자는 라인 후보에 편입하여 정글 중복 방지.
  // 0강타 시 candidates = 전원(5명), 백트래킹이 4명 배정 후 1명 낙오 → 후처리에서 처리.
  const confirmedJungler = team.find(hasSmite); // 팀 내 첫 번째 강타 보유자만 정글 확정
  const candidates = team.filter((p) => p !== confirmedJungler);

  let finalMap  = new Map<LaneKey, PlayerSummary>();
  let laneScore = 0;

  // ── Duo-First 시도 ────────────────────────────────────────────
  const duoResult = findBotDuo(candidates);

  if (duoResult && duoResult.confidence >= DUO_CONFIDENCE_THRESHOLD) {
    const { support, adcOrNonAdc, nonAdcLabel } = duoResult;
    if (nonAdcLabel) adcOrNonAdc.nonAdcLabel = nonAdcLabel;

    finalMap.set("support", support);
    finalMap.set("adc",     adcOrNonAdc);

    const remaining = candidates.filter(
      (p) => p.puuid !== support.puuid && p.puuid !== adcOrNonAdc.puuid
    );
    const { map: topMidMap, score: topMidScore } = runBacktrack(["top", "mid"], remaining);
    for (const [lane, player] of topMidMap) finalMap.set(lane, player);

    laneScore =
      scorePlayerForLane(support, "support") +
      scorePlayerForLane(adcOrNonAdc, "adc") +
      topMidScore;
  } else {
    // ── 폴백: 4라인 전수 백트래킹 ───────────────────────────────
    const { map, score } = runBacktrack(ALL_LANES, candidates);
    finalMap  = map;
    laneScore = score;
  }

  // confirmedJungler는 candidates에서 제외되었으므로 finalMap에 없음 → 후처리에서 null 배정.
  // 나머지 강타 보유자(2강타+ 예외)는 candidates에 포함되어 여기서 일반 라인을 배정받음.
  const assignedPuuids = new Set([...finalMap.values()].map((p) => p.puuid));
  const laneLeftover   = candidates.filter((p) => !assignedPuuids.has(p.puuid));

  for (const lane of ALL_LANES) {
    if (!finalMap.has(lane) && laneLeftover.length > 0) {
      finalMap.set(lane, laneLeftover.shift()!);
    }
  }

  // 비정상 메타 판정
  const isAnomalous = laneScore < LOW_CONFIDENCE_THRESHOLD;

  const confidence = new Map<string, number>();
  for (const [lane, player] of finalMap) {
    confidence.set(player.puuid, isAnomalous ? 0 : scorePlayerForLane(player, lane));
  }

  return { roleMap: finalMap, confidence };
}

/** 비강타 플레이어가 라인 배정을 받지 못한 경우(0강타 예외 등) 최적 라인 반환. */
function argmaxLane(player: PlayerSummary): LaneKey {
  const ALL_LANES: LaneKey[] = ["top", "mid", "adc", "support"];
  let best = ALL_LANES[0];
  let bestScore = scorePlayerForLane(player, ALL_LANES[0]);
  for (let i = 1; i < ALL_LANES.length; i++) {
    const s = scorePlayerForLane(player, ALL_LANES[i]);
    if (s > bestScore) { bestScore = s; best = ALL_LANES[i]; }
  }
  return best;
}

/**
 * Build a neutral fallback score for a lane where we can't identify players.
 */
function neutralLane(_lane: LaneKey): LaneScoreBreakdown {
  return {
    matchupScore: 50,
    allyMasteryScore: 50,
    enemyMasteryScore: 50,
    skillGapAdjustment: 0,
    spellAdjustment: 0,
    exceptionAdjustment: 0,
    finalScore: 50,
    urgency: "보통",
    keywords: ["라인 미식별"],
    allyChampionId: null,
    enemyChampionId: null,
    isNeutral: true,
  };
}

/**
 * Run the V2 scoring pipeline for all 4 lanes.
 * Mastery data is expected to be pre-fetched and stored on each PlayerSummary.
 */
function computeV2Score(
  allyTeam: PlayerSummary[],
  enemyTeam: PlayerSummary[],
): V2ScoreResult {
  const lanes: LaneKey[] = ["top", "mid", "adc", "support"];

  // Use assignedLane already set by buildRoleMap
  const allyByRole = new Map<LaneKey, PlayerSummary>();
  const enemyByRole = new Map<LaneKey, PlayerSummary>();
  for (const p of allyTeam)  if (p.assignedLane) allyByRole.set(p.assignedLane, p);
  for (const p of enemyTeam) if (p.assignedLane) enemyByRole.set(p.assignedLane, p);

  // Compute per-lane scores using pre-fetched masteryData
  const laneScores = lanes.map((lane) => {
    const ally = allyByRole.get(lane);
    const enemy = enemyByRole.get(lane);

    if (!ally) return neutralLane(lane);

    const input: LaneScoreInput = {
      allyChampionId: ally.championId,
      enemyChampionId: enemy?.championId ?? null,
      allyTag: getTagById(ally.championId),
      enemyTag: enemy ? getTagById(enemy.championId) : undefined,
      allySpell1: ally.spell1Id,
      allySpell2: ally.spell2Id,
      enemySpell1: enemy?.spell1Id ?? 0,
      enemySpell2: enemy?.spell2Id ?? 0,
      allyMastery: ally.masteryData ?? null,
      enemyMastery: enemy?.masteryData ?? null,
      allyRecentMatches: ally.recentMatches,
      enemyRecentMatches: enemy?.recentMatches ?? [],
      allyMomentumScore:  ally.momentum.momentumScore,
      enemyMomentumScore: enemy?.momentum.momentumScore,
      allyIsHotStreak:    ally.momentum.isHotStreak,
      allyIsOnTilt:       ally.momentum.isColdStreak,
      allyKeywordsExtra:  ally.nonAdcLabel ? [ally.nonAdcLabel] : undefined,
    };

    return calcLaneScore(lane, input);
  });

  return assembleV2Result(laneScores[0], laneScores[1], laneScores[2], laneScores[3]);
}

export async function getLiveGame(
  gameName: string,
  tagLine: string,
  platformRegion: PlatformRegion
): Promise<LiveGameResult> {
  const routingRegion = PLATFORM_TO_ROUTING[platformRegion];

  // 1. Riot ID → puuid
  let account;
  try {
    account = await getAccountByRiotId(gameName, tagLine, routingRegion);
  } catch (err) {
    if (err instanceof RiotApiError) {
      if (err.statusCode === 404) return { type: "account_not_found" };
      if (err.statusCode === 429) return { type: "rate_limited" };
    }
    return { type: "server_error", message: String(err) };
  }

  // 2. puuid → summonerId
  let summoner;
  try {
    summoner = await getSummonerByPuuid(account.puuid, platformRegion);
  } catch (err) {
    if (err instanceof RiotApiError && err.statusCode === 429)
      return { type: "rate_limited" };
    return { type: "server_error", message: String(err) };
  }

  // 3. summonerId → active game
  let activeGame;
  try {
    activeGame = await getActiveGame(summoner.puuid, platformRegion);
  } catch (err) {
    if (err instanceof RiotApiError && err.statusCode === 429)
      return { type: "rate_limited" };
    return { type: "server_error", message: String(err) };
  }

  if (!activeGame) return { type: "not_in_game" };

  // 4. Launch matches + ranked + mastery all in parallel.
  //    All three need only puuid/championId which are available from activeGame now.
  //    Previous code ran ranked then mastery sequentially after matches (~+0.4s wasted).
  const [participantMatchesSettled, rankedSettled, masterySettled] = await Promise.all([
    Promise.allSettled(
      activeGame.participants.map((p) =>
        getRecentMatches(p.puuid, routingRegion, MATCH_COUNT_PER_PLAYER)
      )
    ),
    Promise.allSettled(
      activeGame.participants.map((p) =>
        getRankedEntries(p.puuid, platformRegion)
      )
    ),
    Promise.allSettled(
      activeGame.participants.map((p) =>
        getMasteryByChampion(p.puuid, p.championId, platformRegion)
      )
    ),
  ]);

  // 5. Map each participant to PlayerSummary (mastery already fetched above)
  const playerSummaries: PlayerSummary[] = await Promise.all(
    activeGame.participants.map(async (p, i) => {
      const matchResult = participantMatchesSettled[i];
      const matches = matchResult.status === "fulfilled" ? matchResult.value : [];
      const summary = await mapParticipant(p, matches);

      // 솔로랭크 우선, 없으면 자유랭크
      const entries = rankedSettled[i].status === "fulfilled" ? rankedSettled[i].value : [];
      const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
      const flex = entries.find((e) => e.queueType === "RANKED_FLEX_SR");
      const entry = solo ?? flex ?? null;

      return {
        ...summary,
        rankedInfo: entry
          ? {
              tier: entry.tier,
              rank: entry.rank,
              leaguePoints: entry.leaguePoints,
              wins: entry.wins,
              losses: entry.losses,
            }
          : null,
      };
    })
  );

  // 6. Split into ally / enemy based on the searched summoner's teamId
  const searchedPlayer = playerSummaries.find(
    (p) => p.puuid === account.puuid
  );
  const myTeamId = searchedPlayer?.teamId ?? 100;

  const allyUnsorted = playerSummaries.filter((p) => p.teamId === myTeamId).slice(0, 5);
  const enemyUnsorted = playerSummaries.filter((p) => p.teamId !== myTeamId).slice(0, 5);

  // 7. buildRoleMap으로 팀 단위 1:1 라인 배정 → assignedLane + roleConfidence 설정
  const { roleMap: allyRoleMap, confidence: allyConf }  = buildRoleMap(allyUnsorted);
  const { roleMap: enemyRoleMap, confidence: enemyConf } = buildRoleMap(enemyUnsorted);

  for (const [lane, player] of allyRoleMap)  player.assignedLane = lane;
  for (const [lane, player] of enemyRoleMap) player.assignedLane = lane;

  const allConf = new Map([...allyConf, ...enemyConf]);
  for (const p of [...allyUnsorted, ...enemyUnsorted]) {
    p.roleConfidence = allConf.get(p.puuid) ?? 0;
    if (p.assignedLane === undefined) {
      // 강타 보유자 → 정글(null) 확정 (첫 번째 강타 보유자만 여기 도달; 나머지는 candidates에서 라인 배정 완료)
      // 비강타·0강타 예외 플레이어 → 최적 라인으로 배정, 절대 null 불가
      p.assignedLane = hasSmite(p) ? null : argmaxLane(p);
    }
  }

  // 8. assignedLane 기준 정렬: 탑(0) → 정글(1) → 미드(2) → 원딜(3) → 서폿(4)
  // 정글은 항상 2번째(인덱스 1) 고정, 각 라인은 1명씩만 배정됨이 보장됨 (buildRoleMap 소거법)
  const LANE_SORT: Record<string, number> = { top: 0, mid: 2, adc: 3, support: 4 };
  const byLane = (a: PlayerSummary, b: PlayerSummary) =>
    (a.assignedLane !== null ? (LANE_SORT[a.assignedLane] ?? 1) : 1) -
    (b.assignedLane !== null ? (LANE_SORT[b.assignedLane] ?? 1) : 1);

  const allyTeam  = [...allyUnsorted].sort(byLane);
  const enemyTeam = [...enemyUnsorted].sort(byLane);

  // 9. Apply pre-fetched mastery data to each player.
  //    masterySettled was fetched in parallel with matches/ranked above (step 4).
  //    Index alignment: masterySettled[i] corresponds to activeGame.participants[i],
  //    which matches the order playerSummaries was built from.
  for (let i = 0; i < playerSummaries.length; i++) {
    const r = masterySettled[i];
    playerSummaries[i].masteryData = r.status === "fulfilled" ? r.value : null;
  }

  // 10. V2 scoring pipeline (synchronous — mastery already on players)
  let v2Score: V2ScoreResult | null = null;
  try {
    v2Score = computeV2Score(allyTeam, enemyTeam);
  } catch {
    v2Score = null;
  }

  return {
    type: "live",
    data: {
      gameId: activeGame.gameId,
      gameMode: activeGame.gameMode,
      gameQueueConfigId: activeGame.gameQueueConfigId,
      gameStartTime: activeGame.gameStartTime,
      allyTeam,
      enemyTeam,
      v2Score,
    },
  };
}
