# Supabase セットアップ（Good / Bad）

## 1. プロジェクト作成

1. [Supabase](https://supabase.com/) でプロジェクトを作成（Free 枠で可）
2. **SQL Editor** で [`supabase/migrations/001_feedback.sql`](../supabase/migrations/001_feedback.sql) を実行
3. **Authentication → Providers** で **Anonymous sign-ins** を **ON**（OFF だと Good/Bad は「Anonymous sign-ins are disabled」で失敗）
4. **Data API** に表示される **Project URL** を `.env` にコピー（`/rest/v1` は付けない）。General の Project ID と URL のホスト名が違うことがあるので、**Data API の URL を正** とする

## 2. Project URL の確認

- 正しい例: `https://（あなたの ref）.supabase.co` だけ（末尾に `/rest/v1` なし）
- ブラウザや `nslookup` でホスト名が解決できるか確認する（存在しないホストだと `Failed to fetch` になる）

## 3. 環境変数

| 変数 | 用途 |
|------|------|
| `PUBLIC_SUPABASE_URL` | ブラウザ（Astro ビルド・開発） |
| `PUBLIC_SUPABASE_ANON_KEY` | ブラウザ |
| `SUPABASE_URL` | `npm run digest`（CI 含む） |
| `SUPABASE_SERVICE_ROLE_KEY` | digest の重み付け集計のみ（**秘密**） |

ローカル: `.env` にコピー → **`npm run dev` を再起動**（Astro 6 は `astro.config.mjs` の `env.schema` 経由でクライアントに渡す）。

CI / GitHub Pages ビルド: GitHub **Secrets** に `PUBLIC_SUPABASE_URL` と `PUBLIC_SUPABASE_ANON_KEY` も登録（`SUPABASE_*` と同じ値でよい）。

## 4. 動作（Good / Bad）

- 訪問者は匿名ログイン後、記事 URL ごとに Good / Bad を 1 票
- 画面上は **自分の選択のみ** 表示（総数は非公開）
- 全訪問者の票は DB に蓄積され、日次 digest の `rank.ts` が `source_id` 単位で集計

## 5. 未設定時

Supabase 未設定でもサイトはビルド・公開可能。Good/Bad 押下時に「利用できません」と表示され、digest は従来どおり `data/feedback.jsonl` があればそれを参照します。
