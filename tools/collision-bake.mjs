// Bake what is solid for the simulator (src/sim/solids.ts) from the committed GLBs, in node, with no Blender:
//
//   pnpm collision                 every flight that has a site
//   pnpm collision mr-3 vostok-1   those whose id holds one of these
//   pnpm collision --check         say which files are missing or stale, write nothing (tests/collision.test.mjs does the same)
//   pnpm collision --stats         print each piece's boxes
//
// For a flight with a site, each model that stands there and is neither a person nor the vehicle that flies is a
// structure: `<model>.solid.bin` beside its GLB holds its pieces as boxes and where each stands from liftoff on, read
// from the viewer's own moves (viewer/explode.ts, run here against the GLB's nodes), so a piece is where the page
// draws it. The model that flies gets its `hulls` in a file of its own the same way. A new flight or site is baked by
// being in missions/index.ts: nothing here knows any of them.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { solidModels } from '../src/sim/siteworld.ts';
import { decodeSolids, encodeSolids } from '../src/sim/solids.ts';
import { readGlb } from './glb-geometry.mjs';

const root = join(import.meta.dirname, '..');

/** The cells' size, metres (solids.ts). Change it and every file is stale. */
export const CELL = 0.25;
/**
 * A piece is cut as fine as `CELL` while that is no more boxes than this: what of it lies within `NEAR` metres of the
 * launch axis (the vertical through the model's origin, where a vehicle is) has the larger budget, the rest of it the
 * smaller. Past its budget a piece is cut twice as coarse, and again, until it fits: a great sloped earthwork is.
 */
const NEAR = 50;
const NEAR_BOXES = 16000;
const FAR_BOXES = 4000;
/** What the bake itself is, for the digest: raise it when the shapes it makes change. */
const BAKE = 1;
/** How closely a track must follow the viewer's own motion once thinned: metres, and radians of turn. */
const TRACK_SLACK = 0.002;
const TURN_SLACK = 0.0005;

/** Where a model's solids are kept: beside its GLB. */
export const solidPath = (url) => join(root, 'public', url.replace(/\.glb$/, '.solid.bin'));

/** The nodes of its model a flight sheds (`flies.drops`): each has a hull of its own, wherever in the model it is. */
const shedBy = (flight) => [...new Set((flight.flies?.drops ?? []).flatMap((d) => d.nodes))].sort();

/** A digest of what a model's solids are made from: its GLB's bytes, and the flight's data that says how it is posed. */
export function sourceOf(def, kind, flight) {
  const hash = createHash('sha256');
  hash.update(readFileSync(join(root, 'public', def.url)));
  const parts = def.parts.map((p) => ({
    node: p.node,
    inside: Boolean(p.inside),
    going: Boolean(p.going?.length),
    explode: p.explode,
    order: p.order,
    moves: p.moves,
    clocked: p.clocked,
  }));
  hash.update(
    JSON.stringify({
      BAKE,
      CELL,
      NEAR,
      NEAR_BOXES,
      FAR_BOXES,
      kind,
      parts,
      ...(kind === 'vehicle' ? { sheds: shedBy(flight) } : {}),
      sequence: def.sequence?.map((k) => [k.at, k.slider]),
    }),
  );
  return hash.digest('hex').slice(0, 24);
}

/** What is wrong with a model's baked file as it stands, or null if it is current. */
export function staleness(def, kind, flight) {
  const file = solidPath(def.url);
  if (!existsSync(file)) return 'missing';
  try {
    return decodeSolids(readFileSync(file)).source === sourceOf(def, kind, flight) ? null : 'stale';
  } catch (e) {
    return String(e.message ?? e);
  }
}

// --- boxes -----------------------------------------------------------------------------------------------------

