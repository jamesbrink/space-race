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
  // (to a hundredth of a degree: the left leg is its planted foot's by now, reached from a hip the pelvis has turned forward)
  assert.ok(near(p['UpperLeg.L'], -swing(1.4), 2e-4), 'forward is a negative turn of a thigh');
  assert.ok(
    near(p['UpperLeg.R'], swing(1.4), 1e-3),
    'and the right as far back, to a twentieth of a degree: its hip has gone back with the pelvis',
  );
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
        assert.ok(p.sag <= 0 && p.sag > -0.05, "and the figure's pelvis a little further");
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
    // (to a degree: each also leans in to the stride's line, and against the hips' ride to one side)
    assert.ok(Math.abs(f.thigh.rotation.x + f.thighR.rotation.x) < 0.02 && Math.abs(f.thigh.rotation.x) > 0.05, 'the thighs are opposite');
    // (as a heel lands the figure's hips are down by the eyes' bob and by the pelvis's own sag: what a leg needs to reach a stride ahead)
    assert.ok(f.hips.position.y < 0.95 - 0.035 && f.hips.position.y > 0.87, `the hips are at ${f.hips.position.y} m as a foot lands`);
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
  const steady = (speed, load, crouch) => {
    for (let i = 0; i < n; i++) {
      const a = pose(i / n, speed, 0, { load, crouch });
      const b = pose((i + 1) / n, speed, 0, { load, crouch });
      for (const j of JOINTS) assert.ok(Math.abs(a[j] - b[j]) < 1.2 * DEG, `${j} at ${i / n}, ${speed} m/s: ${(a[j] - b[j]) / DEG} deg`);
      assert.ok(Math.abs(a.rise - b.rise) < 0.002 && Math.abs(a.shift - b.shift) < 0.001 && Math.abs(a.sag - b.sag) < 0.002);
      const va = view({ phase: i / n, speed, load, crouch });
      const vb = view({ phase: (i + 1) / n, speed, load, crouch });
      for (const k of ['x', 'y', 'roll', 'pitch']) assert.ok(Math.abs(va[k] - vb[k]) < 0.002, `view.${k} at ${i / n}`);
    }
  };
  // a slow walk, a walk, three jogs (where a walk's stance is turning into a run's) and two runs
  for (const speed of [0.3, 1.4, 1.6, 2.0, 2.4, 2.6, 4])
    for (const load of LOADS) for (const crouch of [0, 0.8]) steady(speed, load, crouch);
  // and every speed between: a knee that straightens at one speed only is found here
  for (let speed = 0.1; speed < 5.01; speed += 0.1) steady(speed, undefined, 0);
});

