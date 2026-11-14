import type { CabinDef, ModelDef } from '../../../../src/types';

/**
 * The seat and the cabin of an orbital-type Mercury capsule (No. 11 on: Liberty Bell 7, Friendship 7, Aurora 7,
 * Sigma 7, Faith 7) as somewhere to sit (types.ts: ModelDef.seats, CabinDef; viewer/cabin.ts), from the nodes the
 * capsule's model already has (vehicles/mercury_cabin.py and the capsule's own mercury_cabin_<n>.py). Freedom 7 has its
 * own, fuller, in its flight.ts: its instruments read its flight.
 *
 * What these give: the couch's eye point (`Seat_Pilot`, at the seated figure's eyes, +Z toward the panel), the pilot's
 * own helmet and head not drawn from inside them, the cabin lit as indoors by its two floodlights and their switch, the
 * window, and the periscope where the capsule carried one. What they do not: no instrument, telelight or control is
 * named (the nodes are there; none of these flights is flown here yet, and each needs its own words): see each
 * capsule's .md.
 */

/** The meshes of the seated figure's helmet and head (crew/mark_iv_suit.py), each `CrewCabin_Pilot_Helmet_<name>`: in front of the eyes from the couch. */
const HELMET = [
  'Visor',
  'VisorFrame',
  'VisorSeal',
  'Shell',
  'Liner',
  'Head',
  'Eyes',
  'Brows',
  'Lips',
  'CommCap',
  'FaceDetail',
  'Fittings',
  'OutletBore',
  'NeckRing',
];

/**
 * The couch. `open`: when it could be boarded on foot, seconds from launch (only a launch site offers that). Seated, the
 * eyes are the node's origin and `hide` is what is in front of them.
 */
export function mercurySeat(open: [number, number]): NonNullable<ModelDef['seats']>[number] {
  return {
    node: 'Seat_Pilot',
    label: 'the couch',
    from: 'Hatch',
    open,
    hide: HELMET.map((mesh) => `CrewCabin_Pilot_Helmet_${mesh}`),
    egress: ['pad'],
  };
}

/** Low power and high: SP-45 p. 282, "172 degrees"; Hammack and Heberlig p. 5, 80 nautical miles of ground from 100 up, 43.6 degrees (derived). As Freedom 7's. */
const FIELDS = [172, 43.6];
/** Toward the Earth with the small end 14.5 degrees below the horizon: SEDR 104 Figure 12-3, the orbital capsule's. As Freedom 7's. */
const DOWN = (14.5 * Math.PI) / 180;

/**
 * The cabin. `periscope`: the capsule carried one (all but Faith 7), with this `about`; its objective `at` is where the
 * model's own objective node stands fully out (its `run` extras: derived from the model), 135 degrees from +X.
 */
export function mercuryCabin(o: { window: string; periscope?: { about: string; at: [number, number, number] } }): CabinDef {
  return {
    within: ['CrewCabin'],
    // the top of the pilot's head: 45 degrees round from the hatch, which is on +X
    overhead: [Math.SQRT1_2, 0, Math.SQRT1_2],
    // Freedom 7's (measured in its model: estimated); these couches lie within a degree or two of his
    head: { side: 1.75, up: 0.95, down: 0.3 },
    instruments: [],
    lighting: {
      control: 'Ctl_CabinLights',
      name: 'Cabin lights',
      about:
        'CABIN LIGHTS: BOTH, L.H. ONLY in the middle, OFF (Results of the Second U.S. Manned Suborbital Space Flight, Figure 2-3, capsule 11; ' +
        'the orbital capsules’ panels are taken to read the same). Two four-watt fluorescent floodlights, all the light the dials had.',
      // the model's lamps in order: the first is on the pilot's right (Lamp_Right), the second on his left
      ways: [
        { says: 'Both', lit: [0, 1] },
        { says: 'Left hand only', lit: [1] },
        { says: 'Off', lit: [] },
      ],
      fittings: ['Lamp_Right', 'Lamp_Left'],
    },
    // the window over the pilot's face: the middle of its inner panes (the model's Window_InnerPanes), facing out of the
    // cone, which is 20 degrees off the axis, at 45 degrees round from +X: derived from the model. About 10 in of glass
    windows: [{ at: [0.437, 0.696, 0.437], out: [0.664, 0.342, 0.664], across: 0.25, name: o.window }],
    ...(o.periscope
      ? {
          periscope: {
            screen: 'Periscope_Screen',
            name: 'Periscope',
            about: o.periscope.about,
            mechanism: 'periscope',
            at: o.periscope.at,
            axis: [-Math.SQRT1_2 * Math.cos(DOWN), Math.sin(DOWN), -Math.SQRT1_2 * Math.cos(DOWN)],
            // the top of the picture toward the small end, toward the pilot's head on the screen: estimated, as Freedom 7's
            up: [0, 1, 0],
            top: [Math.SQRT1_2, 0, Math.SQRT1_2],
            fields: FIELDS,
          },
        }
      : {}),
  };
}

/** Where the orbital-type capsule's objective stands fully out: the node at (-0.394, 1.068, -0.394), moved by its `run`'s last step (-0.093, 0.058, -0.093). */
export const OBJECTIVE_OUT: [number, number, number] = [-0.487, 1.126, -0.487];
