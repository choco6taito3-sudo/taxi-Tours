import { getCategoryLabel } from "@/lib/scoring/reasons";
import type { DemandReason } from "@/lib/types";

const CATEGORY_STYLES: Record<string, string> = {
  weather: "bg-sky-100 text-sky-800",
  event: "bg-violet-100 text-violet-800",
  timeslot: "bg-amber-100 text-amber-800",
  weekday: "bg-emerald-100 text-emerald-800",
  season: "bg-orange-100 text-orange-800",
  area: "bg-slate-100 text-slate-700",
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
      <p className="text-sm text-slate-500">通常需要が見込まれます</p>
    );
  }

  const display = compact ? reasons.slice(0, 3) : reasons;

  return (
    <ul className="space-y-2">
      {display.map((reason) => (
        <li key={`${reason.category}-${reason.text}`} className="text-sm">
          <span
            className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[reason.category] ?? "bg-slate-100"}`}
          >
            {getCategoryLabel(reason.category)}
          </span>
          <span className="text-slate-700">{reason.text}</span>
        </li>
      ))}
      {compact && reasons.length > 3 && (
        <li className="text-xs text-slate-400">
          他 {reasons.length - 3} 件の要因あり
        </li>
      )}
    </ul>
  );
}
