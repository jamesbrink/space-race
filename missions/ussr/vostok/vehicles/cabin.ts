import type { CabinDef, ModelDef } from '../../../../src/types';

/**
 * The ejection seat and the cabin of a Vostok after the first (Vostoks 2 to 6) as somewhere to sit (types.ts:
 * ModelDef.seats, CabinDef; viewer/cabin.ts), from the nodes their models already have. Vostok 1 has its own, fuller,
 * in its flight.ts: its cabin is the fit of 1961 (vehicles/vostok_cabin.py), with every needle, lamp and control named
 * and the Vzor. These cabins are the simpler fit vehicles/vostok_3ka.py builds (panels, instruments and the Globus as
 * shapes), so what they give is the seat's eye point (`Seat_Pilot`, at the seated figure's eyes), the pilot's own
 * helmet and head not drawn from inside them, the cabin lit as indoors by its two lamps, their tumbler on the control
 * panel to throw, and the two portholes of the hull. The lamps and the tumbler are Vostok 1's, built by the same code
 * (`vostok_3ka.build(lighting=True)`); what of them the record of these ships supports, and what is carried over as an
 * estimate, is in vehicles/vostok-3ka.md, "Cabin lighting", with what these cabins lack.
 */

/**
 * The cabin's two lamps as lights (`ModelDef.lights`), the pilot's left hand one first: `vostokCabin().lighting` names
 * them by this order. Each is put 220 mm toward the middle of the cabin from its fitting (vehicles/vostok_cabin.py,
 * which prints these), because a bare point at the wall burns the wall beside it. Colour and strength chosen by eye.
 */
export function vostokLights(): NonNullable<ModelDef['lights']> {
  return [
    { position: [0.182, 3.68, -0.04], colour: 0xffe4c0, intensity: 0.14, reach: 2.4 },
    { position: [-0.04, 3.68, 0.182], colour: 0xffe4c0, intensity: 0.14, reach: 2.4 },
  ];
}

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

/** The cabin, with its two lamps (`vostokLights()`, which the flight gives as the model's `lights`). */
export function vostokCabin(): CabinDef {
  return {
    within: ['Cabin', 'EjectionSeat'],
    // the top of the pilot's head: up the seat's rails, toward hatch No. 1 (vehicles/vostok_3ka.py `seat_node`)
    overhead: [-0.646, 0.407, -0.646],
    // Vostok 1's (estimated: a head in a helmet fixed to the suit)
    head: { side: 1.4, up: 0.7, down: 0.5 },
    instruments: [],
    // The lamps' tumbler (`Ctl_Lighting`, built at working) and the fittings that glow (`Lamp_1`, `Lamp_2`). That these
    // ships had a working light and a duty one, switched by the pilot, is documented for Vostok 2 (Titov's report) and,
    // as "the cabin's lighting is good", for Vostok 6; the tumbler, its three positions and the two fittings are
    // Vostok 1's, carried over: estimated (vostok-3ka.md, "Cabin lighting").
    lighting: {
      control: 'Ctl_Lighting',
      name: 'Cabin lighting',
      about:
        'The cabin’s lamps, by a tumbler on the control panel: working, duty, off. On Vostok 2 Titov wrote his log by the working light and found the duty one too dim to write by in the Earth’s shadow. The tumbler and the two fittings here are Vostok 1’s, carried over to this ship: estimated.',
      ways: [
        { says: 'Working', lit: [0, 1] },
        { says: 'Duty', lit: [0] },
        { says: 'Off', lit: [] },
      ],
      fittings: ['Lamp_1', 'Lamp_2'],
    },
    // the hull's two portholes, as Vostok 1's (the same hull: vehicles/vostok_3ka.py ENTRY and RIGHT_PORT)
    windows: [
      { at: [-0.711, 3.477, -0.711], out: [-0.646, 0.407, -0.646], across: 0.2, name: 'Hatch porthole' },
      { at: [-0.379, 3.546, 0.894], out: [-0.345, 0.469, 0.813], across: 0.2, name: 'Right porthole' },
    ],
  };
}
