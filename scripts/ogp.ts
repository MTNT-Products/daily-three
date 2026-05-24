import * as cheerio from 'cheerio';

export async function fetchOgpImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DailyThreeBot/0.1' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const $ = cheerio.load(html);
    return (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      undefined
    );
  } catch {
    return undefined;
  }
}

export async function enrichImages(articles: { url: string; image?: string }[]) {
  for (const a of articles) {
    if (!a.image) {
      a.image = await fetchOgpImage(a.url);
    }
  }
}
