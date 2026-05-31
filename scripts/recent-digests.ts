import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { ScoredArticle } from './types.js';

export type RecentStory = {
  date: string;
  title: string;
  url: string;
  topicKey: string;
};

type DigestFrontmatter = {
  date?: string;
  articles?: { title?: string; url?: string }[];
};

const STOPWORDS = new Set([
  'about', 'after', 'and', 'are', 'from', 'that', 'this', 'with', 'your', 'have', 'will',
  'into', 'their', 'what', 'when', 'where', 'which', 'while', 'would', 'could', 'should',
  'design', 'designs', 'designer', 'studio', 'first', 'news', 'technology',
]);

/** Topic tokens from article URL slug (for cross-outlet duplicate detection). */
export function topicKeyFromUrl(url: string): string {
  return topicKeyFromArticle(url);
}

/** Slug + title tokens (English RSS titles vs Japanese digest titles). */
export function topicKeyFromArticle(url: string, title = ''): string {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    const raw = `${slug} ${title}`.toLowerCase().split(/[^a-z0-9]+/);
    const tokens = raw.filter((t) => t.length > 3 && !STOPWORDS.has(t));
    return [...new Set(tokens)].sort().join('|');
  } catch {
    return '';
  }
}

function overlapTokenCount(a: string, b: string): number {
  if (!a || !b) return 0;
  const setB = new Set(b.split('|'));
  let n = 0;
  for (const t of a.split('|')) {
    if (setB.has(t)) n++;
  }
  return n;
}

/** Load stories from recent ja digest files (default: last 7 calendar days). */
export function loadRecentStories(maxAgeDays = 7): RecentStory[] {
  const dir = join(process.cwd(), 'src', 'content', 'digest', 'ja');
  if (!existsSync(dir)) return [];

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const stories: RecentStory[] = [];

  for (const name of readdirSync(dir)) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) continue;
    const date = name.replace(/\.md$/, '');
    if (new Date(`${date}T12:00:00Z`).getTime() < cutoff) continue;

    const raw = readFileSync(join(dir, name), 'utf-8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;

    const fm = parse(match[1]) as DigestFrontmatter;
    for (const a of fm.articles ?? []) {
      if (!a.url || !a.title) continue;
      stories.push({
        date: fm.date ?? date,
        title: a.title,
        url: a.url,
        topicKey: topicKeyFromArticle(a.url, a.title),
      });
    }
  }

  return stories;
}

/** Lower score when a candidate repeats a story already covered recently. */
export function applyRecentTopicPenalty(
  articles: ScoredArticle[],
  recent: RecentStory[],
): ScoredArticle[] {
  if (recent.length === 0) return articles;

  return articles
    .map((a) => {
      let score = a.score;
      const key = topicKeyFromArticle(a.url, a.title);

      for (const r of recent) {
        if (r.url === a.url) {
          score -= 50;
          continue;
        }
        const overlap = overlapTokenCount(key, r.topicKey);
        if (overlap >= 4) score -= 35;
        else if (overlap >= 3) score -= 22;
        else if (overlap >= 2) score -= 10;
      }

      return { ...a, score };
    })
    .sort((x, y) => y.score - x.score);
}

export function formatRecentForLlm(recent: RecentStory[]): string {
  if (recent.length === 0) return '';
  const lines = recent.map((r) => `- ${r.date}: ${r.title} (${r.url})`);
  return `\nRecently covered in the last week (do NOT pick the same story again, even from another outlet):\n${lines.join('\n')}\n`;
}
