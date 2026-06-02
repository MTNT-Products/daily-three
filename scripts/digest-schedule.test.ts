import assert from 'node:assert/strict';
import test from 'node:test';
import {
  digestCalendarDate,
  digestEditionCalendarDate,
  digestPublishDate,
  isDigestWeekday,
} from './digest-schedule.js';

test('isDigestWeekday uses Asia/Tokyo', () => {
  // 2026-05-31 08:00 UTC = Sunday in Tokyo
  assert.equal(isDigestWeekday(new Date('2026-05-31T08:00:00Z')), false);
  // 2026-05-30 00:06 UTC = Saturday in Tokyo
  assert.equal(isDigestWeekday(new Date('2026-05-30T00:06:08Z')), false);
  // 2026-05-29 14:00 UTC = Thursday 23:00 JST
  assert.equal(isDigestWeekday(new Date('2026-05-29T14:00:00Z')), true);
});

test('digestCalendarDate matches JST wall-clock day', () => {
  assert.equal(digestCalendarDate(new Date('2026-05-30T00:06:08Z')), '2026-05-30');
});

test('digestEditionCalendarDate on-time evening run', () => {
  assert.equal(digestEditionCalendarDate(new Date('2026-05-29T14:00:00Z')), '2026-05-29');
});

test('digestEditionCalendarDate attributes delayed CI to previous JST day', () => {
  // 2026-06-01T19:20:21Z = 2026-06-02 04:20 JST → Monday 6/1 edition
  assert.equal(digestEditionCalendarDate(new Date('2026-06-01T19:20:21Z')), '2026-06-01');
});

test('digestPublishDate uses edition slug not wall-clock JST day', () => {
  assert.equal(digestPublishDate(new Date('2026-05-29T14:00:00Z')).toISOString().slice(0, 10), '2026-05-29');
  assert.equal(digestPublishDate(new Date('2026-06-01T19:20:21Z')).toISOString().slice(0, 10), '2026-06-01');
});
