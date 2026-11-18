/**
 * What a vehicle lets go, flown: the tower, the spent booster, the retropack, whatever a flight's
 * plan lists (`Craft.sheds`). Each is a rigid body of its own from the instant it leaves, in
 * the same frame that does not turn, under the same gravity (world/orbit.ts, with J2), the same air
 * (atmosphere.ts) and the same force model as the vehicle (forces.ts): axial drag by which end
 * leads, the push on its fins, the cross-flow on its side, so it flies end on, weathercocks or
 * tumbles as its shape and its centre of mass say, and a tumble is damped by the air it stirs.
 * A body with rockets of its own (`motors`) burns them as it leaves, together. Nothing here knows any flight.
 *
 * How it starts is a `Release` (forces.ts): where its centre of mass was on the turning stack,
 * with that point's own velocity, the stack's attitude and rates, and its share of any push. The
 * live vehicle makes one at each event (vehicle.ts: `VehicleState.released`); `recordRelease`
 * makes one from a run of fly.ts, which has no attitude: the programme's axis, not turning.
 *
 * Time. The vehicle's own tick, by the same fourth-order Runge-Kutta, counted from the release:
 * the same release gives the same flight to the last bit, however it is asked for. Above the air
 * (under LULL pascals of dynamic pressure, the rocket out) nothing acts but gravity on a body
 * turning freely, and it is stepped COARSE ticks at a time, which is the step fly.ts itself uses.
 *
 * It ends where either of its ends meets the sea (or `floor`), and says where and how fast.
 * Something let go standing on the ground stays there, and so does something let go onto what
 * stands under it (`Release.stands`). Nearby airborne parts exchange contact impulses in `Sheds`. A body that has come down is not
 * integrated again. Its mass does not change: a motor's propellant is not taken off it.
 */
