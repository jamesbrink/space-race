import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Gait } from '../src/viewer/gait.ts';
import { gradePace, RUN_SPEED, STAIR_RUN, STAIR_WALK, WALK_SPEED } from '../src/viewer/walk.ts';

// A flight of stairs under a jointed figure: each foot has its own ground (`Terrain`), lands whole on its own tread,
// a tread to a step, and stays there; no foot goes through a tread or a riser on its way; and on flat ground a gait
// that is told of the ground walks as one that is not. Measured on the stick figure of tests/stride.test.mjs.

/** A man of 1.80 m in boots: the joints of a crew figure, and under each ankle a heel, a toe and the point of the sole between them. */
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

const RISERS = 12;
/** Flat, then a flight of twelve risers from 2 m on (up, or down), then flat. */
const flight = (riser, going, up) => (z) => (z < 2 ? 0 : (up ? 1 : -1) * riser * Math.min(RISERS, Math.floor((z - 2) / going) + 1));

/**
 * Walk the figure along +Z over `height` at `speed`, its place carried as a walker's body is (on the highest ground
 * under it within a step, followed at 3 m/s), and hand every frame to `seen`: the figure, the gait, how far it has
 * gone and the height of its place.
 */
function walk(height, speed, until, seen, fps = 120) {
  const f = figure();
  const gait = new Gait();
  gait.breathing = false;
  gait.apply(f.root);
  const dt = 1 / fps;
  let z = 0;
  let level = 0;
  for (let t = 0; z < until; t += dt) {
    const v = t < 0.3 ? 0 : speed;
    z += v * dt;
    let floor = -9;
    for (const o of [0, 0.182, -0.182]) {
      const h = height(z + o);
      if (h <= level + 0.3 && h > floor) floor = h;
    }
    level += Math.max(-3 * dt, Math.min(3 * dt, floor - level));
    const here = z;
    const stands = level;
    gait.advance(v * dt, v, false, dt, false, 0, 0, {
      level: stands,
      at: (ahead) => {
        const h = height(here + ahead);
        return h > stands + 0.65 || h < stands - 0.7 ? null : h;
      },
    });
    gait.apply(f.root);
    f.root.updateMatrixWorld(true);
    seen(f, gait, z, level);
  }
}

test('up and down a flight each foot lands on its own tread, a tread to a step, and stays on it; no foot goes through a tread on its way', () => {
  for (const [riser, going] of [
    [0.18, 0.28],
    [0.198, 0.24],
    [0.23, 0.3],
  ])
    for (const up of [true, false])
      for (const speed of [STAIR_WALK, 0.45]) {
        const height = flight(riser, going, up);
        const say = `${up ? 'up' : 'down'} ${riser} by ${going} at ${speed} m/s`;
        const spot = { L: null, R: null };
        const landed = { L: false, R: false };
        const treads = [];
        let deep = 0;
        let hips = null;
        walk(height, speed, 2 + (RISERS + 3) * going, (f, gait, z, level) => {
          for (const side of ['L', 'R']) {
            const hold = gait.moment.feet[side].hold;
            const points = ['heel', 'sole', 'toe'].map((n) => f.at(`${n}${side}`));
            const over = points.map((p) => p.y + level - height(p.z + z));
            if (z > 1) deep = Math.min(deep, ...over);
            if (hold >= 1 && !landed[side]) treads.push(Math.floor((points[1].z + z - 2) / going));
            landed[side] = hold >= 1;
            if (hold < 1 || z < 1) {
              spot[side] = null;
              continue;
            }
            // planted: its lowest point is on its tread, and while it is flat it is on its spot
            assert.ok(
              Math.abs(Math.min(...over)) < 0.012,
              `${say}: a planted ${side} foot's lowest point is ${Math.min(...over)} m off its tread`,
            );
            if (Math.abs(points[0].y - points[2].y) > 0.003) continue;
            spot[side] ??= points[1].z + z;
            assert.ok(
              Math.abs(points[1].z + z - spot[side]) < 0.01,
              `${say}: a planted ${side} foot is ${points[1].z + z - spot[side]} m from its spot`,
            );
          }
          // the hips go up a flight in pulls, not in jumps
          const high = f.at('Hips').y + level;
          if (hips !== null) assert.ok(Math.abs(high - hips) < 0.012, `${say}: the hips went ${high - hips} m in a frame`);
          hips = high;
        });
        // (measured: 5.2 mm going up, which is the swing's own clearance; up to 15 mm for a moment going down, a heel past a nosing)
        assert.ok(deep > (up ? -0.007 : -0.02), `${say}: a foot was ${-deep} m under the ground`);
        // on the flight, each landing is on the next tread: none missed, none shared (at the slower pace a tread may be shared: a step-to gait)
        const on = treads.filter((k) => k >= 1 && k <= RISERS - 2);
        assert.ok(on.length >= RISERS - 3, `${say}: landed on ${treads}`);
        for (let i = 1; i < on.length; i++) {
          const step = on[i] - on[i - 1];
          assert.ok(speed < STAIR_WALK ? step === 0 || step === 1 : step === 1, `${say}: landed on ${on}`);
        }
      }
});

