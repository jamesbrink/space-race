// The whole of an orbital flight flown from the pad (src/sim/staged.ts: the ascent on its stated steering law, then
// orbital.ts's coast from where it left the spacecraft) against the record. As tests/sim.test.mjs and orbital.test.mjs
// do: every check is flown; one outside its tolerance must be in src/sim/misses.ts with how far out it is and why; the test fails
// on a miss nobody recorded, on one that has moved past its slack, and on one that has come within tolerance. Nothing
// in a flight's inputs is adjusted to bring a check in.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { geminiTitanPlan } from '../missions/usa/gemini/vehicles/gemini-titan-plan.ts';
import { mercuryAtlasPlan } from '../missions/usa/mercury/vehicles/mercury-atlas-plan.ts';
import { vostokPlan } from '../missions/ussr/vostok/vehicles/vostok-plan.ts';
import { downOf } from '../src/sim/descent.ts';
import { apparentBy, guided, spacecraft } from '../src/sim/fliers.ts';
import { coastOf, heightsBall, shipOf } from '../src/sim/orbital.ts';
import { between, propagate } from '../src/sim/predict.ts';
import {
  ascend,
  byHand,
  exitAreaOf,
  flowOf,
  flyWhole,
  guidanceOf,
  integral,
  lawOf,
  published,
  recordSamples,
  schedule,
  sequenceOf,
  stagesOf,
  steer,
} from '../src/sim/staged.ts';
import { stagedVehicle } from '../src/sim/stagedlive.ts';
import { P0 } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';
import { holdChecks, missesOf } from './misses.mjs';
import { part } from './part.mjs';
import { recordFrom } from './records.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const flown = all.filter((f) => f.plan?.kind === 'orbital' && f.plan.attitude.some((a) => 'law' in a.hold) && f.site);
const where = (f) => [siteFrame(f.site), frameOf(f), f.site.seaLevel.value];

/**
 * By flight, every input the ascent reads that is not documented (the last test's list): a new one must be added here. Vostok
 * 2's are Vostok 1's and every instant of the ascent besides, its record having none of its own (its mission.md).
 */
