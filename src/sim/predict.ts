/**
 * Looking ahead: where a vehicle goes from the state it is in if nothing more is done than what is already set to
 * happen. One propagator for every vehicle (`propagate`), given the vehicle as a `Flier`: what pushes it at a state
 * (thrust, drag, lift where it is modelled: the same force functions the live vehicle and the batch runs call), what it
 * is scheduled to do next (an engine's cutoff, a separation, a burn's start and end, a parachute filling) and what it
 * does by itself at a height (a parachute let out, an ejection). Gravity is the Earth's with J2 (world/orbit.ts
 * `gravity`, every simulator's), in the flight's frame (world/earthframe.ts: of date, unless a test gives another), the air turning with the
 * Earth. It goes on until it meets the ground, has gone once round the Earth, is told to stop (`Arrival.end`), meets
 * another body that pulls on it (the Moon: `Pass`), leaves the Earth's sphere, or runs out of time; and how much time
 * that is follows from the orbit it is on (`lookAhead`), so a low orbit is looked six hours along and a path to the
 * Moon days, by one rule. Nothing here knows which flight or which kind of vehicle it is, and nothing is drawn: viewer/path.ts
 * draws what this returns. The vehicles there are, and what each supplies, are in sim/fliers.ts.
 *
 * The step is the dynamics' own: an embedded Runge-Kutta pair (Dormand and Prince's fifth order with its fourth for the
 * error, seven evaluations a step) whose step grows and shrinks to keep each step's error within `TOL_R` metres and
 * `TOL_V` metres a second, the same everywhere, under thrust, in orbit, in the air and under a parachute; and no step
 * turns the motion by more than `TURN`, so the cubic between two steps (`between`, what the line and its markers are
 * drawn from) keeps to the integrator's own path. A step ends on every instant the flier has scheduled, so what happens
 * there happens at its instant, and nothing the flier does changes within a step: its configuration is a function of
 * its state between those instants. Each step is a rung of a ladder of quarter octaves (`rung`), so that two starts a hair
 * apart take the same steps. A height it acts at, and the ground, are found by flying the step again from its start to
 * the last bit of the instant it crosses them (`back`); the air's 0.05 g is placed between the steps either side of it
 * and its greatest load at the vertex through the steps round it. Nothing a prediction gives moves by more than its start
 * does (tests/perturbed.test.mjs: issue #30). Every stage's height is the ellipsoid's own (frames.ts `ecefToGeodetic`:
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
import { AU, EARTH, EARTH_ROTATION_RATE, SUN, WGS84_A } from '../world/bodies.ts';
import { type EarthFrame, LIFTOFF } from '../world/earthframe.ts';
import {
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  type Geodetic,
  geodeticToEcef,
  length,
  scale,
  sub,
  type Vec3,
} from '../world/frames.ts';
import { hermite as between } from '../world/orbit.ts';
import { AIR_TOP } from './atmosphere.ts';
import { type BallisticOptions, ballistic } from './fliers.ts';
import { type Doing, MEAN_RADIUS } from './fly.ts';
import type { FlightPlan } from './plan.ts';
import { G0 } from '../world/bodies.ts';
import { aboutAxis, turn } from './rigid.ts';
import { dp45 } from './core/dp45.ts';
import { acceleration } from './core/rk4.ts';
import { ENTRY_G } from './loads.ts';
import { EARTH_GRAVITY, fieldOf, type GravityTerm, type Passed } from './core/gravity.ts';

export { AIR_TOP, between };

/**
 * Where a prediction starts: a `Sample`'s own fields (fly.ts), so any sample will do. `r` is best the centre of mass. What it
 * is doing (fly.ts `Doing`: on its launch vehicle, pulled clear on its escape rocket, the parachute out) left out, it is
 * the spacecraft alone with nothing out.
 */
export interface Start extends Partial<Pick<Doing, 'riding' | 'escaping' | 'out'>> {
  t: number;
  r: Vec3;
  v: Vec3;
  mass: number;
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
  /** The spacecraft let go of its booster, and the joint's axis then (the stack's long axis, in the frame): pushed apart along it. */
  separation?: number;
  axis?: Vec3;
  /** When each retrorocket lights (those not yet burnt out). */
  retro?: number[];
  /** The retrorockets' pack let go. */
  retropack?: number;
  /** Whether the spacecraft lets its parachutes out by itself at their heights. True if not given. */
  chutes?: boolean;
}

