// Watching something worked by hand on foot (walking.md: Operate; camera.md): where the on-foot rigs look while a
// function runs (camera/watch.ts, camera/foot.ts) and how far along it the walk bar says it is (onfoot/operate.ts),
// from the moves' own data. tools/operate-test.mjs does the same in the page, at both sites.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { FootRig } from '../src/viewer/camera/foot.ts';
import { FILL, figureBlocks, fits, NECK, neckTurn, segmentGap, shoulderSpot, withFigure, yawPitchOf } from '../src/viewer/camera/watch.ts';
import { boxAt, leadOf, movesOf, nodeBoxAt, sweptBox, travelOf, wayOf } from '../src/viewer/onfoot/operate.ts';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const box = (min, max) => new THREE.Box3(V(...min), V(...max));
const DEG = Math.PI / 180;

/** A figure 1.8 m tall standing at the origin, working something in the box given; nothing solid about unless `walls` says so. */
function watched(now, ahead = now, walls = () => Number.POSITIVE_INFINITY) {
  return { now, ahead, travel: now.clone().union(ahead), feet: V(0, 0, 0), height: 1.8, radius: 0.26, clear: walls };
}

test('the travel the readout shows is a whole per cent, held between its ends', () => {
  assert.equal(travelOf(0), 0);
  assert.equal(travelOf(0.374), 37);
  assert.equal(travelOf(1.2), 100);
  assert.equal(travelOf(-0.1), 0);
  assert.equal(travelOf(Number.NaN), 0);
});

test('which way it is going is from how far along it was and is: still within a hair', () => {
  assert.equal(wayOf(0.2, 0.21), 1);
  assert.equal(wayOf(0.2, 0.19), -1);
  assert.equal(wayOf(0.2, 0.2 + 1e-7), 0);
});

test('"where it will be" is a few seconds of its own travel, never less than a twentieth and never more than half', () => {
  assert.equal(leadOf(120), 0.05);
  assert.ok(Math.abs(leadOf(40) - 0.15) < 1e-12);
  assert.equal(leadOf(3), 0.5);
});

test('a function’s nodes are where their own moves put them: a slide and a swing played from the data, not posed', () => {
  // a boom on a hinge at the origin, standing up 10 m, that swings 90 degrees down about z over its whole travel,
  // and a carriage that slides 6 m along x
  const root = new THREE.Group();
  const boom = new THREE.Group();
  boom.name = 'Boom';
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10, 0.4));
  pole.position.set(0, 5, 0);
  boom.add(pole);
  const cart = new THREE.Group();
  cart.name = 'Cart';
  cart.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1)));
  cart.position.set(20, 0.5, 0);
  root.add(boom, cart);
  root.updateMatrixWorld(true);
  const moves = [
    { kind: 'swing', node: 'Boom', axis: [0, 0, 1], angle: -90 * DEG, from: 0.2, to: 0.6 },
    { kind: 'slide', node: 'Cart', by: [6, 0, 0], from: 0.4, to: 0.8 },
  ];
  const boomFn = { id: 'Boom', name: 'Boom', nodes: ['Boom'], from: 0.2, to: 0.6, seconds: 60 };
  const cartFn = { id: 'Cart', name: 'Cart', nodes: ['Cart'], from: 0.4, to: 0.8, seconds: 30 };
  assert.deepEqual(
    movesOf(moves, 'Boom', 'Root').map((m) => m.kind),
    ['swing'],
  );
  const near = (a, b, what) => assert.ok(a.distanceTo(b) < 1e-6, `${what}: ${a.toArray()} not ${b.toArray()}`);
  const down = nodeBoxAt(boom, movesOf(moves, 'Boom', 'Root'), boomFn, 0, 1, new THREE.Box3());
  near(down.min, V(0, -0.2, -0.2), 'the boom laid down: its foot');
  near(down.max, V(10, 0.2, 0.2), 'the boom laid down: its tip, 10 m out along x');
  const half = nodeBoxAt(boom, movesOf(moves, 'Boom', 'Root'), boomFn, 0, 0.5, new THREE.Box3());
  assert.ok(Math.abs(half.max.x - half.max.y) < 0.3, 'half way, it is at 45 degrees');
  const gone = nodeBoxAt(cart, movesOf(moves, 'Cart', 'Root'), cartFn, 0, 1, new THREE.Box3());
  near(gone.getCenter(V(0, 0, 0)), V(26, 0.5, 0), 'the cart at the end of its slide');
  // from part of the way along, to the end: what is still to come, measured from where it is
  cart.position.x = 23; // half way, as the model has it then
  root.updateMatrixWorld(true);
  const rest = nodeBoxAt(cart, movesOf(moves, 'Cart', 'Root'), cartFn, 0.5, 1, new THREE.Box3());
  near(rest.getCenter(V(0, 0, 0)), V(26, 0.5, 0), 'from half way, to its end');
  const swept = sweptBox([{ object: boom, moves: movesOf(moves, 'Boom', 'Root') }], boomFn, 0, new THREE.Box3());
  assert.ok(swept.max.x > 9.9 && swept.max.y > 9.9, 'its whole sweep is the quarter circle it swings through');
  const both = boxAt(
    [
      { object: boom, moves: [moves[0]] },
      { object: cart, moves: [moves[1]] },
    ],
    boomFn,
    0,
    0,
    new THREE.Box3(),
  );
  assert.ok(both.containsPoint(V(0, 9, 0)) && both.containsPoint(V(23, 0.5, 0)), 'several nodes are one box');
});

