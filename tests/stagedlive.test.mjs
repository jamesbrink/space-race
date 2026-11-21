// The live staged vehicle (src/sim/stagedlive.ts): the ascent of an orbital flight stepped and steered, on the same
// stages, engines, drag, air and gravity as the batch run (src/sim/staged.ts). Flown by its guidance on the record's
// sequence it must reproduce the batch ascent's last cutoff within tolerances set here before it was flown; flown
// wrongly, the physics must say so: a stage let go while it burns takes its thrust and its propellant with it, and an
// engine cut by hand leaves what it had not burned aboard.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ascend, givenUp, partingAt, sequenceOf, stagesOf, steer } from '../src/sim/staged.ts';
import { downOf } from '../src/sim/descent.ts';
import { coastOf, flyDown, flyEjected, flyOrbit, heightsBall } from '../src/sim/orbital.ts';
import { abortAt } from '../src/sim/plan.ts';
import { ejectedVerdict } from '../src/sim/verdict.ts';
import { orbitalRelease } from '../src/sim/run.ts';
import { apart, Sheds } from '../src/sim/shed.ts';
import { impactTitle } from '../src/sim/contact.ts';
import { aboutAxis, turn } from '../src/sim/rigid.ts';
import { guided } from '../src/sim/fliers.ts';
import { handRange } from '../src/sim/lever.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';
import { elementsOf } from '../src/world/orbit.ts';
import { holdChecks, missesOf } from './misses.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const flight = all.find((f) => f.id === 'ussr/vostok/vostok-1');
const plan = flight.plan;
const stages = stagesOf(plan);
const seq = sequenceOf(plan);
const site = siteFrame(flight.site);
const dated = frameOf(flight);
const sea = flight.site.seaLevel.value;
const x = steer(flight.plan, site, dated, sea);
const batch = ascend(flight.plan, site, dated, sea, x);
const last = stages.length - 1;

/**
 * Fly the live vehicle from the pad with a pilot until `until` (s) or the spacecraft parts. `hands` and `steps` let a test
 * take over; `cut` reports each stage's stop. Returns the states at each stage's stop and the last.
 */
function fly({ guidance = true, sequence = true, steps, hands, prescribed = false, until = 2000 } = {}) {
  const v = stagedVehicle(flight.plan, site, dated, sea, x);
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance, sequence, steps, hands, prescribed });
  let s = v.start();
  s = v.tick(s, {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'ignite', stage: 0 },
      { kind: 'ignite', stage: 1 },
    ],
  });
  const stops = [];
  let lastCut = null;
  while (!s.parted && !s.landed && s.t < until) {
    const was = s;
    s = v.tick(s, pilot);
    if (s.ticks === was.ticks && !s.parted) break;
    stages.forEach((_, i) => {
      if (v.burning(was, i) && !v.burning(s, i) && stops[i] === undefined) stops[i] = was;
    });
    if (stops[last] && !lastCut) lastCut = stops[last];
  }
  return { v, s, stops, lastCut };
}

/** The orbit and the cutoff's height, speed and climb as staged.ts's summary has them, from a state. */
function cutoff(s) {
  const el = elementsOf(s.r, s.v);
  const radius = heightsBall(plan, site);
  return {
    at: s.t,
    altitude: length(s.r) - radius,
    speed: length(s.v),
    climb: Math.asin(dot(unit(s.r), unit(s.v))) / DEG,
    perigee: el.a * (1 - el.e) - radius,
    apogee: el.a * (1 + el.e) - radius,
    inclination: el.i / DEG,
  };
}

// Tolerances, set before the live vehicle was flown: what a rigid body steered to the law (a tick behind it, turning at
// a stated acceleration, events on a hundredth-second grid, the integrator summed per tick) may differ from the law
// flown with its attitude prescribed and its cut found within a step.
const TOLERANCE = { at: 0.5, altitude: 1000, speed: 2, climb: 0.1, inclination: 0.05 };

function compare(live, label) {
  const b = batch.summary;
  const want = { at: b.cutoffAt, altitude: b.cutoffAltitude, speed: b.cutoffSpeed, climb: b.cutoffClimb, inclination: b.inclination };
  const out = {};
  for (const k of Object.keys(TOLERANCE)) {
    const d = live[k] - want[k];
    out[k] = d;
    console.log(
      `# ${label} ${k.padEnd(12)} live ${live[k].toFixed(3).padStart(10)}  batch ${want[k].toFixed(3).padStart(10)}  differ ${d.toFixed(3)} (tolerance ${TOLERANCE[k]})`,
    );
  }
  console.log(
    `# ${label} the orbit at the cutoff: live ${(live.perigee / 1000).toFixed(1)} by ${(live.apogee / 1000).toFixed(1)} km, batch ${(b.perigee / 1000).toFixed(1)} by ${(b.apogee / 1000).toFixed(1)} km`,
  );
  return out;
}

test('the live staged vehicle with the law’s attitude prescribed is the batch ascent: one set of stages, engines, drag, air and gravity', () => {
  const { lastCut } = fly({ prescribed: true });
  assert.ok(lastCut, 'the last stage stopped');
  const d = compare(cutoff(lastCut), 'prescribed');
  for (const k of Object.keys(TOLERANCE)) assert.ok(Math.abs(d[k]) <= TOLERANCE[k], `${k}: ${d[k]} against ${TOLERANCE[k]}`);
});

test('the live staged vehicle, steered by its guidance on the record’s sequence, reproduces the batch ascent’s last cutoff; every miss is recorded', () => {
  const { lastCut, v } = fly();
  assert.ok(lastCut, 'the last stage stopped');
  assert.ok(v.authority > 0, 'steered, not placed');
  const live = cutoff(lastCut);
  compare(live, 'steered');
  // (as tests/sim.test.mjs keeps its misses: the batch run's cutoff is the check, at tolerances set before it was flown)
  const b = batch.summary;
  const want = { at: b.cutoffAt, altitude: b.cutoffAltitude, speed: b.cutoffSpeed, climb: b.cutoffClimb, inclination: b.inclination };
  holdChecks(
    Object.entries(TOLERANCE).map(([id, tolerance]) => ({ id, value: want[id], tolerance })),
    (id) => live[id],
    missesOf(flight.id, 'live'),
    { name: 'steered', log: (l) => console.log(`# steered ${l}`) },
  );
});