/** Clip a polygon (flat xyz) to `lo <= coordinate k <= hi`. */
function clip(poly, k, lo, hi) {
  for (const [bound, sign] of [
    [lo, 1],
    [hi, -1],
  ]) {
    const out = [];
    const n = poly.length / 3;
    for (let i = 0; i < n; i++) {
      const a = 3 * i;
      const b = 3 * ((i + 1) % n);
      const da = sign * (poly[a + k] - bound);
      const db = sign * (poly[b + k] - bound);
      if (da >= 0) out.push(poly[a], poly[a + 1], poly[a + 2]);
      if (da >= 0 !== db >= 0) {
        const f = da / (da - db);
        out.push(
          poly[a] + (poly[b] - poly[a]) * f,
          poly[a + 1] + (poly[b + 1] - poly[a + 1]) * f,
          poly[a + 2] + (poly[b + 2] - poly[a + 2]) * f,
        );
      }
    }
    poly = out;
    if (!poly.length) break;
  }
  return poly;
}

const OFF = 65536;
const keyOf = (x, y, z) => (x + OFF) * 2 ** 34 + (y + OFF) * 2 ** 17 + (z + OFF);

/**
 * Triangles (nine figures each, in one frame) as boxes: each cell of `cell` metres that holds any of their surface
 * keeps the box round what of it is inside the cell, and cells that line up are joined. Six figures a box.
 */
export function boxesOf(triangles, cell = CELL) {
  const cells = new Map();
  const grow = (x, y, z, poly) => {
    const key = keyOf(x, y, z);
    let box = cells.get(key);
    if (!box)
      cells.set(key, (box = { i0: [x, y, z], i1: [x, y, z], lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }));
    for (let i = 0; i < poly.length; i += 3)
      for (let k = 0; k < 3; k++) {
        box.lo[k] = Math.min(box.lo[k], poly[i + k]);
        box.hi[k] = Math.max(box.hi[k], poly[i + k]);
      }
  };
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  for (let t = 0; t < triangles.length; t += 9) {
    const tri = triangles.subarray(t, t + 9);
    for (let k = 0; k < 3; k++) {
      const least = Math.min(tri[k], tri[3 + k], tri[6 + k]);
      const most = Math.max(tri[k], tri[3 + k], tri[6 + k]);
      lo[k] = Math.floor(least / cell);
      // (a triangle that ends on a cell's face is in the cell below it)
      hi[k] = Math.max(lo[k], Math.ceil(most / cell) - 1);
    }
    if (lo[0] === hi[0] && lo[1] === hi[1] && lo[2] === hi[2]) {
      grow(lo[0], lo[1], lo[2], tri);
      continue;
    }
    for (let x = lo[0]; x <= hi[0]; x++) {
      const px = lo[0] === hi[0] ? Array.from(tri) : clip(Array.from(tri), 0, x * cell, (x + 1) * cell);
      if (!px.length) continue;
      for (let y = lo[1]; y <= hi[1]; y++) {
        const py = lo[1] === hi[1] ? px : clip(px, 1, y * cell, (y + 1) * cell);
        if (!py.length) continue;
        for (let z = lo[2]; z <= hi[2]; z++) {
          const pz = lo[2] === hi[2] ? py : clip(py, 2, z * cell, (z + 1) * cell);
          if (pz.length) grow(x, y, z, pz);
        }
      }
    }
  }
  // join cells that line up: along x, then z, then y (a deck becomes one slab, a column one post)
  let boxes = [...cells.values()];
  const mm = (v) => Math.round(v * 1000);
  for (const axis of [0, 2, 1, 0, 2]) {
    const [u, v] = [0, 1, 2].filter((k) => k !== axis);
    const groups = new Map();
    for (const b of boxes) {
      const key = `${b.i0[u]},${b.i1[u]},${mm(b.lo[u])},${mm(b.hi[u])},${b.i0[v]},${b.i1[v]},${mm(b.lo[v])},${mm(b.hi[v])}`;
      const group = groups.get(key);
      if (group) group.push(b);
      else groups.set(key, [b]);
    }
    boxes = [];
    for (const group of groups.values()) {
      group.sort((a, b) => a.i0[axis] - b.i0[axis]);
      let run = group[0];
      for (let i = 1; i < group.length; i++) {
        const next = group[i];
        const face = (run.i1[axis] + 1) * cell;
        if (next.i0[axis] === run.i1[axis] + 1 && run.hi[axis] >= face - 1e-4 && next.lo[axis] <= face + 1e-4) {
          run.i1[axis] = next.i1[axis];
          run.hi[axis] = next.hi[axis];
        } else {
          boxes.push(run);
          run = next;
        }
      }
      boxes.push(run);
    }
  }
  // in a fixed order, so the same model bakes to the same bytes
  boxes.sort(
    (a, b) => a.lo[1] - b.lo[1] || a.lo[0] - b.lo[0] || a.lo[2] - b.lo[2] || a.hi[1] - b.hi[1] || a.hi[0] - b.hi[0] || a.hi[2] - b.hi[2],
  );
  const out = new Float32Array(boxes.length * 6);
  boxes.forEach((b, i) => out.set([...b.lo, ...b.hi], 6 * i));
  return out;
}

