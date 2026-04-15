import { NextRequest, NextResponse } from "next/server";
import type { PlatformRegion } from "@/types/common";
import { PLATFORM_TO_ROUTING } from "@/lib/constants/regions";
import { getAccountByRiotId } from "@/lib/riot/account";
import { fetchRecentMatchSummaries } from "@/services/recentMatchService";
import { parseRiotId } from "@/lib/utils/parseRiotId";
import { RiotApiError } from "@/lib/riot/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const riotId = searchParams.get("riotId") ?? "";
  const region = (searchParams.get("region") ?? "KR") as PlatformRegion;
  const count = Math.min(Number(searchParams.get("count") ?? "5"), 10);

  const parsed = parseRiotId(riotId);
  if (!parsed) {
    return NextResponse.json(
      { error: "invalid_input", message: "Riot ID 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const routingRegion = PLATFORM_TO_ROUTING[region];

  try {
    const account = await getAccountByRiotId(
      parsed.gameName,
      parsed.tagLine,
      routingRegion
    );
    const summaries = await fetchRecentMatchSummaries(
      account.puuid,
      routingRegion,
      count
    );
    return NextResponse.json({ summaries });
  } catch (err) {
    if (err instanceof RiotApiError) {
      if (err.statusCode === 404)
        return NextResponse.json(
          { error: "account_not_found", message: "존재하지 않는 계정입니다." },
          { status: 404 }
        );
      if (err.statusCode === 429)
        return NextResponse.json(
          { error: "rate_limited", message: "API 호출 한도를 초과했습니다." },
          { status: 429 }
        );
    }
    return NextResponse.json(
      { error: "server_error", message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
