import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';

// The walker's camera and the figure it draws, in a real `Walker` on a small site: neither is
// put anywhere at once. (The page's globals are stood in for: nothing here listens to a key.)
globalThis.window ??= { addEventListener() {}, setTimeout, clearTimeout };
globalThis.document ??= { addEventListener() {}, pointerLockElement: null, hasFocus: () => true, exitPointerLock() {} };
globalThis.matchMedia ??= () => ({ matches: false });
const { Walker, WALK_SPEED } = await import('../src/viewer/walk.ts');

const DT = 1 / 60;

/** A slab with a tower three metres high on it, a ladder on the tower's east face, and whatever else is asked for. */
function site(more = () => {}) {
  const root = new THREE.Group();
  const box = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y + h / 2, z);
    root.add(mesh);
    return mesh;
  };
  box(60, 1, 60, 0, -1, 0); // the slab: top at 0
  box(4, 3, 4, 0, 0, 0); // the tower: a deck at 3.0, its east face at x = 2
  box(0.06, 3, 0.5, 2.1, 0, 0).userData.climb = true; // the ladder, 7 cm off that face
  more(box);
  root.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1000);
  const canvas = { addEventListener() {}, setPointerCapture() {}, requestPointerLock() {} };
  const walker = new Walker(canvas, camera, {
    solids: () => [root],
    ground: () => -0.45,
    reach: () => 500,
    leave() {},
    act() {},
    viewed() {},
    locked() {},
  });
  walker.motion = 0; // (a steady camera: what is left is where the body takes it)
  return { walker, camera, root };
}

test('taking hold of a ladder and stepping off its top, the eyes and the figure follow the body: they are not put there', () => {
  for (const third of [false, true]) {
    const { walker, camera } = site();
    // beside the ladder's line, so that taking hold of it is a step sideways as well as forward
    walker.start(new THREE.Vector3(5, 0, 0.3), new THREE.Vector3(0, 0, 0.3), 1.7, 1.85);
    walker.third = third;
    walker.stick(0, 1);
    let eye = camera.position.clone();
    let figure = (walker.stands ?? walker.body.position).clone();
    let facing = walker.heading;
    let mounted = false;
    let left = false;
    let most = 0;
    let turned = 0;
    let body = 0;
    let at = walker.body.position.clone();
    for (let i = 0; i < 60 * 12 && !left; i++) {
      walker.update(DT);
      const stands = walker.stands ?? walker.body.position;
      // (over the shoulder the camera is on its boom, which a wall behind it brings in at once: there it is the figure that is watched)
      most = Math.max(most, third ? 0 : camera.position.distanceTo(eye), stands.distanceTo(figure));
      body = Math.max(body, walker.body.position.distanceTo(at));
      turned = Math.max(turned, Math.abs(Math.atan2(Math.sin(walker.heading - facing), Math.cos(walker.heading - facing))));
      eye = camera.position.clone();
      figure = stands.clone();
      facing = walker.heading;
      at = walker.body.position.clone();
      if (walker.body.on) mounted = true;
      else if (mounted && walker.body.grounded && walker.body.position.y > 2.9) left = true;
    }
    // a few frames more, for what is still being followed
    for (let i = 0; i < 30; i++) {
      walker.update(DT);
      const stands = walker.stands ?? walker.body.position;
      // (over the shoulder the camera is on its boom, which a wall behind it brings in at once: there it is the figure that is watched)
      most = Math.max(most, third ? 0 : camera.position.distanceTo(eye), stands.distanceTo(figure));
      eye = camera.position.clone();
      figure = stands.clone();
    }
    const view = third ? 'over the shoulder' : 'through the eyes';
    assert.ok(mounted && left, `${view}: up the ladder and on to the deck`);
    assert.ok(body > 0.25, `${view}: the body itself was put ${body} m in a frame (on to the ladder, or off it)`);
    assert.ok(most < 0.13, `${view}: the eyes and the figure go at most ${most} m in a frame`);
    assert.ok(turned < 0.25, `${view}: the figure turns at most ${turned} rad in a frame to face the rungs`);
    assert.ok(figure.distanceTo(walker.body.position) < 1e-6, `${view}: and they end where the body is`);
  }
});

test('over the shoulder, something thin crossing behind the head brings the camera in at once and lets it out by degrees', () => {
  // a handrail's post two metres behind where the figure stands, off to one side of the camera's line
  const { walker, camera } = site((box) => box(0.05, 3, 0.05, 11.2, 0, 12.0));
  walker.start(new THREE.Vector3(10, 0, 10), new THREE.Vector3(10, 0, 0), 1.7, 1.85);
  walker.setThird(true);
  for (let i = 0; i < 40; i++) walker.update(DT); // pulled back
  const head = () => new THREE.Vector3(walker.body.position.x, walker.body.position.y + 1.7, walker.body.position.z);
  const full = camera.position.distanceTo(head());
  assert.ok(full > 3 && walker.outside, `pulled back ${full} m`);
  // the head turns: the line to the camera sweeps across the post
  let least = full;
  let out = 0;
  let last = full;
  let crossed = 0;
  for (let i = 0; i < 240; i++) {
    walker.look(i < 120 ? -0.006 : 0, 0);
    walker.update(DT);
    const far = camera.position.distanceTo(head());
    if (far < full - 0.5) crossed++;
    least = Math.min(least, far);
    out = Math.max(out, far - last);
    last = far;
  }
  assert.ok(least < full - 1, `the post brought it in to ${least} m`);
  assert.ok(crossed > 3, 'for more than the frame or two the post was in the way');
  assert.ok(out < 0.1, `and it went out again by at most ${out} m in a frame`);
  assert.ok(Math.abs(last - full) < 0.01, 'all the way');
});

test('whether the figure is drawn does not flicker as the camera comes to the line', async () => {
  const { boomOutside, boomTo } = await import('../src/viewer/walk.ts');
  assert.equal(boomTo(3.4, 1.0, DT), 1.0, 'in at once');
  assert.ok(boomTo(1.0, 3.4, DT) - 1.0 < 0.06 && boomTo(1.0, 3.4, DT) > 1.0, 'out by degrees');
  assert.equal(boomTo(3.39, 3.4, DT), 3.4, 'and no further than is clear');
  assert.equal(boomTo(Number.POSITIVE_INFINITY, 2, DT), 2);
  let outside = false;
  let flips = 0;
  for (let i = 0; i < 200; i++) {
    const next = boomOutside(outside, 1.2 + 0.1 * Math.sin(i)); // hovering either side of the line
    if (next !== outside) flips++;
    outside = next;
  }
  assert.equal(flips, 0, 'within its slack of the line it stays as it was');
  assert.ok(boomOutside(false, 1.5) && !boomOutside(true, 0.9));
  assert.ok(WALK_SPEED > 1);
});
