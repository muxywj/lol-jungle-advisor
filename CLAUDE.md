@AGENTS.md

# 정글 어드바이저 — 프로젝트 컨텍스트

## 프로젝트 개요
리그오브레전드 정글 유저의 초반 동선 판단을 돕는 실시간 분석 도구.
소환사명 입력 → 인게임 데이터 수집 → 라인별 투자 가치 점수 → (V3) 동선 추천.

---

## 버전 상태
| 버전 | 상태 | 내용 |
|------|------|------|
| V1 | 완료 | 소환사 검색, 인게임 10명 참여자, 최근 전적 수집 |
| V2 | 완료 | 라인별 투자 가치 점수 + 티어 표시 + 역할 예측 고도화 |
| V2+ | 완료 | Champion-Specific DNA + Positional Stability + Deterministic Gates + W/L UI |
| V3 | 예정 | 동선 추천 (정벞/역벞, 상체/하체, 주의문구) |
| V4 | 예정 | 정글러 성향, 고도화 AI 분석 |

---

## 핵심 파일 맵

### 진입점
- `src/app/page.tsx` — 메인 UI, 검색 + 결과 렌더링, 라인 스왑 로직
- `src/hooks/useLiveGameSearch.ts` — 검색 상태 관리
- `src/app/api/live-game/route.ts` — 인게임 조회 API 라우트
- `src/app/api/recent-matches/route.ts` — 최근 전적 API 라우트

### V1 데이터 파이프라인
- `src/services/liveGameService.ts` — 전체 파이프라인 (핵심)
- `src/lib/riot/client.ts` — Riot API 기본 fetch 클라이언트
- `src/lib/riot/ddragon.ts` — DDragon 챔피언·스펠 데이터 (ko_KR)
- `src/lib/riot/match.ts` — match-v5 API (전역 concurrency 3 제한 내장)
- `src/lib/riot/mastery.ts` — 챔피언 숙련도 API (champion-mastery-v4)
- `src/lib/riot/league.ts` — 랭크 티어 API (league-v4, puuid 기반)
- `src/lib/mappers/playerMapper.ts` — 참여자 → PlayerSummary 변환

### V2 점수 엔진
- `src/lib/scoring/finalLineScore.ts` — 최종 점수 계산 (핵심)
- `src/lib/scoring/matchupScore.ts` — 챔피언 태그 + 외부 통계 기반 상성 점수
- `src/lib/scoring/masteryScore.ts` — 숙련도 + 포지션 필터링된 랭크전 성적
- `src/lib/scoring/clientRescore.ts` — 라인 스왑 시 클라이언트 재점수 계산
- `src/lib/data/championTags.ts` — champion-tags.json 조회 유틸 (Object.values 변환)
- `src/lib/data/championStats.ts` — champion-stats.json 조회 유틸 (통계 보정)

### V2+ 역할 예측 고도화
- `src/lib/analysis/playerDNA.ts` — 포지션 빈도 DNA + 기세(Momentum) 분석
- `src/lib/analysis/botDuoMatcher.ts` — 봇 듀오 탐지 (서폿+원딜 먼저 확정)
- `src/lib/riot/perks.ts` — 룬 데이터 → 포지션 가중치 변환

### 데이터 파일 (점수 튜닝 / 통계 갱신 시 수정)
- `data/champion-tags.json` — 챔피언 태그 DB (172개), 숫자 키 객체 형태 `{"0":{...},...}`
- `data/spell-rules.json` — 스펠 보정 규칙
- `data/exception-rules.json` — 예외 규칙 (갱 호응, 회복력 등)
- `data/champion-stats.json` — Riot API 수집 통계 (처음엔 빈 파일, 스크립트로 채움)

### 타입
- `src/types/v2.ts` — ChampionTag (positions 포함), LaneScoreBreakdown, V2ScoreResult
- `src/types/live-game.ts` — PlayerSummary (rankedInfo, roleConfidence, playerDna, momentum 포함), LiveGameViewModel
- `src/types/match.ts` — RecentMatchSummary (championId, queueId, playedAt 포함)
- `src/types/champion-stats.ts` — ChampionStatsFile, WinRecord
- `src/types/riot.ts` — Riot API 응답 타입 (LeagueEntry 포함)

