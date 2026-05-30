import type { Locale } from './ui';

export function aboutMeta(locale: Locale) {
  return locale === 'ja'
    ? { title: 'About — Daily Three' }
    : { title: 'About — Daily Three' };
}

export function aboutSections(locale: Locale) {
  if (locale === 'ja') {
    return {
      intro: [
        '<strong>Daily Three</strong> は、インダストリアル・プロダクトデザイナーである私が、日々の情報収集のために作った個人キュレーションです。カーデザインを中心に、プロダクトデザインのニュースから毎日3件だけを選び、日本語で要約とコメントを付けて公開しています（英語版 digest も順次追加しています）。',
        '同じ関心を持つ方の参考になれば幸いです。各記事は原文へのリンクと出典を明記しています。',
      ],
      supportTitle: 'サイト運営の支援（任意）',
      supportBody: [
        'Daily Three は個人プロジェクトです。平日の digest 生成には Anthropic API（LLM）を使い、公開は GitHub Pages で行っています。運営費の一部を補いたい方は、<strong>Buy Me a Coffee</strong> から任意で支援できます。',
        '支援は<strong>必須ではありません</strong>。すべての記事はこれまでどおり無料で読めます。カード情報などは当サイトでは受け取らず、支援時は Buy Me a Coffee の外部ページで手続きします。',
      ],
      supportLink: 'Buy Me a Coffee で支援する',
      supportExternal: '（外部サイト）',
      supportPending: '支援リンクは準備中です（運営者が URL を設定すると表示されます）。',
      feedbackTitle: 'Good / Bad フィードバック',
      feedbackBody:
        '各記事の Good / Bad は、あなたの端末に紐づく匿名 ID で Supabase に自動保存されます。他の人の評価数は表示されませんが、裏側で集計され、今後の digest 選定の参考に使われます。同じボタンをもう一度押すと評価を取り消せます。',
    };
  }

  return {
    intro: [
      '<strong>Daily Three</strong> is my personal feed for industrial and product design—three stories a day, focused on cars and products, with native English summaries (Japanese digests are also available).',
      'I hope it helps fellow designers. Every item links to the original source.',
    ],
    supportTitle: 'Support site operations (optional)',
    supportBody: [
      'Daily Three is a personal project. Weekday digests use the Anthropic API; hosting is on GitHub Pages. Optional tips via <strong>Buy Me a Coffee</strong> help cover AI and hosting costs.',
      'Support is <strong>not required</strong>. All content stays free. We never handle card data on this site—tips are processed on Buy Me a Coffee.',
    ],
    supportLink: 'Support on Buy Me a Coffee',
    supportExternal: '(external site)',
    supportPending: 'Support link coming soon (set by the site operator).',
    feedbackTitle: 'Good / Bad feedback',
    feedbackBody:
      'Good / Bad saves an anonymous Supabase id per browser. Others’ counts are not shown; aggregates guide future digests. Click again to clear your vote.',
  };
}
