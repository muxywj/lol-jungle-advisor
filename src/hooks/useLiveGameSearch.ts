"use client";

import { useState, useCallback } from "react";
import type { PlatformRegion, ApiStatus } from "@/types/common";
import type { LiveGameViewModel } from "@/types/live-game";
import type { RecentMatchSummary } from "@/types/match";

interface SearchState {
  status: ApiStatus;
  errorMessage: string;
  riotId: string;
  liveGame: LiveGameViewModel | null;
  recentMatches: RecentMatchSummary[];
}

export function useLiveGameSearch() {
  const [state, setState] = useState<SearchState>({
    status: "idle",
    errorMessage: "",
    riotId: "",
    liveGame: null,
    recentMatches: [],
  });

  const search = useCallback(
    async (riotId: string, region: PlatformRegion) => {
      setState({
        status: "loading",
        errorMessage: "",
        riotId,
        liveGame: null,
        recentMatches: [],
      });

      const params = new URLSearchParams({ riotId, region });

      // Fetch recent matches and live game in parallel
      const [recentRes, liveRes] = await Promise.allSettled([
        fetch(`/api/recent-matches?${params}`),
        fetch(`/api/live-game?${params}`),
      ]);

      // Parse recent matches
      let recentMatches: RecentMatchSummary[] = [];
      if (recentRes.status === "fulfilled" && recentRes.value.ok) {
        const json = await recentRes.value.json();
        recentMatches = json.summaries ?? [];
      }

      // Parse live game
      if (liveRes.status === "fulfilled") {
        const res = liveRes.value;
        const json = await res.json();

        if (res.ok && json.type === "live") {
          setState({
            status: "success",
            errorMessage: "",
            riotId,
            liveGame: json.data,
            recentMatches,
          });
          return;
        }

        const errorCode = json.error as ApiStatus;
        if (errorCode === "not_in_game") {
          setState({
            status: "not_in_game",
            errorMessage: json.message,
            riotId,
            liveGame: null,
            recentMatches,
          });
          return;
        }

        setState({
          status: errorCode ?? "server_error",
          errorMessage: json.message ?? "알 수 없는 오류가 발생했습니다.",
          riotId,
          liveGame: null,
          recentMatches,
        });
        return;
      }

      setState({
        status: "server_error",
        errorMessage: "서버에 연결할 수 없습니다.",
        riotId,
        liveGame: null,
        recentMatches,
      });
    },
    []
  );

  return { ...state, search };
}
