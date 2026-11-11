import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import {
  Body,
  bump,
  CLIMB_SPEED,
  climb,
  hang,
  GRAVITY,
  JUMP_HEIGHT,
  JUMP_SPEED,
  jump,
  pickFloor,
  QUICKEN,
  quicken,
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

test('a body gathers its speed and loses it: most of the way in a quarter of a second, never past what was asked, and then truly at rest', () => {
  let v = [0, 0];
  let t = 0;
  while (v[0] < 0.95 * WALK_SPEED && t < 2) {
    v = quicken(v[0], v[1], WALK_SPEED, 0, 1 / 120);
    t += 1 / 120;
    assert.ok(v[0] <= WALK_SPEED && v[1] === 0);
  }
  assert.ok(t > 0.2 && t < 0.3, `walking pace in ${t} s`);
  assert.ok(Math.abs(t - 3 * QUICKEN) < 0.02);
  t = 0;
  while ((v[0] !== 0 || v[1] !== 0) && t < 2) {
    v = quicken(v[0], v[1], 0, 0, 1 / 120);
    t += 1 / 120;
  }
  assert.ok(t > 0.15 && t < 0.4, `at rest in ${t} s`);
  // a change of direction goes round, not through a stop
  const turn = quicken(WALK_SPEED, 0, 0, WALK_SPEED, 0.05);
  assert.ok(turn[0] > 0 && turn[1] > 0 && Math.hypot(...turn) > 0.6 * WALK_SPEED);
  // and the same whatever the frame rate
  let a = [0, 0];
  for (let i = 0; i < 12; i++) a = quicken(a[0], a[1], 4, 0, 1 / 120);
  let b = [0, 0];
  for (let i = 0; i < 3; i++) b = quicken(b[0], b[1], 4, 0, 1 / 30);
  assert.ok(Math.abs(a[0] - b[0]) < 1e-9);
});

test('a ladder is climbed at its own pace, between its foot and its top, and says which end was reached', () => {
  const ladder = { bottom: 0, top: 3 };
  assert.deepEqual(climb(1, 1, ladder, 0.5), { y: 1 + CLIMB_SPEED * 0.5, off: null });
  assert.deepEqual(climb(1, -1, ladder, 0.5), { y: 1 - CLIMB_SPEED * 0.5, off: null });
  assert.deepEqual(climb(1, 0, ladder, 0.5), { y: 1, off: null });
  assert.deepEqual(climb(2.9, 1, ladder, 1), { y: 3, off: 'top' });
  assert.deepEqual(climb(0.1, -1, ladder, 1), { y: 0, off: 'bottom' });
  assert.deepEqual(
    climb(3, -0.5, ladder, 1),
    { y: 3 - CLIMB_SPEED * 0.5, off: null },
    'half a push is half the pace, and the top going down is not an end',
  );
  assert.equal(climb(1, 5, ladder, 1).y, 1 + CLIMB_SPEED, 'no faster for pushing harder');
});

test('a body hangs just off the face of a ladder on the side it came from, across the thin way', () => {
  const ladder = { bottom: 0, top: 3, x: 10, z: 4, hx: 0.03, hz: 0.25 };
  const east = hang(ladder, 12, 4.2, 0.26);
  assert.ok(Math.abs(east.x - (10 + 0.03 + 0.26 + 0.04)) < 1e-9 && east.z === 4 && east.nx === 1 && east.nz === 0);
  const west = hang(ladder, 9, 3, 0.26);
  assert.ok(west.x < 10 && west.nx === -1);
  assert.equal(hang(ladder, 12, 4, 0.26, -1).nx, -1, 'or the side that is named');
  const turned = hang({ ...ladder, hx: 0.25, hz: 0.03 }, 10, 9, 0.26);
  assert.ok(turned.nz === 1 && turned.nx === 0 && turned.x === 10 && turned.z > 4.3);
});

/** A deck three metres up with a ladder on its east face, on a slab. */
function tower(proud = 0) {
  const root = new THREE.Group();
  const box = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y + h / 2, z);
    root.add(mesh);
    return mesh;
  };
  box(40, 1, 40, 0, -1, 0); // the slab
  box(4, 3, 4, 0, 0, 0); // the tower: its top a deck at 3.0, its east face at x = 2
  const ladder = box(0.06, 3.0 + proud, 0.5, 2.1, 0, 0); // standing 7 cm off that face, and `proud` metres above the deck
  ladder.userData.climb = true;
  root.updateMatrixWorld(true);
  const solids = new Solids();
  solids.set([root]);
  const body = new Body(solids);
  body.ground = -0.45;
  return { body, ladder, root };
}

