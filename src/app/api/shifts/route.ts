import { NextResponse } from "next/server";
import {
  endShift,
  getShiftByDate,
  getShiftHistory,
  startShift,
} from "@/lib/db/database";
import { getJSTDateString, getJSTNowISO } from "@/lib/utils/datetime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    if (date) {
      const shift = getShiftByDate(date);
      return NextResponse.json({ shift });
    }
    const history = getShiftHistory();
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "勤務記録取得エラー" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action: "start" | "end"; date?: string };
    const date = body.date ?? getJSTDateString();
    const now = getJSTNowISO();

    if (body.action === "start") {
      const existing = getShiftByDate(date);
      if (existing?.startedAt && !existing.endedAt) {
        return NextResponse.json({ shift: existing });
      }
      const shift = startShift(date, now);
      return NextResponse.json({ shift });
    }

    if (body.action === "end") {
      const shift = endShift(date, now);
      if (!shift) {
        return NextResponse.json({ error: "勤務記録が見つかりません" }, { status: 404 });
      }
      return NextResponse.json({ shift });
    }

    return NextResponse.json({ error: "不正なアクション" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "勤務記録エラー" },
      { status: 500 },
    );
  }
}
