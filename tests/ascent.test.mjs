// src/viewer/ascent.ts: where the scene puts the flown vehicle. A flight flown by hand is placed by its own samples'
// attitude; flown by the autopilot it is the record's flight, so the two placements must agree, and neither may jump.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { Ascent } from '../src/viewer/ascent.ts';
import { siteFrame } from '../src/world/frames.ts';

const TR = flight.trajectory;
const PAD = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  flight.models.find((m) => m.id === flight.flies.model).rotationY ?? 0,
);
const live = () => {
  const v = vehicle(TR, siteFrame(flight.site), flight.site.seaLevel.value);
  const flown = flyLive(v, autopilot(v), 0.1);
  return {
    samples: flown.samples,
    duration: flown.results.duration,
    cutoff: TR.engine.cutoff.value,
    dropped: flight.flies.drops.map((d) => d.at),
    live: true,
    out: { drogue: flown.results.drogueAt, main: flown.results.mainAt },
  };
};
const at = (ascent, t) => {
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  assert.ok(ascent.place(t, PAD, p, q), `placed at ${t}`);
  return { p, q };
};

test('a flight flown live under the autopilot is placed where the record’s is, and turned as it is', () => {
  const record = Ascent.of(flight);
  const flown = Ascent.of(flight);
  flown.use(live());
  // just off the pad the model stands as it was built, where it was built
  const start = at(flown, 0.2);
  assert.ok(start.q.angleTo(PAD) < 0.002, 'upright as on the pad');
  assert.ok(start.p.distanceTo(at(record, 0.2).p) < 0.05, 'where the record has it');
  // going up: the same flight but for the lift the record's leaves out (tests/vehicle.test.mjs: 2 per cent in height and range)
  for (const t of [10, 40, 80, 120, 140]) {
    const a = at(record, t);
    const b = at(flown, t);
    const far = a.p.length();
    assert.ok(
      a.p.distanceTo(b.p) < Math.max(1, 0.02 * far),
      `position at ${t} s: ${a.p.distanceTo(b.p).toFixed(1)} m apart, ${far.toFixed(0)} m out`,
    );
    // (about the nose the record's placement has no roll of its own: compare where the nose points)
    const nose = (q) => new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    assert.ok(nose(a.q).angleTo(nose(b.q)) < THREE.MathUtils.degToRad(1), `attitude at ${t} s`);
  }
});

test('a live flight’s model never jumps: not at cutoff, the tower, separation, retrofire, the parachutes', () => {
  const run = live();
  const ascent = Ascent.of(flight);
  ascent.use(run);
  const speed = (t) => run.samples.findLast((s) => s.t <= t).speed;
  let before = at(ascent, 0.5);
  let worst = { turn: 0, at: 0 };
  for (let t = 0.5 + 1 / 60; t < run.duration; t += 1 / 60) {
    const now = at(ascent, t);
    const moved = now.p.distanceTo(before.p);
    // (the Earth's turning is in `speed`, space-fixed, so it bounds the motion in the site's frame with room to spare)
    assert.ok(moved <= (speed(t) * 1.5) / 60 + 1.0, `position at ${t.toFixed(2)} s moved ${moved.toFixed(2)} m in a frame`);
    const turned = now.q.angleTo(before.q);
    if (turned > worst.turn) worst = { turn: turned, at: t };
    before = now;
  }
  // the fastest it turns is the turnaround on the jets and the swing as a parachute fills: well under 3 degrees a frame
  assert.ok(
    worst.turn < THREE.MathUtils.degToRad(3),
    `turned ${THREE.MathUtils.radToDeg(worst.turn).toFixed(2)} degrees in a frame at ${worst.at.toFixed(2)} s`,
  );
});

test('after it lands, a live flight stays where it came down; the record’s goes back to its pad', () => {
  const run = live();
  const flown = Ascent.of(flight);
  flown.use(run);
  assert.ok(flown.flying(run.duration + 60));
  assert.ok(at(flown, run.duration + 60).p.distanceTo(at(flown, run.duration).p) < 1e-6);
  const record = Ascent.of(flight);
  assert.equal(record.flying(run.duration + 60), false);
});

test('the live model does not jump as the reference changes at separation', () => {
  const run = live();
  const ascent = Ascent.of(flight);
  ascent.use(run);
  const first = run.samples.find((s) => s.phase !== 'powered' && s.phase !== 'coast').t;
  // a microsecond either side of every sample round the parting: the origin moves no further than its speed allows
  for (const s of run.samples.filter((x) => Math.abs(x.t - first) < 1)) {
    const moved = at(ascent, s.t - 1e-6).p.distanceTo(at(ascent, s.t + 1e-6).p);
    assert.ok(moved < 0.02, `at ${s.t.toFixed(2)} s the model moved ${moved.toFixed(3)} m in two microseconds`);
  }
});

