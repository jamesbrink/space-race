/**
 * The one machine every craft is flown by: what is lit, what is let go and what has gone, what parachute is out, which
 * events have happened and which are armed, and the attitude held, as a plan (sim/plan.ts) says them. It knows the
 * hardware's rules that are the plan's own (an engine starts so many times, some only on the ground; a solid cannot be
 * cut; a joint held by another cannot part; what is gone cannot act) and nothing of the physics: whether what has been
 * let go is still pressed on, how the air pulls a canopy, when a tank runs dry, is the simulator's, which asks this to
 * `part` a joint once its physics lets it go.
 *
 * A state is never changed in place: each act gives a new one, so a simulator's states can be kept and compared.
 * What the machine refused, and why, comes back as `Refusal`s for the simulator to say in its own words.
 */
import { together } from './components.ts';
import { handRange } from './lever.ts';
import type { Action, EventDef, FlightPlan, JointDef, Trigger } from './plan.ts';

export interface EngineState {
  /** Lit at, s (Infinity: not lit); out at, s (Infinity: burning, or never lit); how often it has been started; its setting. */
  lit: number;
  out: number;
  starts: number;
  throttle: number;
}

export interface CraftState {
  engines: Readonly<Record<string, EngineState>>;
  /**
   * Each joint: when it was let go (asked), and when it parted (Infinity: holding). A joint made in flight
   * (`JointDef.formed`) has `made` too, when it was captured (Infinity: not yet, and so not holding).
   */
  joints: Readonly<Record<string, { loose: number; gone: number; made?: number }>>;
  /** Each body: when it left (Infinity: aboard). */
  bodies: Readonly<Record<string, number>>;
  /** Each parachute: when it came out and when it was let go (Infinity: not yet). */
  chutes: Readonly<Record<string, { out: number; off: number }>>;
  /** Each event that has happened, and when; each armed one, and when it was armed. */
  fired: Readonly<Record<string, number>>;
  armed: Readonly<Record<string, number>>;
  /** The attitude held, by id. */
  attitude: string;
  /** Where each crew member is, by the body they are in (`BodyDef.crew`, `Action.board`): left out of a plan with no crew named. */
  crew?: Readonly<Record<string, string>>;
  /** Each formed joint the record's crew are flying the approach to (`Action.dock`), and since when. */
  docking?: Readonly<Record<string, number>>;
}

/** What the machine would not do, and why: the simulator says it. */
export type Refusal =
  | { action: Action; why: 'gone' }
  | { action: Action; why: 'starts'; count: number }
  | { action: Action; why: 'ground' }
  | { action: Action; why: 'solid' }
  /** The same chambers are burning already, as another of the plan's engines (`EngineDef.again`). */
  | { action: Action; why: 'burning'; engine: string }
  /** A crew member asked to go to a body of another craft. */
  | { action: Action; why: 'apart' };

/** What a trigger reads of the flight now. */
export interface Sense {
  t: number;
  /** Height above the sea, m, and whether it is coming down. */
  height: number;
  falling: boolean;
  /** Speed in the frame that does not turn, m/s; an engine's integrator's apparent velocity since it lit, m/s. */
  speed: number;
  apparent: (engine: string) => number;
  /** What an accelerometer reads, g. */
  g: number;
  /** How far the orbit it is on is short of the record's (world/meanelements.ts `shortOfPublished`: nothing or less, reached). Left out: never reached. */
  short?: number;
  /** Still standing on the pad. */
  held: boolean;
  /** The hands' commands at this instant. */
  commands?: ReadonlySet<string>;
}

const ON = 1e-9;

/**
 * When a body of a craft the plan meets in flight (`FlightPlan.craft` after the first) left the one that leaves the pad:
 * before anything, for it was never aboard. Finite, so `aboard` says so.
 */
export const APART = Number.MIN_SAFE_INTEGER;

/**
 * A craft at the pad: nothing lit, everything aboard, the plan's first attitude held. The hardware of the craft the plan
 * meets in flight is in it too, apart from the first craft from the start; a joint made in flight is not yet made; the
 * crew are where the plan seats them.
 */
