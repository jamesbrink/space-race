// The native build's models: the repo's own GLBs with their Draco compression taken off, because Bevy's glTF
// loader does not read KHR_draco_mesh_compression. Outputs keep their original paths under rust/assets/models/.
// Identical native finish tiles share one PNG on disk and one GPU image. Sources come from rust/models/ when
// present, otherwise from public/models/. The unpacked folder is generated. The decoder is the page's own
// (public/draco), as tools/glb-geometry.mjs uses it.
//
//   node rust/tools/unpack-models.mjs            the first flight and what stands round it
//   node rust/tools/unpack-models.mjs <a.glb>... those files, given by their path under public/models/
//
// A model whose parts move through a launch morning (a pad) is written as it stood at liftoff: pose.mjs.
//
// COLOR_0 is dropped: on these models it is the cabin's baked lamp shade (src/viewer/shade.ts), not a colour, and
// an engine that met it would multiply the paint by it.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { standAtLiftoff } from './pose.mjs';

const root = join(import.meta.dirname, '../..');
const from = join(root, 'public/models');
const to = join(root, 'rust/assets/models');

const FIRST = [
  'usa/mercury/mr-3-freedom-7/vehicle.glb',
  'usa/mercury/mr-3-freedom-7/pad.glb',
  'usa/mercury/mr-3-freedom-7/crew.glb',
  'usa/places/cape-canaveral/lc5/1961-05.glb',
  'usa/places/cape-canaveral/complexes/1961-05.glb',
];

const DRACO = 'KHR_draco_mesh_compression';
const WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const FLOAT = 5126;
const UINT = 5125;
const USHORT = 5123;

/** Drop the accessors nothing points at any more (the shade's), and renumber the rest. */
function compact(gltf) {
  const used = new Set();
  for (const mesh of gltf.meshes) {
    for (const p of mesh.primitives) {
      for (const i of Object.values(p.attributes)) used.add(i);
      if (p.indices !== undefined) used.add(p.indices);
      for (const target of p.targets ?? []) for (const i of Object.values(target)) used.add(i);
    }
  }
  for (const skin of gltf.skins ?? []) if (skin.inverseBindMatrices !== undefined) used.add(skin.inverseBindMatrices);
  for (const animation of gltf.animations ?? []) for (const s of animation.samplers) used.add(s.input).add(s.output);
  const order = [...used].sort((a, b) => a - b);
  const renumbered = new Map(order.map((old, now) => [old, now]));
  const to = (i) => renumbered.get(i);
  for (const mesh of gltf.meshes) {
    for (const p of mesh.primitives) {
      for (const name of Object.keys(p.attributes)) p.attributes[name] = to(p.attributes[name]);
      if (p.indices !== undefined) p.indices = to(p.indices);
      for (const target of p.targets ?? []) for (const name of Object.keys(target)) target[name] = to(target[name]);
    }
  }
  for (const skin of gltf.skins ?? []) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = to(skin.inverseBindMatrices);
  for (const animation of gltf.animations ?? []) {
    for (const s of animation.samplers) {
      s.input = to(s.input);
      s.output = to(s.output);
    }
  }
  gltf.accessors = order.map((i) => gltf.accessors[i]);
}

async function decoder() {
  const dir = join(root, 'public/draco');
  // (the wrapper is a script that declares `DracoDecoderModule` and, in node, asks for `require` and `__dirname`)
  const make = new Function(
    'require',
    '__dirname',
    `${readFileSync(join(dir, 'draco_wasm_wrapper.js'), 'utf8')}; return DracoDecoderModule;`,
  )(createRequire(import.meta.url), dir);
  return make({ wasmBinary: readFileSync(join(dir, 'draco_decoder.wasm')) });
}

/** A binary chunk being written: byte ranges appended on four-byte boundaries, each a bufferView. */
function writer() {
  const parts = [];
  const views = [];
  let length = 0;
  return {
    views,
    add(bytes, extra = {}) {
      views.push({ buffer: 0, byteOffset: length, byteLength: bytes.byteLength, ...extra });
      parts.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      length += bytes.byteLength;
      const pad = (4 - (length % 4)) % 4;
      if (pad) parts.push(Buffer.alloc(pad));
      length += pad;
      return views.length - 1;
    },
    bytes: () => Buffer.concat(parts),
  };
}

// Bevy keys an embedded image by its GLB. A single shared URI lets the neighbouring pads use the
// same grain at full resolution. The committed GLBs remain self-contained. Colour space and sampler
// are part of the identity because they are properties of an Image in Bevy.
const written = new Set();
function shareFinish(gltf, index, bytes, file) {
  const image = gltf.images[index];
  if (!/-(colour|response|normal)$/.test(image.name ?? '') || image.mimeType !== 'image/png') return false;
  const uses = gltf.textures.filter((texture) => texture.source === index);
  const samplers = new Set(uses.map((t) => JSON.stringify(gltf.samplers?.[t.sampler] ?? {})));
  if (samplers.size !== 1) return false;
  const space = image.name.endsWith('-colour') ? 'srgb' : 'linear';
  const hash = createHash('sha256')
    .update(space)
    .update([...samplers][0])
    .update(bytes)
    .digest('hex');
  const dest = join(to, 'surfaces', `${hash}.png`);
  if (!written.has(hash)) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, bytes);
    written.add(hash);
  }
  delete image.bufferView;
  image.uri = relative(dirname(join(to, file)), dest)
    .split(sep)
    .join('/');
  return true;
}

