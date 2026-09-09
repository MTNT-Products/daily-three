import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digestUrl, pickArticle, readDigest, rotationIndex } from './load-digest.js';

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

/** Writes one ja digest file under a throwaway root and returns that root. */
function digestRoot(frontmatter: string, date = '2026-09-07'): string {
  const root = mkdtempSync(join(tmpdir(), 'daily-three-'));
  const dir = join(root, 'src', 'content', 'digest', 'ja');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${date}.md`), `---\n${frontmatter}\n---\n\n`, 'utf-8');
  return root;
}

const GOOD_FRONTMATTER = [
  'title: "9月7日"',
  'date: 2026-09-07',
  'lead: "リード"',
  'articles:',
  '  - title: "見出し"',
  '    summary: "要約"',
  '    source: "Dezeen"',
  '    sourceId: "dezeen"',
  '    url: "https://example.test/a"',
].join('\n');

test('readDigest reads a well-formed edition', () => {
  const root = digestRoot(GOOD_FRONTMATTER);
  const digest = readDigest('ja', '2026-09-07', root);
  assert.equal(digest?.articles.length, 1);
  assert.equal(digest?.articles[0].title, '見出し');
});

test('readDigest refuses an articles field that is not a list', () => {
  const root = digestRoot('title: "x"\ndate: 2026-09-07\nlead: "y"\narticles: "oops"');
  assert.equal(readDigest('ja', '2026-09-07', root), null);
});

test('readDigest survives frontmatter that is not valid YAML', () => {
  const root = digestRoot('title: "unclosed\narticles: [');
  assert.equal(readDigest('ja', '2026-09-07', root), null);
});

test('readDigest drops articles that are missing a field', () => {
  const root = digestRoot(
    ['title: "x"', 'date: 2026-09-07', 'lead: "y"', 'articles:', '  - title: "見出し"'].join('\n'),
  );
  assert.equal(readDigest('ja', '2026-09-07', root), null);
});
