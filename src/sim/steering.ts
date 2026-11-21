/**
 * Steering a burn to what it is for, as the Apollo command module's computer steered one (P40 and P41 flying what P30,
 * P32, P34 or the ground had solved): the velocity to be gained, set at ignition and worked down by what the
 * accelerometers sense, the thrust turned so that it and the velocity to be gained come to nothing together (cross-product
 * steering), and the engine cut when the time to go falls under four seconds (MIT/Draper R-577, the Colossus 3 GSOP,
 * Section 5, §5.3.3: "Powered flight guidance using cross product steering").
 *
 * Two modes, as the computer had (§5.3.3.3): External ΔV, an impulse given in the local vertical at ignition, turned by
 * half the angle the craft travels in the burn and flown along a fixed line (the steering constant c nought); and the
 * Lambert aim point, the velocity required to reach a place at an instant solved again every cycle (c one, as P34 sets
 * it). What a burn is to do (sim/plan.ts `Pursuit`) is solved at ignition by flying the steered burn ahead on the run's
 * own forces (`flyBurn`) and correcting its impulse by what the flight ahead missed by (`solveImpulse`), as the ground's
 * targeting did with its own model of the flight. Nothing here names a flight.
 *
 * Simplified: the attitude is where steering commands it at once, with none of the autopilot's lag; the engine's tail-off
 * after the cut (`Δt_tail-off`, §5.3.3.4) is nothing, as the simulator's engines stop at once; the computer's 2 s cycle is
 * flown on the integrator's 1 s steps, the thrust's size at each step's start.
 */
