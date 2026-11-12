/**
 * Which plants are handed to the GPU, and in which form: the part of flora.ts that is only
 * arithmetic, kept apart so it can be tested without a renderer (tests/plantsort.test.mjs).
 *
 * What is seen is decided in the shader, from each plant's true distance to the eye as the frame
 * is drawn (flora.ts: PLANT_SWAY): its near form inside `near`, its far form from `near - HAND`
 * to where it ends. This file only chooses which plants are worth sending: every plant that could
 * come into a form's band before the lists are next made, which is every plant within `margin` of
 * that band at the eye the lists are made for, if they are made again before the eye has gone
 * `margin` from there (`due`). So the margin changes how often the lists are made and how many
 * unseen plants ride in them, and never what is drawn.
 *
 * A tile's plants are packed once, in batches that share a species, a variant and whether they
 * stand in a thicket, so a batch has one band for each form. A batch whose box lies wholly inside
 * a band's margin is copied in one block; one wholly outside is passed over; only a batch the
 * edge crosses is gone through plant by plant.
 */

/** What the sorting needs of a species: its near form's distance and how far it is drawn, metres. */
export interface Kind {
  near: number;
  reach: number;
}

/** The near form gives way to the far over this many metres short of `near`: a short crossing, so few plants are half drawn at once. */
export const HAND = 3;
/** Where a plant in a thicket is gone, metres from the eye: under the land's canopy by then. */
export const UNDER: readonly [number, number] = [52, 60];

/** A plant as it is placed: where it stands, and what the GPU is given for it. */
export interface Placed {
  species: number;
  variant: number;
  /** Standing in a thicket: it gives way to the land's canopy. */
  thicket: boolean;
  x: number;
  y: number;
  z: number;
  /** Its instance matrix, sixteen numbers. */
  matrix: ArrayLike<number>;
  colour: readonly [number, number, number];
}

/** The plants of one tile that share a species, a variant and thicket or not, packed. */
export interface Batch {
  species: number;
  variant: number;
  thicket: boolean;
  count: number;
  /** Sixteen a plant, three a plant: as the instance attributes take them. */
  matrices: Float32Array;
  colours: Float32Array;
  /** Where each stands (x, y, z), in doubles. */
  places: Float64Array;
  /** The box round them: least x, y, z, then most. */
  box: Float64Array;
}

export type Tile = Batch[];

/** One form of one variant of a species: the arrays its instanced mesh draws from, and how many are filled. */
export interface List {
  matrices: Float32Array;
  colours: Float32Array;
  /** Four a plant: fade in from, to; out from, to (flora.ts: aBand). */
  bands: Float32Array;
  count: number;
  capacity: number;
}

/** A species' lists: near and far forms, one of each per variant. */
export interface Lists {
  near: List[];
  far: List[];
}

/** Pack a tile's plants into batches. */
export function pack(plants: readonly Placed[]): Tile {
  const groups = new Map<number, Placed[]>();
  for (const p of plants) {
    const key = (p.species * 64 + p.variant) * 2 + (p.thicket ? 1 : 0);
    const group = groups.get(key);
    if (group) group.push(p);
    else groups.set(key, [p]);
  }
  const tile: Tile = [];
  for (const group of groups.values()) {
    const first = group[0]!;
    const n = group.length;
    const batch: Batch = {
      species: first.species,
      variant: first.variant,
      thicket: first.thicket,
      count: n,
      matrices: new Float32Array(n * 16),
      colours: new Float32Array(n * 3),
      places: new Float64Array(n * 3),
      box: new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]),
    };
    const box = batch.box;
    group.forEach((p, k) => {
      batch.matrices.set(p.matrix, k * 16);
      batch.colours.set(p.colour, k * 3);
      batch.places[k * 3] = p.x;
      batch.places[k * 3 + 1] = p.y;
      batch.places[k * 3 + 2] = p.z;
      box[0] = Math.min(box[0]!, p.x);
      box[1] = Math.min(box[1]!, p.y);
      box[2] = Math.min(box[2]!, p.z);
      box[3] = Math.max(box[3]!, p.x);
      box[4] = Math.max(box[4]!, p.y);
      box[5] = Math.max(box[5]!, p.z);
    });
    tile.push(batch);
  }
  return tile;
}

/** Whether lists made for the eye at (sx, sy, sz) with `margin` must be made again for the eye at (ex, ey, ez). */
export function due(ex: number, ey: number, ez: number, sx: number, sy: number, sz: number, margin: number): boolean {
  const dx = ex - sx,
    dy = ey - sy,
    dz = ez - sz;
  return !(dx * dx + dy * dy + dz * dz < margin * margin);
}

