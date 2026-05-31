# 作業ベース（Canonical Workspace）

このプロジェクトの**正規の作業ディレクトリ**は次のパスです。

```
C:\Users\rhcpg\src\daily-three
```

## Cursor で開くとき

**File → Open Folder** で上記フォルダを開いてください。  
一時ワークスペース（`.cursor/projects/...-Temp-...`）ではなく、こちらをベースに開発します。

## リモート

- GitHub: https://github.com/MTNT-Products/daily-three
- Pages（設定後）: https://MTNT-Products.github.io/daily-three/

## よく使うコマンド

```bash
npm run dev          # ローカルプレビュー
npm run digest:dry   # 収集・選定の確認
npm run digest       # ダイジェスト生成
npm run build        # 静的ビルド
```

公開手順: [docs/DEPLOY.md](docs/DEPLOY.md)

## 宣伝・成長（90日）

チェックリストと SNS テンプレート:

- [docs/PROMOTION.md](docs/PROMOTION.md) — 90日プラン・KPI・技術施策一覧
- [docs/SOCIAL-TEMPLATES.md](docs/SOCIAL-TEMPLATES.md) — X / LinkedIn「1日1投稿」テンプレ（日英）
- [docs/SUBSCRIBE.md](docs/SUBSCRIBE.md) — メール購読の設計メモ
- [mockups/subscribe-cta.html](mockups/subscribe-cta.html) — BMC + 購読 CTA 比較（ブラウザで開く）

サイト側: RSS、OGP、JSON-LD 実装済み。メール購読はフッター **案 A**（Supabase + Resend、[docs/SUBSCRIBE.md](docs/SUBSCRIBE.md)）。

## ディレクトリ構成（要点）

| パス | 役割 |
|------|------|
| `src/` | Astro サイト（案C UI） |
| `scripts/` | RSS 収集・選定・MDX 生成 |
| `mockups/` | UI 比較用 HTML（方式A） |
| `data/` | feedback.jsonl 等 |
| `docs/PROMOTION.md` | 宣伝チェックリスト |
| `src/lib/seo.ts` | OGP 用画像選定・JSON-LD |
| `src/lib/rss.ts` | RSS フィード生成 |
