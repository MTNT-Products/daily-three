# Deploy & CI

## GitHub Pages（初回のみ・手動）

1. https://github.com/rhcpgtbd0611-moto/daily-three/settings/pages
2. **Build and deployment** → Source: **GitHub Actions**
3. Settings → Secrets → Actions に登録:
   - `ANTHROPIC_API_KEY`（本番: Claude Haiku 選定・日本語要約）
   - `SITE_URL` = `https://rhcpgtbd0611-moto.github.io/daily-three`
   - 任意: `ANTHROPIC_MODEL`, `RESEND_API_KEY`, `EMAIL_TO`, `EMAIL_FROM`
4. Actions → **Daily Digest and Deploy** → **Run workflow** で確認

公開 URL: https://rhcpgtbd0611-moto.github.io/daily-three/

## CI の動き

2 つの workflow に分離しています（push デプロイが digest 長時間 run に巻き込まれないため）。

| workflow | きっかけ | 内容 |
|----------|----------|------|
| **Daily Digest and Deploy** (`daily-digest.yml`) | 平日 schedule / 手動 | digest → commit → build → Pages |
| **Deploy to GitHub Pages** (`pages-deploy.yml`) | `main` への push | build → Pages のみ（約30秒） |

digest 実行時の流れ:

1. `npm run digest` — RSS 収集・選定・`src/content/digest/YYYY-MM-DD.md` 生成
2. 変更があれば `main` へ commit & push（ダイジェスト MD + `data/seen-urls.json`）
3. 同じ run 内で `npm run build` → GitHub Pages へデプロイ

**注意**: digest 用の bot commit（`github-actions[bot]`）は、セキュリティ上 **新しい workflow run を起動しません**。そのため digest 後のビルド・デプロイは **必ず同じ run 内** で完結させています。

## 手動実行（CLI）

workflow 表示名に `&` などが含まれると、PowerShell から `gh workflow run "名前"` が失敗することがあります。**ファイル名指定**を使います。

```powershell
npm run workflow:dispatch
# または
gh workflow run daily-digest.yml --ref main
```

`gh` で dispatch できない場合:

```powershell
gh auth refresh -h github.com -s workflow
```

## ローカルと本番の同期

- `data/seen-urls.json` はリポジトリで追跡（再掲載防止）
- 手動で `npm run digest` した場合も commit すると CI と状態が揃います
- **ローカル digest は開発・検証用**。本番更新は CI（schedule / workflow_dispatch）を正とする

## 動作確認チェックリスト

ワークフロー実行後、Actions ログで次を確認します。

1. **`Run digest pipeline`** — `[digest] Picker: anthropic (model: ...)` と出ること
2. **`Commit digest and seen URLs`** — 新しい `src/content/digest/YYYY-MM-DD.md` が commit されること
3. 公開 URL — https://rhcpgtbd0611-moto.github.io/daily-three/ で最新ダイジェストが表示されること
4. ダイジェスト本文 — `lead` と各記事 `summary` が **日本語** であること

### トラブルシュート

| 症状 | 根本原因 | 対処 |
|------|----------|------|
| `ANTHROPIC_API_KEY is required` | Secrets / `.env` 未設定 | キーを登録 |
| Anthropic API エラー | クレジット不足 or キー無効 | Anthropic Billing / キー再発行 |
| `Anthropic response missing lead or picks` | LLM 応答の JSON 形式不正 | Actions ログを確認（`extractJson` で大半は吸収済み） |
