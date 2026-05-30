import * as cheerio from 'cheerio';
import {
  isSquareCroppedImageUrl,
  normalizeImageUrl,
  pickLargestImageUrl,
  scoreImageUrl,
} from './image-url.js';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchHeadersFor(url: string): Record<string, string> {
  const headers: Record<string, string> = { 'User-Agent': BROWSER_UA };
  if (url.includes('static.dezeen.com')) headers.Referer = 'https://www.dezeen.com/';
  if (url.includes('designboom.com')) headers.Referer = 'https://www.designboom.com/';
  if (url.includes('core77.com')) headers.Referer = 'https://www.core77.com/';
  return headers;
}

/** Prefer non-square heroes by URL score, then file size among reachable assets. */
export async function pickLargestReachableUrl(candidates: string[]): Promise<string | undefined> {
  const unique = [...new Set(candidates.map((u) => u.trim()).filter(Boolean))];
  const ranked: { url: string; score: number; bytes: number }[] = [];

  for (const url of unique) {
    try {
      const res = await fetch(url, {
        headers: fetchHeadersFor(url),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const bytes = (await res.arrayBuffer()).byteLength;
      ranked.push({ url, score: scoreImageUrl(url), bytes });
    } catch {
      /* try next */
    }
  }

  if (ranked.length === 0) return undefined;
  ranked.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.bytes - a.bytes));
  return ranked[0].url;
}

/** Dezeen serves full-size files under different suffixes than OGP/RSS thumbnails. */
export function expandDezeenCandidates(url: string): string[] {
  const out = new Set<string>([url]);
  if (!url.includes('static.dezeen.com')) return [...out];

  const dir = url.slice(0, url.lastIndexOf('/') + 1);
  const file = url.slice(url.lastIndexOf('/') + 1);
  const ext = file.match(/\.[a-z]+$/i)?.[0] ?? '.jpg';
  const base = file.replace(/\.[a-z]+$/i, '');

  if (/_dezeen_hero_col/i.test(base)) {
    const stem = base.replace(/_dezeen_hero_col/i, '_dezeen_2364_col');
    out.add(`${dir}${stem}${ext}`);
    const stemNoSq = stem.replace(/^sq-/i, '');
    if (stemNoSq !== stem) out.add(`${dir}${stemNoSq}${ext}`);
    const heroStem = base.replace(/_dezeen_hero_col.*$/i, '');
    for (const s of [heroStem, heroStem.replace(/^sq-/i, '')]) {
      out.add(`${dir}${s}_dezeen_2364_col_hero${ext}`);
      out.add(`${dir}${s}_dezeen_2364_hero${ext}`);
    }
  }

  if (/-sq$/i.test(base) && !/_dezeen_/i.test(base)) {
    const stem = base.replace(/-sq$/i, '');
    out.add(`${dir}${stem}_dezeen_2364_col_hero${ext}`);
    out.add(`${dir}${stem}_dezeen_2364_hero${ext}`);
  }

  if (/_dezeen_2364$/i.test(base)) {
    const stem = base.replace(/_dezeen_2364$/i, '');
    out.add(`${dir}${stem}_dezeen_2364_hero${ext}`);
    out.add(`${dir}${stem}_dezeen_2364_col_hero${ext}`);
  }

  if (/_dezeen_\d+_col_sq-\d+x\d+$/i.test(base)) {
    const stem = base.replace(/_dezeen_\d+_col_sq-\d+x\d+$/i, '');
    out.add(`${dir}${stem}_dezeen_2364_col_hero${ext}`);
  }

  if (/_square$/i.test(base)) {
    const stem = base.replace(/_dezeen_\d+_square$/i, '').replace(/_square$/i, '');
    out.add(`${dir}${stem}_dezeen_2364_col_hero${ext}`);
    out.add(`${dir}${stem}_dezeen_2364_hero${ext}`);
    out.add(`${dir}${stem}_dezeen_hero_col${ext}`);
    for (let n = 0; n <= 3; n++) {
      out.add(`${dir}${stem}_dezeen_2364_col_${n}${ext}`);
    }
  }

  if (/_dezeen_\d+_sq\d*$/i.test(base)) {
    const stem = base.replace(/_dezeen_\d+_sq\d*$/i, '');
    out.add(`${dir}${stem}_dezeen_2364_col_hero${ext}`);
    out.add(`${dir}${stem}_dezeen_2364_hero${ext}`);
    out.add(`${dir}${stem}_dezeen_2364_col_1${ext}`);
  }

  return [...out];
}

