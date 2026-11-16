/**
 * Which deck flies a flight: one for each kind of plan (sim/plan.ts `PlanKind`), behind the one deck (deck.ts) every
 * flight is flown on. A new kind of flight is a class here, not a branch in whoever opens the deck.
 */
import { Cockpit } from './cockpit.ts';
import { OrbitDeck } from './orbitdeck.ts';
import type { PlanKind } from '../sim/plan.ts';
import type { SitedFlight } from '../types.ts';

/** Each kind of plan's deck: a ballistic flight's cockpit, a flight into orbit's. */
export const DECKS: Record<PlanKind, typeof Cockpit | typeof OrbitDeck> = { ballistic: Cockpit, orbital: OrbitDeck };

/** The deck a flight is flown on, by its plan's kind (a flight with no plan opens the ballistic one, which says it cannot fly). */
export const deckOf = (flight: SitedFlight): (typeof DECKS)[PlanKind] => DECKS[flight.plan?.kind ?? 'ballistic'];
