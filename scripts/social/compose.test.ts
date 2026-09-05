import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyBudget, buildEnText, buildJaText, buildReplyText } from './compose.js';
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
