/**
 * 챔피언 통계 수집 스크립트
 *
 * 실행:
 *   npm run collect-stats                     # KR 챌린저, 매치 300판
 *   npm run collect-stats -- KR 500           # 지역 + 목표 매치 수 지정
 *   npm run collect-stats -- KR 500 merge     # 기존 데이터에 병합
 *
 * 동작 흐름:
 *   1. league-v4 챌린저 리그 조회 → 상위 N명 summonerId 수집
 *   2. summoner-v4로 각 summonerId → puuid 변환
 *   3. match-v5로 각 puuid의 최근 솔로랭크 매치 ID 조회
 *   4. match-v5로 각 매치 상세 데이터 수집
 *   5. 포지션별 챔피언 승률 + 1:1 매치업 승률 집계
 *   6. data/champion-stats.json 에 저장
 *
 * API 호출량 (목표 300판 기준):
 *   챌린저 리그 1 + puuid 50 + 매치ID 50 + 매치상세 300 ≈ 401 콜
 *   Dev key (100콜/2분) 기준 약 8분 소요
 */

import * as fs from "fs";
import * as path from "path";

// ── 설정 ──────────────────────────────────────────────────────

const REGION      = process.argv[2] ?? "KR";
const TARGET      = parseInt(process.argv[3] ?? "300", 10);
const MERGE       = process.argv[4] === "merge";
const MATCHES_PER_PLAYER = 10;
const SEED_PLAYERS       = Math.ceil(TARGET / MATCHES_PER_PLAYER);

// 리전 → API 호스트 매핑
const PLATFORM_HOST: Record<string, string> = {
  KR:   "kr.api.riotgames.com",
  JP1:  "jp1.api.riotgames.com",
  NA1:  "na1.api.riotgames.com",
  EUW1: "euw1.api.riotgames.com",
  EUN1: "eun1.api.riotgames.com",
};
const ROUTING_HOST: Record<string, string> = {
  KR:   "asia.api.riotgames.com",
  JP1:  "asia.api.riotgames.com",
  NA1:  "americas.api.riotgames.com",
  EUW1: "europe.api.riotgames.com",
  EUN1: "europe.api.riotgames.com",
};

const platform = PLATFORM_HOST[REGION];
const routing  = ROUTING_HOST[REGION];
if (!platform) {
  console.error(`지원하지 않는 리전: ${REGION}`);
  process.exit(1);
}

// ── 환경 변수 ─────────────────────────────────────────────────

function readApiKey(): string {
  const envPath = path.join(__dirname, "../.env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/RIOT_API_KEY=(.+)/);
  if (!match?.[1]?.trim()) {
    throw new Error(".env.local 에 RIOT_API_KEY 가 없습니다.");
  }
  return match[1].trim();
}

const API_KEY = readApiKey();

// ── Rate limiter ──────────────────────────────────────────────
// Dev key: 20 req/s, 100 req/2min → 안전하게 1.3초 간격(46 req/min)

const CALL_INTERVAL_MS = 1300;
let lastCallAt = 0;

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function riotFetch<T>(url: string, retries = 3): Promise<T> {
  const gap = Date.now() - lastCallAt;
  if (gap < CALL_INTERVAL_MS) await sleep(CALL_INTERVAL_MS - gap);
  lastCallAt = Date.now();

  const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? 5);
    console.log(`  Rate limited. ${retryAfter}s 대기...`);
    await sleep(retryAfter * 1000);
    return riotFetch(url, retries);
  }
  if (res.status === 404) return null as T;
  if (!res.ok) {
    if (retries > 0) {
      console.log(`  HTTP ${res.status} — ${retries}회 재시도 남음`);
      await sleep(2000);
      return riotFetch(url, retries - 1);
    }
    throw new Error(`Riot API ${res.status}: ${url}`);
  }
  return res.json() as T;
}

// ── Riot API 호출 함수 ────────────────────────────────────────

