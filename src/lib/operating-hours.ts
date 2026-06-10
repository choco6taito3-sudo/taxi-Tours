import type { TimeSlot } from "./types";

/** 稼働時間 8:00〜21:00 */
export const SHIFT_START_HOUR = 8;
export const SHIFT_END_HOUR = 21;

export const TIME_SLOT_HOURS: Record<TimeSlot, number[]> = {
  morning: [8, 9, 10],
  noon: [11, 12, 13],
  afternoon: [14, 15, 16],
  evening: [17, 18, 19, 20, 21],
};

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "午前（8:00〜11:00）",
  noon: "昼（11:00〜14:00）",
  afternoon: "午後（14:00〜17:00）",
  evening: "夕方（17:00〜21:00）",
};

export const TIME_SLOT_SHORT_LABELS: Record<TimeSlot, string> = {
  morning: "8-11時",
  noon: "11-14時",
  afternoon: "14-17時",
  evening: "17-21時",
};

export const ALL_TIME_SLOTS: TimeSlot[] = [
  "morning",
  "noon",
  "afternoon",
  "evening",
];

export function isWithinOperatingHours(hour: number): boolean {
  return hour >= SHIFT_START_HOUR && hour <= SHIFT_END_HOUR;
}

export function getCurrentTimeSlot(hour = new Date().getHours()): TimeSlot | null {
  if (hour < SHIFT_START_HOUR || hour > SHIFT_END_HOUR) return null;
  if (hour < 11) return "morning";
  if (hour < 14) return "noon";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function getOperatingHoursLabel(): string {
  return `${SHIFT_START_HOUR}:00〜${SHIFT_END_HOUR}:00`;
}