/** Triangles as boxes of the finest cell that keeps them within `budget` boxes: `CELL`, or twice it, and so on. */
function within(triangles, budget) {
  for (let cell = CELL; ; cell *= 2) {
    const boxes = boxesOf(triangles, cell);
    if (boxes.length / 6 <= budget || cell >= 16) return { boxes, cell };
  }
}

// --- the model as the viewer has it ----------------------------------------------------------------------------

/** The GLB's nodes as three.js objects, named as the page's loader names them, with their extras: what viewer/explode.ts moves. */
function hierarchy(gltf) {
  const used = new Set();
  const objects = [];
  // (as GLTFLoader: a name is made safe, and a second of the same name is numbered)
  const named = (raw) => {
    const name = THREE.PropertyBinding.sanitizeNodeName(raw ?? '');
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
    for (let i = 1; ; i++)
      if (!used.has(`${name}_${i}`)) {
        used.add(`${name}_${i}`);
        return `${name}_${i}`;
      }
  };
  const read = (index) => {
    const node = gltf.nodes[index];
    const object = new THREE.Group();
    object.name = named(node.name);
    if (node.matrix) object.matrix.fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
    else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    Object.assign(object.userData, node.extras ?? {});
    objects[index] = object;
    for (const child of node.children ?? []) object.add(read(child));
    return object;
  };
  const scene = new THREE.Group();
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) scene.add(read(index));
  scene.updateMatrixWorld(true);
  return { scene, objects };
}

/** Where an object is in the model's frame, without its scale: seven figures. */
function placing(object) {
  object.updateWorldMatrix(true, false);
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  object.matrixWorld.decompose(p, q, new THREE.Vector3());
  return [p.x, p.y, p.z, q.x, q.y, q.z, q.w];
}

/** A node's own triangles carried by `matrix`, nine figures each. */
function carried(glb, index, matrix) {
  const out = [];
  const v = new THREE.Vector3();
  for (const { positions, indices } of glb.triangles(index))
    for (const i of indices) {
      v.fromArray(positions, 3 * i).applyMatrix4(matrix);
      out.push(v.x, v.y, v.z);
    }
  return out;
}

