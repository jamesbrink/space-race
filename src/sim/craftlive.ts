/**
 * A spacecraft in orbit flown live: its own engines lit, throttled, cut and lit again by a hand, a tick at a time, where the
 * coast (orbital.ts `flyOrbit`) flies the record's burns whole. The spacecraft's engines are the plan's first craft's that
 * are not the launch vehicle's stages (staged.ts `stagesOf`): a service propulsion engine, a Gemini's manoeuvring thrusters
 * and retrorockets, a Vostok's or a Soyuz's braking engine, whatever the plan carries. Nothing here knows a flight.
 *
 * Forces. The coast's: gravity as the plan names it (core/gravity.ts `fieldFor`, about the Moon inside its sphere), the air
 * of the coast on the joined ship (orbital.ts `shipPush`, the same drag), and the engines' thrust along the long axis as the
 * controls give it (`CraftControls.axis`: the attitude as the deck has it, its own rigid body turned by its jets where the
 * plan gives them as hardware, sim/attitude.ts, or a hand's turn at its rate where not), or against it for one that pushes
 * toward the tail (`EngineDef.astern`). Guidance flies a burn by `guide` (sim/steering.ts): its line is what the deck points
 * the axis along, and its cut an instant the engine stops at within its tick (`CraftControls.stop`).
 *
 * The engine. A liquid engine burns at its rated vacuum thrust times the lever's share (sim/lever.ts `handRange`: its own
 * range, or the game's where it ran at one thrust, said so on the lever); under its least the lever cuts it, and raised to
 * it again lights it once more where it has a start left. Where it draws on a tank of the plan's and has a specific impulse
 * its flow is its thrust over its exhaust's speed (g0 Isp), taken from the ship's mass, so the impulse a burn gives is the
 * rocket equation's on what it drew (`CraftBurn.sensed`); it stops when the tank is empty. One with no tank in the plan
 * draws nothing (its thrust over the mass as it stands: the coast's moves are flown so, orbital.ts `movesOf`), and one whose
 * integrator shut it down (`EngineDef.deltaV`) is cut by it when it has sensed that impulse. It starts as often as
 * `EngineDef.starts` says, then no more. A solid, once lit, burns until it is spent (`EngineDef.burn`), no lever on it,
 * pushing the record's impulse (`EngineDef.flown`) evenly over that time as the coast flies it, or its chambers' thrust over
 * the mass where the plan gives none.
 *
 * Time: ticks of sim/vehicle.ts's TICK from the instant it began, so a run flown again comes to the same tick; an engine
 * stops at its own instant within a tick (dry, its integrator, spent), and the tick is flown in two pieces either side.
 */
import { clamp } from '../util/math.ts';
import { EARTH, G0, MOON } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, dot, length, scale, sub, type Vec3 } from '../world/frames.ts';
import { gravity, type State } from '../world/orbit.ts';
import { airAt } from './air.ts';
import { centreAt, fieldFor, recentred, stepAbout, stepIn } from './core/gravity.ts';
import { type HandRange, handRange } from './lever.ts';
import { shipPush, solarAt } from './orbital.ts';
import type { EngineDef, FlightPlan, Pursuit } from './plan.ts';
import { type BurnContext, solveBurn, type Target } from './pursuit.ts';
import { externalDv, localVertical, Steering } from './steering.ts';
import { stagesOf } from './staged.ts';
import type { Said } from './stagedlive.ts';
import { TICK } from './vehicle.ts';

/** One of the spacecraft's engines as it is flown (`craftVehicle`): every chamber of it together. */
export interface CraftEngine {
  id: string;
  label: string;
  def: EngineDef;
  /** Rated vacuum thrust of all its chambers, N. */
  thrust: number;
  /** Propellant drawn at rated thrust, kg/s, from its tank (`tank`): 0 where it draws on none in the plan or has no specific impulse. */
  flow: number;
  /** Its exhaust's speed, g0 Isp, m/s: 0 where it has no specific impulse. */
  exhaust: number;
  /** The tank it draws on, by the plan's id (the first of `EngineDef.tanks`, as the coast reads it), or null. */
  tank: string | null;
  /** The hand's lever on it (sim/lever.ts): null for a solid. */
  range: HandRange | null;
  /** The impulse an integrator cuts it at, m/s, where it is flown with one (`craftVehicle`'s `cutAt`), or null: it burns until it is cut or dry. */
  integrator: number | null;
}