/**
 * How far a prediction looks ahead before it stops: the longest time, s; how many turns round the Earth (an orbit is drawn
 * once round, where it begins to repeat); and the most steps the integrator may take. A flight's plan says these; the
 * default is a ballistic flight's and a day's orbit's alike: six hours, once round, 60,000 steps. A time given is the
 * time looked ahead, whatever the path. Left to the default it is the least looked ahead, and the path's own orbit says
 * how much further (`lookAhead`): an orbit that takes longer than six hours to go round is still followed once round,
 * and a path to the Moon as far as the Moon and back.
 */
export interface Horizons {
  limit: number;
  turns: number;
  steps: number;
}
export const HORIZONS: Horizons = { limit: 6 * 3600, turns: 1, steps: 60_000 };

/**
 * How far from the Earth's centre the Earth holds what goes round it, m: its sphere of influence against the Sun by
 * Laplace's rule, a (m / M)^(2/5) with a the astronomical unit and the two GMs (derived: 924,600 km). A path that
 * passes it has left the Earth, and is followed no further (`Prediction.outcome` 'escape').
 */
export const EARTH_HOLDS = AU * (EARTH.gm.value / SUN.gm.value) ** 0.4;
/** The radius about another body's centre within which a path is that body's, m: Laplace's rule again, from its distance from the Earth and the two GMs (the Moon's: 66,000 km). */
export const sphereOf = (body: Passed, t: number): number => length(body.where(t)) * (body.gm / EARTH.gm.value) ** 0.4;
/**
 * The longest any prediction looks ahead by itself, s: the time once round the largest orbit the Earth's sphere holds
 * (its far end on the sphere: a semi-major axis of half of it), 36 days. Derived.
 */
export const FARTHEST = 2 * Math.PI * Math.sqrt((EARTH_HOLDS / 2) ** 3 / EARTH.gm.value);
/** How much longer than its orbit's period a path is followed, so that it is seen once round (the sweep ends it there) though the Earth's bulge and the Moon change the time a little. Estimated. */
const ROUND = 1.05;

/**
 * How long a state is looked ahead from, s: the time its own orbit takes to go round `turns` times, and a little
 * more, where the orbit closes within what holds it; otherwise (it does not close, or its far end is beyond the sphere
 * of the body it is about) as long as anything is followed, `FARTHEST`. The orbit is the osculating one about the
 * body whose sphere the state is in: another body's (`bodies`) within its sphere of influence, else the Earth. Nothing
 * here is a flight's or a phase's: a parking orbit, a transfer to the stationary height, a path to the Moon and one
 * leaving the Earth are told apart by their energy and their height alone.
 */
export function lookAhead(r: Vec3, v: Vec3, t: number, bodies: readonly Passed[] = [], turns = 1): number {
  const about = (p: Vec3, u: Vec3, gm: number, holds: number): number => {
    const a = -gm / (dot(u, u) - (2 * gm) / length(p));
    if (!(a > 0)) return FARTHEST;
    const h = cross(p, u);
    const e = Math.sqrt(Math.max(0, 1 - dot(h, h) / (gm * a)));
    if (a * (1 + e) >= holds) return FARTHEST;
    return Math.min(FARTHEST, ROUND * turns * 2 * Math.PI * Math.sqrt((a * a * a) / gm));
  };
  for (const body of bodies) {
    const s = body.where(t);
    const holds = sphereOf(body, t);
    const p = sub(r, s);
    if (length(p) < holds) return about(p, sub(v, velocityOf(body, t)), body.gm, holds);
  }
  return about(r, v, EARTH.gm.value, EARTH_HOLDS);
}

/**
 * What the ellipse a state is on about the Earth runs into before it closes, so that its far end and its period are not
 * what the state will do: the name of another body whose sphere of influence it reaches (the Moon), 'escape' where it
 * does not close or goes beyond what the Earth holds, or null where the ellipse is its own orbit (every low one). For
 * whoever shows an orbit's apsides from the state alone (the deck's figures): the predicted path flies what happens.
 */
