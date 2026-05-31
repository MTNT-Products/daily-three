import type { ScoredArticle } from './types.js';
import type { RecentStory } from './recent-digests.js';
import { topicKeyFromArticle } from './recent-digests.js';

/** Tokens that identify format/outlet, not the news subject. */
const ENTITY_NOISE = new Set([
  'about', 'after', 'and', 'are', 'from', 'that', 'this', 'with', 'your', 'have', 'will',
  'into', 'their', 'what', 'when', 'where', 'which', 'while', 'would', 'could', 'should',
  'design', 'designs', 'designer', 'studio', 'first', 'news', 'technology', 'features',
  'featured', 'agenda', 'debate', 'podcast', 'weekly', 'magazine', 'comments', 'unveils',
  'unveil', 'launch', 'launches', 'launched', 'dezeen', 'designboom', 'lovefrom',
]);

const META_ANGLE_RE =
  /(podcast|weekly|review|analysis|analysing|evaluat|first[\s-]?drive|hands[\s-]?on|year[\s-]?in[\s-]?review)/i;

/** Minimum shared entity tokens to treat as the same news event. */
export const ENTITY_OVERLAP_THRESHOLD = 4;

export type StoryAngle = 'meta' | 'other';

/** Product/brand tokens for cross-outlet duplicate detection. */
export function storyEntityKey(url: string, title = ''): string {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    const raw = `${slug} ${title}`.toLowerCase().split(/[^a-z0-9]+/);
    const tokens = [...new Set(raw)].filter((t) => t.length > 3 && !ENTITY_NOISE.has(t));
    return tokens.sort().join('|');
  } catch {
    return '';
  }
}

/** Follow-up angles (podcast, review) may repeat a recently covered product story. */
export function storyAngle(url: string, title = ''): StoryAngle {
  const hay = `${url} ${title}`.toLowerCase();
  return META_ANGLE_RE.test(hay) ? 'meta' : 'other';
}

function entityOverlap(a: string, b: string): number {
  if (!a || !b) return 0;
  const setB = new Set(b.split('|'));
  let n = 0;
  for (const t of a.split('|')) {
    if (setB.has(t)) n++;
  }
  return n;
}

/** Same product story across languages (e.g. Ferrari Luce podcast vs roundup). */
export function hasStrongProductOverlap(a: string, b: string, minShared = 2): boolean {
  if (!a || !b) return false;
  const setB = new Set(b.split('|'));
  let n = 0;
  for (const t of a.split('|')) {
    if (t.length >= 4 && setB.has(t)) n++;
  }
  return n >= minShared;
}

export type StoryFingerprint = {
  entityKey: string;
  angle: StoryAngle;
};

export function storyFingerprint(url: string, title = ''): StoryFingerprint {
  return { entityKey: storyEntityKey(url, title), angle: storyAngle(url, title) };
}

/**
 * True when `candidate` repeats a story in `baseline` and is not an allowed meta follow-up.
 * `baseline` is usually a recent digest pick; `candidate` is today's pool item.
 */
export function repeatsRecentStory(
  candidate: StoryFingerprint,
  baseline: StoryFingerprint,
): boolean {
  if (!candidate.entityKey || !baseline.entityKey) return false;
  if (entityOverlap(candidate.entityKey, baseline.entityKey) < ENTITY_OVERLAP_THRESHOLD) {
    return false;
  }
  return candidate.angle !== 'meta';
}

function dedupKey(article: { url: string; title: string }): StoryFingerprint {
  return storyFingerprint(article.url, article.title);
}

/**
 * Hard-remove candidates that repeat a story from recent digests or a higher-scored sibling.
 */
export function filterDuplicateStories(
  articles: ScoredArticle[],
  recent: RecentStory[],
): ScoredArticle[] {
  const recentPrints = recent.map((r) => storyFingerprint(r.url, r.title));
  const kept: ScoredArticle[] = [];

  for (const article of articles) {
    const fp = dedupKey(article);

    if (article.url && recent.some((r) => r.url === article.url)) {
      console.log(`[dedup] skip (seen URL): ${article.title.slice(0, 60)}`);
      continue;
    }

    const recentHit = recentPrints.some((r) => repeatsRecentStory(fp, r));
    if (recentHit) {
      console.log(`[dedup] skip (recent story): ${article.title.slice(0, 60)}`);
      continue;
    }

    const slugEntity = storyEntityKey(article.url, '');
    const productHit = recent.some((r) => {
      const recentSlug = storyEntityKey(r.url, '');
      const recentFull = storyEntityKey(r.url, r.title);
      if (fp.angle === 'meta') return false;
      return (
        hasStrongProductOverlap(fp.entityKey, recentSlug) ||
        hasStrongProductOverlap(fp.entityKey, recentFull) ||
        hasStrongProductOverlap(slugEntity, recentSlug)
      );
    });
    if (productHit) {
      console.log(`[dedup] skip (same product): ${article.title.slice(0, 60)}`);
      continue;
    }

    const siblingHit = kept.some((k) => repeatsRecentStory(fp, dedupKey(k)));
    if (siblingHit) {
      console.log(`[dedup] skip (duplicate in pool): ${article.title.slice(0, 60)}`);
      continue;
    }

    // Legacy slug overlap (catches near-matches entity key misses)
    const topicKey = topicKeyFromArticle(article.url, article.title);
    const topicHit = recent.some((r) => {
      const overlap = entityOverlap(topicKey, r.topicKey);
      return overlap >= ENTITY_OVERLAP_THRESHOLD && fp.angle !== 'meta';
    });
    if (topicHit) {
      console.log(`[dedup] skip (topic slug): ${article.title.slice(0, 60)}`);
      continue;
    }

    kept.push(article);
  }

  return kept;
}
