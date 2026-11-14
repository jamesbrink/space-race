/**
 * Looking ahead: where a vehicle goes from the state it is in if nothing more is done. The same
 * Newtonian flight as fly.ts (its gravity with J2, its air, its drag curves, in the same frame
 * that does not turn), started from any instant and carried on until it meets the sea, has gone
 * once round the Earth, or runs out of time. Nothing here knows which flight it is, and nothing is
 * drawn: viewer/path.ts draws what this returns.
 *
 * Two answers.
 *   coast    "if the engine stopped now": no thrust. What is flying keeps its drag (the stack's
 *            going up; the spacecraft's, heat shield first, once it is alone) and a spacecraft
 *            alone lets its parachutes out at their heights coming down, as the live simulator
 *            does without being asked.
 *   guided   `burn` given: the engine burns on to `burn.until` with the thrust along `burn.axis`
 *            (the tilt programme, with a pilot's trim: `programmeAxis`), then coasts as above.
 *            The attitude is prescribed, as fly.ts's is: the rigid body and its autopilot are not
 *            stepped (a tick of vehicle.ts costs 0.13 ms and there are 14,000 to cutoff), so the
 *            platform's lag behind its programme, under a degree, is left out.
 *
 * "Nothing more is done" is by the pilot. What the vehicle's sequencer will do by itself at the
 * record's times is given as `sequence` (the caller knows whether it is switched on and what is
 * already done): the spacecraft let go of its booster, with separation's push along its motion;
 * the retrorockets, each against the motion over the ground and pitched below the level as fly.ts
 * has them; the pack's going; and whether the parachutes come out by themselves at all. Without it
 * nothing of the kind happens, and a spacecraft alone still lets its parachutes out.
 *
 * Besides the path it names what happens on it (`events`): each event of the sequence, the engine's
 * cutoff on a guided one, the parachutes, and two things of the air worked out on the way: the
 * first 0.05 g of the descent once the retrorockets are done (fly.ts's mark of entry) and the
 * greatest load felt coming down before a parachute is out.
 *
 * The path is returned at instants that do not depend on where the prediction began: multiples of
 * a step that is a power of two seconds, as long as the bend there allows (`gridStep`), each point
 * put on the integrator's own path by the cubic through the states either side of it. Two
 * predictions of the same flight made a moment apart then give the same points, which a line drawn
 * through them shows as stillness, not as a curve whose corners slide along it.
 *
 * A point mass under gravity and drag along its motion through air that turns with the Earth:
 * no lift, no wind. Fourth-order Runge-Kutta with a step that follows what is happening: ten
 * seconds in space, down to a twentieth of a second where the air changes the speed quickly
 * (half the time drag takes to matter, and never more than 2 km of height in a step). Height is
 * worked out once a step and carried through its stages by the change in distance from the
 * Earth's centre. Above `AIR_TOP` there is no drag: at 200 km it is under a ten-thousandth of
 * a millimetre a second squared on a spacecraft.
 *
 * `predictor` does the work in slices (`run(budget)`), so a page can spread it over frames;
 * `predict` runs one to the end.
 */
import type { Trajectory } from '../types';
import { EARTH, EARTH_ROTATION_RATE, WGS84_A } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  dot,
  ecefToGeodetic,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { atmosphere } from './atmosphere.ts';
import { chuteArea, dragArea, G0, gravity, MEAN_RADIUS, type Phase, thrustIn } from './fly.ts';
import { blowing, blowOf, upAt } from './forces.ts';
import { aboutAxis, turn } from './rigid.ts';

/** Above this height, m, the air is left out. */
export const AIR_TOP = 200_000;

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
 * liftoff, each left out if it is done already or will not happen.
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

