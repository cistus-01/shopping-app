# mo-soro

React PWA + Flask バックエンド統合アプリ。買い物周期を管理し「そろそろ買う頃」を予測する。

## Tech Stack
- Frontend: React (JSX), Vite, Tailwind CSS
- Backend: Flask (Python), SQLite
- Container: Docker multi-stage build（Node→React build, Python→Flask serve）
- Deploy: port 8002（コンテナ内 5001）

## Directory Structure
- `src/pages/` — List.jsx, Cycle.jsx, Login.jsx, Settings.jsx
- `src/components/` — Layout.jsx, MoSoroLogo.jsx, Tutorial.jsx
- `api/app.py` — Flask API（認証・アイテム・周期管理）
- `api/data/` — SQLite DB（ボリュームマウント）
- `Dockerfile` — 統合ビルド

## Commands
- `npm install` — 依存関係インストール
- `npm run dev` — ローカル開発（Vite, port 5173）
- `npm run build` — 本番ビルド → dist/
- `bash /home/irodori/scripts/deploy-mo-soro.sh` — Docker デプロイ（port 8002）

## Auth
- JWT トークン方式（`Authorization: Bearer <token>`）
- `/api/auth/register` — 認証不要（新規登録）
- `/api/auth/login` — ログイン → JWT発行
- 全他エンドポイント — `@require_auth` デコレータ必須

## Database
- SQLite: `/data/kago.db`（Docker volume: `api/data/`、env: `DB_PATH`）
- 主テーブル: users, sessions, items, memos, purchases
- per-user: 全クエリに `WHERE hh_id = g.user_id`

## API Patterns
- 成功: `{"data": ..., "status": 200}`
- エラー: `{"error": "message", "status": 4xx}`
- エンドポイント: `/api/items`, `/api/cycles`, `/api/auth/*`

## Key Behaviors
- チュートリアルは `localStorage.mosoro_tutorial_seen` で制御
- MoSoroLogo は複数インスタンスで SVG ID 衝突防止のため `uid` prop 必須
- HashRouter 使用（PWA + 静的配信のため）
