import { type DownBody, type DownChute, downOf } from '../../sim/descent.ts';
import { automatic, coastEvents, coastOf, crewWords, type DescentHands, shipOf } from '../../sim/orbital.ts';
import { clockAt, eventOf, type FlightPlan } from '../../sim/plan.ts';
import { orbitalFlown } from '../../sim/run.ts';
import { partingAt } from '../../sim/staged.ts';
import type { OrbitDeck } from '../orbitdeck.ts';
import { pushOf, takeOrbitAt } from './coast.ts';
import { KM } from './phase.ts';
import { wall } from './surface.ts';

/**
 * Entry and the descent (phase.ts): the descent's events given by hand in the record's order (`nextDescent`, `give`,
 * `descentWhy`), the automatic sequence's switch (`switchDescent`) and what a hand's event does (`consequence`). Functions
 * of the deck's state (orbitdeck.ts), each what was a method of it.
 */

/**
 * The record as this flight now has it (its braking burn: the timer's, a hand's, or none), and what the hands gave in the
 * descent: the modules part when a hand parted them, or when the sequence would (the timer after a burn, or the record's
 * instant) if it was on then, or never.
 */
export function descentPlan(deck: OrbitDeck): { plan: FlightPlan; hands: DescentHands } {
  const base = deck.planned ?? (deck.free || deck.mine !== null ? deck.givenUp() : deck.recordPlan);
  return { plan: partingAt(base, deck.parts), hands: hands(deck) };
}

/**
 * What the hands have given the descent (sim/orbital.ts `DescentHands`): its events and the sequencer's switch, and of
 * an entry steered to a place the guidance switch and the stick's roll.
 */
export function hands(deck: OrbitDeck): DescentHands {
  return {
    given: deck.given,
    switched: deck.switched,
    ...(steers(deck) ? { steered: [{ t: Number.NEGATIVE_INFINITY, on: entryOwn(deck) }, ...deck.entryGuided], rolls: deck.rolls } : {}),
    ...(deck.bankTaken === null ? {} : { bank: deck.bankTaken }),
  };
}
/** Whether this flight's entry is steered to a place (`Hold.entry`, sim/entry.ts). */
export function steers(deck: OrbitDeck): boolean {
  return shipOf(deck.recordPlan).guided !== undefined;
}
/**
 * Who has the entry's bank before any switch is thrown in the descent: the computer on the record's flight, and on a
 * flight of one's own while guidance is on and the hands are not free (deck.ts `START`: off, so the bank is the hand's).
 */
export function entryOwn(deck: OrbitDeck): boolean {
  return deck.free || deck.mine !== null ? deck.guidance && !deck.free : true;
}
/** Whether the entry's computer has the bank at `t`. */
export function entrySteered(deck: OrbitDeck, t: number): boolean {
  let on = entryOwn(deck);
  for (const s of deck.entryGuided) if (s.t <= t) on = s.on;
  return on;
}

export function descentOrder(deck: OrbitDeck): { id: string; at: number }[] {
  if (deck.order) return deck.order;
  const plan = deck.recordPlan;
  const d = downOf(plan);
  const parting = coastEvents(plan).parting;
  const down = orbitalFlown(deck.flight).down;
  if (!d || !parting) return [];
  deck.order = [
    { id: parting.id, at: parting.at?.value ?? clockAt(plan, parting) },
    { id: d.ejection, at: down?.ejected ?? Number.POSITIVE_INFINITY },
    ...d.bodies.flatMap((b) => b.chutes.map((c) => ({ id: c.event, at: down?.opened[b.id]?.[c.name] ?? Number.POSITIVE_INFINITY }))),
  ]
    // (the event that sets what comes down loose can be a parachute's own: a Mercury capsule's drogue)
    .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i)
    .sort((p, q) => p.at - q.at);
  return deck.order;
}