/** A structure's pieces: its boxes, where each stands at liftoff and where it goes after. */
async function structure(def, stats) {
  const glb = await readGlb(join(root, 'public', def.url));
  const { scene, objects } = hierarchy(glb.gltf);
  const { Exploder } = await import('../src/viewer/explode.ts');
  const { sliderAt } = await import('../src/world/sequence.ts');
  // People are not solid to a rocket: a part whose people walk (`going`), and a node put out of sight by no machine.
  const soft = new Set();
  const moving = new Set();
  for (const part of def.parts) {
    if (part.going?.length) soft.add(part.node);
    for (const move of [...(part.moves ?? []), ...(part.clocked ?? [])]) {
      const node = move.node ?? part.node;
      moving.add(node);
      if (move.machine?.kind === 'none' && move.kind === 'slide') soft.add(node);
    }
  }
  // each mesh belongs to the nearest node above it that is a piece: a moving node, or else its top-level node
  const pieceOf = (index) => {
    for (let i = index; i >= 0; i = glb.parents[i]) if (moving.has(objects[i].name) || glb.parents[i] < 0) return i;
    return index;
  };
  const partOf = (index) => {
    let i = index;
    while (glb.parents[i] >= 0) i = glb.parents[i];
    return objects[i].name;
  };
  const isSoft = (index) => {
    for (let i = index; i >= 0; i = glb.parents[i]) if (soft.has(objects[i].name)) return true;
    return false;
  };
  const absent = new Set(def.absent ?? []);
  const members = new Map();
  glb.gltf.nodes.forEach((node, index) => {
    if (node.mesh === undefined || isSoft(index) || absent.has(partOf(index))) return;
    const piece = pieceOf(index);
    if (!members.has(piece)) members.set(piece, []);
    members.get(piece).push(index);
  });
  // as built: each piece's triangles in its own frame (its node's, without scale)
  const built = new Map();
  for (const [piece, meshes] of members) {
    const [px, py, pz, qx, qy, qz, qw] = placing(objects[piece]);
    const frame = new THREE.Matrix4()
      .compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(qx, qy, qz, qw), new THREE.Vector3(1, 1, 1))
      .invert();
    const triangles = [];
    for (const index of meshes) {
      objects[index].updateWorldMatrix(true, false);
      for (const v of carried(glb, index, new THREE.Matrix4().multiplyMatrices(frame, objects[index].matrixWorld))) triangles.push(v);
    }
    // near the launch axis (the model's own vertical through its origin) and beyond it, each within its own budget
    const origin = new THREE.Vector3().applyMatrix4(frame);
    const up = new THREE.Vector3(0, 1, 0).transformDirection(frame);
    const near = [];
    const far = [];
    const d = new THREE.Vector3();
    for (let i = 0; i < triangles.length; i += 9) {
      d.set(
        (triangles[i] + triangles[i + 3] + triangles[i + 6]) / 3,
        (triangles[i + 1] + triangles[i + 4] + triangles[i + 7]) / 3,
        (triangles[i + 2] + triangles[i + 5] + triangles[i + 8]) / 3,
      ).sub(origin);
      d.addScaledVector(up, -d.dot(up));
      const into = d.length() <= NEAR ? near : far;
      for (let k = 0; k < 9; k++) into.push(triangles[i + k]);
    }
    const a = within(Float32Array.from(near), NEAR_BOXES);
    const b = within(Float32Array.from(far), FAR_BOXES);
    const boxes = new Float32Array(a.boxes.length + b.boxes.length);
    boxes.set(a.boxes);
    boxes.set(b.boxes, a.boxes.length);
    built.set(piece, { boxes, cell: Math.max(a.boxes.length ? a.cell : CELL, b.boxes.length ? b.cell : CELL) });
  }
  // on the clock: the viewer's own moves, from liftoff to the last thing the model does
  const parts = def.parts.map(({ going, ...part }) => part);
  const quiet = console.warn;
  console.warn = () => {};
  const exploder = new Exploder(scene, parts);
  console.warn = quiet;
  const moves = def.parts.flatMap((p) => p.clocked ?? []);
  const end = Math.max(0, ...(def.sequence ?? []).map((k) => k.at), ...moves.map((m) => m.to));
  const times = [];
  for (let t = 0; t < Math.min(end, 60); t += 0.1) times.push(Math.round(t * 10) / 10);
  const rest = Math.max(1, (end - 60) / 2000);
  for (let t = 60; t < end; t += rest) times.push(t);
  times.push(end);
  // (only what a move can reach is followed: a piece that is, or is under, a node that moves)
  const moved = (index) => {
    for (let i = index; i >= 0; i = glb.parents[i]) if (moving.has(objects[i].name)) return true;
    return false;
  };
  const plain = def.parts.some((p) => !p.moves && p.explode.some(Boolean)) && Boolean(def.sequence);
  const tracks = new Map([...members.keys()].map((piece) => [piece, []]));
  times.forEach((t, first) => {
    exploder.set(def.sequence ? sliderAt(def.sequence, t) : 0);
    exploder.clock(t);
    scene.updateMatrixWorld(true);
    for (const [piece, track] of tracks) if (!first || plain || moved(piece)) track.push(t, ...placing(objects[piece]));
  });
  const pieces = [];
  for (const [piece, { boxes, cell }] of built) {
    if (!boxes.length) continue;
    const track = thinned(tracks.get(piece));
    const [, px, py, pz, qx, qy, qz, qw] = track;
    pieces.push({
      node: objects[piece].name,
      part: partOf(piece),
      boxes,
      cell,
      pose: { p: [px, py, pz], q: [qx, qy, qz, qw] },
      ...(track.length > 8 ? { track: Float32Array.from(track) } : {}),
    });
    if (stats)
      console.log(
        `    ${objects[piece].name.padEnd(28)} ${String(boxes.length / 6).padStart(6)} boxes${cell > CELL ? ` of ${cell} m` : ''}${track.length > 8 ? `, ${track.length / 8} poses` : ''}`,
      );
  }
  pieces.sort((a, b) => (a.node < b.node ? -1 : a.node > b.node ? 1 : 0));
  return pieces;
}

