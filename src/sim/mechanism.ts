/**
 * A mechanism of the vehicle that runs out and in to a programme on the flight's clock, and that a hand can take
 * (types.ts: MechanismDef): a periscope and its door. Pure arithmetic: no page, no model, no flight.
 *
 * It is one motion with one figure, its travel: 0 drawn in, 1 out. A motor runs it from wherever it stands toward
 * whichever end it was last told to go to, at one speed (`takes` seconds for the whole travel), and stops there.
 * What tells it:
 *
 *  - the programme's events, at their instants, while the automatic programme is on;
 *  - a hand, at any instant (`Hand`): it goes where the hand sends it and stays, whatever the programme last said,
 *    until the programme's next event (with the automatic on) or until the automatic is switched back on;
 *  - the automatic being switched back on (the end of a `Span`): it goes to where the programme would have it by then.
 *
 * While the automatic is off nothing happens that is not commanded: the programme's events pass unheard.
 */

/** When it goes out (true) or in (false), seconds from launch, in order; and how long a whole travel takes, seconds. */
export interface Programme {
  events: readonly (readonly [at: number, out: boolean])[];
  takes: number;
}

/** A hand's command: at this instant of the flight, out or in. */
export interface Hand {
  t: number;
  out: boolean;
}

/** A stretch of the flight with the automatic programme switched off (`to` Infinity: still off). */
export interface Span {
  from: number;
  to: number;
}

/** Where the programme alone would have it sent by `t`: out or in (in, before its first event: it is built drawn in). */
export function sentAt(programme: Programme, t: number): boolean {
  let out = false;
  for (const [at, to] of programme.events) {
    if (at > t) break;
    out = to;
  }
  return out;
}

/**
 * How far out it is at `t`, 0 to 1: the programme's events, the `hands`' commands and the automatic's being off
 * (`off`), each heard at its own instant and in order, the motor running between them.
 */
export function travelAt(programme: Programme, t: number, hands: readonly Hand[] = [], off: readonly Span[] = []): number {
  const silent = (at: number): boolean => off.some((span) => at >= span.from && at < span.to);
  const told: { t: number; out: boolean; rank: number }[] = [];
  for (const [at, out] of programme.events) if (at <= t && !silent(at)) told.push({ t: at, out, rank: 0 });
  // (switched back on, it goes to where the programme has it: the last of its events, heard or not)
  for (const span of off) if (span.to <= t) told.push({ t: span.to, out: sentAt(programme, span.to), rank: 1 });
  for (const hand of hands) if (hand.t <= t) told.push({ t: hand.t, out: hand.out, rank: 2 });
  // (at one instant the hand has the last word, then the switch, then the programme)
  told.sort((a, b) => a.t - b.t || a.rank - b.rank);
  let travel = 0;
  let toward = 0;
  let last = Number.NEGATIVE_INFINITY;
  const run = (until: number): void => {
    const moved = programme.takes > 0 ? (until - last) / programme.takes : Infinity;
    travel = toward > travel ? Math.min(toward, travel + moved) : Math.max(toward, travel - moved);
  };
  for (const command of told) {
    if (last > Number.NEGATIVE_INFINITY) run(command.t);
    toward = command.out ? 1 : 0;
    last = command.t;
  }
  if (last > Number.NEGATIVE_INFINITY) run(t);
  return travel;
}

/** Where it is being sent at `t`, with the hands and the automatic's being off heard: out or in. */
export function sentBy(programme: Programme, t: number, hands: readonly Hand[] = [], off: readonly Span[] = []): boolean {
  // (the travel an instant on, with a motor that takes no time, is where it is headed)
  return travelAt({ events: programme.events, takes: 0 }, t, hands, off) > 0.5;
}

/**
 * The instant of the programme's own motions (types.ts: Part.clocked) at which the mechanism stands `travel` of the
 * way out: `from` is an instant at which one of its events begins a travel out from fully in, so the stretch from
 * there over `takes` seconds is the travel itself, played once.
 */
export function readingFor(programme: Programme, from: number, travel: number): number {
  return from + Math.min(1, Math.max(0, travel)) * programme.takes;
}
