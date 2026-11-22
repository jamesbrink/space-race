import * as THREE from 'three';

/**
 * Ladders on foot (walk.ts climbs them): what a ladder is as a model declares it, where a body hangs on it and how a tick
 * on it goes, and, for one that leans (laid along a strut: the LM's), its run found from its own rails. Pure but for the
 * meshes a ladder is read from; nothing here knows a flight.
 */

/** How fast a ladder is climbed, m/s: a rung a second or so, hand over hand. */
export const CLIMB_SPEED = 0.6;
/** How far off a ladder's face the body hangs, beyond its own half-width, metres. */
const CLIMB_GAP = 0.04;

/**
 * A ladder: one run, as a model declares it (a mesh with `userData.climb`). It is known by its
 * bounds: the heights of its foot and its top, where its middle is over the ground, and its
 * half-widths along x and z. The thinner way is the way it is climbed from. A ladder that leans
 * (one laid along a strut: the LM's) also has its `lean`, found from its own rails (`Solids.ladderOf`):
 * how far its middle goes over the ground for each metre it rises, and its half-depth and
 * half-width across that; it is climbed from the side it leans away from, its upper face.
 */
export interface Ladder {
  /** The mesh it is, where it is one: a ladder on something that moves takes its climber with it. */
  mesh?: THREE.Mesh;
  bottom: number;
  top: number;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** A leaning ladder's slope (its middle's way over the ground per metre up, x and z), its half-depth and its half-width, metres. */
  lean?: { x: number; z: number; depth: number; width: number };
  /**
   * Where its rungs are, where the model says (extras `climb_pitch`, `climb_first`): the height between them and the lowest's
   * over its foot, metres. Left out, they are srlib.ladder's (`RUNG`: a foot apart, the first a foot up).
   */
  rungs?: { pitch: number; first: number };
}

/** Where a ladder's middle is over the ground at height `y`: its box's middle, or for one that leans, where the lean has it. */
export function centreOf(ladder: Ladder, y: number): { x: number; z: number } {
  const l = ladder.lean;
  if (!l) return { x: ladder.x, z: ladder.z };
  const dy = y - (ladder.bottom + ladder.top) / 2;
  return { x: ladder.x + l.x * dy, z: ladder.z + l.z * dy };
}

/** How deep a ladder is along the way it is climbed from (`nx`, `nz`), and how wide across it, as halves, metres. */
export function extentOf(ladder: Ladder, nx: number): { depth: number; width: number } {
  if (ladder.lean) return { depth: ladder.lean.depth, width: ladder.lean.width };
  return nx ? { depth: ladder.hx, width: ladder.hz } : { depth: ladder.hz, width: ladder.hx };
}

/** A ladder with a climber on it: which side of it they are on (a unit way out from its face, over the ground). */
export interface Hold extends Ladder {
  nx: number;
  nz: number;
}

/**
 * Where a body of this half-width hangs on a ladder, coming to it from (px, pz): just off the
 * face on the side it came from, in the middle of the rungs. `side` (1 or -1) names the side
 * instead, for coming to a ladder from the deck at its top.
 */
export function hang(
  ladder: Ladder,
  px: number,
  pz: number,
  radius: number,
  side?: 1 | -1,
  y?: number,
): { x: number; z: number; nx: number; nz: number } {
  const l = ladder.lean;
  if (l) {
    // (one that leans is climbed on its upper face, whichever side it was come to from: its foot stands out from what it leans on)
    const flat = Math.hypot(l.x, l.z);
    const nx = -l.x / flat;
    const nz = -l.z / flat;
    const c = centreOf(ladder, y ?? (ladder.bottom + ladder.top) / 2);
    const out = l.depth + radius + CLIMB_GAP;
    return { x: c.x + nx * out, z: c.z + nz * out, nx, nz };
  }
  const alongX = ladder.hx <= ladder.hz; // climbed along x: the rungs run along z
  const s = side ?? (((alongX ? px - ladder.x : pz - ladder.z) >= 0 ? 1 : -1) as 1 | -1);
  const out = (alongX ? ladder.hx : ladder.hz) + radius + CLIMB_GAP;
  return alongX ? { x: ladder.x + s * out, z: ladder.z, nx: s, nz: 0 } : { x: ladder.x, z: ladder.z + s * out, nx: 0, nz: s };
}

/**
 * A tick on a ladder: `push` is 1 to climb, -1 to go down, and anything between. The feet go no
 * higher than its top and no lower than its foot; `off` says which end has been reached, going that way.
 */
export function climb(
  y: number,
  push: number,
  ladder: { bottom: number; top: number },
  dt: number,
): { y: number; off: 'top' | 'bottom' | null } {
  const to = y + Math.max(-1, Math.min(1, push)) * CLIMB_SPEED * dt;
  if (push > 0 && to >= ladder.top) return { y: ladder.top, off: 'top' };
  if (push < 0 && to <= ladder.bottom) return { y: ladder.bottom, off: 'bottom' };
  return { y: Math.max(ladder.bottom, Math.min(ladder.top, to)), off: null };
}

/**
 * A ladder's run in its own mesh, found once a geometry (`axisOf`): the middles of its lowest and highest tenth, and its
 * half-depth and half-width across the line between them; null for one that stands within 4.6 degrees of the upright,
 * which is known by its box alone, as every ladder was before one leant.
 */