/** A track without the samples a straight line between their neighbours gives anyway; one sample if it never moves. */
function thinned(track) {
  const n = track.length / 8;
  const at = (i) => track.slice(8 * i, 8 * i + 8);
  const near = (a, b) => {
    const turn = Math.abs(a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7]);
    return Math.hypot(a[1] - b[1], a[2] - b[2], a[3] - b[3]) <= TRACK_SLACK && 2 * Math.acos(Math.min(1, turn)) <= TURN_SLACK;
  };
  const between = (a, b, t) => {
    const k = (t - a[0]) / (b[0] - a[0] || 1);
    const sign = a[4] * b[4] + a[5] * b[5] + a[6] * b[6] + a[7] * b[7] < 0 ? -1 : 1;
    const q = [4, 5, 6, 7].map((i) => a[i] + (sign * b[i] - a[i]) * k);
    const norm = Math.hypot(...q);
    return [t, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k, ...q.map((v) => v / norm)];
  };
  let still = true;
  for (let i = 1; i < n && still; i++) still = near(at(0), at(i));
  if (still) return at(0);
  const kept = [0];
  let from = 0;
  for (let i = 2; i < n; i++) {
    // can the samples between `from` and i be left out? (no run is longer than 200 samples, so this stays quick)
    let ok = i - from <= 200;
    for (let j = from + 1; j < i && ok; j++) ok = near(at(j), between(at(from), at(i), track[8 * j]));
    if (!ok) {
      kept.push(i - 1);
      from = i - 1;
    }
  }
  kept.push(n - 1);
  return kept.flatMap((i) => at(i));
}

// --- hulls -----------------------------------------------------------------------------------------------------

/**
 * A vehicle's top-level nodes as strings of spheres up the stack (the model's +Y). Each node is cut into slices; a
 * slice's middle is the middle of its surface and its radius the distance within which 95% of that surface lies, so a
 * whip aerial does not make a tank of itself; spheres of the slices' radii are strung along, no further apart than
 * their radius. A node shorter than it is wide is rings of spheres across its disc. Every top-level node has one but
 * those the site does not draw (`ModelDef.absent`), and so has every node the flight sheds (`shed`: a fairing's half
 * inside its top-level node), which is then not part of the node above it; what lies wholly within another's is for
 * the simulator to drop.
 */
