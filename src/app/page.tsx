"use client";

import { useState, useCallback, useMemo } from "react";
import type { PlatformRegion } from "@/types/common";
import type { LaneKey } from "@/types/v2";
import type { PlayerSummary } from "@/types/live-game";
import { useLiveGameSearch } from "@/hooks/useLiveGameSearch";
import RiotIdSearchForm from "@/components/search/RiotIdSearchForm";
import RecentMatchesSection from "@/components/match/RecentMatchesSection";
import LiveGameHeader from "@/components/live/LiveGameHeader";
import TeamSection from "@/components/live/TeamSection";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";
import LineScorePanel from "@/components/v2/LineScorePanel";
import { recomputeV2Score } from "@/lib/scoring/clientRescore";

// 탑(0) → 정글(1) → 미드(2) → 원딜(3) → 서폿(4)
const LANE_SORT_ORDER: Record<string, number> = { top: 0, mid: 2, adc: 3, support: 4 };

type Overrides = Record<string, LaneKey | null>;

function getEffectiveLane(player: PlayerSummary, overrides: Overrides): LaneKey | null {
  return player.puuid in overrides ? overrides[player.puuid] : player.assignedLane;
}

function sortByEffectiveLane(players: PlayerSummary[], overrides: Overrides): PlayerSummary[] {
  return [...players].sort((a, b) => {
    const va = (() => { const l = getEffectiveLane(a, overrides); return l !== null ? (LANE_SORT_ORDER[l] ?? 1) : 1; })();
    const vb = (() => { const l = getEffectiveLane(b, overrides); return l !== null ? (LANE_SORT_ORDER[l] ?? 1) : 1; })();
    return va - vb;
  });
}

/**
 * 팀 내 라인 스왑 로직.
 * - lane = LaneKey | null : 해당 라인으로 변경 + 기존 그 라인 점유자와 자동 스왑
 * - lane = undefined      : "원래대로" — 이 플레이어 + 스왑 상대 모두 원복
 * 팀 배열을 명시적으로 받아 다른 팀에 절대 영향 없음.
 */
function applyLaneSwap(
  team: PlayerSummary[],
  prev: Overrides,
  puuid: string,
  lane: LaneKey | null | undefined
): Overrides {
  const next = { ...prev };
  const player = team.find((p) => p.puuid === puuid);
  if (!player) return prev;

  // 정글(null)로의 수동 배정 차단 — 정글은 강타 보유 여부로만 결정
  if (lane === null) return prev;

  if (lane === undefined) {
    // 원래대로: 이 플레이어의 원래 라인을 점유 중인 스왑 상대도 함께 원복
    const originalLane = player.assignedLane;
    delete next[puuid];
    if (originalLane !== null) {
      for (const p of team) {
        if (p.puuid !== puuid && getEffectiveLane(p, prev) === originalLane) {
          delete next[p.puuid];
        }
      }
    }
    return next;
  }

  const currentLane = getEffectiveLane(player, prev);

  // 목표 라인을 현재 점유 중인 다른 플레이어 찾기
  const swapTarget = team.find(
    (p) => p.puuid !== puuid && getEffectiveLane(p, prev) === lane
  );

  next[puuid] = lane;
  // 원래 라인과 같아진 경우 오버라이드 제거 (clean state)
  if (next[puuid] === player.assignedLane) delete next[puuid];

  if (swapTarget) {
    next[swapTarget.puuid] = currentLane;
    if (next[swapTarget.puuid] === swapTarget.assignedLane) delete next[swapTarget.puuid];
  }

  return next;
}

