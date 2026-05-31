import * as cheerio from 'cheerio';
import { isSquareCroppedImageUrl, normalizeImageUrl, scoreImageUrl } from './image-url.js';
import {
  expandDezeenCandidates,
  expandDesignboomCandidates,
  fetchDesignboomCandidates,
  fetchDezeenRssCandidates,
  findDezeenFeedItemChunk,
  pickLargestReachableUrl,
} from './resolve-hero-image.js';

export type ArticleVideo = {
  provider: 'youtube' | 'vimeo' | 'html5';
  embedUrl: string;
};

export type ArticleMedia = {
  images: string[];
  video?: ArticleVideo;
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MAX_GALLERY = 6;

function isRasterImageUrl(url: string): boolean {
  return /\.(?:jpe?g|png|webp|avif|gif)(?:\?|$)/i.test(url);
}

export async function fetchArticleMedia(
  pageUrl: string,
  sourceId?: string,
  heroSeed?: string,
): Promise<ArticleMedia> {
  const candidates: string[] = [];
  if (heroSeed) candidates.push(heroSeed);

  if (pageUrl.includes('designboom.com')) {
    candidates.push(...filterDesignboomArticle(pageUrl, await fetchDesignboomCandidates(pageUrl)));
  }

  if (sourceId?.includes('dezeen') || pageUrl.includes('dezeen.com')) {
    candidates.push(...(await fetchDezeenRssCandidates(pageUrl)));
    const rssVideo = await fetchDezeenRssVideo(pageUrl);
    const page = await fetchPageMedia(pageUrl);
    const images = await buildGalleryImages(candidates, sourceId, heroSeed);
    return { images, video: page.video ?? rssVideo };
  }

  const page = await fetchPageMedia(pageUrl);
  candidates.push(...page.images);
  const images = await buildGalleryImages(candidates, sourceId, heroSeed);
  return { images, video: page.video };
}

function filterDesignboomArticle(pageUrl: string, urls: string[]): string[] {
  const slug = new URL(pageUrl).pathname.split('/').filter(Boolean).pop() ?? '';
  const tokens = slug.split('-').filter((t) => t.length > 4);
  const matched = urls.filter((u) => {
    const file = (u.split('/').pop() ?? '').toLowerCase();
    return tokens.filter((t) => file.includes(t)).length >= 2;
  });
  return matched.length >= 2 ? matched : urls;
}

function isThumbnailUrl(url: string): boolean {
  return (
    isSquareCroppedImageUrl(url) ||
    /-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i.test(url) ||
    /_sq-\d|411x411|150x150|300x300/i.test(url)
  );
}

function imageUrlVariants(raw: string, sourceId?: string): string[] {
  const trimmed = raw.trim();
  const out = new Set<string>([trimmed, normalizeImageUrl(trimmed, sourceId)]);
  if (trimmed.includes('static.dezeen.com')) {
    for (const u of expandDezeenCandidates(trimmed)) {
      out.add(u);
      out.add(normalizeImageUrl(u, sourceId));
    }
  }
  if (trimmed.includes('designboom.com')) {
    for (const u of expandDesignboomCandidates(trimmed)) {
      out.add(u);
      out.add(normalizeImageUrl(u, sourceId));
    }
  }
  return [...out];
}

function baseImageKey(url: string): string {
  const file = url.split('/').pop() ?? url;
  return file
    .replace(/-\d+x\d+(?=\.[a-z]+$)/i, '')
    .replace(/-scaled(?=\.[a-z]+$)/i, '')
    .replace(/(designboom-\d{3,4})-[a-z0-9]{6,}(?=\.[a-z]+$)/i, '$1')
    .replace(/\.[a-z]+$/i, '')
    .toLowerCase();
}

async function buildGalleryImages(
  candidates: string[],
  sourceId?: string,
  heroSeed?: string,
): Promise<string[]> {
  const groups = new Map<string, string[]>();

  for (const raw of candidates) {
    if (!raw?.trim() || !isRasterImageUrl(raw) || /twitterimages/i.test(raw)) continue;
    for (const variant of imageUrlVariants(raw, sourceId)) {
      if (isThumbnailUrl(variant)) continue;
      const url = normalizeImageUrl(variant, sourceId);
      const key = baseImageKey(url);
      if (!groups.has(key)) groups.set(key, []);
      const list = groups.get(key)!;
      if (!list.includes(url)) list.push(url);
      for (const expanded of expandDezeenCandidates(url)) {
        if (isThumbnailUrl(expanded)) continue;
        const norm = normalizeImageUrl(expanded, sourceId);
        if (!list.includes(norm)) list.push(norm);
      }
    }
  }

  const resolved: { url: string; score: number }[] = [];
  const heroKey = heroSeed ? baseImageKey(normalizeImageUrl(heroSeed, sourceId)) : '';

  for (const [key, variants] of groups) {
    const best = await pickLargestReachableUrl(variants);
    if (!best) continue;
    resolved.push({ url: best, score: scoreImageUrl(best) + (key === heroKey ? 10_000_000 : 0) });
  }

  resolved.sort((a, b) => b.score - a.score);
  let urls = resolved.map((r) => r.url);
  const nonSquare = urls.filter((u) => !isSquareCroppedImageUrl(u));
  if (nonSquare.length > 0) {
    urls = nonSquare;
  } else if (urls.length === 0) {
    // No wide hero found — accept reachable square crops rather than a broken OGP path
    const squareGroups = new Map<string, string[]>();
    for (const raw of candidates) {
      if (!raw?.trim() || !isRasterImageUrl(raw)) continue;
      for (const variant of imageUrlVariants(raw, sourceId)) {
        if (!isSquareCroppedImageUrl(variant)) continue;
        const url = normalizeImageUrl(variant, sourceId);
        const key = baseImageKey(url);
        if (!squareGroups.has(key)) squareGroups.set(key, []);
        const list = squareGroups.get(key)!;
        if (!list.includes(url)) list.push(url);
      }
    }
    for (const variants of squareGroups.values()) {
      const best = await pickLargestReachableUrl(variants);
      if (best) urls.push(best);
    }
    urls.sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a));
  }

  if (heroSeed) {
    const heroVariants = imageUrlVariants(heroSeed, sourceId).map((u) => normalizeImageUrl(u, sourceId));
    const heroBest = await pickLargestReachableUrl(heroVariants);
    if (heroBest) {
      const heroKey = baseImageKey(heroBest);
      const rest = urls.filter((u) => baseImageKey(u) !== heroKey);
      return [heroBest, ...rest].slice(0, MAX_GALLERY);
    }
  }

  return urls.slice(0, MAX_GALLERY);
}

