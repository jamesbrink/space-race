import { coastEngineState, coastEvents, coastOf, crewWords, type Move, shipOf } from '../../sim/orbital.ts';
import { clockAt } from '../../sim/plan.ts';
import { byHand, movedTo } from '../../sim/staged.ts';
import type { OrbitDeck } from '../orbitdeck.ts';
import { handAxis, turnTo } from './coast.ts';

/**
 * A burn (phase.ts): the coast's braking burn (`burnNext`, `fire`, `retroWhy`) and the record's manoeuvres fired by hand
 * (`nextMove`, `move`). Functions of the deck's state (orbitdeck.ts), each what was a method of it.
 */

/**
 * Whether the coast's burn is the next thing a hand could do, which Space then does: once alone, with the hands free (a
 * lock opened), or, for a spacecraft whose hand controls had no lock (`PlanRecord.manual` without a `code`), before the
 * record's own burn is made: its pilot's next act in the record's order, before the parting that follows it.
 */
export function burnNext(deck: OrbitDeck): boolean {
  if (deck.can('retro')) return true;
  const manual = deck.recordPlan.record?.manual;
  const t = deck.clock.t;
  if (!deck.on || !manual || manual.code || deck.free || deck.fired !== null || !(t > deck.parting)) return false;
  if (deck.mine === null && t >= coastOf(deck.recordPlan).on) return false;
  return retroWhy(deck) === null;
}

/** The action for the coast's burn, with any wording the plan supplies. */
export function burnAsked(deck: OrbitDeck): string {
  return coastEvents(deck.recordPlan).on?.asked ?? `Fire the ${burnName(deck).toLowerCase()}`;
}

/** The coast's burn as the plan names it ('Braking engine', 'Retrorockets'): what the deck calls it. */
export function burnName(deck: OrbitDeck): string {
  return coastEvents(deck.recordPlan).burn?.label ?? 'Braking engine';
}

/** Whether the record's own braking burn was fired by hand: its command within one of the record's periods of orientation by hand. */
export function burnByHand(deck: OrbitDeck): boolean {
  const plan = deck.recordPlan;
  const events = coastEvents(plan);
  const command = clockAt(plan, events.command ?? events.on);
  return (plan.record?.manual?.periods ?? []).some((p) => command >= p.from.value && command <= p.to.value + 1e-6);
}

/** Fire the braking engine by hand along the long axis as it points: the rest of the flight flown again from it. */
export function fire(deck: OrbitDeck, t: number): void {
  const deltaV = deck.recordPlan.record?.manual && coastEvents(deck.recordPlan).burn?.deltaV;
  if (!deltaV || deck.parts <= t) return;
  turnTo(deck, t);
  // the long axis, in the flight's frame
  const aim = handAxis(deck, t);
  const plan = byHand(deck.planned ?? deck.recordPlan, t, aim);
  const burn = shipOf(plan).off - t;
  deck.planned = plan;
  deck.fired = t;
  deck.refly();
  deck.host.say?.(burnName(deck), `Fired by hand: ${burn.toFixed(0)} s to ${deltaV.value} m/s`);
}

/**
 * The record's next manoeuvre a hand that is free can fire now, or null: the hands free, nothing burning from the last,
 * the coast's burn not yet fired, and the thrusters still aboard (their body not let go by the clock on the flight as it
 * stands).
 */
export function nextMove(deck: OrbitDeck): Move | null {
  if (!deck.free || deck.hand === null || deck.fired !== null || deck.aborted) return null;
  const plan = deck.recordPlan;
  const index = deck.priorMoves + deck.moved.length;
  const m = shipOf(plan).moves[index];
  if (!m) return null;
  const t = deck.clock.t;
  const last = deck.moved.at(-1);
  const previous = shipOf(plan).moves[index - 1];
  if (previous && t < (last === undefined ? previous.off : last + previous.off - previous.on)) return null;
  const base = deck.planned ?? deck.givenUp();
  const engine = plan.craft[0]!.engines.find((e) => e.id === m.engine)!;
  const resources = coastEngineState(base, engine.id, t);
  if (engine.tanks.length && (resources.starts <= 0 || resources.kg <= 0)) return null;
  const body = engine.body;
  const joint = plan.craft[0]!.joints.find((j) => j.gone.includes(body));
  const parting = joint && base.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === joint.id));
  if (parting && clockAt(base, parting) <= t) return null;
  return m;
}

/** The record's next manoeuvre fired by hand now, along the long axis as the hand holds it, its impulse and length the record's. */
export function move(deck: OrbitDeck, t: number): void {
  const m = nextMove(deck);
  if (!m) return;
  turnTo(deck, t);
  const axis = handAxis(deck, t);
  deck.planned = movedTo(deck.recordPlan, deck.planned ?? deck.givenUp(), deck.priorMoves + deck.moved.length, t, axis);
  deck.moved.push(t);
  deck.refly();
  deck.host.say?.(
    m.label,
    `Fired by hand: ${(m.off - m.on).toFixed(0)} s, ${(m.accel * (m.off - m.on)).toFixed(1)} m/s ${m.accel < 0 ? 'toward the tail' : 'toward the nose'}`,
  );
}

/** Why the braking engine cannot be fired now by a hand that is free, or null: it went with the instrument module, or he has left. */
export function retroWhy(deck: OrbitDeck): string | null {
  const t = deck.clock.t;
  if (deck.aborted && deck.planned && shipOf(deck.planned).moves.some((move) => t < move.off))
    return 'The abort propulsion sequence is in progress';
  if (deck.handover && deck.handover.t >= coastOf(deck.recordPlan).on) return 'The deorbit firing has already started';
  const plan = deck.planned ?? (deck.free ? deck.givenUp() : deck.recordPlan);
  const engine = coastEvents(plan).burn;
  if (engine?.tanks.length) {
    const state = coastEngineState(plan, engine.id, t);
    if (state.starts <= 0) return 'No engine starts left';
    if (state.kg <= 0) return 'The propulsion tanks are empty';
  }
  if (deck.parts <= t) return 'Gone with the instrument module: the modules have parted';
  const down = deck.flown?.down;
  if (down && down.ejected <= t && deck.recordPlan.craft[0]!.crew?.alone)
    return `${crewWords(deck.recordPlan.craft[0]!.crew).who} has left the ship`;
  return null;
}
