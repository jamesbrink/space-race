/**
 * A run's craft as the joints that hold make them (simulator.md, "Several craft in one run"): a craft is a connected set
 * of a plan's bodies. Two bodies are apart once any joint between them has parted, which is to say once a joint has
 * parted that lets the one go and not the other (`JointDef.gone`, the side that leaves); the bodies of each of the
 * plan's craft (`FlightPlan.craft`: what leaves the pad, then any it meets in flight) are apart from the others' from
 * the start; and a joint made in flight (`JointDef.formed`) joins the craft its two ports are on while it holds, from
 * its capture to its parting. A craft is named by the last of its bodies in the plan's order (what carries its crew, of
 * the stack that leaves the pad); any body of it finds it (`craftHolding`).
 *
 * Nothing here is physics: what parts and what is captured, and when, is the machine's (sim/craft.ts), which the
 * simulators tell as the physics lets it (a joint pressed on, a probe's capture). This only reads it.
 */
import type { CraftState } from './craft.ts';
import type { Action, BodyDef, EventDef, FlightPlan, JointDef } from './plan.ts';

/** One craft of a run: its id (the last of its bodies in the plan's order) and its bodies, in the plan's order. */
export interface Piece {
  id: string;
  bodies: readonly string[];
}

/** Every body of a plan, in its order: the first craft's, then each other's. */
export const bodiesOf = (plan: FlightPlan): BodyDef[] => plan.craft.flatMap((c) => c.bodies);

/** Every joint of a plan. */
const jointsOf = (plan: FlightPlan): JointDef[] => plan.craft.flatMap((c) => c.joints);

/** Whether a joint holds at `t`: one made in flight from its capture to its parting, any other until it parts. */
export function holdsAt(j: JointDef, s: CraftState, t: number): boolean {
  const state = s.joints[j.id];
  if (!state) return false;
  const parted = Number.isFinite(state.gone) && state.gone <= t;
  if (j.formed) return state.made !== undefined && Number.isFinite(state.made) && state.made <= t && !parted;
  return !parted;
}

const cache = new WeakMap<CraftState, Map<number, Piece[]>>();

/** The craft at `t` (Infinity: as the state now stands), in the order of their first bodies. */
export function componentsOf(plan: FlightPlan, s: CraftState, t = Infinity): Piece[] {
  let known = cache.get(s);
  if (!known) cache.set(s, (known = new Map()));
  const had = known.get(t);
  if (had) return had;
  const bodies = bodiesOf(plan);
  const index = new Map(bodies.map((b, i) => [b.id, i]));
  // (each body's mark: which of the plan's craft it is of, then for each joint that has parted which side of it it is on)
  const owner = new Map(plan.craft.flatMap((c, i) => c.bodies.map((b) => [b.id, i] as const)));
  const parted = jointsOf(plan).filter((j) => !j.formed && !holdsAt(j, s, t));
  const mark = (id: string): string => [owner.get(id), ...parted.map((j) => (j.gone.includes(id) ? 1 : 0))].join(',');
  const root = bodies.map((_, i) => i);
  const find = (i: number): number => {
    while (root[i] !== i) i = root[i] = root[root[i]!]!;
    return i;
  };
  const join = (a: number, b: number) => {
    const [x, y] = [find(a), find(b)];
    if (x !== y) root[Math.max(x, y)] = Math.min(x, y);
  };
  const first = new Map<string, number>();
  bodies.forEach((b, i) => {
    const m = mark(b.id);
    const was = first.get(m);
    if (was === undefined) first.set(m, i);
    else join(was, i);
  });
  for (const j of jointsOf(plan)) {
    if (!j.formed || !holdsAt(j, s, t)) continue;
    const [a, b] = j.formed.ports.map((p) => index.get(p.body));
    if (a !== undefined && b !== undefined) join(a, b);
  }
  const groups = new Map<number, string[]>();
  bodies.forEach((b, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), b.id]);
  });
  const out = [...groups.values()].map((ids) => ({ id: ids[ids.length - 1]!, bodies: ids }));
  known.set(t, out);
  return out;
}

