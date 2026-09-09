const FEED_URL = 'https://www.dezeen.com/feed/';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let cached: Promise<string | null> | null = null;

async function fetchOnce(): Promise<string | null> {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': BROWSER_UA, Referer: 'https://www.dezeen.com/' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn(`[dezeen] feed fetch failed: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn('[dezeen] feed fetch failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * One read of the Dezeen feed per run. Three call sites used to fetch it separately for
 * every article, and every image re-pick did it all again — dozens of identical requests
 * to the same publisher, which is how a run earns a rate limit.
 */
export function fetchDezeenFeedText(): Promise<string | null> {
  cached ??= fetchOnce();
  return cached;
}

/** For tests, and for a long-running process that should not reuse a stale feed. */
export function resetDezeenFeedCache(): void {
  cached = null;
}
