import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { carriage, cycleLength, Gait, pose } from '../src/viewer/gait.ts';

// The stride in three dimensions, measured on a jointed figure as `Gait.apply` leaves it: the
// pelvis turns and tips, the legs lean in to the stride's line, and through all of it a planted
// foot is on the ground on its spot, the soles are level, the toes point the way the figure is
// going and the legs do not cross. (tests/planted.test.mjs measures the same stride from the side.)

const DEG = Math.PI / 180;

/**
 * A stick figure with the joints of a crew figure, built to a man of 1.80 m in boots: the hip
 * joints 9.6 cm from the midline, the feet 13.5 cm from it (he stands with his feet apart), and
 * under each ankle a heel, a toe and the point of the sole between them.
 */
function figure() {
  const root = new THREE.Group();
  const made = {};
  const add = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.name = name;
    const from = made[parent] ? made[parent].getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    o.position.set(x - from.x, y - from.y, z - from.z);
    (made[parent] ?? root).add(o);
    root.updateMatrixWorld(true);
    made[name] = o;
  };
  add('Hips', null, 0, 0.984, 0);
  add('Spine', 'Hips', 0, 1.06, 0);
  add('Head', 'Spine', 0, 1.57, 0);
  for (const [s, x] of [
    ['L', 1],
    ['R', -1],
  ]) {
    add(`UpperArm.${s}`, 'Spine', 0.193 * x, 1.456, 0);
    add(`LowerArm.${s}`, `UpperArm.${s}`, 0.274 * x, 1.175, 0);
    add(`Hand.${s}`, `LowerArm.${s}`, 0.308 * x, 0.912, 0);
    add(`UpperLeg.${s}`, 'Hips', 0.096 * x, 0.984, 0);
    add(`LowerLeg.${s}`, `UpperLeg.${s}`, 0.123 * x, 0.542, 0);
    add(`Foot.${s}`, `LowerLeg.${s}`, 0.135 * x, 0.1, 0);
    // (the figure faces +Z)
    add(`heel${s}`, `Foot.${s}`, 0.135 * x, 0, -0.06);
    add(`toe${s}`, `Foot.${s}`, 0.135 * x, 0, 0.15);
    add(`sole${s}`, `Foot.${s}`, 0.135 * x, 0, 0);
  }
  return { root, at: (name) => made[name].getWorldPosition(new THREE.Vector3()), node: (name) => made[name] };
}

/** Walk the figure at a steady speed and hand each frame to `seen` once it is up to speed. */
function walk(speed, seconds, seen, fps = 120) {
  const f = figure();
  const gait = new Gait();
  gait.breathing = false;
  gait.apply(f.root); // measures the legs
  const dt = 1 / fps;
  let gone = 0;
  for (let t = 0; t < seconds; t += dt) {
    gait.advance(speed * dt, speed, false, dt);
    gone += speed * dt;
    gait.apply(f.root);
    f.root.updateMatrixWorld(true);
    if (t > 1.5) seen(f, gait, gone);
  }
}

test('in three dimensions a planted foot is on the ground and on its spot, with the pelvis turning and tipping over it', () => {
  for (const [speed, slide, lift] of [
    [0.8, 0.01, 0.005],
    [1.4, 0.01, 0.005],
    [2.2, 0.01, 0.005],
    [4, 0.004, 0.004],
  ]) {
    const spot = { L: null, R: null };
    let held = 0;
    walk(speed, 6, (f, gait, gone) => {
      for (const side of ['L', 'R']) {
        if (gait.moment.feet[side].hold < 1) {
          spot[side] = null;
          continue;
        }
        held++;
        const heel = f.at(`heel${side}`);
        const toe = f.at(`toe${side}`);
        const low = Math.min(heel.y, toe.y);
        assert.ok(Math.abs(low) < lift, `${speed} m/s: a planted ${side} foot's lowest point is ${low} m off the ground`);
        // where the point of the sole under the ankle would be with the foot flat on what it stands on, over the ground gone
        const flat = Math.abs(heel.y - toe.y) < 0.003;
        const on = flat ? f.at(`sole${side}`).z : heel.y < toe.y ? heel.z + 0.06 : toe.z - 0.15;
        const x = f.at(`sole${side}`).x;
        spot[side] ??= { z: on + gone, x };
        assert.ok(
          Math.abs(on + gone - spot[side].z) < slide,
          `${speed} m/s: a planted ${side} foot is ${on + gone - spot[side].z} m along from its spot`,
        );
        assert.ok(Math.abs(x - spot[side].x) < 0.0015, `${speed} m/s: and ${x - spot[side].x} m across from it`);
      }
    });
    assert.ok(held > 100, `${speed} m/s: feet were planted`);
  }
});

