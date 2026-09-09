import Parser from 'rss-parser';
import { readFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { CollectionConfig, RawArticle, SourceConfig } from './types.js';
import { normalizeImageUrl } from './image-url.js';
import { writeJsonAtomic } from './atomic-write.js';

/** Publishers drop unlabelled clients first; an unnamed fetcher invites a block. */
const FEED_USER_AGENT =
  'daily-three-digest/1.0 (+https://github.com/MTNT-Products/daily-three)';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': FEED_USER_AGENT },
});
const SEEN_PATH = join(process.cwd(), 'data', 'seen-urls.json');

const DEFAULT_MAX_AGE_HOURS: CollectionConfig['max_age_hours'] = {
  product: 48,
  automotive: 168,
};

export function resolveMaxAgeHours(collection?: CollectionConfig): CollectionConfig['max_age_hours'] {
  return {
    product: collection?.max_age_hours?.product ?? DEFAULT_MAX_AGE_HOURS.product,
    automotive: collection?.max_age_hours?.automotive ?? DEFAULT_MAX_AGE_HOURS.automotive,
  };
}

export async function collectArticles(
  sources: SourceConfig[],
  collection?: CollectionConfig,
): Promise<RawArticle[]> {
  const seen = loadSeen();
  const articles: RawArticle[] = [];
  const maxAgeHours = resolveMaxAgeHours(collection);
  let failed = 0;

  for (const source of sources) {
    const maxAge = maxAgeHours[source.category];
    const cutoff = Date.now() - maxAge * 60 * 60 * 1000;

    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items) {
        if (!item.link || !item.title) continue;
        const pub = item.isoDate ? new Date(item.isoDate) : new Date();
        if (pub.getTime() < cutoff) continue;
        if (seen.includes(item.link)) continue;

        articles.push({
          id: hashUrl(item.link),
          title: stripHtml(item.title),
          summary: stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 500),
          url: item.link,
          publishedAt: pub,
          sourceId: source.id,
          sourceName: source.name,
          category: source.category,
          // Kept raw. Normalising here threw away the only copy of the publisher's
          // own URL, and the hero resolver probes both forms anyway.
          image: item.enclosure?.url?.trim() || undefined,
        });
      }
    } catch (err) {
      failed++;
      console.warn(`[collect] Failed ${source.name}:`, err instanceof Error ? err.message : err);
    }
  }

  // Every feed failing is an outage, not a quiet news day. Reported as success, it left
  // the digest silently empty for as long as the outage lasted.
  if (sources.length > 0 && failed === sources.length) {
    throw new Error(
      `[collect] all ${failed} source(s) failed - not reporting an empty run as success`,
    );
  }
  if (failed > 0) {
    console.warn(`[collect] ${failed}/${sources.length} source(s) failed`);
  }

  return articles;
}

export function markSeen(urls: string[]) {
  const seen = new Set([...loadSeen(), ...urls]);
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeJsonAtomic(SEEN_PATH, [...seen].slice(-5000));
}

export function loadSeen(): string[] {
  if (!existsSync(SEEN_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(SEEN_PATH, 'utf-8')) as unknown;
    if (!Array.isArray(parsed)) throw new Error('not a JSON array');
    return parsed.filter((u): u is string => typeof u === 'string');
  } catch (e) {
    // Unguarded, a half-written file threw here on every run from then on. Set it aside
    // and carry on: the worst case is re-offering an article that was already seen.
    console.warn(
      `[collect] seen-urls.json is unreadable (${(e as Error).message}) - setting it aside`,
    );
    try {
      renameSync(SEEN_PATH, `${SEEN_PATH}.corrupt`);
    } catch {
      /* keep going even if the quarantine copy cannot be written */
    }
    return [];
  }
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').trim();
}

function hashUrl(url: string) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h << 5) - h + url.charCodeAt(i);
  return Math.abs(h).toString(36);
}
