import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { FeedbackEntry } from './types.js';

const exportPath = process.argv[2];
if (!exportPath) {
  console.error('Usage: npm run feedback:merge -- <export.jsonl>');
  process.exit(1);
}

const targetPath = join(process.cwd(), 'data', 'feedback.jsonl');

function parseJsonl(text: string): FeedbackEntry[] {
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FeedbackEntry);
}

const byUrl = new Map<string, FeedbackEntry>();

if (existsSync(targetPath)) {
  const existing = readFileSync(targetPath, 'utf-8').trim();
  if (existing) {
    try {
      for (const entry of parseJsonl(existing)) {
        byUrl.set(entry.url, entry);
      }
    } catch {
      /* start fresh if corrupt */
    }
  }
}

let added = 0;
for (const entry of parseJsonl(readFileSync(exportPath, 'utf-8'))) {
  const existed = byUrl.has(entry.url);
  byUrl.set(entry.url, entry);
  if (!existed) added += 1;
}

const merged = [...byUrl.values()].sort((a, b) => a.date.localeCompare(b.date) || a.url.localeCompare(b.url));
const body = merged.map((e) => JSON.stringify(e)).join('\n');

mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, body ? `${body}\n` : '', 'utf-8');

console.log(`[feedback:merge] ${merged.length} entries in ${targetPath} (${added} new)`);
