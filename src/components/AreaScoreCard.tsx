import { ReasonList } from "@/components/ReasonList";
import type { AreaRecommendation } from "@/lib/types";

const LEVEL_STYLES = {
  high: "border-[var(--demand-high)] bg-[var(--demand-high-soft)]",
  medium: "border-[var(--demand-medium)] bg-[var(--demand-medium-soft)]",
  low: "border-[var(--demand-low)] bg-[var(--demand-low-soft)]",
};

const LEVEL_LABELS = {
  high: "高",
  medium: "中",
  low: "低",
};

export function AreaScoreCard({
  recommendation,
  rank,
}: {
  recommendation: AreaRecommendation;
  rank?: number;
}) {
  const { area, score, level, reasonDetails } = recommendation;

  return (
    <div className={`rounded-2xl border-2 p-4 ${LEVEL_STYLES[level]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          {rank && (
            <span className="text-xs font-bold text-warm-text">#{rank}</span>
          )}
          <h3 className="text-lg font-bold text-[var(--foreground)]">{area.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--foreground)]">{score}</p>
          <p className="text-xs text-muted">需要{LEVEL_LABELS[level]}</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-muted">需要パターン</p>
        <ReasonList reasons={reasonDetails} />
      </div>
    </div>
  );
}
