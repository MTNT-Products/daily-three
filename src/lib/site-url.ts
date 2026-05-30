import type { Locale } from '../i18n/ui';

function baseUrl(): string {
  const raw = import.meta.env.BASE_URL;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/** Build a site path under Astro `base` (e.g. `/daily-three/archive/`). */
export function sitePath(path: string): string {
  const base = baseUrl();
  if (!path || path === '/') return base;
  const normalized = path.replace(/^\//, '');
  return `${base}${normalized}`;
}

/** Locale-prefixed path (e.g. `/daily-three/ja/digest/2026-05-27/`). */
export function localePath(locale: Locale, path: string = ''): string {
  const base = baseUrl();
  const normalized = path.replace(/^\//, '');
  return normalized ? `${base}${locale}/${normalized}` : `${base}${locale}/`;
}
