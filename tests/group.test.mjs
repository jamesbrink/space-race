// The first group flight (Vostoks 3 and 4, August 1962) flown together: each ship's coast from its own published orbit,
// put in one frame by the clock, and how near the two came in Vostok 4's first revolutions against the published figure
// (vostok-4/orbital.ts `NEAREST_VOSTOK_3`). A miss is recorded under Vostok 4's run `group` (src/sim/misses.ts), by the
// same rule as every other check: nothing is adjusted to bring it in.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as vostok3 } from '../missions/ussr/vostok/flights/vostok-3/flight.ts';
import { flight as vostok4 } from '../missions/ussr/vostok/flights/vostok-4/flight.ts';
import { NEAREST_VOSTOK_3 } from '../missions/ussr/vostok/flights/vostok-4/orbital.ts';
import { flyOrbit } from '../src/sim/orbital.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';
import { EARTH } from '../src/world/bodies.ts';
import { holdChecks, missesOf } from './misses.mjs';

/** A flight's coast, its samples' places in the frame of date, by seconds of UTC from Vostok 3's liftoff. */
const coast = (f) => {
  const frame = frameOf(f);
  const from = (Date.parse(f.launch) - Date.parse(vostok3.launch)) / 1000;
  return flyOrbit(f.plan, siteFrame(f.site), frame, f.site.seaLevel.value).samples.map((s) => ({
    t: from + s.t,
    phase: s.phase,
    r: frame.toDate(s.r),
    v: frame.toDate(s.v),
  }));
};

test('Vostoks 3 and 4: how near the two published orbits bring the ships, against the record; every miss is recorded', () => {
  const three = coast(vostok3);
  const four = coast(vostok4).filter((s) => s.phase === 'orbit');
  assert.ok(four.length > 0 && three.length > 0);
  // Vostok 4's first two revolutions, where both pilots and TASS put the nearest
  const start = four[0].t;
  let nearest = { d: Number.POSITIVE_INFINITY, t: 0 };
  let k = 0;
  for (const s of four) {
    if (s.t > start + 2 * 88.3 * 60) break;
    // Vostok 3's sample nearest the instant (they are ten seconds apart), carried to it on its velocity and the pull of a
    // point Earth: within a metre over five seconds
    while (k < three.length - 1 && Math.abs(three[k + 1].t - s.t) <= Math.abs(three[k].t - s.t)) k++;
    const other = three[k];
    const dt = s.t - other.t;
    if (Math.abs(dt) > 6) continue;
    const r3 = Math.hypot(...other.r) ** 3;
    const at = [0, 1, 2].map((i) => other.r[i] + other.v[i] * dt - (0.5 * EARTH.gm.value * other.r[i] * dt * dt) / r3);
    const d = Math.hypot(s.r[0] - at[0], s.r[1] - at[1], s.r[2] - at[2]);
    if (d < nearest.d) nearest = { d, t: s.t };
  }
  assert.ok(Number.isFinite(nearest.d), 'the two coasts overlap in time');
  console.log(
    `  #   nearest ${(nearest.d / 1000).toFixed(1)} km, ${((nearest.t - start) / 60).toFixed(1)} min after Vostok 4’s orbit begins (${new Date(Date.parse(vostok3.launch) + nearest.t * 1000).toISOString().slice(11, 19)} UTC)`,
  );
  holdChecks([NEAREST_VOSTOK_3], () => nearest.d, missesOf(vostok4.id, 'group'), { name: 'Vostoks 3 and 4' });
});