export function reaches(r: Vec3, v: Vec3, t: number, bodies: readonly Passed[] = []): string | null {
  const gm = EARTH.gm.value;
  const a = -gm / (dot(v, v) - (2 * gm) / length(r));
  if (!(a > 0)) return 'escape';
  const h = cross(r, v);
  const e = Math.sqrt(Math.max(0, 1 - dot(h, h) / (gm * a)));
  if (a * (1 + e) >= EARTH_HOLDS) return 'escape';
  for (const body of bodies) {
    const far = length(body.where(t));
    const holds = sphereOf(body, t);
    if (a * (1 + e) >= far - holds && a * (1 - e) <= far + holds) return body.name;
  }
  return null;
}

/** A body's velocity in the frame, m/s: its place a second either side (its acceleration is a few millimetres a second squared at most, so the centred difference is its velocity to a part in a billion). */
const velocityOf = (body: Passed, t: number): Vec3 => scale(sub(body.where(t + 1), body.where(t - 1)), 0.5);

export interface PredictOptions extends BallisticOptions {
  /** The longest it looks ahead, s (`Horizons.limit`). */
  limit?: number;
  /** How far ahead it looks, beyond the longest time (`Horizons`): the default's unless given. */
  horizons?: Partial<Horizons>;
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
  /**
   * The space-fixed speed at which it next does something, speeding up through it (a stage its guidance cuts on its speed:
   * a Mercury-Atlas's sustainer). Left out or Infinity: none. Found as a height is, where the step crosses it.
   */
  faster?(): number;
  /** What it does at an instant it scheduled (`next`'s, or the start's: what is due already happens at once), at its height or at its speed. */
  arrive(t: number, r: Vec3, v: Vec3, altitude: number, by: 'time' | 'height' | 'speed'): Arrival;
  /** After each step: what the state does to it (a shape that gives way as it falls, a parachute torn). */
  settle?(t: number, r: Vec3, v: Vec3, altitude: number, falling: boolean): void;
  /** Whether anything aboard burns now. */
  burning(): boolean;
  /**
   * Work out what it is before the first step, in slices (a guided stack's steps ahead): worked on until `until`
   * (performance.now()), true when done. The propagator runs it in its own slices; a flier without one is ready.
   */
  prepare?(until?: number): boolean;
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
/** The most of the way to another body's centre one step may go: under a half, so no step from outside it ends beyond it. */
const NEAR = 0.25;
/**
 * Every step is a rung of a ladder of quarter octaves (2^(k/4) s), the longest the error and the turn allow (or what
 * ends it on an instant the flier scheduled). A step chosen as the error's own continuous function of the state follows
 * that state's last bits, and so does every step after it: two starts a hair apart took different steps, and the path
 * differed by the integrator's tolerance, not by what the starts did. On the ladder they take the same steps, and differ
 * as their starts do (tests/predict.test.mjs, "a hair's difference in the start").
 */
const RUNGS = 4;
const rung = (h: number): number => 2 ** (Math.floor(Math.log2(h) * RUNGS + 1e-9) / RUNGS);
/**
 * Halve a bracket, `past` false at its low end and true at its high, until it can be halved no more (its two ends
 * adjacent doubles): what an instant on the path is found to. The end where `past` holds.
 */
const bisect = (lo: number, hi: number, past: (t: number) => boolean): number => {
  for (let k = 0; k < 200; k++) {
    const m = 0.5 * (lo + hi);
    if (!(m > lo && m < hi)) break;
    if (past(m)) hi = m;
    else lo = m;
  }
  return hi;
};

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

/**
 * The apsides of any path, found from the path itself and nothing else: where its radial speed (the rate its distance
 * from the Earth's centre changes) changes sign, an apoapsis where it goes from rising to falling, a periapsis the other
 * way, each placed on the cubic between the two points either side (`between`), to the last bit of its instant. Whatever the path is
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
    const t = bisect(a.t, b.t, (m) => {
      const s = between(a.t, a.r, a.v, b.t, b.r, b.v, m);
      return Math.sign(dot(s.r, s.v)) !== Math.sign(ra);
    });
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

/**
 * Another body passed on the way (one that pulls on it and has a surface: core/gravity.ts `Passed`), where the path
 * is nearest it: the instant and the state there (a `PathPoint`: its height is over the Earth's sea still), the
 * body's centre then, how far from that centre, the height over its sphere, m, and the speed past it, m/s. One that
 * meets the surface ends the path there (`strikes`: the point is where it meets it).
 */
export interface Pass extends PathPoint {
  body: string;
  centre: Vec3;
  distance: number;
  height: number;
  speed: number;
  strikes: boolean;
}

export interface Prediction {
  kind: 'coast' | 'guided';
  /** The instant it was made from, and when the engine stops on a guided one. */
  from: number;
  cutoff: number | null;
  points: PathPoint[];
  /**
   * How it ends: `impact` at the ground (or where the flier stops it, as the spacecraft's at the height its pilot left
   * at); `orbit`, once round without meeting it; `strike`, on another body's surface (the last of `passes`);
   * `escape`, out of the Earth's sphere (`EARTH_HOLDS`); `limit`, still going when the time ran out (`horizon`);
   * `none`, standing on the ground with nothing to predict.
   */
  outcome: 'impact' | 'orbit' | 'strike' | 'escape' | 'limit' | 'none';
  /** How far ahead it looked at the most, s (`Horizons.limit`, or what the path's own orbit asked for: `lookAhead`). */
  horizon: number;
  /** The other bodies it passes, in order of time: the nearest it comes to each, each time it comes by (`Pass`). */
  passes: Pass[];
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

/** Where the path is measured from: the pad, and the sea's height above the ellipsoid there. */
export interface Ground {
  site: Geodetic;
  seaLevel: number;
  /** The frame the start and the path are in (world/earthframe.ts): fixed at liftoff unless given. */
  frame?: EarthFrame;
  /** What pulls on it (core/gravity.ts): the Earth with J2 unless given. */
  gravity?: readonly GravityTerm[];
}

/**
 * A prediction to be worked out in slices: `flier` from `start` (its place and velocity at an instant, in `where.frame`).
 * `site` is where ranges are measured from; `seaLevel` the sea's height above the ellipsoid.
 */
export function propagate(
  flier: Flier,
  start: { t: number; r: Vec3; v: Vec3 },
  where: Ground,
  options: { limit?: number; horizons?: Partial<Horizons>; points?: number } = {},
): Predictor {
  const { site, seaLevel } = where;
  const frame = where.frame ?? LIFTOFF;
  const terms = where.gravity ?? EARTH_GRAVITY;
  const field = fieldOf(terms);
  /** The other bodies that pull on it and have a surface: the path's nearest to each is found, and its meeting one. */
  const bodies = terms.flatMap((term) => (term.body ? [term.body] : []));
  const pad = geodeticToEcef(site);
  const horizons = { ...HORIZONS, ...options.horizons, ...(options.limit !== undefined ? { limit: options.limit } : {}) };
  /** A time asked for is the time looked ahead; with none, the least, and the orbit it is on says how much further (`lookAhead`). */
  const asked = options.limit !== undefined || options.horizons?.limit !== undefined;
  let limit = horizons.limit;
  const round = 2 * Math.PI * horizons.turns;
  const most = Math.max(8, options.points ?? 480);

  let t = start.t;
  let r = start.r;
  let v = start.v;
  const fixed = (p: Vec3, at: number): Vec3 => frame.toFixed(p, at);
  const place = (p: Vec3, at: number): Geodetic => ecefToGeodetic(fixed(p, at));

  // (the stages of a step: positions and velocities, and the accelerations at them)
  const kr: Vec3[] = new Array(7);
  const kv: Vec3[] = new Array(7);
  let pushed = 0;
  const accel = (at: number, p: Vec3, u: Vec3, altitude: number): Vec3 => {
    const f = flier.push(at, p, u, altitude);
    pushed = length(f);
    return acceleration(field(p, at), f);
  };
  /** One step of the pair from the state now (core/dp45.ts): the state `h` on, and its error in place and speed. */
  const at = (when: number, p: Vec3, u: Vec3): Vec3 => accel(when, p, u, place(p, when).height - seaLevel);
  const pair = (h: number, first: Vec3): { r: Vec3; v: Vec3; er: number; ev: number } => dp45(t, r, v, h, first, at, kr, kv);

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
  const arrive = (by: 'time' | 'height' | 'speed'): boolean => {
    const a = flier.arrive(t, r, v, altitude, by);
    for (const k of a.events ?? []) note(k);
    if (a.v) {
      v = a.v;
      points.push({ t, r, v, altitude });
    }
    return a.end === true;
  };
  let entry = false;
  /** The load felt at each step's start from the entry on, before a parachute: the greatest is placed among them at the end. */
  const loads: (PathPoint & { load: number })[] = [];
  /** The last step's start and the load felt there: where the entry's 0.05 g is placed between. */
  let felt: (PathPoint & { load: number }) | null = null;
  let swept = 0;
  let steps = 0;
  let cost = 0;
  let done = false;
  let outcome: Prediction['outcome'] = 'limit';
  let impact: Prediction['impact'] = null;
  let h = 1;
  /** Whether anything burned at the last step's end: where a burn has ended, the orbit it left the path on says how far to look. */
  let lit = false;
  const passes: Pass[] = [];
  /**
   * Each other body as the state now has it: its centre and velocity, how far off it is, and the rate that distance
   * changes at (times the distance: the path is nearest where it goes from closing to opening).
   */
  const sight = (body: Passed, at: number, p: Vec3, u: Vec3): { centre: Vec3; distance: number; speed: number; rate: number } => {
    const centre = body.where(at);
    const off = sub(p, centre);
    const past = sub(u, velocityOf(body, at));
    return { centre, distance: length(off), speed: length(past), rate: dot(off, past) };
  };
  let sights: ReturnType<typeof sight>[] = [];
  const passed = (body: Passed, at: PathPoint, strikes: boolean): void => {
    const s = sight(body, at.t, at.r, at.v);
    passes.push({
      ...at,
      body: body.name,
      centre: s.centre,
      distance: s.distance,
      height: s.distance - body.radius,
      speed: s.speed,
      strikes,
    });
  };

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
    done = true;
    // (ended where it began: there is no path from here, as from below the height a pilot leaves at)
    if (!(t > start.t)) {
      outcome = 'none';
      return;
    }
    const g = place(r, t);
    impact = {
      t,
      r,
      v,
      altitude,
      latitude: g.latitude,
      longitude: g.longitude,
      range: angleBetween(fixed(r, t), pad) * MEAN_RADIUS,
      speed: -dot(sub(v, cross(SPIN, r)), frame.up(r, t)),
    };
    outcome = 'impact';
    done = true;
  };

