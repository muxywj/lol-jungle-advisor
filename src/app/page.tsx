"use client";

import type { PlatformRegion } from "@/types/common";
import { useLiveGameSearch } from "@/hooks/useLiveGameSearch";
import RiotIdSearchForm from "@/components/search/RiotIdSearchForm";
import RecentMatchesSection from "@/components/match/RecentMatchesSection";
import LiveGameHeader from "@/components/live/LiveGameHeader";
import TeamSection from "@/components/live/TeamSection";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";

export default function Home() {
  const { status, errorMessage, riotId, liveGame, recentMatches, search } =
    useLiveGameSearch();

  function handleSearch(id: string, region: PlatformRegion) {
    search(id, region);
  }

  const searchedPuuid =
    liveGame
      ? ([...liveGame.allyTeam, ...liveGame.enemyTeam].find(
          (p) => p.riotId.toLowerCase() === riotId.toLowerCase()
        )?.puuid ?? "")
      : "";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <h1 className="text-lg font-bold text-slate-100">
              🌿 정글 어드바이저
            </h1>
            <p className="text-xs text-slate-500">
              실시간 인게임 정보 · V1
            </p>
          </div>
          <RiotIdSearchForm
            onSearch={handleSearch}
            isLoading={status === "loading"}
          />
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* Idle state */}
        {status === "idle" && (
          <EmptyState
            icon="🗺️"
            title="소환사명을 검색하세요"
            description="Riot ID(닉네임#태그)를 입력하면 현재 인게임 정보를 불러옵니다."
          />
        )}

        {/* Loading */}
        {status === "loading" && (
          <LoadingSpinner label="데이터를 불러오는 중입니다..." />
        )}

        {/* Hard errors (account not found, rate limited, server error) */}
        {(status === "account_not_found" ||
          status === "rate_limited" ||
          status === "server_error" ||
          status === "invalid_input") && (
          <ErrorMessage
            title={
              status === "account_not_found"
                ? "계정을 찾을 수 없음"
                : status === "rate_limited"
                  ? "API 호출 한도 초과"
                  : status === "invalid_input"
                    ? "입력 오류"
                    : "서버 오류"
            }
            message={errorMessage}
          />
        )}

        {/* Not in game — show recent matches only */}
        {status === "not_in_game" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-5 py-3">
              <span className="text-2xl">💤</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  현재 인게임 중이 아닙니다
                </p>
                <p className="text-xs text-slate-500">{riotId}</p>
              </div>
            </div>
            {recentMatches.length > 0 && (
              <RecentMatchesSection riotId={riotId} matches={recentMatches} />
            )}
          </div>
        )}

        {/* Success — full view */}
        {status === "success" && liveGame && (
          <div className="flex flex-col gap-8">
            {/* 1. Searched user recent matches */}
            <RecentMatchesSection riotId={riotId} matches={recentMatches} />

            {/* 2. Game summary badge */}
            <LiveGameHeader game={liveGame} />

            {/* 3. Teams side-by-side */}
            <div className="flex flex-col gap-6 lg:flex-row">
              <TeamSection
                title="우리 팀"
                players={liveGame.allyTeam}
                searchedPuuid={searchedPuuid}
                teamColor="blue"
              />
              <TeamSection
                title="상대 팀"
                players={liveGame.enemyTeam}
                searchedPuuid={searchedPuuid}
                teamColor="red"
              />
            </div>

            {/* 4. Reserved panel for V2+ scoring */}
            <aside className="rounded-lg border border-dashed border-slate-700 px-5 py-4 text-center text-xs text-slate-600">
              V2 라인 점수 · V3 동선 추천 영역 (준비 중)
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
