import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export type SourceCategory = 'automotive' | 'product';

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  weight: number;
  category: SourceCategory;
}

export interface PublicSource {
  name: string;
  homepage: string;
  categories: SourceCategory[];
}

interface SourcesFile {
  sources: SourceConfig[];
}

export function homepageFromFeedUrl(feedUrl: string): string {
  const parsed = new URL(feedUrl);
  return `${parsed.protocol}//${parsed.host}/`;
}

/** Collapse feed rows that share a site (e.g. Designboom auto + design). */
export function listPublicSources(sources: SourceConfig[]): PublicSource[] {
  const byHost = new Map<string, PublicSource>();
  const order: string[] = [];

  for (const source of sources) {
    const homepage = homepageFromFeedUrl(source.url);
    const host = new URL(homepage).host;
    const existing = byHost.get(host);
    if (!existing) {
      byHost.set(host, {
        name: source.name,
        homepage,
        categories: [source.category],
      });
      order.push(host);
      continue;
    }
    if (source.name.length < existing.name.length) {
      existing.name = source.name;
    }
    if (!existing.categories.includes(source.category)) {
      existing.categories.push(source.category);
    }
  }

  return order.map((host) => byHost.get(host)!);
}

export function loadSourceConfigs(rootDir = process.cwd()): SourceConfig[] {
  const file = parse(readFileSync(join(rootDir, 'sources.yaml'), 'utf-8')) as SourcesFile;
  return file.sources;
}
