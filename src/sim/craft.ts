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
  /** Each joint: when it was let go (asked), and when it parted (Infinity: holding). */
  joints: Readonly<Record<string, { loose: number; gone: number }>>;
  /** Each body: when it left (Infinity: aboard). */
  bodies: Readonly<Record<string, number>>;
  /** Each parachute: when it came out and when it was let go (Infinity: not yet). */
  chutes: Readonly<Record<string, { out: number; off: number }>>;
  /** Each event that has happened, and when; each armed one, and when it was armed. */
  fired: Readonly<Record<string, number>>;
  armed: Readonly<Record<string, number>>;
  /** The attitude held, by id. */
  attitude: string;
}

/** What the machine would not do, and why: the simulator says it. */
export type Refusal =
  | { action: Action; why: 'gone' }
  | { action: Action; why: 'starts'; count: number }
  | { action: Action; why: 'ground' }
  | { action: Action; why: 'solid' };

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
  /** Still standing on the pad. */
  held: boolean;
  /** The hands' commands at this instant. */
  commands?: ReadonlySet<string>;
}

const ON = 1e-9;

/** A craft at the pad: nothing lit, everything aboard, the plan's first attitude held. */
export function startCraft(plan: FlightPlan): CraftState {
  const c = plan.craft[0]!;
  return {
    engines: Object.fromEntries(c.engines.map((e) => [e.id, { lit: Infinity, out: Infinity, starts: 0, throttle: 1 }])),
    joints: Object.fromEntries(c.joints.map((j) => [j.id, { loose: Infinity, gone: Infinity }])),
    bodies: Object.fromEntries(c.bodies.map((b) => [b.id, Infinity])),
    chutes: Object.fromEntries(c.chutes.map((ch) => [ch.id, { out: Infinity, off: Infinity }])),
    fired: {},
    armed: {},
    attitude: plan.attitude[0]?.id ?? '',
  };
}

/** Look-ups by id into a plan's first craft, made once. */
export function lookups(plan: FlightPlan) {
  const c = plan.craft[0]!;
  return {
    engine: new Map(c.engines.map((e) => [e.id, e])),
    joint: new Map(c.joints.map((j) => [j.id, j])),
    chute: new Map(c.chutes.map((ch) => [ch.id, ch])),
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
    if (!aboard(s, def.body, t)) refused.push({ action, why: 'gone' });
    else if (lit(s, action.ignite, t)) {
      // burning already
    } else if (e.starts >= def.starts.count) refused.push({ action, why: 'starts', count: def.starts.count });
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
      const [least, most] = def.throttle?.range ?? [1, 1];
      state = { ...s, engines: { ...s.engines, [action.throttle]: { ...e, throttle: Math.min(most, Math.max(least, action.to)) } } };
    }
  } else if ('separate' in action) {
    const j = s.joints[action.separate];
    if (!j || Number.isFinite(j.loose)) return { state, refused };
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
  }
  return { state, refused };
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
