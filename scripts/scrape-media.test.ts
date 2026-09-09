import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMediaUrl } from './scrape-media.js';

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
