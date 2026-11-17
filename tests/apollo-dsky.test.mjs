// Nominal drawing-reference geometry, not proof of complete/as-built DSKY hardware.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';

const folder = new URL('../missions/usa/apollo/vehicles/reference/', import.meta.url);
const consoleBytes = readFileSync(new URL('apollo-main-console.json', folder));
const consoleRef = JSON.parse(consoleBytes);
const ref = JSON.parse(gunzipSync(readFileSync(new URL('apollo-dsky-front-web.json.gz', folder))));
const { vertices_in: vertices, triangles } = ref.mesh;
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = (p) => Math.abs(p.reduce((s, a, i) => s + a[0] * p[(i + 1) % p.length][1] - a[1] * p[(i + 1) % p.length][0], 0)) / 2;

test('Apollo DSKY nominal front web is a closed oriented sheet with all 22 openings and its drawing envelope', () => {
  for (const [axis, lo, hi] of [
    [0, 0, 6.9],
    [1, 0, 8],
    [2, -0.05, 0],
  ]) {
    assert.ok(Math.abs(Math.min(...vertices.map((p) => p[axis])) - lo) < 1e-8);
    assert.ok(Math.abs(Math.max(...vertices.map((p) => p[axis])) - hi) < 1e-8);
  }
  const edges = new Map();
  const frontEdges = new Map();
  let frontArea = 0;
  let volume = 0;
  for (const face of triangles) {
    assert.equal(new Set(face).size, 3);
    const [a, b, c] = face.map((i) => vertices[i]);
    volume += dot(a, cross(b, c)) / 6;
    const front = face.every((i) => Math.abs(vertices[i][2]) < 1e-9);
    if (front) frontArea += turn(a, b, c) / 2;
    for (let i = 0; i < 3; i++) {
      const u = face[i],
        v = face[(i + 1) % 3];
      const key = [Math.min(u, v), Math.max(u, v)].join(',');
      const old = edges.get(key) ?? { count: 0, direction: 0 };
      old.count++;
      old.direction += u < v ? 1 : -1;
      edges.set(key, old);
      if (front) frontEdges.set(key, (frontEdges.get(key) ?? 0) + 1);
    }
  }
  for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 });
  assert.ok(frontArea > 0 && volume > 0, 'front normal and solid volume point outward');
  assert.ok(Math.abs(volume - frontArea * 0.05) < 1e-8, 'volume is exactly the nominal front area times the web thickness');
  const boundary = new Map();
  for (const [key, count] of frontEdges) {
    if (count !== 1) continue;
    const [a, b] = key.split(',').map(Number);
    boundary.set(a, [...(boundary.get(a) ?? []), b]);
    boundary.set(b, [...(boundary.get(b) ?? []), a]);
  }
  for (const neighbours of boundary.values()) assert.equal(neighbours.length, 2);
  const remaining = new Set(boundary.keys());
  let loops = 0;
  while (remaining.size) {
    const todo = [remaining.values().next().value];
    while (todo.length) {
      const point = todo.pop();
      if (!remaining.delete(point)) continue;
      todo.push(...boundary.get(point));
    }
    loops++;
  }
  assert.equal(loops, 23, 'one outer contour, nineteen keyboard clearances, two display openings, one central clearance');
});

function hull(points) {
  const sorted = [...new Map(points.map((p) => [p.join(','), p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (p) => {
    const out = [];
    for (const x of p) {
      while (out.length > 1 && turn(out.at(-2), out.at(-1), x) <= 0) out.pop();
      out.push(x);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half(sorted.toReversed())];
}

/** Sutherland-Hodgman clipping, independently of the generator's Shapely triangulation. */
function clipped(subject, convex) {
  let p = subject;
  for (let i = 0; i < convex.length && p.length; i++) {
    const a = convex[i],
      b = convex[(i + 1) % convex.length],
      next = [];
    for (let j = 0; j < p.length; j++) {
      const u = p[j],
        v = p[(j + 1) % p.length];
      const du = turn(a, b, u),
        dv = turn(a, b, v);
      if (du >= 0) next.push(u);
      if (du < 0 !== dv < 0) next.push(u.map((x, k) => x + ((v[k] - x) * du) / (du - dv)));
    }
    p = next;
  }
  return p;
}

test('Apollo DSKY reference pose has no scaling and its console mask removes every overlapping triangle', () => {
  assert.equal(createHash('sha256').update(consoleBytes).digest('hex'), ref.console_source_sha256);
  const basis = ref.registration.basis_columns;
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) assert.ok(Math.abs(dot(basis[a], basis[b]) - Number(a === b)) < 1e-12);
  assert.ok(Math.abs(dot(basis[0], cross(basis[1], basis[2])) - 1) < 1e-12);
  const { plane_normal: normal, plane_centre_cm: centre } = consoleRef.extraction;
  const placed = vertices.map((p) => ref.registration.origin_cm.map((o, a) => o + 2.54 * p.reduce((s, x, k) => s + x * basis[k][a], 0)));
  const projected = placed.map((p) => {
    const depth = dot(sub(p, centre), normal);
    return p.map((x, a) => x - normal[a] * depth).slice(0, 2);
  });
  const mask = hull(projected);
  assert.ok(Math.abs(area(mask) / Math.abs(normal[2]) - ref.console_mask.area_cm2) < 1e-7);
  let overlap = 0;
  for (const panel of ref.console_surfaces) {
    for (const face of panel.triangles) {
      const points = face.map((i) => panel.vertices_cm[i]);
      assert.ok(points.every((p) => Math.abs(dot(sub(p, centre), normal)) < 1e-8));
      overlap += area(
        clipped(
          points.map((p) => p.slice(0, 2)),
          mask,
        ),
      );
    }
    const original = consoleRef.surfaces.find((p) => p.id === panel.id);
    for (const p of original.boundary_cm) {
      assert.ok(
        panel.vertices_cm.some((q) => Math.hypot(...sub(p, q)) < 1e-7),
        'original outer console contour and notch retained',
      );
    }
  }
  assert.ok(overlap < 1e-7, `reference panel overlaps the projected web by ${overlap} cm²`);
  const before = consoleRef.surfaces.reduce((s, p) => s + p.area_cm2, 0);
  const after = ref.console_surfaces.reduce((s, p) => s + p.area_cm2, 0);
  assert.ok(Math.abs(before - after - ref.console_mask.area_cm2) < 1e-7);
});
