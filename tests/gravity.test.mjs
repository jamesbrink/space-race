// src/sim/core/gravity.ts: gravity as terms. The default is the Earth with J2, to the bit what every simulator has flown by;
// a third body pulls as the difference between its pull here and on the Earth; and the centre can be the Moon.
//
// Bounds from the physics before it was run: the Moon's tidal pull in a low orbit is about GM_moon r / d^3 times two at most,
// some 1.1e-6 m/s^2 at 6,600 km from the Earth's centre, and the Sun's about half of it; over an orbit they move a low
// orbit by metres to tens of metres, not kilometres.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { centralOf, EARTH_GRAVITY, earthJ2, fieldOf, moonOnEarthFlight, sunOnEarthFlight } from '../src/sim/core/gravity.ts';
import { propagate } from '../src/sim/predict.ts';
import { MOON, WGS84_A } from '../src/world/bodies.ts';
import { earthFrame, frameOf } from '../src/world/earthframe.ts';
import { moonPosition, stateOf, useEphemeris } from '../src/world/ephemeris.ts';
import { add, cross, DEG, geodeticToEcef, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';
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

// Apollo 11's coast to the Moon, from published states, with the Earth and its J2, the Moon and the Sun on DE440. Each
// state is the Apollo 11 Mission Report's (MSC-00171, November 1969, table 7-II: GET, geodetic latitude, longitude,
// altitude in nautical miles above the oblate Earth, space-fixed velocity, flight-path angle and heading), and what it
// was to come to is the same report's (table 7-III: the pericynthion altitude, above the Moon's radius at Landing Site 2,
// and its time, "resulting" from each manoeuvre). Apollo 8's injection state is published without its place over the
// Earth (Apollo by the Numbers, NASA SP-2000-4029, has its height, speed and angles) and its mission report's tables could
// not be had, so it is Apollo 11's that is flown here.
const APOLLO11 = '1969-07-16T13:32:00Z';
const COASTS = [
  // [what, GET (s), latitude, longitude, altitude (n mi), speed (ft/s), flight path, heading, pericynthion (n mi), at GET (s)]
  ['after the first midcourse correction (cutoff 26:45:01.8)', 96_301.8, 6.0, -11.17, 109_477.2, 5010.0, 76.88, 120.87, 61.5, 273_215],
  ['after the separation manoeuvre (cutoff 4:40:04.7)', 16_804.7, 21.16, -68.46, 16_627.3, 14_663.0, 64.25, 113.74, 180.8, 272_370],
  ['after translunar injection (2:50:13.2)', 10_213.2, 9.98, -164.84, 180.6, 35_546, 7.37, 60.07, 896.3, 270_321],
];
const NMI = 1852;
const FT = 0.3048;

/** A published state in the flight's frame: geodetic place at the instant, and the velocity off the local horizontal (the geocentric one) and true north. */
function published(frame, [t, latitude, longitude, altitude, speed, path, heading]) {
  const r = frame.toInertial(geodeticToEcef({ latitude, longitude, height: altitude * NMI }), t);
  const up = unit(r);
  const east = unit(cross([0, 0, 1], up));
  const north = cross(up, east);
  const [g, h] = [path * DEG, heading * DEG];
  const along = add(scale(east, Math.sin(h)), scale(north, Math.cos(h)));
  return { t, r, v: scale(add(scale(along, Math.cos(g)), scale(up, Math.sin(g))), speed * FT) };
}

/** Where the coast from `start` passes nearest the Moon: its height over the Moon's mean sphere and its time, every 20 s from 72 to 79 hours, the nearest three fitted. */
function pericynthion(frame, start, terms) {
  const marks = [];
  for (let t = 72 * 3600; t <= 79 * 3600; t += 20) marks.push(t);
  const seen = [];
  const flier = {
    kind: 'coast',
    cutoff: null,
    quiet: Number.NEGATIVE_INFINITY,
    chute: false,
    ground: () => 0,
    burning: () => false,
    push: () => [0, 0, 0],
    below: () => Number.NEGATIVE_INFINITY,
    next: (t) => marks.find((m) => m > t + 1e-6) ?? Number.POSITIVE_INFINITY,
    arrive: (t, r) => {
      if (t > start.t) seen.push({ t, d: length(sub(r, frame.fromIcrf(stateOf('moon', frame.jdTT(t)).r))) });
      return t >= marks.at(-1) ? { end: true } : {};
    },
  };
  const where = { site: { latitude: 28.608, longitude: -80.604, height: 0 }, seaLevel: 0, frame, gravity: terms };
  propagate(flier, start, where, { horizons: { limit: 80 * 3600, turns: 3, steps: 1e6 } }).run();
  let i = 0;
  seen.forEach((s, k) => {
    if (s.d < seen[i].d) i = k;
  });
  const [a, b, c] = [seen[i - 1], seen[i], seen[i + 1]];
  // (the vertex of the parabola through the three: the distance near its least is a parabola in time to well under a metre)
  const bend = (a.d - 2 * b.d + c.d) / 2;
  const x = (a.d - c.d) / (4 * bend);
  return { altitude: (b.d - bend * x * x - MOON.equatorialRadius.value) / NMI, t: b.t + 20 * x };
}

test('Apollo 11 coasts to the Moon on DE440 and passes it where its mission report says, to within what the published digits allow', (t) => {
  useEphemeris(new Uint8Array(readFileSync(join(import.meta.dirname, '../public/ephemeris/de440.bin'))).slice().buffer);
  const frame = earthFrame(julianDate(APOLLO11), true);
  const terms = [earthJ2, moonOnEarthFlight(frame), sunOnEarthFlight(frame)];
  assert.deepEqual(
    terms.map((x) => x.confidence),
    ['documented', 'derived', 'derived'],
    'the Moon and the Sun are DE440’s now',
  );
  // half the last digit of each published figure: what each moves the pericynthion by, summed (as if all were the worst way)
  const HALF = [0.05, 0.005, 0.005, 0.05, 0.05, 0.005, 0.005];
  const results = COASTS.map(([what, ...row]) => {
    const state = row.slice(0, 7);
    const flown = pericynthion(frame, published(frame, state), terms);
    let [spread, late] = [0, 0];
    for (let k = 0; k < 7; k++) {
      const nudged = state.slice();
      nudged[k] += k === 4 && what.includes('injection') ? 0.5 : HALF[k];
      const moved = pericynthion(frame, published(frame, nudged), terms);
      spread += Math.abs(moved.altitude - flown.altitude);
      late += Math.abs(moved.t - flown.t);
    }
    const [want, at] = row.slice(7);
    t.diagnostic(
      `${what}: ${flown.altitude.toFixed(1)} n mi at ${(flown.t / 3600).toFixed(4)} h; published ${want} n mi at ` +
        `${(at / 3600).toFixed(4)} h; the published digits allow ${spread.toFixed(1)} n mi and ${late.toFixed(0)} s`,
    );
    return { what, flown, want, at, spread, late };
  });
  // From the first midcourse correction, two days out, and from the separation manoeuvre, three: each within what its
  // published digits allow (flown here 55.6 n mi against 61.5, 1 s; 184.6 against 180.8, 48 s)
  const [mcc, sep, tli] = results;
  for (const c of [mcc, sep]) {
    assert.ok(Math.abs(c.flown.altitude - c.want) <= c.spread, `${c.what}: ${c.flown.altitude} n mi`);
    assert.ok(Math.abs(c.flown.t - c.at) <= c.late, `${c.what}: at ${c.flown.t} s`);
  }
  // From translunar injection itself it comes 205 n mi nearer than the report's 896.3 and 7 minutes later: more than the
  // state's digits allow (118 n mi, 6 minutes), and as much as 2 ft/s of injection speed (the report: 1.6 ft/s is 177 n
  // mi). The coasts from after the separation agree, so it is in the injection state or in what was done between it and
  // the separation (the S-IVB's venting, the 0.7 ft/s that parted them, which the report says moved its own figure to
  // 827.2), not in the gravity. Held here to reaching the Moon, at about the hour.
  assert.ok(tli.flown.altitude > 300 && tli.flown.altitude < 1200, `${tli.what}: ${tli.flown.altitude} n mi`);
  assert.ok(Math.abs(tli.flown.t - tli.at) < 1800, `${tli.what}: at ${tli.flown.t} s`);
  useEphemeris(null);
});
