#!/bin/bash
# 本番モード起動 + Cloudflare Tunnel（個人スマホ利用向け）
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3000}"

CLOUDFLARED="cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  if [ -x "${SCRIPT_DIR}/cloudflared" ]; then
    CLOUDFLARED="${SCRIPT_DIR}/cloudflared"
  else
    echo "cloudflared が見つかりません"
    exit 1
  fi
fi

cd "$DIR"

if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  echo ".env.local を作成しました。ACCESS_PIN を編集してください。"
fi

echo "ビルド中..."
npm run build

echo "サーバー起動 (ポート ${PORT})..."
npm run start -- -p "$PORT" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "サーバーの起動を待機中..."
for i in $(seq 1 30); do
  if curl -s -m 2 "http://127.0.0.1:${PORT}/auth" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "PIN: ${ACCESS_PIN:-(.env.local の ACCESS_PIN を確認)}"
echo "Tunnel起動中... 表示された https://xxx.trycloudflare.com をスマホで開いてください"
echo "停止: Ctrl+C"
echo ""

exec "${CLOUDFLARED}" tunnel --url "http://127.0.0.1:${PORT}"
