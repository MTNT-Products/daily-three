import { readFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { writeJsonAtomic } from '../atomic-write.js';
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
    if (!Array.isArray(parsed)) throw new Error('not a JSON array');
    return parsed as SocialLogEntry[];
  } catch (e) {
    // Starting a new log in place would let the next save overwrite the whole history
    // with one entry, and re-post articles already sent. Keep the damaged file.
    console.warn(`[social] social-log.json is unreadable (${(e as Error).message})`);
    try {
      renameSync(path, `${path}.corrupt`);
      console.warn(`[social] kept it as ${path}.corrupt and started a new log`);
    } catch {
      /* keep going even if the quarantine copy cannot be written */
    }
    return [];
  }
}

export function saveSocialLog(entries: SocialLogEntry[], root = process.cwd()): string {
  const path = socialLogPath(root);
  mkdirSync(dirname(path), { recursive: true });
  return writeJsonAtomic(path, entries.slice(-MAX_ENTRIES));
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
