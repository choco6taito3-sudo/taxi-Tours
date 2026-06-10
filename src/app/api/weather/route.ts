import { NextResponse } from "next/server";
import { fetchWeatherForecast } from "@/lib/fetchers/weather";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "14");

  try {
    const data = await fetchWeatherForecast(days);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "天気取得エラー" },
      { status: 500 },
    );
  }
}
