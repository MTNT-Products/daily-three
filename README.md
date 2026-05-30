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

## 環境変数

本番は **Claude Haiku 4.5**（Anthropic API）。サブスク不要・従量課金のみ。

| 変数 | 用途 |
|------|------|
| `ANTHROPIC_API_KEY` | **本番必須** — 選定・日本語要約 |
| `ANTHROPIC_MODEL` | 既定 `claude-haiku-4-5-20251001` |
| `RESEND_API_KEY` | 通知メール（任意） |
| `EMAIL_TO` | 送信先（任意） |
| `SITE_URL` | メール内リンク |
| `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` | Good/Bad（ブラウザ） |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | digest 集計（CI） |

本番の月額目安（月20回 digest）: 約 **¥30**（Supabase Free 枠内なら追加料金なし）

## Good / Bad フィードバック

- サイト上の Good / Bad → **Supabase** に自動保存（匿名ログイン・訪問者ごとに1票）
- 画面上は **自分の選択のみ** 表示（総数は非公開）
- 次回 `npm run digest` のソース重みに反映（CI は service role で集計）

セットアップ: [docs/SUPABASE.md](docs/SUPABASE.md)

## セキュリティ

API キーの扱い・漏洩時の手順: [docs/SECURITY.md](docs/SECURITY.md)  
push / PR 時は [gitleaks](https://github.com/gitleaks/gitleaks) ワークフロー（[`.github/workflows/gitleaks.yml`](.github/workflows/gitleaks.yml)）で秘密情報の混入を検知します。

## UIモック（方式A）

`mockups/compare.html` — 採用前の4案比較。本番は**案C**。

## デプロイ（GitHub Pages）

リポジトリ: https://github.com/rhcpgtbd0611-moto/daily-three

手順の詳細: [docs/DEPLOY.md](docs/DEPLOY.md)

検索登録（Google Search Console）: [docs/SEARCH-CONSOLE.md](docs/SEARCH-CONSOLE.md)

任意の運営支援（Buy Me a Coffee）: [docs/SUPPORT.md](docs/SUPPORT.md) — Secret `PUBLIC_BMC_URL`

1. Settings → Pages → Source: **GitHub Actions**
2. Secrets に `ANTHROPIC_API_KEY`, `SITE_URL` 等を登録（詳細は [docs/DEPLOY.md](docs/DEPLOY.md)）
3. ワークフロー実行後、https://rhcpgtbd0611-moto.github.io/daily-three/ で確認

CI は digest 生成後に `main` へ commit し、再掲載防止用の `data/seen-urls.json` も同期します。

## スキル

UI比較のみ行うとき: Cursor で `@ui-mockup-compare`

## ライセンス

MIT
