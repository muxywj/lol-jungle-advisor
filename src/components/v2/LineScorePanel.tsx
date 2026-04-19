"use client";

import Image from "next/image";
import type { V2ScoreResult, LaneKey, LaneScoreBreakdown } from "@/types/v2";

interface Props {
  score: V2ScoreResult;
  championIconMap?: Record<number, string>;
}

const LANE_LABEL: Record<LaneKey, string> = {
  top: "탑",
  mid: "미드",
  adc: "원딜",
  support: "서폿",
};

const LANE_ICON: Record<LaneKey, string> = {
  top: "⚔️",
  mid: "🔮",
  adc: "🏹",
  support: "🛡️",
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 45
        ? "bg-amber-400"
        : "bg-slate-600";

  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-700">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ChampionMatchup({
  allyId,
  enemyId,
  iconMap,
}: {
  allyId: number | null;
  enemyId: number | null;
  iconMap: Record<number, string>;
}) {
  const allyIcon = allyId ? iconMap[allyId] : null;
  const enemyIcon = enemyId ? iconMap[enemyId] : null;

  if (!allyIcon && !enemyIcon) return null;

  return (
    <div className="mt-2 flex items-center gap-1.5">
      {allyIcon ? (
        <Image
          src={allyIcon}
          alt="아군"
          width={24}
          height={24}
          className="rounded-full border border-blue-600"
          unoptimized
        />
      ) : (
        <div className="h-6 w-6 rounded-full border border-slate-600 bg-slate-700" />
      )}
      <span className="text-[10px] text-slate-500">vs</span>
      {enemyIcon ? (
        <Image
          src={enemyIcon}
          alt="적군"
          width={24}
          height={24}
          className="rounded-full border border-red-600"
          unoptimized
        />
      ) : (
        <div className="h-6 w-6 rounded-full border border-slate-600 bg-slate-700" />
      )}
    </div>
  );
}

// 비원딜/특수 조합 키워드 → true면 해당 라인카드를 보라색 테마로 강조
const NON_ADC_KEYWORDS = new Set(["비원딜(APC)", "비원딜(브루저)", "비원딜(탱커)"]);
const BOT_DESTROY_KEYWORDS = new Set(["봇 파괴"]);
const SPECIAL_COMBO_KEYWORDS = new Set(["단식"]);

function classifyKeywords(keywords: string[]): "nonAdc" | "botDestroy" | "special" | null {
  for (const kw of keywords) {
    if ([...NON_ADC_KEYWORDS].some((k) => kw.startsWith(k.slice(0, 4)))) return "nonAdc";
    if ([...BOT_DESTROY_KEYWORDS].some((k) => kw.includes(k))) return "botDestroy";
    if ([...SPECIAL_COMBO_KEYWORDS].some((k) => kw.includes(k))) return "special";
  }
  return null;
}