/** The next event of the descent a hand can give now, with what Space says for it. */
export function nextDescent(deck: OrbitDeck): { id: string; label: string } | null {
  const next = descentOrder(deck).find((e) => descentWhy(deck, e.id) === null);
  return next ? { id: next.id, label: descentLabel(deck, next.id) } : null;
}

/** What an event of the descent is called on the deck. */
export function descentLabel(deck: OrbitDeck, id: string): string {
  const plan = deck.recordPlan;
  const asked = eventOf(plan, id)?.asked;
  if (asked) return asked;
  if (id === coastOf(plan).parting) return 'Part the modules';
  if (id === coastOf(plan).loose) return 'Eject';
  const { body, chute: c } = chuteOf(deck, id);
  if (c?.replaces?.leaves) return `Leave ${c.replaces.leaves.label.replace(/^The /, 'the ')}`;
  const name = c?.name ?? id;
  const whose = body?.id === plan.craft[0]!.crew?.alone ? '' : 'Module’s ';
  return `${whose}${whose ? name : name[0]!.toUpperCase() + name.slice(1)}`;
}

/** The body of the descent and the parachute an event of it puts out (sim/descent.ts `DownChute.event`), if it puts one out. */
export function chuteOf(deck: OrbitDeck, id: string): { body?: DownBody; chute?: DownChute } {
  for (const body of downOf(deck.recordPlan)?.bodies ?? []) {
    const chute = body.chutes.find((c) => c.event === id);
    if (chute) return { body, chute };
  }
  return {};
}

/** Whether a braking burn is still to come or burning on the flight on show at `t`: the timer's on the record's, or a hand's. */
export function burnPending(deck: OrbitDeck, t: number): boolean {
  if (deck.fired !== null) return t < shipOf(deck.planned!).off;
  if (deck.free || deck.mine !== null) return false;
  return t < coastOf(deck.recordPlan).off;
}

/**
 * Why event `id` of the descent (the modules' parting, the pilot set loose, a parachute put out: the plan's events) cannot
 * be given now on the flight on show, or null if it can: the spacecraft alone; for all but the parting, no braking burn
 * still to come; the body it belongs to loose and not down; the event not yet happened.
 */
export function descentWhy(deck: OrbitDeck, id: string): string | null {
  const plan = deck.recordPlan;
  const d = downOf(plan);
  if (!d) return 'This flight’s record has no descent';
  const t = deck.clock.t;
  if (!(t > deck.parting)) return 'Not on the launch vehicle';
  const whole = deck.flown ?? orbitalFlown(deck.flight);
  const down = whole.down;
  const first = d.bodies[0]!.id;
  const landed = (body: string) => down?.landed[body]?.at ?? Number.POSITIVE_INFINITY;
  const parting = id === coastOf(plan).parting;
  const { body: b, chute } = chuteOf(deck, id);
  if (t >= landed(first) && (parting || id === d.ejection || b?.id === first)) return 'Down';
  if (parting) return deck.parts <= t ? 'Parted already' : null;
  if (burnPending(deck, t)) return 'The braking burn is still to come: the descent follows it';
  if (id === d.ejection && !chute)
    return (down?.ejected ?? Number.NaN) <= t
      ? plan.craft[0]!.crew?.alone === undefined
        ? 'Done already'
        : `${crewWords(plan.craft[0]!.crew).who} has left the ship already`
      : null;
  if (!b || !chute) return 'No such parachute';
  const i = b.chutes.indexOf(chute);
  const body = b.id;
  const name = chute.name;
  const began = body === first ? Number.NEGATIVE_INFINITY : (down?.tracks[body]?.[0]?.t ?? Number.POSITIVE_INFINITY);
  if (!(t >= began))
    return body === plan.craft[0]!.crew?.alone
      ? `${crewWords(plan.craft[0]!.crew).who} is still in the ship: eject first`
      : 'Still on the ship';
  if (t >= landed(body)) return 'Down';
  if ((down?.opened[body]?.[name] ?? Number.POSITIVE_INFINITY) <= t) return 'Out already';
  const j = b.chutes.findIndex((c) => c.replaces?.leaves);
  if (j >= 0 && i < j && (down?.opened[body]?.[b.chutes[j]!.name] ?? Number.POSITIVE_INFINITY) <= t)
    return `It stayed with ${b.chutes[j]!.replaces!.leaves!.label.replace(/^The /, 'the ')}`;
  return null;
}

