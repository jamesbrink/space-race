/**
 * Looking ahead: where a vehicle goes from the state it is in if nothing more is done than what is already set to
 * happen. One propagator for every vehicle (`propagate`), given the vehicle as a `Flier`: what pushes it at a state
 * (thrust, drag, lift where it is modelled: the same force functions the live vehicle and the batch runs call), what it
 * is scheduled to do next (an engine's cutoff, a separation, a burn's start and end, a parachute filling) and what it
 * does by itself at a height (a parachute let out, an ejection). Gravity is the Earth's with J2 (fly.ts `gravity`, which
 * is world/orbit.ts's), in fly.ts's frame that does not turn (Greenwich on +X at liftoff), the air turning with the
 * Earth. It goes on until it meets the ground, has gone once round the Earth, is told to stop (`Arrival.end`), or runs
 * out of time. Nothing here knows which flight or which kind of vehicle it is, and nothing is drawn: viewer/path.ts
 * draws what this returns. The vehicles there are, and what each supplies, are in sim/fliers.ts.
 *
 * The step is the dynamics' own: an embedded Runge-Kutta pair (Dormand and Prince's fifth order with its fourth for the
 * error, seven evaluations a step) whose step grows and shrinks to keep each step's error within `TOL_R` metres and
 * `TOL_V` metres a second, the same everywhere, under thrust, in orbit, in the air and under a parachute; and no step
 * turns the motion by more than `TURN`, so the cubic between two steps (`between`, what the line and its markers are
 * drawn from) keeps to the integrator's own path. A step ends on every instant the flier has scheduled, so what happens
 * there happens at its instant, and nothing the flier does changes within a step: its configuration is a function of
 * its state between those instants. A height it acts at, and the ground, are found where the step's cubic crosses them
 * and the step is flown again to that instant. Every stage's height is the ellipsoid's own (frames.ts `ecefToGeodetic`:
 * the sea's radius changes by hundreds of metres along a long step, and the air with it).
 *
 * Besides the path it names what happens on it (`events`): what the flier says at each instant and height, and two
 * things of the air worked out on the way, for any vehicle: the first 0.05 g felt coming down once nothing burns and no
 * burn is still to come (fly.ts's mark of entry), and the greatest load felt from there before a parachute is out.
 *
 * The path is returned at instants that do not depend on where the prediction began: multiples of a step that is a
 * power of two seconds, as long as the bend there allows (`gridStep`), each point put on the integrator's own path by
 * the cubic through the states either side of it. Two predictions of the same flight made a moment apart then give the
 * same points, which a line drawn through them shows as stillness, not as a curve whose corners slide along it.
 *
 * `propagate` does the work in slices (`run(budget)`), so a page can spread it over frames; `predict` and `predictor`
 * are a ballistic flight's (sim/fliers.ts `ballistic`) for those who have one.
 */
import type { Trajectory } from '../types';
import { EARTH, EARTH_ROTATION_RATE, WGS84_A } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  type Vec3,
} from '../world/frames.ts';
import { AIR_TOP } from './atmosphere.ts';
import { type BallisticOptions, ballistic } from './fliers.ts';
import { G0, gravity, MEAN_RADIUS, type Phase } from './fly.ts';
import { upAt } from './forces.ts';
import { aboutAxis, turn } from './rigid.ts';

export { AIR_TOP };

/** Where a prediction starts: a `Sample`'s own fields (fly.ts), so any sample will do. `r` is best the centre of mass. */
export interface Start {
  t: number;
  r: Vec3;
  v: Vec3;
  mass: number;
  phase: Phase;
  /** The parachute out at the start as it is (a live state's: still filling, or torn). Without it, one that is out is full and whole. */
  chute?: { full: number; was: number; at: number; fills: number };
}

/** The engine kept burning: the axis the thrust is held along at each instant, in the frame that does not turn, and when it stops. */
export interface Burn {
  axis: (t: number) => Vec3;
  until: number;
}

/**
 * What the vehicle's own sequencer will do from here without the pilot: instants in seconds from
 * liftoff, each left out if it is done already or will not happen. One that is due already happens at once.
 */
