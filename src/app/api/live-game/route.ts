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
      return NextResponse.json({ type: "live", data: result.data });

    case "not_in_game":
      return NextResponse.json(
        { error: "not_in_game", message: "현재 인게임 중이 아닙니다." },
        { status: 404 }
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
