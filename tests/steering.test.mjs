// A steering wheel turns about its column. The viewer turns one about its node's own Y (onfoot/drive.ts COLUMN; in
// Blender the node's Z: tools/blender/vehicles.py's contract), so in every model that has one the wheel must lie flat
// in its node's frame, its rim square to that axis. One built upright in its vehicle's frame, on a node that was never
// tipped to the column, goes round the vertical under the driver's hands like a coin on a table.
// Read from the committed GLBs' own JSON: each mesh's bounds (a POSITION accessor's min and max) carried into the
// wheel's frame, so no geometry is decoded.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

/** The most a wheel may stand out of its own plane, as a share of its width: a dished wheel's hub sits below its rim. */
const DEPTH = 0.4;

const mul = (a, b) => {
  const m = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) m[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return m;
};
/** A glTF node's own matrix (column-major): the one it gives, or the one its translation, rotation and scale make. */
function local(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ]; // biome-ignore format: a matrix reads as one
}

/** Every steering wheel in a GLB: its node's name and the box of what hangs on it, in the node's own frame. */
function wheels(file) {
  const glb = readFileSync(file);
  const g = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const found = [];
  (g.nodes ?? []).forEach((n) => {
    if (!n.extras?.steering && !/_SteeringWheel$/.test(n.name ?? '')) return;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    const walk = (node, m) => {
      for (const p of node.mesh === undefined ? [] : g.meshes[node.mesh].primitives) {
        const { min, max } = g.accessors[p.attributes.POSITION];
        for (let c = 0; c < 8; c++) {
          const v = [c & 1 ? max[0] : min[0], c & 2 ? max[1] : min[1], c & 4 ? max[2] : min[2]];
          for (let r = 0; r < 3; r++) {
            const at = m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r];
            lo[r] = Math.min(lo[r], at);
            hi[r] = Math.max(hi[r], at);
          }
        }
      }
      for (const k of node.children ?? []) walk(g.nodes[k], mul(m, local(g.nodes[k])));
    };
    walk(n, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    if (lo[0] <= hi[0]) found.push({ name: n.name, size: hi.map((h, r) => h - lo[r]) });
  });
  return found;
}

const files = globSync('public/models/**/*.glb').sort();
const all = files.flatMap((file) => wheels(file).map((w) => ({ file, ...w })));

test('there are steering wheels to hold to it', () => {
  assert.ok(all.length > 0, 'no GLB has a steering wheel: the names or the mark have changed');
});

test('every steering wheel lies flat in its own frame, its rim square to the axis it is turned about', () => {
  const wrong = all
    .filter(({ size: [x, y, z] }) => y > DEPTH * Math.min(x, z))
    .map(
      ({ file, name, size: [x, y, z] }) =>
        `${name} in ${file}: ${(x * 100).toFixed(0)} by ${(z * 100).toFixed(0)} cm across and ${(y * 100).toFixed(0)} cm along its axis`,
    );
  assert.deepEqual(wrong, [], 'steering wheels that would turn about something other than their column');
});
