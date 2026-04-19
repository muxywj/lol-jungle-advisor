"use client";

import { useState } from "react";
import type { PlatformRegion } from "@/types/common";
import { REGION_LABELS, DEFAULT_REGION } from "@/lib/constants/regions";

interface Props {
  onSearch: (riotId: string, region: PlatformRegion) => void;
  isLoading: boolean;
}

export default function RiotIdSearchForm({ onSearch, isLoading }: Props) {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState<PlatformRegion>(DEFAULT_REGION);
  const [inputError, setInputError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();

    if (!trimmed.includes("#")) {
      setInputError("# 를 포함한 Riot ID를 입력해주세요. 예: Hide on bush#KR1");
      return;
    }
    const [gameName, tagLine] = trimmed.split("#");
    if (!gameName?.trim() || !tagLine?.trim()) {
      setInputError("닉네임과 태그가 모두 필요합니다. 예: Hide on bush#KR1");
      return;
    }

    setInputError("");
    onSearch(trimmed, region);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Region selector */}
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as PlatformRegion)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44"
        >
          {(Object.entries(REGION_LABELS) as [PlatformRegion, string][]).map(
            ([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            )
          )}
        </select>

        {/* Riot ID input */}
        <input
          type="text"
          value={riotId}
          onChange={(e) => {
            setRiotId(e.target.value);
            if (inputError) setInputError("");
          }}
          placeholder="Riot ID 입력  예: Hide on bush#KR1"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />

        {/* Search button */}
        <button
          type="submit"
          disabled={isLoading || !riotId.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "검색 중..." : "검색"}
        </button>
      </div>

      {inputError && (
        <p className="mt-2 text-xs text-red-400">{inputError}</p>
      )}
    </form>
  );
}
