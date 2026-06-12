"use client";

import { useState } from "react";
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

function ReasonItem({ reason }: { reason: DemandReason }) {
  return (
    <li className="text-sm">
      <span
        className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[reason.category] ?? "bg-[var(--demand-low-soft)]"}`}
      >
        {getCategoryLabel(reason.category)}
      </span>
      <span className="text-[var(--foreground-muted)]">{reason.text}</span>
    </li>
  );
}

export function ReasonList({
  reasons,
  compact = false,
}: {
  reasons: DemandReason[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (reasons.length === 0) {
    return <p className="text-sm text-muted">通常需要が見込まれます</p>;
  }

  const hasMore = compact && reasons.length > 3;
  const display = !hasMore || expanded ? reasons : reasons.slice(0, 3);
  const hiddenCount = reasons.length - 3;

  return (
    <ul className="space-y-2">
      {display.map((reason) => (
        <ReasonItem key={`${reason.category}-${reason.text}`} reason={reason} />
      ))}
      {hasMore && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-h-11 rounded-lg px-2 py-2 text-left text-sm font-medium text-accent-text underline decoration-accent-text/40 underline-offset-2 active:opacity-70"
            aria-expanded={expanded}
          >
            {expanded
              ? "要因を閉じる"
              : `他 ${hiddenCount} 件の要因を表示`}
          </button>
        </li>
      )}
    </ul>
  );
}
