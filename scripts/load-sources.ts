import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { SourcesFile } from './types.js';

const KEYWORD_LISTS = ['boost_keywords', 'penalty_keywords', 'low_priority_keywords'] as const;

/**
 * Read and check sources.yaml. It used to be read from the current directory and cast
 * without a look, so a typo in the scoring block surfaced as `undefined is not iterable`
 * halfway through a run.
 */
export function loadSourcesFile(root = process.cwd()): SourcesFile {
  const path = join(root, 'sources.yaml');

  let parsed: unknown;
  try {
    parsed = parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    throw new Error(`${path} could not be read: ${(e as Error).message}`);
  }

  const config = parsed as Partial<SourcesFile> | null;
  if (!config || typeof config !== 'object') throw new Error(`${path} is not a mapping`);
  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(`${path} has no sources`);
  }
  for (const [i, source] of config.sources.entries()) {
    if (!source?.id || !source?.url || !source?.category) {
      throw new Error(`${path}: sources[${i}] needs id, url and category`);
    }
  }
  const scoring = config.scoring;
  if (!scoring || typeof scoring !== 'object') throw new Error(`${path} has no scoring block`);
  for (const list of KEYWORD_LISTS) {
    if (!Array.isArray(scoring[list])) {
      throw new Error(`${path}: scoring.${list} must be a list`);
    }
  }

  return config as SourcesFile;
}
