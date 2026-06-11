#!/bin/bash
# 稼働記録DBの日次バックアップ
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB="$DIR/data/taxi-tool.db"
BACKUP_DIR="$DIR/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
if [ -f "$DB" ]; then
  cp "$DB" "$BACKUP_DIR/taxi-tool_${DATE}.db"
  ls -t "$BACKUP_DIR"/taxi-tool_*.db 2>/dev/null | tail -n +31 | xargs -r rm --
  echo "Backup: $BACKUP_DIR/taxi-tool_${DATE}.db"
else
  echo "DB not found: $DB"
fi
