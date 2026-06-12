# Railway デプロイ手順

## 1. GitHub にプッシュ済みであること

## 2. Railway でプロジェクト作成

1. https://railway.app/ にログイン
2. **New Project** → **Deploy from GitHub repo**
3. `choco6taito3-sudo/taxi-Tours` を選択

## 3. 環境変数（Variables）

| 変数 | 値 |
|------|-----|
| `ACCESS_PIN` | あなたのPIN（例: 7294） |
| `DATA_DIR` | `/app/data` |

※ Volume の Mount Path も `/app/data` にすること（必須）

## 4. Volume（必須・稼働記録の永続化）

1. サービス → **Volumes** → **Add Volume**
2. Mount Path: `/app/data`
3. Size: 1 GB

## 5. デプロイ確認

- **Settings** → **Networking** → **Generate Domain** で公開URLを取得
- スマホで `https://xxx.up.railway.app` を開き PIN でログイン

## 既存DBの移行（任意）

ローカルの `data/taxi-tool.db` を Railway ボリュームにコピー:

```bash
railway login
railway link
railway run -- sh -c 'ls -la /app/data'
# railway volume 経由でファイルをアップロード（Railway CLI / ダッシュボード）
```
