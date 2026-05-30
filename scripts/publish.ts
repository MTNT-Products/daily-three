import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestArticle } from './types.js';

export type PublishLocale = 'ja' | 'en';

export function publishDigest(
  date: Date,
  locale: PublishLocale,
  lead: string,
  articles: DigestArticle[],
) {
  const slug = date.toISOString().slice(0, 10);
  const dir = join(process.cwd(), 'src', 'content', 'digest', locale);
  mkdirSync(dir, { recursive: true });

  const displayTitle = formatDisplayDate(date, locale);
  const yamlArticles = articles
    .map((a) => {
      const lines = [
        `  - title: ${yamlQuote(a.title)}`,
        `    summary: ${yamlQuote(a.summary)}`,
        `    source: ${yamlQuote(a.source)}`,
        `    sourceId: ${yamlQuote(a.sourceId)}`,
        `    url: ${yamlQuote(a.url)}`,
      ];
      if (a.image) lines.push(`    image: ${yamlQuote(a.image)}`);
      if (a.images && a.images.length > 1) {
        lines.push('    images:');
        for (const img of a.images) {
          lines.push(`      - ${yamlQuote(img)}`);
        }
      }
      if (a.video) {
        lines.push(`    video:`);
        lines.push(`      provider: ${yamlQuote(a.video.provider)}`);
        lines.push(`      embedUrl: ${yamlQuote(a.video.embedUrl)}`);
      }
      return lines.join('\n');
    })
    .join('\n');

  const body = `---
title: ${yamlQuote(displayTitle)}
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

function formatDisplayDate(d: Date, locale: PublishLocale) {
  if (locale === 'ja') {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
