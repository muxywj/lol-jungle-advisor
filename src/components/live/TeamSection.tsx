"use client";

import type { PlayerSummary } from "@/types/live-game";
import PlayerCard from "./PlayerCard";

interface Props {
  title: string;
  players: PlayerSummary[];
  searchedPuuid: string;
  teamColor: "blue" | "red";
}

export default function TeamSection({
  title,
  players,
  searchedPuuid,
  teamColor,
}: Props) {
  const borderColor =
    teamColor === "blue" ? "border-blue-700" : "border-red-700";
  const titleColor =
    teamColor === "blue" ? "text-blue-400" : "text-red-400";

  return (
    <section className="flex-1">
      <h3 className={`mb-3 border-b pb-2 text-sm font-bold ${titleColor} ${borderColor}`}>
        {title}
      </h3>
      <div className="flex flex-col gap-2">
        {players.map((player) => (
          <PlayerCard
            key={player.puuid}
            player={player}
            isSearchedPlayer={player.puuid === searchedPuuid}
          />
        ))}
      </div>
    </section>
  );
}
