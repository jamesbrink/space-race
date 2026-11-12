import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { FreeRig } from '../src/viewer/camera/free.ts';
import {
  aimBelow,
  anchorOk,
  anglesOf,
  approach,
  blendPose,
  Coast,
  fitDistance,
  frameOf,
  journeyAt,
  journeySeconds,
  NEAREST,
  nudgeIntoFrame,
  offsetOf,
  trackFov,
  wheelZoom,
  ZOOM_LEAD,
  ZOOM_RATE,
  Zoom,
  zoomBy,
} from '../src/viewer/camera/maths.ts';
import { OnboardRig } from '../src/viewer/camera/onboard.ts';
import { ChaseRig, OrbitRig } from '../src/viewer/camera/orbit.ts';
import { TrackRig } from '../src/viewer/camera/track.ts';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const NONE = new Set();
/** A seeded random number, 0 to 1: the same trials every run. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pose = () => ({ position: V(0, 0, 0), quaternion: new THREE.Quaternion(), fov: 35 });
const posed = (rig) => {
  const p = pose();
  rig.pose(p);
  return p;
};

/** A level place: ground at y = 0 out to 500 m, a vehicle if one is given. */
function world(craft = null) {
  return {
    upAt: (_p, out) => out.set(0, 1, 0),
    clearance: (p) => p.y,
    reach: () => ({ centre: V(0, 0, 0), radius: 500 }),
    far: () => 5000,
    maxPolar: () => Math.PI / 2 - 0.015,
    craft: () => craft,
  };
}
function craftAt(position, radius = 12) {
  return {
    matrix: new THREE.Matrix4().makeTranslation(position.x, position.y, position.z),
    centre: V(0, 10, 0),
    radius,
    shape: 1,
    flying: true,
    seat: null,
  };
}
/** Run a rig for `seconds` at `fps`, doing `each(t, dt)` before every step. */
function run(rig, seconds, fps, each = () => {}, keys = NONE) {
  const dt = 1 / fps;
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    each(i * dt, dt);
    rig.update(dt, keys, false);
  }
}

test('a wheel is a proportion: a notch is a sixth, a pinch is finer, and one event is never a leap', () => {
  assert.ok(near(Math.exp(wheelZoom(120)), 1.183, 0.01));
  assert.equal(wheelZoom(-120), -wheelZoom(120));
  assert.equal(wheelZoom(5000), wheelZoom(150), 'one event counts for no more than 150 pixels');
  assert.equal(wheelZoom(3, 1), wheelZoom(120), 'three lines are a notch');
  assert.ok(Math.exp(wheelZoom(4, 0, true)) < 1.05, 'a pixel of pinch is a little');
  assert.equal(wheelZoom(Number.NaN), 0);
  assert.equal(wheelZoom(0), 0);
});

test("a trackpad's flick does not wind the zoom up: it runs at a set pace and stops soon after the events do", () => {
  const z = new Zoom(Math.log(60));
  // sixty inertial events in half a second, decaying from 60 pixels: about a thousand pixels in all
  let t = 0;
  for (let i = 0; i < 60; i++) {
    z.push(wheelZoom(Math.max(1, 60 * 0.93 ** i)));
    assert.ok(z.goal - z.now <= ZOOM_LEAD + 1e-12, 'never asked to run further ahead than the lead');
    z.step(1 / 120);
    t += 1 / 120;
  }
  for (let i = 0; i < 240; i++) z.step(1 / 120);
  const factor = Math.exp(z.now) / 60;
  assert.ok(factor > 1.5 && factor < Math.exp(ZOOM_RATE * t + ZOOM_LEAD), `a flick zoomed ${factor.toFixed(2)} times`);
  assert.ok(factor < 8, 'one flick is not from the pad to orbit');
  assert.equal(z.moving, false, 'and it has stopped');
});

