# Web 版 AI 比較用プロンプト

Daily Three の本番パイプライン（`rank.ts`）と同じ条件で、ChatGPT / Claude / Gemini / Cursor Composer などに貼って比較してください。

**本番採用:** Anthropic API + **Claude Haiku 4.5**（`claude-haiku-4-5-20251001`）。以下のプロンプト A は本番と同一です。

**比較のコツ**

- 各サービスに **同じブロック全体** を1回ずつ貼る（システム欄があれば「役割」部分だけ先に貼っても可）
- 出力は **JSON のみ** と指定しているので、余計な解説が付いたら「JSON だけ再出力して」と追記
- 結果を `eval/manual-<サービス名>-2026-05-25.md` などに保存すると後で見比べやすい

**比較するモデル（廉価 + 一つ上）**

| サービス | 廉価版 | 一つ上 |
|----------|--------|--------|
| OpenAI | gpt-4o-mini | gpt-4o |
| Google | Gemini 2.0 Flash | Gemini 2.5 Flash |
| Anthropic | Claude Haiku 4.5 | Claude Sonnet 4.6 |

自動比較は `npm run eval:llm`（7ケース）。コスト目安は [COST-REFERENCE.md](COST-REFERENCE.md)。

---

## プロンプト A（本番同等：20件から3件を選び日本語化）

以下を **ここから末尾まで** コピーして貼り付け。

