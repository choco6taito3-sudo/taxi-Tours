# 札幌タクシー売上アップツール

札幌市のタクシードライバー向けに、天気・イベントをもとにした売上アップ提案と、日次の稼働記録を行うモバイルPWAです。

## 主な機能

- **今日のブリーフィング** — 天気・イベント・狙い目エリアの提案
- **カレンダー** — 14日先までの天気・イベント・需要レベル
- **地図** — 時間帯別ヒートスポット表示
- **稼働記録** — 出勤/退勤・乗降車の記録（天候・イベントは自動保存）
- **CSVエクスポート** — 蓄積データのダウンロード

## 技術スタック

- Next.js 16 (App Router)
- TypeScript + Tailwind CSS
- SQLite (better-sqlite3)
- Open-Meteo API（天気）
- Leaflet + OpenStreetMap（地図）

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。スマホでは「ホーム画面に追加」でPWAとして利用できます。

## データについて

- **天気**: Open-Meteo API から取得（札幌市: 43.062, 141.354）
- **イベント**（3ソースを自動マージ）:
  - 定例イベントマスタ（雪まつり、YOSAKOI等）
  - [ようこそさっぽろ](https://www.sapporo.travel/) 公式イベントAPI
  - 札幌市・各区役所のRSS（イベント関連のみ抽出）
- **需要スコア**: 公開データに基づくルールベース推定（実績データ蓄積後に精度向上可能）
- **稼働記録**: `data/taxi-tool.db` にサーバー側で保存

## 個人でスマホから常時使う

### 1. 環境変数を設定

```bash
cp .env.example .env.local
# ACCESS_PIN に4〜8桁のPINを設定（スマホアクセス時の認証）
```

### 2. サーバーにデプロイ（永続ディスク必須）

SQLiteを使うため、Vercel等のサーバーレスではなく **常時起動のサーバー** が必要です。

**おすすめ構成（個人利用）:**

| 方法 | 特徴 |
|------|------|
| 自宅PC + Cloudflare Tunnel | 無料・HTTPS自動・外出先からアクセス可 |
| VPS（さくら・ConoHa等） | 安定・月数百円〜 |
| 常時起動の自宅PC | 最もシンプル（同一Wi-Fi内） |

```bash
npm run build
npm run start   # ポート3000で起動
```

### 3. スマホに追加（PWA）

1. スマホブラウザでサーバーURLを開く
2. PINを入力（`ACCESS_PIN` 設定時）
3. 「共有」→「ホーム画面に追加」

### 4. DBバックアップ（必須）

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
# cron例: 毎日3時にバックアップ
# 0 3 * * * /path/to/scripts/backup-db.sh
```

### Cloudflare Tunnel の例

```bash
# 開発サーバー起動後（ポート確認: 3000 or 3001）
./scripts/tunnel.sh 3001

# または本番ビルド + Tunnel 一括起動
./scripts/start-mobile.sh
```

`scripts/cloudflared` が同梱されています（Intel Mac用）。表示された `https://xxx.trycloudflare.com` をスマホに登録してください。

**注意:** TunnelのURLは再起動のたびに変わります。常時同じURLが必要な場合は Cloudflare アカウントで Named Tunnel を設定してください。

## PCなしで24時間使う（クラウドデプロイ）

自宅PCを起動しなくても使うには、**常時起動のクラウドサーバー**に載せます。HTTPS付きの固定URLが付き、Tunnelは不要です。

| サービス | 月額目安 | 特徴 |
|----------|----------|------|
| [Railway](https://railway.app/) | 約$5〜 | 手軽・GitHub連携・ボリュームでDB永続化 |
| VPS + Docker | 約500〜1000円 | 最安・自分で管理 |
| Fly.io | 約$5〜 | ボリューム対応・やや設定多め |

**Vercelは不可** — SQLite（稼働記録）が永続化できないため。

### Railway でデプロイ（おすすめ）

1. [Railway](https://railway.app/) にGitHubでログイン
2. **New Project** → **Deploy from GitHub** → このリポジトリを選択
3. **Variables** に追加:
   - `ACCESS_PIN` = あなたのPIN
   - `DATA_DIR` = `/app/data`
4. **Volumes** を追加:
   - Mount Path: `/app/data`
   - Size: 1GB で十分
5. デプロイ完了後、表示される `https://xxx.up.railway.app` をスマホに登録

既存の稼働記録を移す場合: ローカルの `data/taxi-tool.db` を Railway のボリュームにアップロード（CLIまたは手動コピー）。

### VPS / 自宅サーバーで Docker

```bash
# .env に ACCESS_PIN を設定
docker compose up -d --build
```

リバースプロキシ（Caddy/Nginx）でHTTPSを付けるとスマホから安全にアクセスできます。

## 画面構成

| パス | 内容 |
|------|------|
| `/` | 今日のブリーフィング |
| `/calendar` | カレンダー |
| `/map` | 地図 |
| `/log` | 稼働記録 |
| `/log/history` | 履歴・CSVエクスポート |

## CSVエクスポート

`/log/history` から期間を指定してダウンロードできます。

出力項目: 日付, 勤務開始/終了, 乗車/下車時刻・エリア, 売上, メモ, 天候, イベント

## 今後の拡張

- イベントバンクAPI連携（法人契約が必要）
- 蓄積データに基づく傾向分析・スコア補正
- オフライン時の記録キュー
- プッシュ通知
