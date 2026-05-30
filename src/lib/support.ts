/** Buy Me a Coffee profile URL (link only — no payment API on this site). */
export function getSupportUrl(): string | undefined {
  const raw = import.meta.env.PUBLIC_BMC_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('buymeacoffee.com')) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}
