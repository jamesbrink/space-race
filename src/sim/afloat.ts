/**
 * A body afloat: a hull of revolution standing upright in the sea, rising and falling on the day's waves (sim/sea.ts),
 * taking in water through its openings into the spaces inside it, hoisted by a line from above, and going down once it
 * weighs more than the sea it puts aside. Nothing here knows any spacecraft: the hull, its spaces, its openings and what
 * leaves it are the flight's data (types.ts `AfloatDef`), and when each opening opens, each thing leaves and the line
 * comes taut and is let go are the caller's.
 *
 * The physics, each piece stated:
 *   - Up and down (heave) and, where the body says how (`AfloatDef.heel`), heeling in one vertical plane, the one through
 *     its +X (a hatch's side): it turns about the centre of mass of what stays aboard, which goes neither across the sea
 *     nor round. Without `heel` it is held upright. The sea's surface where it floats is the day's waves at its place, a
 *     plane across it (long waves on a small body) at the surface's height and tipped by its slope in that plane: the
 *     water's apparent level, to which the sea outside and the water inside both stand (`slant`, the heel against it).
 *   - What holds it up is the sea's weight in the volume of its outside under the surface (Archimedes), acting up through
 *     that volume's centre; what pulls it down is its own weight, at its centre of mass and at each part's place while it
 *     is aboard, and that of every drop of water in its spaces, at the water's centre. So water in a space below the sea
 *     outside costs nothing, and above it is dead weight; air trapped in a space is buoyancy; and water standing level
 *     in a heeled space runs to its low side, which is how a part-flooded body loses its stiffness against heeling.
 *   - The water in a space stands level at once (no sloshing), and what is in it turns about nothing: it is a weight at its
 *     centre, not part of what is turned. The coupling of heave and heel through masses off the centre is left out.
 *   - Water goes through an opening as through a sharp orifice (Torricelli): each thin band of the opening passes
 *     Cd w dy root(2 dp / rho), dp the difference of the pressures either side of that band, the sea's outside (its
 *     depth under the surface) and the space's inside (its depth under the water in it, over the air's).
 *   - Air in a space leaves (or comes in) through any opening that is not wholly under both the sea outside and the water
 *     inside, so it is at the air's pressure; under both, it is trapped, and squeezed as the water rises (Boyle, at the
 *     sea's temperature).
 *   - Its rising and falling is damped by a share of the critical damping of its own spring on the sea, and its heeling by
 *     a share of the critical damping of its stiffness upright as it first floats (both estimated: the waves it makes,
 *     which are not worked out), and its motion through the water by its drag.
 *   - A line from above pulls up at its top once taut: toward holding the body clear of the sea at the rate it is taken
 *     up, never more than what pulls it can give (`HoistDef`).
 * One step of STEP seconds by the fourth-order Runge-Kutta (core/rk4.ts `rk4n`), every step ending on the next instant
 * given, so one set of instants gives one run to the last bit.
 */
import type { AfloatDef, HoistDef, OpeningDef, Profile, SpaceDef } from '../types.ts';
import { G0, P0 } from '../world/bodies.ts';
import { rk4n } from './core/rk4.ts';
import { surfaceAt, tiltAt, type Wave } from './sea.ts';

/**
 * The sea's density, kg/m^3: the surface ocean's at 35 parts per thousand of salt and 27 C, the Bahamas' water in July, by
 * UNESCO's equation of state for seawater (1981): derived. Tables' round 1025 is colder water's.
 */
export const SEA_WATER = 1023;
/** Seconds a step, and how often a state is kept for showing. */
export const STEP = 0.05;
export const KEEP = 0.1;
/** Bands each opening is cut into for its flow. */
const BANDS = 12;
/** A space within this of full or empty, m^3, takes no more in or out. */
const SNUG = 1e-9;

/** A solid of revolution's volume and section by height, and the height a volume fills it to. */
export class Solid {
  /** Its volume up to each of its profile's heights, m^3. */
  private readonly upTo: number[];
  readonly bottom: number;
  readonly top: number;
  readonly profile: Profile;
  readonly share: number;
  constructor(profile: Profile, share = 1) {
    this.profile = profile;
    this.share = share;
    if (profile.length < 2) throw new Error('a profile needs two heights at least');
    this.bottom = profile[0]![0];
    this.top = profile[profile.length - 1]![0];
    this.upTo = [0];
    for (let i = 1; i < profile.length; i++) this.upTo.push(this.upTo[i - 1]! + this.frustum(i, profile[i]![0]));
  }

