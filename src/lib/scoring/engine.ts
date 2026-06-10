import { getDay, parseISO } from "date-fns";
import { SAPPORO_CITY_AREAS, distanceKm } from "../areas";
import {
  ALL_TIME_SLOTS,
  TIME_SLOT_LABELS,
  getCurrentTimeSlot,
} from "../operating-hours";
import type {
  Area,
  AreaRecommendation,
  DailyWeather,
  Event,
  TimeSlot,
} from "../types";

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
): { boost: number; reasons: string[] } {
  let boost = 0;
  const reasons: string[] = [];

  for (const event of events) {
    const dist = distanceKm(area.lat, area.lng, event.lat, event.lng);
    if (dist > 8) continue;

    const proximityFactor = Math.max(0, 1 - dist / 8);
    const sizeFactor = Math.min(1, event.estimatedAttendance / 500000);
    const eventBoost = proximityFactor * sizeFactor * 40;
    boost += eventBoost;

    if (eventBoost > 5) {
      reasons.push(`${event.title}（${dist.toFixed(1)}km）`);
    }

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

  return { boost, reasons };
}

function getSeasonBoost(area: Area, month: number): number {
  let boost = 0;

  if (month >= 6 && month <= 8 && area.type === "leisure") boost += 8;
  if (month === 2 && area.type === "downtown") boost += 15;
  if (month >= 12 || month <= 2) {
    if (area.type === "leisure" || area.type === "residential") boost += 5;
  }

  return boost;
}

function scoreToLevel(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function scoreArea(
  area: Area,
  weather: DailyWeather,
  events: Event[],
  slot: TimeSlot,
  dateStr: string,
): AreaRecommendation {
  const date = parseISO(dateStr);
  const dayOfWeek = getDay(date);
  const month = date.getMonth() + 1;

  const reasons: string[] = [];
  let score = area.baseWeight * 0.5;

  const timeBoost = getTimeSlotBoost(area, slot, dayOfWeek);
  score += timeBoost;
  if (timeBoost >= 10) reasons.push(`${TIME_SLOT_LABELS[slot]}の需要パターン`);

  const weatherBoost = getWeatherBoost(area, weather);
  score += weatherBoost;
  if (weatherBoost >= 10) {
    if (weather.precipitation > 1 || weather.snowfall > 1) {
      reasons.push(`${weather.label}でタクシー需要↑`);
    } else {
      reasons.push(`好天で${area.name}方面`);
    }
  }

  const { boost: eventBoost, reasons: eventReasons } = getEventBoost(
    area,
    events,
    slot,
  );
  score += eventBoost;
  reasons.push(...eventReasons);

  score += getSeasonBoost(area, month);
  score = Math.min(100, Math.max(0, Math.round(score)));

  return {
    area,
    score,
    level: scoreToLevel(score),
    reasons: reasons.length > 0 ? reasons : ["通常需要"],
  };
}

function scoreAreasForSlot(
  slot: TimeSlot,
  dateStr: string,
  weather: DailyWeather,
  events: Event[],
  limit = 5,
): AreaRecommendation[] {
  return SAPPORO_CITY_AREAS.map((area) =>
    scoreArea(area, weather, events, slot, dateStr),
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getRecommendationsForDay(
  dateStr: string,
  weather: DailyWeather,
  events: Event[],
  currentHour?: number,
): {
  topAreas: AreaRecommendation[];
  timeSlotAreas: Record<TimeSlot, AreaRecommendation[]>;
  allAreasBySlot: Record<TimeSlot, AreaRecommendation[]>;
  currentSlot: TimeSlot | null;
  summary: string;
} {
  const timeSlotAreas = {} as Record<TimeSlot, AreaRecommendation[]>;
  const allAreasBySlot = {} as Record<TimeSlot, AreaRecommendation[]>;

  for (const slot of ALL_TIME_SLOTS) {
    const allScored = SAPPORO_CITY_AREAS.map((area) =>
      scoreArea(area, weather, events, slot, dateStr),
    ).sort((a, b) => b.score - a.score);
    allAreasBySlot[slot] = allScored;
    timeSlotAreas[slot] = allScored.slice(0, 5);
  }

  const currentSlot =
    currentHour !== undefined ? getCurrentTimeSlot(currentHour) : null;

  const slotForTop = currentSlot ?? "evening";
  const topAreas = timeSlotAreas[slotForTop].slice(0, 3);

  let summary = `本日は${weather.icon}${weather.label}（${weather.tempMin}〜${weather.tempMax}℃）。`;
  if (events.length > 0) {
    summary += `${events[0].title}など${events.length}件のイベントあり。`;
  }
  if (currentSlot) {
    summary += `今（${TIME_SLOT_LABELS[currentSlot]}）の狙い目は${topAreas.map((a) => a.area.name).join("・")}方面です。`;
  } else {
    summary += `8:00〜21:00の稼働で、夕方の狙い目は${timeSlotAreas.evening.slice(0, 3).map((a) => a.area.name).join("・")}方面です。`;
  }

  return {
    topAreas,
    timeSlotAreas,
    allAreasBySlot,
    currentSlot,
    summary,
  };
}