test('the feet land near one line and never cross it; the soles stay level and the toes point the way he is going', () => {
  for (const speed of [0.8, 1.4, 2.2, 4]) {
    let widest = 0;
    walk(speed, 4, (f, gait) => {
      for (const [side, sign] of [
        ['L', 1],
        ['R', -1],
      ]) {
        // a foot, a knee and a thigh's middle are each on their own side of the middle of the pelvis
        const middle = f.at('Hips').x;
        for (const part of [`Foot.${side}`, `LowerLeg.${side}`])
          assert.ok(sign * (f.at(part).x - middle) > 0.03, `${speed} m/s: ${part} is ${sign * (f.at(part).x - middle)} m to its own side`);
        if (gait.moment.feet[side].hold >= 1) widest = Math.max(widest, sign * f.at(`Foot.${side}`).x);
        // level from side to side (its own X axis lies level), and pointing forward (heel to toe has nothing sideways in it)
        const across = new THREE.Vector3(1, 0, 0).transformDirection(f.node(`Foot.${side}`).matrixWorld);
        assert.ok(
          Math.abs(across.y) < 1e-6 && Math.abs(across.z) < 1e-6,
          `${speed} m/s: the ${side} sole is tipped or turned: ${across.toArray()}`,
        );
        const along = f.at(`toe${side}`).sub(f.at(`heel${side}`));
        assert.ok(Math.abs(along.x) < 1e-6 && along.z > 0, `${speed} m/s: the ${side} toes point ${along.toArray()}`);
      }
    });
    // he stands with his ankles 13.5 cm from the middle; walking, a planted foot is within 7.5 of it (the stride's line: the hips ride over it, and it stays)
    if (speed >= 1.4) assert.ok(widest < 0.075 && widest > 0.03, `${speed} m/s: a planted foot is ${widest} m from the middle`);
  }
});

test('the pelvis turns with the leg going forward and the shoulders against it; it tips up over the planted foot and is level as each foot lands', () => {
  const limbs = { thigh: 0.443, shin: 0.442, ankle: 0.1, hip: 0.096, stand: 0.135 };
  for (const speed of [0.5, 1.4, 2.5, 4]) {
    for (let i = 0; i < 200; i++) {
      const phase = i / 200;
      const c = carriage(phase, speed, limbs);
      assert.ok(
        Math.abs(c.turn) <= 6.1 * DEG && Math.abs(c.tip) <= 3.5 * DEG,
        `${speed} m/s: turn ${c.turn / DEG}, tip ${c.tip / DEG} degrees`,
      );
      assert.ok(c.settle > -0.012 && c.settle < 0.002, `${speed} m/s: the pelvis settles ${c.settle} m`);
      assert.ok(c.L.dip >= -1e-12 && c.R.dip >= -1e-12 && c.L.dip < 0.012);
      // nothing jumps
      const next = carriage(phase + 1 / 200, speed, limbs);
      assert.ok(
        Math.abs(next.turn - c.turn) < 0.3 * DEG && Math.abs(next.tip - c.tip) < 0.3 * DEG && Math.abs(next.settle - c.settle) < 0.0006,
      );
    }
    // the left foot lands at a quarter of the cycle at a walk: the left hip is forward, the pelvis level
    const strike = carriage(0.25, speed, limbs);
    assert.ok(
      strike.L.ahead > 0 && strike.R.ahead < 0 && Math.abs(strike.tip) < 1e-9,
      'the hip of the landing foot is forward and the pelvis level',
    );
    // over the left foot (half way round) the left hip is the high one, at the height it would have anyway, and the right has come down
    const over = carriage(0.5, speed, limbs);
    assert.ok(over.tip > 0 && Math.abs(over.L.dip) < 1e-12 && over.R.dip > 0, 'the pelvis tips about the hip that carries it');
  }
  assert.ok(Math.abs(carriage(0.25, 1.4, limbs).turn + 4 * DEG) < 0.1 * DEG, 'four degrees each way at a walk');
  // standing, and in the air, the pelvis is square
  for (const c of [carriage(0.3, 0, limbs), carriage(0.3, 3, limbs, 0)])
    assert.ok(
      c.turn === 0 && c.tip === 0 && c.L.lean === 0 && c.R.lean === 0 && Math.abs(c.settle) < 1e-12,
      'square when it is not striding',
    );
  // on the figure: as the left foot lands the left hip joint is ahead of the right, and the right shoulder ahead of the left
  const f = figure();
  const gait = new Gait();
  gait.breathing = false;
  gait.apply(f.root);
  for (let i = 0; i < 240; i++) gait.advance(1.4 / 120, 1.4, false, 1 / 120);
  gait.phase = 0.25;
  gait.apply(f.root);
  f.root.updateMatrixWorld(true);
  assert.ok(f.at('UpperLeg.L').z - f.at('UpperLeg.R').z > 0.008, 'the left hip leads');
  assert.ok(f.at('UpperArm.R').z - f.at('UpperArm.L').z > 0.01, 'and the right shoulder');
  // the trunk itself stays upright over a tipped pelvis: the head is over the middle of the hips to a centimetre
  gait.phase = 0.5;
  gait.apply(f.root);
  f.root.updateMatrixWorld(true);
  assert.ok(Math.abs(f.at('Head').x - f.at('Hips').x) < 0.012, `the head is ${f.at('Head').x - f.at('Hips').x} m off the hips`);
});

