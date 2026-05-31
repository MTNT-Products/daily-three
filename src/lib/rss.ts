import type { CollectionEntry } from 'astro:content';
import { absoluteSiteUrl } from './seo';
import { digestSlugFromEntryId } from './digest';
import { t, type Locale } from '../i18n/ui';

type DigestEntry = CollectionEntry<'digest'>;

const MAX_ITEMS = 30;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

function formatRfc822(date: Date): string {
  return date.toUTCString();
}

function itemDescription(entry: DigestEntry): string {
  const bullets = entry.data.articles
    .map((a, i) => `${i + 1}. ${a.title} (${a.source})`)
    .join('\n');
  return `${entry.data.lead}\n\n${bullets}`;
}

export function buildRssFeed(params: {
  locale: Locale;
  digests: DigestEntry[];
  site: URL | undefined;
}): string {
  const { locale, digests, site } = params;
  const channelLink = absoluteSiteUrl(site, locale);
  const selfUrl = absoluteSiteUrl(site, locale, 'feed.xml');

  const items = digests.slice(0, MAX_ITEMS);
  const channelTitle =
    locale === 'ja' ? 'Daily Three — Auto & Product Design (日本語)' : 'Daily Three — Auto & Product Design (English)';

  const itemXml = items
    .map((entry) => {
      const slug = digestSlugFromEntryId(entry.id);
      const link = absoluteSiteUrl(site, locale, `digest/${slug}/`);
      return `    <item>
      <title>${escapeXml(entry.data.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${formatRfc822(entry.data.date)}</pubDate>
      <description>${cdata(itemDescription(entry))}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(t(locale, 'siteDescription'))}</description>
    <language>${locale === 'ja' ? 'ja' : 'en'}</language>
    <lastBuildDate>${items[0] ? formatRfc822(items[0].data.date) : formatRfc822(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>
`;
}
