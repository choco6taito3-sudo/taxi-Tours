import Link from "next/link";
import { ShiftLogPanel } from "@/components/ShiftLogPanel";

export default function LogPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">稼働記録</h1>
          <p className="text-sm text-muted">
            勤務・乗降車を記録（天候・イベントは自動保存）
          </p>
        </div>
        <Link
          href="/log/history"
          className="shrink-0 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-muted"
        >
          履歴
        </Link>
      </header>
      <ShiftLogPanel />
    </div>
  );
}
