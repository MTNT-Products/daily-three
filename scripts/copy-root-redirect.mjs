import { copyFileSync, existsSync } from 'node:fs';

const src = 'public/locale-redirect.html';
const dest = 'dist/index.html';

if (!existsSync(src)) {
  console.warn('[copy-root-redirect] missing', src);
  process.exit(0);
}
copyFileSync(src, dest);
console.log('[copy-root-redirect] wrote', dest);