import type { ShedBody } from '../types.ts';
import { EARTH_ROTATION_RATE, G0 } from '../world/bodies.ts';
import { type EarthFrame, LIFTOFF } from '../world/earthframe.ts';
import {
  add,
  angleBetween,
  cross,
  dot,
  ecefToGeodetic,
  ecefToInertial,
  type Geodetic,
  geodeticToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { gravity } from '../world/orbit.ts';
import { airAt, skyOf } from './air.ts';
import { contact, type Impact } from './contact.ts';
import { rk4Body } from './core/rk4.ts';
import { ballisticOf, MEAN_RADIUS } from './fly.ts';
import { airForces, floorAt, pieceOf, type Release, type Shape } from './forces.ts';
import type { FlightPlan } from './plan.ts';
import { aboutAxis, euler, fixedAndFluid, fromAxes, multiply, normalize, type Quat, spin, turn, unturn } from './rigid.ts';
import { TICK, type Vehicle, type VehicleState } from './vehicle.ts';

/** Under this dynamic pressure, Pa, the air is left out of a coarse step; and how many ticks such a step is. */
export const LULL = 0.01;
export const COARSE = 5;
/** How often a flown body's state is kept for showing again, s. */
export const KEEP = 0.1;
/** Time horizon for the landing report, s. Finite replay queries can continue beyond it. */
const LIMIT = 4 * 3600;

const EARTH: Vec3 = [0, 0, EARTH_ROTATION_RATE];
const X: Vec3 = [1, 0, 0];
const NONE: ReadonlySet<string> = new Set();

export interface ShedLanding {
  /** Seconds from liftoff. */
  t: number;
  /** Its speed through the air as it struck, m/s, and the part of that straight down. */
  speed: number;
  vertical: number;
  latitude: number;
  longitude: number;
  /** Distance over the ground from the pad, m. */
  range: number;
}

/** A shed body at one instant. A value: `tick` returns a new one. */
export interface ShedState {
  t: number;
  /** Ticks since the release. */
  ticks: number;
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
  /** The greatest height so far, m above the sea, and the greatest dynamic pressure, Pa. */
  apogee: number;
  peakQ: number;
  landing: ShedLanding | null;
}

export interface Shedder {
  readonly def: ShedBody;
  readonly release: Release;
  start(): ShedState;
  /** One step: a tick, or COARSE of them above the air. */
  tick(state: ShedState): ShedState;
  /** What the air and its rocket are doing to it: height (m), dynamic pressure (Pa), Mach number, the angle between its +X and its motion through the air (rad), and every force but gravity (N, in the frame). */
  feel(state: ShedState): { altitude: number; q: number; mach: number; alpha: number; airspeed: number; force: Vec3 };
}

export interface ShedOptions {
  /** The ground's height above the sea under a place, m: by default the pad's own level within a kilometre of it and the sea beyond, as the vehicle's is. */
  floor?: (latitude: number, longitude: number) => number;
  /** The frame the vehicle that let it go is flown in (world/earthframe.ts): fixed at liftoff unless given. */
  frame?: EarthFrame;
}

interface Dyn {
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
}

/**
 * What flying a shed body needs of the flight that let it go, from its plan: the area its drag figures are referred to (the
 * stack's going up), the day's winds, and the bodies it lets go (`Craft.sheds`).
 */
const sourceOf = (plan: FlightPlan) => {
  const craft = plan.craft[0]!;
  return { area: craft.drag[0]!.area, winds: plan.winds, sheds: craft.sheds ?? [] };
};

/** One body, ready to be flown from its release. */
export function shedder(
  plan: FlightPlan,
  site: Geodetic,
  seaLevel: number,
  def: ShedBody,
  release: Release,
  options: ShedOptions = {},
): Shedder {
  const pad = geodeticToEcef(site);
  const source = sourceOf(plan);
  // (the day's wind, as the vehicle that let it go flies through)
  const sky = skyOf(source);
  const frame = options.frame ?? LIFTOFF;
  const windAt = (r: Vec3, v: Vec3, at: number, sea: number) => airAt(frame, r, v, at, sea, sky);
  const floor = options.floor ?? floorAt(site, seaLevel);
  const { mass, roll, across, centre } = release;
  const shape: Shape = {
    area: source.area.value,
    ahead: def.ahead.value,
    astern: def.astern.value,
    surfaces: def.surfaces ?? [],
    side: { dragArea: def.side.dragArea.value, from: def.side.from.value, to: def.side.to.value },
  };
  const ends = [def.from.value - centre, def.to.value - centre];
  // every rocket it still has (one an abort has burned is spent), each with its own burn, tail and line
  const motors = (def.motors ?? [])
    .filter((m) => !(m.unless === 'abort' && release.aborted))
    .map((m) => {
      const burn = m.burn.value;
      const tail = m.impulse ? Math.max(0, (2 * (m.impulse.value - m.thrust.value * burn)) / m.thrust.value) : 0;
      const cant = ((m.cant?.value ?? 0) * Math.PI) / 180;
      // (off the centre of mass, canted, it turns the body: its arm along the body's +X)
      const arm = m.station ? m.station.value - centre : 0;
      return { thrust: m.thrust.value, burn, tail, line: [Math.cos(cant), 0, Math.sin(cant)] as Vec3, arm };
    });
  /** When the last of them is out, seconds from the release. */
  const out = motors.reduce((a, m) => Math.max(a, m.burn + m.tail), 0);
  const ZERO: Vec3 = [0, 0, 0];
  /** One motor's thrust, N, `since` seconds after the release. */
  const level = (m: (typeof motors)[number], since: number): number =>
    since < m.burn ? m.thrust : m.tail > 0 ? m.thrust * Math.max(0, 1 - (since - m.burn) / m.tail) : 0;
  /** What they push with together, N, in the body's axes. */
  const thrust = (since: number): Vec3 => {
    if (since < 0 || since >= out) return ZERO;
    let sum = ZERO;
    for (const m of motors) {
      const f = level(m, since);
      if (f > 0) sum = add(sum, scale(m.line, f));
    }
    return sum;
  };
  /** How they turn it together, N m, in the body's axes: each one's arm along +X crossed with its push. */
  const turning = motors.some((m) => m.arm !== 0);
  const twist = (since: number): Vec3 => {
    if (!turning || since < 0 || since >= out) return ZERO;
    let sum = ZERO;
    for (const m of motors) {
      const f = level(m, since);
      if (f > 0 && m.arm !== 0) sum = add(sum, cross([m.arm, 0, 0], scale(m.line, f)));
    }
    return sum;
  };

  /** `push`: its rockets' thrust, N, in its own axes, held through a tick at what it is at the tick's middle (so a burn that ends on a tick ends there, not a stage early). */
  const forces = (d: Dyn, at: number, still: boolean, push: Vec3, turn0: Vec3 = ZERO) => {
    const air = windAt(d.r, d.v, at, seaLevel);
    let force: Vec3 = [0, 0, 0];
    let torque: Vec3 = [0, 0, 0];
    if (!still && air.air.density > 0) {
      const f = airForces(shape, centre, unturn(d.q, air.wind), d.w, air.air.density);
      force = turn(d.q, f.force);
      torque = f.torque;
    }
    if (push !== ZERO) force = add(force, turn(d.q, push));
    if (turn0 !== ZERO) torque = add(torque, turn0);
    return { force, torque, air };
  };
  const rate = (d: Dyn, at: number, still: boolean, push: Vec3, turn0: Vec3 = ZERO): Dyn => {
    const f = forces(d, at, still, push, turn0);
    return { r: d.v, v: add(gravity(d.r), scale(f.force, 1 / mass)), q: spin(d.q, d.w), w: euler(d.w, f.torque, roll, across) };
  };
  /** A step from `at` (core/rk4.ts), its rockets' push held at what it is at the step's middle. */
  const rk4 = (d: Dyn, at: number, h: number, still: boolean): Dyn => {
    const push = thrust(at + h / 2 - release.t);
    const torque = twist(at + h / 2 - release.t);
    return rk4Body(d, at, h, (x, tt) => rate(x, tt, still, push, torque));
  };

  const fixed = (r: Vec3, at: number): Vec3 => frame.toFixed(r, at);
  /** How far its lower end is above the ground under it, m, and where that is. */
  const clear = (d: Dyn, at: number): { by: number; height: number; latitude: number; longitude: number } => {
    const axis = turn(d.q, X);
    let low = Infinity;
    let where = { latitude: 0, longitude: 0, height: 0 };
    for (const end of ends) {
      const here = ecefToGeodetic(fixed(add(d.r, scale(axis, end)), at));
      const by = here.height - seaLevel - floor(here.latitude, here.longitude);
      if (by < low) {
        low = by;
        where = here;
      }
    }
    return { by: low, height: where.height - seaLevel, latitude: where.latitude, longitude: where.longitude };
  };
  const reach = Math.max(Math.abs(ends[0]!), Math.abs(ends[1]!)) + 1;
  const landed = (d: Dyn, at: number): ShedLanding => {
    const through = sub(d.v, cross(EARTH, d.r));
    const here = ecefToGeodetic(fixed(d.r, at));
    return {
      t: at,
      speed: length(through),
      vertical: -dot(through, frame.up(d.r, at)),
      latitude: here.latitude,
      longitude: here.longitude,
      range: angleBetween(fixed(d.r, at), pad) * MEAN_RADIUS,
    };
  };

  const start = (): ShedState => {
    const d: Dyn = { r: release.r, v: release.v, q: release.q, w: release.w };
    const air = windAt(d.r, d.v, release.t, seaLevel);
    const state: ShedState = { t: release.t, ticks: 0, ...d, apogee: air.altitude, peakQ: air.q, landing: null };
    // let go standing on the ground, or onto something that stands under it: it stays where it stands (still over the
    // ground, whatever the wind is doing past it)
    if (release.stands || (length(air.ground) < 0.5 && length(thrust(0)) <= mass * G0 && clear(d, release.t).by < 0.05))
      state.landing = landed(d, release.t);
    return state;
  };

  const tick = (s: ShedState): ShedState => {
    if (s.landing) return s;
    const before: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w };
    const air = windAt(s.r, s.v, s.t, seaLevel);
    // above the air, coasting, on the coarse grid: one long step
    const still = air.q < LULL && air.altitude > 100_000 && s.t - release.t >= out && s.ticks % COARSE === 0;
    // In a rarefied orbital coast the full air forces vary slowly. Keep rotations under
    // half a degree per long step, on the same fixed grid however often the camera asks.
    const orbitalCoast =
      plan.kind === 'orbital' && air.altitude > 100_000 && air.q < 1 && s.t - release.t >= out && length(s.w) < 0.017 && s.ticks % 50 === 0;
    const ticks = Math.floor(s.ticks + 1e-8) + (orbitalCoast ? 50 : still ? COARSE : 1);
    const h = (ticks - s.ticks) * TICK;
    const t = release.t + ticks * TICK;
    const after = rk4(before, s.t, h, still);
    const now = windAt(after.r, after.v, t, seaLevel);
    const next: ShedState = {
      ...after,
      t,
      ticks,
      apogee: Math.max(s.apogee, now.altitude),
      peakQ: Math.max(s.peakQ, now.q),
      landing: null,
    };
    if (now.altitude < reach + 5000 && dot(now.wind, unit(after.r)) < 0) {
      const low = clear(after, t);
      if (low.by <= 0) {
        // back to the instant it touched, along the last step
        const was = clear(before, s.t).by;
        const k = Math.min(1, Math.max(0, was / (was - low.by || 1)));
        const mix = (a: Vec3, b: Vec3): Vec3 => add(a, scale(sub(b, a), k));
        const d: Dyn = { r: mix(before.r, after.r), v: mix(before.v, after.v), q: after.q, w: after.w };
        const at = s.t + h * k;
        return { ...next, ...d, t: at, landing: landed(d, at) };
      }
    }
    return next;
  };

  return {
    def,
    release,
    start,
    tick,
    feel(s) {
      const d: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w };
      const f = forces(d, s.t, false, thrust(s.t + TICK / 2 - release.t));
      const alpha = f.air.airspeed > 1e-6 ? angleBetween(turn(s.q, X), f.air.wind) : 0;
      return { altitude: f.air.altitude, q: f.air.q, mach: f.air.mach, alpha, airspeed: f.air.airspeed, force: f.force };
    },
  };
}

