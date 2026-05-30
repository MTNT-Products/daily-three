import { getCollection } from 'astro:content';
import { parseDigestEntryId, type Locale } from '../i18n/ui';

export async function getDigestsForLocale(locale: Locale) {
  const all = await getCollection('digest');
  return all
    .filter((e) => parseDigestEntryId(e.id)?.locale === locale)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function digestSlugFromEntryId(entryId: string): string {
  return parseDigestEntryId(entryId)?.slug ?? entryId;
}

export async function digestExists(locale: Locale, slug: string): Promise<boolean> {
  const all = await getCollection('digest');
  return all.some((e) => e.id === `${locale}/${slug}`);
}
