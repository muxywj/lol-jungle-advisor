"use client";

import Image from "next/image";
import type { PlayerSummary } from "@/types/live-game";

interface Props {
  player: PlayerSummary;
  isSearchedPlayer?: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  탑: "bg-orange-900/60 text-orange-300",
  정글: "bg-green-900/60 text-green-300",
  미드: "bg-yellow-900/60 text-yellow-300",
  원딜: "bg-blue-900/60 text-blue-300",
  서폿: "bg-purple-900/60 text-purple-300",
  추정불가: "bg-slate-700 text-slate-400",
};

export default function PlayerCard({ player, isSearchedPlayer = false }: Props) {
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
          {/* Riot ID */}
          <p
            className={`truncate text-sm font-semibold ${
              isSearchedPlayer ? "text-yellow-300" : "text-slate-100"
            }`}
            title={player.riotId}
          >
            {player.riotId}
          </p>
          {/* Champion name */}
          <p className="text-xs text-slate-400">{player.championName}</p>
        </div>

        {/* Role badge */}
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
            ROLE_COLORS[player.predictedRole] ?? ROLE_COLORS["추정불가"]
          }`}
        >
          {player.predictedRole}
        </span>
      </div>

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

      {/* Recent record */}
      {winRate !== null && (
        <p className="mt-2 text-xs text-slate-400">
          최근 {player.recentWins + player.recentLosses}게임&nbsp;
          <span className="text-blue-400">{player.recentWins}승</span>&nbsp;
          <span className="text-red-400">{player.recentLosses}패</span>&nbsp;
          <span className="text-slate-300">({winRate}%)</span>
        </p>
      )}
    </div>
  );
}
