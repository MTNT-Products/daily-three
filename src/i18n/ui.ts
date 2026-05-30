export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const ui = {
  ja: {
    siteDescription: 'Daily Three: Auto & Product Design — 毎日3件のデザインニュース',
    navHome: 'Home',
    navArchive: 'Archive',
    navAbout: 'About',
    navAria: 'メイン',
    footerTagline: 'Daily Three — personal curation for industrial & product design',
    footerNavAria: '法務・ポリシー・支援',
    privacy: 'プライバシーポリシー',
    disclaimer: '免責事項',
    supportLink: 'サイト運営を支援する',
    langSwitcherAria: '言語',
    langJa: '日本語',
    langEn: 'English',
    homeTitle: '毎日、デザインの注目3件',
    homeSubtitle: 'カーデザインを中心に、プロダクトデザインのニュースを日本語で。',
    homePreview: '今日の3件',
    homeReadFull: '全文を読む →',
    homeEmpty: 'まだダイジェストがありません。',
    archiveTitle: 'Archive',
    aboutTitle: 'About',
    sourceLabel: '出典',
    feedbackUnavailable:
      'フィードバックを利用できません。.env の PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY を確認し、npm run dev を再起動してください。',
    feedbackCleared: '評価を取り消しました。',
    feedbackSaved: '記録しました。',
    feedbackFailed: '保存に失敗しました。しばらくしてからお試しください。',
    digestAltMissing: 'この日の英語版はまだありません',
    redirectFallback: 'Daily Three へ移動中…',
  },
  en: {
    siteDescription: 'Daily Three: Auto & Product Design — three design stories a day',
    navHome: 'Home',
    navArchive: 'Archive',
    navAbout: 'About',
    navAria: 'Main',
    footerTagline: 'Daily Three — personal curation for industrial & product design',
    footerNavAria: 'Legal & support',
    privacy: 'Privacy',
    disclaimer: 'Disclaimer',
    supportLink: 'Support site operations',
    langSwitcherAria: 'Language',
    langJa: '日本語',
    langEn: 'English',
    homeTitle: 'Three design stories, every day',
    homeSubtitle: 'Curated auto and product design news—with a designer’s lens.',
    homePreview: "Today's three",
    homeReadFull: 'Read full digest →',
    homeEmpty: 'No digests yet.',
    archiveTitle: 'Archive',
    aboutTitle: 'About',
    sourceLabel: 'Source',
    feedbackUnavailable:
      'Feedback is unavailable. Check PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY in .env and restart npm run dev.',
    feedbackCleared: 'Your rating was cleared.',
    feedbackSaved: 'Saved.',
    feedbackFailed: 'Could not save. Please try again later.',
    digestAltMissing: 'English digest not available for this date',
    redirectFallback: 'Redirecting to Daily Three…',
  },
} as const;

export type UiKey = keyof (typeof ui)['ja'];

export function t(locale: Locale, key: UiKey): string {
  return ui[locale][key];
}

export function parseDigestEntryId(id: string): { locale: Locale; slug: string } | null {
  const m = id.match(/^(ja|en)\/(.+)$/);
  if (!m) return null;
  return { locale: m[1] as Locale, slug: m[2] };
}
