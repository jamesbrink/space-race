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
 *            does without being asked. Nothing else happens: no separation, no retrofire.
 *   guided   `burn` given: the engine burns on to `burn.until` with the thrust along `burn.axis`
 *            (the tilt programme, with a pilot's trim: `programmeAxis`), then coasts as above.
 *            The attitude is prescribed, as fly.ts's is: the rigid body and its autopilot are not
 *            stepped (a tick of vehicle.ts costs 0.13 ms and there are 14,000 to cutoff), so the
 *            platform's lag behind its programme, under a degree, is left out.
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
}

/** The engine kept burning: the axis the thrust is held along at each instant, in the frame that does not turn, and when it stops. */
export interface Burn {
  axis: (t: number) => Vec3;
  until: number;
}

export interface PredictOptions {
  burn?: Burn;
  /** The longest it looks ahead, s: six hours unless given. */
  limit?: number;
  /** The most points the path is returned as. */
  points?: number;
}

/** A point on the predicted path: when, and where in the frame that does not turn. */
export interface PathPoint {
  t: number;
  r: Vec3;
  /** Height above the sea, m. */
  altitude: number;
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
  /** Where and when it meets the surface: the distance over the ground from the pad, m, and its speed through the air there, m/s. */
  impact: (PathPlace & { range: number; speed: number }) | null;
  /** The orbit, when it is one: the elements at the start, which J2 and the air then change a little. */
  orbit: Elements | null;
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
  const limit = options.limit ?? 6 * 3600;
  const most = Math.max(8, options.points ?? 480);
  const burn = options.burn && start.t < options.burn.until ? options.burn : null;
  const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);

  let t = start.t;
  let r = start.r;
  let v = start.v;
  let mass = start.mass;
  let burning = burn !== null;
  // what the air sees: the stack (or the spacecraft with its tower on), nose first; or the spacecraft alone, with whatever parachute is out
  let riding = start.phase === 'powered' || start.phase === 'coast' || start.phase === 'escape';
  const alone = start.phase !== 'powered' && start.phase !== 'coast';
  let chute = { full: 0, was: 0, at: 0, fills: 1 };
  let drogue = start.phase === 'drogue' || start.phase === 'main';
  let main = start.phase === 'main';
  if (main) chute = { full: tr.main.dragArea.value, was: tr.main.dragArea.value, at: t, fills: 1 };
  else if (drogue) chute = { full: tr.drogue.dragArea.value, was: tr.drogue.dragArea.value, at: t, fills: 1 };

  const fixed = (p: Vec3, at: number): Vec3 => inertialToEcef(p, EARTH_ROTATION_RATE * at);
  const place = (p: Vec3, at: number): Geodetic => ecefToGeodetic(fixed(p, at));
  /** The ground's height above the sea under a place (vehicle.ts's): the pad's own level within a kilometre of it, the sea beyond. */
  const floor = (here: Geodetic): number =>
    padHeight !== 0 && length(sub(geodeticToEcef({ latitude: here.latitude, longitude: here.longitude, height: site.height }), pad)) < 1000
      ? padHeight
      : 0;

  /** The acceleration at a state, and how quickly drag is changing the speed there (1/s). */
  let stiff = 0;
  const rate = (p: Vec3, u: Vec3, at: number, altitude: number, m: number): Vec3 => {
    let a = gravity(p);
    stiff = 0;
    const air = altitude < AIR_TOP || burning ? atmosphere(altitude) : null;
    if (air && altitude < AIR_TOP) {
      const wind = sub(u, cross(SPIN, p));
      const speed = length(wind);
      if (speed > 0) {
        const area = dragArea(tr, riding, speed / air.soundSpeed) + (riding ? 0 : chuteArea(chute, at));
        const k = (0.5 * air.density * speed * area) / m;
        stiff = k;
        a = add(a, scale(wind, -k));
      }
    }
    if (burning && burn) a = add(a, scale(burn.axis(at), thrustIn(tr, air ? air.pressure : 0) / m));
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
  const points: PathPoint[] = [{ t, r, altitude }];
  /** The turning points of the height ahead, each fitted through the three points round it. */
  const tops: PathPlace[] = [];
  const bottoms: PathPlace[] = [];
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
    const through = (i: 0 | 1 | 2): number => {
      const [p1, p2] = [a.r[i] - b.r[i], c.r[i] - b.r[i]];
      const k2 = (p1 * x2 - p2 * x1) / (x1 * x2 * (x1 - x2));
      const k1 = (p2 * x1 * x1 - p1 * x2 * x2) / (x1 * x2 * (x1 - x2));
      return b.r[i] + k1 * x + k2 * x * x;
    };
    const at = b.t + x;
    const where: Vec3 = [through(0), through(1), through(2)];
    const g = place(where, at);
    return { t: at, r: where, altitude: g.height - seaLevel, latitude: g.latitude, longitude: g.longitude };
  };

  // Standing on the ground, engine off: there is nothing to say. (`r` is a centre of mass, which on a stack is metres
  // above what it stands on: at rest over the ground within a vehicle's height of it is taken as standing.)
  if (!burning && altitude <= floor(first) + 60 && length(sub(v, cross(SPIN, r))) < 0.05) {
    outcome = 'none';
    done = true;
  }

  const advance = (): void => {
    // the step: what the air allows, what the height allows, and never across the cutoff
    const up = unit(r);
    const climb = dot(sub(v, cross(SPIN, r)), up);
    let h = altitude > 150_000 ? 10 : altitude > 90_000 ? 4 : 1;
    rate(r, v, t, altitude, mass);
    if (stiff > 0) h = Math.min(h, 0.5 / stiff);
    if (altitude < 120_000) h = Math.min(h, 2000 / Math.max(1, Math.abs(climb)));
    if (burning && burn) h = Math.min(h, 0.5, burn.until - t);
    h = Math.max(h, burning ? 1e-6 : 0.05);

    const next = rk4(h, altitude);
    const before = { t, r, v, altitude };
    const turned = angleBetween(r, next.r);
    if (burning) mass -= flow * h;
    t += h;
    r = next.r;
    v = next.v;
    if (burning && burn && t >= burn.until - 1e-9) burning = false;
    here = place(r, t);
    altitude = here.height - seaLevel;
    steps++;
    const falling = altitude < before.altitude;

    // what a spacecraft alone does by itself, coming down (vehicle.ts): the tower's shape gives way to the heat shield, the parachutes come out
    if (alone && falling) {
      riding = false;
      if (!drogue && !main && altitude <= tr.drogue.altitude.value) {
        drogue = true;
        chute = { full: tr.drogue.dragArea.value, was: 0, at: t, fills: tr.drogue.fills.value };
      }
      if (drogue && !main && altitude <= tr.main.altitude.value) {
        main = true;
        chute = { full: tr.main.dragArea.value, was: tr.drogue.dragArea.value, at: t, fills: tr.main.fills.value };
      }
    }

    const ground = altitude < padHeight + 100 ? floor(here) : 0;
    if (falling && altitude <= ground) {
      // back to the instant it touched, along the last step
      const part = Math.max(0, Math.min(1, (before.altitude - ground) / (before.altitude - altitude || 1)));
      const mix = (a: Vec3, b: Vec3): Vec3 => add(a, scale(sub(b, a), part));
      const at = before.t + h * part;
      const where = mix(before.r, r);
      const g = place(where, at);
      const speed = length(sub(mix(before.v, v), cross(SPIN, where)));
      impact = {
        t: at,
        r: where,
        altitude: g.height - seaLevel,
        latitude: g.latitude,
        longitude: g.longitude,
        range: angleBetween(fixed(where, at), pad) * MEAN_RADIUS,
        speed,
      };
      points.push({ t: at, r: where, altitude: impact.altitude });
      outcome = 'impact';
      done = true;
      return;
    }

    if (swept + turned >= 2 * Math.PI) {
      // once round: the path ends where it began to repeat
      const part = turned > 0 ? (2 * Math.PI - swept) / turned : 1;
      const where = add(before.r, scale(sub(r, before.r), part));
      const at = before.t + h * part;
      points.push({ t: at, r: where, altitude: before.altitude + (altitude - before.altitude) * part });
      outcome = 'orbit';
      done = true;
      return;
    }
    swept += turned;

    points.push({ t, r, altitude });
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

  /** The path thinned to `most` points, evenly along its length: the integrator's steps crowd where the air is thick. */
  const thinned = (): PathPoint[] => {
    if (points.length <= most) return points;
    let whole = 0;
    for (let i = 1; i < points.length; i++) whole += length(sub(points[i]!.r, points[i - 1]!.r));
    const gap = whole / (most - 1);
    const out: PathPoint[] = [points[0]!];
    let gone = 0;
    for (let i = 1; i < points.length - 1; i++) {
      gone += length(sub(points[i]!.r, points[i - 1]!.r));
      if (gone >= gap) {
        out.push(points[i]!);
        gone = 0;
      }
    }
    out.push(points[points.length - 1]!);
    return out;
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
    return {
      kind: burn ? 'guided' : 'coast',
      from: start.t,
      cutoff: burn ? burn.until : null,
      points: thinned(),
      outcome,
      // going round, the highest and lowest of the whole turn; otherwise the top of the climb ahead, if there is one
      // (a turn begun at one end of the orbit comes back to that end as its last point, which is then no turning point of the path)
      apogee: orbit ? best([...tops, end()], 1) : (tops[0] ?? null),
      perigee: orbit ? best([...bottoms, end()], -1) : null,
      impact,
      orbit: orbit ? elements(start.r, start.v) : null,
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
        if (budget !== undefined && steps % 8 === 0 && now() - began >= budget) break;
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
