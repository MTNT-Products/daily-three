import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkDraft,
  hasBlockingIssue,
  longestCommonRun,
  significantTerms,
  similarity,
  weightedLength,
} from './quality-gate.js';
import type { SocialArticle } from './types.js';

const JA_ARTICLE: SocialArticle = {
  title: 'レンジローバー、初の完全電動車を発表',
  summary:
    'ジャガー・ランドローバーがレンジローバーの電動化を実現。デュアル260kW モーターにより、オフロード走破性を維持するパワートレイン設計が注目される。',
  source: 'Dezeen',
  sourceId: 'dezeen-cars',
  url: 'https://www.dezeen.com/2026/09/02/range-rover-electric-car/',
};

const EN_ARTICLE: SocialArticle = {
  title: 'Range Rover Unveils Its First Fully Electric Car',
  summary:
    "JLR's electric Range Rover combines dual 260kW motors with off-roading capability, delivering more torque than any previous model.",
  source: 'Dezeen',
  sourceId: 'dezeen-cars',
  url: 'https://www.dezeen.com/2026/09/02/range-rover-electric-car/',
};

const REPLY = [
  "今日の3件 / Today's three → https://example.com/ja/digest/2026-09-02/",
  '原文 / Original → https://www.dezeen.com/2026/09/02/range-rover-electric-car/',
].join('\n');

const JA_FRAME = ['【Daily Three】9/2(水)', 'レンジローバー、初の完全電動車を発表'].join('\n');
const EN_FRAME = 'Range Rover Unveils Its First Fully Electric Car';

/** Assemble the same frame the composer uses, so the gate sees a realistic post. */
function draftFor(jaBody: string, enBody: string, recentBodies: string[] = []) {
  return checkDraft({
    jaText: [JA_FRAME, '', jaBody, '', '出典: Dezeen'].join('\n'),
    enText: [EN_FRAME, '', enBody, '', 'Source: Dezeen'].join('\n'),
    replyText: REPLY,
    jaBody,
    enBody,
    jaArticle: JA_ARTICLE,
    enArticle: EN_ARTICLE,
    recentBodies,
  });
}

test('weightedLength counts CJK as 2 and Latin as 1', () => {
  assert.equal(weightedLength('abc'), 3);
  assert.equal(weightedLength('あいう'), 6);
  assert.equal(weightedLength('ab あい'), 3 + 4);
});

test('weightedLength charges every URL a flat 23', () => {
  assert.equal(weightedLength('https://a.example/very/long/path/that/keeps/going'), 23);
});

test('similarity separates a rewrite from a near-copy', () => {
  const text = '電動化のパワートレイン設計が興味深い';
  assert.ok(similarity(text, text) > 0.99);
  assert.ok(similarity(text, 'CMF の配色が新しい方向を示す') < 0.2);
});

test('longestCommonRun ignores whitespace differences', () => {
  assert.equal(longestCommonRun('デュアル 260kW モーター', 'デュアル260kWモーター'), 13);
});

test('significantTerms picks up katakana, proper nouns and numbers', () => {
  const terms = significantTerms('レンジローバーが260kWのDual motorを搭載');
  assert.ok(terms.includes('レンジローバー'));
  assert.ok(terms.includes('Dual'));
  assert.ok(terms.includes('260'));
});

test('significantTerms ignores words capitalised only by sentence position', () => {
  assert.deepEqual(significantTerms('The packaging changes once the transmission goes away.'), []);
});

test('a clean draft produces no issues', () => {
  const issues = draftFor(
    '電動化しても走破性を落とさない設計に振れているのが面白い。',
    'Range Rover gains cabin space once the transmission is gone.',
  );
  assert.deepEqual(issues, []);
});

test('a URL in the body is a blocking issue', () => {
  const issues = draftFor('詳しくはこちら https://example.com へ', 'See more.');
  assert.ok(issues.some((i) => i.code === 'url-in-ja' && i.level === 'error'));
  assert.ok(hasBlockingIssue(issues));
});

test('an over-length Japanese post is a blocking issue', () => {
  const issues = draftFor('あ'.repeat(200), 'Short body.');
  assert.ok(issues.some((i) => i.code === 'length-ja' && i.level === 'error'));
});

test('near-identical repeat of a past body is a blocking issue', () => {
  const body = '電動化しても走破性を落とさない設計に振れているのが面白い。';
  const issues = draftFor(body, 'Short body.', [body]);
  assert.ok(issues.some((i) => i.code === 'duplicate' && i.level === 'error'));
});

test('the fixed frame alone does not trip the duplicate check', () => {
  const issues = draftFor('電動化しても走破性を落とさない設計に振れているのが面白い。', 'Short body.', [
    'CMF の置き方が去年のショーカーから一段進んでいる。',
  ]);
  assert.equal(
    issues.some((i) => i.code === 'duplicate'),
    false,
  );
});

test('a term absent from the digest is flagged as a warning, not a blocker', () => {
  const issues = draftFor('ポルシェとの比較で見ると位置づけがわかりやすい。', 'Short body.');
  const unsourced = issues.find((i) => i.code === 'unsourced-ja');
  assert.equal(unsourced?.level, 'warn');
  assert.ok(unsourced?.message.includes('ポルシェ'));
  assert.equal(hasBlockingIssue(issues), false);
});

test('copying a long run out of the digest is flagged as a warning', () => {
  const issues = draftFor(JA_ARTICLE.summary.slice(0, 45), 'Short body.');
  assert.ok(issues.some((i) => i.code === 'verbatim-ja' && i.level === 'warn'));
});

test('a reply without a link is a blocking issue', () => {
  const issues = checkDraft({
    jaText: [JA_FRAME, '', '走破性の設計が面白い。', '', '出典: Dezeen'].join('\n'),
    enText: [EN_FRAME, '', 'Short body.', '', 'Source: Dezeen'].join('\n'),
    replyText: '今日の3件はこちら',
    jaBody: '走破性の設計が面白い。',
    enBody: 'Short body.',
    jaArticle: JA_ARTICLE,
    enArticle: EN_ARTICLE,
  });
  assert.ok(issues.some((i) => i.code === 'reply-no-url' && i.level === 'error'));
});