test('zoom, easing and coasting go by time, not by frame', () => {
  const at = (fps) => {
    const z = new Zoom(0);
    for (let i = 0; i < fps; i++) {
      if (i % (fps / 10) === 0) z.push(0.2);
      z.step(1 / fps);
    }
    return z.now;
  };
  assert.ok(near(at(30), at(120), 0.03), `${at(30)} at 30 fps, ${at(120)} at 120`);
  // exact forms: two half steps are one whole one
  assert.ok(near(approach(approach(3, 10, 0.2, 0.05), 10, 0.2, 0.05), approach(3, 10, 0.2, 0.1), 1e-12));
  const a = new Coast();
  const b = new Coast();
  a.v = b.v = 2;
  const whole = a.step(0.1);
  const halves = b.step(0.05) + b.step(0.05);
  assert.ok(near(whole, halves, 1e-12) && near(a.v, b.v, 1e-12));
  // and a coast comes to rest having gone v times tau
  const c = new Coast();
  c.v = 2;
  let gone = 0;
  for (let i = 0; i < 2000; i++) gone += c.step(0.01, 0.22);
  assert.ok(near(gone, 0.44, 1e-3) && c.v === 0);
});

test('zooming out never moves the pivot and never turns the view', () => {
  const random = seeded(7);
  for (let i = 0; i < 500; i++) {
    const pivot = V(random() * 200 - 100, random() * 50, random() * 200 - 100);
    const eye = pivot.clone().add(V(random() - 0.5, random() - 0.2, random() - 0.5).setLength(0.1 + random() * 5000));
    const anchor = random() < 0.5 ? V(random() * 100, 0, random() * 100) : null; // (given or not, going out it is not used)
    const was = pivot.clone();
    const from = eye.clone().sub(pivot).normalize();
    const before = eye.distanceTo(pivot);
    const factor = 1 + random() * 3;
    zoomBy(pivot, eye, factor, anchor, 0.35, 400_000);
    assert.ok(pivot.equals(was), 'the pivot is where it was');
    assert.ok(eye.clone().sub(pivot).normalize().distanceTo(from) < 1e-9, 'seen from the same side');
    assert.ok(eye.distanceTo(pivot) >= before - 1e-9, 'and further off, not nearer');
  }
});

