/**
 * A staged vehicle flown live: the ascent of an orbital flight (`Flight.orbital`) stepped a tick at a time and steered by
 * hand or by guidance, where staged.ts's `ascend` flies it whole with its attitude prescribed by the law. The same flight:
 * the same stages, engines, throttle curves, propellant, drops and drag (staged.ts `stackOf`), the same air (`airAt`),
 * the same gravity and integrator (world/orbit.ts `step`), in the same inertial frame of date. What it adds is the body's
 * turning and the hands' say over every event.
 *
 * Attitude. A rigid body whose steering gives an angular acceleration (`ascent.steering.authority`, estimated) about each
 * of its axes at full throw, while any engine aboard burns; with nothing burning it cannot be steered and keeps the rates
 * it had. No inertia, no aerodynamic moment, no cross-coupling: none has been read for the R-7, so the steering is a
 * stated acceleration and the air does not turn it (drag acts along the motion, as in the batch run, whatever the
 * attitude: no lift, no weathercock, and no structural limit, none having been read). The thrust lies along the long
 * axis as it points, so it goes where the vehicle is pointed.
 *
 * Axes. The body's +X is the long axis, nose forward; on the pad +Y is the launch plane's pole (its left as it stood, as
 * staged.ts `recordSamples` has it) and +Z = X x Y points back up range. A positive turn about +Y (pitch, W) tips the
 * nose downrange, about +Z (yaw, A) to the left, about +X (roll, E) is right-handed about the nose: as sim/vehicle.ts.
 *
 * Events. Nothing happens that is not asked for (`StagedControls.steps`): a stage lit, cut off or let go, a drop let go,
 * the spacecraft parted. The record's sequence (each at its time, the stage cut on its integrator's apparent velocity)
 * is the pilot's to give: `stagedPilot` with the sequencer on, as sim/autopilot.ts gives a ballistic flight's. A stage
 * stops when it is cut or when its usable propellant is gone; one let go takes with it every stage below it in the list
 * that is still on (the strap-ons hang on the core), what it had left aboard, and whatever thrust it was giving. An
 * engine is started once. The spacecraft parted, the vehicle is done: `parted` is where the coast begins (orbital.ts
 * flyOrbit). Back on the ground, it stops (`landed`).
 *
 * Time: ticks of sim/vehicle.ts's TICK; events at the tick they are asked on.
 */
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToInertial,
  enuAxes,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { elementsOf, period, type State, step } from '../world/orbit.ts';
import { greenwichSiderealTime } from '../world/time.ts';
import { G0, MEAN_RADIUS } from './fly.ts';
import type { OrbitalFlight } from './orbital.ts';
import { aboutAxis, fromAxes, multiply, normalize, type Quat, turn, unturn } from './rigid.ts';
import { type AscentSample, type AscentSummary, airAt, integral, lawOf, type Mode, type Solved, stackOf } from './staged.ts';
import { type LiveSample, TICK } from './vehicle.ts';

/** Something set off by a hand or the sequencer: a stage lit, cut off or let go, a drop (`ascent.drops`) let go. The last stage's 'separate' parts the spacecraft. */
export type Step = { kind: 'ignite' | 'cut' | 'separate'; stage: number } | { kind: 'drop'; id: string };

export interface StagedControls {
  /** Steering, -1 to 1 about each body axis. */
  pitch: number;
  yaw: number;
  roll: number;
  /** What to set off at this tick. */
  steps?: readonly Step[];
  /**
   * Not a control: the long axis put where this says at every instant of the tick, as staged.ts's law puts it, and the
   * body's turning ignored. Only for holding the live vehicle's forces to the batch run's (tests/stagedlive.test.mjs).
   */
  prescribed?: (st: State, at: number) => Vec3;
}