import { add, cross, dot, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import type { State } from '../world/orbit.ts';

/** The computation cycle of powered flight, s: documented, R-577 §5.3.3.4 ("the computation cycle Δt", 2 s; the average-G routine's). */
export const CYCLE = 2;
/** The time to go under which the engine-off is set, at the instant the time to go gives, s: documented, R-577 §5.3.3.4 (four seconds). */
export const CUT_WITHIN = 4;
/** The step a steered burn is flown on, s: the coast's step through a burn (orbital.ts `flyOrbit`). */
export const STEP = 1;

/** Stumpff's functions C(z) and S(z), by their series near nought. */
function stumpff(z: number): [number, number] {
  if (z > 1e-6) {
    const s = Math.sqrt(z);
    return [(1 - Math.cos(s)) / z, (s - Math.sin(s)) / (s * s * s)];
  }
  if (z < -1e-6) {
    const s = Math.sqrt(-z);
    return [(Math.cosh(s) - 1) / -z, (Math.sinh(s) - s) / (s * s * s)];
  }
  return [1 / 2 - z / 24 + (z * z) / 720, 1 / 6 - z / 120 + (z * z) / 5040];
}

/**
 * Lambert's problem: the velocities at both ends of the conic about a centre of gravitational parameter `gm` that goes from
 * `r1` to `r2` in `tof` seconds, less than a revolution, the way round that `normal` gives (the motion's sense: the
 * short way where the two places turn about it, otherwise the long). By universal variables (Bate, Mueller and White,
 * §5.3; the iteration on z is bisection, every time of flight being single-valued in it). Null where there is none.
 */
export function lambert(r1: Vec3, r2: Vec3, tof: number, gm: number, normal: Vec3 = [0, 0, 1]): { v1: Vec3; v2: Vec3 } | null {
  const [a1, a2] = [length(r1), length(r2)];
  if (!(tof > 0) || !(a1 > 0) || !(a2 > 0)) return null;
  const c = dot(r1, r2) / (a1 * a2);
  let angle = Math.acos(Math.max(-1, Math.min(1, c)));
  if (dot(cross(r1, r2), normal) < 0) angle = 2 * Math.PI - angle;
  const A = Math.sin(angle) * Math.sqrt((a1 * a2) / (1 - Math.cos(angle)));
  if (!Number.isFinite(A) || A === 0) return null;
  const y = (z: number): number => {
    const [C, S] = stumpff(z);
    return a1 + a2 + (A * (z * S - 1)) / Math.sqrt(C);
  };
  const time = (z: number): number => {
    const yz = y(z);
    if (yz < 0) return -Infinity;
    const [C, S] = stumpff(z);
    const chi = Math.sqrt(yz / C);
    return (chi * chi * chi * S + A * Math.sqrt(yz)) / Math.sqrt(gm);
  };
  // (short of a whole revolution's z by a millionth: closer, 1 - cos rounds to nought)
  let [lo, hi] = [-4 * Math.PI * Math.PI, 4 * Math.PI * Math.PI * (1 - 1e-6)];
  // (hyperbolic transfers lie below nought: down as far as the time asks)
  while (!(time(lo) < tof) && lo > -1e4) lo *= 2;
  if (!(time(hi) > tof) || !(time(lo) < tof)) return null;
  for (let k = 0; k < 200 && hi - lo > 1e-14 * Math.max(1, Math.abs(lo)); k++) {
    const mid = (lo + hi) / 2;
    if (time(mid) < tof) lo = mid;
    else hi = mid;
  }
  const yz = y((lo + hi) / 2);
  const f = 1 - yz / a1;
  const g = A * Math.sqrt(yz / gm);
  const gdot = 1 - yz / a2;
  return { v1: scale(sub(r2, scale(r1, f)), 1 / g), v2: scale(sub(scale(r2, gdot), r1), 1 / g) };
}

/**
 * The thrust's direction that brings the velocity to be gained `vg` and its rate to nought together: the one for which
 * vG x (c b - aT) = 0 with the thrust's acceleration `accel` long (R-577 §5.3.3.4), `cb` being c times b, the rate the
 * required velocity changes at less gravity. With c nought (External ΔV) it is along vG.
 */
export function thrustLine(vg: Vec3, accel: number, cb: Vec3 = [0, 0, 0]): Vec3 {
  const u = unit(vg);
  const along = dot(cb, u);
  const lambda = -along + Math.sqrt(Math.max(0, along * along - dot(cb, cb) + accel * accel));
  return unit(add(cb, scale(u, lambda)));
}

/** The local vertical axes of a state (R-577 Fig. 3.3-7): X level along the motion, Y against the orbit's pole, Z down. */
export function localVertical(s: State): [Vec3, Vec3, Vec3] {
  const h = cross(s.r, s.v);
  return [unit(cross(h, s.r)), unit(cross(s.v, s.r)), scale(unit(s.r), -1)];
}

/**
 * The velocity to be gained an External ΔV burn starts from, m/s in the flight's axes (R-577 Fig. 3.3-7 and 3.3-8):
 * the impulse `lv` in the local vertical at ignition, its part in the plane turned on in the motion by half the angle
 * the craft travels while it burns, the burn's length taken as the impulse over `accel`.
 */
export function externalDv(s: State, lv: Vec3, accel: number): Vec3 {
  const [X, Y, Z] = localVertical(s);
  const inPlane = add(scale(X, lv[0]), scale(Z, lv[2]));
  const r = length(s.r);
  const half = (length(cross(s.r, s.v)) * length(lv)) / (2 * r * r * accel);
  const n = unit(cross(s.r, s.v));
  const turned = add(scale(inPlane, Math.cos(half)), scale(cross(n, inPlane), Math.sin(half)));
  return add(turned, scale(Y, lv[1]));
}

/** Where a Lambert burn is aimed: the place `r` from the centre at `at`, s from liftoff, about a centre of `gm`. */
export interface AimPoint {
  r: Vec3;
  at: number;
  gm: number;
  /** The steering constant (R-577 §5.3.3.3.2): 1 as P32 to P35 set it, 0.5 for P37. */
  c: number;
}

/** What a burn steers to: an External ΔV's velocity to be gained at ignition, or a place to reach. */
export type SteerTo = { external: Vec3 } | { lambert: AimPoint };

/**
 * A burn's steering, as the computer flew it from ignition: every `CYCLE` the velocity to be gained is brought up to date
 * (External ΔV: less what was sensed; Lambert: the velocity required now, from where the craft is, less its velocity) and
 * the thrust turned to it (`thrustLine`). `centred` gives a state about the aim's centre (a Lambert aim is about the body
 * the craft is about); `oblate` the central body's acceleration less its point mass's, for the Lambert mode's allowance
 * for it (R-577 §5.3.3.5, g_b (t - t_IG): nought about the Moon).
 */
export class Steering {
  /** The velocity to be gained, m/s. */
  vg: Vec3;
  /** The thrust's line, set at each cycle. */
  line: Vec3;
  /** When the engine is to be cut, s from liftoff, once a cycle has found the time to go under `CUT_WITHIN`. */
  cutAt: number | undefined;
  private next: number;
  private sensed: Vec3 = [0, 0, 0];
  private required: Vec3 | undefined;
  private cb: Vec3 = [0, 0, 0];
  private last: number;
  readonly to: SteerTo;
  readonly ignition: number;
  readonly accel: (t: number) => number;
  readonly exhaust: number | undefined;
  readonly centred: (s: State, t: number) => State;
  readonly oblate: ((r: Vec3) => Vec3) | undefined;

  constructor(
    to: SteerTo,
    ignition: number,
    s: State,
    accel: (t: number) => number,
    exhaust: number | undefined,
    centred: (s: State, t: number) => State = (x) => x,
    oblate?: (r: Vec3) => Vec3,
  ) {
    this.to = to;
    this.ignition = ignition;
    this.accel = accel;
    this.exhaust = exhaust;
    this.centred = centred;
    this.oblate = oblate;
    this.last = ignition;
    this.next = ignition;
    this.vg = 'external' in to ? to.external : (this.lambertVg(s, ignition) ?? [0, 0, 0]);
    this.line = thrustLine(this.vg, accel(ignition));
  }

  private lambertVg(s: State, t: number): Vec3 | null {
    if (!('lambert' in this.to)) return null;
    const aim = this.to.lambert;
    const here = this.centred(s, t);
    const solved = lambert(here.r, aim.r, aim.at - t, aim.gm, cross(here.r, here.v));
    if (!solved) return null;
    // (the allowance for the central body's oblateness over the time since ignition, R-577 §5.3.3.5)
    const vr = this.oblate ? add(solved.v1, scale(this.oblate(here.r), t - this.ignition)) : solved.v1;
    this.required = vr;
    return sub(vr, here.v);
  }

  /** What the accelerometers sensed over a step: the thrust's acceleration, m/s^2, over `h` seconds. */
  felt(thrust: Vec3, h: number): void {
    this.sensed = add(this.sensed, scale(thrust, h));
  }

  /**
   * The thrust at a step's start, m/s^2: a cycle is run first where one is due (from ignition, every `CYCLE`), with
   * `gravity` the acceleration of gravity on the state about the aim's centre (for the Lambert mode's b). Nothing once the cut has passed.
   */
  thrustAt(s: State, t: number, gravity?: (s: State, t: number) => Vec3): Vec3 {
    if (this.cutAt !== undefined && t >= this.cutAt - 1e-9) return [0, 0, 0];
    if (t >= this.next - 1e-9 && this.cutAt === undefined) {
      const a = this.accel(t);
      if (t > this.ignition) {
        if ('external' in this.to) this.vg = sub(this.vg, this.sensed);
        else {
          const before = this.required;
          const vg = this.lambertVg(s, t);
          if (vg) {
            // (b Δt: the change of the velocity required over the cycle, less gravity's over it)
            if (before && gravity) {
              const dt = t - this.last;
              this.cb = scale(sub(sub(this.required!, before), scale(gravity(s, t), dt)), this.to.lambert.c / dt);
            }
            this.vg = vg;
          } else this.vg = sub(this.vg, this.sensed);
        }
      }
      this.sensed = [0, 0, 0];
      this.last = t;
      this.next = t + CYCLE;
      if (dot(this.vg, this.line) <= 0 && t > this.ignition) {
        // (the velocity to be gained behind the thrust: it is gained, and the engine is cut now)
        this.cutAt = t;
        return [0, 0, 0];
      }
      this.line = thrustLine(this.vg, a, this.cb);
      const size = length(this.vg);
      // (the time to go: the rocket's equation where the engine's exhaust is known, the speed over the thrust where not)
      const tgo = this.exhaust ? (this.exhaust / a) * -Math.expm1(-size / this.exhaust) : size / a;
      if (tgo < CUT_WITHIN) this.cutAt = t + tgo;
    }
    return scale(this.line, this.accel(t));
  }
}

/** Forces flown ahead from `from` to `to`: gravity, the air, and a thrust of fixed acceleration (m/s^2) where given. */
export type Fly = (s: State, from: number, to: number, thrust?: Vec3) => State;

/** A burn flown out under its steering: the state and the instant at its cut, and what it gave, m/s. */
export interface Steered {
  state: State;
  t: number;
  given: number;
  /** The thrust's line as it lit. */
  line: Vec3;
}

/** The longest a steered burn is flown, s: beyond it the steering has not converged and the burn is cut. */
const LONGEST = 3600;

/**
 * A steered burn flown out from ignition on the run's forces: on `STEP` steps, the thrust as the steering gives it at each
 * step's start and the step cut to end on the cut. As the coast flies one (orbital.ts `flyOrbit`), so the burn guidance
 * solves is the burn the run flies.
 */
export function flyBurn(fly: Fly, s: State, t: number, steering: Steering, gravity?: (s: State, t: number) => Vec3): Steered {
  let [x, at, given] = [s, t, 0];
  let line: Vec3 | undefined;
  while (at < t + LONGEST) {
    const thrust = steering.thrustAt(x, at, gravity);
    line ??= steering.line;
    const end = steering.cutAt;
    if (end !== undefined && at >= end - 1e-9) break;
    const h = Math.min(STEP, end === undefined ? STEP : end - at);
    x = fly(x, at, at + h, thrust);
    steering.felt(thrust, h);
    given += length(thrust) * h;
    at = end !== undefined && Math.abs(at + h - end) < 1e-9 ? end : at + h;
  }
  return { state: x, t: at, given, line: line ?? steering.line };
}

/**
 * The step of Gauss and Newton on misses `f` with slopes `J` (rows the misses, each already over its tolerance, columns
 * the components free), damped by a millionth of its own scale so that a direction no miss depends on (a second
 * condition met on its own, or a free component that changes none) takes no step: (J^T J + μ I) d = -J^T f.
 */
function gaussNewton(J: number[][], f: number[]): number[] | null {
  const n = J[0]!.length;
  const M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => J.reduce((sum, row) => sum + row[i]! * row[j]!, 0)));
  const scale_ = M.reduce((sum, row, i) => sum + row[i]!, 0);
  if (!(scale_ > 0)) return null;
  for (let i = 0; i < n; i++) M[i]![i]! += (1e-6 * scale_) / n;
  const w = Array.from({ length: n }, (_, i) => -J.reduce((sum, row, k) => sum + row[i]! * f[k]!, 0));
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k]![i]!) > Math.abs(M[p]![i]!)) p = k;
    [M[i], M[p]] = [M[p]!, M[i]!];
    [w[i], w[p]] = [w[p]!, w[i]!];
    for (let k = i + 1; k < n; k++) {
      const q = M[k]![i]! / M[i]![i]!;
      for (let j = i; j < n; j++) M[k]![j]! -= q * M[i]![j]!;
      w[k]! -= q * w[i]!;
    }
  }
  const d = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = w[i]!;
    for (let j = i + 1; j < n; j++) sum -= M[i]![j]! * d[j]!;
    d[i] = sum / M[i]![i]!;
  }
  return d;
}

