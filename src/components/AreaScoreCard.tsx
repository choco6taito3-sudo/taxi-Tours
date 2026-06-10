import { ReasonList } from "@/components/ReasonList";
import type { AreaRecommendation } from "@/lib/types";

const LEVEL_STYLES = {
  high: "border-amber-400 bg-amber-50",
  medium: "border-sky-300 bg-sky-50",
  low: "border-slate-200 bg-slate-50",
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
            <span className="text-xs font-bold text-amber-700">#{rank}</span>
          )}
          <h3 className="text-lg font-bold text-slate-900">{area.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{score}</p>
          <p className="text-xs text-slate-500">需要{LEVEL_LABELS[level]}</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-slate-500">需要パターン</p>
        <ReasonList reasons={reasonDetails} />
      </div>
    </div>
  );
}