/** A body's flight kept for showing: flown as far as it has been asked for, a state every KEEP seconds. */
export class ShedRun {
  readonly shedder: Shedder;
  private state: ShedState;
  private readonly kept: { t: number; r: Vec3; v: Vec3; q: Quat; w: Vec3 }[] = [];

  constructor(shedder: Shedder) {
    this.shedder = shedder;
    this.state = shedder.start();
    this.keep();
  }

  private keep(): void {
    const { t, r, v, q, w } = this.state;
    this.kept.push({ t, r, v, q, w });
  }

  /** When it left, seconds from liftoff. */
  get from(): number {
    return this.shedder.release.t;
  }

  /** The state it has been flown to. */
  get now(): ShedState {
    return this.state;
  }

  /** Fly it on until `t` (or until it is down). */
  upTo(t: number): void {
    if (t === Infinity) t = this.from + LIMIT;
    const every = Math.round(KEEP / TICK);
    while (!this.state.landing && this.state.t < t) {
      this.state = this.shedder.tick(this.state);
      if (this.state.landing || this.state.ticks % every === 0) this.keep();
    }
  }

  /** Replace the outgoing state after contact. Rendering can already have asked for the next
   * fraction of a tick; invalidate that speculative future and retain the incoming side for replay. */
  strike(t: number, dr: Vec3, dv: Vec3, impact = t): void {
    const at = this.at(t);
    if (!at || at.down) return;
    const when = Math.max(this.from, Math.min(t, impact));
    const incoming = this.at(when)!;
    while (this.kept.length && this.kept.at(-1)!.t >= when) this.kept.pop();
    this.kept.push({ t: when, r: incoming.r, v: incoming.v, q: incoming.q, w: incoming.w });
    this.kept.push({ t: when, r: incoming.r, v: add(incoming.v, dv), q: incoming.q, w: incoming.w });
    this.state = { ...this.state, t, ticks: (t - this.from) / TICK, r: add(at.r, dr), v: add(at.v, dv), q: at.q, w: at.w, landing: null };
    this.keep();
  }

