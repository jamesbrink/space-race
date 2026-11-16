// The coast of an orbital flight (src/sim/orbital.ts: flyOrbit) against the record. As tests/sim.test.mjs does for a
// ballistic flight: every check of a flight's coast is flown; one outside its tolerance must be in src/sim/misses.ts with
// how far out it is and why; the test fails on a miss nobody recorded, on one that has moved past its slack, and on one
// that has come within tolerance. Nothing in a flight's inputs is adjusted to bring a check in.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { vostokPlan } from '../missions/ussr/vostok/vehicles/vostok-plan.ts';
import { coastOf, flyOrbit, injectionState, publishedOf } from '../src/sim/orbital.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { sunPosition } from '../src/world/ephemeris.ts';
import { cross, DEG, dot, siteFrame, unit } from '../src/world/frames.ts';
import { meanOf, meanOrbitOf, periodsOf } from '../src/world/meanelements.ts';
import { nodalPeriod } from '../src/world/orbit.ts';
import { julianDate, terrestrialTime } from '../src/world/time.ts';
import { holdChecks, missesOf } from './misses.mjs';
import { recordFrom } from './records.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const orbiters = all.filter((f) => f.plan?.kind === 'orbital' && f.site);
/** The coast of a flight's plan, or of the plan of its record with an input changed (its Vostok's: every orbiter is one). */
const fly = (f, orbital) => flyOrbit(orbital ? vostokPlan(orbital) : f.plan, siteFrame(f.site), frameOf(f), f.site.seaLevel.value);
/** A flight's orbital record with one input changed: for weighing inputs, never for flying the record. */
const withInput = (o, path, value) => {
  const copy = structuredClone(o);
  let at = copy;
  for (const key of path.slice(0, -1)) at = at[key];
  at[path.at(-1)].value = value;
  return copy;
};

/**
 * By flight, every assumed, derived or estimated input the coast reads (the last test's list): a new one must be added here.
 * Vostok 2's are Vostok 1's and the injection's instant (the type's cutoff), the burn's velocity change and the ejection's
 * height besides. The descent module's mass is the type's on both (vostok-3ka.ts ENTRY_MASS: assumed).
 */
