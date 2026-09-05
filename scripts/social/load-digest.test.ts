import assert from 'node:assert/strict';
import test from 'node:test';
import { digestUrl, pickArticle, rotationIndex } from './load-digest.js';

const URLS = ['https://a.example/1', 'https://b.example/2', 'https://c.example/3'];

test('rotationIndex maps Mon–Fri onto the three articles', () => {
  assert.equal(rotationIndex('2026-08-31', 3), 0); // Monday
  assert.equal(rotationIndex('2026-09-01', 3), 1); // Tuesday
  assert.equal(rotationIndex('2026-09-02', 3), 2); // Wednesday
  assert.equal(rotationIndex('2026-09-03', 3), 0); // Thursday
  assert.equal(rotationIndex('2026-09-04', 3), 1); // Friday
});

test('rotationIndex falls back to the first article on weekend editions', () => {
  assert.equal(rotationIndex('2026-09-05', 3), 0); // Saturday
});

test('pickArticle follows the rotation when nothing is voted or posted', () => {
  const pick = pickArticle({ digestDate: '2026-09-01', urls: URLS });
  assert.deepEqual(pick, { index: 1, reason: 'rotation' });
});

test('pickArticle prefers the article readers voted Good', () => {
  const pick = pickArticle({
    digestDate: '2026-09-01',
    urls: URLS,
    goodCounts: { [URLS[2]]: 3, [URLS[0]]: 1 },
  });
  assert.deepEqual(pick, { index: 2, reason: 'feedback' });
});

test('pickArticle ignores Good votes on an article already posted', () => {
  const pick = pickArticle({
    digestDate: '2026-09-01',
    urls: URLS,
    goodCounts: { [URLS[2]]: 5 },
    postedUrls: [URLS[2]],
  });
  assert.deepEqual(pick, { index: 1, reason: 'rotation' });
});

test('pickArticle moves on when the rotation slot was already posted', () => {
  const pick = pickArticle({
    digestDate: '2026-09-01',
    urls: URLS,
    postedUrls: [URLS[1]],
  });
  assert.deepEqual(pick, { index: 2, reason: 'fallback' });
});

test('pickArticle still returns the rotation slot when every article was posted', () => {
  const pick = pickArticle({ digestDate: '2026-09-01', urls: URLS, postedUrls: URLS });
  assert.deepEqual(pick, { index: 1, reason: 'fallback' });
});

test('digestUrl points at the ja digest page without doubling slashes', () => {
  assert.equal(
    digestUrl('2026-09-02', 'https://example.com/daily-three/'),
    'https://example.com/daily-three/ja/digest/2026-09-02/',
  );
});
