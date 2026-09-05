import type { Locale } from '../ui';

const updated = '2026-05-29';
const contactUrl = 'https://github.com/MTNT-Products/daily-three/issues';

export function privacyMeta(locale: Locale) {
  return locale === 'ja'
    ? {
        title: 'プライバシーポリシー — Daily Three',
        description:
          'Daily Three のプライバシーポリシー。Good/Bad フィードバックと Supabase の取り扱いについて。',
        h1: 'プライバシーポリシー',
      }
    : {
        title: 'Privacy — Daily Three',
        description: 'Privacy policy for Daily Three: Good/Bad feedback and Supabase.',
        h1: 'Privacy policy',
      };
}

export function privacySections(locale: Locale): { h2?: string; h3?: string; html: string }[] {
  if (locale === 'ja') {
    return [
      {
        html: `<p><strong>Daily Three</strong>（以下「当サイト」）は、個人によるデザイン関連ニュースのキュレーションサイトです。当サイトでは、訪問者の個人情報を販売したり、広告配信のために第三者トラッキング（Google Analytics 等）を行ったりしません。</p><p>最終更新日: ${updated}</p>`,
      },
      {
        h2: '1. 運営者',
        html: `<p>当サイトは個人が運営しています。お問い合わせは GitHub の Issues から受け付けます（<a href="${contactUrl}">リポジトリの Issues</a>）。</p>`,
      },
      {
        h2: '2. 当サイトで扱う情報',
      },
      {
        h3: '2.1 Good / Bad フィードバック（Supabase）',
        html: `<p>各記事の Good / Bad ボタンを利用すると、Supabase（データベースサービス）に次の情報が保存されます。</p><ul><li>記事の URL</li><li>ニュースソースの識別子（<code>source_id</code>）</li><li>Good または Bad の選択</li><li>匿名ログインにより付与されるユーザー ID（端末・ブラウザごとの識別子。氏名・メールアドレスは取得しません）</li></ul><p>画面上では<strong>あなた自身の選択のみ</strong>表示し、他の訪問者の評価数は公開しません。集計結果は、今後の記事選定（digest 生成）の参考に使います。</p><p>Supabase のサーバーは当サイト運営者が契約したプロジェクト上にあります。ブラウザから送る通信には、公開用の API キー（<code>PUBLIC_SUPABASE_*</code>）を使い、データベース側の行レベルセキュリティ（RLS）でアクセスを制限しています。</p>`,
      },
      {
        h3: '2.2 アクセスログ（ホスティング）',
        html: `<p>当サイトは GitHub Pages 上で公開しています。ホスティング事業者の標準的なアクセスログ（IP アドレス、ブラウザ種別、リクエスト日時など）が記録される場合があります。当サイト運営者が Google Analytics 等の解析ツールを埋め込んでいる場合はありません。</p>`,
      },
      {
        h3: '2.3 収集しないもの',
        html: `<ul><li>氏名、住所、電話番号、メールアドレス（お問い合わせを除く）</li><li>広告用 Cookie や行動ターゲティング用の識別子</li><li>クレジットカード番号などの決済情報（当サイトの HTML フォームでは決済を受け付けません）</li></ul>`,
      },
      {
        h3: '2.4 任意のサイト運営支援（Buy Me a Coffee）',
        html: `<p>About ページやフッターから、任意で <strong>Buy Me a Coffee</strong>（外部の投げ銭サービス）へ移動できます。支援を選んだ場合、決済・個人情報の入力は <strong>Buy Me a Coffee 側</strong>で行われ、当サイトはカード情報等を保存しません。支援の有無によってコンテンツの閲覧可否が変わることはありません。</p>`,
      },
      {
        h2: '3. 外部サイトへのリンク',
        html: `<p>各 digest 記事から、元ニュースサイトなど<strong>外部サイト</strong>へリンクしています。外部サイトでのデータの取り扱いは、各サイトのポリシーに従います。</p>`,
      },
      {
        h2: '4. 保存期間',
        html: `<p>Good / Bad のデータは、運営上必要な期間 Supabase 上に保持します。不要と判断した場合は削除します。</p>`,
      },
      {
        h2: '5. お問い合わせ',
        html: `<p>本ポリシーに関するお問い合わせは、<a href="${contactUrl}">GitHub Issues</a> からお願いします。</p>`,
      },
    ];
  }

  return [
    {
      html: `<p><strong>Daily Three</strong> is a personal curation site for design-related news. We do not sell visitor data or run third-party ad tracking (e.g. Google Analytics).</p><p>Last updated: ${updated}</p>`,
    },
    {
      h2: '1. Operator',
      html: `<p>The site is operated by an individual. Contact us via <a href="${contactUrl}">GitHub Issues</a>.</p>`,
    },
    {
      h2: '2. Information we handle',
    },
    {
      h3: '2.1 Good / Bad feedback (Supabase)',
      html: `<p>When you use Good / Bad on an article, we store in Supabase:</p><ul><li>Article URL</li><li>Source id (<code>source_id</code>)</li><li>Good or Bad</li><li>An anonymous user id from Supabase Auth (per browser/device; no name or email)</li></ul><p>We only show <strong>your own</strong> choice in the UI. Aggregates inform future digest selection.</p><p>We use public API keys (<code>PUBLIC_SUPABASE_*</code>) in the browser and row-level security (RLS) on the database.</p>`,
    },
    {
      h3: '2.2 Hosting logs',
      html: `<p>The site is hosted on GitHub Pages. Standard access logs (IP, user agent, timestamps) may be recorded by the host. We do not embed analytics scripts.</p>`,
    },
    {
      h3: '2.3 What we do not collect',
      html: `<ul><li>Name, postal address, phone, or email (except when you contact us)</li><li>Ad or behavioral tracking cookies</li><li>Payment card data (we do not accept payments on this site)</li></ul>`,
    },
    {
      h3: '2.4 Optional support (Buy Me a Coffee)',
      html: `<p>You may optionally visit <strong>Buy Me a Coffee</strong> from the About page or footer. Payment happens on their site; we do not store card data. Support does not affect access to content.</p>`,
    },
    {
      h2: '3. External links',
      html: `<p>Digest articles link to original publishers. Their privacy policies apply on those sites.</p>`,
    },
    {
      h2: '4. Retention',
      html: `<p>Feedback data is kept in Supabase as long as needed for operations and may be deleted when no longer required.</p>`,
    },
    {
      h2: '5. Contact',
      html: `<p>Questions about this policy: <a href="${contactUrl}">GitHub Issues</a>.</p>`,
    },
  ];
}
