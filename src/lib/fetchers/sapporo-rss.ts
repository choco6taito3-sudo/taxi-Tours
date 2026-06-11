import { getAreaById } from "../areas";
import type { Event, EventCategory } from "../types";
import { dateInRange, parseDateRangeFromText } from "./event-dates";

const RSS_FEEDS = [
  "https://www.city.sapporo.jp/new/shinchaku.xml",
  "https://www.city.sapporo.jp/chuo/new/chuo_new.xml",
  "https://www.city.sapporo.jp/chuo/topics/chuo_topics.xml",
  "https://www.city.sapporo.jp/kitaku/whatsnew/kitaku_new.xml",
  "https://www.city.sapporo.jp/higashi/topics/higashi_topics.xml",
  "https://www.city.sapporo.jp/shiroishi/topics/shiroishi_topics.xml",
  "https://www.city.sapporo.jp/toyohira/topics/toyohira_topics.xml",
  "https://www.city.sapporo.jp/minami/shinchaku/minami_new.xml",
  "https://www.city.sapporo.jp/nishi/topics/nishi_topics.xml",
  "https://www.city.sapporo.jp/atsubetsu/new/atsubetsu_new.xml",
];

const EVENT_KEYWORDS =
  /イベント|祭|まつり|フェス|大会|花火|コンサート|ライブ|マラソン|開催|催し|フェア|マーケット|競技会|作品展|音楽祭/;

const WARD_AREA_MAP: Record<string, string> = {
  chuo: "odori",
  kitaku: "sapporo-station",
  higashi: "shiroishi",
  shiroishi: "nango",
  toyohira: "toyohira",
  minami: "makomanai",
  nishi: "nishi-ku",
  atsubetsu: "kikusui",
  kiyota: "nango",
  teine: "teine",
};

const CACHE_HOURS = 3;

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  wardHint: string;
}

let cachedEvents: Event[] | null = null;
let cachedAt = 0;

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRssItems(xml: string, wardHint: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = decodeXml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const link = decodeXml(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "");
    const pubDate = decodeXml(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? "");
    const description = decodeXml(
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "",
    );

    if (!title || !EVENT_KEYWORDS.test(`${title} ${description}`)) continue;

    items.push({ title, link, pubDate, description, wardHint });
  }

  return items;
}

function wardFromFeedUrl(url: string): string {
  const match = url.match(/city\.sapporo\.jp\/([^/]+)/);
  return match?.[1] ?? "chuo";
}

function pubDateToIso(pubDate: string): string | null {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function inferCategory(title: string): EventCategory {
  if (/花火|マラソン|大会|競技|スポーツ/.test(title)) return "sports";
  if (/ライブ|コンサート|音楽/.test(title)) return "live";
  if (/まつり|祭|フェス|イルミ|マーケット/.test(title)) return "festival";
  if (/セミナー|研修|講座/.test(title)) return "business";
  return "other";
}

function resolveArea(wardHint: string, title: string): { areaId: string; lat: number; lng: number } {
  const wardAreaId = WARD_AREA_MAP[wardHint] ?? "odori";
  const keywordMap: [RegExp, string][] = [
    [/大通|時計台/, "odori"],
    [/すすきの|狸/, "susukino"],
    [/札幌駅/, "sapporo-station"],
    [/中島公園/, "nakajima"],
    [/真駒内/, "makomanai"],
    [/円山|神宮/, "maruyama"],
  ];

  for (const [re, areaId] of keywordMap) {
    if (re.test(title)) {
      const area = getAreaById(areaId);
      if (area) return { areaId, lat: area.lat, lng: area.lng };
    }
  }

  const area = getAreaById(wardAreaId) ?? getAreaById("odori")!;
  return { areaId: area.id, lat: area.lat, lng: area.lng };
}

async function fetchAllRssItems(): Promise<RssItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (url) => {
      const res = await fetch(url, { next: { revalidate: CACHE_HOURS * 3600 } });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssItems(xml, wardFromFeedUrl(url));
    }),
  );

  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export async function fetchSapporoRssEvents(): Promise<Event[]> {
  const now = Date.now();
  if (cachedEvents && now - cachedAt < CACHE_HOURS * 3600 * 1000) {
    return cachedEvents;
  }

  try {
    const items = await fetchAllRssItems();
    const events: Event[] = [];

    for (const item of items) {
      const text = `${item.title} ${item.description}`;
      const parsed = parseDateRangeFromText(text);
      const pubIso = pubDateToIso(item.pubDate);
      const startDate = parsed?.startDate ?? pubIso;
      if (!startDate) continue;

      const endDate = parsed?.endDate ?? startDate;
      const category = inferCategory(item.title);
      const { areaId, lat, lng } = resolveArea(item.wardHint, item.title);
      const slug = Buffer.from(item.link).toString("base64url").slice(0, 24);

      events.push({
        id: `rss-${slug}`,
        title: item.title,
        category,
        startAt: `${startDate}T10:00:00+09:00`,
        endAt: `${endDate}T20:00:00+09:00`,
        lat,
        lng,
        areaId,
        estimatedAttendance: 2000,
        peakHours: [12, 13, 17, 18, 19],
        source: "sapporo-rss",
        link: item.link,
        sourceLabel: "札幌市RSS",
      });
    }

    cachedEvents = events;
    cachedAt = now;
    return events;
  } catch {
    return cachedEvents ?? [];
  }
}

export function filterRssEventsForDate(events: Event[], dateStr: string): Event[] {
  return events.filter((e) => {
    const range = parseDateRangeFromText(e.title);
    if (range) return dateInRange(dateStr, range);
    const start = e.startAt.slice(0, 10);
    const end = e.endAt.slice(0, 10);
    return dateStr >= start && dateStr <= end;
  });
}