### UI 컴포넌트
- `src/components/v2/LineScorePanel.tsx` — V2 라인 점수 카드 UI
- `src/components/live/PlayerCard.tsx` — 인게임 플레이어 카드 (티어 + W/L + 인라인 라인 편집)
- `src/components/live/TeamSection.tsx` — 팀 전체 렌더링 (5명 PlayerCard 목록)
- `src/components/match/RecentMatchCard.tsx` — 최근 전적 카드

### 스크립트
- `scripts/collect-stats.ts` — Riot API 통계 수집 스크립트 (`npm run collect-stats`)

---

## 데이터 흐름

```
RiotID 입력
  → liveGameService.getLiveGame()
    → Riot API: account → summoner → activeGame
    → 10명 × 5판 매치 조회 (match-v5, 전역 concurrency 3 제한)
    → 10명 ranked 병렬 조회 (league-v4, by-puuid)
    → mapParticipant() → PlayerSummary[] (rankedInfo 포함)
        → analyzePlayerDNA(matches, currentChampId)  ← Champion-Specific DNA
        → calcRecentMomentum(matches)                ← 기세 점수
    → allyTeam / enemyTeam 분리 (.slice(0,5) 방어 캡)
    → buildRoleMap(ally) + buildRoleMap(enemy)
        → 강타 보유자 → 정글 확정, 후보 풀 제외
        → Duo-First: findBotDuo() → 서폿+원딜 먼저 확정
        → runBacktrack(lanes, pool) — 4! 전수 탐색
        → argmaxLane() — 미배정 비강타 플레이어 처리
        → roleConfidence 산출 → PlayerSummary에 적용
    → computeV2Score()
      → 아군/적군 마스터리 병렬 조회 (champion-mastery-v4)
      → calcLaneScore() × 4 (top/mid/adc/support)
        → calcMatchupScore() — 태그 기반 + champion-stats.json 보정
        → calcMasteryScore() — 포지션 필터 랭크전 성적 + 베이즈 수축
      → assembleV2Result() — 크로스레인 정규화 → V2ScoreResult
  → LiveGameViewModel { allyTeam, enemyTeam, v2Score }
    → RecentMatchesSection (검색한 플레이어 최근 전적 카드)
    → LineScorePanel (v2Score)
    → TeamSection → PlayerCard
        → 라인 배지 (인라인 편집 가능, 정글은 고정)
        → W/L 히스토리 (최근 5판, W=파랑/L=빨강 블록)
        → 승률% / 연승·연패 배지 (HOT 🔥 / TILT)
        → 기세 점수 (momentumScore)
```

---

## 역할 예측 & 라인 배정 시스템

### 정글 강타 강제 원칙
**강타(spell 11) = 정글 100% 확정.** 강타 보유자는 항상 정글로 고정되며 라인 배정 알고리즘에 진입하지 않는다.

- `candidates = team.filter((p) => !hasSmite(p))` — 강타 보유자 항상 제외
- 0강타 예외(비정상 모드)에서도 `fallback` 없음 → `argmaxLane`으로 처리
- UI(PlayerCard)에서 정글은 편집 불가 고정 배지, 라이너만 클릭하여 편집 가능

```typescript
// 비강타 플레이어가 라인 미배정 시 최적 라인 자동 산출 (null 절대 불가)
function argmaxLane(player: PlayerSummary): LaneKey {
  // scorePlayerForLane × 4라인 중 최고점 라인 반환
}
```

---

### buildRoleMap (liveGameService.ts) — 팀 단위 최적 배정

```
흐름:
  1. 강타 보유자 → 정글 확정, candidates에서 제외
  2. Duo-First: findBotDuo(candidates)
       confidence ≥ 0.35 → 서폿+원딜 확정, 나머지 2명으로 top/mid 백트래킹
       confidence < 0.35 → 4라인 전수 백트래킹 (폴백)
  3. 미배정 잔여 인원 → 빈 라인 채움 (laneLeftover 방식)
  4. 비정상 메타 판정: laneScore < 1.5 → confidence 전원 0 강제
  5. 비강타 미배정 플레이어 → argmaxLane() 으로 최적 라인 배정 (null 불가)
```

