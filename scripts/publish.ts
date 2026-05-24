import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestArticle } from './types.js';

export function publishDigest(date: Date, lead: string, articles: DigestArticle[]) {
  const slug = date.toISOString().slice(0, 10);
  const dir = join(process.cwd(), 'src', 'content', 'digest');
  mkdirSync(dir, { recursive: true });

  const jaDate = formatJaDate(date);
  const yamlArticles = articles
    .map(
      (a) => `  - title: ${yamlQuote(a.title)}
    summary: ${yamlQuote(a.summary)}
    source: ${yamlQuote(a.source)}
    url: ${yamlQuote(a.url)}
    image: ${a.image ? yamlQuote(a.image) : '""'}`,
    )
    .join('\n');

  const body = `---
title: ${yamlQuote(jaDate)}
date: ${slug}
lead: ${yamlQuote(lead)}
articles:
${yamlArticles}
---

`;

  const path = join(dir, `${slug}.md`);
  writeFileSync(path, body, 'utf-8');
  return path;
}

function yamlQuote(s: string) {
  const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  return `"${escaped}"`;
}

function formatJaDate(d: Date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}