  // what is due already happens now, once the flier is ready (`Flier.prepare`, in the first slices)
  let begun = false;
  const begin = (): void => {
    begun = true;
    if (arrive('time')) {
      points.length = 1;
      end();
    }
    // Below the height the flier acts at, coming down, it acts now (a parachute out; or the path's end, which is then none)
    if (!done && altitude <= flier.below() && dot(sub(v, cross(SPIN, r)), r) < 0 && arrive('height')) {
      outcome = 'none';
      done = true;
    }
    // Standing on the ground with nothing burning: there is nothing to say. (`r` is a centre of mass, which on a stack is
    // metres above what it stands on: at rest over the ground within a vehicle's height of it is taken as standing.)
    if (!done && !flier.burning() && altitude <= flier.ground(first) + 60 && length(sub(v, cross(SPIN, r))) < 0.05) {
      outcome = 'none';
      done = true;
    }
    lit = flier.burning();
    if (!asked) limit = Math.max(limit, lookAhead(r, v, t, bodies, horizons.turns));
    sights = bodies.map((body) => sight(body, t, r, v));
  };

  /** Back along the step just taken (from `before`, `h0` long, ending at the state now) to where its cubic is at height `at`, flown again to there. */
  const back = (before: PathPoint, h0: number, at: number): void => {
    [t, r, v, altitude] = [before.t, before.r, before.v, before.altitude];
    // (the step flown again from its start to each instant tried, and its height there the ellipsoid's, as every height
    // here is: the instant found to the last bit, on the side at or below the height, so what acts there finds itself
    // there. Found to a tenth of a millisecond on the step's cubic, it was a step in the place it gave, which a hair's
    // difference in the start moved from one side of a halving to the other.)
    const a0 = accel(t, r, v, altitude);
    const heightAt = (to: number): number => place(pair(to, a0).r, before.t + to).height - seaLevel;
    const to = before.altitude <= at ? 0 : bisect(0, h0, (x) => heightAt(x) <= at);
    if (to > 1e-9) {
      const s = pair(to, a0);
      t = before.t + to;
      r = s.r;
      v = s.v;
    }
    altitude = place(r, t).height - seaLevel;
    points.pop();
    if (to > 1e-9) points.push({ t, r, v, altitude });
  };

