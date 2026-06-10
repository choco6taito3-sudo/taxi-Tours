import { format, addDays } from "date-fns";
import { NextResponse } from "next/server";
import { fetchEventsForDate, fetchEventsForDateRange } from "@/lib/fetchers/events";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  try {
    if (date) {
      const events = await fetchEventsForDate(date);
      return NextResponse.json({ events });
    }

    const startDate = start ?? format(new Date(), "yyyy-MM-dd");
    const endDate = end ?? format(addDays(new Date(), 14), "yyyy-MM-dd");
    const events = await fetchEventsForDateRange(startDate, endDate);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "イベント取得エラー" },
      { status: 500 },
    );
  }
}
