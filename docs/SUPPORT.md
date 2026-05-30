# サイト運営の支援（Buy Me a Coffee）

Daily Three は **任意の投げ銭** で API・ホスティングなどの運営費を補うことができます。コンテンツの閲覧に支援は不要です。

## 1. Buy Me a Coffee アカウント

1. https://www.buymeacoffee.com/ でアカウントを作成
2. プロフィール URL を控える（例: `https://buymeacoffee.com/yourname`）

手数料・出金条件は [Buy Me a Coffee 公式](https://www.buymeacoffee.com/) で確認してください。

## 2. サイトに URL を渡す

当サイトは **リンクのみ** で、決済 API キーは使いません。

### ローカル開発

[`.env`](../.env)（`.env.example` をコピー）に追加:

```env
PUBLIC_BMC_URL=https://buymeacoffee.com/yourname
```

### 本番（GitHub Pages）

1. リポジトリ **Settings → Secrets and variables → Actions**
2. **New repository secret**
   - Name: `PUBLIC_BMC_URL`
   - Value: あなたの Buy Me a Coffee URL
3. `main` に push するか、**Deploy to GitHub Pages** ワークフローを再実行

[`pages-deploy.yml`](../.github/workflows/pages-deploy.yml) がビルド時にこの値を読み込みます。

## 3. 表示される場所

| 場所 | 内容 |
|------|------|
| 全ページフッター | 「サイト運営を支援する」（`PUBLIC_BMC_URL` 未設定時は非表示） |
| [About ページ](../src/views/About.astro) | 運営の説明・Buy Me a Coffee へのリンク |
| [プライバシーポリシー](../src/pages/privacy.astro) | 外部決済ページへの遷移 |

## 4. 確認

`PUBLIC_BMC_URL` を設定して `npm run build` のあと:

- フッターに支援リンクがある
- About に「Buy Me a Coffee で支援する」リンクがある
- リンク先があなたの BMC プロフィールである

未設定のままではリンクは出ません（壊れた URL を出さないため）。
