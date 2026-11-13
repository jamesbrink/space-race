import type { MechanismDef, Move } from '../../../../src/types';

/**
 * The periscope's door, objective and the link between them through a Redstone flight, on the flight's clock (types.ts:
 * Part.clocked), and as a mechanism the pilot can work by hand (types.ts: MechanismDef; src/sim/mechanism.ts).
 *
 * Only the objective cartridge moves: an electric motor on the lower housing runs it out and in through the door's
 * opening, and "a connecting link between the objective cartridge and the periscope door allows the door to move in
 * unison with the telescopic motion of the objective cartridge" (SEDR 104, 12-2, 12-18, 12-19 and Figure 12-1; "the
 * door, mechanically linked to the periscope housing, automatically opens and closes with periscope extension and
 * retraction", 2-3). So it is one motion: the capsule's model works the linkage out (mercury_capsule.ScopeWorks: the
 * cartridge's travel, the link's length, the door's hinge) and writes each of the three nodes' motion into its extras
 * (`run`), built as it stood at liftoff, shut and drawn in. This file only says when: each event plays that motion,
 * forward to put the periscope out and backward to draw it in.
 *
 * The programme is documented (SEDR 104, 12-2): out on the pad; "upon capsule umbilical disconnect, the periscope
 * retracts"; out at capsule separation; "thirty seconds after retro-package separation, the periscope is again
 * retracted"; out again for the descent (at "approximately 10,000 feet"; capsule 7's wiring "was changed to extend
 * the periscope at 21,000 feet": MR-3 Postlaunch Report, p. 89). Each flight gives the times its own record has.
 *
 * By hand (the same manual, 12-16, and SEDR 109-7, 2-19): a ratchet handle on the upper housing drove the cartridge
 * through a clutch, either way, with the motor's switch-fuse off; with the fuse restored the motor took it to wherever
 * its relays then had it. Here the pilot of a flight flown by hand sends it out or in (the handle in the cabin, a
 * right click on the afterbody, its switch among the flight deck's keys) and it stays there until the programme's next event; with the sequencer off, which stands
 * for the fuse, it moves only when told, and switched back on it goes to where the programme has it.
 */

/**
 * How long the travel takes, seconds: "PERISCOPE EXT. (5 SEC)" on the orbital capsule's power figures (SEDR 104,
 * Figures 10-9 and 10-12: capsules 8 and 9), and Shepard's "in another 5 seconds the periscope had extended" (Results
 * of the First U.S. Manned Suborbital Space Flight, p. 111). Documented for the later capsules; taken as No. 7's and
 * No. 11's, with which the pilots' calls agree.
 */
export const TAKES = 5;

/** The nodes that move, each with its own motion in its extras (mercury_capsule.periscope_run). */
const NODES = ['Periscope_Objective', 'Periscope_Door', 'Periscope_Link'];

/**
 * `events` are the instants (seconds from launch) at which the periscope went out (true) or in (false), in order; it
 * stands drawn in until the first.
 */
export function periscopeMoves(events: [number, boolean][]): Move[] {
  return events.flatMap(([at, out]) =>
    NODES.map((node): Move => ({ kind: 'run', node, from: at, to: at + TAKES, ...(out ? {} : { back: true }) })),
  );
}

/**
 * The same periscope as a mechanism (types.ts: MechanismDef): its programme `events`, what its two ends are called and
 * the nodes it moves.
 */
export function periscopeMechanism(events: [number, boolean][]): MechanismDef {
  // (an event that sends it out from fully in, with time to get there before the next: the travel itself, played once)
  const from = events.find(
    ([at, out], i) =>
      out && i > 0 && !events[i - 1]![1] && at - events[i - 1]![0] >= TAKES && (events[i + 1]?.[0] ?? Infinity) - at >= TAKES,
  );
  if (!from) throw new Error('periscope: no event sends it out from fully in');
  return { id: 'periscope', name: 'Periscope', says: ['Retracted', 'Extended'], nodes: NODES, events, takes: TAKES, from: from[0] };
}

/** The day before: it stood out on the pad through the count (when it was first put out is not recorded). */
export const ON_THE_PAD = -86_400;
