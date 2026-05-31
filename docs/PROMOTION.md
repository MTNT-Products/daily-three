# 宣伝・成長プラン（90日）

Daily Three を**個人キュレーションサイト**として広めるためのチェックリストです。  
Google [SEO Starter Guide — Promote your website](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) などを踏まえ、**中身 → 所有チャネル → SNS → コミュニティ → 振り返り** の順で進めます。

## 前提（公開 URL）

| 項目 | 値 |
|------|-----|
| サイト | `https://MTNT-Products.github.io/daily-three/` |
| サイトマップ | `https://MTNT-Products.github.io/daily-three/sitemap-index.xml` |
| RSS（日本語） | `https://MTNT-Products.github.io/daily-three/ja/feed.xml` |
| RSS（英語） | `https://MTNT-Products.github.io/daily-three/en/feed.xml` |

`astro.config.mjs` の `site` / `base` を変えたら、上表と `public/robots.txt` を同時に更新してください。

## 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [SEARCH-CONSOLE.md](SEARCH-CONSOLE.md) | Google Search Console の登録 |
| [SOCIAL-TEMPLATES.md](SOCIAL-TEMPLATES.md) | X / LinkedIn の「1日1投稿」テンプレ（日英） |
| [DEPLOY.md](DEPLOY.md) | デプロイ・Secrets |
| [SUPPORT.md](SUPPORT.md) | Buy Me a Coffee |

## 実装済みの技術施策

| 施策 | 実装 |
|------|------|
| サイトマップ | `@astrojs/sitemap` |
| RSS 2.0 + autodiscovery | `src/pages/{ja,en}/feed.xml.ts`、`BaseLayout` の `<link rel="alternate">` |
| OGP / Twitter Card | `BaseLayout.astro` |
| Article 構造化データ | digest ページに `BlogPosting` JSON-LD（`src/lib/seo.ts`） |
| ホーム `WebSite` JSON-LD | `Home.astro` |

リッチリザルト確認: [Rich Results Test](https://search.google.com/test/rich-results)

---

## 90日チェックリスト

### 第1〜2週：土台（見つけてもらう準備）

- [ ] [SEARCH-CONSOLE.md](SEARCH-CONSOLE.md) のとおり Google Search Console に URL プレフィックスを登録し、所有権を確認する
- [ ] サイトマップ `sitemap-index.xml` を Search Console に送信する
- [ ] [Bing Webmaster Tools](https://www.bing.com/webmasters/) に同じサイトを登録し、サイトマップを送信する（任意だが推奨）
- [ ] デプロイ後、RSS が開けるか確認する（`/ja/feed.xml`、`/en/feed.xml`）
- [ ] ダイジェスト1ページを [Rich Results Test](https://search.google.com/test/rich-results) に渡し、`BlogPosting` が読めるか確認する
- [ ] シェアプレビュー確認（X Card Validator 等）— 画像付き digest で `og:image` が付くか

### 第3〜6週：所有チャネル（再訪の導線）

- [ ] 通知メール（Resend）の件名・本文が「今日の3件」と分かる形になっているか確認（[DEPLOY.md](DEPLOY.md) の Secrets）
- [ ] メール購読 CTA の案を決める → [`mockups/subscribe-cta.html`](../mockups/subscribe-cta.html) を比較（設計: [SUBSCRIBE.md](SUBSCRIBE.md)）
- [x] フッター購読フォーム（Supabase RPC + Resend 配信）— [SUBSCRIBE.md](SUBSCRIBE.md) の SQL・Secrets を確認
- [ ] Feedly 等で自分の RSS を購読し、digest 公開後に項目が増えるか確認する
- [ ] [SOCIAL-TEMPLATES.md](SOCIAL-TEMPLATES.md) を開き、**平日1投稿**（3件のうち1件だけ）を開始する
  - [ ] 曜日ごとに X か LinkedIn のどちらを主軸にするか決める（両方同時は負荷大）
  - [ ] LinkedIn は**本文にサイト URL を入れず、1コメント目にリンク**（到達率の実務知見）

### 第7〜10週：コミュニティ（信頼と口コミ）

- [ ] 関心のあるコミュニティ（例: カーデザイン・インダストリアルデザイン系）の**ルールを読む**
- [ ] 2週間はリンク投稿なしで、コメント・議論への参加のみ
- [ ] 準備ができたら [Show HN](https://news.ycombinator.com/showhn.html) を**1回だけ**検討（試せる状態・背景コメント必須）
- [ ] Reddit 等は自己宣伝先行を避け、価値ある投稿かサブレのルールを確認する

### 第11週〜：振り返り（データで次を決める）

- [ ] Search Console の「検索の結果」で表示・クリック・クエリを確認する
- [ ] Good / Bad（Supabase）の傾向と digest の選定が噛み合っているか見る
- [ ] 伸びたテーマがあれば、note 等で**週次まとめ**（長文・選定理由）を試す
- [ ] 続かないチャネルはやめ、効いたチャネルに工数を寄せる

---

## やらない方がよいこと

| 行為 | 理由 |
|------|------|
| 毎日3件すべてを全 SNS にコピペ | 燃え尽き・スパム扱いのリスク |
| 検索向けの薄い記事量産 | Google の people-first / スパム方針に反する |
| コミュニティでリンクだけ連投 | HN / Reddit のガイドライン違反になりやすい |
| 宣伝だけで中身を更新しない | 口コミ・検索は「有用な更新」が前提 |

---

## KPI の目安（Analytics なし運用）

| 指標 | 確認場所 | メモ |
|------|----------|------|
| 検索表示・クリック | Search Console | 週1回で十分 |
| RSS 購読 | Feedly 等 | 主観でも可 |
| メール | Resend ダッシュボード | 使っている場合 |
| SNS | 各プラットフォームの投稿インサイト | フォロワー数より「保存・リンククリック」 |
| 選定品質 | Good / Bad 集計 | digest 重みに反映済み |

---

## 次の改善候補（コード）

- 購読フォーム UI（メールアドレス収集 — オプトイン必須）
- `og-default` 用の静的画像（記事画像がない日のシェア用）
- IndexNow（Bing 向けの更新通知 — 任意）
