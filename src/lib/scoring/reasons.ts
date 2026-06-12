import { distanceKm, getAreaById } from "../areas";
import { getEventCategoryLabel } from "../fetchers/events";
import { TIME_SLOT_LABELS } from "../operating-hours";
import type {
  Area,
  AreaType,
  DailyWeather,
  DemandReason,
  DemandReasonCategory,
  Event,
  TimeSlot,
} from "../types";

const AREA_TYPE_LABELS: Record<AreaType, string> = {
  station: "交通ターミナル",
  nightlife: "繁華街・歓楽街",
  downtown: "都心・商業地",
  shopping: "商店街・買い物",
  residential: "住宅地",
  park: "公園・緑地",
  venue: "会場・イベント施設",
  leisure: "レジャー・観光",
  airport: "空港アクセス",
  business: "オフィス・大学街",
};

const CATEGORY_LABELS: Record<DemandReasonCategory, string> = {
  weather: "天候",
  event: "イベント",
  timeslot: "時間帯",
  weekday: "曜日",
  season: "季節",
  area: "エリア特性",
  history: "実績",
};

export function getCategoryLabel(category: DemandReasonCategory): string {
  return CATEGORY_LABELS[category];
}

function formatAttendance(n: number): string {
  if (n >= 10000) return `${Math.round(n / 10000)}万人`;
  return `${n.toLocaleString()}人`;
}

function formatPeakHours(hours: number[]): string {
  if (hours.length === 0) return "";
  const sorted = [...hours].sort((a, b) => a - b);
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  return `${start}:00〜${end + 1}:00`;
}

export function buildTimeSlotReasons(
  area: Area,
  slot: TimeSlot,
  dayOfWeek: number,
): DemandReason[] {
  const reasons: DemandReason[] = [];
  const slotLabel = TIME_SLOT_LABELS[slot];
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const patterns: Partial<Record<TimeSlot, Partial<Record<AreaType, string>>>> = {
    morning: {
      station:
        "朝の通勤ラッシュ。札幌駅は地下鉄・JRの乗換需要が集中し、タクシーの乗車需要が高まります",
      business: "午前のビジネス移動。オフィス街への出勤・来客送迎の需要があります",
      residential:
        "朝の買い物・通院・送迎。住宅地から駅・病院方面への短距離需要が発生しやすいです",
    },
    noon: {
      shopping:
        "昼の買い物・食事需要。商店街から住宅地・職場への移動が増えます",
      downtown:
        "昼休みの移動。大通・都心部のランチタイムで周辺エリアへの需要があります",
      residential:
        "昼間の生活移動。住宅地での待機・乗車ともにチャンスがあります",
      park: "昼の散策・観光。公園周辺から次の目的地への移動需要があります",
    },
    afternoon: {
      venue:
        "イベント準備・開場前。会場周辺で早めの来場者の移動需要が始まります",
      leisure:
        "午後のレジャー移動。観光地・施設から次のスポットへの需要があります",
      residential:
        "午後の買い物・習い事送迎。学校・塾終了後の住宅地需要が増えます",
      shopping: "午後の買い物客。商業施設からの帰宅需要が発生します",
    },
    evening: {
      nightlife:
        "夕方〜夜のピーク。飲食・娯楽の終了後、繁華街→駅・住宅地への帰宅需要が最大になります",
      downtown:
        "夕方のイベント帰宅。大通・都心部から繁華街・駅方面への移動が増えます",
      station:
        "終電前の需要。夜の終盤は駅周辺で帰宅タクシー需要が高まります",
      venue:
        "イベント終了後。ライブ・スポーツ観戦後の会場→繁華街・駅方面の需要が集中します",
      residential:
        "夜の帰宅需要。繁華街・会場から住宅地への長めの乗車が期待できます",
    },
  };

  const detail = patterns[slot]?.[area.type];
  if (detail) {
    reasons.push({ category: "timeslot", text: `${slotLabel}：${detail}` });
  } else if (isWeekend) {
    reasons.push({
      category: "timeslot",
      text: `${slotLabel}：週末のこの時間帯は${AREA_TYPE_LABELS[area.type]}として通常より需要が出やすいです`,
    });
  }

  return reasons;
}

