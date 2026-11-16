// The drag of a body in orbit (src/sim/orbital.ts `orbitDrag`): free-molecular in the orbit's air, the continuum curve
// in the thick air, bridged by the Knudsen number on the 1976 standard's mean free path (atmosphere.ts `meanFreePath`).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atmosphere, meanFreePath } from '../src/sim/atmosphere.ts';
import { along } from '../src/sim/fly.ts';
import { orbitDrag, rarefaction, shipOf } from '../src/sim/orbital.ts';
import { flight } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';

const near = (a, b, tolerance, what = '') => assert.ok(Math.abs(a - b) <= tolerance, `${what} ${a} is not within ${tolerance} of ${b}`);

test('the mean free path is the standard’s Table II at its rows, and runs on without a step either side', () => {
  for (const [km, path] of [
    [86, 1.17e-2],
    [100, 1.42e-1],
    [120, 3.31],
    [150, 33],
    [200, 240],
  ])
    near(meanFreePath(km * 1000) / path, 1, 1e-12, `${km} km`);
  for (const h of [86_000, 200_000]) near(meanFreePath(h - 1) / meanFreePath(h + 1), 1, 1e-3, `at ${h} m`);
  // below 86 km it goes as one over the density
  near(meanFreePath(60_000) / meanFreePath(86_000), atmosphere(86_000).density / atmosphere(60_000).density, 1e-12);
  let last = 0;
  for (let h = 0; h <= 400_000; h += 1_000) {
    const l = meanFreePath(h);
    assert.ok(l > last, `longer with height at ${h} m`);
    last = l;
  }
});

test('the bridge: none of the free-molecule figure below Kn 0.001, all of it above 10, half at 0.1, and smooth between', () => {
  assert.equal(rarefaction(0.0005), 0);
  assert.equal(rarefaction(0.001), 0);
  assert.equal(rarefaction(10), 1);
  assert.equal(rarefaction(1e4), 1);
  near(rarefaction(0.1), 0.5, 1e-12);
  let last = 0;
  for (let k = -3; k <= 1; k += 0.01) {
    const share = rarefaction(10 ** k);
    assert.ok(share >= last);
    last = share;
  }
});

test('Vostok in orbit: the joined ship’s free-molecule figure up there, the ball’s curve in thick air, joined or not', () => {
  const ship = shipOf(flight.plan);
  const { drag, area } = ship.rarefied;
  const ball = ship.entry.aero;
  // in its orbit: the ship's 2.2 on its 7.17 m^2, three and a half times the ball's continuum figure on its disc
  near(orbitDrag(ship, true, 200_000, 28), drag.value * area.value, 1e-12);
  near(orbitDrag(ship, false, 200_000, 28), ball.rarefied.value * ball.area.value, 1e-12);
  assert.ok(orbitDrag(ship, true, 200_000, 28) > 3.5 * ball.area.value * along(ball.drag, 28));
  // in thick air the curve, joined or not
  for (const joined of [true, false]) assert.equal(orbitDrag(ship, joined, 60_000, 20), ball.area.value * along(ball.drag, 20));
  // between, it goes from one to the other as the air thickens
  let last = Number.POSITIVE_INFINITY;
  for (let h = 160_000; h >= 70_000; h -= 1_000) {
    const a = orbitDrag(ship, true, h, 25);
    assert.ok(a <= last, `${h} m`);
    last = a;
  }
});
