"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ReasonList } from "@/components/ReasonList";
import type { DailyWeather, DayRecommendation } from "@/lib/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weatherMap, setWeatherMap] = useState<Record<string, DailyWeather>>({});
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [detail, setDetail] = useState<DayRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/weather?days=45")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, DailyWeather> = {};
        for (const w of data.daily ?? []) {
          map[w.date] = w;
        }
        setWeatherMap(map);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/recommendations?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setDetail(data))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function getDemandLevel(dateStr: string): "high" | "medium" | "low" | null {
    const weather = weatherMap[dateStr];
    if (!weather) return null;
    if (weather.precipitation > 5 || weather.snowfall > 5) return "high";
    if (weather.precipitation > 0 || weather.snowfall > 0) return "medium";
    return "low";
  }

  const demandColors = {
    high: "bg-[var(--demand-high)]",
    medium: "bg-[var(--demand-medium)]",
    low: "bg-[var(--demand-low)]",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-lg px-3 py-2 text-muted hover:bg-surface"
        >
          ←
        </button>
        <h2 className="text-lg font-bold">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h2>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-lg px-3 py-2 text-muted hover:bg-surface"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const weather = weatherMap[dateStr];
          const demand = getDemandLevel(dateStr);
          const selected = selectedDate === dateStr;
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl p-1 text-sm ${
                selected
                  ? "bg-warm-soft ring-2 ring-[var(--warm)]"
                  : "hover:bg-surface"
              } ${!inMonth ? "opacity-30" : ""}`}
            >
              <span
                className={`font-medium ${isToday ? "text-accent-text" : "text-[var(--foreground)]"}`}
              >
                {format(day, "d")}
              </span>
              {weather && <span className="text-base">{weather.icon}</span>}
              {demand && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${demandColors[demand]}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-border-soft">
        <h3 className="mb-2 text-lg font-bold">
          {format(parseISO(selectedDate), "M月d日(E)の詳細", { locale: ja })}
        </h3>
        {loading ? (
          <p className="text-sm text-muted">読み込み中...</p>
        ) : detail ? (
          <div className="space-y-4">
            {detail.demandOverview && (
              <div className="rounded-lg bg-surface p-3">
                <p className="mb-1 text-xs font-semibold text-muted">需要概要</p>
                {detail.demandOverview.split("\n").map((line) => (
                  <p key={line} className="text-sm text-[var(--foreground-muted)]">
                    {line}
                  </p>
                ))}
              </div>
            )}
            {detail.events.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-semibold">イベント</p>
                <ul className="space-y-2">
                  {detail.events.map((e) => (
                    <li key={e.id} className="rounded-lg bg-event-soft p-2 text-sm text-event-text">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        想定{e.estimatedAttendance.toLocaleString()}人
                        {e.peakHours?.length
                          ? ` / ピーク${e.peakHours[0]}〜${e.peakHours[e.peakHours.length - 1]}時`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-semibold">狙い目エリアと需要パターン</p>
              <div className="space-y-3">
                {detail.topAreas.map((a, i) => (
                  <div
                    key={a.area.id}
                    className="rounded-lg border border-border-soft bg-surface p-3"
                  >
                    <p className="text-sm font-bold text-[var(--foreground)]">
                      {i + 1}. {a.area.name}
                      <span className="ml-2 font-normal text-muted">
                        スコア {a.score}
                      </span>
                    </p>
                    <div className="mt-2">
                      <ReasonList reasons={a.reasonDetails} compact />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Link
        href="/log/history"
        className="block rounded-xl bg-surface px-4 py-3 text-center text-sm font-medium text-muted"
      >
        過去の稼働記録を見る →
      </Link>
    </div>
  );
}