/** The part of `x` that the rows of `J` do not see: (I - J^T (J J^T)^-1 J) x, for one or two rows. */
function nullPart(J: number[][], x: number[]): number[] {
  const m = J.length;
  const G = J.map((a) => J.map((b) => a.reduce((sum, y, k) => sum + y * b[k]!, 0)));
  const Jx = J.map((row) => row.reduce((sum, y, k) => sum + y * x[k]!, 0));
  let w: number[];
  if (m === 1) w = [Jx[0]! / G[0]![0]!];
  else {
    const det = G[0]![0]! * G[1]![1]! - G[0]![1]! * G[1]![0]!;
    w = [(G[1]![1]! * Jx[0]! - G[0]![1]! * Jx[1]!) / det, (G[0]![0]! * Jx[1]! - G[1]![0]! * Jx[0]!) / det];
  }
  if (w.some((y) => !Number.isFinite(y))) return x.map(() => 0);
  return x.map((y, k) => y - J.reduce((sum, row, i) => sum + row[k]! * w[i]!, 0));
}

/**
 * What a burn is solved for: its misses after the cut (each against its tolerance), from the state and instant there.
 * And where given (its nearest), a further miss, sought once those are met along what they leave free, in place of the least impulse: met
 * where it can be, and otherwise brought as near as it goes (an orbit's plane about the Moon that the approach cannot
 * be turned into).
 */
