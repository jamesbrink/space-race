import type { Action, Flight, ModelDef, Part } from './types';

/**
 * What can be done, on foot, with the thing being looked at. The stage says what that thing is
 * (a Target); this says what to call it and which verbs apply, from the flight's data alone; the
 * wheel (wheel.ts) offers them; the page carries out the one chosen. Nothing here, in the wheel
 * or in the stage knows any one flight: a mission adds a verb by giving a part an `Action`.
 */

/** What the walker is looking at from within arm's reach. Every field is optional because a thing can be several at once: a window of a part. */
export interface Target {
  /** One of the flight's models, by id... */
  model?: string;
  /** ...and the part of it (Part.node), if what was hit belongs to one. */
  node?: string;
  /** It is a pane of glass: there is something to see through it. */
  pane?: boolean;
  /** Something in the flight's surroundings, by its node's name. */
  place?: string;
  /** It is a ladder (a mesh a model marked `climb`). */
  climb?: boolean;
  /**
   * Things that work which the model itself marks (a node with `door` or `lift` in its extras:
   * scenery has no parts to hang an Action on): the actions they amount to, and the node they
   * are found under.
   */
  marked?: { under: string; actions: Action[] };
  /** The names of the nodes what was hit lies under, within its part: an action may be offered only on one of them (Action.on). */
  path?: string[];
}

/** A verb the wheel can offer, and what the page needs to carry it out. */
export type Verb =
  | { do: 'info' }
  | { do: 'look' }
  | { do: 'climb' }
  | { do: 'inspect' }
  | { do: 'become'; model: string }
  | { do: 'action'; model: string; node: string; action: Action; stop?: number | 'call' };

/** How the things that work stand at the moment (the stage knows): what the wheel calls a verb depends on it. */
export interface Workings {
  /** Is this toggle open? (`model` is '' for something in the surroundings.) */
  open(model: string, node: string, action: Action): boolean;
  /** Which of its stops this lift is at or bound for. */
  stop(model: string, node: string, action: Action): number;
  /** Is the walker standing on this lift? */
  riding(model: string, node: string, action: Action): boolean;
}

export interface Choice {
  id: string;
  label: string;
  verb: Verb;
}

/** The same target as before? (A new object is made every frame; only a change is news.) */
export const sameTarget = (a: Target | null, b: Target | null): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.model === b.model &&
    a.node === b.node &&
    a.pane === b.pane &&
    a.place === b.place &&
    a.climb === b.climb &&
    a.path?.join() === b.path?.join() &&
    marks(a) === marks(b));
const marks = (t: Target): string => `${t.marked?.under}:${t.marked?.actions.map((a) => a.id).join()}`;

/** A node is named in one word (Pad6Gantry): spaced out, it is a label. */
export const spaced = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/^(.)(.*)$/, (_, a: string, b: string) => a + b.toLowerCase());

/** The flight's own record of a target: its model and part, where it has them. */
export function lookUp(target: Target, flight: Flight): { model?: ModelDef; part?: Part } {
  const model = flight.models.find((m) => m.id === target.model);
  return { model, part: model?.parts.find((p) => p.node === target.node) };
}

/** What to call a target: its part's name, else its model's, else the place's, else what it plainly is. */
export function nameOf(target: Target, flight: Flight): string {
  const { model, part } = lookUp(target, flight);
  if (target.climb) return 'Ladder';
  return part?.name ?? model?.name ?? (target.place ? spaced(target.place) : target.pane ? 'Window' : '');
}

/**
 * The verbs that apply to a target, in the order the wheel lays them out (the first at the top).
 * `as` is the model being walked as: nobody becomes themselves. `works` is how the doors and
 * lifts stand, which changes what their verbs say. An empty list means there is
 * nothing to do with it, and it is not worth a prompt.
 */
export function choices(target: Target, flight: Flight, as: string, works?: Workings): Choice[] {
  const { model, part } = lookUp(target, flight);
  const out: Choice[] = [];
  if (target.climb) out.push({ id: 'climb', label: 'Climb', verb: { do: 'climb' } });
  if (part) out.push({ id: 'info', label: 'Info', verb: { do: 'info' } });
  if (target.pane) out.push({ id: 'look', label: 'Look inside', verb: { do: 'look' } });
  if (model?.walker && model.id !== as) out.push({ id: 'become', label: `Become ${model.name}`, verb: { do: 'become', model: model.id } });
  const declared = (part?.actions ?? [])
    .filter((a) => !a.on || target.path?.includes(a.on))
    .map((action) => ({ action, node: part!.node }));
  const marked = (target.marked?.actions ?? []).map((action) => ({ action, node: target.marked!.under }));
  for (const { action, node } of [...declared, ...marked]) {
    const verb = { do: 'action', model: model?.id ?? '', node, action } as const;
    const id = `action:${action.id}`;
    const act = action.do;
    if (act.kind === 'toggle') {
      // a door that is open offers to be shut
      out.push({ id, label: works?.open(verb.model, verb.node, action) ? act.back : action.label, verb });
    } else if (act.kind === 'lift') {
      // standing on it, it can be ridden to any other stop; from anywhere else it can only be called
      if (works?.riding(verb.model, verb.node, action)) {
        const here = works.stop(verb.model, verb.node, action);
        act.stops.forEach(
          (stop, i) => i !== here && out.push({ id: `${id}:${i}`, label: `Ride to ${stop.name}`, verb: { ...verb, stop: i } }),
        );
      } else out.push({ id, label: action.label, verb: { ...verb, stop: 'call' } });
    } else out.push({ id, label: action.label, verb });
  }
  // leaving the walk to study it from outside: a part of a model, or a place in the surroundings
  if (part || target.place) out.push({ id: 'inspect', label: 'Inspect', verb: { do: 'inspect' } });
  return out;
}
