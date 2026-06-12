import { getCategoryLabel } from "@/lib/scoring/reasons";
import type { DemandReason } from "@/lib/types";

const CATEGORY_STYLES: Record<string, string> = {
  weather: "bg-info-soft text-info-text",
  event: "bg-event-soft text-event-text",
  timeslot: "bg-warm-soft text-warm-text",
  weekday: "bg-success-soft text-success-text",
  season: "bg-[var(--demand-high-soft)] text-warm-text",
  area: "bg-[var(--demand-low-soft)] text-muted",
  history: "bg-accent-soft text-accent-text",
};

export function ReasonList({
  reasons,
  compact = false,
}: {
  reasons: DemandReason[];
  compact?: boolean;
}) {
  if (reasons.length === 0) {
    return (
      <p className="text-sm text-muted">通常需要が見込まれます</p>
    );
  }

  const display = compact ? reasons.slice(0, 3) : reasons;

  return (
    <ul className="space-y-2">
      {display.map((reason) => (
        <li key={`${reason.category}-${reason.text}`} className="text-sm">
          <span
            className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[reason.category] ?? "bg-[var(--demand-low-soft)]"}`}
          >
            {getCategoryLabel(reason.category)}
          </span>
          <span className="text-[var(--foreground-muted)]">{reason.text}</span>
        </li>
      ))}
      {compact && reasons.length > 3 && (
        <li className="text-xs text-subtle">
          他 {reasons.length - 3} 件の要因あり
        </li>
      )}
    </ul>
  );
}
