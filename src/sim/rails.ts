/**
 * A coast flown on rails, for a clock that runs faster than an hour a second (world/clock.ts `COAST_RATES`;
 * docs/agents/world.md, "Faster than an hour a second"). At 10,000 times a frame is three minutes of the flight and at
 * 100,000 half an hour, so nothing may be flown frame by frame: what is flown between two events is flown here, by an
 * adaptive Dormand-Prince 5(4) pair (core/dp45.ts, the predictor's step) that steps by its own error and ends exactly on the instant asked for (`coast`), and
 * the clock is held at the next instant that must be lived (`due`, for `clock.hold`), and let go past an hour a second
 * only while there is nothing to do but fall round (`onRails`).
 *
 * And a run's long coast is kept by it. A flight of days kept every step of its coast is a hundred thousand samples and
 * more, nearly all of them of nothing happening; so while nothing happens a run keeps a sample only where its motion has
 * changed enough (`passed`: the velocity by `KEPT_TURN` of itself), and what lies between two kept samples is flown
 * again when it is asked for (`stretches`: the coast from the earlier one on the same forces, by `coast`). The sample a
 * stretch begins at says so (`Railed`, the sample's `rails`): anything that reads a run between its samples asks it
 * (sim/run.ts `between`, `Run.at`), and so sees the flight the fixed-step run flew, not a curve laid across minutes of it.
 */
import { dp45 } from './core/dp45.ts';
import { acceleration } from './core/rk4.ts';
import { EARTH_GRAVITY, fieldOf, type GravityTerm } from './core/gravity.ts';
import { length, sub, type Vec3 } from '../world/frames.ts';

/** Anything but gravity on a coast, m/s^2, at an instant and a state. */
export type Push = (t: number, r: Vec3, v: Vec3) => Vec3;

/** Below this height above the sea, m, a coast is not on rails: the air takes enough of its speed in a revolution (a few m/s at 120 km) that it is flown as the live simulator flies it. Chosen. */
export const RAILS_FLOOR = 120_000;

/** The pair's tolerance on a step's error, m in place: a coast of a day ends within a few metres of the fixed-step run (tests/rails.test.mjs). */
const TOLERANCE = 1e-3;

/**
 * A coast from `state` at `t0` to exactly `t1` (seconds from liftoff, either way), in the flight's frame, under `gravity`
 * (core/gravity.ts terms: the Earth with J2 unless given) and `push` (anything else on it, m/s^2: the air's drag on a
 * spacecraft, or none), by the adaptive pair. However long the span, it costs steps by the path's curvature, not by the
 * span: a revolution of a low orbit is some forty. `each` is told every step taken: its end's instant, state and
 * acceleration.
 */
