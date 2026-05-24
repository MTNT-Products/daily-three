import Parser from 'rss-parser';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { RawArticle, SourceConfig } from './types.js';

const parser = new Parser({ timeout: 15000 });
const SEEN_PATH = join(process.cwd(), 'data', 'seen-urls.json');
const MAX_AGE_HOURS = 48;

export async function collectArticles(sources: SourceConfig[]): Promise<RawArticle[]> {
  const seen = loadSeen();
  const articles: RawArticle[] = [];
  const cutoff = Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000;

  for (const source of sources) {
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
          image: item.enclosure?.url,
        });
      }
    } catch (err) {
      console.warn(`[collect] Failed ${source.name}:`, err instanceof Error ? err.message : err);
    }
  }

  return articles;
}

export function markSeen(urls: string[]) {
  const seen = new Set([...loadSeen(), ...urls]);
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  writeFileSync(SEEN_PATH, JSON.stringify([...seen].slice(-5000), null, 2));
}

function loadSeen(): string[] {
  if (!existsSync(SEEN_PATH)) return [];
  return JSON.parse(readFileSync(SEEN_PATH, 'utf-8')) as string[];
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').trim();
}

function hashUrl(url: string) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h << 5) - h + url.charCodeAt(i);
  return Math.abs(h).toString(36);
}
