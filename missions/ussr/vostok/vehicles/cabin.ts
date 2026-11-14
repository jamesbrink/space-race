import type { CabinDef, ModelDef } from '../../../../src/types';

/**
 * The ejection seat and the cabin of a Vostok after the first (Vostoks 2 to 6) as somewhere to sit (types.ts:
 * ModelDef.seats, CabinDef; viewer/cabin.ts), from the nodes their models already have. Vostok 1 has its own, fuller,
 * in its flight.ts: its cabin is the fit of 1961 (vehicles/vostok_cabin.py), with every needle, lamp and control named
 * and the Vzor. These cabins are the simpler fit vehicles/vostok_3ka.py builds (panels, instruments and the Globus as
 * shapes), so what they give is the seat's eye point (`Seat_Pilot`, at the seated figure's eyes), the pilot's own
 * helmet and head not drawn from inside them, the cabin lit as indoors by its lamp, and the two portholes of the hull.
 * What they lack is listed in vehicles/vostok-3ka.md.
 */

/** The meshes of the seated figure's helmet and head (crew/sk_1.py), each `Pilot_Helmet_<name>`: in front of the eyes from the seat. */
const HELMET = [
  'Shell',
  'Liner',
  'Head',
  'Cap',
  'MicrophoneBooms',
  'Microphones',
  'Eyes',
  'Brows',
  'Lips',
  'Visor',
  'VisorFrame',
  'Fittings',
  'Lettering',
  'Collar',
  'NeckBand',
];

/**
 * The seat. `open`: when it could be boarded on foot, seconds from launch (only a launch site offers that). `more`: the
 * helmet's own further meshes on this flight's suit (a hose, a valve's rim).
 */
export function vostokSeat(open: [number, number], more: string[] = []): NonNullable<ModelDef['seats']>[number] {
  return {
    node: 'Seat_Pilot',
    label: 'the ejection seat',
    from: 'EntryHatch',
    open,
    hide: [...HELMET, ...more].map((mesh) => `Pilot_Helmet_${mesh}`),
    egress: ['pad'],
  };
}

/** The cabin, with its one lamp (`ModelDef.lights[0]`). */
export function vostokCabin(): CabinDef {
  return {
    within: ['Cabin', 'EjectionSeat'],
    // the top of the pilot's head: up the seat's rails, toward hatch No. 1 (vehicles/vostok_3ka.py `seat_node`)
    overhead: [-0.646, 0.407, -0.646],
    // Vostok 1's (estimated: a head in a helmet fixed to the suit)
    head: { side: 1.4, up: 0.7, down: 0.5 },
    instruments: [],
    lighting: {
      name: 'Cabin lighting',
      about:
        'The cabin’s lamp, over the instrument board. Its switch is not modelled in this cabin; on and off is all that is given (estimated).',
      ways: [
        { says: 'On', lit: [0] },
        { says: 'Off', lit: [] },
      ],
    },
    // the hull's two portholes, as Vostok 1's (the same hull: vehicles/vostok_3ka.py ENTRY and RIGHT_PORT)
    windows: [
      { at: [-0.711, 3.477, -0.711], out: [-0.646, 0.407, -0.646], across: 0.2, name: 'Hatch porthole' },
      { at: [-0.379, 3.546, 0.894], out: [-0.345, 0.469, 0.813], across: 0.2, name: 'Right porthole' },
    ],
  };
}