test('a flight being flown is drawn at the clock’s instant, not held at its last tick, as what it has shed is', () => {
  // The cockpit flies whole ticks to the nearest one to the clock, so the clock is up to half a tick past the last sample.
  // Held there, the vehicle was drawn up to 5 ms behind the clock in some frames and not in others while what it had shed
  // was flown to the clock itself: at 2 km/s the booster stood 10 m nearer or further from the capsule frame to frame,
  // and the turnaround went in steps of a quarter faster and slower.
  const whole = live();
  for (const T of [100, 151.6, 160, 400]) {
    const k = whole.samples.findIndex((s) => s.t > T);
    const flying = { ...whole, samples: whole.samples.slice(0, k), duration: Infinity };
    const head = flying.samples.at(-1);
    const now = Ascent.of(flight);
    now.use(flying);
    const truth = Ascent.of(flight);
    truth.use(whole);
    for (const ahead of [0.001, 0.004, 0.0099]) {
      const t = head.t + ahead;
      const drawn = at(now, t);
      const was = at(truth, t);
      const held = at(now, head.t);
      assert.ok(
        held.p.distanceTo(was.p) > 0.5 * ahead * head.speed,
        `T+${T}: the test can tell a held vehicle from one drawn at the clock`,
      );
      assert.ok(
        drawn.p.distanceTo(was.p) < 0.02,
        `T+${T}, ${ahead * 1000} ms past the last tick: drawn ${drawn.p.distanceTo(was.p).toFixed(3)} m from where it was`,
      );
      const off = THREE.MathUtils.radToDeg(drawn.q.angleTo(was.q));
      assert.ok(off < 0.005, `T+${T}, ${ahead * 1000} ms past the last tick: turned ${off.toFixed(4)} degrees from how it lay`);
    }
  }
});

test('the batch run is cached by where it flew from, not by the hardware alone', async () => {
  const { flownOnce } = await import('../src/sim/fly.ts');
  const site = siteFrame(flight.site);
  const here = flownOnce(TR, site, flight.site.seaLevel.value);
  assert.equal(flownOnce(TR, site, flight.site.seaLevel.value), here);
  const there = flownOnce(TR, { ...site, latitude: site.latitude + 0.1 }, flight.site.seaLevel.value);
  assert.notEqual(there, here);
  assert.notEqual(there.samples[0].latitude, here.samples[0].latitude);
});

// The spacecraft's centre of mass as the model has it: `capsule.centre` up the stack from its base, the model's origin
// being `flies.datum` up it. A landmark of the model, to hold both placements to.
const CENTRE = new THREE.Vector3(0, TR.body.capsule.centre.value - flight.flies.datum, 0);
const landmark = ({ p, q }) => CENTRE.clone().applyQuaternion(q).add(p);

test('on the record’s run the spacecraft turns about its own centre of mass, not about the plane it sat on the booster by', async () => {
  const { flownOnce } = await import('../src/sim/fly.ts');
  const { ecefToSite, inertialToEcef } = await import('../src/world/frames.ts');
  const { EARTH_ROTATION_RATE } = await import('../src/world/bodies.ts');
  const site = siteFrame(flight.site);
  const record = Ascent.of(flight);
  const { samples } = flownOnce(TR, site, flight.site.seaLevel.value);
  const separation = TR.separation.at.value;
  // from the point flown (the run's own samples, at their own instants) the centre of mass stays where it was at
  // separation, all through the turnaround and after it; the model's origin, 0.4 m from it, is what goes round
  const from = (s) => landmark(at(record, s.t)).sub(new THREE.Vector3(...ecefToSite(site, inertialToEcef(s.r, EARTH_ROTATION_RATE * s.t))));
  const after = samples.filter((s) => s.t > separation + 0.5 && s.t < flight.flies.turned + 60);
  const first = from(after[0]);
  let swung = 0;
  for (const s of after) {
    const off = from(s).distanceTo(first);
    assert.ok(off < 1e-3, `at ${s.t} s the centre of mass is ${off.toFixed(3)} m from where it was held at separation`);
    swung = Math.max(swung, at(record, s.t).q.angleTo(at(record, after[0].t).q));
  }
  assert.ok(swung > 2, 'and it has turned nearly end for end meanwhile');
  // and nothing jumps as the booster leaves
  const moved = at(record, separation - 1e-4).p.distanceTo(at(record, separation + 1e-4).p);
  assert.ok(moved < 1, `the model moved ${moved.toFixed(3)} m across separation`);
});

