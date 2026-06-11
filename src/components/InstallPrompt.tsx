"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem("pwa-install-dismissed");

    if (!isStandalone && isMobile && !dismissed) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-text">
      <p className="font-medium">スマホに追加して常時使う</p>
      <p className="mt-1 text-xs text-[var(--foreground-muted)]">
        Safari/Chromeの「共有」→「ホーム画面に追加」でアプリのように開けます
      </p>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("pwa-install-dismissed", "1");
          setShow(false);
        }}
        className="mt-2 text-xs text-subtle underline"
      >
        閉じる
      </button>
    </div>
  );
}
