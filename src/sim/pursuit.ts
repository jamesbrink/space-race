/**
 * Manoeuvres made on another craft: the target as a craft of its own, and the guidance that works each burn from where
 * the two are as it lights (docs/agents/simulator.md, "One state, changed only by what pushes it").
 *
 * The target is integrated from where it began on its own forces and nothing else: no manoeuvre of the spacecraft's and no
 * observation of the record's moves it. A burn made on it (`Action.ignite.toward`, sim/plan.ts `Pursuit`) is a command
 * with a purpose, as the ground's and the crew's were: guidance solves its line and its length on the two states as they
 * are, by flying the burn ahead on the run's own forces until it does what it is for. The record's impulse, its
 * attitude and the ranges the crew read are what the run is then compared with (sim/misses.ts, tools/residuals.mjs).
 */
import type { OrbitalFix } from '../types/flight.ts';
import { EARTH, MOON } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import {
  add,
  cross,
  DEG,
  dot,
  geodeticToEcef,
  icrfToDate,
  length,
  rotate,
  scale,
  sub,
  transpose,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { stateOfMean } from '../world/meanelements.ts';
import { elementsOf, hermite, meanAnomaly, type State, stateOf, trueAnomaly } from '../world/orbit.ts';
import { EARTH_FIELD, type Field, stepIn } from './core/gravity.ts';
import type { OrbitElements, Pursuit, TargetOrbit } from './plan.ts';
import { type Condition, externalDv, type Fly, flyBurn, lambert, localVertical, type Steered, Steering, solveImpulse } from './steering.ts';

/**
 * A craft flown on its own forces from `from`, s from liftoff: its state at an instant, or nothing before it began or
 * after it came down. One the record gives at an instant (a published orbit, flown back from it as well as on) answers
 * before `from` too; another flight's vehicle is there from that flight's liftoff, which is `from` on this one's clock.
 */
export interface Target {
  from: number;
  at(t: number): State | undefined;
}

/**
 * A tracking vector of the record's as a state in a flight's frame (world/earthframe.ts), at the vector's own instant.
 * `zero` is the instant its `t` is counted from, on the flight's clock: 0 for one in the flight's own elapsed time. The
 * place over the Earth is laid in the frame by the Earth's angle in it at that instant, and the velocity built on it.
 * Space-fixed heading and flight-path angle are defined relative to the geocentric horizontal, even though the
 * reported latitude and height are geodetic (Apollo 9 MR, table 7-I).
 */
export function fixState(fix: OrbitalFix, frame: EarthFrame, zero = 0): State & { t: number } {
  const t = zero + fix.t.value;
  const earth = geodeticToEcef({ latitude: fix.latitude.value, longitude: fix.longitude.value, height: fix.height.value });
  const r = frame.toInertial(earth, t),
    up = unit(r),
    east = unit(cross([0, 0, 1], up)),
    north = cross(up, east);
  const heading = DEG * fix.heading.value,
    path = DEG * fix.flightPath.value;
  const horizontal = add(scale(north, Math.cos(heading)), scale(east, Math.sin(heading)));
  const v = scale(add(scale(horizontal, Math.cos(path)), scale(up, Math.sin(path))), fix.speed.value);
  return { t, r, v };
}

/**
 * A published element set as a state in a flight's frame, at the set's own instant (`zero` as `fixState`'s): the
 * osculating orbit's state (world/orbit.ts `stateOf`), or a mean orbit's at its mean anomaly (world/meanelements.ts
 * `stateOfMean`: Kozai's short-periodic terms put back), turned into the frame from the equator and equinox the set is
 * referred to: the true ones of its own date, through the ICRF, or the ICRF's.
 */
export function elementsState(el: OrbitElements, frame: EarthFrame, zero = 0): State & { t: number } {
  const t = zero + el.t.value;
  const [a, e] = [el.axis.value, el.eccentricity.value];
  const [i, node, argp, anomaly] = [el.inclination, el.node, el.perigee, el.anomaly].map((x) => x.value * DEG) as [
    number,
    number,
    number,
    number,
  ];
  if (el.kind.is === 'mean' && el.frame !== 'of-date')
    throw new Error('mean elements are of the true equator of date, whose pole J2 is about: an element set in the ICRF is osculating');
  const s =
    el.kind.is === 'mean'
      ? stateOfMean({ a, e, i, node, argp, mean: el.anomalyIs === 'mean' ? anomaly : meanAnomaly(anomaly, e) })
      : stateOf({ a, e, i, node, argp, nu: el.anomalyIs === 'true' ? anomaly : trueAnomaly(anomaly, e) });
  if (el.frame === 'icrf') return { t, r: frame.fromIcrf(s.r), v: frame.fromIcrf(s.v) };
  const back = transpose(icrfToDate(frame.jdTT(t)));
  return { t, r: frame.fromIcrf(rotate(back, s.r)), v: frame.fromIcrf(rotate(back, s.v)) };
}

/** A published orbit as a state in a flight's frame, at its own instant: its tracking vector's, or its element set's. */
export function publishedState(orbit: TargetOrbit, frame: EarthFrame, zero = 0): State & { t: number } {
  return 'fix' in orbit ? fixState(orbit.fix, frame, zero) : elementsState(orbit.elements, frame, zero);
}

/** How often the target's state is kept, s: a cubic between two is within a millimetre of the orbit flown. */
const EVERY = 10;

/**
 * A craft flown on from `start` by gravity (`field`: the Earth with J2 unless given) and `push` (everything else on it, m/s^2: the air), in steps of ten seconds,
 * as far as it is asked for and no further, until `ended` says it is down. What it has flown is kept, so an instant
 * asked for twice is the same state. With `back`, a craft the record gives at `start` and that was there before it (a
 * published orbit): an instant before `start` is answered by flying the same forces back from it, in the same steps.
 */
export function flownFrom(
  start: { t: number; r: Vec3; v: Vec3 },
  push: (s: State, at: number) => Vec3,
  ended: (s: State, at: number) => boolean,
  field: Field = EARTH_FIELD,
  back = false,
): Target {
  const samples: (State & { t: number })[] = [{ t: start.t, r: start.r, v: start.v }];
  /** Flown back from the start: the k-th is k steps before it. */
  const earlier: (State & { t: number })[] = [samples[0]!];
  let over = false;
  return {
    from: start.t,
    at(t) {
      if (back && t < start.t) {
        while (earlier[earlier.length - 1]!.t > t) {
          const last = earlier[earlier.length - 1]!;
          earlier.push({ ...stepIn(field, last, last.t, -EVERY, push), t: start.t - earlier.length * EVERY });
        }
        const i = Math.min(earlier.length - 2, Math.floor((start.t - t) / EVERY));
        const a = earlier[i + 1]!;
        const b = earlier[i]!;
        return hermite(a.t, a.r, a.v, b.t, b.r, b.v, t);
      }
      if (!(t >= start.t)) return undefined;
      while (!over && samples[samples.length - 1]!.t < t) {
        const last = samples[samples.length - 1]!;
        const next = { ...stepIn(field, last, last.t, EVERY, push), t: start.t + samples.length * EVERY };
        if (ended(next, next.t)) over = true;
        else samples.push(next);
      }
      const end = samples[samples.length - 1]!;
      if (t > end.t) return undefined;
      const i = Math.min(samples.length - 2, Math.floor((t - start.t) / EVERY));
      if (i < 0) return { r: end.r, v: end.v };
      const a = samples[i]!;
      const b = samples[i + 1]!;
      return hermite(a.t, a.r, a.v, b.t, b.r, b.v, t);
    },
  };
}

/**
 * Where a point is from a craft, m: `ahead` along the craft's orbit (the arc between the two as seen from the Earth's
 * centre, on the point's radius), `above` (the point's distance from the centre less the craft's) and `across` (out of
 * the craft's plane, toward its orbit's pole). For a point close by these are its distances along the motion laid level,
 * up the line from the centre, and to the left.
 */
export function placeFrom(craft: State, point: Vec3): { ahead: number; above: number; across: number } {
  const up = unit(craft.r);
  const normal = unit(cross(craft.r, craft.v));
  const forward = cross(normal, up);
  const d = length(point);
  return { ahead: d * Math.atan2(dot(point, forward), dot(point, up)), above: d - length(craft.r), across: dot(point, normal) };
}

/** A burn as guidance gives it: the line it pushes along, fixed, and how long, s. */
export interface Burn {
  line: Vec3;
  length: number;
}

/**
 * The run's own forces flown ahead from a state: from `from` to `to`, with a burn of `accel` m/s^2 along `line` from the
 * start until `until`. What a burn is solved on.
 */
export type Ahead = (s: State, from: number, to: number, burn?: { line: Vec3; accel: number; until: number }) => State;

/** Cramer's rule for three equations; null where they are not independent. */
function solve3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]): number =>
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const D = det(A);
  if (!(Math.abs(D) > 1e-12)) return null;
  return [0, 1, 2].map((j) => det(A.map((row, i) => row.map((y, k) => (k === j ? b[i]! : y)))) / D);
}