test('the live staged vehicle: the strap-ons let go while they burn take their thrust and propellant with them', () => {
  const early = 60;
  const sep = seq.stages[0].sep;
  const v = stagedVehicle(flight.plan, site, dated, sea, x);
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance: true, sequence: true });
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'ignite', stage: 0 },
      { kind: 'ignite', stage: 1 },
    ],
  });
  while (s.t < early - 1e-9) s = v.tick(s, pilot);
  const before = v.mass(s);
  const thrust = v.thrust(s);
  const aboard = v.left(s)[0];
  s = v.tick(s, { pitch: 0, yaw: 0, roll: 0, steps: [{ kind: 'separate', stage: 0 }] });
  const after = v.mass(s);
  console.log(
    `# let go at T+${early} s: ${(thrust / 1000).toFixed(0)} kN before, ${(v.thrust(s) / 1000).toFixed(0)} kN after; ${(aboard / 1000).toFixed(2)} t of propellant gone with them (the record lets them go at ${sep} s)`,
  );
  assert.ok(v.thrust(s) < thrust * 0.3, 'the strap-ons’ thrust left with them');
  // (less the core's hundredth of a second of burning in the tick it left on)
  const gone = 4 * stages[0].body.mass.value - (4 * stages[0].tank.load.value - aboard);
  assert.ok(
    Math.abs(before - after - gone) < 5,
    `what they weighed, with what was left in them, left too: ${before - after} against ${gone}`,
  );
  // flown on by the law and the record's sequence, it does not get as high or as fast
  while (!s.parted && !s.landed && !s.broke && s.t < 2000) s = v.tick(s, pilot);
  const good = fly().s;
  console.log(`# at the spacecraft's parting: ${(length(s.v)).toFixed(0)} m/s against ${length(good.v).toFixed(0)} m/s flown as recorded`);
  assert.ok(length(s.v) < length(good.v) - 500);
});

test('the live staged vehicle: an engine cut by hand stops burning and leaves what it had not burned aboard', () => {
  const v = stagedVehicle(flight.plan, site, dated, sea, x);
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance: true, sequence: false });
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'ignite', stage: 0 },
      { kind: 'ignite', stage: 1 },
    ],
  });
  while (s.t < 200 - 1e-9) s = v.tick(s, pilot);
  s = v.tick(s, {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'cut', stage: 1 },
      { kind: 'cut', stage: 0 },
    ],
  });
  const left = v.left(s);
  const mass = v.mass(s);
  for (let k = 0; k < 500; k++) s = v.tick(s, pilot);
  console.log(
    `# cut at T+200 s: ${(left[1] / 1000).toFixed(2)} t left in the core and ${(left[0] / 1000).toFixed(2)} t in the strap-ons, still aboard five seconds on`,
  );
  assert.equal(v.burning(s, 1), false);
  assert.equal(v.thrust(s), 0);
  assert.deepEqual(v.left(s), left);
  assert.equal(v.mass(s), mass);
  assert.ok(left[1] > 10_000);
  // and it cannot be lit again: an engine is started once
  s = v.tick(s, { pitch: 0, yaw: 0, roll: 0, steps: [{ kind: 'ignite', stage: 1 }] });
  assert.equal(v.burning(s, 1), false);
});

test('the live staged vehicle: by hand, the steering turns it while the engines burn, and not when none does', () => {
  const v = stagedVehicle(flight.plan, site, dated, sea, x);
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'ignite', stage: 0 },
      { kind: 'ignite', stage: 1 },
    ],
  });
  for (let k = 0; k < 200; k++) s = v.tick(s, { pitch: 1, yaw: 0, roll: 0 });
  // two seconds at full throw: the stated acceleration's rate, about the pitch axis only
  assert.ok(Math.abs(s.w[1] - v.authority * 2) < 1e-9 * v.authority + 1e-12, `${s.w[1]}`);
  assert.equal(s.w[0], 0);
  assert.equal(s.w[2], 0);
  s = v.tick(s, {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'cut', stage: 0 },
      { kind: 'cut', stage: 1 },
    ],
  });
  const w = s.w[1];
  for (let k = 0; k < 100; k++) s = v.tick(s, { pitch: -1, yaw: 0, roll: 0 });
  assert.equal(s.w[1], w, 'nothing burning, nothing steers');
});

test('the live staged vehicle: what the estimated steering acceleration is worth (5 per cent more)', () => {
  const base = cutoff(fly().lastCut);
  const v = stagedVehicle(flight.plan, site, dated, sea, x, plan.craft[0].thrusters.find((t) => t.authority).authority.value * 1.05 * DEG);
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance: true, sequence: true });
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'ignite', stage: 0 },
      { kind: 'ignite', stage: 1 },
    ],
  });
  let cut = null;
  while (!s.parted && s.t < 2000) {
    const was = s;
    s = v.tick(s, pilot);
    if (!cut && v.burning(was, last) && !v.burning(s, last)) cut = was;
  }
  const more = cutoff(cut);
  console.log(
    `# ascent.steering.authority (estimated) +5 %: cutoff speed ${(more.speed - base.speed).toFixed(2)} m/s, height ${(more.altitude - base.altitude).toFixed(0)} m`,
  );
  assert.ok(Number.isFinite(more.speed));
});

/**
 * Fly the live vehicle on the record's law and sequence with a hand's `asks` (each `{ at, steps }` given at that instant,
 * besides the record's) and `hands` (the sticks, guidance off), until the spacecraft parts, the vehicle is down or broken
 * up, or `until`. Returns the last state and the first at or after each instant in `look`.
 */
