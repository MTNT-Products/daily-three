# X 半自動運用 セットアップ手順

[X-AUTOMATION.md](X-AUTOMATION.md) の仕組みを動かすために、**人がやる必要がある作業**だけを並べたもの。上から順に。所要 30〜40分。

---

## 1. X アカウントを整える（15分）

**空のプロフィールのまま投稿を始めないでください。** 最初の数十人は「投稿を見る → プロフィールを見る → フォローするか決める」の順で来るので、bio と固定ポストが無い状態で流すと、届いた分がそのまま漏れます。下の6つを埋めてから投稿を始めます。

### 1-1. ハンドル（@〜）

**決定済み: [@Daily_three_D](https://x.com/Daily_three_D)**

`src/layouts/BaseLayout.astro` の `twitter:site` / `twitter:creator` に反映済み。ハンドルを変えるとこの2箇所も直す必要があります。

### 1-2. 表示名（50文字以内）

**決定済み: `Daily Three | Car & Product Design`**

サイト名だけだと何のアカウントか分からないので、名前＋分野を入れる。英語表記にしてあるのは意図的な選択で、日本語の担保は bio の1行目が持っている。

### 1-3. bio（160文字以内）

どちらかを選んで貼ってください。

日英スレッド運用なので、**日本語の下に英文を1行**足します。英語圏から見たときに「読める言語で書かれているか」がフォロー判断の分かれ目になるためです。改行も1文字として数えられます。

**案A：サイトを主語にする（推奨・153文字）**

```
カーデザインとプロダクトデザインのニュースから、平日毎日3件だけ選んで要約しています。現役のインダストリアルデザイナーが個人で運営。原文リンクと出典つき。
Three car & product design stories, every weekday. In Japanese and English.
```

**案B：人を主語にする（124文字）**

```
インダストリアルデザイナー。カー/プロダクトデザインのニュースを平日3件だけ選んで要約しています。個人運営・広告なし・原文リンクつき。
Three car & product design picks every weekday. JP & EN.
```

案Aはサイトの宣伝として素直、案Bは人としてのフォローが付きやすい。英文が「日本語と英語で出している」ことを言うので、**日本語側に「日本語と英語。」を重ねて書かないでください**（同じことを二度言うと160文字が無駄になります）。

英文だけ差し替えたい場合の別案:

```
Three design stories every weekday — cars and products. JP / EN.
```

### 1-4. Website 欄

- [ ] `https://mtnt-products.github.io/daily-three/` を入れる

（`MTNT-Products` 側が本番であることを確認済み。`rhcpgtbd0611-moto.github.io` は 404 です。）

毎日の投稿は本文にリンクを入れない運用なので、**ここが常設の導線**になります。必須です。

### 1-5. アイコンとヘッダー

`docs/x-assets/` に用意済み。PNG をそのままアップロードできます（SVG は編集用のソース）。

| ファイル | 用途 | 内容 |
|----------|------|------|
| `icon-three.png` | アイコン 400×400 | 黒地に白の「3」。**48px でも読めるのでこれを推奨** |
| `icon-inverse.png` | アイコン 400×400 | 白地に黒の「3」。タイムラインで白く抜ける |
| `icon-wordmark.png` | アイコン 400×400 | ワードマーク。48px だと潰れるので非推奨 |
| `header.png` | ヘッダー 1500×500 | 黒地に Daily Three ＋ 英文タグライン。左下のアバター重なりと端の切り落としを避けて中央寄せ |

`_icon-compare.png` は3案の比較シート（下段が実表示サイズの48px）です。

> `public/favicon.svg` は **Astro のデフォルトロゴのまま**でした。サイトのファビコンとしても直したほうがよい別件です。X のアイコンには使っていません。

作り直したいときは SVG を編集して sharp で PNG 化できます。色や文言の変更なら言ってください。

### 1-6. 固定ポスト

最初に来た人が最初に読む場所。プロフィールと違って**「なぜ3件なのか」を書ける唯一の場所**なので、ここで他の自動キュレーションと差がつきます。文字数は X の weighted 換算で実測済み（上限280）。

**案A（推奨・246/280）**

```
毎日3件だけ。

カー&プロダクトデザインのニュースは量が多く、全部は追えません。だから平日3件だけ選んで要約しています。

・現役のインダストリアルデザイナーが個人で運営
・全記事に原文リンクと出典つき
・日本語と英語／広告なし

https://mtnt-products.github.io/daily-three/
```

**案B（英語話者にも刺す・263/280）**

```
毎日3件だけ。

カー&プロダクトデザインのニュースは量が多く、全部は追えません。だから平日3件だけ選んで要約しています。

・インダストリアルデザイナーが個人で運営
・原文リンクと出典つき／広告なし

Three design stories, every weekday. JP & EN.
https://mtnt-products.github.io/daily-three/
```

冒頭の「毎日3件だけ。」は、タイムラインで最初に見える1行です。ここが説明文だとスクロールされるので、短い言い切りにしてあります。

投稿したら、その投稿の「…」→ **プロフィールに固定する**。

> 固定ポストは差し替えが効きます。運用が乗ってきたら「今週の3本」や反応の良かった回に替えるのも有効です。

### 1-7. 最後に確認する設定

- [ ] アカウントが**公開**になっている（設定 → プライバシーと安全 → 「ポストを非公開にする」が OFF）
- [ ] **2要素認証を ON**（設定 → セキュリティ）。乗っ取られると宣伝媒体ごと失います
- [ ] 出典媒体の公式アカウント（Dezeen / Yanko Design / designboom / Motor1 / Auto Express）をフォローしておく

- [ ] Location は `Japan` まで（市区町村以上は絞らない）。空欄でも実害はない

## 2. Slack の Incoming Webhook を作る（5分）

- [ ] https://api.slack.com/apps → **Create New App** → **Blank app**（旧 UI では「From scratch」）
- [ ] App Name を `Daily Three`、ワークスペースを選んで **Create App**
- [ ] 左メニュー **Incoming Webhooks** → トグルを **On**
- [ ] **Add New Webhook to Workspace** → 下書きを受け取るチャンネル（自分宛の DM でも可）を選んで **Allow**
- [ ] 表示された `https://hooks.slack.com/services/...` を**コピーしておく**

> この URL 自体が認証情報です。リポジトリにも Slack にも貼らないでください（貼ると gitleaks が止めます）。

## 3. GitHub に Secret と Variable を登録する（5分）

リポジトリ → **Settings** → **Secrets and variables** → **Actions**

**Secrets タブ** → New repository secret

- [ ] `SLACK_WEBHOOK_URL` … 手順2でコピーした URL
- [ ] `SITE_URL` … 既存の値を**確認**する（下の注意を参照）

**Variables タブ** → New repository variable

- [ ] `SOCIAL_ENABLED` … `true`（止めたくなったら `false` に変えるだけで下書き生成が止まります）

> ⚠️ **`SITE_URL` の確認をお願いします。** ローカルの `.env` は `https://rhcpgtbd0611-moto.github.io/daily-three` を指していますが、`astro.config.mjs` の `site` は `https://MTNT-Products.github.io/daily-three` です。投稿のリンクは `SITE_URL` に従うので、**実際に公開されている方**に合わせてください。どちらが本番か教えてもらえれば、`astro.config.mjs` と各ドキュメントも揃えます。

## 4. 手動で1回流して確認する（5分）

- [ ] リポジトリ → **Actions** → 左の **X Draft to Slack** → **Run workflow**
- [ ] `force` に ✅ を入れて実行（既に下書き済みの日でも作り直せます）
- [ ] Slack に下書きが届くのを確認する
- [ ] 「X の下書きを開く」を押して、composer に1本目が入るのを確認する（**そのまま投稿しなくて構いません**）

うまくいかないときは Actions のログを見てください。よくある失敗:

| ログ | 原因 |
|------|------|
| `SLACK_WEBHOOK_URL is required` | 手順3の Secret 名が違う |
| `Slack webhook failed: 404` | Webhook URL が失効している（App を消した等）→ 手順2をやり直す |
| `No digest found` | まだ digest が1本も無い |
| `already drafted` | その日は下書き済み。`force` に ✅ を入れる |

## 5. 翌朝から運用に乗せる

火〜土の朝7時（JST）に Slack へ下書きが届きます。毎朝やること:

1. 下書きを読む。**気が乗らない日は投稿しない**（毎日出すことより、変なものを出さないことが優先）
2. 出すなら「X の下書きを開く」を1タップ
3. X の composer で **＋** を押し、Slack の2本目を貼る → もう一度 **＋** で3本目（リプライ）を貼る
4. 記事画像を1枚添付する（Slack のプレビュー画像を長押し／右クリックで保存）
5. スレッドごと投稿

「⚠️ 要修正」が付いている日は、文字数超過などが直っていません。**その場で手直しして**から投稿してください。

## 6. 2週間後にやること

- [ ] 自分が毎回どう手直ししたかを振り返る（言い回し・語尾・長さ）
- [ ] その傾向を教えてください。`scripts/social/compose.ts` の `SOCIAL_SYSTEM` に反映して、手直しが減るようにします
- [ ] X のポストアナリティクスで**リンククリック数**を見る（フォロワー数ではなく）

---

## 任意: ローカルで試す

```bash
npm run social:draft:dry
```

`.env` に `ANTHROPIC_API_KEY` があれば動きます（Slack にも `data/social-log.json` にも触りません）。Slack への送信まで試すなら `.env` に `SLACK_WEBHOOK_URL` を足して `npm run social:draft` を実行してください。
