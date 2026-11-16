// src/viewer/entry.ts: the body the shock glow's march stops at, read from a model's skin (`profileOf`). A sphere is a
// sphere, a whip aerial standing off it is not body, and what is inside the skin is never reached (GitHub issue #33: the
// stand-in had been a cap and a cone as long as Vostok's aerials, and its straight sides were seen in the glow).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { profileFit, profileOf, RINGS } from '../src/viewer/entry.ts';

/** A geometry's triangles, moved by `at` (radii), as profileOf takes them. */
const trianglesOf = (geometry, at = [0, 0, 0]) => {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const p = g.getAttribute('position');
  const out = [];
  for (let i = 0; i < p.count; i++) out.push(p.getX(i) + at[0], p.getY(i) + at[1], p.getZ(i) + at[2]);
  return out;
};

/** The skin's radius at `y` along the axis, as the shader reads the rings. */
const skin = (p, y) => {
  const f = (y - p.from) / p.step - 0.5;
  if (f < -0.5 || f > RINGS - 0.5) return 0;
  const i = Math.min(Math.max(Math.floor(f), 0), RINGS - 1);
  return p.rings[i] + (p.rings[Math.min(i + 1, RINGS - 1)] - p.rings[i]) * Math.min(Math.max(f - i, 0), 1);
};

test('a sphere, its face at the origin, is a sphere', () => {
  const p = profileOf(trianglesOf(new THREE.SphereGeometry(1, 64, 32), [0, 1, 0]), 2);
  for (const y of [0.3, 0.6, 1, 1.4, 1.7]) {
    const want = Math.sqrt(1 - (y - 1) ** 2);
    assert.ok(Math.abs(skin(p, y) - want) < 0.06, `at ${y}: ${skin(p, y).toFixed(3)} against ${want.toFixed(3)}`);
  }
  assert.ok(Math.abs(p.shoulder - 1) < 0.1, `widest at ${p.shoulder.toFixed(2)}`);
  assert.ok(Math.abs(p.end - 2) < 0.12, `ends at ${p.end.toFixed(2)}`);
  assert.equal(skin(p, 2.5), 0);
});

test('an aerial standing back off it is not body, and what is inside the skin is not reached', () => {
  const sphere = trianglesOf(new THREE.SphereGeometry(1, 64, 32), [0, 1, 0]);
  // two whip aerials 2.5 radii long, a hundredth of a radius thick, leaning out behind it; and a seat inside
  const whip = (lean) => {
    const g = new THREE.CylinderGeometry(0.01, 0.01, 2.5, 8);
    g.translate(0, 1.25, 0);
    g.rotateZ(lean);
    return trianglesOf(g, [0, 1.9, 0]);
  };
  const seat = trianglesOf(new THREE.BoxGeometry(0.6, 0.6, 0.6), [0, 1, 0]);
  const p = profileOf([...sphere, ...whip(0.5), ...whip(-0.5), ...seat], 4.2);
  assert.ok(p.end < 2.15, `the body ends with the sphere, not the aerials: ${p.end.toFixed(2)}`);
  assert.ok(Math.abs(skin(p, 1) - 1) < 0.06, `the seat is not the skin: ${skin(p, 1).toFixed(3)}`);
  for (const y of [2.5, 3, 3.8]) assert.equal(skin(p, y), 0, `no body at ${y}`);
});

test('a dish and a cone (a Mercury) keep the cone', () => {
  // a shallow dish 0.15 deep, then a cone from 0.95 of the radius to 0.45 over 2.2 radii
  const dish = new THREE.SphereGeometry(3.4, 64, 8, 0, Math.PI * 2, 0, 0.3);
  dish.rotateX(Math.PI);
  const cone = new THREE.CylinderGeometry(0.45, 0.95, 2.2, 48, 1, true);
  const p = profileOf([...trianglesOf(dish, [0, 3.4, 0]), ...trianglesOf(cone, [0, 0.15 + 1.1, 0])], 2.35);
  assert.ok(Math.abs(skin(p, 1.25) - 0.7) < 0.06, `half way along the cone: ${skin(p, 1.25).toFixed(3)}`);
  assert.ok(p.end > 2.2 && p.end < 2.5, `ends with the cone: ${p.end.toFixed(2)}`);
});

test('the profile before the model is read is the paraboloid and the cone it always was', () => {
  const p = profileFit(0.25, 3.4);
  assert.ok(Math.abs(skin(p, 0.0625) - 0.5) < 0.05);
  assert.ok(Math.abs(skin(p, 1.825) - 0.725) < 0.05);
  assert.equal(p.shoulder, 0.25);
  assert.equal(p.end, 3.4);
});
