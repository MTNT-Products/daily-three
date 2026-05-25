# Daily Three: Auto & Product Design

カーデザインを中心に、プロダクトデザインのニュースから**毎日3件**を選定・日本語要約して届ける個人キュレーションサイトです。

> **作業ベース**: `C:\Users\rhcpg\src\daily-three` — 詳細は [WORKSPACE.md](WORKSPACE.md)

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
cp .env.example .env   # API キーを設定
npm run digest:dry     # 収集・選定の確認（ファイル書き込みなし）
npm run digest         # MD 生成
npm run build
```

## LLM プロバイダ比較

```bash
npm run eval:llm
```

同一候補で `rule` / `openai` / `anthropic` / `gemini` の出力を `eval/` に保存します。詳細は [eval/README.md](eval/README.md)。

## 環境変数

本番は **Claude Haiku 4.5**（Anthropic API）。サブスク不要・従量課金のみ。

| 変数 | 用途 |
|------|------|
| `LLM_PROVIDER` | 既定 `anthropic`（`rule` / `openai` / `gemini` も可） |
| `ANTHROPIC_API_KEY` | **本番必須** — 選定・日本語要約 |
| `ANTHROPIC_MODEL` | 既定 `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_PLUS` | eval 用 Sonnet（本番では未使用） |
| `OPENAI_*` / `GOOGLE_*` | eval 比較用（`npm run eval:llm`） |
| `RESEND_API_KEY` | 通知メール |
| `EMAIL_TO` | 送信先 |
| `SITE_URL` | メール内リンク |

本番の月額目安（月20回）: 約 **¥30** — [eval/COST-REFERENCE.md](eval/COST-REFERENCE.md)

## Good / Bad フィードバック

- サイト上のボタン → ブラウザ `localStorage` に保存
- `data/feedback.jsonl` に手動または今後の同期で追記 → 次回 `npm run digest` のソース重みに反映

## UIモック（方式A）

`mockups/compare.html` — 採用前の4案比較。本番は**案C**。

## デプロイ（GitHub Pages）

リポジトリ: https://github.com/rhcpgtbd0611-moto/daily-three

手順の詳細: [docs/DEPLOY.md](docs/DEPLOY.md)

1. Settings → Pages → Source: **GitHub Actions**
2. Secrets に `ANTHROPIC_API_KEY`, `SITE_URL` 等を登録（詳細は [docs/DEPLOY.md](docs/DEPLOY.md)）
3. ワークフロー実行後、https://rhcpgtbd0611-moto.github.io/daily-three/ で確認

CI は digest 生成後に `main` へ commit し、再掲載防止用の `data/seen-urls.json` も同期します。

## スキル

UI比較のみ行うとき: Cursor で `@ui-mockup-compare`

## ライセンス

MIT
