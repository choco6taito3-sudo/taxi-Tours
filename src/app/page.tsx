import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { AreaScoreCard } from "@/components/AreaScoreCard";
import { EventCard } from "@/components/EventCard";
import { WeatherBadge } from "@/components/WeatherBadge";
import { SAPPORO_CITY_AREAS } from "@/lib/areas";
import { fetchEventsForDate } from "@/lib/fetchers/events";
import { fetchWeatherForecast } from "@/lib/fetchers/weather";
import {
  ALL_TIME_SLOTS,
  TIME_SLOT_LABELS,
  getCurrentTimeSlot,
  getOperatingHoursLabel,
  isWithinOperatingHours,
} from "@/lib/operating-hours";
import { getRecommendationsForDay } from "@/lib/scoring/engine";
import { buildRidePatternModel } from "@/lib/scoring/history";
import { getJSTDateString, getJSTHour } from "@/lib/utils/datetime";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ReasonList } from "@/components/ReasonList";
import type { AreaRecommendation, TimeSlot } from "@/lib/types";

export default async function HomePage() {
  const now = new Date();
  const today = getJSTDateString(now);
  const currentHour = getJSTHour(now);
  const currentSlot = getCurrentTimeSlot(currentHour);
  const inShift = isWithinOperatingHours(currentHour);

  const [{ daily }, events] = await Promise.all([
    fetchWeatherForecast(3),
    fetchEventsForDate(today),
  ]);

  const weather = daily.find((d) => d.date === today) ?? daily[0];
  const history = buildRidePatternModel();
  const { timeSlotAreas, summary, demandOverview } = getRecommendationsForDay(
    today,
    weather,
    events,
    currentHour,
    history,
  );

  const currentSlotAreas = currentSlot
    ? timeSlotAreas[currentSlot].slice(0, 5)
    : [];

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-accent-text">札幌市内タクシー向け</p>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">今日のブリーフィング</h1>
        <p className="text-sm text-muted">
          {format(parseISO(today), "yyyy年M月d日(E)", { locale: ja })} / 稼働{" "}
          {getOperatingHoursLabel()}（日本時間）
        </p>
      </header>

      <InstallPrompt />

      <WeatherBadge weather={weather} />

      <section className="rounded-2xl bg-accent-soft p-4 text-accent-text">
        <p className="text-sm font-medium">本日の需要概要</p>
        <div className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--foreground-muted)]">
          {demandOverview.split("\n").map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border-soft bg-surface-elevated p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">本日の提案</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{summary}</p>
      </section>

      {!inShift && (
        <section className="rounded-2xl border border-border-soft bg-surface-elevated p-4">
          <p className="text-sm text-muted">
            現在は稼働時間外です（8:00〜21:00）。以下は本日の時間帯別プランです。
          </p>
        </section>
      )}

      {inShift && currentSlot && (
        <section>
          <h2 className="mb-3 text-lg font-bold">
            今の狙い目（{TIME_SLOT_LABELS[currentSlot]}）
          </h2>
          <div className="space-y-3">
            {currentSlotAreas.map((rec, i) => (
              <AreaScoreCard
                key={rec.area.id}
                recommendation={rec}
                rank={i + 1}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-subtle">
            札幌市内{SAPPORO_CITY_AREAS.length}
            エリアからスコア上位を表示（主要名所以外の住宅街・区画も含む）
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">時間帯別の狙い目（8:00〜21:00）</h2>
        <div className="space-y-4">
          {ALL_TIME_SLOTS.map((slot) => (
            <TimeSlotSection
              key={slot}
              slot={slot}
              areas={timeSlotAreas[slot]}
              isCurrent={slot === currentSlot}
            />
          ))}
        </div>
      </section>

      {events.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">本日のイベント</h2>
          <div className="space-y-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-subtle">
        ※需要スコアは札幌市内エリアのみ対象の推定値です
      </p>
    </div>
  );
}

function TimeSlotSection({
  slot,
  areas,
  isCurrent,
}: {
  slot: TimeSlot;
  areas: AreaRecommendation[];
  isCurrent: boolean;
}) {
  const top = areas[0];

  return (
    <div
      className={`rounded-xl p-3 ${
        isCurrent ? "bg-warm-soft ring-2 ring-[var(--warm)]" : "bg-surface-elevated ring-1 ring-border-soft"
      }`}
    >
      <h3 className="mb-2 text-sm font-bold text-[var(--foreground)]">
        {TIME_SLOT_LABELS[slot]}
        {isCurrent && (
          <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-white">
            現在
          </span>
        )}
      </h3>
      <ol className="mb-2 space-y-1 text-sm text-[var(--foreground-muted)]">
        {areas.map((a, i) => (
          <li key={a.area.id}>
            {i + 1}. {a.area.name}
            <span className="ml-1 text-subtle">({a.score}点)</span>
          </li>
        ))}
      </ol>
      {top && (
        <div className="border-t border-border-soft pt-2">
          <p className="mb-1 text-xs font-semibold text-muted">
            1位 {top.area.name} の需要パターン
          </p>
          <ReasonList reasons={top.reasonDetails} compact />
        </div>
      )}
    </div>
  );
}
