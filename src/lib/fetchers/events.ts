import { format, parseISO } from "date-fns";
import recurringData from "../../../data/recurring_events.json";
import type { Event, RecurringEventTemplate } from "../types";

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

  // 年をまたぐ（例: 11月〜3月）
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
    }),
  );
}

export async function fetchEventsForDateRange(
  startDate: string,
  endDate: string,
): Promise<Event[]> {
  const events: Event[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateStr = format(current, "yyyy-MM-dd");
    events.push(...getRecurringEventsForDate(dateStr));
    current.setDate(current.getDate() + 1);
  }

  return events;
}

export async function fetchEventsForDate(dateStr: string): Promise<Event[]> {
  return getRecurringEventsForDate(dateStr);
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