/** An engine as it stands in a state. */
export interface EngineState {
  /** When it was lit, s, while it burns; Infinity while it does not. */
  lit: number;
  /** Starts left. */
  starts: number;
  /** The impulse it has given since it was lit, m/s. */
  sensed: number;
  /** Cut by the lever (taken under its least) and not since lit: raised to its least again, it is lit once more. */
  levered?: true;
}

/** A burn made: its engine, when it was lit and stopped (Infinity while it burns), why it stopped, and what it gave. */
export interface CraftBurn {
  engine: string;
  on: number;
  off: number;
  /** The ship's mass as it lit, kg, and the propellant it has drawn, kg. */
  mass: number;
  fuel: number;
  /** The impulse sensed, m/s, and as a vector in the flight's frame (its sum along the line the thrust pushed at each tick). */
  sensed: number;
  push: Vec3;
  /** Why it stopped: a hand's cut, the lever under its least, its tank empty, its integrator, a solid spent, guidance's cut. */
  ended?: 'cut' | 'lever' | 'dry' | 'integrator' | 'spent' | 'guidance';
}

export interface CraftState {
  /** Seconds from liftoff; the ticks flown since the craft was taken up (`start`), the tick's instant being `t0 + ticks * TICK`. */
  t: number;
  t0: number;
  ticks: number;
  /** The coast's point (orbital.ts `flyOrbit`'s state) in the flight's frame, m and m/s; the ship's mass, kg. */
  r: Vec3;
  v: Vec3;
  mass: number;
  /** The long axis the engines last pushed along (a unit vector in the flight's frame). */
  axis: Vec3;
  /** The lever, of rated thrust: the one lever, given to every liquid engine lit. */
  lever: number;
  engines: Readonly<Record<string, EngineState>>;
  /** Propellant left in each tank an engine draws on, kg. */
  tanks: Readonly<Record<string, number>>;
  burns: readonly CraftBurn[];
  /** What the hardware made of what a hand asked, in order (the deck says each once). */
  said: readonly Said[];
}

export interface CraftControls {
  /** The long axis now, a unit vector in the flight's frame. */
  axis: Vec3;
  /** Engines to light at this tick, and to cut, by id. */
  light?: readonly string[];
  cut?: readonly string[];
  /** The lever, of rated thrust (left out: as it was). */
  lever?: number;
  /** Instants, s from liftoff, at which guidance cuts an engine burning, by id (sim/steering.ts `Steering.cutAt`): it stops there within the tick. */
  stop?: Readonly<Record<string, number>>;
}

/** Where the craft is taken up: the coast's state, the ship's mass, what is left in its tanks and of each engine's starts. */
export interface CraftFrom {
  t: number;
  r: Vec3;
  v: Vec3;
  mass: number;
  tanks: Readonly<Record<string, number>>;
  starts: Readonly<Record<string, number>>;
  axis: Vec3;
}