/**
 * The burn that puts the target at `want` from the craft at the instant `at` and in its plane: lit at `t` from `state`,
 * pushing `accel` m/s^2 for as long as it takes. Found by flying it ahead (`ahead`) and correcting the impulse by what
 * the flight ahead missed by (Newton's method on the three components, their slopes by differences of 5 cm/s), from the
 * record's own impulse `guess`, m/s; within a metre. Null where the target is not there to aim at or no burn does it.
 */
export function reach(
  ahead: Ahead,
  target: Target,
  state: State,
  t: number,
  accel: number,
  want: { ahead: number; above: number },
  at: number,
  guess: Vec3,
): Burn | null {
  const there = target.at(at);
  if (!there || !(at > t) || !(accel > 0)) return null;
  const miss = (dv: Vec3): number[] => {
    const size = length(dv);
    const end = ahead(state, t, at, size > 0 ? { line: scale(dv, 1 / size), accel, until: Math.min(at, t + size / accel) } : undefined);
    const p = placeFrom(end, there.r);
    return [p.ahead - want.ahead, p.above - want.above, p.across];
  };
  let dv = guess;
  const STEP = 0.05;
  for (let k = 0; k < 20; k++) {
    const f = miss(dv);
    if (Math.hypot(...f) < 1) {
      const size = length(dv);
      return size > 0 ? { line: scale(dv, 1 / size), length: size / accel } : { line: unit(state.v), length: 0 };
    }
    const J = [0, 1, 2].map((j) => {
      const moved = miss(dv.map((x, i) => (i === j ? x + STEP : x)) as unknown as Vec3);
      return moved.map((y, i) => (y - f[i]!) / STEP);
    });
    // (J[j][i]: how miss i moves with impulse j; the step is the one that takes the miss away)
    const d = solve3(
      [0, 1, 2].map((i) => [0, 1, 2].map((j) => J[j]![i]!)),
      f.map((y) => -y),
    );
    if (!d) return null;
    // (never more than 30 m/s at once: far from the answer the slopes are not the answer's)
    const most = Math.max(1, Math.hypot(...d) / 30);
    dv = dv.map((x, i) => x + d[i]! / most) as unknown as Vec3;
  }
  return null;
}