  /** Continue a copy at a handover. Earlier corrected states are shared as immutable samples.
   * A contact or a look ahead on the new run cannot rewrite the source run. */
  fork(t: number): ShedRun {
    const next = new ShedRun(this.shedder);
    const at = this.at(t);
    if (!at) return next;
    next.kept.length = 0;
    for (const sample of this.kept) {
      if (sample.t > t) break;
      next.kept.push(sample);
    }
    next.state =
      this.state.landing && this.state.t <= t ? this.state : { ...this.state, ...at, t, ticks: (t - this.from) / TICK, landing: null };
    next.keep();
    return next;
  }

  /** Fly it until it is down, and say where. */
  finish(): ShedLanding | null {
    this.upTo(this.from + LIMIT);
    return this.state.landing;
  }

  /**
   * Where it is at `t` and how it lies, in the frame that does not turn: flown that far if it has not been yet. Between
   * kept states the position is a cubic through both ends' positions and velocities. Once down it stays on the turning
   * Earth where it struck. Null before it left.
   */
  at(t: number): { r: Vec3; v: Vec3; q: Quat; w: Vec3; down: boolean } | null {
    if (t < this.from) return null;
    this.upTo(t);
    const kept = this.kept;
    const last = kept[kept.length - 1]!;
    const now = this.state;
    if (now.landing && t >= now.t) {
      // carried round with the ground
      const angle = EARTH_ROTATION_RATE * (t - now.t);
      const r = ecefToInertial(now.r, angle);
      return { r, v: cross(EARTH, r), q: multiply(aboutAxis([0, 0, 1], angle), now.q), w: [0, 0, 0], down: true };
    }
    if (t >= now.t) return { r: now.r, v: now.v, q: now.q, w: now.w, down: false };
    let lo = 0;
    let hi = kept.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (kept[mid]!.t <= t) lo = mid;
      else hi = mid;
    }
    // (past the last state kept, the other end is the state it has been flown to)
    const a = t >= last.t ? last : kept[lo]!;
    const b = t >= last.t ? now : kept[hi]!;
    const h = b.t - a.t;
    const s = h > 0 ? (t - a.t) / h : 0;
    const [h00, h10, h01, h11] = [2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2];
    const r = [0, 1, 2].map((i) => h00 * a.r[i]! + h10 * h * a.v[i]! + h01 * b.r[i]! + h11 * h * b.v[i]!) as unknown as Vec3;
    const v = add(a.v, scale(sub(b.v, a.v), s));
    const sign = a.q[0] * b.q[0] + a.q[1] * b.q[1] + a.q[2] * b.q[2] + a.q[3] * b.q[3] < 0 ? -1 : 1;
    const q = normalize([0, 1, 2, 3].map((i) => a.q[i]! + (sign * b.q[i]! - a.q[i]!) * s) as unknown as Quat);
    return { r, v, q, w: add(a.w, scale(sub(b.w, a.w), s)), down: false };
  }
}

/** The flown reference point, where it lies along the original stack, and its motion. */
export interface ContactPose {
  t: number;
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
  station: number;
  mass: number;
}

/** Rounded collision elements follow each component's station range. A hollow separator can
 * overlap another component's enclosing shape while assembled; those initially nested elements
 * only collide once clear. The mating face is tested separately while its support is aboard. */
