import type { Move } from '../../../../src/types';

/**
 * The periscope's door and objective through a Redstone flight, on the flight's clock (types.ts: Part.clocked). The
 * capsule is built as it stood at liftoff (mercury_capsule.periscope_door): the door shut and the objective drawn in
 * under it. The door was "mechanically linked to the periscope housing" and "automatically opens and closes with
 * periscope extension and retraction" (SEDR 104, 2-3), and the programme is documented (SEDR 104, 12-2): out on the pad,
 * in when the umbilical is released, out at separation, in for the entry, out for the descent. Each flight gives the
 * times its own record has. How long a motion took is not recorded beyond Shepard's "in another 5 seconds the periscope
 * had extended" (Results of the First U.S. Manned Suborbital Space Flight, p. 111), so each takes four seconds: estimated.
 */

/** How far the door swings open, degrees: ours, from the photographs of it open (mercury_capsule.SCOPE_DOOR_SWING). */
const SWING = 105;

/**
 * `hinge` is the door's hinge line, toward the nose, and `out` the way the objective comes out and how far (metres), both
 * in the vehicle's frame as the capsule stands: what mercury_capsule.periscope_hinge gives for the flight's capsule.
 * `events` are the instants (seconds from launch) at which the periscope went out (true) or in (false), in order; it
 * stands drawn in until the first.
 */
export function periscopeMoves(hinge: [number, number, number], out: [number, number, number], events: [number, boolean][]): Move[] {
  const door = (from: number, to: number, opening: boolean): Move => ({
    kind: 'swing',
    node: 'Periscope_Door',
    axis: hinge,
    // (about the hinge line toward the nose, a negative turn swings the free edge out)
    angle: ((opening ? -SWING : SWING) * Math.PI) / 180,
    from,
    to,
  });
  const objective = (from: number, to: number, opening: boolean): Move => ({
    kind: 'slide',
    node: 'Periscope_Objective',
    by: opening ? out : [-out[0], -out[1], -out[2]],
    from,
    to,
  });
  // the door opens first and the objective follows it out; going in, the objective first and the door shuts behind it
  return events.flatMap(([at, opening]) =>
    opening ? [door(at, at + 1.5, true), objective(at + 1, at + 4, true)] : [objective(at, at + 3, false), door(at + 2.5, at + 4, false)],
  );
}

/** The day before: it stood out on the pad through the count (when it was first put out is not recorded). */
export const ON_THE_PAD = -86_400;
