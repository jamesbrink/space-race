// The 7K-T era's 11A511 (missions/ussr/soyuz/vehicles/soyuz-11a511-flown.ts `UPRATING_7KT`): its one unknown, the uprating,
// is sized from the capability MPK documents (the 7K-T's 6,700 kg) against what the 7K-OK era's vehicle carries to the
// type's planned insertion orbit, never against a 7K-T flight's own orbit. This finds that payload again on the vehicle as
// flown, so a change to the shared R-7 figures that moves it is caught, and holds the 7K-OK era's vehicle to its own Block I.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as soyuz3 } from '../missions/ussr/soyuz/flights/soyuz-3/flight.ts';
import { orbital as record3 } from '../missions/ussr/soyuz/flights/soyuz-3/orbital.ts';
import { BLOCK_I_7KT, BLOCK_I_11A511, UPRATING_7KT } from '../missions/ussr/soyuz/vehicles/soyuz-11a511-flown.ts';
import { soyuzPlan } from '../missions/ussr/soyuz/vehicles/soyuz-plan.ts';
import { ascend, steer } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';

/** Mishin's planned insertion for the active 7K-OK (Soyuz 3's orbital.ts, its `orbit` sources): 204.3 by 225.0 km. */
const PLANNED = { perigee: 204_300, apogee: 225_000 };
/** The 7K-T's fuelled mass (MPK, p. 224). */
const SHIP_7KT = 6_700;

/** The ascent of Soyuz 3's vehicle with a ship of `mass` aimed at the planned orbit, in the standard air (no day's air). */
const fly = (mass, stages) => {
  const o = structuredClone(record3);
  const more = mass - o.mass.value;
  o.mass.value = mass;
  o.modules.instrument.value += more;
  o.liftoffMass.value += more;
  if (stages) {
    o.liftoffMass.value -= o.stages[2].mass.value - stages.mass.value;
    o.stages[2] = { ...o.stages[2], ...stages };
  }
  o.ascent.guidance.target.altitude.value = PLANNED.perigee;
  o.orbit.perigee.value = PLANNED.perigee;
  o.orbit.apogee.value = PLANNED.apogee;
  const plan = soyuzPlan(o);
  const [site, dated, sea] = [siteFrame(soyuz3.site), frameOf(soyuz3), soyuz3.site.seaLevel.value];
  return ascend(plan, site, dated, sea, steer(plan, site, dated, sea)).summary;
};

/** The most a vehicle carries there: the heaviest ship still cut on the planned orbit's period, not run dry short of it. */
const capacity = (stages) => {
  const full = fly(6_000, stages).apogee;
  const reaches = (m) => {
    try {
      const s = fly(m, stages);
      return s.perigee >= PLANNED.perigee - 100 && s.apogee >= full - 100;
    } catch {
      return false;
    }
  };
  let [lo, hi] = [6_300, 6_900];
  while (hi - lo > 2) {
    const m = (lo + hi) / 2;
    if (reaches(m)) lo = m;
    else hi = m;
  }
  return lo;
};

test('Soyuz 3 flies the 7K-OK era’s Block I, unchanged', () => {
  assert.equal(record3.stages[2].dry, BLOCK_I_11A511.dry);
  assert.equal(record3.stages[2].mass, BLOCK_I_11A511.mass);
});

test('the uprating is what takes the 7K-OK era’s payload to the planned orbit up to the 7K-T’s 6,700 kg', () => {
  const was = capacity();
  console.log(`  #   the 7K-OK era's 11A511 carries ${was.toFixed(0)} kg to ${PLANNED.perigee / 1000} by ${PLANNED.apogee / 1000} km`);
  assert.ok(
    Math.abs(was + UPRATING_7KT.gained.value - SHIP_7KT) < 10,
    `${was.toFixed(0)} kg + ${UPRATING_7KT.gained.value} kg is the 7K-T's 6,700 kg`,
  );
  const now = capacity({ mass: BLOCK_I_7KT.mass, dry: BLOCK_I_7KT.dry });
  console.log(`  #   the 7K-T era's carries ${now.toFixed(0)} kg there`);
  assert.ok(Math.abs(now - SHIP_7KT) < 10, `the 7K-T era's vehicle carries ${now.toFixed(0)} kg, not 6,700`);
});
