"use client";

import type { PlayerSummary } from "@/types/live-game";
import type { LaneKey } from "@/types/v2";
import PlayerCard from "./PlayerCard";

interface Props {
  title: string;
  players: PlayerSummary[];
  searchedPuuid: string;
  teamColor: "blue" | "red";
  laneOverrides?: Record<string, LaneKey | null>;
  onLaneChange?: (puuid: string, lane: LaneKey | null | undefined) => void;
}

export default function TeamSection({
  title,
  players,
  searchedPuuid,
  teamColor,
  laneOverrides = {},
  onLaneChange,
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
            overrideLane={player.puuid in laneOverrides ? laneOverrides[player.puuid] : undefined}
            onLaneChange={onLaneChange ? (lane) => onLaneChange(player.puuid, lane) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