test('the segments’ gap, the figure in the way, and a ball framed', () => {
  assert.ok(Math.abs(segmentGap(V(0, 0, 0), V(0, 2, 0), V(1, 1, -5), V(1, 1, 5)) - 1) < 1e-9);
  assert.ok(Math.abs(segmentGap(V(0, 0, 0), V(0, 2, 0), V(0, 3, 0), V(0, 5, 0)) - 1) < 1e-9);
  const figure = { feet: V(0, 0, 0), height: 1.8, radius: 0.26 };
  assert.equal(figureBlocks(figure, V(0, 1.7, 3), V(0, 1.5, -10)), true, 'straight behind the head, looking past it');
  assert.equal(figureBlocks(figure, V(1.5, 2.3, 3), V(0, 1.5, -10)), false, 'a step aside');
  assert.equal(figureBlocks(figure, V(0, 2.3, 3), V(0, 30, -5)), false, 'looking up over the head at something overhead');
  assert.equal(fits(V(0, 0, 10), V(0, 0, 0), 2, 60, 1.6), true);
  assert.equal(fits(V(0, 0, 3), V(0, 0, 0), 2, 60, 1.6), false);
  assert.equal(fits(V(0, 0, 6), V(0, 0, 0), 2, 60, 0.5), false, 'a tall narrow frame is framed by its width');
});

test('over the shoulder: the camera steps aside so the figure is off the line, and back so it is framed', () => {
  // something small 8 m in front of the figure, at its eye height: from straight behind the head it would be hidden
  const w = watched(box([-0.5, 1, -8.5], [0.5, 2, -7.5]));
  const spot = shoulderSpot(w, 0, 62, 1.6);
  assert.ok(spot.clear && spot.framed);
  assert.ok(!figureBlocks(w, spot.eye, spot.at));
  assert.ok(spot.eye.z > 0, 'it stands behind the figure');
  assert.ok(spot.eye.x > 0, 'over the right shoulder first');
  // something large: the camera goes further back to frame it, as far as a person standing by would
  const big = watched(box([-6, 0, -16], [6, 12, -4]));
  const far = shoulderSpot(big, 0, 62, 1.6);
  assert.ok(far.eye.z > spot.eye.z, 'further back for a bigger thing');
  assert.ok(far.eye.z <= 6.6 && Math.abs(far.eye.x) <= 2.6, 'but never further than a person standing by');
  assert.ok(far.clear);
  // a wall behind and to the right: it comes in short of it, or goes to the left shoulder
  const walled = watched(box([-0.5, 1, -8.5], [0.5, 2, -7.5]), undefined, (_from, dir, length) => (dir.x > 0 && dir.z > 0 ? 0.6 : length));
  const left = shoulderSpot(walled, 0, 62, 1.6);
  assert.ok(left.clear && left.framed && left.eye.x < 0, `the left shoulder (${left.eye.toArray()})`);
});

test('over the shoulder the figure is brought into the frame where it and what is run both fit, and not where they do not', () => {
  const figure = { feet: V(0, 0, 0), height: 1.8 };
  const eye = V(1.5, 2.4, 4);
  const chest = V(0, 1.08, 0);
  const half = Math.atan(Math.tan((62 * DEG) / 2)) * FILL;
  const dir = (p) => p.clone().sub(eye).normalize();
  // something up and ahead: aimed at alone, the figure would be below the frame
  const up = V(0, 9, -6);
  assert.ok(dir(up).angleTo(dir(chest)) > half && dir(up).angleTo(dir(chest)) < 2 * half);
  const aim = dir(withFigure(figure, eye, up, 62, 1.6));
  assert.ok(Math.abs(aim.angleTo(dir(chest)) - half) < 1e-6, 'the figure just in the frame');
  assert.ok(aim.angleTo(dir(up)) <= half + 1e-6, 'and what is run still in it');
  // something nearly overhead and far up: both cannot be had, and what is run comes first
  const high = V(0, 40, -2);
  assert.ok(withFigure(figure, eye, high, 62, 1.6).distanceTo(high) < 1e-9);
  // already both in the frame: nothing turns
  const ahead = V(0, 1.5, -8);
  assert.ok(withFigure(figure, eye, ahead, 62, 1.6).distanceTo(ahead) < 1e-9);
});

