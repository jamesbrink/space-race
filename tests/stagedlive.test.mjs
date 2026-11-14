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
import { ascend, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { DEG, dot, length, siteFrame, unit } from '../src/world/frames.ts';
import { elementsOf } from '../src/world/orbit.ts';
import { julianDate } from '../src/world/time.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const flight = all.find((f) => f.id === 'ussr/vostok/vostok-1');
const o = flight.orbital;
const site = siteFrame(flight.site);
const jd = julianDate(flight.launch);
const sea = flight.site.seaLevel.value;
const x = steer(o, site, jd, sea);
const batch = ascend(o, site, jd, sea, x);
const last = o.stages.length - 1;

/**
 * Fly the live vehicle from the pad with a pilot until `until` (s) or the spacecraft parts. `hands` and `steps` let a test
 * take over; `cut` reports each stage's stop. Returns the states at each stage's stop and the last.
 */
function fly({ guidance = true, sequence = true, steps, hands, prescribed = false, until = 2000 } = {}) {
  const v = stagedVehicle(o, site, jd, sea, x);
  const pilot = stagedPilot(v, x, site, jd, sea, { guidance, sequence, steps, hands, prescribed });
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
    o.stages.forEach((_, i) => {
      if (v.burning(was, i) && !v.burning(s, i) && stops[i] === undefined) stops[i] = was;
    });
    if (stops[last] && !lastCut) lastCut = stops[last];
  }
  return { v, s, stops, lastCut };
}

/** The orbit and the cutoff's height, speed and climb as staged.ts's summary has them, from a state. */
function cutoff(s) {
  const el = elementsOf(s.r, s.v);
  const radius = o.orbit.radius.value;
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

/**
 * Where the steered run is outside a tolerance, by how much and why, as tests/sim.test.mjs keeps its misses: the test
 * fails on a miss nobody recorded, on one that has moved past its slack, and on one that has come within tolerance.
 */
const MISSES = {
  speed: {
    by: -5.6,
    slack: 1,
    why:
      'the attitude is steered, not placed: through the ten seconds of the pitch-over the guidance loop (stagedlive.ts OMEGA, chosen) lags the law by ' +
      'some hundredths of a degree, and the gravity turn that follows the motion carries that on to the cutoff. With the attitude prescribed the ' +
      'same vehicle gives the batch run back to a hundredth of a metre a second (the test before), so the forces are one; and the steered result ' +
      'moves by several metres a second with the loop’s stiffness, which is chosen, so it is not tuned to come in',
  },
};

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
  const d = compare(cutoff(lastCut), 'steered');
  for (const k of Object.keys(TOLERANCE)) {
    const miss = MISSES[k];
    const out = Math.abs(d[k]) > TOLERANCE[k];
    if (miss) {
      console.log(`# steered ${k}: a recorded miss, ${d[k].toFixed(2)} against ${miss.by} ± ${miss.slack}: ${miss.why}`);
      assert.ok(out, `${k} has come within tolerance: take it off MISSES`);
      assert.ok(Math.abs(d[k] - miss.by) <= miss.slack, `${k}: ${d[k]} has moved past ${miss.by} ± ${miss.slack}`);
    } else assert.ok(!out, `${k}: ${d[k]} against ${TOLERANCE[k]}, and not recorded`);
  }
});

test('the live staged vehicle: the strap-ons let go while they burn take their thrust and propellant with them', () => {
  const early = 60;
  const sep = o.stages[0].separation.value;
  const v = stagedVehicle(o, site, jd, sea, x);
  const pilot = stagedPilot(v, x, site, jd, sea, { guidance: true, sequence: true });
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
  const gone = 4 * o.stages[0].mass.value - (4 * o.stages[0].propellant.value - aboard);
  assert.ok(
    Math.abs(before - after - gone) < 5,
    `what they weighed, with what was left in them, left too: ${before - after} against ${gone}`,
  );
  // flown on by the law and the record's sequence, it does not get as high or as fast
  while (!s.parted && !s.landed && s.t < 2000) s = v.tick(s, pilot);
  const good = fly().s;
  console.log(`# at the spacecraft's parting: ${(length(s.v)).toFixed(0)} m/s against ${length(good.v).toFixed(0)} m/s flown as recorded`);
  assert.ok(length(s.v) < length(good.v) - 500);
});

test('the live staged vehicle: an engine cut by hand stops burning and leaves what it had not burned aboard', () => {
  const v = stagedVehicle(o, site, jd, sea, x);
  const pilot = stagedPilot(v, x, site, jd, sea, { guidance: true, sequence: false });
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
  const v = stagedVehicle(o, site, jd, sea, x);
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
  const v = stagedVehicle(o, site, jd, sea, x, o.ascent.steering.authority.value * 1.05 * DEG);
  const pilot = stagedPilot(v, x, site, jd, sea, { guidance: true, sequence: true });
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
