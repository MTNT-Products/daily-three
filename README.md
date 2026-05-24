# Daily Three: Auto & Product Design

カーデザインを中心に、プロダクトデザインのニュースから**毎日3件**を選定・日本語要約して届ける個人キュレーションサイトです。

- **UI**: 案C（シネマ16:9・画像大・ライトテーマ）
- **公開**: 静的サイト（Astro）
- **自動化**: GitHub Actions（平日 JST 8:00 頃）

## クイックスタート

```bash
npm install
npm run dev
```

http://localhost:4321/daily-three/ でプレビュー（`astro.config.mjs` の `base` に従う）

## ダイジェスト生成（手動）

```bash
cp .env.example .env   # OPENAI_API_KEY 等を設定
npm run digest
npm run build
```

## 環境変数

| 変数 | 用途 |
|------|------|
| `OPENAI_API_KEY` | Top3選定・日本語要約（未設定時はルールベースのみ） |
| `RESEND_API_KEY` | 通知メール |
| `EMAIL_TO` | 送信先 |
| `SITE_URL` | メール内リンク |

## Good / Bad フィードバック

- サイト上のボタン → ブラウザ `localStorage` に保存
- `data/feedback.jsonl` に手動または今後の同期で追記 → 次回 `npm run digest` のソース重みに反映

## UIモック（方式A）

`mockups/compare.html` — 採用前の4案比較。本番は**案C**。

## デプロイ（GitHub Pages）

リポジトリ: https://github.com/rhcpgtbd0611-moto/daily-three

1. リポジトリ Settings → Pages → Source: **GitHub Actions**
2. Settings → Secrets → Actions に `OPENAI_API_KEY`, `SITE_URL` 等を登録
3. **CIワークフローを push する場合**（初回のみ）:
   ```bash
   gh auth refresh -h github.com -s workflow
   git add .github/workflows/daily-digest.yml
   git commit -m "ci: add daily digest workflow"
   git push
   ```
   （OAuth トークンに `workflow` スコープが必要です）

## スキル

UI比較のみ行うとき: Cursor で `@ui-mockup-compare`

## ライセンス

MIT
