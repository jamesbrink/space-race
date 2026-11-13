// The whole of an orbital flight flown from the pad (src/sim/staged.ts: the ascent on its stated steering law, then
// orbital.ts's coast from where it left the spacecraft) against the record. As tests/sim.test.mjs and orbital.test.mjs
// do: every check is flown; one outside its tolerance must be in MISSES with how far out it is and why; the test fails
// on a miss nobody recorded, on one that has moved past its slack, and on one that has come within tolerance. Nothing
// in a flight's inputs is adjusted to bring a check in.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { P0 } from '../src/sim/fly.ts';
import { ascend, exitAreaOf, flowOf, flyWhole, integral, schedule, steer } from '../src/sim/staged.ts';
import { DEG, siteFrame } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const flown = all.filter((f) => f.orbital?.ascent && f.site);
const where = (f) => [siteFrame(f.site), julianDate(f.launch), f.site.seaLevel.value];

/**
 * By flight, then by run ('ascent': the ascent's own checks; 'whole': the coast's checks, flown on from the ascent), then
 * by check id: how far out (run less record, in the check's unit), give or take `slack`, and why.
 */
const FAST =
  'The ascent as recorded is too fast: at the last cutoff it has 7,986 m/s where the record’s orbit needs 7,844 at 180 km, 142 m/s over, and passes that speed 16 s before the recorded cutoff. ' +
  'Nothing was tuned. The inputs that own it, each worth as much or more (the last test): which part of each stage’s published load goes through the chambers (Brügge counts 3.12 t of the core’s ' +
  '90.1 t and 1.47 t of a strap-on’s 39.16 t as peroxide and nitrogen: taken out, the core alone is 487 m/s slower); the engines’ intermediate and final stages of thrust, documented in kind and ' +
  'not in level, and so flown at rated thrust; the shape of the steering law (from the core’s cutoff rather than the strap-ons’: 89 m/s slower) and the estimated drag (x 1.3: 71 m/s). ' +
  'On 12 April the vehicle was 25.43 m/s too fast (Baturin); the integrators that cut it are what this run does not have';
const MISSES = {
  'ussr/vostok/vostok-1': {
    ascent: {
      minuteG: {
        by: -1.31,
        slack: 0.1,
        why:
          'A minute up the run reads 2.19 g; Zak has Gagarin feeling 3 to 4. Thrust and mass alone give 2.4 g there (4.6 MN on 191 t), less 0.2 for the drag, and Soyuz’s manual shows 2.6 g ' +
          'at 60 s on the same first stages: the record’s figure is a man’s feeling, not an accelerometer’s',
      },
      apogee: { by: 517_150, slack: 2_000, why: FAST },
      period: { by: 316.7, slack: 2, why: `It follows from the apogee: ${FAST}` },
    },
    whole: {
      period: { by: 316.6, slack: 2, why: `The osculating period of the orbit the ascent left it in: ${FAST}` },
      apogee: { by: 536_930, slack: 2_000, why: FAST },
      separationAltitude: {
        by: 172_240,
        slack: 3_000,
        why: `From an orbit 844 km high at its top the burn at the record’s time leaves it at 327 km at 10:36, not 150: ${FAST}`,
      },
      ejectionAt: { by: 418.7, slack: 10, why: `Seven minutes late at 7 km, coming down from the higher orbit: ${FAST}` },
      crossTrack: {
        by: -95_770,
        slack: 3_000,
        why: 'It comes down 96 km to the left of the record’s landing: the braking burn pushes along the line from the Sun, 65 per cent of it across the track (the coast’s own MISSES, tests/orbital.test.mjs), from an orbit that is not the record’s',
      },
      alongTrack: {
        by: -325_420,
        slack: 10_000,
        why: `It comes down 325 km short along its own track: a higher, slower orbit brought round to a burn at the record’s instant: ${FAST}`,
      },
    },
    descent: {
      'module.at': {
        by: 347,
        slack: 10,
        why: 'It reaches 7 km late, by the higher orbit (see the coast’s ejectionAt): the descent itself takes 6 min 10 s from 7 km against the record’s 6 at most',
      },
      'pilot.at': {
        by: 562.3,
        slack: 10,
        why:
          'Late by the higher orbit, as the module is; and from 7 km he takes 13 min 23 s, where R and Z’s clocks have 11 (10:42 to 10:53) and Baturin’s 4 (10:49). ' +
          'Four kilometres under a canopy at the record’s own 5 m/s (which the run holds) is 13 minutes by itself: the record’s clocks and its descent figures do not agree with one another',
      },
    },
  },
};