test('over the shoulder, something straight overhead is watched from behind the way the figure faces', () => {
  const w = watched(box([-1, 14, -1], [1, 18, 1]));
  const spot = shoulderSpot(w, Math.PI / 2, 62, 1.6); // facing -x
  assert.ok(spot.eye.x > 1, 'it stands back from the way the figure faces');
  assert.ok(spot.clear);
});

test('through the eyes the head turns to it as far as a neck goes, and no further', () => {
  const ahead = new THREE.Quaternion(); // looking along -z
  const out = new THREE.Quaternion();
  const eye = V(0, 1.7, 0);
  // up and to the left: it looks straight at it
  assert.ok(Math.abs(neckTurn(eye, ahead, V(-5, 6.7, -5), out)) < 1e-9);
  const { yaw, pitch } = yawPitchOf(out);
  assert.ok(Math.abs(yaw - 45 * DEG) < 1e-6 && Math.abs(pitch - Math.atan2(5, Math.hypot(5, 5))) < 1e-6);
  // straight behind: the head goes as far round as it will, and says how far short it is
  const short = neckTurn(eye, ahead, V(0.1, 1.7, 10), out);
  assert.ok(Math.abs(Math.abs(yawPitchOf(out).yaw) - NECK.side) < 1e-6);
  assert.ok(Math.abs(short) > 90 * DEG);
  // straight up: as far up as a neck goes
  neckTurn(eye, ahead, V(0, 40, -0.5), out);
  assert.ok(Math.abs(yawPitchOf(out).pitch - NECK.up) < 1e-6);
});

test('the on-foot rig goes to what is watched over its time, cuts with Motion off, and comes back when let go', () => {
  const view = { position: V(0, 1.7, 0), quaternion: new THREE.Quaternion(), motion: 1 };
  const w = watched(box([-0.5, 1, -8.5], [0.5, 2, -7.5]));
  const pose = () => {
    const out = { position: V(0, 0, 0), quaternion: new THREE.Quaternion(), fov: 62 };
    rig.pose(out);
    return out;
  };
  const rig = new FootRig('shoulder');
  rig.follow(view);
  rig.watch(w);
  rig.update(0.1);
  assert.ok(rig.watchedBy > 0 && rig.watchedBy < 1, 'part of the way there after a tenth of a second');
  for (let i = 0; i < 30; i++) rig.update(1 / 30);
  assert.equal(rig.watchedBy, 1);
  const there = pose();
  assert.ok(!figureBlocks(w, there.position, V(0, 1.5, -8)), 'and from there the figure is out of the way');
  rig.watch(null);
  rig.update(0.1);
  assert.ok(rig.watchedBy > 0 && rig.watchedBy < 1, 'coming back by degrees');
  for (let i = 0; i < 30; i++) rig.update(1 / 30);
  const back = pose();
  assert.ok(back.position.distanceTo(view.position) < 1e-9 && back.quaternion.angleTo(view.quaternion) < 1e-9, 'back to the walker’s view');
  // with Motion off, both ways are cuts
  view.motion = 0;
  rig.watch(w);
  rig.update(1 / 60);
  assert.equal(rig.watchedBy, 1);
  rig.watch(null);
  rig.update(1 / 60);
  assert.equal(rig.watchedBy, 0);
  // and the hands taking the view hand it back at once, whatever the motion
  view.motion = 1;
  rig.watch(w);
  for (let i = 0; i < 40; i++) rig.update(1 / 30);
  rig.watch(null, true);
  assert.equal(rig.watchedBy, 0);
  assert.ok(pose().position.distanceTo(view.position) < 1e-9);
});

test('through the eyes the rig turns the head and leaves the eyes where the walker has them', () => {
  const view = { position: V(0, 1.7, 0), quaternion: new THREE.Quaternion(), motion: 1 };
  const rig = new FootRig('eyes');
  rig.follow(view);
  rig.watch(watched(box([-11, 20, -11], [-9, 30, -9])));
  for (let i = 0; i < 40; i++) rig.update(1 / 30);
  const out = { position: V(0, 0, 0), quaternion: new THREE.Quaternion(), fov: 62 };
  rig.pose(out);
  assert.ok(out.position.distanceTo(view.position) < 1e-9);
  const { yaw, pitch } = yawPitchOf(out.quaternion);
  assert.ok(Math.abs(yaw - 45 * DEG) < 1e-3, `turned to it (${yaw / DEG})`);
  assert.ok(pitch > 50 * DEG && pitch <= NECK.up + 1e-9, `and up at it (${pitch / DEG})`);
});