export function startCraft(plan: FlightPlan): CraftState {
  const all = plan.craft;
  const crew = all.flatMap((c) => c.bodies.flatMap((b) => (b.crew ?? []).map((m) => [m, b.id] as const)));
  return {
    engines: Object.fromEntries(all.flatMap((c) => c.engines.map((e) => [e.id, { lit: Infinity, out: Infinity, starts: 0, throttle: 1 }]))),
    joints: Object.fromEntries(
      all.flatMap((c) =>
        c.joints.map((j) => [j.id, j.formed ? { loose: Infinity, gone: Infinity, made: Infinity } : { loose: Infinity, gone: Infinity }]),
      ),
    ),
    bodies: Object.fromEntries(all.flatMap((c, i) => c.bodies.map((b) => [b.id, i ? APART : Infinity]))),
    chutes: Object.fromEntries(all.flatMap((c) => c.chutes.map((ch) => [ch.id, { out: Infinity, off: Infinity }]))),
    fired: {},
    armed: {},
    attitude: plan.attitude[0]?.id ?? '',
    ...(crew.length ? { crew: Object.fromEntries(crew) } : {}),
  };
}

/** Look-ups by id into a plan's craft, made once. */
export function lookups(plan: FlightPlan) {
  const all = plan.craft;
  return {
    engine: new Map(all.flatMap((c) => c.engines.map((e) => [e.id, e]))),
    joint: new Map(all.flatMap((c) => c.joints.map((j) => [j.id, j]))),
    chute: new Map(all.flatMap((c) => c.chutes.map((ch) => [ch.id, ch]))),
    event: new Map(plan.events.map((e) => [e.id, e])),
  };
}
const cache = new WeakMap<FlightPlan, ReturnType<typeof lookups>>();
const look = (plan: FlightPlan) => {
  let l = cache.get(plan);
  if (!l) cache.set(plan, (l = lookups(plan)));
  return l;
};

/** Whether a body is aboard at `t`. */
export const aboard = (s: CraftState, body: string, t = Infinity): boolean => {
  const gone = s.bodies[body] ?? Infinity;
  return !Number.isFinite(gone) || gone > t;
};

/** Whether a body has left (one a plan does not have, `undefined`, never has). */
export const hasLeft = (s: CraftState, body: string | undefined): boolean => body !== undefined && !aboard(s, body);

/** Whether an engine is lit and not out at `t` (its tank running dry is the simulator's to say). */
export const lit = (s: CraftState, engine: string, t: number): boolean => {
  const e = s.engines[engine];
  return !!e && t >= e.lit && t < e.out;
};

/**
 * Whether a joint let go is held on by another that is still on (a fairing over the spacecraft: `JointDef.holds`).
 * The joint that holds it, or null.
 */
export function heldBy(plan: FlightPlan, s: CraftState, joint: string): JointDef | null {
  for (const j of plan.craft[0]!.joints) if (j.holds?.includes(joint) && !Number.isFinite(s.joints[j.id]?.loose ?? Infinity)) return j;
  return null;
}

/**
 * Do one action at `t`, if the hardware lets it. `held`: the craft still stands on the pad. A joint is only let go
 * here (`loose`): it parts when the simulator calls `part`.
 */
