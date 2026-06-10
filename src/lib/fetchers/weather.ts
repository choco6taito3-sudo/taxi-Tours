import { format, parseISO } from "date-fns";
import type { DailyWeather, HourlyWeather } from "../types";
import { weatherCodeToLabel } from "../utils/weather-label";

const SAPPORO_LAT = 43.062;
const SAPPORO_LNG = 141.354;

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
}

interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  precipitation: number[];
  snowfall: number[];
  weather_code: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
  hourly: OpenMeteoHourly;
}

export async function fetchWeatherForecast(
  days = 14,
): Promise<{ daily: DailyWeather[]; hourly: HourlyWeather[] }> {
  const params = new URLSearchParams({
    latitude: String(SAPPORO_LAT),
    longitude: String(SAPPORO_LNG),
    timezone: "Asia/Tokyo",
    forecast_days: String(days),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "snowfall_sum",
      "wind_speed_10m_max",
      "weather_code",
    ].join(","),
    hourly: [
      "temperature_2m",
      "precipitation",
      "snowfall",
      "weather_code",
    ].join(","),
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
    { next: { revalidate: 3600 } },
  );

  if (!res.ok) {
    throw new Error(`天気データの取得に失敗しました: ${res.status}`);
  }

  const data = (await res.json()) as OpenMeteoResponse;

  const daily: DailyWeather[] = data.daily.time.map((date, i) => {
    const code = data.daily.weather_code[i] ?? 0;
    const { label, icon } = weatherCodeToLabel(code);
    return {
      date,
      tempMax: data.daily.temperature_2m_max[i] ?? 0,
      tempMin: data.daily.temperature_2m_min[i] ?? 0,
      precipitation: data.daily.precipitation_sum[i] ?? 0,
      snowfall: data.daily.snowfall_sum[i] ?? 0,
      windSpeedMax: data.daily.wind_speed_10m_max[i] ?? 0,
      weatherCode: code,
      label,
      icon,
    };
  });

  const hourly: HourlyWeather[] = data.hourly.time.map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m[i] ?? 0,
    precipitation: data.hourly.precipitation[i] ?? 0,
    snowfall: data.hourly.snowfall[i] ?? 0,
    weatherCode: data.hourly.weather_code[i] ?? 0,
  }));

  return { daily, hourly };
}

export async function fetchCurrentWeatherSnapshot(): Promise<DailyWeather> {
  const { daily } = await fetchWeatherForecast(1);
  return daily[0];
}

export function formatWeatherDate(date: string): string {
  return format(parseISO(date), "M月d日(E)");
}
