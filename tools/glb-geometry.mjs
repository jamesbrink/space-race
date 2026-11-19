// A GLB's geometry, decoded in node from the committed file: its nodes with their frames, and each mesh's triangles
// (the models are Draco-compressed; the decoder is the page's own, public/draco). For what is baked from the models
// without Blender (tools/collision-bake.mjs). tests/glb.mjs reads the JSON alone; this reads the vertices too.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
let decoder = null;

/** The Draco decoder (the WebAssembly build the page serves), made once. */
async function draco() {
  if (decoder) return decoder;
  const dir = join(root, 'public/draco');
  // (the wrapper is a script that declares `DracoDecoderModule` and, in node, asks for `require` and `__dirname`)
  const make = new Function(
    'require',
    '__dirname',
    `${readFileSync(join(dir, 'draco_wasm_wrapper.js'), 'utf8')}; return DracoDecoderModule;`,
  )(createRequire(import.meta.url), dir);
  decoder = await make({ wasmBinary: readFileSync(join(dir, 'draco_decoder.wasm')) });
  return decoder;
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Column-major 4x4 product, as glTF writes matrices. */
export function times(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

/** A node's own matrix from its translation, rotation and scale (or its matrix). */
export function matrixOf(n) {
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
}

/**
 * Read a GLB: `gltf` its JSON, `frames` each node's matrix in the model's frame (by node index), `parents` each node's
 * parent index (-1 at the top), `tops` the scene's top-level node indices, and `triangles(i)` node i's own mesh as
 * `{ positions: Float32Array, indices: Uint32Array }[]` in the node's own frame, one a primitive (none for a node
 * without a mesh).
 */
export async function readGlb(file) {
  const glb = readFileSync(file);
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = glb.subarray(20 + jsonLength + 8);
  const d = await draco();
  const view = (i) => {
    const v = gltf.bufferViews[i];
    return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
  };
  const plain = (i) => {
    const a = gltf.accessors[i];
    const bytes = view(a.bufferView);
    const at = bytes.byteOffset + (a.byteOffset ?? 0);
    const n = a.count * { SCALAR: 1, VEC3: 3 }[a.type];
    const Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    return new Type(bytes.buffer.slice(at, at + n * Type.BYTES_PER_ELEMENT));
  };
  const primitive = (p) => {
    const ext = p.extensions?.KHR_draco_mesh_compression;
    if (!ext) {
      const positions = Float32Array.from(plain(p.attributes.POSITION));
      const indices =
        p.indices === undefined ? Uint32Array.from(positions.subarray(0, positions.length / 3).keys()) : Uint32Array.from(plain(p.indices));
      return { positions, indices };
    }
    const dec = new d.Decoder();
    const mesh = new d.Mesh();
    const data = view(ext.bufferView);
    const status = dec.DecodeArrayToMesh(data, data.length, mesh);
    if (!status.ok()) throw new Error(`${file}: ${status.error_msg()}`);
    const points = mesh.num_points();
    const at = d._malloc(points * 12);
    dec.GetAttributeDataArrayForAllPoints(mesh, dec.GetAttributeByUniqueId(mesh, ext.attributes.POSITION), d.DT_FLOAT32, points * 12, at);
    const positions = new Float32Array(d.HEAPF32.buffer, at, points * 3).slice();
    d._free(at);
    const faces = mesh.num_faces();
    const to = d._malloc(faces * 12);
    dec.GetTrianglesUInt32Array(mesh, faces * 12, to);
    const indices = new Uint32Array(d.HEAPU32.buffer, to, faces * 3).slice();
    d._free(to);
    d.destroy(mesh);
    d.destroy(dec);
    return { positions, indices };
  };
  const frames = new Array(gltf.nodes.length);
  const parents = new Array(gltf.nodes.length).fill(-1);
  const down = (i, parent, matrix) => {
    frames[i] = times(matrix, matrixOf(gltf.nodes[i]));
    parents[i] = parent;
    for (const c of gltf.nodes[i].children ?? []) down(c, i, frames[i]);
  };
  const tops = gltf.scenes[gltf.scene ?? 0].nodes;
  for (const i of tops) down(i, -1, IDENTITY);
  return {
    gltf,
    frames,
    parents,
    tops,
    triangles: (i) => (gltf.nodes[i].mesh === undefined ? [] : gltf.meshes[gltf.nodes[i].mesh].primitives.map(primitive)),
  };
}
