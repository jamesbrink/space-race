import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import {
  Body,
  bump,
  GRAVITY,
  JUMP_HEIGHT,
  JUMP_SPEED,
  jump,
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

test('a jump leaves the ground at the speed that reaches its height, and only from the ground', () => {
  const up = jump({ y: 1, vy: 0, grounded: true });
  assert.deepEqual(up, { y: 1, vy: JUMP_SPEED, grounded: false });
  assert.equal(jump(up), up, 'no second jump in the air');
  let f = up;
  let apex = 0;
  let t = 0;
  while (!f.grounded && t < 3) {
    f = settle(f, 1, 1 / 240);
    apex = Math.max(apex, f.y - 1);
    t += 1 / 240;
  }
  assert.ok(Math.abs(apex - JUMP_HEIGHT) < 0.01, `apex ${apex}`);
  assert.deepEqual(f, { y: 1, vy: 0, grounded: true });
  assert.ok(Math.abs(t - (2 * JUMP_SPEED) / GRAVITY) < 0.02, `airborne ${t} s`);
});

test('a rising head stops at a ceiling; standing or falling under one changes nothing', () => {
  assert.deepEqual(bump({ y: 0.3, vy: 2, grounded: false }, 2.1, 1.9), { y: 2.1 - 1.9, vy: 0, grounded: false });
  const clear = { y: 0.1, vy: 2, grounded: false };
  assert.equal(bump(clear, 2.1, 1.9), clear);
  assert.equal(bump(clear, null, 1.9), clear);
  const falling = { y: 0.3, vy: -1, grounded: false };
  assert.equal(bump(falling, 2.1, 1.9), falling);
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
  box(3, 0.2, 3, 12, 2.05, 12); // a soffit: its underside 2.05 m over the slab, 16 cm over a standing head
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

test('a body hops to its jump height in the open, and under a soffit only as far as its head allows', () => {
  const { body } = site();
  const hop = () => {
    let apex = 0;
    body.jump();
    for (let i = 0; i < 120; i++) {
      body.move(0, 0, 1 / 120);
      apex = Math.max(apex, body.position.y);
    }
    return apex;
  };
  body.place(0, 0, 3);
  const open = hop();
  assert.ok(Math.abs(open - JUMP_HEIGHT) < 0.02 && body.grounded && body.position.y === 0, `open: ${open}`);
  body.place(12, 0, 12);
  const under = hop();
  assert.ok(Math.abs(under - (2.05 - body.height)) < 0.01 && body.grounded && body.position.y === 0, `under the soffit: ${under}`);
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