/** Put `count` plants of a batch, from its `first`, at the end of a list (as many as it has room for), with one band. */
function append(list: List, batch: Batch, first: number, count: number, b0: number, b1: number, b2: number, b3: number): void {
  const n = Math.min(count, list.capacity - list.count);
  if (n <= 0) return;
  const at = list.count;
  if (first === 0 && n === batch.count) {
    list.matrices.set(batch.matrices, at * 16);
    list.colours.set(batch.colours, at * 3);
  } else {
    list.matrices.set(batch.matrices.subarray(first * 16, (first + n) * 16), at * 16);
    list.colours.set(batch.colours.subarray(first * 3, (first + n) * 3), at * 3);
  }
  const bands = list.bands;
  for (let k = at * 4, end = (at + n) * 4; k < end; k += 4) {
    bands[k] = b0;
    bands[k + 1] = b1;
    bands[k + 2] = b2;
    bands[k + 3] = b3;
  }
  list.count = at + n;
}

/**
 * Add a tile's plants to the lists (by species) for an eye: each into every form's list whose
 * band it is within `margin` of. The lists' counts are carried on from where they stand.
 */
export function sort(
  tile: Tile,
  ex: number,
  ey: number,
  ez: number,
  margin: number,
  kinds: readonly Kind[],
  lists: readonly Lists[],
): void {
  for (const batch of tile) {
    const kind = kinds[batch.species]!;
    const hand = kind.near - HAND;
    // where the far form starts to go and where it is gone: into the canopy if it stands in a thicket, at its reach if alone
    const end0 = batch.thicket ? UNDER[0] : kind.reach * 0.9,
      end1 = batch.thicket ? UNDER[1] : kind.reach;
    // the near form: closer than `inside`; the far form: further than `from` and closer than `to`
    const inside = kind.near + margin;
    const from = hand - margin;
    const to = end1 + margin;
    const inside2 = inside * inside,
      from2 = from > 0 ? from * from : -1,
      to2 = to * to;
    // the nearest and furthest the box comes to the eye, squared: every plant in it lies between
    const box = batch.box;
    const nx = Math.max(box[0]! - ex, 0, ex - box[3]!),
      ny = Math.max(box[1]! - ey, 0, ey - box[4]!),
      nz = Math.max(box[2]! - ez, 0, ez - box[5]!);
    const fx = Math.max(ex - box[0]!, box[3]! - ex),
      fy = Math.max(ey - box[1]!, box[4]! - ey),
      fz = Math.max(ez - box[2]!, box[5]! - ez);
    const least = nx * nx + ny * ny + nz * nz,
      most = fx * fx + fy * fy + fz * fz;
    const near = lists[batch.species]!.near[batch.variant]!;
    const far = lists[batch.species]!.far[batch.variant]!;
    const nearAll = most < inside2,
      nearNone = least >= inside2;
    const farAll = least > from2 && most < to2,
      farNone = most <= from2 || least >= to2;
    if (nearAll) append(near, batch, 0, batch.count, -1, 0, hand, kind.near);
    if (farAll) append(far, batch, 0, batch.count, hand, kind.near, -end0, -end1);
    if ((nearAll || nearNone) && (farAll || farNone)) continue;
    // the edge of a band crosses the box: plant by plant, in runs so that neighbours are still copied together
    const places = batch.places;
    let nearRun = -1,
      farRun = -1;
    for (let k = 0; k < batch.count; k++) {
      const dx = places[k * 3]! - ex,
        dy = places[k * 3 + 1]! - ey,
        dz = places[k * 3 + 2]! - ez;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (!nearAll && !nearNone) {
        if (d2 < inside2) {
          if (nearRun < 0) nearRun = k;
        } else if (nearRun >= 0) {
          append(near, batch, nearRun, k - nearRun, -1, 0, hand, kind.near);
          nearRun = -1;
        }
      }
      if (!farAll && !farNone) {
        if (d2 > from2 && d2 < to2) {
          if (farRun < 0) farRun = k;
        } else if (farRun >= 0) {
          append(far, batch, farRun, k - farRun, hand, kind.near, -end0, -end1);
          farRun = -1;
        }
      }
    }
    if (nearRun >= 0) append(near, batch, nearRun, batch.count - nearRun, -1, 0, hand, kind.near);
    if (farRun >= 0) append(far, batch, farRun, batch.count - farRun, hand, kind.near, -end0, -end1);
  }
}
