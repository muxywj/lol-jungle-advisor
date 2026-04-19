"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { PlayerSummary } from "@/types/live-game";
import type { LaneKey } from "@/types/v2";

interface Props {
  player: PlayerSummary;
  isSearchedPlayer?: boolean;
  overrideLane?: LaneKey | null;           // undefined = 오버라이드 없음, null = 정글
  onLaneChange?: (lane: LaneKey | null | undefined) => void; // undefined = 원래대로
}

const TIER_KO: Record<string, string> = {
  IRON: "아이언", BRONZE: "브론즈", SILVER: "실버", GOLD: "골드",
  PLATINUM: "플래티넘", EMERALD: "에메랄드", DIAMOND: "다이아",
  MASTER: "마스터", GRANDMASTER: "그랜드마스터", CHALLENGER: "챌린저",
};

const TIER_COLOR: Record<string, string> = {
  IRON: "text-slate-400",
  BRONZE: "text-amber-700",
  SILVER: "text-slate-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-cyan-400",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-blue-400",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-rose-400",
  CHALLENGER: "text-yellow-300",
};

const HIGH_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

// 정글 제외 — 정글은 강타로만 확정, 수동 편집 불가
const LANE_OPTIONS: { value: LaneKey; label: string }[] = [
  { value: "top",     label: "탑" },
  { value: "mid",     label: "미드" },
  { value: "adc",     label: "원딜" },
  { value: "support", label: "서폿" },
];

const LANE_LABEL: Record<string, string> = {
  top: "탑", mid: "미드", adc: "원딜", support: "서폿",
};

const LANE_COLORS: Record<string, string> = {
  탑:   "bg-orange-900/60 text-orange-300",
  미드:  "bg-yellow-900/60 text-yellow-300",
  원딜:  "bg-blue-900/60 text-blue-300",
  서폿:  "bg-purple-900/60 text-purple-300",
  정글:  "bg-green-900/60 text-green-300",
};

const LANE_EDIT_COLORS: Record<string, string> = {
  탑:   "bg-orange-900/40 text-orange-300 hover:bg-orange-800/60 border-orange-800",
  미드:  "bg-yellow-900/40 text-yellow-300 hover:bg-yellow-800/60 border-yellow-800",
  원딜:  "bg-blue-900/40 text-blue-300 hover:bg-blue-800/60 border-blue-800",
  서폿:  "bg-purple-900/40 text-purple-300 hover:bg-purple-800/60 border-purple-800",
};

