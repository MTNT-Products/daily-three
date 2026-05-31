# SNS 投稿テンプレート（1日1件）

Daily Three は**毎日3件**ですが、SNS は**1日1投稿 = その日の3件のうち1件だけ**を切り出す運用を推奨します。  
コピペ用に、プレースホルダを `{名前}` で表記しています。

## 投稿前に埋める値

| プレースホルダ | 例 | 取得元 |
|----------------|-----|--------|
| `{date}` | 2026-05-30 | digest の日付 |
| `{digest_title}` | 2026年5月30日（土） | digest タイトル |
| `{article_title}` | なぜ新型電動フェラーリは… | 今日載せる1件の見出し |
| `{summary}` | 要約（そのまま or 120字に短縮） | 記事の summary |
| `{source}` | Dezeen | 出典名 |
| `{digest_url}` | `https://MTNT-Products.github.io/daily-three/ja/digest/2026-05-30/` | 本番 digest URL |
| `{original_url}` | 元記事 URL | 記事の url |
| `{pick_reason}` | 選んだ理由を1文（任意） | 自分のメモ |

**ローテーション例**: 月=1件目、火=2件目、水=3件目、木=1件目…

---

## X（Twitter）

### 日本語 — 本文（リンクはリプ欄推奨）

```
【Daily Three】{date}
{article_title}

{summary}

出典: {source}
```

**1コメント目（リプライ）**

```
今日の3件まとめ → {digest_url}
原文 → {original_url}
```

### English — post (link in reply)

```
【Daily Three】{date}
{article_title}

{summary}

Source: {source}
```

**First reply**

```
Today's three picks → {digest_url}
Original → {original_url}
```

### 日本語 — 選定理由を足す版（140字超えやすいのでスレッド可）

```
【Daily Three】{date}
今日の1件目: {article_title}

{pick_reason}

→ 続きはリプ
```

---

## LinkedIn

LinkedIn は**投稿本文に外部リンクを入れると到達が落ちやすい**ため、本文はテキスト中心、**URL は最初のコメント**に置きます（[LinkedIn Help: Distribution](https://www.linkedin.com/help/linkedin/answer/a516930)）。

### 日本語 — 投稿本文

```
毎日3件、カー＆プロダクトデザインのニュースをキュレーションしています（Daily Three）。

今日の1件:
{article_title}

{summary}

出典: {source}
{pick_reason}
```

**1コメント目**

```
今日のダイジェスト全文:
{digest_url}

元記事:
{original_url}
```

### English — post body

```
I curate three auto & product design stories each weekday (Daily Three).

Today's pick:
{article_title}

{summary}

Source: {source}
{pick_reason}
```

**First comment**

```
Full digest:
{digest_url}

Original article:
{original_url}
```

### 日本語 — プロ向け（デザイナー向けトーン）

```
デザイン周辺のニュースは量が多く、全部追うのは難しいです。

個人サイト「Daily Three」では平日、カーデザインとプロダクトデザインから3件だけ選んで要約しています。

本日のピック:
・{article_title}（{source}）

{summary}
```

（リンクはコメント欄へ）

---

## 運用メモ

| 項目 | 推奨 |
|------|------|
| 頻度 | 平日1回（digest 公開後） |
| 画像 | 記事の `image` があれば1枚添付（X / LinkedIn とも） |
| ハッシュタグ | 少量（0〜3）。例: `#cardesign` `#productdesign` |
| 宣伝だけのアカウント | 避ける。他アカウントへの有益な返信を週に数回 |
| 同一文面の連投 | 避ける。テンプレは毎回 `{summary}` を少し変える |

---

## 90日プランとの対応

テンプレ運用は [PROMOTION.md](PROMOTION.md) の **第3〜6週** に該当します。  
第7週以降にコミュニティ参加を足すときは、**リンク先行ではなくコメント参加**から始めてください。