/**
 * Whether event `id` of the descent would have come by now, by the automatic sequence's own trigger: the modules at the
 * sequence's instant, the ejection and a parachute at their heights (the body's own), or a time after the ejection.
 */
export function descentDue(deck: OrbitDeck, id: string, t: number): boolean {
  const plan = deck.recordPlan;
  const d = downOf(plan)!;
  const down = deck.flown?.down;
  if (id === coastOf(plan).parting) return t >= shipOf(deck.planned ?? plan).parted;
  const first = d.bodies[0]!.id;
  const { body: b, chute: c } = chuteOf(deck, id);
  const body = id === d.ejection ? first : b?.id;
  // the body's height now: its track's, or the run's own sample's for the entry body
  let h = deck.sampleAt(t).altitude;
  const track = body ? down?.tracks[body] : undefined;
  if (body !== first && track?.length) {
    const p = track.find((x) => x.t >= t) ?? track[track.length - 1]!;
    h = deck.frame.place(p.r, p.t).height - deck.flight.site.seaLevel.value;
  }
  if (id === d.ejection) return h <= d.floor;
  if (!c) return false;
  if (c.altitude !== undefined) return h <= c.altitude;
  return c.after !== undefined && down !== null && down !== undefined && t - down.ejected >= c.after;
}

/** Whether the record's flight is still the record's: nothing taken over, no lock opened, no burn, nothing given in the descent. */
export function recorded(deck: OrbitDeck): boolean {
  return deck.mine === null && deck.fired === null && !deck.free && deck.downMine === null;
}

/** Event `id` of the descent given by a hand at the clock's instant: what had been given after it is forgotten, and the rest is flown again. */
export function give(deck: OrbitDeck, id: string): void {
  const why = descentWhy(deck, id);
  if (why) return void deck.host.say?.(descentLabel(deck, id), why);
  const t = deck.clock.t;
  const taken = recorded(deck);
  if (taken) deck.downMine = t;
  for (const [k, at] of Object.entries(deck.given)) if (at > t) delete deck.given[k];
  deck.switched = deck.switched.filter((s) => s.t <= t);
  deck.entryGuided = deck.entryGuided.filter((s) => s.t <= t);
  deck.rolls = deck.rolls.filter((r) => r.t <= t);
  if (deck.partedBy !== null && deck.partedBy > t) deck.partedBy = null;
  if (id === coastOf(deck.recordPlan).parting) deck.partedBy = t;
  else deck.given[id] = t;
  deck.refly();
  deck.host.say?.(
    descentLabel(deck, id),
    `${consequence(deck, id, t)}${taken ? ` Not the flight of ${deck.day}: ${deck.recordPlan.record?.automatic ?? 'it was automatic'}.` : ''}`,
  );
  if (!deck.clock.running) deck.clock.play(true);
}

