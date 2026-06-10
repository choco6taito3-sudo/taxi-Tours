import type { DailyWeather } from "@/lib/types";

export function WeatherBadge({ weather }: { weather: DailyWeather }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-4">
      <span className="text-4xl">{weather.icon}</span>
      <div>
        <p className="text-lg font-bold text-slate-900">{weather.label}</p>
        <p className="text-sm text-slate-600">
          {weather.tempMin}〜{weather.tempMax}℃
          {weather.precipitation > 0 && ` / 降水 ${weather.precipitation}mm`}
          {weather.snowfall > 0 && ` / 降雪 ${weather.snowfall}cm`}
        </p>
      </div>
    </div>
  );
}
