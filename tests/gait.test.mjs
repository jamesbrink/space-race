import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { cycleLength, Gait, give, JOINTS, jointKey, landing, pose as poseOf, swing, view } from '../src/viewer/gait.ts';

/** The pose at a phase and speed, with whatever else the moment has. */
const pose = (phase, speed, air = 0, more = {}) => poseOf({ phase, speed, air, ...more });

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('standing still, on the ground, every joint is as built', () => {
  for (const phase of [0, 0.13, 0.5, 0.9]) {
    const p = pose(phase, 0);
    for (const j of JOINTS) assert.ok(near(p[j], 0), `${j} at phase ${phase}: ${p[j]}`);
    assert.ok(near(p.rise, 0));
  }
});

test('the right side does half a cycle later what the left side does', () => {
  for (const speed of [0.7, 1.4, 2.5, 4])
    for (let i = 0; i < 20; i++) {
      const a = pose(i / 20, speed);
      const b = pose(i / 20 + 0.5, speed);
      for (const limb of ['UpperLeg', 'LowerLeg', 'Foot', 'UpperArm', 'LowerArm'])
        assert.ok(near(a[`${limb}.L`], b[`${limb}.R`]), `${limb} at ${i / 20}`);
      assert.ok(near(a.rise, b.rise) && near(a.Spine, b.Spine));
    }
});

test('the pose repeats every cycle', () => {
  const a = pose(0.3, 2);
  const b = pose(7.3, 2);
  for (const j of JOINTS) assert.ok(near(a[j], b[j], 1e-9), j);
});

test('a quarter of the way round the left foot is furthest forward and the left arm furthest back', () => {
  const p = pose(0.25, 1.4);
  assert.ok(near(p['UpperLeg.L'], -swing(1.4)), 'forward is a negative turn of a thigh');
  assert.ok(near(p['UpperLeg.R'], swing(1.4)));
  assert.ok(p['UpperArm.L'] > 0.2 && p['UpperArm.R'] < -0.2, 'each arm goes with the opposite leg');
  assert.ok(near(swing(1.4), (25 * Math.PI) / 180, 0.01), 'a walking stride is 25 degrees a side');
});

test('knees only bend one way and elbows only the other, at any speed, anywhere in the cycle, in the air or not', () => {
  for (const speed of [0, 0.5, 1.4, 3, 4, 9])
    for (const air of [0, 0.5, 1])
      for (let i = 0; i < 40; i++) {
        const p = pose(i / 40, speed, air);
        for (const side of ['L', 'R']) {
          assert.ok(p[`LowerLeg.${side}`] >= -1e-12, `knee ${side} at speed ${speed}`);
          assert.ok(p[`LowerArm.${side}`] <= 1e-12, `elbow ${side} at speed ${speed}`);
          assert.ok(Math.abs(p[`UpperLeg.${side}`]) < 1.4 && p[`LowerLeg.${side}`] < 2.2, 'nothing folds further than a leg can');
        }
        assert.ok(p.rise <= 1e-12 && p.rise > -0.2, 'the hips only ever drop a little');
      }
});

test('the knee of the leg swinging forward is the bent one', () => {
  // at phase 0 the left leg is passing under the body on its way forward; half a cycle on it is the planted one
  assert.ok(pose(0, 1.4)['LowerLeg.L'] > pose(0, 1.4)['LowerLeg.R'] + 0.5);
  assert.ok(pose(0.5, 1.4)['LowerLeg.R'] > pose(0.5, 1.4)['LowerLeg.L'] + 0.5);
});

