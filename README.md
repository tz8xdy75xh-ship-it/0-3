
# メルカリ風レンタル・フルスタック v0.2（受信箱＋チャット付き）

## 機能
- 認証（登録・ログイン・プロフィール）
- 出品（Cloudinary画像）/ 一覧 / 検索
- **受信箱**：/api/inbox（自分が関わる注文スレッド）
- **チャット**：/api/messages（注文IDごとのメッセージ）
- **問合せを開始**：/api/inbox/start（listing_id→ inquiry注文を作成/再利用）
- **予約→決済**：/api/orders + /api/checkout
- **チャットから決済へ**：/api/orders/:id/prepare_checkout → /api/checkout

## セットアップ
1. DBに `schema.sql` を流す
2. `.env.sample` を `.env` にコピーして値を設定（DATABASE_URL / STRIPE / PUBLIC_BASE_URL / CLOUDINARY）
3. `npm install` → `npm start`

## Render
- Web Service / Build: `npm install` / Start: `npm start`
- 環境変数はDashboardで設定
