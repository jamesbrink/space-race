// src/world/jpl.ts and public/ephemeris/de440.bin (tools/ephemeris-bake.mjs): the baked DE440 read back, its stated fit
// against the JPL kernel, and the Moon from the Earth's centre against JPL Horizons's vector table (DE441, ICRF,
// geometric; queried 16 November 2026) at Apollo 11's translunar injection, 1969-07-16 16:22:13.2 UTC (the Apollo 11
// Mission Report, MSC-00171, table 7-II, 2:50:13.2 after a 13:32:00 UTC liftoff).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { readEphemeris } from '../src/world/jpl.ts';
import { barycentricTime, julianDate, terrestrialTime } from '../src/world/time.ts';

const file = readFileSync(join(import.meta.dirname, '../public/ephemeris/de440.bin'));
const e = readEphemeris(new Uint8Array(file).slice().buffer);
const length = (v) => Math.hypot(...v);
const minus = (a, b) => a.map((x, i) => x - b[i]);

test('the file: DE440 from 1957 to 2035, a megabyte and a quarter, each series as near the kernel as its header says', () => {
  // (0.92 MB of places, and the Moon's orientation, 0.31 MB: its librations are not a few terms)
  assert.ok(file.length < 1_300_000, `${file.length} bytes`);
  // the Moon's principal axes within a tenth of a microradian (17 cm on its ground), and it turns: 13.2 degrees a day
  const turning = e.accuracy('moonpa');
  assert.ok(
    turning.position < 1e-7 && turning.velocity < 1e-11,
    `the Moon's orientation: ${turning.position} rad, ${turning.velocity} rad/s`,
  );
  const [a, b] = [e.state('moonpa', julianDate('1969-07-20')), e.state('moonpa', julianDate('1969-07-21'))];
  assert.ok(Math.abs(((b.r[2] - a.r[2]) * 180) / Math.PI - 13.18) < 0.3, `${((b.r[2] - a.r[2]) * 180) / Math.PI} degrees in a day`);
  // (an instant in two parts is the same instant)
  const [whole, parts] = [e.state('moon', julianDate('1969-07-20') + 0.25), e.state('moon', julianDate('1969-07-20'), 0.25)];
  assert.ok(Math.hypot(...whole.r.map((x, i) => x - parts.r[i])) < 0.1, 'an instant in two parts');
  assert.ok(e.from <= julianDate('1957-01-01') && e.to >= julianDate('2035-01-01'), 'the span');
  assert.match(e.source, /DE440/);
  // the targets: the Moon within 100 m and 1 mm/s of DE440, the Sun and the planets within 10 km
  const moon = e.accuracy('moon');
  assert.ok(moon.position < 100 && moon.velocity < 1e-3, `the Moon: ${moon.position} m, ${moon.velocity} m/s`);
  for (const id of ['emb', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
    assert.ok(e.accuracy(id).position < 10_000, `${id}: ${e.accuracy(id).position} m`);
  }
  assert.throws(() => readEphemeris(new ArrayBuffer(64)), /not a baked DE440/);
  assert.equal(e.state('moon', julianDate('1950-01-01')), undefined, 'nothing before it');
});

test('the Moon at Apollo 11’s translunar injection: Horizons’s state vector to 10 m and 0.05 mm/s', () => {
  const jd = barycentricTime(terrestrialTime(julianDate('1969-07-16T16:22:13.200Z')));
  const s = e.state('moon', jd);
  const r = [-2.960224832126472e8, 2.427471105229392e8, 1.280891331885557e8];
  const v = [-647.0837021240047, -639.756375612812, -355.0195716904096];
  assert.ok(length(minus(s.r, r)) < 10, `${length(minus(s.r, r))} m`);
  assert.ok(length(minus(s.v, v)) < 5e-5, `${length(minus(s.v, v))} m/s`);
});

test('a segment’s polynomial is its velocity’s: the derivative against its positions either side', () => {
  // (a fourth-order difference over 1000 s, so neither the step nor a Julian date's 40 microseconds is what is measured)
  const h = 1000 / 86_400;
  for (const id of ['moon', 'emb', 'sun', 'mercury', 'neptune']) {
    for (const jd of [2_436_000.3, 2_440_419.68, 2_451_545.0, 2_464_000.9]) {
      const at = (k) => e.state(id, jd + k * h).r;
      const slope = at(1).map((_, i) => (8 * (at(1)[i] - at(-1)[i]) - (at(2)[i] - at(-2)[i])) / (12 * 1000));
      const v = e.state(id, jd).v;
      const d = length(minus(slope, v));
      assert.ok(d < 1e-7 * length(v) + 2e-4, `${id} at ${jd}: ${d} m/s`);
    }
  }
});

test('neighbouring segments meet: no step in place where one hands over to the next', () => {
  // the Moon's segments are 16 days from 1957 January 1.0 TDB
  for (let k = 1; k < 1700; k += 97) {
    const at = 2_435_839.5 + 16 * k;
    const [a, b] = [e.state('moon', at - 1e-9), e.state('moon', at + 1e-9)];
    assert.ok(length(minus(a.r, b.r)) < 10, `at ${at}: ${length(minus(a.r, b.r))} m`);
  }
});
