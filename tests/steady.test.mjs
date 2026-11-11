import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Exploder } from '../src/viewer/explode.ts';
import { Gait } from '../src/viewer/gait.ts';
import { TRAIL_STEP, Trail } from '../src/viewer/trail.ts';
import { Works } from '../src/viewer/works.ts';

// Things that move by themselves start, go and stop without a step: a trail on a second run
// through the flight, a lift setting off, a truck's front wheels along its route, a second landing.

const DEG = Math.PI / 180;

/** A trail laid along a climb for `seconds` of flight, a point every TRAIL_STEP. */
function laid(seconds) {
  const trail = new Trail();
  const up = new THREE.Vector3(0, 1, 0);
  for (let t = TRAIL_STEP; t <= seconds; t += TRAIL_STEP) trail.reach(new THREE.Vector3(0, 40 * t * t, 0), up, t, 1);
  return trail;
}
const triangles = (trail) => trail.mesh.geometry.drawRange.count / 3;

test('a trail on a second run through the flight ends at the clock, with no live end joined to where the engine last burned', () => {
  const trail = laid(20);
  const stretches = trail.laid - 1;
  // the first time through: a live end from the last point laid to the nozzle
  trail.head(new THREE.Vector3(0, 40 * 20.2 * 20.2, 0), new THREE.Vector3(0, 1, 0), 20.2, 1);
  assert.equal(triangles(trail), (stretches + 1) * 2, 'a live end, while the clock is ahead of what is laid');
  // the clock put back to 5 s: the nozzle is far below the last point laid, and nothing joins the two
  trail.head(new THREE.Vector3(0, 40 * 25, 0), new THREE.Vector3(0, 1, 0), 5, 1);
  assert.equal(triangles(trail), stretches * 2, 'no live end while the clock is behind what is laid');
  trail.show(5, 1);
  // and what is ahead of the clock is cut off where the clock is, pixel by pixel, not at the next point laid
  const { vertexShader, fragmentShader } = trail.mesh.material;
  assert.match(vertexShader, /varying float vAge/, 'each pixel is told its age');
  assert.match(vertexShader, /vAge\s*=\s*uNow\s*-\s*aBorn|vAge\s*=\s*age/);
  assert.match(fragmentShader, /if\s*\(\s*vAge\s*<\s*0\.0\s*\)\s*discard/, 'and one that is not laid yet at this instant is not drawn');
  assert.doesNotMatch(vertexShader, /vFade/, 'not faded by the vertex: half a second of flight is hundreds of metres');
});

test('the same sum in JavaScript: nothing ahead of the clock, coming in behind the nozzle, thinning with age and with the air', async () => {
  const { trailFade } = await import('../src/viewer/trail.ts');
  assert.equal(trailFade(-0.01, 1), 0);
  assert.equal(trailFade(0, 1), 0);
  assert.ok(trailFade(0.2, 1) > 0.4 && trailFade(0.2, 1) < 0.6);
  assert.ok(Math.abs(trailFade(1, 1) - Math.exp(-0.01)) < 1e-9);
  assert.ok(trailFade(100, 1) < trailFade(10, 1) && Math.abs(trailFade(10, 0.5) - trailFade(10, 1) / 2) < 1e-12);
});

/** A lift in a shed: one platform node under a part, two stops four metres apart. */
function lift() {
  const root = new THREE.Group();
  const part = new THREE.Group();
  part.name = 'Shed';
  const car = new THREE.Group();
  car.name = 'Shed_Car';
  part.add(car);
  root.add(part);
  root.updateMatrixWorld(true);
  const action = {
    id: 'lift',
    label: 'Call the lift',
    do: {
      kind: 'lift',
      node: 'Shed_Car',
      speed: 1,
      stops: [
        { name: 'the ground', by: [0, 0, 0] },
        { name: 'the roof', by: [0, 4, 0] },
      ],
    },
  };
  return { root, car, action };
}

