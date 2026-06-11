#!/bin/bash
# Cloudflare Tunnel でローカルサーバーをHTTPS公開する
set -euo pipefail

PORT="${1:-3000}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLOUDFLARED="cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  if [ -x "${SCRIPT_DIR}/cloudflared" ]; then
    CLOUDFLARED="${SCRIPT_DIR}/cloudflared"
  else
    echo "cloudflared が見つかりません。"
    echo "  brew install cloudflared"
    echo "  または scripts/cloudflared を配置してください"
    exit 1
  fi
fi

echo "ポート ${PORT} を HTTPS で公開します..."
echo "表示された https://xxx.trycloudflare.com をスマホに登録してください"
echo "停止: Ctrl+C"
echo ""

"${CLOUDFLARED}" tunnel --url "http://127.0.0.1:${PORT}"