interface Hull {
  from: number;
  to: number;
  radius: number;
  offset: Vec3;
  looseOffset: Vec3;
  points: Vec3[];
  loosePoints?: Vec3[];
  stowed?: { until: number; hull: Hull };
  opening?: { inner: number; through: WeakMap<Hull, number> };
  bound: number;
  width: number;
}
const AXIS_ORIGIN: Vec3 = [0, 0, 0];
function hull(from: number, to: number, radius: number, offset: Vec3 = AXIS_ORIGIN, looseOffset: Vec3 = AXIS_ORIGIN): Hull {
  const r = Math.min(radius, (to - from) / 2);
  const span = Math.max(0, to - from - 2 * r);
  const count = r > 0 ? Math.ceil(span / r) : 0;
  const points: Vec3[] = Array.from({ length: count + 1 }, (_, i) => [from + r + (span * i) / (count || 1), 0, 0]);
  // For a shallow drum the length limits the sphere radius. Extend rings across its disc
  // instead of shrinking the entire contact envelope to a ball at its middle.
  const transverse = Math.max(0, radius - r);
  const rings = r > 0 ? Math.ceil(transverse / r) : 0;
  for (let ring = 1; ring <= rings; ring++) {
    const arm = (transverse * ring) / rings;
    const n = Math.ceil((2 * Math.PI * arm) / r);
    for (let j = 0; j < n; j++) {
      const angle = (2 * Math.PI * j) / n;
      points.push([(from + to) / 2, arm * Math.cos(angle), arm * Math.sin(angle)]);
    }
  }
  const bound = Math.hypot(span / 2, transverse) + r;
  return { from, to, radius: r, offset, looseOffset, points, bound, width: radius };
}
function hullOf(d: ShedBody): Hull {
  const radial = d.apart ?? d.sideways;
  const b = ((radial?.bearing ?? 0) * Math.PI) / 180;
  const out: Vec3 = [0, Math.sin(b), -Math.cos(b)];
  const across = radial?.across.value ?? 0;
  if (d.sideways?.sectorDegrees) {
    // Cover the concave sector wall with inscribed rounded meridians, leaving its interior open.
    const radius = Math.min(d.radius.value / 8, (d.to.value - d.from.value) / 2);
    const arm = d.radius.value - radius;
    const half = Math.max(0, (d.sideways.sectorDegrees * Math.PI) / 360 - Math.asin(radius / arm));
    const steps = Math.max(1, Math.ceil((2 * half * arm) / radius));
    const shape = hull(d.from.value, d.to.value, radius, scale(out, across));
    const meridian = shape.points;
    shape.points = [];
    shape.loosePoints = [];
    for (let i = 0; i <= steps; i++) {
      const angle = half * ((2 * i) / steps - 1);
      const y = arm * Math.sin(angle),
        z = arm * Math.cos(angle) - across;
      for (const [x] of meridian) {
        shape.loosePoints.push([x, y, z]);
        shape.points.push([x, -y * Math.cos(b) + z * out[1], -y * Math.sin(b) + z * out[2]]);
      }
    }
    shape.opening = { inner: arm * Math.cos(half) - radius - across, through: new WeakMap() };
    shape.width = Math.hypot(arm * Math.sin(half), arm * Math.cos(half) - across) + radius;
    shape.bound = Math.hypot((d.to.value - d.from.value) / 2, shape.width);
    return shape;
  }
  const shape = hull(d.from.value, d.to.value, Math.min(d.radius.value, (d.sideways?.across.value ?? Infinity) / 2), scale(out, across));
  const stowed = d.sideways?.stowed;
  if (stowed)
    shape.stowed = {
      until: stowed.until.value,
      hull: hull(d.from.value, d.to.value, stowed.radius.value, scale(out, stowed.across.value)),
    };
  return shape;
}
type Hit = ReturnType<typeof contact>;
function firstHit(a: Hit, b: Hit): Hit {
  if (!b) return a;
  return !a || b.after < a.after || (b.after === a.after && b.impulse > a.impulse) ? b : a;
}

interface Sweep {
  start: ContactPose;
  end: ContactPose;
  attached: boolean;
}
function point(p: ContactPose, station: number, offset: Vec3 = AXIS_ORIGIN): Vec3 {
  return add(p.r, turn(p.q, [station - p.station, offset[1], offset[2]]));
}
function element(path: Sweep, station: number, radius: number, offset: Vec3 = AXIS_ORIGIN) {
  return {
    before: point(path.start, station, offset),
    after: point(path.end, station, offset),
    radius,
    mass: path.end.mass,
    velocity: path.end.v,
  };
}
function withinSweep(a: Vec3, b: Vec3, c: Vec3, d: Vec3, radius: number): boolean {
  const sep = sub(a, c);
  const travel = sub(sub(b, d), sep);
  const t = Math.min(1, Math.max(0, -dot(sep, travel) / (dot(travel, travel) || 1)));
  const closest = add(sep, scale(travel, t));
  return dot(closest, closest) <= radius * radius;
}
// A sector can wrap tightly around its payload. While the sector is continuously coming
// out of that original fit, adjacent beads on the rounded proxies must not snag one another.
// Reversing or clearing the payload's projection on the release normal ends that fit.
function opening(a: Sweep, ah: Hull, b: Sweep, bh: Hull, release: number): boolean {
  const fit = bh.opening;
  if (!fit || ah.from >= bh.to || ah.to <= bh.from || Math.abs((fit.through.get(ah) ?? release) - a.start.t) > 1e-7) return false;
  const outward = turn(b.start.q, [0, 0, 1]);
  const station = Math.min(ah.to, Math.max(ah.from, b.start.station));
  const support = element(a, station, ah.width, ah.offset);
  const start = dot(sub(b.start.r, support.before), outward);
  const end = dot(sub(b.end.r, support.after), outward);
  if (start + fit.inner >= ah.width || end < start) return false;
  fit.through.set(ah, a.end.t);
  return true;
}
function hullContact(a: Sweep, ah: Hull, b: Sweep, bh: Hull): Hit {
  if (ah.radius <= 0 || bh.radius <= 0) return null;
  const ao = a.attached ? ah.offset : ah.looseOffset;
  const bo = b.attached ? bh.offset : bh.looseOffset;
  const p = element(a, (ah.from + ah.to) / 2, ah.bound, ao);
  const q = element(b, (bh.from + bh.to) / 2, bh.bound, bo);
  if (!withinSweep(p.before, p.after, q.before, q.after, p.radius + q.radius)) return null;
  const spheres = (h: Hull, s: Sweep, offset: Vec3) =>
    ((s.attached ? undefined : h.loosePoints) ?? h.points).map(([x, y, z]) => element(s, x, h.radius, [0, offset[1] + y, offset[2] + z]));
  const first = spheres(ah, a, ao),
    second = spheres(bh, b, bo);
  if (ah.opening && bh.opening) {
    // Adjacent sectors usually fly away across a separating plane even while their enclosing
    // spheres intersect. Reject the whole pair in linear time along the centroid-to-centroid axis.
    const axis = sub(q.before, p.before);
    let high = -Infinity,
      low = Infinity;
    for (const x of first) high = Math.max(high, dot(sub(x.before, p.before), axis), dot(sub(x.after, p.after), axis));
    for (const y of second) low = Math.min(low, dot(sub(y.before, p.before), axis), dot(sub(y.after, p.after), axis));
    if (low - high > (ah.radius + bh.radius) * length(axis)) return null;
  }
  const gap = sub(ah.offset, bh.offset);
  const sum = ah.radius + bh.radius;
  let hit: Hit = null;
  for (const [i, x] of first.entries())
    for (const [j, y] of second.entries()) {
      if (
        Math.abs(x.before[0] - y.before[0]) > sum + Math.abs(x.after[0] - x.before[0] - (y.after[0] - y.before[0])) ||
        Math.abs(x.before[1] - y.before[1]) > sum + Math.abs(x.after[1] - x.before[1] - (y.after[1] - y.before[1])) ||
        Math.abs(x.before[2] - y.before[2]) > sum + Math.abs(x.after[2] - x.before[2] - (y.after[2] - y.before[2]))
      )
        continue;
      // Don't expel nested rings and their contents on release. A return from outside is swept normally.
      if (length(sub(x.before, y.before)) < sum - 1e-6 && length(add(sub(ah.points[i]!, bh.points[j]!), gap)) < sum - 1e-6) continue;
      hit = firstHit(hit, contact(x, y, a.end.t - a.start.t));
    }
  return hit;
}
function trajectory(run: ShedRun, from: number, to: number): Sweep | null {
  const start = run.at(Math.max(run.from, from));
  const end = run.at(to);
  if (!start || !end || start.down || end.down) return null;
  const { centre: station, mass } = run.shedder.release;
  return { start: { ...start, station, mass, t: from }, end: { ...end, station, mass, t: to }, attached: false };
}

