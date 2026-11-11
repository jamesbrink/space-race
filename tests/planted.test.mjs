import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { cycleLength, Gait, JOINTS, pose } from '../src/viewer/gait.ts';

// A planted foot stays where it was planted: the leg's angles follow from the foot's place and
// the hips', the foot rocks from its heel to its toes as a foot does, and a figure that stops
// steps its feet home instead of sliding them.

const DEG = Math.PI / 180;
/** The test figure's legs (a 0.43 m thigh, a 0.42 m shin, the ankle 0.08 m over the sole), and its foot: the ball 0.15 m ahead of the ankle, the heel 0.06 m behind. */
const LIMBS = { thigh: 0.43, shin: 0.42, ankle: 0.08 };
const LEG = 0.93;
const TOES = 0.15;
const HEEL = 0.06;

/**
 * Where a posed foot meets the ground: `x` is where the point of its sole under the ankle would
 * be with the foot flat on what it is standing on (its heel, its toes, or all of it), metres
 * ahead of the hip; `y` is how far its lowest point is above the ground.
 */
function footing(p, side) {
  const thigh = p[`UpperLeg.${side}`];
  const knee = p[`LowerLeg.${side}`];
  const hips = LEG + p.rise;
  const ax = -(LIMBS.thigh * Math.sin(thigh) + LIMBS.shin * Math.sin(thigh + knee));
  const ay = hips - (LIMBS.thigh * Math.cos(thigh) + LIMBS.shin * Math.cos(thigh + knee));
  // how the foot is pitched in the world (toes down is positive): the turns above it, and its own
  const pitch = thigh + knee + p[`Foot.${side}`];
  const point = (fx, fy) => [ax + fx * Math.cos(pitch) + fy * Math.sin(pitch), ay - fx * Math.sin(pitch) + fy * Math.cos(pitch)];
  const heel = point(-HEEL, -LIMBS.ankle);
  const toe = point(TOES, -LIMBS.ankle);
  if (Math.abs(heel[1] - toe[1]) < 0.003) return { x: ax, y: Math.min(heel[1], toe[1]) };
  return heel[1] < toe[1] ? { x: heel[0] + HEEL, y: heel[1] } : { x: toe[0] - TOES, y: toe[1] };
}

test('at a walk and at a run a foot is on the ground where it was planted while the hips go over it', () => {
  for (const [speed, from, to, mostly, slide, lift] of [
    // a walk: the whole half of the cycle; the foot comes down over its first moments (it reaches the ground a little after the leg is furthest forward)
    [1.4, 0.25, 0.75, 0.85, 0.025, 0.04],
    // a run: a tenth of the cycle, either side of the hips passing over
    [4, 0.445, 0.555, 1, 0.01, 0.01],
  ]) {
    const cycle = cycleLength(speed, LEG);
    const spot = 0.5 * cycle + footing(pose({ phase: 0.5, speed, limbs: LIMBS }), 'L').x;
    let frames = 0;
    let planted = 0;
    let furthest = 0;
    let highest = 0;
    let lowest = 0;
    for (let phase = from; phase <= to + 1e-9; phase += 0.0025) {
      const foot = footing(pose({ phase, speed, limbs: LIMBS }), 'L');
      const off = Math.abs(phase * cycle + foot.x - spot);
      furthest = Math.max(furthest, off);
      highest = Math.max(highest, foot.y);
      lowest = Math.min(lowest, foot.y);
      frames++;
      if (off < 0.01 && Math.abs(foot.y) < 0.01) planted++;
    }
    assert.ok(
      planted / frames >= mostly,
      `${speed} m/s: within a centimetre of the ground and of its spot for ${Math.round((100 * planted) / frames)}% of its stance`,
    );
    assert.ok(furthest < slide, `${speed} m/s: never more than ${slide} m from its spot: ${furthest}`);
    assert.ok(highest < lift && lowest > -0.01, `${speed} m/s: between ${lowest} and ${highest} m off the ground`);
  }
});

