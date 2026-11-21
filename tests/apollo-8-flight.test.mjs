// Apollo 8 flown from Pad 39A to the Pacific in one run (missions/usa/apollo/vehicles/apollo-lunar-plan.ts): the record's run,
// under JPL's ephemeris as the page flies it (src/app/session.ts loads it before a flight to the Moon is flown), goes out
// to the Moon, ten times round it and home on its own forces, every firing after the injection solved on the state the
// run is in as it lights, and comes down where the recovery forces put the command module, within a distance set before
// it was flown. Nothing is put on the tracking: what each firing gave is held to the record's in staged.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-8/flight.ts';
import { fieldFor } from '../src/sim/core/gravity.ts';
import { between, orbitalFlown } from '../src/sim/run.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { useEphemeris } from '../src/world/ephemeris.ts';
import { dot, geodeticToEcef, length, sub } from '../src/world/frames.ts';

useEphemeris(new Uint8Array(readFileSync(join(import.meta.dirname, '../public/ephemeris/de440.bin'))).slice().buffer);
const NMI = 1852;
const T = (h, m, s) => h * 3600 + m * 60 + s;
const whole = orbitalFlown(flight);

test('Apollo 8 comes down within five nautical miles of where the recovery forces put the command module', () => {
  const landing = flight.plan.record.landing;
  const cm = whole.down?.landed?.cm;
  assert.ok(cm, 'the command module comes down');
  const miss = length(
    sub(
      geodeticToEcef({ latitude: cm.latitude, longitude: cm.longitude, height: 0 }),
      geodeticToEcef({ latitude: landing.latitude.value, longitude: landing.longitude.value, height: 0 }),
    ),
  );
  console.log(
    `# down at ${cm.latitude.toFixed(4)} N ${(-cm.longitude).toFixed(4)} W at ${(cm.at / 3600).toFixed(3)} h, ${(miss / NMI).toFixed(2)} n. mi. from the recovery forces' 8 deg 7.5 min N 165 deg 1.2 min W at 147:00:42`,
  );
  assert.ok(miss < 5 * NMI, `${(miss / NMI).toFixed(2)} n. mi.`);
  assert.ok(Math.abs(cm.at - landing.at.value) < 300, `${(cm.at - landing.at.value).toFixed(0)} s from 147:00:42`);
});

test('every firing after the injection but the two separations is solved on the run’s own state, and each ends', () => {
  const burns = whole.coast.burns ?? [];
  const ids = burns.map((b) => b.lit);
  assert.deepEqual(ids, ['separation-1', 'separation-2', 'mcc-1', 'mcc-2', 'loi', 'loc', 'tei', 'mcc-3']);
  for (const b of burns) {
    const separation = b.lit.startsWith('separation');
    assert.equal(b.solved, !separation, `${b.lit}: ${b.solved ? 'solved' : 'the record’s'}`);
    assert.ok(b.off > b.on && b.off - b.on < 600, `${b.lit} burns ${(b.off - b.on).toFixed(1)} s`);
    console.log(
      `# ${b.lit.padEnd(12)} ${(b.on / 3600).toFixed(3)} h, ${(b.off - b.on).toFixed(1)} s, ${(b.velocity / 0.3048).toFixed(1)} ft/s${b.aim ? ` for its ${b.aim}: ${JSON.stringify(b.reached)}` : ''}`,
    );
  }
});

test('Apollo 8 goes into the Moon’s sphere and out of it once, and round the Moon ten times', () => {
  const crossings = whole.coast.crossings ?? [];
  assert.deepEqual(
    crossings.map((c) => c.to),
    ['moon', 'earth'],
  );
  // (between the insertion's cutoff and the transearth injection's lighting: the record's "ten revolutions", §1)
  const field = fieldFor(flight.plan.gravity, frameOf(flight));
  const [loi, tei] = ['loi', 'tei'].map((id) => whole.coast.burns.find((b) => b.lit === id));
  const rising = (t) => {
    const s = between(whole.coast.samples, t);
    const m = field.moon(t);
    return dot(sub(s.r, m.r), sub(s.v, m.v));
  };
  let lows = 0;
  for (let t = loi.off; t + 30 < tei.on; t += 30) if (rising(t) < 0 && rising(t + 30) >= 0) lows++;
  console.log(`# ${lows} periapses about the Moon between the insertion and the transearth injection`);
  assert.ok(lows >= 9 && lows <= 11, `${lows} periapses`);
  assert.ok(Math.abs(tei.on - T(89, 19, 16.6)) < 1e-6, 'the transearth injection lit at the record’s instant');
});