  /** Its radius at height `z`, m (nothing outside it). */
  radius(z: number): number {
    const p = this.profile;
    if (z < this.bottom || z > this.top) return 0;
    let i = 1;
    while (i < p.length - 1 && p[i]![0] < z) i++;
    const [z0, r0] = p[i - 1]!;
    const [z1, r1] = p[i]!;
    return z1 > z0 ? r0 + ((r1 - r0) * (z - z0)) / (z1 - z0) : r1;
  }

  /** The area of its section at height `z` that water can take, m^2. */
  area(z: number): number {
    return this.share * Math.PI * this.radius(z) ** 2;
  }

  /** The volume between segment i's lower height and `z` within it, m^3 (all of it, where water can take only its share). */
  private frustum(i: number, z: number): number {
    const [z0, r0] = this.profile[i - 1]!;
    const r = this.radius(Math.max(z0, z));
    return (Math.PI * Math.max(0, z - z0) * (r0 * r0 + r0 * r + r * r)) / 3;
  }

  /** The volume water can take in it up to height `z`, m^3. */
  volume(z: number): number {
    if (z <= this.bottom) return 0;
    const p = this.profile;
    const at = Math.min(z, this.top);
    let i = 1;
    while (i < p.length - 1 && p[i]![0] < at) i++;
    return this.share * (this.upTo[i - 1]! + this.frustum(i, at));
  }

  /** All the water it can take, m^3. */
  get whole(): number {
    return this.share * this.upTo[this.upTo.length - 1]!;
  }

  /** The height `v` m^3 of water fills it to: its segment found by halving, then Newton's method on the frustum's cubic. */
  height(v: number): number {
    if (v <= 0) return this.bottom;
    if (v >= this.whole) return this.top;
    const want = v / this.share;
    const up = this.upTo;
    let lo = 0;
    let hi = up.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (up[mid]! < want) lo = mid;
      else hi = mid;
    }
    const z0 = this.profile[lo]![0];
    const z1 = this.profile[hi]![0];
    const need = want - up[lo]!;
    let z = z0 + ((z1 - z0) * need) / Math.max(1e-30, up[hi]! - up[lo]!);
    for (let k = 0; k < 8; k++) {
      const area = Math.PI * this.radius(z) ** 2;
      if (area < 1e-12) break;
      const next = Math.min(z1, Math.max(z0, z - (this.frustum(hi, z) - need) / area));
      if (Math.abs(next - z) < 1e-12) return next;
      z = next;
    }
    if (Math.abs(this.frustum(hi, z) - need) < 1e-12 * Math.max(1, need)) return z;
    // (where Newton's method does not settle, at a point with no section: halving)
    let [a, b] = [z0, z1];
    for (let k = 0; k < 60; k++) {
      const mid = (a + b) / 2;
      if (this.frustum(hi, mid) < need) a = mid;
      else b = mid;
    }
    return (a + b) / 2;
  }
}

/** Degrees between the rows a heeled solid is worked at, and the most it is followed to heel. */
const ROW = 1;
const MOST = 80;
/** Thin slices a heeled solid is cut into across its axis, and the levels each of its rows is worked at. */
const SLICES = 160;
const LEVELS = 200;
/** Columns an opening round the body is cut into across its arc, for one all round and for one on a side. */
const ROUND = 8;
const SIDE = 5;

/** What of a solid lies under a level plane: its volume, m^3, and its first moments, m^4, out along +X and up its axis. */
export interface Under {
  volume: number;
  out: number;
  up: number;
}

/**
 * A solid of revolution heeled: what of it lies under a level plane, by the heel (radians, its +X side going down) and
 * the plane's height over the solid's lowest point on its axis (m, along the plane's normal), and the plane a volume of
 * water stands at in it. Cut into thin slices across its axis, each a disc whose part under the plane is a circle's
 * segment (its area r^2 acos(c / r) - c root(r^2 - c^2) and its moment 2/3 (r^2 - c^2)^(3/2), past a chord c from the
 * axis), summed at each of a row's levels, a row for each degree of heel, worked out as it is first needed. Between
 * rows and levels it is read straight. Upright its volume is the solid's own (`Solid`), exactly.
 */