const AXES = new WeakMap<THREE.BufferGeometry, { foot: THREE.Vector3; head: THREE.Vector3; depth: number; width: number } | null>();
function axisOf(geometry: THREE.BufferGeometry): { foot: THREE.Vector3; head: THREE.Vector3; depth: number; width: number } | null {
  if (AXES.has(geometry)) return AXES.get(geometry)!;
  const p = geometry.getAttribute('position');
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < p.count; i++) {
    low = Math.min(low, p.getY(i));
    high = Math.max(high, p.getY(i));
  }
  const tenth = (high - low) / 10;
  const foot = new THREE.Vector3();
  const head = new THREE.Vector3();
  let feet = 0;
  let heads = 0;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y <= low + tenth) {
      foot.x += p.getX(i);
      foot.y += y;
      foot.z += p.getZ(i);
      feet++;
    } else if (y >= high - tenth) {
      head.x += p.getX(i);
      head.y += y;
      head.z += p.getZ(i);
      heads++;
    }
  }
  foot.divideScalar(Math.max(1, feet));
  head.divideScalar(Math.max(1, heads));
  const rise = head.y - foot.y;
  const lx = (head.x - foot.x) / rise;
  const lz = (head.z - foot.z) / rise;
  const flat = Math.hypot(lx, lz);
  if (!(rise > 0) || flat < 0.08) {
    AXES.set(geometry, null);
    return null;
  }
  // (across the run: how far its rails and rungs reach from the line, out from its face and along its rungs)
  const [nx, nz] = [-lx / flat, -lz / flat];
  let depth = 0;
  let width = 0;
  for (let i = 0; i < p.count; i++) {
    const dy = p.getY(i) - foot.y;
    const ox = p.getX(i) - (foot.x + lx * dy);
    const oz = p.getZ(i) - (foot.z + lz * dy);
    depth = Math.max(depth, Math.abs(ox * nx + oz * nz));
    width = Math.max(width, Math.abs(ox * -nz + oz * nx));
  }
  const axis = { foot, head, depth, width };
  AXES.set(geometry, axis);
  return axis;
}

const FOOT = new THREE.Vector3();
const HEAD = new THREE.Vector3();
/** A ladder as a mesh stands, from its box in the world (and, for one that leans, its run turned as the mesh is). */
export function ladderIn(mesh: THREE.Mesh, box: THREE.Box3): Ladder {
  const ladder: Ladder = {
    mesh,
    bottom: box.min.y,
    top: box.max.y,
    x: (box.min.x + box.max.x) / 2,
    z: (box.min.z + box.max.z) / 2,
    hx: (box.max.x - box.min.x) / 2,
    hz: (box.max.z - box.min.z) / 2,
  };
  const { climb_pitch: pitch, climb_first: first } = mesh.userData;
  if (typeof pitch === 'number' && pitch > 0) ladder.rungs = { pitch, first: typeof first === 'number' ? first : pitch };
  const axis = axisOf(mesh.geometry);
  if (!axis) return ladder;
  FOOT.copy(axis.foot).applyMatrix4(mesh.matrixWorld);
  HEAD.copy(axis.head).applyMatrix4(mesh.matrixWorld);
  const rise = HEAD.y - FOOT.y;
  if (!(rise > 0)) return ladder;
  const scale = mesh.matrixWorld.getMaxScaleOnAxis();
  const lx = (HEAD.x - FOOT.x) / rise;
  const lz = (HEAD.z - FOOT.z) / rise;
  if (Math.hypot(lx, lz) < 0.08) return ladder;
  // (its middle over the ground at the middle of its height, on the run)
  const mid = (ladder.bottom + ladder.top) / 2 - FOOT.y;
  ladder.x = FOOT.x + lx * mid;
  ladder.z = FOOT.z + lz * mid;
  ladder.lean = { x: lx, z: lz, depth: axis.depth * scale, width: axis.width * scale };
  return ladder;
}

/** How far apart a ladder's rungs are, metres (srlib.ladder: the first is this far above its foot). */
export const RUNG = 0.3;

/**
 * On a ladder, which rung each hand and foot is on: its height above the ladder's foot, metres, when the climber's own
 * level (where the walker has his feet) is `y` above it. Each holds its rung for half a cycle while he rises a rung
 * past it, then goes up two in the other half: the left foot and the right hand together, then the others. A foot's
 * rung is the one at his level or the next above; a hand's is `reach` rungs above its foot's. By height alone: stop
 * on the ladder and they stop, come down and they come down the same rungs.
 */
export function rungs(
  y: number,
  reach = 5,
  pitch = RUNG,
  first = RUNG,
): { 'Foot.L': number; 'Foot.R': number; 'Hand.L': number; 'Hand.R': number } {
  // (a ladder that says where its rungs are, the LM's, has them `pitch` apart from `first` over its foot: `Ladder.rungs`)
  const two = 2 * pitch;
  const u = y / two;
  const on = (o: number, up: number): number => {
    const v = u - o;
    const f = v - Math.floor(v);
    const k = Math.max(0, (f - 0.5) / 0.5);
    return two * (o + Math.floor(v) + k * k * (3 - 2 * k)) + first + pitch * up;
  };
  return { 'Foot.L': on(0, 0), 'Foot.R': on(0.5, 0), 'Hand.R': on(0, reach), 'Hand.L': on(0.5, reach) };
}
