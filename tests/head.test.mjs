// A head in a seat (src/viewer/camera/head.ts): how far it turns, where the eyes go, and the lean to a port or a screen,
// from the cabins' own data (src/viewer/lookouts.ts). Pure arithmetic: no page, no model.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as libertyBell7 } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/flight.ts';
import {
  AT_GLASS,
  clampHead,
  ease,
  eyeOf,
  GLANCE,
  HEAD_TURN,
  Head,
  LIMITS_LENS,
  leanPath,
  leanPhases,
  NECK,
  portLean,
  screenLean,
  turnOf,
} from '../src/viewer/camera/head.ts';
import { lookoutsOf, windowAt } from '../src/viewer/lookouts.ts';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const gazeOf = (q) => V(0, 0, -1).applyQuaternion(q);
const pose = () => ({ eye: new THREE.Vector3(), quaternion: new THREE.Quaternion(), lens: 0 });
const LIMITS = { side: 1.75, up: 0.95, down: 0.3 };

test('the head turns to either side and up as far as its limits, and down less the further it is turned aside', () => {
  assert.deepEqual(clampHead(5, 0, LIMITS), [1.75, 0]);
  assert.deepEqual(clampHead(-5, 5, LIMITS), [-1.75, 0.95]);
  assert.equal(clampHead(0, -5, LIMITS)[1], -0.3, 'straight ahead, all the way down');
  const downAt = (yaw) => -clampHead(yaw, -5, LIMITS)[1];
  for (let y = 0; y < 1.75; y += 0.05) assert.ok(downAt(y + 0.05) <= downAt(y) + 1e-12, `no further down at ${y.toFixed(2)} rad aside`);
  assert.ok(Math.abs(downAt(1.75) - 0.15) < 1e-12, 'half as far down over the shoulder');
  assert.equal(downAt(0.5), downAt(-0.5), 'the same to either side');
  // the limits are for a lens: a wider one sees further down, so the head goes less far; a narrower, further, to twice
  assert.ok(Math.abs(-clampHead(0, -5, LIMITS, LIMITS_LENS + 20)[1] - (0.3 - THREE.MathUtils.degToRad(10))) < 1e-12);
  assert.ok(clampHead(0, -5, LIMITS, LIMITS_LENS + 80)[1] === 0, 'never up, for a wide lens: only less far down');
  assert.equal(clampHead(0, -5, LIMITS, 5)[1], -0.6, 'no more than twice as far down for a narrow one');
});

test('the eyes go round the neck with as much of a turn aside as is the head’s, and a look up or down leaves them', () => {
  assert.ok(eyeOf(0, 0).length() < 1e-12, 'at rest, at the eyes');
  assert.ok(eyeOf(0, 0.9).length() < 1e-12, 'looking up does not move them');
  assert.ok(eyeOf(0, -0.3).length() < 1e-12, 'nor down');
  const left = eyeOf(HEAD_TURN, 0);
  assert.ok(left.x > 0 && Math.abs(left.y) < 1e-12, 'turned to the left, the eyes go to the left, level');
  assert.ok(left.distanceTo(eyeOf(1.75, 0)) < 1e-12, 'the eyes turn the rest: past the head’s share they stay');
  const chord = 2 * Math.hypot(NECK.x, NECK.z) * Math.sin(HEAD_TURN / 2);
  assert.ok(Math.abs(left.length() - chord) < 1e-12, `${(left.length() * 100).toFixed(1)} cm, round the neck`);
  assert.ok(eyeOf(-HEAD_TURN, 0).x < 0, 'and to the right, to the right');
  // and the gaze is where turnOf points the camera
  const q = turnOf(0.4, -0.2);
  const g = gazeOf(q);
  assert.ok(g.distanceTo(V(Math.cos(-0.2) * Math.sin(0.4), Math.sin(-0.2), Math.cos(-0.2) * Math.cos(0.4))) < 1e-9);
});