export default function Home() {
  const { status, errorMessage, riotId, liveGame, recentMatches, search } =
    useLiveGameSearch();

  // 팀별 독립 override (서로 영향 없음)
  const [allyOverrides, setAllyOverrides] = useState<Overrides>({});
  const [enemyOverrides, setEnemyOverrides] = useState<Overrides>({});

  function handleSearch(id: string, region: PlatformRegion) {
    setAllyOverrides({});
    setEnemyOverrides({});
    search(id, region);
  }

  const handleAllyLaneChange = useCallback(
    (puuid: string, lane: LaneKey | null | undefined) => {
      if (!liveGame) return;
      setAllyOverrides((prev) => applyLaneSwap(liveGame.allyTeam, prev, puuid, lane));
    },
    [liveGame]
  );

  const handleEnemyLaneChange = useCallback(
    (puuid: string, lane: LaneKey | null | undefined) => {
      if (!liveGame) return;
      setEnemyOverrides((prev) => applyLaneSwap(liveGame.enemyTeam, prev, puuid, lane));
    },
    [liveGame]
  );

  const searchedPuuid =
    liveGame
      ? ([...liveGame.allyTeam, ...liveGame.enemyTeam].find(
          (p) => p.riotId.toLowerCase() === riotId.toLowerCase()
        )?.puuid ?? "")
      : "";

  const sortedAllyTeam = useMemo(
    () => liveGame ? sortByEffectiveLane(liveGame.allyTeam, allyOverrides) : [],
    [liveGame, allyOverrides]
  );
  const sortedEnemyTeam = useMemo(
    () => liveGame ? sortByEffectiveLane(liveGame.enemyTeam, enemyOverrides) : [],
    [liveGame, enemyOverrides]
  );

  const championIconMap: Record<number, string> = {};
  if (liveGame) {
    for (const p of [...liveGame.allyTeam, ...liveGame.enemyTeam]) {
      if (p.championIconUrl) championIconMap[p.championId] = p.championIconUrl;
    }
  }

  const v2Score = useMemo(() => {
    if (!liveGame) return null;
    const hasOverrides =
      Object.keys(allyOverrides).length > 0 || Object.keys(enemyOverrides).length > 0;
    if (!hasOverrides) return liveGame.v2Score;
    return recomputeV2Score(liveGame.allyTeam, liveGame.enemyTeam, allyOverrides, enemyOverrides);
  }, [liveGame, allyOverrides, enemyOverrides]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <h1 className="text-lg font-bold text-slate-100">🌿 정글 어드바이저</h1>
            <p className="text-xs text-slate-500">실시간 인게임 정보 · V2</p>
          </div>
          <RiotIdSearchForm onSearch={handleSearch} isLoading={status === "loading"} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {status === "idle" && (
          <EmptyState
            icon="🗺️"
            title="소환사명을 검색하세요"
            description="Riot ID(닉네임#태그)를 입력하면 현재 인게임 정보를 불러옵니다."
          />
        )}

        {status === "loading" && <LoadingSpinner label="데이터를 불러오는 중입니다..." />}

        {(status === "account_not_found" ||
          status === "rate_limited" ||
          status === "server_error" ||
          status === "invalid_input") && (
          <ErrorMessage
            title={
              status === "account_not_found" ? "계정을 찾을 수 없음"
                : status === "rate_limited" ? "API 호출 한도 초과"
                : status === "invalid_input" ? "입력 오류"
                : "서버 오류"
            }
            message={errorMessage}
          />
        )}

        {status === "not_in_game" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-5 py-3">
              <span className="text-2xl">💤</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">현재 인게임 중이 아닙니다</p>
                <p className="text-xs text-slate-500">{riotId}</p>
              </div>
            </div>
            {recentMatches.length > 0 && (
              <RecentMatchesSection riotId={riotId} matches={recentMatches} />
            )}
          </div>
        )}

        {status === "success" && liveGame && (
          <div className="flex flex-col gap-8">
            <RecentMatchesSection riotId={riotId} matches={recentMatches} />
            <LiveGameHeader game={liveGame} />

            <div className="flex flex-col gap-6 lg:flex-row">
              <TeamSection
                title="우리 팀"
                players={sortedAllyTeam}
                searchedPuuid={searchedPuuid}
                teamColor="blue"
                laneOverrides={allyOverrides}
                onLaneChange={handleAllyLaneChange}
              />
              <TeamSection
                title="상대 팀"
                players={sortedEnemyTeam}
                searchedPuuid={searchedPuuid}
                teamColor="red"
                laneOverrides={enemyOverrides}
                onLaneChange={handleEnemyLaneChange}
              />
            </div>

            {v2Score && (
              <LineScorePanel score={v2Score} championIconMap={championIconMap} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
