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
import { EARTH } from '../world/bodies.ts';
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
import { hermite, meanAnomaly, type State, stateOf, trueAnomaly } from '../world/orbit.ts';
import { EARTH_FIELD, type Field, stepIn } from './core/gravity.ts';
import type { OrbitElements, TargetOrbit } from './plan.ts';

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
 * The change of velocity that leaves a craft on an orbit of the target's shape (coelliptic: the same centre and the same
 * line of apsides, the height between the two the same all the way round), m/s: the target is taken where it passes
 * over the craft's place (a little before or after now, by the angle between them), and the craft is given the axis
 * shorter by the height between them there, the climb the target has there scaled by the axes' ratio to the power 3/2,
 * and the level speed that axis gives, in its own plane. Null where the target is not there.
 */
export function coelliptic(target: Target, state: State, t: number): Vec3 | null {
  let over = target.at(t);
  let dt = 0;
  for (let k = 0; over && k < 4; k++) {
    const angle = placeFrom(state, over.r).ahead / length(over.r);
    dt -= angle / (length(cross(over.r, over.v)) / dot(over.r, over.r));
    over = target.at(t + dt);
  }
  if (!over) return null;
  const gm = EARTH.gm.value;
  const [theirs, mine] = [length(over.r), length(state.r)];
  const axis = 1 / (2 / theirs - dot(over.v, over.v) / gm);
  const own = axis - (theirs - mine);
  const climb = (dot(over.v, over.r) / theirs) * (axis / own) ** 1.5;
  const level = Math.sqrt(gm * (2 / mine - 1 / own) - climb * climb);
  const up = unit(state.r);
  const forward = cross(unit(cross(state.r, state.v)), up);
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
