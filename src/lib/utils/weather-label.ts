export function weatherCodeToLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "快晴", icon: "☀️" };
  if (code <= 3) return { label: "曇り", icon: "☁️" };
  if (code <= 49) return { label: "霧", icon: "🌫️" };
  if (code <= 59) return { label: "霧雨", icon: "🌦️" };
  if (code <= 69) return { label: "雨", icon: "🌧️" };
  if (code <= 79) return { label: "雪", icon: "❄️" };
  if (code <= 82) return { label: "にわか雨", icon: "🌧️" };
  if (code <= 86) return { label: "にわか雪", icon: "🌨️" };
  if (code <= 99) return { label: "雷雨", icon: "⛈️" };
  return { label: "不明", icon: "🌡️" };
}
