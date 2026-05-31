import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { digestCalendarDate, DIGEST_TIMEZONE } from './digest-schedule.js';
import type { DigestArticle } from './types.js';

export type PublishLocale = 'ja' | 'en';

export function publishDigest(
  date: Date,
  locale: PublishLocale,
  lead: string,
  articles: DigestArticle[],
) {
  const slug = digestCalendarDate(date);
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
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: DIGEST_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    }).formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}年${get('month')}月${get('day')}日（${get('weekday')}）`;
  }
  return d.toLocaleDateString('en-US', {
    timeZone: DIGEST_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
