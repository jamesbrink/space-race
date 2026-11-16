/**
 * A staged vehicle flown live: the ascent of an orbital flight's plan stepped a tick at a time and steered by
 * hand or by guidance, where staged.ts's `ascend` flies it whole with its attitude prescribed by the law. The same flight:
 * the same stages, engines, throttle curves, propellant, drops and drag (staged.ts `stackOf`), the same air (`airAt`),
 * the same gravity and integrator (world/orbit.ts `step`), in the same frame (world/earthframe.ts). What it adds is the body's
 * turning and the hands' say over every event.
 *
 * Attitude. A rigid body whose steering gives an angular acceleration (`ascent.steering.authority`, estimated) about each
 * of its axes at full throw, while any engine aboard burns; with nothing burning it cannot be steered and keeps the rates
 * it had. No inertia, no aerodynamic moment, no cross-coupling: none has been read for the R-7, so the steering is a
 * stated acceleration and the air does not turn it (drag acts along the motion, as in the batch run, whatever the
 * attitude: no lift, no weathercock). Its structure is held to `ascent.limits` (bending and the load along the axis, by
 * loads.ts's rule), and a jet fired into a stage still joined below it to what that stage's top stands (staging.ts). The thrust lies along the long
 * axis as it points, so it goes where the vehicle is pointed.
 *
 * Axes. The body's +X is the long axis, nose forward; on the pad +Y is the launch plane's pole (its left as it stood, as
 * staged.ts `recordSamples` has it) and +Z = X x Y points back up range. A positive turn about +Y (pitch, W) tips the
 * nose downrange, about +Z (yaw, A) to the left, about +X (roll, E) is right-handed about the nose: as sim/vehicle.ts.
 *
 * Events. Nothing happens that is not asked for (`StagedControls.steps`, or the plan's `events`): a stage lit, cut off or
 * let go, a drop let go, the spacecraft parted. What is lit, let go and gone, and which of the plan's events have happened,
 * is kept by the one machine (sim/craft.ts) on the flight's plan (sim/plan.ts, written from the record by vostok-plan.ts), whose
 * hardware rules it applies; `stages` and `drops` are its view, which the forces read. The record's sequence (each at its
 * time, the stage cut on its integrator's apparent velocity) is the pilot's to give: `stagedPilot` with the sequencer on
 * gives each event of it as it comes due (craft.ts `due`), as sim/autopilot.ts gives a ballistic flight's. A stage
 * stops when it is cut or when its usable propellant is gone; one let go takes with it every stage below it in the list
 * that is still on (the strap-ons hang on the core), what it had left aboard, and whatever thrust it was giving, once nothing
 * presses it on (staging.ts `pressed`: until then it stays on and pushes); its own separation command shuts it down where
 * the record has it stop at its separation. Broken up (`broke`), the flight ends. An
 * engine is started once. The spacecraft parted, the vehicle is done: `parted` is where the coast begins (orbital.ts
 * flyOrbit). Back on the ground, it stops (`landed`).
 *
 * Time: ticks of sim/vehicle.ts's TICK; events at the tick they are asked on.
 */

import { clamp } from '../util/math.ts';
import { EARTH_ROTATION_RATE, G0 } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, angleBetween, cross, DEG, dot, type Geodetic, geodeticToEcef, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { type State, step } from '../world/orbit.ts';
import { airDrag } from './air.ts';
import { sensed, trapezoid } from './apparent.ts';
import { act, type CraftState, due, heldBy, part, startCraft } from './craft.ts';
import { MEAN_RADIUS, RIDING } from './fly.ts';
import { floorAt } from './forces.ts';
import { type Strain, strain, UNSTRAINED } from './loads.ts';
import type { Action, FlightPlan } from './plan.ts';
import { aboutAxis, fromAxes, multiply, normalize, type Quat, turn, unturn } from './rigid.ts';
import {
  type AscentSample,
  type AscentSummary,
  airOf,
  atCutoff,
  flowOf,
  integral,
  lawOf,
  type Mode,
  type Solved,
  sequenceOf,
  stagesOf,
  spentAt,
  stackOf,
} from './staged.ts';
import { hotStage, pressed } from './staging.ts';
import { type LiveSample, TICK } from './vehicle.ts';

/** Something set off by a hand or the sequencer: a stage lit, cut off or let go, a drop (`ascent.drops`) let go. The last stage's 'separate' parts the spacecraft. */
export type Step = { kind: 'ignite' | 'cut' | 'separate'; stage: number } | { kind: 'drop'; id: string };