export function buildWeatherReasons(
  area: Area,
  weather: DailyWeather,
): DemandReason[] {
  const reasons: DemandReason[] = [];
  const { label, icon, precipitation, snowfall, tempMin, tempMax, windSpeedMax } =
    weather;

  if (precipitation > 1 || snowfall > 1) {
    const parts: string[] = [];
    if (precipitation > 1) parts.push(`降水${precipitation}mm`);
    if (snowfall > 1) parts.push(`降雪${snowfall}cm`);
    const target =
      area.type === "station"
        ? "駅・ターミナル"
        : area.type === "residential"
          ? "住宅地→駅・商業施設"
          : area.type === "shopping" || area.type === "business"
            ? "商業施設周辺"
            : `${area.name}方面`;

    reasons.push({
      category: "weather",
      text: `${icon}${label}（${parts.join("・")}）。歩行が困難になり${target}へのタクシー需要が上がりやすいです`,
    });
  }

  if (snowfall > 5 && (area.type === "station" || area.type === "residential")) {
    reasons.push({
      category: "weather",
      text: `積雪${snowfall}cm予報。路面状況悪化で待機・乗車ともに需要が増加します`,
    });
  }

  if (tempMin < -5) {
    reasons.push({
      category: "weather",
      text: `最低${tempMin}℃の厳寒。寒さから駅・室内施設への移動でタクシー需要↑`,
    });
  }

  if (windSpeedMax > 15) {
    reasons.push({
      category: "weather",
      text: `最大風速${windSpeedMax}m/s。歩行・自転車が困難でタクシー需要が増えます`,
    });
  }

  if (
    precipitation < 0.5 &&
    snowfall < 0.5 &&
    weather.weatherCode <= 3 &&
    (area.type === "park" || area.type === "leisure")
  ) {
    reasons.push({
      category: "weather",
      text: `好天（${tempMin}〜${tempMax}℃）。屋外レジャー後の移動需要が見込めます`,
    });
  }

  if (reasons.length === 0 && area.type === "station") {
    reasons.push({
      category: "weather",
      text: `${icon}${label}（${tempMin}〜${tempMax}℃）。天候に関わらず駅は基礎需要があります`,
    });
  }

  return reasons;
}

export function buildEventReasons(
  area: Area,
  events: Event[],
  slot: TimeSlot,
  distLimit = 8,
): DemandReason[] {
  const reasons: DemandReason[] = [];

  for (const event of events) {
    const distKm = distanceKm(area.lat, area.lng, event.lat, event.lng);
    if (distKm > distLimit) continue;

    const categoryLabel = getEventCategoryLabel(event.category);
    const attendance = formatAttendance(event.estimatedAttendance);
    const venueName = event.areaId
      ? (getAreaById(event.areaId)?.name ?? "会場")
      : "会場";
    const peakText = event.peakHours?.length
      ? `ピーク${formatPeakHours(event.peakHours)}`
      : "";

    let actionHint = "";
    switch (event.category) {
      case "festival":
        actionHint =
          slot === "evening"
            ? "祭り終了後の繁華街・駅方面への帰宅需要"
            : slot === "afternoon"
              ? "午後の来場者の移動需要"
              : "会場周辺の来場・移動需要";
        break;
      case "live":
        actionHint =
          slot === "evening"
            ? "終演後の観客が繁華街・駅方面へ移動"
            : "開場前後の会場周辺需要";
        break;
      case "sports":
        actionHint =
          slot === "morning"
            ? "大会開始前の会場→駅の移動"
            : "試合・大会終了後の帰宅需要";
        break;
      case "golf":
        actionHint =
          slot === "morning"
            ? "午前のOUT（出発）需要"
            : "午後のIN（帰着）→市内ホテル・駅方面";
        break;
      default:
        actionHint = `${venueName}周辺のイベント関連移動`;
    }

    const proximity =
      distKm < 1.5 ? "会場至近" : distKm < 4 ? "会場近郊" : `${distKm.toFixed(1)}km圏内`;

    reasons.push({
      category: "event",
      text: `「${event.title}」（${categoryLabel}・想定${attendance}）${peakText ? ` ${peakText}` : ""}。${proximity}で${actionHint}`,
    });
  }

  return reasons.slice(0, 3);
}

