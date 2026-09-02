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

export type AdjacentDigest = { slug: string; title: string };

/** `digests` must be newest-first (same order as `getDigestsForLocale`). */
export function adjacentDigests(
  digests: { id: string; data: { title: string } }[],
  currentSlug: string,
): { older: AdjacentDigest | null; newer: AdjacentDigest | null } {
  const index = digests.findIndex((d) => digestSlugFromEntryId(d.id) === currentSlug);
  if (index < 0) return { older: null, newer: null };
  const toRef = (entry: (typeof digests)[number] | undefined): AdjacentDigest | null =>
    entry ? { slug: digestSlugFromEntryId(entry.id), title: entry.data.title } : null;
  return {
    newer: toRef(digests[index - 1]),
    older: toRef(digests[index + 1]),
  };
}

export async function digestExists(locale: Locale, slug: string): Promise<boolean> {
  const all = await getCollection('digest');
  return all.some((e) => e.id === `${locale}/${slug}`);
}