#### scorePlayerForLane — 4단계 Deterministic Gate (V2+)

기존의 단순 가중합 방식에서 **계층적 확정 게이트** 방식으로 전면 교체.
"초가스 원딜" 같은 비주류 픽 오판 방지가 핵심 목적.

```
Gate 0 (buildRoleMap 진입 전): 강타 → 정글 확정
  ↓ 비강타만 아래 게이트 진입

Gate 1: Cleanse(1) / Barrier(21) → ADC 확정 (0.90 / 0.05)
  → 원딜 전용 스펠. 이 스펠 들고 정글/탑/미드/서폿은 거의 없음

Gate 2: 챔피언 특이적 DNA ≥ 0.80 (csSampleSize ≥ 3)
  → 현재 픽 챔피언으로 플레이한 최근 게임의 포지션 빈도
  → 해당 라인 80%+ → 0.95 확정 / 다른 라인에 80%+ → 0.05 강제
  → "초가스 원딜" 플레이어가 초가스로 원딜 3판이면 즉시 원딜 확정

Gate 3: 전체 DNA ≥ 0.80 (sampleSize ≥ 5)
  → 최근 전적 전체 포지션 빈도 (챔피언 무관)
  → 단일 포지션 집중 플레이어(탑만, 서폿만 등) 빠른 확정
  → 해당 라인 80%+ → 0.92 확정 / 다른 라인에 80%+ → 0.05 강제

Gate 4: Adaptive Signal Fusion
  → sampleSize에 따라 DNA 비중 점진적 상승, 챔피언 태그 비중 감소
  → 전적이 많을수록 "실제 습관" > "챔피언 통계"
```

#### Adaptive Signal Fusion 가중치 (Gate 4)
| sampleSize | W_DNA | W_CHAMP | W_SPELL+RUNE |
|---|---|---|---|
| 0 (전적 없음) | 0.20 | 0.45 | 0.35 |
| 3판 | 0.44 | 0.29 | 0.27 |
| 5판+ | 0.60 | 0.15 | 0.25 |

- W_CHAMP이 0.45→0.15로 축소: 챔피언 통계가 플레이어 습관을 압도하지 못하게
- BOTTOM DNA ≥ 0.70이면 ADC score에 +0.50 추가 보너스 (Gate 3 미달 중간 신뢰도 보완)

---

### PlayerDNA 시스템 (playerDNA.ts)

`analyzePlayerDNA(matches, currentChampId)` 가 반환하는 `PlayerDNA` 인터페이스:

```typescript
interface PlayerDNA {
  positionFrequency: Record<string, number>;  // 전체 포지션 빈도 (시간 감쇠 적용, 합=1.0)
  sampleSize: number;                          // 유효 게임 수 (teamPosition 있는 것만)
  stability: number;                           // 포지션 안정성 지수 0~1 (엔트로피 기반)
  champSpecificFreq: Record<string, number>;  // 현재 픽 챔피언으로만 플레이한 포지션 빈도
  champSpecificSampleSize: number;            // champSpecificFreq 산출에 쓰인 게임 수
}
```

#### Positional Stability Index (stability)
```
entropy = -Σ(p × log2(p))  for each position with p > 0
maxEntropy = log2(5)        // 5포지션 균등 분포 시 최대값
stability = max(0, 1 - entropy / maxEntropy)
```
- stability = 1.0 → 단일 포지션만 플레이 (Gate 3 확정 최고 신뢰)
- stability = 0.0 → 5포지션 완전 균등 분포 (DNA 신뢰도 최저)
- Gate 3 임계값 기준: stability ≥ 0.80 ≈ 90%+ 한 포지션 집중

#### 시간 감쇠 가중치 (timeDecayWeight)
| 경과 시간 | 가중치 |
|---|---|
| 12시간 이내 | 1.00 |
| 2일 이내 | 0.70 |
| 1주 이내 | 0.45 |
| 1달 이내 | 0.20 |
| 1달 초과 | 0.08 |

---

