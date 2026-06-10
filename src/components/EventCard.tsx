import { getEventCategoryLabel } from "@/lib/fetchers/events";
import type { Event } from "@/lib/types";

function formatPeakHours(hours: number[]): string {
  if (hours.length === 0) return "";
  const sorted = [...hours].sort((a, b) => a - b);
  return `${sorted[0]}:00〜${sorted[sorted.length - 1] + 1}:00`;
}

export function EventCard({ event }: { event: Event }) {
  return (
    <div className="rounded-xl border border-border-soft bg-surface-elevated p-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-[var(--foreground)]">{event.title}</h4>
        <span className="shrink-0 rounded-full bg-event-soft px-2 py-0.5 text-xs text-event-text">
          {getEventCategoryLabel(event.category)}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        想定来場: {event.estimatedAttendance.toLocaleString()}人
      </p>
      {event.peakHours && event.peakHours.length > 0 && (
        <p className="mt-1 text-sm text-event-text">
          需要ピーク: {formatPeakHours(event.peakHours)}
        </p>
      )}
      <p className="mt-1 text-xs text-subtle">
        終了後は会場→繁華街・駅方面の帰宅需要が狙い目
      </p>
    </div>
  );
}
