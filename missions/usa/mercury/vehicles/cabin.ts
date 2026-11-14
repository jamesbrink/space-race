import type { CabinDef, ModelDef, Signal } from '../../../../src/types';

/**
 * The seat and the cabin of an orbital-type Mercury capsule (No. 11 on: Liberty Bell 7, Friendship 7, Aurora 7,
 * Sigma 7, Faith 7) as somewhere to sit (types.ts: ModelDef.seats, CabinDef; viewer/cabin.ts), from the nodes the
 * capsule's model already has (vehicles/mercury_cabin.py and the capsule's own mercury_cabin_<n>.py). Freedom 7 has its
 * own, fuller, in its flight.ts: its instruments read its flight.
 *
 * What these give: the couch's eye point (`Seat_Pilot`, at the seated figure's eyes, +Z toward the panel), the pilot's
 * own helmet and head not drawn from inside them, the cabin lit as indoors by its two floodlights and their switch, the
 * window, and the periscope where the capsule carried one; and, for the Redstone flights' capsules, the instruments and
 * controls their panels share (`mercuryInstruments`, `mercuryControls`, `sequenceLamp`, `MERCURY_STICK`: No. 7's and No. 11's
 * models give them the same nodes), each flight putting its own words where its record has them. The orbital capsules'
 * panels are named nowhere yet: see each capsule's .md.
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

/** What a needle or a lamp says of itself where the simulator does not drive it. */
export const NOT_SIMULATED = 'Not simulated: the needle stands where its face was drawn.';

/**
 * The instruments a Mercury capsule of the Redstone flights carried, by the nodes its model gives them (vehicles/mercury_cabin.py
 * draws their faces, each needle with its scale in its own extras: No. 7's panel and No. 11's rearranged one alike), and what
 * each reads of the flight being flown. `words` puts a flight's own sentence in place of the one here, node by node: what
 * its pilot read on it, what its record lists.
 */
export function mercuryInstruments(words: Partial<Record<string, string>> = {}): CabinDef['instruments'] {
  const say = (node: string, about: string) => words[node] ?? about;
  return [
    {
      node: 'Gauge_Altimeter',
      name: 'Altimeter',
      about: say('Gauge_Altimeter', 'Thousands of feet, to 100: above that it is on its stop. MAIN at 10, SNORKEL at 20.'),
      reads: 'altitude',
      per: 304.8,
    },
    {
      node: 'Gauge_DescentRate',
      name: 'Rate of descent',
      about: say('Gauge_DescentRate', 'Feet a second downward.'),
      reads: 'descent',
      per: 0.3048,
    },
    {
      node: 'Gauge_Accelerometer',
      name: 'Longitudinal accelerometer',
      about: say('Gauge_Accelerometer', 'G units along the capsule, -9 to +12: 6 at burnout and 11 coming back in.'),
      reads: 'g',
    },
    {
      node: 'Gauge_Roll',
      name: 'Roll attitude',
      about: say('Gauge_Roll', 'One of three needles where a later craft has a ball. Degrees from wings level.'),
      reads: 'roll',
    },
    {
      node: 'Gauge_Pitch',
      name: 'Pitch attitude',
      about: say('Gauge_Pitch', 'Degrees the small end is above the horizon. RETRO marks the 34 degrees held to fire the retrorockets.'),
      reads: 'pitch',
    },
    { node: 'Gauge_Yaw', name: 'Yaw attitude', about: say('Gauge_Yaw', 'Degrees the small end is off the line flown.'), reads: 'yaw' },
    {
      node: 'Gauge_RollRate',
      name: 'Roll rate',
      about: say('Gauge_RollRate', 'The rate needles in the middle square. Their full travel is taken as 6 degrees a second: estimated.'),
      reads: 'rollRate',
    },
    {
      node: 'Gauge_PitchRate',
      name: 'Pitch rate',
      about: say('Gauge_PitchRate', 'Degrees a second, the bar that rises and falls.'),
      reads: 'pitchRate',
    },
    { node: 'Gauge_YawRate', name: 'Yaw rate', about: say('Gauge_YawRate', 'Degrees a second.'), reads: 'yawRate' },
    {
      node: 'Gauge_ClockHour',
      name: 'Clock',
      about: say('Gauge_ClockHour', 'A twelve-hour watch, here on Cape time: the Redstone flights had no time-to-retrograde counter.'),
      reads: 'timeOfDay',
    },
    { node: 'Gauge_ClockMinute', name: 'Clock', about: say('Gauge_ClockMinute', 'Minutes.'), reads: 'timeOfDay' },
    { node: 'Gauge_ClockSecond', name: 'Clock', about: say('Gauge_ClockSecond', 'Seconds.'), reads: 'timeOfDay' },
    ...[0, 1, 2, 3, 4].map((place) => ({
      node: `Gauge_Counter${place}`,
      name: 'Seconds from launch',
      about: say(`Gauge_Counter${place}`, 'Started by the lift-off signal, or by the TIME ZERO button if that failed.'),
      reads: 'elapsed' as const,
    })),
    {
      node: 'Gauge_FuelAuto',
      name: 'Control fuel, automatic',
      about: say('Gauge_FuelAuto', 'Hydrogen peroxide left for the automatic jets, percent of 32 lb.'),
      reads: 'supply0',
      per: 0.01,
    },
    {
      node: 'Gauge_FuelManual',
      name: 'Control fuel, manual',
      about: say('Gauge_FuelManual', 'Hydrogen peroxide left for the hand controller’s own jets, percent of 23 lb.'),
      reads: 'supply1',
      per: 0.01,
    },
    { node: 'Gauge_CabinPressure', name: 'Cabin pressure', about: say('Gauge_CabinPressure', `Pounds a square inch. ${NOT_SIMULATED}`) },
    { node: 'Gauge_CabinAir', name: 'Cabin air temperature', about: say('Gauge_CabinAir', `Degrees Fahrenheit. ${NOT_SIMULATED}`) },
    { node: 'Gauge_Humidity', name: 'Cabin humidity', about: say('Gauge_Humidity', `Its face is ours. ${NOT_SIMULATED}`) },
    {
      node: 'Gauge_Coolant',
      name: 'Coolant quantity',
      about: say('Gauge_Coolant', `Water for the suit and cabin heat exchangers, percent left. ${NOT_SIMULATED}`),
    },
    {
      node: 'Gauge_Oxygen',
      name: 'Oxygen quantity',
      about: say('Gauge_Oxygen', `Percent left, with the emergency supply’s sector. ${NOT_SIMULATED}`),
    },
    {
      node: 'Gauge_DCVolts',
      name: 'D.C. volts',
      about: say('Gauge_DCVolts', `Whichever battery the selector below is on. ${NOT_SIMULATED}`),
    },
    { node: 'Gauge_DCAmps', name: 'D.C. amps', about: say('Gauge_DCAmps', NOT_SIMULATED) },
    {
      node: 'Gauge_ACVolts',
      name: 'A.C. volts',
      about: say('Gauge_ACVolts', `The fans’ or the control system’s inverter. ${NOT_SIMULATED}`),
    },
  ];
}

