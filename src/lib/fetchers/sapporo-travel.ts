import { getAreaById } from "../areas";
import type { Event, EventCategory } from "../types";
import { dateInRange, parseDateRangeFromText } from "./event-dates";

const API_BASE = "https://www.sapporo.travel/wp-json/wp/v2/event-list";
const CACHE_HOURS = 6;

/** ようこそさっぽろ area タクソノミー → 市内エリアID */
const AREA_TAXONOMY_MAP: Record<number, string> = {
  611: "sapporo-station",
  613: "susukino",
  612: "odori",
  3777: "nakajima",
  601: "odori",
  602: "sapporo-station",
  603: "shiroishi",
  604: "nango",
  605: "kikusui",
  606: "toyohira",
  607: "makomanai",
  608: "jozankei",
  609: "moiwa",
  610: "teine",
};

interface WpEventItem {
  id: number;
  title: { rendered: string };
  link: string;
  genre: number[];
  area: number[];
  spotcat: number[];
}

let cachedEvents: Event[] | null = null;
let cachedAt = 0;

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(item: WpEventItem): EventCategory {
  const title = stripHtml(item.title.rendered);
  if (/花火|マラソン|大会|スポーツ|競技/.test(title)) return "sports";
  if (/ライブ|コンサート|JAZZ|フェス|PMF|演劇/.test(title)) return "live";
  if (/まつり|祭|フェス|イルミ|マーケット|フェア/.test(title)) return "festival";
  if (/セミナー|展示|博覧会/.test(title)) return "business";
  if (/ビア|グルメ|マルシェ/.test(title)) return "leisure";
  return "other";
}

function estimateAttendance(category: EventCategory, title: string): number {
  if (/花火|YOSAKOI|雪まつり|マラソン/.test(title)) return 100000;
  switch (category) {
    case "festival":
      return 30000;
    case "sports":
      return 15000;
    case "live":
      return 8000;
    case "leisure":
      return 5000;
    default:
      return 3000;
  }
}

function defaultPeakHours(category: EventCategory): number[] {
  switch (category) {
    case "sports":
      return [9, 10, 11, 12, 17, 18];
    case "live":
      return [17, 18, 19, 20, 21];
    case "festival":
      return [11, 12, 17, 18, 19, 20];
    default:
      return [12, 13, 17, 18, 19];
  }
}

function resolveArea(item: WpEventItem): { areaId: string; lat: number; lng: number } {
  for (const taxId of item.area) {
    const areaId = AREA_TAXONOMY_MAP[taxId];
    if (areaId) {
      const area = getAreaById(areaId);
      if (area) return { areaId, lat: area.lat, lng: area.lng };
    }
  }

  const title = stripHtml(item.title.rendered);
  const keywordMap: [RegExp, string][] = [
    [/大通|時計台/, "odori"],
    [/すすきの|狸/, "susukino"],
    [/札幌駅|さっぽろ駅/, "sapporo-station"],
    [/中島公園/, "nakajima"],
    [/真駒内/, "makomanai"],
    [/豊平|福住/, "toyohira"],
    [/円山/, "maruyama"],
    [/北海道神宮/, "maruyama"],
  ];

  for (const [re, areaId] of keywordMap) {
    if (re.test(title)) {
      const area = getAreaById(areaId);
      if (area) return { areaId, lat: area.lat, lng: area.lng };
    }
  }

  const fallback = getAreaById("odori")!;
  return { areaId: "odori", lat: fallback.lat, lng: fallback.lng };
}

async function fetchAllWpEvents(): Promise<WpEventItem[]> {
  const items: WpEventItem[] = [];
  let page = 1;
  const perPage = 50;

  while (page <= 10) {
    const res = await fetch(
      `${API_BASE}?per_page=${perPage}&page=${page}&status=publish&lang=ja`,
      { next: { revalidate: CACHE_HOURS * 3600 } },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as WpEventItem[];
    if (batch.length === 0) break;
    items.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return items;
}

export async function fetchSapporoTravelEvents(): Promise<Event[]> {
  const now = Date.now();
  if (cachedEvents && now - cachedAt < CACHE_HOURS * 3600 * 1000) {
    return cachedEvents;
  }

  try {
    const wpItems = await fetchAllWpEvents();
    const events: Event[] = [];

    for (const item of wpItems) {
      const title = stripHtml(item.title.rendered);
      const range = parseDateRangeFromText(item.title.rendered);
      if (!range) continue;

      const category = inferCategory(item);
      const { areaId, lat, lng } = resolveArea(item);

      events.push({
        id: `travel-${item.id}`,
        title,
        category,
        startAt: `${range.startDate}T09:00:00+09:00`,
        endAt: `${range.endDate}T21:00:00+09:00`,
        lat,
        lng,
        areaId,
        estimatedAttendance: estimateAttendance(category, title),
        peakHours: defaultPeakHours(category),
        source: "sapporo-travel",
        link: item.link,
        sourceLabel: "ようこそさっぽろ",
      });
    }

    cachedEvents = events;
    cachedAt = now;
    return events;
  } catch {
    return cachedEvents ?? [];
  }
}

export function filterTravelEventsForDate(
  events: Event[],
  dateStr: string,
): Event[] {
  return events.filter((e) => {
    const range = parseDateRangeFromText(e.title);
    if (!range) {
      const start = e.startAt.slice(0, 10);
      const end = e.endAt.slice(0, 10);
      return dateStr >= start && dateStr <= end;
    }
    return dateInRange(dateStr, range);
  });
}