function unpack(d, file) {
  const native = join(root, 'rust/models', file);
  const nativeTier = existsSync(native);
  const glb = readFileSync(nativeTier ? native : join(from, file));
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
  const bin = glb.subarray(20 + jsonLength + 8);
  const old = gltf.bufferViews ?? [];
  const slice = (i) => bin.subarray(old[i].byteOffset ?? 0, (old[i].byteOffset ?? 0) + old[i].byteLength);
  const out = writer();

  // What is not Draco's keeps its bytes: images, and any accessor that already had a view.
  const kept = new Map();
  const keep = (i) => {
    if (!kept.has(i)) kept.set(i, out.add(slice(i), old[i].byteStride ? { byteStride: old[i].byteStride } : {}));
    return kept.get(i);
  };
  for (const [i, image] of (gltf.images ?? []).entries()) {
    if (image.bufferView === undefined) continue;
    if (nativeTier && shareFinish(gltf, i, slice(image.bufferView), file)) continue;
    image.bufferView = keep(image.bufferView);
  }
  for (const accessor of gltf.accessors) if (accessor.bufferView !== undefined) accessor.bufferView = keep(accessor.bufferView);

  let triangles = 0;
  for (const mesh of gltf.meshes) {
    for (const p of mesh.primitives) {
      delete p.attributes.COLOR_0;
      const ext = p.extensions?.[DRACO];
      if (!ext) continue;
      const dec = new d.Decoder();
      const m = new d.Mesh();
      const data = slice(ext.bufferView);
      const status = dec.DecodeArrayToMesh(data, data.length, m);
      if (!status.ok()) throw new Error(`${file}: ${status.error_msg()}`);
      const points = m.num_points();
      for (const [name, index] of Object.entries(p.attributes)) {
        const accessor = gltf.accessors[index];
        const width = WIDTH[accessor.type];
        // A skin's joint indices stay whole numbers (glTF allows them no other way); everything else is floats.
        const joints = name.startsWith('JOINTS_');
        const size = points * width * (joints ? 2 : 4);
        const at = d._malloc(size);
        const attribute = dec.GetAttributeByUniqueId(m, ext.attributes[name]);
        dec.GetAttributeDataArrayForAllPoints(m, attribute, joints ? d.DT_UINT16 : d.DT_FLOAT32, size, at);
        const values = joints
          ? new Uint16Array(d.HEAPU16.buffer, at, points * width)
          : new Float32Array(d.HEAPF32.buffer, at, points * width);
        accessor.bufferView = out.add(values.slice(), { target: 34962 });
        d._free(at);
        accessor.componentType = joints ? USHORT : FLOAT;
        accessor.count = points;
        delete accessor.byteOffset;
        delete accessor.normalized;
      }
      const faces = m.num_faces();
      const at = d._malloc(faces * 12);
      dec.GetTrianglesUInt32Array(m, faces * 12, at);
      const indices = gltf.accessors[p.indices];
      indices.bufferView = out.add(new Uint32Array(d.HEAPU32.buffer, at, faces * 3).slice(), { target: 34963 });
      d._free(at);
      indices.componentType = UINT;
      indices.count = faces * 3;
      delete indices.byteOffset;
      triangles += faces;
      d.destroy(m);
      d.destroy(dec);
      delete p.extensions[DRACO];
      if (!Object.keys(p.extensions).length) delete p.extensions;
    }
  }

  for (const list of ['extensionsUsed', 'extensionsRequired']) {
    if (!gltf[list]) continue;
    gltf[list] = gltf[list].filter((name) => name !== DRACO);
    if (!gltf[list].length) delete gltf[list];
  }
  compact(gltf);
  const slider = standAtLiftoff(gltf, file);
  const body = out.bytes();
  gltf.bufferViews = out.views;
  gltf.buffers = [{ byteLength: body.length }];

  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + body.length, 8);
  const chunk = (length, type) => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(length, 0);
    b.writeUInt32LE(type, 4);
    return b;
  };
  const target = join(to, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.concat([header, chunk(json.length, 0x4e4f534a), json, chunk(body.length, 0x004e4942), body]));
  const stood = slider === null ? '' : `, stood as at liftoff (${slider.toFixed(2)} on its slider)`;
  console.log(`${file} (${nativeTier ? 'native' : 'inventory'}): ${triangles} triangles, ${(body.length / 1e6).toFixed(1)} MB${stood}`);
}

const d = await decoder();
const files = process.argv.length > 2 ? process.argv.slice(2) : FIRST;
for (const file of files) unpack(d, file);
