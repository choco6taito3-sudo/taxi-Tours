export type AreaType =
  | "station"
  | "nightlife"
  | "downtown"
  | "shopping"
  | "residential"
  | "park"
  | "venue"
  | "leisure"
  | "airport"
  | "business";

export type EventCategory =
  | "festival"
  | "live"
  | "sports"
  | "golf"
  | "leisure"
  | "business"
  | "other";

export type TimeSlot = "morning" | "noon" | "afternoon" | "evening";

export interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: AreaType;
  baseWeight: number;
  inSapporoCity: boolean;
}

export interface RecurringEventTemplate {
  id: string;
  title: string;
  category: EventCategory;
  monthStart: number;
  dayStart: number;
  monthEnd: number;
  dayEnd: number;
  lat: number;
  lng: number;
  areaId: string;
  estimatedAttendance: number;
  peakHours: number[];
}

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  startAt: string;
  endAt: string;
  lat: number;
  lng: number;
  areaId?: string;
  estimatedAttendance: number;
  peakHours?: number[];
  source: string;
}

export type DemandReasonCategory =
  | "weather"
  | "event"
  | "timeslot"
  | "weekday"
  | "season"
  | "area";

export interface DemandReason {
  category: DemandReasonCategory;
  text: string;
}

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  snowfall: number;
  windSpeedMax: number;
  weatherCode: number;
  label: string;
  icon: string;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  precipitation: number;
  snowfall: number;
  weatherCode: number;
}

export interface AreaRecommendation {
  area: Area;
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
  reasonDetails: DemandReason[];
}

export interface DayRecommendation {
  date: string;
  weather: DailyWeather;
  events: Event[];
  topAreas: AreaRecommendation[];
  timeSlotAreas: Record<TimeSlot, AreaRecommendation[]>;
  currentSlot?: TimeSlot | null;
  summary: string;
  demandOverview?: string;
}

export interface WorkShift {
  id: number;
  date: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface RideLog {
  id: number;
  shiftId: number | null;
  pickedUpAt: string;
  droppedOffAt: string | null;
  pickupAreaId: string | null;
  pickupText: string | null;
  dropoffAreaId: string | null;
  dropoffText: string | null;
  fareAmount: number | null;
  memo: string | null;
  weatherJson: string | null;
  eventsJson: string | null;
}
