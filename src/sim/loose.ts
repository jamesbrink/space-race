/**
 * A part let go as a body of its own that its plan does not fly (types.ts `LooseDef`: a hatch blown off), flown to the sea
 * as a point: thrown off along its outward normal by its impulse over its mass, then under gravity (world/orbit.ts, with
 * J2) and the day's air (air.ts `airAt`, `airDrag`, on its drag area as it tumbles), by the fixed step (core/rk4.ts `rk4`)
 * in the run's frame, which does not turn, until it is down on the sea. There it lies where it fell. Nothing here knows
 * any part: what it is and where it leaves from are the caller's.
 */
import type { LooseDef } from '../types.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, scale, type Vec3 } from '../world/frames.ts';
import { gravity } from '../world/orbit.ts';
import { airAt, airDrag, type Sky } from './air.ts';
import { acceleration, rk4 } from './core/rk4.ts';

/** Seconds a step, near the sea and in the air; above the air, `COARSE` of them. */
const STEP = 0.01;
const COARSE = 50;
/** Under this density, kg/m^3, the air is left out and the step is coarse. */
const THIN = 1e-7;
/** How often a state is kept for showing, s; and the longest it is followed. */
const KEEP = 0.05;
const LIMIT = 3 * 3600;

/** A loose part flown: its states every KEEP s from its leaving, in the run's frame, and where and when it came down. */
export interface LooseFlown {
  from: number;
  samples: { t: number; r: Vec3; v: Vec3 }[];
  /** When it struck the sea (s from liftoff), where (in the run's frame then, and fixed to the Earth, where it lies from then on), and how fast it was going, m/s. */
  down: { t: number; r: Vec3; fixed: Vec3; speed: number };
}

/**
 * Fly `def` from `r`, `v` at `t` (the run's frame), thrown off along the unit `out` by its impulse. `seaLevel` is the
 * height of the sea over the ellipsoid there, m, and `above` how high over it the part starts (the sea it comes down on
 * is the still sea's level: the waves are left out of where it lands).
 */
export function flyLoose(def: LooseDef, frame: EarthFrame, sky: Sky, seaLevel: number, t: number, r: Vec3, v: Vec3, out: Vec3): LooseFlown {
  const mass = def.mass.value;
  const push = def.impulse.value / mass;
  let state = { r, v: add(v, scale(out, push)) };
  let at = t;
  const samples: LooseFlown['samples'] = [{ t, r: state.r, v: state.v }];
  let keep = t + KEEP;
  const accel = (s: { r: Vec3; v: Vec3 }, when: number): Vec3 => {
    const here = airAt(frame, s.r, s.v, when, seaLevel, sky);
    const density = here.air.density;
    return acceleration(gravity(s.r), density < THIN ? null : scale(airDrag(here.wind, here.airspeed, density, def.drag.value), 1 / mass));
  };
  const height = (s: { r: Vec3 }, when: number) => frame.place(s.r, when).height - seaLevel;
  while (at - t < LIMIT) {
    const thin = airAt(frame, state.r, state.v, at, seaLevel, sky).air.density < THIN;
    const h = thin ? STEP * COARSE : STEP;
    const next = rk4(state, at, h, accel);
    const z = height(next, at + h);
    if (z <= 0) {
      // down within the step: where between its ends the height is nothing, by halving the step
      let [lo, hi] = [0, h];
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (height(rk4(state, at, mid, accel), at + mid) > 0) lo = mid;
        else hi = mid;
      }
      const end = rk4(state, at, hi, accel);
      const speed = Math.hypot(...airAt(frame, end.r, end.v, at + hi, seaLevel, sky).wind);
      samples.push({ t: at + hi, r: end.r, v: end.v });
      return { from: t, samples, down: { t: at + hi, r: end.r, fixed: frame.toFixed(end.r, at + hi), speed } };
    }
    state = next;
    at += h;
    if (at >= keep - 1e-9) {
      samples.push({ t: at, r: state.r, v: state.v });
      keep = at + KEEP;
    }
  }
  return { from: t, samples, down: { t: at, r: state.r, fixed: frame.toFixed(state.r, at), speed: 0 } };
}

/** Where a loose part is at `t`, in the run's frame, while it flies: straight between its kept states (a cubic is not worth it at KEEP). Once down it lies at `down.fixed`. */
export function looseAt(flown: LooseFlown, t: number): Vec3 {
  const s = flown.samples;
  if (t <= s[0]!.t) return s[0]!.r;
  if (t >= flown.down.t) return flown.down.r;
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = s[lo]!;
  const b = s[hi]!;
  const k = (t - a.t) / (b.t - a.t);
  return [a.r[0] + (b.r[0] - a.r[0]) * k, a.r[1] + (b.r[1] - a.r[1]) * k, a.r[2] + (b.r[2] - a.r[2]) * k];
}