```
あなたは「Daily Three: Auto & Product Design」の編集者です。読者は自動車・プロダクトのインダストリアルデザイナーです。

## タスク

次の候補記事（index 0〜19）から **ちょうど3件** を選び、日本語のダイジェストを作ってください。

## 選定の優先度

- 優先: 新型・コンセプトカー、量産発表、CMF（カラー・マテリアル・フィニッシュ）、プロポーション・スタンス、スタジオ初公開
- 避ける: F1・レース・セレブ・バイラル系、受賞告知だけ、エントリー締切のお知らせだけ
- 自動車（automotive）とプロダクト（product）のバランスは **質で決める**（無理に3:0や2:1にしなくてよい）

## 出力形式（厳守）

次の JSON **のみ** を出力。Markdown や前置きは不要。

{
  "lead": "日本語2文。編集者が週の流れを語るトーン。",
  "picks": [
    {
      "index": 0,
      "titleJa": "日本語タイトル",
      "summaryJa": "日本語要約3〜5行。デザイナー視点（形態・CMF・プロポーション・空間など）。原文にない事実は書かない。",
      "reason": "選んだ理由を日本語1行"
    }
  ]
}

`picks` は **3件だけ**。`index` は必ず下の candidates の番号と一致させること。

## 候補（candidates）

[
  {
    "index": 0,
    "title": "Renesa's brick-like rug collection explores architecture beyond buildings",
    "summary": "Architecture studio Renesa has collaborated with Indian rug brand House of Knots to create a series of hand-tufted collectible rugs designed as geometric abstractions of the humble brick. The collection, named Brick by Brick, takes its cue from the modular building material as th",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/25/renesa-brick-rug-collection/",
    "category": "automotive",
    "score": 25
  },
  {
    "index": 1,
    "title": "Weathering steel wraps Indigenous museum in Arizona by EYRC",
    "summary": "California studio EYRC Architects has expanded the Cocopah Museum in Arizona with a standalone building constructed from weathering steel and pigmented cast concrete. The Cocopah Museum and Cultural Center preserves and showcases the history and traditions of the Indigenous peopl",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/24/cocopah-museum-cultural-center-expansion-arizona-eyrc-architects/",
    "category": "automotive",
    "score": 23
  },
  {
    "index": 2,
    "title": "Summer Home by Mindspark Architects overlooks cardamom plantation in India",
    "summary": "Indian studio Mindspark Architects has created a house overlooking a cardamom plantation in Kerala, using sliding glass doors to connect its concrete interiors and the surrounding landscape. Named Summer Home, the 360-square-metre dwelling is partially sunken into a sloping site ",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/25/summer-home-mindspark-architects/",
    "category": "automotive",
    "score": 22
  },
  {
    "index": 3,
    "title": "Alpine landscapes inform Patricia Urquiola's \"nest-like\" interiors for Swiss apartment complex",
    "summary": "Natural materials, including wood and local stone, contribute to the relaxed feel of this residential development in Andermatt, Switzerland, which Patricia Urquiola has designed to echo the Alpine surroundings. The Maya development comprises 17 residences and penthouses that rein",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/25/patricia-urquiola-maya-residences/",
    "category": "automotive",
    "score": 22
  },
  {
    "index": 4,
    "title": "MIT researchers 3D print three-sided zipper that stiffens into rods, coils, and arches",
    "summary": "the system revisits an unrealized triangular zipper concept from the 1980s, reimagining it as a printable mechanism for adaptive robots, kinetic installations, and rapid-assembly tents.",
    "source": "Designboom",
    "url": "https://www.designboom.com/design/mit-researchers-3d-print-three-sided-zipper-rods-coils-arches/",
    "category": "automotive",
    "score": 21
  },
  {
    "index": 5,
    "title": "AXOR shapes bathroom collection balancing archival forms and fine materials",
    "summary": "by bridging past and present, AXOR introduces a new bathroom collection for quietly expressive yet enduring bathroom spaces.",
    "source": "Designboom",
    "url": "https://www.designboom.com/design/axor-bathroom-collection-archival-forms-fine-materials/",
    "category": "automotive",
    "score": 21
  },
  {
    "index": 6,
    "title": "this fully 3D-printed book turns its own G-code into raised lettering",
    "summary": "the book's printing method bypasses post-production, materializing directly on the print bed in fully bound form instead.",
    "source": "Designboom",
    "url": "https://www.designboom.com/design/3d-printed-book-manual-darius-ou-benson-chong/",
    "category": "automotive",
    "score": 20
  },
  {
    "index": 7,
    "title": "Veritas desk by Hulala Home",
    "summary": "Dezeen Showroom: electric standing desk meets nested expanding worktable in the Veritas desk by American brand Hulala Home, designed for modern home offices.",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/25/veritas-desk-hulala-home-dezeen-showroom/",
    "category": "automotive",
    "score": 19
  },
  {
    "index": 8,
    "title": "Three days left to enter Dezeen Awards 2026",
    "summary": "Time is running out! There are just three days left to enter Dezeen Awards 2026 before the entry deadline, 27 May at 23:59 London time.",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/25/dezeen-awards-2026-three-days-left/",
    "category": "automotive",
    "score": 19
  },
  {
    "index": 9,
    "title": "Julien Sebban and Natasha Jen announced as Dezeen Awards 2026 judges",
    "summary": "Interior designer Julien Sebban, graphic designer Natasha Jen, creative director Gabriella Khalil and architectural designer John Cummins have joined the judging panel for Dezeen Awards 2026.",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/25/julien-sebban-natasha-jen-dezeen-awards-2026-judges/",
    "category": "automotive",
    "score": 19
  },
  {
    "index": 10,
    "title": "Foster + Partners lines Shanghai art gallery with tubular glass",
    "summary": "Ribbed glass facades wrap the stepped silhouette of the Jia Art gallery in Shanghai, which was designed by British studio Foster + Partners to appear like a cluster of petals.",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/24/jia-art-shanghai-foster-partners/",
    "category": "automotive",
    "score": 18
  },
  {
    "index": 11,
    "title": "Mixed-use building by Barde vanVoltt reflects \"slower rhythm\" of Baja California",
    "summary": "Dutch design studio Barde vanVoltt has completed a building in San José del Cabo, Mexico, which includes a chukum-lined community cafe at street level and residences above.",
    "source": "Dezeen",
    "url": "https://www.dezeen.com/2026/05/23/barde-vanvoltt-estero-residences-gamba-cafe-san-jose-del-cabo-mexico/",
    "category": "automotive",
    "score": 18
  },
  {
    "index": 12,
    "title": "this sculptural iphone grip puts accessibility first by challenging the default smartphone form",
    "summary": "developed in consultation with people living with disabilities, the object addresses the everyday physical effort involved in operating a smartphone over extended periods of time.",
    "source": "Designboom",
    "url": "https://www.designboom.com/design/sculptural-iphone-grip-accessibility-smartphone-form/",
    "category": "automotive",
    "score": 18
  },
  {
    "index": 13,
    "title": "new european bauhaus festival returns with strategies for affordable housing",
    "summary": "through talks, exhibitions, workshops and research-driven projects, the festival explores democratic ways to make cities and communities more inclusive.",
    "source": "Designboom",
    "url": "https://www.designboom.com/design/new-european-bauhaus-affordable-housing/",
    "category": "automotive",
    "score": 18
  },
  {
    "index": 14,
    "title": "a biophilic retail interior shaped by organic textures, fluid transitions and soft light",
    "summary": "inside the bloom invites visitors to slow down, observe, and experience growth from within.",
    "source": "Designboom",
    "url": "https://www.designboom.com/architecture/biophilic-retail-interior-organic-textures-fluid-transitions-soft-light-inside-the-bloom-sinchugova-antonina/",
    "category": "automotive",
    "score": 18
  },
  {
    "index": 15,
    "title": "natural geometrics and organic variation inform omer deutsch's handcrafted guitars",
    "summary": "omer deutsch translates natural mathematical structures into design language.",
    "source": "Designboom",
    "url": "https://www.designboom.com/design/natural-geometrics-organic-variation-omer-deutsch-handcrafted-guitars/",
    "category": "automotive",
    "score": 18
  },
  {
    "index": 16,
    "title": "studio i/thee designs architecture that listens to mud, algae, wood, and weather",
    "summary": "the team turns ecological experimentation into generous public spaces shaped by touch, chance, and collective imagination.",
    "source": "Designboom",
    "url": "https://www.designboom.com/architecture/studio-i-thee-mud-algae-wood-weather/",
    "category": "automotive",
    "score": 17
  },
  {
    "index": 17,
    "title": "Form Follows Function: Gustaf Westman's Chunky Coffee Maker",
    "summary": "This startling ceramic object is actually a drip coffeemaker. With a glossy, tactile appeal, it speaks of low tech and high craft at the same time.",
    "source": "Core77",
    "url": "https://www.core77.com/posts/144180/Form-Follows-Function-Gustaf-Westmans-Chunky-Coffee-Maker",
    "category": "product",
    "score": 17
  },
  {
    "index": 18,
    "title": "Library Tables Meant to Accommodate Coffee",
    "summary": "The Kadoma City Library, outside of Osaka, Japan, was designed with a café-like vibe. The library's concept is \"enjoying reading with coffee.\"",
    "source": "Core77",
    "url": "https://www.core77.com/posts/144178/Library-Tables-Meant-to-Accommodate-Coffee",
    "category": "product",
    "score": 17
  },
  {
    "index": 19,
    "title": "Anker Bak and Takumi Kohgei's Gorgeous Gaze Highback Chair",
    "summary": "From a distance, this might appear to be a Scandinavian Midcentury classic that you missed. But a closer look reveals something startling: what appears to be a gigantic slotted screw.",
    "source": "Core77",
    "url": "https://www.core77.com/posts/144169/Anker-Bak-and-Takumi-Kohgeis-Gorgeous-Gaze-Highback-Chair",
    "category": "product",
    "score": 17
  }
]
```