function LaneCard({
  laneKey,
  breakdown,
  rank,
  iconMap,
}: {
  laneKey: LaneKey;
  breakdown: LaneScoreBreakdown;
  rank: 1 | 2 | null;
  iconMap: Record<number, string>;
}) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const score = breakdown.finalScore;
  const isNeutral = breakdown.isNeutral === true;
  const metaType = classifyKeywords(breakdown.keywords);

  const isGood = score >= 60;
  const isMid = score >= 45;

  // 비정석 조합이면 테마 오버라이드
  const borderClass = isNeutral
    ? "border-slate-600 bg-slate-800/30"
    : metaType === "botDestroy"
      ? "border-rose-500/80 bg-rose-950/30"
      : metaType === "special"
        ? "border-violet-500/70 bg-violet-950/20"
        : metaType === "nonAdc"
          ? "border-purple-500/70 bg-purple-950/20"
          : isFirst
            ? isGood
              ? "border-emerald-500 bg-emerald-950/30"
              : isMid
                ? "border-amber-500 bg-amber-950/20"
                : "border-slate-500 bg-slate-800/40"
            : isSecond
              ? "border-amber-500/60 bg-amber-950/20"
              : "border-slate-700 bg-slate-800/40";

  const scoreColor = isNeutral
    ? "text-slate-500"
    : isFirst
      ? isGood
        ? "text-emerald-400"
        : isMid
          ? "text-amber-400"
          : "text-slate-400"
      : isSecond
        ? "text-amber-400"
        : "text-slate-300";

  const firstBadgeClass = isGood
    ? "bg-emerald-500"
    : isMid
      ? "bg-amber-500"
      : "bg-slate-500";

  return (
    <div className={`relative rounded-lg border px-4 py-3 ${borderClass}`}>
      {/* Priority badge */}
      {isFirst && !isNeutral && (
        <span className={`absolute -top-2.5 left-3 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${firstBadgeClass}`}>
          {isGood ? "1순위" : isMid ? "1순위" : "1순위 ⚠"}
        </span>
      )}
      {isSecond && !isNeutral && (
        <span className="absolute -top-2.5 left-3 rounded bg-amber-500/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
          2순위
        </span>
      )}
      {isNeutral && (
        <span className="absolute -top-2.5 left-3 rounded bg-slate-600 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
          미식별
        </span>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
          <span>{LANE_ICON[laneKey]}</span>
          {LANE_LABEL[laneKey]}
        </span>
        <div className="flex items-center gap-1.5">
          {!isNeutral && (
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
              breakdown.urgency === "매우유리" ? "bg-emerald-900/70 text-emerald-300" :
              breakdown.urgency === "유리"     ? "bg-sky-900/70 text-sky-300" :
              breakdown.urgency === "보통"     ? "bg-slate-700 text-slate-400" :
                                                 "bg-rose-900/70 text-rose-300"
            }`}>
              {breakdown.urgency}
            </span>
          )}
          <span className={`text-xl font-bold tabular-nums ${scoreColor}`}>
            {isNeutral ? "—" : breakdown.finalScore}
            {!isNeutral && (
              <span className="ml-0.5 text-xs font-normal text-slate-500">점</span>
            )}
          </span>
        </div>
      </div>

      {/* Score bar */}
      {!isNeutral && <ScoreBar score={breakdown.finalScore} />}

      {/* Champion matchup icons */}
      {!isNeutral && (
        <ChampionMatchup
          allyId={breakdown.allyChampionId}
          enemyId={breakdown.enemyChampionId}
          iconMap={iconMap}
        />
      )}

      {isNeutral ? (
        <p className="mt-2 text-[11px] text-slate-500">
          라인 배정 불가 — 플레이어 카드에서 직접 지정하세요
        </p>
      ) : (
        <>
          {/* Sub-scores */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span>상성 {breakdown.matchupScore}</span>
            <span>아군 {breakdown.allyMasteryScore}</span>
            <span>적 {breakdown.enemyMasteryScore}</span>
            {breakdown.spellAdjustment !== 0 && (
              <span className={breakdown.spellAdjustment > 0 ? "text-sky-400" : "text-rose-400"}>
                스펠 {breakdown.spellAdjustment > 0 ? "+" : ""}
                {breakdown.spellAdjustment}
              </span>
            )}
            {breakdown.exceptionAdjustment !== 0 && (
              <span className={breakdown.exceptionAdjustment > 0 ? "text-sky-400" : "text-rose-400"}>
                보정 {breakdown.exceptionAdjustment > 0 ? "+" : ""}
                {breakdown.exceptionAdjustment}
              </span>
            )}
          </div>

          {/* Keywords */}
          {breakdown.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {breakdown.keywords.slice(0, 5).map((kw) => {
                const isNonAdc = [...NON_ADC_KEYWORDS].some((k) => kw.startsWith(k.slice(0, 4)));
                const isDestroy = kw.includes("봇 파괴");
                const isSpecial = kw.includes("단식");
                const cls = isDestroy
                  ? "bg-rose-900/60 text-rose-300"
                  : isSpecial
                    ? "bg-violet-900/60 text-violet-300"
                    : isNonAdc
                      ? "bg-purple-900/60 text-purple-300"
                      : "bg-slate-700/70 text-slate-400";
                return (
                  <span key={kw} className={`rounded px-1.5 py-0.5 text-[10px] ${cls}`}>
                    {kw}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LineScorePanel({ score, championIconMap = {} }: Props) {
  const lanes: LaneKey[] = ["top", "mid", "adc", "support"];

  const nonNeutralScores = lanes
    .filter((l) => !score[l].isNeutral)
    .map((l) => score[l].finalScore);
  const maxScore = nonNeutralScores.length > 0 ? Math.max(...nonNeutralScores) : 0;
  const allLow = nonNeutralScores.length > 0 && maxScore < 45;

  function rank(lane: LaneKey): 1 | 2 | null {
    if (score[lane].isNeutral) return null;
    if (lane === score.firstPriority) return 1;
    if (lane === score.secondPriority) return 2;
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-400">
        V2 라인 투자 가치
      </h2>

      {allLow && (
        <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          전 라인 갱 효율 낮음 — 초반 동선보다 오브젝트·카운터정글 우선 검토
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {lanes.map((lane) => (
          <LaneCard
            key={lane}
            laneKey={lane}
            breakdown={score[lane]}
            rank={rank(lane)}
            iconMap={championIconMap}
          />
        ))}
      </div>
    </section>
  );
}
