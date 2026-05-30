/**
 * Backfill images[] / video for existing digest markdown files.
 * Usage: npm run media:re-enrich
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

function listDigestMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...listDigestMarkdownFiles(path));
    else if (name.endsWith('.md')) out.push(path);
  }
  return out;
}

async function main() {
  const dir = join(process.cwd(), 'src', 'content', 'digest');
  const files = listDigestMarkdownFiles(dir);

  for (const digestPath of files) {
    const { data, body } = parseDigestFile(digestPath);
    console.log(`[media] ${digestPath.replace(/.*digest[\\/]/, '')}`);

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

    writeDigestFile(digestPath, data, body);
  }

  console.log('[media] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