test('zooming in toward a surface keeps that surface under the pointer, turns nothing, and stops short of it', () => {
  const random = seeded(11);
  for (let i = 0; i < 500; i++) {
    const pivot = V(random() * 20, random() * 20, random() * 20);
    const eye = pivot.clone().add(V(random() - 0.5, random() * 0.6 + 0.05, random() - 0.5).setLength(5 + random() * 500));
    const anchor = pivot.clone().add(V(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(4));
    const ray = anchor.clone().sub(eye).normalize();
    const from = eye.clone().sub(pivot).normalize();
    const toPivot = pivot.distanceTo(anchor);
    for (let n = 0; n < 40; n++) zoomBy(pivot, eye, 0.8, anchor, 0.35, 1e6);
    assert.ok(
      anchor.clone().sub(eye).normalize().distanceTo(ray) < 1e-6,
      'the anchor is on the same line from the eye: the same place on the screen',
    );
    assert.ok(eye.clone().sub(pivot).normalize().distanceTo(from) < 1e-6, 'the view has not turned');
    assert.ok(pivot.distanceTo(anchor) < toPivot + 1e-9, 'the pivot has come toward it');
    assert.ok(eye.distanceTo(anchor) >= NEAREST - 1e-9, 'and the eye has not gone through it');
  }
});

test('limits hold the zoom without throwing a view back that is already past them', () => {
  const pivot = V(0, 0, 0);
  const eye = V(0, 0, 10);
  zoomBy(pivot, eye, 0.001, null, 2, 100);
  assert.ok(near(eye.length(), 2), 'no nearer than the least');
  zoomBy(pivot, eye, 1e6, null, 2, 100);
  assert.ok(near(eye.length(), 100), 'no further than the most');
  eye.set(0, 0, 0.5); // (brought nearer than the least by a zoom toward a surface)
  zoomBy(pivot, eye, 0.9, null, 2, 100);
  assert.ok(near(eye.length(), 0.5), 'already nearer than the least: held, not pushed out');
  zoomBy(pivot, eye, 1.5, null, 2, 100);
  assert.ok(near(eye.length(), 0.75), 'and free to go out');
  eye.set(0, 0, 5000);
  zoomBy(pivot, eye, 1.1, null, 2, 100);
  assert.ok(near(eye.length(), 5000), 'already beyond the most: held, not pulled in');
});

test('only something near and solid is zoomed toward: not the sky, not the far ground', () => {
  const eye = V(0, 10, 60);
  const pivot = V(0, 10, 0);
  assert.equal(anchorOk(eye, pivot, null), false, 'the sky gives nothing');
  assert.equal(anchorOk(eye, pivot, V(0, 0, -4000)), false, 'the horizon is too far');
  assert.equal(anchorOk(eye, pivot, V(8, 12, 3)), true, 'the gantry beside the subject is near');
  assert.equal(anchorOk(eye, pivot, V(0, 0, 55)), true, 'so is a thing at the camera feet');
  assert.equal(anchorOk(eye, pivot, V(6, 0, 4), true), true, 'bare ground beside the subject can be zoomed to');
  assert.equal(anchorOk(eye, pivot, V(0, 0, 40), true), false, 'bare ground a field away cannot: the zoom goes back to the subject');
});

test('angles round a pivot and the offset they stand for are each other inverse, in any frame', () => {
  const random = seeded(3);
  for (let i = 0; i < 200; i++) {
    const up = V(random() - 0.5, random() + 0.2, random() - 0.5).normalize();
    const turn = frameOf(up);
    const theta = (random() - 0.5) * 6;
    const phi = 0.05 + random() * 3;
    const d = 0.1 + random() * 1e5;
    const o = offsetOf(theta, phi, d, turn);
    const a = anglesOf(o, turn);
    assert.ok(near(a.distance, d, 1e-6 * d) && near(a.phi, phi, 1e-6) && near(Math.sin(a.theta - theta), 0, 1e-6));
    assert.ok(near(o.clone().normalize().dot(up), Math.cos(phi), 1e-9), 'phi is measured from the frame up');
  }
});

test('a subject is framed in the clear part of the frame by tipping the camera, not by moving the pivot', () => {
  assert.ok(near(fitDistance(25, 35, 0.5), 25 / 2 / Math.tan((17.5 * Math.PI) / 180) / 0.5, 1e-9));
  assert.equal(aimBelow(0, 35), 0);
  // with a quarter of the frame covered, the pivot is seen a quarter of a half-height above the middle
  const below = aimBelow(0.25, 35);
  assert.ok(near(Math.tan(below) / Math.tan((17.5 * Math.PI) / 180), 0.25, 1e-12));
  const rig = new OrbitRig(world(), 35);
  rig.goTo(V(0, 10, 0), V(40, 30, 40), true);
  rig.update(0, NONE, false);
  const clear = posed(rig);
  rig.inset = 0.3;
  run(rig, 3, 60);
  const covered = posed(rig);
  assert.ok(covered.position.distanceTo(clear.position) < 1e-9, 'a panel opening moves the eye nowhere');
  const seen = rig.pivot.clone().sub(covered.position).applyQuaternion(covered.quaternion.clone().invert());
  assert.ok(near(seen.y / -seen.z / Math.tan((17.5 * Math.PI) / 180), 0.3, 1e-6), 'the pivot is in the middle of what is left clear');
  assert.ok(near(seen.x, 0, 1e-9));
});

test('a journey starts where the view is, ends where it was sent, and passes through nowhere twice', () => {
  const j = { pivot0: V(0, 0, 0), pivot1: V(50, 5, 0), offset0: V(0, 5, 30), offset1: V(80, 20, 0), t: 0, seconds: 0 };
  j.seconds = journeySeconds(j.pivot0, j.offset0, j.pivot1, j.offset1);
  assert.ok(j.seconds >= 0.9 && j.seconds <= 2.8);
  const p = V(0, 0, 0);
  const o = V(0, 0, 0);
  journeyAt(j, p, o);
  assert.ok(p.distanceTo(j.pivot0) < 1e-9 && o.distanceTo(j.offset0) < 1e-9);
  let last = o.length();
  for (let i = 1; i <= 100; i++) {
    j.t = i / 100;
    journeyAt(j, p, o);
    assert.ok(o.length() >= last - 1e-9, 'pulling back all the way: never in and out again');
    last = o.length();
  }
  assert.ok(p.distanceTo(j.pivot1) < 1e-9 && o.distanceTo(j.offset1) < 1e-6);
});

test('a subject that has moved by itself is brought back into frame by the least move, and not at all if it is in frame', () => {
  const eye = V(0, 0, 100);
  const turn = new THREE.Quaternion();
  assert.equal(nudgeIntoFrame(eye, turn, 35, 1.6, V(5, 3, 0)).length(), 0, 'inside: nothing moves');
  const off = V(200, 0, 0);
  const by = nudgeIntoFrame(eye, turn, 35, 1.6, off);
  assert.ok(by.x > 0 && near(by.y, 0) && near(by.z, 0), 'sideways only');
  const edge = 100 * Math.tan((17.5 * Math.PI) / 180) * 0.8 * 1.6;
  assert.ok(near(off.x - by.x, edge, 1e-9), 'to the edge of the middle of the frame, no further');
});

test('the orbiting rig: zooming out by hand, however it is done, leaves the pivot and the direction alone', () => {
  const random = seeded(23);
  const rig = new OrbitRig(world(), 35);
  rig.min = 0.35;
  rig.max = 11_000;
  rig.goTo(V(3, 12, -4), V(-40, 30, 50), true);
  rig.update(0, NONE, false);
  const pivot = rig.pivot.clone();
  const from = posed(rig).position.sub(pivot).normalize();
  // a hundred wheel events of every size, with whatever happens to be under the pointer: a far hill, the pad, nothing
  for (let i = 0; i < 100; i++) {
    const hit = [null, V(900, 0, 2000), V(2, 0, 1), V(random() * 50, 0, random() * 50)][Math.floor(random() * 4)];
    rig.zoom(wheelZoom(1 + random() * 400), hit);
    run(rig, 0.02 + random() * 0.05, 60);
    assert.ok(rig.pivot.distanceTo(pivot) < 1e-9, 'the pivot has not moved');
    assert.ok(posed(rig).position.sub(rig.pivot).normalize().distanceTo(from) < 1e-9, 'nor the direction');
  }
  run(rig, 2, 60);
  assert.ok(near(rig.distance, 11_000, 1e-6), 'out to the place limit and no further');
  assert.equal(rig.pivotMoved, false);
});

test('the orbiting rig: zooming in goes to the pointer on something near, to the pivot otherwise, and never while drifting', () => {
  const make = () => {
    const rig = new OrbitRig(world(), 35);
    rig.goTo(V(0, 12, 0), V(-40, 30, 50), true);
    rig.update(0, NONE, false);
    return rig;
  };
  const sky = make();
  for (let i = 0; i < 20; i++) {
    sky.zoom(wheelZoom(-120), null);
    run(sky, 0.05, 60);
  }
  assert.ok(sky.pivot.distanceTo(V(0, 12, 0)) < 1e-9, 'over the sky: straight in');
  const far = make();
  far.zoom(wheelZoom(-120), V(3000, 0, -4000));
  run(far, 1, 60);
  assert.ok(far.pivot.distanceTo(V(0, 12, 0)) < 1e-9, 'over the far ground: straight in');
  const on = make();
  const nose = V(1, 24, 0);
  const before = on.pivot.distanceTo(nose);
  for (let i = 0; i < 30; i++) {
    on.zoom(wheelZoom(-120), nose);
    run(on, 0.05, 60);
  }
  run(on, 1, 60);
  assert.ok(on.pivot.distanceTo(nose) < 0.05 * before, 'over the nose: the pivot comes to it');
  assert.equal(on.pivotMoved, true, 'and the page is told, to show where it is');
  assert.ok(posed(on).position.distanceTo(nose) >= NEAREST - 1e-6);
  const drifting = make();
  drifting.drift = true;
  drifting.zoom(wheelZoom(-120), nose);
  run(drifting, 1, 60);
  assert.ok(drifting.pivot.distanceTo(V(0, 12, 0)) < 1e-9, 'drifting round a subject, the zoom is about the subject');
});

test('the orbiting rig: a turn let go coasts the same distance at any frame rate, and not at all when calm', () => {
  const coast = (fps, calm = false) => {
    const rig = new OrbitRig(world(), 35);
    rig.calm = calm;
    rig.goTo(V(0, 10, 0), V(30, 20, 30), true);
    rig.update(0, NONE, false);
    const from = rig.theta;
    rig.fling(600, 0, 900);
    run(rig, 3, fps);
    return rig.theta - from;
  };
  assert.ok(Math.abs(coast(60)) > 0.3, 'it coasts');
  assert.ok(near(coast(30), coast(144), 1e-4), `${coast(30)} at 30 fps, ${coast(144)} at 144`);
  assert.equal(coast(60, true), 0, 'calm: it stops where it was let go');
});

test('the orbiting rig: the eye and the pivot stay above the ground and within the place', () => {
  const random = seeded(5);
  const rig = new OrbitRig(world(), 35);
  rig.max = 11_000;
  rig.goTo(V(0, 2, 0), V(20, 8, 20), true);
  for (let i = 0; i < 4000; i++) {
    const r = random();
    if (r < 0.4) rig.drag((random() - 0.5) * 80, (random() - 0.3) * 80, 900, false);
    else if (r < 0.7) rig.drag((random() - 0.5) * 200, (random() - 0.5) * 200, 900, true);
    else rig.zoom((random() - 0.5) * 0.6, random() < 0.5 ? V(random() * 30, 0, random() * 30) : null);
    rig.update(1 / 60, NONE, false);
    const eye = posed(rig).position;
    assert.ok(Number.isFinite(eye.x + eye.y + eye.z), 'never not a number');
    assert.ok(eye.y >= 0.35 - 1e-6, `the eye is above the ground (${eye.y})`);
    assert.ok(rig.pivot.y >= 0.1 - 1e-9 && rig.pivot.length() <= 500.2, 'the pivot is on the place');
  }
});

test('the orbiting rig: a touch ends a journey where it is, without a jump', () => {
  const rig = new OrbitRig(world(), 35);
  rig.goTo(V(0, 10, 0), V(30, 20, 30), true);
  rig.update(0, NONE, false);
  rig.goTo(V(100, 5, 40), V(120, 15, 80), false);
  run(rig, 0.6, 60);
  assert.ok(rig.journey, 'on its way');
  const before = posed(rig);
  rig.drag(0.0001, 0, 900, false);
  rig.update(1 / 60, NONE, false);
  const after = posed(rig);
  assert.equal(rig.journey, null);
  assert.ok(after.position.distanceTo(before.position) < 1e-3 * rig.distance, 'it stopped where it was');
  const still = posed(rig);
  run(rig, 1, 60);
  assert.ok(posed(rig).position.distanceTo(still.position) < 1e-9, 'and stays there');
});

test('the chase rig is carried with the vehicle: the view moves only as the hands move it', () => {
  const craft = craftAt(V(0, 5000, 0));
  const rig = new ChaseRig(world(craft), 35, 'chase');
  rig.enter({ position: V(60, 5020, 40), quaternion: new THREE.Quaternion(), fov: 35 }, V(0, 0, 0));
  rig.update(0, NONE, false);
  const offset = posed(rig).position.sub(rig.pivot);
  run(rig, 5, 60, (_t, dt) => (craft.matrix.elements[13] += 2000 * dt)); // two kilometres a second, straight up
  assert.ok(near(craft.matrix.elements[13], 15_000, 1e-6));
  assert.ok(rig.pivot.distanceTo(V(0, 15_010, 0)) < 1e-6, 'the pivot is the middle of the vehicle, wherever it has got to');
  assert.ok(posed(rig).position.sub(rig.pivot).distanceTo(offset) < 1e-6, 'and the eye is where it was beside it');
});

test('the chase rig: a stage leaving keeps a distance set by hand, and brings the pivot onto what is left without a jump', () => {
  const craft = craftAt(V(0, 60_000, 0));
  const rig = new ChaseRig(world(craft), 35, 'chase');
  rig.enter({ position: V(60, 60_020, 40), quaternion: new THREE.Quaternion(), fov: 35 }, V(0, 0, 0));
  rig.update(0, NONE, false);
  rig.zoom(0.5, null);
  run(rig, 1, 60);
  const set = rig.distance;
  assert.ok(rig.handSet && set > 80);
  // the booster goes: what is left is the capsule, 2 m across, 11 m further up the stack
  craft.centre.set(0, 21, 0);
  craft.radius = 2;
  craft.shape++;
  // (measured beside the vehicle: frame by frame, the eye never steps, though the vehicle does two kilometres a second)
  const beside = () => posed(rig).position.sub(V(0, craft.matrix.elements[13], 0));
  let last = beside();
  let worst = 0;
  run(rig, 3, 60, (_t, dt) => {
    const now = beside();
    worst = Math.max(worst, now.distanceTo(last));
    last = now;
    craft.matrix.elements[13] += 2000 * dt;
  });
  assert.ok(worst < 0.5, `beside the vehicle the eye moved at most ${worst.toFixed(3)} m in a frame`);
  assert.ok(near(rig.distance, set, 1e-6), 'the distance is the one the hands set');
  assert.ok(rig.pivot.distanceTo(V(0, craft.matrix.elements[13] + 21, 0)) < 1e-6, 'the pivot is on what is left');
});

test('the chase rig: the pivot slides onto what is left, never steps; and a distance nobody set is brought to fit', () => {
  const craft = craftAt(V(0, 60_000, 0));
  const rig = new ChaseRig(world(craft), 35, 'chase');
  rig.enter({ position: V(4000, 60_500, 3000), quaternion: new THREE.Quaternion(), fov: 35 }, V(0, 60_000, 0)); // from far off: lost to sight
  assert.equal(rig.handSet, false);
  run(rig, 3, 60);
  const whole = rig.distance;
  assert.ok(near(whole, fitDistance(24, 35, 0.5), 1e-3), 'the whole vehicle is seen');
  craft.centre.set(0, 21, 0);
  craft.radius = 2;
  craft.shape++;
  let before = rig.pivot.clone();
  let step = 0;
  run(rig, 4, 60, () => {
    step = Math.max(step, rig.pivot.distanceTo(before));
    before = rig.pivot.clone();
  });
  assert.ok(step < 0.5, `the pivot never moved more than ${step.toFixed(3)} m in a frame (11 m in all)`);
  assert.ok(rig.pivot.distanceTo(V(0, 60_021, 0)) < 1e-6);
  assert.ok(near(rig.distance, fitDistance(4, 35, 0.5), 1e-3), 'and the view has closed on the capsule');
});

test('the locked chase turns with the vehicle: it holds still in the frame while the world goes round', () => {
  const craft = craftAt(V(0, 1000, 0));
  const rig = new ChaseRig(world(craft), 35, 'locked');
  rig.enter({ position: V(50, 1010, 0), quaternion: new THREE.Quaternion(), fov: 35 }, V(0, 0, 0));
  rig.update(0, NONE, false);
  const seen = () => {
    const p = posed(rig);
    return V(0, 22, 0).applyMatrix4(craft.matrix).sub(p.position).applyQuaternion(p.quaternion.invert());
  };
  const nose = seen();
  // the vehicle pitches over by 60 degrees about its middle
  const at = V(0, 1000, 0);
  craft.matrix.compose(at, new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -Math.PI / 3), V(1, 1, 1));
  rig.update(1 / 60, NONE, false);
  assert.ok(seen().distanceTo(nose) < 1e-6, 'its nose is where it was in the frame');
});

