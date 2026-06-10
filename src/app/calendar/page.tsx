import { CalendarView } from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">カレンダー</h1>
        <p className="text-sm text-slate-500">
          天気・イベント・需要レベルを日別で確認
        </p>
      </header>
      <CalendarView />
    </div>
  );
}
