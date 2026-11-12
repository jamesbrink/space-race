// The coast of an orbital flight (src/sim/orbital.ts: flyOrbit) against the record. As tests/sim.test.mjs does for a
// ballistic flight: every check in a flight's `orbital.checks` is flown; one outside its tolerance must be in MISSES with
// how far out it is and why; the test fails on a miss nobody recorded, on one that has moved past its slack, and on one
// that has come within tolerance. Nothing in a flight's inputs is adjusted to bring a check in.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { flyOrbit, injectionState } from '../src/sim/orbital.ts';
import { sunPosition } from '../src/world/ephemeris.ts';
import { cross, DEG, dot, siteFrame, unit } from '../src/world/frames.ts';
import { elementsOf, nodalPeriod } from '../src/world/orbit.ts';
import { julianDate, terrestrialTime } from '../src/world/time.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const orbiters = all.filter((f) => f.orbital && f.site);
const fly = (f, orbital = f.orbital) => flyOrbit(orbital, siteFrame(f.site), julianDate(f.launch), f.site.seaLevel.value);
/** A flight's orbital record with one input changed: for weighing inputs, never for flying the record. */
const withInput = (o, path, value) => {
  const copy = structuredClone(o);
  let at = copy;
  for (const key of path.slice(0, -1)) at = at[key];
  at[path.at(-1)].value = value;
  return copy;
};

/**
 * Checks the coast misses today, by flight: how far out (run less record, in the check's unit), give or take `slack`,
 * and which input is most likely to blame.
 */
const MISSES = {
  'ussr/vostok/vostok-1': {
    apogee: {
      by: 18_000,
      slack: 500,
      why:
        'Flown round, the orbit tops out at 345 km over the report’s 6,371 km ball, not 327. The blame is how `orbit` is read: the published heights are taken as the osculating orbit at cutoff, ' +
        'at 62 degrees north, where the oblateness has the osculating semi-major axis some kilometres under its mean. The report’s figures are evidently mean ones, or heights measured round the ' +
        'orbit; the last test prints what both heights 9 km lower would move (the flown apogee is then 336 km, so it is not the semi-major axis alone). The cure is a stated conversion from mean ' +
        'to osculating elements, not a number changed: not done yet',
    },
    separationAltitude: {
      by: -17_900,
      slack: 1_500,
      why:
        'At 10:36 it is at 137 km, where Lissov reckons 150 to 160 and Siddiqi 150 to 170. Theirs are reckonings too. Ours rests on the push lying along the line from the Sun, 30 degrees ' +
        'below level, which brings it down early: `retro.aim`',
    },
    ejectionAt: {
      by: 225,
      slack: 10,
      why:
        'It reaches 7 km at 10:45:45 Moscow time, where the record has the hatch going at 10:42 (to the minute) and the module on the ground at 10:48. A minute of it is the landing being 467 km long; ' +
        'the rest is a descent that takes longer than the flight’s did, which points at `retro.aim` and `retro.deltaV` (a push only 59 per cent of which is against the motion) and at the orbit being read too high',
    },
    crossTrack: {
      by: -68_800,
      slack: 3_000,
      why:
        'It comes down 69 km to the left of the record’s landing. All of it is the braking burn’s sideways part: the Sun stood 41 degrees out of the orbit’s plane that morning (derived from the site, ' +
        'the hour and the inclination, and not in doubt), so a push straight along the line from the Sun has 65 per cent of itself across the track. With the same burn straight against the motion the ' +
        'miss is 9 km. So `retro.aim` as the record words it (“the TDU was directed to the Sun”) cannot be the whole of how the engine’s axis lay: the sensor’s axis to the engine’s is the thing to find. Not adjusted',
    },
    alongTrack: {
      by: 467_000,
      slack: 10_000,
      why:
        'It comes down 467 km beyond the record’s landing along its own track. Three inputs are each worth as much: `injection.arc` (no source; reckoned by hand to 3 degrees, 129 km a degree), ' +
        '`retro.aim` (straight against the motion it lands 453 km shorter, 14 km from the record: which is no proof, given the first) and the reading of `orbit` (see apogee). Not adjusted: ' +
        'the ascent flown is what replaces the first, a source on the solar sensor the second',
    },
  },
};

test('there is an orbital flight to fly', () => {
  assert.ok(orbiters.length > 0);
});

