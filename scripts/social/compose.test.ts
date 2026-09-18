import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bodyBudget,
  buildEnText,
  buildJaText,
  buildReplyText,
  composeWithRetry,
  fitBodies,
  fitToWeighted,
  parseBodies,
} from './compose.js';
import type { BodyCall } from './compose.js';
import { MAX_WEIGHTED_LENGTH, weightedLength } from './quality-gate.js';
import type { SocialArticle } from './types.js';

const JA_ARTICLE: SocialArticle = {
  title: '使用済み茶葉とコーヒー粕から生まれた大型3Dプリント彫刻',
  summary: 'ロンドンの廃棄物素材を複合材料に変換し、ロボット3Dプリンティングで大型彫刻化するプロジェクト。',
  source: 'Designboom',
  sourceId: 'designboom-auto',
  url: 'https://www.designboom.com/design/used-london-tea-leaves/',
};

const EN_ARTICLE: SocialArticle = {
  title: 'Tea Leaves and Coffee Waste Recast as Large-Scale 3D Printed Sculptures',
  summary: 'This project transforms discarded tea leaves into composite materials for robotic 3D printing.',
  source: 'Designboom',
  sourceId: 'designboom-auto',
  url: 'https://www.designboom.com/design/used-london-tea-leaves/',
};

test('buildJaText follows the SOCIAL-TEMPLATES frame', () => {
  const text = buildJaText(JA_ARTICLE, '要約本文', '2026-09-02');
  assert.equal(
    text,
    '【Daily Three】9/2(水)\n使用済み茶葉とコーヒー粕から生まれた大型3Dプリント彫刻\n\n要約本文\n\n出典: Designboom',
  );
});

test('buildEnText carries no date header — it is the thread continuation', () => {
  const text = buildEnText(EN_ARTICLE, 'Body copy.');
  assert.ok(text.startsWith('Tea Leaves and Coffee Waste'));
  assert.ok(text.endsWith('Source: Designboom'));
});

test('buildReplyText carries both links', () => {
  const text = buildReplyText('https://example.com/ja/digest/2026-09-02/', JA_ARTICLE.url);
  assert.ok(text.includes('https://example.com/ja/digest/2026-09-02/'));
  assert.ok(text.includes(JA_ARTICLE.url));
});

test('a body at the budget keeps the assembled post inside the X limit', () => {
  const budget = bodyBudget(JA_ARTICLE, EN_ARTICLE, '2026-09-02');

  const jaText = buildJaText(JA_ARTICLE, 'あ'.repeat(budget.ja), '2026-09-02');
  assert.ok(weightedLength(jaText) <= MAX_WEIGHTED_LENGTH, `ja = ${weightedLength(jaText)}`);

  const enText = buildEnText(EN_ARTICLE, 'a'.repeat(budget.en));
  assert.ok(weightedLength(enText) <= MAX_WEIGHTED_LENGTH, `en = ${weightedLength(enText)}`);
});

test('bodyBudget shrinks as the headline grows', () => {
  const long: SocialArticle = { ...JA_ARTICLE, title: JA_ARTICLE.title.repeat(2) };
  assert.ok(bodyBudget(long, EN_ARTICLE, '2026-09-02').ja < bodyBudget(JA_ARTICLE, EN_ARTICLE, '2026-09-02').ja);
});

const INPUT = { jaArticle: JA_ARTICLE, enArticle: EN_ARTICLE, digestDate: '2026-09-02' };
const okJson = JSON.stringify({ ja: '短い日本語の本文。', en: 'A short English body.' });
const noSleep = { sleep: async () => {} };

test('parseBodies survives fences and a sentence of preamble', () => {
  const raw = ['Here you go:', '```json', okJson, '```', 'Hope that helps.'].join('\n');
  const bodies = parseBodies(raw);
  assert.equal(bodies.ja, '短い日本語の本文。');
  assert.equal(bodies.en, 'A short English body.');
});

test('composeWithRetry asks again when the response is not valid JSON', async () => {
  const replies = ['sorry, I cannot do that', okJson];
  let i = 0;
  const call: BodyCall = async () => ({ text: replies[i++], stopReason: 'end_turn' });

  const bodies = await composeWithRetry(INPUT, call, noSleep);

  assert.equal(bodies.ja, '短い日本語の本文。');
  assert.equal(i, 2);
});

test('composeWithRetry retries when the API call itself fails', async () => {
  let i = 0;
  const call: BodyCall = async () => {
    if (i++ === 0) throw new Error('529 overloaded_error');
    return { text: okJson, stopReason: 'end_turn' };
  };

  const bodies = await composeWithRetry(INPUT, call, noSleep);

  assert.equal(bodies.en, 'A short English body.');
  assert.equal(i, 2);
});

test('composeWithRetry raises max_tokens after a truncated response', async () => {
  const asked: (number | undefined)[] = [];
  let i = 0;
  const call: BodyCall = async (_messages, options) => {
    asked.push(options?.maxTokens);
    return i++ === 0
      ? { text: okJson.slice(0, 12), stopReason: 'max_tokens' }
      : { text: okJson, stopReason: 'end_turn' };
  };

  await composeWithRetry(INPUT, call, noSleep);

  assert.deepEqual(asked, [4096, 8192]);
});