const UNDOCUMENTED = {
  // Friendship 7's: the Atlas D's weights and impulses (no figure for 109-D read), what is derived from them, the tower's
  // weight and the posigrades' push, the staging instant (the type's sequence), and the ascent's drag, pitch-over and steering
  'usa/mercury/ma-6-friendship-7': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.guidance.kick',
    'ascent.steering.authority',
    'atlas.booster.engine.isp.seaLevel',
    'atlas.booster.engine.isp.vacuum',
    'atlas.booster.engine.thrust.vacuum',
    'atlas.booster.mass',
    'atlas.booster.separation',
    'atlas.tank.dry',
    'atlas.tank.engine.isp.seaLevel',
    'atlas.tank.engine.isp.vacuum',
    'atlas.tank.engine.thrust.seaLevel',
    'atlas.tank.engine.thrust.vacuum',
    'atlas.tank.mass',
    'atlas.tank.propellant',
    'record.liftoffMass',
    'separation.push',
    'tower.mass',
  ],
  // Aurora 7's: Friendship 7's Atlas D figures taken for 107-D, its aiming azimuth and its steering's programme too
  'usa/mercury/ma-7-aurora-7': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.steering.authority',
    'atlas.booster.engine.isp.seaLevel',
    'atlas.booster.engine.isp.vacuum',
    'atlas.booster.engine.thrust.seaLevel',
    'atlas.booster.engine.thrust.vacuum',
    'atlas.booster.mass',
    'atlas.booster.separation',
    'atlas.tank.dry',
    'atlas.tank.engine.isp.seaLevel',
    'atlas.tank.engine.isp.vacuum',
    'atlas.tank.engine.thrust.seaLevel',
    'atlas.tank.engine.thrust.vacuum',
    'atlas.tank.mass',
    'atlas.tank.propellant',
    'record.liftoffMass',
    'separation.push',
    'tower.mass',
  ],
  // Sigma 7's: as Aurora 7's, Friendship 7's Atlas D figures taken for 113-D
  'usa/mercury/ma-8-sigma-7': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.steering.authority',
    'atlas.booster.engine.isp.seaLevel',
    'atlas.booster.engine.isp.vacuum',
    'atlas.booster.engine.thrust.seaLevel',
    'atlas.booster.engine.thrust.vacuum',
    'atlas.booster.mass',
    'atlas.booster.separation',
    'atlas.tank.dry',
    'atlas.tank.engine.isp.seaLevel',
    'atlas.tank.engine.isp.vacuum',
    'atlas.tank.engine.thrust.seaLevel',
    'atlas.tank.engine.thrust.vacuum',
    'atlas.tank.mass',
    'atlas.tank.propellant',
    'record.liftoffMass',
    'separation.push',
    'tower.mass',
  ],
  // Faith 7's: Friendship 7's Atlas D figures, Sigma 7's weights, the cutoff's height and path worked from the plan,
  // the inclination Sigma 7's and Aurora 7's, the tower's release the plan's, the separation the transcript's
  'usa/mercury/ma-9-faith-7': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.target.altitude',
    'ascent.guidance.target.climb',
    'ascent.guidance.target.inclination',
    'ascent.steering.authority',
    'atlas.booster.engine.isp.seaLevel',
    'atlas.booster.engine.isp.vacuum',
    'atlas.booster.engine.thrust.seaLevel',
    'atlas.booster.engine.thrust.vacuum',
    'atlas.booster.mass',
    'atlas.tank.dry',
    'atlas.tank.engine.isp.seaLevel',
    'atlas.tank.engine.isp.vacuum',
    'atlas.tank.engine.thrust.seaLevel',
    'atlas.tank.engine.thrust.vacuum',
    'atlas.tank.mass',
    'atlas.tank.propellant',
    'record.liftoffMass',
    'separation.at',
    'separation.mass',
    'separation.push',
    'tower.mass',
    'tower.separation',
  ],
  'ussr/vostok/vostok-1': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    // (these four and the third stage's start and hot staging move nothing here: only the live vehicle hears what a hand
    // does out of the record's order; tests/stagedlive.test.mjs holds each to its consequence)
    'ascent.drops.0.q',
    'ascent.guidance.kick',
    'ascent.guidance.target.climb',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    // (moves nothing here: only the live vehicle is steered by it; tests/stagedlive.test.mjs says what it is worth there)
    'ascent.steering.authority',
    'stages.0.ignition',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.ignition',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.hot',
    'stages.2.propellant',
    'stages.2.start',
  ],
  'ussr/vostok/vostok-2': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drag.1.until',
    'ascent.drops.0.at',
    'ascent.drops.0.q',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.target.climb',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.cutoff',
    'stages.0.ignition',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.ignition',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.cutoff',
    'stages.2.hot',
    'stages.2.ignition',
    'stages.2.propellant',
    'stages.2.start',
  ],
  // Vostok 3's as Vostok 2's, but its third stage's cutoff (Kamanin's 687 s, a check) and its target height (Vostok 2's plan, assumed)
  'ussr/vostok/vostok-3': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drops.0.at',
    'ascent.drops.0.q',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.target.altitude',
    'ascent.guidance.target.climb',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.cutoff',
    'stages.0.ignition',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.ignition',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.hot',
    'stages.2.ignition',
    'stages.2.propellant',
    'stages.2.start',
  ],
  'ussr/vostok/vostok-5': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drag.1.until',
    'ascent.drops.0.at',
    'ascent.drops.0.q',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.target.altitude',
    'ascent.guidance.target.climb',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.cutoff',
    'stages.0.ignition',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.ignition',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.cutoff',
    'stages.2.hot',
    'stages.2.ignition',
    'stages.2.propellant',
    'stages.2.start',
  ],
  'ussr/vostok/vostok-6': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drag.1.until',
    'ascent.drops.0.at',
    'ascent.drops.0.q',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.target.altitude',
    'ascent.guidance.target.climb',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.cutoff',
    'stages.0.ignition',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.ignition',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.cutoff',
    'stages.2.hot',
    'stages.2.ignition',
    'stages.2.propellant',
    'stages.2.start',
  ],
  // Vostok 4's as Vostok 2's, with its target height Vostok 2's plan (assumed)
  'ussr/vostok/vostok-4': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drag.1.until',
    'ascent.drops.0.at',
    'ascent.drops.0.q',
    'ascent.guidance.azimuth',
    'ascent.guidance.kick',
    'ascent.guidance.target.altitude',
    'ascent.guidance.target.climb',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.cutoff',
    'stages.0.ignition',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.ignition',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.cutoff',
    'stages.2.hot',
    'stages.2.ignition',
    'stages.2.propellant',
    'stages.2.start',
  ],
  // Voskhod 1's on the 11A57: the blocks the Vostok-K's (assumed), Kosmos 47's instants, Block I's mass less its aft section and
  // its fairing and aft section; no aiming azimuth (the plane is solved)
  // Gemini-Titan 3's: GLV-4's weights and GLV-1's and GLV-4's engines (GLV-3's are in the mission report, not found), the
  // staging GLV-8's interval after a cutoff worked from the guidance reconstruction, the interstage's open sides, the law
  'usa/gemini/gt-3': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drag.1.until',
    'ascent.guidance.kick',
    'ascent.guidance.target.altitude',
    'ascent.guidance.turn',
    'ascent.steering.authority',
    'record.liftoffMass',
    'separation.mass',
    'separation.push',
    'titan.first.cutoff',
    'titan.first.dry',
    'titan.first.engine.isp.seaLevel',
    'titan.first.engine.isp.vacuum',
    'titan.first.engine.thrust.seaLevel',
    'titan.first.engine.thrust.vacuum',
    'titan.first.mass',
    'titan.first.propellant',
    'titan.hot.endures',
    'titan.hot.open',
    'titan.hot.turn',
    'titan.second.dry',
    'titan.second.engine.isp.vacuum',
    'titan.second.engine.thrust.vacuum',
    'titan.second.ignition',
    'titan.second.mass',
    'titan.second.propellant',
    'titan.staging',
  ],
  'ussr/voskhod/voskhod-1': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.0.until',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drops.0.at',
    'ascent.drops.0.mass',
    'ascent.drops.0.q',
    'ascent.drops.1.at',
    'ascent.drops.1.mass',
    'ascent.guidance.kick',
    'ascent.guidance.target.climb',
    'ascent.guidance.turn',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.cutoff',
    'stages.0.dry',
    'stages.0.ignition',
    'stages.0.mass',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.cutoff',
    'stages.1.dry',
    'stages.1.ignition',
    'stages.1.mass',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.dry',
    'stages.2.hot',
    'stages.2.ignition',
    'stages.2.mass',
    'stages.2.start',
  ],
  // Voskhod 2's: Voskhod 1's but its instants, which are the crew's (documented), and the airlock's jettison (estimated)
  'ussr/voskhod/voskhod-2': [
    'ascent.drag.0.area',
    'ascent.drag.0.curve',
    'ascent.drag.1.area',
    'ascent.drag.1.curve',
    'ascent.drops.0.mass',
    'ascent.drops.0.q',
    'ascent.drops.1.at',
    'ascent.drops.1.mass',
    'ascent.drops.2.at',
    'ascent.guidance.kick',
    'ascent.guidance.target.climb',
    'ascent.guidance.vertical',
    'ascent.limits.axial',
    'ascent.limits.qAlpha',
    'ascent.steering.authority',
    'stages.0.dry',
    'stages.0.ignition',
    'stages.0.mass',
    'stages.0.propellant',
    'stages.0.throttle',
    'stages.1.dry',
    'stages.1.ignition',
    'stages.1.mass',
    'stages.1.propellant',
    'stages.1.throttle',
    'stages.2.dry',
    'stages.2.hot',
    'stages.2.mass',
    'stages.2.start',
  ],
};