/**
 * The burn along the level motion (forward, or back where `guess` is negative) that puts the target so far ahead of the
 * craft, or so far above it, at the instant `at`: lit at `t` from `state`, pushing `accel` m/s^2 along the line the level
 * motion has as it lights for as long as it takes. Found as `reach` finds its burn, on its one unknown (Newton's method,
 * its slope by a difference of 5 cm/s), from the record's own impulse; within a metre. Null where the target is not there
 * to aim at or no such burn does it.
 */
export function level(
  ahead: Ahead,
  target: Target,
  state: State,
  t: number,
  accel: number,
  want: { ahead: number } | { above: number },
  at: number,
  guess: number,
): Burn | null {
  const there = target.at(at);
  if (!there || !(at > t) || !(accel > 0)) return null;
  const up = unit(state.r);
  const forward = unit(sub(state.v, scale(up, dot(state.v, up))));
  const lineOf = (dv: number): Vec3 => scale(forward, dv < 0 ? -1 : 1);
  const miss = (dv: number): number => {
    const size = Math.abs(dv);
    const end = ahead(state, t, at, size > 0 ? { line: lineOf(dv), accel, until: Math.min(at, t + size / accel) } : undefined);
    const p = placeFrom(end, there.r);
    return 'ahead' in want ? p.ahead - want.ahead : p.above - want.above;
  };
  let dv = guess;
  const STEP = 0.05;
  for (let k = 0; k < 30; k++) {
    const f = miss(dv);
    if (Math.abs(f) < 1) return { line: lineOf(dv), length: Math.abs(dv) / accel };
    const slope = (miss(dv + STEP) - f) / STEP;
    if (!(Math.abs(slope) > 1e-9)) return null;
    // (never more than 30 m/s at once, as `reach`)
    dv += Math.max(-30, Math.min(30, -f / slope));
  }
  return null;
}

/**
 * The burn a firing made on the target asks for (`toward`: a reach, a level or a coelliptic burn; a station is held, not
 * solved), lit at `t` from `state` at `accel` m/s^2, flown ahead by `ahead`: `aimed`, the instant a reach is aimed at,
 * and the record's own impulse (its line, and its size, m/s), each solve's first guess. Null where none is to be had.
 */
export function solveToward(
  toward: Exclude<Pursuit, { station: unknown }>,
  ahead: Ahead,
  target: Target,
  state: State,
  t: number,
  accel: number,
  aimed: number,
  recorded: { line: Vec3; velocity: number },
): Burn | null {
  if ('reach' in toward)
    return reach(
      ahead,
      target,
      state,
      t,
      accel,
      { ahead: toward.reach.ahead.value, above: toward.reach.above.value },
      aimed,
      scale(recorded.line, recorded.velocity),
    );
  if ('level' in toward) {
    const want = 'ahead' in toward.level ? { ahead: toward.level.ahead.value } : { above: toward.level.above.value };
    return level(ahead, target, state, t, accel, want, toward.at.value, recorded.velocity * (dot(recorded.line, state.v) < 0 ? -1 : 1));
  }
  const dv = coelliptic(target, state, t, undefined, 'planar' in toward && toward.planar === true);
  return dv && { line: unit(dv), length: length(dv) / accel };
}

