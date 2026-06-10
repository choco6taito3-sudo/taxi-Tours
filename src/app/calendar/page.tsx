import { CalendarView } from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">カレンダー</h1>
        <p className="text-sm text-muted">
          天気・イベント・需要レベルを日別で確認
        </p>
      </header>
      <CalendarView />
    </div>
  );
}