export class Heeled {
  readonly solid: Solid;
  private readonly rows: { lo: number; hi: number; volume: Float64Array; out: Float64Array; up: Float64Array }[] = [];
  private readonly h: Float64Array;
  private readonly r: Float64Array;
  private readonly dh: number;
  constructor(solid: Solid) {
    this.solid = solid;
    this.dh = (solid.top - solid.bottom) / SLICES;
    this.h = new Float64Array(SLICES);
    this.r = new Float64Array(SLICES);
    for (let i = 0; i < SLICES; i++) {
      this.h[i] = solid.bottom + (i + 0.5) * this.dh;
      this.r[i] = solid.radius(this.h[i]!);
    }
  }

  /** The lowest and highest the solid reaches heeled `phi` radians, over its lowest point on its axis. */
  span(phi: number): [number, number] {
    const [c, s] = [Math.cos(phi), Math.abs(Math.sin(phi))];
    let [lo, hi] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    for (const [z, r] of this.solid.profile) {
      lo = Math.min(lo, z * c - r * s);
      hi = Math.max(hi, z * c + r * s);
    }
    return [lo, hi];
  }

  /** Row `i`: the solid heeled `i` degrees (ROW apart), at LEVELS + 1 levels from its lowest point to its highest. */
  private row(i: number) {
    const had = this.rows[i];
    if (had) return had;
    const phi = (i * ROW * Math.PI) / 180;
    const [c, s] = [Math.cos(phi), Math.sin(phi)];
    const [lo, hi] = this.span(phi);
    const volume = new Float64Array(LEVELS + 1);
    const out = new Float64Array(LEVELS + 1);
    const up = new Float64Array(LEVELS + 1);
    const share = this.solid.share;
    const step = (hi - lo) / LEVELS;
    // (each slice: wholly under every level past its highest point, a segment of it at the levels that cut it; the
    // whole slices counted once where they begin and summed up the levels after)
    const whole = new Float64Array(LEVELS + 2);
    const wholeUp = new Float64Array(LEVELS + 2);
    for (let k = 0; k < SLICES; k++) {
      const [z, r] = [this.h[k]!, this.r[k]!];
      if (r <= 0) continue;
      const disc = Math.PI * r * r;
      const [bottom, top] = s < 1e-12 ? [z - this.dh / 2, z + this.dh / 2] : [z * c - r * s, z * c + r * s];
      const first = Math.max(0, Math.floor((bottom - lo) / step));
      const full = Math.min(LEVELS + 1, Math.max(0, Math.ceil((top - lo) / step)));
      whole[full] = whole[full]! + disc;
      wholeUp[full] = wholeUp[full]! + disc * z;
      for (let j = first; j < full && j <= LEVELS; j++) {
        const level = lo + step * j;
        let area: number;
        let moment = 0;
        if (s < 1e-12) {
          // (upright: the share of the slice under the plane)
          area = Math.min(1, Math.max(0, (level - bottom) / this.dh)) * disc;
        } else {
          const chord = (z * c - level) / s;
          if (chord >= r) continue;
          if (chord <= -r) area = disc;
          else {
            const across = r * r - chord * chord;
            area = r * r * Math.acos(chord / r) - chord * Math.sqrt(across);
            moment = (2 / 3) * across * Math.sqrt(across);
          }
        }
        volume[j] = volume[j]! + area;
        out[j] = out[j]! + moment;
        up[j] = up[j]! + area * z;
      }
    }
    let [sum, sumUp] = [0, 0];
    for (let j = 0; j <= LEVELS; j++) {
      sum += whole[j]!;
      sumUp += wholeUp[j]!;
      volume[j] = share * (volume[j]! + sum) * this.dh;
      out[j] = share * out[j]! * this.dh;
      up[j] = share * (up[j]! + sumUp) * this.dh;
    }
    const made = { lo, hi, volume, out, up };
    this.rows[i] = made;
    return made;
  }

  /** What of row `i` is under the plane at `level`, read straight between its levels. */
  private read(i: number, level: number): Under {
    const row = this.row(i);
    const u = ((level - row.lo) / (row.hi - row.lo)) * LEVELS;
    if (u <= 0) return { volume: 0, out: 0, up: 0 };
    if (u >= LEVELS) return { volume: row.volume[LEVELS]!, out: row.out[LEVELS]!, up: row.up[LEVELS]! };
    const j = Math.floor(u);
    const k = u - j;
    const mix = (a: Float64Array) => a[j]! + (a[j + 1]! - a[j]!) * k;
    return { volume: mix(row.volume), out: mix(row.out), up: mix(row.up) };
  }

