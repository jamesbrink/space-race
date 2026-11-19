// The coast of an orbital flight (src/sim/orbital.ts: flyOrbit) against the record. As tests/sim.test.mjs does for a
// ballistic flight: every check of a flight's coast is flown; one outside its tolerance must be in src/sim/misses.ts with
// how far out it is and why; the test fails on a miss nobody recorded, on one that has moved past its slack, and on one
// that has come within tolerance. Nothing in a flight's inputs is adjusted to bring a check in.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { geminiTitanPlan } from '../missions/usa/gemini/vehicles/gemini-titan-plan.ts';
import { mercuryAtlasPlan } from '../missions/usa/mercury/vehicles/mercury-atlas-plan.ts';
import { vostokPlan } from '../missions/ussr/vostok/vehicles/vostok-plan.ts';
import { aimOf, coastOf, flyOrbit, heightsBall, injectionState, liftOf, movesOf, publishedOf, shipOf } from '../src/sim/orbital.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { sunPosition } from '../src/world/ephemeris.ts';
import { cross, DEG, dot, length, siteFrame, unit } from '../src/world/frames.ts';
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
/** The plan a record is written into: a Vostok's (vostok-record.ts, `stages`) or a Mercury-Atlas's (mercury-atlas-plan.ts, `atlas`). */
const planOf = (orbital) =>
  'atlas' in orbital ? mercuryAtlasPlan(orbital) : 'titan' in orbital ? geminiTitanPlan(orbital) : vostokPlan(orbital);
