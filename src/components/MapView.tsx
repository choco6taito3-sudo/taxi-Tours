"use client";

import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SAPPORO_CITY_AREAS } from "@/lib/areas";
import {
  ALL_TIME_SLOTS,
  TIME_SLOT_SHORT_LABELS,
  getCurrentTimeSlot,
} from "@/lib/operating-hours";
import type { AreaRecommendation, TimeSlot } from "@/lib/types";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

function scoreToRadius(score: number): number {
  return 8 + (score / 100) * 20;
}

function scoreToColor(score: number): string {
  if (score >= 70) return "#f59e0b";
  if (score >= 45) return "#38bdf8";
  return "#94a3b8";
}

export function MapView() {
  const initialSlot = getCurrentTimeSlot() ?? "morning";
  const [slot, setSlot] = useState<TimeSlot>(initialSlot);
  const [areas, setAreas] = useState<AreaRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");
  const currentSlot = getCurrentTimeSlot();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/recommendations?date=${today}`)
      .then((r) => r.json())
      .then((data) => {
        setAreas(data.timeSlotAreas?.[slot] ?? []);
      })
      .finally(() => setLoading(false));
  }, [slot, today]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        札幌市内エリアのみ表示 / 稼働 8:00〜21:00
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ALL_TIME_SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlot(s)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              slot === s
                ? "bg-amber-500 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {TIME_SLOT_SHORT_LABELS[s]}
            {s === currentSlot && (
              <span className="ml-1 text-xs opacity-80">●</span>
            )}
          </button>
        ))}
      </div>

      <div className="h-[60vh] overflow-hidden rounded-2xl ring-1 ring-slate-200">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-slate-50 text-slate-500">
            読み込み中...
          </div>
        ) : (
          <MapContainer
            center={[43.062, 141.354]}
            zoom={12}
            className="h-full w-full"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {areas.map((rec) => (
              <CircleMarker
                key={rec.area.id}
                center={[rec.area.lat, rec.area.lng]}
                radius={scoreToRadius(rec.score)}
                pathOptions={{
                  color: scoreToColor(rec.score),
                  fillColor: scoreToColor(rec.score),
                  fillOpacity: 0.6,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{rec.area.name}</p>
                    <p>スコア: {rec.score}</p>
                    <ul>
                      {rec.reasons.map((r) => (
                        <li key={r}>・{r}</li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="mb-2 font-bold">
          {TIME_SLOT_SHORT_LABELS[slot]}の狙い目 TOP5
        </h3>
        <ol className="space-y-1 text-sm">
          {areas.map((a, i) => (
            <li key={a.area.id}>
              {i + 1}. {a.area.name}（{a.score}点）
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          札幌市内{SAPPORO_CITY_AREAS.length}エリアからスコア上位を表示
        </p>
      </div>
    </div>
  );
}