async function hullsOf(def, shed, stats) {
  const glb = await readGlb(join(root, 'public', def.url));
  const { objects } = hierarchy(glb.gltf);
  // (a part the gallery calls `inside` is not left out: a heat shield is inside the stack and outside the capsule alone)
  const inside = new Set(def.absent ?? []);
  const leaves = new Set(shed);
  // each mesh is of the nearest node above it that has a hull: one the flight sheds, or else its top-level node
  const owned = new Map();
  glb.gltf.nodes.forEach((node, index) => {
    if (node.mesh === undefined) return;
    let owner = index;
    while (glb.parents[owner] >= 0 && !leaves.has(objects[owner].name)) owner = glb.parents[owner];
    let top = owner;
    while (glb.parents[top] >= 0) top = glb.parents[top];
    if (inside.has(objects[top].name)) return;
    if (!owned.has(owner)) owned.set(owner, []);
    const triangles = owned.get(owner);
    objects[index].updateWorldMatrix(true, false);
    for (const v of carried(glb, index, objects[index].matrixWorld)) triangles.push(v);
  });
  const hulls = [];
  for (const [owner, triangles] of owned) {
    const name = objects[owner].name;
    if (!triangles.length) continue;
    let low = Infinity;
    let high = -Infinity;
    for (let i = 1; i < triangles.length; i += 3) {
      low = Math.min(low, triangles[i]);
      high = Math.max(high, triangles[i]);
    }
    const height = high - low;
    const step = Math.min(0.5, Math.max(0.05, height / 48));
    const count = Math.max(1, Math.ceil(height / step));
    const slices = Array.from({ length: count }, () => ({ area: 0, x: 0, z: 0, bits: [] }));
    for (let i = 0; i < triangles.length; i += 9) {
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = triangles.slice(i, i + 9);
      const area =
        Math.hypot(
          (by - ay) * (cz - az) - (bz - az) * (cy - ay),
          (bz - az) * (cx - ax) - (bx - ax) * (cz - az),
          (bx - ax) * (cy - ay) - (by - ay) * (cx - ax),
        ) / 2;
      if (!(area > 0)) continue;
      const slice = slices[Math.min(count - 1, Math.floor(((ay + by + cy) / 3 - low) / step))];
      const x = (ax + bx + cx) / 3;
      const z = (az + bz + cz) / 3;
      slice.area += area;
      slice.x += area * x;
      slice.z += area * z;
      slice.bits.push([x, z, area]);
    }
    const profile = slices.map((s) => {
      if (!s.area) return null;
      const x = s.x / s.area;
      const z = s.z / s.area;
      const far = s.bits.map(([bx, bz, area]) => [Math.hypot(bx - x, bz - z), area]).sort((a, b) => a[0] - b[0]);
      let sum = 0;
      let radius = far[far.length - 1][0];
      for (const [d, area] of far) {
        sum += area;
        if (sum >= 0.95 * s.area) {
          radius = d;
          break;
        }
      }
      return { x, z, radius };
    });
    // (an empty slice between two takes the one below it)
    for (let i = 0; i < count; i++) profile[i] ??= profile[i - 1] ?? profile.find(Boolean);
    const at = (y) => profile[Math.min(count - 1, Math.max(0, Math.floor((y - low) / step)))];
    const widest = Math.max(...profile.map((p) => p.radius));
    const beads = [];
    if (widest < 0.02) continue;
    // the node's own footprint (x, z)
    const least = [Infinity, Infinity];
    const most = [-Infinity, -Infinity];
    for (let i = 0; i < triangles.length; i += 3) {
      least[0] = Math.min(least[0], triangles[i]);
      most[0] = Math.max(most[0], triangles[i]);
      least[1] = Math.min(least[1], triangles[i + 2]);
      most[1] = Math.max(most[1], triangles[i + 2]);
    }
    if (height < widest) {
      // a disc: one layer of spheres as thick as it is, in rings out to its rim
      // (no thicker than the node is: a sphere that stood out above and below it would be hull where there is none)
      const r = Math.max(height / 2, 0.05);
      const { x, z } = at((low + high) / 2);
      const y = (low + high) / 2;
      beads.push(x, y, z, r);
      const rings = Math.ceil(Math.max(0, widest - r) / r);
      for (let ring = 1; ring <= rings; ring++) {
        const arm = ((widest - r) * ring) / rings;
        const n = Math.ceil((2 * Math.PI * arm) / r);
        for (let j = 0; j < n; j++) {
          const bx = x + arm * Math.cos((2 * Math.PI * j) / n);
          const bz = z + arm * Math.sin((2 * Math.PI * j) / n);
          // (only over the node itself: one whose surface is to one side has no hull beyond its other)
          if (bx >= least[0] && bx <= most[0] && bz >= least[1] && bz <= most[1]) beads.push(bx, y, bz, r);
        }
      }
    } else {
      let y = low;
      for (let guard = 0; guard < 400; guard++) {
        let r = Math.min(at(y).radius, height / 2);
        r = Math.max(0.03, Math.min(at(y + r).radius, height / 2));
        const centre = Math.min(y + r, high - r);
        const { x, z } = at(centre);
        beads.push(x, centre, z, r);
        if (centre >= high - r - 1e-9) break;
        y = centre;
      }
    }
    hulls.push({ node: name, beads: Float32Array.from(beads) });
    if (stats)
      console.log(
        `    ${name.padEnd(28)} ${String(beads.length / 4).padStart(4)} spheres, ${height.toFixed(2)} m tall, ${widest.toFixed(2)} m radius`,
      );
  }
  hulls.sort((a, b) => (a.node < b.node ? -1 : a.node > b.node ? 1 : 0));
  return hulls;
}