test('on flat ground a gait that is told of the ground keeps its planted feet as one that is not', () => {
  for (const speed of [0.8, 1.4, 2.2, 4]) {
    const spot = { L: null, R: null };
    let held = 0;
    walk(
      () => 0,
      speed,
      speed * 8,
      (f, gait, z) => {
        if (z < speed * 1.5) return;
        for (const side of ['L', 'R']) {
          if (gait.moment.feet[side].hold < 1) {
            spot[side] = null;
            continue;
          }
          held++;
          const heel = f.at(`heel${side}`);
          const toe = f.at(`toe${side}`);
          assert.ok(
            Math.abs(Math.min(heel.y, toe.y)) < 0.005,
            `${speed} m/s: a planted ${side} foot's lowest point is ${Math.min(heel.y, toe.y)} m off the ground`,
          );
          const on = Math.abs(heel.y - toe.y) < 0.003 ? f.at(`sole${side}`).z : heel.y < toe.y ? heel.z + 0.06 : toe.z - 0.15;
          spot[side] ??= on + z;
          assert.ok(
            Math.abs(on + z - spot[side]) < (speed >= 4 ? 0.004 : 0.01),
            `${speed} m/s: a planted ${side} foot is ${on + z - spot[side]} m from its spot`,
          );
        }
      },
    );
    assert.ok(held > 100, `${speed} m/s: feet were planted`);
  }
});

test('a kerb is stepped on to and off: the foot that lands by it lands clear of its edge, and neither foot is ever in it', () => {
  for (const high of [0.15, -0.15]) {
    const height = (z) => (z >= 3 ? high : 0);
    let deep = 0;
    walk(height, 1.4, 6, (f, _gait, z, level) => {
      for (const side of ['L', 'R'])
        for (const n of ['heel', 'sole', 'toe']) {
          const p = f.at(`${n}${side}`);
          deep = Math.min(deep, p.y + level - height(p.z + z));
        }
    });
    assert.ok(deep > -0.02, `a kerb of ${high} m: a foot was ${-deep} m under the ground`);
  }
});

test('setting off, the first foot to swing is lifted before it goes forward, told of the ground or not, and no joint jumps for it', () => {
  for (const want of [0.6, 1.4, 4])
    for (const told of [false, true]) {
      const f = figure();
      const gait = new Gait();
      gait.breathing = false;
      gait.apply(f.root);
      const dt = 1 / 120;
      let v = 0;
      let z = 0;
      let from = null;
      let gone = null;
      let knee = null;
      let highest = 0;
      for (let t = 0; t < 1.2; t += dt) {
        // (as a walker's body gathers speed: walk.ts, quicken)
        if (t > 0.3) v += (want - v) * (1 - Math.exp(-dt / 0.085));
        z += v * dt;
        gait.advance(v * dt, v, false, dt, false, 0, 0, told ? { level: 0, at: () => 0 } : null);
        gait.apply(f.root);
        f.root.updateMatrixWorld(true);
        // the left foot swings first: how far the point under its ankle has gone over the ground when its lowest point is 2 cm up
        const low = Math.min(f.at('heelL').y, f.at('toeL').y);
        const at = f.at('soleL').z + z;
        from ??= at;
        if (low > 0.02 && gone === null) gone = at - from;
        if (gone !== null && t < 0.3 + 0.25) highest = Math.max(highest, low);
        const bent = f.node('LowerLeg.L').rotation.x;
        // (measured: 7.9, 11.0 and 17.4 degrees in a 120th of a second at 0.6, 1.4 and 4 m/s: the body is at its pace in a quarter of a second, and so is the step)
        if (knee !== null)
          assert.ok(
            Math.abs(bent - knee) < (20 * Math.PI) / 180,
            `${want} m/s: the left knee turned ${((bent - knee) * 180) / Math.PI} degrees in a frame`,
          );
        knee = bent;
      }
      assert.ok(
        gone !== null && gone < 0.03,
        `${want} m/s, ${told ? 'told of the ground' : 'not told'}: the first foot had gone ${gone} m before it was 2 cm up`,
      );
      assert.ok(highest > 0.03 && highest < 0.09, `${want} m/s: the first foot was ${highest} m up at the most`);
    }
});

test('a flight is taken at its own pace: the flat is walked and run as sent, a ramp of 1 in 5 too, and a flight at a tread to a step', () => {
  assert.equal(gradePace(WALK_SPEED, 0), WALK_SPEED);
  assert.equal(gradePace(RUN_SPEED, 0.2), RUN_SPEED);
  assert.equal(gradePace(WALK_SPEED, 0.64), STAIR_WALK);
  assert.equal(gradePace(WALK_SPEED, -0.64), STAIR_WALK);
  assert.ok(Math.abs(gradePace(RUN_SPEED, 0.8) - STAIR_RUN) < 1e-12);
  // (slower than a flight's pace is left alone, and it comes on without a step)
  assert.equal(gradePace(0.3, 0.64), 0.3);
  for (let g = 0; g < 0.8; g += 0.01) assert.ok(Math.abs(gradePace(WALK_SPEED, g + 0.01) - gradePace(WALK_SPEED, g)) < 0.07);
});