/** An ascent check's figure: an event's field ('core.speed'), or the summary's. */
const ascentValue = (run) => (id) => {
  const [event, field] = id.split('.');
  return field ? run.at[event]?.[field] : run.summary[id];
};

/**
 * A Mercury-Atlas's ascent inputs that are not documented (mercury-atlas-plan.ts's record: the Atlas's two engines and
 * its masses, the tower, the separation, the ascent's law, drag and steering), listed, and what each is worth, the law
 * solved afresh each time on the plan `mercuryAtlasPlan` writes from a changed copy.
 */
function atlasInputs(f, o, whole) {
  const read = [];
  const walk = (x, at) => {
    // (an engine's `nozzle` is its fire's shape alone, viewer/plume.ts: nothing flown reads it)
    if (!x || typeof x !== 'object' || at.endsWith('.checks') || at.endsWith('.sheds') || at.endsWith('.centre') || at.endsWith('.nozzle'))
      return;
    if ('confidence' in x && 'value' in x) {
      if (x.confidence !== 'documented') read.push(at);
      return;
    }
    if ('confidence' in x && 'points' in x) {
      if (x.confidence !== 'documented') read.push(at);
      return;
    }
    for (const [key, value] of Object.entries(x)) walk(value, `${at}.${key}`);
  };
  walk(o.atlas, 'atlas');
  walk(o.tower, 'tower');
  walk(o.separation, 'separation');
  walk(o.ascent, 'ascent');
  walk({ liftoffMass: o.liftoffMass }, 'record');
  assert.deepEqual(read.sort(), UNDOCUMENTED[f.id], 'the inputs that are not documented, by flight (UNDOCUMENTED)');
  const [site, dated, sea] = where(f);
  const base = whole.ascent.summary;
  const weigh = (label, change) => {
    const copy = structuredClone(o);
    change(copy);
    let s;
    try {
      const plan = mercuryAtlasPlan(copy);
      s = ascend(plan, site, dated, sea, steer(plan, site, dated, sea)).summary;
    } catch (e) {
      console.log(`  #   ${label.padEnd(58)} ${e.message}`);
      return;
    }
    console.log(
      `  #   ${label.padEnd(58)} cutoff ${(s.cutoffAt - base.cutoffAt).toFixed(1).padStart(6)} s, ${(s.cutoffSpeed - base.cutoffSpeed).toFixed(1).padStart(7)} m/s, ${(s.perigee / 1000).toFixed(0).padStart(5)} by ${(s.apogee / 1000).toFixed(0).padStart(5)} km`,
    );
  };
  const both = (e, k) => {
    e.thrust.seaLevel.value *= k;
    e.thrust.vacuum.value *= k;
  };
  console.log('  #   what a change in an input moves (the law solved afresh each time):');
  weigh('the drag curves x 1.3 (estimated)', (c) => c.ascent.drag.forEach((d) => d.curve.points.forEach((p) => (p[1] *= 1.3))));
  weigh('the pitch-over 5 s longer (estimated)', (c) => (c.ascent.guidance.kick.value += 5));
  weigh('the booster engines 5 % less thrust and flow (assumed)', (c) => both(c.atlas.booster.engine, 0.95));
  weigh('the sustainer 5 % less thrust and flow (assumed)', (c) => both(c.atlas.tank.engine, 0.95));
  weigh('the boosters’ vacuum impulse 5 % less (assumed)', (c) => (c.atlas.booster.engine.isp.vacuum.value *= 0.95));
  weigh('the sustainer’s vacuum impulse 5 % less (assumed)', (c) => (c.atlas.tank.engine.isp.vacuum.value *= 0.95));
  weigh('the propellant 5 % less (derived)', (c) => (c.atlas.tank.propellant.value *= 0.95));
  weigh('the tank section 5 % heavier empty (assumed)', (c) => {
    c.atlas.tank.dry.value *= 1.05;
    c.atlas.tank.mass.value += c.atlas.tank.dry.value / 21;
    c.liftoffMass.value += c.atlas.tank.dry.value / 21;
  });
  weigh('the booster section 5 % heavier (assumed)', (c) => {
    c.atlas.booster.mass.value *= 1.05;
    c.liftoffMass.value += c.atlas.booster.mass.value / 21;
  });
  weigh('the staging 2 s later (assumed)', (c) => (c.atlas.booster.separation.value += 2));
}

/**
 * A Gemini-Titan's ascent inputs that are not documented (gemini-titan-plan.ts's record: the Titan's two stages, their
 * engines and staging, the separation, the ascent's law, drag and steering), listed, and what each is worth, the law
 * solved afresh each time on the plan `geminiTitanPlan` writes from a changed copy.
 */
