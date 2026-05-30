import type { Locale } from '../ui';

export function disclaimerMeta(locale: Locale) {
  return locale === 'ja'
    ? {
        title: '免責事項 — Daily Three',
        description: 'Daily Three の免責事項。要約の正確性、外部リンク、投資判断について。',
        h1: '免責事項',
      }
    : {
        title: 'Disclaimer — Daily Three',
        description: 'Disclaimer for Daily Three: summaries, external links, and decisions.',
        h1: 'Disclaimer',
      };
}

export function disclaimerSections(locale: Locale): { h2?: string; html: string }[] {
  if (locale === 'ja') {
    return [
      {
        html: '<p>当サイト「Daily Three」の利用にあたり、次の事項をご理解ください。</p>',
      },
      {
        h2: '1. 要約・コメントの性質',
        html: '<p>各 digest は RSS 等の公開情報をもとに、運営者が AI（大規模言語モデル）の支援を受けて要約・選定したものです。原文の完全な代替ではなく、誤り・抜け・解釈の偏りが含まれる場合があります。重要な判断は必ず<strong>原文</strong>をご確認ください。</p>',
      },
      {
        h2: '2. 外部リンク',
        html: '<p>記事から外部サイトへリンクしています。リンク先の内容・可用性・セキュリティについて、当サイト運営者は責任を負いません。</p>',
      },
      {
        h2: '3. 投資・購入等の判断',
        html: '<p>自動車・製品の購入、投資、その他の経済的判断の助言を提供するものではありません。利用者ご自身の責任で判断してください。</p>',
      },
      {
        h2: '4. サービスの変更・中断',
        html: '<p>予告なくコンテンツの更新、仕様変更、公開の中断・終了を行う場合があります。</p>',
      },
      {
        h2: '5. 著作権',
        html: '<p>各記事の著作権は原著者・出版社に帰属します。当サイトは要約とリンクによる紹介を行い、全文転載は行いません。</p>',
      },
    ];
  }

  return [
    {
      html: '<p>By using Daily Three, you agree to the following.</p>',
    },
    {
      h2: '1. Summaries',
      html: '<p>Digests are curated from public feeds with AI-assisted summaries. They are not a substitute for originals; errors or bias may occur. Verify important facts at the <strong>source</strong>.</p>',
    },
    {
      h2: '2. External links',
      html: '<p>We link to third-party sites. We are not responsible for their content, availability, or security.</p>',
    },
    {
      h2: '3. No professional advice',
      html: '<p>Nothing here is buying, investment, or legal advice. You are responsible for your own decisions.</p>',
    },
    {
      h2: '4. Changes',
      html: '<p>We may change, pause, or stop the site without notice.</p>',
    },
    {
      h2: '5. Copyright',
      html: '<p>Rights in linked articles belong to their publishers. We provide summaries and links, not full reproduction.</p>',
    },
  ];
}
