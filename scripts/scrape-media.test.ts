import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchArticleMedia, parseMediaUrl } from './scrape-media.js';

test('parseMediaUrl detects direct MP4', () => {
  const v = parseMediaUrl(
    'https://static.designboom.com/wp-content/uploads/2026/05/furny-futurewave-home-robot-designboom-164.mp4?_=1',
    'https://www.designboom.com/',
  );
  assert.equal(v?.provider, 'html5');
  assert.ok(v?.embedUrl.includes('.mp4'));
});

test('parseMediaUrl still detects YouTube embed', () => {
  const v = parseMediaUrl('https://www.youtube.com/embed/FDkTyBWHefI', 'https://example.com/');
  assert.equal(v?.provider, 'youtube');
});

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
