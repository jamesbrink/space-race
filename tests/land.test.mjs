import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fbm2, hash2, noise2, sequence } from '../src/viewer/field.ts';

test('the integer hash is the same every time, spread over 0 to 1, and never negative at negative coordinates', () => {
  assert.equal(hash2(3, -7, 11), hash2(3, -7, 11));
  assert.notEqual(hash2(3, -7, 11), hash2(3, -7, 12));
  let low = 1,
    high = 0,
    sum = 0;
  for (let i = -500; i < 500; i++) {
    const h = hash2(i, i * 7 - 3, 5);
    low = Math.min(low, h);
    high = Math.max(high, h);
    sum += h;
  }
  assert.ok(low >= 0 && high < 1);
  assert.ok(low < 0.01 && high > 0.99);
  assert.ok(Math.abs(sum / 1000 - 0.5) < 0.05);
});

test('value noise passes through its lattice and is continuous between', () => {
  assert.equal(noise2(4, -2, 9), hash2(4, -2, 9));
  const a = noise2(4.5, -2.5, 9);
  assert.ok(Math.abs(noise2(4.5 + 1e-6, -2.5, 9) - a) < 1e-5);
  for (let x = -3; x < 3; x += 0.37) {
    const n = fbm2(x, x * 0.5, 2, 4);
    assert.ok(n >= 0 && n <= 1);
  }
});

test('a sequence from a seed repeats, and two seeds differ', () => {
  const a = sequence(42),
    b = sequence(42),
    c = sequence(43);
  const first = [a(), a(), a()];
  assert.deepEqual(first, [b(), b(), b()]);
  assert.notDeepEqual(first, [c(), c(), c()]);
});
