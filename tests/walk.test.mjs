import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import {
  Body,
  GRAVITY,
  pickFloor,
  RADIUS,
  RUN_SPEED,
  STEP,
  STEP_RATE,
  Solids,
  settle,
  stickSpeed,
  WALK_SPEED,
} from '../src/viewer/walk.ts';

test('the floor is the highest surface within a riser of the feet; anything higher is a wall', () => {
  assert.equal(pickFloor([], 0), null);
  assert.equal(pickFloor([-0.45, 0, 0.2], 0), 0.2);
  assert.equal(pickFloor([-0.45, 0, STEP + 0.05], 0), 0);
  assert.equal(pickFloor([5], 0), null);
});

test('standing still on a floor stays put', () => {
  assert.deepEqual(settle({ y: 0, vy: 0, grounded: true }, 0, 0.016), { y: 0, vy: 0, grounded: true });
});

test('a riser is climbed at a steady rate, not jumped, and never overshot', () => {
  let f = { y: 0, vy: 0, grounded: true };
  f = settle(f, 0.25, 0.02);
  assert.ok(Math.abs(f.y - STEP_RATE * 0.02) < 1e-9 && f.grounded);
  for (let i = 0; i < 20; i++) f = settle(f, 0.25, 0.02);
  assert.deepEqual(f, { y: 0.25, vy: 0, grounded: true });
});

test('a step down is walked; a drop is fallen under gravity and landed on', () => {
  let f = settle({ y: 0.25, vy: 0, grounded: true }, 0, 0.02);
  assert.ok(f.grounded && f.y < 0.25 && f.y > 0, 'a step down keeps the feet on the ground');
  f = settle({ y: 3, vy: 0, grounded: true }, 0, 0.02);
  assert.equal(f.grounded, false);
  assert.ok(Math.abs(f.vy + GRAVITY * 0.02) < 1e-9);
  let t = 0.02;
  while (!f.grounded && t < 5) {
    f = settle(f, 0, 0.02);
    t += 0.02;
  }
  assert.deepEqual(f, { y: 0, vy: 0, grounded: true });
  assert.ok(Math.abs(t - Math.sqrt(6 / GRAVITY)) < 0.06, `3 m takes about 0.78 s, took ${t}`);
});

test('with no floor at all the feet stay where they are', () => {
  assert.deepEqual(settle({ y: 2, vy: -3, grounded: false }, null, 0.02), { y: 2, vy: 0, grounded: false });
});

test('the stick walks over most of its travel and runs at the rim', () => {
  assert.equal(stickSpeed(0), 0);
  assert.ok(Math.abs(stickSpeed(0.75) - WALK_SPEED) < 1e-9);
  assert.equal(stickSpeed(1), RUN_SPEED);
  assert.equal(stickSpeed(3), RUN_SPEED);
});

/** A small site: a slab at y = 0, a wall, three stairs up to a deck, and a platform that can be moved. */
function site() {
  const root = new THREE.Group();
  const box = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y + h / 2, z);
    root.add(mesh);
    return mesh;
  };
  box(40, 1, 40, 0, -1, 0); // the slab: top at 0
  box(0.2, 3, 10, 5, 0, 0); // a wall across +X at x = 4.9 to 5.1
  for (let i = 1; i <= 3; i++) box(0.3, 0.25 * i, 2, -3 - 0.3 * i, 0, 0); // stairs going up toward -X
  box(4, 0.75, 2, -3.15 - 0.9 - 2.15, 0, 0); // the deck the stairs reach: top at 0.75
  box(0.3, 1.0, 2, 0, 0, -6); // a kerb a metre high: too tall to step up
  const platform = box(2, 0.2, 2, 0, 1.8, 8); // top at 2.0
  root.updateMatrixWorld(true);
  const solids = new Solids();
  solids.set([root]);
  const body = new Body(solids);
  body.ground = -0.45;
  return { root, body, platform };
}

/** Walk the body for `seconds` at `speed` along (x, z). */
function walk(body, x, z, seconds, speed = WALK_SPEED) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) body.move(x * speed * dt, z * speed * dt, dt);
}

test('a body stands on the slab and is stopped by a wall, at its own radius from it', () => {
  const { body } = site();
  body.place(0, 0, 0);
  assert.equal(body.position.y, 0);
  walk(body, 1, 0, 6);
  assert.ok(Math.abs(body.position.x - (4.9 - RADIUS)) < 0.02, `stopped at ${body.position.x}`);
  walk(body, 1, 0, 2, RUN_SPEED); // and running at it does not get through either
  assert.ok(body.position.x < 4.9 - RADIUS + 0.02);
  // along a wall it slides
  walk(body, 0.7, 0.7, 1);
  assert.ok(body.position.z > 0.5 && body.position.x < 4.9 - RADIUS + 0.02);
});

test('stairs are climbed and come down again; a kerb too tall for a step is a wall', () => {
  const { body } = site();
  body.place(0, 0, 0);
  walk(body, -1, 0, 4);
  assert.ok(Math.abs(body.position.y - 0.75) < 1e-6 && body.grounded, `on the deck: y = ${body.position.y}`);
  walk(body, 1, 0, 4);
  assert.ok(Math.abs(body.position.y) < 1e-6 && body.grounded, `back down: y = ${body.position.y}`);
  body.place(0, 0, 0);
  walk(body, 0, -1, 6);
  assert.ok(body.position.y === 0 && body.position.z > -6 + 0.15, `stopped by the kerb at z = ${body.position.z}`);
});

test('walking off an edge falls and lands; a platform is solid wherever it has been moved to', () => {
  const { body, platform, root } = site();
  body.place(0, 2.0, 8);
  assert.ok(Math.abs(body.position.y - 2) < 1e-6);
  walk(body, 1, 0, 1.2); // off its +X edge
  assert.equal(body.grounded, false);
  walk(body, 0, 0, 1);
  assert.ok(body.grounded && Math.abs(body.position.y) < 1e-6, `landed on the slab: y = ${body.position.y}`);
  // the platform slides away while the body stands on it: the floor under the feet is gone, so it comes down
  body.place(0, 2.0, 8);
  platform.position.x += 10;
  root.updateMatrixWorld(true);
  walk(body, 0, 0, 1.5);
  assert.ok(body.grounded && Math.abs(body.position.y) < 1e-6);
  // and it can be stood on where it is now
  body.place(10, 2.0, 8);
  walk(body, 0, 0, 0.2);
  assert.ok(body.grounded && Math.abs(body.position.y - 2) < 1e-6);
});

test('off the slab there is always the ground, and without ground the body goes back where it last stood', () => {
  const { body } = site();
  body.place(19, 0, 0);
  walk(body, 1, 0, 3);
  walk(body, 0, 0, 2);
  assert.ok(body.grounded && body.position.y === -0.45 && body.position.x > 20);
  // the ground is sunk under the slab only for the depth buffer's sake: from it, the slab is a step, not a kerb
  walk(body, -1, 0, 3);
  assert.ok(body.grounded && Math.abs(body.position.y) < 1e-6 && body.position.x < 19.5, `back on the slab: ${body.position.toArray()}`);
  const empty = new Body(new Solids());
  empty.place(0, 0, 0);
  empty.move(1, 0, 0.1);
  assert.deepEqual(empty.position.toArray(), [0, 0, 0]);
});