  /** Back along the step just taken to where its speed reaches `at` (m/s, space-fixed), flown again to there: the instant to the last bit, at or past it. */
  const backToSpeed = (before: PathPoint, h0: number, at: number): void => {
    [t, r, v, altitude] = [before.t, before.r, before.v, before.altitude];
    const a0 = accel(t, r, v, altitude);
    const to = bisect(0, h0, (x) => length(pair(x, a0).v) >= at);
    const s = pair(to, a0);
    t = before.t + to;
    r = s.r;
    v = s.v;
    altitude = place(r, t).height - seaLevel;
    points.pop();
    points.push({ t, r, v, altitude });
  };

  const advance = (): void => {
    const a0 = accel(t, r, v, altitude);
    const load = pushed / G0;
    // the longest step: what turns the motion by `TURN`, and never past what the flier has scheduled
    const speed = length(v);
    const turnRate = speed > 0 ? length(cross(v, a0)) / (speed * speed) : 0;
    let longest = Math.max(TURN / Math.max(turnRate, 1e-12), SHORTEST / Math.max(speed, 1e-3));
    // (and toward another body no step goes a quarter of the way to its centre: none can pass through it unseen)
    for (const s of sights) longest = Math.min(longest, Math.max(SHORTEST_STEP, (NEAR * s.distance) / Math.max(s.speed, 1e-3)));
    const mark = flier.next(t);
    let step = rung(Math.min(h, longest));
    let reaches = false;
    if (mark - t <= step * (1 + 1e-9)) {
      step = mark - t;
      reaches = true;
    }
    let next = pair(step, a0);
    let err = Math.max(next.er / TOL_R, next.ev / TOL_V);
    // (too much error: shorter, until it is within, or as short as a step goes)
    while (err > 1 && step > SHORTEST_STEP) {
      step = Math.max(SHORTEST_STEP, rung(step * Math.max(0.2, 0.9 * err ** -0.2)));
      reaches = false;
      next = pair(step, a0);
      err = Math.max(next.er / TOL_R, next.ev / TOL_V);
    }
    // the next step: as long as this one's error allows (one cut short to end on an instant does not shorten the next)
    const grown = Math.max(SHORTEST_STEP, rung(step * (err > 0 ? Math.min(4, 0.9 * err ** -0.2) : 4)));
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
    const coming = falling && !flier.chute && before.t >= flier.quiet && !flier.burning();
    if (coming) {
      if (!entry && load >= ENTRY_G) {
        entry = true;
        // (placed where the load reaches it between the last step's start and this one's, along the step's cubic)
        if (felt && felt.load < ENTRY_G && before.t > felt.t) {
          const k = (ENTRY_G - felt.load) / (load - felt.load);
          const at = felt.t + k * (before.t - felt.t);
          const s = between(felt.t, felt.r, felt.v, before.t, before.r, before.v, at);
          note('entry', ENTRY_G, { t: at, r: s.r, v: s.v, altitude: felt.altitude + k * (before.altitude - felt.altitude) });
        } else note('entry', load, before);
      }
      if (entry) loads.push({ ...before, load });
    }
    felt = coming ? { ...before, load } : null;
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
    // what it does at a speed, speeding up through it, where the step's cubic crosses it (short of any instant it was to reach)
    const fast = flier.faster?.() ?? Number.POSITIVE_INFINITY;
    if (fast < Number.POSITIVE_INFINITY && length(v) >= fast && length(before.v) < fast) {
      backToSpeed(before, t - before.t, fast);
      if (arrive('speed')) end();
      return;
    }
    if (reaches && arrive('time')) {
      end();
      return;
    }

    // the other bodies: one whose surface it has met ends the path there (the step flown again to the instant it meets
    // it), and where it has gone from closing on one to drawing away, the nearest it came is found on the step's cubic
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]!;
      const was = sights[i]!;
      const seen = sight(body, t, r, v);
      sights[i] = seen;
      if (seen.distance <= body.radius) {
        const h0 = t - before.t;
        [t, r, v, altitude] = [before.t, before.r, before.v, before.altitude];
        const from = accel(t, r, v, altitude);
        const to = bisect(0, h0, (x) => length(sub(pair(x, from).r, body.where(before.t + x))) <= body.radius);
        const s = pair(to, from);
        [t, r, v] = [before.t + to, s.r, s.v];
        altitude = place(r, t).height - seaLevel;
        points.pop();
        points.push({ t, r, v, altitude });
        passed(body, { t, r, v, altitude }, true);
        outcome = 'strike';
        done = true;
        return;
      }
      // (within the body's own sphere: the nearest a low orbit comes to the Moon, a whole Moon's distance off, is no passing of it)
      if (was.rate < 0 && seen.rate >= 0 && seen.distance < sphereOf(body, t)) {
        const here: PathPoint = { t, r, v, altitude };
        const state = (x: number): PathPoint => {
          const s = between(before.t, before.r, before.v, here.t, here.r, here.v, x);
          return {
            t: x,
            r: s.r,
            v: s.v,
            altitude: before.altitude + ((here.altitude - before.altitude) * (x - before.t)) / (here.t - before.t),
          };
        };
        const at = bisect(before.t, here.t, (x) => {
          const s = state(x);
          return sight(body, x, s.r, s.v).rate >= 0;
        });
        passed(body, state(at), false);
      }
    }
    // out of the Earth's sphere: it has left, and is followed no further
    if (length(r) > EARTH_HOLDS) {
      outcome = 'escape';
      done = true;
      return;
    }
    // how far it looks ahead is the orbit's it is on: read again where a burn has ended
    const burns = flier.burning();
    if (!asked && lit && !burns) limit = Math.max(limit, t - start.t + lookAhead(r, v, t, bodies, horizons.turns));
    lit = burns;