test('a flight flown by hand is drawn with its centre of mass where the simulator has it, however it has turned', async () => {
  const { ecefToSite, inertialToEcef } = await import('../src/world/frames.ts');
  const { EARTH_ROTATION_RATE } = await import('../src/world/bodies.ts');
  const site = siteFrame(flight.site);
  const run = live();
  const ascent = Ascent.of(flight);
  ascent.use(run);
  const alone = run.samples.filter((s) => s.phase !== 'powered' && s.phase !== 'coast');
  assert.ok(alone.length > 100);
  for (const s of alone.filter((_, i) => i % 25 === 0)) {
    const sim = new THREE.Vector3(...ecefToSite(site, inertialToEcef(s.centre, EARTH_ROTATION_RATE * s.t)));
    const off = landmark(at(ascent, s.t)).distanceTo(sim);
    assert.ok(off < 0.01, `at ${s.t.toFixed(1)} s (${s.phase}) the model’s centre of mass is ${off.toFixed(3)} m from the simulator’s`);
  }
  // so it comes down with that centre on the surface, and its parachute lies down on that surface: not on one as far
  // above it as the model's origin stands above the pad
  const end = run.samples.at(-1);
  // (the surface is under its blunt end, `capsule.base` below the centre of mass: sim/vehicle.ts)
  const surface = ecefToSite(site, inertialToEcef(end.centre, EARTH_ROTATION_RATE * end.t))[1] - (TR.body.capsule.base?.value ?? 0);
  const main = flight.flies.chutes.findIndex((c) => c.on === 'main');
  const down = ascent.chute(main, run.duration + 30, PAD);
  assert.ok(down && down.down > 0, 'the main parachute is down');
  assert.ok(
    Math.abs(down.floor - surface) < 0.01,
    `it lies on a surface ${(down.floor - surface).toFixed(2)} m from the one the spacecraft came down on`,
  );
  // the jets are drawn in the body's axes at that same centre
  const frame = ascent.bodyFrame(PAD);
  const origin = new THREE.Vector3().setFromMatrixPosition(frame);
  assert.ok(origin.distanceTo(CENTRE) < 1e-6, `the body's frame is hung ${origin.distanceTo(CENTRE).toFixed(3)} m from the centre of mass`);
});

test('on the pad the model stands where it was built, and the support it stands on is out of the reckoning a few seconds up', () => {
  const record = Ascent.of(flight);
  const home = new THREE.Vector3(...flight.models.find((m) => m.id === flight.flies.model).position);
  assert.ok(at(record, 1e-6).p.distanceTo(home) < 1e-3, 'just lit, it is where it stands');
  let before = at(record, 1e-6).p;
  for (let t = 0.1; t < 8; t += 0.1) {
    const now = at(record, t).p;
    assert.ok(now.y >= before.y - 1e-9, `it does not sink at ${t.toFixed(1)} s`);
    before = now;
  }
});

test('what an abort off the pad leaves behind is still there: the booster, let go at the instant of liftoff, stands where it stood', async () => {
  const { Sheds } = await import('../src/sim/shed.ts');
  const site = siteFrame(flight.site);
  const v = vehicle(TR, site, flight.site.seaLevel.value);
  // unlit, the escape rocket fired: as the flight deck does it (cockpit.ts)
  let state = v.start();
  const samples = [v.sample(state)];
  const sheds = new Sheds(TR, site, flight.site.seaLevel.value);
  const pilot = () => ({ throttle: 0, pitch: 0, yaw: 0, roll: 0, abort: true });
  for (let i = 0; i < 300; i++) {
    state = v.tick(state, pilot);
    if (i % 10 === 9) samples.push(v.sample(state));
  }
  sheds.follow(state);
  assert.ok(state.shed.booster && state.separation, 'the spacecraft has left the booster');
  const when = { separation: state.separation.t };
  const run = {
    samples,
    duration: Infinity,
    cutoff: Number.NEGATIVE_INFINITY,
    dropped: flight.flies.drops.map((d) => when[d.on] ?? Infinity),
    live: true,
    out: { drogue: Infinity, main: Infinity },
    sheds,
  };
  const ascent = Ascent.of(flight);
  ascent.use(run);
  const i = flight.flies.drops.findIndex((d) => d.on === 'separation');
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  assert.ok(ascent.shed(i, 2.5, PAD, p, q), 'the booster is placed (it is not lost for having left at the very start)');
  const home = new THREE.Vector3(...flight.models.find((m) => m.id === flight.flies.model).position);
  assert.ok(p.distanceTo(home) < 0.05, `it stands where the model stood: ${p.distanceTo(home).toFixed(3)} m off`);
  assert.ok(q.angleTo(PAD) < 0.002, 'upright');
  // and the engine that was never lit shows no fire
  assert.equal(ascent.burn(0.3).on, 0);
  assert.equal(ascent.burn(2.5).on, 0);
});