### RecentMomentum 기세 점수 (playerDNA.ts)

`calcRecentMomentum(matches)` 가 반환하는 `RecentMomentum`:

```typescript
interface RecentMomentum {
  winRate: number;       // 최근 10판 승률 (0~1)
  avgKda: number;        // 평균 KDA (deaths=0이면 kills+assists, cap=6)
  streak: number;        // 양수=연승, 음수=연패
  isHotStreak: boolean;  // streak ≥ 3
  isColdStreak: boolean; // streak ≤ -3
  momentumScore: number; // 0~100 종합 기세 점수
}
```

```
momentumScore = 50
  + (winRate - 0.5) × 40    // ±20pt
  + (avgKda / 6) × 20 - 10  // -10~+10pt
  + clamp(streak × 2, ±10)  // 연승/연패 보너스
```

PlayerCard에서 `isHotStreak → HOT 🔥` / `isColdStreak → TILT` 배지로 표시.

---

### predictRole (playerMapper.ts) — 개인별 역할 예측 (UI 표시용)

`buildRoleMap`과 독립적으로 산출. UI PlayerCard의 `predictedRole` 표시용.

```
우선순위:
  1. 강타(spell 11)        → 정글 확정 (100%)
  2. 탈진(spell 3)         → 서폿 확정 (~90%)
  3. 치유(spell 7)         → 원딜 확정 (~82%)
  4. 챔피언 mainPosition   → 해당 역할 (jungle 제외)
  5. SR 전적 teamPosition  → JUNGLE 제외 최빈값
  6. 추정불가
```

---

### roleConfidence (신뢰도)

`buildRoleMap`이 배정한 라인에 대한 `scorePlayerForLane` 점수 = `roleConfidence`.

```
✓  (≥ 0.75) — 스펠/명확한 챔피언으로 확정에 가까운 배정
?  (0.45~0.74) — 전적·mainPosition 기반 추정
⚠  (< 0.45) — flex pick 등 불확실
```

#### 역할 예측 현실적 정확도 (V2+ Deterministic Gates 적용 후)
| 라인 | 주 신호 | 추정 정확도 |
|---|---|---|
| 정글 | Smite | ~99% |
| 원딜 | Heal / Cleanse / Barrier | ~90% |
| 서폿 | Exhaust | ~84% |
| 탑 | mainPosition + TP + DNA | ~85% |
| 미드 | mainPosition + 전적 DNA | ~83% |

4라인 전부 정확: ~62~68% / 3라인 이상 정확: ~83~89%

#### 구조적 한계
- Spectator v5 `CurrentGameParticipant`에 teamPosition 필드 없음
- 아이템 정보도 없어 시작 아이템 기반 판별 불가
- 서폿이 탈진 안 드는 경우(~35%), flex pick 스펠이 주 포지션과 같은 경우 오판 가능

---

## UI: PlayerCard 라인 편집

### 인라인 편집 패널 (절대 위치 없음)

- 정글 플레이어: 라인 배지가 `<span>` (고정, 편집 불가)
- 라이너: 라인 배지가 `<button>`, 클릭 시 카드 내부에서 인라인으로 확장
- 편집 패널: `[탑] [미드] [원딜] [서폿]` 버튼 + 오버라이드 중이면 `[원래대로]`
- 정글(null) 수동 배정 불가 — `LANE_OPTIONS`에 null 없음, `applyLaneSwap` 에서도 `lane === null` 가드

```typescript
// page.tsx applyLaneSwap 내
if (lane === null) return prev;  // 정글 수동 배정 차단
```

### 라인 스왑 로직 (applyLaneSwap)
- 팀별 독립 override map (`allyOverrides`, `enemyOverrides`)
- 목표 라인 점유자와 자동 스왑 (A→탑 설정 시 기존 탑이 A의 이전 라인으로)
- `lane === undefined` → "원래대로": 해당 플레이어 + 스왑 상대 모두 원복
- 오버라이드 상태에서 v2Score 자동 재계산 (`recomputeV2Score`)

---

## UI: W/L 히스토리 (PlayerCard)

