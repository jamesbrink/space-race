import { smoothstep } from '../util/math.ts';
/**
 * Which of a flight's fires burn at an instant, how hard, and where each one's nozzles are: the arithmetic of the fire
 * that knows nothing of three.js or of any flight, so that it can be tested (tests/fires.test.mjs). stage.ts hangs the
 * fires by it and exhaust.ts marches them.
 *
 * A fire is one engine: a single round exit (the Redstone's A-7, Block E's RD-0109, the braking engine), or a cluster
 * of chambers on one turbopump (an RD-107: four main chambers and two steering chambers; an RD-108: four and four). A
 * cluster's chambers are found in the model (`exitsOf`): each is a piece of the engine's geometry apart from the others
 * when seen from below, and its exit is that piece's lowest ring. Nothing here is told how many there are or where.
 */

/** One nozzle's exit as the model has it, in the frame the points were given in: its middle (x, z), its plane's height (y) and its radius, metres. */
export interface Exit {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/** How near two points must be, seen from below, to be of one piece, metres: further than the spokes of a lathed bell are apart at its lip, nearer than two bells. */
const NEAR = 0.08;
/** How far above a piece's lowest point its exit's ring is taken from, metres: a model's compression moves a vertex by a few millimetres. */
const RING = 0.015;

/**
 * The exits of the nozzles among `points` (x, y, z in turn, +Y up, the jet along -Y): the points are told apart into
 * pieces by where they lie seen from below (two points within `NEAR` of each other are of one piece), and each piece's
 * exit is the ring of its lowest points: their middle and the furthest of them from it. Largest first.
 */
export function exitsOf(points: ArrayLike<number>): Exit[] {
  const n = Math.floor(points.length / 3);
  if (n === 0) return [];
  // points binned by plan in cells NEAR across, so that each is held against those in its own cell and the eight round it
  const cells = new Map<string, number[]>();
  const key = (cx: number, cz: number) => `${cx},${cz}`;
  for (let i = 0; i < n; i++) {
    const k = key(Math.floor(points[i * 3]! / NEAR), Math.floor(points[i * 3 + 2]! / NEAR));
    const list = cells.get(k);
    if (list) list.push(i);
    else cells.set(k, [i]);
  }
  const up = new Int32Array(n).map((_, i) => i);
  const find = (i: number): number => {
    while (up[i] !== i) i = up[i] = up[up[i]!]!;
    return i;
  };
  for (const [k, list] of cells) {
    const [cx, cz] = k.split(',').map(Number) as [number, number];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const other = cells.get(key(cx + dx, cz + dz));
        if (!other) continue;
        for (const i of list)
          for (const j of other) {
            if (j <= i) continue;
            const a = find(i),
              b = find(j);
            if (a !== b && Math.hypot(points[i * 3]! - points[j * 3]!, points[i * 3 + 2]! - points[j * 3 + 2]!) < NEAR) up[a] = b;
          }
      }
  }
  const index = new Map<number, number>();
  const pieceOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!index.has(r)) index.set(r, index.size);
    pieceOf[i] = index.get(r)!;
  }
  const pieces = index.size;
  const lowest = new Float64Array(pieces).fill(Infinity);
  for (let i = 0; i < n; i++) {
    const p = pieceOf[i]!;
    lowest[p] = Math.min(lowest[p]!, points[i * 3 + 1]!);
  }
  const sum = Array.from({ length: pieces }, () => ({ x: 0, z: 0, k: 0 }));
  for (let i = 0; i < n; i++) {
    const p = pieceOf[i]!;
    if (points[i * 3 + 1]! > lowest[p]! + RING) continue;
    sum[p]!.x += points[i * 3]!;
    sum[p]!.z += points[i * 3 + 2]!;
    sum[p]!.k++;
  }
  const exits: Exit[] = sum.map((s, p) => ({ x: s.x / s.k, y: lowest[p]!, z: s.z / s.k, radius: 0 }));
  for (let i = 0; i < n; i++) {
    const p = pieceOf[i]!;
    if (points[i * 3 + 1]! > lowest[p]! + RING) continue;
    const e = exits[p]!;
    e.radius = Math.max(e.radius, Math.hypot(points[i * 3]! - e.x, points[i * 3 + 2]! - e.z));
  }
  return exits.filter((e) => e.radius > 0).sort((a, b) => b.radius - a.radius);
}