export interface CraftVehicle {
  readonly plan: FlightPlan;
  readonly engines: readonly CraftEngine[];
  start(from: CraftFrom): CraftState;
  tick(state: CraftState, controls: CraftControls): CraftState;
  /** Whether an engine burns now. */
  burning(state: CraftState, id: string): boolean;
  /** Each engine's thrust now, N (a solid's: what pushes its impulse over its burn at the mass now). */
  thrustOf(state: CraftState, id: string): number;
  /** The share of rated thrust a liquid engine is held to now by the lever (1 for a solid). */
  share(state: CraftState, id: string): number;
  /**
   * Guidance's steering for engine `id` lit now (sim/steering.ts, as the computer flew a burn it had been given): solved on
   * the state as it stands for what the burn is for (`aim.toward`, sim/pursuit.ts `solveBurn`, on this craft's own forces)
   * where that can be solved, else External ΔV of the impulse `aim.line` times `aim.size` (m/s, in the flight's frame),
   * laid in the local vertical now. Its thrust at each tick is the line to point the axis along, and its `cutAt` the
   * instant to cut. Null for a solid, which no guidance cuts.
   */
  guide(state: CraftState, id: string, aim: { line: Vec3; size: number; toward?: Pursuit; target?: Target }): Steering | null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** The burn of engine `id` still open (lit and not stopped), by its index in `burns`, or -1. */
const openOf = (burns: readonly CraftBurn[], id: string): number => {
  for (let i = burns.length - 1; i >= 0; i--) if (burns[i]!.engine === id && !Number.isFinite(burns[i]!.off)) return i;
  return -1;
};

/** The spacecraft's engines of `plan` (every engine of its first craft that is not a stage's), or those of `ids`. */
export function craftEngines(plan: FlightPlan, ids?: readonly string[], cutAt: Readonly<Record<string, number>> = {}): CraftEngine[] {
  const c = plan.craft[0]!;
  const staged = new Set(stagesOf(plan).map((s) => s.engine.id));
  return c.engines
    .filter((e) => (ids ? ids.includes(e.id) : !staged.has(e.id)))
    .map((e) => {
      const thrust = e.count * e.thrust.vacuum.value;
      const exhaust = e.isp ? G0 * e.isp.vacuum.value : 0;
      const tank = e.tanks[0] && c.tanks.some((t) => t.id === e.tanks[0]) ? e.tanks[0]! : null;
      return {
        id: e.id,
        label: e.label,
        def: e,
        thrust,
        flow: tank && exhaust > 0 ? thrust / exhaust : 0,
        exhaust,
        tank,
        range: handRange(e),
        integrator: cutAt[e.id] ?? null,
      };
    });
}

/**
 * The craft of `plan` in `frame`. `engines`: its engines that can be lit here, by id (all of the spacecraft's if left out);
 * `cutAt`: for each engine flown with an integrator that shuts it down (a braking engine's, `EngineDef.deltaV`), the impulse
 * it is set to, m/s. A manoeuvre by hand has none: the hand cuts it. `radius`: the ball the orbit's heights are over, m
 * (orbital.ts `heightsBall`), for a burn guidance solves for an orbit (`guide`); the equatorial radius if left out.
 */
export function craftVehicle(
  plan: FlightPlan,
  frame: EarthFrame,
  seaLevel: number,
  options: { engines?: readonly string[]; cutAt?: Readonly<Record<string, number>>; radius?: number } = {},
): CraftVehicle {
  const all = craftEngines(plan, options.engines, options.cutAt);
  const byId = new Map(all.map((e) => [e.id, e]));
  const field = fieldFor(plan.gravity, frame);
  const earthSide = field.about ? field.about('earth') : field;
  const advance = (s: State, at: number, h: number, f: (s: State, at: number) => Vec3): State =>
    field.about ? stepAbout(field, centreAt(earthSide, s.r, at), s, at, h, f) : stepIn(field, s, at, h, f);
  const solid = (e: CraftEngine) => e.def.kind === 'solid';
  /** A solid's push over the mass, m/s^2: the record's impulse over its burn, or its chambers' thrust over `mass`. */
  const solidAccel = (e: CraftEngine, mass: number): number =>
    e.def.flown && e.def.burn ? e.def.flown.value / e.def.burn.value : e.thrust / mass;
  const burnOf = (e: CraftEngine) => e.def.burn?.value ?? 0;
  const shareOf = (s: CraftState, e: CraftEngine): number => (e.range ? clamp(s.lever, e.range.least, e.range.most) : 1);
  const burning = (s: CraftState, id: string) => Number.isFinite(s.engines[id]?.lit ?? Infinity);
  const sign = (e: CraftEngine) => (e.def.astern ? -1 : 1);

  const start = (from: CraftFrom): CraftState => ({
    t: from.t,
    t0: from.t,
    ticks: 0,
    r: from.r,
    v: from.v,
    mass: from.mass,
    axis: from.axis,
    lever: 1,
    engines: Object.fromEntries(all.map((e) => [e.id, { lit: Infinity, starts: from.starts[e.id] ?? e.def.starts.count, sensed: 0 }])),
    tanks: Object.fromEntries(all.flatMap((e) => (e.tank ? [[e.tank, from.tanks[e.tank] ?? 0]] : []))),
    burns: [],
    said: [],
  });

  /** An engine stopped at `at`, and why: its burn closed. */
  const stopped = (s: CraftState, e: CraftEngine, at: number, why: NonNullable<CraftBurn['ended']>): CraftState => {
    const k = openOf(s.burns, e.id);
    const burns = k < 0 ? s.burns : s.burns.map((b, i) => (i === k ? { ...b, off: at, ended: why } : b));
    const { levered: _, ...was } = s.engines[e.id]!;
    const now: EngineState = why === 'lever' ? { ...was, lit: Infinity, levered: true } : { ...was, lit: Infinity };
    return { ...s, engines: { ...s.engines, [e.id]: now }, burns };
  };

  /** What the controls ask at this instant: the lever, the cuts, the lightings, each through the hardware's rules. */
  const command = (s0: CraftState, c: CraftControls): CraftState => {
    let s: CraftState = { ...s0, axis: c.axis };
    const said = [...s.said];
    const say = (title: string, text: string) => said.push({ t: s.t, title, text });
    const light = (e: CraftEngine, byLever = false) => {
      const was = s.engines[e.id]!;
      if (burning(s, e.id)) return;
      if (was.starts <= 0) {
        say(
          'Not lit',
          `${cap(e.label)} has been started ${e.def.starts.count === 1 ? 'once' : `${e.def.starts.count} times`}, as often as it can be${e.def.starts.source ? `: ${e.def.starts.source}` : ''}`,
        );
        return;
      }
      if (e.def.starts.ground) return void say('Not lit', `${cap(e.label)} can be lit only on the ground`);
      if (e.tank && (s.tanks[e.tank] ?? 0) <= 0) return void say('Not lit', `${cap(e.label)}: its tanks are empty`);
      const { levered: _, ...rest } = was;
      s = {
        ...s,
        engines: { ...s.engines, [e.id]: { ...rest, lit: s.t, starts: was.starts - 1, sensed: 0 } },
        burns: [...s.burns, { engine: e.id, on: s.t, off: Infinity, mass: s.mass, fuel: 0, sensed: 0, push: [0, 0, 0] }],
      };
      if (byLever)
        say('Lit again', `${cap(e.label)} lit again by the lever: ${was.starts - 1} start${was.starts - 1 === 1 ? '' : 's'} left`);
    };
    if (c.lever !== undefined && Number.isFinite(c.lever)) {
      const from = s.lever;
      s = { ...s, lever: Math.max(0, c.lever) };
      for (const e of all) {
        if (!e.range) continue;
        if (burning(s, e.id) && s.lever < e.range.least - 1e-9) {
          s = stopped(s, e, s.t, 'lever');
          say('Cut', `${cap(e.label)} cut: the lever under its least, ${Math.round(e.range.least * 100)} per cent`);
        } else if (s.engines[e.id]!.levered && from < e.range.least - 1e-9 && s.lever >= e.range.least - 1e-9) light(e, true);
      }
    }
    for (const id of c.cut ?? []) {
      const e = byId.get(id);
      if (!e || !burning(s, id)) continue;
      if (solid(e)) {
        say('Not cut', `${cap(e.label)}: a solid cannot be shut down; it burns until it is spent`);
        continue;
      }
      s = stopped(s, e, s.t, 'cut');
    }
    for (const id of c.light ?? []) {
      const e = byId.get(id);
      if (e) light(e);
    }
    return said.length === s.said.length ? s : { ...s, said };
  };

  type Stop = 'dry' | 'integrator' | 'spent' | 'guidance';
  /** How long from `s` each burning engine has before it stops by itself (dry, its integrator, spent) or guidance cuts it (`stops`), s. */
  const untilStop = (s: CraftState, stops: Readonly<Record<string, number>> = {}): { e: CraftEngine; at: number; why: Stop }[] => {
    const on = all.filter((e) => burning(s, e.id));
    const out: { e: CraftEngine; at: number; why: Stop }[] = [];
    for (const e of on) if (!solid(e) && stops[e.id] !== undefined) out.push({ e, at: Math.max(0, stops[e.id]! - s.t), why: 'guidance' });
    // (what every engine lit draws: on each tank, and in all, kg/s)
    const draws = new Map<string, number>();
    let flow = 0;
    for (const e of on) {
      const f = e.flow * shareOf(s, e);
      flow += f;
      if (e.tank) draws.set(e.tank, (draws.get(e.tank) ?? 0) + f);
    }
    for (const e of on) {
      const st = s.engines[e.id]!;
      if (solid(e)) {
        out.push({ e, at: st.lit + burnOf(e) - s.t, why: 'spent' });
        continue;
      }
      if (e.tank && (draws.get(e.tank) ?? 0) > 0) out.push({ e, at: (s.tanks[e.tank] ?? 0) / draws.get(e.tank)!, why: 'dry' });
      if (e.integrator !== null) {
        const left = e.integrator - st.sensed;
        const f = e.thrust * shareOf(s, e);
        // (the mass at which what it gives reaches what is left: m_b = m_a exp(-left flow / F), drawn at `flow`)
        const at = flow > 0 ? (s.mass * -Math.expm1((-left * flow) / f)) / flow : (left * s.mass) / f;
        out.push({ e, at: Math.max(0, at), why: 'integrator' });
      }
    }
    return out;
  };

  /** Fly `h` seconds from `s` with what burns now held: gravity, the coast's air, the thrust over the falling mass. */
  const fly = (s: CraftState, h: number): CraftState => {
    if (h <= 0) return s;
    const on = all.filter((e) => burning(s, e.id));
    const shares = on.map((e) => shareOf(s, e));
    const flow = on.reduce((sum, e, i) => sum + e.flow * shares[i]!, 0);
    const a = s.t;
    const m0 = s.mass;
    const massAt = (at: number) => m0 - flow * (at - a);
    const axis = s.axis;
    const thrustAt = (at: number): Vec3 | null => {
      if (!on.length) return null;
      let k = 0;
      on.forEach((e, i) => {
        k += sign(e) * (solid(e) ? solidAccel(e, m0) : (e.thrust * shares[i]!) / massAt(at));
      });
      return scale(axis, k);
    };
    const push = (q: State, at: number): Vec3 => {
      const air = airAt(frame, q.r, q.v, at, seaLevel);
      return shipPush(plan, a, air.wind, air.altitude, null, solarAt(frame, q.r, at, air.altitude), { push: thrustAt(at) });
    };
    const next = advance({ r: s.r, v: s.v }, a, h, push);
    const m1 = massAt(a + h);
    // what each engine gave: its share of the rocket equation's on what was drawn, or its thrust over the mass
    const given = on.map((e, i) =>
      solid(e) ? solidAccel(e, m0) * h : flow > 0 ? ((e.thrust * shares[i]!) / flow) * Math.log(m0 / m1) : (e.thrust * shares[i]! * h) / m0,
    );
    const engines = { ...s.engines };
    const tanks = { ...s.tanks };
    const burns = [...s.burns];
    on.forEach((e, i) => {
      const st = engines[e.id]!;
      engines[e.id] = { ...st, sensed: st.sensed + given[i]! };
      const drawn = e.flow * shares[i]! * h;
      if (e.tank) tanks[e.tank] = Math.max(0, (tanks[e.tank] ?? 0) - drawn);
      const k = openOf(burns, e.id);
      if (k >= 0) {
        const b = burns[k]!;
        burns[k] = {
          ...b,
          fuel: b.fuel + drawn,
          sensed: b.sensed + given[i]!,
          push: add(b.push, scale(axis, sign(e) * given[i]!)),
        };
      }
    });
    return { ...s, t: a + h, r: next.r, v: next.v, mass: m1, engines, tanks, burns };
  };

  const tick = (state: CraftState, controls: CraftControls): CraftState => {
    let s = command(state, controls);
    const ticks = s.ticks + 1;
    const end = s.t0 + ticks * TICK;
    // in pieces: to each instant an engine stops by itself (or guidance cuts it) within the tick, and on to the tick's end
    for (let n = 0; n < 8 && s.t < end; n++) {
      const left = end - s.t;
      const stops = untilStop(s, controls.stop).filter((x) => x.at < left);
      const first = stops.reduce((m, x) => Math.min(m, x.at), Infinity);
      if (!Number.isFinite(first)) {
        s = fly(s, left);
        break;
      }
      s = fly(s, first);
      for (const x of stops.filter((y) => y.at <= first + 1e-12)) {
        s = stopped(s, x.e, s.t, x.why);
        const said = {
          dry: `${cap(x.e.label)} stopped: its tanks are empty`,
          integrator: `${cap(x.e.label)} cut by its integrator at the ${x.e.integrator} m/s it was set to`,
          spent: `${cap(x.e.label)} burned out`,
          guidance: `${cap(x.e.label)} cut by guidance: the velocity to be gained is gained`,
        }[x.why];
        s = { ...s, said: [...s.said, { t: s.t, title: x.why === 'spent' ? 'Burned out' : 'Shut down', text: said }] };
      }
    }
    return { ...s, t: end, ticks };
  };

  /** A state about the body it is flown about at an instant, with that body's GM and the radius heights about it are above. */
  const aboutOf = (s: State, at: number) =>
    field.about && centreAt(earthSide, s.r, at) === 'moon'
      ? { body: 'moon' as const, s: recentred(earthSide, s, at, 'moon'), gm: MOON.gm.value, radius: MOON.equatorialRadius.value }
      : { body: 'earth' as const, s, gm: EARTH.gm.value, radius: options.radius ?? EARTH.equatorialRadius.value };
  const guide = (s: CraftState, id: string, aim: { line: Vec3; size: number; toward?: Pursuit; target?: Target }): Steering | null => {
    const e = byId.get(id);
    if (!e || solid(e) || !(aim.size > 0)) return null;
    const [t0, m0] = [s.t, s.mass];
    const thrust = e.thrust * shareOf(s, e);
    const flow = e.flow * shareOf(s, e);
    // (the thrust's acceleration as its propellant goes, from the lighting: as the coast's own steered burns have it)
    const accel = (at: number): number => thrust / Math.max(1e-9, m0 - flow * Math.max(0, at - t0));
    const exhaust = e.exhaust > 0 ? e.exhaust : undefined;
    const here: State = { r: s.r, v: s.v };
    const centred = (x: State, at: number): State => aboutOf(x, at).s;
    if (aim.toward) {
      // (the craft's own forces flown ahead, a step at a time: what the burn is solved on, as the coast solves its own)
      const ctx: BurnContext = {
        fly: (x, from, to, push) =>
          advance(x, from, to - from, (q, at) => {
            const air = airAt(frame, q.r, q.v, at, seaLevel);
            return shipPush(plan, from, air.wind, air.altitude, null, solarAt(frame, q.r, at, air.altitude), push ? { push } : undefined);
          }),
        gravity: (x, at) => {
          const c = aboutOf(x, at);
          return (field.about ? field.about(c.body) : field).at(c.s.r, at);
        },
        about: aboutOf,
        height: (x, at) => frame.place(x.r, at).height - seaLevel,
        ...(field.moon ? { moon: field.moon } : {}),
        oblate: (r) => sub(gravity(r), scale(r, -EARTH.gm.value / length(r) ** 3)),
        accel,
        ...(exhaust ? { exhaust } : {}),
        ...(aim.target ? { target: aim.target } : {}),
      };
      try {
        const solved = solveBurn(aim.toward, ctx, here, t0);
        if (solved) return solved.steering();
      } catch {
        // (what the burn is for cannot be solved from here: it is flown on the record's impulse, below)
      }
    }
    const lv = localVertical(centred(here, t0));
    const impulse = scale(aim.line, aim.size);
    return new Steering(
      { external: externalDv(centred(here, t0), [dot(impulse, lv[0]), dot(impulse, lv[1]), dot(impulse, lv[2])], accel(t0)) },
      t0,
      here,
      accel,
      exhaust,
      centred,
    );
  };

  return {
    plan,
    engines: all,
    start,
    tick,
    guide,
    burning,
    thrustOf: (s, id) => {
      const e = byId.get(id);
      if (!e || !burning(s, id)) return 0;
      return solid(e) ? solidAccel(e, s.mass) * s.mass : e.thrust * shareOf(s, e);
    },
    share: (s, id) => {
      const e = byId.get(id);
      return e ? shareOf(s, e) : 1;
    },
  };
}
