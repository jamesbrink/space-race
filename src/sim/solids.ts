/**
 * What is solid, for the simulator: a model's shape as boxes, baked from its GLB (tools/collision-bake.mjs) and read
 * here with no three.js and no GLB loader, so a flight can strike what stands at its site in node as in the page.
 *
 * A model is `pieces`. Each is a node of the GLB that is rigid by itself: a part's top-level node, or a node inside
 * one that a move names (an arm that swings, a wagon that drives), without what its own moving nodes carry. A piece's
 * shape is axis-aligned boxes in its own frame: the model was cut into cells `cell` metres across and each cell that
 * holds surface keeps the box round what is in it, so a wall, a deck or a rail is exactly where the model has it and
 * only what crosses a cell at an angle is squared off, by no more than the cell. Cells that line up are joined. A
 * closed volume is a shell of them: there is nothing inside it. A piece that would be too many boxes (a great sloped
 * earthwork, a dome) is cut coarser, and says how coarse (`SolidPiece.cell`).
 *
 * Where a piece stands is a `Pose` in the model's frame: `pose` at liftoff, and `track` wherever it goes after it on
 * the flight's clock (the model's own moves, played by the viewer's own code when it was baked). Before liftoff
 * nothing here is right: the simulator does not fly then.
 *
 * A vehicle's model carries `hulls` instead: for each of its top-level nodes a string of spheres along it, which is
 * what of it is swept against the boxes (sim/siteworld.ts).
 *
 * Simplified, and said in simulator.md: shapes are as fine as `cell`; pieces are rigid and immovable; what a hand has
 * worked out of its programme on foot is not known here.
 */
import { add, cross, scale, sub, type Vec3 } from '../world/frames.ts';

/** A rigid placing: where a frame's origin is and how it is turned (a unit quaternion x y z w), in its parent's. */
export interface Pose {
  p: Vec3;
  q: readonly [number, number, number, number];
}

export interface SolidPiece {
  /** The GLB node it is, and the top-level part node it belongs to (the same for a part's own). */
  node: string;
  part: string;
  /** Six figures a box (its least corner, its greatest), metres in the piece's frame. */
  boxes: Float32Array;
  /** The size of the coarsest cells it was cut into, metres: the model's `cell` unless it would have been too many boxes (tools/collision-bake.mjs). */
  cell: number;
  /** Where it stands at liftoff, in the model's frame. */
  pose: Pose;
  /** Where it goes from liftoff on: eight figures a sample (seconds from launch, then a `Pose`), in order of time. */
  track?: Float32Array;
}

export interface SolidHull {
  /** The top-level node of the vehicle's model it is the shape of. */
  node: string;
  /** Four figures a sphere (its centre, its radius), metres in the model's frame. */
  beads: Float32Array;
}

export interface SolidModel {
  /** The cells' size, metres: what a shape here is good to. */
  cell: number;
  /** What it was baked from: a digest of the GLB and of the flight's data that poses it (tests/collision.test.mjs holds it current). */
  source: string;
  pieces: SolidPiece[];
  hulls: SolidHull[];
}

const MAGIC = 0x4c435253; // 'SRCL'
const VERSION = 1;

/**
 * A model's solids as the bytes of its file: a header in JSON, then every box as 16-bit integers (each piece's own
 * `quantum` metres a step, its least corners rounded down and its greatest up, so a box is never smaller than it was
 * baked), then the tracks and the hulls as 32-bit floats.
 */
