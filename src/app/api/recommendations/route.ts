import { format } from "date-fns";
import { NextResponse } from "next/server";
import { fetchEventsForDate } from "@/lib/fetchers/events";
import { fetchWeatherForecast } from "@/lib/fetchers/weather";
import { getRecommendationsForDay } from "@/lib/scoring/engine";
import type { DayRecommendation } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  try {
    const [{ daily }, events] = await Promise.all([
      fetchWeatherForecast(14),
      fetchEventsForDate(date),
    ]);

    const weather = daily.find((d) => d.date === date);
    if (!weather) {
      return NextResponse.json({ error: "天気データが見つかりません" }, { status: 404 });
    }

    const isToday = date === format(new Date(), "yyyy-MM-dd");
    const currentHour = isToday ? new Date().getHours() : undefined;

    const { topAreas, timeSlotAreas, currentSlot, summary } =
      getRecommendationsForDay(date, weather, events, currentHour);

    const result: DayRecommendation = {
      date,
      weather,
      events,
      topAreas,
      timeSlotAreas,
      currentSlot,
      summary,
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提案取得エラー" },
      { status: 500 },
    );
  }
}