/** Everything one flight has let go, each flown: by the event that let it go. */
export class Sheds {
  private readonly runs = new Map<string, ShedRun>();
  private readonly plan: FlightPlan;
  private readonly site: Geodetic;
  private readonly seaLevel: number;
  private readonly options: ShedOptions;

  private readonly hulls = new Map<string, Hull>();
  private crewHull: Hull | null = null;

  constructor(plan: FlightPlan, site: Geodetic, seaLevel = 0, options: ShedOptions = {}) {
    this.plan = plan;
    this.site = site;
    this.seaLevel = seaLevel;
    this.options = options;
    for (const d of sourceOf(plan).sheds) this.hulls.set(d.on, hullOf(d));
  }

  /** Something has left: it is flown from here on. A second release by the same event is not taken. */
  add(release: Release): ShedRun | undefined {
    const had = this.runs.get(release.on);
    if (had) return had;
    const def = sourceOf(this.plan).sheds.find((d) => d.on === release.on);
    if (!def) return undefined;
    const run = new ShedRun(shedder(this.plan, this.site, this.seaLevel, def, release, this.options));
    this.runs.set(release.on, run);
    return run;
  }

  /** Preserve an earlier stage's entire flight, including contacts before the coast handover. */
  carry(run: ShedRun) {
    this.runs.set(run.shedder.release.on, run);
  }

  /** Take up whatever a vehicle has let go since it was last asked, and fly them all on to its instant. */
  follow(state: { t: number; released: readonly Release[] }): void {
    if (state.released.length > this.runs.size) for (const release of state.released) this.add(release);
    for (const run of this.runs.values()) run.upTo(state.t);
  }

  /** Advance the detached bodies alongside one ballistic cockpit tick, then return the active body's outgoing state. */
  ballistic(vehicle: Vehicle, before: VehicleState, after: VehicleState) {
    for (const release of after.released) this.add(release);
    if (!after.released.length || before.t >= after.t || after.held || after.landing) return { state: after, hits: [], impulses: [] };
    const centre = this.plan.craft[0]!.rigid!.capsule.centre.value;
    const pose = (s: VehicleState): ContactPose => ({ ...s, station: vehicle.mass(s).centre + (s.separation ? centre : 0) });
    const { r, v, hits } = this.meet(pose(before), pose(after), centre);
    return { state: r === after.r ? after : { ...after, r, v }, impulses: hits, hits: [...hits, ...this.siblings(before.t, after.t)] };
  }