/**
 * The change of velocity that leaves a craft on an orbit of the target's shape (coelliptic: the same centre and the same
 * line of apsides, the height between the two the same all the way round), m/s: the target is taken where it passes
 * over the craft's place (a little before or after now, by the angle between them), and the craft is given the axis
 * shorter by the height between them there, the climb the target has there scaled by the axes' ratio to the power 3/2,
 * and the level speed that axis gives, in its own plane (with `inPlane`, in the target's: the level motion laid along the
 * target's plane where the craft is). Null where the target is not there.
 */
export function coelliptic(target: Target, state: State, t: number, gm = EARTH.gm.value, inPlane = false): Vec3 | null {
  let over = target.at(t);
  let dt = 0;
  for (let k = 0; over && k < 4; k++) {
    const angle = placeFrom(state, over.r).ahead / length(over.r);
    dt -= angle / (length(cross(over.r, over.v)) / dot(over.r, over.r));
    over = target.at(t + dt);
  }
  if (!over) return null;
  const [theirs, mine] = [length(over.r), length(state.r)];
  const axis = 1 / (2 / theirs - dot(over.v, over.v) / gm);
  const own = axis - (theirs - mine);
  const climb = (dot(over.v, over.r) / theirs) * (axis / own) ** 1.5;
  const level = Math.sqrt(gm * (2 / mine - 1 / own) - climb * climb);
  const up = unit(state.r);
  const forward = inPlane ? unit(cross(unit(cross(over.r, over.v)), up)) : cross(unit(cross(state.r, state.v)), up);
  return sub(add(scale(forward, level), scale(up, climb)), state.v);
}

/** The shortest time the braking is worked over, s: held at its station, the thrust is what brings it back in about a minute. */
const HOLD = 60;

/**
 * The thrust commanded to come to rest with the target at `want` from the craft by the instant `by`, and to stay there
 * after it, m/s^2: the acceleration that closes the distance to that place and the speed relative to it together in the
 * time left (six times the distance over the time squared, four times the speed over the time), with the difference of
 * gravity between the two places allowed for, never more than `cap`. The place is laid off in the target's own frame
 * (along its motion, up its line from the centre) and turns with it.
 */
export function stationPush(
  target: Target,
  s: State,
  at: number,
  want: { ahead: number; above: number },
  by: number,
  cap: number,
  field: Field = EARTH_FIELD,
): Vec3 {
  const it = target.at(at);
  if (!it) return [0, 0, 0];
  const up = unit(it.r);
  const forward = cross(unit(cross(it.r, it.v)), up);
  const offset = add(scale(forward, -want.ahead), scale(up, -want.above));
  const spin = scale(cross(it.r, it.v), 1 / dot(it.r, it.r));
  const place = add(it.r, offset);
  const speed = add(it.v, cross(spin, offset));
  const left = Math.max(HOLD, by - at);
  const wish = add(
    add(scale(sub(place, s.r), 6 / (left * left)), scale(sub(speed, s.v), 4 / left)),
    sub(field.at(place, at), field.at(s.r, at)),
  );
  const size = length(wish);
  return size > cap ? scale(wish, cap / size) : wish;
}

/** How high a craft sees a point above its horizontal, radians: the angle from its level to the line of sight (both from the same centre). */
export function elevationOf(craft: State, point: Vec3): number {
  const sight = sub(point, craft.r);
  return Math.asin(Math.max(-1, Math.min(1, dot(sight, unit(craft.r)) / length(sight))));
}

/** A state about the body a craft is flown about at an instant, with that body's gravitational parameter and the radius heights are above, m. */
export interface Centred {
  body: 'earth' | 'moon';
  s: State;
  gm: number;
  radius: number;
}

/**
 * What a burn solved on the run's own state is solved with (`solveBurn`): the run's forces one step ahead (`fly`, states
 * about the Earth in the flight's axes, as the coast keeps them: one step of the integrator) and gravity on a state, about
 * the body it is about (`gravity`, for the Lambert mode); the state about the body it is about (`about`); the height above the Earth's surface (`height`, for the entry
 * interface); the Moon's place and velocity from the Earth's centre (`moon`, for a pericynthion); the central body's
 * acceleration less its point mass's (`oblate`, about the Earth only); the thrust's acceleration at an instant
 * (`accel`) and the exhaust's speed (`exhaust`), m/s; the target where there is one.
 */
