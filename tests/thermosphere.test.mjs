// The upper air by the Sun's activity (src/world/thermosphere.ts: Jacchia 1971, SAO Special Report 332) against the
// report's own worked example (its section 15: 20 January 1969) and its tables, and the days flown against the indices.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAYS, exosphere, kpAt, logDensity, ratioOf, STANDARD_EXOSPHERE, semiannual } from '../src/world/thermosphere.ts';
import { julianDate } from '../src/world/time.ts';

const near = (a, b, tolerance, what = '') => assert.ok(Math.abs(a - b) <= tolerance, `${what} ${a} is not within ${tolerance} of ${b}`);
const DEG = Math.PI / 180;

test('the report’s worked example: the night’s minimum from the fluxes, the semiannual term', () => {
  // section 15: F-bar 155 and F 136 give Tc 856.5 K (eq. 14)
  near(379 + 3.24 * 155 + 1.3 * (136 - 155), 856.5, 1e-9);
  // 20 January 1969 (MJD 40241) at 350 km: f(z) 0.207 and g(t) -0.183, so -0.038 in the logarithm
  near(semiannual(350, 40_241), -0.038, 0.001, 'semiannual');
});

test('the static models: the tables’ own figures at their rows, and between them', () => {
  // Table 6, 1000 K at 200 km: 2.777e-13 g/cm^3
  near(logDensity(200, 1000), Math.log10(2.777e-13), 0.0005);
  // the example's 1048 K at 350 km: log -13.976 in the report (from its finer columns)
  near(logDensity(350, 1048), -13.976, 0.004);
  // the example's 1020 K at 140 km: -11.413
  near(logDensity(140, 1020), -11.413, 0.002);
  // hotter is denser above 120 km, and the air thins upward
  for (const km of [130, 170, 205, 260, 330])
    for (const T of [650, 850, 1050]) {
      assert.ok(logDensity(km, T + 50) > logDensity(km, T), `${km} km at ${T} K`);
      assert.ok(logDensity(km + 5, T) < logDensity(km, T));
    }
});

test('at the standard’s 1000 K and in no season the factor is one; it eases to one at 90 km', () => {
  near(logDensity(200, STANDARD_EXOSPHERE) - logDensity(200, 1000), 0, 0);
  const jd = julianDate('1963-06-18T12:00:00Z');
  for (const h of [0, 50_000, 89_000, 90_000]) assert.equal(ratioOf(h, jd, 0.5, 0.4, 0), 1);
  // continuous through 120 km
  const [a, b] = [ratioOf(119_999, jd, 0.5, 0.4, 0), ratioOf(120_001, jd, 0.5, 0.4, 0)];
  near(a, b, 1e-4);
  // a day not held: nothing said
  assert.equal(ratioOf(200_000, julianDate('1970-01-01T00:00:00Z'), 0, 0, 0), null);
});

test('the days flown: their exosphere by day and by night, and the air at 200 km against the standard', () => {
  // the day before's flux and the mean: 18 June 1963, Tc = 379 + 3.24 x 82.23 + 1.3 x (86.0 - 82.23)
  const jd = julianDate('1963-06-18T12:00:00Z');
  const night = exosphere(jd, 0, 23.4 * DEG, Math.PI);
  near(night.night, 379 + 3.24 * 82.23 + 1.3 * (86.0 - 82.23), 1e-9);
  // Kp 6.7 h before 12:00 UT is the 03-06 interval's (3.333)
  assert.equal(kpAt(jd - 6.7 / 24), 3.333);
  near(night.storm, 28 * 3.333 + 0.03 * Math.exp(3.333), 1e-9);
  // the bulge: the most two hours after noon, at the Sun's latitude; the least before dawn
  const noon = exosphere(jd, 23.4 * DEG, 23.4 * DEG, 30 * DEG);
  const dawn = exosphere(jd, -23.4 * DEG, 23.4 * DEG, -150 * DEG);
  assert.ok(noon.local > 1.25 * noon.night && noon.local <= 1.3 * noon.night + 1e-9);
  assert.ok(dawn.local < 1.05 * dawn.night);
  // near the solar minimum the air at 200 km is under the standard's by night and about it by day
  const lo = ratioOf(200_000, jd, -23.4 * DEG, 23.4 * DEG, -150 * DEG);
  const hi = ratioOf(200_000, jd, 23.4 * DEG, 23.4 * DEG, 30 * DEG);
  assert.ok(lo > 0.4 && lo < 0.75, `night ${lo}`);
  assert.ok(hi > 0.75 && hi < 1.2, `day ${hi}`);
  // every day held has its eight Kp and a flux
  for (const d of DAYS.values()) assert.ok(d.kp.length === 8 && d.flux > 0 && d.mean > 0, d.date);
});