test('handing over from one rig to another starts from the old view exactly and ends at the new one', () => {
  const old = { p: V(10, 5, 3), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 1.1, -0.2)) };
  const next = { p: V(-400, 900, 20), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.7, 2.5, 0.1)) };
  const dp = old.p.clone().sub(next.p);
  const dq = next.q.clone().invert().multiply(old.q);
  const at = (k) => {
    const p = next.p.clone();
    const q = next.q.clone();
    blendPose(p, q, dp, dq, k);
    return { p, q };
  };
  assert.ok(at(0).p.distanceTo(old.p) < 1e-9 && at(0).q.angleTo(old.q) < 1e-6, 'the first frame is the old view');
  assert.ok(at(1).p.distanceTo(next.p) < 1e-9 && at(1).q.angleTo(next.q) < 1e-6, 'the last is the new');
  let last = at(0);
  for (let i = 1; i <= 50; i++) {
    const now = at(i / 50);
    assert.ok(now.p.distanceTo(last.p) < dp.length() / 40 && now.q.angleTo(last.q) < 0.1, 'and it gets there evenly');
    last = now;
  }
});

test('the pad camera stays where it stands, keeps the vehicle in frame, and its lens is as long as a lens gets and no longer', () => {
  const craft = craftAt(V(0, 0, 0));
  const rig = new TrackRig(world(craft));
  rig.stand(V(-90, 1.7, 110));
  rig.enter(pose());
  let lens = 100;
  for (const height of [0, 500, 5000, 50_000, 180_000]) {
    craft.matrix.makeTranslation(height * 0.4, height, 0);
    run(rig, 4, 60);
    const p = posed(rig);
    assert.ok(p.position.distanceTo(V(-90, 1.7, 110)) < 1e-12, 'it has not moved');
    const to = rig.pivot.clone().sub(p.position).normalize();
    assert.ok(V(0, 0, -1).applyQuaternion(p.quaternion).distanceTo(to) < 1e-6, 'it looks at the vehicle');
    assert.ok(p.fov <= lens + 1e-9 && p.fov >= 0.25, `the lens closes as it goes (${p.fov.toFixed(3)} degrees at ${height} m)`);
    lens = p.fov;
  }
  assert.ok(near(lens, 0.25, 1e-6), 'at 180 km it is at its longest');
  assert.ok(near(trackFov(12, 1000, 0.3, 0.25, 50), (2 * Math.atan(12 / 0.3 / 1000) * 180) / Math.PI, 1e-9));
  // the wheel asks for a tighter frame, within limits
  craft.matrix.makeTranslation(0, 800, 0);
  run(rig, 4, 60);
  const loose = posed(rig).fov;
  for (let i = 0; i < 10; i++) {
    rig.zoom(-0.2);
    run(rig, 0.2, 60);
  }
  run(rig, 4, 60);
  assert.ok(posed(rig).fov < 0.5 * loose);
});