function titanInputs(f, o, whole) {
  const read = [];
  const walk = (x, at) => {
    // (an engine's `nozzle` is its fire's shape alone, viewer/plume.ts: nothing flown reads it)
    if (!x || typeof x !== 'object' || at.endsWith('.checks') || at.endsWith('.sheds') || at.endsWith('.centre') || at.endsWith('.nozzle'))
      return;
    if ('confidence' in x && ('value' in x || 'points' in x)) {
      if (x.confidence !== 'documented') read.push(at);
      return;
    }
    for (const [key, value] of Object.entries(x)) walk(value, `${at}.${key}`);
  };
  walk(o.titan, 'titan');
  walk(o.separation, 'separation');
  walk(o.ascent, 'ascent');
  walk({ liftoffMass: o.liftoffMass }, 'record');
  assert.deepEqual(read.sort(), UNDOCUMENTED[f.id], 'the inputs that are not documented, by flight (UNDOCUMENTED)');
  const [site, dated, sea] = where(f);
  const base = whole.ascent.summary;
  const weigh = (label, change) => {
    const copy = structuredClone(o);
    change(copy);
    const plan = geminiTitanPlan(copy);
    const s = ascend(plan, site, dated, sea, steer(plan, site, dated, sea)).summary;
    console.log(
      `  #   ${label.padEnd(58)} ${(s.cutoffSpeed - base.cutoffSpeed).toFixed(1).padStart(7)} m/s at cutoff, ${(s.perigee / 1000).toFixed(0).padStart(5)} by ${(s.apogee / 1000).toFixed(0).padStart(5)} km`,
    );
  };
  const thrust = (e, k) => {
    if (e.thrust.seaLevel) e.thrust.seaLevel.value *= k;
    e.thrust.vacuum.value *= k;
  };
  console.log('  #   what a change in an input moves (the law solved afresh each time):');
  weigh('the drag curves x 1.3 (estimated)', (c) => c.ascent.drag.forEach((d) => d.curve.points.forEach((p) => (p[1] *= 1.3))));
  weigh('the pitch-over 5 s longer (estimated)', (c) => (c.ascent.guidance.kick.value += 5));
  weigh('the first stage 5 % less thrust and flow (assumed)', (c) => thrust(c.titan.first.engine, 0.95));
  weigh('the second stage 5 % less thrust and flow (assumed)', (c) => thrust(c.titan.second.engine, 0.95));
  weigh('the first stage’s vacuum impulse 5 % less (assumed)', (c) => (c.titan.first.engine.isp.vacuum.value *= 0.95));
  weigh('the second stage’s impulse 5 % less (assumed)', (c) => (c.titan.second.engine.isp.vacuum.value *= 0.95));
  weigh('the first stage at the press kit’s 430,000 lb (documented, round)', (c) => thrust(c.titan.first.engine, 430_000 / 418_530));
  weigh('the second stage’s propellant 5 % more (derived)', (c) => {
    c.titan.second.propellant.value *= 1.05;
    c.titan.second.mass.value += c.titan.second.propellant.value / 21;
    c.liftoffMass.value += c.titan.second.propellant.value / 21;
  });
  weigh('the first stage 5 % heavier empty (assumed)', (c) => {
    c.titan.first.dry.value *= 1.05;
    c.titan.first.mass.value += c.titan.first.dry.value / 21;
    c.liftoffMass.value += c.titan.first.dry.value / 21;
  });
  weigh('the second stage 5 % heavier empty (assumed)', (c) => {
    c.titan.second.dry.value *= 1.05;
    c.titan.second.mass.value += c.titan.second.dry.value / 21;
    c.liftoffMass.value += c.titan.second.dry.value / 21;
  });
}

test('there is an orbital flight whose ascent can be flown', () => {
  assert.ok(flown.length > 0);
});