export function act(plan: FlightPlan, s: CraftState, action: Action, t: number, held: boolean): { state: CraftState; refused: Refusal[] } {
  const l = look(plan);
  const refused: Refusal[] = [];
  let state = s;
  if ('ignite' in action) {
    const def = l.engine.get(action.ignite);
    const e = s.engines[action.ignite];
    if (!def || !e) return { state, refused };
    // (the same chambers under another of the plan's names, the one this lights again or the one lighting this again)
    const same = [...(def.again ? [def.again] : []), ...[...l.engine.values()].filter((x) => x.again === def.id).map((x) => x.id)];
    const burningAs = same.find((id) => lit(s, id, t));
    if (!aboard(s, def.body, t)) refused.push({ action, why: 'gone' });
    else if (lit(s, action.ignite, t)) {
      // burning already
    } else if (burningAs) refused.push({ action, why: 'burning', engine: burningAs });
    else if (e.starts >= def.starts.count) refused.push({ action, why: 'starts', count: def.starts.count });
    else if (def.starts.ground && !held && e.starts === 0) refused.push({ action, why: 'ground' });
    else state = { ...s, engines: { ...s.engines, [action.ignite]: { ...e, lit: t, out: Infinity, starts: e.starts + 1 } } };
  } else if ('cut' in action) {
    const def = l.engine.get(action.cut);
    const e = s.engines[action.cut];
    if (!def || !e || !Number.isFinite(e.lit) || e.out !== Infinity) return { state, refused };
    if (def.kind === 'solid') refused.push({ action, why: 'solid' });
    else state = { ...s, engines: { ...s.engines, [action.cut]: { ...e, out: t } } };
  } else if ('throttle' in action) {
    const def = l.engine.get(action.throttle);
    const e = s.engines[action.throttle];
    if (!def || !e) return { state, refused };
    if (def.kind === 'solid') refused.push({ action, why: 'solid' });
    else {
      // (a liquid engine's lever: its own range, or the game's where it ran at one thrust: lever.ts `handRange`)
      const { least, most } = handRange(def) ?? { least: 1, most: 1 };
      state = { ...s, engines: { ...s.engines, [action.throttle]: { ...e, throttle: Math.min(most, Math.max(least, action.to)) } } };
    }
  } else if ('separate' in action) {
    const j = s.joints[action.separate];
    if (!j || Number.isFinite(j.loose)) return { state, refused };
    // (a joint made in flight parts only once it has been made: undocking what never docked does nothing)
    if (j.made !== undefined && !(j.made <= t)) return { state, refused };
    state = { ...s, joints: { ...s.joints, [action.separate]: { ...j, loose: t } } };
  } else if ('deploy' in action) {
    const def = l.chute.get(action.deploy);
    const ch = s.chutes[action.deploy];
    if (!def || !ch || Number.isFinite(ch.out)) return { state, refused };
    if (!aboard(s, def.body, t) && !free(plan, s, def.body)) refused.push({ action, why: 'gone' });
    else {
      const chutes = { ...s.chutes, [action.deploy]: { ...ch, out: t } };
      for (const x of def.instead ?? []) if (chutes[x] && chutes[x]!.off === Infinity) chutes[x] = { ...chutes[x]!, off: t };
      state = { ...s, chutes };
    }
  } else if ('release' in action) {
    const ch = s.chutes[action.release];
    if (!ch || !Number.isFinite(ch.out) || Number.isFinite(ch.off)) return { state, refused };
    state = { ...s, chutes: { ...s.chutes, [action.release]: { ...ch, off: t } } };
  } else if ('attitude' in action) {
    if (s.attitude !== action.attitude) state = { ...s, attitude: action.attitude };
  } else if ('arm' in action) {
    if (s.armed[action.arm] === undefined) state = { ...s, armed: { ...s.armed, [action.arm]: t } };
  } else if ('board' in action) {
    // (through the craft they are in: a member goes only to a body joined to the one they are in, and never out of a craft)
    const at = s.crew?.[action.board];
    if (at === undefined || at === action.to) return { state, refused };
    if (!together(plan, s, at, action.to, t)) refused.push({ action, why: 'apart' });
    else state = { ...s, crew: { ...s.crew, [action.board]: action.to } };
  } else if ('dock' in action) {
    const j = s.joints[action.dock];
    if (!j || j.made === undefined || j.made <= t || s.docking?.[action.dock] !== undefined) return { state, refused };
    state = { ...s, docking: { ...s.docking, [action.dock]: t } };
  }
  return { state, refused };
}

/**
 * A joint made in flight is captured at `t` (`JointDef.formed`): from now it holds, and the craft its two ports are on
 * are one (sim/components.ts). The physics says when (sim/docking.ts `DockPair.attempt`); the machine only records it.
 */
export function form(plan: FlightPlan, s: CraftState, joint: string, t: number): CraftState {
  const def = look(plan).joint.get(joint);
  const j = s.joints[joint];
  if (!def?.formed || !j || j.made === undefined || j.made <= t) return s;
  const docking = { ...s.docking };
  delete docking[joint];
  return { ...s, joints: { ...s.joints, [joint]: { ...j, made: t } }, ...(s.docking ? { docking } : {}) };
}

