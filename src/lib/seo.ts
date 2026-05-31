import type { CollectionEntry } from 'astro:content';
import { localePath } from './site-url';
import type { Locale } from '../i18n/ui';

type DigestEntry = CollectionEntry<'digest'>;

type ArticleLike = {
  image?: string;
  images?: string[];
};

/** Absolute URL for a locale path (path without leading locale, e.g. `digest/2026-05-30/`). */
export function absoluteSiteUrl(site: URL | undefined, locale: Locale, path: string = ''): string {
  const base = site ?? new URL('https://example.com/daily-three/');
  return new URL(localePath(locale, path), base).href;
}

export function pickDigestOgImage(articles: ArticleLike[]): string | undefined {
  for (const article of articles) {
    if (article.image) return article.image;
    if (article.images?.[0]) return article.images[0];
  }
  return undefined;
}

export function digestBlogPostingJsonLd(params: {
  headline: string;
  description: string;
  datePublished: Date;
  pageUrl: string;
  image?: string;
  locale: Locale;
}): Record<string, unknown> {
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: params.headline,
    description: params.description,
    datePublished: params.datePublished.toISOString(),
    dateModified: params.datePublished.toISOString(),
    author: { '@type': 'Organization', name: 'Daily Three' },
    publisher: { '@type': 'Organization', name: 'Daily Three' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': params.pageUrl },
    inLanguage: params.locale === 'ja' ? 'ja-JP' : 'en',
  };
  if (params.image) {
    json.image = [params.image];
  }
  return json;
}

export function webSiteJsonLd(params: {
  siteUrl: string;
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: params.name,
    url: params.siteUrl,
    description: params.description,
    inLanguage: ['ja-JP', 'en'],
  };
}

export function digestSeoFromEntry(
  entry: DigestEntry,
  locale: Locale,
  slug: string,
  site: URL | undefined,
): { ogImage?: string; jsonLd: Record<string, unknown> } {
  const pageUrl = absoluteSiteUrl(site, locale, `digest/${slug}/`);
  const ogImage = pickDigestOgImage(entry.data.articles);
  return {
    ogImage,
    jsonLd: digestBlogPostingJsonLd({
      headline: entry.data.title,
      description: entry.data.lead,
      datePublished: entry.data.date,
      pageUrl,
      image: ogImage,
      locale,
    }),
  };
}
