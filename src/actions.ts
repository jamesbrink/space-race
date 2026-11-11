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
}

/** A verb the wheel can offer, and what the page needs to carry it out. */
export type Verb =
  | { do: 'info' }
  | { do: 'look' }
  | { do: 'inspect' }
  | { do: 'become'; model: string }
  | { do: 'action'; model: string; action: Action };

export interface Choice {
  id: string;
  label: string;
  verb: Verb;
}

/** The same target as before? (A new object is made every frame; only a change is news.) */
export const sameTarget = (a: Target | null, b: Target | null): boolean =>
  a === b || (!!a && !!b && a.model === b.model && a.node === b.node && a.pane === b.pane && a.place === b.place);

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
  return part?.name ?? model?.name ?? (target.place ? spaced(target.place) : target.pane ? 'Window' : '');
}

/**
 * The verbs that apply to a target, in the order the wheel lays them out (the first at the top).
 * `as` is the model being walked as: nobody becomes themselves. An empty list means there is
 * nothing to do with it, and it is not worth a prompt.
 */
export function choices(target: Target, flight: Flight, as: string): Choice[] {
  const { model, part } = lookUp(target, flight);
  const out: Choice[] = [];
  if (part) out.push({ id: 'info', label: 'Info', verb: { do: 'info' } });
  if (target.pane) out.push({ id: 'look', label: 'Look inside', verb: { do: 'look' } });
  if (model?.walker && model.id !== as) out.push({ id: 'become', label: `Become ${model.name}`, verb: { do: 'become', model: model.id } });
  for (const action of part?.actions ?? [])
    out.push({ id: `action:${action.id}`, label: action.label, verb: { do: 'action', model: model!.id, action } });
  // leaving the walk to study it from outside: a part of a model, or a place in the surroundings
  if (part || target.place) out.push({ id: 'inspect', label: 'Inspect', verb: { do: 'inspect' } });
  return out;
}
