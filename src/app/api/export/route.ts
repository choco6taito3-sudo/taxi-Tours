import { format } from "date-fns";
import { NextResponse } from "next/server";
import { getAreaName } from "@/lib/areas";
import { getExportData } from "@/lib/db/database";

export const runtime = "nodejs";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") ?? format(new Date(), "yyyy-MM-dd");
  const end = searchParams.get("end") ?? format(new Date(), "yyyy-MM-dd");

  try {
    const rows = getExportData(start, end);
    const header = [
      "日付",
      "勤務開始",
      "勤務終了",
      "乗車時刻",
      "乗車エリア",
      "下車時刻",
      "下車エリア",
      "売上",
      "メモ",
      "天候",
      "イベント",
    ].join(",");

    const lines = rows.map((row) => {
      let weatherLabel = "";
      let eventTitles = "";
      try {
        if (row.weather_json) {
          const w = JSON.parse(row.weather_json as string) as {
            weather?: { label?: string };
          };
          weatherLabel = w.weather?.label ?? "";
        }
        if (row.events_json) {
          const events = JSON.parse(row.events_json as string) as { title: string }[];
          eventTitles = events.map((e) => e.title).join(" / ");
        }
      } catch {
        // ignore parse errors
      }

      return [
        escapeCsv(row.date as string),
        escapeCsv(row.started_at as string),
        escapeCsv(row.ended_at as string),
        escapeCsv(row.picked_up_at as string),
        escapeCsv(
          getAreaName(row.pickup_area_id as string) ||
            (row.pickup_text as string),
        ),
        escapeCsv(row.dropped_off_at as string),
        escapeCsv(
          getAreaName(row.dropoff_area_id as string) ||
            (row.dropoff_text as string),
        ),
        escapeCsv(row.fare_amount as number),
        escapeCsv(row.memo as string),
        escapeCsv(weatherLabel),
        escapeCsv(eventTitles),
      ].join(",");
    });

    const csv = `\uFEFF${header}\n${lines.join("\n")}`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="taxi-log-${start}-${end}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "エクスポートエラー" },
      { status: 500 },
    );
  }
}