test('on board, the eyes are the seat, turned with the vehicle, and the head turns only so far', () => {
  const craft = craftAt(V(100, 2000, 50));
  craft.seat = new THREE.Matrix4().compose(
    V(100, 2018, 50.4),
    new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2),
    V(1, 1, 1),
  );
  const rig = new OnboardRig(world(craft));
  rig.enter();
  rig.update(1 / 60, NONE);
  const p = posed(rig);
  assert.ok(p.position.distanceTo(V(100, 2018, 50.4)) < 1e-9, 'at the eye point');
  const ahead = V(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2));
  assert.ok(V(0, 0, -1).applyQuaternion(p.quaternion).distanceTo(ahead) < 1e-9, 'looking along the seat +Z');
  for (let i = 0; i < 200; i++) rig.drag(-50, 0);
  rig.update(1 / 60, NONE);
  const turned = V(0, 0, -1).applyQuaternion(posed(rig).quaternion).angleTo(ahead);
  assert.ok(turned > 2 && turned < 2.4, `the head turns ${turned.toFixed(2)} rad and stops`);
  rig.home();
  run(rig, 2, 60, () => {}, NONE);
  assert.ok(V(0, 0, -1).applyQuaternion(posed(rig).quaternion).distanceTo(ahead) < 1e-6, '0 looks ahead again');
});

test('the free camera closes on what it is pointed at by proportion and never goes through it; out is straight back', () => {
  const rig = new FreeRig(world(), 35);
  rig.enter({ position: V(0, 20, 100), quaternion: new THREE.Quaternion(), fov: 35 }, V(0, 20, 0));
  const rivet = V(0, 20, 0);
  for (let i = 0; i < 200; i++) {
    rig.zoom(-0.17, rivet);
    rig.update(1 / 60, NONE, false);
  }
  run(rig, 1, 60);
  const close = posed(rig).position.distanceTo(rivet);
  assert.ok(close >= NEAREST - 1e-6 && close < 0.1, `${close.toFixed(3)} m from it`);
  const before = posed(rig).position.clone();
  for (let i = 0; i < 20; i++) {
    rig.zoom(0.17, null);
    rig.update(1 / 60, NONE, false);
  }
  run(rig, 1, 60);
  const back = posed(rig).position.sub(before);
  assert.ok(back.z > 0 && Math.hypot(back.x, back.y) < 1e-6, 'straight back along the line of sight');
});