/** A gait on the test figure's legs, not breathing. */
function walker() {
  const gait = new Gait();
  gait.limbs = LIMBS;
  gait.leg = LEG;
  gait.breathing = false;
  return gait;
}
/** Is this leg wholly its planted foot's at this moment? (The gait says; before it did, the half of the cycle the foot is down.) */
function heldTo(moment, side) {
  if (moment.feet) return moment.feet[side].hold >= 1;
  const d = moment.phase - (side === 'L' ? 0.5 : 0);
  return Math.abs(d - Math.round(d)) < 0.2;
}

test('walked by a gait, a planted foot does not move over the ground: at any frame rate, speeding up, slowing down, between a walk and a run', () => {
  for (const [name, fps, want] of [
    ['a walk at 60 frames a second', 60, [[0, 1.4]]],
    ['a walk at 144', 144, [[0, 1.4]]],
    ['a run', 60, [[0, 4]]],
    ['a slow walk', 60, [[0, 0.7]]],
    [
      'a walk, a run, a walk',
      60,
      [
        [0, 1.4],
        [3, 4],
        [6, 1.4],
      ],
    ],
    [
      'a walk that slows and quickens',
      60,
      [
        [0, 1.4],
        [2.2, 0.6],
        [3.1, 1.4],
        [4.3, 0.9],
      ],
    ],
  ]) {
    const gait = walker();
    const dt = 1 / fps;
    let speed = want[0][1];
    let gone = 0;
    const down = { L: null, R: null };
    let wander = 0;
    let held = 0;
    for (let t = 0; t < 9; t += dt) {
      const target = want.findLast(([at]) => at <= t)[1];
      speed += (target - speed) * (1 - Math.exp(-dt / 0.2));
      gait.advance(speed * dt, speed, false, dt);
      gone += speed * dt;
      if (t < 1.5) continue; // (into its stride)
      const moment = gait.moment;
      const p = pose(moment);
      for (const side of ['L', 'R']) {
        if (!heldTo(moment, side)) {
          down[side] = null;
          continue;
        }
        const foot = footing(p, side);
        const at = gone + foot.x;
        down[side] ??= { least: at, most: at };
        down[side].least = Math.min(down[side].least, at);
        down[side].most = Math.max(down[side].most, at);
        wander = Math.max(wander, down[side].most - down[side].least);
        held++;
        assert.ok(Math.abs(foot.y) < 0.01, `${name}: a planted foot is ${foot.y} m off the ground at ${t.toFixed(2)} s`);
      }
    }
    assert.ok(held > 80, `${name}: a leg is its planted foot's for ${held} frames`);
    assert.ok(wander < 0.01, `${name}: a planted foot wanders ${wander} m over the ground`);
  }
});

test('stopping dead, the feet are not slid under the body: each that is out of place is lifted and stepped home', () => {
  for (const at of [0.05, 0.25, 0.4, 0.6, 0.75, 0.9]) {
    const gait = walker();
    const dt = 1 / 60;
    for (let i = 0; i < 200; i++) gait.advance(1.4 * dt, 1.4, false, dt);
    while (Math.abs(gait.phase - at) > 0.012) gait.advance(1.4 * dt, 1.4, false, dt);
    let last = pose(gait.moment);
    const feet = { L: footing(last, 'L'), R: footing(last, 'R') };
    const slid = { L: 0, R: 0 };
    let t = 0;
    let stir = 2;
    let turned = 0;
    while (stir && t < 3) {
      stir = gait.advance(0, 0, false, dt);
      t += dt;
      const p = pose(gait.moment);
      for (const side of ['L', 'R']) {
        const foot = footing(p, side);
        // on the ground this frame and the last: how far it went is how far it slid
        if (foot.y < 0.005 && feet[side].y < 0.005) slid[side] += Math.abs(foot.x - feet[side].x);
        feet[side] = foot;
      }
      for (const j of JOINTS) turned = Math.max(turned, Math.abs(p[j] - last[j]));
      last = p;
    }
    assert.ok(t < 1.2, `stopped at phase ${at}: standing still after ${t} s`);
    for (const side of ['L', 'R']) {
      assert.ok(slid[side] < 0.015, `stopped at phase ${at}: the ${side} foot slid ${slid[side]} m on the ground`);
      assert.ok(
        Math.abs(feet[side].x) < 0.025 && Math.abs(feet[side].y) < 0.005,
        `stopped at phase ${at}: the ${side} foot ends under its hip`,
      );
    }
    // (a knee bends fast as a straight leg is lifted: that much, and no more)
    assert.ok(turned < 25 * DEG, `stopped at phase ${at}: no joint turns more than ${turned / DEG} degrees in a frame`);
  }
});

