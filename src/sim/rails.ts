/**
 * A coast flown on rails, for a clock that runs faster than an hour a second (world/clock.ts `COAST_RATES`;
 * docs/agents/world.md, "Faster than an hour a second"). At 10,000 times a frame is three minutes of the flight and at
 * 100,000 half an hour, so nothing may be flown frame by frame: what is flown between two events is flown here, by an
 * adaptive Dormand-Prince 5(4) pair that steps by its own error and ends exactly on the instant asked for (`coast`), and
 * the clock is held at the next instant that must be lived (`due`, for `clock.hold`), and let go past an hour a second
 * only while there is nothing to do but fall round (`onRails`).
 */
import { acceleration } from './core/rk4.ts';
import { EARTH_GRAVITY, fieldOf, type GravityTerm } from './core/gravity.ts';
import { add, length, scale, sub, type Vec3 } from '../world/frames.ts';

/** Below this height above the sea, m, a coast is not on rails: the air takes enough of its speed in a revolution (a few m/s at 120 km) that it is flown as the live simulator flies it. Chosen. */
export const RAILS_FLOOR = 120_000;

/** The pair's tolerance on a step's error, m in place: a coast of a day ends within a few metres of the fixed-step run (tests/rails.test.mjs). */
const TOLERANCE = 1e-3;

// Dormand and Prince's coefficients (J. R. Dormand and P. J. Prince, "A family of embedded Runge-Kutta formulae", Journal
// of Computational and Applied Mathematics 6, 19-26, 1980, Table 2): the stages' nodes and weights, the fifth-order
// solution and its fourth-order companion's difference.
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A: readonly (readonly number[])[] = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const E = [71 / 57600, 0, -71 / 16695, 71 / 1920, -17253 / 339200, 22 / 525, -1 / 40];

/**
 * A coast from `state` at `t0` to exactly `t1` (seconds from liftoff, either way), in the flight's frame, under `gravity`
 * (core/gravity.ts terms: the Earth with J2 unless given) and `push` (anything else on it, m/s^2: the air's drag on a
 * spacecraft, or none), by the adaptive pair. However long the span, it costs steps by the path's curvature, not by the
 * span: a revolution of a low orbit is some forty.
 */
export function coast(
  state: { r: Vec3; v: Vec3 },
  t0: number,
  t1: number,
  gravity: readonly GravityTerm[] = EARTH_GRAVITY,
  push: ((t: number, r: Vec3, v: Vec3) => Vec3) | null = null,
): { r: Vec3; v: Vec3; steps: number } {
  const field = fieldOf(gravity);
  const accel = (t: number, r: Vec3, v: Vec3): Vec3 => acceleration(field(r, t), push ? push(t, r, v) : null);
  let [t, r, v] = [t0, state.r, state.v];
  const way = Math.sign(t1 - t0);
  let h = way * Math.min(Math.abs(t1 - t0), 10);
  let steps = 0;
  while (way !== 0 && (t1 - t) * way > 0) {
    if ((t + h - t1) * way > 0) h = t1 - t;
    const kr: Vec3[] = [];
    const kv: Vec3[] = [];
    for (let i = 0; i < 7; i++) {
      let ri = r;
      let vi = v;
      for (let j = 0; j < i; j++) {
        const a = A[i]![j]!;
        if (a === 0) continue;
        ri = add(ri, scale(kr[j]!, h * a));
        vi = add(vi, scale(kv[j]!, h * a));
      }
      kr.push(vi);
      kv.push(accel(t + C[i]! * h, ri, vi));
    }
    // (the fifth-order solution is the last stage's point, by the first-same-as-last property)
    let r5 = r;
    let v5 = v;
    let er: Vec3 = [0, 0, 0];
    for (let j = 0; j < 6; j++) {
      const a = A[6]![j]!;
      r5 = add(r5, scale(kr[j]!, h * a));
      v5 = add(v5, scale(kv[j]!, h * a));
    }
    for (let j = 0; j < 7; j++) er = add(er, scale(kr[j]!, h * E[j]!));
    const err = length(er);
    steps++;
    if (err <= TOLERANCE || Math.abs(h) < 1e-6) {
      [t, r, v] = [Math.abs(t1 - (t + h)) < 1e-9 * Math.max(1, Math.abs(t1)) ? t1 : t + h, r5, v5];
    }
    // (the step's next size from its error, as the pair's order has it, kept within a factor of five either way)
    const k = err > 0 ? 0.9 * (TOLERANCE / err) ** 0.2 : 5;
    h *= Math.min(5, Math.max(0.2, k));
  }
  return { r, v, steps };
}

/** The next instant after `t` among `instants` (the run's events and what it must be at: Infinity for one that does not come), or NaN for none: what `clock.hold` is given. */
export function due(instants: Iterable<number>, t: number): number {
  let next = Number.POSITIVE_INFINITY;
  for (const at of instants) if (at > t && at < next) next = at;
  return Number.isFinite(next) ? next : Number.NaN;
}

/**
 * Whether a flight may be coasted on rails at a sample: off its launch vehicle's last stage's run, nothing burning, above
 * `RAILS_FLOOR`, and nothing the hands have asked still to come before the next event. While it is false the clock is held
 * to an hour a second (`clock.allow(3600)`).
 */
export function onRails(sample: { altitude: number; burning?: readonly unknown[] }, asked = false): boolean {
  return !asked && !(sample.burning?.length ?? 0) && sample.altitude > RAILS_FLOOR;
}

/** The same coast in pieces of `span` seconds (a frame's at a fast clock), each ending where the next begins: as `coast` flies a clock's frames. */
export function coastBy(
  state: { r: Vec3; v: Vec3 },
  t0: number,
  t1: number,
  span: number,
  gravity: readonly GravityTerm[] = EARTH_GRAVITY,
  push: ((t: number, r: Vec3, v: Vec3) => Vec3) | null = null,
): { r: Vec3; v: Vec3 } {
  let s = { r: state.r, v: state.v };
  for (let t = t0; t < t1; t += span) s = coast(s, t, Math.min(t1, t + span), gravity, push);
  return s;
}

/** How far apart two states are: metres in place, m/s in speed. */
export const apart = (a: { r: Vec3; v: Vec3 }, b: { r: Vec3; v: Vec3 }): { r: number; v: number } => ({
  r: length(sub(a.r, b.r)),
  v: length(sub(a.v, b.v)),
});