for (const f of orbiters) {
  const o = f.orbital;
  const misses = MISSES[f.id] ?? {};
  let run;

  test(`${f.designation}: every figure in the orbital record has a confidence and a source, and its times are in order`, () => {
    let count = 0;
    const walk = (x, where) => {
      if (!x || typeof x !== 'object') return;
      if ('confidence' in x) {
        count++;
        assert.ok(['documented', 'derived', 'estimated'].includes(x.confidence), `${where}: confidence`);
        assert.ok(typeof x.source === 'string' && x.source.length > 12, `${where}: a source`);
        if ('value' in x) assert.ok(Number.isFinite(x.value), `${where}: a number`);
      }
      for (const [key, value] of Object.entries(x)) walk(value, `${where}.${key}`);
    };
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
    const s = injectionState(o, siteFrame(f.site), julianDate(f.launch));
    const el = elementsOf(s.r, s.v);
    assert.ok(Math.abs(el.i / DEG - o.orbit.inclination.value) < 1e-9, 'inclination');
    assert.ok(Math.abs(el.a * (1 - el.e) - o.orbit.radius.value - o.orbit.perigee.value) < 1e-3, 'perigee');
    assert.ok(Math.abs(el.a * (1 + el.e) - o.orbit.radius.value - o.orbit.apogee.value) < 1e-3, 'apogee');
    // how far the Sun stands out of the orbit's plane: it sets how much of a Sun-aimed push is across the track
    const jd = julianDate(f.launch) + o.retro.on.value / 86_400;
    const beta = Math.asin(dot(unit(sunPosition(terrestrialTime(jd))), unit(cross(s.r, s.v)))) / DEG;
    console.log(`  # ${f.designation}: the Sun is ${Math.abs(beta).toFixed(1)} deg out of the orbit’s plane at the braking burn`);
  });

  test(`${f.designation}: the coast is the same coast every time, and comes down`, () => {
    run = fly(f);
    const again = fly(f);
    assert.deepEqual(run.results, again.results);
    assert.equal(run.samples.at(-1).phase, 'down');
    assert.ok(Math.abs(run.samples.at(-1).altitude - o.ejection.altitude.value) < 1, 'ends at the ejection height');
    const r = run.results;
    const clock = (t) => {
      const s = Date.parse(f.launch) / 1000 + t;
      return new Date(s * 1000).toISOString().slice(11, 19);
    };
    console.log(`  # ${f.designation}: the coast (times UTC)`);
    console.log(
      `  #   period by Kepler ${(r.period / 60).toFixed(2)} min; nodal ${(nodalPeriod(o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2, (o.orbit.apogee.value - o.orbit.perigee.value) / (2 * (o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2)), o.orbit.inclination.value * DEG) / 60).toFixed(2)} min; apogee as flown ${(r.apogee / 1000).toFixed(1)} km`,
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
      `  #   at ${(o.ejection.altitude.value / 1000).toFixed(0)} km at ${clock(r.ejectionAt)} over ${r.ejectionLatitude.toFixed(3)} N ${r.ejectionLongitude.toFixed(3)} E, falling ${r.ejectionSpeed.toFixed(0)} m/s`,
    );
    console.log(
      `  #   against the record’s landing: ${(r.alongTrack / 1000).toFixed(1)} km along the track, ${(r.crossTrack / 1000).toFixed(1)} km to its right`,
    );
  });

  test(`${f.designation}: the coast against the record; every miss is recorded`, () => {
    for (const check of o.checks) {
      const got = run.results[check.id];
      const out = got - check.value;
      const within = Math.abs(out) <= check.tolerance;
      const miss = misses[check.id];
      console.log(
        `  #   ${within ? 'holds ' : 'MISSES'} ${check.label}: ${got.toFixed(1)} against ${check.value.toFixed(1)} ± ${check.tolerance} ${check.unit} (${check.confidence})`,
      );
      if (within) assert.ok(!miss, `${check.id} is within tolerance now: take it off MISSES`);
      else {
        assert.ok(miss, `${check.id} misses by ${out.toFixed(1)} ${check.unit} and is not in MISSES`);
        assert.ok(
          Math.abs(out - miss.by) <= miss.slack,
          `${check.id} misses by ${out.toFixed(1)}, recorded as ${miss.by} give or take ${miss.slack}`,
        );
      }
    }
    for (const id of Object.keys(misses))
      assert.ok(
        o.checks.some((c) => c.id === id),
        `MISSES names ${id}, which is not a check`,
      );
  });

  test(`${f.designation}: the inputs that are not documented, and what each is worth`, () => {
    // every derived or estimated input the coast reads, by where it is in the record: a new one must be added here
    const inputs = [
      ['orbit', 'radius'],
      ['injection', 'arc'],
      ['injection', 'anomaly'],
      ['retro', 'on'],
      ['retro', 'off'],
      ['entry', 'area'],
    ];
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
