import { NextRequest, NextResponse } from "next/server";
import type { PlatformRegion } from "@/types/common";
import { getLiveGame } from "@/services/liveGameService";
import { parseRiotId } from "@/lib/utils/parseRiotId";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const riotId = searchParams.get("riotId") ?? "";
  const region = (searchParams.get("region") ?? "KR") as PlatformRegion;

  // Validate input
  const parsed = parseRiotId(riotId);
  if (!parsed) {
    return NextResponse.json(
      { error: "invalid_input", message: "Riot ID 형식이 올바르지 않습니다. 예: Hide on bush#KR1" },
      { status: 400 }
    );
  }

  const result = await getLiveGame(parsed.gameName, parsed.tagLine, region);

  switch (result.type) {
    case "live":
      // Vercel Edge Cache: 동일 소환사 재검색 시 120초간 Riot API 호출 없이 CDN 응답.
      // 인게임 데이터는 2분 내 크게 변하지 않으므로 TTL 120s가 적절.
      return NextResponse.json({ type: "live", data: result.data }, {
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
      });

    case "not_in_game":
      // 챔피언 선택 중일 수 있으므로 짧게 캐시 (30초)
      return NextResponse.json(
        { error: "not_in_game", message: "현재 인게임 중이 아닙니다." },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=30" } }
      );

    case "account_not_found":
      return NextResponse.json(
        { error: "account_not_found", message: "존재하지 않는 계정입니다." },
        { status: 404 }
      );

    case "rate_limited":
      return NextResponse.json(
        { error: "rate_limited", message: "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );

    case "server_error":
      return NextResponse.json(
        { error: "server_error", message: result.message },
        { status: 500 }
      );
  }
}