test('nothing jumps as a figure speeds up, leaves the ground, or lands either', () => {
  for (const phase of [0, 0.2, 0.55, 0.8]) {
    // (1.7 degrees: a foot's turn as it lands is the fastest thing in a stride, and between 1.9 and 2 m/s the landing itself
    // passes through these phases as the stance shortens: 0.02 m/s there is one and a half of the steps the test above
    // allows 1.2 degrees each. The most measured is 1.65.)
    for (let v = 0; v < 5; v += 0.02)
      for (const j of JOINTS) assert.ok(Math.abs(pose(phase, v)[j] - pose(phase, v + 0.02)[j]) < 1.7 * DEG, `${j} at ${v} m/s`);
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

test('falling flings the arms out and up and trails the legs, and comes in without a jump', async () => {
  const p = pose(0.2, 1.4, 1, { fall: 1 });
  assert.ok(
    p['UpperArm.L'] < -0.8 && p.sideways['UpperArm.L'] > 0.9 && p.sideways['UpperArm.R'] < -0.9,
    'arms out to the sides and forward',
  );
  assert.ok(p['LowerLeg.L'] > 0.2 && p['LowerLeg.R'] > 0.2 && p.Spine > 0.15, 'knees bent behind, pitched into it');
  const loaded = pose(0.2, 1.4, 1, { fall: 1, load: { L: 0, R: 1 } });
  assert.ok(Math.abs(loaded.sideways['UpperArm.R']) < 0.2, 'the arm with something in its hand keeps hold of it');
  for (let f = 0; f < 1; f += 0.02)
    for (const j of JOINTS)
      assert.ok(Math.abs(pose(0.3, 2, 1, { fall: f })[j] - pose(0.3, 2, 1, { fall: f + 0.02 })[j]) < 2.5 * DEG, `${j} at fall ${f}`);
});

test('getting up starts flat, ends standing as built, and never jumps on the way', async () => {
  const { rising } = await import('../src/viewer/gait.ts');
  for (const faceDown of [true, false]) {
    const first = rising(0, faceDown, 0.98);
    assert.ok(
      Math.abs(Math.abs(first.Hips) - 1.5) < 1e-9 && Math.sign(first.Hips) === (faceDown ? 1 : -1),
      'flat on the ground, the right way up',
    );
    assert.ok(Math.abs(first.rise - (0.16 - 0.98)) < 1e-9, 'hips a hand above the ground');
    let last = first;
    let t = 0;
    for (; t < 6; t += 1 / 120) {
      const now = rising(t, faceDown, 0.98);
      if (!now) break;
      for (const j of JOINTS) assert.ok(Math.abs(now[j] - last[j]) < 3 * DEG, `${j} at ${t} s`);
      assert.ok(Math.abs(now.rise - last.rise) < 0.02 && now.rise <= 1e-9, `hips at ${t} s`);
      last = now;
    }
    assert.ok(t > 2.8 && t < 3.4, `about three seconds: ${t}`);
    for (const j of JOINTS) assert.ok(Math.abs(last[j]) < 1e-6, `${j} is as built at the end`);
    assert.ok(Math.abs(last.rise) < 1e-6);
    assert.equal(rising(9, faceDown), null);
  }
});

test('sitting at a wheel: thighs level, shins down, hands up and going round with the wheel', () => {
  const sat = pose(0.3, 0, 0, { sit: 1 });
  assert.ok(Math.abs(sat['UpperLeg.L'] + 1.45) < 1e-9 && sat['LowerLeg.L'] > 1.2 && sat['UpperArm.L'] < -0.9);
  assert.equal(sat.rise, 0, "the hips are the seat's: nothing of the stride is left");
  const left = pose(0, 0, 0, { sit: 1, wheel: 1 });
  const right = pose(0, 0, 0, { sit: 1, wheel: -1 });
  assert.ok(
    left['UpperArm.L'] < sat['UpperArm.L'] && left['UpperArm.R'] > sat['UpperArm.R'],
    'hard left: the left hand goes up and over, the right comes down',
  );
  assert.ok(
    near(left['UpperArm.L'], right['UpperArm.R']) && near(left['LowerArm.R'], right['LowerArm.L']),
    'and the mirror of that, hard right',
  );
  for (let k = 0; k < 1; k += 0.02)
    for (const j of JOINTS)
      assert.ok(Math.abs(pose(0.2, 1, 0, { sit: k })[j] - pose(0.2, 1, 0, { sit: k + 0.02 })[j]) < 2.5 * DEG, `${j} sitting down at ${k}`);
});

test('a tall figure under a low roof sinks into the seat and leans back until his head clears it, and no further than a body can', async () => {
  const { seatFit } = await import('../src/viewer/gait.ts');
  assert.deepEqual(seatFit(0.9, 1.2), { drop: 0, recline: 0 }, 'room enough: he sits up');
  assert.deepEqual(seatFit(0.9, Number.POSITIVE_INFINITY), { drop: 0, recline: 0 }, 'no roof');
  const short = seatFit(0.9, 0.9);
  assert.ok(Math.abs(short.drop - 0.04) < 1e-9 && short.recline === 0, 'a little short: he sinks into the cushion');
  const a = seatFit(0.9, 0.8);
  assert.ok(
    a.drop === 0.08 && a.recline > 0 && Math.abs(0.9 * Math.cos(a.recline) - a.drop - (0.8 - 0.04)) < 1e-9,
    'shorter: he leans back too, until he just clears it',
  );
  const b = seatFit(0.9, 0.5);
  assert.ok(b.recline <= 0.61 && b.drop <= 0.08, 'and no further than 35 degrees and 8 cm, however low the roof');
  // the reclined pose keeps his eyes level and his knees up: what the hips give back, the head and thighs take
  const sat = poseOf({ phase: 0, speed: 0, sit: 1, recline: 0.4 });
  const up = poseOf({ phase: 0, speed: 0, sit: 1 });
  assert.ok(sat.Hips < up.Hips - 0.39 && Math.abs(sat.Hips + sat['UpperLeg.L'] - (up.Hips + up['UpperLeg.L'])) < 1e-9);
  assert.ok(sat.Head > up.Head);
});

test('a hand is put where it is sent, with the elbow bent the way it was', async () => {
  const { reach } = await import('../src/viewer/gait.ts');
  const root = new THREE.Group();
  const add = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const upper = add('UpperArm.L', root, 0.2, 1.4, 0);
  const lower = add('LowerArm.L', upper, 0, -0.3, 0);
  lower.rotation.x = -0.3; // the elbow bent a little forward
  const hand = add('Hand.L', lower, 0, -0.27, 0);
  add('Grip.L', hand, 0, -0.08, 0);
  root.updateMatrixWorld(true);
  const target = new THREE.Vector3(0.15, 1.3, 0.45);
  assert.ok(reach(root, 'L', target));
  root.updateMatrixWorld(true);
  const grip = root.getObjectByName('Grip.L').getWorldPosition(new THREE.Vector3());
  assert.ok(grip.distanceTo(target) < 0.005, `the grip is on the target: ${grip.distanceTo(target)} m off`);
  assert.ok(Math.abs(upper.position.distanceTo(new THREE.Vector3(0.2, 1.4, 0))) < 1e-9, 'the shoulder stays where it is');
  const elbow = lower.getWorldPosition(new THREE.Vector3());
  assert.ok(elbow.y < 1.4 && elbow.y < target.y, 'the elbow hangs below the line to the hand');
  assert.equal(reach(new THREE.Group(), 'L', target), false, 'no arm, nothing done');
});

test('a foot is heard as it lands: the left at a quarter of the stride and the right at three quarters, and nothing in the air', () => {
  const g = new Gait();
  const heard = [];
  for (let i = 0; i < 240; i++) {
    g.advance((1.4 * 1) / 60, 1.4, false, 1 / 60);
    for (const foot of g.footfalls) heard.push([foot, +g.phase.toFixed(2)]);
  }
  assert.ok(heard.length >= 4, `steps heard: ${heard.length}`);
  for (let i = 1; i < heard.length; i++) assert.notEqual(heard[i][0], heard[i - 1][0], 'left, right, left, right');
  for (const [foot, phase] of heard)
    assert.ok(foot === 'L' ? phase >= 0.25 && phase < 0.4 : phase >= 0.75 && phase < 0.9, `${foot} at ${phase}`);
  g.advance(0.1, 1.4, true, 1 / 60);
  assert.equal(g.footfalls.length, 0, 'in the air, no footfall');
  // turning on the spot steps round, and is heard
  const t = new Gait();
  let steps = 0;
  for (let i = 0; i < 60; i++) {
    t.advance(0, 0, false, 1 / 60, false, 0, Math.PI / 60);
    steps += t.footfalls.length;
  }
  assert.ok(steps >= 2, `half a turn on the spot is a few steps: ${steps}`);
});

test("the view through the figure's eyes is what it was before the figure's pelvis was let go its own way: to a part in a million million", () => {
  // Captured from the gait as it stood before the planted foot was made to reach the ground at heel
  // strike (which the figure does with its pelvis, `Pose.sag`, and its legs). The eyes' rise, sway,
  // tip and nod are not to move for that: change these only on purpose.
  const pinned = [
    [0.1, 0.8, { x: 0.0016090402118423748, y: -0.006909830056250526, roll: -0.000817290266332635, pitch: -0 }],
    [0.25, 1.4, { x: -0.012727922061357854, y: -0.035, roll: 0.01131370849898476, pitch: -0.005391058070538489 }],
    [0.3, 1.4, { x: -0.01603811743539062, y: -0.031657797401561584, roll: 0.014256104387013887, pitch: -0.0068853717029582675 }],
    [0.6, 2, { x: -0.002599218803745376, y: -0.028328134371966438, roll: 0.0023104167144403346, pitch: -0 }],
    [0.25, 2.6, { x: -0.010769780205764337, y: -0.005468749999999993, roll: 0.009573137960679413, pitch: -0.007426842237035541 }],
    [0.45, 4, { x: -0.010692078290260415, y: -0.07134345884812357, roll: 0.009504069591342592, pitch: -0 }],
  ];
  for (const [phase, speed, want] of pinned) assert.deepEqual(view({ phase, speed }), want, `the view at phase ${phase}, ${speed} m/s`);
  // and everywhere else: every bit of 67,248 views, over the cycle at eleven speeds, in the air, crouched,
  // breathing, climbing, falling, sitting, loaded, on other legs, and as a gait has them through a
  // start, a walk, a run, a jog, a stop and a landing
  // (summed, with each view weighted by where it comes in the run, and held to a part in a million million: the last
  // bit of a sine is not the same on every processor, so a hash of the bits passed on one machine and failed on another)
  const sums = [0, 0, 0, 0, 0, 0, 0, 0];
  let views = 0;
  const put = (v) => {
    const w = 1 + (views % 97) / 97;
    [v.x, v.y, v.roll, v.pitch].forEach((value, k) => {
      sums[k] += value * w;
      sums[k + 4] += value * value * w;
    });
    views++;
  };
  const others = [
    {},
    { breath: 0.3 },
    { climb: 1 },
    { fall: 0.5 },
    { sit: 1, wheel: 0.4 },
    { load: { L: 1, R: 0 } },
    { limbs: { thigh: 0.43, shin: 0.42, ankle: 0.08 } },
  ];
  for (const speed of [0, 0.3, 0.8, 1.4, 1.6, 2, 2.4, 2.6, 3, 4, 6])
    for (let i = 0; i < 144; i++)
      for (const air of [0, 0.4, 1])
        for (const crouch of [0, 0.8]) for (const more of others) put(view({ phase: i / 144 + 0.001, speed, air, crouch, ...more }));
  const gait = new Gait();
  const dt = 1 / 60;
  let speed = 0;
  for (let t = 0; t < 12; t += dt) {
    const want = t < 3 ? 1.4 : t < 5 ? 4 : t < 7 ? 2 : t < 9 ? 0 : 0.8;
    speed += (want - speed) * (1 - Math.exp(-dt / 0.2));
    if (want === 0 && speed < 0.03) speed = 0;
    if (Math.abs(t - 10) < dt / 2) gait.land(1);
    gait.advance(speed * dt, speed, false, dt);
    put(view(gait.moment));
  }
  assert.equal(views, 67248);
  const PINNED = [
    -4.108710045648602, -2834.391704001749, 0.6387931476883314, -1163.0684619548526, 2.589579732498495, 314.79158830640705,
    2.968561220955971, 40.114399042153394,
  ];
  sums.forEach((sum, k) =>
    assert.ok(Math.abs(sum - PINNED[k]) <= 1e-9 * Math.max(1, Math.abs(PINNED[k])), `sum ${k}: ${sum} against ${PINNED[k]}`),
  );
});
