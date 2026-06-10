import type { DailyWeather } from "@/lib/types";

export function WeatherBadge({ weather }: { weather: DailyWeather }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-info-soft p-4">
      <span className="text-4xl">{weather.icon}</span>
      <div>
        <p className="text-lg font-bold text-[var(--foreground)]">{weather.label}</p>
        <p className="text-sm text-muted">
          {weather.tempMin}〜{weather.tempMax}℃
          {weather.precipitation > 0 && ` / 降水 ${weather.precipitation}mm`}
          {weather.snowfall > 0 && ` / 降雪 ${weather.snowfall}cm`}
        </p>
      </div>
    </div>
  );
}
