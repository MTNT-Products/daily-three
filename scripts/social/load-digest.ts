import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { digestWeekdayIndex } from '../digest-schedule.js';
import type { PickReason, SocialDigest, SocialPick } from './types.js';

export type DigestLocale = 'ja' | 'en';

function digestDir(locale: DigestLocale, root = process.cwd()) {
  return join(root, 'src', 'content', 'digest', locale);
}

/** Newest YYYY-MM-DD that exists in the ja digest directory. */
export function latestDigestDate(root = process.cwd()): string | null {
  const dir = digestDir('ja', root);
  if (!existsSync(dir)) return null;

  const dates = readdirSync(dir)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n))
    .map((n) => n.replace(/\.md$/, ''))
    .sort();
  return dates.at(-1) ?? null;
}

export function readDigest(
  locale: DigestLocale,
  date: string,
  root = process.cwd(),
): SocialDigest | null {
  const path = join(digestDir(locale, root), `${date}.md`);
  if (!existsSync(path)) return null;

  const raw = readFileSync(path, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fm = parse(match[1]) as Partial<SocialDigest>;
  if (!fm.articles || fm.articles.length === 0) return null;

  return {
    date: fm.date ?? date,
    title: fm.title ?? date,
    lead: fm.lead ?? '',
    articles: fm.articles,
  };
}

/**
 * Weekday rotation: Mon = 1st article, Tue = 2nd, Wed = 3rd, Thu = 1st, Fri = 2nd.
 * Weekend editions (manual runs) fall back to the 1st.
 */
export function rotationIndex(digestDate: string, count: number): number {
  if (count <= 0) return 0;
  const weekday = digestWeekdayIndex(new Date(`${digestDate}T12:00:00+09:00`));
  const offset = weekday >= 1 && weekday <= 5 ? weekday - 1 : 0;
  return offset % count;
}

/**
 * Which of the three to feature.
 * A reader-voted Good outranks the rotation; anything already posted is skipped.
 */
export function pickArticle(params: {
  digestDate: string;
  urls: string[];
  goodCounts?: Record<string, number>;
  postedUrls?: string[];
}): SocialPick {
  const { digestDate, urls } = params;
  const goodCounts = params.goodCounts ?? {};
  const posted = new Set(params.postedUrls ?? []);
  const start = rotationIndex(digestDate, urls.length);

  // Rotation order, starting at today's slot, so ties resolve to the rotation pick.
  const order = urls.map((_, i) => (start + i) % urls.length);
  const fresh = order.filter((i) => !posted.has(urls[i]));

  const voted = fresh
    .filter((i) => (goodCounts[urls[i]] ?? 0) > 0)
    .sort((a, b) => (goodCounts[urls[b]] ?? 0) - (goodCounts[urls[a]] ?? 0));
  if (voted.length > 0) return { index: voted[0], reason: 'feedback' };

  if (fresh.includes(start)) return { index: start, reason: 'rotation' };
  if (fresh.length > 0) return { index: fresh[0], reason: 'fallback' };
  return { index: start, reason: 'fallback' };
}

export function digestUrl(digestDate: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/ja/digest/${digestDate}/`;
}
