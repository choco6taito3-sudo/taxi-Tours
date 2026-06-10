import { format } from "date-fns";
import { NextResponse } from "next/server";
import { isSapporoCityArea } from "@/lib/areas";
import {
  createRideLog,
  getPendingRide,
  getRidesForDate,
  getShiftByDate,
  updateRideDropoff,
} from "@/lib/db/database";
import { fetchEventsForDate } from "@/lib/fetchers/events";
import { fetchCurrentWeatherSnapshot } from "@/lib/fetchers/weather";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  try {
    const rides = getRidesForDate(date);
    const shift = getShiftByDate(date);
    const pending = shift ? getPendingRide(shift.id) : null;
    return NextResponse.json({ rides, shift, pending });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "乗車記録取得エラー" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "pickup" | "dropoff";
      date?: string;
      pickupAreaId?: string;
      pickupText?: string;
      dropoffAreaId?: string;
      dropoffText?: string;
      fareAmount?: number;
      memo?: string;
      rideId?: number;
    };

    const date = body.date ?? format(new Date(), "yyyy-MM-dd");
    const shift = getShiftByDate(date);
    const [weather, events] = await Promise.all([
      fetchCurrentWeatherSnapshot(),
      fetchEventsForDate(date),
    ]);
    const context = {
      weather,
      events,
      recordedAt: new Date().toISOString(),
    };

    if (body.action === "pickup") {
      if (body.pickupAreaId && !isSapporoCityArea(body.pickupAreaId)) {
        return NextResponse.json(
          { error: "乗車場所は札幌市内のエリアのみ選択できます" },
          { status: 400 },
        );
      }
      const ride = createRideLog({
        shiftId: shift?.id ?? null,
        pickedUpAt: new Date().toISOString(),
        pickupAreaId: body.pickupAreaId ?? null,
        pickupText: body.pickupText ?? null,
        weatherJson: JSON.stringify(context),
        eventsJson: JSON.stringify(events),
      });
      return NextResponse.json({ ride });
    }

    if (body.action === "dropoff") {
      if (!body.rideId) {
        return NextResponse.json({ error: "rideIdが必要です" }, { status: 400 });
      }
      if (body.dropoffAreaId && !isSapporoCityArea(body.dropoffAreaId)) {
        return NextResponse.json(
          { error: "下車場所は札幌市内のエリアのみ選択できます" },
          { status: 400 },
        );
      }
      const ride = updateRideDropoff(body.rideId, {
        droppedOffAt: new Date().toISOString(),
        dropoffAreaId: body.dropoffAreaId ?? null,
        dropoffText: body.dropoffText ?? null,
        fareAmount: body.fareAmount ?? null,
      });
      if (!ride) {
        return NextResponse.json({ error: "乗車記録が見つかりません" }, { status: 404 });
      }
      return NextResponse.json({ ride });
    }

    return NextResponse.json({ error: "不正なアクション" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "乗車記録エラー" },
      { status: 500 },
    );
  }
}
