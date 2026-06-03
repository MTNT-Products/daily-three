import test from 'node:test';
import assert from 'node:assert/strict';
import { jobListingTitlePenalty, ruleScore } from './rank.js';
import type { RawArticle, SourcesFile } from './types.js';

const baseArticle = (overrides: Partial<RawArticle>): RawArticle => ({
  id: '1',
  title: 'Concept car reveal',
  summary: 'New model debut at studio',
  url: 'https://example.com/a',
  publishedAt: new Date(),
  sourceId: 'car-body-design',
  sourceName: 'Car Body Design',
  category: 'automotive',
  ...overrides,
});

const scoringConfig: SourcesFile = {
  sources: [],
  scoring: {
    boost_keywords: ['concept'],
    penalty_keywords: ['hiring', 'vacancy'],
    low_priority_keywords: [],
  },
};

test('jobListingTitlePenalty hits location-style designer listings', () => {
  assert.equal(jobListingTitlePenalty('Exterior Designer – Gothenburg, Sweden'), 8);
  assert.equal(jobListingTitlePenalty('Senior Colour Designer'), 8);
  assert.equal(jobListingTitlePenalty('Ferrari Amalfi Spider design story'), 0);
});

test('ruleScore applies recruitment keywords from sources.yaml', () => {
  const scored = ruleScore(
    [baseArticle({ title: 'Studio hiring: exterior designer', summary: 'vacancy open' })],
    scoringConfig,
    { 'car-body-design': 1 },
  );
  assert.ok(scored[0].score < 10);
});