  /** The remaining cabin's collision envelope: its entry reference disc between its fittings.
   * Without a nose fitting it is rounded to one diameter. This is collision geometry, independent of the mass datum. */
  private cabin(centre: number): Hull {
    if (this.crewHull) return this.crewHull;
    const craft = this.plan.craft[0]!;
    const area = craft.bodies.find((b) => b.aero)?.aero?.area.value ?? craft.drag[0]!.area.value;
    const radius = Math.sqrt(area / Math.PI);
    const axial = sourceOf(this.plan).sheds.filter((d) => !d.apart && !d.sideways);
    const below = axial
      .filter((d) => d.from.value < centre && (d.centre?.value ?? (d.from.value + d.to.value) / 2) < centre)
      .sort((a, b) => b.from.value - a.from.value)[0];
    const above = axial.filter((d) => d.from.value >= centre).sort((a, b) => a.from.value - b.from.value)[0];
    const base = craft.rigid?.capsule.base ? centre - craft.rigid.capsule.base.value : (below?.to.value ?? centre - radius);
    this.crewHull = hull(base, above?.from.value ?? base + 2 * radius, radius);
    return this.crewHull;
  }

  /** Sweep the actual remaining components against each loose body. The impulse acts on the pair's
   * translation. Spin affects the swept geometry; estimating structural torque would require an
   * active-vehicle inertia tensor through every stage and the hand-flown coast. */
  meet(before: ContactPose, after: ContactPose, capsuleStation: number, only?: string) {
    let r = after.r,
      v = after.v;
    const hits: (Impact & { dv: Vec3 })[] = [];
    const attached = [this.cabin(capsuleStation)];
    for (const [id, h] of this.hulls) {
      const run = this.runs.get(id);
      if (!run || run.from > before.t + 1e-8) attached.push(h.stowed && before.t < h.stowed.until ? h.stowed.hull : h);
    }
    // A conservative sphere round the changing reference point excludes distant releases in one sweep.
    const reach = attached.reduce(
      (long, part) =>
        Math.max(
          long,
          Math.max(
            Math.abs(part.from - before.station),
            Math.abs(part.to - before.station),
            Math.abs(part.from - after.station),
            Math.abs(part.to - after.station),
          ) +
            length(part.offset) +
            part.width,
        ),
      0,
    );
    for (const [on, run] of this.runs) {
      if ((only && on !== only) || before.t < run.from - 1e-8 || after.t <= before.t) continue;
      const gone = trajectory(run, before.t, after.t);
      if (!gone) continue;
      const active: Sweep = { start: before, end: { ...after, r, v }, attached: true };
      const h = this.hulls.get(on)!;
      const span = Math.max(Math.abs(h.from - gone.start.station), Math.abs(h.to - gone.start.station)) + length(h.looseOffset) + h.width;
      if (!withinSweep(before.r, r, gone.start.r, gone.end.r, reach + span)) continue;
      let hit: Hit = null;
      for (const part of attached) {
        if (!opening(active, part, gone, h, run.from)) hit = firstHit(hit, hullContact(active, part, gone, h));
      }
      // The opposite sides of a mating face touch exactly. Preserve their axial (or radial)
      // normal even when the surrounding rounded hulls represent an open ring too coarsely.
      const def = run.shedder.def;
      const radial = def.apart ?? def.sideways;
      const centre = run.shedder.release.centre;
      const sign = centre < capsuleStation ? 1 : -1;
      const face = sign > 0 ? h.to : h.from;
      const radius = Math.min(h.radius, radial ? radial.across.value / 2 : Infinity);
      const activeStation = radial ? centre : face + sign * radius;
      const looseStation = radial ? centre : face - sign * radius;
      const offset = radial ? scale(h.offset, 1 - (2 * radius) / length(h.offset)) : AXIS_ORIGIN;
      const supported = attached.some((other) => {
        const nearest = Math.min(other.to, Math.max(other.from, activeStation));
        return Math.hypot(nearest - activeStation, length(sub(other.offset, offset))) <= other.width;
      });
      if (radius > 0 && supported && !def.sideways?.sectorDegrees) {
        const mate = contact(
          element(active, activeStation, radius, offset),
          element(gone, looseStation, radius, h.looseOffset),
          after.t - before.t,
        );
        hit = firstHit(mate, hit);
      }
      if (!hit) continue;
      r = add(r, hit.a.r);
      v = add(v, hit.a.v);
      run.strike(after.t, hit.b.r, hit.b.v, before.t + hit.after);
      if (hit.impulse > 0) hits.push({ on, name: def.name, t: before.t + hit.after, speed: hit.speed, energy: hit.energy, dv: hit.a.v });
    }
    return { r, v, hits };
  }

  /** One response per loose pair per step, at its earliest contact. */
  siblings(from: number, to: number, local?: ReadonlySet<string>) {
    const runs = this.all.filter((run) => run.from <= from + 1e-8 && (!local || local.has(run.shedder.def.on)));
    const hits: { on: string; name: string; t: number; speed: number; energy: number }[] = [];
    const paths = runs.map((run) => trajectory(run, from, to));
    for (let j = 1; j < runs.length; j++)
      for (let i = 0; i < j; i++) {
        const a = runs[i]!,
          b = runs[j]!;
        const p = paths[i],
          q = paths[j];
        if (!p || !q) continue;
        const da = a.shedder.def,
          db = b.shedder.def;
        const hit = hullContact(p, this.hulls.get(da.on)!, q, this.hulls.get(db.on)!);
        if (!hit) continue;
        a.strike(to, hit.a.r, hit.a.v, from + hit.after);
        b.strike(to, hit.b.r, hit.b.v, from + hit.after);
        paths[i] = trajectory(a, from, to);
        paths[j] = trajectory(b, from, to);
        if (hit.impulse > 0)
          hits.push({
            on: `${da.on}/${db.on}`,
            name: `${da.name} and ${db.name}`,
            t: from + hit.after,
            speed: hit.speed,
            energy: hit.energy,
          });
      }
    return hits;
  }

