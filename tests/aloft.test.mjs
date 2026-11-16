// src/world/aloft.ts: a day's column of air read at any height and hour. Held to the U.S. Standard Atmosphere 1976
// (NOAA-S/T 76-1562): its layer bases as a column's levels give the standard back between them (src/sim/atmosphere.ts is
// the standard, itself held to the NOAA tables in tests/atmosphere.test.mjs), and its published figures at 11 and 20 km.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { aloftAt, aloftFrom, geometric, geopotential, hourAt, windOf, windParts } from '../src/world/aloft.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

/** The standard's layer bases (geopotential km) as a column: each level's geometric height, temperature and pressure the standard's own. */
const STANDARD = aloftFrom(
  { where: 'nowhere: the standard', at: '1976-01-01T00:00:00Z', source: 'U.S. Standard Atmosphere 1976' },
  [0, 11, 20, 32, 47, 51, 71].map((km) => {
    const h = geometric(km * 1000);
    const air = atmosphere(h);
    return [air.pressure / 100, h, air.temperature, 3, -4];
  }),
  'documented',
  'U.S. Standard Atmosphere 1976',
);

test('a column of the standard’s layer bases gives the standard back at every height between', () => {
  for (let h = 0; h <= geometric(71_000); h += 731) {
    const got = aloftAt(STANDARD, h);
    const want = atmosphere(h);
    near(got.temperature, want.temperature, 1e-9 * want.temperature, `temperature at ${h} m`);
    near(got.pressure, want.pressure, 1e-9 * want.pressure, `pressure at ${h} m`);
    near(got.density, want.density, 1e-9 * want.density, `density at ${h} m`);
  }
  // the standard's published figures at the tropopause and at 20 km geopotential (NOAA-S/T 76-1562, Table I)
  near(aloftAt(STANDARD, geometric(11_000)).pressure, 22_632.06, 0.05, 'pressure at 11 km');
  near(aloftAt(STANDARD, geometric(20_000)).pressure, 5_474.889, 0.005, 'pressure at 20 km');
  near(aloftAt(STANDARD, geometric(11_000)).temperature, 216.65, 1e-9, 'temperature there');
  assert.equal(aloftAt(STANDARD, -10), null, 'nothing below its lowest level');
  assert.equal(aloftAt(STANDARD, 90_000), null, 'or above its top: the standard atmosphere’s there');
  near(geopotential(geometric(12_345)), 12_345, 1e-9, 'geopotential and geometric height, there and back');
});

test('the wind: from a bearing at a speed, as parts, and taken straight between levels', () => {
  const w = windOf(3, -4, 'derived', 'test');
  near(w.speed.value, 5, 1e-12, 'its speed');
  near(w.from.value, 323.13010235415595, 1e-9, 'it blows toward the south-east, so from 323 degrees');
  const [east, north] = windParts(w);
  near(east, 3, 1e-12, 'east');
  near(north, -4, 1e-12, 'north');
  const [e, n] = aloftAt(STANDARD, 5_000).wind;
  near(e, 3, 1e-12, 'the same wind between two levels');
  near(n, -4, 1e-12, 'north');
});

test('the hours: the surface’s weather between the two hours either side', () => {
  const m = (value) => ({ value, confidence: 'derived', source: 'test' });
  const hours = [
    { at: '1961-05-05T14:00:00Z', wind: windOf(0, 2, 'derived', 'test'), temperature: m(296), pressure: m(102_000) },
    { at: '1961-05-05T15:00:00Z', wind: windOf(2, 2, 'derived', 'test'), temperature: m(298), pressure: m(101_900) },
  ];
  const at = hourAt(hours, '1961-05-05T14:34:13Z');
  const f = (34 * 60 + 13) / 3600;
  near(at.temperature, 296 + 2 * f, 1e-9, 'temperature');
  near(at.pressure, 102_000 - 100 * f, 1e-6, 'pressure');
  near(at.wind[0], 2 * f, 1e-12, 'wind east');
  near(at.wind[1], 2, 1e-12, 'wind north');
  assert.equal(hourAt(hours, '1961-05-05T16:00:00Z'), null, 'none after the last hour');
});

test('each flight with a day’s weather has ERA5’s column over its pad and its hours, and the column holds together', async () => {
  const { globSync } = await import('node:fs');
  const { pathToFileURL } = await import('node:url');
  const { join } = await import('node:path');
  const root = join(import.meta.dirname, '..');
  const files = globSync('missions/*/*/flights/*/weather.ts', { cwd: root });
  assert.ok(files.length >= 4);
  for (const f of files) {
    const { WEATHER } = await import(pathToFileURL(join(root, f)).href);
    const { levels } = WEATHER.aloft;
    assert.ok(levels.length >= 30 && levels.at(-1).height.value > 45_000, `${f}: to 1 hPa`);
    assert.ok(
      levels.every((l) => l.temperature.confidence === 'derived' && /ERA5/.test(l.temperature.source)),
      `${f}: derived, from ERA5`,
    );
    // each layer's thickness as its own temperatures make it (the hypsometric equation, dry air) and as its heights are
    for (let k = 1; k < levels.length; k++) {
      const [a, b] = [levels[k - 1], levels[k]];
      assert.ok(b.height.value > a.height.value && b.pressure.value < a.pressure.value, `${f}: rising and thinning`);
      const mean = (a.temperature.value + b.temperature.value) / 2;
      const thick = ((287.053 * mean) / 9.80665) * Math.log(a.pressure.value / b.pressure.value);
      const given = geopotential(b.height.value) - geopotential(a.height.value);
      assert.ok(
        Math.abs(thick - given) < 0.02 * given + 15,
        `${f}: ${a.pressure.value / 100} to ${b.pressure.value / 100} hPa: ${thick} m, given ${given}`,
      );
    }
    assert.equal(WEATHER.hours.length, 13, `${f}: six hours either side`);
    assert.ok(hourAt(WEATHER.hours, WEATHER.aloft.observed.at), `${f}: the column's hour among them`);
  }
});