test('a run swings further than a walk, leans into it, and covers more ground a cycle', () => {
  assert.ok(swing(4) > swing(1.4) && swing(1.4) > swing(0.5) && swing(0) === 0);
  assert.ok(pose(0.1, 4).Spine > pose(0.1, 1.4).Spine);
  assert.ok(pose(0.25, 4)['LowerArm.L'] < pose(0.25, 1.4)['LowerArm.L'], 'the elbows come up');
  const walk = cycleLength(1.4);
  const run = cycleLength(4);
  assert.ok(walk > 1.3 && walk < 1.7, `two walking steps: ${walk} m`);
  assert.ok(run > 2.8 && run < 4, `two running steps: ${run} m`);
  // what the legs' swing covers, so a planted foot does not slide: two steps of 2 L sin(swing)
  assert.ok(near(walk, 4 * 0.9 * Math.sin(swing(1.4))));
  assert.ok(near(cycleLength(1.4, 1.0) / cycleLength(1.4, 0.9), 1.0 / 0.9), 'longer legs, longer steps');
});

test('in the air the legs tuck and the arms come up, whatever the cycle was doing', () => {
  for (const phase of [0, 0.25, 0.6]) {
    const p = pose(phase, 3, 1);
    assert.ok(near(p['UpperLeg.L'], p['UpperLeg.R']) && p['UpperLeg.L'] < -0.3);
    assert.ok(p['LowerLeg.L'] > 0.5 && p['UpperArm.L'] < -0.3);
  }
});

test('a joint is found whatever an exporter or a loader did to the dot in its name', () => {
  assert.equal(jointKey('UpperArm.L'), jointKey('UpperArm_L'));
  assert.equal(jointKey('UpperArm.L'), jointKey('UpperArmL'));
  assert.notEqual(jointKey('UpperArm.L'), jointKey('UpperArm.R'));
  assert.notEqual(jointKey('Head'), jointKey('Helmet_Head'));
});

/** A stick figure with the joints named three ways, and one without any. */
function figure(names) {
  const root = new THREE.Group();
  const add = (name, parent, y) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.y = y;
    parent.add(o);
    return o;
  };
  const hips = add(names[0], root, 0.95);
  const thigh = add(names[1], hips, -0.05);
  const shin = add(names[2], thigh, -0.42);
  add(names[3], shin, -0.4);
  const thighR = add(names[4], hips, -0.05);
  root.updateMatrixWorld(true);
  return { root, hips, thigh, shin, thighR };
}

test('a gait moves the joints a model has, by distance gone, and leaves a model without joints alone', () => {
  for (const names of [
    ['Hips', 'UpperLeg.L', 'LowerLeg.L', 'Foot.L', 'UpperLeg.R'],
    ['Hips', 'UpperLeg_L', 'LowerLeg_L', 'Foot_L', 'UpperLeg_R'],
    ['Hips', 'UpperLegL', 'LowerLegL', 'FootL', 'UpperLegR'],
  ]) {
    const f = figure(names);
    const gait = new Gait();
    assert.ok(gait.jointed(f.root));
    gait.apply(f.root); // measures the legs
    // get up to a steady walk, then go exactly one cycle's length: the legs are back where they were
    for (let i = 0; i < 120; i++) gait.advance(1.4 / 60, 1.4, false, 1 / 60);
    const from = gait.phase;
    const length = cycleLength(1.4, 0.9); // the hip joint is 0.90 m up; the ankle 0.08 m, with the sole that far under it
    for (let i = 0; i < 100; i++) gait.advance(length / 100, 1.4, false, length / 100 / 1.4);
    assert.ok(Math.abs(gait.phase - from) < 1e-3 || Math.abs(Math.abs(gait.phase - from) - 1) < 1e-3, `phase ${from} then ${gait.phase}`);
    // and half a cycle's length puts the other foot forward
    for (let i = 0; i < 100; i++) gait.advance(length / 200, 1.4, false, length / 200 / 1.4);
    assert.ok(Math.abs(((gait.phase - from + 1) % 1) - 0.5) < 1e-3);
    gait.phase = 0.25;
    gait.apply(f.root);
    assert.ok(Math.abs(f.thigh.rotation.x + f.thighR.rotation.x) < 1e-6 && Math.abs(f.thigh.rotation.x) > 0.05, 'the thighs are opposite');
    assert.ok(f.hips.position.y <= 0.95 && f.hips.position.y > 0.9);
    // standing again, the pose eases back to as built, and then nothing changes
    let changed = 2;
    gait.breathing = false;
    for (let i = 0; i < 300 && changed; i++) changed = gait.advance(0, 0, false, 1 / 60);
    assert.equal(changed, 0, 'a standing figure that is not breathing stops asking to be drawn');
    gait.apply(f.root);
    assert.ok(Math.abs(f.thigh.rotation.x) < 1e-9 && f.hips.position.y === 0.95);
    // and rest puts back whatever was there
    gait.advance(0.3, 3, true, 0.1);
    gait.apply(f.root);
    gait.rest(f.root);
    assert.ok(f.shin.quaternion.equals(new THREE.Quaternion()) && f.hips.position.y === 0.95);
  }
  const plain = new THREE.Group();
  plain.add(new THREE.Mesh());
  const gait = new Gait();
  assert.equal(gait.jointed(plain), false);
  assert.equal(gait.apply(plain), false);
});

