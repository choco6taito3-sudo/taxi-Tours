/** タイトル等から日本語の日付・期間を抽出する */

export interface ParsedDateRange {
  startDate: string;
  endDate: string;
}

const DATE_SINGLE =
  /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
const DATE_RANGE_FULL =
  /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日[^0-9]*?[〜～\-－][^0-9]*?(\d{1,2})月\s*(\d{1,2})日/;
const DATE_RANGE_SAME_MONTH =
  /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日[^0-9]*?[〜～\-－][^0-9]*?(\d{1,2})日/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDateRangeFromText(text: string): ParsedDateRange | null {
  const cleaned = text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const full = cleaned.match(DATE_RANGE_FULL);
  if (full) {
    const y = Number(full[1]);
    const m1 = Number(full[2]);
    const d1 = Number(full[3]);
    const m2 = Number(full[4]);
    const d2 = Number(full[5]);
    return {
      startDate: toIso(y, m1, d1),
      endDate: toIso(y, m2, d2),
    };
  }

  const sameMonth = cleaned.match(DATE_RANGE_SAME_MONTH);
  if (sameMonth) {
    const y = Number(sameMonth[1]);
    const m = Number(sameMonth[2]);
    const d1 = Number(sameMonth[3]);
    const d2 = Number(sameMonth[4]);
    return {
      startDate: toIso(y, m, d1),
      endDate: toIso(y, m, d2),
    };
  }

  const singles = [...cleaned.matchAll(DATE_SINGLE)];
  if (singles.length > 0) {
    const last = singles[singles.length - 1];
    const iso = toIso(Number(last[1]), Number(last[2]), Number(last[3]));
    return { startDate: iso, endDate: iso };
  }

  return null;
}

export function dateInRange(dateStr: string, range: ParsedDateRange): boolean {
  return dateStr >= range.startDate && dateStr <= range.endDate;
}