test('fitToWeighted drops trailing Japanese sentences to fit', () => {
  const s1 = '観察している。';
  const s2 = '素材が形に落ちている。';
  const s3 = '核は廃棄物の再定義だ。';
  const max = weightedLength(s1 + s2);
  assert.equal(fitToWeighted(s1 + s2 + s3, max), s1 + s2);
});

test('fitToWeighted drops trailing English sentences to fit', () => {
  const text = 'One take on the material. Another sentence follows. A third overruns.';
  const max = weightedLength('One take on the material. Another sentence follows.');
  assert.equal(fitToWeighted(text, max), 'One take on the material. Another sentence follows.');
});

test('fitToWeighted does not split decimals when finding English sentences', () => {
  const text = 'It weighs 2.5 tons in the final cast. That number is the whole point.';
  const max = weightedLength('It weighs 2.5 tons in the final cast.');
  assert.equal(fitToWeighted(text, max), 'It weighs 2.5 tons in the final cast.');
});

test('fitToWeighted cuts a long clause with an ellipsis', () => {
  const text = '前半の観察があり、後半の結論を一気に書くと枠に収まらない長さになる';
  const max = weightedLength('前半の観察があり…');
  assert.equal(fitToWeighted(text, max), '前半の観察があり…');
});

test('fitToWeighted character-trims when there is no boundary', () => {
  const fitted = fitToWeighted('あ'.repeat(50), 11);
  assert.ok(weightedLength(fitted) <= 11);
  assert.ok(fitted.endsWith('…') || [...fitted].length <= 5);
});

test('fitToWeighted is a no-op when the text already fits', () => {
  assert.equal(fitToWeighted('短い。', 100), '短い。');
});

test('composeWithRetry asks the model to shorten before trimming in code', async () => {
  const longJa = '観察している。素材が形に落ちている。核は廃棄物の再定義だ。'.repeat(8);
  const longEn = Array(8)
    .fill('One take on the material. Another sentence follows. A third overruns the limit.')
    .join(' ');
  const long = JSON.stringify({ ja: longJa, en: longEn });
  const short = JSON.stringify({ ja: '観察している。', en: 'One take on the material.' });
  const replies = [long, short];
  let i = 0;
  const call: BodyCall = async () => ({ text: replies[i++], stopReason: 'end_turn' });

  const bodies = await composeWithRetry(INPUT, call, noSleep);

  assert.equal(i, 2);
  assert.equal(bodies.ja, '観察している。');
  assert.equal(bodies.trimmedJa, false);
  assert.equal(bodies.trimmedEn, false);
});

test('composeWithRetry trims after retries instead of shipping over-long text', async () => {
  const longJa = '観察している。素材が形に落ちている。核は廃棄物の再定義だ。'.repeat(8);
  const longEn = Array(8)
    .fill('One take on the material. Another sentence follows. A third overruns the limit.')
    .join(' ');
  const long = JSON.stringify({ ja: longJa, en: longEn });
  let i = 0;
  const call: BodyCall = async () => {
    i++;
    return { text: long, stopReason: 'end_turn' };
  };

  const bodies = await composeWithRetry(INPUT, call, noSleep);

  assert.equal(i, 3);
  assert.equal(bodies.trimmedJa, true);
  assert.equal(bodies.trimmedEn, true);
  assert.ok(bodies.ja.startsWith('観察している。'));
  assert.ok(bodies.ja.length < longJa.length);
  assert.ok(bodies.en.length < longEn.length);
  assert.ok(
    weightedLength(buildJaText(INPUT.jaArticle, bodies.ja, INPUT.digestDate)) <= MAX_WEIGHTED_LENGTH,
  );
  assert.ok(weightedLength(buildEnText(INPUT.enArticle, bodies.en)) <= MAX_WEIGHTED_LENGTH);
});

test('fitBodies keeps the assembled posts inside the X limit', () => {
  const fitted = fitBodies({ ja: 'あ'.repeat(300), en: 'x'.repeat(400) }, INPUT);
  assert.equal(fitted.trimmedJa, true);
  assert.equal(fitted.trimmedEn, true);
  assert.ok(
    weightedLength(buildJaText(INPUT.jaArticle, fitted.ja, INPUT.digestDate)) <= MAX_WEIGHTED_LENGTH,
  );
  assert.ok(weightedLength(buildEnText(INPUT.enArticle, fitted.en)) <= MAX_WEIGHTED_LENGTH);
});

test('fitBodies leaves a short draft unmarked', () => {
  const fitted = fitBodies({ ja: '短い日本語の本文。', en: 'A short English body.' }, INPUT);
  assert.equal(fitted.trimmedJa, false);
  assert.equal(fitted.trimmedEn, false);
});

test('composeWithRetry gives up only when nothing usable ever arrives', async () => {
  const call: BodyCall = async () => ({ text: 'not json at all', stopReason: 'end_turn' });

  await assert.rejects(() => composeWithRetry(INPUT, call, noSleep));
});