export interface StagedState {
  /** Seconds from liftoff (the first stages lit), and the same in ticks; what a frame left over, s. */
  t: number;
  ticks: number;
  carry: number;
  /** The stack's base (the point staged.ts flies) in frames.ts's inertial frame of date, m and m/s. */
  r: Vec3;
  v: Vec3;
  /** Attitude, body to that frame, and body rates, rad/s. */
  q: Quat;
  w: Vec3;
  /** Still standing on the pad. */
  held: boolean;
  /** Each stage: lit at `from` (Infinity, never), stopped at `to` (Infinity while it burns, until it is dry), let go at `gone` (Infinity, aboard). */
  stages: readonly { from: number; to: number; gone: number }[];
  /** Each of `ascent.drops`, by id: when it was let go. */
  drops: Readonly<Record<string, number>>;
  /** Each stage's integrator: the thrust it has sensed over the mass, summed from its ignition, m/s (staged.ts `apparentCut`). */
  apparent: readonly number[];
  /** The spacecraft parted from the last stage: when and where, for the coast. */
  parted: null | { t: number; r: Vec3; v: Vec3 };
  /** Back on the ground. */
  landed: null | { t: number; speed: number };
  /** The steering last applied. */
  controls: StagedControls;
}

export type StagedPilot = (state: StagedState) => StagedControls;

export interface StagedVehicle {
  readonly flight: OrbitalFlight;
  /** The launch plane's pole (the body's +Y on the pad), and the plumb line at liftoff, in the inertial frame of date. */
  readonly plane: Vec3;
  readonly up: Vec3;
  /** The angular acceleration at full throw, rad/s^2 (0 where the record gives none). */
  readonly authority: number;
  start(): StagedState;
  tick(state: StagedState, controls: StagedControls | StagedPilot): StagedState;
  step(state: StagedState, controls: StagedControls | StagedPilot, dt: number): StagedState;
  /** Mass now, kg; propellant left in each stage (all its units), kg; whether a stage is burning now; total thrust now, N. */
  mass(state: StagedState, at?: number): number;
  left(state: StagedState): number[];
  burning(state: StagedState, i: number, at?: number): boolean;
  thrust(state: StagedState): number;
  /** When a stage lit at `from` runs dry, s. */
  dry(i: number, from: number): number;
  /** The record's sequence of steps, in order, with the instants the record has them (a stage cut on its velocity: its recorded cutoff). */
  readonly sequence: readonly { step: Step; at: number; label: string }[];
  /**
   * The state as the scene's samples are (staged.ts `recordSamples`): in fly.ts's frame that does not turn, `r` the stack's
   * base, `centre` the spacecraft's centre of mass `centre` metres up the long axis.
   */
  sample(state: StagedState, centre: number): LiveSample;
  /** The configuration's record instant: the latest record separation among what has been let go (for the drag's piece). */
  shape(state: StagedState): number;
}

const X: Vec3 = [1, 0, 0];
/** An attitude with its long axis along `x` and its +Y as near the plane's pole `n` as it can be. */
const along1 = (x: Vec3, n: Vec3): Quat => {
  const y = unit(sub(n, scale(x, dot(n, x))));
  return fromAxes(x, y, cross(x, y));
};
const clamp = (x: number, lo = -1, hi = 1): number => Math.min(hi, Math.max(lo, x));
const name = (s: string) => s.split(',')[0]!;