/** The craft that holds a body at `t`. */
export function craftHolding(plan: FlightPlan, s: CraftState, body: string, t = Infinity): Piece | undefined {
  return componentsOf(plan, s, t).find((p) => p.bodies.includes(body));
}

/** Whether two bodies are of one craft at `t`. */
export function together(plan: FlightPlan, s: CraftState, a: string, b: string, t = Infinity): boolean {
  return craftHolding(plan, s, a, t)?.bodies.includes(b) ?? false;
}

/** The plan's commander: the first crew member named, reading its bodies from the last back (`BodyDef.crew`). */
export function commanderOf(plan: FlightPlan): string | undefined {
  const bodies = bodiesOf(plan);
  for (let i = bodies.length - 1; i >= 0; i--) if (bodies[i]!.crew?.length) return bodies[i]!.crew![0];
  return undefined;
}

/**
 * The craft followed at `t`: the one the commander is in (the player goes with them), or with no crew named the one that
 * holds the last body of what left the pad.
 */
export function followedOf(plan: FlightPlan, s: CraftState, t = Infinity): Piece {
  const commander = commanderOf(plan);
  const body = (commander && s.crew?.[commander]) || plan.craft[0]!.bodies.at(-1)!.id;
  return craftHolding(plan, s, body, t)!;
}

/** The body an action is done on: what its hardware is on, or the crew member's body; nothing for one that names none. */
export function bodyActedOn(plan: FlightPlan, s: CraftState, a: Action): string | undefined {
  const all = plan.craft;
  const engine = (id: string) => all.flatMap((c) => c.engines).find((e) => e.id === id)?.body;
  if ('ignite' in a) return engine(a.ignite);
  if ('cut' in a) return engine(a.cut);
  if ('throttle' in a) return engine(a.throttle);
  if ('deploy' in a || 'release' in a) {
    const id = 'deploy' in a ? a.deploy : a.release;
    return all.flatMap((c) => c.chutes).find((ch) => ch.id === id)?.body;
  }
  if ('separate' in a || 'dock' in a) {
    const j = jointsOf(plan).find((x) => x.id === ('separate' in a ? a.separate : a.dock));
    if (!j) return undefined;
    if (j.formed)
      return 'dock' in a && j.formed.approach
        ? all.flatMap((c) => c.thrusters).find((x) => x.id === j.formed!.approach!.by)?.body
        : j.formed.ports[0].body;
    return j.gone[0];
  }
  if ('board' in a) return s.crew?.[a.board];
  return undefined;
}

/**
 * The craft that does an event at `t`: the one holding the hardware its first action that names any is on (an engine's
 * body, a joint's, a parachute's, a crew member's), or for one that names none (an attitude, an arming) the craft its
 * `craft` names, or the commander's.
 */
export function holderOf(plan: FlightPlan, s: CraftState, e: EventDef, t = Infinity): Piece {
  for (const a of e.do) {
    const body = bodyActedOn(plan, s, a);
    if (body !== undefined) {
      const p = craftHolding(plan, s, body, t);
      if (p) return p;
    }
  }
  return (e.craft && craftHolding(plan, s, e.craft, t)) || followedOf(plan, s, t);
}

/**
 * The machine's state as one craft has it (each craft its own `CraftState`): its own bodies aboard, every other body left
 * at `since` (when this craft came to be what it is) or when it left before that. The engines, joints, parachutes,
 * crew and events are the hardware's and the record's, which no two craft share, and are as the machine has them.
 */
export function viewOf(s: CraftState, piece: Piece, since: number, attitude = s.attitude): CraftState {
  const mine = new Set(piece.bodies);
  const bodies: Record<string, number> = {};
  for (const [id, left] of Object.entries(s.bodies))
    bodies[id] = mine.has(id) ? Infinity : Number.isFinite(left) ? Math.min(left, since) : since;
  return { ...s, bodies, attitude };
}