function asked({ on = VOSTOK, asks = [], sequence = true, guidance = true, hands, until = 2000, look = [] } = {}) {
  const { plan, site, dated, sea, x } = on;
  const v = stagedVehicle(plan, site, dated, sea, x);
  let now = 0;
  const queue = [...asks].sort((a, b) => a.at - b.at);
  const pilot = stagedPilot(v, x, site, dated, sea, {
    guidance,
    sequence,
    hands: hands ? () => hands(now) : undefined,
    steps: () => {
      const out = [];
      while (queue.length && queue[0].at <= now + 1e-9) out.push(...queue.shift().steps);
      return out;
    },
  });
  let s = v.tick(v.start(), { pitch: 0, yaw: 0, roll: 0, steps: on.liftoff });
  const at = {};
  while (!s.parted && !s.landed && !s.broke && s.t < until) {
    now = s.t;
    for (const t of look) if (at[t] === undefined && s.t >= t - 1e-9) at[t] = s;
    s = v.tick(s, pilot);
  }
  return { v, s, at };
}
const said = (s, title) => s.said.find((n) => n.title === title);
/** A flight's live vehicle's makings, as `asked` flies it: its plan, where, its law's solution, and the stages lit at liftoff. */
function rig(f) {
  const where = siteFrame(f.site);
  const frame = frameOf(f);
  const level = f.site.seaLevel.value;
  const lit = f.plan.events.find((e) => e.id === 'liftoff').do.map((a) => a.ignite);
  return {
    plan: f.plan,
    site: where,
    dated: frame,
    sea: level,
    x: f === flight ? x : steer(f.plan, where, frame, level),
    stages: stagesOf(f.plan),
    liftoff: stagesOf(f.plan).flatMap((st, i) => (lit.includes(st.engine.id) ? [{ kind: 'ignite', stage: i }] : [])),
  };
}
const VOSTOK = rig(flight);
const TITAN = rig(all.find((f) => f.id === 'usa/gemini/gt-3'));
/** Stage `i`'s engine's thrust, and how it is lit hot into the stage below (the joint below's `hot`, this engine's). */
const hotStage = (i, on = VOSTOK) => ({
  thrust: on.stages[i].engine.thrust,
  hot: on.plan.craft[0].joints.find((j) => j.hot?.engine === on.stages[i].engine.id).hot,
});

test('hot staging at its moment, by hand on the Titan: the second stage lit fires into the first, a share of its push reaching the stack, and the one command cuts the first stage and lets it go as the record had them', () => {
  const E = hotStage(1, TITAN);
  const share = E.hot.open.value * Math.sin(E.hot.turn.value * DEG);
  const v0 = stagedVehicle(TITAN.plan, TITAN.site, TITAN.dated, TITAN.sea, TITAN.x);
  const lit = v0.sequence.find((k) => k.step.kind === 'ignite' && k.step.stage === 1).at;
  const sets = v0.setsOff(1);
  const wait = (kind) => sets.find((k) => k.step.kind === kind)?.wait;
  console.log(
    `# the Titan's staging signal at ${lit} s: lit, the first stage cut ${wait('cut')} s and let go ${wait('separate').toFixed(2)} s after`,
  );
  assert.deepEqual(
    sets.map((k) => k.step),
    [
      { kind: 'cut', stage: 0 },
      { kind: 'separate', stage: 0 },
    ],
  );
  assert.equal(wait('cut'), 0);
  assert.ok(wait('separate') > 0.5 && wait('separate') < 1, `${wait('separate')}`);
  // the sequencer off: what follows the lighting is the hardware's, not the record's sequence
  const { v, s, at } = asked({
    on: TITAN,
    sequence: false,
    asks: [{ at: lit, steps: [{ kind: 'ignite', stage: 1 }] }],
    look: [lit + 0.3],
    until: lit + 20,
  });
  const joined = at[lit + 0.3];
  assert.ok(!Number.isFinite(joined.stages[0].gone), 'joined still');
  const pushing = v.thrust(joined);
  console.log(
    `# lit at ${lit} s, joined: the second stage pushes ${(pushing / 1000).toFixed(1)} kN of its ${(E.thrust.vacuum.value / 1000).toFixed(1)}; ${s.scorch[1].toFixed(2)} s of jet on the first stage's top against ${E.hot.endures.value} s`,
  );
  assert.ok(Math.abs(pushing - E.thrust.vacuum.value * share) < 0.02 * E.thrust.vacuum.value, `${pushing}`);
  assert.equal(v.firing(joined)?.stage, 1);
  assert.ok(said(s, 'Hot staging').text.includes('as the hardware'), said(s, 'Hot staging').text);
  console.log(`# ${said(s, 'Hot staging').text}`);
  assert.equal(s.broke, null);
  assert.ok(
    Math.abs(s.stages[0].to - lit) < 0.02 && Math.abs(s.stages[0].gone - lit - wait('separate')) < 0.02,
    JSON.stringify(s.stages[0]),
  );
  assert.ok(Math.abs(s.scorch[1] - wait('separate')) < 0.02, `${s.scorch[1]}`);
  assert.equal(s.chain, undefined, 'nothing left pending');
});

test('hot staging early by hand is one act: lit a minute early the R-7’s core, and half a minute early the Titan’s first stage, are cut and let go by the same command, and nothing burns through', () => {
  const { s } = asked({ asks: [{ at: 240, steps: [{ kind: 'ignite', stage: 2 }] }], until: 260 });
  console.log(`# Vostok 1 lit at 240 s: ${said(s, 'Hot staging').text}`);
  assert.equal(s.broke, null, s.broke?.text);
  assert.ok(Math.abs(s.stages[1].to - 240) < 0.02 && Math.abs(s.stages[1].gone - 240) < 0.02, JSON.stringify(s.stages[1]));
  assert.ok(s.stages[2].from <= 240 + 1e-9 && s.scorch[2] < 0.02, `${s.scorch[2]}`);
  const titan = asked({ on: TITAN, asks: [{ at: 120, steps: [{ kind: 'ignite', stage: 1 }] }], until: 140 }).s;
  assert.equal(titan.broke, null, titan.broke?.text);
  assert.ok(Math.abs(titan.stages[0].to - 120) < 0.02 && titan.stages[0].gone < 121, JSON.stringify(titan.stages[0]));
});