test('leaning to a port puts the eyes inside its pane on the line looked out along, and the glass fills the picture', () => {
  const at = V(0.3, -0.2, 0.7);
  const out = V(0.6, 0, 0.8);
  const lean = portLean(at, out, 0.168);
  assert.ok(lean.eye.distanceTo(at.clone().addScaledVector(out, -AT_GLASS[0])) < 1e-12, 'just inside the pane');
  assert.ok(lean.gaze.distanceTo(out) < 1e-12, 'looking out along it');
  const filled = 0.168 / (2 * AT_GLASS[0] * Math.tan(THREE.MathUtils.degToRad(lean.lens / 2)));
  assert.ok(Math.abs(filled - 0.9) < 1e-9, `the glass is ${(filled * 100).toFixed(0)} % of the picture's height`);
  // further from the glass, where there is no room for a face at it, the lens is narrower and the glass fills it the same
  const further = portLean(at, out, 0.168, 0.4);
  assert.ok(further.lens < lean.lens);
  assert.ok(further.eye.distanceTo(at) - 0.4 < 1e-12);
  // the periscope's screen: in toward it, no nearer than 30 cm, the screen four fifths of the picture
  const screen = screenLean(V(0, -0.19, 0.53), V(0, 0.36, -0.93).normalize(), 0.1, V(0, 0, 0));
  assert.ok(Math.abs(screen.eye.distanceTo(V(0, -0.19, 0.53)) - 0.3) < 1e-9);
  assert.ok(screen.gaze.dot(V(0, 0.36, -0.93).normalize()) < -0.999, 'looking into it');
  assert.ok(Math.abs(0.1 / (0.3 * Math.tan(THREE.MathUtils.degToRad(screen.lens / 2))) - 0.8) < 1e-9);
});

test('a lean is eased from where the eyes are to the port and back by the same way, never a jump', () => {
  const head = new Head(LIMITS);
  const target = portLean(V(-0.5, -0.38, 0.68), V(-0.89, 0.01, 0.46).normalize(), 0.168);
  const now = head.pose(62, pose());
  head.leanTo(target, now);
  assert.ok(head.out && head.moving);
  const going = [];
  let last = head.pose(62, pose());
  assert.ok(last.eye.length() < 1e-12 && Math.abs(last.lens - 62) < 1e-9, 'it starts where the eyes were');
  for (let i = 0; i < 240; i++) {
    head.step(1 / 60);
    const p = head.pose(62, pose());
    // (a frame's step is a small part of the way: a sixtieth of a second moves the eyes no more than 3 cm)
    assert.ok(p.eye.distanceTo(last.eye) < 0.03, `frame ${i}: ${(p.eye.distanceTo(last.eye) * 100).toFixed(1)} cm`);
    assert.ok(p.quaternion.angleTo(last.quaternion) < 0.08, `frame ${i}: turned ${p.quaternion.angleTo(last.quaternion).toFixed(3)} rad`);
    going.push(p.eye.clone());
    last = p;
  }
  assert.ok(!head.moving, 'there');
  assert.ok(last.eye.distanceTo(target.eye) < 1e-9, 'at the glass');
  assert.ok(gazeOf(last.quaternion).distanceTo(target.gaze) < 1e-9, 'looking out of it');
  assert.ok(Math.abs(last.lens - target.lens) < 1e-9);
  // the last of the way in is straight down the line looked out along
  const before = going[Math.floor(going.length * 0.25) - 1];
  const tail = target.eye
    .clone()
    .sub(going.find((p) => p.distanceTo(target.eye) < 0.05) ?? before)
    .normalize();
  assert.ok(tail.dot(target.gaze) > 0.95, 'it comes in along the line of the port');
  // and back: the same way reversed, to the head as it is
  head.leanTo(null, last);
  assert.ok(!head.out && head.moving);
  const back = [];
  for (let i = 0; i < 240; i++) {
    head.step(1 / 60);
    back.push(head.pose(62, pose()).eye.clone());
  }
  assert.ok(!head.moving && head.target === null, 'back, and the head its own again');
  const rest = head.pose(62, pose());
  assert.ok(rest.eye.length() < 1e-9 && gazeOf(rest.quaternion).distanceTo(V(0, 0, 1)) < 1e-9 && Math.abs(rest.lens - 62) < 1e-9);
  // the path back passes through the same places as the path out (the curve is one curve, run either way)
  const p = new THREE.Vector3();
  for (const s of [0.25, 0.5, 0.75]) {
    const outward = leanPath(V(0, 0, 0), target.eye, null, target.gaze, s, new THREE.Vector3());
    leanPath(target.eye, V(0, 0, 0), target.gaze.clone().negate(), null, 1 - s, p);
    assert.ok(p.distanceTo(outward) < 1e-9, `at ${s} of the way`);
  }
});

test('going out the head turns first and the view closes last; coming back, the other way about', () => {
  const [m0, t0, l0] = leanPhases(0, true);
  const [m1, t1, l1] = leanPhases(1, true);
  assert.deepEqual([m0, t0, l0], [0, 0, 0]);
  assert.deepEqual([m1, t1, l1], [1, 1, 1]);
  const [, turn, lens] = leanPhases(0.5, true);
  assert.ok(turn > 0.5 && lens < 0.5, 'half way out: turned more than half, the lens less than half');
  const [, turnBack, lensBack] = leanPhases(0.5, false);
  assert.ok(turnBack < 0.5 && lensBack > 0.5);
  for (let k = 0; k < 1; k += 0.01)
    for (const out of [true, false]) leanPhases(k + 0.01, out).forEach((v, i) => assert.ok(v >= leanPhases(k, out)[i] - 1e-12));
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
});