test('a lift sets off gently, runs at its speed and stops gently: its pace never steps', () => {
  const { root, car, action } = lift();
  const works = new Works();
  works.send('l', action, [root], 'Shed', 1);
  const paces = [];
  for (let i = 0; i < 900; i++) {
    const carried = works.step(1 / 60);
    if (!carried) break;
    paces.push(carried[0].delta.y * 60);
  }
  assert.ok(Math.abs(car.position.y - 4) < 1e-9, 'it arrives');
  assert.ok(paces[0] < 0.1, `its first frame is at ${paces[0]} m/s of its 1 m/s`);
  assert.ok(Math.max(...paces) > 0.999 && Math.max(...paces) < 1.0001, 'it gets up to its speed and no faster');
  let step = 0;
  for (let i = 1; i < paces.length - 1; i++) step = Math.max(step, Math.abs(paces[i] - paces[i - 1]));
  assert.ok(step < 0.06, `its pace changes by at most ${step} m/s from one frame to the next`);
  assert.ok(paces.length / 60 > 4.5 && paces.length / 60 < 6.5, `four metres takes ${paces.length / 60} s`);
  // sent back half way up, it does not turn round at speed
  works.send('l', action, [root], 'Shed', 0);
  for (let i = 0; i < 150; i++) works.step(1 / 60);
  works.send('l', action, [root], 'Shed', 1);
  const turned = works.step(1 / 60);
  assert.ok(turned && turned[0].delta.y * 60 < 0.1, 'it sets off again from rest');
});

/** A truck with two steered wheels and two that only roll, driven along a route by the slider. */
function truck(path) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'Truck';
  const front = new THREE.Group();
  front.name = 'Truck_SteerWheel_1';
  const rear = new THREE.Group();
  rear.name = 'Truck_Wheel_1';
  body.add(front, rear);
  root.add(body);
  const part = {
    node: 'Truck',
    name: '',
    summary: '',
    detail: '',
    explode: [0, 0, 0],
    order: 0,
    moves: [
      {
        kind: 'drive',
        from: 0,
        to: 1,
        path,
        pivot: [0, 0.5, 0],
        forward: [1, 0],
        wheelRadius: 0.5,
        wheelbase: 4,
        wheels: 'Truck_Wheel',
        steered: 'Truck_SteerWheel',
        axle: 'z',
      },
    ],
  };
  return { exploder: new Exploder(root, [part]), front, body };
}

test("a truck's front wheels turn into its route and out of it: no twitch along the way, and straight at both ends without a snap", () => {
  for (const path of [
    [
      [12, 0],
      [26, 1],
      [40, 8],
      [50, 24],
    ],
    [
      [4, 0],
      [10, -0.4],
      [20, -1.83],
      [30, -3.26],
      [36, -3.6],
      [44, -3.66],
      [82.6, -3.66],
    ],
  ]) {
    const { exploder, front } = truck(path);
    // the slider run end to end over twenty seconds at sixty frames a second
    const n = 1200;
    let last = 0;
    let worst = 0;
    let most = 0;
    for (let i = 0; i <= n; i++) {
      exploder.set(i / n);
      const steer = front.rotation.y;
      worst = Math.max(worst, Math.abs(steer - last));
      most = Math.max(most, Math.abs(steer));
      last = steer;
    }
    assert.ok(worst < 0.6 * DEG, `the front wheels turn at most ${worst / DEG} degrees in a frame`);
    assert.equal(last, 0, 'and are straight when it stops');
    assert.ok(most > 2 * DEG && most < 40 * DEG, `they steer: ${most / DEG} degrees at the most`);
  }
});

test('a second landing while the knees are still giving starts from the crouch they are in', () => {
  const gait = new Gait();
  gait.land(1.0);
  for (let i = 0; i < 5; i++) gait.advance(0, 0, false, 1 / 60);
  const deep = gait.moment.crouch;
  assert.ok(deep > 0.7, `a metre's fall, a twelfth of a second on: ${deep}`);
  // the dip before a jump, or the feet touching again
  gait.land(0.25);
  assert.ok(Math.abs(gait.moment.crouch - deep) < 1e-6, `the crouch goes on from ${deep}, not from ${gait.moment.crouch}`);
  let last = deep;
  for (let i = 0; i < 40; i++) {
    gait.advance(0, 0, false, 1 / 60);
    const now = gait.moment.crouch;
    assert.ok(now <= last + 1e-9 && last - now < 0.2, 'and comes up from there without a jump');
    last = now;
  }
  assert.equal(last, 0);
  // a harder landing on top of a soft one goes deeper, from where the knees are
  const again = new Gait();
  again.land(0.3);
  for (let i = 0; i < 3; i++) again.advance(0, 0, false, 1 / 60);
  const shallow = again.moment.crouch;
  again.land(2);
  assert.ok(Math.abs(again.moment.crouch - shallow) < 1e-6, 'from where they are');
  let deepest = 0;
  for (let i = 0; i < 12; i++) {
    again.advance(0, 0, false, 1 / 60);
    deepest = Math.max(deepest, again.moment.crouch);
  }
  assert.ok(deepest > 1.4, `down to the harder landing's crouch: ${deepest}`);
});
