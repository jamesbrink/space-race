// src/sim/air.ts `skyOf`: the air a plan flies through. Where its flight carries the day's column (`FlightPlan.aloft`) it
// is the column's within it and the 1976 standard's scaled to meet it outside, so nothing steps at either end or at the
// height the scaling eases out by; the wind is the record's own sounding where it has one, else the column's. With the
// day's air switched off (`DAY_AIR.on`), every plan flies the standard and its sounding, as before it was read.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { blowOf, COLUMN_EASED, DAY_AIR, STANDARD, skyOf } from '../src/sim/air.ts';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { aloftAt, windParts } from '../src/world/aloft.ts';

const root = join(import.meta.dirname, '..');
const flights = (
  await Promise.all(
    globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight),
  )
).filter((f) => f.plan);
const columned = flights.filter((f) => f.plan.aloft);
/** `fn` with the day's air switched `on`, and the switch put back. */
const withDay = (on, fn) => {
  const was = DAY_AIR.on;
  try {
    DAY_AIR.on = on;
    return fn();
  } finally {
    DAY_AIR.on = was;
  }
};

test('every flight with a column of the day flies it, and it is the weather’s', () => {
  assert.ok(columned.length >= 4, `${columned.length} flights carry a column`);
  for (const f of flights) if (f.weather?.aloft) assert.equal(f.plan.aloft, f.weather.aloft, `${f.id}: the plan's column is its weather's`);
});

test('a plan with no column flies the standard atmosphere, and its sounding or calm', () => {
  assert.equal(skyOf(undefined), STANDARD);
  assert.equal(skyOf({}), STANDARD);
  for (const f of flights.filter((x) => !x.plan.aloft)) {
    const sky = skyOf(f.plan);
    assert.equal(sky.column, false);
    for (const h of [0, 5_000, 30_000, 90_000]) assert.deepEqual(sky.air(h), atmosphere(h));
  }
});

for (const f of columned) {
  test(`${f.callsign}: the day's air within its column, the standard's met at both ends, nothing stepping`, () => {
    const sky = withDay(true, () => skyOf(f.plan));
    assert.equal(sky.column, true);
    const levels = f.plan.aloft.levels;
    const [low, top] = [levels[0].height.value, levels.at(-1).height.value];
    // within the column, the column's
    for (const l of levels) {
      const day = aloftAt(f.plan.aloft, l.height.value);
      const a = sky.air(l.height.value);
      assert.equal(a.density, day.density);
      assert.equal(a.pressure, day.pressure);
      assert.equal(a.temperature, day.temperature);
    }
    // no step at the top, at the ground or where the scaling eases out
    for (const [h, what] of [
      [top, 'the top'],
      [low, 'the ground'],
      [COLUMN_EASED, 'the eased height'],
    ]) {
      const [a, b] = [sky.air(h - 1e-3), sky.air(h + 1e-3)];
      assert.ok(Math.abs(a.density / b.density - 1) < 1e-5, `${f.id}: ${what}: ${a.density} against ${b.density}`);
    }
    for (const h of [COLUMN_EASED, 80_000, 150_000]) assert.deepEqual(sky.air(h), atmosphere(h), `${f.id}: the standard's own at ${h} m`);
    // the column's air is within a few per cent of the standard's up to its top (a real day, not another planet's)
    for (let h = low; h <= top; h += 1_000) {
      const k = sky.air(h).density / atmosphere(h).density;
      assert.ok(k > 0.8 && k < 1.2, `${f.id}: ${h} m: the day's density ${k.toFixed(3)} of the standard's`);
    }
    // the wind: the record's sounding where it has one, else the column's
    if (f.plan.winds) assert.deepEqual(sky.blow(10_000), blowOf(f.plan.winds)(10_000));
    else {
      const mid = levels[Math.floor(levels.length / 2)];
      assert.deepEqual(sky.blow(mid.height.value), windParts(mid.wind), `${f.id}: the column's wind at ${mid.height.value} m`);
      assert.deepEqual(sky.blow(COLUMN_EASED + 1), [0, 0]);
    }
  });
}

test('with the day’s air off every plan flies the standard and its sounding', () => {
  for (const f of columned) {
    const sky = withDay(false, () => skyOf(f.plan));
    assert.equal(sky.column, false);
    assert.equal(sky.air, atmosphere);
    assert.equal(sky.blow === null, !f.plan.winds);
  }
});