export function buildWeekdayReasons(
  area: Area,
  dayOfWeek: number,
): DemandReason[] {
  const reasons: DemandReason[] = [];
  const names = ["日", "月", "火", "水", "木", "金", "土"];
  const name = names[dayOfWeek];

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    if (["leisure", "park", "venue", "shopping"].includes(area.type)) {
      reasons.push({
        category: "weekday",
        text: `${name}曜日。週末はレジャー・買い物・イベントで${AREA_TYPE_LABELS[area.type]}の需要が平日より高まります`,
      });
    }
  } else if (dayOfWeek === 5) {
    if (area.type === "nightlife" || area.type === "downtown") {
      reasons.push({
        category: "weekday",
        text: "金曜夜。週末前の繁華街需要が平日より大幅に増加します",
      });
    }
  } else {
    if (area.type === "station" || area.type === "business") {
      reasons.push({
        category: "weekday",
        text: `${name}曜日。平日は通勤・ビジネス移動で基礎需要があります`,
      });
    }
  }

  return reasons;
}

export function buildSeasonReasons(area: Area, month: number): DemandReason[] {
  const reasons: DemandReason[] = [];

  if (month === 2 && area.type === "downtown") {
    reasons.push({
      category: "season",
      text: "2月は雪まつりシーズン。大通・都心部の観光客移動需要が年間最大級です",
    });
  }
  if (month >= 6 && month <= 8 && area.type === "leisure") {
    reasons.push({
      category: "season",
      text: "夏の観光シーズン。レジャー施設・観光地の移動需要が増加します",
    });
  }
  if ((month >= 12 || month <= 2) && area.type === "residential") {
    reasons.push({
      category: "season",
      text: "冬季。寒さと降雪で住宅地から駅・商業施設への需要が高まりやすいです",
    });
  }
  if (month >= 6 && month <= 7 && area.type === "downtown") {
    reasons.push({
      category: "season",
      text: "6〜7月はYOSAKOI等のイベントシーズン。都心部の移動需要が増えます",
    });
  }

  return reasons;
}

export function buildAreaReason(area: Area): DemandReason | null {
  const hints: Partial<Record<AreaType, string>> = {
    station: "市内最大の交通拠点。全天候で乗降客が集中します",
    nightlife: "すすきの・狸小路など飲食街。夜間の需要が特に高いエリアです",
    downtown: "大通公園・オフィス街。イベント・ビジネス需要の中心地です",
    venue: "ドーム・劇場等のイベント会場。開催日は終了後の需要が狙い目です",
    residential: "住宅地。繁華街・会場からの帰宅需要を取れるエリアです",
  };

  const text = hints[area.type];
  if (!text) return null;
  return { category: "area", text: `${AREA_TYPE_LABELS[area.type]}。${text}` };
}

export function mergeReasons(...groups: DemandReason[][]): DemandReason[] {
  const seen = new Set<string>();
  const result: DemandReason[] = [];
  for (const group of groups) {
    for (const r of group) {
      const key = `${r.category}:${r.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(r);
      }
    }
  }
  return result;
}

export function reasonsToStrings(details: DemandReason[]): string[] {
  return details.map((r) => `【${CATEGORY_LABELS[r.category]}】${r.text}`);
}
