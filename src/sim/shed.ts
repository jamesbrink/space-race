/**
 * What a vehicle lets go, flown: the tower, the spent booster, the retropack, whatever a flight's
 * `Trajectory.body.sheds` lists. Each is a rigid body of its own from the instant it leaves, in
 * the same frame that does not turn, under the same gravity (fly.ts, with J2), the same air
 * (atmosphere.ts) and the same force model as the vehicle (forces.ts): axial drag by which end
 * leads, the push on its fins, the cross-flow on its side, so it flies end on, weathercocks or
 * tumbles as its shape and its centre of mass say, and a tumble is damped by the air it stirs.
 * A body with a rocket of its own (`motor`) burns it as it leaves. Nothing here knows any flight.
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
 * Something let go standing on the ground stays there. A body that has come down is not
 * integrated again. Its mass does not change: a motor's propellant is not taken off it.
 */
import type { ShedBody, Trajectory } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  dot,
  ecefToGeodetic,
  ecefToInertial,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { airForces, pieceOf, type Release, type Shape, upAt, windAt } from './forces.ts';
import { G0, gravity, MEAN_RADIUS } from './fly.ts';
import { aboutAxis, euler, fixedAndFluid, fromAxes, multiply, normalize, type Quat, spin, turn, unturn } from './rigid.ts';
import { TICK } from './vehicle.ts';

/** Under this dynamic pressure, Pa, the air is left out of a coarse step; and how many ticks such a step is. */
export const LULL = 0.01;
export const COARSE = 5;
/** How often a flown body's state is kept for showing again, s. */
export const KEEP = 0.1;
/** A body that has not come down in this long is not followed further, s. */
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
}

interface Dyn {
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
}

/** One body, ready to be flown from its release. */
export function shedder(
  trajectory: Trajectory,
  site: Geodetic,
  seaLevel: number,
  def: ShedBody,
  release: Release,
  options: ShedOptions = {},
): Shedder {
  const pad = geodeticToEcef(site);
  const padHeight = site.height - seaLevel;
  const floor =
    options.floor ??
    ((latitude: number, longitude: number): number => {
      const here = geodeticToEcef({ latitude, longitude, height: site.height });
      return length(sub(here, pad)) < 1000 ? padHeight : 0;
    });
  const { mass, roll, across, centre } = release;
  const shape: Shape = {
    area: trajectory.area.value,
    ahead: def.ahead.value,
    astern: def.astern.value,
    surfaces: def.surfaces ?? [],
    side: { dragArea: def.side.dragArea.value, from: def.side.from.value, to: def.side.to.value },
  };
  const ends = [def.from.value - centre, def.to.value - centre];
  const motor = def.motor;
  const burn = motor?.burn.value ?? 0;
  const tail = motor?.impulse ? Math.max(0, (2 * (motor.impulse.value - motor.thrust.value * burn)) / motor.thrust.value) : 0;
  const cant = ((motor?.cant?.value ?? 0) * Math.PI) / 180;
  const line: Vec3 = [Math.cos(cant), 0, Math.sin(cant)];
  const thrust = (since: number): number => {
    if (!motor || since < 0) return 0;
    if (since < burn) return motor.thrust.value;
    return tail > 0 ? motor.thrust.value * Math.max(0, 1 - (since - burn) / tail) : 0;
  };

  /** `push`: its rocket's thrust, N, held through a tick at what it is at the tick's middle (so a burn that ends on a tick ends there, not a stage early). */
  const forces = (d: Dyn, at: number, still: boolean, push: number) => {
    const air = windAt(d.r, d.v, at, seaLevel);
    let force: Vec3 = [0, 0, 0];
    let torque: Vec3 = [0, 0, 0];
    if (!still && air.air.density > 0) {
      const f = airForces(shape, centre, unturn(d.q, air.wind), d.w, air.air.density);
      force = turn(d.q, f.force);
      torque = f.torque;
    }
    if (push > 0) force = add(force, turn(d.q, scale(line, push)));
    return { force, torque, air };
  };
  const rate = (d: Dyn, at: number, still: boolean, push: number): Dyn => {
    const f = forces(d, at, still, push);
    return { r: d.v, v: add(gravity(d.r), scale(f.force, 1 / mass)), q: spin(d.q, d.w), w: euler(d.w, f.torque, roll, across) };
  };
  const nudge = (d: Dyn, k: Dyn, h: number): Dyn => ({
    r: add(d.r, scale(k.r, h)),
    v: add(d.v, scale(k.v, h)),
    q: [d.q[0] + k.q[0] * h, d.q[1] + k.q[1] * h, d.q[2] + k.q[2] * h, d.q[3] + k.q[3] * h],
    w: add(d.w, scale(k.w, h)),
  });
  const rk4 = (d: Dyn, at: number, h: number, still: boolean): Dyn => {
    const push = thrust(at + h / 2 - release.t);
    const k1 = rate(d, at, still, push);
    const k2 = rate(nudge(d, k1, h / 2), at + h / 2, still, push);
    const k3 = rate(nudge(d, k2, h / 2), at + h / 2, still, push);
    const k4 = rate(nudge(d, k3, h), at + h, still, push);
    const sum = (a: Vec3, b: Vec3, c: Vec3, e: Vec3): Vec3 => scale(add(add(a, scale(b, 2)), add(scale(c, 2), e)), 1 / 6);
    const next = nudge(
      d,
      {
        r: sum(k1.r, k2.r, k3.r, k4.r),
        v: sum(k1.v, k2.v, k3.v, k4.v),
        q: [0, 1, 2, 3].map((i) => (k1.q[i]! + 2 * k2.q[i]! + 2 * k3.q[i]! + k4.q[i]!) / 6) as unknown as Quat,
        w: sum(k1.w, k2.w, k3.w, k4.w),
      },
      h,
    );
    return { ...next, q: normalize(next.q) };
  };

  const fixed = (r: Vec3, at: number): Vec3 => inertialToEcef(r, EARTH_ROTATION_RATE * at);
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
      vertical: -dot(through, upAt(d.r, at)),
      latitude: here.latitude,
      longitude: here.longitude,
      range: angleBetween(fixed(d.r, at), pad) * MEAN_RADIUS,
    };
  };

  const start = (): ShedState => {
    const d: Dyn = { r: release.r, v: release.v, q: release.q, w: release.w };
    const air = windAt(d.r, d.v, release.t, seaLevel);
    const state: ShedState = { t: release.t, ticks: 0, ...d, apogee: air.altitude, peakQ: air.q, landing: null };
    // let go standing on the ground: it stays where it stands
    if (air.airspeed < 0.5 && thrust(0) <= mass * G0 && clear(d, release.t).by < 0.05) state.landing = landed(d, release.t);
    return state;
  };

  const tick = (s: ShedState): ShedState => {
    if (s.landing) return s;
    const before: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w };
    const air = windAt(s.r, s.v, s.t, seaLevel);
    // above the air, coasting, on the coarse grid: one long step
    const still = air.q < LULL && air.altitude > 100_000 && s.t - release.t >= burn + tail && s.ticks % COARSE === 0;
    const n = still ? COARSE : 1;
    const h = n * TICK;
    const ticks = s.ticks + n;
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
    if (t - release.t > LIMIT) return { ...next, landing: landed(after, t) };
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
  private readonly kept: { t: number; r: Vec3; v: Vec3; q: Quat }[] = [];

  constructor(shedder: Shedder) {
    this.shedder = shedder;
    this.state = shedder.start();
    this.keep();
  }

  private keep(): void {
    const { t, r, v, q } = this.state;
    this.kept.push({ t, r, v, q });
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
    const every = Math.round(KEEP / TICK);
    while (!this.state.landing && this.state.t < t) {
      this.state = this.shedder.tick(this.state);
      if (this.state.landing || this.state.ticks % every === 0) this.keep();
    }
  }

  /** Fly it until it is down, and say where. */
  finish(): ShedLanding {
    this.upTo(Infinity);
    return this.state.landing!;
  }

  /**
   * Where it is at `t` and how it lies, in the frame that does not turn: flown that far if it has not been yet. Between
   * kept states the position is a cubic through both ends' positions and velocities. Once down it stays on the turning
   * Earth where it struck. Null before it left.
   */
  at(t: number): { r: Vec3; v: Vec3; q: Quat; down: boolean } | null {
    if (t < this.from) return null;
    this.upTo(t);
    const kept = this.kept;
    const last = kept[kept.length - 1]!;
    const now = this.state;
    if (now.landing && t >= now.t) {
      // carried round with the ground
      const angle = EARTH_ROTATION_RATE * (t - now.t);
      const r = ecefToInertial(now.r, angle);
      return { r, v: cross(EARTH, r), q: multiply(aboutAxis([0, 0, 1], angle), now.q), down: true };
    }
    if (t >= now.t) return { r: now.r, v: now.v, q: now.q, down: false };
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
    return { r, v, q, down: false };
  }
}

