"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAreaName,
  getPopularAreas,
  getSapporoCityAreas,
} from "@/lib/areas";
import { getOperatingHoursLabel } from "@/lib/operating-hours";
import type { RideLog, WorkShift } from "@/lib/types";
import {
  formatJSTTime,
  getJSTDateString,
} from "@/lib/utils/datetime";

export function ShiftLogPanel() {
  const today = getJSTDateString();
  const [shift, setShift] = useState<WorkShift | null>(null);
  const [rides, setRides] = useState<RideLog[]>([]);
  const [pending, setPending] = useState<RideLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showAllAreas, setShowAllAreas] = useState(false);

  const popularAreas = getPopularAreas();
  const allCityAreas = getSapporoCityAreas();
  const otherAreas = useMemo(
    () =>
      allCityAreas.filter(
        (a) => !popularAreas.some((p) => p.id === a.id),
      ),
    [allCityAreas, popularAreas],
  );

  const isOnDuty = !!shift?.startedAt && !shift?.endedAt;
  const isFinished = !!shift?.endedAt;

  const loadData = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/rides?date=${today}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "データ取得に失敗しました");
      setShift(data.shift ?? null);
      setRides(data.rides ?? []);
      setPending(data.pending ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データ取得に失敗しました");
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleShiftAction(action: "start" | "end") {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date: today }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShift(data.shift);
      await loadData();
      setMessage(
        action === "start" ? "出勤を記録しました" : "退勤を記録しました",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickup(areaId: string) {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pickup", date: today, pickupAreaId: areaId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadData();
      setMessage(`${getAreaName(areaId)}で乗車を記録しました`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDropoff(areaId: string) {
    if (!pending) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dropoff",
          rideId: pending.id,
          dropoffAreaId: areaId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadData();
      setMessage(`${getAreaName(areaId)}で下車を記録しました`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function renderAreaButton(areaId: string, name: string) {
    return (
      <button
        key={areaId}
        type="button"
        disabled={loading}
        onClick={() =>
          pending ? handleDropoff(areaId) : handlePickup(areaId)
        }
        className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900 active:bg-amber-100 disabled:opacity-40"
      >
        {name}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-lg font-bold">勤務記録</h2>
        <p className="mb-3 text-sm text-slate-500">
          {format(parseISO(today), "yyyy年M月d日(E)", { locale: ja })} / 稼働{" "}
          {getOperatingHoursLabel()}（日本時間）
        </p>

        {isOnDuty && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            出勤中
            {shift?.startedAt && `（開始 ${formatJSTTime(shift.startedAt)}）`}
          </p>
        )}
        {isFinished && (
          <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
            本日の勤務は終了しています
            {shift?.startedAt && shift?.endedAt &&
              `（${formatJSTTime(shift.startedAt)}〜${formatJSTTime(shift.endedAt)}）`}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || isOnDuty}
            onClick={() => handleShiftAction("start")}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {isOnDuty ? "出勤済み" : isFinished ? "再出勤" : "出勤"}
          </button>
          <button
            type="button"
            disabled={loading || !isOnDuty}
            onClick={() => handleShiftAction("end")}
            className="flex-1 rounded-xl bg-slate-700 px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            退勤
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-lg font-bold">
          {pending ? "下車エリアを選択" : "乗車エリアを選択"}
        </h2>
        <p className="mb-3 text-xs text-slate-500">札幌市内のみ（{allCityAreas.length}エリア）</p>
        <div className="grid grid-cols-2 gap-2">
          {popularAreas.map((area) => renderAreaButton(area.id, area.name))}
        </div>
        <button
          type="button"
          onClick={() => setShowAllAreas(!showAllAreas)}
          className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700"
        >
          {showAllAreas ? "その他のエリアを閉じる" : `その他の市内エリアを表示（${otherAreas.length}件）`}
        </button>
        {showAllAreas && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {otherAreas.map((area) => renderAreaButton(area.id, area.name))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          天候・イベントは記録時に自動保存されます
        </p>
      </section>

      {message && (
        <p className="rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-lg font-bold">本日の記録 ({rides.length}件)</h2>
        {rides.length === 0 ? (
          <p className="text-sm text-slate-500">まだ記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {rides.map((ride) => (
              <li
                key={ride.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
              >
                <p className="font-medium">
                  {getAreaName(ride.pickupAreaId)}
                  {ride.droppedOffAt
                    ? ` → ${getAreaName(ride.dropoffAreaId)}`
                    : " → 乗車中"}
                </p>
                <p className="text-slate-500">
                  {formatJSTTime(ride.pickedUpAt)}
                  {ride.droppedOffAt &&
                    ` - ${formatJSTTime(ride.droppedOffAt)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
