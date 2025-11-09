
# メルカリ風レンタル MVP v0.3（静的／GitHub Pages対応）
- Cloudinary 直アップロード（Unsigned）
- Stripe Payment Links（サーバー不要）
- 初回プロフィール（ニックネーム／年齢／都道府県／市）
- 出品はローカル保存（投資家デモ向け）

## 設定
1. Cloudinaryの Cloud name と Upload preset を `app.js` の先頭にセット
2. Stripe Payment Link のURLを `DEFAULT_PAYMENT_URL` か各アイテムの `payment_url` にセット

## 公開
- `index.html`, `styles.css`, `app.js`, `README.md` をGitHubにアップロード → Settings → Pagesで `Deploy from a branch`
