// Shared-cover survey evidence is retained without constructing an invalid hybrid cover.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { ShapeUtils, Vector2 } from 'three';

const folder = new URL('../missions/usa/apollo/vehicles/reference/', import.meta.url);
const webBytes = readFileSync(new URL('apollo-dsky-front-web.json.gz', folder));
const web = JSON.parse(gunzipSync(webBytes));
const ref = JSON.parse(gunzipSync(readFileSync(new URL('apollo-dsky-display-interfaces.json.gz', folder))));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = (p) => Math.abs(p.reduce((s, a, i) => s + a[0] * p[(i + 1) % p.length][1] - a[1] * p[(i + 1) % p.length][0], 0)) / 2;
const triangulate = (p) =>
  ShapeUtils.triangulateShape(
    p.map((v) => new Vector2(...v)),
    [],
  ).map((f) => {
    const tri = f.map((i) => p[i]);
    return turn(...tri) > 0 ? tri : tri.toReversed();
  });

function intersect(subject, clip) {
  let p = subject;
  for (let i = 0; i < clip.length && p.length; i++) {
    const a = clip[i],
      b = clip[(i + 1) % clip.length],
      next = [];
    for (let j = 0; j < p.length; j++) {
      const u = p[j],
        v = p[(j + 1) % p.length],
        du = turn(a, b, u),
        dv = turn(a, b, v);
      if (du >= 0) next.push(u);
      if (du < 0 !== dv < 0) next.push(u.map((x, k) => x + ((v[k] - x) * du) / (du - dv)));
    }
    p = next;
  }
  return area(p);
}

function frontLoops() {
  const { vertices_in: v, triangles } = web.mesh;
  const edges = new Map();
  for (const f of triangles.filter((f) => f.every((i) => v[i][2] === 0)))
    for (let i = 0; i < 3; i++) {
      const key = [f[i], f[(i + 1) % 3]].sort((a, b) => a - b).join(',');
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  const neighbours = new Map();
  for (const [key, count] of edges)
    if (count === 1) {
      const [a, b] = key.split(',').map(Number);
      neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
      neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
    }
  const left = new Set(neighbours.keys()),
    loops = [];
  while (left.size) {
    const start = left.values().next().value,
      loop = [];
    let last = -1,
      current = start;
    do {
      assert.ok(left.delete(current), 'simple nominal boundary loop');
      loop.push(v[current].slice(0, 2));
      const next = neighbours.get(current).find((id) => id !== last);
      last = current;
      current = next;
    } while (current !== start);
    loops.push(loop);
  }
  return loops.sort((a, b) => area(b) - area(a));
}

test('DSKY display evidence is tied to the unchanged shared cover and existing rigid registration', () => {
  assert.equal(createHash('sha256').update(webBytes).digest('hex'), ref.front_web_sha256);
  assert.deepEqual(ref.registration, web.registration);
  assert.equal(ref.source.sha256, '265d4801baca265083090fbcf21cd2efbf47cd0a33403de8f5c2e0de4e9ab92c');
  assert.equal(ref.applicability.common_front_cover, '2004739-001');
  assert.equal(ref.confidence, 'assumed');
  assert.deepEqual(
    ref.interfaces.map((p) => [p.id, p.boundary_in.length]),
    [
      ['il', 16],
      ['el', 18],
    ],
  );
  for (const p of ref.interfaces) {
    assert.equal(new Set(p.source_vertex_indices).size, p.boundary_in.length);
    assert.equal(p.source_vertices_cm.length, p.boundary_in.length);
    for (let i = 0; i < p.boundary_in.length; i++) {
      const physical = p.source_vertices_cm[i].map((x, j) => x - ref.registration.origin_cm[j]);
      const projected = ref.registration.basis_columns.slice(0, 2).map((axis) => dot(physical, axis) / 2.54);
      assert.ok(Math.hypot(...projected.map((x, j) => x - p.boundary_in[i][j])) < 1e-10);
    }
    assert.ok(Math.abs(area(p.boundary_in) - p.area_in2) < 1e-10);
    assert.deepEqual(
      p.bounds_in,
      [0, 1].map((a) => Math.min(...p.boundary_in.map((v) => v[a]))).concat([0, 1].map((a) => Math.max(...p.boundary_in.map((v) => v[a])))),
    );
  }
});

test('independent triangle clipping confirms the right shared contour cannot be installed in the nominal CAD web unchanged', () => {
  const loops = frontLoops(),
    outer = triangulate(loops[0]);
  const holes = loops
    .slice(1)
    .filter((p) => Math.max(...p.map((v) => v[1])) - Math.min(...p.map((v) => v[1])) > 4)
    .sort((a, b) => a[0][0] - b[0][0]);
  assert.equal(holes.length, 2);
  for (let i = 0; i < 2; i++) {
    const p = ref.interfaces[i],
      source = triangulate(p.boundary_in),
      nominal = triangulate(holes[i]);
    const sum = (other) => source.reduce((s, a) => s + other.reduce((t, b) => t + intersect(a, b), 0), 0);
    const outside = area(p.boundary_in) - sum(outer);
    const difference = area(p.boundary_in) + area(holes[i]) - 2 * sum(nominal);
    assert.ok(Math.abs(outside - ref.comparison[i].outside_nominal_outer_area_in2) < 1e-9);
    assert.ok(Math.abs(difference - ref.comparison[i].symmetric_difference_in2) < 1e-9);
    if (i === 0) assert.ok(Math.abs(outside) < 1e-9);
    else assert.ok(outside > 0.00006 && outside < 0.00008, 'actual geometric conflict must stay visible rather than silently trimmed');
  }
});
