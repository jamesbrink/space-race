/**
 * A body afloat: a hull of revolution standing upright in the sea, rising and falling on the day's waves (sim/sea.ts),
 * taking in water through its openings into the spaces inside it, hoisted by a line from above, and going down once it
 * weighs more than the sea it puts aside. Nothing here knows any spacecraft: the hull, its spaces, its openings and what
 * leaves it are the flight's data (types.ts `AfloatDef`), and when each opening opens, each thing leaves and the line
 * comes taut and is let go are the caller's.
 *
 * The physics, each piece stated:
 *   - Up and down only (heave): the body stays upright, its long axis on the plumb line, and goes neither across the sea
 *     nor round. The sea's surface where it floats is the day's waves at its place (long waves on a small body: the
 *     surface is taken level across it, and the pressure under it as the still sea's at that surface).
 *   - What holds it up is the sea's weight in the volume of its outside under the surface (Archimedes); what pulls it down
 *     is its own weight and that of every drop of water in its spaces. So water in a space below the sea outside costs
 *     nothing, and above it is dead weight; air trapped in a space is buoyancy.
 *   - Water goes through an opening as through a sharp orifice (Torricelli): each thin band of the opening passes
 *     Cd w dy root(2 dp / rho), dp the difference of the pressures either side of that band, the sea's outside (its
 *     depth under the surface) and the space's inside (its depth under the water in it, over the air's).
 *   - Air in a space leaves (or comes in) through any opening that is not wholly under both the sea outside and the water
 *     inside, so it is at the air's pressure; under both, it is trapped, and squeezed as the water rises (Boyle, at the
 *     sea's temperature).
 *   - Its rising and falling is damped by a share of the critical damping of its own spring on the sea (estimated: the
 *     waves it makes, which are not worked out), and its motion through the water by its drag.
 *   - A line from above pulls up at its top once taut: toward holding the body clear of the sea at the rate it is taken
 *     up, never more than what pulls it can give (`HoistDef`).
 * One step of STEP seconds by the fourth-order Runge-Kutta (core/rk4.ts `rk4n`), every step ending on the next instant
 * given, so one set of instants gives one run to the last bit.
 */
import type { AfloatDef, HoistDef, Profile, SpaceDef } from '../types.ts';
import { G0, P0 } from '../world/bodies.ts';
import { rk4n } from './core/rk4.ts';
import { surfaceAt, type Wave } from './sea.ts';

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

/** When each thing given happens, s from liftoff: an opening opened (by its id), a part left (by its id), the line taut and let go. */
export interface AfloatEvents {
  opened?: Record<string, number>;
  left?: Record<string, number>;
  hoist?: { def: HoistDef; taut: number; cast: number };
}

/** The body afloat at one instant. */
export interface AfloatSample {
  t: number;
  /** Its lowest point's height over still water, m, and how fast it rises, m/s. */
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
}

interface Space {
  def: SpaceDef;
  solid: Solid;
}

/** The space's water, m^3, that a still sea at height `s` over the hull's lowest point fills it to through an opening always open. */
const filledTo = (space: Space, s: number): number => space.solid.volume(s);