async function fetchPageMedia(pageUrl: string): Promise<{ images: string[]; video?: ArticleVideo }> {
  const images: string[] = [];
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { images };
    const html = await res.text();
    const $ = cheerio.load(html);

    $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
      const c = $(el).attr('content');
      if (c) images.push(absUrl(c, pageUrl));
    });

    $('article img[src], .article img[src], main img[src], .post img[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (!src || src.startsWith('data:')) return;
      images.push(absUrl(src, pageUrl));
    });

    return { images, video: parseVideo($, pageUrl) };
  } catch {
    return { images };
  }
}

async function fetchDezeenRssVideo(pageUrl: string): Promise<ArticleVideo | undefined> {
  try {
    const res = await fetch('https://www.dezeen.com/feed/', {
      headers: { 'User-Agent': BROWSER_UA, Referer: 'https://www.dezeen.com/' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return undefined;
    const text = await res.text();
    const chunk = findDezeenFeedItemChunk(text, pageUrl);
    if (!chunk) return undefined;

    const yt = chunk.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (yt) return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}` };

    const vimeo = chunk.match(/vimeo\.com\/video\/(\d+)/);
    if (vimeo) return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  } catch {
    /* */
  }
  return undefined;
}

function absUrl(raw: string, base: string): string {
  let url = raw.trim();
  if (url.startsWith('//')) url = `https:${url}`;
  if (!url.startsWith('http')) url = new URL(url, base).href;
  return url;
}

const HTML5_VIDEO_RE = /\.(mp4|webm|ogg)(\?|#|$)/i;

function parseVideo($: cheerio.CheerioAPI, pageUrl: string): ArticleVideo | undefined {
  const ogVideo =
    $('meta[property="og:video:url"]').attr('content') ||
    $('meta[property="og:video"]').attr('content') ||
    $('meta[name="twitter:player"]').attr('content');
  if (ogVideo) {
    const v = parseMediaUrl(ogVideo, pageUrl);
    if (v) return v;
  }

  const iframeSrc = $('iframe[src*="youtube"], iframe[src*="vimeo"]').first().attr('src');
  if (iframeSrc) {
    const v = parseMediaUrl(iframeSrc, pageUrl);
    if (v) return v;
  }

  return parseHtml5VideoFromDom($, pageUrl);
}

function parseHtml5VideoFromDom($: cheerio.CheerioAPI, pageUrl: string): ArticleVideo | undefined {
  const candidates: string[] = [];

  $('video[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('data:')) candidates.push(absUrl(src, pageUrl));
  });

  $('video source').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    const type = ($(el).attr('type') ?? '').toLowerCase();
    if (!src || src.startsWith('data:')) return;
    if (type && !type.startsWith('video/')) return;
    candidates.push(absUrl(src, pageUrl));
  });

  $('article a[href], .article a[href], main a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && HTML5_VIDEO_RE.test(href)) candidates.push(absUrl(href, pageUrl));
  });

  for (const raw of candidates) {
    const v = parseMediaUrl(raw, pageUrl);
    if (v?.provider === 'html5') return v;
  }

  return undefined;
}

/** Resolve YouTube/Vimeo embed or direct MP4/WebM file URL. */
export function parseMediaUrl(raw: string, base: string): ArticleVideo | undefined {
  try {
    const url = new URL(raw, base).href;
    const yt = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (yt) {
      return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
    }
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) {
      return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
    }
    if (HTML5_VIDEO_RE.test(url)) {
      return { provider: 'html5', embedUrl: url };
    }
  } catch {
    return undefined;
  }
  return undefined;
}
