// What a GLB says of itself, read from its JSON chunk alone (no geometry is decoded): shared by the tests that hold a
// flight's data to its built models (flights.test.mjs) and a flight's own (apollo-7.test.mjs).
import { readFileSync } from 'node:fs';

/** The names of the materials of the meshes under a node of a GLB (the first of that name), or null if it has none such. */
export function materialsUnder(file, name) {
  const glb = readFileSync(file);
  const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const start = gltf.nodes.findIndex((n) => n.name === name);
  if (start < 0) return null;
  const out = [];
  const visit = (i) => {
    const n = gltf.nodes[i];
    for (const prim of n.mesh === undefined ? [] : gltf.meshes[n.mesh].primitives) out.push(gltf.materials?.[prim.material]?.name ?? '');
    for (const c of n.children ?? []) visit(c);
  };
  visit(start);
  return out;
}

/**
 * Where things are in a GLB, read from its JSON (no geometry is decoded): each node's frame in the model's, and the box
 * round a node's meshes and its children's (from each accessor's own bounds, carried through the frames).
 */
export function framesOf(file) {
  const glb = readFileSync(file);
  const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const times = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  };
  const own = (n) => {
    if (n.matrix) return n.matrix;
    const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
    const [sx, sy, sz] = n.scale ?? [1, 1, 1];
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    return [
      ...[(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0],
      ...[2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0],
      ...[2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0],
      ...[tx, ty, tz, 1],
    ];
  };
  const frames = new Map();
  const down = (i, parent) => {
    const m = times(parent, own(gltf.nodes[i]));
    frames.set(i, m);
    for (const c of gltf.nodes[i].children ?? []) down(c, m);
  };
  for (const i of gltf.scenes[gltf.scene ?? 0].nodes) down(i, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const at = (m, [x, y, z]) => [0, 1, 2].map((k) => m[k] * x + m[4 + k] * y + m[8 + k] * z + m[12 + k]);
  const index = (name) => gltf.nodes.findIndex((n) => n.name === name);
  return {
    point: (name, p = [0, 0, 0]) => (index(name) < 0 ? null : at(frames.get(index(name)), p)),
    box(name) {
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      const visit = (i) => {
        const n = gltf.nodes[i];
        for (const prim of n.mesh === undefined ? [] : gltf.meshes[n.mesh].primitives) {
          const { min, max } = gltf.accessors[prim.attributes.POSITION];
          for (const c of [0, 1, 2, 3, 4, 5, 6, 7]) {
            const q = at(frames.get(i), [c & 1 ? max[0] : min[0], c & 2 ? max[1] : min[1], c & 4 ? max[2] : min[2]]);
            q.forEach((v, k) => {
              lo[k] = Math.min(lo[k], v);
              hi[k] = Math.max(hi[k], v);
            });
          }
        }
        for (const c of n.children ?? []) visit(c);
      };
      if (index(name) >= 0) visit(index(name));
      return { lo, hi };
    },
  };
}
