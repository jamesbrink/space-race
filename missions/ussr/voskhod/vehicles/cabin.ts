import type { CabinDef, ModelDef } from '../../../../src/types';

/**
 * A Voskhod's couches and its cabin as somewhere to sit (types.ts: ModelDef.seats, CabinDef; viewer/cabin.ts), from the
 * nodes vehicles/voskhod.py builds. Each couch has an eye point, `Seat_<Left|Centre|Right>`, at the eyes of the man the
 * flight lays in it and turned as his own head is (voskhod.py `seat_view`); the couches are named by where they lie,
 * as their nodes and their men are (`CouchLeft`, `Crew_Left_…`), and each flight says whose each was. The cabin is the
 * plain one of the Vostoks after the first (../../vostok/vehicles/cabin.ts): a board, the Globus and the Vzor as shapes,
 * lit as indoors by its one lamp, with the hull's two portholes to look out of. What it lacks is in voskhod.md.
 */

export type Couch = 'Left' | 'Centre' | 'Right';

/**
 * A couch. `whose` is what the page calls it; `helmet` the meshes of its man's head and what he wears on it, each
 * `Crew_<couch>_Helmet_<name>`: his eyes are inside them, so from his own couch they are not drawn. `open`: when it
 * could be boarded on foot, seconds from launch (only a launch site offers that).
 */
export function voskhodSeat(couch: Couch, whose: string, helmet: string[], open: [number, number]): NonNullable<ModelDef['seats']>[number] {
  return {
    node: `Seat_${couch}`,
    label: whose,
    from: 'EntryHatch',
    open,
    hide: helmet.map((mesh) => `Crew_${couch}_Helmet_${mesh}`),
    egress: ['pad'],
  };
}

/** The cabin, with its one lamp (`ModelDef.lights[0]`). `couches`: the model's couch nodes, whose men are indoors too. */
export function voskhodCabin(couches: string[]): CabinDef {
  return {
    within: ['Cabin', ...couches],
    // the top of the crew's heads: along the couches toward hatch No. 2 and the parachute container, square to the
    // entry hatch's side (voskhod.py `couch_frame`: +Y), level
    overhead: [Math.SQRT1_2, 0, -Math.SQRT1_2],
    // the Vostok seat's (estimated): a head on a couch's rest turns as far as one in a helmet fixed to its suit
    head: { side: 1.4, up: 0.7, down: 0.5 },
    instruments: [],
    lighting: {
      name: 'Cabin lighting',
      about:
        'The cabin’s lamp, over the instrument board. Its switch is not modelled: the control panel a Voskhod had by the couches is not built; on and off is all that is given (estimated).',
      ways: [
        { says: 'On', lit: [0] },
        { says: 'Off', lit: [] },
      ],
    },
    // the hull's two portholes, the Vostok's (the same ball: vostok_3ka.py ENTRY and RIGHT_PORT). The third, in hatch
    // No. 3, has the Vzor on it.
    windows: [
      { at: [-0.711, 3.477, -0.711], out: [-0.646, 0.407, -0.646], across: 0.2, name: 'Hatch porthole' },
      { at: [-0.379, 3.546, 0.894], out: [-0.345, 0.469, 0.813], across: 0.2, name: 'Right porthole' },
    ],
  };
}
