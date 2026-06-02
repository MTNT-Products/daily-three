# セキュリティチェックリスト（Daily Three）

API キーなどの秘密情報が漏れないよう、リポジトリ運用と CI の前提をまとめます。

## 絶対に Git に入れないもの

| 変数 | 用途 |
|------|------|
| `ANTHROPIC_API_KEY` | digest 用 Claude API（課金キー） |
| `SUPABASE_SERVICE_ROLE_KEY` | digest 時の投票集計（DB 全権限） |

これらは **GitHub Actions → Secrets** またはローカルの **`.env`** のみ（`.env` は `.gitignore` 済み）。

ブラウザに載せてよいのは `PUBLIC_SUPABASE_URL` と `PUBLIC_SUPABASE_ANON_KEY` のみ。**RLS（行単位のアクセス制御）が有効**であることが前提です（[`supabase/migrations/001_feedback.sql`](../supabase/migrations/001_feedback.sql)）。

## リポジトリ側（開発者）

- [ ] `.env` をコミットしていない（テンプレートは [`.env.example`](../.env.example) のみ）
- [ ] 公開リポジトリで **Secret scanning** を有効化  
  → [GitHub: Enabling secret scanning](https://docs.github.com/en/code-security/secret-scanning/enabling-secret-scanning-features/enabling-secret-scanning-for-your-repository)
- [ ] push / PR 時に **gitleaks** ワークフローが通る（[`.github/workflows/gitleaks.yml`](../.github/workflows/gitleaks.yml)）

## Anthropic（あなたのアカウント）

- [ ] [Console](https://console.anthropic.com/) で使用量・ログをたまに確認
- [ ] 可能なら利用上限や auto-reload の上限を設定  
  → [API Key Best Practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure)

キーが漏れた疑いがあるときは、Console で **即削除・再発行**し、GitHub Secrets を更新してください。

## Supabase（本番）

- [ ] SQL Editor で `001_feedback.sql` を実行済み
- [ ] **Authentication → Anonymous sign-ins** が ON（Good/Bad 用）
- [ ] `service_role` キーをフロントのコード・`PUBLIC_` 変数に入れていない

詳細は [SUPABASE.md](./SUPABASE.md)。

## 漏洩したとき

1. 該当キーを Console / Supabase で **無効化・ローテーション**
2. GitHub Secrets を新キーに更新
3. 誤ってコミットした場合は履歴から除去（`git filter-repo` 等）し、GitHub の Secret scanning アラートに従う

## 調査用スクリプト

`scripts/probe-*.ts` は一時調査用のためリポジトリには含めません。必要ならローカルで再作成してください。
