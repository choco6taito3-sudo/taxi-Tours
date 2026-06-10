import { MapView } from "@/components/MapView";

export default function MapPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">地図</h1>
        <p className="text-sm text-muted">
          時間帯別の狙い目エリアを地図で表示
        </p>
      </header>
      <MapView />
    </div>
  );
}