export function encodeSolids(model: SolidModel): Uint8Array {
  const floats: number[] = [];
  const ints: number[] = [];
  const put = (a: Float32Array | undefined): [number, number] | undefined => {
    if (!a?.length) return undefined;
    for (const v of a) floats.push(v);
    return [floats.length - a.length, a.length];
  };
  const header = {
    cell: model.cell,
    source: model.source,
    pieces: model.pieces.map((piece) => {
      let most = 0;
      for (const v of piece.boxes) most = Math.max(most, Math.abs(v));
      const quantum = Math.max(1e-4, most / 32766);
      const start = ints.length;
      piece.boxes.forEach((v, i) => {
        ints.push(i % 6 < 3 ? Math.floor(v / quantum) : Math.ceil(v / quantum));
      });
      return {
        node: piece.node,
        part: piece.part,
        cell: piece.cell,
        pose: [...piece.pose.p, ...piece.pose.q],
        quantum,
        boxes: [start, piece.boxes.length],
        track: put(piece.track),
      };
    }),
    hulls: model.hulls.map((hull) => ({ node: hull.node, beads: put(hull.beads) })),
    ints: 0,
  };
  if (ints.length % 2) ints.push(0);
  header.ints = ints.length;
  let json = JSON.stringify(header);
  json += ' '.repeat((4 - (new TextEncoder().encode(json).length % 4)) % 4);
  const text = new TextEncoder().encode(json);
  const out = new Uint8Array(12 + text.length + ints.length * 2 + floats.length * 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, VERSION, true);
  view.setUint32(8, text.length, true);
  out.set(text, 12);
  let to = 12 + text.length;
  for (const v of ints) {
    view.setInt16(to, v, true);
    to += 2;
  }
  for (const v of floats) {
    view.setFloat32(to, v, true);
    to += 4;
  }
  return out;
}

/** Read a file `encodeSolids` wrote. */
export function decodeSolids(bytes: Uint8Array): SolidModel {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MAGIC || view.getUint32(4, true) !== VERSION) throw new Error('not a solids file of this version');
  const length = view.getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + length)));
  // (read through the view: the file need not lie on a four-byte boundary of whatever buffer holds it, and a node
  // Buffer shares a pool, so nothing here takes the buffer for the file)
  const ints = 12 + length;
  const floats = ints + header.ints * 2;
  const take = (range?: [number, number]) => {
    const out = new Float32Array(range ? range[1] : 0);
    for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(floats + 4 * (range![0] + i), true);
    return out;
  };
  const boxes = (range: [number, number], quantum: number) => {
    const out = new Float32Array(range[1]);
    for (let i = 0; i < out.length; i++) out[i] = view.getInt16(ints + 2 * (range[0] + i), true) * quantum;
    return out;
  };
  type Piece = {
    node: string;
    part: string;
    cell: number;
    pose: number[];
    quantum: number;
    boxes: [number, number];
    track?: [number, number];
  };
  return {
    cell: header.cell,
    source: header.source,
    pieces: header.pieces.map((piece: Piece) => ({
      node: piece.node,
      part: piece.part,
      cell: piece.cell,
      pose: { p: piece.pose.slice(0, 3), q: piece.pose.slice(3) },
      boxes: boxes(piece.boxes, piece.quantum),
      ...(piece.track ? { track: take(piece.track) } : {}),
    })),
    hulls: header.hulls.map((hull: { node: string; beads?: [number, number] }) => ({ node: hull.node, beads: take(hull.beads) })),
  };
}

type Q = Pose['q'];

/** A vector turned by a unit quaternion, and turned back. */
export function turnBy(q: Q, v: Vec3): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]];
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, q[3])), cross(u, t));
}
export const unturnBy = (q: Q, v: Vec3): Vec3 => turnBy([-q[0], -q[1], -q[2], q[3]], v);

/** A point of a posed frame in its parent's, and a parent's point in the frame. */
export const outOf = (pose: Pose, v: Vec3): Vec3 => add(pose.p, turnBy(pose.q, v));
export const into = (pose: Pose, v: Vec3): Vec3 => unturnBy(pose.q, sub(v, pose.p));

/** A posed frame within a posed frame, in the outer one's parent. */
export function within(outer: Pose, inner: Pose): Pose {
  const [ax, ay, az, aw] = outer.q;
  const [bx, by, bz, bw] = inner.q;
  return {
    p: outOf(outer, inner.p),
    q: [
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz,
    ],
  };
}