/** Hold a set of results to checks: every miss recorded, every recorded miss still a miss and where it was. */
function hold(checks, value, misses, label) {
  const wrong = [];
  for (const check of checks) {
    const got = value(check.id);
    assert.ok(Number.isFinite(got), `${check.id}: the run gives no figure`);
    const out = got - check.value;
    const within = Math.abs(out) <= check.tolerance;
    const miss = misses[check.id];
    console.log(
      `  #   ${label} ${within ? 'holds ' : 'MISSES'} ${check.label}: ${got.toFixed(2)} against ${check.value.toFixed(2)} ± ${check.tolerance} ${check.unit} (${check.confidence}), out by ${out.toFixed(2)}`,
    );
    if (within && miss) wrong.push(`${check.id} is within tolerance now: take it off MISSES`);
    if (!within && !miss) wrong.push(`${check.id} misses by ${out.toFixed(2)} ${check.unit} and is not in MISSES`);
    if (!within && miss && Math.abs(out - miss.by) > miss.slack)
      wrong.push(`${check.id} misses by ${out.toFixed(2)}, recorded as ${miss.by} give or take ${miss.slack}`);
  }
  for (const id of Object.keys(misses)) if (!checks.some((c) => c.id === id)) wrong.push(`MISSES names ${id}, which is not a check`);
  assert.deepEqual(wrong, []);
}

/** An ascent check's figure: an event's field ('core.speed'), or the summary's. */
const ascentValue = (run) => (id) => {
  const [event, field] = id.split('.');
  return field ? run.at[event]?.[field] : run.summary[id];
};

test('there is an orbital flight whose ascent can be flown', () => {
  assert.ok(flown.length > 0);
});