/**
 * An engine stops by itself at `t`: what it burns is spent, or it has left with what it is on. Not a command, so a solid
 * stops so too; the simulator says when, as it says when a joint is pressed on.
 */
export function burnOut(s: CraftState, engine: string, t: number): CraftState {
  const e = s.engines[engine];
  if (!e || !Number.isFinite(e.lit) || Number.isFinite(e.out)) return s;
  return { ...s, engines: { ...s.engines, [engine]: { ...e, out: t } } };
}

/** A body that has left the craft and flies on by itself (a seat, a pilot): its own parachutes are its own to put out. */
const free = (plan: FlightPlan, s: CraftState, body: string) =>
  plan.craft[0]!.joints.some((j) => j.gone.includes(body) && j.gone.length === 1 && Number.isFinite(s.joints[j.id]?.gone ?? Infinity));

/** A joint parts at `t`: what it lets go that is still aboard leaves. */
export function part(plan: FlightPlan, s: CraftState, joint: string, t: number): CraftState {
  const def = look(plan).joint.get(joint);
  const j = s.joints[joint];
  if (!def || !j || Number.isFinite(j.gone)) return s;
  const bodies = { ...s.bodies };
  for (const b of def.gone) if (!Number.isFinite(bodies[b] ?? Infinity)) bodies[b] = t;
  return { ...s, bodies, joints: { ...s.joints, [joint]: { loose: Math.min(j.loose, t), gone: t } } };
}

/**
 * When an event set off only by others (every trigger `after`) is due, s: so long after the last of them. Null while any
 * of them has not happened, or where it has a trigger of another kind.
 */
export function chainedAt(ev: EventDef, s: CraftState): number | null {
  let at = Number.NEGATIVE_INFINITY;
  for (const w of ev.when) {
    if (!('after' in w)) return null;
    const was = s.fired[w.after];
    if (was === undefined) return null;
    at = Math.max(at, was + (w.wait ?? 0));
  }
  return ev.when.length ? at : null;
}

/** Whether one trigger holds now. */
export function holds(w: Trigger, s: CraftState, x: Sense): boolean {
  if ('time' in w) return x.t >= w.time - ON;
  if ('after' in w) {
    const at = s.fired[w.after];
    return at !== undefined && x.t >= at + (w.wait ?? 0) - ON;
  }
  if ('height' in w) return w.going === 'down' ? x.falling && x.height <= w.height : !x.falling && x.height >= w.height;
  if ('speed' in w) return (w.apparent ? x.apparent(w.apparent) : x.speed) >= w.speed;
  if ('orbit' in w) return x.short !== undefined && x.short <= 0;
  if ('g' in w) return w.going === 'up' ? x.g >= w.g : x.g <= w.g;
  if ('command' in w) return x.commands?.has(w.command) ?? false;
  return x.falling;
}

/** The events due now, in the plan's order: not yet happened, armed where they wait to be, every trigger holding. `only` picks among them (the automatic ones). */
export function due(plan: FlightPlan, s: CraftState, x: Sense, only?: (e: EventDef) => boolean): EventDef[] {
  return plan.events.filter(
    (e) =>
      s.fired[e.id] === undefined &&
      (e.armed !== false || s.armed[e.id] !== undefined) &&
      (!only || only(e)) &&
      e.when.every((w) => holds(w, s, x)),
  );
}

/** An event happens at `t`: each of its actions, in order, and it is marked as happened. */
export function fire(plan: FlightPlan, s: CraftState, event: string, t: number, held: boolean): { state: CraftState; refused: Refusal[] } {
  const e = look(plan).event.get(event);
  if (!e || s.fired[event] !== undefined) return { state: s, refused: [] };
  let state: CraftState = { ...s, fired: { ...s.fired, [event]: t } };
  const refused: Refusal[] = [];
  for (const a of e.do) {
    const r = act(plan, state, a, t, held);
    state = r.state;
    refused.push(...r.refused);
  }
  return { state, refused };
}