최근 5판의 승패를 `h-5 w-5` 컬러 블록으로 표시. 데이터 없으면 "전적 데이터 없음" 폴백.

```
[W][L][W][W][L]   67%  7W / 3L  HOT 🔥
```

- W (승리): `bg-blue-600 text-blue-100`
- L (패배): `bg-red-700 text-red-100`
- 각 블록 hover tooltip: `"승리 · 8/2/5"` (결과 + KDA)
- 승률 행: `67% · 7W / 3L` + HOT / TILT 배지
- 데이터 없음: `전적 데이터 없음` (회색 텍스트)

---

## API Rate Limiting (match.ts)

### 문제
Dev API 키 제한: **20 req/s, 100 req/2min**.
10명 × 5판 = 50 match 호출이 동시 발화하면 ~50 req/s → 429 폭발 → 전원 "전적 없음".

### 해결: 전역 concurrency 3 제한

`match.ts` 모듈 레벨에 동시 match fetch 3개 제한 semaphore 내장.

```typescript
// match.ts 모듈 레벨 (모든 caller 공유)
let _activeMatchFetches = 0;
const _MAX_MATCH_CONCURRENT = 3;
const _matchQueue: Array<() => void> = [];

async function throttledGetMatch(id, region): Promise<Match> {
  // _activeMatchFetches >= 3이면 큐에서 대기
  // 완료 시 큐에서 다음 꺼내서 실행
}
```

- 전체 match fetch 속도: 동시 3개 × (300ms/call) ≈ 10 req/s (dev 한도 이내)
- 50 match 호출 완료 예상 시간: ~5초
- `getRecentMatches`는 `Promise.allSettled` + 개별 실패 skip (429 1개가 전체를 망가뜨리지 않음)
- `MATCH_COUNT_PER_PLAYER = 5` (10명 × 5판 = 50 match 호출, 100/2min 이내)

### match.ts 외 API는 제한 없음
Account, Summoner, Spectator, Ranked, Mastery는 호출 수가 적어 제한 불필요.

---

## V2 점수 공식 (상세)

### 전체 구조

```
finalScore = normalize(base + skillGapAdjustment + spellAdjustment + exceptionAdjustment)
```

matchupScore가 메인 드라이버이며, 나머지는 독립 보정항으로 처리.
라인별 개별 clamp 없이 4개 라인을 동시에 정규화하여 변별력을 보존.

---

### 1단계 — matchupScore (0~100)
**파일**: `src/lib/scoring/matchupScore.ts`

#### 아군 갱 수용력 (allyValue, 1~5)
```
base = (gankSetup×2 + ccLevel×1.5 + divePotential + burst + snowballValue×1.5) / 7
earlyScalingAdjust = (earlyPower - 3)×0.3 − (scaling - 3)×0.15
allyValue = base + earlyScalingAdjust
```
- gankSetup, ccLevel에 높은 가중치 (정글 개입 핵심 지표)
- earlyPower 높으면 보너스 / scaling 높으면(성장형) 페널티

#### 적 취약도 (enemyVulnerability, 1~5)
```
instability = 6 − laneStability
enemyVulnerability = instability − safetyPenalty(1.5) + collapseBonus(1) − fightbackReduction
fightbackReduction = (earlyPower − 3) × 0.2
```
- safeWhenBehind=true → −1.5 / hardToRecoverWhenBehind=true → +1
- 적 earlyPower 높으면 반격 가능 → 페널티

#### 합산 및 통계 보정
```
raw      = allyValue×0.55 + enemyVulnerability×0.45
tagScore = ((raw − 1) / 4) × 100

통계 보정 우선순위:
  1순위: 매치업 승률 (championId_POSITION_vs_enemyId) → ±15pt
  2순위: 포지션 승률 (championId_POSITION)            → ±10pt
  3순위: 데이터 없음                                  → 0pt

matchupScore = clamp(0, 100, tagScore + statsAdjustment)
```

---

### 2단계 — masteryScore (0~100)
**파일**: `src/lib/scoring/masteryScore.ts`