  /** The body the event `on` let go, if it has. */
  get(on: string | undefined): ShedRun | undefined {
    return on === undefined ? undefined : this.runs.get(on);
  }

  get size(): number {
    return this.runs.size;
  }

  get all(): readonly ShedRun[] {
    return [...this.runs.values()];
  }
}

/**
 * A release from a run of fly.ts, which flies a point and prescribes the attitude: `r` and `v` are that point's at `t`,
 * as the run has them just after the event (so the vehicle has had its share of any push already), and `axis` is the
 * way the long axis (+X, the small end) points then. `riding`: the point is the stack's base; otherwise it is the
 * spacecraft's own centre of mass. Nothing is turning. The liquids are what the flow has left at `t`, shared evenly.
 */
export function recordRelease(plan: FlightPlan, def: ShedBody, t: number, r: Vec3, v: Vec3, axis: Vec3, riding: boolean): Release {
  const b = ballisticOf(plan);
  const body = b.craft.rigid;
  if (!body) throw new Error('this plan has no rigid body: what it sheds cannot be flown');
  const whole = fixedAndFluid(body.parts, NONE);
  const left = b.craft.mass.value - b.flow * Math.min(t, b.cutoff) - whole.fixed;
  const piece = pieceOf(body, def, whole.fluid > 0 ? left / whole.fluid : 0);
  const from = riding ? 0 : body.capsule.centre.value;
  // the spacecraft is ahead of what it leaves behind, and behind what leaves it forward
  const away = piece.centre < body.capsule.centre.value ? 1 : -1;
  const push = def.push?.value ?? 0;
  const side = unit(Math.abs(axis[2]) < 0.9 ? cross([0, 0, 1], axis) : cross([0, 1, 0], axis));
  return {
    on: def.on,
    t,
    r: add(r, scale(axis, piece.centre - from)),
    v: sub(v, scale(axis, away * push)),
    q: fromAxes(axis, side, cross(axis, side)),
    w: [0, 0, 0],
    mass: piece.mass,
    roll: piece.roll,
    across: piece.across,
    centre: piece.centre,
  };
}

/**
 * How a strap-on leaves (`ShedBody.apart`): from `release` as for any shed body (its centre of mass taken on the stack's
 * axis at its station, with that station's velocity and the stack's attitude and rates), moved out to its own axis, turned so that
 * its +Z points away from the stack, and given what its swing gave it. Its lower ties let go, the thrust its engine still
 * gives (`thrust`, N: the stage's tail-off once it has been cut, or what it was burning at if it is let go while it
 * burns) turns it about the ball joint at its tip, tail outward, against the joint's reaction; when it has turned
 * `swing` degrees the ball leaves its socket and it flies on its own with the rate that left it, and the outward and
 * backward speed its centre of mass had going round the joint. The swing itself (about a second) is not flown or drawn:
 * it leaves as it stood, with the swing's rate and speed. Its vent, if it has one, is one of its motors.
 *
 * The same release, whatever the flight: each strap-on on its own bearing, the four of them leaving as a cross.
 */
export function apart(def: ShedBody, release: Release, thrust?: number): Release {
  const radial = def.apart ?? def.sideways;
  if (!radial) return release;
  const along = turn(release.q, X);
  const b = (radial.bearing * Math.PI) / 180;
  const out = unit(turn(release.q, [0, Math.sin(b), -Math.cos(b)]));
  const across = radial.across.value;
  const offset = scale(out, across);
  const r = add(release.r, offset);
  const a = def.apart;
  if (!a) {
    // Keep the velocity of this off-axis point and the inherited spin in the half's own frame.
    const q = fromAxes(along, cross(out, along), out);
    const spin = turn(release.q, release.w);
    return { ...release, r, v: add(add(release.v, cross(spin, offset)), scale(out, def.sideways!.speed.value)), q, w: unturn(q, spin) };
  }
  // the joint, from its centre of mass, and how hard the swing turns it about there
  const arm = add(scale(along, a.pivot.station.value - release.centre), scale(out, a.pivot.across.value - across));
  const pushed = thrust ?? a.tailOff.value;
  const torque = Math.max(0, pushed) * (across - a.pivot.across.value);
  const about = release.across + release.mass * dot(arm, arm);
  const rate = Math.sqrt((2 * torque * ((a.swing.value * Math.PI) / 180)) / about);
  // its own axes: +X the stack's way, +Z out; it turns about +Y, tail outward
  const side = cross(out, along);
  const q = fromAxes(along, side, out);
  const spinning = scale(side, rate);
  const inherited = turn(release.q, release.w);
  const v = add(add(release.v, cross(inherited, scale(out, across))), cross(spinning, scale(arm, -1)));
  return { ...release, r, v, q, w: add(unturn(q, inherited), [0, rate, 0]) };
}
