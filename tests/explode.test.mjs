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

test('a route starts at the origin facing along its first leg and ends at its last point', async () => {
  const { Route } = await import('../src/viewer/explode.ts');
  const route = new Route([
    [0, 10],
    [10, 20],
  ]);
  const start = route.at(0);
  const end = route.at(route.length);
  assert.ok(Math.abs(start.x) < 1e-6 && Math.abs(start.z) < 1e-6 && Math.abs(start.heading) < 1e-6);
  assert.ok(Math.abs(end.x - 10) < 1e-6 && Math.abs(end.z - 20) < 1e-6);
  assert.ok(route.length > Math.hypot(10, 20) && route.length < 30, `length ${route.length}`);
  assert.ok(end.heading > 0.3 && end.heading < Math.PI / 2, `turned toward +x: ${end.heading}`);
  // distance along it never runs backwards
  let last = -1;
  for (let i = 0; i <= 50; i++) {
    const p = route.at((route.length * i) / 50);
    assert.ok(p.z >= last - 1e-6);
    last = p.z;
  }
});
