import assert from 'node:assert/strict';
import test from 'node:test';
import {
  digestCalendarDate,
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

test('digestCalendarDate matches JST calendar day', () => {
  assert.equal(digestCalendarDate(new Date('2026-05-30T00:06:08Z')), '2026-05-30');
  assert.equal(digestPublishDate(new Date('2026-05-29T14:00:00Z')).toISOString().slice(0, 10), '2026-05-29');
});
