/**
 * A coast flown on rails, for a clock that runs faster than an hour a second (world/clock.ts `COAST_RATES`;
 * docs/agents/world.md, "Faster than an hour a second"). At 10,000 times a frame is three minutes of the flight and at
 * 100,000 half an hour, so nothing may be flown frame by frame: what is flown between two events is flown here, by an
 * adaptive Dormand-Prince 5(4) pair (core/dp45.ts, the predictor's step) that steps by its own error and ends exactly on the instant asked for (`coast`), and
 * the clock is held at the next instant that must be lived (`due`, for `clock.hold`), and let go past an hour a second
 * only while there is nothing to do but fall round (`onRails`).
 */
import { dp45 } from './core/dp45.ts';
import { acceleration } from './core/rk4.ts';
import { EARTH_GRAVITY, fieldOf, type GravityTerm } from './core/gravity.ts';
import { length, sub, type Vec3 } from '../world/frames.ts';

/** Below this height above the sea, m, a coast is not on rails: the air takes enough of its speed in a revolution (a few m/s at 120 km) that it is flown as the live simulator flies it. Chosen. */
export const RAILS_FLOOR = 120_000;

/** The pair's tolerance on a step's error, m in place: a coast of a day ends within a few metres of the fixed-step run (tests/rails.test.mjs). */
const TOLERANCE = 1e-3;

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
  // (the stages' work space: core/dp45.ts)
  const kr: Vec3[] = new Array(7);
  const kv: Vec3[] = new Array(7);
  while (way !== 0 && (t1 - t) * way > 0) {
    if ((t + h - t1) * way > 0) h = t1 - t;
    const step = dp45(t, r, v, h, accel(t, r, v), accel, kr, kv);
    const err = step.er;
    steps++;
    if (err <= TOLERANCE || Math.abs(h) < 1e-6) {
      [t, r, v] = [Math.abs(t1 - (t + h)) < 1e-9 * Math.max(1, Math.abs(t1)) ? t1 : t + h, step.r, step.v];
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
