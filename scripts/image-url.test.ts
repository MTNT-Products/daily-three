import assert from 'node:assert/strict';
import test from 'node:test';
import { expandDezeenCandidates, expandDesignboomCandidates } from './resolve-hero-image.js';
import { isSquareCroppedImageUrl, pickLargestImageUrl, scoreImageUrl } from './image-url.js';

test('isSquareCroppedImageUrl detects Dezeen square OGP crops', () => {
  assert.equal(
    isSquareCroppedImageUrl(
      'https://static.dezeen.com/uploads/2026/05/Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_12_square.jpg',
    ),
    true,
  );
  assert.equal(
    isSquareCroppedImageUrl(
      'https://static.dezeen.com/uploads/2026/05/dezeen-weekly-podcast-29-may-2026-sq.jpg',
    ),
    true,
  );
  assert.equal(
    isSquareCroppedImageUrl(
      'https://static.dezeen.com/uploads/2026/05/Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_12_square-852x852.jpg',
    ),
    true,
  );
  assert.equal(
    isSquareCroppedImageUrl(
      'https://static.dezeen.com/uploads/2026/05/lucifer-lighting-atomos-renew_dezeen_2364_col_hero.jpg',
    ),
    false,
  );
});

test('scoreImageUrl prefers hero over square', () => {
  const square =
    'https://static.dezeen.com/uploads/2026/05/Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_12_square.jpg';
  const hero =
    'https://static.dezeen.com/uploads/2026/05/Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_2364_col_hero.jpg';
  assert.ok(scoreImageUrl(hero) > scoreImageUrl(square));
  assert.equal(pickLargestImageUrl([square, hero]), hero);
});

test('findDezeenFeedItemChunk matches item link not in-body cross-links', async () => {
  const { findDezeenFeedItemChunk } = await import('./resolve-hero-image.js');
  const launch =
    'https://www.dezeen.com/2026/05/25/electric-ferrari-luce-jony-ive-marc-newson-lovefrom/';
  const feed = `<rss><channel>
    <item><title>Other story</title><link>https://www.dezeen.com/other/</link></item>
    <item><title>Ferrari Luce launch</title>
      <link>${launch}</link>
      <content:encoded>
        <a href="https://www.dezeen.com/2026/05/20/unrelated/">cross-link</a>
        <img src="https://static.dezeen.com/uploads/Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_03.jpg"/>
      </content:encoded>
    </item>
  </channel></rss>`;
  const chunk = findDezeenFeedItemChunk(feed, launch);
  assert.ok(chunk?.includes('<title>Ferrari Luce launch'));
  assert.ok(chunk?.includes('Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_03.jpg'));
  assert.ok(!chunk?.includes('<title>Other story'));
});

test('expandDesignboomCandidates adds stable URL without ephemeral hash', () => {
  const hashed =
    'https://static.designboom.com/wp-content/uploads/2026/05/furny-futurewave-home-robot-designboom-700-22b08q85r167.jpg';
  const expanded = expandDesignboomCandidates(hashed);
  assert.ok(
    expanded.some((u) =>
      u.endsWith('furny-futurewave-home-robot-designboom-700.jpg'),
    ),
  );
});

test('scoreImageUrl penalizes Designboom lazy-load hash URLs', () => {
  const hashed =
    'https://static.designboom.com/wp-content/uploads/2026/05/furny-futurewave-home-robot-designboom-700-22b08q85r167.jpg';
  const stable =
    'https://static.designboom.com/wp-content/uploads/2026/05/furny-futurewave-home-robot-designboom-700.jpg';
  assert.ok(scoreImageUrl(stable) > scoreImageUrl(hashed));
});

test('expandDezeenCandidates derives hero URLs from square filename', () => {
  const square =
    'https://static.dezeen.com/uploads/2026/05/Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_12_square.jpg';
  const expanded = expandDezeenCandidates(square);
  assert.ok(
    expanded.some((u) => u.includes('Ferrari-Luce-Jony-Ive-Marc-Newson-LoveFrom_dezeen_2364_col_hero')),
  );
});