test('a foot does not go into the ground on its way to its landing, at a walk, a jog or a run', () => {
  for (const speed of [0.8, 1.4, 2.2, 3, 4]) {
    walk(speed, 4, (f) => {
      for (const side of ['L', 'R']) {
        const low = Math.min(f.at(`heel${side}`).y, f.at(`toe${side}`).y);
        assert.ok(low > -0.005, `${speed} m/s: the ${side} foot's lowest point is ${low} m`);
      }
    });
  }
});

test('a leg that swings is bent for the hip that has come down over it: its foot is no lower than the swing had it', () => {
  const limbs = { thigh: 0.443, shin: 0.442, ankle: 0.1, hip: 0.096, stand: 0.135 };
  for (const speed of [0.8, 1.4, 2]) {
    // the left leg swings through as the cycle begins: its knee is bent more than the same stride's with a pelvis that does not tip
    const level = pose({ phase: 0, speed, limbs: { ...limbs, hip: 0 } });
    const tipped = pose({ phase: 0, speed, limbs });
    assert.ok(tipped['LowerLeg.L'] > level['LowerLeg.L'], `${speed} m/s: the swinging knee is bent ${tipped['LowerLeg.L'] / DEG} degrees`);
    assert.ok(tipped['LowerLeg.L'] - level['LowerLeg.L'] < 8 * DEG, 'by a few degrees');
  }
  assert.ok(cycleLength(1.4, 0.985) > 1.5, 'and the stride is as long as it was');
});

test("the half-turn at each hip is half the thigh's turn from rest, by the short way, at every moment of a walk, a run and sitting; a figure without one is posed as before", () => {
  const quat = (o) => o.quaternion.toArray();
  for (const speed of [1.4, 4]) {
    const plain = figure();
    const f = figure();
    for (const [s, x] of [
      ['L', 1],
      ['R', -1],
    ]) {
      const half = new THREE.Object3D();
      half.name = `HipHalf${s}`; // as three.js has the name, the dot dropped
      half.position.set(0.096 * x, 0, 0);
      f.node('Hips').add(half);
    }
    const [a, b] = [new Gait(), new Gait()];
    a.breathing = b.breathing = false;
    a.apply(f.root);
    b.apply(plain.root);
    let most = 0;
    for (let i = 0; i < 400; i++) {
      for (const [gait, fig] of [
        [a, f],
        [b, plain],
      ]) {
        gait.seated = i > 300; // and sat down: thighs level
        gait.advance(i > 300 ? 0 : speed / 120, i > 300 ? 0 : speed, false, 1 / 120);
        gait.apply(fig.root);
      }
      for (const s of ['L', 'R']) {
        const thigh = f.node(`UpperLeg.${s}`).quaternion;
        const half = f.node('Hips').children.find((o) => o.name === `HipHalf${s}`).quaternion;
        const angle = 2 * Math.acos(Math.min(1, Math.abs(thigh.w)));
        most = Math.max(most, angle);
        assert.ok(Math.abs(2 * Math.acos(Math.min(1, Math.abs(half.w))) - angle / 2) < 1e-6, 'half the angle');
        assert.ok(half.clone().multiply(half).angleTo(thigh) < 1e-6, "about the same line: twice the half-turn is the thigh's");
        assert.deepEqual(quat(f.node(`UpperLeg.${s}`)), quat(plain.node(`UpperLeg.${s}`)), 'and the thigh is where it was without one');
      }
    }
    assert.ok(most > 70 * DEG, `sitting, the thighs were turned ${most / DEG} degrees`);
  }
});