/** A sequence telelight: green, lit when the flight's `shows` has happened (types.ts `Signal`); without one it stays dark and says so. */
export const sequenceLamp = (node: string, name: string, shows: Signal | undefined, about: string) => ({
  node: `Tele_${node}`,
  name,
  about,
  colour: 0x58ff8a,
  ...(shows ? { shows } : {}),
});

/**
 * The controls a Mercury capsule of the Redstone flights carried, by its model's nodes: the pull rings and buttons that do
 * the sequence by hand, the abort handle, the hand controller and the periscope's ratchet. `words` as `mercuryInstruments`'s.
 */
export function mercuryControls(words: Partial<Record<string, string>> = {}): NonNullable<CabinDef['controls']> {
  const say = (node: string, about: string) => words[node] ?? about;
  return [
    { node: 'Ctl_TowerJett', name: 'Jettison tower', about: say('Ctl_TowerJett', 'Pull ring.'), does: 'tower' },
    {
      node: 'Ctl_CapsuleSep',
      name: 'Separate capsule',
      about: say('Ctl_CapsuleSep', 'Pull ring: fires the clamp ring and the posigrade rockets.'),
      does: 'separate',
    },
    { node: 'Ctl_RetroSeq', name: 'Start retro sequence', about: say('Ctl_RetroSeq', 'Push button.'), does: 'retro' },
    { node: 'Ctl_RetroFire', name: 'Fire retrorockets', about: say('Ctl_RetroFire', 'Guarded push button.'), does: 'retro' },
    { node: 'Ctl_JettRetro', name: 'Jettison retropack', about: say('Ctl_JettRetro', 'Guarded push button.'), does: 'retropack' },
    { node: 'Ctl_PointZeroFiveG', name: '.05 g override', about: say('Ctl_PointZeroFiveG', 'Push button. Not simulated.') },
    { node: 'Ctl_Drogue', name: 'Deploy drogue', about: say('Ctl_Drogue', 'Push button.'), does: 'drogue' },
    { node: 'Ctl_MainDeploy', name: 'Deploy main parachute', about: say('Ctl_MainDeploy', 'Pull ring.'), does: 'main' },
    {
      node: 'Ctl_ReserveDeploy',
      name: 'Deploy reserve parachute',
      about: say('Ctl_ReserveDeploy', 'Pull ring. Not simulated: there is no reserve to deploy.'),
    },
    {
      node: 'Ctl_Abort',
      name: 'Abort handle',
      about: say('Ctl_Abort', 'Twisted, it fires the escape rocket. Click twice: it has a lock.'),
      does: 'abort',
    },
    {
      node: 'Ctl_HandController',
      name: 'Hand controller',
      about: say(
        'Ctl_HandController',
        'Three axes in one hand: fore and aft for pitch, side to side for roll, a twist for yaw. It moves as the keys do.',
      ),
    },
    {
      // The manual extension-retraction handle (SEDR 104, 12-16; SEDR 109-7, 2-19): a ratchet on the periscope's upper
      // housing that drove the cartridge through a clutch when its motor could not. Where the model has it is ours.
      node: 'Ctl_PeriscopeHandle',
      name: 'Periscope ratchet handle',
      about: say(
        'Ctl_PeriscopeHandle',
        'Pulled up and worked, it ratchets the periscope out or in by hand through a clutch, for when its motor will not. ' +
          'Flying the flight yourself, it sends the periscope the other way; it goes back to its programme at the next programmed event.',
      ),
      works: 'periscope',
    },
  ];
}

/** The hand controller as the model has it: how far it tips at full command is estimated; the axes are the node's own (X to his right, Y along the grip, Z toward his head). */
export const MERCURY_STICK: CabinDef['stick'] = {
  node: 'Ctl_HandController',
  throw: 0.23,
  pitch: [1, 0, 0],
  roll: [0, 0, 1],
  yaw: [0, 1, 0],
};
