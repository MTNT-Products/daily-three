import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchArticleMedia } from './scrape-media.js';

/**
 * These hit designboom.com and core77.com for real. They belong to `npm run test:live`,
 * not to `npm test`: run from the deploy and digest jobs, a deleted article or a blocked
 * runner IP at another company stopped this project's own publishing.
 */
test('fetchArticleMedia picks html5 video on Designboom furny article', async () => {
  const media = await fetchArticleMedia(
    'https://www.designboom.com/technology/futurewave-furniture-home-robot-movement-furny/',
    'designboom-auto',
  );
  assert.equal(media.video?.provider, 'html5');
  assert.ok(media.video?.embedUrl.includes('furny-futurewave-home-robot'));
  assert.ok(media.images.length >= 1);
});

test('fetchArticleMedia resolves Core77 hero for matte black tool article', async () => {
  const media = await fetchArticleMedia(
    'https://www.core77.com/posts/144380/The-Japanese-Matte-Black-Tool-Trend-Came-from-the-LA-Car-Scene',
    'core77',
  );
  assert.ok(media.images.length >= 1);
  assert.match(media.images[0], /s3files\.core77\.com.*144380/);
});
