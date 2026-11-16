// The parts a long list is split into for the runners (part.mjs): disjoint, and together the whole list.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { part } from './part.mjs';

test('unset, a list is taken whole', () => {
  assert.deepEqual(part([1, 2, 3], undefined), [1, 2, 3]);
});

test('the parts are disjoint and together are the list, for any length and any number of parts', () => {
  for (const n of [1, 2, 6, 9])
    for (const length of [0, 1, 5, 6, 7, 20]) {
      const list = Array.from({ length }, (_, k) => k);
      const parts = Array.from({ length: n }, (_, i) => part(list, `${i + 1}/${n}`));
      assert.deepEqual(
        parts.flat().sort((a, b) => a - b),
        list,
        `${length} items in ${n} parts`,
      );
    }
});

test('a part that cannot be is refused, not taken for the whole list', () => {
  for (const bad of ['0/6', '7/6', 'two', '2-6']) assert.throws(() => part([1, 2], bad), /SR_PART/);
});
