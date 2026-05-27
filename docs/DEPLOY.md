# Deploy & CI

## GitHub Pages（初回のみ・手動）

1. https://github.com/rhcpgtbd0611-moto/daily-three/settings/pages
2. **Build and deployment** → Source: **GitHub Actions**
3. Settings → Secrets → Actions に登録:
   - `ANTHROPIC_API_KEY`（本番: Claude Haiku 選定・日本語要約）
   - `SITE_URL` = `https://rhcpgtbd0611-moto.github.io/daily-three`
   - 任意: `LLM_PROVIDER`（省略時は `anthropic`）, `ANTHROPIC_MODEL`, `RESEND_API_KEY`, `EMAIL_TO`, `EMAIL_FROM`
4. Actions → **Daily Digest and Deploy** → **Run workflow** で確認

公開 URL: https://rhcpgtbd0611-moto.github.io/daily-three/

## CI の動き

| きっかけ | digest | ビルド + Pages 公開 |
|----------|--------|---------------------|
| 平日 schedule（UTC 23:00 ≒ JST 8:00） | 実行 | 実行 |
| workflow_dispatch（手動） | 実行 | 実行 |
| `main` への push | スキップ | 実行 |

digest 実行時の流れ:

1. `npm run digest` — RSS 収集・選定・`src/content/digest/YYYY-MM-DD.md` 生成
2. 変更があれば `main` へ commit & push（ダイジェスト MD + `data/seen-urls.json`）
3. 同じ run 内で `npm run build` → GitHub Pages へデプロイ

**注意**: digest 用の bot commit（`github-actions[bot]`）は、セキュリティ上 **新しい workflow run を起動しません**。そのため digest 後のビルド・デプロイは **必ず同じ run 内** で完結させています。

## 手動実行（CLI）

workflow 表示名に `&` などが含まれると、PowerShell から `gh workflow run "名前"` が失敗することがあります。**workflow ID 指定**を使います。

```powershell
npm run workflow:dispatch
# または
gh workflow run 282451376 --ref main
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

1. **`Run digest pipeline`** — `[digest] Picker: anthropic (used: anthropic)` と出ること  
   - `used: rule` の場合は **`ANTHROPIC_API_KEY` が Secrets に未設定**（digest は動くが英語・ルールベースのまま）
2. **`Commit digest and seen URLs`** — 新しい `src/content/digest/YYYY-MM-DD.md` が commit されること
3. 公開 URL — https://rhcpgtbd0611-moto.github.io/daily-three/ で最新ダイジェストが表示されること
4. ダイジェスト本文 — `lead` と各記事 `summary` が **日本語** であること

### トラブルシュート

| 症状 | 根本原因 | 対処 |
|------|----------|------|
| `Picker: rule (used: rule)` | Secrets 未設定 or クレジット不足 | Secrets / Anthropic Billing を確認 |
| `gh workflow run` が HTTP 500 | 表示名の特殊文字 or `gh` に `workflow` スコープ不足 | `npm run workflow:dispatch` または Web UI から実行 |
| digest 失敗なのに run が success | （修正済）`continue-on-error` で失敗を隠していた | 現在は digest 失敗で run 全体が fail |
| push したのにサイトが古い | push run は **ビルドのみ**。digest は schedule/手動のみ | workflow_dispatch を実行、または schedule を待つ |
| 日本語にならない | LLM 応答が markdown 付き JSON | `scripts/rank.ts` の `extractJson`（修正済み） |