/** An engine's chambers, told apart: the main ones and the steering ones (verniers), each place across the exit (x, z) from the main ones' middle, metres. */
export interface Cluster {
  /** The middle of the main chambers' exits and the plane they lie in, in the frame the exits were given in. */
  centre: { x: number; y: number; z: number };
  /** The radius of the main chambers' exits together (of their summed area), metres: the merged jet's exit radius. */
  radius: number;
  main: [number, number][];
  steering: [number, number][];
  /** One steering chamber's exit radius, metres (their mean), or 0 with none. */
  steeringRadius: number;
  /** Of the whole exit area, the steering chambers' share: what of the thrust they give, since a chamber's exit is sized to its thrust. */
  steeringShare: number;
}

/** A chamber whose exit is under this share of the largest one's radius is a steering chamber. */
const STEERING = 0.6;

/** The exits of one engine (`exitsOf`) as a cluster: the large ones its main chambers, the small ones (under `STEERING` of the largest's radius) its steering chambers. */
export function clusterOf(exits: readonly Exit[]): Cluster | null {
  if (!exits.length) return null;
  const big = Math.max(...exits.map((e) => e.radius));
  const main = exits.filter((e) => e.radius >= STEERING * big);
  const steer = exits.filter((e) => e.radius < STEERING * big);
  const centre = {
    x: main.reduce((s, e) => s + e.x, 0) / main.length,
    y: Math.min(...main.map((e) => e.y)),
    z: main.reduce((s, e) => s + e.z, 0) / main.length,
  };
  const areaMain = main.reduce((s, e) => s + e.radius ** 2, 0);
  const areaSteer = steer.reduce((s, e) => s + e.radius ** 2, 0);
  return {
    centre,
    radius: Math.sqrt(areaMain),
    main: main.map((e) => [e.x - centre.x, e.z - centre.z]),
    steering: steer.map((e) => [e.x - centre.x, e.z - centre.z]),
    steeringRadius: steer.length ? steer.reduce((s, e) => s + e.radius, 0) / steer.length : 0,
    steeringShare: areaSteer / (areaMain + areaSteer),
  };
}

/** How faint a fire is drawn at the very instant it is lit, before it comes up: enough to be lit, too little to be seen to jump. */
const GLIMMER = 0.02;

/**
 * How far a fire is lit at `t`, 0 to 1, between the record's instants `from` (lit) and `to` (cut), counted as the record
 * and the simulator count an event at its own instant: lit at `from`, out at `to`. It comes up over `rise` seconds from
 * a glimmer at the instant it is lit and dies over the `fall` seconds before the cut, each at most half the burn
 * (neither the start nor the tail-off is in a record: the run holds full thrust between).
 */
export function litBetween(t: number, from: number, to: number, rise = 0.5, fall = 0.5): number {
  if (!(t >= from && t < to)) return 0;
  const half = (to - from) / 2;
  const [up, down] = [Math.min(rise, half), Math.min(fall, half)];
  return Math.max(smoothstep(from, from + up, t), GLIMMER) * (1 - smoothstep(to - down, to, t));
}

/**
 * How hard a fire burns at `t`: `main` its main chambers (or its one exit), `steering` its steering chambers, each 0
 * (out) to 1 (rated). It is lit from `from` to `to` as `litBetween` has it (lit at the record's instant of its lighting,
 * out at that of its cut), and between it is at its stage's `throttle` (1 with none). A stage
 * throttled to its steering chambers' share of the thrust or less (`steeringShare`, with a twentieth over for the
 * figures' roughness) runs on those alone, as the RD-108's final stage does: the main chambers are out and the steering
 * ones burn at what is asked of them. Above it every chamber is throttled together, as an intermediate stage is.
 */
