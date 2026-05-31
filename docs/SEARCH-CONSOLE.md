# Google Search Console（検索登録）

Daily Three は **Analytics を使わない** ため、検索の様子は主に Search Console で確認します。

## 前提（このリポジトリの公開 URL）

| 項目 | 値 |
|------|-----|
| サイト（URL プレフィックス） | `https://MTNT-Products.github.io/daily-three/` |
| サイトマップ | `https://MTNT-Products.github.io/daily-three/sitemap-index.xml` |
| robots.txt | `https://MTNT-Products.github.io/daily-three/robots.txt` |
| RSS（ja / en） | `…/ja/feed.xml` · `…/en/feed.xml`（[PROMOTION.md](PROMOTION.md) 参照） |

`astro.config.mjs` の `site` / `base` と一致させています。独自ドメインに変えたら、ここと `public/robots.txt` を同時に更新してください。

## 1. プロパティを追加

1. https://search.google.com/search-console を開く
2. **プロパティを追加** → **URL プレフィックス**
3. 次をそのまま入力（末尾スラッシュあり推奨）:

   `https://MTNT-Products.github.io/daily-three/`

## 2. 所有権の確認

Google が提示する方法のいずれか（**HTML ファイル**が簡単なことが多い）。

### HTML ファイル方式

1. Search Console が `googlexxxxx.html` のようなファイルをダウンロードさせる
2. そのファイルをリポジトリの [`public/`](../public/) に置く（例: `public/googlexxxxx.html`）
3. `main` に push し、Pages がデプロイされたあと、ブラウザで次が **200** で開けるか確認:

   `https://MTNT-Products.github.io/daily-three/googlexxxxx.html`

4. Search Console で **確認**

### HTML タグ方式

1. Search Console が `<meta name="google-site-verification" ...>` を渡す
2. [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro) の `<head>` 内に貼る
3. push → デプロイ後、Search Console で **確認**

## 3. サイトマップを送信

所有権確認のあと:

1. 左メニュー **サイトマップ**（Sitemaps）
2. **新しいサイトマップの追加** に次だけ入力:

   `sitemap-index.xml`

   （フル URL ではなく、プロパティ直下の相対パス）

3. **送信**

ビルド時に [`@astrojs/sitemap`](../astro.config.mjs) が `sitemap-index.xml` と `sitemap-0.xml` を生成します。digest が増えると URL も自動で増えます。

## 4. 動作確認（push 後）

ブラウザまたは curl で:

- https://MTNT-Products.github.io/daily-three/robots.txt
- https://MTNT-Products.github.io/daily-three/sitemap-index.xml

が開ければ OK です。

## 参考（公式）

- [サイトの所有権を確認する](https://support.google.com/webmasters/answer/35179?hl=ja)
- [Astro: @astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
