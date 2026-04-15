"use client";

import type { RecentMatchSummary } from "@/types/match";
import RecentMatchCard from "./RecentMatchCard";

interface Props {
  riotId: string;
  matches: RecentMatchSummary[];
}

export default function RecentMatchesSection({ riotId, matches }: Props) {
  const wins = matches.filter((m) => m.win).length;
  const losses = matches.length - wins;

  return (
    <section className="w-full">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-base font-bold text-slate-100">최근 전적</h2>
        <span className="text-sm text-slate-400">{riotId}</span>
        {matches.length > 0 && (
          <span className="ml-auto text-sm text-slate-400">
            {matches.length}게임&nbsp;
            <span className="text-blue-400">{wins}승</span>&nbsp;
            <span className="text-red-400">{losses}패</span>
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-slate-500">최근 전적이 없습니다.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {matches.map((m) => (
            <RecentMatchCard key={m.matchId} match={m} />
          ))}
        </div>
      )}
    </section>
  );
}
