// Every ballistic flight (a plan of kind 'ballistic': src/sim/fly.ts, vehicle.ts), found as tests/world.test.mjs finds
// flights, so that a new one is held to its record, and its live vehicle to the batch run, the same way as the first. And
// the plan edits the tests fly where they fly something other than the record: each changes the plan's own figures,
// found by what they are (fly.ts `ballisticOf`), never by an id.
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ballisticOf } from '../src/sim/fly.ts';

const root = join(import.meta.dirname, '..');
const files = globSync('missions/*/*/flights/*/flight.ts', { cwd: root });
const modules = await Promise.all(files.map(async (f) => await import(pathToFileURL(join(root, f)).href)));
/** In the order they flew. */
export const BALLISTIC = modules
  .map((m) => m.flight)
  .filter((f) => f.plan?.kind === 'ballistic')
  .sort((a, b) => a.launch.localeCompare(b.launch));
const days = new Map(modules.map((m) => [m.flight, m.DAY]));
/** A ballistic flight's day (its flight.ts's `DAY`, a mercury-redstone.ts `Day`): what its plan is written from with the stack's hardware. */
export const dayOf = (flight) => days.get(flight);

/**
 * A copy of `plan` changed by `change`, which is handed the copy, its craft and the plan's hardware by role: `ballisticOf`
 * of the plan as it was, whose things `mine` finds again in the copy (roles are found once a plan, so the copy's own are
 * found only once it is changed).
 */
export function edited(plan, change) {
  const out = structuredClone(plan);
  const roles = ballisticOf(plan);
  const craft = out.craft[0];
  /** The copy's own of a thing of the plan's (a body, joint, engine, chute or event, by the same id). */
  const mine = (x) =>
    [craft.bodies, craft.joints, craft.engines, craft.chutes, out.events].flatMap((list) => list.filter((y) => y.id === x?.id))[0];
  change(out, craft, roles, mine);
  return out;
}

/**
 * The plan with nothing that gives: no limit on its structure's bending, no strength in its parachutes' cloth or lines,
 * no share a torn canopy keeps, and the rigid body with no limits of its own (the plan's `Craft.rigid.limits` gone).
 */
export function unlimited(plan) {
  return edited(plan, (p, craft) => {
    craft.limits = craft.limits.filter((l) => l.of !== 'qAlpha');
    for (const ch of craft.chutes) {
      delete ch.strength;
      delete ch.pull;
    }
    if (p.record) delete p.record.torn;
    if (p.record && !Object.keys(p.record).length) delete p.record;
    if (craft.rigid) delete craft.rigid.limits;
  });
}

/** The plan with no winds aloft: the air turns with the Earth and no more. */
export const calm = (plan) => ({ ...plan, winds: undefined });

/**
 * The plan with its booster's engine of another nature (a test's fixture, never data): its kind, the range its throttle
 * works in and how often it starts, on the engine and on the rigid body alike, as the plan carries them.
 */
export function natured(plan, nature) {
  return edited(plan, (_, craft, b, mine) => {
    const e = mine(b.engine);
    e.kind = nature.kind ?? 'liquid';
    if (nature.throttle) e.throttle = { range: nature.throttle };
    else delete e.throttle;
    e.starts = { count: nature.starts, ground: false, confidence: nature.confidence, source: nature.source };
    if (craft.rigid) craft.rigid.engine = nature;
  });
}