/** The coast of a flight's plan, or of the plan of its record with an input changed. */
const fly = (f, orbital) => flyOrbit(orbital ? planOf(orbital) : f.plan, siteFrame(f.site), frameOf(f), f.site.seaLevel.value, 10);
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
  // Friendship 7's: the ball the heights are over, where on the orbit it began, the retrofire's impulse (worked from the
  // specified total impulse), when the pack went, the capsule's mass then and drag area, and its free-molecule figure
  'usa/mercury/ma-6-friendship-7': [
    ['orbit', 'radius'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['rarefied', 'drag'],
    ['rarefied', 'area'],
    ['retro', 'deltaV'],
    ['retro', 'gone'],
    ['entry', 'mass'],
    ['entry', 'area'],
  ],
  // Aurora 7's: as Friendship 7's, but for the arc (worked from the cutoff's place), the retrofire as the tracking gave it
  // (its pitch, its yaw and its impulse); its mass in orbit, the pack's going and the capsule's weight then are its own
  'usa/mercury/ma-7-aurora-7': [
    ['orbit', 'radius'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['rarefied', 'drag'],
    ['rarefied', 'area'],
    ['retro', 'deltaV'],
    ['retro', 'below'],
    ['retro', 'yaw'],
    ['entry', 'area'],
  ],
  // Sigma 7's: as Friendship 7's, but for the arc (worked from the cutoff's place) and the impulse (the report's own integration's)
  'usa/mercury/ma-8-sigma-7': [
    ['orbit', 'radius'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['rarefied', 'drag'],
    ['rarefied', 'area'],
    ['retro', 'deltaV'],
    ['entry', 'area'],
  ],
  // Faith 7's: the orbit's ball and inclination, the arc (Aurora 7's), the anomaly, the drag in orbit (turning every way),
  // the retrofire's impulse, the capsule in orbit and once the pack has gone (Sigma 7's), the pack's going (the transcript's)
  'usa/mercury/ma-9-faith-7': [
    ['orbit', 'radius'],
    ['orbit', 'inclination'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['mass'],
    ['rarefied', 'drag'],
    ['rarefied', 'area'],
    ['retro', 'deltaV'],
    ['retro', 'gone'],
    ['entry', 'mass'],
    ['entry', 'area'],
  ],
  'ussr/vostok/vostok-1': [
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['retro', 'on'],
    ['retro', 'off'],
    ['entry', 'mass'],
    ['entry', 'area'],
  ],
  'ussr/vostok/vostok-2': [
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

/**
 * A Mercury-Atlas's coast inputs that are not documented (its record, mercury-atlas-plan.ts): listed, and what each is
 * worth, flown on the plan `mercuryAtlasPlan` writes from a changed copy.
 */
function atlasInputs(f, o, run) {
  const read = [
    ['orbit', 'radius'],
    ['orbit', 'perigee'],
    ['orbit', 'apogee'],
    ['orbit', 'inclination'],
    ['orbit', 'period'],
    ['injection', 'at'],
    ['injection', 'arc'],
    ['injection', 'anomaly'],
    ['mass'],
    ['rarefied', 'drag'],
    ['rarefied', 'area'],
    ['retro', 'on'],
    ['retro', 'spacing'],
    ['retro', 'burn'],
    ['retro', 'deltaV'],
    ['retro', 'below'],
    ...(o.retro.yaw ? [['retro', 'yaw']] : []),
    ['retro', 'gone'],
    ['entry', 'mass'],
    ['entry', 'area'],
    ['descent', 'drogue', 'altitude'],
    ['landing', 'latitude'],
    ['landing', 'longitude'],
  ];
  const at = (path) => path.reduce((x, key) => x[key], o);
  const undocumented = read.filter((path) => at(path).confidence !== 'documented').map((p) => p.join('.'));
  assert.deepEqual(undocumented.sort(), INPUTS[f.id].map((p) => p.join('.')).sort(), 'the inputs that are not documented');
  const base = run.results;
  const moved = (changed) => {
    const r = fly(f, changed).results;
    return `along ${((r.alongTrack - base.alongTrack) / 1000).toFixed(0)} km, across ${((r.crossTrack - base.crossTrack) / 1000).toFixed(1)} km, load ${(r.entryG - base.entryG).toFixed(2)} g, drogue ${(r.ejectionAt - base.ejectionAt).toFixed(0)} s`;
  };
  console.log('  #   what a change in an input moves:');
  console.log(`  #   injection.arc +1 deg: ${moved(withInput(o, ['injection', 'arc'], o.injection.arc.value + 1))}`);
  console.log(`  #   orbit.radius the mean 6,371 km: ${moved(withInput(o, ['orbit', 'radius'], 6_371_000))}`);
  console.log(`  #   retro.deltaV +5 %: ${moved(withInput(o, ['retro', 'deltaV'], o.retro.deltaV.value * 1.05))}`);
  console.log(
    `  #   retro.deltaV as the motors' 3 x 1,000 lbf x 10 s: ${moved(withInput(o, ['retro', 'deltaV'], (30_000 * 4.4482216) / o.mass.value))}`,
  );
  console.log(`  #   retro.below 3 deg more: ${moved(withInput(o, ['retro', 'below'], o.retro.below.value + 3))}`);
  if (o.retro.yaw) console.log(`  #   retro.yaw none: ${moved(withInput(o, ['retro', 'yaw'], 0))}`);
  console.log(`  #   retro.gone at the planned jettison: ${moved(withInput(o, ['retro', 'gone'], o.retro.planned.value))}`);
  console.log(`  #   entry.mass +5 %: ${moved(withInput(o, ['entry', 'mass'], o.entry.mass.value * 1.05))}`);
  console.log(`  #   rarefied.area +20 %: ${moved(withInput(o, ['rarefied', 'area'], o.rarefied.area.value * 1.2))}`);
}

// Gemini-Titan 3's (no ball stated: its heights and period imply it): where on the orbit it began, its mass and free-molecule figure, the
// thrusters (the type's), when the crew turned for each burn and the second burn's length, the adapter's sections (spacecraft
// 4's weights), the retrofire's attitude, thrust and impulse, the re-entry module's mass, drag area, lift and bank
INPUTS['usa/gemini/gt-3'] = [
  ['injection', 'arc'],
  ['injection', 'anomaly'],
  ['mass'],
  ['rarefied', 'drag'],
  ['rarefied', 'area'],
  ['oams', 'aft', 'thrust'],
  ['oams', 'aft', 'isp'],
  ['oams', 'forward', 'thrust'],
  ['oams', 'forward', 'isp'],
  ['moves', '0', 'turned'],
  ['moves', '1', 'turned'],
  ['moves', '1', 'off'],
  ['moves', '2', 'turned'],
  ['moves', '2', 'on'],
  ['moves', '3', 'turned'],
  ['adapter', 'equipment', 'mass'],
  ['adapter', 'equipment', 'gone'],
  ['adapter', 'retro', 'mass'],
  ['retro', 'sequence'],
  ['retro', 'below'],
  ['retro', 'thrust'],
  ['retro', 'deltaV'],
  ['entry', 'mass'],
  ['entry', 'area'],
  ['entry', 'predicted'],
  ['entry', 'bank'],
  ['entry', 'banked'],
  ['entry', 'lift'],
  ['entry', 'drag'],
];

/**
 * A Gemini-Titan's coast inputs that are not documented (its record, gemini-titan-plan.ts): listed, and what each is worth,
 * flown on the plan `geminiTitanPlan` writes from a changed copy.
 */
function titanInputs(f, o, run) {
  const read = [];
  const walk = (x, at) => {
    if (!x || typeof x !== 'object') return;
    if ('confidence' in x && ('value' in x || 'points' in x)) {
      if (x.confidence !== 'documented') read.push(at);
      return;
    }
    for (const [key, value] of Object.entries(x)) walk(value, [...at, key]);
  };
  for (const k of ['orbit', 'injection', 'mass', 'rarefied', 'oams', 'moves', 'adapter', 'retro', 'entry', 'landing']) walk(o[k], [k]);
  assert.deepEqual(read.map((p) => p.join('.')).sort(), INPUTS[f.id].map((p) => p.join('.')).sort(), 'the inputs that are not documented');
  const base = run.results;
  const moved = (change) => {
    const copy = structuredClone(o);
    change(copy);
    const r = fly(f, copy).results;
    return `along ${((r.alongTrack - base.alongTrack) / 1000).toFixed(0)} km, across ${((r.crossTrack - base.crossTrack) / 1000).toFixed(1)} km, load ${(r.entryG - base.entryG).toFixed(2)} g, drogue ${(r.ejectionAt - base.ejectionAt).toFixed(0)} s`;
  };
  console.log('  #   what a change in an input moves:');
  console.log(`  #   injection.arc +1 deg: ${moved((c) => (c.injection.arc.value += 1))}`);
  // (the period's other readings, and the reading until November 2026: a diagnosis, not a reason to choose one)
  const kind = (is) => (c) => (c.orbit.kind = { is, confidence: 'estimated', source: 'a test' });
  console.log(`  #   orbit.kind nodal: ${moved(kind('nodal'))}`);
  console.log(`  #   orbit.kind kepler: ${moved(kind('kepler'))}`);
  console.log(
    `  #   orbit.over and orbit.kind none, the ball the heights and period imply as nodal (until November 2026): ${moved((c) => {
      delete c.orbit.over;
      delete c.orbit.kind;
    })}`,
  );
  console.log(`  #   retro.deltaV +5 %: ${moved((c) => (c.retro.deltaV.value *= 1.05))}`);
  console.log(`  #   retro.deltaV SP-138's 320 ft/s: ${moved((c) => (c.retro.deltaV.value = 320 * 0.3048))}`);
  console.log(`  #   retro.below 0, the push straight back: ${moved((c) => (c.retro.below.value = 0))}`);
  console.log(`  #   entry.bank 0, the lift held up: ${moved((c) => (c.entry.bank.value = 0))}`);
  console.log(`  #   entry.bank 90, the lift held level: ${moved((c) => (c.entry.bank.value = 90))}`);
  console.log(`  #   entry.lift the predicted 0.29: ${moved((c) => (c.entry.lift.points = [[0, o.entry.predicted.value]]))}`);
  console.log(`  #   entry.lift none: ${moved((c) => (c.entry.lift.points = [[0, 0]]))}`);
  console.log(`  #   entry.mass +5 %: ${moved((c) => (c.entry.mass.value *= 1.05))}`);
  console.log(`  #   the third burn 5 % more: ${moved((c) => (c.moves[3].deltaV.value *= 1.05))}`);
  console.log(`  #   the burns at the thrusters' thrust, not the indicator's: ${moved((c) => c.moves.forEach((m) => delete m.deltaV))}`);
}

// Voskhod 1's: no ejection (the parachute container's cover at the design's 5 km: documented), the burn's end, impulse and the
// parting not found, the landing point spacefacts' (estimated)
INPUTS['ussr/voskhod/voskhod-1'] = [
  ['injection', 'arc'],
  ['injection', 'anomaly'],
  ['retro', 'off'],
  ['retro', 'deltaV'],
  ['entry', 'separation'],
  ['entry', 'area'],
  ['landing', 'latitude'],
  ['landing', 'longitude'],
];

// Voskhod 2's: the burn's instants and the parting OKB-1's (documented), its impulse derived from the measured thrust, the
// descent module the 3KV's (assumed)
INPUTS['ussr/voskhod/voskhod-2'] = [
  ['injection', 'arc'],
  ['injection', 'anomaly'],
  ['retro', 'deltaV'],
  ['entry', 'mass'],
  ['entry', 'area'],
];

test('there is an orbital flight to fly', () => {
  assert.ok(orbiters.length > 0);
});

for (const f of orbiters) {
  // the published orbit and the coast's instants, as the plan has them; the record itself only where the record's own
  // figures are what is held (their sources, their order) or weighed (the Vostok module's, vostokPlan flying each change)
  const orbit = f.plan.record.orbit;
  const coast = coastOf(f.plan);
  // the ball its heights are over: the record's own (Friendship 7's), or the ellipsoid under the apsis (orbital.ts `heightsBall`)
  const ball = heightsBall(f.plan, siteFrame(f.site));
  let run;

  test(`${f.designation}: every figure in the orbital record has a confidence and a source, and its times are in order`, () => {
    let count = 0;
    const walk = (x, where, source = x?.source) => {
      if (!x || typeof x !== 'object') return;
      if ('confidence' in x) {
        count++;
        assert.ok(['documented', 'assumed', 'derived', 'estimated'].includes(x.confidence), `${where}: confidence`);
        assert.ok(typeof source === 'string' && source.length > 12, `${where}: a source`);
        if ('value' in x) assert.ok(Number.isFinite(x.value), `${where}: a number`);
      }
      for (const [key, value] of Object.entries(x)) walk(value, `${where}.${key}`, value?.source ?? x.source);
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
    if (o === f.plan) assert.ok(orbit.injection.at.value < coast.on && coast.on < coast.off && coast.off < coast.parted);
    else if ('atlas' in o || 'titan' in o)
      assert.ok(o.injection.at.value < o.retro.sequence.value && o.retro.on.value < o.retro.gone.value);
    else
      assert.ok(
        o.injection.at.value < o.retro.on.value && o.retro.on.value < o.retro.off.value && o.retro.off.value < o.entry.separation.value,
      );
    for (const check of o.checks) assert.ok(check.tolerance > 0, `${check.id}: a tolerance`);
    // the stages' nodes are parts of the model the flight shows
    const nodes = new Set(f.models.flatMap((m) => m.parts.map((p) => p.node)));
    const stages =
      o === f.plan
        ? o.craft[0].bodies
        : 'atlas' in o
          ? [o.atlas.booster, o.atlas.tank]
          : 'titan' in o
            ? [o.titan.first, o.titan.second]
            : o.stages;
    for (const stage of stages)
      for (const node of stage.nodes ?? []) assert.ok(nodes.has(node), `${stage.name ?? stage.label}: node ${node} is a part`);
  });

  test(`${f.designation}: the orbit begins as published`, () => {
    // (read as mean elements with a nodal period, or of the kind the record says: world/meanelements.ts; the state's mean orbit is the published one)
    const frame = frameOf(f);
    const s = injectionState(f.plan, siteFrame(f.site), frame);
    const m = meanOf({ r: frame.toDate(s.r), v: frame.toDate(s.v) });
    assert.ok(Math.abs(m.i / DEG - orbit.inclination.value) < 1e-6, 'inclination');
    if (orbit.period)
      assert.ok(
        Math.abs(periodsOf(m.a, m.e, m.i, m.argp)[orbit.kind?.is ?? 'nodal'] - orbit.period.value) < 1e-3,
        'the period, of its kind',
      );
    else
      assert.ok(
        Math.abs(m.a - ball - (orbit.perigee.value + orbit.apogee.value) / 2) < 1,
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
      `  #   period by Kepler ${(r.period / 60).toFixed(2)} min; nodal ${(nodalPeriod(ball + (orbit.perigee.value + orbit.apogee.value) / 2, (orbit.apogee.value - orbit.perigee.value) / (2 * (ball + (orbit.perigee.value + orbit.apogee.value) / 2)), orbit.inclination.value * DEG) / 60).toFixed(2)} min; apogee as flown ${(r.apogee / 1000).toFixed(1)} km`,
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
    if (o === f.plan) {
      const frame = frameOf(f);
      const site = siteFrame(f.site);
      const last = o.record.coastFixes.at(-1).at.value;
      const from = run.samples.find((sample) => sample.t >= last);
      const changed = structuredClone(o);
      const entry = changed.craft[0].bodies.find((body) => body.aero);
      entry.aero.drag.points = entry.aero.drag.points.map(([mach, drag]) => [mach, drag * 1.1]);
      const after = flyOrbit(changed, site, frame, f.site.seaLevel.value, 10, from);
      assert.ok(Math.abs(after.results.ejectionAt - run.results.ejectionAt) > 0.1, 'shared Block II drag affects the entry trajectory');
      return;
    }
    if ('atlas' in o) return atlasInputs(f, o, run);
    if ('titan' in o) return titanInputs(f, o, run);
    const inputs = INPUTS[f.id] ?? INPUTS['ussr/vostok/vostok-1'];
    const read = [
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
    // the reading until November 2026: the heights over the mean Earth, not the ellipsoid under the apsis
    const mean = structuredClone(o);
    mean.orbit.radius = { value: 6_371_000, confidence: 'estimated', source: 'a test: the mean Earth' };
    console.log(`  #   the heights over the mean Earth, 6,371 km (the ball ${(ball / 1000).toFixed(1)} km): ${moved(mean)}`);
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

test('a retrofire flown off its line: the push turned in the level toward the left of the motion by its yaw, then pitched below the level', () => {
  const f = all.find((x) => x.plan?.record?.orbit && 'atlas' in recordFrom(x));
  const o = structuredClone(recordFrom(f));
  const r = [6_538_000, 0, 0];
  const v = [0, 7_800, 0];
  const aim = (yaw) => {
    if (yaw === undefined) delete o.retro.yaw;
    else o.retro.yaw = { value: yaw, confidence: 'derived', source: 'a test' };
    return aimOf(mercuryAtlasPlan(o), r, v, () => [0, 0, 0]);
  };
  const b = o.retro.below.value * DEG;
  // (up is +x and the motion +y, so the left of the motion is +z; the push is against the motion)
  const none = aim(undefined);
  assert.ok(
    Math.abs(none[0] + Math.sin(b)) < 1e-12 && Math.abs(none[1] + Math.cos(b)) < 1e-12 && Math.abs(none[2]) < 1e-12,
    'no yaw: back and down',
  );
  assert.deepEqual(aim(0), none, 'a yaw of nought is none');
  const y = 27 * DEG;
  const left = aim(27);
  assert.ok(Math.abs(left[0] + Math.sin(b)) < 1e-12, 'pitched as before');
  assert.ok(
    Math.abs(left[1] + Math.cos(b) * Math.cos(y)) < 1e-12 && Math.abs(left[2] - Math.cos(b) * Math.sin(y)) < 1e-12,
    'turned to the left',
  );
  const right = aim(-27);
  assert.ok(Math.abs(right[2] + left[2]) < 1e-12, 'a negative yaw to the right');
});

test('a record can say what kind its period is: the mean orbit flown has the published period of that kind', () => {
  const f = all.find((x) => x.id === 'usa/mercury/ma-6-friendship-7');
  const o = structuredClone(recordFrom(f));
  const T = o.orbit.period.value;
  delete o.orbit.kind;
  const nodal = meanOrbitOf(publishedOf(mercuryAtlasPlan(o), siteFrame(f.site)));
  assert.equal(nodal.kind, 'nodal', 'none said: the convention');
  assert.ok(Math.abs(nodal.periods.nodal - T) < 1e-6);
  o.orbit.kind = { is: 'kepler', confidence: 'estimated', source: 'a test' };
  const plan = mercuryAtlasPlan(o);
  assert.equal(publishedOf(plan, siteFrame(f.site)).kind, 'kepler');
  const kepler = meanOrbitOf(publishedOf(plan, siteFrame(f.site)));
  assert.ok(Math.abs(kepler.periods.kepler - T) < 1e-6, `${kepler.periods.kepler} against ${T}`);
  // (a Kepler period is longer than the nodal one of the same axis, so the axis is shorter and the coast comes round sooner)
  assert.ok(kepler.a < nodal.a && kepler.periods.nodal < T);
  assert.ok(Math.abs(fly(f, o).results.period - kepler.periods.nodal) < 0.05);
});

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
  // ten seconds on, the mean orbit is the published one: its axis the period's, its heights over the ball (where the
  // heights' sum and the period disagree, as Vostok 1's do, the period stands), its nodal period
  const r = read.results;
  const ball = heightsBall(f.plan, siteFrame(f.site));
  const begun = meanOrbitOf(publishedOf(f.plan, siteFrame(f.site)));
  const span = (o.orbit.apogee.value - o.orbit.perigee.value) / 2;
  assert.ok(Math.abs(r['begun.perigee'] - (begun.a - span - ball)) < 50, `perigee ${r['begun.perigee']}`);
  assert.ok(Math.abs(r['begun.apogee'] - (begun.a + span - ball)) < 50, `apogee ${r['begun.apogee']}`);
  assert.ok(Math.abs(r['begun.period'] - o.orbit.period.value) < 0.05, `period ${r['begun.period']}`);
  // between two of the coast's steps: read off a state stepped there from the step's start, as the samples either side are
  const [before, after] = [read.samples.findLast((s) => s.t <= start + 1234.5), read.samples.find((s) => s.t > start + 1234.5)];
  const perigeeOf = (s) => {
    const m = meanOf({ r: frameOf(f).toDate(s.r), v: frameOf(f).toDate(s.v) });
    return m.a * (1 - m.e);
  };
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

test('a record with no period flies the mean orbit of its heights over the ellipsoid under the apsis, and its period is that orbit’s, derived', () => {
  const f = orbiters.find((x) => x.id === 'ussr/vostok/vostok-1');
  const o = structuredClone(recordFrom(f));
  delete o.orbit.period;
  o.checks = o.checks.filter((c) => c.id !== 'period');
  const plan = vostokPlan(o);
  assert.equal(plan.record.orbit.period, undefined);
  assert.equal('period' in publishedOf(plan, siteFrame(f.site)), false);
  const run = fly(f, o);
  // the period the coast reports is the nodal one of the mean orbit the heights give over the ball (the ellipsoid under the apsis)
  const mean = meanOrbitOf(publishedOf(plan, siteFrame(f.site)));
  assert.equal(mean.a, heightsBall(plan, siteFrame(f.site)) + (o.orbit.perigee.value + o.orbit.apogee.value) / 2);
  assert.ok(Math.abs(run.results.period - mean.periods.nodal) < 0.05, `${run.results.period} against ${mean.periods.nodal}`);
  // and it goes round and comes down
  assert.ok(Number.isFinite(run.results.ejectionAt));
  assert.ok(Math.abs(run.results.apogee - o.orbit.apogee.value) < 15_000, `apogee ${run.results.apogee}`);
});

test('a lifting body’s lift is square to its motion, its ratio of the drag, and turned by its bank about the motion', () => {
  const wind = [7000, 0, -300];
  const up = [0, 0, 1];
  const drag = [-20, 0, 0.9];
  const w = unit(wind);
  const level = unit(up.map((x, i) => x - w[i] * dot(up, w)));
  for (const bank of [0, 30, 90, 180, -45]) {
    const l = liftOf(drag, wind, up, 0.2, bank);
    assert.ok(Math.abs(dot(l, w)) < 1e-12, `square to the motion at bank ${bank}`);
    assert.ok(Math.abs(length(l) - 0.2 * length(drag)) < 1e-12, `the ratio of the drag at bank ${bank}`);
    // (lift up at 0, to the right of the motion at 90: right is the motion crossed with the level's up)
    assert.ok(Math.abs(dot(unit(l), level) - Math.cos(bank * DEG)) < 1e-12, `its bank from the plumb line at ${bank}`);
    assert.ok(Math.abs(dot(unit(l), cross(w, level)) - Math.sin(bank * DEG)) < 1e-12, `and to the right at ${bank}`);
  }
  assert.deepEqual(liftOf(drag, wind, up, 0, 0), [0, 0, 0], 'no ratio, no lift');
  assert.deepEqual(liftOf(drag, [0, 0, -100], up, 0.2, 0), [0, 0, 0], 'straight down: nowhere to turn it');
});

/**
 * Friendship 7's coast with a manoeuvre and a lifting entry laid on it: a shape for what the plan says of a Gemini, not a
 * flight. A thruster pair on the capsule (no tank: not a stage, not the coast's burn) fired along the orbit's normal, with
 * an impulse of its own or at its thrust, and the capsule given lift at a bank once its pack has gone.
 */
function laidOn(f, { deltaV = 10, ratio = 0, bank = 0, thrust } = {}) {
  const plan = structuredClone(f.plan);
  const c = plan.craft[0];
  const t = (value) => ({ value, confidence: 'estimated', source: 'a test of the shape' });
  const at = f.plan.record.orbit.injection.at.value + 2000;
  c.engines.push({
    id: 'thrusters',
    label: 'Thrusters',
    body: c.bodies.at(-1).id,
    count: 2,
    tanks: [],
    thrust: { vacuum: t(thrust ?? 400) },
    kind: 'liquid',
    starts: { count: 10, ground: false, confidence: 'estimated', source: 'a test of the shape' },
  });
  plan.attitude.push({ id: 'across', label: 'Across', hold: { aim: 'normal', sense: 1, confidence: 'estimated' }, source: 'a test' });
  const lit = thrust ? { ignite: 'thrusters' } : { ignite: 'thrusters', flown: t(deltaV) };
  plan.events.push(
    { id: 'yaw', label: 'Yaw', when: [{ time: at - 60 }], do: [{ attitude: 'across' }], automatic: true, source: 'a test' },
    { id: 'push', label: 'Push', when: [{ time: at }], do: [lit], automatic: true, source: 'a test' },
    { id: 'stop', label: 'Stop', when: [{ time: at + 20 }], do: [{ cut: 'thrusters' }], automatic: true, source: 'a test' },
  );
  if (ratio) {
    c.bodies.find((b) => b.aero).aero.lift = { points: [[0, ratio]], confidence: 'estimated', source: 'a test of the shape' };
    plan.attitude.push({ id: 'banked', label: 'Banked', hold: { bank: t(bank) }, source: 'a test' });
    const gone = coastOf(f.plan).parted;
    plan.events.push({
      id: 'bank',
      label: 'Bank',
      when: [{ time: gone + 1 }],
      do: [{ attitude: 'banked' }],
      automatic: true,
      source: 'a test',
    });
  }
  return { plan, at };
}

test('a manoeuvre in the coast pushes its impulse along the line it lit on, and turns the orbit’s plane by it', () => {
  const f = orbiters.find((x) => x.id === 'usa/mercury/ma-6-friendship-7');
  const where = [siteFrame(f.site), frameOf(f), f.site.seaLevel.value];
  const { plan, at } = laidOn(f);
  const [move] = movesOf(plan);
  assert.equal(move.on, at);
  assert.equal(move.off, at + 20);
  assert.equal(move.accel, 10 / 20, 'its impulse over its time');
  assert.deepEqual(movesOf(f.plan), [], 'none on the flight as it is');
  const plain = flyOrbit(f.plan, ...where);
  const moved = flyOrbit(plan, ...where);
  const normal = (run) => {
    const s = run.samples.find((x) => x.t >= at + 600);
    return unit(cross(s.r, s.v));
  };
  const turned = Math.acos(Math.min(1, dot(normal(plain), normal(moved))));
  const speed = plain.samples.find((x) => x.t >= at).speed;
  assert.ok(
    Math.abs(turned / (10 / speed) - 1) < 0.01,
    `the plane turned ${(turned / DEG).toFixed(4)} deg for 10 m/s at ${speed.toFixed(0)}`,
  );
  // without an impulse of its own it pushes its chambers' thrust over the ship's mass
  const [byThrust] = movesOf(laidOn(f, { thrust: 400 }).plan);
  assert.equal(byThrust.accel, (2 * 400) / f.plan.record.orbit.mass.value);
});

test('a lifting entry flies its lift while a bank is held: lift up goes further, lift down falls short, and none is no lift', () => {
  const f = orbiters.find((x) => x.id === 'usa/mercury/ma-6-friendship-7');
  const where = [siteFrame(f.site), frameOf(f), f.site.seaLevel.value];
  const flown = (o) => flyOrbit(laidOn(f, o).plan, ...where).results;
  const none = flown({});
  const up = flown({ ratio: 0.2, bank: 0 });
  const down = flown({ ratio: 0.2, bank: 180 });
  const tiny = flown({ ratio: 1e-300, bank: 0 });
  assert.ok(up.alongTrack - none.alongTrack > 100_000, `lift up: ${((up.alongTrack - none.alongTrack) / 1000).toFixed(0)} km further`);
  assert.ok(none.alongTrack - down.alongTrack > 50_000, `lift down: ${((none.alongTrack - down.alongTrack) / 1000).toFixed(0)} km short`);
  assert.ok(Math.abs(tiny.alongTrack - none.alongTrack) < 1, 'a lift too small to count is no lift');
  assert.equal(shipOf(laidOn(f, { ratio: 0.2 }).plan).banks.length, 1);
  console.log(
    `  #   L/D 0.2 on Friendship 7's capsule: lift up ${((up.alongTrack - none.alongTrack) / 1000).toFixed(0)} km further, lift down ${((none.alongTrack - down.alongTrack) / 1000).toFixed(0)} km short; ${up.entryG.toFixed(2)} g against ${none.entryG.toFixed(2)}`,
  );
});