#### 숙련도 포인트 파트 (masteryPart, 0~50)
| 마스터리 포인트 | 점수 |
|---|---|
| 500,000+ | 50 |
| 300,000+ | 44 |
| 150,000+ | 38 |
| 75,000+ | 30 |
| 30,000+ | 22 |
| 10,000+ | 14 |
| ~10,000 | 6 |

#### 성과 파트 (performancePart, 0~50)
```
sample 우선순위:
  랭크전(420/440) + 포지션 + 현재챔피언
    → 랭크전 + 포지션
    → 랭크전 전체
    → SR 일반게임(400/430/490/700) 동일 체인으로 폴백

winPart = winRate × 30       (0~30)
kdaPart = (avgKda / 6) × 20  (0~20, KDA 6 cap)
```

#### 베이즈 수축
```
sampleWeight = n / (n + 5)
  → n=1: 0.17   n=5: 0.50   n=10: 0.67

performancePart = 25 + sampleWeight × (rawPerformancePart − 25)
```
데이터 없음(sampleSize=0) → `{ score: 50, sampleSize: 0 }` (neutral 고정)

---

### 3단계 — finalScore 조립
**파일**: `src/lib/scoring/finalLineScore.ts`

```
matchupDev   = matchupScore − 50
allyDev      = allyScore    − 50

allySkillAdj   = round(allyDev × 0.3)                           // 최대 ±15pt
interactionAdj = clamp(round((matchupDev + allyDev) / 10), ±10) // 최대 ±10pt

base = matchupScore + allySkillAdj + interactionAdj
```

#### 실력 차이 보정 (skillGapAdjustment, 최대 ±20pt)
```
ratio = allyScore / (allyScore + enemyScore)
skillGapAdjustment = round((ratio − 0.5) × 2 × 20)
// sampleSize=0 (전적 비공개·언랭크) → × 0.5 감쇄
```

#### 각 항목 기여 범위
| 항목 | 범위 | 역할 |
|---|---|---|
| matchupScore | 0~100 | 메인 드라이버 (태그+통계) |
| allySkillAdj | ±15pt | 아군 숙련도 독립 기여 |
| interactionAdj | ±10pt | 상성+숙련도 시너지/안티시너지 |
| skillGapAdjustment | ±20pt | 아군/적군 실력 비율 차이 |
| spellAdjustment | 규칙 합산 | 스펠 조합 시너지 |
| exceptionAdjustment | 규칙 합산 | 챔피언 특성 예외 |

#### 예외 보정 (exception-rules.json)
| 규칙 | 조건 | 보정 |
|---|---|---|
| 회복력 높은 적 | enemy.safeWhenBehind | −8pt |
| 스노우볼 취약 적 | enemy.hardToRecoverWhenBehind | +7pt |
| 육성 가치 높음 | ally.valuableWhenFed | +6pt |
| 로밍 가능 | ally.roaming ≥ 4 (미드만) | +6pt |

> 제거된 규칙: high_gank_setup, low_gank_setup, high_cc, dive_potential
> → matchupScore 내에서 이미 반영됨 (이중 반영 방지)

---

### 4단계 — 크로스레인 정규화 (assembleV2Result)
**파일**: `src/lib/scoring/finalLineScore.ts`

```
rawMax = max(top, mid, adc, support 의 finalScore)
scale  = rawMax > 100 ? 100 / rawMax : 1
finalScore = max(0, round(rawScore × scale))
```

4개 라인 중 가장 높은 점수를 100 기준으로 스케일 (라인 간 격차 보존, 압축 방지).

---

## 티어 표시

`PlayerCard.tsx`에서 `rankedInfo`를 통해 솔로랭크 우선, 없으면 자유랭크 표시.

```
league-v4 /entries/by-puuid/{puuid}  ← summonerId 대신 puuid 사용
  (spectator v5는 summonerId가 빈 값으로 오는 경우 있음)

솔로랭크(RANKED_SOLO_5x5) → 자유랭크(RANKED_FLEX_SR) 폴백 → null(언랭크)
```

표시 형식: `골드 II 75LP  38승 22패`
마스터 이상(MASTER/GRANDMASTER/CHALLENGER)은 로마자 랭크 없이 `마스터 120LP` 형식.

---

## champion-tags.json 필드 설명