const DEG = Math.PI / 180;
const LOADS = [undefined, { L: 1, R: 0 }, { L: 0, R: 1 }, { L: 0.5, R: 0.5 }];

test('nothing jumps: from one twentieth of a degree of the cycle to the next no joint moves more than a few degrees, at any speed, loaded or not', () => {
  const n = 720;
  for (const speed of [0.3, 1.4, 2.6, 4])
    for (const load of LOADS)
      for (const crouch of [0, 0.8])
        for (let i = 0; i < n; i++) {
          const a = pose(i / n, speed, 0, { load, crouch });
          const b = pose((i + 1) / n, speed, 0, { load, crouch });
          for (const j of JOINTS)
            assert.ok(Math.abs(a[j] - b[j]) < 1.2 * DEG, `${j} at ${i / n}, ${speed} m/s: ${(a[j] - b[j]) / DEG} deg`);
          assert.ok(Math.abs(a.rise - b.rise) < 0.002 && Math.abs(a.shift - b.shift) < 0.001);
          const va = view({ phase: i / n, speed, load, crouch });
          const vb = view({ phase: (i + 1) / n, speed, load, crouch });
          for (const k of ['x', 'y', 'roll', 'pitch']) assert.ok(Math.abs(va[k] - vb[k]) < 0.002, `view.${k} at ${i / n}`);
        }
});

test('nothing jumps as a figure speeds up, leaves the ground, or lands either', () => {
  for (const phase of [0, 0.2, 0.55, 0.8]) {
    for (let v = 0; v < 5; v += 0.02)
      for (const j of JOINTS) assert.ok(Math.abs(pose(phase, v)[j] - pose(phase, v + 0.02)[j]) < 1.5 * DEG, `${j} at ${v} m/s`);
    for (let air = 0; air < 1; air += 0.02)
      for (const j of JOINTS) assert.ok(Math.abs(pose(phase, 3, air)[j] - pose(phase, 3, air + 0.02)[j]) < 2.5 * DEG, `${j} at air ${air}`);
  }
  let last = 0;
  for (let t = -0.01; t < 0.6; t += 0.004) {
    const g = give(t);
    assert.ok(g >= 0 && g <= 1 && Math.abs(g - last) < 0.2, `give(${t})`);
    last = g;
  }
  assert.equal(give(0), 0);
  assert.equal(give(1), 0);
  assert.ok(give(0.07) > 0.99, 'the knees are furthest down a fourteenth of a second after the feet touch');
  assert.ok(
    landing(0.4) < 0.5 && landing(2) > 1.4 && landing(50) === landing(20),
    'a hop is a flex, two metres a knee-bend, and there is a limit',
  );
});

