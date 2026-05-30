import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterDuplicateStories,
  repeatsRecentStory,
  storyAngle,
  storyEntityKey,
  storyFingerprint,
} from './story-dedup.js';
import type { RecentStory } from './recent-digests.js';
import type { ScoredArticle } from './types.js';

const FERRARI_LAUNCH = {
  url: 'https://www.designboom.com/technology/ferrari-luce-first-electric-car-jony-ive-marc-newson-lovefrom/',
  title: 'Ferrari Luce first electric car by LoveFrom',
};

const FERRARI_DEBATE = {
  url: 'https://www.dezeen.com/2026/05/28/electric-ferrari-luce-jony-ive-marc-newson-lovefrom-dezeen-debate/',
  title: 'Dezeen Agenda features Ferrari first electric car',
};

const FERRARI_PODCAST = {
  url: 'https://www.dezeen.com/2026/05/29/ferrari-luce-dezeen-weekly-podcast/',
  title: 'Why the new electric Ferrari draws criticism',
};

function scored(partial: { url: string; title: string; score?: number }): ScoredArticle {
  return {
    id: partial.url,
    title: partial.title,
    summary: '',
    url: partial.url,
    publishedAt: new Date(),
    sourceId: 'test',
    sourceName: 'Test',
    category: 'automotive',
    score: partial.score ?? 10,
  };
}

function recentFrom(url: string, title: string, date = '2026-05-26'): RecentStory {
  return {
    date,
    title,
    url,
    topicKey: storyEntityKey(url, title),
  };
}

test('storyAngle: podcast is meta, debate is not', () => {
  assert.equal(storyAngle(FERRARI_PODCAST.url, FERRARI_PODCAST.title), 'meta');
  assert.equal(storyAngle(FERRARI_DEBATE.url, FERRARI_DEBATE.title), 'other');
});

test('repeatsRecentStory: debate repeats launch, podcast does not', () => {
  const launch = storyFingerprint(FERRARI_LAUNCH.url, FERRARI_LAUNCH.title);
  const debate = storyFingerprint(FERRARI_DEBATE.url, FERRARI_DEBATE.title);
  const podcast = storyFingerprint(FERRARI_PODCAST.url, FERRARI_PODCAST.title);

  assert.equal(repeatsRecentStory(debate, launch), true);
  assert.equal(repeatsRecentStory(podcast, launch), false);
});

test('filterDuplicateStories removes debate after launch in recent', () => {
  const recent: RecentStory[] = [
    recentFrom(FERRARI_LAUNCH.url, FERRARI_LAUNCH.title),
  ];
  const pool = [
    scored({ ...FERRARI_DEBATE, score: 30 }),
    scored({ url: 'https://example.com/other-car-concept/', title: 'Other concept car', score: 20 }),
  ];

  const out = filterDuplicateStories(pool, recent);
  assert.equal(out.length, 1);
  assert.ok(out[0].url.includes('example.com'));
});
