/**
 * Backfill images[] / video for existing digest markdown files.
 * Usage: npm run media:re-enrich
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { enrichArticleMedia } from './ogp.js';
import type { DigestArticle } from './types.js';

type DigestFrontmatter = {
  title: string;
  date: string;
  lead: string;
  articles: DigestArticle[];
};

function parseDigestFile(path: string): { data: DigestFrontmatter; body: string } {
  const raw = readFileSync(path, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Invalid frontmatter: ${path}`);
  return { data: parse(match[1]) as DigestFrontmatter, body: match[2] };
}

function writeDigestFile(path: string, data: DigestFrontmatter, body: string) {
  const yaml = stringify(data, { lineWidth: 0 });
  writeFileSync(path, `---\n${yaml}---\n${body}`, 'utf8');
}

async function main() {
  const dir = join(process.cwd(), 'src', 'content', 'digest');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const path = join(dir, file);
    const { data, body } = parseDigestFile(path);
    console.log(`[media] ${file}`);

    for (const article of data.articles) {
      const beforeCount = article.images?.length ?? (article.image ? 1 : 0);
      const hadVideo = Boolean(article.video);

      const enriched = await enrichArticleMedia(article);
      Object.assign(article, enriched);

      const afterCount = article.images?.length ?? (article.image ? 1 : 0);
      const parts = [`${afterCount} image(s)`];
      if (article.video) parts.push(`video:${article.video.provider}`);
      const changed = afterCount !== beforeCount || Boolean(article.video) !== hadVideo;
      console.log(`  ${changed ? '↑' : '='} ${article.sourceId}: ${parts.join(', ')}`);
    }

    writeDigestFile(path, data, body);
  }

  console.log('[media] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