export default function PlayerCard({ player, isSearchedPlayer = false, overrideLane, onLaneChange }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const isOverridden = overrideLane !== undefined;
  const effectiveLane = isOverridden ? overrideLane : player.assignedLane;
  const isJungle = effectiveLane === null;
  const laneLabel = !isJungle && effectiveLane !== undefined
    ? (LANE_LABEL[effectiveLane] ?? effectiveLane)
    : "정글";
  const laneColorClass = LANE_COLORS[laneLabel] ?? "bg-slate-700 text-slate-400";

  // 이 카드의 실효 라인이 변경되면 편집 패널 닫기
  useEffect(() => {
    setEditOpen(false);
  }, [overrideLane]);

  const winRate =
    player.recentWins + player.recentLosses > 0
      ? Math.round(
          (player.recentWins / (player.recentWins + player.recentLosses)) * 100
        )
      : null;

  return (
    <div
      className={`rounded-lg border px-4 py-3 transition ${
        isSearchedPlayer
          ? "border-yellow-600 bg-yellow-950/30"
          : "border-slate-700 bg-slate-800/60"
      }`}
    >
      {/* Top row: champion icon + name + role badge */}
      <div className="flex items-center gap-3">
        {player.championIconUrl ? (
          <Image
            src={player.championIconUrl}
            alt={player.championName}
            width={44}
            height={44}
            className="rounded-full border-2 border-slate-600"
            unoptimized
          />
        ) : (
          <div className="h-11 w-11 rounded-full bg-slate-700" />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-semibold ${
              isSearchedPlayer ? "text-yellow-300" : "text-slate-100"
            }`}
            title={player.riotId}
          >
            {player.riotId}
          </p>
          <p className="text-xs text-slate-400">{player.championName}</p>
        </div>

        {/* 라인 배지 — 정글이면 편집 불가(고정), 라이너면 클릭 시 인라인 편집 토글 */}
        <div className="shrink-0">
          {isJungle ? (
            <span className={`flex items-center rounded px-2 py-0.5 text-xs font-semibold ${laneColorClass}`}>
              {laneLabel}
            </span>
          ) : (
            <button
              className={`flex items-center rounded px-2 py-0.5 text-xs font-semibold transition hover:opacity-80 ${laneColorClass} ${
                editOpen ? "ring-1 ring-slate-400" : ""
              }`}
              onClick={() => onLaneChange && setEditOpen((v) => !v)}
              title={onLaneChange ? "클릭하여 라인 변경" : undefined}
            >
              {laneLabel}
              {isOverridden && <span className="ml-1 text-[9px] opacity-60">✎</span>}
              {onLaneChange && (
                <span className="ml-1 text-[9px] opacity-40">{editOpen ? "▴" : "▾"}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 인라인 라인 편집 패널 — 절대 위치 없음, 카드 내부에서 확장 */}
      {editOpen && !isJungle && onLaneChange && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-700 pt-2">
          {LANE_OPTIONS.map((opt) => {
            const label = LANE_LABEL[opt.value] ?? opt.value;
            const isActive = opt.value === effectiveLane;
            return (
              <button
                key={opt.value}
                className={`flex-1 rounded border px-2 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "border-yellow-500 bg-yellow-900/40 text-yellow-300"
                    : (LANE_EDIT_COLORS[label] ?? "border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600")
                }`}
                onClick={() => {
                  onLaneChange(opt.value);
                  setEditOpen(false);
                }}
              >
                {label}
                {isActive && <span className="ml-1 opacity-60">✓</span>}
              </button>
            );
          })}
          {isOverridden && (
            <button
              className="rounded border border-slate-600 px-2 py-1 text-[10px] text-slate-500 transition hover:bg-slate-700"
              onClick={() => {
                onLaneChange(undefined);
                setEditOpen(false);
              }}
            >
              원래대로
            </button>
          )}
        </div>
      )}

      {/* Spells row */}
      <div className="mt-2 flex items-center gap-1.5">
        {[
          { iconUrl: player.spell1IconUrl, name: player.spell1Name },
          { iconUrl: player.spell2IconUrl, name: player.spell2Name },
        ].map((spell) =>
          spell.iconUrl ? (
            <Image
              key={spell.name}
              src={spell.iconUrl}
              alt={spell.name}
              width={22}
              height={22}
              className="rounded"
              title={spell.name}
              unoptimized
            />
          ) : (
            <div
              key={spell.name}
              className="h-5 w-5 rounded bg-slate-700"
              title={spell.name}
            />
          )
        )}
        <span className="text-xs text-slate-500">
          {player.spell1Name} / {player.spell2Name}
        </span>
      </div>

      {/* Ranked tier */}
      {player.rankedInfo ? (
        <p className="mt-2 text-xs">
          <span className={`font-semibold ${TIER_COLOR[player.rankedInfo.tier] ?? "text-slate-400"}`}>
            {TIER_KO[player.rankedInfo.tier] ?? player.rankedInfo.tier}
            {!HIGH_TIERS.has(player.rankedInfo.tier) && ` ${player.rankedInfo.rank}`}
          </span>
          <span className="ml-1 text-slate-400">
            {player.rankedInfo.leaguePoints}LP
          </span>
          <span className="ml-2 text-slate-500">
            {player.rankedInfo.wins}승 {player.rankedInfo.losses}패
          </span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-600">언랭크</p>
      )}

      {/* W/L history + win rate */}
      <div className="mt-2">
        {player.recentMatches.length > 0 ? (
          <div className="flex flex-wrap items-center gap-0.5">
            {[...player.recentMatches].slice(0, 10).reverse().map((m, i) => (
              <span
                key={m.matchId ?? i}
                title={`${m.win ? "승리" : "패배"} · ${m.kills}/${m.deaths}/${m.assists}`}
                className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${
                  m.win
                    ? "bg-blue-600 text-blue-100"
                    : "bg-red-700 text-red-100"
                }`}
              >
                {m.win ? "W" : "L"}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-600">전적 데이터 없음</p>
        )}
        {winRate !== null && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-300">{winRate}%</span>
            <span className="text-[10px] text-slate-500">
              <span className="text-blue-400">{player.recentWins}W</span>
              <span className="mx-0.5 text-slate-600">/</span>
              <span className="text-red-400">{player.recentLosses}L</span>
            </span>
            {player.momentum.isHotStreak && (
              <span className="rounded px-1 py-0.5 text-[9px] font-bold text-orange-300 bg-orange-900/50">
                HOT 🔥
              </span>
            )}
            {player.momentum.isColdStreak && (
              <span className="rounded px-1 py-0.5 text-[9px] font-bold text-blue-300 bg-blue-900/50">
                TILT
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
