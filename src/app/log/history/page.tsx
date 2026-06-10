"use client";

import { format, subDays } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkShift } from "@/lib/types";

export default function HistoryPage() {
  const [history, setHistory] = useState<WorkShift[]>([]);
  const [exportStart, setExportStart] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [exportEnd, setExportEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetch("/api/shifts")
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <Link href="/log" className="text-sm text-accent-text">
          ← 記録に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">稼働履歴</h1>
        <p className="text-sm text-muted">過去の勤務記録とデータエクスポート</p>
      </header>

      <section className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-border-soft">
        <h2 className="mb-3 font-bold text-[var(--foreground)]">CSVエクスポート</h2>
        <div className="space-y-2">
          <label className="block text-sm text-[var(--foreground)]">
            開始日
            <input
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <label className="block text-sm text-[var(--foreground)]">
            終了日
            <input
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <a
            href={`/api/export?start=${exportStart}&end=${exportEnd}`}
            className="block rounded-xl bg-accent py-3 text-center font-semibold text-white"
          >
            CSVをダウンロード
          </a>
        </div>
      </section>

      <section className="rounded-2xl bg-surface-elevated p-4 ring-1 ring-border-soft">
        <h2 className="mb-3 font-bold text-[var(--foreground)]">勤務履歴</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">まだ勤務記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {history.map((shift) => (
              <li
                key={shift.id}
                className="rounded-xl border border-border-soft bg-surface p-3 text-sm"
              >
                <p className="font-medium text-[var(--foreground)]">{shift.date}</p>
                <p className="text-muted">
                  {shift.startedAt
                    ? format(new Date(shift.startedAt), "HH:mm")
                    : "--"}
                  {" 〜 "}
                  {shift.endedAt
                    ? format(new Date(shift.endedAt), "HH:mm")
                    : "稼働中"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-subtle">
        エクスポート項目: 日付, 勤務時間, 乗車/下車エリア, 天候, イベント, 売上, メモ
      </p>
    </div>
  );
}
