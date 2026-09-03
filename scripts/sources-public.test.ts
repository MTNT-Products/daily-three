import test from 'node:test';
import assert from 'node:assert/strict';
import { listPublicSources, loadSourceConfigs } from '../src/lib/sources.ts';

test('listPublicSources collapses Designboom feeds and keeps yaml order', () => {
  const listed = listPublicSources(loadSourceConfigs());
  const names = listed.map((s) => s.name);
  assert.deepEqual(names, [
    'Dezeen',
    'Designboom',
    'Car Body Design',
    'Auto Express',
    'Motor1 Design',
    'Core77',
    'Yanko Design',
  ]);
  const designboom = listed.find((s) => s.name === 'Designboom');
  assert.ok(designboom);
  assert.equal(designboom.homepage, 'https://www.designboom.com/');
  assert.deepEqual(designboom.categories, ['automotive', 'product']);
});