test('hot staging with the strap-ons on: the core is let go but they press it on, and its top burns through unless they are dropped; the deck is told how long it has', () => {
  const E = hotStage(2);
  // lit at 100 s, nothing else asked: the strap-ons push the core on, and the jet plays on it past what it stands
  const { v, s, at } = asked({ asks: [{ at: 100, steps: [{ kind: 'ignite', stage: 2 }] }], look: [101] });
  assert.ok(said(s, 'Let go, still pushing'), 'the core let go, pressed on');
  const firing = v.firing(at[101]);
  assert.equal(firing?.stage, 2);
  assert.ok(Math.abs(firing.left - (E.hot.endures.value - 1)) < 0.05, `${firing.left}`);
  assert.ok(s.broke, 'it broke up');
  console.log(`# lit at 100 s with the strap-ons on: ${s.broke.text}`);
  assert.equal(s.broke.by, 'scorch');
  assert.ok(Math.abs(s.broke.t - (100 + E.hot.endures.value)) < 0.05, `${s.broke.t}`);
  assert.equal(s.parted, null);
  assert.ok(
    s.stages.every((g) => g.gone <= s.broke.t + 1e-9 && g.to <= s.broke.t + 1e-9),
    'every engine out, every stage apart',
  );
  // the strap-ons dropped two seconds on: the core goes with them, and the third stage flies on alone
  const dropped = asked({
    asks: [
      { at: 100, steps: [{ kind: 'ignite', stage: 2 }] },
      { at: 102, steps: [{ kind: 'separate', stage: 0 }] },
    ],
    look: [103],
    until: 120,
  });
  assert.equal(dropped.s.broke, null, dropped.s.broke?.text);
  assert.ok(Math.abs(dropped.s.stages[1].gone - 102) < 0.02, JSON.stringify(dropped.s.stages[1]));
  assert.ok(Math.abs(dropped.s.scorch[2] - 2) < 0.05, `${dropped.s.scorch[2]}`);
  assert.equal(dropped.v.firing(dropped.at[103]), null);
});

const APOLLO11 = rig(all.find((f) => f.id === 'usa/apollo/apollo-11'));
const APOLLO7 = rig(all.find((f) => f.id === 'usa/apollo/apollo-7'));
const AGENA = rig(all.find((f) => f.id === 'usa/gemini/gatv-5003'));
/** The index in the live vehicle's stages of the stage an engine is. */
const stageOf = (on, engine) => on.stages.findIndex((st) => st.engine.id === engine);

test('an upper stage lit by hand into a closed interstage (its joint not vented) is shut in against the stage below: none of its push reaches the stack, the stack breaks up and the deck says why and what the record’s sequence did', () => {
  const agenaParts = AGENA.plan.craft[0].joints.find((j) => j.id === 'target-separation').at.value;
  for (const [on, engine, at, what] of [
    [APOLLO11, 'j2-outboard', 100, 'the S-II lit on the S-IC'],
    [APOLLO11, 'sivb-j2', 300, 'the S-IVB lit on the S-II'],
    [APOLLO7, 'sivb-j2', 100, 'the S-IVB lit on the S-IB'],
    [AGENA, 'agena-engine', agenaParts - 20, 'the Agena lit on its Atlas'],
  ]) {
    const i = stageOf(on, engine);
    assert.ok(i > 0, `${what}: ${engine} is a stage`);
    const {
      v,
      s,
      at: seen,
    } = asked({ on, sequence: false, asks: [{ at, steps: [{ kind: 'ignite', stage: i }] }], look: [at - 0.5, at + 0.02] });
    const before = v.thrust(seen[at - 0.5]);
    const lit = seen[at + 0.02];
    assert.ok(v.burning(lit, i), `${what}: it lit`);
    assert.ok(
      Math.abs(v.thrust(lit) - before) < 0.05 * Math.max(before, 1e5),
      `${what}: none of its push reaches the stack (${v.thrust(lit)} against ${before})`,
    );
    assert.ok(s.broke, `${what}: it broke up`);
    assert.equal(s.broke.by, 'closed', `${what}: ${s.broke.text}`);
    assert.ok(s.broke.t - at < 0.5 && s.broke.t >= at, `${what}: broke up at ${s.broke.t}`);
    assert.equal(s.broke.confidence, 'estimated');
    assert.ok(/not vented/.test(s.broke.text) && /no interlock/.test(s.broke.text), s.broke.text);
    const note = said(s, 'Lit into a closed interstage');
    assert.ok(note, `${what}: said so`);
    assert.ok(/not vented/.test(note.text) && /record/.test(note.text), note.text);
    assert.equal(s.chain, undefined, `${what}: it sets nothing else off`);
    console.log(`# ${what} at ${at.toFixed(1)} s: ${note.text} | ${s.broke.text}`);
  }
});

test('a stage let go of the one above it by a hand is cut by its letting go, as the staging signals cut it: the Titan’s first stage, let go burning, parts at once', () => {
  const { s } = asked({ on: TITAN, asks: [{ at: 100, steps: [{ kind: 'separate', stage: 0 }] }], until: 110 });
  assert.equal(said(s, 'Let go, still pushing'), undefined, 'not pressed on');
  assert.ok(Math.abs(s.stages[0].to - 100) < 0.02 && Math.abs(s.stages[0].gone - 100) < 0.02, JSON.stringify(s.stages[0]));
  assert.equal(s.broke, null);
});