export interface Sequence {
  /** The escape tower let go: marked on the path only (a point mass in space feels neither its mass nor its shape). */
  tower?: number;
  /** The spacecraft let go of its booster. */
  separation?: number;
  /** When each retrorocket lights (those not yet burnt out). */
  retro?: number[];
  /** The retrorockets' pack let go. */
  retropack?: number;
  /** Whether the spacecraft lets its parachutes out by itself at their heights. True if not given. */
  chutes?: boolean;
}

export interface PredictOptions extends BallisticOptions {
  /** The longest it looks ahead, s: six hours unless given. */
  limit?: number;
  /** The most points the path is returned as. */
  points?: number;
}

/** A point on the predicted path: when, where and how fast in the frame that does not turn. */
export interface PathPoint {
  t: number;
  r: Vec3;
  v: Vec3;
  /** Height above the sea, m. */
  altitude: number;
}

/** What a flier or the air marks on the path. */
export type EventKind = 'cutoff' | 'tower' | 'separation' | 'retro' | 'burnout' | 'retropack' | 'entry' | 'peak' | 'drogue' | 'main';

/** Something that happens on the path: `value` is the load in g for `entry` and `peak`. */
export interface PathEvent extends PathPoint {
  kind: EventKind;
  value?: number;
}

/** What a flier does at an instant it scheduled, or a height it came down through: what to mark, a new velocity, and whether the path ends there. */
export interface Arrival {
  events?: EventKind[];
  v?: Vec3;
  end?: boolean;
}

/**
 * A vehicle as the one propagator steps it (sim/fliers.ts makes them). It may change only in `arrive` and `settle`: between
 * two of the instants it schedules, what it is (what burns, what is attached, what is out) is fixed, so a step's stages,
 * which may be thrown away, see the same vehicle.
 */
export interface Flier {
  /** 'guided' while it flies a burn it was given to its end (`cutoff`); 'coast' otherwise. */
  readonly kind: 'coast' | 'guided';
  readonly cutoff: number | null;
  /** Everything but gravity on it at a state, m/s^2, in the frame that does not turn: `altitude` is above the sea. */
  push(t: number, r: Vec3, v: Vec3, altitude: number): Vec3;
  /** The next instant after `t` at which it is scheduled to change (Infinity: none). A step ends there. */
  next(t: number): number;
  /** The height above the sea at which it next does something coming down through it (-Infinity: none). */
  below(): number;
  /** What it does at an instant it scheduled (`next`'s, or the start's: what is due already happens at once), or at its height. */
  arrive(t: number, r: Vec3, v: Vec3, altitude: number, by: 'time' | 'height'): Arrival;
  /** After each step: what the state does to it (a shape that gives way as it falls, a parachute torn). */
  settle?(t: number, r: Vec3, v: Vec3, altitude: number, falling: boolean): void;
  /** Whether anything aboard burns now. */
  burning(): boolean;
  /** When the last burn it will make ends (-Infinity: none): the air's marks of a descent are of what follows it. */
  readonly quiet: number;
  /** Whether a parachute is out. */
  readonly chute: boolean;
  /** The ground's height above the sea under a place, m. */
  ground(here: Geodetic): number;
  /** The ball an orbit's heights are quoted over, m: the equatorial radius unless it says. */
  readonly radius?: number;
}

/** The bend a straight piece of the returned path may take, radians, and the shortest piece, m (`gridStep`). */
const BEND = 0.6 * DEG;
const SHORTEST = 30;
/**
 * Each step's error, m and m/s: a millimetre and a hundredth of a millimetre a second, so that a few thousand steps
 * keep the curve within the metre and the centimetre a second a flight that keeps to it is held to (viewer/path.ts).
 */
const TOL_R = 1e-3;
const TOL_V = 1e-5;
/**
 * The most a step may turn the motion, radians: on an orbit the cubic through a step's ends is then within a centimetre
 * of the integrator's path (the cubic's error is r (wh)^4 / 384 for a turn of wh) and a few millimetres a second.
 */
const TURN = 1 * DEG;
/** The shortest step, s: past it a step is taken whatever its error (a corner in the forces). */
const SHORTEST_STEP = 2 ** -10;