const INPUTS = {
  'ussr/vostok/vostok-1': [
    ['orbit', 'radius'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['entry', 'mass'],
    ['entry', 'area'],
  ],
  'ussr/vostok/vostok-2': [
    ['orbit', 'radius'],
    ['injection', 'at'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['retro', 'deltaV'],
    ['entry', 'mass'],
    ['entry', 'area'],
    ['ejection', 'altitude'],
  ],
  // Vostok 3's injection is documented (Kamanin's 687 s) and its modules' parting is not (the type's ten seconds)
  'ussr/vostok/vostok-3': [
    ['orbit', 'radius'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['retro', 'deltaV'],
    ['entry', 'separation'],
    ['entry', 'mass'],
    ['entry', 'area'],
    ['ejection', 'altitude'],
    ['landing', 'latitude'],
    ['landing', 'longitude'],
  ],
  // Vostok 5's: Vostok 2's, and the modules' parting (the type's ten seconds after the burn)
  'ussr/vostok/vostok-5': [
    ['orbit', 'radius'],
    ['injection', 'at'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['retro', 'deltaV'],
    ['entry', 'separation'],
    ['entry', 'mass'],
    ['entry', 'area'],
    ['ejection', 'altitude'],
  ],
  // Vostok 6's: Vostok 5's, but the ejection's height, which is its own report's (the design's)
  'ussr/vostok/vostok-6': [
    ['orbit', 'radius'],
    ['injection', 'at'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['retro', 'deltaV'],
    ['entry', 'separation'],
    ['entry', 'mass'],
    ['entry', 'area'],
  ],
  // Vostok 4's are Vostok 2's, with its modules' parting the type's
  'ussr/vostok/vostok-4': [
    ['orbit', 'radius'],
    ['injection', 'at'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['retro', 'deltaV'],
    ['entry', 'separation'],
    ['entry', 'mass'],
    ['entry', 'area'],
    ['ejection', 'altitude'],
    ['landing', 'latitude'],
    ['landing', 'longitude'],
  ],
};

test('there is an orbital flight to fly', () => {
  assert.ok(orbiters.length > 0);
});

for (const f of orbiters) {
  // the published orbit and the coast's instants, as the plan has them; the record itself only where the record's own
  // figures are what is held (their sources, their order) or weighed (the Vostok module's, vostokPlan flying each change)
  const orbit = f.plan.record.orbit;
  const coast = coastOf(f.plan);
  let run;

  test(`${f.designation}: every figure in the orbital record has a confidence and a source, and its times are in order`, () => {
    let count = 0;
    const walk = (x, where) => {
      if (!x || typeof x !== 'object') return;
      if ('confidence' in x) {
        count++;
        assert.ok(['documented', 'assumed', 'derived', 'estimated'].includes(x.confidence), `${where}: confidence`);
        assert.ok(typeof x.source === 'string' && x.source.length > 12, `${where}: a source`);
        if ('value' in x) assert.ok(Number.isFinite(x.value), `${where}: a number`);
      }
      for (const [key, value] of Object.entries(x)) walk(value, `${where}.${key}`);
    };
    const o = recordFrom(f);
    walk(o, 'orbital');
    assert.ok(count > 40, `${count} sourced figures`);
    const times = o.events.map((e) => e.at.value);
    assert.deepEqual(
      times,
      [...times].sort((a, b) => a - b),
      'events in order',
    );
    assert.equal(new Set(o.events.map((e) => e.id)).size, o.events.length, 'event ids are unique');
    assert.ok(
      o.injection.at.value < o.retro.on.value && o.retro.on.value < o.retro.off.value && o.retro.off.value < o.entry.separation.value,
    );
    for (const check of o.checks) assert.ok(check.tolerance > 0, `${check.id}: a tolerance`);
    // the stages' nodes are parts of the model the flight shows
    const nodes = new Set(f.models.flatMap((m) => m.parts.map((p) => p.node)));
    for (const stage of o.stages) for (const node of stage.nodes) assert.ok(nodes.has(node), `${stage.name}: node ${node} is a part`);
  });

  test(`${f.designation}: the orbit begins as published`, () => {
    // (read as mean elements with a nodal period, world/meanelements.ts: the state's mean orbit is the published one)
    const frame = frameOf(f);
    const s = injectionState(f.plan, siteFrame(f.site), frame);
    const m = meanOf({ r: frame.toDate(s.r), v: frame.toDate(s.v) });
    assert.ok(Math.abs(m.i / DEG - orbit.inclination.value) < 1e-6, 'inclination');
    if (orbit.period) assert.ok(Math.abs(periodsOf(m.a, m.e, m.i, m.argp).nodal - orbit.period.value) < 1e-3, 'the period, node to node');
    else
      assert.ok(
        Math.abs(m.a - orbit.radius.value - (orbit.perigee.value + orbit.apogee.value) / 2) < 1,
        'no period: the axis is the heights’ mean over the ball',
      );
    assert.ok(Math.abs(2 * m.a * m.e - (orbit.apogee.value - orbit.perigee.value)) < 1, 'the heights apart');
    // how far the Sun stands out of the orbit's plane: it sets how much of a Sun-aimed push is across the track
    const jd = julianDate(f.launch) + coast.on / 86_400;
    const beta = Math.asin(dot(unit(sunPosition(terrestrialTime(jd))), unit(cross(s.r, s.v)))) / DEG;
    console.log(`  # ${f.designation}: the Sun is ${Math.abs(beta).toFixed(1)} deg out of the orbit’s plane at the braking burn`);
  });

  test(`${f.designation}: the coast is the same coast every time, and comes down`, () => {
    run = fly(f);
    const again = fly(f);
    assert.deepEqual(run.results, again.results);
    assert.equal(run.samples.at(-1).phase, 'down');
    assert.ok(Math.abs(run.samples.at(-1).altitude - coast.floor) < 1, 'ends at the ejection height');
    const r = run.results;
    const clock = (t) => {
      const s = Date.parse(f.launch) / 1000 + t;
      return new Date(s * 1000).toISOString().slice(11, 19);
    };
    console.log(`  # ${f.designation}: the coast (times UTC)`);
    console.log(
      `  #   period by Kepler ${(r.period / 60).toFixed(2)} min; nodal ${(nodalPeriod(orbit.radius.value + (orbit.perigee.value + orbit.apogee.value) / 2, (orbit.apogee.value - orbit.perigee.value) / (2 * (orbit.radius.value + (orbit.perigee.value + orbit.apogee.value) / 2)), orbit.inclination.value * DEG) / 60).toFixed(2)} min; apogee as flown ${(r.apogee / 1000).toFixed(1)} km`,
    );
    console.log(
      `  #   into shadow ${clock(r.shadowIn)} (T+${r.shadowIn.toFixed(0)} s), out ${clock(r.shadowOut)} (T+${r.shadowOut.toFixed(0)} s)`,
    );
    console.log(
      `  #   braking begins over ${r.retroLatitude.toFixed(2)} N ${r.retroLongitude.toFixed(2)} E, the push ${r.retroOffRetrograde.toFixed(1)} deg off retrograde; perigee after it ${(r.retroPerigee / 1000).toFixed(1)} km`,
    );
    console.log(`  #   height when the modules part ${(r.separationAltitude / 1000).toFixed(1)} km`);
    console.log(
      `  #   through 100 km at ${clock(r.interfaceAt)}, ${r.interfaceSpeed.toFixed(0)} m/s through the air, ${r.interfaceAngle.toFixed(2)} deg below level; 0.05 g at ${clock(r.entryAt)}`,
    );
    console.log(
      `  #   greatest load ${r.entryG.toFixed(2)} g at ${clock(r.entryGAt)}; greatest dynamic pressure ${(r.entryQ / 1000).toFixed(1)} kPa`,
    );
    console.log(
      `  #   at ${(coast.floor / 1000).toFixed(0)} km at ${clock(r.ejectionAt)} over ${r.ejectionLatitude.toFixed(3)} N ${r.ejectionLongitude.toFixed(3)} E, falling ${r.ejectionSpeed.toFixed(0)} m/s`,
    );
    console.log(
      `  #   against the record’s landing: ${(r.alongTrack / 1000).toFixed(1)} km along the track, ${(r.crossTrack / 1000).toFixed(1)} km to its right`,
    );
  });

  test(`${f.designation}: the coast against the record; every miss is recorded`, () => {
    holdChecks(
      f.plan.checks.filter((c) => c.of === 'orbit'),
      (id) => run.results[id],
      missesOf(f.id, 'coast'),
      { name: f.designation },
    );
  });

  test(`${f.designation}: the inputs that are not documented, and what each is worth`, () => {
    // every assumed, derived or estimated input the coast reads, by where it is in the record: a new one must be added here
    const o = recordFrom(f);
    const inputs = INPUTS[f.id] ?? INPUTS['ussr/vostok/vostok-1'];
    const read = [
      ['orbit', 'radius'],
      ['orbit', 'perigee'],
      ['orbit', 'apogee'],
      ['orbit', 'inclination'],
      ['injection', 'at'],
      ['injection', 'arc'],
      ['injection', 'anomaly'],
      ['mass'],
      ['retro', 'on'],
      ['retro', 'off'],
      ['retro', 'deltaV'],
      ['entry', 'separation'],
      ['entry', 'mass'],
      ['entry', 'area'],
      ['ejection', 'altitude'],
      ['landing', 'latitude'],
      ['landing', 'longitude'],
    ];
    const at = (path) => path.reduce((x, key) => x[key], o);
    const undocumented = read.filter((path) => at(path).confidence !== 'documented').map((p) => p.join('.'));
    assert.deepEqual(undocumented.sort(), inputs.map((p) => p.join('.')).sort(), 'the inputs that are not documented');
    assert.equal(o.entry.drag.confidence, 'estimated', 'and the drag curve, which is estimated');
    const base = run.results;
    const moved = (changed) => {
      const r = fly(f, changed).results;
      return `along ${((r.alongTrack - base.alongTrack) / 1000).toFixed(0)} km, across ${((r.crossTrack - base.crossTrack) / 1000).toFixed(1)} km, load ${(r.entryG - base.entryG).toFixed(2)} g, 7 km ${(r.ejectionAt - base.ejectionAt).toFixed(0)} s`;
    };
    console.log('  #   what a change in an input moves:');
    console.log(`  #   injection.arc +1 deg: ${moved(withInput(o, ['injection', 'arc'], o.injection.arc.value + 1))}`);
    console.log(`  #   injection.anomaly +30 deg: ${moved(withInput(o, ['injection', 'anomaly'], o.injection.anomaly.value + 30))}`);
    console.log(
      `  #   orbit.radius +7 km (the equatorial radius): ${moved(withInput(o, ['orbit', 'radius'], o.orbit.radius.value + 7_137))}`,
    );
    console.log(`  #   retro.deltaV +4 m/s (as programmed): ${moved(withInput(o, ['retro', 'deltaV'], o.retro.deltaV.value + 4))}`);
    console.log(`  #   retro.deltaV +5 %: ${moved(withInput(o, ['retro', 'deltaV'], o.retro.deltaV.value * 1.05))}`);
    console.log(`  #   entry.area +5 % (or the drag coefficient): ${moved(withInput(o, ['entry', 'area'], o.entry.area.value * 1.05))}`);
    console.log(`  #   entry.mass +5 %: ${moved(withInput(o, ['entry', 'mass'], o.entry.mass.value * 1.05))}`);
    console.log(
      `  #   entry.separation -60 s (Gagarin’s 10:35): ${moved(withInput(o, ['entry', 'separation'], o.entry.separation.value - 60))}`,
    );
    const velocity = structuredClone(o);
    velocity.retro.aim.along = 'velocity';
    console.log(`  #   the push straight against the motion, not from the Sun: ${moved(velocity)}`);
    const lower = withInput(
      withInput(o, ['orbit', 'apogee'], o.orbit.apogee.value - 9_000),
      ['orbit', 'perigee'],
      o.orbit.perigee.value - 9_000,
    );
    console.log(
      `  #   both heights 9 km lower (flown apogee then ${(fly(f, lower).results.apogee / 1000).toFixed(1)} km): ${moved(lower)}`,
    );
    // the orbit as planned, with the same timer: where the plan would have put it against where it went
    const planned = withInput(withInput(o, ['orbit', 'apogee'], 230_000), ['retro', 'deltaV'], 136);
    planned.orbit.perigee.value = 180_000;
    console.log(`  #   the planned orbit (180 by 230 km) and burn (136 m/s) on the same clock: ${moved(planned)}`);
  });
}

test('a check of the orbit at an instant reads the coast there as mean elements, and costs a flight that states none nothing', () => {
  const f = orbiters.find((x) => x.id === 'ussr/vostok/vostok-1');
  const o = recordFrom(f);
  const start = o.injection.at.value;
  const check = (name, at, field, value) => ({
    id: `${name}.${field}`,
    label: `${name} ${field}`,
    value,
    unit: field === 'period' ? 's' : 'm',
    tolerance: 1,
    confidence: 'estimated',
    source: 'a test',
    at,
  });
  const asked = structuredClone(o);
  // one instant just after the orbit begins, one between two of the coast's steps, one after it is down
  asked.checks.push(
    check('begun', start + 10, 'perigee', o.orbit.perigee.value),
    check('begun', start + 10, 'apogee', o.orbit.apogee.value),
    check('begun', start + 10, 'period', o.orbit.period.value),
    check('later', start + 1234.5, 'perigee', 0),
    check('down', 86_400, 'apogee', 0),
  );
  const plain = fly(f, structuredClone(o));
  const read = fly(f, asked);
  // ten seconds on, the mean orbit is the published one: its heights over its ball, its nodal period
  const r = read.results;
  assert.ok(Math.abs(r['begun.perigee'] - o.orbit.perigee.value) < 50, `perigee ${r['begun.perigee']}`);
  assert.ok(Math.abs(r['begun.apogee'] - o.orbit.apogee.value) < 50, `apogee ${r['begun.apogee']}`);
  assert.ok(Math.abs(r['begun.period'] - o.orbit.period.value) < 0.05, `period ${r['begun.period']}`);
  // between two of the coast's steps: read off a state stepped there from the step's start, as the samples either side are
  const [before, after] = [read.samples.findLast((s) => s.t <= start + 1234.5), read.samples.find((s) => s.t > start + 1234.5)];
  const perigeeOf = (s) => {
    const m = meanOf({ r: frameOf(f).toDate(s.r), v: frameOf(f).toDate(s.v) });
    return m.a * (1 - m.e);
  };
  const ball = meanOrbitOf(publishedOf(f.plan.record.orbit)).radius;
  for (const s of [before, after]) assert.ok(Math.abs(perigeeOf(s) - ball - r['later.perigee']) < 5, `at ${s.t} s`);
  // after the coast has ended there is nothing to read
  assert.equal(r['down.apogee'], undefined);
  // the run itself is the plain one's to the last bit, and the plain one has no readings
  const { 'begun.perigee': _a, 'begun.apogee': _b, 'begun.period': _c, 'later.perigee': _d, ...rest } = r;
  assert.deepEqual(rest, plain.results);
  assert.deepEqual(read.samples, plain.samples);
  assert.equal(
    Object.keys(plain.results).some((k) => k.includes('.')),
    false,
  );
});

test('a record with no period flies the mean orbit of its heights over its ball, and its period is that orbit’s, derived', () => {
  const f = orbiters.find((x) => x.id === 'ussr/vostok/vostok-1');
  const o = structuredClone(recordFrom(f));
  delete o.orbit.period;
  o.checks = o.checks.filter((c) => c.id !== 'period');
  const plan = vostokPlan(o);
  assert.equal(plan.record.orbit.period, undefined);
  assert.equal('period' in publishedOf(plan.record.orbit), false);
  const run = fly(f, o);
  // the period the coast reports is the nodal one of the mean orbit the heights give over the record's ball
  const mean = meanOrbitOf(publishedOf(plan.record.orbit));
  assert.equal(mean.a, o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2);
  assert.ok(Math.abs(run.results.period - mean.periods.nodal) < 0.05, `${run.results.period} against ${mean.periods.nodal}`);
  // and it goes round and comes down
  assert.ok(Number.isFinite(run.results.ejectionAt));
  assert.ok(Math.abs(run.results.apogee - o.orbit.apogee.value) < 15_000, `apogee ${run.results.apogee}`);
});
