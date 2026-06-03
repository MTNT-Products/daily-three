import * as cheerio from 'cheerio';
import { imageUrlCandidates, normalizeImageUrl } from './image-url.js';
import { pickLargestReachableUrl, resolveHeroImage } from './resolve-hero-image.js';
import { fetchArticleMedia } from './scrape-media.js';
import type { DigestArticle } from './types.js';

const UA = { 'User-Agent': 'DailyThreeBot/0.1' };

function collectOgpImageCandidates($: cheerio.CheerioAPI, pageUrl: string): string[] {
  const scored: { url: string; score: number }[] = [];

  const add = (raw: string | undefined, widthHint?: number) => {
    if (!raw?.trim()) return;
    let url = raw.trim();
    if (url.startsWith('//')) url = `https:${url}`;
    if (!url.startsWith('http')) {
      try {
        url = new URL(url, pageUrl).href;
      } catch {
        return;
      }
    }
    scored.push({ url, score: (widthHint ?? 0) + 1 });
  };

  $('meta[property="og:image"], meta[property="og:image:url"], meta[name="twitter:image"]').each(
    (_, el) => {
      add($(el).attr('content'));
    },
  );

  const ogWidth = parseInt($('meta[property="og:image:width"]').attr('content') ?? '', 10);
  const ogUrl = $('meta[property="og:image"]').attr('content');
  if (ogUrl && ogWidth > 0) add(ogUrl, ogWidth);

  if (scored.length === 0) return [];
  return scored.map((s) => s.url);
}

export async function fetchOgpImage(url: string, sourceId?: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return undefined;
    const html = await res.text();
    const $ = cheerio.load(html);
    const candidates = collectOgpImageCandidates($, url);
    const variants = candidates.flatMap((c) => imageUrlCandidates(c, sourceId));
    return pickLargestReachableUrl([...new Set(variants)]);
  } catch {
    return undefined;
  }
}

/** Best-effort hero image: site-specific patterns + largest reachable file. */
export async function enrichHeroImage(article: {
  url: string;
  sourceId: string;
  image?: string;
}): Promise<string | undefined> {
  const resolved = await resolveHeroImage(article.url, article.sourceId, article.image);
  if (resolved) return resolved;

  const ogp = await fetchOgpImage(article.url, article.sourceId);
  if (ogp) return ogp;

  const seed = article.image ? normalizeImageUrl(article.image, article.sourceId) : undefined;
  if (!seed) return undefined;
  return pickLargestReachableUrl([seed]);
}

/** Hero + gallery images + optional video embed. */
export async function enrichArticleMedia(article: DigestArticle): Promise<DigestArticle> {
  const hero = (await enrichHeroImage(article)) ?? article.image;
  const media = await fetchArticleMedia(article.url, article.sourceId, hero);

  let images = media.images;
  const reachable = await pickLargestReachableUrl(
    [...new Set([hero, article.image, ...images].filter(Boolean) as string[])].flatMap((u) =>
      imageUrlCandidates(u, article.sourceId),
    ),
  );
  if (reachable) {
    const key = reachable.split('/').pop() ?? reachable;
    const rest = images.filter((u) => (u.split('/').pop() ?? u) !== key);
    images = [reachable, ...rest];
  } else {
    images = [];
  }

  return {
    ...article,
    image: images[0],
    images: images.length > 1 ? images : undefined,
    video: media.video,
  };
}

/** Enrich all articles (hero quality + carousel + video). */
export async function enrichImages(articles: DigestArticle[]) {
  for (let i = 0; i < articles.length; i++) {
    articles[i] = await enrichArticleMedia(articles[i]);
  }
}