export function coast(
  state: { r: Vec3; v: Vec3 },
  t0: number,
  t1: number,
  gravity: readonly GravityTerm[] = EARTH_GRAVITY,
  push: Push | null = null,
  each?: (t: number, r: Vec3, v: Vec3, a: Vec3) => void,
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
      // (the pair's last stage is at the step's end: the acceleration there)
      each?.(t, r, v, kv[6]!);
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
 * The instant between `t0` and `t1` at which `f` passes through nothing (it has one sign at `t0` and the other at `t1`),
 * by bisection to within `within` seconds: where a coast crosses the sphere its centre changes at (`f` its distance
 * from the Moon less the sphere's radius: orbital.ts `flyOrbit` ends a step there), or passes its nearest to a body. An
 * instant `due` is given, so the clock is held on it.
 */
export function crossing(f: (t: number) => number, t0: number, t1: number, within = 1e-6): number {
  let [a, b] = [t0, t1];
  const rising = f(a) < 0;
  while (Math.abs(b - a) > within) {
    const mid = (a + b) / 2;
    if (mid === a || mid === b) break;
    if (f(mid) < 0 === rising) a = mid;
    else b = mid;
  }
  return b;
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
  push: Push | null = null,
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

/** An instant a run kept: when, and the place and velocity of the point it flies, in the flight's frame. */
export interface Kept {
  t: number;
  r: Vec3;
  v: Vec3;
}

/**
 * A stretch of a quiet coast of which a run kept only the two ends: carried by the sample it begins at (a sample's
 * `rails`), for whatever reads the run between that sample and the next. `S` is the run's sample.
 */
export interface Railed<S> {
  /** The point of a sample that `state` gives the place of: the one the simulator flew (a spacecraft's centre of mass). */
  of(s: S): Vec3;
  /** The state of that point at `t` between the stretch's ends, `a` and `b` (each an instant and that point's state), flown again from `a`. */
  state(a: Kept, b: Kept, t: number): { r: Vec3; v: Vec3 };
  /** The run's sample at `t` between its samples `a` and `b`, as the run would have kept it there. */
  sample(a: S, b: S, t: number): S;
}

/** A run's sample as what reads between samples needs it: the instant, the state, and the stretch it begins, where it begins one. */
export interface Stretched {
  t: number;
  r: Vec3;
  v: Vec3;
  rails?: { of(s: never): Vec3; state: Railed<unknown>['state']; sample(a: never, b: never, t: number): unknown };
}

/**
 * How much of itself a coast's velocity may change between two samples kept while nothing happens: a fifth, which on an
 * orbit is a fifth of a radian round it (31 samples a revolution, three minutes apart in a low orbit, where every step
 * kept is 540), and far out, where the path barely turns, hours. Chosen: what is let go is flown again when it is asked
 * for, so this sets what a run holds and how long a stretch is to fly again, not how true anything read from it is.
 */
export const KEPT_TURN = 0.2;

/** Whether a coast's velocity `now` has changed by `KEPT_TURN` of itself from `kept`: a sample is due, however quiet. */
export const passed = (kept: Vec3, now: Vec3): boolean => length(sub(now, kept)) >= KEPT_TURN * length(kept);

/** The stretches kept flown at once: what a frame asks of a run is in one or two (the instant on show, and the one a sound left at). */
const HELD = 8;

/** A stretch flown again: the pair's own steps from its beginning to its end, and what that came short of the kept end by. */
interface Stretch {
  from: number;
  to: number;
  key: readonly [number, number, number];
  t: number[];
  r: Vec3[];
  v: Vec3[];
  a: Vec3[];
  dr: Vec3;
  dv: Vec3;
}

/**
 * What flies a run's stretches again (`Railed.state`), under `gravity` and `push` (what else is on the ship, as it is
 * from the instant `as` a stretch begins at: nothing changes on it within one, or the run would have kept a sample
 * there). A stretch asked for is flown once from its beginning to its end by `coast` and its steps kept (the last
 * `HELD` stretches' are held); a state within it is the quintic through the two steps either side (their places,
 * velocities and accelerations: within a millimetre or two of the pair between its own steps, which are a tenth of a
 * radian apart at most), with the part of the end's miss that has come due added, so that it is the kept sample at each
 * end exactly and nothing jumps as the clock passes one. The miss is what the pair and the fixed step differ by over
 * the stretch: millimetres (tests/rails.test.mjs). The same answer for the same instant, whatever was asked before.
 */
export function stretches(
  gravity: readonly GravityTerm[] = EARTH_GRAVITY,
  push: ((as: number) => Push) | null = null,
): (a: Kept, b: Kept, t: number) => { r: Vec3; v: Vec3 } {
  const field = fieldOf(gravity);
  const held: Stretch[] = [];
  const flown = (a: Kept, b: Kept): Stretch => {
    for (let i = 0; i < held.length; i++) {
      const s = held[i]!;
      if (s.from !== a.t || s.to !== b.t || s.key[0] !== a.r[0] || s.key[1] !== a.v[0] || s.key[2] !== b.r[0]) continue;
      if (i > 0) {
        held.splice(i, 1);
        held.unshift(s);
      }
      return s;
    }
    const on = push ? push(a.t) : null;
    const s: Stretch = {
      from: a.t,
      to: b.t,
      key: [a.r[0], a.v[0], b.r[0]],
      t: [a.t],
      r: [a.r],
      v: [a.v],
      a: [acceleration(field(a.r, a.t), on ? on(a.t, a.r, a.v) : null)],
      dr: [0, 0, 0],
      dv: [0, 0, 0],
    };
    const end = coast(a, a.t, b.t, gravity, on, (t, r, v, acc) => {
      s.t.push(t);
      s.r.push(r);
      s.v.push(v);
      s.a.push(acc);
    });
    s.dr = sub(b.r, end.r);
    s.dv = sub(b.v, end.v);
    held.unshift(s);
    if (held.length > HELD) held.pop();
    return s;
  };
  return (a, b, t) => {
    if (!(t > a.t)) return { r: a.r, v: a.v };
    if (!(t < b.t)) return { r: b.r, v: b.v };
    const s = flown(a, b);
    let i = 0;
    while (i + 2 < s.t.length && s.t[i + 1]! <= t) i++;
    const h = s.t[i + 1]! - s.t[i]!;
    const x = (t - s.t[i]!) / h;
    const [x2, x3, x4, x5] = [x * x, x ** 3, x ** 4, x ** 5];
    // (the quintic Hermite's six weights on the two ends' places, velocities and accelerations, and their rates)
    const p = [1 - 10 * x3 + 15 * x4 - 6 * x5, x - 6 * x3 + 8 * x4 - 3 * x5, 0.5 * x2 - 1.5 * x3 + 1.5 * x4 - 0.5 * x5];
    const q = [10 * x3 - 15 * x4 + 6 * x5, -4 * x3 + 7 * x4 - 3 * x5, 0.5 * x3 - x4 + 0.5 * x5];
    const dp = [-30 * x2 + 60 * x3 - 30 * x4, 1 - 18 * x2 + 32 * x3 - 15 * x4, x - 4.5 * x2 + 6 * x3 - 2.5 * x4];
    const dq = [30 * x2 - 60 * x3 + 30 * x4, -12 * x2 + 28 * x3 - 15 * x4, 1.5 * x2 - 4 * x3 + 2.5 * x4];
    const [r0, v0, a0, r1, v1, a1] = [s.r[i]!, s.v[i]!, s.a[i]!, s.r[i + 1]!, s.v[i + 1]!, s.a[i + 1]!];
    const due = (t - s.from) / (s.to - s.from);
    const at = (k: number): number =>
      p[0]! * r0[k]! +
      h * p[1]! * v0[k]! +
      h * h * p[2]! * a0[k]! +
      q[0]! * r1[k]! +
      h * q[1]! * v1[k]! +
      h * h * q[2]! * a1[k]! +
      due * s.dr[k]!;
    const rate = (k: number): number =>
      (dp[0]! * r0[k]! + dq[0]! * r1[k]!) / h +
      dp[1]! * v0[k]! +
      dq[1]! * v1[k]! +
      h * (dp[2]! * a0[k]! + dq[2]! * a1[k]!) +
      due * s.dv[k]!;
    return { r: [at(0), at(1), at(2)], v: [rate(0), rate(1), rate(2)] };
  };
}