export interface StagedControls {
  /** Steering, -1 to 1 about each body axis. */
  pitch: number;
  yaw: number;
  roll: number;
  /** What to set off at this tick: a hand's steps, then the plan's events by id (`FlightPlan.events`: the record's pilot gives these). */
  steps?: readonly Step[];
  events?: readonly string[];
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
  /** The stack's base (the point staged.ts flies) in the vehicle's frame, m and m/s. */
  r: Vec3;
  v: Vec3;
  /** Attitude, body to that frame, and body rates, rad/s. */
  q: Quat;
  w: Vec3;
  /** Still standing on the pad. */
  held: boolean;
  /**
   * Each stage: lit at `from` (Infinity, never), stopped at `to` (Infinity while it burns, until it is dry), let go at
   * `loose` (asked; Infinity, never) and gone at `gone` (Infinity, aboard): later than `loose` while it stays pressed on.
   */
  stages: readonly { from: number; to: number; gone: number; loose: number }[];
  /** Each of `ascent.drops`, by id: when it was let go. */
  drops: Readonly<Record<string, number>>;
  /** The machine's state (sim/craft.ts): what is lit, let go and gone, which events have happened. `stages` and `drops` are its view. */
  craft: CraftState;
  /** Each stage's integrator: the thrust it has sensed over the mass, summed from its ignition, m/s (staged.ts `apparentCut`). */
  apparent: readonly number[];
  /** The spacecraft parted from the last stage: when and where, for the coast. */
  parted: null | { t: number; r: Vec3; v: Vec3 };
  /** Back on the ground. */
  landed: null | { t: number; speed: number };
  /** Each stage's jet fired into the stage it stands on while joined (the joint's `hot`, plan.ts): seconds at full thrust, s. */
  scorch: readonly number[];
  /** The structure against `ascent.limits` (sim/loads.ts): its bending load (q alpha) and its load along the axis. */
  strain: Strain;
  axial: Strain;
  /** It broke up: when, by what, the figure against its limit, and what the deck says of it. The flight ends there. */
  broke: null | Broke;
  /** What the hardware made of a hand's asking, in order: each said once, when it happened (the deck shows them). */
  said: readonly Said[];
  /** The steering last applied. */
  controls: StagedControls;
}

/** The launch vehicle broke up: at `t`, by its bending load, its load along the axis, or a jet fired into the stage below. */
export interface Broke {
  t: number;
  by: 'bending' | 'axial' | 'scorch';
  /** The figure and its limit, in `unit`; the limit's confidence. */
  value: number;
  limit: number;
  unit: string;
  confidence: string;
  /** In the deck's words. */
  text: string;
}

/** A note of what the vehicle did with something asked of it, or what is not modelled of it. */
export interface Said {
  t: number;
  title: string;
  text: string;
}

export type StagedPilot = (state: StagedState) => StagedControls;

