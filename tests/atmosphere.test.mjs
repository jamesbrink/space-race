import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  airDensities,
  hazeFor,
  meetsGround,
  OZONE,
  OZONE_HALF,
  opticalDepth,
  RAYLEIGH,
  RAYLEIGH_SCALE,
  TOP,
  toTop,
  transmittanceAt,
  transmittanceFromUv,
  transmittanceUv,
} from '../src/viewer/atmosphere.ts';

const haze = hazeFor(3.912 / 80_000, 1400);
const near = (a, b, tolerance) => assert.ok(Math.abs(a - b) <= tolerance, `${a} is not within ${tolerance} of ${b}`);

test('straight up from the sea the air’s optical depth is each part’s column', () => {
  const tau = opticalDepth(0, 1, haze, 4000);
  for (let c = 0; c < 3; c++) {
    // the gas: its scattering times its scale height (less the sliver above the top); the haze likewise; ozone: a tent's area
    const column =
      RAYLEIGH[c] * RAYLEIGH_SCALE * (1 - Math.exp(-TOP / RAYLEIGH_SCALE)) + haze.extinction * haze.scale + OZONE[c] * OZONE_HALF;
    near(tau[c], column, 2e-4);
  }
  // green light: about a tenth for the gas (Bucholtz 1995: 0.098 at 550 nm for a standard atmosphere, here 0.108 with an 8 km scale height)
  near(RAYLEIGH[1] * RAYLEIGH_SCALE, 0.108, 0.002);
  // ozone's column in green is about 0.025 to 0.035 for 300 Dobson units
  assert.ok(OZONE[1] * OZONE_HALF > 0.02 && OZONE[1] * OZONE_HALF < 0.04);
});

test('a low Sun is red and dim, an overhead one nearly white; the Earth casts a shadow', () => {
  const high = transmittanceAt(0, 1, haze),
    low = transmittanceAt(0, 0.02, haze);
  assert.ok(high[0] > high[1] && high[1] > high[2] && high[2] > 0.6);
  assert.ok(low[0] > 3 * low[2] && low[0] < 0.4, `${low}`);
  assert.deepEqual(transmittanceAt(0, -0.01, haze), [0, 0, 0]);
  // from 150 km the Sun is still up 10 degrees under the level, and gone 13 under (the horizon dips 12.3 degrees)
  assert.equal(meetsGround(150_000, Math.sin((-10 * Math.PI) / 180)), false);
  assert.equal(meetsGround(150_000, Math.sin((-13 * Math.PI) / 180)), true);
  // more air is more lost, at every height
  let last = 0;
  for (const h of [0, 2000, 10_000, 30_000, 80_000]) {
    const t = transmittanceAt(h, 0.1, haze)[1];
    assert.ok(t > last);
    last = t;
  }
});

test('the air thins with height and is gone at the top; ozone lies in its layer', () => {
  assert.deepEqual(airDensities(0, haze), [1, 1, 0]);
  near(airDensities(RAYLEIGH_SCALE, haze)[0], Math.exp(-1), 1e-12);
  assert.equal(airDensities(25_000, haze)[2], 1);
  assert.equal(airDensities(45_000, haze)[2], 0);
  near(toTop(0, 1), TOP, 1e-3);
  near(toTop(TOP, 1), 0, 1e-3);
});

test('the transmittance table’s places and what they stand for are each other’s inverse', () => {
  for (const h of [0, 10, 1500, 20_000, 60_000, 99_000])
    for (const mu of [1, 0.6, 0.1, 0, -0.01]) {
      if (meetsGround(h, mu)) continue;
      const [u, v] = transmittanceUv(h, mu);
      assert.ok(u >= -1e-9 && u <= 1 + 1e-9 && v >= 0 && v <= 1, `${h} ${mu}: ${u} ${v}`);
      const [h2, mu2] = transmittanceFromUv(u, v);
      near(h2, h, 1e-3 + 1e-6 * h);
      near(mu2, mu, 2e-6);
    }
});