test('the strap-ons dropped early: they leave as heavy as they are, and what they strike of each other is said to be detached hardware’s, not the spacecraft’s', () => {
  const T = 80;
  const v = stagedVehicle(plan, site, dated, sea, x);
  const queue = [{ kind: 'separate', stage: 0 }];
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance: true, sequence: true, steps: () => [] });
  let s = v.tick(v.start(), { pitch: 0, yaw: 0, roll: 0, steps: VOSTOK.liftoff });
  const samples = [v.sample(s, 0)];
  while (s.t < T - 1e-9) {
    s = v.tick(s, pilot);
    samples.push(v.sample(s, 0));
  }
  const before = v.mass(s);
  s = v.tick(s, { ...pilot(s), steps: queue });
  samples.push(v.sample(s, 0));
  const when = s.stages[0].gone;
  assert.ok(Math.abs(when - T) < 0.02);
  const unit = v.unitMass(s, 0, when);
  // (less the core's hundredth of a second of burning in the tick it left on)
  assert.ok(Math.abs(before - v.mass(s) - 4 * unit) < 5, `${before - v.mass(s)} against 4 x ${unit}`);
  const defs = plan.craft[0].sheds.filter((d) => d.on.startsWith(`${seq.stages[0].joint}/`));
  assert.equal(defs.length, 4);
  console.log(`# let go at ${T} s: each strap-on ${unit.toFixed(0)} kg, where the record's leaves ${defs[0].mass.value} kg`);
  assert.ok(unit > defs[0].mass.value + 10_000);
  const sheds = new Sheds(plan, site, sea, { frame: dated });
  for (const d of defs) sheds.add(orbitalRelease(plan, d, samples, when, undefined, unit));
  const hits = [];
  while (s.t < T + 15) {
    const was = s;
    s = v.tick(s, pilot);
    hits.push(
      ...sheds.meet({ ...was, station: 0, mass: v.mass(was) }, { ...s, station: 0, mass: v.mass(s) }, 0).hits,
      ...sheds.siblings(was.t, s.t),
    );
  }
  const between = hits.filter((h) => h.name.split(' and ').length === 2);
  console.log(
    `# ${between.length} contacts between them, the hardest ${Math.max(0, ...between.map((h) => h.speed)).toFixed(1)} m/s: ${[...new Set(hits.map(impactTitle))].join(', ')}`,
  );
  assert.ok(between.length > 0, 'let go in that air, they meet');
  for (const h of between) {
    assert.equal(h.detached, true, h.name);
    assert.match(impactTitle(h), /^Detached hardware /);
  }
  assert.ok(!hits.some((h) => impactTitle(h) === 'Spacecraft contact'), 'nothing struck the vehicle');
});

test('a part let go under thrust stays pressed on until what is under it stops pushing: the spacecraft rides the third stage to its cutoff', () => {
  const { s } = asked({ asks: [{ at: 400, steps: [{ kind: 'separate', stage: 2 }] }] });
  assert.ok(said(s, 'Let go, still pushing'));
  assert.ok(Math.abs(s.parted.t - batch.summary.cutoffAt) < 0.5, `${s.parted.t}`);
  console.log(`# let go at 400 s: parted at ${s.parted.t.toFixed(2)} s, when the third stage stopped`);
});

test('the spacecraft cannot leave while the fairing is over it, nor the core while the strap-ons push it on', () => {
  const inside = asked({ asks: [{ at: 140, steps: [{ kind: 'separate', stage: 2 }] }], until: 160 }).s;
  assert.ok(said(inside, 'Held inside the fairing'));
  assert.equal(inside.parted, null);
  // the core let go at 60 s: its own command shuts it, but the strap-ons on it push the lot on until they go
  const { s } = asked({ asks: [{ at: 60, steps: [{ kind: 'separate', stage: 1 }] }], until: 130 });
  assert.ok(said(s, 'Let go, still pushing'));
  assert.ok(Math.abs(s.stages[1].to - 60) < 0.02, `${s.stages[1].to}`);
  assert.ok(Math.abs(s.stages[1].gone - seq.stages[0].sep) < 0.02, `${s.stages[1].gone}`);
});

test('an abort as the deck asks it (Molodtsov’s modes from 150 s): every stage burning cut and the spacecraft let go, it parts once nothing presses it; from 150 to 700 s its descent module comes down as from orbit', () => {
  // (deck/phases/ascent.ts `abort`: the steps the deck asks, as the record's mode for the instant says; the hardware does the rest)
  const stepsAt = (t) => {
    const v = stagedVehicle(flight.plan, site, dated, sea, x);
    const s = asked({ asks: [], look: [t], until: t + 0.5 }).at[t];
    return [...stages.flatMap((_, i) => (v.burning(s, i) ? [{ kind: 'cut', stage: i }] : [])), { kind: 'separate', stage: last }];
  };
  for (const t of [200, 650]) {
    const steps = stepsAt(t);
    const { s } = asked({ asks: [{ at: t, steps }], until: t + 60 });
    assert.ok(s.parted, `parted after an abort at ${t} s`);
    assert.ok(
      s.stages.every((g) => !Number.isFinite(g.from) || g.to <= s.parted.t + 1e-9),
      'every engine lit is out',
    );
    assert.ok(s.parted.t - t < 5, `parted ${(s.parted.t - t).toFixed(2)} s after`);
    const up = (length(s.parted.r) - heightsBall(plan, site)) / 1000;
    console.log(
      `# abort at ${t} s (${steps.map((k) => `${k.kind} ${k.stage}`).join(', ')}): parted at ${s.parted.t.toFixed(2)} s, ${up.toFixed(1)} km up`,
    );
    if (t > 150 && t < 700) {
      // the descent module separates at once and comes down as from orbit, the pilot ejected at 7 km by its own switch
      const down = partingAt(givenUp(plan), s.parted.t);
      const coast = flyOrbit(down, site, dated, sea, 10, s.parted);
      const end = coast.samples.at(-1);
      assert.equal(end.phase, 'down');
      assert.ok(Math.abs(end.altitude - coastOf(down).floor) < 1, `handed over at ${end.altitude} m`);
      const bodies = flyDown(down, dated, sea, end);
      const pilot = downOf(down).bodies.find((b) => b.id !== downOf(down).bodies[0].id && b.chutes.length && !b.leaves)?.id;
      console.log(
        `#   down: ${Object.entries(bodies.landed)
          .map(([id, l]) => `${id} ${l.speed.toFixed(1)} m/s`)
          .join(', ')}`,
      );
      assert.ok(bodies.landed[pilot] && bodies.landed[pilot].speed < 10, 'the pilot comes down under his canopy');
      console.log(
        `#   the module from ${up.toFixed(0)} km: ${Math.max(...coast.samples.map((p) => p.g)).toFixed(1)} g at most, the pilot down at T+${bodies.landed[pilot].at.toFixed(0)} s, ${bodies.landed[pilot].speed.toFixed(1)} m/s`,
      );
    }
  }
});

