import assert from 'node:assert/strict';
import test from 'node:test';
import {
  digestCalendarDate,
  digestEditionCalendarDate,
  digestPublishDate,
  isDigestEditionWeekday,
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

test('delayed Friday job after midnight Saturday still counts as a weekday edition', () => {
  // 2026-08-28T23:23:21Z = Saturday 08:23 JST; edition slug is Friday 8/28
  const delayedFriday = new Date('2026-08-28T23:23:21Z');
  assert.equal(digestEditionCalendarDate(delayedFriday), '2026-08-28');
  assert.equal(isDigestWeekday(delayedFriday), false);
  assert.equal(isDigestEditionWeekday(delayedFriday), true);
});

test('Saturday afternoon is a weekend edition even with the noon rule', () => {
  // 2026-08-29T06:00:00Z = Saturday 15:00 JST
  const saturdayAfternoon = new Date('2026-08-29T06:00:00Z');
  assert.equal(digestEditionCalendarDate(saturdayAfternoon), '2026-08-29');
  assert.equal(isDigestEditionWeekday(saturdayAfternoon), false);
});
