import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { SocialLogEntry } from './types.js';

/** Keep the log bounded — it is committed on every run. */
const MAX_ENTRIES = 200;

export function socialLogPath(root = process.cwd()): string {
  return join(root, 'data', 'social-log.json');
}

export function loadSocialLog(root = process.cwd()): SocialLogEntry[] {
  const path = socialLogPath(root);
  if (!existsSync(path)) return [];

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
    return Array.isArray(parsed) ? (parsed as SocialLogEntry[]) : [];
  } catch {
    console.warn('[social] social-log.json is unreadable — starting a new log');
    return [];
  }
}

export function saveSocialLog(entries: SocialLogEntry[], root = process.cwd()): string {
  const path = socialLogPath(root);
  mkdirSync(dirname(path), { recursive: true });
  const trimmed = entries.slice(-MAX_ENTRIES);
  writeFileSync(path, `${JSON.stringify(trimmed, null, 2)}\n`, 'utf-8');
  return path;
}

export function postedUrls(entries: SocialLogEntry[]): string[] {
  return entries.map((e) => e.articleUrl);
}

/** Most recent Japanese bodies, newest last — fed to both the model and the duplicate check. */
export function recentBodies(entries: SocialLogEntry[], count = 10): string[] {
  return entries.slice(-count).map((e) => e.jaBody ?? e.jaText);
}

export function hasDraftFor(entries: SocialLogEntry[], digestDate: string): boolean {
  return entries.some((e) => e.digestDate === digestDate);
}