  /** What is under a level plane `level` m over its lowest point on its axis, heeled `heel` radians. */
  under(heel: number, level: number): Under {
    if (heel === 0) return { ...this.read(0, level), volume: this.solid.volume(level) };
    const a = Math.min(MOST, (Math.abs(heel) * 180) / Math.PI) / ROW;
    const i = Math.min(Math.floor(a), MOST / ROW - 1);
    const k = a - i;
    const [p, q] = [this.read(i, level), this.read(i + 1, level)];
    const v0 = i === 0 ? this.solid.volume(level) : p.volume;
    return { volume: v0 + (q.volume - v0) * k, out: (p.out + (q.out - p.out) * k) * Math.sign(heel), up: p.up + (q.up - p.up) * k };
  }

  /** The level in row `i` that `volume` stands at: its volumes rise with the level, so found by halving, then read straight. */
  private levelIn(i: number, volume: number): number {
    const row = this.row(i);
    const v = row.volume;
    if (volume <= v[0]!) return row.lo;
    if (volume >= v[LEVELS]!) return row.hi;
    let [a, b] = [0, LEVELS];
    while (b - a > 1) {
      const mid = (a + b) >> 1;
      if (v[mid]! < volume) a = mid;
      else b = mid;
    }
    const k = (volume - v[a]!) / Math.max(1e-30, v[b]! - v[a]!);
    return row.lo + ((row.hi - row.lo) * (a + k)) / LEVELS;
  }

  /**
   * The level, m over its lowest point on its axis, that `volume` m^3 of water stands at in it heeled `heel` radians:
   * each row's either side, read straight between them (upright, the solid's own).
   */
  level(heel: number, volume: number): number {
    if (heel === 0) return this.solid.height(volume);
    if (volume <= 0) return this.span(heel)[0];
    if (volume >= this.solid.whole) return this.span(heel)[1];
    const a = Math.min(MOST, (Math.abs(heel) * 180) / Math.PI) / ROW;
    const i = Math.min(Math.floor(a), MOST / ROW - 1);
    const k = a - i;
    const p = i === 0 ? this.solid.height(volume) : this.levelIn(i, volume);
    return p + (this.levelIn(i + 1, volume) - p) * k;
  }
}

/** One heeled solid for each profile and share, kept: rows already worked are not worked again for the next run. */
const heeledOf = new WeakMap<Profile, Map<number, Heeled>>();
function heeled(profile: Profile, share = 1): Heeled {
  let byShare = heeledOf.get(profile);
  if (!byShare) {
    byShare = new Map();
    heeledOf.set(profile, byShare);
  }
  let h = byShare.get(share);
  if (!h) {
    h = new Heeled(new Solid(profile, share));
    byShare.set(share, h);
  }
  return h;
}

/** When each thing given happens, s from liftoff: an opening opened (by its id), a part left (by its id), the line taut and let go. */
export interface AfloatEvents {
  opened?: Record<string, number>;
  left?: Record<string, number>;
  hoist?: { def: HoistDef; taut: number; cast: number };
  /** The bearing its +X faces, degrees true: the plane it heels in, whose slope of the sea tips it. */
  facing?: number;
}

/** The body afloat at one instant. */
export interface AfloatSample {
  t: number;
  /** Its lowest point's height over still water (on its long axis, heeled), m, and how fast its centre rises, m/s. */
  z: number;
  w: number;
  /** The sea's surface where it floats, m over still water. */
  surface: number;
  /** The water in each of its spaces, m^3, in their order. */
  water: number[];
  /** What the line pulls with, N. */
  tension: number;
  /** What it weighs with its water, kg. */
  mass: number;
  /** Its heel, radians, its +X side down; and its heel against the sea's apparent level there (the water's, outside and in). */
  heel: number;
  slant: number;
  /** Where the water stands in each space, m over the hull's lowest point on its axis, along that level's normal (at `slant`). */
  levels: number[];
}

/** A run afloat. */
export interface Afloat {
  from: number;
  samples: AfloatSample[];
  /** When its top first went under the surface (Infinity: never), and when it was `sight` m under it (out of sight), or the end of the run. */
  under: number;
  end: number;
  /** Its top's height over the still sea's datum it was drawn from, m: the hull's height from its lowest point to its top. */
  top: number;
  /** The most it weighed with the sea in it (its spaces that do not drain as it is lifted), kg. */
  flooded: number;
  /** The most the line pulled with, N, and the highest its lowest point came over the surface while hoisted, m (negative: never out). */
  held: number;
  rose: number;
  /** Where the water was in each space at the end, m^3, and each one's whole. */
  wholes: number[];
  /** The most it heeled before its top went under, radians (its +X side down), and when. */
  heeled: number;
  heeledAt: number;
}