/** A flight's staged vehicle, ready to be flown. `site`, `launchJd` and `seaLevel` as staged.ts `ascend`'s; `x` the law's solution, for its plane. */
export function stagedVehicle(
  o: OrbitalFlight,
  site: Geodetic,
  launchJd: number,
  seaLevel: number,
  x: Solved,
  /** For a test of the forces alone: a steering acceleration other than the record's, rad/s^2. */
  authorityOverride?: number,
): StagedVehicle {
  const a = o.ascent;
  if (!a) throw new Error('this orbital record has no `ascent`: only its coast can be flown');
  const gast0 = greenwichSiderealTime(launchJd);
  const spinE: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const law = lawOf(o, site, launchJd, x);
  const stack = stackOf(o);
  const air = airAt(seaLevel, launchJd);
  const authority = authorityOverride ?? (a.steering?.authority.value ?? 0) * DEG;
  const last = o.stages.length - 1;
  const padHeight = site.height - seaLevel;
  const pad0 = geodeticToEcef(site);
  // the body's axes on the pad: the plumb line, the plane's pole, and back up range
  const yIn = unit(sub(law.n, scale(law.up0, dot(law.n, law.up0))));
  const q0 = fromAxes(law.up0, yIn, cross(law.up0, yIn));
  const full = o.stages.map((s) => (s.usable ?? s.propellant).value);

  const dry = (i: number, from: number): number => {
    const load = full[i]!;
    const burned = (t: number) => stack.burned(i, from, t);
    let hi = from + (10 * load) / stack.flows[i]!;
    if (burned(hi) <= load) return Infinity;
    let lo = from;
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (burned(mid) < load) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const dries = new Map<string, number>();
  const dryOf = (i: number, from: number) => {
    const key = `${i}|${from}`;
    let at = dries.get(key);
    if (at === undefined) dries.set(key, (at = dry(i, from)));
    return at;
  };
  /** When a stage stops: cut, or dry. */
  const stop = (s: StagedState, i: number) => Math.min(s.stages[i]!.to, dryOf(i, s.stages[i]!.from));
  const burning = (s: StagedState, i: number, at = s.t) => {
    const st = s.stages[i]!;
    return st.gone > at && at >= st.from && at < stop(s, i);
  };
  /** One unit's propellant burned by `at`. */
  const burnedBy = (s: StagedState, i: number, at: number) => {
    const st = s.stages[i]!;
    return Number.isFinite(st.from) ? stack.burned(i, st.from, Math.min(at, stop(s, i), st.gone)) : 0;
  };
  const massAt = (s: StagedState, at: number): number => {
    let m = o.liftoffMass.value;
    o.stages.forEach((st, i) => {
      m -= Number.isFinite(s.stages[i]!.gone) ? st.count * st.mass.value : st.count * burnedBy(s, i, at);
    });
    for (const d of a.drops) if (Number.isFinite(s.drops[d.id] ?? Infinity)) m -= d.mass.value;
    return m;
  };
  const shape = (s: StagedState): number => {
    let at = 0;
    o.stages.forEach((st, i) => {
      if (Number.isFinite(s.stages[i]!.gone)) at = Math.max(at, st.separation?.value ?? st.cutoff.value);
    });
    return at;
  };
  /** The attitude `tau` into a tick begun at `q`, `w` under the angular acceleration `alpha` (body axes): a small turn. */
  const turned = (q: Quat, w: Vec3, alpha: Vec3, tau: number): Quat => {
    const phi: Vec3 = [
      w[0] * tau + 0.5 * alpha[0] * tau * tau,
      w[1] * tau + 0.5 * alpha[1] * tau * tau,
      w[2] * tau + 0.5 * alpha[2] * tau * tau,
    ];
    const angle = length(phi);
    return angle > 1e-15 ? normalize(multiply(q, aboutAxis(scale(phi, 1 / angle), angle))) : q;
  };
  /** Every force but gravity over the mass, at a state, an instant and an axis. */
  const accel = (st: State, at: number, s: StagedState, axis: Vec3, gone: number) => {
    const here = air(st, at);
    let thrust = 0;
    o.stages.forEach((_, i) => {
      if (burning(s, i, at)) thrust += stack.thrust(i, at, here.air.pressure);
    });
    const dragArea = stack.dragArea(gone, here.mach);
    let f = scale(axis, thrust);
    if (here.airspeed > 0) f = sub(f, scale(here.wind, (here.q * dragArea) / here.airspeed));
    return { accel: scale(f, 1 / massAt(s, at)), thrust, here };
  };
  const vacuumPush = (s: StagedState, i: number, at: number) =>
    burning(s, i, at) ? (o.stages[i]!.count * stack.throttle(i, at) * o.stages[i]!.thrust.vacuum.value) / massAt(s, at) : 0;

  /** What the controls set off at this instant. */
  const command = (state: StagedState, c: StagedControls): StagedState => {
    let s: StagedState = { ...state, controls: c };
    if (!c.steps?.length || s.parted || s.landed) return s;
    const stages = s.stages.map((st) => ({ ...st }));
    const drops = { ...s.drops };
    let parted: StagedState['parted'] = s.parted;
    for (const k of c.steps) {
      if (k.kind === 'drop') {
        if (a.drops.some((d) => d.id === k.id) && !Number.isFinite(drops[k.id] ?? Infinity)) drops[k.id] = s.t;
        continue;
      }
      const st = stages[k.stage];
      if (!st || Number.isFinite(st.gone)) continue;
      if (k.kind === 'ignite' && !Number.isFinite(st.from)) st.from = s.t;
      else if (k.kind === 'cut' && Number.isFinite(st.from) && st.to === Infinity) st.to = s.t;
      else if (k.kind === 'separate') {
        // it takes with it every stage still on below it, and the spacecraft leaves the last
        for (let j = 0; j <= k.stage; j++) if (!Number.isFinite(stages[j]!.gone)) stages[j]!.gone = s.t;
        if (k.stage === last) parted = { t: s.t, r: s.r, v: s.v };
      }
    }
    s = { ...s, stages, drops, parted };
    return s;
  };

  const start = (): StagedState => {
    const pad = law.pad;
    return {
      t: 0,
      ticks: 0,
      carry: 0,
      r: pad,
      v: cross(spinE, pad),
      q: q0,
      w: [0, 0, 0],
      held: true,
      stages: o.stages.map(() => ({ from: Infinity, to: Infinity, gone: Infinity })),
      drops: {},
      apparent: o.stages.map(() => 0),
      parted: null,
      landed: null,
      controls: { pitch: 0, yaw: 0, roll: 0 },
    };
  };

  const tick = (state: StagedState, controls: StagedControls | StagedPilot): StagedState => {
    if (state.landed || state.parted) return state;
    const s = command(state, typeof controls === 'function' ? controls(state) : controls);
    if (s.parted) return s;
    const lit = o.stages.some((_, i) => burning(s, i));
    if (s.held && !lit) return s; // the clock starts with the engines
    const h = TICK;
    const ticks = s.ticks + 1;
    const t = ticks * h;
    const c = s.controls;
    // steering while anything aboard burns: the stated acceleration, as far as the controls are thrown
    const alpha: Vec3 = lit ? [authority * clamp(c.roll), authority * clamp(c.pitch), authority * clamp(c.yaw)] : [0, 0, 0];
    const gone = shape(s);
    let held = s.held;
    let r = s.r;
    let v = s.v;
    if (held) {
      // it leaves the pad when the thrust is more than the weight
      const here = accel({ r, v }, s.t, s, turn(s.q, X), gone);
      if (here.thrust > massAt(s, s.t) * G0) held = false;
    }
    let q = s.q;
    let w = s.w;
    if (held) {
      // standing, turned with the Earth
      const turnE = aboutAxis([0, 0, 1], EARTH_ROTATION_RATE * h);
      r = turn(turnE, r);
      v = cross(spinE, r);
      q = normalize(multiply(turnE, q));
    } else {
      const along = c.prescribed ?? ((_: State, at: number) => turn(turned(s.q, s.w, alpha, at - s.t), X));
      const next = step({ r, v }, s.t, h, (st, at) => accel(st, at, s, along(st, at), gone).accel);
      r = next.r;
      v = next.v;
      q = c.prescribed ? along1(c.prescribed({ r, v }, t), law.n) : turned(s.q, s.w, alpha, h);
      w = [s.w[0] + alpha[0] * h, s.w[1] + alpha[1] * h, s.w[2] + alpha[2] * h];
    }
    // each burning stage's integrator: its own vacuum thrust over the mass, summed (the trapezoid, as staged.ts `apparentCut`)
    const apparent = s.apparent.map((sum, i) => sum + ((vacuumPush(s, i, s.t) + vacuumPush(s, i, t)) / 2) * h);
    let landed: StagedState['landed'] = null;
    if (!held) {
      const height = air({ r, v }, t).altitude;
      const near = length(sub(inertialToEcef(r, gast0 + EARTH_ROTATION_RATE * t), pad0)) < 1000;
      if (height < (near ? padHeight : 0) - 1 && dot(v, r) < 0) landed = { t, speed: length(sub(v, cross(spinE, r))) };
    }
    return { ...s, t, ticks, r, v, q, w, held, apparent, landed };
  };

  const thrustNow = (s: StagedState): number => {
    const here = air(s, s.t);
    return o.stages.reduce((sum, _, i) => sum + (burning(s, i) ? stack.thrust(i, s.t, here.air.pressure) : 0), 0);
  };

  // The record's sequence: each stage lit (unless at liftoff), cut (where that is not its separation), let go; each drop
  const sequence: { step: Step; at: number; label: string; order: number }[] = [];
  o.stages.forEach((st, i) => {
    const sep = st.separation?.value ?? Infinity;
    const one =
      i === last
        ? 'the spacecraft'
        : name(st.name)
            .toLowerCase()
            .replace(/^strap-on boosters$/, 'strap-ons');
    if (st.ignition.value > 0)
      sequence.push({
        step: { kind: 'ignite', stage: i },
        at: st.ignition.value,
        label: `Light the ${name(st.name).replace(/^(Third|Second|First) stage$/, (m) => m.toLowerCase())}`,
        order: 0,
      });
    if (i === last || st.cutoff.value < sep - 1e-9)
      sequence.push({
        step: { kind: 'cut', stage: i },
        at: st.cutoff.value,
        label: `Cut off the ${name(st.name).toLowerCase()}`,
        order: 1,
      });
    if (Number.isFinite(sep))
      sequence.push({
        step: { kind: 'separate', stage: i },
        at: sep,
        label: i === last ? 'Separate the spacecraft' : `Drop the ${one}`,
        order: 3,
      });
  });
  for (const d of a.drops) sequence.push({ step: { kind: 'drop', id: d.id }, at: d.at.value, label: `Drop the ${d.id}`, order: 2 });
  sequence.sort((p, q) => p.at - q.at || p.order - q.order);

  const sample = (s: StagedState, centre: number): LiveSample => {
    const [c, sn] = [Math.cos(-gast0), Math.sin(-gast0)];
    const flat = (u: Vec3): Vec3 => [c * u[0] - sn * u[1], sn * u[0] + c * u[1], u[2]];
    const here = air(s, s.t);
    const up = ecefToInertial(enuAxes(here.here).up, gast0 + EARTH_ROTATION_RATE * s.t);
    const climb = (d: Vec3) => (length(d) > 1e-9 ? Math.asin(clamp(dot(d, up) / length(d))) / DEG : 90);
    const axisIn = turn(s.q, X);
    const f = accel(s, s.t, s, axisIn, shape(s));
    const axis = flat(axisIn);
    const thrust = f.thrust;
    const attitude = multiply(aboutAxis([0, 0, 1], -gast0), s.q);
    const rFlat = flat(s.r);
    return {
      t: s.t,
      phase: thrust > 0 ? 'powered' : 'coast',
      altitude: here.altitude,
      range: angleBetween(inertialToEcef(s.r, gast0 + EARTH_ROTATION_RATE * s.t), pad0) * MEAN_RADIUS,
      speed: length(s.v),
      groundSpeed: here.airspeed,
      climb: climb(s.v),
      groundClimb: climb(here.wind),
      g: s.held ? 1 : length(f.accel) / G0,
      q: here.q,
      mach: here.mach,
      mass: massAt(s, s.t),
      latitude: here.here.latitude,
      longitude: here.here.longitude,
      r: rFlat,
      v: flat(s.v),
      axis,
      attitude,
      rates: s.w,
      alpha: here.airspeed > 1e-6 ? angleBetween(axisIn, here.wind) / DEG : 0,
      burning: thrust > 0 ? [{ name: 'main', thrust }] : [],
      centre: [rFlat[0] + axis[0] * centre, rFlat[1] + axis[1] * centre, rFlat[2] + axis[2] * centre],
      chute: { full: 0, was: 0, at: 0, fills: 1 },
      rcs: { left: [], firing: [] },
      tanks: null,
      strain: 0,
      lateral: 0,
    };
  };

  return {
    flight: o,
    plane: law.n,
    up: law.up0,
    authority,
    start,
    tick,
    step(state, controls, dt) {
      let s = state;
      const owed = s.carry + Math.max(0, dt);
      const n = Math.floor(owed / TICK + 1e-6);
      let carry = Math.max(0, owed - n * TICK);
      for (let i = 0; i < n && !s.landed && !s.parted; i++) {
        const before = s.ticks;
        s = tick(s, controls);
        if (s.ticks === before) {
          carry = 0;
          break;
        }
      }
      return { ...s, carry: s.landed || s.parted ? 0 : carry };
    },
    mass: (s, at = s.t) => massAt(s, at),
    left: (s) => o.stages.map((st, i) => (Number.isFinite(s.stages[i]!.gone) ? 0 : st.count * Math.max(0, full[i]! - burnedBy(s, i, s.t)))),
    burning,
    thrust: thrustNow,
    dry: dryOf,
    sequence: sequence.map(({ step, at, label }) => ({ step, at, label })),
    sample,
    shape,
  };
}

/** The guidance's gains: the turn's natural frequency, rad/s, critically damped. Chosen, not recorded: a stiff loop the steering's acceleration can follow. */
const OMEGA = 3;

export interface StagedPilotOptions {
  /** The turn's natural frequency, rad/s (`OMEGA` unless given: a test of the forces alone flies it stiffer). */
  omega?: number;
  /** The law flies the attitude (true), or the hands do. */
  guidance: boolean;
  /** The record's events at their times (true), or only what the hands set off. */
  sequence: boolean;
  /** The hands, each -1 to 1: laid over guidance's lean (W S, A D lean the law at `lean` rad/s, as the ballistic deck's trim) or, guidance off, the controls themselves. */
  hands?: () => { pitch: number; yaw: number; roll: number };
  /** The law's angle as the tangent took over, once it has: kept here so that a pilot taking over from another flies the same law. */
  memo?: { thetaTurn: number | null };
  /** Put the axis where the law has it at every instant, not steer it there (`StagedControls.prescribed`): a test's, and the record's run caught up to. */
  prescribed?: boolean;
  /** How far the hands have leaned the law, radians: kept by the caller. */
  trim?: { pitch: number; yaw: number };
  /** Steps the hands have asked for at this tick. */
  steps?: () => Step[];
}

/** The time a record step is due: its instant (a stage cut on its velocity has none: its integrator says when). */
const due = (v: StagedVehicle, i: number) => v.sequence[i]!;

/**
 * The record's flight, flown through the vehicle's controls as a hand flies it: the law's attitude held by the steering
 * (a critically damped turn toward the law's axis, its own turning fed forward) and the record's steps at their times,
 * a stage with a `velocity` cut when its integrator reaches its setting. Not physics: the controls a pilot gives.
 */
export function stagedPilot(
  v: StagedVehicle,
  x: Solved,
  site: Geodetic,
  launchJd: number,
  seaLevel: number,
  options: StagedPilotOptions,
): StagedPilot {
  const o = v.flight;
  const law = lawOf(o, site, launchJd, x);
  const air = airAt(seaLevel, launchJd);
  const memo = (options.memo ??= { thetaTurn: null });
  let last: { t: number; target: Vec3; rate: Vec3 | null } | null = null;
  const done = new Set<number>();
  const cutAt = o.stages.map((st) => (st.velocity ? st.velocity.speed.value + (st.velocity.over?.value ?? 0) : Infinity));
  return (s) => {
    const steps: Step[] = [...(options.steps?.() ?? [])];
    if (options.sequence) {
      v.sequence.forEach((k, i) => {
        if (done.has(i)) return;
        const step = k.step;
        const velocity = step.kind === 'cut' && o.stages[step.stage]!.velocity;
        const ready = velocity
          ? velocity.apparent
            ? s.apparent[step.stage]! >= cutAt[step.stage]!
            : length(s.v) >= cutAt[step.stage]!
          : s.t >= due(v, i).at - 1e-9;
        if (ready) {
          done.add(i);
          steps.push(step);
        }
      });
    }
    const hands = options.hands?.() ?? { pitch: 0, yaw: 0, roll: 0 };
    if (!options.guidance) return { ...hands, steps };
    if (options.prescribed) {
      // as staged.ts flies it: the part of the law fixed for the tick, thetaTurn from the instant the tangent took over
      const mode = law.modeAt(s.t);
      if (mode === 'tangent' && memo.thetaTurn === null) {
        const { u } = law.localAt(s.r);
        memo.thetaTurn = Math.asin(Math.max(-1, Math.min(1, dot(law.axisAt(s, s.t, 'turn', air(s, s.t).wind, 0), u))));
      }
      const theta = memo.thetaTurn ?? 0;
      return { pitch: 0, yaw: 0, roll: 0, steps, prescribed: (st, at) => law.axisAt(st, at, mode, air(st, at).wind, theta) };
    }
    // the law's axis now, leaned by the hands' trim
    const here = air(s, s.t);
    if (law.modeAt(s.t) === 'tangent' && memo.thetaTurn === null) {
      const { u } = law.localAt(s.r);
      memo.thetaTurn = Math.asin(Math.max(-1, Math.min(1, dot(law.axisAt(s, s.t, 'turn', here.wind, 0), u))));
    }
    const trim = options.trim ?? { pitch: 0, yaw: 0 };
    const aim = (st: State, at: number): Vec3 => {
      const mode: Mode = law.modeAt(at);
      let target = law.axisAt(st, at, mode === 'tangent' && memo.thetaTurn === null ? 'turn' : mode, air(st, at).wind, memo.thetaTurn ?? 0);
      if (trim.pitch) target = turn(aboutAxis(law.n, trim.pitch), target);
      if (trim.yaw) target = turn(aboutAxis(unit(st.r), trim.yaw), target);
      return target;
    };
    // its own turning and the change in it, fed forward (what a loop on the error alone would lag by), from the law's
    // last ticks; not across a change of the law's part, where the axis may step
    const target = aim(s, s.t);
    const dt = last ? s.t - last.t : 0;
    const one = last !== null && law.modeAt(last.t) === law.modeAt(s.t) && dt > 0;
    const rate: Vec3 = one ? scale(cross(last!.target, target), 1 / dt) : [0, 0, 0];
    const spinUp: Vec3 = one && last!.rate ? scale(sub(rate, last!.rate), 1 / dt) : [0, 0, 0];
    last = { t: s.t, target, rate: one ? rate : null };
    const tb = unturn(s.q, target);
    const rb = unturn(s.q, rate);
    const ab = unturn(s.q, spinUp);
    const error: Vec3 = [0, -tb[2], tb[1]];
    const k = v.authority > 0 ? 1 / v.authority : 0;
    const w = options.omega ?? OMEGA;
    const command = (i: 1 | 2) => clamp(k * (ab[i] + w * w * error[i] + 2 * w * (rb[i] - s.w[i])));
    return {
      pitch: hands.pitch || command(1),
      yaw: hands.yaw || command(2),
      roll: hands.roll || clamp(k * 2 * w * -s.w[0]),
      steps,
    };
  };
}

/** What is left of a stage's propellant when it was lit at `from` and stopped at `to`, kg (all its units). */
export function leftAfter(o: OrbitalFlight, i: number, from: number, to: number): number {
  const st = o.stages[i]!;
  const flow = st.thrust.vacuum.value / (G0 * st.isp.vacuum.value);
  return st.count * Math.max(0, (st.usable ?? st.propellant).value - flow * integral(st.throttle, from, to));
}

/**
 * What the batch run's summary and event states (staged.ts `AscentSummary`, `Ascended.at`) say of an ascent, gathered from a
 * live one as it is flown: so the checks the record sets can be held against a flight flown by hand (staged.ts `held`).
 * Each record event is matched to the stage event at its instant (a stage's separation or its cutoff), and is noted when
 * this flight's stage does it, whenever that is.
 */
export class StagedTally {
  readonly summary: AscentSummary;
  readonly at: Record<string, AscentSample> = {};
  private readonly v: StagedVehicle;
  private readonly matches: { id: string; stage: number; by: 'gone' | 'stop' }[];
  constructor(v: StagedVehicle) {
    this.v = v;
    const o = v.flight;
    this.summary = {
      maxQ: 0,
      maxQAt: 0,
      minuteG: Number.NaN,
      firstG: 0,
      coreG: 0,
      lastG: 0,
      perigee: Number.NaN,
      apogee: Number.NaN,
      inclination: Number.NaN,
      period: Number.NaN,
      cutoffAltitude: Number.NaN,
      cutoffSpeed: Number.NaN,
      cutoffClimb: Number.NaN,
      arc: Number.NaN,
      anomaly: Number.NaN,
      massLeft: Number.NaN,
      cutoffAt: Number.NaN,
    };
    this.matches = o.events.flatMap((e): { id: string; stage: number; by: 'gone' | 'stop' }[] => {
      const i = o.stages.findIndex((st) => st.separation && Math.abs(st.separation.value - e.at.value) < 1e-6);
      if (i >= 0 && i < o.stages.length - 1) return [{ id: e.id, stage: i, by: 'gone' as const }];
      const j = o.stages.findIndex(
        (st) => Math.abs(st.cutoff.value - e.at.value) < 1e-6 && (st.separation?.value ?? Infinity) > e.at.value + 1e-6,
      );
      return j >= 0 ? [{ id: e.id, stage: j, by: 'stop' as const }] : [];
    });
  }
  /** A tick has been flown from `before` to `s`. */
  note(before: StagedState, s: StagedState): void {
    const v = this.v;
    const o = v.flight;
    const a = ascentSample(v, before);
    const sum = this.summary;
    if (a.q > sum.maxQ) [sum.maxQ, sum.maxQAt] = [a.q, a.t];
    const on = (i: number) => !Number.isFinite(before.stages[i]!.gone);
    if (on(0)) sum.firstG = Math.max(sum.firstG, a.g);
    else if (o.stages.length > 2 && on(1)) sum.coreG = Math.max(sum.coreG, a.g);
    else if (v.burning(before, o.stages.length - 1)) sum.lastG = Math.max(sum.lastG, a.g);
    if (before.t < 60 - 1e-9 && s.t >= 60 - 1e-9) sum.minuteG = ascentSample(v, s).g;
    for (const m of this.matches) {
      if (this.at[m.id]) continue;
      const did = m.by === 'gone' ? Number.isFinite(s.stages[m.stage]!.gone) : v.burning(before, m.stage) && !v.burning(s, m.stage);
      if (did) this.at[m.id] = a;
    }
    const last = o.stages.length - 1;
    if (v.burning(before, last) && !v.burning(s, last)) {
      const el = elementsOf(before.r, before.v);
      const radius = o.orbit.radius.value;
      Object.assign(sum, {
        cutoffAt: before.t,
        perigee: el.a * (1 - el.e) - radius,
        apogee: el.a * (1 + el.e) - radius,
        inclination: el.i / DEG,
        period: period(el.a),
        cutoffAltitude: length(before.r) - radius,
        cutoffSpeed: length(before.v),
        cutoffClimb: Math.asin(dot(unit(before.r), unit(before.v))) / DEG,
      });
    }
  }
}

/** The live state as staged.ts's batch samples are (`AscentSample`): in the inertial frame of date. */
export function ascentSample(v: StagedVehicle, s: StagedState): AscentSample {
  const x = v.sample(s, 0);
  return {
    t: s.t,
    altitude: x.altitude,
    downrange: x.range,
    latitude: x.latitude,
    longitude: x.longitude,
    speed: x.speed,
    groundSpeed: x.groundSpeed,
    climb: x.climb,
    groundClimb: x.groundClimb,
    g: x.g,
    q: x.q,
    mach: x.mach,
    mass: x.mass,
    r: s.r,
    v: s.v,
    axis: turn(s.q, X),
    thrust: v.thrust(s),
  };
}
