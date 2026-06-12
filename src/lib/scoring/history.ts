import { getAreaName, isSapporoCityArea } from "../areas";
import { getRecentRidePickups } from "../db/database";
import { getCurrentTimeSlot } from "../operating-hours";
import type { DemandReason, TimeSlot } from "../types";
import { getJSTHour, getJSTWeekday } from "../utils/datetime";

const LOOKBACK_DAYS = 90;
const MIN_TOTAL_RIDES = 5;
const MAX_BOOST = 18;

export interface HistoryPatternModel {
  lookbackDays: number;
  totalRides: number;
  /** `${weekday}:${slot}` → areaId → count */
  counts: Map<string, Map<string, number>>;
  /** areaId → total pickups */
  areaTotals: Map<string, number>;
}

function slotKey(weekday: number, slot: TimeSlot): string {
  return `${weekday}:${slot}`;
}

function emptyModel(): HistoryPatternModel {
  return {
    lookbackDays: LOOKBACK_DAYS,
    totalRides: 0,
    counts: new Map(),
    areaTotals: new Map(),
  };
}

export function buildRidePatternModel(
  lookbackDays = LOOKBACK_DAYS,
): HistoryPatternModel {
  try {
    const pickups = getRecentRidePickups(lookbackDays);
    const counts = new Map<string, Map<string, number>>();
    const areaTotals = new Map<string, number>();

    for (const ride of pickups) {
      if (!ride.pickupAreaId || !isSapporoCityArea(ride.pickupAreaId)) continue;

      const date = new Date(ride.pickedUpAt);
      const hour = getJSTHour(date);
      const slot = getCurrentTimeSlot(hour);
      if (!slot) continue;

      const weekday = getJSTWeekday(date);
      const key = slotKey(weekday, slot);

      if (!counts.has(key)) counts.set(key, new Map());
      const slotMap = counts.get(key)!;
      slotMap.set(
        ride.pickupAreaId,
        (slotMap.get(ride.pickupAreaId) ?? 0) + 1,
      );
      areaTotals.set(
        ride.pickupAreaId,
        (areaTotals.get(ride.pickupAreaId) ?? 0) + 1,
      );
    }

    const totalRides = pickups.filter(
      (r) => r.pickupAreaId && isSapporoCityArea(r.pickupAreaId),
    ).length;

    return { lookbackDays, totalRides, counts, areaTotals };
  } catch {
    return emptyModel();
  }
}

export function isHistoryActive(model: HistoryPatternModel): boolean {
  return model.totalRides >= MIN_TOTAL_RIDES;
}

export function getHistoryBoost(
  areaId: string,
  slot: TimeSlot,
  weekday: number,
  model: HistoryPatternModel,
): number {
  if (!isHistoryActive(model)) return 0;

  const key = slotKey(weekday, slot);
  const slotMap = model.counts.get(key);
  if (!slotMap || slotMap.size === 0) return 0;

  const count = slotMap.get(areaId) ?? 0;
  if (count === 0) return 0;

  const maxInSlot = Math.max(...slotMap.values());
  const share = count / maxInSlot;

  let boost = Math.round(count * 2.5 + share * 6);
  if (count === maxInSlot && count >= 2) boost += 4;

  return Math.min(MAX_BOOST, boost);
}

export function buildHistoryReason(
  areaId: string,
  slot: TimeSlot,
  weekday: number,
  model: HistoryPatternModel,
): DemandReason | null {
  if (!isHistoryActive(model)) return null;

  const key = slotKey(weekday, slot);
  const count = model.counts.get(key)?.get(areaId) ?? 0;
  if (count === 0) return null;

  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  const slotLabels: Record<TimeSlot, string> = {
    morning: "午前",
    noon: "昼",
    afternoon: "午後",
    evening: "夕方",
  };

  return {
    category: "history",
    text: `過去${model.lookbackDays}日で${weekdayLabels[weekday]}曜${slotLabels[slot]}に乗車実績${count}回（${getAreaName(areaId)}）`,
  };
}

export function buildHistoryOverview(model: HistoryPatternModel): string {
  if (!isHistoryActive(model)) {
    return `【あなたの実績】記録${model.totalRides}件（あと${MIN_TOTAL_RIDES - model.totalRides}件で学習開始）`;
  }

  const topAreas = [...model.areaTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => `${getAreaName(id)}${n}回`);

  return `【あなたの実績】過去${model.lookbackDays}日で${model.totalRides}件。多いエリア: ${topAreas.join("、")} → 同曜日・時間帯の傾向をスコアに反映`;
}