/** Lazy-load URLs may include ephemeral hashes; add stable size paths without the hash. */
export function expandDesignboomCandidates(url: string): string[] {
  const out = new Set<string>([url]);
  if (!/designboom\.com/i.test(url)) return [...out];

  const dir = url.slice(0, url.lastIndexOf('/') + 1);
  const file = url.slice(url.lastIndexOf('/') + 1);
  const ext = file.match(/\.[a-z]+$/i)?.[0] ?? '.jpg';

  const hashed = file.match(/^(.*designboom-)(\d{3,4})-[a-z0-9]{6,}(\.[a-z]+)$/i);
  if (hashed) {
    out.add(`${dir}${hashed[1]}${hashed[2]}${hashed[3]}`);
  }

  const sized = file.match(/^(.*designboom-)(\d{3,4})(-\d+)?(\.[a-z]+)$/i);
  if (sized && !hashed) {
    out.add(`${dir}${sized[1]}${sized[2]}${sized[4]}`);
  }

  return [...out];
}

export async function fetchDesignboomCandidates(pageUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const found = new Set<string>();

    for (const m of html.matchAll(
      /https:\/\/static\.designboom\.com\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|webp)/gi,
    )) {
      found.add(m[0]);
    }

    for (const m of html.matchAll(
      /https:\/\/www\.designboom\.com\/wp-content\/uploads\/[^"'\s>]+\.(?:jpg|jpeg|webp)/gi,
    )) {
      found.add(m[0].replace('www.designboom.com', 'static.designboom.com'));
    }

    const ranked = [...found].sort((a, b) => scoreDesignboomPath(b) - scoreDesignboomPath(a));
    return ranked;
  } catch {
    return [];
  }
}

function scoreDesignboomPath(url: string): number {
  if (/-large\d+\./i.test(url)) return 1_000_000;
  if (/-1200\./i.test(url)) return 800_000;
  if (/-700-/.test(url)) return 100_000;
  if (/500x400|500\./i.test(url)) return 50_000;
  return 300_000;
}

function tokenMatchesSlugToken(token: string, file: string): boolean {
  const t = token.toLowerCase();
  if (file.includes(t)) return true;
  // Slug tokens like "nycxdesign" vs filenames "nyc-design-week"
  if (t.length >= 4) {
    for (let n = 3; n <= Math.min(5, t.length); n++) {
      if (file.includes(t.slice(0, n))) return true;
    }
  }
  return false;
}

function matchesDezeenArticleSlug(pageUrl: string, imageUrl: string): boolean {
  const slug = new URL(pageUrl).pathname.split('/').filter(Boolean).pop() ?? '';
  const tokens = slug.split('-').filter((t) => t.length > 2);
  const file = (imageUrl.split('/').pop() ?? '').toLowerCase();
  const hits = tokens.filter((t) => tokenMatchesSlugToken(t, file)).length;
  const need = Math.min(3, Math.max(2, tokens.length - 2));
  return hits >= need;
}

/** File stem without size suffix or _dezeen_* tail (for grouping gallery shots). */
function dezeenFileStem(url: string): string {
  const file = (url.split('/').pop() ?? '')
    .replace(/-\d+x\d+(?=\.[a-z]+$)/i, '')
    .replace(/-scaled(?=\.[a-z]+$)/i, '')
    .replace(/\.[a-z]+$/i, '');
  return file.replace(/_dezeen_.*$/i, '');
}

