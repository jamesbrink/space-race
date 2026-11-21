/**
 * The flights there are, by id (`Flight.id`), for the one thing a flight's plan says of another flight: that its target
 * is that flight's own vehicle (sim/plan.ts `TargetDef`, `flight`; staged.ts `metOf`). The simulator is handed one
 * flight at a time and imports none, so the flights are told to it: missions/index.ts enrols every flight as its list is
 * made, and a flight built to be met (a Gemini target: vehicles/target-flight.ts) enrols itself as it is built, so that
 * whatever has loaded its `flight.ts` can fly the flight that goes up to it. Nothing here names a flight.
 */
import type { Flight } from '../types.ts';

const flights = new Map<string, Flight>();

/** Make flights known by their ids. Enrolling one again changes nothing; another of the same id takes its place. */
export function enrol(...list: readonly Flight[]): void {
  for (const flight of list) flights.set(flight.id, flight);
}

/** The flight of that id, where one has been enrolled. */
export function enrolled(id: string): Flight | undefined {
  return flights.get(id);
}