/** Where a piece stands at `t`, seconds from launch, in its model's frame: its liftoff pose until its track begins, its last after it ends. */
export function poseAt(piece: SolidPiece, t: number): Pose {
  const track = piece.track;
  if (!track?.length) return piece.pose;
  const n = track.length / 8;
  const read = (i: number): Pose => ({
    p: [track[8 * i + 1]!, track[8 * i + 2]!, track[8 * i + 3]!],
    q: [track[8 * i + 4]!, track[8 * i + 5]!, track[8 * i + 6]!, track[8 * i + 7]!],
  });
  if (t <= track[0]!) return read(0);
  if (t >= track[8 * (n - 1)]!) return read(n - 1);
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[8 * mid]! <= t) lo = mid;
    else hi = mid;
  }
  const a = read(lo);
  const b = read(hi);
  const k = (t - track[8 * lo]!) / (track[8 * hi]! - track[8 * lo]! || 1);
  const sign = a.q[0] * b.q[0] + a.q[1] * b.q[1] + a.q[2] * b.q[2] + a.q[3] * b.q[3] < 0 ? -1 : 1;
  const q = a.q.map((v, i) => v + (sign * b.q[i]! - v) * k);
  const norm = Math.hypot(q[0]!, q[1]!, q[2]!, q[3]!) || 1;
  return { p: add(a.p, scale(sub(b.p, a.p), k)), q: [q[0]! / norm, q[1]! / norm, q[2]! / norm, q[3]! / norm] };
}

/** What a swept sphere met: how far along its way (0 to 1), the surface's outward normal there, and which box. */
export interface BoxHit {
  fraction: number;
  normal: Vec3;
  box: number;
}

/** How near a sphere's surface must come to count as touching, metres. */
const TOUCH = 1e-6;

/**
 * A sphere of `radius` whose centre goes from `from` by `by`, against the box at `at` of `boxes`: where it first
 * touches, or null. A sphere that starts in the box, or touching it, has not met it: it was there (`overlaps` asks).
 * By conservative advancement from where its line enters the box grown by the radius: each step is as far as the
 * nearest point of the box allows, so it cannot pass through, at any speed.
 */
export function sweepBox(boxes: Float32Array, at: number, from: Vec3, by: Vec3, radius: number): { fraction: number; normal: Vec3 } | null {
  let enter = 0;
  let leave = 1;
  for (let k = 0; k < 3; k++) {
    const lo = boxes[at + k]! - radius;
    const hi = boxes[at + 3 + k]! + radius;
    if (Math.abs(by[k]!) < 1e-12) {
      if (from[k]! < lo || from[k]! > hi) return null;
      continue;
    }
    const a = (lo - from[k]!) / by[k]!;
    const b = (hi - from[k]!) / by[k]!;
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
    if (enter > leave) return null;
  }
  const speed = Math.hypot(by[0], by[1], by[2]);
  if (!speed) return null;
  let t = enter;
  for (let i = 0; i < 64; i++) {
    const p: Vec3 = [from[0] + by[0] * t, from[1] + by[1] * t, from[2] + by[2] * t];
    const off: Vec3 = [
      p[0] - Math.min(boxes[at + 3]!, Math.max(boxes[at]!, p[0])),
      p[1] - Math.min(boxes[at + 4]!, Math.max(boxes[at + 1]!, p[1])),
      p[2] - Math.min(boxes[at + 5]!, Math.max(boxes[at + 2]!, p[2])),
    ];
    const distance = Math.hypot(off[0], off[1], off[2]);
    const gap = distance - radius;
    if (gap <= TOUCH) {
      // (there from the start: not a meeting)
      if (t <= 0 || distance <= 0) return null;
      return { fraction: t, normal: scale(off, 1 / distance) };
    }
    t += gap / speed;
    if (t > leave) return null;
  }
  return null;
}

/** Whether a sphere at `centre` reaches into the box at `at` of `boxes`. */
export function overlaps(boxes: Float32Array, at: number, centre: Vec3, radius: number): boolean {
  let d2 = 0;
  for (let k = 0; k < 3; k++) {
    const off = centre[k]! - Math.min(boxes[at + 3 + k]!, Math.max(boxes[at + k]!, centre[k]!));
    d2 += off * off;
  }
  return d2 < (radius - TOUCH) * (radius - TOUCH);
}

/**
 * A piece's boxes in a tree, so that only those near a question are asked: each node a box round its two halves, the
 * boxes sorted so a leaf is a run of them. Built once a piece, when first asked.
 */
export class BoxTree {
  readonly boxes: Float32Array;
  /** Box numbers in the tree's order. */
  private readonly order: Uint32Array;
  /** Six figures a node (its bounds), and for each node its two children (-1 at a leaf) and its run of `order`. */
  private readonly bounds: number[] = [];
  private readonly left: number[] = [];
  private readonly right: number[] = [];
  private readonly first: number[] = [];
  private readonly count: number[] = [];

  constructor(boxes: Float32Array) {
    this.boxes = boxes;
    const n = boxes.length / 6;
    this.order = Uint32Array.from({ length: n }, (_, i) => i);
    if (n) this.build(0, n);
  }

