import { copyFileSync, existsSync } from 'node:fs';

const src = 'public/locale-redirect.html';
const dest = 'dist/index.html';

if (!existsSync(src)) {
  // Exiting 0 here let the build go green and deploy a site whose root is a 404,
  // because prefixDefaultLocale means nothing else writes dist/index.html.
  console.error('[copy-root-redirect] missing', src);
  process.exit(1);
}
copyFileSync(src, dest);
console.log('[copy-root-redirect] wrote', dest);