test('an abort before 150 s as the deck asks it (Molodtsov’s first two modes): the pilot ejected from the stack, at once to 40 s, as the stack falls through 7 km after every engine is cut to 150 s; the stack flies on', () => {
  // (deck/phases/ascent.ts `abort`, `eject`, and orbitdeck.ts `fly`: the mode's own data says what to do, plan.ts `AbortMode.escape`)
  const centre = flight.flies.datum + plan.record.centre.value;
  const pilot = plan.craft[0].crew.alone;
  const ejected = (v, at) => {
    const down = flyEjected(plan, dated, sea, at, { ground: v.ground });
    const verdict = ejectedVerdict(
      plan,
      down,
      (x) => `T+${x.toFixed(0)}`,
      () => 0,
    );
    return { down, verdict };
  };
  for (const t of [5, 20, 35]) {
    const mode = abortAt(plan, t);
    assert.ok(mode.escape.eject && !mode.escape.eject.falling && !mode.escape.cut, `${t} s: the seat at once, nothing else`);
    const { v, at } = asked({ look: [t], until: t + 0.5 });
    const s = at[t];
    const from = v.aboard(s, centre);
    assert.ok(Math.abs(length(sub(from.r, s.r)) - centre) < 1e-6, 'from the spacecraft, up the stack');
    const { down, verdict } = ejected(v, from);
    assert.equal(down.ejected, from.t);
    assert.ok(down.landed[pilot], 'the pilot comes down');
    assert.equal(down.landed[downOf(plan).bodies[0].id], undefined, 'the descent module stays on the stack');
    const h = dated.place(from.r, from.t).height - sea;
    console.log(
      `# abort at ${t} s (the seat at once, ${(h / 1000).toFixed(2)} km up): ${Object.entries(down.landed)
        .map(([id, l]) => `${id} ${l.speed.toFixed(1)} m/s at T+${l.at.toFixed(0)}`)
        .join(', ')}; ${verdict.how}; survivable ${verdict.survivable}`,
    );
  }
  /** Every engine burning cut at `t` on the live vehicle of `of`, flown on until it is down or broken up: where the seat would fire, if it came. */
  const cutAt = (of, t, fall) => {
    const v = stagedVehicle(of, site, dated, sea, x);
    let now = 0;
    let cuts = [];
    const pilotOf = stagedPilot(v, x, site, dated, sea, {
      guidance: true,
      sequence: true,
      steps: () => (Math.abs(now - t) < 0.005 ? cuts : []),
    });
    let s = v.tick(v.start(), {
      pitch: 0,
      yaw: 0,
      roll: 0,
      steps: [
        { kind: 'ignite', stage: 0 },
        { kind: 'ignite', stage: 1 },
      ],
    });
    let out = null;
    while (!s.landed && !s.broke && s.t < 2000) {
      now = s.t;
      if (Math.abs(now - t) < 0.005) cuts = stages.flatMap((_, i) => (v.burning(s, i) ? [{ kind: 'cut', stage: i }] : []));
      const was = s;
      s = v.tick(s, pilotOf);
      out ??= v.fell(was, s, centre, fall);
    }
    assert.ok(
      s.stages.every((g) => !Number.isFinite(g.from) || g.to <= t + 0.02),
      'every engine lit is out',
    );
    const end = s.broke
      ? `broke up at T+${s.broke.t.toFixed(1)}, ${((dated.place(s.r, s.t).height - sea) / 1000).toFixed(1)} km up (${s.broke.by})`
      : `down at T+${s.landed.t.toFixed(1)}, ${s.landed.speed.toFixed(0)} m/s`;
    return { v, s, out, end };
  };
  for (const t of [41, 60, 120]) {
    const mode = abortAt(plan, t);
    assert.ok(mode.escape.cut && mode.escape.eject?.falling, `${t} s: every engine cut, the seat as it falls through a height`);
    const fall = mode.escape.eject.falling.value;
    const { v, s, out, end } = cutAt(plan, t, fall);
    // (falling as it was left, with no moment of the air on it: no figure read, simulator.md), it turns across the wind
    // and breaks up by its bending load before it is down to 7 km: the seat never fires, and the flight ends there
    if (out) {
      assert.ok(!s.broke || s.broke.t > out.t, 'the seat fires only from a stack that has not broken up');
      const { down } = ejected(v, out);
      assert.ok(down.landed[pilot], 'the pilot comes down');
    } else assert.ok(s.broke || s.landed, 'it ends broken up or down, the pilot aboard');
    console.log(
      `# abort at ${t} s (every engine cut): the stack ${end}${out ? `; through ${fall / 1000} km falling at T+${out.t.toFixed(1)}` : `, before it fell through ${fall / 1000} km: the seat never fired`}`,
    );
  }
  // the seat's trigger alone, on a stack with no structure to break up (a test's: no record flies it): down through 7 km falling, he leaves
  const unbroken = structuredClone(plan);
  unbroken.craft[0].limits = unbroken.craft[0].limits.filter((l) => l.of !== 'qAlpha' && l.of !== 'axial');
  const fall = abortAt(plan, 60).escape.eject.falling.value;
  const { v, out, end } = cutAt(unbroken, 60, fall);
  assert.ok(out, 'it falls through 7 km');
  assert.ok(Math.abs(dated.place(out.r, out.t).height - sea - fall) < 1e-6, 'at 7 km');
  assert.ok(dot(out.v, out.r) < 0, 'falling');
  const { down, verdict } = ejected(v, out);
  assert.equal(down.ejected, out.t);
  assert.ok(down.landed[pilot], 'the pilot comes down');
  console.log(
    `# unbreakable, cut at 60 s: through ${fall / 1000} km falling at T+${out.t.toFixed(1)}, ${length(sub(out.v, cross(dated.spin, out.r))).toFixed(0)} m/s through the air, ${(down.peak[pilot].q / 1000).toFixed(0)} kPa at most on him; the stack ${end}; ${verdict.how}; survivable ${verdict.survivable}`,
  );
});

