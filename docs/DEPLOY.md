# Deploy & CI

## GitHub Pages（初回のみ・手動）

1. https://github.com/rhcpgtbd0611-moto/daily-three/settings/pages
2. **Build and deployment** → Source: **GitHub Actions**
3. Settings → Secrets → Actions に登録:
   - `ANTHROPIC_API_KEY`（本番: Claude Haiku 選定・日本語要約）
   - `SITE_URL` = `https://rhcpgtbd0611-moto.github.io/daily-three`
   - 任意: `LLM_PROVIDER`（省略時は `anthropic`）, `ANTHROPIC_MODEL`, `RESEND_API_KEY`, `EMAIL_TO`, `EMAIL_FROM`
4. Actions → **Daily Digest & Deploy** → **Run workflow** で確認

公開 URL: https://rhcpgtbd0611-moto.github.io/daily-three/

## CI の動き

平日 UTC 23:00（JST 8:00 頃）または手動実行時:

1. `npm run digest` — RSS 収集・選定・`src/content/digest/YYYY-MM-DD.md` 生成
2. 変更があれば `main` へ commit & push（ダイジェスト MD + `data/seen-urls.json`）
3. `npm run build` → GitHub Pages へデプロイ

`push` イベントのみの実行では digest はスキップされ、ビルド＋デプロイのみ行われます。

## ローカルと本番の同期

- `data/seen-urls.json` はリポジトリで追跡（再掲載防止）
- 手動で `npm run digest` した場合も commit すると CI と状態が揃います