export function fireLevel(t: number, from: number, to: number, throttle = 1, steeringShare = 0): { main: number; steering: number } {
  const on = litBetween(t, from, to);
  if (on <= 0) return { main: 0, steering: 0 };
  if (steeringShare > 0 && throttle <= steeringShare * 1.05) return { main: 0, steering: on * Math.min(throttle / steeringShare, 1) };
  return { main: on * throttle, steering: steeringShare > 0 ? on * throttle : 0 };
}

/**
 * The jet's edge `x` exit radii aft, in exit radii, in the air `shape` gives (plume.ts `plumeShape`): the free jet swells to its
 * width as the air lets it, and where there is air the mixing layer spreads slowly outward. The march's own (exhaust.ts
 * `edge`), here for what is worked out before it: how far a jet can reach, and where a cluster's chambers merge.
 */
export function jetEdge(shape: { width: number; air: number }, x: number): number {
  const w = shape.width;
  return 1 + (w - 1) * (1 - Math.exp(-Math.max(x, 0) / (1.5 * w))) + 0.085 * Math.max(x, 0) * shape.air;
}

/**
 * Where a jet's chambers, once their own jets have each widened to touch the next, have merged into one: from `start`
 * to `end`, in a main chamber's exit radii aft of the exit. `edge` is the jet's edge x exit radii aft, in exit radii
 * (exhaust.ts: the same function the march has); `gap` the nearest two main chambers' axes apart over one's exit radius.
 */
export function mergeOf(edge: (x: number) => number, gap: number): { start: number; end: number } {
  let lo = 0,
    hi = 400;
  if (edge(hi) < gap / 2) return { start: hi, end: hi * 3 };
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (edge(mid) < gap / 2) lo = mid;
    else hi = mid;
  }
  return { start: 0.7 * hi, end: 3 * hi + 1 };
}

/**
 * How hard an engine works at an instant, 0 (out) to 1 (rated), from how its fire burns (`fireLevel`): its main chambers
 * at `main` give all but `steeringShare` of its thrust, its steering chambers at `steering` the rest. Run on its steering
 * chambers alone it works at their share of what they are asked. What a jet that blows while an engine runs (a turbine's
 * exhaust, jets.ts) blows by: the gas generator's flow goes as the pumps' work, which goes as the thrust (estimated).
 */
export function engineWork(level: { main: number; steering: number }, steeringShare = 0): number {
  return Math.min(Math.max(level.main * (1 - steeringShare) + level.steering * steeringShare, 0), 1);
}

/**
 * How hard a shed body's motor pushes at `t`, 0 to 1 of its thrust, as the simulator flies it (sim/shed.ts): from `at`,
 * the instant the body left, steady for `burn` seconds, then falling evenly to nothing over `tail` (what is left of its
 * impulse). With no tail the simulator stops it at once, and it is drawn as an engine's fire is (`litBetween`: lit at
 * `at`, out at `at + burn`), coming up over a fifth of a second.
 */
export function shedLevel(t: number, at: number, burn: number, tail = 0): number {
  if (tail <= 0) return litBetween(t, at, at + burn, 0.2);
  const since = t - at;
  if (since < 0) return 0;
  const on = Math.max(smoothstep(0, 0.2, since), GLIMMER);
  return since < burn ? on : on * Math.max(0, 1 - (since - burn) / tail);
}

/**
 * A gas jet's length, in its mouth's radii: `reach` metres times the root of its `thrust` in newtons, as the attitude jets'
 * length goes (jets.ts `jetLength`), over its mouth's `radius`, and at least a dozen radii. What `reach` each gas has is
 * estimated (flames.ts `GASES`).
 */
export function gasLength(thrust: number, radius: number, reach: number): number {
  return Math.max((reach * Math.sqrt(Math.max(thrust, 0))) / Math.max(radius, 1e-3), 12);
}

/**
 * A gas jet's edge `x` mouth radii out, in mouth radii, the march's own (exhaust.ts `gasEdge`): it swells to `width` as
 * the air lets it, as a fire's free jet does (`jetEdge`), and spreads as it mixes, faster where there is `air` to mix with.
 */
export function gasEdge(x: number, width: number, air: number): number {
  const at = Math.max(x, 0);
  return 1 + (width - 1) * (1 - Math.exp(-at / (1.5 * width))) + (0.05 + 0.1 * air) * at;
}
