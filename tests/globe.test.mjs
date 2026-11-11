// viewer/globe.ts: the air the sunlight comes through (the Chapman function, by Schüler's
// approximation) behaves as the function does: a secant overhead, finite and smooth through the
// horizon, and the Earth's shadow below it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chapman, transmission } from '../src/viewer/globe.ts';

const R = 6_371_000;
const H = 8_000;

test('overhead and on the slant it is the secant, to the approximation', () => {
  for (const deg of [0, 30, 60, 75]) {
    const mu = Math.cos((deg * Math.PI) / 180);
    const ch = chapman(0, mu, R, H);
    assert.ok(Math.abs(ch * mu - 1) < 0.08, `${deg} deg: ${ch} against a secant of ${1 / mu}`);
  }
});

test('along the horizon it is finite, about sqrt(pi R / 2H) (35), and continuous through it', () => {
  const at = chapman(0, 0, R, H);
  assert.ok(at > 25 && at < 40, `${at}`);
  assert.ok(Math.abs(chapman(0, 1e-6, R, H) - chapman(0, -1e-6, R, H)) < 0.01);
});

test('below the horizon the Sun is lost in the Earth, smoothly', () => {
  let last = chapman(0, 0, R, H);
  for (let deg = 91; deg <= 100; deg++) {
    const ch = chapman(0, Math.cos((deg * Math.PI) / 180), R, H);
    assert.ok(ch > last, `${deg} deg`);
    last = ch;
  }
  assert.ok(transmission(Math.cos((100 * Math.PI) / 180), 0.2, R) < 1e-6);
  // from 100 km up the Sun 5 degrees under the level is still in sight over the curve: the ray's lowest point is 75 km up,
  // and the air it crosses (the function is relative to the density where it starts) is under a hundredth of the column overhead at sea level
  assert.ok(chapman(100_000, Math.cos((95 * Math.PI) / 180), R, H) * Math.exp(-100_000 / H) < 0.01);
});