for (const f of flown) {
  const o = f.orbital;
  const misses = MISSES[f.id] ?? { ascent: {}, whole: {}, descent: {} };
  let whole;

  test(`${f.designation}: every figure the ascent reads has a confidence and a source`, () => {
    let count = 0;
    const walk = (x, at) => {
      if (!x || typeof x !== 'object') return;
      if ('confidence' in x) {
        count++;
        assert.ok(['documented', 'derived', 'estimated'].includes(x.confidence), `${at}: confidence`);
        assert.ok(typeof x.source === 'string' && x.source.length > 12, `${at}: a source`);
      }
      for (const [key, value] of Object.entries(x)) walk(value, `${at}.${key}`);
    };
    walk(o.ascent, 'ascent');
    walk(o.stages, 'stages');
    assert.ok(count > 20, `${count} sourced figures`);
    for (const c of o.ascent.checks) assert.ok(c.tolerance > 0, `${c.id}: a tolerance`);
    assert.ok(
      o.events.some((e) => e.id === o.ascent.guidance.target.at),
      'the law’s target is an event of the record',
    );
  });

  test(`${f.designation}: each engine gives its own sea-level figures back, and burns what it holds`, () => {
    for (const s of o.stages) {
      if (s.thrust.seaLevel) {
        // flow is the vacuum figures'; at one atmosphere the thrust and impulse must be the sea-level ones
        const thrust = s.thrust.vacuum.value - P0 * exitAreaOf(s);
        assert.ok(Math.abs(thrust / s.thrust.seaLevel.value - 1) < 1e-9, `${s.name}: sea-level thrust`);
        const isp = thrust / (flowOf(s) * 9.80665);
        assert.ok(Math.abs(isp / s.isp.seaLevel.value - 1) < 0.002, `${s.name}: sea-level impulse ${isp.toFixed(1)} s`);
      }
    }
    const plan = schedule(o);
    o.stages.forEach((s, i) => {
      const used = flowOf(s) * integral(s.throttle, plan[i].from, plan[i].to);
      const load = (s.usable ?? s.propellant).value;
      console.log(
        `  #   ${s.name}: burns ${plan[i].from.toFixed(1)} to ${plan[i].to.toFixed(1)} s${plan[i].dry ? ' (RUNS DRY before its cutoff)' : ''}, ${(used / 1000).toFixed(2)} of ${(load / 1000).toFixed(2)} t each`,
      );
    });
  });

  test(`${f.designation}: the steering law reaches its target, and the flight is the same flight every time`, () => {
    const [site, jd, sea] = where(f);
    const x = steer(o, site, jd, sea);
    console.log(
      `  #   solved: the launch plane inclined ${(x.plane / DEG).toFixed(3)} deg; pitched over ${(x.kick / DEG).toFixed(3)} deg; tangent falling ${(x.rate * 1000).toFixed(4)} per 1000 s`,
    );
    whole = flyWhole(o, site, jd, sea, x);
    const again = ascend(o, site, jd, sea, x);
    assert.deepEqual(again.summary, whole.ascent.summary);
    const s = whole.ascent.summary;
    const g = o.ascent.guidance.target;
    assert.ok(Math.abs(s.cutoffAltitude - g.altitude.value) < 1, 'at the target height');
    assert.ok(Math.abs(s.cutoffClimb - g.climb.value) < 1e-3, 'at the target climb');
    assert.ok(Math.abs(s.inclination - g.inclination.value) < 1e-3, 'in the target plane');
    const clock = (t) => new Date(Date.parse(f.launch) + t * 1000).toISOString().slice(11, 19);
    console.log(`  #   ${f.designation}: the ascent flown (times UTC)`);
    for (const [id, e] of Object.entries(whole.ascent.at))
      console.log(
        `  #   ${id.padEnd(12)} T+${e.t.toFixed(1).padStart(6)} s: ${(e.altitude / 1000).toFixed(1)} km up, ${(e.downrange / 1000).toFixed(0)} km downrange, ${e.speed.toFixed(0)} m/s (${e.groundSpeed.toFixed(0)} through the air), climbing ${e.climb.toFixed(1)} deg, ${e.g.toFixed(2)} g, ${(e.mass / 1000).toFixed(2)} t`,
      );
    console.log(
      `  #   greatest dynamic pressure ${(s.maxQ / 1000).toFixed(1)} kPa at T+${s.maxQAt.toFixed(0)} s; ${s.minuteG.toFixed(2)} g a minute up; most ${s.firstG.toFixed(2)} g on the first stage, ${s.coreG.toFixed(2)} on the core alone, ${s.lastG.toFixed(2)} on the last`,
    );
    console.log(
      `  #   at the last cutoff: ${(s.perigee / 1000).toFixed(1)} by ${(s.apogee / 1000).toFixed(1)} km, ${s.inclination.toFixed(3)} deg, ${(s.period / 60).toFixed(2)} min; ${s.cutoffSpeed.toFixed(1)} m/s; ${s.arc.toFixed(2)} deg round from the pad, true anomaly ${s.anomaly.toFixed(1)} deg`,
    );
    console.log(
      `  #   the spacecraft leaves weighing ${s.massLeft.toFixed(0)} kg by the stages' figures (published: ${o.mass.value} kg); propellant left: ${whole.ascent.left.map((l) => l.toFixed(0)).join(', ')} kg a unit`,
    );
    const r = whole.coast.results;
    console.log(
      `  #   then the coast: apogee flown round ${(r.apogee / 1000).toFixed(1)} km; braking over ${r.retroLatitude.toFixed(2)} N ${r.retroLongitude.toFixed(2)} E; 7 km at ${clock(r.ejectionAt)} over ${r.ejectionLatitude.toFixed(3)} N ${r.ejectionLongitude.toFixed(3)} E; ${(r.alongTrack / 1000).toFixed(1)} km along the track and ${(r.crossTrack / 1000).toFixed(1)} km to the right of the record's landing`,
    );
  });

  test(`${f.designation}: the ascent against the record; every miss is recorded`, () => {
    hold(o.ascent.checks, ascentValue(whole.ascent), misses.ascent, 'ascent');
  });

  test(`${f.designation}: the coast flown on from the ascent against the record; every miss is recorded`, () => {
    hold(o.checks, (id) => whole.coast.results[id], misses.whole, 'whole ');
  });

  test(`${f.designation}: the inputs that are not documented, and what each is worth`, () => {
    // every input the ascent reads that is not documented, by where it is in the record: a new one must be added here
    const read = [];
    const walk = (x, at) => {
      // (the checks are not inputs; `sheds` and `centre` are the scene's alone: staged.ts does not read them)
      if (!x || typeof x !== 'object' || at.endsWith('.checks') || at.endsWith('.sheds') || at.endsWith('.centre')) return;
      if ('confidence' in x && x.confidence !== 'documented') read.push(at);
      if (!('confidence' in x)) for (const [key, value] of Object.entries(x)) walk(value, `${at}.${key}`);
    };
    walk(o.ascent, 'ascent');
    o.stages.forEach((s, i) => {
      for (const key of ['exitArea', 'usable', 'throttle', 'propellant', 'mass', 'dry', 'cutoff', 'ignition'])
        if (s[key] && s[key].confidence !== 'documented') read.push(`stages.${i}.${key}`);
    });
    assert.deepEqual(read.sort(), [
      'ascent.drag.0.area',
      'ascent.drag.0.curve',
      'ascent.drag.1.area',
      'ascent.drag.1.curve',
      'ascent.guidance.kick',
      'ascent.guidance.target.climb',
      'ascent.guidance.vertical',
      'stages.0.ignition',
      'stages.1.ignition',
      'stages.2.propellant',
    ]);
    const [site, jd, sea] = where(f);
    const base = whole.ascent.summary;
    const weigh = (label, change) => {
      const copy = structuredClone(o);
      change(copy);
      const s = ascend(copy, site, jd, sea, steer(copy, site, jd, sea)).summary;
      console.log(
        `  #   ${label.padEnd(58)} cutoff ${(s.cutoffSpeed - base.cutoffSpeed).toFixed(1).padStart(7)} m/s, apogee ${((s.apogee - base.apogee) / 1000).toFixed(0).padStart(5)} km`,
      );
      return s;
    };
    console.log('  #   what a change in an input moves (the law solved afresh each time):');
    weigh('the drag curves x 1.3 (estimated)', (c) => c.ascent.drag.forEach((d) => d.curve.points.forEach((p) => (p[1] *= 1.3))));
    weigh('the vertical rise 5 s longer (estimated)', (c) => (c.ascent.guidance.vertical.value += 5));
    weigh('the pitch-over 5 s longer (estimated)', (c) => (c.ascent.guidance.kick.value += 5));
    weigh('the tangent law from the core’s cutoff, not the strap-ons’', (c) => (c.ascent.guidance.turn.value = 300));
    weigh('cutoff 1 deg below level (estimated)', (c) => (c.ascent.guidance.target.climb.value = -1));
    weigh(
      'the core’s load less its peroxide and nitrogen (3.12 t)',
      (c) => (c.stages[1].usable = { ...c.stages[1].propellant, value: 86_980 }),
    );
    weigh('the strap-ons’ load less theirs (1.47 t)', (c) => (c.stages[0].usable = { ...c.stages[0].propellant, value: 37_690 }));
    weigh('the core 1 % less thrust and flow', (c) => {
      c.stages[1].thrust.vacuum.value *= 0.99;
      c.stages[1].thrust.seaLevel.value *= 0.99;
    });
    weigh('Block E 1 % less specific impulse', (c) => (c.stages[2].isp.vacuum.value *= 0.99));
    weigh('Block E as Astronautix has it, 7,775 kg fuelled', (c) => (c.stages[2].mass.value = 7_775));
    weigh('the spacecraft 1 % heavier at liftoff', (c) => (c.liftoffMass.value += 47));
    // the speed the record's orbit needs at the planned perigee, and when the run reaches it: how long Block E burns past it
    const need = Math.sqrt(
      3.986004418e14 *
        (2 / (o.orbit.radius.value + 180_000) - 1 / (o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2)),
    );
    const reached = whole.ascent.samples.find((s) => s.t > 300 && s.speed >= need);
    console.log(
      `  #   the record’s orbit needs ${need.toFixed(1)} m/s at 180 km: the run has it at T+${reached?.t.toFixed(1)} s, ${(676 - (reached?.t ?? Number.NaN)).toFixed(1)} s before the recorded cutoff (${(base.cutoffSpeed - need).toFixed(1)} m/s over)`,
    );
  });

  if (o.descent)
    test(`${f.designation}: the two bodies down from the ejection against the record; every miss is recorded`, () => {
      assert.ok(whole.down, 'the coast reached the ejection height');
      const clock = (t) => new Date(Date.parse(f.launch) + t * 1000).toISOString().slice(11, 19);
      for (const [id, l] of Object.entries(whole.down.landed))
        console.log(
          `  #   ${id} down at ${clock(l.at)} (T+${l.at.toFixed(0)} s) over ${l.latitude.toFixed(3)} N ${l.longitude.toFixed(3)} E, falling ${l.speed.toFixed(1)} m/s`,
        );
      console.log(`  #   ${(whole.down.apart / 1000).toFixed(2)} km apart`);
      const value = (id) => {
        if (id === 'apart') return whole.down.apart;
        const [body, field] = id.split('.');
        return whole.down.landed[body]?.[field];
      };
      hold(o.descent.checks, value, misses.descent ?? {}, 'down  ');
    });
}