export interface PredictOptions {
  burn?: Burn;
  /** What the sequencer does from here (above): without it, nothing but the parachutes of a spacecraft alone. */
  sequence?: Sequence;
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

/** Something that happens on the path: `value` is the load in g for `entry` and `peak`. */
export interface PathEvent extends PathPoint {
  kind: 'cutoff' | 'tower' | 'separation' | 'retro' | 'retropack' | 'entry' | 'peak' | 'drogue' | 'main';
  value?: number;
}

/** The bend a straight piece of the returned path may take, radians, and the shortest piece, m (`gridStep`). */
const BEND = 0.6 * (Math.PI / 180);
const SHORTEST = 30;

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
   * How it ends: `impact` at the sea (or the pad's own level within a kilometre of it); `orbit`,
   * once round without meeting it; `limit`, still going when the time ran out; `none`, standing
   * on the ground with nothing to predict.
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

/** A prediction to be worked out in slices. `site` and `seaLevel` as in fly.ts: where the pad is, and the sea's height above the ellipsoid. */
export function predictor(trajectory: Trajectory, site: Geodetic, seaLevel: number, start: Start, options: PredictOptions = {}): Predictor {
  const tr = trajectory;
  const pad = geodeticToEcef(site);
  const padHeight = site.height - seaLevel;
  // (through the day's wind, as the flight itself is flown)
  const blow = blowOf(tr.winds);
  const limit = options.limit ?? 6 * 3600;
  const most = Math.max(8, options.points ?? 480);
  const burn = options.burn && start.t < options.burn.until ? options.burn : null;
  const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);

  // what the sequencer does from here: each instant at or after the start (one that is late happens at once)
  const seq = options.sequence ?? null;
  const chutes = seq?.chutes ?? true;
  const ahead = (x: number | undefined): number | null => (x !== undefined && Number.isFinite(x) ? Math.max(x, start.t) : null);
  const towerAt = ahead(seq?.tower);
  const separationAt = ahead(seq?.separation);
  const packAt = ahead(seq?.retropack);
  const retroBurn = tr.retro.burn.value;
  const fires = (seq?.retro ?? []).filter((f) => f + retroBurn > start.t && (packAt === null || f < packAt));
  const retroEnd = fires.length ? Math.max(...fires.map((f) => f + retroBurn)) : Number.NEGATIVE_INFINITY;
  /** The instants a step must end on, in order: something changes there. */
  const marks = [
    ...new Set(
      [burn?.until, towerAt, separationAt, packAt, ...fires, ...fires.map((f) => f + retroBurn)].filter(
        (x): x is number => x !== undefined && x !== null && x > start.t,
      ),
    ),
  ].sort((a, b) => a - b);
  let markAt = 0;
  /** How many retrorockets burn at `at` (none once the pack has gone). */
  const lit = (at: number): number => {
    if (packAt !== null && at >= packAt) return 0;
    let n = 0;
    for (const f of fires) if (at >= f && at < f + retroBurn) n++;
    return n;
  };

  let t = start.t;
  let r = start.r;
  let v = start.v;
  let mass = start.mass;
  let burning = burn !== null;
  // what the air sees: the stack (or the spacecraft with its tower on), nose first; or the spacecraft alone, with whatever parachute is out
  let riding = start.phase === 'powered' || start.phase === 'coast' || start.phase === 'escape';
  let alone = start.phase !== 'powered' && start.phase !== 'coast';
  let chute = { full: 0, was: 0, at: 0, fills: 1 };
  let drogue = start.phase === 'drogue' || start.phase === 'main';
  let main = start.phase === 'main';
  if (main) chute = start.chute ?? { full: tr.main.dragArea.value, was: tr.main.dragArea.value, at: t, fills: 1 };
  else if (drogue) chute = start.chute ?? { full: tr.drogue.dragArea.value, was: tr.drogue.dragArea.value, at: t, fills: 1 };
  // what the parachutes can take (vehicle.ts `worn`): one that is out tears in more air than its cloth or its lines hold
  const limits = tr.body?.limits ?? null;
  // (one that is out at the start with nothing said of how far it has filled is taken as it is and held to nothing: full at once
  // in the air it was let out in, it would be torn by a pull it never had)
  let torn = start.chute
    ? (main && chute.full < tr.main.dragArea.value) || (drogue && !main && chute.full < tr.drogue.dragArea.value)
    : drogue || main;

  const fixed = (p: Vec3, at: number): Vec3 => inertialToEcef(p, EARTH_ROTATION_RATE * at);
  const place = (p: Vec3, at: number): Geodetic => ecefToGeodetic(fixed(p, at));
  /** The ground's height above the sea under a place (vehicle.ts's): the pad's own level within a kilometre of it, the sea beyond. */
  const floor = (here: Geodetic): number =>
    padHeight !== 0 && length(sub(geodeticToEcef({ latitude: here.latitude, longitude: here.longitude, height: site.height }), pad)) < 1000
      ? padHeight
      : 0;

  /** The dynamic pressure at a state, Pa. */
  const pressure = (p: Vec3, u: Vec3, at: number, altitude: number): number => {
    const over = sub(u, cross(SPIN, p));
    const wind = blow ? sub(over, blowing(blow, place(p, at), altitude, at)) : over;
    return 0.5 * atmosphere(altitude).density * dot(wind, wind);
  };
  /** The acceleration at a state; how quickly drag is changing the speed there (1/s); and what is felt there, m/s² (all but gravity). */
  let stiff = 0;
  let felt = 0;
  const rate = (p: Vec3, u: Vec3, at: number, altitude: number, m: number): Vec3 => {
    const g = gravity(p);
    let a = g;
    stiff = 0;
    const air = altitude < AIR_TOP || burning ? atmosphere(altitude) : null;
    if (air && altitude < AIR_TOP) {
      const over = sub(u, cross(SPIN, p));
      const wind = blow ? sub(over, blowing(blow, place(p, at), altitude, at)) : over;
      const speed = length(wind);
      if (speed > 0) {
        const area = dragArea(tr, riding, speed / air.soundSpeed) + (riding ? 0 : chuteArea(chute, at));
        const k = (0.5 * air.density * speed * area) / m;
        stiff = k;
        a = add(a, scale(wind, -k));
      }
    }
    if (burning && burn) a = add(a, scale(burn.axis(at), thrustIn(tr, air ? air.pressure : 0) / m));
    const n = fires.length ? lit(at) : 0;
    if (n > 0) {
      // each retrorocket against the motion over the ground, pitched below the level (fly.ts)
      const up = upAt(p, at);
      const wind = sub(u, cross(SPIN, p));
      const level = sub(wind, scale(up, dot(wind, up)));
      const across = length(level);
      if (across > 0) {
        const pitch = tr.retro.pitch.value * (Math.PI / 180);
        const push = sub(scale(level, -Math.cos(pitch) / across), scale(up, Math.sin(pitch)));
        a = add(a, scale(push, (n * tr.retro.thrust.value) / m));
      }
    }
    felt = length(sub(a, g));
    return a;
  };
  const massAt = (at: number): number => (burning ? mass - flow * (at - t) : mass);
  const rk4 = (h: number, altitude: number): { r: Vec3; v: Vec3 } => {
    const d0 = length(r);
    const high = (p: Vec3): number => altitude + length(p) - d0;
    const at = (a: Vec3, b: Vec3, k: number): Vec3 => add(a, scale(b, k));
    const k1v = rate(r, v, t, altitude, mass);
    const r2 = at(r, v, h / 2);
    const v2 = at(v, k1v, h / 2);
    const k2v = rate(r2, v2, t + h / 2, high(r2), massAt(t + h / 2));
    const r3 = at(r, v2, h / 2);
    const v3 = at(v, k2v, h / 2);
    const k3v = rate(r3, v3, t + h / 2, high(r3), massAt(t + h / 2));
    const r4 = at(r, v3, h);
    const v4 = at(v, k3v, h);
    const k4v = rate(r4, v4, t + h, high(r4), massAt(t + h));
    return {
      r: at(r, add(add(v, scale(v2, 2)), add(scale(v3, 2), v4)), h / 6),
      v: at(v, add(add(k1v, scale(k2v, 2)), add(scale(k3v, 2), k4v)), h / 6),
    };
  };

  const first = place(r, t);
  let here = first;
  let altitude = first.height - seaLevel;
  /** The path as the integrator steps it: every step's state. */
  const points: PathPoint[] = [{ t, r, v, altitude }];
  /** The turning points of the height ahead, each fitted through the three points round it. */
  const tops: PathPlace[] = [];
  const bottoms: PathPlace[] = [];
  const events: PathEvent[] = [];
  const note = (kind: PathEvent['kind'], value?: number, at: PathPoint = { t, r, v, altitude }): void => {
    events.push({ kind, t: at.t, r: at.r, v: at.v, altitude: at.altitude, ...(value !== undefined ? { value } : {}) });
  };
  let entry = false;
  let peak: (PathPoint & { load: number }) | null = null;
  let swept = 0;
  let steps = 0;
  let cost = 0;
  let done = false;
  let outcome: Prediction['outcome'] = 'limit';
  let impact: Prediction['impact'] = null;

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

  // Standing on the ground, engine off: there is nothing to say. (`r` is a centre of mass, which on a stack is metres
  // above what it stands on: at rest over the ground within a vehicle's height of it is taken as standing.)
  if (!burning && altitude <= floor(first) + 60 && length(sub(v, cross(SPIN, r))) < 0.05) {
    outcome = 'none';
    done = true;
  }

  const advance = (): void => {
    // the step: what the air allows, what the height allows, never across the cutoff or anything else the sequence does
    const up = unit(r);
    const climb = dot(sub(v, cross(SPIN, r)), up);
    let h = altitude > 150_000 ? 10 : altitude > 90_000 ? 4 : 1;
    rate(r, v, t, altitude, mass);
    const load = felt / G0;
    if (stiff > 0) h = Math.min(h, 0.5 / stiff);
    if (altitude < 120_000) h = Math.min(h, 2000 / Math.max(1, Math.abs(climb)));
    if ((burning && burn) || lit(t) > 0) h = Math.min(h, 0.5);
    h = Math.max(h, 0.05);
    while (markAt < marks.length && marks[markAt]! <= t + 1e-9) markAt++;
    const mark = marks[markAt];
    const reaches = mark !== undefined && mark - t <= h + 1e-9;
    if (reaches) h = mark - t;

    const next = rk4(h, altitude);
    const before: PathPoint = { t, r, v, altitude };
    const turned = angleBetween(r, next.r);
    if (burning) mass -= flow * h;
    t = reaches ? mark : t + h;
    r = next.r;
    v = next.v;
    here = place(r, t);
    altitude = here.height - seaLevel;
    steps++;
    const falling = altitude < before.altitude;

    // the air's load coming down, once the retrorockets are done and before a parachute is out: the first 0.05 g, and the most
    if (falling && !drogue && !main && before.t >= retroEnd && lit(before.t) === 0) {
      if (!entry && load >= 0.05) {
        entry = true;
        note('entry', load, before);
      }
      if (entry && (!peak || load > peak.load)) peak = { ...before, load };
    }

    // what the sequence does at this instant
    if (reaches) {
      if (burning && burn && t >= burn.until - 1e-9) {
        burning = false;
        note('cutoff');
      }
      if (t === towerAt) note('tower');
      if (t === separationAt && !alone) {
        // the two are pushed apart along the motion; the spacecraft's share is the booster's part of the whole (fly.ts)
        const share = tr.separation.boosterMass.value / (tr.separation.boosterMass.value + tr.separation.mass.value);
        const wind = sub(v, cross(SPIN, r));
        if (length(wind) > 0) v = add(v, scale(unit(wind), tr.separation.speed.value * share));
        mass = tr.separation.mass.value;
        alone = true;
        note('separation');
      }
      if (fires.length && t === fires[0]) note('retro');
      if (t === packAt) {
        mass = tr.retropack.mass.value;
        note('retropack');
      }
    }

    // what a spacecraft alone does by itself, coming down (vehicle.ts): the tower's shape gives way to the heat shield, the parachutes come out
    if (alone && falling) {
      riding = false;
      // (each opens at the instant its height is passed, and not at the end of the step that passed it: a second's step
      // falls a hundred metres here, and where the main opens is where it lands. The step is flown again to that
      // instant, which is found along it, and the next begins there with the parachute out)
      const crossed = (height: number): void => {
        const part = Math.max(0, Math.min(1, (before.altitude - height) / (before.altitude - altitude || 1)));
        const at = before.t + (t - before.t) * part;
        if (at <= before.t + 1e-6 || at >= t - 1e-6) return;
        [t, r, v, altitude] = [before.t, before.r, before.v, before.altitude];
        const back = rk4(at - before.t, altitude);
        t = at;
        r = back.r;
        v = back.v;
        here = place(r, t);
        altitude = here.height - seaLevel;
      };
      if (chutes && !drogue && !main && altitude <= tr.drogue.altitude.value) {
        drogue = true;
        crossed(tr.drogue.altitude.value);
        chute = { full: tr.drogue.dragArea.value, was: 0, at: t, fills: tr.drogue.fills.value };
        torn = false;
        note('drogue');
      }
      if (chutes && drogue && !main && altitude <= tr.main.altitude.value) {
        main = true;
        crossed(tr.main.altitude.value);
        chute = { full: tr.main.dragArea.value, was: chute.full, at: t, fills: tr.main.fills.value };
        torn = false;
        note('main');
      }
    }
    if (limits && !riding && !torn && (drogue || main) && altitude < AIR_TOP) {
      const which = main ? 'main' : 'drogue';
      const q = pressure(r, v, t, altitude);
      const area = chuteArea(chute, t);
      if (q > limits[which].value || q * area > (limits.pull?.[which]?.value ?? Infinity)) {
        const left = Math.min(area, tr[which].dragArea.value * limits.torn.value);
        chute = { full: left, was: left, at: t, fills: 1 };
        torn = true;
      }
    }

    const ground = altitude < padHeight + 100 ? floor(here) : 0;
    if (falling && altitude <= ground) {
      // back to the instant it touched, along the last step
      const part = Math.max(0, Math.min(1, (before.altitude - ground) / (before.altitude - altitude || 1)));
      const mix = (a: Vec3, b: Vec3): Vec3 => add(a, scale(sub(b, a), part));
      const at = before.t + (t - before.t) * part;
      const where = mix(before.r, r);
      const speed = mix(before.v, v);
      const g = place(where, at);
      impact = {
        t: at,
        r: where,
        v: speed,
        altitude: g.height - seaLevel,
        latitude: g.latitude,
        longitude: g.longitude,
        range: angleBetween(fixed(where, at), pad) * MEAN_RADIUS,
        speed: -dot(sub(speed, cross(SPIN, where)), upAt(where, at)),
      };
      points.push({ t: at, r: where, v: speed, altitude: impact.altitude });
      outcome = 'impact';
      done = true;
      return;
    }

    if (swept + turned >= 2 * Math.PI) {
      // once round: the path ends where it began to repeat
      const part = turned > 0 ? (2 * Math.PI - swept) / turned : 1;
      const at = before.t + (t - before.t) * part;
      const end = between(before.t, before.r, before.v, t, r, v, at);
      points.push({ t: at, r: end.r, v: end.v, altitude: before.altitude + (altitude - before.altitude) * part });
      outcome = 'orbit';
      done = true;
      return;
    }
    swept += turned;

    points.push({ t, r, v, altitude });
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
    const end = (): PathPlace => {
      const last = points[points.length - 1]!;
      const g = place(last.r, last.t);
      return { ...last, latitude: g.latitude, longitude: g.longitude };
    };
    const best = (list: PathPlace[], sign: number): PathPlace | null =>
      list.reduce<PathPlace | null>((b, p) => (!b || sign * (p.altitude - b.altitude) > 0 ? p : b), null);
    if (peak) {
      const { load, ...at } = peak;
      note('peak', load, at);
    }
    events.sort((a, b) => a.t - b.t);
    return {
      kind: burn ? 'guided' : 'coast',
      from: start.t,
      cutoff: burn ? burn.until : null,
      points: outcome === 'none' ? points : sampled(),
      outcome,
      // going round, the highest and lowest of the whole turn; otherwise the top of the climb ahead, if there is one
      // (a turn begun at one end of the orbit comes back to that end as its last point, which is then no turning point of the path)
      apogee: orbit ? best([...tops, end()], 1) : (tops[0] ?? null),
      perigee: orbit ? best([...bottoms, end()], -1) : null,
      impact,
      orbit: orbit ? elements(start.r, start.v) : null,
      events,
      chute: drogue || main,
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
        if (budget !== undefined && steps % 2 === 0 && now() - began >= budget) break;
      }
      cost += now() - began;
      if (done) answer = finish();
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

/** A prediction, worked out at once. */
export function predict(trajectory: Trajectory, site: Geodetic, seaLevel: number, start: Start, options: PredictOptions = {}): Prediction {
  const p = predictor(trajectory, site, seaLevel, start, options);
  p.run();
  return p.result;
}