/**
 * Float `def` from `from` (s from liftoff) to `until`, on `waves` (sim/sea.ts, their instant counted from `from`), with
 * what happens when given in `events`. It starts at rest where it floats with its always-open spaces filled to the sea
 * outside and the rest empty. It ends `sight` m under the surface, or at `until`.
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
  const hull = new Solid(def.hull.profile);
  const spaces: Space[] = def.spaces.map((s) => ({ def: s, solid: new Solid(s.shape, s.free.value) }));
  const n = spaces.length;
  const opened = events.opened ?? {};
  const left = events.left ?? {};
  const hoist = events.hoist;
  const isOpen = (o: SpaceDef['openings'][number], t: number) => !o.shut || t >= (opened[o.id] ?? Infinity);
  const dryAt = (t: number) => def.mass.value - def.leaves.reduce((sum, l) => sum + (t >= (left[l.id] ?? Infinity) ? l.mass.value : 0), 0);
  const sea = (t: number) => surfaceAt(waves, t - from);

  // where it floats to begin with: the draft at which the sea it puts aside, less what its open spaces take in, is its weight
  const open0 = spaces.map((s) => s.def.openings.some((o) => !o.shut));
  const lifted = (d: number) => rho * (hull.volume(d) - spaces.reduce((sum, s, i) => sum + (open0[i] ? filledTo(s, d) : 0), 0));
  let [lo, hi] = [hull.bottom, hull.top];
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (lifted(mid) < dryAt(from)) lo = mid;
    else hi = mid;
  }
  const draft = (lo + hi) / 2;
  const s0 = sea(from);
  // the state: [z, w, water..., air...]; the air in each space as its volume at the air's pressure
  const water0 = spaces.map((s, i) => (open0[i] ? filledTo(s, draft) : 0));
  let state = [s0.height - draft, 0, ...water0, ...spaces.map((s, i) => s.solid.whole - water0[i]!)];
  let taut: number | null = null; // its top's height over still water as the line came taut

  const levels = (q: readonly number[]) => spaces.map((s, i) => s.solid.height(q[2 + i]!));
  /**
   * Whether a space's air can get out (or in): some opening open and not wholly under both the sea and its water, or
   * reaching the space's top (the last of its air goes out there, however deep it is).
   */
  const vented = (i: number, t: number, s: number, level: number) =>
    spaces[i]!.def.openings.some((o) => isOpen(o, t) && (o.to > s || o.to > level || o.to >= spaces[i]!.solid.top - SNUG));

  /**
   * The water a space whose air is trapped holds, m^3, `air` m^3 of it at the air's pressure, with the sea at `s` over the
   * hull's lowest point: where the air, squeezed (Boyle), presses as hard as the sea does at the water's surface inside.
   * Its openings are wide and wholly under, so it gets there within a step: taken at once.
   */
  const settle = (solid: Solid, air: number, s: number): number => {
    const excess = (water: number) => P0 * (air / Math.max(1e-12, solid.whole - water) - 1) - rho * G0 * (s - solid.height(water));
    let [lo, hi] = [0, solid.whole];
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
    const target = Math.min(taut + climb.value * (t - hoist.taut), clear.value + hull.top);
    const pull =
      k * (target - (q[0]! + hull.top)) - 2 * Math.sqrt(k * mass) * (q[1]! - (target < clear.value + hull.top ? climb.value : 0));
    return Math.min(capacity.value, Math.max(0, pull));
  };

  const rate = (q: readonly number[], t: number): number[] => {
    const [z, w] = [q[0]!, q[1]!];
    const { height: eta, rate: etaRate } = sea(t);
    const s = eta - z; // the surface over the hull's lowest point
    const level = levels(q);
    const flows = spaces.map((space, i) => {
      const water = q[2 + i]!;
      // (air trapped: the water in the space stands where the air's pressure meets the sea's, set between the steps, `settle`)
      if (!vented(i, t, s, level[i]!)) return 0;
      const pAir = 0;
      let flow = 0;
      for (const o of space.def.openings) {
        if (!isOpen(o, t)) continue;
        const dy = (o.to - o.from) / BANDS;
        for (let b = 0; b < BANDS; b++) {
          const y = o.from + (b + 0.5) * dy;
          const wet = s > y;
          const full = level[i]! > y;
          if (!wet && !full) continue;
          const outside = wet ? rho * G0 * (s - y) : 0;
          const inside = pAir + (full ? rho * G0 * (level[i]! - y) : 0);
          // (water goes from the side that has it; where only one side has water at the band, never the other way: that is air)
          let dp = outside - inside;
          if (!wet && dp > 0) dp = 0;
          if (!full && dp < 0) dp = 0;
          const width = o.width[0] + ((o.width[1] - o.width[0]) * (y - o.from)) / (o.to - o.from);
          flow += Math.sign(dp) * o.cd.value * width * dy * Math.sqrt((2 * Math.abs(dp)) / rho);
        }
      }
      if ((flow > 0 && water >= space.solid.whole - SNUG) || (flow < 0 && water <= SNUG)) return 0;
      return flow;
    });
    const dry = dryAt(t);
    const mass = dry + rho * q.slice(2, 2 + n).reduce((a, b) => a + b, 0);
    const cut = s > hull.bottom && s < hull.top;
    const under = Math.min(Math.max(s, hull.bottom), hull.top);
    const lift = rho * G0 * hull.volume(under);
    const spring = cut ? rho * G0 * Math.PI * hull.radius(s) ** 2 : 0;
    const relative = w - (cut ? etaRate : 0);
    const damping = 2 * def.heave.value * Math.sqrt(spring * mass) * relative;
    const drag = 0.5 * rho * def.drag.value * Math.abs(relative) * relative;
    const force = lift - mass * G0 - damping - drag + tensionOf(q, t, mass);
    return [w, force / mass, ...flows, ...spaces.map(() => 0)];
  };

  // the instants a step must end on
  const instants = [...Object.values(opened), ...Object.values(left), ...(hoist ? [hoist.taut, hoist.cast] : []), until]
    .filter((t) => t > from && t <= until)
    .sort((a, b) => a - b);

  const sample = (q: readonly number[], t: number): AfloatSample => {
    const dry = dryAt(t);
    const water = q.slice(2, 2 + n);
    const mass = dry + SEA_WATER * water.reduce((a, b) => a + b, 0);
    return { t, z: q[0]!, w: q[1]!, surface: sea(t).height, water, tension: tensionOf(q, t, mass), mass };
  };
  const samples: AfloatSample[] = [sample(state, from)];
  let t = from;
  let under = Number.POSITIVE_INFINITY;
  let end = until;
  let flooded = 0;
  let held = 0;
  let rose = Number.NEGATIVE_INFINITY;
  let nextKeep = from + KEEP;
  const drains = spaces.map((s) => Boolean(s.def.drains));
  const weigh = (q: readonly number[], at: number) => dryAt(at) + rho * spaces.reduce((sum, _, i) => sum + (drains[i] ? 0 : q[2 + i]!), 0);
  let k = 0;
  done: while (k < instants.length) {
    const stop = instants[k]!;
    while (t < stop - 1e-12) {
      const h = Math.min(STEP, stop - t);
      if (hoist && taut === null && t >= hoist.taut) taut = state[0]! + hull.top;
      state = rk4n(state, t, h, rate);
      t = h === stop - t ? stop : t + h;
      // the air: where it can get out (or in) it is at the air's pressure and fills what the water leaves
      const s = sea(t).height - state[0]!;
      const level = levels(state);
      for (let i = 0; i < n; i++) {
        state[2 + i] = Math.min(spaces[i]!.solid.whole, Math.max(0, state[2 + i]!));
        if (vented(i, t, s, level[i]!)) state[2 + n + i] = spaces[i]!.solid.whole - state[2 + i]!;
        else if (spaces[i]!.def.openings.some((o) => isOpen(o, t))) state[2 + i] = settle(spaces[i]!.solid, state[2 + n + i]!, s);
      }
      flooded = Math.max(flooded, weigh(state, t));
      const top = state[0]! + hull.top - sea(t).height;
      if (hoist && t > hoist.taut && t <= hoist.cast) {
        held = Math.max(held, tensionOf(state, t, sample(state, t).mass));
        rose = Math.max(rose, state[0]! - sea(t).height);
      }
      if (top < 0 && under === Number.POSITIVE_INFINITY) under = t;
      if (t >= nextKeep - 1e-9) {
        samples.push(sample(state, t));
        nextKeep += KEEP;
      }
      if (top < -sight) {
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
    top: hull.top,
    flooded,
    held,
    rose,
    wholes: spaces.map((s) => s.solid.whole),
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
  };
}
