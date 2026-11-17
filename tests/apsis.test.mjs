/**
 * What a published Soviet height is over (world/meanelements.ts `CONVENTION.radius`, sim/orbital.ts `heightsBall`). Each orbit
 * published with its own period, the period read as nodal under J2 as the coast reads it (`meanOrbitOf`), gives the ball
 * its heights must stand on for the two to agree: no figure is chosen. Each must lie within its rounding (half the last
 * digit of the period and of the heights) of the WGS 84 ellipsoid's radius under the flight's apsis, where its record's
 * injection puts the perigee. Those that do not are listed as exceptions with their numbers and what would explain them;
 * none is left out. And the rule that follows: a flight is flown on the ball its own published heights and period imply
 * (so its figures are never contradicted), and only a flight with heights alone on the ellipsoid under the injection.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { flight as vostok2 } from '../missions/ussr/vostok/flights/vostok-2/flight.ts';
import { flight as vostok3 } from '../missions/ussr/vostok/flights/vostok-3/flight.ts';
import { flight as vostok4 } from '../missions/ussr/vostok/flights/vostok-4/flight.ts';
import { flight as vostok5 } from '../missions/ussr/vostok/flights/vostok-5/flight.ts';
import { flight as vostok6 } from '../missions/ussr/vostok/flights/vostok-6/flight.ts';
import { flight as voskhod1 } from '../missions/ussr/voskhod/flights/voskhod-1/flight.ts';
import { flight as voskhod2 } from '../missions/ussr/voskhod/flights/voskhod-2/flight.ts';
import { heightsBall, perigeeAt } from '../src/sim/orbital.ts';
import { DEG, geodeticToEcef, siteFrame } from '../src/world/frames.ts';
import { ellipsoidRadius, meanOrbitOf } from '../src/world/meanelements.ts';

const KM = 1000;
/** Degrees and minutes of arc. */
const dm = (d, m) => d + m / 60;

/**
 * Every orbit found published with its own period, as printed: heights (km), period (min), inclination (deg), and where.
 * Siddiqi's Table IB heights are not here: they came with no period. `except` says why a set does not fit.
 */