/**
 * The step of the returned path at a place where it goes at `speed` and turns at `turning` rad/s: the
 * longest power of two seconds, from a sixteenth to sixteen, over which it turns no more than
 * `bend` (but never a piece shorter than `SHORTEST`), and no longer than `longest`. Powers of two, so a step's multiples are also
 * its half's: where the step changes, the instants of one prediction are still the next one's.
 */
export function gridStep(speed: number, turning: number, bend = BEND, longest = 16): number {
  const want = Math.max(bend / Math.max(turning, 1e-9), SHORTEST / Math.max(speed, 1e-3));
  return 2 ** Math.max(-4, Math.min(Math.log2(longest), Math.floor(Math.log2(want))));
}

/** Where a cubic through two states puts the path at `t` between them (Hermite: each end's place and speed). */
export function between(t0: number, r0: Vec3, v0: Vec3, t1: number, r1: Vec3, v1: Vec3, t: number): { r: Vec3; v: Vec3 } {
  const h = t1 - t0;
  if (!(h > 0)) return { r: r0, v: v0 };
  const s = (t - t0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const [a, b, c, d] = [2 * s3 - 3 * s2 + 1, (s3 - 2 * s2 + s) * h, -2 * s3 + 3 * s2, (s3 - s2) * h];
  // and its slope: the speed there
  const [da, db, dc, dd] = [(6 * s2 - 6 * s) / h, 3 * s2 - 4 * s + 1, (-6 * s2 + 6 * s) / h, 3 * s2 - 2 * s];
  const at = (i: 0 | 1 | 2): number => a * r0[i] + b * v0[i] + c * r1[i] + d * v1[i];
  const slope = (i: 0 | 1 | 2): number => da * r0[i] + db * v0[i] + dc * r1[i] + dd * v1[i];
  return { r: [at(0), at(1), at(2)], v: [slope(0), slope(1), slope(2)] };
}

/**
 * The apsides of any path, found from the path itself and nothing else: where its radial speed (the rate its distance
 * from the Earth's centre changes) changes sign, an apoapsis where it goes from rising to falling, a periapsis the other
 * way, each placed to a millisecond on the cubic between the two points either side (`between`). Whatever the path is
 * (a lob, an ascent, an orbit once round, a fall), what it shows is what it does: a lob has its one apoapsis, an orbit
 * its two, a fall none. Only those after `after`.
 */
export function apsides(
  points: readonly PathPoint[],
  after = Number.NEGATIVE_INFINITY,
): { kind: 'apo' | 'peri'; t: number; r: Vec3; v: Vec3 }[] {
  const out: { kind: 'apo' | 'peri'; t: number; r: Vec3; v: Vec3 }[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (b.t <= after) continue;
    const ra = dot(a.r, a.v);
    const rb = dot(b.r, b.v);
    if (!((ra > 0 && rb <= 0) || (ra < 0 && rb >= 0))) continue;
    let lo = a.t;
    let hi = b.t;
    for (let k = 0; k < 40 && hi - lo > 1e-3; k++) {
      const m = 0.5 * (lo + hi);
      const s = between(a.t, a.r, a.v, b.t, b.r, b.v, m);
      if (Math.sign(dot(s.r, s.v)) === Math.sign(ra)) lo = m;
      else hi = m;
    }
    const t = 0.5 * (lo + hi);
    if (t <= after) continue;
    const s = between(a.t, a.r, a.v, b.t, b.r, b.v, t);
    out.push({ kind: ra > 0 ? 'apo' : 'peri', t, r: s.r, v: s.v });
  }
  return out;
}

/** A place on the path worth naming. */
export interface PathPlace extends PathPoint {
  latitude: number;
  longitude: number;
}

/** An orbit as its osculating elements: the ellipse (or not) that a position and velocity would follow round a point mass. */
export interface Elements {
  /** Semi-major axis, m (negative on a hyperbola), and eccentricity. */
  a: number;
  e: number;
  /** Seconds once round: Infinity if it is not an ellipse. */
  period: number;
  /** Distances from the Earth's centre at the far and near ends, m. */
  apoapsis: number;
  periapsis: number;
  /** The same as heights, m, above a sphere of `radius` (the equatorial radius unless given): the ellipsoid's sea is up to 21 km lower toward the poles. */
  apoapsisHeight: number;
  periapsisHeight: number;
  /** The orbit's tilt to the equator, radians. */
  inclination: number;
}

export interface Prediction {
  kind: 'coast' | 'guided';
  /** The instant it was made from, and when the engine stops on a guided one. */
  from: number;
  cutoff: number | null;
  points: PathPoint[];
  /**
   * How it ends: `impact` at the ground (or where the flier stops it, as the spacecraft's at the height its pilot left
   * at); `orbit`, once round without meeting it; `limit`, still going when the time ran out; `none`, standing on the
   * ground with nothing to predict.
   */
  outcome: 'impact' | 'orbit' | 'limit' | 'none';
  /** The greatest height ahead: null if it is already coming down (and has no orbit to go round). */
  apogee: PathPlace | null;
  /** The least height, on an orbit. */
  perigee: PathPlace | null;
  /** Where and when it meets the surface: the distance over the ground from the pad, m, and how fast it is coming down there, m/s (fly.ts's `landingSpeed`: the wind's carrying it along is not in it). */
  impact: (PathPlace & { range: number; speed: number }) | null;
  /** The orbit, when it is one: the elements at the start, which J2 and the air then change a little. */
  orbit: Elements | null;
  /** What happens on the way, in order of time (`PathEvent`). */
  events: PathEvent[];
  /** Whether a parachute is out where it ends. */
  chute: boolean;
  /** What working it out took: steps of the integrator, and milliseconds. */
  steps: number;
  cost: number;
}

export interface Predictor {
  /** Work for about `budget` milliseconds (all of it, if none is given). True when it is done. */
  run(budget?: number): boolean;
  readonly done: boolean;
  /** The answer: only once done. */
  readonly result: Prediction;
}

/** The osculating elements of a position and velocity in the frame that does not turn. */
export function elements(r: Vec3, v: Vec3, radius = WGS84_A): Elements {
  const mu = EARTH.gm.value;
  const d = length(r);
  const a = -mu / (dot(v, v) - (2 * mu) / d);
  const h = cross(r, v);
  const e = length(sub(scale(cross(v, h), 1 / mu), scale(r, 1 / d)));
  const closed = e < 1 && a > 0;
  const apoapsis = closed ? a * (1 + e) : Infinity;
  const periapsis = a * (1 - e);
  return {
    a,
    e,
    period: closed ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity,
    apoapsis,
    periapsis,
    apoapsisHeight: apoapsis - radius,
    periapsisHeight: periapsis - radius,
    inclination: Math.acos(Math.max(-1, Math.min(1, h[2] / length(h)))),
  };
}

/**
 * The axis guidance holds at `t`: the tilt programme's, leaned by a pilot's trim (radians: `pitch`
 * further downrange, `yaw` to the left of the azimuth). The same turn autopilot.ts gives its
 * platform; `vehicle` is a `Vehicle`, or anything with its programme and launch axes.
 */
export function programmeAxis(
  vehicle: { programme(t: number): Vec3; launch: { downrange: Vec3; left: Vec3 } },
  t: number,
  trim?: { pitch: number; yaw: number },
): Vec3 {
  const axis = vehicle.programme(t);
  if (!trim || (trim.pitch === 0 && trim.yaw === 0)) return axis;
  return turn(aboutAxis(scale(vehicle.launch.downrange, -1), trim.yaw), turn(aboutAxis(vehicle.launch.left, trim.pitch), axis));
}

const SPIN: Vec3 = [0, 0, EARTH_ROTATION_RATE];
const now = (): number => performance.now();

/** Dormand and Prince's pair: the stages' instants, their weights, the fifth-order solution's, and its difference from the fourth's. */
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A: number[][] = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const E = [71 / 57600, 0, -71 / 16695, 71 / 1920, -17253 / 339200, 22 / 525, -1 / 40];

/** Where the path is measured from: the pad, and the sea's height above the ellipsoid there. */
export interface Ground {
  site: Geodetic;
  seaLevel: number;
}

/**
 * A prediction to be worked out in slices: `flier` from `start` (its place and velocity at an instant, in fly.ts's frame).
 * `site` is where ranges are measured from; `seaLevel` the sea's height above the ellipsoid.
 */
export function propagate(
  flier: Flier,
  start: { t: number; r: Vec3; v: Vec3 },
  where: Ground,
  options: { limit?: number; points?: number } = {},
): Predictor {
  const { site, seaLevel } = where;
  const pad = geodeticToEcef(site);
  const limit = options.limit ?? 6 * 3600;
  const most = Math.max(8, options.points ?? 480);

  let t = start.t;
  let r = start.r;
  let v = start.v;
  const fixed = (p: Vec3, at: number): Vec3 => inertialToEcef(p, EARTH_ROTATION_RATE * at);
  const place = (p: Vec3, at: number): Geodetic => ecefToGeodetic(fixed(p, at));

  // (the stages of a step: positions and velocities, and the accelerations at them)
  const kr: Vec3[] = new Array(7);
  const kv: Vec3[] = new Array(7);
  let pushed = 0;
  const accel = (at: number, p: Vec3, u: Vec3, altitude: number): Vec3 => {
    const f = flier.push(at, p, u, altitude);
    pushed = length(f);
    return add(gravity(p), f);
  };
  /** One step of the pair from the state now: the state `h` on, and its error in place and speed. */
  const pair = (h: number, first: Vec3): { r: Vec3; v: Vec3; er: number; ev: number } => {
    kr[0] = v;
    kv[0] = first;
    let r1: Vec3 = r;
    let v1: Vec3 = v;
    for (let i = 1; i < 7; i++) {
      let pr0 = r[0];
      let pr1 = r[1];
      let pr2 = r[2];
      let pv0 = v[0];
      let pv1 = v[1];
      let pv2 = v[2];
      const a = A[i]!;
      for (let j = 0; j < i; j++) {
        const w = a[j]! * h;
        if (w === 0) continue;
        const x = kr[j]!;
        const y = kv[j]!;
        pr0 += w * x[0];
        pr1 += w * x[1];
        pr2 += w * x[2];
        pv0 += w * y[0];
        pv1 += w * y[1];
        pv2 += w * y[2];
      }
      const p: Vec3 = [pr0, pr1, pr2];
      const u: Vec3 = [pv0, pv1, pv2];
      if (i === 6) {
        r1 = p;
        v1 = u;
      }
      kr[i] = u;
      kv[i] = accel(t + C[i]! * h, p, u, ecefToGeodetic(p).height - seaLevel);
    }
    let er0 = 0;
    let er1 = 0;
    let er2 = 0;
    let ev0 = 0;
    let ev1 = 0;
    let ev2 = 0;
    for (let j = 0; j < 7; j++) {
      const w = E[j]! * h;
      if (w === 0) continue;
      er0 += w * kr[j]![0];
      er1 += w * kr[j]![1];
      er2 += w * kr[j]![2];
      ev0 += w * kv[j]![0];
      ev1 += w * kv[j]![1];
      ev2 += w * kv[j]![2];
    }
    return { r: r1, v: v1, er: Math.hypot(er0, er1, er2), ev: Math.hypot(ev0, ev1, ev2) };
  };

  const first = place(r, t);
  let altitude = first.height - seaLevel;
  /** The path as the integrator steps it: every step's state. */
  const points: PathPoint[] = [{ t, r, v, altitude }];
  /** The turning points of the height ahead, each fitted through the three points round it. */
  const tops: PathPlace[] = [];
  const bottoms: PathPlace[] = [];
  const events: PathEvent[] = [];
  const note = (kind: EventKind, value?: number, at: PathPoint = { t, r, v, altitude }): void => {
    events.push({ kind, t: at.t, r: at.r, v: at.v, altitude: at.altitude, ...(value !== undefined ? { value } : {}) });
  };
  /** What the flier does at an instant or a height now reached. */
  const arrive = (by: 'time' | 'height'): boolean => {
    const a = flier.arrive(t, r, v, altitude, by);
    for (const k of a.events ?? []) note(k);
    if (a.v) {
      v = a.v;
      points.push({ t, r, v, altitude });
    }
    return a.end === true;
  };
  let entry = false;
  let peak: (PathPoint & { load: number }) | null = null;
  let swept = 0;
  let steps = 0;
  let cost = 0;
  let done = false;
  let outcome: Prediction['outcome'] = 'limit';
  let impact: Prediction['impact'] = null;
  let h = 1;

  /** Where the height turns, from the last three points: the vertex of the parabola through them. */
  const turning = (): PathPlace | null => {
    const [a, b, c] = points.slice(-3) as [PathPoint, PathPoint, PathPoint];
    const [x1, x2] = [a.t - b.t, c.t - b.t];
    const [y1, y2] = [a.altitude - b.altitude, c.altitude - b.altitude];
    const bend = (y1 * x2 - y2 * x1) / (x1 * x2 * (x1 - x2));
    if (!Number.isFinite(bend) || bend === 0) return null;
    const slope = (y2 * x1 * x1 - y1 * x2 * x2) / (x1 * x2 * (x1 - x2));
    const x = Math.max(x1, Math.min(x2, -slope / (2 * bend)));
    // the place then: the same three points, each coordinate along its own parabola
    const through = (i: 0 | 1 | 2, of: (p: PathPoint) => Vec3): number => {
      const [p1, p2] = [of(a)[i] - of(b)[i], of(c)[i] - of(b)[i]];
      const k2 = (p1 * x2 - p2 * x1) / (x1 * x2 * (x1 - x2));
      const k1 = (p2 * x1 * x1 - p1 * x2 * x2) / (x1 * x2 * (x1 - x2));
      return of(b)[i] + k1 * x + k2 * x * x;
    };
    const at = b.t + x;
    const where: Vec3 = [through(0, (p) => p.r), through(1, (p) => p.r), through(2, (p) => p.r)];
    const speed: Vec3 = [through(0, (p) => p.v), through(1, (p) => p.v), through(2, (p) => p.v)];
    const g = place(where, at);
    return { t: at, r: where, v: speed, altitude: g.height - seaLevel, latitude: g.latitude, longitude: g.longitude };
  };

  const end = (): void => {
    const g = place(r, t);
    impact = {
      t,
      r,
      v,
      altitude,
      latitude: g.latitude,
      longitude: g.longitude,
      range: angleBetween(fixed(r, t), pad) * MEAN_RADIUS,
      speed: -dot(sub(v, cross(SPIN, r)), upAt(r, t)),
    };
    outcome = 'impact';
    done = true;
  };

  // what is due already happens now
  if (arrive('time')) {
    points.length = 1;
    end();
  }
  // Standing on the ground with nothing burning: there is nothing to say. (`r` is a centre of mass, which on a stack is
  // metres above what it stands on: at rest over the ground within a vehicle's height of it is taken as standing.)
  if (!done && !flier.burning() && altitude <= flier.ground(first) + 60 && length(sub(v, cross(SPIN, r))) < 0.05) {
    outcome = 'none';
    done = true;
  }

  /** Back along the step just taken (from `before`, `h0` long, ending at the state now) to where its cubic is at height `at`, flown again to there. */
  const back = (before: PathPoint, h0: number, at: number): void => {
    const d0 = length(before.r) - before.altitude;
    const height = (s: number): number => length(between(before.t, before.r, before.v, before.t + h0, r, v, s).r) - d0;
    let lo = before.t;
    let hi = before.t + h0;
    if (before.altitude <= at) hi = lo;
    for (let k = 0; k < 50 && hi - lo > 1e-4; k++) {
      const m = 0.5 * (lo + hi);
      if (height(m) > at) lo = m;
      else hi = m;
    }
    const to = 0.5 * (lo + hi) - before.t;
    [t, r, v, altitude] = [before.t, before.r, before.v, before.altitude];
    if (to > 1e-9) {
      const s = pair(to, accel(t, r, v, altitude));
      t = before.t + to;
      r = s.r;
      v = s.v;
    }
    altitude = place(r, t).height - seaLevel;
    points.pop();
    if (to > 1e-9) points.push({ t, r, v, altitude });
  };

  const advance = (): void => {
    const a0 = accel(t, r, v, altitude);
    const load = pushed / G0;
    // the longest step: what turns the motion by `TURN`, and never past what the flier has scheduled
    const speed = length(v);
    const turnRate = speed > 0 ? length(cross(v, a0)) / (speed * speed) : 0;
    const longest = Math.max(TURN / Math.max(turnRate, 1e-12), SHORTEST / Math.max(speed, 1e-3));
    const mark = flier.next(t);
    let step = Math.min(h, longest);
    let reaches = false;
    if (mark - t <= step * (1 + 1e-9)) {
      step = mark - t;
      reaches = true;
    }
    let next = pair(step, a0);
    let err = Math.max(next.er / TOL_R, next.ev / TOL_V);
    // (too much error: shorter, until it is within, or as short as a step goes)
    while (err > 1 && step > SHORTEST_STEP) {
      step = Math.max(SHORTEST_STEP, step * Math.max(0.2, 0.9 * err ** -0.2));
      reaches = false;
      next = pair(step, a0);
      err = Math.max(next.er / TOL_R, next.ev / TOL_V);
    }
    // the next step: as long as this one's error allows (one cut short to end on an instant does not shorten the next)
    const grown = Math.max(SHORTEST_STEP, step * (err > 0 ? Math.min(4, 0.9 * err ** -0.2) : 4));
    h = reaches && step < h ? Math.max(h, grown) : grown;
    const before: PathPoint = { t, r, v, altitude };
    const turned = angleBetween(r, next.r);
    t = reaches ? mark : t + step;
    r = next.r;
    v = next.v;
    const here = place(r, t);
    altitude = here.height - seaLevel;
    steps++;
    const falling = altitude < before.altitude;
    points.push({ t, r, v, altitude });

    // the air's load coming down, once nothing burns and no burn is to come, and before a parachute is out: the first 0.05 g, and the most
    if (falling && !flier.chute && before.t >= flier.quiet && !flier.burning()) {
      if (!entry && load >= 0.05) {
        entry = true;
        note('entry', load, before);
      }
      if (entry && (!peak || load > peak.load)) peak = { ...before, load };
    }
    flier.settle?.(t, r, v, altitude, falling);

    // what it does at a height coming down through it, and the ground, each where the step's cubic crosses it (and the
    // step ends there, short of any instant it was to reach)
    const ground = flier.ground(here);
    const at = flier.below();
    if (falling && at > ground && altitude <= at) {
      back(before, t - before.t, at);
      if (arrive('height')) end();
      return;
    }
    if (falling && altitude <= ground) {
      back(before, t - before.t, ground);
      end();
      return;
    }
    if (reaches && arrive('time')) {
      end();
      return;
    }

    if (swept + turned >= 2 * Math.PI) {
      // once round: the path ends where it began to repeat
      const part = turned > 0 ? (2 * Math.PI - swept) / turned : 1;
      const at = before.t + (t - before.t) * part;
      const close = between(before.t, before.r, before.v, t, r, v, at);
      while (points.length > 1 && points[points.length - 1]!.t > before.t) points.pop();
      points.push({ t: at, r: close.r, v: close.v, altitude: before.altitude + (altitude - before.altitude) * part });
      outcome = 'orbit';
      done = true;
      return;
    }
    swept += turned;

    if (points.length >= 3) {
      const [a, b, c] = points.slice(-3) as [PathPoint, PathPoint, PathPoint];
      if (b.altitude >= a.altitude && b.altitude > c.altitude) {
        const top = turning();
        if (top) tops.push(top);
      } else if (b.altitude <= a.altitude && b.altitude < c.altitude) {
        const bottom = turning();
        if (bottom) bottoms.push(bottom);
      }
    }
    if (t - start.t >= limit || steps >= 60_000) done = true;
  };

  /**
   * The path at instants of its own (`gridStep`): its first and last points as the integrator has them, and between
   * them every multiple of the step that the bend there allows, at most `most` in all (the bend allowed is doubled until
   * they fit, and past a tenth of a radian the longest step too).
   */
  const sampled = (): PathPoint[] => {
    const at = (bend: number, longest: number): PathPoint[] | null => {
      const out: PathPoint[] = [points[0]!];
      let last = points[0]!.t;
      for (let i = 0; i + 1 < points.length; i++) {
        const a = points[i]!;
        const b = points[i + 1]!;
        const h = b.t - a.t;
        if (!(h > 0)) continue;
        const speed = length(a.v);
        const ahead = speed > 0 ? scale(a.v, 1 / speed) : null;
        const pull = scale(sub(b.v, a.v), 1 / h);
        const across = ahead ? sub(pull, scale(ahead, dot(pull, ahead))) : pull;
        const step = gridStep(speed, length(across) / Math.max(speed, 1e-3), bend, longest);
        for (let g = (Math.floor(last / step + 1e-9) + 1) * step; g < b.t - 1e-6; g += step) {
          if (g < a.t - 1e-9) continue;
          const p = between(a.t, a.r, a.v, b.t, b.r, b.v, g);
          out.push({ t: g, r: p.r, v: p.v, altitude: a.altitude + ((b.altitude - a.altitude) * (g - a.t)) / h });
          last = g;
          if (out.length >= most) return null;
        }
      }
      if (points.length > 1) out.push(points[points.length - 1]!);
      return out;
    };
    // (a long path that will not fit at the longest step is given longer ones: an orbit of hours in 480 points)
    for (let bend = BEND, longest = 16; ; bend *= 2, longest *= bend > 0.2 ? 2 : 1) {
      const out = at(bend, longest);
      if (out) return out;
    }
  };

  let answer: Prediction | null = null;
  const finish = (): Prediction => {
    const orbit = outcome === 'orbit';
    const last = (): PathPlace => {
      const p = points[points.length - 1]!;
      const g = place(p.r, p.t);
      return { ...p, latitude: g.latitude, longitude: g.longitude };
    };
    const best = (list: PathPlace[], sign: number): PathPlace | null =>
      list.reduce<PathPlace | null>((b, p) => (!b || sign * (p.altitude - b.altitude) > 0 ? p : b), null);
    if (peak) {
      const { load, ...at } = peak;
      note('peak', load, at);
    }
    events.sort((a, b) => a.t - b.t);
    const el = elements(start.r, start.v, flier.radius);
    return {
      kind: flier.kind,
      from: start.t,
      cutoff: flier.cutoff,
      points: outcome === 'none' ? points : sampled(),
      outcome,
      // going round, the highest and lowest of the whole turn; otherwise the top of the climb ahead, if there is one
      // (a turn begun at one end of the orbit comes back to that end as its last point, which is then no turning point of the path)
      apogee: orbit ? best([...tops, last()], 1) : (tops[0] ?? null),
      perigee: orbit ? best([...bottoms, last()], -1) : null,
      impact,
      orbit: orbit ? el : null,
      events,
      chute: flier.chute,
      steps,
      cost,
    };
  };

  return {
    run(budget) {
      if (answer) return true;
      const began = now();
      while (!done) {
        advance();
        if (budget !== undefined && now() - began >= budget) break;
      }
      if (done) answer = finish();
      cost += now() - began;
      if (answer) answer.cost = cost;
      return done;
    },
    get done() {
      return answer !== null;
    },
    get result() {
      if (!answer) throw new Error('the prediction is not finished: run() it until it says so');
      return answer;
    },
  };
}

/** A ballistic flight's prediction to be worked out in slices (sim/fliers.ts `ballistic`). `site` and `seaLevel` as in fly.ts. */
export function predictor(trajectory: Trajectory, site: Geodetic, seaLevel: number, start: Start, options: PredictOptions = {}): Predictor {
  return propagate(ballistic(trajectory, site, seaLevel, start, options), start, { site, seaLevel }, options);
}

/** A ballistic flight's prediction, worked out at once. */
export function predict(trajectory: Trajectory, site: Geodetic, seaLevel: number, start: Start, options: PredictOptions = {}): Prediction {
  const p = predictor(trajectory, site, seaLevel, start, options);
  p.run();
  return p.result;
}