test('a hand that carries something swings a third as much, on a straighter arm held a little out, and the body leans away', () => {
  const free = pose(0.25, 1.4);
  const left = pose(0.25, 1.4, 0, { load: { L: 1, R: 0 } });
  assert.ok(Math.abs(left['UpperArm.L'] / free['UpperArm.L'] - 0.33) < 0.01);
  assert.equal(left['UpperArm.R'], free['UpperArm.R'], 'the other arm is as it was');
  assert.ok(
    Math.abs(left['LowerArm.L']) < Math.abs(pose(0.25, 4)['LowerArm.L']) &&
      Math.abs(pose(0.25, 4, 0, { load: { L: 1, R: 0 } })['LowerArm.L']) < 0.1,
    'even at a run',
  );
  assert.ok(left.sideways['UpperArm.L'] > 0 && left.sideways.Spine > 0, 'left arm out to the left, trunk to the right');
  const right = pose(0.25, 1.4, 0, { load: { L: 0, R: 1 } });
  assert.ok(right.sideways['UpperArm.R'] < 0 && right.sideways.Spine < 0);
  // mirrored: the right hand's load half a cycle on is the left hand's
  const mirrored = pose(0.75, 1.4, 0, { load: { L: 0, R: 1 } });
  for (const limb of ['UpperArm', 'LowerArm', 'Hand', 'UpperLeg', 'LowerLeg'])
    assert.ok(near(left[`${limb}.L`], mirrored[`${limb}.R`]), limb);
  assert.ok(Math.abs(left['Hand.L']) > 0.01 && Math.abs(left['Hand.L']) < 8 * DEG, 'what it carries swings a few degrees');
  assert.ok(near(free['Hand.L'], 0));
});

test('the eyes go where the body carries them: down twice a stride at each footfall, side to side once', () => {
  const ys = [];
  const xs = [];
  for (let i = 0; i < 400; i++) {
    const v = view({ phase: i / 400, speed: 1.4 });
    ys.push(v.y);
    xs.push(v.x);
    assert.equal(v.y, pose(i / 400, 1.4).rise, 'the view rises and falls exactly as the hips do');
  }
  const lows = ys.flatMap((y, i) => (y < ys.at(i - 1) && y <= ys[(i + 1) % 400] ? [i / 400] : []));
  assert.deepEqual(lows, [0.25, 0.75], 'lowest as each foot lands');
  const depth = Math.max(...ys) - Math.min(...ys);
  assert.ok(depth > 0.03 && depth < 0.04, `a walking bob of ${depth} m`);
  const runDepth = Math.max(...Array.from({ length: 100 }, (_, i) => -view({ phase: i / 100, speed: 4 }).y));
  assert.ok(runDepth > depth && runDepth < 0.08);
  const turns = xs.filter((x, i) => Math.sign(x) !== Math.sign(xs.at(i - 1)) && x !== 0).length;
  assert.equal(turns, 2, 'one sway a stride: across the middle twice');
  assert.ok(Math.max(...xs) > 0.015 && Math.max(...xs) < 0.02);
  // standing: nothing but the breath, a few millimetres
  assert.deepEqual(view({ phase: 0.3, speed: 0 }), { x: -0, y: 0, roll: 0, pitch: -0 });
  const breath = view({ phase: 0, speed: 0, breath: 0.25 });
  assert.ok(breath.y > 0.002 && breath.y < 0.005 && breath.roll === 0);
  // a landing takes the eyes down with the knees
  assert.ok(view({ phase: 0, speed: 0, crouch: 1 }).y < -0.1);
});

test('a gait breathes in steps a still view is redrawn at anyway, and says a landing is a change', () => {
  const gait = new Gait();
  let breaths = 0;
  for (let i = 0; i < 600; i++) if (gait.advance(0, 0, false, 1 / 60) === 1) breaths++;
  assert.ok(breaths >= 118 && breaths <= 121, `${breaths} steps of breathing in ten seconds`);
  gait.land(1.5);
  assert.equal(gait.advance(0, 0, false, 1 / 60), 2);
  assert.ok(gait.moment.crouch > 0);
  for (let i = 0; i < 60; i++) gait.advance(0, 0, false, 1 / 60);
  assert.equal(gait.moment.crouch, 0, 'and it is over within the second');
});