test('setting off again, the standing feet are where the stride takes them from', () => {
  const gait = walker();
  const dt = 1 / 60;
  let last = pose(gait.moment);
  let turned = 0;
  let speed = 0;
  for (let t = 0; t < 2; t += dt) {
    speed += (1.4 - speed) * (1 - Math.exp(-dt / 0.2));
    gait.advance(speed * dt, speed, false, dt);
    const p = pose(gait.moment);
    for (const j of JOINTS) turned = Math.max(turned, Math.abs(p[j] - last[j]));
    last = p;
  }
  assert.ok(turned < 12 * DEG, `from standing into a walk no joint turns more than ${turned / DEG} degrees in a frame`);
});

/** A stick figure with the fifteen joints, as the ragdoll's tests build it. */
function figure() {
  const root = new THREE.Group();
  const made = {};
  const add = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    (made[parent] ?? root).add(o);
    made[name] = o;
  };
  add('Hips', null, 0, 0.98, 0);
  add('Spine', 'Hips', 0, 0.15, 0);
  add('Head', 'Spine', 0, 0.5, 0);
  for (const [s, x] of [
    ['L', 1],
    ['R', -1],
  ]) {
    add(`UpperArm${s}`, 'Spine', 0.2 * x, 0.4, 0);
    add(`LowerArm${s}`, `UpperArm${s}`, 0, -0.3, 0);
    add(`Hand${s}`, `LowerArm${s}`, 0, -0.27, 0);
    add(`UpperLeg${s}`, 'Hips', 0.09 * x, -0.05, 0);
    add(`LowerLeg${s}`, `UpperLeg${s}`, 0, -0.43, 0);
    add(`Foot${s}`, `LowerLeg${s}`, 0, -0.42, 0);
  }
  root.updateMatrixWorld(true);
  return { root, made };
}

test('getting up goes from however the figure lay to the first of the get-up without a jump, and is wholly the get-up after half a second', () => {
  for (const faceDown of [true, false])
    for (const fps of [30, 60, 120]) {
      const { root, made } = figure();
      const gait = new Gait();
      gait.apply(root);
      // lying as a fall left it: every joint somewhere of its own, the hips on the ground
      let seed = 3;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
      for (const o of Object.values(made)) o.quaternion.setFromEuler(new THREE.Euler(random() * 1.6, random() * 0.8, random() * 0.8));
      made.Hips.position.set(0.03, 0.14, -0.05);
      const lay = Object.fromEntries(Object.entries(made).map(([k, o]) => [k, o.quaternion.clone()]));
      gait.rise(faceDown, root);
      gait.apply(root);
      for (const [k, o] of Object.entries(made))
        assert.ok(o.quaternion.angleTo(lay[k]) < 1e-6, `${k} is where it lay as the get-up starts`);
      assert.ok(made.Hips.position.distanceTo(new THREE.Vector3(0.03, 0.14, -0.05)) < 1e-9);
      const dt = 1 / fps;
      let fastest = 0;
      let hips = 0;
      for (let t = 0; t < 1.2; t += dt) {
        const before = Object.fromEntries(Object.entries(made).map(([k, o]) => [k, o.quaternion.clone()]));
        const y = made.Hips.position.clone();
        gait.advance(0, 0, false, dt);
        gait.apply(root);
        for (const [k, o] of Object.entries(made)) fastest = Math.max(fastest, before[k].angleTo(o.quaternion) / dt);
        hips = Math.max(hips, made.Hips.position.distanceTo(y) / dt);
      }
      assert.ok(
        fastest < 600 * DEG,
        `${faceDown ? 'prone' : 'supine'} at ${fps} fps: no joint turns faster than ${fastest / DEG} degrees a second`,
      );
      assert.ok(hips < 1.2, `${faceDown ? 'prone' : 'supine'} at ${fps} fps: the hips go at ${hips} m/s at the most`);
      // and after the half second it is the get-up's own pose, exactly
      const { root: other, made: keyed } = figure();
      const fresh = new Gait();
      fresh.apply(other);
      fresh.rise(faceDown);
      for (let t = 0; t < 1.2; t += dt) fresh.advance(0, 0, false, dt);
      fresh.apply(other);
      for (const [k, o] of Object.entries(made))
        assert.ok(o.quaternion.angleTo(keyed[k].quaternion) < 1e-6, `${k} is on the get-up's keys`);
    }
});