const SETS = [
  {
    flight: vostok1,
    name: 'OKB-1’s report of 3 May 1961',
    heights: [181, 327],
    period: 89.44,
    inclination: dm(64, 57),
    except:
      'over 6,369.1 ± 0.7 km, the ellipsoid’s radius 39 to 42 degrees from the equator (geocentric), not the 63 degrees N its record ' +
      'injects at. A perigee that low would explain it, or heights reduced to another ball (the mean Earth’s 6,371 km is 1.9 km over it). ' +
      'Neither is read: OKB-1’s report gives the heights and the period, not how they were reduced',
  },
  {
    flight: vostok1,
    name: 'TASS on the day',
    heights: [175, 302],
    period: 89.1,
    inclination: dm(65, 4),
    except:
      'over 6,367.7 ± 3.0 km, the radius 36 to 52 degrees from the equator: TASS’s figures of the first hours, with OKB-1’s set and as it',
  },
  {
    flight: vostok2,
    name: 'the FAI file’s, the Coordination-Computing Centre’s orbit',
    heights: [183, 244],
    period: 88.46,
    inclination: dm(64, 56),
  },
  { flight: vostok2, name: 'TASS on the day, preliminary', heights: [178, 257], period: 88.6, inclination: dm(64, 56) },
  { flight: vostok3, name: 'as announced on 21 August 1962', heights: [183, 251], period: 88.5, inclination: 65 },
  { flight: vostok3, name: 'TASS, 12:12 on 12 August 1962', heights: [176.7, 227.6], period: 88.2, inclination: dm(64, 59) },
  { flight: vostok4, name: 'TASS, 12:12 on 12 August 1962', heights: [177.9, 234.8], period: 88.3, inclination: dm(64, 57) },
  { flight: vostok5, name: 'TASS at liftoff, the orbit asked for', heights: [181, 235], period: 88.4, inclination: 65 },
  {
    flight: vostok5,
    name: 'TASS, 22:12 on 14 June 1963',
    heights: [175, 222],
    period: 88.27,
    inclination: dm(64, 58),
    except:
      'over 6,366.6 ± 0.7 km, the ellipsoid’s radius 45 to 49 degrees from the equator. Its period is to a hundredth of a minute, so it ' +
      'is not the rounding: a perigee that low, or another reduction of this flight’s heights, would explain it. Neither is read, and ' +
      'TASS’s two later sets say the same',
  },
  {
    flight: vostok5,
    name: 'TASS, 15:00 on 15 June 1963',
    heights: [173, 219],
    period: 88.2,
    inclination: 65,
    except: 'over 6,365.6 ± 3.0 km, 42 to 58 degrees: with the set of 22:12',
  },
  {
    flight: vostok5,
    name: 'TASS, 15:00 on 18 June 1963',
    heights: [159, 193],
    period: 87.8,
    inclination: 65,
    except: 'over 6,365.8 ± 3.0 km, 41 to 58 degrees: with the set of 22:12',
  },
  { flight: vostok6, name: 'TASS at liftoff', heights: [183, 233], period: 88.3, inclination: 65 },
  { flight: vostok6, name: 'TASS, 22:00 on 16 June 1963', heights: [181, 231], period: 88.3, inclination: 65 },
  { flight: vostok6, name: 'TASS, 15:00 on 18 June 1963', heights: [174, 218], period: 88.1, inclination: 65 },
  { flight: voskhod1, name: 'TASS, 12 October 1964, preliminary', heights: [178, 409], period: 90.1, inclination: 65 },
  { flight: voskhod2, name: 'TASS at liftoff', heights: [173, 495], period: 90.9, inclination: 65 },
  {
    flight: voskhod2,
    name: 'the record’s file, the first orbit',
    heights: [173.5, 497.7],
    period: 90.944,
    inclination: 65,
    except:
      'over 6,361.5 ± 0.1 km, the ellipsoid’s radius 62 degrees from the equator, where the run’s injection puts the perigee at 57 degrees N ' +
      '(6,363.0). Its period is to a thousandth of a minute, so it is not the rounding: a perigee 5 degrees further on, or heights reduced ' +
      'to another ball, would explain it. Neither is read, and the file’s two later orbits say the same',
  },
  {
    flight: voskhod2,
    name: 'the record’s file, the ninth orbit',
    heights: [173.3, 496.2],
    period: 90.928,
    inclination: 65,
    except: 'over 6,361.6 ± 0.1 km, 62 degrees: with the first orbit',
  },
  {
    flight: voskhod2,
    name: 'the record’s file, the eighteenth orbit',
    heights: [173.1, 494.6],
    period: 90.91,
    inclination: 65,
    except: 'over 6,361.6 ± 0.3 km, 61 degrees: with the first orbit',
  },
];

/** Half the last digit a figure is printed to. */
const half = (x) => 0.5 * 10 ** -(String(x).split('.')[1]?.length ?? 0);

/** The ball a set's heights stand on, m, if its period is nodal: the mean orbit's axis less the mean height. */
const ballFrom = (heights, period, inclination, argp) =>
  meanOrbitOf({ perigee: heights[0] * KM, apogee: heights[1] * KM, inclination: inclination * DEG, period: period * 60 }, argp).radius;

