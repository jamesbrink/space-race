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
import { ascend, byHand, exitAreaOf, flowOf, flyWhole, integral, published, schedule, steer } from '../src/sim/staged.ts';
import { orbitPredictor } from '../src/sim/orbitpath.ts';
import { DEG, siteFrame } from '../src/world/frames.ts';
import { greenwichSiderealTime, julianDate } from '../src/world/time.ts';

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
const SHORT =
  'The vehicle as the record now reads it does not reach orbit: at the last cutoff it has 7,686 m/s where the published orbit needs 7,844 at 180 km, 157 m/s short, and its perigee is under the ground. ' +
  'Block E is cut where its integrator was set (2,283.52 m/s of apparent velocity, the flight task) and that comes at 676.4 s, the recorded instant to a third of a second, with 46 kg left: so the third stage as recorded is ' +
  'right, and the shortfall is the first two stages’. What owns it (the last test): the throttling documented in kind and estimated in level, the strap-ons’ intermediate stage (none: +143 m/s; at 80 per cent: +71) and above ' +
  'all the core’s final stage (none: +443 m/s; 5 s of it, not 10: +221), with 4.5 t left in the core at its cutoff, which a vehicle with tank-emptying regulators would not carry. So the core’s figures and its final ' +
  'stage as the sources give them do not agree: its load (100.4 t fuelled less 6.8 t dry, Astronautix) or the length or level of its final stage is wrong. Not adjusted. ' +
  'The first reading (rated thrust to the recorded instants, Soyuz-ST’s loads) was 142 m/s fast: the documented throttling is worth more than the whole miss either way';
const PUBLISHED =
  'The coast is flown from the published orbit, begun where the ascent left the spacecraft (staged.ts `published`), since the ascent as flown does not reach it';
