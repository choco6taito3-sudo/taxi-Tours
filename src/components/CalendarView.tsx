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
    high: "bg-amber-400",
    medium: "bg-sky-300",
    low: "bg-slate-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
        >
          ←
        </button>
        <h2 className="text-lg font-bold">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h2>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
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
                  ? "bg-amber-100 ring-2 ring-amber-500"
                  : "hover:bg-slate-50"
              } ${!inMonth ? "opacity-30" : ""}`}
            >
              <span
                className={`font-medium ${isToday ? "text-amber-600" : "text-slate-800"}`}
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

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-2 text-lg font-bold">
          {format(parseISO(selectedDate), "M月d日(E)の詳細", { locale: ja })}
        </h3>
        {loading ? (
          <p className="text-sm text-slate-500">読み込み中...</p>
        ) : detail ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{detail.summary}</p>
            {detail.events.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-semibold">イベント</p>
                <ul className="space-y-1">
                  {detail.events.map((e) => (
                    <li key={e.id} className="text-sm text-violet-700">
                      ・{e.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-sm font-semibold">狙い目エリア</p>
              <ul className="space-y-1">
                {detail.topAreas.map((a, i) => (
                  <li key={a.area.id} className="text-sm">
                    {i + 1}. {a.area.name}（スコア {a.score}）
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <Link
        href="/log/history"
        className="block rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-700"
      >
        過去の稼働記録を見る →
      </Link>
    </div>
  );
}