/** The ellipsoid's radius under the perigee where a flight's record injects it, m, and that perigee's geocentric latitude, rad. */
const underInjection = (f) => {
  const w = perigeeAt(f.plan, geodeticToEcef(siteFrame(f.site)));
  const latitude = Math.asin(Math.sin(f.plan.record.orbit.inclination.value * DEG) * Math.sin(w));
  return { w, latitude, radius: ellipsoidRadius(latitude) };
};
/** The geocentric latitude whose ellipsoid radius is `r`, rad (the radius falls from the equator to the pole). */
const latitudeOf = (r) => {
  let [lo, hi] = [0, Math.PI / 2];
  for (let k = 0; k < 60; k++) {
    const m = (lo + hi) / 2;
    if (ellipsoidRadius(m) > r) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

test('the ball each flight is flown on cannot contradict its own published orbit: heights and a period, the ball those three imply; heights alone, the ellipsoid under the injection’s apsis', () => {
  for (const f of [vostok1, vostok2, vostok3, vostok4, vostok5, vostok6, voskhod1, voskhod2]) {
    const o = f.plan.record.orbit;
    assert.equal(o.radius, undefined, `${f.designation}: the record names no ball of its own`);
    const flown = heightsBall(f.plan, siteFrame(f.site));
    const at = underInjection(f);
    if (o.period) {
      const heights = [o.perigee.value / KM, o.apogee.value / KM];
      const implied = ballFrom(heights, o.period.value / 60, o.inclination.value, at.w);
      const rounding = Math.abs(ballFrom(heights, o.period.value / 60 + half(o.period.value / 60), o.inclination.value, at.w) - implied);
      assert.ok(Math.abs(flown - implied) <= rounding, `${f.designation}: flown on ${flown}, its own figures imply ${implied}`);
      console.log(
        `  # ${f.designation}: its own heights and period imply ${(implied / KM).toFixed(1)} km, the ellipsoid ${(latitudeOf(implied) / DEG).toFixed(1)} deg from the equator; the run's perigee is at ${(at.latitude / DEG).toFixed(2)} deg N, under ${(at.radius / KM).toFixed(1)} km${Math.abs(implied - at.radius) > rounding + KM ? ': an open inconsistency, in its mission.md' : ''}`,
      );
    } else {
      assert.equal(flown, at.radius, `${f.designation}: heights alone, over the ellipsoid under the injection's apsis`);
      console.log(
        `  # ${f.designation}: heights alone, over the ellipsoid under its perigee at ${(at.latitude / DEG).toFixed(2)} deg N: ${(flown / KM).toFixed(1)} km`,
      );
    }
  }
});

test('each orbit published with its period stands on the ellipsoid under its apsis, within its rounding, but for the exceptions stated', () => {
  const fits = [];
  const out = [];
  for (const s of SETS) {
    const { w, radius: want } = underInjection(s.flight);
    const got = ballFrom(s.heights, s.period, s.inclination, w);
    // its rounding: the period's half digit moves the ball by what solving again says, the heights' moves it back as much
    const byPeriod = Math.abs(ballFrom(s.heights, s.period + half(s.period), s.inclination, w) - got);
    const byHeights = Math.max(...s.heights.map(half)) * KM;
    const rounding = byPeriod + byHeights;
    const off = got - want;
    const line = `${s.flight.designation}, ${s.name}: ${(got / KM).toFixed(1)} km ± ${(rounding / KM).toFixed(1)}, ${(off / KM).toFixed(1)} km from the ellipsoid’s ${(want / KM).toFixed(1)}`;
    console.log(`  # ${line}${s.except ? ' (an exception)' : ''}`);
    if (s.except) {
      assert.ok(Math.abs(off) > rounding, `${line}: stated as an exception, but it fits`);
      out.push(s);
    } else {
      assert.ok(Math.abs(off) <= rounding, `${line}: does not fit, and is not stated as an exception`);
      fits.push(s);
    }
  }
  // Vostok 1's two sets, Vostok 5's three determined after liftoff and Voskhod 2's file's three are the exceptions; every other set fits
  assert.deepEqual([...new Set(out.map((s) => s.flight.designation))], [vostok1.designation, vostok5.designation, voskhod2.designation]);
  assert.equal(fits.length, 11);
});
