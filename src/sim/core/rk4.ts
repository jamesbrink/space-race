/**
 * The fixed-step integrator every simulator steps by: the classical fourth-order Runge-Kutta, for a point (position and
 * velocity: world/orbit.ts `step`, fly.ts) and for a rigid body (position, velocity, attitude, body rates and, where it
 * burns, mass: vehicle.ts, shed.ts). The predictor's error-controlled Dormand and Prince pair (predict.ts `propagate`)
 * takes its accelerations from the same `acceleration` (gravity's terms and everything else's push, summed). A step's
 * stages are evaluated at its start, middle (twice) and end; within a step what the rate function sees of the vehicle (what
 * burns, what is attached) is the caller's to hold fixed.
 */
import { add, scale, type Vec3 } from '../../world/frames.ts';
import { normalize, type Quat } from '../rigid.ts';

/** A point's state: position and velocity, m and m/s. */
export interface PointState {
  r: Vec3;
  v: Vec3;
}

/** Gravity at a position, and everything else's push on the point: the acceleration they sum to, m/s^2. */
export function acceleration(gravity: Vec3, push: Vec3 | null | undefined): Vec3 {
  return push ? add(gravity, push) : gravity;
}

/** One step of `h` seconds from `s` at `t` of a point whose acceleration at a state and an instant is `accel`. */
export function rk4(s: PointState, t: number, h: number, accel: (s: PointState, t: number) => Vec3): PointState {
  const rate = (q: PointState, at: number): PointState => ({ r: q.v, v: accel(q, at) });
  const nudge = (q: PointState, d: PointState, by: number): PointState => ({ r: add(q.r, scale(d.r, by)), v: add(q.v, scale(d.v, by)) });
  const k1 = rate(s, t);
  const k2 = rate(nudge(s, k1, h / 2), t + h / 2);
  const k3 = rate(nudge(s, k2, h / 2), t + h / 2);
  const k4 = rate(nudge(s, k3, h), t + h);
  return {
    r: add(s.r, scale(add(add(k1.r, scale(k2.r, 2)), add(scale(k3.r, 2), k4.r)), h / 6)),
    v: add(s.v, scale(add(add(k1.v, scale(k2.v, 2)), add(scale(k3.v, 2), k4.v)), h / 6)),
  };
}

/** A rigid body's state: its centre of mass's position and velocity, its attitude (body to frame), body rates, and mass where it changes. */
export interface BodyState {
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
  mass?: number;
}

/**
 * One step of `h` seconds from `d` at `t` of a rigid body whose rates of change at a state and an instant are `rate` (the
 * velocity, the acceleration, the attitude's derivative, the rates' and, where it has one, the mass's). The attitude is
 * normalised at the step's end.
 */
export function rk4Body<D extends BodyState>(d: D, t: number, h: number, rate: (d: D, t: number) => BodyState): D {
  const nudge = (x: D, k: BodyState, by: number): D => {
    const next = {
      ...x,
      r: add(x.r, scale(k.r, by)),
      v: add(x.v, scale(k.v, by)),
      q: [x.q[0] + k.q[0] * by, x.q[1] + k.q[1] * by, x.q[2] + k.q[2] * by, x.q[3] + k.q[3] * by] as unknown as Quat,
      w: add(x.w, scale(k.w, by)),
    };
    if (x.mass !== undefined) next.mass = x.mass + k.mass! * by;
    return next;
  };
  const k1 = rate(d, t);
  const k2 = rate(nudge(d, k1, h / 2), t + h / 2);
  const k3 = rate(nudge(d, k2, h / 2), t + h / 2);
  const k4 = rate(nudge(d, k3, h), t + h);
  const sum = (a: Vec3, b: Vec3, c: Vec3, e: Vec3): Vec3 => scale(add(add(a, scale(b, 2)), add(scale(c, 2), e)), 1 / 6);
  const step: BodyState = {
    r: sum(k1.r, k2.r, k3.r, k4.r),
    v: sum(k1.v, k2.v, k3.v, k4.v),
    q: [0, 1, 2, 3].map((i) => (k1.q[i]! + 2 * k2.q[i]! + 2 * k3.q[i]! + k4.q[i]!) / 6) as unknown as Quat,
    w: sum(k1.w, k2.w, k3.w, k4.w),
  };
  if (d.mass !== undefined) step.mass = (k1.mass! + 2 * k2.mass! + 2 * k3.mass! + k4.mass!) / 6;
  const next = nudge(d, step, h);
  return { ...next, q: normalize(next.q) };
}