export interface StagedVehicle {
  /** The plan it is flown from (sim/plan.ts). */
  readonly plan: FlightPlan;
  /** The frame it is flown in (world/earthframe.ts): its states are in it. */
  readonly frame: EarthFrame;
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
  /** The record's sequence of steps, in order, with the instants the record has them (a stage cut on its velocity: its recorded cutoff), each the plan's `event`. */
  readonly sequence: readonly { step: Step; at: number; label: string; event: string }[];
  /**
   * The state as the scene's samples are (staged.ts `recordSamples`): in the vehicle's frame (`frame`), `r` the stack's
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
const name = (s: string) => s.split(',')[0]!;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A flight's staged vehicle, ready to be flown. `site`, `frame` and `seaLevel` as staged.ts `ascend`'s; `x` the law's solution, for its plane. */
export function stagedVehicle(
  plan: FlightPlan,
  site: Geodetic,
  frame: EarthFrame,
  seaLevel: number,
  x: Solved,
  /** For a test of the forces alone: a steering acceleration other than the record's, rad/s^2. */
  authorityOverride?: number,
): StagedVehicle {
  const def = plan.craft[0]!;
  const stages = stagesOf(plan);
  const seq = sequenceOf(plan);
  const spinE = frame.spin;
  const law = lawOf(plan, site, frame, x);
  const stack = stackOf(plan);
  const air = airOf(seaLevel, frame);
  const steering = def.thrusters.find((t) => t.authority);
  const authority = authorityOverride ?? (steering?.authority?.value ?? 0) * DEG;
  const last = stages.length - 1;
  const floor = floorAt(site, seaLevel);
  const pad0 = geodeticToEcef(site);
  // the body's axes on the pad: the plumb line, the plane's pole, and back up range
  const yIn = unit(sub(law.n, scale(law.up0, dot(law.n, law.up0))));
  const q0 = fromAxes(law.up0, yIn, cross(law.up0, yIn));
  const full = stages.map((s) => s.load);
  // each stage's engine, body and joint by id (the machine's keys), and its index by its engine's and its joint's
  const ids = stages.map((s, i) => ({ engine: s.engine.id, body: s.body.id, joint: seq.stages[i]!.joint ?? '' }));
  const byEngine = new Map(ids.map((k, i) => [k.engine, i]));
  const byJoint = new Map(ids.map((k, i) => [k.joint, i]));
  /** What a stage lit while the one it stands on is joined fires into (staging.ts `hotStage`): the joint below's `hot`. */
  const hots = stages.map((s) => def.joints.find((j) => j.hot?.engine === s.engine.id)?.hot ?? null);
  /** The step a plan's action is, where it is one of the ascent's: a stage's engine or joint, a drop's joint. */
  const stepOf = (x: Action): Step | null => {
    if ('ignite' in x && byEngine.has(x.ignite)) return { kind: 'ignite', stage: byEngine.get(x.ignite)! };
    if ('cut' in x && byEngine.has(x.cut)) return { kind: 'cut', stage: byEngine.get(x.cut)! };
    if ('separate' in x && byJoint.has(x.separate)) return { kind: 'separate', stage: byJoint.get(x.separate)! };
    if ('separate' in x && seq.drops.some((d) => d.joint === x.separate)) return { kind: 'drop', id: x.separate };
    return null;
  };
  /** The machine's state as the forces read it: each stage lit, stopped, let go and gone; each drop let go. */
  const viewOf = (craft: CraftState): Pick<StagedState, 'stages' | 'drops'> => ({
    stages: ids.map((k) => {
      const e = craft.engines[k.engine]!;
      return { from: e.lit, to: e.out, gone: craft.bodies[k.body]!, loose: craft.joints[k.joint]?.loose ?? Infinity };
    }),
    drops: Object.fromEntries(
      seq.drops.flatMap((d) => (Number.isFinite(craft.joints[d.joint]!.loose) ? [[d.joint, craft.joints[d.joint]!.loose]] : [])),
    ),
  });

  const dry = (i: number, from: number): number => {
    const load = full[i]!;
    const burned = (t: number) => stack.burned(i, from, t);
    const hi = from + (10 * load) / stack.flows[i]!;
    return burned(hi) <= load ? Infinity : spentAt(burned, load, from, hi);
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
    let m = def.mass.value;
    stages.forEach((st, i) => {
      m -= Number.isFinite(s.stages[i]!.gone) ? st.count * st.body.mass.value : st.count * burnedBy(s, i, at);
    });
    for (const d of seq.drops) if (Number.isFinite(s.drops[d.joint] ?? Infinity)) m -= d.body.count * d.body.mass.value;
    return m;
  };
  const shape = (s: StagedState): number => {
    let at = 0;
    seq.stages.forEach((k, i) => {
      if (Number.isFinite(s.stages[i]!.gone)) at = Math.max(at, Number.isFinite(k.sep) ? k.sep : k.cutAt!);
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
  /** A stage's engine lit while the stage it stands on is still joined: what of its thrust pushes the stack (staging.ts `hotStage`). */
  const hotShare = hots.map((h) => (h ? hotStage(h) : 1));
  const joined = (s: StagedState, i: number, at: number) => i > 0 && s.stages[i - 1]!.gone > at;
  const firesInto = (s: StagedState, i: number, at: number) => hotShare[i] !== 1 && joined(s, i, at);
  /** What stage `i` pushes the stack with, N: its thrust in this air, less what a joint below takes of it, with what burns and what is joined as from instant `as`. */
  const pushOf = (s: StagedState, i: number, at: number, pressure: number, as = at): number => {
    if (!burning(s, i, as)) return 0;
    const f = stack.thrust(i, at, pressure);
    return firesInto(s, i, as) ? f * hotShare[i]! : f;
  };
  /**
   * Every force but gravity over the mass, at a state, an instant and an axis, with what burns as it is from instant `as`
   * (a step's start: a step ends on every instant something stops, so within it what burns is fixed).
   */
  const accel = (st: State, at: number, s: StagedState, axis: Vec3, gone: number, as = at) => {
    const here = air(st, at);
    let thrust = 0;
    stages.forEach((_, i) => {
      thrust += pushOf(s, i, at, here.air.pressure, as);
    });
    const dragArea = stack.dragArea(gone, here.mach);
    let f = scale(axis, thrust);
    f = add(f, airDrag(here.wind, here.airspeed, here.air.density, dragArea));
    return { accel: scale(f, 1 / massAt(s, at)), thrust, here };
  };
  const vacuumPush = (s: StagedState, i: number, at: number) => {
    if (!burning(s, i, at)) return 0;
    const f = sensed(stages[i]!.count, stack.throttle(i, at), stages[i]!.engine.thrust.vacuum.value, massAt(s, at));
    return firesInto(s, i, at) ? f * hotShare[i]! : f;
  };
  /** A stage's name as the deck says it ('the core', 'the strap-ons', 'the third stage'); the last's load is 'the spacecraft'. */
  const called = (i: number) =>
    `the ${name(stages[i]!.body.label)
      .replace(/^(Third|Second|First) stage$/, (m) => m.toLowerCase())
      .replace(/^Core$/, 'core')
      .replace(/^Strap-on boosters$/, 'strap-ons')}`;
  /** What one unit of a stage weighs now, kg, and what the spacecraft does. */
  const unitMass = (s: StagedState, i: number, at: number) => stages[i]!.body.mass.value - burnedBy(s, i, at);
  const qAlpha = def.limits.find((l) => l.of === 'qAlpha');
  const axialLimit = def.limits.find((l) => l.of === 'axial');
  const lim = qAlpha && axialLimit ? { qAlpha: qAlpha.value, axial: axialLimit.value } : null;

  /**
   * What has been let go and is not yet gone parts now if nothing presses it on (staging.ts `pressed`): each stage let go
   * with every stage still on below it, against all that is above it; the spacecraft against the last stage, and not
   * while what `covers` it is on. Said once when it stays on, and when it goes.
   */
  const settle = (s: StagedState, craft0: CraftState, said: Said[]): { craft: CraftState; parted: StagedState['parted'] } => {
    let parted: StagedState['parted'] = s.parted;
    let craft = craft0;
    let pressure: number | null = null;
    for (let k = last; k >= 0; k--) {
      const id = ids[k]!.joint;
      const loose = craft.joints[id]?.loose ?? Infinity;
      if (!Number.isFinite(loose) || Number.isFinite(craft.bodies[ids[k]!.body]!)) continue;
      const view: StagedState = { ...s, ...viewOf(craft) };
      if (heldBy(plan, craft, id)) {
        if (loose === s.t)
          said.push({
            t: s.t,
            title: 'Held inside the fairing',
            text: `The spacecraft is let go, but the fairing is over it: it cannot leave until the fairing has gone`,
          });
        continue;
      }
      pressure ??= air(s, s.t).air.pressure;
      const group = stages.map((_, j) => j <= k && !Number.isFinite(view.stages[j]!.gone));
      let behind = { thrust: 0, mass: 0 };
      let ahead = { thrust: 0, mass: massAt(view, s.t) };
      stages.forEach((g, j) => {
        if (!group[j]) {
          ahead = { ...ahead, thrust: ahead.thrust + pushOf(view, j, s.t, pressure!) };
          return;
        }
        const m = g.count * unitMass(view, j, s.t);
        behind = { thrust: behind.thrust + pushOf(view, j, s.t, pressure!), mass: behind.mass + m };
      });
      ahead = { ...ahead, mass: ahead.mass - behind.mass };
      if (pressed(behind, ahead)) {
        if (loose === s.t)
          said.push({
            t: s.t,
            title: 'Let go, still pushing',
            text: `${cap(k === last ? 'the spacecraft' : called(k))} is let go, but what is under it still pushes harder than what it carries can gather speed: it stays pressed on, and pushes it on, until its thrust falls`,
          });
        continue;
      }
      craft = part(plan, craft, id, s.t);
      if (loose < s.t)
        said.push({ t: s.t, title: 'Parted', text: `${cap(k === last ? 'the spacecraft' : called(k))} parted at last, its push gone` });
      if (k === last) parted = { t: s.t, r: s.r, v: s.v };
    }
    return { craft, parted };
  };

  /** What the controls set off at this instant: the hands' steps, then the plan's events, each through the machine. */
  const command = (state: StagedState, c: StagedControls): StagedState => {
    const s: StagedState = { ...state, controls: c };
    if (s.parted || s.landed || s.broke) return s;
    const loose = s.stages.some((st) => Number.isFinite(st.loose) && !Number.isFinite(st.gone));
    if (!c.steps?.length && !c.events?.length && !loose) return s;
    let craft = s.craft;
    const said = [...s.said];
    const doing = (k: Step): void => {
      if (k.kind === 'drop') {
        const d = seq.drops.find((x) => x.joint === k.id);
        if (d && !Number.isFinite(craft.joints[k.id]!.loose)) {
          // nothing presses a drop on: let go, it is gone
          craft = part(plan, act(plan, craft, { separate: k.id }, s.t, s.held).state, k.id, s.t);
          const q = air(s, s.t).q;
          const most = def.joints.find((j) => j.id === d.joint)?.q;
          if (most && q > most.value)
            said.push({
              t: s.t,
              title: `The ${d.body.label} let go in the air`,
              text: `At ${(q / 1000).toFixed(1)} kPa of dynamic pressure, where it was made to part in ${(most.value / 1000).toFixed(1)} (${most.confidence}). Not modelled: where its pieces went in that air and what they struck`,
            });
        }
        return;
      }
      const g = stages[k.stage];
      const id = ids[k.stage];
      const view = (): StagedState => ({ ...s, ...viewOf(craft) });
      if (!g || !id || Number.isFinite(craft.bodies[id.body] ?? Infinity)) return;
      const e = craft.engines[id.engine]!;
      if (k.kind === 'ignite') {
        if (Number.isFinite(e.lit)) {
          // (one burn a stage: what it burns is worked from its one lighting, so a stage once lit is not lit again)
          if (!burning(view(), k.stage))
            said.push({
              t: s.t,
              title: 'Not lit',
              text: `${cap(called(k.stage))}’s ${name(g.engine.label)} has been started ${g.engine.starts.count === 1 ? 'once' : 'as often as it can be'}, and cannot be again${g.engine.starts.source ? `: ${g.engine.starts.source}` : '.'}`,
            });
          return;
        }
        const r = act(plan, craft, { ignite: id.engine }, s.t, s.held);
        if (r.refused.some((x) => x.why === 'ground')) {
          said.push({
            t: s.t,
            title: 'Not lit',
            text: `${cap(called(k.stage))}’s ${name(g.engine.label)} can be lit only on the pad${g.engine.starts.source ? `: ${g.engine.starts.source}` : '.'}`,
          });
          return;
        }
        // (whether anything was pushing it, before this stage lit)
        const before = view();
        const nothing = !stages.some((_, j) => burning(before, j));
        craft = r.state;
        const now = view();
        if (firesInto(now, k.stage, s.t))
          said.push({
            t: s.t,
            title: 'Hot staging',
            text: `${cap(called(k.stage))} lit with ${called(k.stage - 1)} still on, as it flew: its jet strikes the deflector on ${called(k.stage - 1)}’s top and leaves through the lattice, so ${(100 * hotShare[k.stage]!).toFixed(0)} per cent of its push reaches the stack until ${called(k.stage - 1)} is let go. The top is taken to stand ${hots[k.stage]!.endures.value} s of it (${hots[k.stage]!.endures.confidence})`,
          });
        else if (nothing && !s.held)
          said.push({
            t: s.t,
            title: 'Lit in free fall',
            text: `Nothing was pushing the stack: whether its propellant lay settled over the pumps' inlets is not modelled, and it is taken to start`,
          });
      } else if (k.kind === 'cut') craft = act(plan, craft, { cut: id.engine }, s.t, s.held).state;
      else if (k.kind === 'separate' && craft.joints[id.joint] && !Number.isFinite(craft.joints[id.joint]!.loose)) {
        // the command that lets it go shuts its engines down where the plan has no cut of their own (they stop at its separation)
        const own = seq.stages[k.stage]!;
        if (own.cut === null && own.speed === null) craft = act(plan, craft, { cut: id.engine }, s.t, s.held).state;
        craft = act(plan, craft, { separate: id.joint }, s.t, s.held).state;
      }
    };
    for (const k of c.steps ?? []) doing(k);
    for (const id of c.events ?? []) {
      const e = plan.events.find((x) => x.id === id);
      if (!e || craft.fired[id] !== undefined) continue;
      craft = { ...craft, fired: { ...craft.fired, [id]: s.t } };
      for (const x of e.do) {
        const k = stepOf(x);
        if (k) doing(k);
        else craft = act(plan, craft, x, s.t, s.held).state;
      }
    }
    const settled = settle({ ...s, ...viewOf(craft) }, craft, said);
    return { ...s, craft: settled.craft, ...viewOf(settled.craft), parted: settled.parted, said };
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
      craft: startCraft(plan),
      stages: stages.map(() => ({ from: Infinity, to: Infinity, gone: Infinity, loose: Infinity })),
      drops: {},
      apparent: stages.map(() => 0),
      parted: null,
      landed: null,
      scorch: stages.map(() => 0),
      strain: UNSTRAINED,
      axial: UNSTRAINED,
      broke: null,
      said: [],
      controls: { pitch: 0, yaw: 0, roll: 0 },
    };
  };

  const tick = (state: StagedState, controls: StagedControls | StagedPilot): StagedState => {
    if (state.landed || state.parted || state.broke) return state;
    const s = command(state, typeof controls === 'function' ? controls(state) : controls);
    if (s.parted) return s;
    const lit = stages.some((_, i) => burning(s, i));
    if (s.held && !lit) return s; // the clock starts with the engines
    const h = TICK;
    const ticks = s.ticks + 1;
    const t = ticks * h;
    const c = s.controls;
    // steering while anything aboard burns: the stated acceleration, as far as the controls are thrown
    const alpha: Vec3 = lit
      ? [authority * clamp(c.roll, -1, 1), authority * clamp(c.pitch, -1, 1), authority * clamp(c.yaw, -1, 1)]
      : [0, 0, 0];
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
      // (a stage that runs dry within the tick: the tick is flown in two, to the instant it does and on from there, so
      // its burn is all of its propellant and no more)
      const dries = stages
        .map((_, i) => (burning(s, i, s.t) ? stop(s, i) : Infinity))
        .filter((x) => x > s.t + 1e-9 && x < t - 1e-9)
        .sort((p, q) => p - q);
      let at0 = s.t;
      for (const to of [...dries, t]) {
        const from = at0;
        const next = step({ r, v }, from, to - from, (st, at) => accel(st, at, s, along(st, at), gone, from).accel);
        r = next.r;
        v = next.v;
        at0 = to;
      }
      q = c.prescribed ? along1(c.prescribed({ r, v }, t), law.n) : turned(s.q, s.w, alpha, h);
      w = [s.w[0] + alpha[0] * h, s.w[1] + alpha[1] * h, s.w[2] + alpha[2] * h];
    }
    // each burning stage's integrator: its own vacuum thrust over the mass, summed (the trapezoid, as staged.ts `apparentCut`)
    const apparent = s.apparent.map((sum, i) => sum + trapezoid(vacuumPush(s, i, s.t), vacuumPush(s, i, t), h));
    let landed: StagedState['landed'] = null;
    if (!held) {
      const here = air({ r, v }, t);
      if (here.altitude < floor(here.here.latitude, here.here.longitude) - 1 && dot(v, r) < 0)
        landed = { t, speed: length(sub(v, cross(spinE, r))) };
    }
    const next: StagedState = { ...s, t, ticks, r, v, q, w, held, apparent, landed };
    return held || landed ? next : loaded(s, next);
  };

  /**
   * What the tick did to the structure: each jet fired into a stage still joined below it heats that stage's top
   * (`hot.endures` seconds at full thrust and it fails), and the bending load and the load along the axis, against
   * `ascent.limits` by loads.ts's rule. Past any of them it breaks up, and the flight ends there.
   */
  const loaded = (s: StagedState, next: StagedState): StagedState => {
    let scorch = s.scorch;
    let broke: Broke | null = null;
    hots.forEach((hot, i) => {
      if (!hot || !burning(s, i, s.t) || !firesInto(s, i, s.t)) return;
      if (scorch === s.scorch) scorch = [...s.scorch];
      const dose = scorch[i]! + stack.throttle(i, s.t) * TICK;
      (scorch as number[])[i] = dose;
      if (dose > hot.endures.value && !broke)
        broke = {
          t: next.t,
          by: 'scorch',
          value: dose,
          limit: hot.endures.value,
          unit: 's',
          confidence: hot.endures.confidence,
          text: `${cap(called(i))} fired into ${called(i - 1)} for ${dose.toFixed(1)} s at full thrust, where its top is taken to stand ${hot.endures.value} s (${hot.endures.confidence}). The deflector burned through, the tank under it failed and the stack broke up at T+${next.t.toFixed(0)} s. Not modelled: what came through it, and the spacecraft’s escape from a launch vehicle breaking up`,
        };
    });
    if (!lim) return scorch === s.scorch && !broke ? next : apart({ ...next, scorch, broke });
    // the loads at the tick's end, on what was aboard through it
    const axisIn = turn(next.q, X);
    const f = accel(next, next.t, s, axisIn, shape(s));
    const alpha = f.here.airspeed > 1 ? angleBetween(axisIn, f.here.wind) : 0;
    const bend = strain(s.strain, (f.here.q * alpha) / lim.qAlpha.value, TICK);
    const g = dot(f.accel, axisIn) / G0;
    const axial = strain(s.axial, Math.abs(g) / lim.axial.value, TICK);
    if (!broke && bend.fails)
      broke = {
        t: next.t,
        by: 'bending',
        value: f.here.q * alpha,
        limit: lim.qAlpha.value,
        unit: 'Pa rad',
        confidence: lim.qAlpha.confidence,
        text: `Broke up at T+${next.t.toFixed(0)} s: its bending load, ${(100 * bend.strain.load).toFixed(0)} per cent of the limit taken (${(lim.qAlpha.value / 1000).toFixed(1)} kPa rad, ${lim.qAlpha.confidence}), at ${(f.here.q / 1000).toFixed(1)} kPa and ${(alpha / DEG).toFixed(0)} degrees off the wind`,
      };
    else if (!broke && axial.fails)
      broke = {
        t: next.t,
        by: 'axial',
        value: Math.abs(g),
        limit: lim.axial.value,
        unit: 'g',
        confidence: lim.axial.confidence,
        text: `Broke up at T+${next.t.toFixed(0)} s: ${Math.abs(g).toFixed(1)} g along its axis, where its structure is taken to stand ${lim.axial.value} g (${lim.axial.confidence})`,
      };
    return apart({ ...next, scorch, strain: bend.strain, axial: axial.strain, broke });
  };
  /** Broken up, it is in pieces: every engine out and every stage gone from the instant it broke (for the scene to let them fall). */
  const apart = (s: StagedState): StagedState => {
    if (!s.broke) return s;
    const at = s.broke.t;
    const engines = { ...s.craft.engines };
    const bodies = { ...s.craft.bodies };
    for (const k of ids) {
      const e = engines[k.engine]!;
      if (Number.isFinite(e.lit)) engines[k.engine] = { ...e, out: Math.min(e.out, at) };
      bodies[k.body] = Math.min(bodies[k.body]!, at);
    }
    const craft = { ...s.craft, engines, bodies };
    return { ...s, craft, ...viewOf(craft) };
  };

  const thrustNow = (s: StagedState): number => {
    const here = air(s, s.t);
    return stages.reduce((sum, _, i) => sum + (burning(s, i) ? pushOf(s, i, s.t, here.air.pressure) : 0), 0);
  };

  // The record's sequence: the plan's events that light, cut or let go a stage or let go a drop, in its order (vostok-plan.ts:
  // each stage lit unless at liftoff, cut where that is not its separation, let go; each drop), at the record's instants
  const sequence = plan.events.flatMap((e) => {
    const step = e.at && e.do.length === 1 ? stepOf(e.do[0]!) : null;
    return step ? [{ step, at: e.at!.value, label: e.label, event: e.id }] : [];
  });

  const sample = (s: StagedState, centre: number): LiveSample => {
    const here = air(s, s.t);
    const up = frame.upOver(here.here, s.t);
    const climb = (d: Vec3) => (length(d) > 1e-9 ? Math.asin(clamp(dot(d, up) / length(d), -1, 1)) / DEG : 90);
    const axisIn = turn(s.q, X);
    const f = accel(s, s.t, s, axisIn, shape(s));
    const axis = axisIn;
    const thrust = f.thrust;
    const attitude = s.q;
    const r0 = s.r;
    return {
      t: s.t,
      ...RIDING,
      powered: thrust > 0,
      altitude: here.altitude,
      range: angleBetween(frame.toFixed(s.r, s.t), pad0) * MEAN_RADIUS,
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
      r: r0,
      v: s.v,
      axis,
      attitude,
      rates: s.w,
      alpha: here.airspeed > 1e-6 ? angleBetween(axisIn, here.wind) / DEG : 0,
      burning: stages.flatMap((st, i) => (burning(s, i) ? [{ engine: st.engine.id, thrust: pushOf(s, i, s.t, here.air.pressure) }] : [])),
      centre: [r0[0] + axis[0] * centre, r0[1] + axis[1] * centre, r0[2] + axis[2] * centre],
      chute: { full: 0, was: 0, at: 0, fills: 1 },
      rcs: { left: [], firing: [] },
      tanks: null,
      strain: s.strain.load,
      lateral: 0,
    };
  };

  return {
    plan,
    frame,
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
      for (let i = 0; i < n && !s.landed && !s.parted && !s.broke; i++) {
        const before = s.ticks;
        s = tick(s, controls);
        if (s.ticks === before) {
          carry = 0;
          break;
        }
      }
      return { ...s, carry: s.landed || s.parted || s.broke ? 0 : carry };
    },
    mass: (s, at = s.t) => massAt(s, at),
    left: (s) => stages.map((st, i) => (Number.isFinite(s.stages[i]!.gone) ? 0 : st.count * Math.max(0, full[i]! - burnedBy(s, i, s.t)))),
    burning,
    thrust: thrustNow,
    dry: dryOf,
    sequence,
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

/**
 * The record's flight, flown through the vehicle's controls as a hand flies it: the law's attitude held by the steering
 * (a critically damped turn toward the law's axis, its own turning fed forward) and the record's steps at their times,
 * a stage with a `velocity` cut when its integrator reaches its setting. Not physics: the controls a pilot gives.
 */
export function stagedPilot(
  v: StagedVehicle,
  x: Solved,
  site: Geodetic,
  frame: EarthFrame,
  seaLevel: number,
  options: StagedPilotOptions,
): StagedPilot {
  const law = lawOf(v.plan, site, frame, x);
  const air = airOf(seaLevel, frame);
  const memo = (options.memo ??= { thetaTurn: null });
  let last: { t: number; target: Vec3; rate: Vec3 | null } | null = null;
  const inSequence = new Set(v.sequence.map((k) => k.event));
  const index = new Map(stagesOf(v.plan).map((s, i) => [s.engine.id, i]));
  return (s) => {
    const steps: Step[] = [...(options.steps?.() ?? [])];
    // each event of the record's sequence that has not happened, as it comes due (craft.ts `due`): at its instant, or a
    // stage cut on its velocity when its integrator (or the space-fixed speed) reaches the setting. Time and speed alone set them off.
    const events = options.sequence
      ? due(
          v.plan,
          s.craft,
          {
            t: s.t,
            height: Number.NaN,
            falling: false,
            speed: length(s.v),
            apparent: (id) => s.apparent[index.get(id)!]!,
            g: Number.NaN,
            held: s.held,
          },
          (e) => inSequence.has(e.id),
        ).map((e) => e.id)
      : [];
    const hands = options.hands?.() ?? { pitch: 0, yaw: 0, roll: 0 };
    if (!options.guidance) return { ...hands, steps, events };
    if (options.prescribed) {
      // as staged.ts flies it: the part of the law fixed for the tick, thetaTurn from the instant the tangent took over
      const mode = law.modeAt(s.t);
      if (mode === 'tangent' && memo.thetaTurn === null) {
        const { u } = law.localAt(s.r);
        memo.thetaTurn = Math.asin(Math.max(-1, Math.min(1, dot(law.axisAt(s, s.t, 'turn', air(s, s.t).wind, 0), u))));
      }
      const theta = memo.thetaTurn ?? 0;
      return { pitch: 0, yaw: 0, roll: 0, steps, events, prescribed: (st, at) => law.axisAt(st, at, mode, air(st, at).wind, theta) };
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
    const command = (i: 1 | 2) => clamp(k * (ab[i] + w * w * error[i] + 2 * w * (rb[i] - s.w[i])), -1, 1);
    return {
      pitch: hands.pitch || command(1),
      yaw: hands.yaw || command(2),
      roll: hands.roll || clamp(k * 2 * w * -s.w[0], -1, 1),
      steps,
      events,
    };
  };
}

/** What is left of a stage's propellant when it was lit at `from` and stopped at `to`, kg (all its units). */
export function leftAfter(plan: FlightPlan, i: number, from: number, to: number): number {
  const st = stagesOf(plan)[i]!;
  const flow = flowOf(st.engine);
  return st.count * Math.max(0, st.load - flow * integral(st.throttle, from, to));
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
    const stages = stagesOf(v.plan);
    const seq = sequenceOf(v.plan);
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
    // (each of the record's instants: a stage let go there, or one cut there by a cut of its own before it is let go)
    this.matches = seq.instants.flatMap((e): { id: string; stage: number; by: 'gone' | 'stop' }[] => {
      const i = seq.stages.findIndex((k) => Number.isFinite(k.sep) && Math.abs(k.sep - e.at) < 1e-6);
      if (i >= 0 && i < stages.length - 1) return [{ id: e.id, stage: i, by: 'gone' as const }];
      const j = seq.stages.findIndex((k) => k.cutAt !== null && Math.abs(k.cutAt - e.at) < 1e-6 && k.sep > e.at + 1e-6);
      return j >= 0 ? [{ id: e.id, stage: j, by: 'stop' as const }] : [];
    });
  }
  /** A tick has been flown from `before` to `s`. */
  note(before: StagedState, s: StagedState): void {
    const v = this.v;
    const n = stagesOf(v.plan).length;
    const a = ascentSample(v, before);
    const sum = this.summary;
    if (a.q > sum.maxQ) [sum.maxQ, sum.maxQAt] = [a.q, a.t];
    const on = (i: number) => !Number.isFinite(before.stages[i]!.gone);
    if (on(0)) sum.firstG = Math.max(sum.firstG, a.g);
    else if (n > 2 && on(1)) sum.coreG = Math.max(sum.coreG, a.g);
    else if (v.burning(before, n - 1)) sum.lastG = Math.max(sum.lastG, a.g);
    if (before.t < 60 - 1e-9 && s.t >= 60 - 1e-9) sum.minuteG = ascentSample(v, s).g;
    for (const m of this.matches) {
      if (this.at[m.id]) continue;
      const did = m.by === 'gone' ? Number.isFinite(s.stages[m.stage]!.gone) : v.burning(before, m.stage) && !v.burning(s, m.stage);
      if (did) this.at[m.id] = a;
    }
    const last = n - 1;
    if (v.burning(before, last) && !v.burning(s, last)) Object.assign(sum, atCutoff(v.plan, before.t, before, v.start().r));
  }
}

/** The live state as staged.ts's batch samples are (`AscentSample`): in the vehicle's frame. */
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