test('a figure is stood as built to be measured without its stride being forgotten', () => {
  const { root, made } = figure();
  const gait = new Gait();
  gait.apply(root);
  // running, then off an edge and falling
  for (let i = 0; i < 90; i++) gait.advance(4 / 60, 4, false, 1 / 60);
  for (let i = 0; i < 30; i++) gait.advance(4 / 60, 4, true, 1 / 60, false, 2 + i * 0.1);
  gait.apply(root);
  const falling = Object.fromEntries(Object.entries(made).map(([k, o]) => [k, o.quaternion.clone()]));
  const moment = JSON.stringify(gait.moment);
  assert.ok(gait.moment.fall > 0.9 && made.UpperArmL.quaternion.angleTo(new THREE.Quaternion()) > 0.5, 'arms out, falling');
  gait.asBuilt(root);
  for (const o of Object.values(made)) assert.ok(o.quaternion.angleTo(new THREE.Quaternion()) < 1e-9, 'every joint as built');
  assert.equal(made.Hips.position.y, 0.98);
  assert.equal(JSON.stringify(gait.moment), moment, 'and the moment is what it was');
  gait.apply(root);
  for (const [k, o] of Object.entries(made)) assert.ok(o.quaternion.angleTo(falling[k]) < 1e-6, `${k} is back in the pose it fell in`);
});

test('a figure sitting down goes from where it stands to its seat as its pose goes from standing to sitting', async () => {
  const { sitAt } = await import('../src/viewer/gait.ts');
  const stand = { position: new THREE.Vector3(1, 0, 2), quaternion: new THREE.Quaternion() };
  const seat = {
    position: new THREE.Vector3(1.9, -0.4, 2.1),
    quaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
  };
  const figure = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const gait = new Gait();
  assert.equal(gait.sitting, 0);
  sitAt(figure, stand, seat, gait.sitting);
  assert.ok(
    figure.position.equals(stand.position) && figure.quaternion.angleTo(stand.quaternion) < 1e-9,
    'standing, it is where it stands',
  );
  // sitting down: the pose eases, and the figure's place with it
  gait.seated = true;
  let last = figure.position.clone();
  let frames = 0;
  while (gait.sitting < 1 && frames < 200) {
    gait.advance(0, 0, false, 1 / 60);
    sitAt(figure, stand, seat, gait.sitting);
    const went = figure.position.distanceTo(last);
    assert.ok(went < 0.12, `it goes ${went} m in a frame`);
    // (never in the seat while still mostly standing, as it was when it was put there at once)
    const there = 1 - figure.position.distanceTo(seat.position) / stand.position.distanceTo(seat.position);
    assert.ok(Math.abs(there - gait.sitting) < 0.2, `${there} of the way to the seat, ${gait.sitting} sat down`);
    last = figure.position.clone();
    frames++;
  }
  assert.ok(frames > 12 && frames < 60, `sat down in ${frames} frames`);
  assert.ok(
    figure.position.distanceTo(seat.position) < 1e-9 && figure.quaternion.angleTo(seat.quaternion) < 1e-9,
    'sat, it is in its seat',
  );
  // and getting out is the same the other way
  gait.seated = false;
  while (gait.sitting > 0) {
    gait.advance(0, 0, false, 1 / 60);
    sitAt(figure, stand, seat, gait.sitting);
    assert.ok(figure.position.distanceTo(last) < 0.12);
    last = figure.position.clone();
  }
  assert.ok(figure.position.distanceTo(stand.position) < 1e-9);
});