/** Ask a body's legs for (x, z) for `seconds`: forward is up on a ladder. */
function go(body, x, z, seconds, push = 1) {
  const dt = 1 / 60;
  body.climbing = push;
  for (let t = 0; t < seconds; t += dt) body.move(x * WALK_SPEED * dt, z * WALK_SPEED * dt, dt);
}

test('walking into a ladder takes hold of it; forward climbs it and steps off onto the deck at its top', () => {
  const { body } = tower();
  body.place(5, 0, 0);
  go(body, -1, 0, 3);
  assert.ok(body.on, 'on the ladder');
  assert.ok(Math.abs(body.position.x - (2.13 + RADIUS + 0.04)) < 1e-6 && body.position.z === 0, `hanging at x = ${body.position.x}`);
  const y1 = body.position.y;
  go(body, -1, 0, 1);
  assert.ok(
    Math.abs(body.position.y - y1 - CLIMB_SPEED) < 0.02,
    'a second of climbing is 0.6 m, whatever the legs were doing over the ground',
  );
  assert.ok(Math.abs(body.position.x - (2.13 + RADIUS + 0.04)) < 1e-6);
  go(body, -1, 0, 3.2);
  assert.equal(body.on, null);
  assert.ok(body.grounded && Math.abs(body.position.y - 3) < 1e-6 && body.position.x < 2, `on the deck: ${body.position.toArray()}`);
});

test('on a ladder nothing falls; back goes down to the ground; a hop lets go', () => {
  const { body } = tower();
  body.place(5, 0, 0);
  go(body, -1, 0, 5);
  const y = body.position.y;
  assert.ok(body.on && y > 1);
  go(body, 0, 0, 2, 0);
  assert.equal(body.position.y, y, 'hanging on, it stays where it is');
  go(body, 0, 0, 1, -1);
  assert.ok(Math.abs(body.position.y - (y - CLIMB_SPEED)) < 0.02);
  go(body, 0, 0, 6, -1);
  assert.equal(body.on, null);
  go(body, 0, 0, 0.3, 0);
  assert.ok(body.grounded && Math.abs(body.position.y) < 1e-6, `down at the bottom: y = ${body.position.y}`);
  // up again, and let go half way
  go(body, -1, 0, 4);
  assert.ok(body.on && body.position.y > 1);
  body.jump();
  assert.equal(body.on, null);
  go(body, 0, 0, 1.5, 0);
  assert.ok(body.grounded && Math.abs(body.position.y) < 1e-6 && body.position.x > 2.4, 'dropped clear of it');
});

test('a ladder is only taken hold of by walking at it; from the deck above, by walking to its top looking down', () => {
  const { body } = tower();
  // past it, close, but not into it
  body.place(2.45, 0, -3);
  go(body, 0, 1, 4);
  assert.equal(body.on, null);
  assert.ok(body.position.z > 2, 'walked on by');
  // backing into it does not count either
  body.place(3, 0, 0);
  go(body, -1, 0, 2, -1);
  assert.equal(body.on, null);
  // on the deck, walking to the edge over it: looking ahead, off the edge; looking down, onto the ladder
  body.place(0, 3, 0);
  body.lookingDown = true;
  go(body, 1, 0, 1.6);
  assert.ok(body.on && body.on.nx === 1, 'on it, on its outer side');
  assert.ok(body.position.x > 2.13 && body.position.y > 2.3 && body.position.y < 3, 'and going down it, since forward was the way down');
  go(body, 0, 0, 0.1, 0);
  const paused = body.position.y;
  go(body, 0, 0, 0.5, 1);
  assert.ok(body.position.y > paused, 'once the legs have stopped, forward is up again');
  go(body, 0, 0, 6, -1);
  go(body, 0, 0, 0.3, 0);
  assert.ok(!body.on && body.grounded && Math.abs(body.position.y) < 1e-6);
  // mount() does the same when asked (the wheel's Climb), from above or below
  body.place(0, 3, 0);
  body.mount(tower().body.solids.ladders()[0] ?? { bottom: 0, top: 3, x: 2.13, z: 0, hx: 0.03, hz: 0.25 });
  assert.ok(body.on && body.on.nx === 1 && body.position.y > 2.9);
});

