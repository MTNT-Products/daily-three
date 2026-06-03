import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMaxAgeHours } from './collect.js';

test('resolveMaxAgeHours uses defaults when collection is omitted', () => {
  assert.deepEqual(resolveMaxAgeHours(), { product: 48, automotive: 168 });
});

test('resolveMaxAgeHours merges sources.yaml collection block', () => {
  assert.deepEqual(resolveMaxAgeHours({ max_age_hours: { product: 48, automotive: 120 } }), {
    product: 48,
    automotive: 120,
  });
});