interface LeagueEntry { summonerId: string; leaguePoints: number; }
interface Summoner    { puuid: string; }
interface MatchInfo   {
  gameVersion: string;
  participants: Array<{
    puuid: string;
    championId: number;
    teamPosition: string;
    win: boolean;
  }>;
}
interface Match { info: MatchInfo; }

async function getChallengerEntries(): Promise<LeagueEntry[]> {
  const url = `https://${platform}/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`;
  const data = await riotFetch<{ entries: LeagueEntry[] }>(url);
  return data?.entries ?? [];
}

async function getSummonerPuuid(summonerId: string): Promise<string | null> {
  const url = `https://${platform}/lol/summoner/v4/summoners/${summonerId}`;
  const data = await riotFetch<Summoner>(url);
  return data?.puuid ?? null;
}

async function getMatchIds(puuid: string, count: number): Promise<string[]> {
  const url = `https://${routing}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?queue=420&count=${count}`;
  return (await riotFetch<string[]>(url)) ?? [];
}

async function getMatch(matchId: string): Promise<Match | null> {
  const url = `https://${routing}/lol/match/v5/matches/${matchId}`;
  return riotFetch<Match>(url);
}

// ── 통계 집계 ─────────────────────────────────────────────────

interface WinRecord { wins: number; total: number; winRate: number; }
interface StatsAccumulator {
  _meta: { patch: string; region: string; totalMatches: number; generatedAt: string; };
  byPosition: Record<string, Record<string, { wins: number; total: number; winRate: number; }>>;
  matchups:   Record<string, { wins: number; total: number; winRate: number; }>;
}

function bump(
  acc: Record<string, WinRecord>,
  key: string,
  win: boolean
) {
  if (!acc[key]) acc[key] = { wins: 0, total: 0, winRate: 0 };
  if (win) acc[key].wins++;
  acc[key].total++;
  acc[key].winRate = acc[key].wins / acc[key].total;
}

function processMatch(match: Match, acc: StatsAccumulator, patchVersion: string) {
  const participants = match.info.participants;
  if (!participants?.length) return;

  // 패치 버전 기록 (첫 번째 매치 기준)
  if (acc._meta.patch === "unknown" && match.info.gameVersion) {
    const parts = match.info.gameVersion.split(".");
    acc._meta.patch = `${parts[0]}.${parts[1]}`;
  }

  acc._meta.totalMatches++;

  // 포지션별 챔피언 승률 누적
  for (const p of participants) {
    const pos = p.teamPosition;
    if (!pos) continue;

    const champId = String(p.championId);
    if (!acc.byPosition[champId]) acc.byPosition[champId] = {};
    bump(
      acc.byPosition[champId] as Record<string, WinRecord>,
      pos,
      p.win
    );
  }

  // 1:1 매치업 승률 누적 (같은 포지션 상대 추출)
  const byTeamPos: Record<string, typeof participants[0][]> = {};
  for (const p of participants) {
    if (!p.teamPosition) continue;
    const key = `${p.teamPosition}_${p.win ? 100 : 200}`; // teamId 대신 win으로 팀 구분
    // teamId가 없으므로 win 여부로 팀 분리
  }

  // teamId 별로 분리
  const team100 = participants.filter(p => !p.win === false ? true : false);
  // 위 방법은 복잡하므로, win 기준으로 같은 포지션 매치업 추출

  const winners = participants.filter(p => p.win);
  const losers  = participants.filter(p => !p.win);

  for (const winner of winners) {
    if (!winner.teamPosition) continue;
    const opponent = losers.find(l => l.teamPosition === winner.teamPosition);
    if (!opponent) continue;

    const key     = `${winner.championId}_${winner.teamPosition}_vs_${opponent.championId}`;
    const keyFlip = `${opponent.championId}_${winner.teamPosition}_vs_${winner.championId}`;

    bump(acc.matchups, key,     true);   // winner 시점: 이김
    bump(acc.matchups, keyFlip, false);  // loser 시점: 짐
  }
}