---

## プロンプト B（任意：記事を固定して「翻訳・要約」だけ比較）

**選ぶ記事を揃えたいとき**用。ルールベースと同じ index 0, 1, 2 を指定しています。

```
あなたは「Daily Three: Auto & Product Design」の編集者です。読者はインダストリアルデザイナーです。

## タスク

以下の3記事について、**選び直さず** 日本語のダイジェストを書いてください。

## 出力形式（厳守）

JSON のみ:

{
  "lead": "日本語2文。編集者トーン。",
  "picks": [
    {
      "index": 0,
      "titleJa": "...",
      "summaryJa": "3〜5行。デザイナー視点。原文にない事実は書かない。",
      "reason": "1行"
    },
    { "index": 1, "titleJa": "...", "summaryJa": "...", "reason": "..." },
    { "index": 2, "titleJa": "...", "summaryJa": "...", "reason": "..." }
  ]
}

## 固定する3記事

### index 0
- title: Renesa's brick-like rug collection explores architecture beyond buildings
- summary: Architecture studio Renesa has collaborated with Indian rug brand House of Knots to create hand-tufted rugs as geometric abstractions of the brick. Collection named Brick by Brick.
- source: Dezeen
- url: https://www.dezeen.com/2026/05/25/renesa-brick-rug-collection/

### index 1
- title: Weathering steel wraps Indigenous museum in Arizona by EYRC
- summary: EYRC Architects expanded the Cocopah Museum in Arizona with a standalone building in weathering steel and pigmented cast concrete.
- source: Dezeen
- url: https://www.dezeen.com/2026/05/24/cocopah-museum-cultural-center-expansion-arizona-eyrc-architects/

### index 2
- title: Summer Home by Mindspark Architects overlooks cardamom plantation in India
- summary: A house in Kerala with sliding glass doors linking concrete interiors to a cardamom plantation; partially sunken into a sloping site.
- source: Dezeen
- url: https://www.dezeen.com/2026/05/25/summer-home-mindspark-architects/
```

---

## 比較するときのチェックリスト

| 観点 | 見るポイント |
|------|----------------|
| 選定 | 3件はデザイン読者に価値があるか。告知・締切だけの記事を避けたか |
| リード | 自然な日本語2文か |
| タイトル | 正確で読みやすいか |
| 要約 | CMF・プロポーション・素材などデザイナー語彙があるか |
| 幻覚 | 原文にないスペック・数字を足していないか |
| JSON | パースできる形か（本番パイプラインに近いか） |

## 記録用テンプレート

各サービスで保存するとき:

```markdown
# <サービス名> — 2026-05-25

- プロンプト: A / B
- ティア: budget / plus
- モデル: （例 gpt-4o-mini, gpt-4o, claude-haiku-4-5, claude-sonnet-4-6, gemini-2.0-flash, gemini-2.5-flash）

## JSON 出力
（ここに貼る）

## メモ
- 選んだ index:
- 良かった点:
- 気になった点:
```

---

候補データの更新日: 2026-05-25（`npm run eval:llm` 時点）。RSS が変わったら `eval/candidates-*.json` を見てプロンプト内の candidates を差し替えてください。
