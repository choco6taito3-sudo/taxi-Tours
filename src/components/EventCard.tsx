import { getEventCategoryLabel } from "@/lib/fetchers/events";
import type { Event } from "@/lib/types";

function formatPeakHours(hours: number[]): string {
  if (hours.length === 0) return "";
  const sorted = [...hours].sort((a, b) => a - b);
  return `${sorted[0]}:00〜${sorted[sorted.length - 1] + 1}:00`;
}

export function EventCard({ event }: { event: Event }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-slate-900">{event.title}</h4>
        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
          {getEventCategoryLabel(event.category)}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        想定来場: {event.estimatedAttendance.toLocaleString()}人
      </p>
      {event.peakHours && event.peakHours.length > 0 && (
        <p className="mt-1 text-sm text-violet-600">
          需要ピーク: {formatPeakHours(event.peakHours)}
        </p>
      )}
      <p className="mt-1 text-xs text-slate-400">
        終了後は会場→繁華街・駅方面の帰宅需要が狙い目
      </p>
    </div>
  );
}
