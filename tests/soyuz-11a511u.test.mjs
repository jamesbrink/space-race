// The 11A511U (missions/ussr/soyuz/vehicles/soyuz-11a511u-flown.ts `CAPABILITY`): what the vehicle as given carries to the
// insertion orbit of the type's own table (RKK Energia, ch. 6: a Soyuz T of 6,855 kg to a mean height of 220 km at 51.6°),
// flown on Soyuz 16's record's instants from Site 1 in the standard air, never on a flight's own orbit: its perigee the
// type's planned insertion perigee of 204.3 km (Mishin's plan for the active 7K-OK, as tests/soyuz-uprating.test.mjs), its
// apogee what that mean height leaves. It prints what it finds, so a change to the shared R-7 figures that moves it is seen.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as soyuz16 } from '../missions/ussr/soyuz/flights/soyuz-16/flight.ts';
import { orbital as record16 } from '../missions/ussr/soyuz/flights/soyuz-16/orbital.ts';
import { BLOCK_I_11A511 } from '../missions/ussr/soyuz/vehicles/soyuz-11a511-flown.ts';
import { BLOCK_I_11A511U, CAPABILITY, UPRATING_11A511U } from '../missions/ussr/soyuz/vehicles/soyuz-11a511u-flown.ts';
import { soyuzPlan } from '../missions/ussr/soyuz/vehicles/soyuz-plan.ts';
import { ascend, steer } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';

const PERIGEE = 204_300;
const REFERENCE = { perigee: PERIGEE, apogee: 2 * CAPABILITY.height.value - PERIGEE };

/** The ascent of Soyuz 16's vehicle with a ship of `mass` aimed at the reference orbit, in the standard air (no day's air). */
const fly = (mass, change) => {
  const o = structuredClone(record16);
  const more = mass - o.mass.value;
  o.mass.value = mass;
  o.modules.instrument.value += more;
  o.liftoffMass.value += more;
  change?.(o);
  o.ascent.guidance.target.altitude.value = REFERENCE.perigee;
  o.ascent.guidance.target.inclination.value = CAPABILITY.inclination.value;
  o.orbit.perigee.value = REFERENCE.perigee;
  o.orbit.apogee.value = REFERENCE.apogee;
  o.orbit.inclination.value = CAPABILITY.inclination.value;
  const plan = soyuzPlan(o);
  const [site, dated, sea] = [siteFrame(soyuz16.site), frameOf(soyuz16), soyuz16.site.seaLevel.value];
  return ascend(plan, site, dated, sea, steer(plan, site, dated, sea)).summary;
};

/** The most it carries there: the heaviest ship still cut on the reference orbit's period, not run dry short of it. */
export const capacity = (change) => {
  const full = fly(6_000, change).apogee;
  const reaches = (m) => {
    try {
      const s = fly(m, change);
      return s.perigee >= REFERENCE.perigee - 100 && s.apogee >= full - 100;
    } catch {
      return false;
    }
  };
  let [lo, hi] = [6_200, 7_400];
  while (hi - lo > 2) {
    const m = (lo + hi) / 2;
    if (reaches(m)) lo = m;
    else hi = m;
  }
  return lo;
};

test('the 11A511U’s gain is what takes the vehicle on its own engines up to the 6,855 kg of its type’s table', () => {
  // (Block I without the gain: the 11A511's)
  const was = capacity((o) => {
    o.liftoffMass.value += BLOCK_I_11A511.mass.value - o.stages[2].mass.value;
    o.stages[2] = { ...o.stages[2], mass: BLOCK_I_11A511.mass, dry: BLOCK_I_11A511.dry };
  });
  console.log(`  #   on its own engines it carries ${was.toFixed(0)} kg to ${REFERENCE.perigee / 1000} by ${REFERENCE.apogee / 1000} km`);
  assert.ok(
    Math.abs(was + UPRATING_11A511U.gained.value - CAPABILITY.ship.value) < 10,
    `${was.toFixed(0)} kg + ${UPRATING_11A511U.gained.value} kg is the type's ${CAPABILITY.ship.value} kg`,
  );
  assert.equal(record16.stages[2].mass, BLOCK_I_11A511U.mass);
  const now = capacity();
  console.log(`  #   with its gain, ${now.toFixed(0)} kg (the type: ${CAPABILITY.ship.value} kg)`);
  assert.ok(Math.abs(now - CAPABILITY.ship.value) < 10, `the 11A511U carries ${now.toFixed(0)} kg, not ${CAPABILITY.ship.value}`);
});
