// Primary-drawing nominal panes, not a claim about installed or as-built glass.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';

const ref = JSON.parse(
  gunzipSync(readFileSync(new URL('../missions/usa/apollo/vehicles/reference/apollo-dsky-panels.json.gz', import.meta.url))),
);
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

test('Apollo 7 DSKY glass uses its two flight-specific panes, without later -003 coating requirements', () => {
  const generator = readFileSync(new URL('../missions/usa/apollo/vehicles/reference/rebuild_dsky_panels.py', import.meta.url));
  assert.equal(createHash('sha256').update(generator).digest('hex'), ref.generator_sha256, 'regenerate panes after changing their source');
  assert.deepEqual(
    ref.panels.map((p) => p.part),
    ['2004743-001', '2004743-002'],
  );
  assert.deepEqual(ref.applicability.covers, { '001': '2003897-021, find 6', '002': '2003897-031, find 8' });
  assert.equal(ref.source_units, 'inches');
  assert.equal(ref.dimensions_in.thickness_tolerance, 0.01);
  assert.match(ref.notes, /-001 and -002 use notes 1, 2 and 3 only/);
  assert.match(ref.status, /no installed pose or optical reconstruction/);
});

for (const [panel, height] of ref.panels.map((p, i) => [p, [3.135, 4.358][i]])) {
  assert.equal(panel.levels.length, 3);
  for (const [lod, mesh] of panel.levels.entries()) {
    test(`${panel.part} LOD ${lod}: drawing envelope, rounded corners and nominal 45° bevel`, () => {
      const { vertices_in: points } = mesh;
      assert.ok(points.every((p) => p.length === 3 && p.every(Number.isFinite)));
      for (const [axis, maximum] of [2.54, height, 0.135].entries()) {
        near(Math.min(...points.map((p) => p[axis])), 0);
        near(Math.max(...points.map((p) => p[axis])), maximum);
      }
      const plane = (z) => points.filter((p) => Math.abs(p[2] - z) < 1e-10);
      const middle = plane(0.05);
      const front = plane(0.135);
      assert.equal(new Set(points.map((p) => p[2])).size, 3);
      for (const [axis, size] of [2.54, height].entries()) {
        near(Math.min(...front.map((p) => p[axis])), 0.085);
        near(Math.max(...front.map((p) => p[axis])), size - 0.085);
        near(Math.min(...middle.map((p) => p[axis])), 0);
        near(Math.max(...middle.map((p) => p[axis])), size);
      }
      for (const point of points) {
        const [x, y, z] = point;
        const cx = x < 0.185 ? 0.185 : x > 2.54 - 0.185 ? 2.54 - 0.185 : null;
        const cy = y < 0.185 ? 0.185 : y > height - 0.185 ? height - 0.185 : null;
        if (cx !== null && cy !== null) near(Math.hypot(x - cx, y - cy), z > 0.05 ? 0.1 : 0.185);
        if (Math.abs(z - 0.135) < 1e-10 && !(Math.abs(x - 1.27) < 1e-10 && Math.abs(y - height / 2) < 1e-10)) {
          // The nearest corresponding point on the full-size edge is .085 in
          // outward and .085 in below the front: independently checks 45°.
          near(Math.min(...middle.map((q) => Math.hypot(x - q[0], y - q[1]))), 0.085);
          near(z - 0.05, 0.085);
        }
      }
    });

    test(`${panel.part} LOD ${lod}: closed oriented solid and analytic rounded/bevelled volume`, () => {
      const { vertices_in: points, triangles } = mesh;
      const edges = new Map();
      let volume = 0;
      for (const face of triangles) {
        assert.equal(new Set(face).size, 3);
        assert.ok(face.every((i) => Number.isInteger(i) && i >= 0 && i < points.length));
        const [a, b, c] = face.map((i) => points[i]);
        assert.ok(Math.hypot(...cross(sub(b, a), sub(c, a))) > 1e-10, 'no degenerate triangles');
        volume += dot(a, cross(b, c)) / 6;
        for (let i = 0; i < 3; i++) {
          const u = face[i],
            v = face[(i + 1) % 3];
          const key = [Math.min(u, v), Math.max(u, v)].join(',');
          const old = edges.get(key) ?? { count: 0, direction: 0 };
          old.count++;
          old.direction += u < v ? 1 : -1;
          edges.set(key, old);
        }
      }
      for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 });
      assert.equal(points.length - edges.size + triangles.length, 2);
      assert.ok(volume > 0);
      // Steiner's inward-offset area A(s)=A0-P0*s+pi*s², integrated over
      // the .085-inch 45° bevel, plus the derived .050-inch flat edge.
      const radius = 0.185,
        bevel = 0.085;
      const area = 2.54 * height - (4 - Math.PI) * radius ** 2;
      const perimeter = 2 * (2.54 + height - 4 * radius) + 2 * Math.PI * radius;
      const exact = area * 0.135 - (perimeter * bevel ** 2) / 2 + (Math.PI * bevel ** 3) / 3;
      const limit = mesh.maximum_arc_sagitta_in * perimeter * 0.135;
      assert.ok(volume <= exact + 1e-9, 'inscribed arc approximation cannot add volume');
      near(volume, exact, limit);
      assert.ok(mesh.maximum_arc_sagitta_in > 0 && mesh.maximum_arc_sagitta_in < 0.001);
    });
  }
}
