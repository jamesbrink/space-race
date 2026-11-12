import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { NODES } from '../src/viewer/exhaust.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { Gait } from '../src/viewer/gait.ts';
import { TRAIL_STEP, Trail } from '../src/viewer/trail.ts';
import { Works } from '../src/viewer/works.ts';

// Things that move by themselves start, go and stop without a step: a trail on a second run
// through the flight, a lift setting off, a truck's front wheels along its route, a second landing.

const DEG = Math.PI / 180;

/** A trail laid along a climb for `seconds` of flight, a point every TRAIL_STEP, in the humid air near the ground. */
function laid(seconds) {
  const trail = new Trail();
  const up = new THREE.Vector3(0, 1, 0);
  for (let t = TRAIL_STEP; t <= seconds; t += TRAIL_STEP) trail.reach(new THREE.Vector3(0, 40 * t * t, 0), up, t, 0.98);
  return trail;
}
/** The trail as drawn at `now`: its nodes, oldest first (trail.ts `nodes`). */
function drawn(trail, now) {
  const out = new Float64Array(NODES * 6);
  const n = trail.nodes(now, out);
  return Array.from({ length: n }, (_, i) => ({ y: out[i * 6 + 1], radius: out[i * 6 + 3], thick: out[i * 6 + 4] }));
}

test('a trail on a second run through the flight ends at the clock, with no live end joined to where the engine last burned', () => {
  const trail = laid(20);
  const y = (t) => 40 * t * t;
  // the first time through: a live end from the last point laid to the nozzle
  trail.head(new THREE.Vector3(0, y(21.5), 0), new THREE.Vector3(0, 1, 0), 21.5, 0.98);
  assert.equal(drawn(trail, 21.5).at(-1).y, y(21.5), 'a live end, while the clock is ahead of what is laid');
  // the clock put back to 5.2 s: the nozzle is far below the last point laid, and nothing joins the two
  trail.head(new THREE.Vector3(0, y(5.2), 0), new THREE.Vector3(0, 1, 0), 5.2, 0.98);
  const back = drawn(trail, 5.2);
  // it ends at the clock or short of it (where the smoke comes in from nothing behind the fire), and nothing ahead of the clock is drawn
  assert.ok(back.length > 3 && back.at(-1).y <= y(5.2) && back.at(-1).y >= y(4.5), `the end is at ${back.at(-1).y}`);
  assert.ok(
    back.every((node) => node.y <= back.at(-1).y),
    'nothing past the clock',
  );
  assert.ok(back.at(-1).thick < 1e-9, 'and the smoke comes in from nothing at its end');
  // the same instant is the same trail, whatever was laid after it
  assert.deepEqual(drawn(laid(5.5), 5.2), back);
  assert.equal(drawn(trail, 0.2).length, 0, 'before the first point there is none');
});

test('the trail thins from the nozzle: older smoke is wider, never more than the shader has room for, and nothing is drawn of a flight not flown', () => {
  const trail = laid(142);
  const nodes = drawn(trail, 142);
  assert.ok(nodes.length > 8 && nodes.length <= NODES, `${nodes.length} nodes`);
  for (let i = 1; i < nodes.length; i++) assert.ok(nodes[i].radius <= nodes[i - 1].radius, 'wider with age');
  assert.equal(drawn(new Trail(), 10).length, 0);
});

test('how much trail there is: none ahead of the clock, coming in behind the fire, steam low down that is soon gone, a contrail in the cold, nothing above', async () => {
  const { trailFade } = await import('../src/viewer/trail.ts');
  const at = (height) => Math.exp(-height / 8000);
  assert.equal(trailFade(-0.01, 1), 0);
  assert.equal(trailFade(0, 1), 0);
  assert.equal(trailFade(5, 1), 0, 'at the pad the wash is the blast, not a trail');
  assert.ok(trailFade(1, at(300)) > trailFade(0.5, at(300)) && trailFade(0.5, at(300)) > 0, 'it comes in behind the fire');
  assert.ok(trailFade(5, at(300)) > 0.15, 'steam in the humid air');
  assert.ok(trailFade(60, at(300)) < 0.1 * trailFade(5, at(300)), 'gone in a minute');
  assert.ok(trailFade(60, at(10_000)) > 3 * trailFade(60, at(4000)), 'the contrail outlasts it');
  assert.ok(trailFade(10, at(20_000)) < 1e-3 && trailFade(10, at(60_000)) < 1e-6, 'and above the cold there is nothing to hold one');
});

test('the blast over the pad: nothing before liftoff, out fast and slowing, fed for five seconds and gone inside a minute', async () => {
  const { blast } = await import('../src/viewer/trail.ts');
  assert.equal(blast(0).amount, 0);
  assert.equal(blast(-3).amount, 0);
  let last = blast(0.01);
  for (let t = 0.1; t <= 60; t += 0.1) {
    const b = blast(t);
    assert.ok(b.radius >= last.radius && b.radius < 49 && b.height >= last.height, `it only spreads (${t} s)`);
    assert.ok(Math.abs(b.amount - last.amount) < 0.09, `no step in how much there is (${t} s)`);
    last = b;
  }
  assert.ok(blast(2).radius > 15 && blast(5).radius > 35 && blast(5).amount > 0.95);
  assert.equal(blast(60).amount, 0);
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
