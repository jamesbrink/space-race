// An independent drawing registration check: no drawing-sheet scale is a hardware dimension.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';

const folder = new URL('../missions/usa/apollo/vehicles/reference/', import.meta.url);
const layout = JSON.parse(readFileSync(new URL('apollo-console-layout.json', folder)));
const structure = JSON.parse(readFileSync(new URL('apollo-main-console.json', folder)));
const dsky = JSON.parse(gunzipSync(readFileSync(new URL('apollo-dsky-front-web.json.gz', folder))));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const subtract = (a, b) => a.map((x, i) => x - b[i]);
const normalize = (a) => a.map((x) => x / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const n = structure.extraction.plane_normal;
const u = normalize([1 - n[0] ** 2, -n[0] * n[1], -n[0] * n[2]]);
const v = cross(n, u).map((x) => -x);
const [a, b] = structure.apertures.map((p) => p.probe_cm);
const [[ax, ay], [bx, by]] = layout.registration.anchors.map((p) => p.image_px);
const image = [bx - ax, ay - by];
const target = [dot(subtract(b, a), u), dot(subtract(b, a), v)];
const denominator = dot(image, image);
const re = dot(target, image) / denominator;
const im = (target[1] * image[0] - target[0] * image[1]) / denominator;
const point = ([x, y]) => {
  const px = x - ax;
  const py = ay - y;
  return a.map((value, k) => value + u[k] * (re * px - im * py) + v[k] * (im * px + re * py));
};
const plane = (p) => [dot(subtract(p, a), u), dot(subtract(p, a), v)];
const contains = (polygon, [x, y]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

test('Apollo 7 layout uses two structural anchors and an independent DSKY holdout', () => {
  assert.equal(layout.confidence, 'estimated');
  assert.deepEqual(
    layout.registration.anchors.map((p) => p.interface),
    ['fdai-1', 'fdai-2'],
  );
  for (const [i, actual] of [a, b].entries())
    assert.ok(Math.hypot(...subtract(point(layout.registration.anchors[i].image_px), actual)) < 1e-10);
  const registration = dsky.registration;
  const actual = registration.origin_cm.map(
    (x, i) => x + 2.54 * (3.45 * registration.basis_columns[0][i] + 4 * registration.basis_columns[1][i]),
  );
  const residual = Math.hypot(...subtract(point(layout.registration.holdout.image_px), actual));
  assert.ok(residual > 0.9 && residual < 1.1, `independent holdout changed: ${residual} cm`);
  assert.ok(Math.abs(residual - layout.registration.holdout.residual_cm) < 1e-10);
  assert.ok(Math.abs(Math.hypot(re, im) - 0.11490663265707532) < 1e-12);
});

test('Apollo 7 transcribed equipment centres stay inside the unchanged shared console outline', () => {
  const polygons = structure.surfaces.map((p) => p.boundary_cm.map(plane));
  const centres = [
    ...layout.round_gauges.map((p) => p.at),
    ...['toggle_rows', 'rotary_rows', 'tape_banks'].flatMap((kind) => layout[kind].flatMap((p) => p.xs.map((x) => [x, p.y]))),
  ];
  assert.equal(centres.length, 233);
  assert.equal(new Set(centres.map((p) => p.join(','))).size, centres.length, 'duplicate controls');
  for (const p of centres)
    assert.ok(
      polygons.some((polygon) => contains(polygon, plane(point(p)))),
      `unsupported equipment at ${p}`,
    );
  assert.equal(
    layout.toggle_rows.reduce((s, p) => s + p.xs.length, 0),
    196,
  );
  assert.equal(
    layout.rotary_rows.reduce((s, p) => s + p.xs.length, 0),
    7,
  );
  assert.equal(['left', 'right'].flatMap((k) => layout.caution_warning[k].flat()).length, 48);
});
