// Every flight flown on a `trajectory` (a ballistic flight: src/sim/fly.ts, vehicle.ts), found as tests/world.test.mjs finds
// flights, so that a new one is held to its record, and its live vehicle to the batch run, the same way as the first.
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { planOfTrajectory } from '../src/sim/planof.ts';

const root = join(import.meta.dirname, '..');
const files = globSync('missions/*/*/flights/*/flight.ts', { cwd: root });
const flights = await Promise.all(files.map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight));
/** In the order they flew. */
export const BALLISTIC = flights.filter((f) => f.trajectory).sort((a, b) => a.launch.localeCompare(b.launch));

const plans = new WeakMap();
/** A trajectory's plan (src/sim/planof.ts), made once for it: what the simulators fly, for a test that changes a trajectory or reads one. */
export function planFor(tr) {
  let plan = plans.get(tr);
  if (!plan) plans.set(tr, (plan = planOfTrajectory(tr)));
  return plan;
}
