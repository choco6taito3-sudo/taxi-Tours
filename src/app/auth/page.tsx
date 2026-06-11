"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function AuthForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "認証に失敗しました");
      // Cookie反映後にフルリロード（Tunnel経由でも確実に遷移）
      window.location.assign(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "認証に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col justify-center">
      <div className="rounded-2xl bg-surface-elevated p-6 ring-1 ring-border-soft">
        <h1 className="text-xl font-bold text-[var(--foreground)]">アクセス認証</h1>
        <p className="mt-2 text-sm text-muted">
          個人用PINを入力してください
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg tracking-widest text-[var(--foreground)]"
          />
          {error && (
            <p className="text-sm text-danger-text">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-40"
          >
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中...</p>}>
      <AuthForm />
    </Suspense>
  );
}