interface Space {
  def: SpaceDef;
  solid: Solid;
  heeled: Heeled;
  /** Each opening's bands: their height up the body and width, and for each column across its arc how far out along +X it is and its share. */
  bands: { y: number; width: number; columns: { out: number; share: number }[] }[][];
}

/** An opening cut into bands up its height and columns across its arc, on a hull of radius `radius` at each height. */
function bandsOf(o: OpeningDef, radius: (z: number) => number): Space['bands'][number] {
  const dy = (o.to - o.from) / BANDS;
  const arc = o.arc;
  const n = arc === undefined ? 1 : arc >= 360 ? ROUND : SIDE;
  return Array.from({ length: BANDS }, (_, b) => {
    const y = o.from + (b + 0.5) * dy;
    const width = (o.width[0] + ((o.width[1] - o.width[0]) * (y - o.from)) / (o.to - o.from)) * dy;
    const columns = Array.from({ length: n }, (_, c) => {
      const round = arc === undefined ? 0 : (((c + 0.5) / n - 0.5) * arc * Math.PI) / 180;
      return { out: arc === undefined ? 0 : radius(y) * Math.cos(round), share: 1 / n };
    });
    return { y, width, columns };
  });
}

/** The space's water, m^3, that a still sea at height `s` over the hull's lowest point fills it to through an opening always open. */
const filledTo = (space: Space, s: number): number => space.solid.volume(s);

/**
 * Float `def` from `from` (s from liftoff) to `until`, on `waves` (sim/sea.ts, their instant counted from `from`), with
 * what happens when given in `events`. It starts at rest where it floats, upright, with its always-open spaces filled to
 * the sea outside and the rest empty. It ends `sight` m under the surface, or at `until`.
 */
