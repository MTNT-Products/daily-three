/**
 * Re-fetch / normalize hero images for existing digest markdown files.
 * Usage: npm run images:re-enrich
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { enrichHeroImage } from './ogp.js';

type DigestFrontmatter = {
  title: string;
  date: string;
  lead: string;
  articles: {
    title: string;
    summary: string;
    source: string;
    sourceId: string;
    url: string;
    image?: string;
    images?: string[];
    video?: unknown;
  }[];
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

async function byteSize(url: string): Promise<number> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return 0;
    return (await res.arrayBuffer()).byteLength;
  } catch {
    return 0;
  }
}

async function main() {
  const dir = join(process.cwd(), 'src', 'content', 'digest');
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const path = join(dir, file);
    const { data, body } = parseDigestFile(path);
    console.log(`[re-enrich] ${file}`);

    for (const article of data.articles) {
      const before = article.image;
      const beforeKb = before ? Math.round((await byteSize(before)) / 1024) : 0;

      const improved = await enrichHeroImage(article);
      if (improved) {
        article.image = improved;
        if (article.images?.length) {
          const rest = article.images.filter((u) => u !== improved);
          article.images = [improved, ...rest];
          if (article.images.length <= 1) delete article.images;
        }
      }

      const after = article.image;
      const afterKb = after ? Math.round((await byteSize(after)) / 1024) : 0;

      if (after && after !== before) {
        console.log(`  ↑ ${article.sourceId}: ${beforeKb}KB → ${afterKb}KB`);
        console.log(`    ${after}`);
      } else if (after) {
        console.log(`  = ${article.sourceId}: ${afterKb}KB (unchanged URL)`);
      } else {
        console.log(`  ! ${article.sourceId}: no image`);
      }
    }

    writeDigestFile(path, data, body);
  }

  console.log('[re-enrich] Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