export interface Condition {
  miss(s: State, t: number): number[] | null;
  tolerance: number[];
  nearest?: { miss(s: State, t: number): number | null; tolerance: number };
}

/**
 * The External ΔV that does what `want` asks: the impulse in the local vertical at ignition (its components `free`, by
 * index, solved; the others held at `guess`'s), flown out under its steering (`steer`, from the velocity to be gained it
 * gives) and corrected by what the flight ahead missed by: Gauss and Newton's method on the misses over their tolerances,
 * its slopes by differences of 5 cm/s, damped (`gaussNewton`) and halved until the misses shrink. Where there are fewer
 * conditions than components free, once they are met it goes on to the least impulse that meets them, as the ground's
 * targeting sought the least: the part of the impulse the conditions do not see taken off (`nullPart`) and the
 * conditions met again, while that leaves less. Within each condition's tolerance, or null.
 */
export function solveImpulse(
  steer: (lv: Vec3) => Steered,
  want: Condition,
  guess: Vec3,
  free: readonly number[],
): { lv: Vec3; burn: Steered } | null {
  const STEP = 0.05;
  const tol = want.tolerance;
  const lvOf = (x: number[]): Vec3 => {
    const lv = [...guess];
    free.forEach((k, i) => {
      lv[k] = x[i]!;
    });
    return lv as unknown as Vec3;
  };
  type Tried = { x: number[]; burn: Steered; f: number[]; size: number };
  const tried = (x: number[]): Tried | null => {
    const burn = steer(lvOf(x));
    const f = want.miss(burn.state, burn.t);
    if (!f || f.some((y) => !Number.isFinite(y))) return null;
    return { x, burn, f, size: Math.hypot(...f.map((y, i) => y / tol[i]!)) };
  };
  const met = (p: Tried): boolean => p.f.every((y, i) => Math.abs(y) < tol[i]!);
  /** The misses' slopes over their tolerances, by the components free. */
  const slopes = (p: Tried): number[][] | null => {
    const columns: number[][] = [];
    for (let j = 0; j < p.x.length; j++) {
      const trial = steer(lvOf(p.x.map((y, i) => (i === j ? y + STEP : y))));
      const moved = want.miss(trial.state, trial.t);
      if (!moved) return null;
      columns.push(moved.map((y, i) => (y - p.f[i]!) / STEP));
    }
    return p.f.map((_, i) => columns.map((col) => col[i]! / tol[i]!));
  };
  /** At most a tenth of the impulse and 30 m/s at once: far from the answer the slopes are not the answer's. */
  const limited = (d: number[], x: number[]): number[] => {
    const most = Math.max(1, Math.hypot(...d) / (30 + 0.1 * Math.hypot(...x)));
    return d.map((y) => y / most);
  };
  /** Gauss and Newton from `p` until the conditions are met: null where a step cannot make the misses shrink. */
  const meet = (start: Tried): Tried | null => {
    let p = start;
    for (let k = 0; k < 30; k++) {
      if (met(p)) return p;
      const J = slopes(p);
      const d =
        J &&
        gaussNewton(
          J,
          p.f.map((y, i) => y / tol[i]!),
        );
      if (!d || d.some((y) => !Number.isFinite(y))) return null;
      const step = limited(d, p.x);
      // (the step, or a half of it, a quarter and so on while that is better: a step that only just shrinks the misses has
      // gone past the bottom of a long valley and comes back over it on the next, so it is halved while halving helps)
      let next: Tried | null = null;
      for (let h = 0, by = 1; h < 10; h++, by /= 2) {
        const at = tried(p.x.map((y, i) => y + step[i]! * by));
        if (at && (!next || at.size < next.size)) next = at;
        else if (next && next.size < p.size) break;
        if (next && next.size < p.size / 2) break;
      }
      if (!next || !(next.size < p.size)) return null;
      p = next;
    }
    return met(p) ? p : null;
  };
  const first = tried(free.map((k) => guess[k]!));
  let best = first && meet(first);
  if (!best || want.tolerance.length >= free.length) return best && { lv: lvOf(best.x), burn: best.burn };
  const nearest = want.nearest;
  if (nearest) {
    // (the further miss along what the conditions leave free: Newton's step on it there, the conditions met again after
    // each, kept while it is nearer; where it cannot be met the step finds it no nearer, and it stands as near as it went)
    const far = (p: Tried): number | null => {
      const y = nearest.miss(p.burn.state, p.burn.t);
      return y === null || !Number.isFinite(y) ? null : y;
    };
    let off = far(best);
    for (let k = 0; k < 20 && off !== null && Math.abs(off) >= nearest.tolerance; k++) {
      const J = slopes(best);
      const slope: number[] = [];
      for (let j = 0; j < best.x.length && J; j++) {
        const trial = steer(lvOf(best.x.map((y, i) => (i === j ? y + STEP : y))));
        const y = nearest.miss(trial.state, trial.t);
        if (y === null) break;
        slope.push((y - off) / STEP);
      }
      if (!J || slope.length < best.x.length) break;
      const along = nullPart(J, slope);
      const square = along.reduce((sum, y) => sum + y * y, 0);
      if (!(square > 0)) break;
      const step = limited(
        along.map((y) => (-off! * y) / square),
        best.x,
      );
      let found: Tried | null = null;
      for (let h = 0, by = 1; h < 6 && !found; h++, by /= 2) {
        const moved = tried(best.x.map((y, i) => y + step[i]! * by));
        const again = moved && meet(moved);
        const now = again && far(again);
        if (again && now !== null && Math.abs(now) < Math.abs(off)) found = again;
      }
      if (!found) break;
      best = found;
      off = far(best);
    }
    return { lv: lvOf(best.x), burn: best.burn };
  }
  for (let k = 0; k < 20; k++) {
    const J = slopes(best);
    if (!J) break;
    const loose = nullPart(J, best.x);
    if (Math.hypot(...loose) < STEP) break;
    const step = limited(
      loose.map((y) => -y),
      best.x,
    );
    let found: Tried | null = null;
    for (let h = 0, by = 1; h < 6 && !found; h++, by /= 2) {
      const moved = tried(best.x.map((y, i) => y + step[i]! * by));
      const again = moved && meet(moved);
      if (again && Math.hypot(...again.x) < Math.hypot(...best.x)) found = again;
    }
    if (!found) break;
    best = found;
  }
  return { lv: lvOf(best.x), burn: best.burn };
}