function collectDezeenUrlsFromChunk(chunk: string): string[] {
  const found = new Set<string>();
  for (const m of chunk.matchAll(/https?:\/\/static\.dezeen\.com\/uploads\/[^"'\s<>]+/gi)) {
    let u = m[0].replace(/^http:/i, 'https:');
    found.add(u);
    const base = u.replace(/-\d+x\d+(?=\.[a-z]+$)/i, '').replace(/-scaled(?=\.[a-z]+$)/i, '');
    if (base !== u) found.add(base);
  }
  return [...found];
}

/** When slug tokens do not appear in filenames, group by the hero image stem at top of RSS item. */
/** Drop related-article images that slipped through loose slug matching. */
function tightenDezeenGallery(urls: string[]): string[] {
  if (urls.length < 2) return urls;
  const anchorStem = dezeenFileStem(urls[0]);
  if (!anchorStem) return urls;
  const tight = urls.filter((u) => dezeenFileStem(u) === anchorStem);
  return tight.length >= 2 ? tight : urls;
}

function filterByDominantStem(urls: string[], sampleSize = 50): string[] {
  const head = urls.slice(0, sampleSize);
  let anchorStem = '';
  for (const u of head) {
    const stem = dezeenFileStem(u);
    if (!stem) continue;
    anchorStem = stem;
    break;
  }
  if (!anchorStem) return [];
  return urls.filter((u) => dezeenFileStem(u) === anchorStem);
}

/** Match the RSS <item> for this article, not a mention of the same URL inside another item. */
export function findDezeenFeedItemChunk(feedXml: string, pageUrl: string): string | undefined {
  const base = pageUrl.replace(/\/$/, '');
  for (const linkUrl of [base, `${base}/`]) {
    const anchor = feedXml.indexOf(`<link>${linkUrl}</link>`);
    if (anchor < 0) continue;
    const itemStart = feedXml.lastIndexOf('<item>', anchor);
    const itemEnd = feedXml.indexOf('</item>', anchor);
    if (itemStart >= 0 && itemEnd > itemStart) {
      return feedXml.slice(itemStart, itemEnd);
    }
  }
  return undefined;
}

function extractLinkedDezeenArticles(chunk: string, pageUrl: string): string[] {
  const self = pageUrl.replace(/\/$/, '');
  const links = new Set<string>();
  for (const m of chunk.matchAll(/href="(https:\/\/www\.dezeen\.com\/\d{4}\/\d{2}\/[^"#?]+)"/gi)) {
    const href = m[1].replace(/\/$/, '');
    if (href === self) continue;
    if (/\/tag\/|\/podcasts\/|newsletter|dezeenagenda|dezeen-debate|dezeenweekly/i.test(href)) continue;
    links.add(href);
  }
  return [...links];
}

function preferNonSquareDezeenImages(urls: string[]): string[] {
  const wide = urls.filter((u) => !isSquareCroppedImageUrl(u));
  return wide.length > 0 ? wide : urls;
}

function pickDezeenImagesFromChunk(chunk: string, pageUrl: string): string[] {
  const all = collectDezeenUrlsFromChunk(chunk);
  let picked = all.filter((u) => matchesDezeenArticleSlug(pageUrl, u));
  if (picked.length < 2) picked = filterByDominantStem(all);
  if (picked.length < 2) picked = all.slice(0, 80);
  return preferNonSquareDezeenImages(tightenDezeenGallery(picked));
}

/** Dezeen article HTML is often 403; RSS content:encoded still lists full-size WordPress assets. */
export async function fetchDezeenRssCandidates(pageUrl: string): Promise<string[]> {
  try {
    const res = await fetch('https://www.dezeen.com/feed/', {
      headers: fetchHeadersFor('https://www.dezeen.com/'),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const chunk = findDezeenFeedItemChunk(text, pageUrl);
    if (!chunk) return [];

    let picked = pickDezeenImagesFromChunk(chunk, pageUrl);

    if (picked.every((u) => isSquareCroppedImageUrl(u))) {
      for (const link of extractLinkedDezeenArticles(chunk, pageUrl).slice(0, 3)) {
        const linkedChunk = findDezeenFeedItemChunk(text, link);
        if (!linkedChunk) continue;
        const fromLinked = pickDezeenImagesFromChunk(linkedChunk, link);
        picked = preferNonSquareDezeenImages([...picked, ...fromLinked]);
        if (picked.some((u) => !isSquareCroppedImageUrl(u))) break;
      }
    }

    return picked;
  } catch {
    return [];
  }
}

function expandDezeenFromPageUrl(pageUrl: string): string[] {
  if (!pageUrl.includes('dezeen.com')) return [];
  try {
    const slug = new URL(pageUrl).pathname.replace(/\/$/, '').split('/').pop();
    if (!slug) return [];
    const m = pageUrl.match(/\/(\d{4})\/(\d{2})\//);
    if (!m) return [];
    const dir = `https://static.dezeen.com/uploads/${m[1]}/${m[2]}/`;
    const ext = '.jpg';
    return [
      `${dir}${slug}_dezeen_2364_col_hero${ext}`,
      `${dir}${slug}_dezeen_2364_hero${ext}`,
      `${dir}${slug}_dezeen_hero_col${ext}`,
    ];
  } catch {
    return [];
  }
}

export async function resolveHeroImage(
  pageUrl: string,
  sourceId: string | undefined,
  seed?: string,
): Promise<string | undefined> {
  if (pageUrl.includes('designboom.com')) {
    const fromPage = await fetchDesignboomCandidates(pageUrl);
    const seeds = seed ? [seed, ...fromPage] : fromPage;
    const normalized = seeds.map((u) => normalizeImageUrl(u, sourceId));
    return pickLargestReachableUrl([...new Set(normalized)]);
  }

  if (sourceId?.includes('dezeen') || pageUrl.includes('dezeen.com')) {
    const rss = await fetchDezeenRssCandidates(pageUrl);
    if (rss.length > 0) {
      const normalized = rss.map((u) => normalizeImageUrl(u, sourceId));
      const picked = await pickLargestReachableUrl([...new Set(normalized)]);
      if (picked) return picked;
    }

    const candidates = [...expandDezeenFromPageUrl(pageUrl)];
    if (seed) {
      candidates.push(seed, ...expandDezeenCandidates(seed));
    }
    const normalized = candidates.map((u) => normalizeImageUrl(u, sourceId));
    return pickLargestReachableUrl([...new Set(normalized)]);
  }

  if (!seed) return undefined;
  return pickLargestReachableUrl([normalizeImageUrl(seed, sourceId)]);
}