/** What came of an event given at `t`, at once: where it was, and a parachute torn as it came out. */
export function consequence(deck: OrbitDeck, id: string, t: number): string {
  const down = deck.flown?.down;
  const s = deck.sampleAt(t);
  const where = `${(Math.max(0, s.altitude) / KM).toFixed(1)} km up at ${s.groundSpeed.toFixed(0)} m/s through the air`;
  const coast = coastOf(deck.recordPlan);
  if (id === coast.parting) return `Parted ${where}.`;
  if (id === coast.loose && !chuteOf(deck, id).chute) return `Hatch No. 1 off and the seat out ${where}, ${(s.q / 1000).toFixed(1)} kPa.`;
  const { body, chute } = chuteOf(deck, id);
  if (chute?.stays) return 'Given: it stayed in its container.';
  const tore = body && chute ? down?.torn[body.id]?.[chute.name] : undefined;
  if (tore?.by === 'fouled') return `Out, in the shadow of the ${chute?.fouls?.by.join(' and ')}: it streams and does not fill.`;
  if (tore && Math.abs(tore.t - t) < 1e-6) return `Out, and torn at once: ${(tore.q / 1000).toFixed(1)} kPa on its cloth.`;
  return tore ? `Out; it tears at ${wall(deck, tore.t)}.` : 'Out.';
}

/** G with the spacecraft alone, no burn to come and an entry steered to a place: its computer off, or on again, from the clock's instant. */
export function switchEntry(deck: OrbitDeck): void {
  const t = deck.clock.t;
  const on = !entrySteered(deck, t);
  if (recorded(deck)) {
    deck.downMine = t;
    takeOrbitAt(deck, t);
  }
  deck.entryGuided = [...deck.entryGuided.filter((s) => s.t < t), { t, on }];
  deck.rolls = deck.rolls.filter((r) => r.t <= t);
  deck.refly();
  deck.host.say?.(
    'Guidance',
    on
      ? 'On: the computer steers a burn lit by hand, and has the bank again and steers for its target'
      : 'Off: a burn lit is yours to point and cut, and the bank is yours. Roll the lift with the roll keys; Hold keeps it where you leave it',
  );
}

/**
 * The stick's roll in a steered entry with the guidance switch off (sim/entry.ts): each change of it, and of Hold, is
 * the hand's at the clock's instant, and the rest of the entry is flown again with it. Looking back over the run, what
 * was rolled stays as it was; a roll asked for there begins the entry again from that instant.
 */
export function rollTo(deck: OrbitDeck, t: number): void {
  const due = rollDue(deck, t);
  if (!due) return;
  deck.rolls = [...deck.rolls.filter((r) => r.t < t), { t, ...due }];
  deck.refly();
}
/** The stick's roll and Hold as they stand at `t`, where that is a change the entry is to be flown again with (`rollTo`); else null. */
export function rollDue(deck: OrbitDeck, t: number): { stick: number; hold: boolean } | null {
  if (!steers(deck) || !deck.run || t <= deck.parting || t < deck.parts || burnPending(deck, t) || entrySteered(deck, t)) return null;
  if (t >= (deck.flown ?? orbitalFlown(deck.flight)).coast.samples.at(-1)!.t) return null;
  const stick = Math.round(pushOf(deck).roll * 10) / 10;
  let last: { t: number; stick: number; hold: boolean } | undefined;
  for (const r of deck.rolls) if (r.t <= t) last = r;
  const looking = deck.rolls.length > 0 && t < deck.rolls.at(-1)!.t;
  if (looking ? stick === 0 : (last?.stick ?? 0) === stick && (last?.hold ?? deck.hold) === deck.hold) return null;
  return { stick, hold: deck.hold };
}

/** B with the spacecraft alone and no burn to come: the descent's automatic sequence off, or on again, from the clock's instant. */
export function switchDescent(deck: OrbitDeck): void {
  const t = deck.clock.t;
  const on = !automatic({ given: {}, switched: deck.switched }, t);
  if (recorded(deck)) {
    deck.downMine = t;
    takeOrbitAt(deck, t);
  }
  deck.switched = [...deck.switched.filter((s) => s.t < t), { t, on }];
  deck.refly();
  deck.host.say?.(
    'Sequencer',
    on
      ? 'On: the timer and the barometric switches act again'
      : `Off: nothing in the descent happens but what you give using the action button. ${deck.recordPlan.record?.automatic ?? ''}`,
  );
}
