import assert from 'node:assert/strict';
import { test } from 'node:test';
import { partProgress } from '../src/viewer/explode.ts';

test('assembled at 0, fully apart at 1, whatever the order', () => {
  for (const orders of [0, 1, 5])
    for (let order = 0; order <= orders; order++) {
      assert.equal(partProgress(0, order, orders), 0);
      assert.equal(partProgress(1, order, orders), 1);
    }
});

test('a part never moves backwards as the slider advances', () => {
  for (let order = 0; order <= 4; order++) {
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const k = partProgress(i / 100, order, 4);
      assert.ok(k >= last && k <= 1, `order ${order} at t=${i / 100}`);
      last = k;
    }
  }
});

test('parts leave in order: a later part is never ahead of an earlier one', () => {
  for (let i = 0; i <= 100; i++)
    for (let order = 1; order <= 4; order++)
      assert.ok(partProgress(i / 100, order, 4) <= partProgress(i / 100, order - 1, 4), `order ${order} at t=${i / 100}`);
});

test('the first part has left before the last one starts', () => {
  assert.equal(partProgress(0.5, 0, 4), 1);
  assert.equal(partProgress(0.5, 4, 4), 0);
});
