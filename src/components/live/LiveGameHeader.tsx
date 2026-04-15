"use client";

import type { LiveGameViewModel } from "@/types/live-game";
import { getQueueLabel } from "@/lib/constants/queueTypes";

interface Props {
  game: LiveGameViewModel;
}

export default function LiveGameHeader({ game }: Props) {
  const queueLabel = getQueueLabel(game.gameQueueConfigId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-green-900/60 px-3 py-1 text-xs font-semibold text-green-400">
        인게임 중
      </span>
      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
        {queueLabel}
      </span>
      <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
        10명 참가
      </span>
    </div>
  );
}
