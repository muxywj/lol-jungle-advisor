"use client";

import Image from "next/image";
import type { RecentMatchSummary } from "@/types/match";
import { formatDuration, formatRelativeTime } from "@/lib/utils/formatDuration";

interface Props {
  match: RecentMatchSummary;
}

const POSITION_LABELS: Record<string, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서폿",
};

export default function RecentMatchCard({ match }: Props) {
  const kda =
    match.deaths === 0
      ? "Perfect"
      : ((match.kills + match.assists) / match.deaths).toFixed(2);

  const positionLabel = match.teamPosition
    ? (POSITION_LABELS[match.teamPosition] ?? match.teamPosition)
    : "";

  return (
    <div
      className={`flex min-w-[180px] flex-col gap-2 rounded-lg border px-4 py-3 text-sm ${
        match.win
          ? "border-blue-800 bg-blue-950/40"
          : "border-red-900 bg-red-950/30"
      }`}
    >
      {/* Champion icon + win/lose */}
      <div className="flex items-center gap-2">
        {match.championIconUrl ? (
          <Image
            src={match.championIconUrl}
            alt={match.championName}
            width={36}
            height={36}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-slate-700" />
        )}
        <div>
          <p className="font-semibold text-slate-100">{match.championName}</p>
          <p
            className={`text-xs font-bold ${match.win ? "text-blue-400" : "text-red-400"}`}
          >
            {match.win ? "승리" : "패배"}
          </p>
        </div>
      </div>

      {/* KDA */}
      <p className="text-slate-300">
        <span className="font-semibold text-slate-100">
          {match.kills}/{match.deaths}/{match.assists}
        </span>{" "}
        <span className="text-xs text-slate-400">({kda} KDA)</span>
      </p>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-2 text-xs text-slate-500">
        <span>{match.queueType}</span>
        {positionLabel && <span>{positionLabel}</span>}
        <span>{formatDuration(match.gameDuration)}</span>
        <span>{formatRelativeTime(match.playedAt)}</span>
      </div>
    </div>
  );
}