/** Everything one flight has let go, each flown: by the event that let it go. */
export class Sheds {
  private readonly runs = new Map<string, ShedRun>();
  private readonly trajectory: Trajectory;
  private readonly site: Geodetic;
  private readonly seaLevel: number;
  private readonly options: ShedOptions;

  constructor(trajectory: Trajectory, site: Geodetic, seaLevel = 0, options: ShedOptions = {}) {
    this.trajectory = trajectory;
    this.site = site;
    this.seaLevel = seaLevel;
    this.options = options;
  }

  /** Something has left: it is flown from here on. A second release by the same event is not taken. */
  add(release: Release): ShedRun | undefined {
    const had = this.runs.get(release.on);
    if (had) return had;
    const def = this.trajectory.body?.sheds?.find((d) => d.on === release.on);
    if (!def) return undefined;
    const run = new ShedRun(shedder(this.trajectory, this.site, this.seaLevel, def, release, this.options));
    this.runs.set(release.on, run);
    return run;
  }

  /** Take up whatever a vehicle has let go since it was last asked, and fly them all on to its instant. */
  follow(state: { t: number; released: readonly Release[] }): void {
    if (state.released.length > this.runs.size) for (const release of state.released) this.add(release);
    for (const run of this.runs.values()) run.upTo(state.t);
  }

  /** The body the event `on` let go, if it has. */
  get(on: string | undefined): ShedRun | undefined {
    return on === undefined ? undefined : this.runs.get(on);
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
export function recordRelease(trajectory: Trajectory, def: ShedBody, t: number, r: Vec3, v: Vec3, axis: Vec3, riding: boolean): Release {
  const tr = trajectory;
  const body = tr.body;
  if (!body) throw new Error('this trajectory has no `body`: what it sheds cannot be flown');
  const whole = fixedAndFluid(body.parts, NONE);
  const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);
  const left = tr.liftoffMass.value - flow * Math.min(t, tr.engine.cutoff.value) - whole.fixed;
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