export function floatOn(
  def: AfloatDef,
  waves: readonly Wave[],
  from: number,
  until: number,
  events: AfloatEvents = {},
  sight = 30,
): Afloat {
  const rho = SEA_WATER;
  const hull = heeled(def.hull.profile);
  const top = hull.solid.top;
  const rim = hull.solid.radius(top);
  const spaces: Space[] = def.spaces.map((s) => {
    const h = heeled(s.shape, s.free.value);
    return { def: s, solid: h.solid, heeled: h, bands: s.openings.map((o) => bandsOf(o, (z) => hull.solid.radius(z))) };
  });
  const n = spaces.length;
  const opened = events.opened ?? {};
  const left = events.left ?? {};
  const hoist = events.hoist;
  const facing = events.facing ?? 0;
  const heel = def.heel;
  // (the centre it turns about, of what stays aboard: up from the lowest point and out toward +X; held upright, the lowest point)
  const [hG, xG] = heel ? [heel.centre.up.value, heel.centre.out.value] : [0, 0];
  const core = def.mass.value - def.leaves.reduce((sum, l) => sum + l.mass.value, 0);
  const isOpen = (o: SpaceDef['openings'][number], t: number) => !o.shut || t >= (opened[o.id] ?? Infinity);
  const aboard = (t: number) => def.leaves.filter((l) => t < (left[l.id] ?? Infinity));
  /** Where a part aboard is at `t`: at its place, or on its way straight to where it goes out over the seconds before it leaves. */
  const placeOf = (l: AfloatDef['leaves'][number], t: number): { x: number; h: number } | null => {
    if (!l.at) return null;
    const [x, h] = [l.at.out.value, l.at.up.value];
    const by = l.through;
    const leaves = left[l.id] ?? Infinity;
    if (!by || t <= leaves - by.over.value) return { x, h };
    const k = Math.min(1, (t - (leaves - by.over.value)) / by.over.value);
    return { x: x + (by.out.value - x) * k, h: h + (by.up.value - h) * k };
  };
  const dryAt = (t: number) => core + aboard(t).reduce((sum, l) => sum + l.mass.value, 0);
  const sea = (t: number) => surfaceAt(waves, t - from);
  // (the sea's apparent level there, against the plumb line, in its plane of heel: a slope rising toward +X tips it +X up)
  const tipOf = (t: number) => {
    if (!heel) return { angle: 0, rate: 0 };
    const { slope, rate } = tiltAt(waves, t - from, facing);
    return { angle: -Math.atan(slope), rate: -rate / (1 + slope * slope) };
  };

  // where it floats to begin with, upright: the draft at which the sea it puts aside, less what its open spaces take in, is its weight
  const open0 = spaces.map((s) => s.def.openings.some((o) => !o.shut));
  const lifted = (d: number) => rho * (hull.solid.volume(d) - spaces.reduce((sum, s, i) => sum + (open0[i] ? filledTo(s, d) : 0), 0));
  let [lo, hi] = [hull.solid.bottom, top];
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (lifted(mid) < dryAt(from)) lo = mid;
    else hi = mid;
  }
  const draft = (lo + hi) / 2;
  const s0 = sea(from);
  // the state: [its centre's height, its rate, its heel, its rate, water..., air...]; the air in each space as its volume at the air's pressure
  const water0 = spaces.map((s, i) => (open0[i] ? filledTo(s, draft) : 0));
  let state = [s0.height - draft + hG, 0, 0, 0, ...water0, ...spaces.map((s, i) => s.solid.whole - water0[i]!)];
  const W = 4; // (where the water begins in the state)
  let taut: number | null = null; // its top's height over still water as the line came taut

  /** Its lowest point's height on its axis over still water, from its centre's and its heel. */
  const lowest = (q: readonly number[]) => q[0]! - (hG * Math.cos(q[2]!) - xG * Math.sin(q[2]!));
  /** Its top's height on its axis, and its top's highest point (the rim's, heeled), over still water. */
  const crown = (q: readonly number[]) => lowest(q) + top * Math.cos(q[2]!);
  const topOf = (q: readonly number[]) => crown(q) + rim * Math.abs(Math.sin(q[2]!));
  const levels = (q: readonly number[], slant: number) => spaces.map((s, i) => s.heeled.level(slant, q[W + i]!));
  /** A column of a band's height over the lowest point, along the apparent level's normal. */
  const heightOf = (y: number, out: number, slant: number) => (slant === 0 ? y : y * Math.cos(slant) - out * Math.sin(slant));
  /**
   * Whether a space's air can get out (or in): some opening open and not wholly under both the sea and its water, or
   * reaching the space's top (the last of its air goes out there, however deep it is).
   */
  const vented = (i: number, t: number, s: number, level: number, slant: number) =>
    spaces[i]!.def.openings.some((o, j) => {
      if (!isOpen(o, t)) return false;
      if (o.to >= spaces[i]!.solid.top - SNUG) return true;
      const head = spaces[i]!.bands[j]![BANDS - 1]!;
      return head.columns.some((c) => {
        const z = heightOf(o.to, c.out, slant);
        return z > s || z > level;
      });
    });

  /**
   * The water a space whose air is trapped holds, m^3, `air` m^3 of it at the air's pressure, with the sea at `s` over the
   * hull's lowest point: where the air, squeezed (Boyle), presses as hard as the sea does at the water's surface inside.
   * Its openings are wide and wholly under, so it gets there within a step: taken at once.
   */
  const settle = (space: Space, air: number, s: number, slant: number): number => {
    const excess = (water: number) =>
      P0 * (air / Math.max(1e-12, space.solid.whole - water) - 1) - rho * G0 * (s - space.heeled.level(slant, water));
    let [lo, hi] = [0, space.solid.whole];
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (excess(mid) < 0) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  const tensionOf = (q: readonly number[], t: number, mass: number): number => {
    if (!hoist || t < hoist.taut || t >= hoist.cast || taut === null) return 0;
    const { capacity, climb, clear, takes } = hoist.def;
    const k = capacity.value / takes.value;
    const target = Math.min(taut + climb.value * (t - hoist.taut), clear.value + top);
    const pull = k * (target - crown(q)) - 2 * Math.sqrt(k * mass) * (q[1]! - (target < clear.value + top ? climb.value : 0));
    return Math.min(capacity.value, Math.max(0, pull));
  };

  /** What turns it about its centre, N m (its +X side down), but its damping: the sea it puts aside, the water in it, what is aboard, the line. */
  const turning = (q: readonly number[], t: number, slant: number, s: number, level: readonly number[], tension: number): number => {
    const [c, sn] = [Math.cos(slant), Math.sin(slant)];
    const arm = (u: Under) => (u.out - xG * u.volume) * c + (u.up - hG * u.volume) * sn;
    let moment = -rho * G0 * arm(hull.under(slant, s));
    for (let i = 0; i < n; i++) if (q[W + i]! > 0) moment += rho * G0 * arm(spaces[i]!.heeled.under(slant, level[i]!));
    for (const l of aboard(t)) {
      const p = placeOf(l, t);
      if (p) moment += l.mass.value * G0 * ((p.x - xG) * c + (p.h - hG) * sn);
    }
    return moment - tension * (-xG * c + (top - hG) * sn);
  };
  /**
   * What it takes to turn it about its centre, kg m^2: what stays aboard by its gyration, each part aboard at its place,
   * and the water in each space that is full (it turns with the body: a bag full of the sea), at its centre. Water with a
   * surface stands level and is not turned.
   */
  const inertia = (q: readonly number[], t: number, slant: number, level: readonly number[]): number => {
    let sum = core * (heel ? heel.gyration.value ** 2 : 0);
    for (const l of aboard(t)) {
      const p = placeOf(l, t);
      if (p) sum += l.mass.value * ((p.x - xG) ** 2 + (p.h - hG) ** 2);
    }
    for (let i = 0; i < n; i++) {
      const water = q[W + i]!;
      if (water < spaces[i]!.solid.whole - SNUG) continue;
      const u = spaces[i]!.heeled.under(slant, level[i]!);
      sum += rho * water * ((u.out / water - xG) ** 2 + (u.up / water - hG) ** 2);
    }
    return sum;
  };

  // the damping of its heeling: a share of critical on its stiffness upright as it first floats
  let roll = 0;
  if (heel) {
    const z0 = lowest(state);
    const stiff = (a: number) => turning(state, from, a, s0.height - z0, levels(state, a), 0);
    const k0 = Math.abs(stiff(-0.01) - stiff(0.01)) / 0.02;
    roll = 2 * heel.damping.value * Math.sqrt(k0 * inertia(state, from, 0, levels(state, 0)));
  }

  const rate = (q: readonly number[], t: number): number[] => {
    const [w, phi, omega] = [q[1]!, q[2]!, q[3]!];
    const { height: eta, rate: etaRate } = sea(t);
    const tip = tipOf(t);
    const slant = heel ? phi - tip.angle : 0;
    const s = eta - lowest(q); // the surface over the hull's lowest point
    const level = levels(q, slant);
    const flows = spaces.map((space, i) => {
      const water = q[W + i]!;
      // (air trapped: the water in the space stands where the air's pressure meets the sea's, set between the steps, `settle`)
      if (!vented(i, t, s, level[i]!, slant)) return 0;
      let flow = 0;
      space.def.openings.forEach((o, j) => {
        if (!isOpen(o, t)) return;
        for (const band of space.bands[j]!)
          for (const col of band.columns) {
            const y = heightOf(band.y, col.out, slant);
            const wet = s > y;
            const full = level[i]! > y;
            if (!wet && !full) continue;
            const outside = wet ? rho * G0 * (s - y) : 0;
            const inside = full ? rho * G0 * (level[i]! - y) : 0;
            // (water goes from the side that has it; where only one side has water at the band, never the other way: that is air)
            let dp = outside - inside;
            if (!wet && dp > 0) dp = 0;
            if (!full && dp < 0) dp = 0;
            flow += Math.sign(dp) * o.cd.value * band.width * col.share * Math.sqrt((2 * Math.abs(dp)) / rho);
          }
      });
      if ((flow > 0 && water >= space.solid.whole - SNUG) || (flow < 0 && water <= SNUG)) return 0;
      return flow;
    });
    const dry = dryAt(t);
    const mass = dry + rho * q.slice(W, W + n).reduce((a, b) => a + b, 0);
    const cut = s > hull.solid.bottom && s < top;
    const lift = rho * G0 * (heel ? hull.under(slant, s).volume : hull.solid.volume(Math.min(Math.max(s, hull.solid.bottom), top)));
    const spring = cut ? rho * G0 * Math.PI * hull.solid.radius(s) ** 2 : 0;
    const relative = w - (cut ? etaRate : 0);
    const damping = 2 * def.heave.value * Math.sqrt(spring * mass) * relative;
    const drag = 0.5 * rho * def.drag.value * Math.abs(relative) * relative;
    const tension = tensionOf(q, t, mass);
    const force = lift - mass * G0 - damping - drag + tension;
    const spin = heel ? (turning(q, t, slant, s, level, tension) - roll * (omega - tip.rate)) / inertia(q, t, slant, level) : 0;
    return [w, force / mass, omega, spin, ...flows, ...spaces.map(() => 0)];
  };

  // the instants a step must end on
  const going = def.leaves.flatMap((l) =>
    l.through && Number.isFinite(left[l.id] ?? Infinity) ? [left[l.id]! - l.through.over.value] : [],
  );
  const instants = [...Object.values(opened), ...Object.values(left), ...going, ...(hoist ? [hoist.taut, hoist.cast] : []), until]
    .filter((t) => t > from && t <= until)
    .sort((a, b) => a - b);

  const sample = (q: readonly number[], t: number): AfloatSample => {
    const dry = dryAt(t);
    const water = q.slice(W, W + n);
    const mass = dry + SEA_WATER * water.reduce((a, b) => a + b, 0);
    const slant = heel ? q[2]! - tipOf(t).angle : 0;
    return {
      t,
      z: lowest(q),
      w: q[1]!,
      surface: sea(t).height,
      water,
      tension: tensionOf(q, t, mass),
      mass,
      heel: q[2]!,
      slant,
      levels: levels(q, slant),
    };
  };
  const samples: AfloatSample[] = [sample(state, from)];
  let t = from;
  let under = Number.POSITIVE_INFINITY;
  let end = until;
  let flooded = 0;
  let held = 0;
  let rose = Number.NEGATIVE_INFINITY;
  let most = 0;
  let mostAt = from;
  let nextKeep = from + KEEP;
  const drains = spaces.map((s) => Boolean(s.def.drains));
  const weigh = (q: readonly number[], at: number) => dryAt(at) + rho * spaces.reduce((sum, _, i) => sum + (drains[i] ? 0 : q[W + i]!), 0);
  const stop90 = (MOST * Math.PI) / 180;
  let k = 0;
  done: while (k < instants.length) {
    const stop = instants[k]!;
    while (t < stop - 1e-12) {
      const h = Math.min(STEP, stop - t);
      if (hoist && taut === null && t >= hoist.taut) taut = crown(state);
      state = rk4n(state, t, h, rate);
      t = h === stop - t ? stop : t + h;
      // (not followed past lying MOST degrees over)
      if (Math.abs(state[2]!) > stop90) {
        state[2] = Math.sign(state[2]!) * stop90;
        state[3] = 0;
      }
      // the air: where it can get out (or in) it is at the air's pressure and fills what the water leaves
      const s = sea(t).height - lowest(state);
      const slant = heel ? state[2]! - tipOf(t).angle : 0;
      for (let i = 0; i < n; i++) {
        state[W + i] = Math.min(spaces[i]!.solid.whole, Math.max(0, state[W + i]!));
        const level = spaces[i]!.heeled.level(slant, state[W + i]!);
        if (vented(i, t, s, level, slant)) state[W + n + i] = spaces[i]!.solid.whole - state[W + i]!;
        else if (spaces[i]!.def.openings.some((o) => isOpen(o, t))) state[W + i] = settle(spaces[i]!, state[W + n + i]!, s, slant);
      }
      flooded = Math.max(flooded, weigh(state, t));
      const over = topOf(state) - sea(t).height;
      if (hoist && t > hoist.taut && t <= hoist.cast) {
        held = Math.max(held, tensionOf(state, t, sample(state, t).mass));
        rose = Math.max(rose, lowest(state) - sea(t).height);
      }
      if (over < 0 && under === Number.POSITIVE_INFINITY) under = t;
      if (under === Number.POSITIVE_INFINITY && Math.abs(state[2]!) > Math.abs(most)) {
        most = state[2]!;
        mostAt = t;
      }
      if (t >= nextKeep - 1e-9) {
        samples.push(sample(state, t));
        nextKeep += KEEP;
      }
      if (over < -sight) {
        end = t;
        break done;
      }
    }
    k++;
  }
  if (samples[samples.length - 1]!.t < t) samples.push(sample(state, t));
  return {
    from,
    samples,
    under,
    end,
    top,
    flooded,
    held,
    rose,
    wholes: spaces.map((s) => s.solid.whole),
    heeled: most,
    heeledAt: mostAt,
  };
}

/** The body afloat at `t`: its samples' state straight between the two either side (held at either end). */
export function afloatAt(run: Afloat, t: number): AfloatSample {
  const s = run.samples;
  if (t <= s[0]!.t) return s[0]!;
  const last = s[s.length - 1]!;
  if (t >= last.t) return last;
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = s[lo]!;
  const b = s[hi]!;
  const k = (t - a.t) / (b.t - a.t);
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    t,
    z: mix(a.z, b.z),
    w: mix(a.w, b.w),
    surface: mix(a.surface, b.surface),
    water: a.water.map((x, i) => mix(x, b.water[i]!)),
    tension: mix(a.tension, b.tension),
    mass: mix(a.mass, b.mass),
    heel: mix(a.heel, b.heel),
    slant: mix(a.slant, b.slant),
    levels: a.levels.map((x, i) => mix(x, b.levels[i]!)),
  };
}
