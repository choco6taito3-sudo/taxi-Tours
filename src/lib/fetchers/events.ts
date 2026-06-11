import { format, parseISO } from "date-fns";
import recurringData from "../../../data/recurring_events.json";
import type { Event, RecurringEventTemplate } from "../types";
import {
  fetchSapporoTravelEvents,
  filterTravelEventsForDate,
} from "./sapporo-travel";
import {
  fetchSapporoRssEvents,
  filterRssEventsForDate,
} from "./sapporo-rss";

const RECURRING = recurringData as RecurringEventTemplate[];

function isDateInRecurringRange(
  template: RecurringEventTemplate,
  month: number,
  day: number,
): boolean {
  const { monthStart, dayStart, monthEnd, dayEnd } = template;

  if (monthStart <= monthEnd) {
    if (month < monthStart || month > monthEnd) return false;
    if (month === monthStart && day < dayStart) return false;
    if (month === monthEnd && day > dayEnd) return false;
    return true;
  }

  if (month > monthStart || month < monthEnd) return true;
  if (month === monthStart && day >= dayStart) return true;
  if (month === monthEnd && day <= dayEnd) return true;
  return false;
}

export function getRecurringEventsForDate(dateStr: string): Event[] {
  const date = parseISO(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  return RECURRING.filter((t) => isDateInRecurringRange(t, month, day)).map(
    (t) => ({
      id: `${t.id}-${year}`,
      title: t.title,
      category: t.category,
      startAt: `${dateStr}T09:00:00+09:00`,
      endAt: `${dateStr}T21:00:00+09:00`,
      lat: t.lat,
      lng: t.lng,
      areaId: t.areaId,
      estimatedAttendance: t.estimatedAttendance,
      peakHours: t.peakHours,
      source: "recurring",
      sourceLabel: "定例イベント",
    }),
  );
}

function normalizeTitle(title: string): string {
  return title
    .replace(/\s+/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .toLowerCase();
}

function mergeEvents(lists: Event[][]): Event[] {
  const seen = new Set<string>();
  const merged: Event[] = [];

  for (const list of lists) {
    for (const event of list) {
      const key = normalizeTitle(event.title);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(event);
    }
  }

  return merged.sort(
    (a, b) => b.estimatedAttendance - a.estimatedAttendance,
  );
}

export async function fetchEventsForDate(dateStr: string): Promise<Event[]> {
  const [travelAll, rssAll] = await Promise.all([
    fetchSapporoTravelEvents(),
    fetchSapporoRssEvents(),
  ]);

  return mergeEvents([
    getRecurringEventsForDate(dateStr),
    filterTravelEventsForDate(travelAll, dateStr),
    filterRssEventsForDate(rssAll, dateStr),
  ]);
}

export async function fetchEventsForDateRange(
  startDate: string,
  endDate: string,
): Promise<Event[]> {
  const [travelAll, rssAll] = await Promise.all([
    fetchSapporoTravelEvents(),
    fetchSapporoRssEvents(),
  ]);

  const events: Event[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateStr = format(current, "yyyy-MM-dd");
    events.push(
      ...mergeEvents([
        getRecurringEventsForDate(dateStr),
        filterTravelEventsForDate(travelAll, dateStr),
        filterRssEventsForDate(rssAll, dateStr),
      ]),
    );
    current.setDate(current.getDate() + 1);
  }

  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.id}-${e.startAt.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getEventCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    festival: "祭り",
    live: "ライブ",
    sports: "スポーツ",
    golf: "ゴルフ",
    leisure: "レジャー",
    business: "ビジネス",
    other: "その他",
  };
  return labels[category] ?? category;
}

export function getEventSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    recurring: "定例",
    "sapporo-travel": "ようこそさっぽろ",
    "sapporo-rss": "札幌市",
  };
  return labels[source] ?? source;
}