  /** The whole piece's bounds in its own frame: least corner, greatest corner; null for a piece of nothing. */
  get extent(): { lo: Vec3; hi: Vec3 } | null {
    if (!this.bounds.length) return null;
    return { lo: [this.bounds[0]!, this.bounds[1]!, this.bounds[2]!], hi: [this.bounds[3]!, this.bounds[4]!, this.bounds[5]!] };
  }

  private build(start: number, end: number): number {
    const { boxes, order } = this;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = start; i < end; i++)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k]!, boxes[6 * order[i]! + k]!);
        hi[k] = Math.max(hi[k]!, boxes[6 * order[i]! + 3 + k]!);
      }
    const node = this.left.length;
    this.bounds.push(...lo, ...hi);
    this.left.push(-1);
    this.right.push(-1);
    this.first.push(start);
    this.count.push(end - start);
    if (end - start <= 4) return node;
    // split across the longest side, at the median of the boxes' middles
    const axis = hi[0]! - lo[0]! >= hi[1]! - lo[1]! && hi[0]! - lo[0]! >= hi[2]! - lo[2]! ? 0 : hi[1]! - lo[1]! >= hi[2]! - lo[2]! ? 1 : 2;
    const middle = (i: number) => boxes[6 * i + axis]! + boxes[6 * i + 3 + axis]!;
    const run = Array.from(order.subarray(start, end)).sort((a, b) => middle(a) - middle(b) || a - b);
    order.set(run, start);
    const mid = (start + end) >> 1;
    this.left[node] = this.build(start, mid);
    this.right[node] = this.build(mid, end);
    return node;
  }

  /** Call `each` with every box whose bounds, grown by `grow`, the segment from `from` by `by` passes through. */
  private along(from: Vec3, by: Vec3, grow: number, each: (box: number) => void): void {
    if (!this.bounds.length) return;
    const stack = [0];
    while (stack.length) {
      const node = stack.pop()!;
      let enter = 0;
      let leave = 1;
      let miss = false;
      for (let k = 0; k < 3 && !miss; k++) {
        const lo = this.bounds[6 * node + k]! - grow;
        const hi = this.bounds[6 * node + 3 + k]! + grow;
        if (Math.abs(by[k]!) < 1e-12) miss = from[k]! < lo || from[k]! > hi;
        else {
          const a = (lo - from[k]!) / by[k]!;
          const b = (hi - from[k]!) / by[k]!;
          enter = Math.max(enter, Math.min(a, b));
          leave = Math.min(leave, Math.max(a, b));
          miss = enter > leave;
        }
      }
      if (miss) continue;
      const left = this.left[node]!;
      if (left < 0) for (let i = 0; i < this.count[node]!; i++) each(this.order[this.first[node]! + i]!);
      else stack.push(left, this.right[node]!);
    }
  }

  /** The first box a sphere meets going from `from` to `to`, both in the piece's frame; one it starts in is not met. */
  sweep(from: Vec3, to: Vec3, radius: number): BoxHit | null {
    const by = sub(to, from);
    let best: BoxHit | null = null;
    this.along(from, by, radius, (box) => {
      const hit = sweepBox(this.boxes, 6 * box, from, by, radius);
      if (hit && (!best || hit.fraction < best.fraction)) best = { ...hit, box };
    });
    return best;
  }

  /** The boxes a sphere standing at `centre` reaches into. */
  touching(centre: Vec3, radius: number): number[] {
    const out: number[] = [];
    this.along(centre, [0, 0, 0], radius, (box) => {
      if (overlaps(this.boxes, 6 * box, centre, radius)) out.push(box);
    });
    return out;
  }

  /** The highest top of a box under (or round) the point `(x, z)` that is no higher than `y`, along the piece's own +Y: null if none. */
  below(x: number, y: number, z: number): number | null {
    let top: number | null = null;
    this.along([x, y, z], [0, -1e6, 0], 0, (box) => {
      const b = this.boxes;
      const at = 6 * box;
      if (x < b[at]! || x > b[at + 3]! || z < b[at + 2]! || z > b[at + 5]! || b[at + 4]! > y) return;
      if (top === null || b[at + 4]! > top) top = b[at + 4]!;
    });
    return top;
  }
}
