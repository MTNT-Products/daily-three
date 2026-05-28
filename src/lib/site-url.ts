/** Build a site path under Astro `base` (e.g. `/daily-three/archive/`). */
export function sitePath(path: string): string {
  const raw = import.meta.env.BASE_URL;
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  if (!path || path === '/') return base;
  const normalized = path.replace(/^\//, '');
  return `${base}${normalized}`;
}