test('a crew with no seats (the Voskhods) is not ejected: their records’ modes say so, and nothing flies a seat they did not have', () => {
  for (const f of all.filter((g) => g.plan?.record?.aborts && g.plan.craft[0].crew && g.plan.craft[0].crew.alone === undefined)) {
    for (const mode of f.plan.record.aborts) assert.ok(!mode.escape?.eject, `${f.id}: ${mode.does}`);
    assert.equal(
      flyEjected(f.plan, frameOf(f), f.site.seaLevel.value, { t: 10, r: [6.4e6, 0, 0], v: [0, 0, 0] }, { ground: () => 0 }),
      null,
    );
    console.log(`# ${f.id}: ${f.plan.record.aborts.map((m) => `to ${m.until.value} s ${m.escape ? 'flown' : 'said'}`).join('; ')}`);
  }
});

test('the structure: turned across the wind at its greatest dynamic pressure it breaks up by its bending load; an engine lit only on the pad is not lit again', () => {
  const { s } = asked({ guidance: false, hands: (t) => ({ pitch: t > 50 && t < 56 ? 1 : 0, yaw: 0, roll: 0 }) });
  assert.equal(s.broke?.by, 'bending');
  console.log(`# turned at 50 s: ${s.broke.text}`);
  assert.ok(s.broke.t < 56, `${s.broke.t}`);
  // the record's own run comes nowhere near its limits
  const record = asked().s;
  console.log(
    `# the record’s run: bending at most ${(100 * record.strain.most).toFixed(0)} per cent of the limit, ${(100 * record.axial.most).toFixed(0)} per cent of the axial`,
  );
  assert.equal(record.broke, null);
  // (in still air its bending is under half the limit; through the day's wind, some 20 m/s across its path at the greatest
  // pressure, which its programme does not turn into (staged.ts `lawOf`), about 63 per cent: sim/air.ts `skyOf`)
  assert.ok(record.strain.most < 0.75 && record.axial.most < 0.9);
  const relit = asked({
    sequence: false,
    asks: [
      { at: 10, steps: [{ kind: 'cut', stage: 0 }] },
      { at: 12, steps: [{ kind: 'ignite', stage: 0 }] },
    ],
    until: 13,
  }).s;
  assert.ok(said(relit, 'Not lit'));
  assert.ok(Math.abs(relit.stages[0].to - 10) < 0.02);
});

test('a stage lit with nothing pushing the stack is said to be lit in free fall; one lit beside another burning is not', () => {
  const fall = asked({
    sequence: false,
    asks: [
      {
        at: 10,
        steps: [
          { kind: 'cut', stage: 0 },
          { kind: 'cut', stage: 1 },
        ],
      },
      { at: 12, steps: [{ kind: 'separate', stage: 1 }] },
      { at: 14, steps: [{ kind: 'ignite', stage: 2 }] },
    ],
    until: 15,
  }).s;
  assert.ok(Number.isFinite(fall.stages[1].gone), 'the core and strap-ons gone');
  assert.ok(said(fall, 'Lit in free fall'));
  const pushed = asked({ sequence: false, asks: [{ at: 14, steps: [{ kind: 'ignite', stage: 2 }] }], until: 15 }).s;
  assert.ok(!said(pushed, 'Lit in free fall'));
});

test('the sequencer taken and handed back: off and on again with nothing due between, the record’s flight to the last bit; off over a step, that step comes when it is on again', () => {
  const fly = (off, on) => {
    const v = stagedVehicle(flight.plan, site, dated, sea, x);
    const options = { guidance: true, sequence: true };
    const pilot = stagedPilot(v, x, site, dated, sea, options);
    let s = v.tick(v.start(), {
      pitch: 0,
      yaw: 0,
      roll: 0,
      steps: [
        { kind: 'ignite', stage: 0 },
        { kind: 'ignite', stage: 1 },
      ],
    });
    while (!s.parted && !s.broke && s.t < 2000) {
      // (the switch read every tick, as the deck's B throws it)
      options.sequence = !(s.t >= off - 1e-9 && s.t < on - 1e-9);
      s = v.tick(s, pilot);
    }
    return s;
  };
  const record = fly(Infinity, Infinity);
  const between = fly(100, 110);
  assert.deepEqual(between.parted, record.parted, 'off and on with nothing due: the same flight');
  const over = fly(115, 125);
  console.log(`# the sequencer off from 115 to 125 s: the strap-ons went at ${over.stages[0].gone.toFixed(2)} s, not ${seq.stages[0].sep}`);
  assert.ok(Math.abs(over.stages[0].gone - 125) < 0.02);
  assert.ok(over.stages[0].to <= 125 + 1e-9);
});

