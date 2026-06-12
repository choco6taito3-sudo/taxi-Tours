const JST_TIMEZONE = "Asia/Tokyo";

/** 札幌向けアプリは常に日本時間（JST）で判定する */
export function getJSTWeekday(date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

export function getJSTHour(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIMEZONE,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number(hour);
}

export function getJSTDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: JST_TIMEZONE,
  }).format(date);
}

export function getJSTNowISO(): string {
  return new Date().toISOString();
}

export function formatJSTTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