/** Bake one model of a flight: the bytes of its file. */
export async function bake(def, kind, flight, stats = false) {
  const model = {
    cell: CELL,
    source: sourceOf(def, kind, flight),
    pieces: kind === 'structure' ? await structure(def, stats) : [],
    hulls: kind === 'vehicle' ? await hullsOf(def, shedBy(flight), stats) : [],
  };
  return encodeSolids(model);
}

async function main(args) {
  const check = args.includes('--check');
  const stats = args.includes('--stats');
  const wanted = args.filter((a) => !a.startsWith('--'));
  const { flights } = await import(pathToFileURL(join(root, 'missions/index.ts')).href);
  let wrong = 0;
  let bytes = 0;
  // (a place's pad is one model for every flight from it: baked once, and two flights that would bake it differently
  // cannot both be right, since there is one file)
  const made = new Map();
  for (const flight of flights) {
    if (wanted.length && !wanted.some((w) => flight.id.includes(w))) continue;
    for (const { def, kind } of solidModels(flight)) {
      const file = solidPath(def.url);
      const source = sourceOf(def, kind, flight);
      if (made.has(def.url)) {
        if (made.get(def.url).source !== source)
          throw new Error(
            `${def.url} is posed one way by ${made.get(def.url).flight} and another by ${flight.id}: one file cannot be both`,
          );
        continue;
      }
      made.set(def.url, { source, flight: flight.id });
      const state = staleness(def, kind, flight);
      if (check) {
        if (state) {
          wrong++;
          console.log(`${flight.id} ${def.id}: ${state}`);
        }
        continue;
      }
      if (!state && !stats && !args.includes('--force')) continue;
      const started = performance.now();
      if (stats) console.log(`${flight.id} ${def.id} (${kind})`);
      const out = await bake(def, kind, flight, stats);
      writeFileSync(file, out);
      bytes += out.length;
      const model = decodeSolids(out);
      const boxes = model.pieces.reduce((n, p) => n + p.boxes.length / 6, 0);
      const beads = model.hulls.reduce((n, h) => n + h.beads.length / 4, 0);
      console.log(
        `${flight.id} ${def.id}: ${kind === 'structure' ? `${model.pieces.length} pieces, ${boxes} boxes` : `${model.hulls.length} hulls, ${beads} spheres`}, ${(out.length / 1024).toFixed(0)} KB, ${((performance.now() - started) / 1000).toFixed(1)} s`,
      );
    }
  }
  if (check && wrong) {
    console.log(`${wrong} to bake: pnpm collision`);
    process.exit(1);
  }
  if (!check) console.log(`${(bytes / 1024).toFixed(0)} KB written`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
