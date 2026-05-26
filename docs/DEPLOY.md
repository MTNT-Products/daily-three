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

## 動作確認チェックリスト

ワークフロー実行後、Actions ログで次を確認します。

1. **`Run digest pipeline`** — `[digest] Picker: anthropic (used: anthropic)` と出ること  
   - `used: rule` の場合は **`ANTHROPIC_API_KEY` が Secrets に未設定**（digest は動くが英語・ルールベースのまま）
2. **`Commit digest and seen URLs`** — 新しい `src/content/digest/YYYY-MM-DD.md` が commit されること
3. 公開 URL — https://rhcpgtbd0611-moto.github.io/daily-three/ で最新ダイジェストが表示されること
4. ダイジェスト本文 — `lead` と各記事 `summary` が **日本語** であること

### よくある状態

| ログの表示 | 原因 | 対処 |
|------------|------|------|
| `Picker: rule (used: rule)` | `ANTHROPIC_API_KEY` 空 | Settings → Secrets → Actions にキーを登録 |
| digest 成功・デプロイのみ成功 | `continue-on-error: true` のため digest 失敗でもビルドは続行 | 上記ステップのログを確認 |
| `No digest changes to commit` | 候補なし、または既に同日分あり | 正常（記事が無い日） |