// (each flight's are minutes of flying: CI takes them a part to a runner, SR_PART; part.mjs)
for (const f of part(flown)) {
  const plan = f.plan;
  const record = plan.record;
  const seq = sequenceOf(plan);
  const stages = stagesOf(plan);
  const guidance = guidanceOf(plan);
  const checksOf = (of) => plan.checks.filter((c) => c.of === of);
  /** The record's events' ids, as the plan keeps them: each an event's `record`, or a mark. */
  const recordIds = new Set([...plan.events.flatMap((e) => (e.record ? [e.record.id] : [])), ...record.marks.map((m) => m.id)]);
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
        assert.ok(['documented', 'assumed', 'derived', 'estimated'].includes(x.confidence), `${at}: confidence`);
        assert.ok(typeof x.source === 'string' && x.source.length > 12, `${at}: a source`);
      }
      for (const [key, value] of Object.entries(x)) walk(value, `${at}.${key}`);
    };
    walk(plan.craft, 'craft');
    walk(plan.checks, 'checks');
    assert.ok(count > 20, `${count} sourced figures`);
    for (const c of checksOf('ascent')) assert.ok(c.tolerance > 0, `${c.id}: a tolerance`);
    assert.ok(recordIds.has(guidance.target.at), 'the law’s target is an event of the record');
  });

  test(`${f.designation}: each engine gives its own sea-level figures back, and burns what it holds`, () => {
    for (const { engine: e, body } of stages) {
      if (e.thrust.seaLevel) {
        // flow is the vacuum figures'; at one atmosphere the thrust and impulse must be the sea-level ones
        const thrust = e.thrust.vacuum.value - P0 * exitAreaOf(e);
        assert.ok(Math.abs(thrust / e.thrust.seaLevel.value - 1) < 1e-9, `${body.label}: sea-level thrust`);
        const isp = thrust / (flowOf(e) * 9.80665);
        assert.ok(Math.abs(isp / e.isp.seaLevel.value - 1) < 0.002, `${body.label}: sea-level impulse ${isp.toFixed(1)} s`);
      }
    }
    // (a stage cut on its velocity stops when the run says: shown with the run, below)
    const burns = schedule(plan);
    stages.forEach((s, i) => {
      if (seq.stages[i].speed) return;
      const used = flowOf(s.engine) * integral(s.throttle, burns[i].from, burns[i].to);
      console.log(
        `  #   ${s.body.label}: burns ${burns[i].from.toFixed(1)} to ${burns[i].to.toFixed(1)} s${burns[i].dry ? ' (RUNS DRY before its cutoff)' : ''}, ${(used / 1000).toFixed(2)} of ${(s.load / 1000).toFixed(2)} t each`,
      );
    });
  });

  test(`${f.designation}: the steering law reaches its target, and the flight is the same flight every time`, () => {
    const [site, dated, sea] = where(f);
    const x = steer(f.plan, site, dated, sea);
    console.log(
      `  #   solved: ${guidance.azimuth ? `the plane through the aiming azimuth, ${guidance.azimuth.value.toFixed(4)} deg (given)` : `the launch plane inclined ${(x.plane / DEG).toFixed(3)} deg`}; pitched over ${(x.kick / DEG).toFixed(3)} deg; tangent falling ${(x.rate * 1000).toFixed(4)} per 1000 s`,
    );
    whole = flyWhole(f.plan, site, dated, sea, x);
    shown = flyWhole(f.plan, site, dated, sea, x, 10, 'published');
    const again = ascend(f.plan, site, dated, sea, x);
    assert.deepEqual(again.summary, whole.ascent.summary);
    const s = whole.ascent.summary;
    const g = guidance.target;
    if (!guidance.programme) {
      assert.ok(Math.abs(s.cutoffAltitude - g.altitude.value) < 1, 'at the target height');
      assert.ok(Math.abs(s.cutoffClimb - g.climb.value) < 1e-3, 'at the target climb');
      if (!guidance.azimuth) assert.ok(Math.abs(s.inclination - g.inclination.value) < 1e-3, 'in the target plane');
    }
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
    stages.forEach((st, i) =>
      console.log(
        `  #   ${st.body.label}: flown ${seq.stages[i].from.toFixed(1)} to ${whole.ascent.stops[i].toFixed(1)} s${seq.stages[i].speed ? ' (cut on its velocity)' : ''}, ${whole.ascent.left[i].toFixed(0)} kg left a unit`,
      ),
    );
    console.log(
      `  #   the spacecraft leaves weighing ${s.massLeft.toFixed(0)} kg by the stages' figures (published: ${record.orbit.mass.value} kg); propellant left: ${whole.ascent.left.map((l) => l.toFixed(0)).join(', ')} kg a unit`,
    );
    if (s.perigee < 0)
      console.log(`  #   flown on from it, it does not go round: its perigee is ${(s.perigee / 1000).toFixed(0)} km, under the ground`);
    const r = shown.coast.results;
    console.log(
      `  #   the published orbit from where the ascent left it: apogee flown round ${(r.apogee / 1000).toFixed(1)} km; braking over ${r.retroLatitude.toFixed(2)} N ${r.retroLongitude.toFixed(2)} E; 7 km at ${clock(r.ejectionAt)} over ${r.ejectionLatitude.toFixed(3)} N ${r.ejectionLongitude.toFixed(3)} E; ${(r.alongTrack / 1000).toFixed(1)} km along the track and ${(r.crossTrack / 1000).toFixed(1)} km to the right of the record's landing`,
    );
  });

  if (f.id.startsWith('ussr/'))
    test(`${f.designation}: the sphere keeps its inertial pose when the attitude jets leave`, () => {
      const ship = shipOf(f.plan),
        samples = recordSamples(f.plan, shown, where(f)[1], 0, () => [1e11, 0, 0]);
      const index = samples.findIndex((s) => s.passive);
      assert.ok(index > 0);
      const before = samples[index - 1],
        after = samples[index];
      assert.deepEqual(after.attitude, before.attitude);
      assert.equal(after.passive.alignment, 0);
      let prior = after;
      for (const sample of samples.slice(index)) {
        assert.ok(sample.t >= ship.parted);
        assert.equal(sample.burning.length, 0);
        if (!sample.passive.alignment) assert.deepEqual(sample.attitude, after.attitude);
        if (sample.groundSpeed < 1) assert.deepEqual(sample.attitude, prior.attitude);
        prior = sample;
      }
      assert.ok(
        samples.some((s) => s.passive?.alignment > 0),
        'the air rights the sphere on entry',
      );
    });

  test(`${f.designation}: the law's level is square to the plumb line, and its axis a unit vector at every instant`, () => {
    // (the turn's tilt is measured between the plumb line in the plane and the level square to it: until November 2026 the
    // level was square to the line to the Earth's centre, 0.16 degrees off at Tyuratam, and the axis up to 0.14 % long)
    const [site, dated] = where(f);
    const law = lawOf(f.plan, site, dated, whole.ascent.solved);
    const upIn = unit(sub(law.up0, scale(law.n, dot(law.n, law.up0))));
    assert.ok(Math.abs(dot(upIn, law.down0)) < 1e-15, `level square to the plumb line: ${dot(upIn, law.down0)}`);
    assert.ok(Math.abs(dot(law.n, law.down0)) < 1e-15, 'and in the launch plane');
    let most = 0;
    for (const s of whole.ascent.samples) most = Math.max(most, Math.abs(length(s.axis) - 1));
    assert.ok(most < 1e-14, `the axis a unit vector throughout: ${most} off at most`);
  });

  test(`${f.designation}: the ascent against the record; every miss is recorded`, () => {
    holdChecks(checksOf('ascent'), ascentValue(whole.ascent), missesOf(f.id, 'ascent'), { name: `${f.designation}, ascent` });
  });

  test(`${f.designation}: the coast flown on from the ascent against the record; every miss is recorded`, () => {
    holdChecks(checksOf('orbit'), (id) => shown.coast.results[id], missesOf(f.id, 'shown'), { name: `${f.designation}, coast` });
  });

  test(`${f.designation}: the inputs that are not documented, and what each is worth`, () => {
    // every input the ascent reads that is not documented, by where it is in the record (the Vostok module's own, which
    // vostokPlan writes the plan from): a new one must be added here
    const o = recordFrom(f);
    if (o === plan) {
      const copy = structuredClone(plan);
      const law = guidanceOf(copy);
      const [site, dated, sea] = where(f);
      law.programme.points = law.programme.points.map(([t, tilt]) => [t, t > law.turn.value ? tilt + 0.5 : tilt]);
      const changed = ascend(copy, site, dated, sea, whole.ascent.solved, Infinity).summary;
      assert.ok(Math.abs(changed.cutoffAltitude - whole.ascent.summary.cutoffAltitude) > 1000, 'the digitized pitch drives the ascent');
      return;
    }
    if ('atlas' in o) return atlasInputs(f, o, whole);
    if ('titan' in o) return titanInputs(f, o, whole);
    const read = [];
    const walk = (x, at) => {
      // (the checks are not inputs; `sheds` and `centre` are the scene's alone: staged.ts does not read them)
      if (!x || typeof x !== 'object' || at.endsWith('.checks') || at.endsWith('.sheds') || at.endsWith('.centre')) return;
      if ('confidence' in x && x.confidence !== 'documented') read.push(at);
      if (!('confidence' in x)) for (const [key, value] of Object.entries(x)) walk(value, `${at}.${key}`);
    };
    walk(o.ascent, 'ascent');
    o.stages.forEach((s, i) => {
      for (const key of ['exitArea', 'usable', 'throttle', 'propellant', 'mass', 'dry', 'cutoff', 'ignition', 'start', 'hot'])
        if (s[key] && s[key].confidence !== 'documented') read.push(`stages.${i}.${key}`);
    });
    assert.deepEqual(read.sort(), UNDOCUMENTED[f.id], 'the inputs that are not documented, by flight (UNDOCUMENTED)');
    const [site, dated, sea] = where(f);
    const base = whole.ascent.summary;
    const weigh = (label, change) => {
      const copy = structuredClone(o);
      change(copy);
      let s;
      try {
        const plan = vostokPlan(copy);
        s = ascend(plan, site, dated, sea, steer(plan, site, dated, sea)).summary;
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
    // (a third stage cut on its integrator: the Vostoks'; the Voskhods' is cut at its instant)
    if (o.stages[2].velocity)
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
        (2 / (heightsBall(plan, site) + 180_000) -
          1 / (heightsBall(plan, site) + (record.orbit.perigee.value + record.orbit.apogee.value) / 2)),
    );
    console.log(
      `  #   at the last cutoff ${base.cutoffSpeed.toFixed(1)} m/s, ${(base.cutoffSpeed - need).toFixed(1)} m/s against what the record's orbit needs there (${need.toFixed(1)})`,
    );
    // The comparison that stays: the first reading (13 November 2026), every stage burned to the record's instants at rated
    // thrust, on Soyuz-ST's loads: 142 m/s fast, 180 by 844 km. Kept as a figure; its inputs are no longer the record's.
  });

  test(`${f.designation}: the predicted path in orbit is the coast flown: from separation it comes down where the record's run does`, {
    skip: plan.record.coastFixes?.length
      ? 'The replay uses tracking fixes which predictive paths cannot apply. See descending.test.mjs for comparison after the last fix.'
      : false,
  }, () => {
    const [site, dated, sea] = where(f);
    // from separation; on a flight whose burn is more than a revolution away (a day in orbit), from the record's coast forty
    // minutes before it, which the propagator, going once round, then carries down
    const sep = published(f.plan, site, whole.ascent.separation);
    const late = coastOf(plan).on - sep.t > 5000 ? shown.coast.samples.find((x) => x.t >= coastOf(plan).on - 2400) : null;
    const start = late ? { t: late.t, r: late.r, v: late.v } : { t: sep.t, r: sep.r, v: sep.v };
    const job = propagate(spacecraft(f.plan, dated, site, sea, start), start, { site, seaLevel: sea, frame: dated });
    job.run();
    const p = job.result;
    assert.equal(p.outcome, 'impact');
    // The one propagator from the same state, by the same forces, against flyOrbit's fixed steps: round the orbit, through
    // the burn and down through the air they agree to centimetres and milliseconds. (Until November 2026 flyOrbit's step that
    // ended on the burn's cutoff took its last stage with the engine already off, so its burn was half a metre a second
    // short, and from there the two parted by a second and a half and 11 km at the ejection height. Both now hold the ship as
    // it is from a step's start through the step: orbital.ts `pushAs`, predict.ts's `Flier`.)
    const at = shown.coast.results;
    assert.ok(
      Math.abs(p.impact.t - at.ejectionAt) < 0.01,
      `down within a hundredth of a second of the run: ${(p.impact.t - at.ejectionAt).toFixed(4)} s`,
    );
    const apart =
      111.2 *
      Math.hypot(
        p.impact.latitude - at.ejectionLatitude,
        (p.impact.longitude - at.ejectionLongitude) * Math.cos(at.ejectionLatitude * DEG),
      );
    assert.ok(apart < 0.01, `and ${(apart * 1000).toFixed(1)} m from its place`);
    const before = shown.coast.samples.find((x) => x.t >= coastOf(plan).on - 30);
    const i = p.points.findIndex((x) => x.t > before.t);
    const [a, b] = [p.points[i - 1], p.points[i]];
    const there = between(a.t, a.r, a.v, b.t, b.r, b.v, before.t).r;
    const off = Math.hypot(...before.r.map((x, k) => x - there[k]));
    assert.ok(off < 1, `round the orbit to the burn, ${off.toFixed(3)} m from the run`);
    // (with a manoeuvre still to come before the burn, which apsides lie ahead is the manoeuvre's: not held)
    const moving = shipOf(plan).moves.some((m) => m.on > start.t && m.on < coastOf(plan).on);
    // (with its apogee marked where the run passes one before the burn: begun forty minutes before it, Faith 7's does not)
    const climbing = shown.coast.samples.filter((x) => x.t >= start.t && x.t <= coastOf(plan).on).map((x) => dot(x.r, x.v) > 0);
    const overApogee = climbing.some((up, k) => k > 0 && climbing[k - 1] && !up);
    assert.ok(moving || (!p.perigee && (Boolean(p.apogee) || !overApogee)), 'with its apogee marked (a perigee under the ground is not)');
    assert.ok(
      p.events.some((e) => e.kind === 'retro'),
      'and the burn on the way',
    );
    // Begun within the burn, the burn in progress goes on along the line it lit on (from the run's own state as it lit):
    // the same landing as the run. Without that state, the line is the one it would light on from the start, which is not
    // the run's.
    const on = coastOf(plan).on;
    const lit = shown.coast.samples.find((x) => x.t === on);
    const mid = shown.coast.samples.find((x) => x.t > on + 5 && x.t < coastOf(plan).off);
    assert.ok(lit && mid, 'the run keeps its state as the burn lit, and one within it');
    const from = { t: mid.t, r: mid.r, v: mid.v };
    const within = (options) => {
      const j = propagate(spacecraft(f.plan, dated, site, sea, from, options), from, { site, seaLevel: sea, frame: dated });
      j.run();
      return j.result.impact;
    };
    const held = within({ lit: { r: lit.r, v: lit.v } });
    const fresh = within({});
    const kmOff = (i) =>
      111.2 * Math.hypot(i.latitude - at.ejectionLatitude, (i.longitude - at.ejectionLongitude) * Math.cos(at.ejectionLatitude * DEG));
    assert.ok(
      Math.abs(held.t - at.ejectionAt) < 0.01 && kmOff(held) < 0.01,
      `mid-burn, down with the run: ${(held.t - at.ejectionAt).toFixed(4)} s, ${(kmOff(held) * 1000).toFixed(1)} m`,
    );
    console.log(
      `  #   predicted from T+${mid.t.toFixed(0)}, within the burn: ${(kmOff(held) * 1000).toFixed(1)} m from the run with the burn's line as it lit, ${(kmOff(fresh) * 1000).toFixed(1)} m with the line it would light on from there (aimed from the Sun, the line hardly turns in a burn: aimed along the motion it would)`,
    );
    console.log(
      `  #   predicted from ${late ? 'forty minutes before the burn' : 'separation'}: apogee ${p.apogee ? `${(p.apogee.altitude / 1000).toFixed(0)} km above the sea` : 'none before the burn'}, down to 7 km at T+${p.impact.t.toFixed(0)} s (${(p.impact.t - at.ejectionAt).toFixed(4)} s, ${(apart * 1000).toFixed(1)} m from the run), ${off.toFixed(3)} m from the run before the burn; ${p.points.length} points in ${p.cost.toFixed(1)} ms`,
    );
  });

  test(`${f.designation}: the path if guidance carries on is the ascent flown: from the record's state it parts where the batch run does`, () => {
    const [site, dated, sea] = where(f);
    const x = whole.ascent.solved;
    const vehicle = stagedVehicle(f.plan, site, dated, sea, x);
    const stops = whole.ascent.stops;
    for (const t0 of [40, 150, 400]) {
      const s = whole.ascent.samples.find((p) => p.t >= t0);
      if (!s || s.t >= whole.ascent.separation.t) continue; // (an ascent over before it: a Mercury-Atlas's)
      // the record's vehicle as it stood then: each stage lit, stopped and let go at the run's instants, the drops gone
      const state = {
        stages: seq.stages.map((st, i) => ({
          from: st.from <= s.t ? st.from : Infinity,
          to: stops[i] <= s.t ? stops[i] : Infinity,
          gone: st.sep <= s.t ? st.sep : Infinity,
          loose: st.sep <= s.t ? st.sep : Infinity,
        })),
        drops: Object.fromEntries(seq.drops.filter((d) => d.at <= s.t).map((d) => [d.joint, d.at])),
      };
      state.apparent = apparentBy(f.plan, vehicle, state, s.t);
      const start = { t: s.t, r: s.r, v: s.v };
      const job = propagate(
        guided(f.plan, site, sea, start, {
          vehicle,
          solved: x,
          state,
          sequence: true,
          thetaTurn: s.t > guidance.turn.value ? whole.ascent.thetaTurn : null,
          plan: f.plan,
        }),
        start,
        { site, seaLevel: sea, frame: dated },
      );
      job.run();
      const p = job.result;
      const parted = p.events.find((e) => e.kind === 'separation');
      const cut = p.events.find((e) => e.kind === 'cutoff');
      assert.ok(cut && p.kind === 'guided', `from T+${t0}: the last cutoff is on the path`);
      assert.ok(Math.abs(cut.t - whole.ascent.stops.at(-1)) < 0.5, 'cutoff agrees with the batch run');
      if (guidance.attached && !parted) continue; // The predictor ends after one orbit; the stack stays attached into its second.
      assert.ok(parted, `from T+${t0}: the parting is on the path`);
      const sep = whole.ascent.separation;
      const off = Math.hypot(...sep.r.map((q, k) => q - parted.r[k]));
      const dv = Math.hypot(...sep.v.map((q, k) => q - parted.v[k]));
      console.log(
        `  #   if guidance carries on, from T+${t0}: cut off at T+${cut.t.toFixed(2)} (the run ${whole.ascent.stops.at(-1).toFixed(2)}), parted ${(off / 1000).toFixed(2)} km and ${dv.toFixed(2)} m/s from the run; ${p.outcome}, ${p.steps} steps in ${p.cost.toFixed(0)} ms`,
      );
      // (the batch run's mass is the record's stages' less what each burned; the live vehicle's, which this flies, is the
      // same sum kept otherwise: tests/stagedlive.test.mjs holds the two to 0.03 m/s and 50 m at the last cutoff)
      assert.ok(off < 2000 && dv < 2, `parted where the run parts: ${off.toFixed(0)} m, ${dv.toFixed(2)} m/s`);
    }
  });

  test(`${f.designation}: the guided path worked out in slices is the path worked out at once, its steps ahead swept in the slices too`, () => {
    const [site, dated, sea] = where(f);
    const x = whole.ascent.solved;
    const vehicle = stagedVehicle(f.plan, site, dated, sea, x);
    const s = whole.ascent.samples.find((p) => p.t >= 40);
    const stops = whole.ascent.stops;
    const state = {
      stages: seq.stages.map((st, i) => ({
        from: st.from <= s.t ? st.from : Infinity,
        to: stops[i] <= s.t ? stops[i] : Infinity,
        gone: Infinity,
        loose: Infinity,
      })),
      drops: {},
    };
    state.apparent = apparentBy(f.plan, vehicle, state, s.t);
    const make = () => {
      const start = { t: s.t, r: s.r, v: s.v };
      return propagate(
        guided(f.plan, site, sea, start, { vehicle, solved: x, state, sequence: true, thetaTurn: null, plan: f.plan }),
        start,
        {
          site,
          seaLevel: sea,
          frame: dated,
        },
      );
    };
    const once = make();
    once.run();
    const sliced = make();
    // (a budget of nothing: one piece of the sweep or one step each time)
    let slices = 0;
    while (!sliced.run(0)) slices++;
    assert.ok(slices > 10, `${slices} slices`);
    assert.deepEqual(sliced.result.impact, once.result.impact, 'the same landing');
    assert.deepEqual(
      sliced.result.events.map((e) => [e.kind, e.t]),
      once.result.events.map((e) => [e.kind, e.t]),
      'the same events at the same instants',
    );
  });

  if (record.manual)
    test(`${f.designation}: a burn by hand is the same physics: against the motion it comes down, along it it stays up`, () => {
      const [site, dated, sea] = where(f);
      const x = steer(f.plan, site, dated, sea);
      const at = coastOf(plan).on;
      const s = shown.coast.samples.find((p) => p.t >= at);
      const back = byHand(
        f.plan,
        s.t,
        s.v.map((c) => -c / Math.hypot(...s.v)),
      );
      const down = flyWhole(back, site, dated, sea, x, 10, 'published');
      assert.equal(down.coast.samples.at(-1).phase, 'down', 'straight against the motion at the record’s instant, it comes down');
      // (the body he lands in: his own, where he leaves the ship, or the first that comes down, where he rides it down)
      const his = plan.craft[0].crew?.alone ?? downOf(plan).bodies[0].id;
      assert.ok(down.down?.landed[his], 'and the pilot lands');
      const along = flyWhole(
        byHand(
          f.plan,
          s.t,
          s.v.map((c) => c / Math.hypot(...s.v)),
        ),
        site,
        dated,
        sea,
        x,
        10,
        'published',
      );
      assert.notEqual(along.coast.samples.at(-1).phase, 'down', 'along the motion it does not');
      const l = down.down.landed[his];
      console.log(
        `  #   by hand, straight against the motion at the record’s instant: down at ${l.latitude.toFixed(2)} N ${l.longitude.toFixed(2)} E, ${(down.coast.results.alongTrack / 1000).toFixed(0)} km along and ${(down.coast.results.crossTrack / 1000).toFixed(0)} km across the record’s landing`,
      );
    });

  if (downOf(plan))
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
      holdChecks(checksOf('descent'), value, missesOf(f.id, 'descent'), { name: `${f.designation}, descent` });
    });
}

test('Vostok 1’s lock: the code is the one Kamanin checked on the ship that morning, and the other the histories give is named beside it', async () => {
  const { flight: v } = await import('../missions/ussr/vostok/flights/vostok-1/flight.ts');
  const code = v.plan.record.manual.code;
  assert.equal(code.value, 145);
  assert.equal(code.confidence, 'documented');
  assert.match(code.source, /шифр \(145\) логического замка/, 'in the diary’s own words');
  assert.match(code.source, /1-2-5/, 'and the disagreement said');
  // every key of the code is a key of the cabin's lock
  const keys = v.models
    .find((m) => m.id === 'vehicle')
    .cabin.controls.filter((c) => c.does?.startsWith('code:'))
    .map((c) => c.does.slice(5));
  for (const d of String(code.value)) assert.ok(keys.includes(d), `key ${d} is on the panel`);
});