export interface BurnContext {
  fly: Fly;
  gravity(s: State, t: number): Vec3;
  about(s: State, t: number): Centred;
  height(s: State, t: number): number;
  moon?(t: number): State;
  /** The Moon's pole (its principal axis of the greatest moment, world/moon.ts `principalAxes`) in the flight's axes at an instant: a field with the Moon's. */
  moonPole?(t: number): Vec3;
  oblate?(r: Vec3): Vec3;
  accel(t: number): number;
  exhaust?: number;
  target?: Target;
}

/** A burn solved on the run's state: its steering from ignition, the burn as it was flown ahead, and what it was found to reach. */
export interface Solved {
  steering: () => Steering;
  burn: Steered;
  reached: Record<string, number>;
}

/** The coast's step ahead, s: a two-hundredth of a radian of the motion about the centre where it is, between 10 s and 10 minutes. */
function coastStep(ctx: BurnContext, s: State, t: number): number {
  const c = ctx.about(s, t);
  const r = length(c.s.r);
  return Math.max(10, Math.min(600, 0.005 * Math.sqrt((r * r * r) / c.gm)));
}

/**
 * The coast flown ahead from a state until `event` (a function of the state and the instant) passes from below nought to
 * nought or above, the instant found by bisection to a millisecond from the step it fell in; null where it does not
 * within `limit` seconds.
 */
function coastTo(
  ctx: BurnContext,
  s: State,
  t: number,
  event: (s: State, t: number) => number,
  limit: number,
): { s: State; t: number } | null {
  let [x, at] = [s, t];
  let was = event(x, at);
  while (at < t + limit) {
    const h = coastStep(ctx, x, at);
    const next = ctx.fly(x, at, at + h);
    const now = event(next, at + h);
    if (was < 0 && now >= 0) {
      let [lo, hi] = [0, h];
      while (hi - lo > 1e-3) {
        const mid = (lo + hi) / 2;
        if (event(ctx.fly(x, at, at + mid), at + mid) < 0) lo = mid;
        else hi = mid;
      }
      return { s: ctx.fly(x, at, at + hi), t: at + hi };
    }
    [x, at, was] = [next, at + h, now];
  }
  return null;
}

/** The coast flown ahead from a state to the instant `to`, its last step cut to end there. */
function coastFor(ctx: BurnContext, s: State, t: number, to: number): State {
  let [x, at] = [s, t];
  while (at < to - 1e-9) {
    const h = Math.min(coastStep(ctx, x, at), to - at);
    x = ctx.fly(x, at, at + h);
    at = Math.abs(at + h - to) < 1e-9 ? to : at + h;
  }
  return x;
}

/** The nearest point of the conic a state about a centre is on: its distance from the centre, m, and the instant, s (the next or the last). */
function periapsisOf(s: State, t: number, gm: number): { r: number; at: number } {
  const el = elementsOf(s.r, s.v, gm);
  const nu = el.nu > Math.PI ? el.nu - 2 * Math.PI : el.nu;
  const rate = Math.sqrt(gm / Math.abs(el.a) ** 3);
  const mean =
    el.e < 1
      ? (() => {
          const E = 2 * Math.atan2(Math.sqrt(1 - el.e) * Math.sin(nu / 2), Math.sqrt(1 + el.e) * Math.cos(nu / 2));
          return E - el.e * Math.sin(E);
        })()
      : (() => {
          const F = 2 * Math.atanh(Math.sqrt((el.e - 1) / (el.e + 1)) * Math.tan(nu / 2));
          return el.e * Math.sinh(F) - F;
        })();
  return { r: el.a * (1 - el.e), at: t - mean / rate };
}

/** The impulse in the local vertical that takes a state to the orbit about its centre with these radii, m/s: by vis-viva, where the radius it is at lies between them. */
function toOrbit(c: Centred, ra: number, rp: number): Vec3 {
  const r = length(c.s.r);
  const a = (ra + rp) / 2;
  const speed = Math.sqrt(Math.max(0, c.gm * (2 / r - 1 / a)));
  const h = Math.sqrt(c.gm * a * (1 - ((ra - rp) / (ra + rp)) ** 2));
  const level = Math.min(speed, h / r);
  const climb = Math.sqrt(Math.max(0, speed * speed - level * level)) * Math.sign(dot(c.s.r, c.s.v) || 1);
  const [X, Y, Z] = localVertical(c.s);
  const want = add(scale(X, level), scale(Z, -climb));
  const dv = sub(want, c.s.v);
  return [dot(dv, X), dot(dv, Y), dot(dv, Z)];
}