// ── 진행상황 출력 ─────────────────────────────────────────────

function progress(current: number, total: number, label: string) {
  const pct   = Math.floor((current / total) * 100);
  const bar   = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}% — ${label}`.padEnd(70));
}

// ── 메인 ─────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌿 챔피언 통계 수집 시작`);
  console.log(`   리전: ${REGION} | 목표: ${TARGET}판 | 모드: ${MERGE ? "병합" : "새로 생성"}\n`);

  const statsPath = path.join(__dirname, "../data/champion-stats.json");

  // 기존 데이터 로드 (병합 모드)
  let acc: StatsAccumulator = {
    _meta: { patch: "unknown", region: REGION, totalMatches: 0, generatedAt: "" },
    byPosition: {},
    matchups: {},
  };

  if (MERGE && fs.existsSync(statsPath)) {
    acc = JSON.parse(fs.readFileSync(statsPath, "utf-8")) as StatsAccumulator;
    console.log(`  기존 데이터 로드: ${acc._meta.totalMatches}판`);
  }

  // 1. 챌린저 리그 조회
  console.log("  1/4 챌린저 리그 조회 중...");
  const entries = await getChallengerEntries();
  const top = entries
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .slice(0, SEED_PLAYERS);
  console.log(`      ${top.length}명 선택 (상위 LP 기준)\n`);

  // 2. summonerId → puuid
  console.log("  2/4 PUUID 조회 중...");
  const puuids: string[] = [];
  for (let i = 0; i < top.length; i++) {
    progress(i + 1, top.length, `${i + 1}/${top.length}`);
    const puuid = await getSummonerPuuid(top[i].summonerId);
    if (puuid) puuids.push(puuid);
  }
  console.log(`\n      ${puuids.length}명 PUUID 수집 완료\n`);

  // 3. 매치 ID 수집
  console.log("  3/4 매치 ID 수집 중...");
  const matchIdSet = new Set<string>();
  for (let i = 0; i < puuids.length; i++) {
    progress(i + 1, puuids.length, `${i + 1}/${puuids.length} (${matchIdSet.size}판 확보)`);
    const ids = await getMatchIds(puuids[i], MATCHES_PER_PLAYER);
    ids.forEach(id => matchIdSet.add(id));
    if (matchIdSet.size >= TARGET) break;
  }
  const matchIds = [...matchIdSet].slice(0, TARGET);
  console.log(`\n      ${matchIds.length}판 ID 확보\n`);

  // 4. 매치 상세 수집 + 집계
  console.log("  4/4 매치 데이터 수집 및 집계 중...");
  let processed = 0;
  for (let i = 0; i < matchIds.length; i++) {
    progress(i + 1, matchIds.length, `${i + 1}/${matchIds.length}`);
    const match = await getMatch(matchIds[i]);
    if (match) {
      processMatch(match, acc, "");
      processed++;
    }
  }
  console.log(`\n      ${processed}판 집계 완료\n`);

  // 5. 저장
  acc._meta.generatedAt = new Date().toISOString();
  acc._meta.region      = REGION;

  fs.writeFileSync(statsPath, JSON.stringify(acc, null, 2), "utf-8");

  const champCount   = Object.keys(acc.byPosition).length;
  const matchupCount = Object.keys(acc.matchups).length;
  console.log(`✅ 저장 완료: data/champion-stats.json`);
  console.log(`   총 매치: ${acc._meta.totalMatches}판`);
  console.log(`   챔피언 데이터: ${champCount}종`);
  console.log(`   매치업 데이터: ${matchupCount}건`);
  console.log(`   패치: ${acc._meta.patch}\n`);
}

main().catch(err => {
  console.error("\n❌ 오류:", err.message);
  process.exit(1);
});
