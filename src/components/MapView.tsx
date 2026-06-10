"use client";

import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SAPPORO_CITY_AREAS } from "@/lib/areas";
import { getCategoryLabel } from "@/lib/scoring/reasons";
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
  if (score >= 70) return "#c9a88a";
  if (score >= 45) return "#9bb5c4";
  return "#b5afa6";
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
      <p className="text-sm text-muted">
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
                ? "bg-accent text-white"
                : "bg-surface-elevated text-muted ring-1 ring-border-soft"
            }`}
          >
            {TIME_SLOT_SHORT_LABELS[s]}
            {s === currentSlot && (
              <span className="ml-1 text-xs opacity-80">●</span>
            )}
          </button>
        ))}
      </div>

      <div className="h-[60vh] overflow-hidden rounded-2xl ring-1 ring-border-soft">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-surface text-muted">
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
                  fillOpacity: 0.55,
                }}
              >
                <Popup>
                  <div className="max-w-xs text-sm">
                    <p className="font-bold text-[#3a3835]">{rec.area.name}</p>
                    <p className="mb-2 text-[#6f6a63]">スコア: {rec.score}</p>
                    <p className="mb-1 text-xs font-semibold text-[#6f6a63]">需要パターン</p>
                    <ul className="space-y-1">
                      {rec.reasonDetails.slice(0, 4).map((r) => (
                        <li key={r.text} className="text-xs text-[#6f6a63]">
                          <span className="font-medium">[{getCategoryLabel(r.category)}]</span> {r.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-border-soft">
        <h3 className="mb-2 font-bold text-[var(--foreground)]">
          {TIME_SLOT_SHORT_LABELS[slot]}の狙い目 TOP5
        </h3>
        <ol className="space-y-1 text-sm text-[var(--foreground-muted)]">
          {areas.map((a, i) => (
            <li key={a.area.id}>
              {i + 1}. {a.area.name}（{a.score}点）
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-subtle">
          札幌市内{SAPPORO_CITY_AREAS.length}エリアからスコア上位を表示
        </p>
      </div>
    </div>
  );
}
