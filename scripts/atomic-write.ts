import { renameSync, writeFileSync } from 'node:fs';

/**
 * Write through a temp file, so an interrupted run cannot leave half a JSON document
 * behind. A truncated seen-urls.json used to make every later run fail on startup.
 */
export function writeJsonAtomic(path: string, value: unknown): string {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf-8');
  renameSync(tmp, path);
  return path;
}