test('a figure that turns where it stands leaves its feet where they are and steps them round; one that sets off keeps the foot it stands on where it stood', () => {
  // (heel and toe hang under the stick figure's ankles; the figure faces +Z, and a turn to its left is about +Y)
  const run = (seconds, drive, seen) => {
    const f = figure();
    const gait = new Gait();
    gait.breathing = false;
    gait.apply(f.root);
    const dt = 1 / 60;
    let heading = 0;
    let speed = 0;
    let steps = 0;
    for (let i = 0; i < seconds * 60; i++) {
      const { turn, want } = drive(i * dt, heading);
      speed += (want - speed) * (1 - Math.exp(-dt / 0.09));
      heading += turn;
      f.root.position.x += Math.sin(heading) * speed * dt;
      f.root.position.z += Math.cos(heading) * speed * dt;
      gait.advance(speed * dt, speed, false, dt, false, 0, turn);
      steps += gait.footfalls.length;
      f.root.rotation.y = heading;
      gait.apply(f.root);
      f.root.updateMatrixWorld(true);
      seen(i * dt, f, heading);
    }
    return steps;
  };
  // A quarter turn on the spot in 0.4 s, as the walker turns a standing figure. Until a foot is lifted its spot has not
  // moved, and until it has been turned as far as it goes on its leg (35 degrees) nor have its toes: past that it
  // pivots where it is. Both are stepped round, and he ends standing as he was built, facing the new way.
  const start = {};
  let turnedTo = 0;
  const steps = run(
    3,
    (t, heading) => ({ turn: t >= 0.5 && heading < Math.PI / 2 ? Math.min(4 / 60, Math.PI / 2 - heading) : 0, want: 0 }),
    (t, f, heading) => {
      turnedTo = heading;
      for (const [s, x] of [
        ['L', 1],
        ['R', -1],
      ]) {
        const [heel, toe, sole] = [f.at(`heel${s}`), f.at(`toe${s}`), f.at(`sole${s}`)];
        start[s] ??= { toe, sole, lifted: false };
        if (heel.y > 0.003 || toe.y > 0.003) start[s].lifted = true;
        if (!start[s].lifted) {
          assert.ok(
            sole.distanceTo(start[s].sole) < 0.003,
            `${s} foot at ${t.toFixed(2)} s: its spot has moved ${sole.distanceTo(start[s].sole)} m`,
          );
          if (heading < 30 * DEG)
            assert.ok(toe.distanceTo(start[s].toe) < 0.003, `${s} toes at ${t.toFixed(2)} s, turned ${heading / DEG}`);
        }
        if (t < 2.9) continue;
        const home = new THREE.Vector3(0.135 * x, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
        assert.ok(sole.distanceTo(home) < 0.021, `${s} foot is home: ${sole.distanceTo(home)} m off`);
      }
    },
  );
  assert.ok(
    Math.abs(turnedTo - Math.PI / 2) < 1e-6 && start.L.lifted && start.R.lifted && steps >= 2,
    `both feet were stepped round: ${steps} steps`,
  );
  // Setting off straight ahead from standing: the feet stand 13.5 cm either side and a stride's land 6.5 cm either side.
  // The right foot, which he stands on while the left swings out, stays where it stood until it leaves.
  let stood = null;
  let left = false;
  run(
    1.5,
    (t) => ({ turn: 0, want: t >= 0.5 ? 1.4 : 0 }),
    (t, f) => {
      const [heel, toe] = [f.at('heelR'), f.at('toeR')];
      stood ??= { heel, toe };
      if (heel.y > 0.006 || Math.abs(heel.z - stood.heel.z) > 0.01) left = true; // (leaving: its heel comes up and it goes)
      if (!left)
        assert.ok(
          Math.abs(heel.x - stood.heel.x) < 0.002 && Math.abs(toe.x - stood.toe.x) < 0.002,
          `at ${t.toFixed(2)} s it has gone ${heel.x - stood.heel.x} m sideways`,
        );
    },
  );
  assert.ok(left, 'and then it left');
});

test('a figure that turns as it walks keeps each planted foot on its spot and on the ground, and neither foot crosses the way it is going', () => {
  // (the figure faces +Z and a turn to its left is about +Y, as above; `turn` is radians a second at time t)
  const walked = (speed, seconds, turn) => {
    const f = figure();
    const gait = new Gait();
    gait.breathing = false;
    gait.apply(f.root);
    const dt = 1 / 120;
    let heading = 0;
    const frames = [];
    for (let t = 0; t < seconds; t += dt) {
      const turned = turn(t) * dt;
      heading += turned;
      f.root.position.x += Math.sin(heading) * speed * dt;
      f.root.position.z += Math.cos(heading) * speed * dt;
      gait.advance(speed * dt, speed, false, dt, false, 0, turned);
      f.root.rotation.y = heading;
      gait.apply(f.root);
      f.root.updateMatrixWorld(true);
      const frame = { t, at: f.root.position.clone(), heading };
      for (const side of ['L', 'R'])
        frame[side] = { hold: gait.moment.feet[side].hold, heel: f.at(`heel${side}`), toe: f.at(`toe${side}`), sole: f.at(`sole${side}`) };
      frames.push(frame);
    }
    return frames;
  };
  const measure = (frames, from) => {
    const out = { drift: 0, low: 0, high: 0, turned: 0, near: 9, apart: 9 };
    const spot = { L: null, R: null };
    for (const [i, frame] of frames.entries()) {
      if (frame.t < from) continue;
      // as one foot passes the other (seen from the figure, neither ahead), the left is to the left of the right
      const between = frame.L.sole.clone().sub(frame.R.sole);
      const ahead = between.x * Math.sin(frame.heading) + between.z * Math.cos(frame.heading);
      if (Math.abs(ahead) < 0.03)
        out.apart = Math.min(out.apart, between.x * Math.cos(frame.heading) - between.z * Math.sin(frame.heading));
      for (const [side, sign] of [
        ['L', 1],
        ['R', -1],
      ]) {
        const { hold, heel, toe, sole } = frame[side];
        // how far to its own side of the way the figure goes the foot is: from the nearest place on that way, before or after
        let nearest = null;
        for (let j = Math.max(0, i - 150); j < Math.min(frames.length, i + 150); j++) {
          const d = frames[j].at.distanceToSquared(new THREE.Vector3(sole.x, frames[j].at.y, sole.z));
          if (!nearest || d < nearest.d) nearest = { d, j };
        }
        const on = frames[nearest.j];
        const aside = (sole.x - on.at.x) * Math.cos(on.heading) - (sole.z - on.at.z) * Math.sin(on.heading);
        if (hold < 1) {
          spot[side] = null;
          continue;
        }
        out.near = Math.min(out.near, sign * aside);
        const low = Math.min(heel.y, toe.y);
        out.low = Math.min(out.low, low);
        out.high = Math.max(out.high, low);
        if (Math.abs(heel.y - toe.y) > 0.003) continue;
        const way = Math.atan2(toe.x - heel.x, toe.z - heel.z);
        spot[side] ??= { sole, way };
        out.drift = Math.max(out.drift, Math.hypot(sole.x - spot[side].sole.x, sole.z - spot[side].sole.z));
        out.turned = Math.max(out.turned, Math.abs(Math.atan2(Math.sin(way - spot[side].way), Math.cos(way - spot[side].way))));
      }
    }
    return out;
  };
  // Round a circle, at a stroll, a walk and a run: every foot lands on the bend and stays, pointing the way it landed.
  for (const [speed, rate] of [
    [0.8, 0.6],
    [1.4, 0.5],
    [1.4, 1],
    [1.4, 1.5],
    [4, 2],
  ]) {
    const m = measure(
      walked(speed, 8, (t) => (t > 0.5 ? rate : 0)),
      3,
    );
    const say = `${speed} m/s round a circle of ${(speed / rate).toFixed(1)} m: ${JSON.stringify(m)}`;
    assert.ok(m.drift < 0.01 && m.low > -0.005 && m.high < 0.005, say);
    assert.ok(m.turned < 0.5 * DEG, say);
    // (landed straight ahead of a figure on a bend, a planted foot was up to 37 mm across the way on a circle of 0.9 m, and pivoted 5 degrees)
    assert.ok(m.near > 0.01 && m.apart > 0.05, say);
  }
  // A quarter turn in the middle of a walk, gently and as sharply as a walker turns its figure (FACE: 7 radians a
  // second): the foot that was down when it began was put down for going straight, and pivots on its spot if the
  // figure turns further over it than a leg turns; its spot does not move, and the feet still do not cross.
  for (const rate of [1.5, 3, 7]) {
    const m = measure(
      walked(1.4, 6, (t) => (t > 2 && t < 2 + Math.PI / 2 / rate ? rate : 0)),
      1.5,
    );
    const say = `a quarter turn at ${rate} rad/s: ${JSON.stringify(m)}`;
    // (at 7 rad/s the foot it turns over is 6.1 mm under the ground at the most and 18 mm off it for a moment, as it was
    // before feet were landed on the bend: neither is right, and both are held here to what was measured)
    assert.ok(m.drift < 0.01 && m.low > (rate > 3 ? -0.0065 : -0.005) && m.high < (rate > 3 ? 0.02 : 0.005), say);
    assert.ok(m.near > 0.01 && m.apart > 0.05, say);
  }
});