    if (swept + turned >= round) {
      // once round (or as many turns as the horizons say): the path ends where it began to repeat
      const part = turned > 0 ? (round - swept) / turned : 1;
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
    if (t - start.t >= limit || steps >= horizons.steps) done = true;
  };

  /**
   * The path at instants of its own (`gridStep`): its first and last points as the integrator has them, and between
   * them every multiple of the step that the bend there allows, at most `most` in all (the bend allowed is doubled until
   * they fit, and past a tenth of a radian the longest step too). Worked in slices like the rest, until `until` (at least
   * one piece of the path each time): null until it is done.
   */
  let grid: { out: PathPoint[]; i: number; last: number; bend: number; longest: number } | null = null;
  const sampled = (until: number): PathPoint[] | null => {
    // (a path too long to fit even with every piece at the longest step begins with a longer one: days to the Moon are not
    // laid out a dozen times over, the bend allowed doubled each time until nothing of the curve's bending is left in it)
    const span = points[points.length - 1]!.t - points[0]!.t;
    grid ??= {
      out: [points[0]!],
      i: 0,
      last: points[0]!.t,
      bend: BEND,
      longest: Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, span) / most))),
    };
    const g = grid;
    for (let k = 0; g.i + 1 < points.length; g.i++, k++) {
      if (k > 0 && k % 16 === 0 && now() > until) return null;
      const a = points[g.i]!;
      const b = points[g.i + 1]!;
      const h = b.t - a.t;
      if (!(h > 0)) continue;
      const speed = length(a.v);
      const ahead = speed > 0 ? scale(a.v, 1 / speed) : null;
      const pull = scale(sub(b.v, a.v), 1 / h);
      const across = ahead ? sub(pull, scale(ahead, dot(pull, ahead))) : pull;
      const step = gridStep(speed, length(across) / Math.max(speed, 1e-3), g.bend, g.longest);
      for (let at = (Math.floor(g.last / step + 1e-9) + 1) * step; at < b.t - 1e-6; at += step) {
        if (at < a.t - 1e-9) continue;
        const q = between(a.t, a.r, a.v, b.t, b.r, b.v, at);
        g.out.push({ t: at, r: q.r, v: q.v, altitude: a.altitude + ((b.altitude - a.altitude) * (at - a.t)) / h });
        g.last = at;
        if (g.out.length >= most) break;
      }
      if (g.out.length >= most) {
        // (a long path that will not fit at the longest step is given longer ones: an orbit of hours in 480 points; begun
        // again in a slice of its own unless there is no end to the slice, so a path laid out twice or three times over
        // costs no frame more than its slices: done at once, it was a frame of 19 ms on a phone)
        const bend = g.bend * 2;
        grid = { out: [points[0]!], i: 0, last: points[0]!.t, bend, longest: g.longest * (bend > 0.2 ? 2 : 1) };
        return until === Number.POSITIVE_INFINITY ? sampled(until) : null;
      }
    }
    if (points.length > 1) g.out.push(points[points.length - 1]!);
    return g.out;
  };

  let answer: Prediction | null = null;
  const finish = (sampledPoints: PathPoint[]): Prediction => {
    const orbit = outcome === 'orbit';
    const last = (): PathPlace => {
      const p = points[points.length - 1]!;
      const g = place(p.r, p.t);
      return { ...p, latitude: g.latitude, longitude: g.longitude };
    };
    const best = (list: PathPlace[], sign: number): PathPlace | null =>
      list.reduce<PathPlace | null>((b, p) => (!b || sign * (p.altitude - b.altitude) > 0 ? p : b), null);
    // the greatest load: the vertex of the parabola through the step that felt the most and those either side of it,
    // placed on their cubic (at a step's start, it went from one step to the next on a hair)
    let i = -1;
    for (let k = 0; k < loads.length; k++) if (i < 0 || loads[k]!.load > loads[i]!.load) i = k;
    if (i >= 0) {
      const b = loads[i]!;
      const a = loads[i - 1];
      const c = loads[i + 1];
      if (a && c && a.t < b.t && b.t < c.t) {
        const [x1, x2] = [a.t - b.t, c.t - b.t];
        const [y1, y2] = [a.load - b.load, c.load - b.load];
        const bend = (y1 * x2 - y2 * x1) / (x1 * x2 * (x1 - x2));
        const slope = (y2 * x1 * x1 - y1 * x2 * x2) / (x1 * x2 * (x1 - x2));
        const x = bend < 0 ? Math.max(x1, Math.min(x2, -slope / (2 * bend))) : 0;
        const [p, q] = x < 0 ? [a, b] : [b, c];
        const at = b.t + x;
        const s = between(p.t, p.r, p.v, q.t, q.r, q.v, at);
        note('peak', b.load + slope * x + bend * x * x, {
          t: at,
          r: s.r,
          v: s.v,
          altitude: p.altitude + ((q.altitude - p.altitude) * (at - p.t)) / (q.t - p.t),
        });
      } else {
        const { load, ...at } = b;
        note('peak', load, at);
      }
    }
    events.sort((a, b) => a.t - b.t);
    const el = elements(start.r, start.v, flier.radius);
    return {
      kind: flier.kind,
      from: start.t,
      cutoff: flier.cutoff,
      points: sampledPoints,
      outcome,
      // going round, the highest and lowest of the whole turn; otherwise the top of the climb ahead, if there is one
      // (a turn begun at one end of the orbit comes back to that end as its last point, which is then no turning point of the path)
      apogee: orbit ? best([...tops, last()], 1) : (tops[0] ?? null),
      perigee: orbit ? best([...bottoms, last()], -1) : null,
      impact,
      horizon: limit,
      passes,
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
      const until = budget === undefined ? Number.POSITIVE_INFINITY : began + budget;
      if (!begun) {
        if (flier.prepare && !flier.prepare(until)) {
          cost += now() - began;
          return false;
        }
        begin();
      }
      while (!done) {
        advance();
        if (now() >= until) break;
      }
      // (then the path put at its own instants, in the same slices)
      if (done && (outcome === 'none' || now() < until || budget === 0 || grid)) {
        const out = outcome === 'none' ? points : sampled(until);
        if (out) answer = finish(out);
      }
      cost += now() - began;
      if (answer) answer.cost = cost;
      return answer !== null;
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
export function predictor(plan: FlightPlan, site: Geodetic, seaLevel: number, start: Start, options: PredictOptions = {}): Predictor {
  return propagate(ballistic(plan, site, seaLevel, start, options), start, { site, seaLevel, frame: options.frame }, options);
}

/** A ballistic flight's prediction, worked out at once. */
export function predict(plan: FlightPlan, site: Geodetic, seaLevel: number, start: Start, options: PredictOptions = {}): Prediction {
  const p = predictor(plan, site, seaLevel, start, options);
  p.run();
  return p.result;
}