```
라인전 특성 (1~5):
  earlyPower    초반 강도 (높을수록 갱 시너지 ↑)
  scaling       성장형 여부 (높을수록 초반 갱 ROI ↓)
  pushPower     웨이브 압박력
  roaming       로밍 가능성
  laneStability 라인 안정도 (낮을수록 적이 갱에 취약)
  recoveryPower 피해 후 복구력

정글 개입 특성 (1~5):
  gankSetup      갱 호응 능력 (핵심)
  ccLevel        CC 보유량 (핵심)
  burst          즉발 데미지
  divePotential  다이브 능력
  skirmishPower  난전·합류 전투력
  snowballValue  먹었을 때 스노우볼 가치

예외 규칙용 (boolean):
  safeWhenBehind           밀려도 버팀 (감점 조건)
  hardToRecoverWhenBehind  한번 밀리면 복구 불가 (가산 조건)
  igniteSensitive          점화에 취약 (스펠 시너지)
  valuableWhenFed          먹었을 때 가치 극대화 (가산 조건)

포지션 가중치 (flex pick 챔피언만):
  positions      { "mid": 0.55, "support": 0.45 } 형태
                 없으면 mainPosition: 0.9, 나머지 0.033으로 간주
```

---

## champion-stats.json 운영

```bash
# 처음 수집 (KR 챌린저, 목표 300판 ≈ 8분)
npm run collect-stats

# 더 많이 수집
npm run collect-stats -- KR 500

# 기존 데이터에 누적
npm run collect-stats -- KR 300 merge
```

---

## 중요 컨벤션

### 챔피언 이름
DDragon `ko_KR` 우선 사용:
```typescript
championName: champ?.name || p.championName || `Champ ${p.championId}`
```

### 큐타입 필터
숙련도 점수는 랭크전 우선, 없으면 SR 일반게임 폴백 (`src/lib/constants/queueTypes.ts`):
```typescript
isRankedQueue(queueId)    // 솔로랭크(420) + 자유랭크(440)
isSrNormalQueue(queueId)  // 일반게임(400/430/490/700)
```

### champion-tags.json 읽기
숫자 키 객체 형태이므로 `Object.values(rawData)`로 배열 변환 후 사용:
```typescript
// championTags.ts
const tags = Object.values(rawData) as unknown as ChampionTag[];
```

### 라인 키 vs 표시명
| 내부 (LaneKey) | Riot teamPosition | UI / 규칙 파일 |
|---|---|---|
| `"top"` | `"TOP"` | `"탑"` |
| `"mid"` | `"MIDDLE"` | `"미드"` |
| `"adc"` | `"BOTTOM"` | `"원딜"` |
| `"support"` | `"UTILITY"` | `"서폿"` |

### 팀 사이즈 방어 캡
비정상 게임 모드(ARAM, 아레나 등)에서 팀당 5명 초과 방지:
```typescript
const allyUnsorted  = playerSummaries.filter((p) => p.teamId === myTeamId).slice(0, 5);
const enemyUnsorted = playerSummaries.filter((p) => p.teamId !== myTeamId).slice(0, 5);
```

### 실패 처리
- V2 점수 계산 실패 → `v2Score = null`, UI에서 패널 미표시 (graceful degrade)
- 마스터리 API 404 → `null` 반환, masteryPart 6점(최저)으로 처리
- 전적 비공개 / 언랭크 → sampleSize=0 → masteryScore=50 neutral, skillGapAdjustment × 0.5
- 통계 데이터 없음 → statsAdjustment=0, 태그 기반 점수만 사용
- ranked API 실패 → rankedInfo=null, UI에 "언랭크" 표시
- match fetch 429 → 해당 판만 skip (Promise.allSettled), 나머지 판은 정상 표시
- recentMatches 빈 배열 → "전적 데이터 없음" 폴백 텍스트 표시

---

## 자주 쓰는 확인 명령

```bash
npx tsc --noEmit                  # 타입 오류 확인
npm run dev                       # 개발 서버 시작
npm run collect-stats             # 챔피언 통계 수집
node -e "const d=require('./data/champion-stats.json'); console.log(d._meta)"
```