test('a live joint at a tick between kept samples transfers equal and opposite momentum, including in its prediction', () => {
  const v = stagedVehicle(plan, site, dated, sea, x);
  const neutral = { pitch: 0, yaw: 0, roll: 0 };
  // The lower stages and coverings already gone; an unpowered two-body fixture with the last stage still loaded.
  const previous = v.tick(v.start(), {
    ...neutral,
    steps: [
      ...seq.drops.map((d) => ({ kind: 'drop', id: d.joint })),
      ...seq.stages.slice(0, -1).map((_, stage) => ({ kind: 'separate', stage })),
    ],
  });
  const t = seq.stages[last].sep + 0.07;
  const was = {
    ...previous,
    t,
    ticks: Math.round(t * 100),
    r: [6800000, 0, 0],
    v: [1, 7600, 3],
    held: false,
    q: aboutAxis([0, 0, 1], 0.4),
  };
  const s = v.tick(was, { ...neutral, steps: [{ kind: 'separate', stage: last }] });
  assert.equal(s.parted.t, t);
  const kept = v.mass(s);
  const shed = plan.craft[0].sheds.find((d) => d.on === seq.stages[last].joint);
  assert.ok(s.parted.stageMass > shed.mass.value, 'the discarded stage still carries its unused load');
  const out = { ...v.sample(s, 0), v: s.parted.v };
  const release = orbitalRelease(plan, shed, [out], t, undefined, s.parted.stageMass);
  assert.equal(release.mass, s.parted.stageMass);
  assert.ok(length(sub(release.r, add(was.r, turn(was.q, [shed.centre.value, 0, 0])))) < 1e-9);
  const dv = sub(s.parted.v, was.v);
  const reaction = sub(release.v, was.v);
  assert.ok(length(dv) > 0);
  assert.ok(length(add(scale(dv, kept), scale(reaction, release.mass))) < 1e-6, 'the pair retains its incoming linear momentum');
  assert.ok(Math.abs(v.mass(was) - kept - release.mass) < 1e-6);
  const flier = guided(plan, site, sea, was, { vehicle: v, state: was, sequence: true, live: true, solved: x, plan });
  flier.prepare();
  const outcome = flier.arrive(t, was.r, was.v, 400000, 'time');
  assert.ok(outcome.events.includes('separation'));
  assert.ok(Math.abs(length(sub(outcome.v, was.v)) - length(dv)) < 1e-10, 'prediction gives the spacecraft the same share');
});

test('a side-mounted part inherits the motion at its own axis and keeps the stack spin in its new frame', () => {
  const value = (value) => ({ value });
  const def = {
    apart: { bearing: 124, across: value(2), pivot: { station: value(3), across: value(1) }, tailOff: value(0), swing: value(0) },
  };
  const release = { r: [1, 2, 3], v: [4, 5, 6], q: aboutAxis(unit([3, 1, 2]), 0.6), w: [0.3, -0.4, 0.5], mass: 7, across: 8, centre: 2 };
  const body = apart(def, release);
  const spin = turn(release.q, release.w);
  assert.ok(length(sub(turn(body.q, body.w), spin)) < 1e-12);
  assert.ok(length(sub(sub(body.v, release.v), cross(spin, sub(body.r, release.r)))) < 1e-12);
});

test('the throttle lever on the live staged vehicle: full it is the record’s run to the bit; lower it holds every stage under it, burns less and stays aboard longer', () => {
  /** Fly to `until` from the pad with the lever at `lever` from `from` (undefined: no lever given at all). */
  const flown = (lever, from = 0, until = 60) => {
    const v = stagedVehicle(flight.plan, site, dated, sea, x);
    const inner = stagedPilot(v, x, site, dated, sea, { guidance: true, sequence: true });
    const pilot = (s) => (lever === undefined || s.t < from ? inner(s) : { ...inner(s), lever: stages.map(() => lever) });
    let s = v.tick(v.start(), {
      pitch: 0,
      yaw: 0,
      roll: 0,
      steps: [
        { kind: 'ignite', stage: 0 },
        { kind: 'ignite', stage: 1 },
      ],
    });
    while (s.t < until - 1e-9 && !s.parted && !s.broke) s = v.tick(s, pilot);
    return { v, s };
  };
  const none = flown(undefined).s;
  const full = flown(1).s;
  assert.equal(full.hand, undefined, 'a lever at full writes nothing');
  assert.deepEqual([full.r, full.v, full.q, full.apparent], [none.r, none.v, none.q, none.apparent], 'the record’s run, to the last bit');
  // (held low for long, the stack flies its programme's angles lower in thicker air: at seven tenths from 20 s it breaks up by bending at 83 s)
  const { v, s: low } = flown(0.7, 20);
  assert.equal(low.broke, null);
  assert.ok(
    low.hand?.every((h) => h.length === 1 && Math.abs(h[0][0] - 20) < 0.02 && h[0][1] === 0.7),
    `each stage held at seven tenths from 20 s: ${JSON.stringify(low.hand)}`,
  );
  assert.ok(v.mass(low) > v.mass(none) + 1000, `less burned: ${v.mass(low).toFixed(0)} kg against ${v.mass(none).toFixed(0)}`);
  assert.equal(v.throttle(low, 1), Math.min(0.7, v.throttle(none, 1)), 'the core: the record’s setting, held under the lever');
  // what is left is the integral of what was asked: three tenths of each stage's flow, from the instant it was set to 60 s
  const at = low.hand[0][0][0];
  const left = v.left(low).map((k, i) => k - v.left(none)[i]);
  stages.slice(0, 2).forEach((st, i) => {
    const want = 0.3 * (60 - at) * st.count * (st.engine.thrust.vacuum.value / (9.80665 * st.engine.isp.vacuum.value));
    assert.ok(Math.abs(left[i] - want) < 1e-3, `stage ${i}: ${left[i]} kg more left, want ${want}`);
  });
  const shy = flown(0.2, 20).s;
  assert.equal(
    shy.hand?.[0]?.[0]?.[1],
    handRange(stages[0].engine).least,
    'under the least the lever holds at the least: a cut is a step of its own',
  );
});