const MISSES = {
  'ussr/vostok/vostok-1': {
    ascent: {
      minuteG: {
        by: -1.3,
        slack: 0.1,
        why:
          'A minute up the run reads 2.20 g; Zak has Gagarin feeling 3 to 4. Thrust and mass alone give 2.4 g there (4.6 MN on 191 t), less 0.2 for the drag, and Soyuz’s manual shows 2.6 g ' +
          'at 60 s on the same first stages: the record’s figure is a man’s feeling, not an accelerometer’s',
      },
      perigee: { by: -370_080, slack: 2_000, why: SHORT },
      apogee: { by: -147_000, slack: 300, why: `The cutoff is level at 180 km and too slow, so 180 km is the orbit’s top: ${SHORT}` },
      period: { by: -310.97, slack: 2, why: `It follows from the speed at cutoff: ${SHORT}` },
    },
    whole: {
      apogee: {
        by: 19_184,
        slack: 300,
        why: `${PUBLISHED}. Flown round under J2 the published orbit taken as osculating where the ascent cut off tops out at 346 km, not 327: the same miss as the coast from the published orbit in tests/orbital.test.mjs (345 km), which is how the published elements are read`,
      },
      separationAltitude: {
        by: -16_774,
        slack: 1_500,
        why: `${PUBLISHED}. At 10:36 it is at 138 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170 (reckonings). The burn is aimed along the line from the Sun, 30 degrees below level, which brings it down early: \`retro.aim\`, as in the coast’s own misses`,
      },
      ejectionAt: {
        by: 220.6,
        slack: 10,
        why: `${PUBLISHED}. It reaches 7 km at 10:45:40, 3.7 minutes after the record’s 10:42: a minute and more of it is the landing being 465 km long, the rest a descent slower than the flight’s, which points at \`retro.aim\` again`,
      },
      alongTrack: {
        by: 464_810,
        slack: 10_000,
        why:
          `${PUBLISHED}. It comes down 465 km beyond the record’s landing along the track and 13 km across it (which holds: the plane flown from the flight task’s aiming azimuth is the record’s). ` +
          'The place on the orbit is now the ascent’s (27.84 degrees round from the pad, where the estimate was 27.5), so what owns the rest is the burn’s aim along the line from the Sun (straight against the motion it lands 453 km shorter in the coast from the published orbit) and how the published elements are read (both heights 9 km lower: 302 km shorter)',
      },
    },
    descent: {
      'module.at': {
        by: 148.8,
        slack: 10,
        why: 'Late by its late arrival at 7 km (see the coast’s ejectionAt): from 7 km the module takes 6 min 10 s, the record’s clocks at most 6',
      },
      'pilot.at': {
        by: 364.3,
        slack: 10,
        why:
          'Late by the late arrival at 7 km, and from 7 km he takes 13 min 23 s where R and Z’s clocks have 11 (10:42 to 10:53) and Baturin’s 4 (10:49). ' +
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
  // `whole`: the flight flown from the pad, ascent and coast and descent, as the physics has it; `shown`: the ascent flown,
  // then the published orbit from where it left the spacecraft (staged.ts `published`), which is what the scene shows and
  // what the coast's and the descent's checks are held to, since the ascent as flown does not reach the published orbit
  let whole;
  let shown;

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
    // (a stage cut on its velocity stops when the run says: shown with the run, below)
    const plan = schedule(o);
    o.stages.forEach((s, i) => {
      if (s.velocity) return;
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
      `  #   solved: ${o.ascent.guidance.azimuth ? `the plane through the aiming azimuth, ${o.ascent.guidance.azimuth.value.toFixed(4)} deg (given)` : `the launch plane inclined ${(x.plane / DEG).toFixed(3)} deg`}; pitched over ${(x.kick / DEG).toFixed(3)} deg; tangent falling ${(x.rate * 1000).toFixed(4)} per 1000 s`,
    );
    whole = flyWhole(o, site, jd, sea, x);
    shown = flyWhole(o, site, jd, sea, x, 10, 'published');
    const again = ascend(o, site, jd, sea, x);
    assert.deepEqual(again.summary, whole.ascent.summary);
    const s = whole.ascent.summary;
    const g = o.ascent.guidance.target;
    assert.ok(Math.abs(s.cutoffAltitude - g.altitude.value) < 1, 'at the target height');
    assert.ok(Math.abs(s.cutoffClimb - g.climb.value) < 1e-3, 'at the target climb');
    if (!o.ascent.guidance.azimuth) assert.ok(Math.abs(s.inclination - g.inclination.value) < 1e-3, 'in the target plane');
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
    o.stages.forEach((st, i) =>
      console.log(
        `  #   ${st.name}: flown ${o.stages[i].ignition.value.toFixed(1)} to ${whole.ascent.stops[i].toFixed(1)} s${st.velocity ? ' (cut on its velocity)' : ''}, ${whole.ascent.left[i].toFixed(0)} kg left a unit`,
      ),
    );
    console.log(
      `  #   the spacecraft leaves weighing ${s.massLeft.toFixed(0)} kg by the stages' figures (published: ${o.mass.value} kg); propellant left: ${whole.ascent.left.map((l) => l.toFixed(0)).join(', ')} kg a unit`,
    );
    if (s.perigee < 0)
      console.log(`  #   flown on from it, it does not go round: its perigee is ${(s.perigee / 1000).toFixed(0)} km, under the ground`);
    const r = shown.coast.results;
    console.log(
      `  #   the published orbit from where the ascent left it: apogee flown round ${(r.apogee / 1000).toFixed(1)} km; braking over ${r.retroLatitude.toFixed(2)} N ${r.retroLongitude.toFixed(2)} E; 7 km at ${clock(r.ejectionAt)} over ${r.ejectionLatitude.toFixed(3)} N ${r.ejectionLongitude.toFixed(3)} E; ${(r.alongTrack / 1000).toFixed(1)} km along the track and ${(r.crossTrack / 1000).toFixed(1)} km to the right of the record's landing`,
    );
  });

  test(`${f.designation}: the ascent against the record; every miss is recorded`, () => {
    hold(o.ascent.checks, ascentValue(whole.ascent), misses.ascent, 'ascent');
  });

  test(`${f.designation}: the coast flown on from the ascent against the record; every miss is recorded`, () => {
    hold(o.checks, (id) => shown.coast.results[id], misses.whole, 'whole ');
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
      // (moves nothing here: only the live vehicle is steered by it; tests/stagedlive.test.mjs says what it is worth there)
      'ascent.steering.authority',
      'stages.0.ignition',
      'stages.0.propellant',
      'stages.0.throttle',
      'stages.1.cutoff',
      'stages.1.ignition',
      'stages.1.propellant',
      'stages.1.throttle',
      'stages.2.propellant',
    ]);
    const [site, jd, sea] = where(f);
    const base = whole.ascent.summary;
    const weigh = (label, change) => {
      const copy = structuredClone(o);
      change(copy);
      let s;
      try {
        s = ascend(copy, site, jd, sea, steer(copy, site, jd, sea)).summary;
      } catch (e) {
        console.log(`  #   ${label.padEnd(58)} ${e.message}`);
        return null;
      }
      console.log(
        `  #   ${label.padEnd(58)} cutoff ${(s.cutoffAt - base.cutoffAt).toFixed(1).padStart(6)} s, ${(s.cutoffSpeed - base.cutoffSpeed).toFixed(1).padStart(7)} m/s, ${(s.perigee / 1000).toFixed(0).padStart(5)} by ${(s.apogee / 1000).toFixed(0).padStart(5)} km`,
      );
      return s;
    };
    console.log('  #   what a change in an input moves (the law solved afresh each time):');
    weigh('the drag curves x 1.3 (estimated)', (c) => c.ascent.drag.forEach((d) => d.curve.points.forEach((p) => (p[1] *= 1.3))));
    weigh('the vertical rise 5 s longer (estimated)', (c) => (c.ascent.guidance.vertical.value += 5));
    weigh('the pitch-over 5 s longer (estimated)', (c) => (c.ascent.guidance.kick.value += 5));
    weigh('the tangent law from the core’s cutoff, not the strap-ons’', (c) => (c.ascent.guidance.turn.value = 300));
    weigh('cutoff 1 deg below level (estimated)', (c) => (c.ascent.guidance.target.climb.value = -1));
    weigh('no intermediate stage of thrust on the strap-ons (estimated)', (c) => delete c.stages[0].throttle);
    weigh('no final stage of thrust on the core (estimated)', (c) => delete c.stages[1].throttle);
    weigh('neither', (c) => {
      delete c.stages[0].throttle;
      delete c.stages[1].throttle;
    });
    weigh(
      'the core’s final stage 5 s, not 10',
      (c) =>
        (c.stages[1].throttle.points = [
          [0, 1],
          [295, 1],
          [295.01, 0.104],
          [300, 0.104],
        ]),
    );
    weigh('the core’s final stage at half the steering chambers’ thrust', (c) =>
      c.stages[1].throttle.points.forEach((p) => p[0] > 290 && (p[1] /= 2)),
    );
    weigh('the strap-ons’ intermediate stage at 80 per cent, not 60', (c) =>
      c.stages[0].throttle.points.forEach((p) => p[0] > 113.1 && (p[1] = 0.8)),
    );
    weigh('the apparent velocity read 2,263.52 (the other reading)', (c) => (c.stages[2].velocity.speed.value = 2263.52));
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
    console.log(
      `  #   at the last cutoff ${base.cutoffSpeed.toFixed(1)} m/s, ${(base.cutoffSpeed - need).toFixed(1)} m/s against what the record's orbit needs there (${need.toFixed(1)})`,
    );
    // The comparison that stays: the first reading (13 November 2026), every stage burned to the record's instants at rated
    // thrust, on Soyuz-ST's loads: 142 m/s fast, 180 by 844 km. Kept as a figure; its inputs are no longer the record's.
  });

  test(`${f.designation}: the predicted path in orbit is the coast flown: from separation it comes down where the record's run does`, () => {
    const [site, jd, sea] = where(f);
    const g = greenwichSiderealTime(jd);
    const flat = (v) => [Math.cos(-g) * v[0] - Math.sin(-g) * v[1], Math.sin(-g) * v[0] + Math.cos(-g) * v[1], v[2]];
    const sep = published(o, whole.ascent.separation);
    const p = orbitPredictor(o, site, jd, sea, { t: sep.t, r: flat(sep.r), v: flat(sep.v) }).result;
    assert.equal(p.outcome, 'impact');
    assert.ok(Math.abs(p.impact.t - shown.coast.results.ejectionAt) < 1e-6, 'down at the same instant');
    assert.ok(p.apogee && !p.perigee, 'with its apogee marked (a perigee under the ground is not)');
    assert.ok(
      p.events.some((e) => e.kind === 'retro'),
      'and the burn on the way',
    );
    console.log(
      `  #   predicted from separation: apogee ${(p.apogee.altitude / 1000).toFixed(0)} km above the sea, down to 7 km at T+${p.impact.t.toFixed(0)} s; ${p.points.length} points in ${p.cost.toFixed(1)} ms`,
    );
  });

  if (o.manual)
    test(`${f.designation}: a burn by hand is the same physics: against the motion it comes down, along it it stays up`, () => {
      const [site, jd, sea] = where(f);
      const x = steer(o, site, jd, sea);
      const at = o.retro.on.value;
      const s = shown.coast.samples.find((p) => p.t >= at);
      const back = byHand(
        o,
        s.t,
        s.v.map((c) => -c / Math.hypot(...s.v)),
      );
      const down = flyWhole(back, site, jd, sea, x, 10, 'published');
      assert.equal(down.coast.samples.at(-1).phase, 'down', 'straight against the motion at the record’s instant, it comes down');
      assert.ok(down.down?.landed.pilot, 'and the pilot lands');
      const along = flyWhole(
        byHand(
          o,
          s.t,
          s.v.map((c) => c / Math.hypot(...s.v)),
        ),
        site,
        jd,
        sea,
        x,
        10,
        'published',
      );
      assert.notEqual(along.coast.samples.at(-1).phase, 'down', 'along the motion it does not');
      const l = down.down.landed.pilot;
      console.log(
        `  #   by hand, straight against the motion at the record’s instant: down at ${l.latitude.toFixed(2)} N ${l.longitude.toFixed(2)} E, ${(down.coast.results.alongTrack / 1000).toFixed(0)} km along and ${(down.coast.results.crossTrack / 1000).toFixed(0)} km across the record’s landing`,
      );
    });

  if (o.descent)
    test(`${f.designation}: the two bodies down from the ejection against the record; every miss is recorded`, () => {
      assert.ok(shown.down, 'the coast reached the ejection height');
      const clock = (t) => new Date(Date.parse(f.launch) + t * 1000).toISOString().slice(11, 19);
      for (const [id, l] of Object.entries(shown.down.landed))
        console.log(
          `  #   ${id} down at ${clock(l.at)} (T+${l.at.toFixed(0)} s) over ${l.latitude.toFixed(3)} N ${l.longitude.toFixed(3)} E, falling ${l.speed.toFixed(1)} m/s`,
        );
      console.log(`  #   ${(shown.down.apart / 1000).toFixed(2)} km apart`);
      const value = (id) => {
        if (id === 'apart') return shown.down.apart;
        const [body, field] = id.split('.');
        return shown.down.landed[body]?.[field];
      };
      hold(o.descent.checks, value, misses.descent ?? {}, 'down  ');
    });
}
