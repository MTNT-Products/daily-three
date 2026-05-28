import * as cheerio from 'cheerio';
import { normalizeImageUrl, scoreImageUrl } from './image-url.js';
import {
  fetchDesignboomCandidates,
  fetchDezeenRssCandidates,
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

export async function fetchArticleMedia(
  pageUrl: string,
  sourceId?: string,
  heroSeed?: string,
): Promise<ArticleMedia> {
  const candidates: string[] = [];
  if (heroSeed) candidates.push(heroSeed);

  if (pageUrl.includes('designboom.com')) {
    candidates.push(...(await fetchDesignboomCandidates(pageUrl)));
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

function isThumbnailUrl(url: string): boolean {
  return /-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i.test(url) || /_sq-\d|411x411|150x150|300x300/i.test(url);
}

function baseImageKey(url: string): string {
  const file = url.split('/').pop() ?? url;
  return file
    .replace(/-\d+x\d+(?=\.[a-z]+$)/i, '')
    .replace(/-scaled(?=\.[a-z]+$)/i, '')
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
    if (!raw?.trim() || isThumbnailUrl(raw) || /twitterimages/i.test(raw)) continue;
    const url = normalizeImageUrl(raw.trim(), sourceId);
    const key = baseImageKey(url);
    if (!groups.has(key)) groups.set(key, []);
    const list = groups.get(key)!;
    if (!list.includes(url)) list.push(url);
  }

  const resolved: { url: string; score: number }[] = [];
  const heroKey = heroSeed ? baseImageKey(normalizeImageUrl(heroSeed, sourceId)) : '';

  for (const [key, variants] of groups) {
    const best = (await pickLargestReachableUrl(variants)) ?? variants[0];
    if (!best) continue;
    resolved.push({ url: best, score: scoreImageUrl(best) + (key === heroKey ? 10_000_000 : 0) });
  }

  resolved.sort((a, b) => b.score - a.score);
  const urls = resolved.map((r) => r.url);

  if (heroSeed) {
    const heroNorm = normalizeImageUrl(heroSeed, sourceId);
    const rest = urls.filter((u) => u !== heroNorm);
    return [heroNorm, ...rest].slice(0, MAX_GALLERY);
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
    const anchor = text.indexOf(pageUrl);
    if (anchor < 0) return undefined;
    const itemStart = text.lastIndexOf('<item>', anchor);
    const itemEnd = text.indexOf('</item>', anchor);
    if (itemStart < 0 || itemEnd < 0) return undefined;
    const chunk = text.slice(itemStart, itemEnd);

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

function parseVideo($: cheerio.CheerioAPI, pageUrl: string): ArticleVideo | undefined {
  const ogVideo =
    $('meta[property="og:video:url"]').attr('content') ||
    $('meta[property="og:video"]').attr('content') ||
    $('meta[name="twitter:player"]').attr('content');
  if (ogVideo) {
    const v = parseEmbedUrl(ogVideo, pageUrl);
    if (v) return v;
  }

  const iframeSrc = $('iframe[src*="youtube"], iframe[src*="vimeo"]').first().attr('src');
  if (iframeSrc) {
    const v = parseEmbedUrl(iframeSrc, pageUrl);
    if (v) return v;
  }

  return undefined;
}

function parseEmbedUrl(raw: string, base: string): ArticleVideo | undefined {
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
  } catch {
    return undefined;
  }
  return undefined;
}
