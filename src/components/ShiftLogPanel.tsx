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
import { apiFetch } from "@/lib/utils/api-fetch";
import {
  formatJSTTime,
  getJSTDateString,
} from "@/lib/utils/datetime";

const CARD = "rounded-2xl bg-surface-elevated p-4 ring-1 ring-border-soft";

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
      const data = await apiFetch<{
        shift: WorkShift | null;
        rides: RideLog[];
        pending: RideLog | null;
      }>(`/api/rides?date=${today}`);
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
      const data = await apiFetch<{ shift: WorkShift }>("/api/shifts", {
        method: "POST",
        body: JSON.stringify({ action, date: today }),
      });
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
      await apiFetch("/api/rides", {
        method: "POST",
        body: JSON.stringify({ action: "pickup", date: today, pickupAreaId: areaId }),
      });
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
      await apiFetch("/api/rides", {
        method: "POST",
        body: JSON.stringify({
          action: "dropoff",
          rideId: pending.id,
          dropoffAreaId: areaId,
        }),
      });
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
        className="rounded-xl border border-border bg-warm-soft px-3 py-3 text-sm font-semibold text-warm-text active:bg-[var(--demand-high-soft)] disabled:opacity-40"
      >
        {name}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <section className={CARD}>
        <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">勤務記録</h2>
        <p className="mb-3 text-sm text-muted">
          {format(parseISO(today), "yyyy年M月d日(E)", { locale: ja })} / 稼働{" "}
          {getOperatingHoursLabel()}（日本時間）
        </p>

        {isOnDuty && (
          <p className="mb-3 rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success-text">
            出勤中
            {shift?.startedAt && `（開始 ${formatJSTTime(shift.startedAt)}）`}
          </p>
        )}
        {isFinished && (
          <p className="mb-3 rounded-lg bg-[var(--demand-low-soft)] px-3 py-2 text-sm text-muted">
            本日の勤務は終了しています
            {shift?.startedAt && shift?.endedAt &&
              `（${formatJSTTime(shift.startedAt)}〜${formatJSTTime(shift.endedAt)}）`}
          </p>
        )}

        {loading && (
          <p className="mb-2 text-center text-xs text-muted">処理中...</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || isOnDuty}
            onClick={() => handleShiftAction("start")}
            className="flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "..." : isOnDuty ? "出勤済み" : isFinished ? "再出勤" : "出勤"}
          </button>
          <button
            type="button"
            disabled={loading || !isOnDuty}
            onClick={() => handleShiftAction("end")}
            className="flex-1 rounded-xl bg-[var(--foreground-muted)] px-4 py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "..." : "退勤"}
          </button>
        </div>
      </section>

      <section className={CARD}>
        <h2 className="mb-1 text-lg font-bold text-[var(--foreground)]">
          {pending ? "下車エリアを選択" : "乗車エリアを選択"}
        </h2>
        <p className="mb-3 text-xs text-muted">札幌市内のみ（{allCityAreas.length}エリア）</p>
        <div className="grid grid-cols-2 gap-2">
          {popularAreas.map((area) => renderAreaButton(area.id, area.name))}
        </div>
        <button
          type="button"
          onClick={() => setShowAllAreas(!showAllAreas)}
          className="mt-3 w-full rounded-lg bg-surface py-2 text-sm font-medium text-muted"
        >
          {showAllAreas ? "その他のエリアを閉じる" : `その他の市内エリアを表示（${otherAreas.length}件）`}
        </button>
        {showAllAreas && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {otherAreas.map((area) => renderAreaButton(area.id, area.name))}
          </div>
        )}
        <p className="mt-2 text-xs text-subtle">
          天候・イベントは記録時に自動保存されます
        </p>
      </section>

      {message && (
        <p className="rounded-xl bg-info-soft px-4 py-2 text-sm text-info-text">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger-text">
          {error}
        </p>
      )}

      <section className={CARD}>
        <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">本日の記録 ({rides.length}件)</h2>
        {rides.length === 0 ? (
          <p className="text-sm text-muted">まだ記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {rides.map((ride) => (
              <li
                key={ride.id}
                className="rounded-xl border border-border-soft bg-surface p-3 text-sm"
              >
                <p className="font-medium text-[var(--foreground)]">
                  {getAreaName(ride.pickupAreaId)}
                  {ride.droppedOffAt
                    ? ` → ${getAreaName(ride.dropoffAreaId)}`
                    : " → 乗車中"}
                </p>
                <p className="text-muted">
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
