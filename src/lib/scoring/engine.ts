import { getDay, parseISO } from "date-fns";
import { SAPPORO_CITY_AREAS, distanceKm } from "../areas";
import { getEventCategoryLabel } from "../fetchers/events";
import {
  ALL_TIME_SLOTS,
  TIME_SLOT_LABELS,
  getCurrentTimeSlot,
} from "../operating-hours";
import type {
  Area,
  AreaRecommendation,
  DailyWeather,
  DemandReason,
  Event,
  TimeSlot,
} from "../types";
import {
  buildAreaReason,
  buildEventReasons,
  buildSeasonReasons,
  buildTimeSlotReasons,
  buildWeatherReasons,
  buildWeekdayReasons,
  mergeReasons,
  reasonsToStrings,
} from "./reasons";
import {
  buildHistoryOverview,
  buildHistoryReason,
  getHistoryBoost,
  type HistoryPatternModel,
} from "./history";
import { getJSTWeekday } from "../utils/datetime";

export { getCurrentTimeSlot };

function getTimeSlotBoost(area: Area, slot: TimeSlot, dayOfWeek: number): number {
  let boost = 0;

  switch (slot) {
    case "morning":
      if (area.type === "station") boost += 18;
      if (area.type === "business") boost += 10;
      if (area.type === "residential") boost += 8;
      break;
    case "noon":
      if (area.type === "shopping" || area.type === "downtown") boost += 12;
      if (area.type === "business") boost += 10;
      if (area.type === "residential") boost += 10;
      if (area.type === "park") boost += 8;
      break;
    case "afternoon":
      if (area.type === "shopping") boost += 10;
      if (area.type === "venue" || area.type === "leisure") boost += 12;
      if (area.type === "residential") boost += 12;
      if (area.type === "park") boost += 10;
      break;
    case "evening":
      if (area.type === "nightlife") boost += 22;
      if (area.type === "downtown") boost += 15;
      if (area.type === "station") boost += 12;
      if (area.type === "venue") boost += 14;
      if (area.type === "residential") boost += 10;
      break;
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    if (area.type === "leisure" || area.type === "park") boost += 8;
    if (area.type === "venue") boost += 10;
    if (area.type === "residential") boost += 6;
  }

  return boost;
}

function getWeatherBoost(area: Area, weather: DailyWeather): number {
  let boost = 0;

  if (weather.precipitation > 1 || weather.snowfall > 1) {
    if (area.type === "station") boost += 20;
    if (area.type === "shopping" || area.type === "business") boost += 12;
    if (area.type === "residential") boost += 10;
  }

  if (weather.snowfall > 5) {
    if (area.type === "station") boost += 15;
    if (area.type === "residential") boost += 8;
  }

  if (weather.tempMin < -5) {
    if (area.type === "station" || area.type === "residential") boost += 8;
  }

  if (weather.windSpeedMax > 15) {
    if (area.type === "station") boost += 6;
  }

  if (
    weather.precipitation < 0.5 &&
    weather.snowfall < 0.5 &&
    weather.weatherCode <= 3
  ) {
    if (area.type === "park" || area.type === "leisure") boost += 10;
  }

  return boost;
}

function getEventBoost(
  area: Area,
  events: Event[],
  slot: TimeSlot,
): number {
  let boost = 0;

  for (const event of events) {
    const dist = distanceKm(area.lat, area.lng, event.lat, event.lng);
    if (dist > 8) continue;

    const proximityFactor = Math.max(0, 1 - dist / 8);
    const sizeFactor = Math.min(1, event.estimatedAttendance / 500000);
    boost += proximityFactor * sizeFactor * 40;

    if (event.category === "festival" && slot === "evening") {
      if (area.type === "nightlife" || area.type === "station") boost += 10;
      if (area.type === "residential") boost += 6;
    }
    if (event.category === "live" && slot === "evening") {
      if (area.type === "nightlife") boost += 15;
      if (area.type === "residential") boost += 5;
    }
    if (event.category === "sports" && slot === "morning") {
      if (area.type === "station" || area.type === "residential") boost += 8;
    }
    if (
      event.category === "golf" &&
      (slot === "morning" || slot === "afternoon")
    ) {
      if (area.type === "station" || area.type === "business") boost += 8;
    }
  }

  return boost;
}

function getSeasonBoost(area: Area, month: number): number {
  let boost = 0;

  if (month >= 6 && month <= 8 && area.type === "leisure") boost += 8;
  if (month === 2 && area.type === "downtown") boost += 15;
  if (month >= 12 || month <= 2) {
    if (area.type === "leisure" || area.type === "residential") boost += 5;
  }
  if (month >= 6 && month <= 7 && area.type === "downtown") boost += 8;

  return boost;
}

function scoreToLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function buildReasonDetails(
  area: Area,
  weather: DailyWeather,
  events: Event[],
  slot: TimeSlot,
  dateStr: string,
  history?: HistoryPatternModel | null,
): DemandReason[] {
  const date = parseISO(dateStr);
  const dayOfWeek = getDay(date);
  const month = date.getMonth() + 1;
  const jstWeekday = getJSTWeekday(date);

  const areaReason = buildAreaReason(area);
  const historyReason =
    history && buildHistoryReason(area.id, slot, jstWeekday, history);

  return mergeReasons(
    buildWeatherReasons(area, weather),
    buildEventReasons(area, events, slot),
    buildTimeSlotReasons(area, slot, dayOfWeek),
    buildWeekdayReasons(area, dayOfWeek),
    buildSeasonReasons(area, month),
    areaReason ? [areaReason] : [],
    historyReason ? [historyReason] : [],
  );
}

export function scoreArea(
  area: Area,
  weather: DailyWeather,
  events: Event[],
  slot: TimeSlot,
  dateStr: string,
  history?: HistoryPatternModel | null,
): AreaRecommendation {
  const date = parseISO(dateStr);
  const dayOfWeek = getDay(date);
  const month = date.getMonth() + 1;
  const jstWeekday = getJSTWeekday(date);

  let score = area.baseWeight * 0.5;
  score += getTimeSlotBoost(area, slot, dayOfWeek);
  score += getWeatherBoost(area, weather);
  score += getEventBoost(area, events, slot);
  score += getSeasonBoost(area, month);
  if (history) {
    score += getHistoryBoost(area.id, slot, jstWeekday, history);
  }
  score = Math.min(100, Math.max(0, Math.round(score)));

  const reasonDetails = buildReasonDetails(
    area,
    weather,
    events,
    slot,
    dateStr,
    history,
  );

  return {
    area,
    score,
    level: scoreToLevel(score),
    reasonDetails,
    reasons: reasonsToStrings(reasonDetails),
  };
}

function buildDayEventSummary(events: Event[]): string {
  if (events.length === 0) return "";
  const parts = events.slice(0, 3).map((e) => {
    const cat = getEventCategoryLabel(e.category);
    const peak = e.peakHours?.length
      ? `（ピーク${e.peakHours[0]}〜${e.peakHours[e.peakHours.length - 1]}時）`
      : "";
    return `${e.title}[${cat}]${peak}`;
  });
  return parts.join("、");
}

export function getRecommendationsForDay(
  dateStr: string,
  weather: DailyWeather,
  events: Event[],
  currentHour?: number,
  history?: HistoryPatternModel | null,
): {
  topAreas: AreaRecommendation[];
  timeSlotAreas: Record<TimeSlot, AreaRecommendation[]>;
  allAreasBySlot: Record<TimeSlot, AreaRecommendation[]>;
  currentSlot: TimeSlot | null;
  summary: string;
  demandOverview: string;
} {
  const timeSlotAreas = {} as Record<TimeSlot, AreaRecommendation[]>;
  const allAreasBySlot = {} as Record<TimeSlot, AreaRecommendation[]>;

  for (const slot of ALL_TIME_SLOTS) {
    const allScored = SAPPORO_CITY_AREAS.map((area) =>
      scoreArea(area, weather, events, slot, dateStr, history),
    ).sort((a, b) => b.score - a.score);
    allAreasBySlot[slot] = allScored;
    timeSlotAreas[slot] = allScored.slice(0, 5);
  }

  const currentSlot =
    currentHour !== undefined ? getCurrentTimeSlot(currentHour) : null;

  const slotForTop = currentSlot ?? "evening";
  const topAreas = timeSlotAreas[slotForTop].slice(0, 3);

  const weatherPart = `${weather.icon}${weather.label}（${weather.tempMin}〜${weather.tempMax}℃`;
  const precipPart =
    weather.precipitation > 0 ? `・降水${weather.precipitation}mm` : "";
  const snowPart = weather.snowfall > 0 ? `・降雪${weather.snowfall}cm` : "";

  let demandOverview = `【天候】${weatherPart}${precipPart}${snowPart}）`;
  if (weather.precipitation > 1 || weather.snowfall > 1) {
    demandOverview += " → 悪天候で駅・商業施設へのタクシー需要が上がりやすい";
  } else if (weather.weatherCode <= 3) {
    demandOverview += " → 好天でレジャー・イベント後の移動需要が見込める";
  }

  if (events.length > 0) {
    demandOverview += `\n【イベント】${buildDayEventSummary(events)}`;
    demandOverview += " → 会場終了後の繁華街・駅方面に需要集中の可能性";
  }

  if (history) {
    demandOverview += `\n${buildHistoryOverview(history)}`;
  }

  let summary = demandOverview.replace("\n", "。");
  if (currentSlot) {
    summary += ` 今（${TIME_SLOT_LABELS[currentSlot]}）の狙い目は${topAreas.map((a) => a.area.name).join("・")}方面。`;
  } else {
    summary += ` 夕方の狙い目は${timeSlotAreas.evening.slice(0, 3).map((a) => a.area.name).join("・")}方面。`;
  }

  return {
    topAreas,
    timeSlotAreas,
    allAreasBySlot,
    currentSlot,
    summary,
    demandOverview,
  };
}