/** An open steel stair: thin treads with daylight between them and no risers, up to a deck, with a rail down each side. */
function flight(rise, going = 0.27, steps = 12) {
  const root = new THREE.Group();
  const box = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y + h / 2, z);
    root.add(mesh);
  };
  box(40, 1, 60, 0, -1, 0); // the slab
  // tread i has its top at rise * i and runs from z = going * (i - 1) to going * i, less a gap at the back
  for (let i = 1; i <= steps; i++) box(1, 0.03, going - 0.04, 0, rise * i - 0.03, going * (i - 0.5));
  box(4, 0.2, 4, 0, rise * steps - 0.2, going * steps + 2); // the deck the flight reaches
  for (const x of [-0.55, 0.55]) {
    // each rail: a tube a metre above the pitch line, on posts
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, Math.hypot(going * steps, rise * steps)));
    rail.position.set(x, (rise * steps) / 2 + 1, (going * steps) / 2);
    rail.rotation.x = -Math.atan2(rise, going);
    root.add(rail);
  }
  root.updateMatrixWorld(true);
  const solids = new Solids();
  solids.set([root]);
  const body = new Body(solids);
  body.ground = -0.45;
  return { body, top: rise * steps, length: going * steps };
}

test('open-tread stairs are walked and run up and down without a hop, a stall or a fall between the treads', () => {
  for (const rise of [0.2, 0.25])
    for (const speed of [WALK_SPEED, RUN_SPEED]) {
      const { body, top, length } = flight(rise);
      const dt = 1 / 60;
      const walkTo = (z0, z1) => {
        let air = 0;
        let worst = 0;
        const way = Math.sign(z1 - z0);
        body.place(0, body.position.y, z0);
        for (let t = 0; t < 30 && (body.position.z - z1) * way < 0; t += dt) {
          const before = body.position.clone();
          body.move(0, way * speed * dt, dt);
          if (!body.grounded) air++;
          worst = Math.max(worst, Math.abs(body.position.y - before.y) / dt);
          assert.ok(
            Math.abs(body.position.z - before.z - way * speed * dt) < 1e-6,
            `never held up: rise ${rise}, ${speed} m/s, at z = ${before.z}`,
          );
        }
        return { air, worst };
      };
      body.place(0, 0, -1);
      const up = walkTo(-1, length + 1.5);
      assert.ok(Math.abs(body.position.y - top) < 1e-6, `up a flight of ${rise} m risers at ${speed} m/s: y = ${body.position.y}`);
      assert.equal(up.air, 0, 'the feet never leave the treads going up');
      const down = walkTo(length + 1.5, -1);
      assert.ok(Math.abs(body.position.y) < 1e-6, `and down again: y = ${body.position.y}`);
      assert.equal(down.air, 0, `nor going down (${rise} m risers at ${speed} m/s)`);
      const most = Math.max(3, 1.3 * speed) + 1e-6;
      assert.ok(up.worst <= most && down.worst <= most, 'and they never move faster than a foot follows a floor');
    }
});

test("a stair's handrails keep a body on it", () => {
  const { body, top } = flight(0.2);
  body.place(0, top / 2, 0.27 * 6);
  for (const way of [1, -1]) {
    for (let t = 0; t < 2; t += 1 / 60) body.move((way * WALK_SPEED) / 60, 0, 1 / 60);
    assert.ok(
      Math.abs(body.position.x) < 0.55 - RADIUS + 0.03 && body.grounded && body.position.y > top / 2 - 0.3,
      `held by the rail at x = ${body.position.x}`,
    );
  }
});

test('a ladder whose stiles stand a metre above the deck is left at the deck, and taken from the deck on its open side', () => {
  const { body } = tower(1);
  body.place(5, 0, 0);
  go(body, -1, 0, 1.9);
  assert.ok(body.on);
  let off = null;
  for (let t = 0; t < 10 && body.on; t += 1 / 60) {
    body.move(0, 0, 1 / 60);
    off = body.position.y;
  }
  assert.equal(body.on, null);
  assert.ok(
    body.grounded && Math.abs(off - 3) < 1e-6 && body.position.x < 2,
    `stepped onto the deck at its own height, not at the stiles' top: ${body.position.toArray()}`,
  );
  // and back: from the deck, at the ladder, looking down
  body.place(0.5, 3, 0);
  body.lookingDown = true;
  go(body, 1, 0, 1.5);
  assert.ok(
    body.on && body.on.nx === 1 && body.position.y < 3 && body.position.x > 2.13,
    `on its outer side, going down: ${body.position.toArray()}`,
  );
  go(body, 0, 0, 6, 1);
  go(body, 0, 0, 0.3, 0);
  assert.ok(!body.on && body.grounded && Math.abs(body.position.y) < 1e-6);
});
