// src/sim/core/gravity.ts: gravity as terms. The default is the Earth with J2, to the bit what every simulator has flown by;
// a third body pulls as the difference between its pull here and on the Earth; and the centre can be the Moon.
//
// Bounds from the physics before it was run: the Moon's tidal pull in a low orbit is about GM_moon r / d^3 times two at most,
// some 1.1e-6 m/s^2 at 6,600 km from the Earth's centre, and the Sun's about half of it; over an orbit they move a low
// orbit by metres to tens of metres, not kilometres.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { centralOf, EARTH_GRAVITY, earthJ2, fieldOf, moonOnEarthFlight, sunOnEarthFlight } from '../src/sim/core/gravity.ts';
import { propagate } from '../src/sim/predict.ts';
import { MOON, WGS84_A } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { moonPosition } from '../src/world/ephemeris.ts';
import { length, scale, siteFrame, sub } from '../src/world/frames.ts';
import { gravity } from '../src/world/orbit.ts';

const frame = frameOf(vostok1);
const R = [WGS84_A + 250_000, 1_000_000, 2_000_000];

test('the default is the Earth with J2, to the bit', () => {
  assert.deepEqual(EARTH_GRAVITY, [earthJ2]);
  assert.deepEqual(fieldOf(EARTH_GRAVITY)(R, 123), gravity(R));
  assert.deepEqual(centralOf('earth', frame), EARTH_GRAVITY);
});

test('the Moon and the Sun pull on a low orbit by their tides, labelled estimated', () => {
  const moon = moonOnEarthFlight(frame);
  const sun = sunOnEarthFlight(frame);
  for (const term of [moon, sun]) assert.equal(term.confidence, 'estimated');
  const m = length(moon.at(R, 0));
  const s = length(sun.at(R, 0));
  assert.ok(m > 3e-7 && m < 2.5e-6, `the Moon's tide ${m.toExponential(2)} m/s^2`);
  assert.ok(s > 1e-7 && s < 1.2e-6, `the Sun's ${s.toExponential(2)} m/s^2`);
  // at the Earth's centre a tide is nothing
  assert.ok(length(moon.at([0, 0, 0], 0)) < 1e-20, 'nothing at the centre');
  // the terms sum
  const all = fieldOf([earthJ2, moon, sun]);
  const sum = all(R, 0);
  const parts = [gravity(R), moon.at(R, 0), sun.at(R, 0)].reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  assert.ok(length(sub(sum, parts)) < 1e-15);
});

test('about the Moon, the Moon pulls as a point mass at the centre and the Earth as a third body', () => {
  const terms = centralOf('moon', frame);
  assert.equal(terms[0].name, 'the Moon');
  const low = [MOON.equatorialRadius?.value ?? 1_737_400, 0, 100_000];
  const r = scale(low, (1_737_400 + 100_000) / length(low));
  const g = fieldOf(terms)(r, 0);
  near(length(g), MOON.gm.value / length(r) ** 2, 1e-4 * length(g), 'the Moon’s surface gravity, give or take the Earth’s tide');
  // the Earth's place from the Moon is the Moon's from the Earth, turned round
  const earth = terms[1].at([0, 0, 0], 0);
  assert.ok(length(earth) < 1e-20, 'a tide is nothing at the centre');
  assert.ok(length(moonPosition(frame.jdTT(0))) > 3.5e8);
});

test('a coast predicted with the Moon and the Sun pulling moves by metres an orbit, not kilometres', (t) => {
  const quiet = {
    kind: 'coast',
    cutoff: null,
    quiet: Number.NEGATIVE_INFINITY,
    chute: false,
    ground: () => 0,
    burning: () => false,
    push: () => [0, 0, 0],
    next: () => Infinity,
    below: () => Number.NEGATIVE_INFINITY,
    arrive: () => ({}),
  };
  const r = [WGS84_A + 300_000, 0, 0];
  const v = [0, 7726 * Math.cos(1.13), 7726 * Math.sin(1.13)];
  const where = { site: siteFrame(vostok1.site), seaLevel: 0, frame };
  const run = (gravityTerms) => {
    const job = propagate(quiet, { t: 0, r, v }, { ...where, gravity: gravityTerms }, { limit: 5000 });
    job.run();
    return job.result.points.at(-1);
  };
  const plain = run(undefined);
  const pulled = run([earthJ2, moonOnEarthFlight(frame), sunOnEarthFlight(frame)]);
  const off = length(sub(plain.r, pulled.r));
  t.diagnostic(`once round, the Moon and the Sun move it ${off.toFixed(1)} m`);
  assert.ok(off > 0.1 && off < 200, `${off} m`);
});

function near(got, want, tolerance, what) {
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
}
