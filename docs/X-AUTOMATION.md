# X（Twitter）半自動運用

Daily Three の X 運用を **「Claude が毎朝ネタと文面を用意し、人は1タップで投稿する」** 形にする仕組み。

- 全体戦略: [PROMOTION.md](PROMOTION.md) / 文面テンプレ: [SOCIAL-TEMPLATES.md](SOCIAL-TEMPLATES.md)

## 決定事項

| 項目 | 決定 | 理由 |
|------|------|------|
| 自動化レベル | **半自動**（生成は全自動・投稿は手動1タップ） | X API 課金を回避。文面の最終責任を人が持てる |
| アカウント | **1アカウント / 日英スレッド** | 運用負荷を増やさずリーチを広げる |
| 通知先 | **Slack**（Incoming Webhook） | スマホで気づける・認証情報が1個で済む |
| X API | **使わない** | 2026年2月に無料枠廃止・従量課金化。URL付き投稿が高く、リンク運用と相性が悪い |

X API は 2026年2月に無料枠が廃止され、クレジット前払いの従量課金に移行した（[公式](https://docs.x.com/x-api/introduction)）。単価は非公開だが、複数の解説が **プレーン投稿 $0.015 / URL を含む投稿 $0.20** と報告している。1日1スレッドでは自動化で浮く手間が「1タップ」しかないため、**生成の自動化だけを取り、投稿の自動化は取らない**。将来切り替えられるよう、生成（`compose.ts`）と配信（`notify-slack.ts`）はコード上で分離してある。

## 全体フロー

```
[daily-digest.yml]  平日 23:00 JST
  digest 生成 → src/content/digest/{ja,en}/YYYY-MM-DD.md を commit → Pages デプロイ
        │  約8時間後
        ▼
[social-draft.yml]  火〜土 07:00 JST（cron: '0 22 * * 1-5' UTC）
  1. 最新 digest（ja / en の同一日）を読む          load-digest.ts
  2. 3件から1件を選ぶ（曜日ローテ ＋ Good 数で補正） load-digest.ts
  3. Claude Haiku で日英の本文を生成                compose.ts
  4. 品質ゲート（LLM を使わない純ロジック）          quality-gate.ts
  5. Slack へ通知（画像・コピペ用3ブロック・intent リンク）notify-slack.ts
  6. data/social-log.json に記録して commit          social-log.ts
        │
        ▼
[人]  Slack の「X の下書きを開く」を1タップ → composer に1本目が入った状態で開く
      ＋ で2本目・3本目を足して、スレッドごと投稿（約15秒）
```

月曜朝に下書きが来ないのは、金曜の digest を土曜朝に出しているため（digest と下書きが週5本ずつ1:1で対応する）。

## 投稿の型

[SOCIAL-TEMPLATES.md](SOCIAL-TEMPLATES.md) の「リンクはリプ欄」方針どおり、3本のスレッドにする。**枠はコードが組み立て、モデルが書くのは本文だけ**（見出しや出典表記がぶれない・文字数計算が確実になる）。

```
1本目（日本語）           2本目（英語スレッド）        3本目（リプライ）
【Daily Three】9/2(水)    {en title}                  今日の3件 / Today's three → {digest URL}
{ja title}                                            原文 / Original → {原文 URL}
                          {en body}
{ja body}
                          Source: {source}
出典: {source}
```

文字数は X の weighted 換算（日本語=2 / 英字=1 / URL=一律23、上限280）で管理する。枠の長さから本文の予算を逆算してプロンプトに渡し、それでも超えたら**1回だけ短く書き直させる**（Haiku は予算を超えることがある）。

## 記事の選び方

1. **曜日ローテーション** — 月=1件目、火=2件目、水=3件目、木=1件目、金=2件目
2. **Good で上書き** — その digest に Good が付いた記事があればそれを優先（Supabase、[SUPABASE.md](SUPABASE.md)）
3. **既出はスキップ** — `data/social-log.json` に記録済みの URL は飛ばして繰り上げ

Supabase に届かない環境では黙って 1 と 3 だけで動く（Good 補正が無効になるだけ）。

## 品質ゲート

生成後に機械チェックし、**落ちても下書きは捨てず**「要修正」ラベル付きで Slack に送る。

| チェック | 対象 | 判定 |
|----------|------|------|
| 文字数 | 組み立て後の3本 | 280 weighted 超で `error` |
| URL 混入 | 1本目・2本目 | 本文に URL があれば `error` |
| リンク欠落 | 3本目 | URL が無ければ `error` |
| 重複 | 生成本文 vs 過去10件の本文 | 3-gram Dice 類似度 0.6 以上で `error` |
| 事実の逸脱 | 生成本文 | digest に無いカタカナ語・固有名詞・数値があれば `warn` |
| 丸写し | 生成本文 vs digest | 連続一致が 日本語30字 / 英語60字 を超えたら `warn` |

固定枠（`【Daily Three】`・出典行）は毎日同じなので、重複判定と事実判定は**生成本文だけ**を見る。一般的なカタカナ語（デザイン、プロセス等）と文頭で大文字になるだけの英単語（The, This 等）は事実判定から除外している。

## 生成プロンプトの制約

`scripts/social/compose.ts` の `SOCIAL_SYSTEM` に置いてある。

- digest の summary が支持しないことは書かない（推測・数値・固有名詞の追加を禁止）
- summary の文をそのまま写さない
- URL・メンション・ハッシュタグ・絵文字を入れない
- 記事タイトルを繰り返さない（枠に既にある）
- 煽り語（「衝撃」「ヤバい」/ "revolutionary" 等）を使わない
- 日本語版と英語版は互いの翻訳ではなく、それぞれネイティブの文章として書く
- 直近10件の本文を渡し、書き出しと構文を変えさせる

## ファイル

| ファイル | 役割 |
|----------|------|
| `scripts/social/load-digest.ts` | digest の読み込みと記事選定 |
| `scripts/social/compose.ts` | 枠の組み立て・文字数予算・Haiku 呼び出し（超過時1回リトライ） |
| `scripts/social/quality-gate.ts` | 上表のチェック |
| `scripts/social/notify-slack.ts` | Slack Block Kit ＋ `x.com/intent/post` リンク |
| `scripts/social/social-log.ts` | `data/social-log.json` の読み書き |
| `scripts/social/run-social-draft.ts` | エントリポイント |
| `scripts/social/*.test.ts` | 選定・枠組み立て・ゲートのテスト（`npm test` に同梱） |
| `.github/workflows/social-draft.yml` | cron ＋ `workflow_dispatch` |

```bash
npm run social:draft:dry
```

`--dry-run` は Slack にも `social-log.json` にも触らず、下書きと判定結果を標準出力に出す。`--date=YYYY-MM-DD` で日付指定、`--force` で同じ digest の作り直し。

## 必要な Secret / 変数

| 名前 | 種別 | 用途 |
|------|------|------|
| `SLACK_WEBHOOK_URL` | Secret | **新規** — Slack App の Incoming Webhook |
| `ANTHROPIC_API_KEY` | Secret | 既存を流用 |
| `SITE_URL` | Secret | digest URL の組み立て。未設定なら `astro.config.mjs` の `site` にフォールバック |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Secret | 既存を流用（Good 補正、任意） |
| `SOCIAL_ENABLED` | Variable | `false` で下書き生成を停止（kill switch） |

X API の認証情報は不要。`social-draft.yml` は digest / デプロイとは独立したワークフローで、こちらが落ちてもサイト更新は止まらない。

## コスト

| 項目 | 月額 |
|------|------|
| Claude Haiku（1日1回、超過時のみ2回） | 約 ¥5〜10 |
| GitHub Actions（public リポジトリ） | ¥0 |
| Slack Incoming Webhook | ¥0 |
| X API | **¥0（使わない）** |

## 運用

**毎朝（火〜土）**: Slack の下書きを見る → 見送るなら何もしない → 出すなら「X の下書きを開く」→ composer で ＋ を押して2本目・3本目を貼る → スレッド投稿。記事画像は Slack のプレビューから保存して1枚添付する。

**週1**: X のポストアナリティクスで「リンククリック」を見る（フォロワー数ではなく）。Search Console と合わせて [PROMOTION.md](PROMOTION.md) の KPI に沿う。

**止めたいとき**: リポジトリ変数 `SOCIAL_ENABLED` を `false` にする。

## フェーズ

| フェーズ | 内容 |
|----------|------|
| **Phase 0** | X アカウント整備、Slack Webhook、Secrets 設定（下の手順書） |
| **Phase 1** | 本仕組みを稼働。2週間、毎朝1タップで投稿を回す |
| **Phase 2** | 手直しした差分を `SOCIAL_SYSTEM` に還流。土曜の週次まとめを追加 |
| **Phase 3**（任意） | 手動投稿が負担になったら X API 従量課金で完全自動化。`post-x.ts` を足すだけ |

## やらないこと

| 行為 | 理由 |
|------|------|
| 3件すべてを毎日投稿 | スパム扱いのリスク。1日1スレッドを守る |
| 生成文を無検査で自動投稿 | 半自動を選んだ意味がなくなる |
| 相互フォロー・自動フォロー | X の自動化ルール違反 |
| 同一文面の再投稿 | 重複制限に抵触。ゲートで機械的に防ぐ |
