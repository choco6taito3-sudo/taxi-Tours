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
        <Link href="/log" className="text-sm text-amber-600">
          ← 記録に戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">稼働履歴</h1>
        <p className="text-sm text-slate-500">過去の勤務記録とデータエクスポート</p>
      </header>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-3 font-bold">CSVエクスポート</h2>
        <div className="space-y-2">
          <label className="block text-sm">
            開始日
            <input
              type="date"
              value={exportStart}
              onChange={(e) => setExportStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            終了日
            <input
              type="date"
              value={exportEnd}
              onChange={(e) => setExportEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <a
            href={`/api/export?start=${exportStart}&end=${exportEnd}`}
            className="block rounded-xl bg-amber-500 py-3 text-center font-semibold text-white"
          >
            CSVをダウンロード
          </a>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-3 font-bold">勤務履歴</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">まだ勤務記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {history.map((shift) => (
              <li
                key={shift.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
              >
                <p className="font-medium">{shift.date}</p>
                <p className="text-slate-500">
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

      <p className="text-xs text-slate-400">
        エクスポート項目: 日付, 勤務時間, 乗車/下車エリア, 天候, イベント, 売上, メモ
      </p>
    </div>
  );
}