/** A target about the body a craft is about. */
const centredTarget = (ctx: BurnContext, target: Target): Target => ({
  from: target.from,
  at: (t) => {
    const it = target.at(t);
    return it && ctx.about(it, t).s;
  },
});

/**
 * The burn that does what `toward` is for, solved on the state as it lights at `t` (the targeting the ground or the
 * computer did), and steered from there as the computer steered it (sim/steering.ts). External ΔV for an orbit, a
 * pericynthion, an entry, a phasing and a plane: its impulse in the local vertical corrected until the steered burn,
 * flown ahead on the run's forces, does it. A Lambert aim point for an intercept from an elevation. Null where nothing does
 * (the caller flies the record's burn), or for a kind this does not solve (a reach, the coelliptic burn, a station).
 */
export function solveBurn(toward: Pursuit, ctx: BurnContext, state: State, t: number): Solved | null {
  const here = ctx.about(state, t);
  const centred = (s: State, at: number): State => ctx.about(s, at).s;
  const external = (lv: Vec3) => () =>
    new Steering({ external: externalDv(here.s, lv, ctx.accel(t)) }, t, state, ctx.accel, ctx.exhaust, centred);
  const fly = (make: () => Steering): Steered => flyBurn(ctx.fly, state, t, make(), (s, at) => ctx.gravity(s, at));
  type Report = (s: State, at: number) => Record<string, number>;
  const solve = (want: Condition, guess: Vec3, free: number[], report: Report): Solved | null => {
    const found = solveImpulse((lv) => fly(external(lv)), want, guess, free);
    return found && { steering: external(found.lv), burn: found.burn, reached: report(found.burn.state, found.burn.t) };
  };
  if ('orbit' in toward) {
    // (where the craft is lower than the lowest point asked for, or higher than the highest, no orbit through it has them:
    // heights the record gives over a sphere it was not quite flown about can leave it so, a few hundred metres, and the
    // nearer of the two is then taken where it is)
    const r = length(here.s.r);
    const [ra, rp] = [Math.max(r, here.radius + toward.orbit.apoapsis.value), Math.min(r, here.radius + toward.orbit.periapsis.value)];
    // (the energy and the lowest point: both go smoothly through a parabola, where the highest point does not)
    const energy = -here.gm / (ra + rp);
    const report: Report = (s, at) => {
      const c = ctx.about(s, at);
      const el = elementsOf(c.s.r, c.s.v, c.gm);
      return { apoapsis: el.a * (1 + el.e) - c.radius, periapsis: el.a * (1 - el.e) - c.radius };
    };
    return solve(
      {
        miss: (s, at) => {
          const c = ctx.about(s, at);
          return [dot(c.s.v, c.s.v) / 2 - c.gm / length(c.s.r) - energy, periapsisOf(c.s, at, c.gm).r - rp];
        },
        tolerance: [(here.gm / (ra + rp) ** 2) * 10, 10],
      },
      toOrbit(here, ra, rp),
      [0, 2],
      report,
    );
  }
  if ('pericynthion' in toward) {
    const moon = ctx.moon;
    if (!moon) return null;
    const { height, at: when, inclination } = toward.pericynthion;
    const pole = inclination && ctx.moonPole;
    if (inclination && !pole) return null;
    /** The inclination of the motion about the Moon to its equator, degrees (over 90: retrograde). */
    const tilt = (p: State, w: number): number =>
      pole ? Math.acos(Math.max(-1, Math.min(1, dot(unit(cross(p.r, p.v)), pole(w))))) / DEG : 0;
    const nearest = (s: State, at: number): { height: number; at: number; inclination: number } | null => {
      const from = (x: State, w: number): State => {
        const m = moon(w);
        return { r: sub(x.r, m.r), v: sub(x.v, m.v) };
      };
      const radius = MOON.equatorialRadius.value;
      const gm = MOON.gm.value;
      // (flown to where it stops closing on the Moon, or to the Moon's surface, where the conic it is on there gives its nearest)
      const end = coastTo(
        ctx,
        s,
        at,
        (x, w) => {
          const p = from(x, w);
          return length(p.r) < radius ? 1 : dot(p.r, p.v);
        },
        20 * 86_400,
      );
      if (!end) return null;
      const p = from(end.s, end.t);
      if (length(p.r) >= radius) return { height: length(p.r) - radius, at: end.t, inclination: tilt(p, end.t) };
      const q = periapsisOf(p, end.t, gm);
      return { height: q.r - radius, at: q.at, inclination: tilt(p, end.t) };
    };
    const report: Report = (s, at) => {
      const n = nearest(s, at);
      const out: Record<string, number> = {};
      if (n) Object.assign(out, { pericynthion: n.height, pericynthionAt: n.at, ...(inclination ? { inclination: n.inclination } : {}) });
      return out;
    };
    return solve(
      {
        miss: (s, at) => {
          const n = nearest(s, at);
          return n && [n.height - height.value, n.at - when.value];
        },
        tolerance: [10, 1],
        // (the plane, met where it can be and otherwise as near as it goes: an approach comes in at its own angle to the
        // Moon's equator, and no orbit about the Moon from it is tilted less than that)
        ...(inclination
          ? {
              nearest: {
                miss: (s: State, at: number) => {
                  const n = nearest(s, at);
                  return n && n.inclination - inclination.value;
                },
                tolerance: 0.01,
              },
            }
          : {}),
      },
      [0, 0, 0],
      [0, 1, 2],
      report,
    );
  }
  if ('entry' in toward) {
    const { flightPathAngle, height, at: when } = toward.entry;
    const want = Math.cos(flightPathAngle.value * DEG);
    /**
     * Where it comes through the interface: there, or (where it does not come down so far) at its nearest to the Earth,
     * with the cosine of the angle it would come through at on the conic it is on there, so the miss runs smoothly
     * from passing over to coming through.
     */
    const through = (s: State, at: number): { cos: number; at: number; angle: number } | null => {
      const end = coastTo(
        ctx,
        s,
        at,
        (x, w) => {
          const c = ctx.about(x, w);
          if (c.body !== 'earth') return -1;
          return Math.max(height.value - ctx.height(x, w), length(x.r) < 1e8 ? dot(x.r, x.v) : -1);
        },
        20 * 86_400,
      );
      if (!end) return null;
      const r = length(end.s.r);
      const edge = r - (ctx.height(end.s, end.t) - height.value);
      const gm = EARTH.gm.value;
      const speed = Math.sqrt(Math.max(0, dot(end.s.v, end.s.v) + 2 * gm * (1 / edge - 1 / r)));
      const angle = Math.asin(Math.max(-1, Math.min(1, dot(end.s.r, end.s.v) / (r * length(end.s.v))))) / DEG;
      return { cos: length(cross(end.s.r, end.s.v)) / (edge * speed), at: end.t, angle };
    };
    const report: Report = (s, at) => {
      const x = through(s, at);
      const out: Record<string, number> = {};
      if (x) Object.assign(out, { interfaceAngle: x.angle, interfaceAt: x.at });
      return out;
    };
    // (from about the Moon the first guess is along the motion, enough to leave it at the speed that falls from the Moon's
    // distance to the interface: the Moon's speed about the Earth less that of the ellipse between the two at its top)
    const guess: [number, number, number] = [0, 0, 0];
    if (here.body === 'moon' && ctx.moon) {
      const m = ctx.moon(t);
      const [top, low] = [length(m.r), EARTH.equatorialRadius.value + height.value];
      const gmE = EARTH.gm.value;
      const away = length(m.v) - Math.sqrt((2 * gmE * low) / (top * (top + low)));
      guess[0] = Math.sqrt(away * away + (2 * here.gm) / length(here.s.r)) - length(here.s.v);
      // (and more, by twentieths, until the flight ahead comes back to the Earth at all: a faster return than the slowest)
      for (let k = 0; k < 20; k++) {
        const b = fly(external(guess));
        if (through(b.state, b.t)) break;
        guess[0] *= 1.05;
      }
    }
    return solve(
      {
        miss: (s, at) => {
          const x = through(s, at);
          return x && [x.cos - want, ...(when ? [x.at - when.value] : [])];
        },
        tolerance: [1e-6, 1],
      },
      guess,
      [0, 1, 2],
      report,
    );
  }
  const target = ctx.target && centredTarget(ctx, ctx.target);
  if (!target?.at(t)) return null;
  if ('phase' in toward) {
    const { elevation, at: when } = toward.phase;
    const period = (c: Centred): number => 2 * Math.PI * Math.sqrt(Math.abs(elementsOf(c.s.r, c.s.v, c.gm).a) ** 3 / c.gm);
    /** The target's elevation at the instant asked for, after the coelliptic burn at the next apsis (impulsive, as P32 predicts it). */
    const seen = (s: State, at: number): number | null => {
      const c = ctx.about(s, at);
      const skip = period(c) / 8;
      const start = { s: coastFor(ctx, s, at, at + skip), t: at + skip };
      const sense = Math.sign(dot(ctx.about(start.s, start.t).s.r, ctx.about(start.s, start.t).s.v)) || 1;
      const apsis = coastTo(ctx, start.s, start.t, (x, w) => -sense * dot(ctx.about(x, w).s.r, ctx.about(x, w).s.v), period(c));
      if (!apsis || apsis.t > when.value) return null;
      const there = ctx.about(apsis.s, apsis.t);
      const dv = coelliptic(target, there.s, apsis.t, there.gm);
      if (!dv) return null;
      const after = { r: apsis.s.r, v: add(apsis.s.v, dv) };
      const end = coastFor(ctx, after, apsis.t, when.value);
      const it = target.at(when.value);
      if (!it) return null;
      return elevationOf(ctx.about(end, when.value).s, it.r);
    };
    return solve(
      {
        miss: (s, at) => {
          const e = seen(s, at);
          return e === null ? null : [e - elevation.value * DEG];
        },
        tolerance: [1e-5],
      },
      [0, 0, 0],
      [0],
      (s, at): Record<string, number> => {
        const e = seen(s, at);
        return e === null ? {} : { elevation: e / DEG };
      },
    );
  }
  if ('plane' in toward) {
    const normalAt = (at: number): Vec3 => {
      const it = target.at(at)!;
      return unit(cross(it.r, it.v));
    };
    // (its motion in the target's plane, at the speed it had: where the two planes cross, that is the plane)
    const speed = length(here.s.v);
    const tilt = (s: State, at: number): number[] => {
      const c = ctx.about(s, at).s;
      return [dot(unit(c.v), normalAt(at)), length(c.v) - speed];
    };
    const wedge = (s: State, at: number): number => {
      const c = ctx.about(s, at).s;
      return Math.acos(Math.min(1, dot(unit(cross(c.r, c.v)), normalAt(at)))) / DEG;
    };
    // (the level motion turned into the target's plane, its speed and the climb kept)
    const up = unit(here.s.r);
    const level = sub(here.s.v, scale(up, dot(here.s.v, up)));
    const turned = scale(unit(cross(normalAt(t), up)), length(level));
    const dv = sub(turned, level);
    const [X, Y, Z] = localVertical(here.s);
    return solve({ miss: tilt, tolerance: [1e-7, 0.01] }, [dot(dv, X), dot(dv, Y), dot(dv, Z)], [0, 1], (s, at) => ({
      wedge: wedge(s, at),
    }));
  }
  if ('elevation' in toward) {
    // The intercept from an elevation (P34): aimed at where the target is once it has gone `travel` round its orbit,
    // the aim offset by what the coast ahead misses it by (twice), then steered on Lambert's solution every cycle.
    const from = target.at(t)!;
    const n = unit(cross(from.r, from.v));
    const swept = (at: number): number => {
      const to = target.at(at);
      if (!to) return Number.NaN;
      const a = Math.atan2(dot(cross(from.r, to.r), n), dot(from.r, to.r));
      return a < 0 ? a + 2 * Math.PI : a;
    };
    const travel = toward.elevation.travel.value * DEG;
    const a = elementsOf(from.r, from.v, here.gm).a;
    if (!(a > 0) || !(travel > 0 && travel < 2 * Math.PI)) return null;
    let [lo, hi] = [0, 0.999 * 2 * Math.PI * Math.sqrt(a ** 3 / here.gm)];
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (swept(t + mid) < travel) lo = mid;
      else hi = mid;
    }
    const meet = t + (lo + hi) / 2;
    const there = target.at(meet);
    if (!there) return null;
    let aim = there.r;
    for (let k = 0; k < 2; k++) {
      const v = lambert(here.s.r, aim, meet - t, here.gm, cross(here.s.r, here.s.v));
      if (!v) return null;
      const end = coastFor(ctx, { r: state.r, v: add(state.v, sub(v.v1, here.s.v)) }, t, meet);
      aim = sub(aim, sub(ctx.about(end, meet).s.r, there.r));
    }
    const oblate = here.body === 'earth' ? ctx.oblate : undefined;
    const make = () =>
      new Steering({ lambert: { r: aim, at: meet, gm: here.gm, c: 1 } }, t, state, ctx.accel, ctx.exhaust, centred, oblate);
    const burn = fly(make);
    const end = coastFor(ctx, burn.state, burn.t, meet);
    return { steering: make, burn, reached: { meetAt: meet, miss: length(sub(ctx.about(end, meet).s.r, there.r)) } };
  }
  return null;
}

/** The kinds solved at lighting and steered (`solveBurn`), by the name they are given in the plan; undefined for the others. */
export function steeredKind(p: Pursuit): 'pericynthion' | 'orbit' | 'entry' | 'phase' | 'plane' | 'elevation' | undefined {
  return (['pericynthion', 'orbit', 'entry', 'phase', 'plane', 'elevation'] as const).find((k) => k in p);
}

/** Whether a burn is made on another craft and needs it there to be solved. */
export const needsTarget = (p: Pursuit): boolean => !('pericynthion' in p || 'orbit' in p || 'entry' in p);