test('the hands are never fought: leaning, they turn the look about what is leant to, within a glance, and do not end it', () => {
  const head = new Head(LIMITS);
  head.calm = true; // (Motion off: there at once)
  const target = portLean(V(0.38, 0.2, 0.47), V(0.59, 0.79, -0.16).normalize(), 0.168);
  head.leanTo(target, head.pose(62, pose()));
  head.step(0);
  const at = head.pose(62, pose());
  assert.ok(at.eye.distanceTo(target.eye) < 1e-9, 'with Motion off, there at once');
  head.turn(10, 10);
  const turned = head.pose(62, pose());
  assert.ok(head.out, 'still leaning');
  assert.ok(turned.eye.distanceTo(target.eye) < 1e-9, 'the eyes stay at the glass');
  const off = gazeOf(turned.quaternion).angleTo(target.gaze);
  assert.ok(off > 0.3 && off <= Math.hypot(GLANCE.side, GLANCE.up) + 1e-9, `looked ${off.toFixed(2)} rad about it, and no further`);
  assert.equal(head.yaw, 0, 'the head’s own turn is not touched');
  // home (0) comes back from the lean and to straight ahead
  head.home(turned);
  for (let i = 0; i < 60; i++) head.step(1 / 60);
  assert.ok(!head.out && head.pose(62, pose()).eye.length() < 1e-9);
  // not leaning, the hands turn the head within its limits
  head.turn(-10, -10);
  assert.deepEqual([head.yaw, head.pitch], clampHead(-10, -10, LIMITS));
});

test('what can be looked out of is the cabin’s data, named as it names it: Freedom 7’s two ports and its periscope', () => {
  const vehicle = freedom7.models.find((m) => m.cabin);
  const list = lookoutsOf(vehicle.cabin);
  assert.deepEqual(
    list.map((l) => l.name),
    ['Lower port', 'Upper port', 'Periscope'],
  );
  assert.deepEqual(
    list.map((l) => l.window ?? 'scope'),
    [0, 1, 'scope'],
  );
  // a point on a pane is the window it is nearest
  for (const [i, w] of vehicle.cabin.windows.entries())
    assert.equal(
      windowAt(
        vehicle.cabin.windows,
        w.at.map((v) => v + 0.01),
      ),
      i,
    );
  // each port leant to from its own data: inside the pane, looking out of the model
  for (const w of vehicle.cabin.windows) {
    const lean = portLean(V(...w.at), V(...w.out).normalize(), w.across);
    assert.ok(
      V(...w.at)
        .sub(lean.eye)
        .dot(V(...w.out)) > 0.15,
      'the eyes are inside the cabin',
    );
    assert.ok(Math.hypot(lean.eye.x, lean.eye.z) < Math.hypot(w.at[0], w.at[2]), 'nearer the long axis than the pane');
  }
  // its head's limits are the data's, and the clamp keeps to them
  assert.deepEqual(vehicle.cabin.head, { side: 1.75, up: 0.95, down: 0.3 });
});

test('a cabin with one window has one to look out of, named "Window"; Liberty Bell 7 has its window and its periscope', () => {
  const one = {
    within: [],
    instruments: [],
    windows: [{ at: [0, 0.6, 0.4], out: [0, 0.3, 0.95], across: 0.25 }],
    periscope: freedom7.models.find((m) => m.cabin).cabin.periscope,
  };
  assert.deepEqual(
    lookoutsOf(one).map((l) => l.name),
    ['Window', 'Periscope'],
  );
  const two = { ...one, windows: [one.windows[0], one.windows[0]], periscope: undefined };
  assert.deepEqual(
    lookoutsOf(two).map((l) => l.name),
    ['Window 1', 'Window 2'],
  );
  // its spacecraft has the big window ahead, and now a cabin and a seat (missions/usa/mercury/vehicles/cabin.ts): its
  // window is found as above, then its periscope
  const lb7 = libertyBell7.models.find((m) => m.id === 'vehicle');
  assert.equal(lb7.seats[0].node, 'Seat_Pilot');
  assert.deepEqual(
    lookoutsOf(lb7.cabin).map((l) => l.name),
    ['Window', 'Periscope'],
  );
  // the one window, leant to: inside its pane, looking out
  const lean = portLean(V(...one.windows[0].at), V(...one.windows[0].out).normalize(), 0.25);
  assert.ok(lean.gaze.distanceTo(V(...one.windows[0].out).normalize()) < 1e-12);
});
