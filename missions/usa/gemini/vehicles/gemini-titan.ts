import type { Confidence, ModelDef, Motor, Spec, ViewDef } from '../../../../src/types.ts';

/**
 * A Gemini on its Titan, as flight data said once: what is the type's and so the same for every flight that is built
 * on vehicles/gemini_stack.py (the stack's views, its cabin as somewhere to sit, the dimensions McDonnell's and Martin's
 * drawings give, the thrusters). A flight says what was its own: its parts' words, its record, its weights and times.
 * Gemini-Titan 3 was written before this file and says all of it itself (flights/gt-3/flight.ts).
 */

export const IN = 0.0254;
export const LB = 0.45359237;
export const LBF = 4.4482216;
export const NMI = 1852;
export const FT = 0.3048;
export const DEG = Math.PI / 180;

// Where things are round the vehicle, as vehicles/gemini_spacecraft.py and vehicles/titan_ii_glv.py have them: degrees
// about the long axis from the spacecraft's top (the side its hatches are on, the model's +X) toward the crew's right.
// The numbers live there; these are quoted for the views and for how the parts come away.
export const TOP_AZ = 0;
export const LEFT_AZ = -90;
export const RIGHT_AZ = 90;
/** The external conduit that UNITED STATES stands beside on the first stage, and the lettering itself. */
export const CONDUIT_AZ = -45;
export const LETTERS_AZ = -12;
/** A hatch's hinge, round from the top (vehicles/gemini_shell.py `HATCH_OUT`: estimated), and the cabin's half-angle (documented). */
export const HATCH_HINGE_AZ = 62;
export const CABIN_HALF_ANGLE = 20;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
export const along = (az: number, lift: number, by = 1): [number, number, number] => [
  by * Math.cos(az * DEG),
  by * lift,
  -by * Math.sin(az * DEG),
];
/**
 * The line a hatch's hinge lies along, toward the nose, in the viewer's axes: a generator of the cabin's cone at the
 * hinge's angle. `side` is 1 for the pilot's hatch (the crew's right) and -1 for the command pilot's. A hatch opens by
 * turning about it by a positive angle on the right and a negative one on the left.
 */
export const hingeAxis = (side: 1 | -1): [number, number, number] => {
  const t = Math.tan(CABIN_HALF_ANGLE * DEG);
  const az = side * HATCH_HINGE_AZ * DEG;
  const n = Math.hypot(t, 1);
  return [(-t * Math.cos(az)) / n, 1 / n, (t * Math.sin(az)) / n];
};

export const SEDR = 'Project Gemini Familiarization Manual, SEDR 300 vol. 1 (McDonnell, 30 September 1965)';
export const SEDR2 =
  'Project Gemini Familiarization Manual, SEDR 300 vol. 2, Rendezvous and Docking Configurations (McDonnell, 1 July 1966)';
export const CHRONOLOGY = 'Project Gemini: Technology and Operations, a Chronology (NASA SP-4002), Appendix 1, Table A';
export const TITANS = 'On the Shoulders of Titans (NASA SP-4203)';
export const GIV = 'Gemini Program Mission Report, Gemini IV (MSC-G-R-65-3)';
export const GV = 'Gemini Program Mission Report, Gemini V (MSC-G-R-65-4)';
export const LAUNCH_SYSTEMS = 'Gemini Program Launch Systems Final Report (Aerospace, January 1967)';

/** The first stage engines' exit plane below the model's origin (the spacecraft's Z103.44), m: 90 in of adapter and 1,071.278 in of launch vehicle. */
export const BASE = (90 + 1071.278) * IN;
export const REENTRY_MODULE = [
  'NoseFairing',
  'RendezvousRecovery',
  'ReentryControl',
  'Hatches',
  'ScannerFairing',
  'Cabin',
  'CrewStation',
  'HeatShield',
];
export const SPACECRAFT = [...REENTRY_MODULE, 'RetroSection', 'EquipmentSection'];

/** The stack's views; a flight adds its own after them (`more`). Each is of named parts, so it stays on them as the slider takes the vehicle apart. */
export const views = (more: ViewDef[] = []): ViewDef[] => [
  // as the liftoffs were photographed: the lettering toward the eye, the conduit to its left
  { id: 'stack', label: 'Full stack', from: along(LETTERS_AZ - 12, 0.1) },
  { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT, from: along(LEFT_AZ + 30, 0.12) },
  { id: 'reentry', label: 'Re-entry module', nodes: REENTRY_MODULE, from: along(LEFT_AZ + 40, 0.2) },
  { id: 'hatches', label: 'Hatches', nodes: ['Hatches'], from: along(TOP_AZ - 12, 0.45) },
  { id: 'adapter', label: 'Adapter', nodes: ['RetroSection', 'EquipmentSection'], from: along(LEFT_AZ + 25, 0.1) },
  ...more,
  { id: 'stage2', label: 'Second stage', nodes: ['TitanStage2'], from: along(CONDUIT_AZ + 8, 0.1) },
  { id: 'interstage', label: 'Interstage', nodes: ['TitanInterstage'], from: along(CONDUIT_AZ + 20, 0.1) },
  { id: 'lettering', label: 'First stage', nodes: ['TitanStage1'], from: along(LETTERS_AZ - 6, 0.05) },
  { id: 'engines', label: 'Engines', nodes: ['TitanStage1Engine'], from: along(CONDUIT_AZ - 20, -0.6) },
];

/**
 * The three cabin floodlights: one on each side and one at the centre (SEDR 300, p. 3-20); the model's fittings are
 * `Lamp_Left`, `Lamp_Right` and `Lamp_Centre` (vehicles/gemini_cabin.py), their places estimated. Each light is put
 * toward the middle of the cabin from its fitting, so that the wall beside it is not burnt. Colour and strength chosen
 * by eye: estimated. The left one first (the command pilot's side is +Z in the viewer's axes).
 */
export const LIGHTS: NonNullable<ModelDef['lights']> = [
  { position: [0.24, 0.8, 0.3], colour: 0xfff6ea, intensity: 0.55, reach: 3 },
  { position: [0.24, 0.8, -0.3], colour: 0xfff6ea, intensity: 0.55, reach: 3 },
  { position: [0.5, 0.78, 0], colour: 0xfff6ea, intensity: 0.45, reach: 3 },
];

/**
 * The two seats, empty. Each seat's node is where a seated man's eyes come (vehicles/gemini_cabin.py `EYE`: 15 in
 * behind the middle of his window and within 2° of level with it). `open` is when the hatches stood open with the
 * crew aboard, seconds from liftoff: the flight says what it rests on.
 */
export const seats = (open: [number, number]): NonNullable<ModelDef['seats']> => [
  { node: 'Seat_CommandPilot', label: 'the command pilot’s seat', from: 'Hatches', open, egress: ['pad'] },
  { node: 'Seat_Pilot', label: 'the pilot’s seat', from: 'Hatches', open, egress: ['pad'] },
];

/** The floodlights' red bulbs (SEDR 300, p. 3-20: each fixture had one): the colour is estimated, a red that keeps the eyes dark-adapted. */
const RED_LIGHT = 0xff3018;
const NOT_FLOWN = 'Not simulated: this flight is not flown here yet, so it stands as built.';
const DARK = 'Not simulated: this flight is not flown here yet, so it stays dark.';
const instrument = (node: string, name: string, about: string) => ({ node, name, about: `${about} ${NOT_FLOWN}` });
const lamp = (node: string, name: string, about: string) => ({ node, name, about: `${about} ${DARK}` });

/**
 * The crew station as somewhere to sit (types.ts: CabinDef; viewer/cabin.ts), for a ship from spacecraft 4 on: the
 * nodes are the model's (vehicles/gemini_cabin.py, built with `gmt_clock`). Nothing is flown yet, so every instrument
 * stands where it was built and every lamp is dark, and each says so. `radar` is what the range indicator says of
 * this ship's radar; `fairing` when this ship threw off its fairings.
 */
export const cabin = (says: { radar: string; fairing: string; power: string }): NonNullable<ModelDef['cabin']> => ({
  within: ['CrewStation'],
  // the top of a seated man's head is toward the hatches, on +X; the seats' 12° cant is not counted
  overhead: [1, 0, 0],
  instruments: [
    instrument(
      'Gauge_Accelerometer',
      'Longitudinal accelerometer',
      'Load along the ship’s axis, in g, at the top of the command pilot’s panel.',
    ),
    instrument(
      'Gauge_Stage1Fuel',
      'Stage I fuel tank pressure',
      'The Titan’s first stage fuel tank pressure: one of four needles the command pilot watched for a reason to abort.',
    ),
    instrument('Gauge_Stage1Oxidiser', 'Stage I oxidiser tank pressure', 'The first stage oxidiser tank pressure.'),
    instrument('Gauge_Stage2Fuel', 'Stage II fuel tank pressure', 'The second stage fuel tank pressure.'),
    instrument('Gauge_Stage2Oxidiser', 'Stage II oxidiser tank pressure', 'The second stage oxidiser tank pressure.'),
    instrument('Gauge_RangeRate', 'Range and range rate', says.radar),
    instrument('Gauge_RateOfDescent', 'Rate of descent', 'Feet per second on the way down under the parachute.'),
    instrument(
      'Gauge_GmtClockHours',
      'G.m.t. clock, hour hand',
      'The command pilot’s clock, on Greenwich time: added with spacecraft 4, where spacecraft 3 had a blank. Its 24-hour face is as the Gemini IV mission report draws it; its size is taken to be the pilot’s clock’s.',
    ),
    instrument('Gauge_GmtClockMinutes', 'G.m.t. clock, minute hand', 'The command pilot’s clock.'),
    instrument('Gauge_Altimeter', 'Altimeter', 'Barometric height for the landing.'),
    instrument('Gauge_PropellantQuantity', 'Propellant quantity', 'How much manoeuvring propellant is left, per cent.'),
    instrument('Gauge_ClockHours', 'Clock, hour hand', 'The pilot’s clock.'),
    instrument('Gauge_ClockMinutes', 'Clock, minute hand', 'The pilot’s clock.'),
    instrument('Gauge_CabinPressure', 'Cabin pressure', 'On the centre panel: pure oxygen at about 5 psi.'),
    instrument('Gauge_SuitPressure', 'Suit pressure', 'On the centre panel.'),
    instrument('Gauge_EcsOxygen', 'Oxygen quantity', 'The environmental control system’s oxygen.'),
    instrument('Gauge_MainBusAmps1', 'Main bus current', says.power),
  ],
  lamps: [
    lamp(
      'Tele_AbortCP',
      'ABORT (command pilot)',
      'Lit red from the ground or the range: the order to abort. The decision was still the crew’s.',
    ),
    lamp('Tele_AbortP', 'ABORT (pilot)', 'The same lamp on the pilot’s panel.'),
    lamp('Tele_Engine1', 'ENGINE I', 'First stage chamber pressure low.'),
    lamp('Tele_Engine2', 'ENGINE II', 'Second stage chamber pressure low: lit until that engine is up to thrust, and again at its cutoff.'),
    lamp('Tele_AttRate', 'ATT RATE', 'The launch vehicle is turning faster than it should.'),
    lamp('Tele_Guidance', 'GUIDANCE', 'The launch vehicle has gone over to its secondary guidance.'),
    lamp('Tele_JettFairing', 'JETT FAIRING', says.fairing),
    lamp('Tele_SepSpcft', 'SEP SPCFT', 'Pressed to cut the spacecraft from the second stage.'),
    lamp('Tele_ArmAutoRetro', 'ARM AUTO RETRO', 'Lit amber when the retrograde sequence may be armed.'),
    lamp('Tele_ManFireRetro', 'MAN FIRE RETRO', 'Pressed to fire the four retrograde rockets by hand.'),
  ],
  controls: [
    { node: 'Ctl_Abort', name: 'Abort handle', about: 'By the command pilot’s left hand: normal, shutdown, abort.' },
    {
      node: 'Ctl_AttitudeController',
      name: 'Attitude hand controller',
      about: 'Between the seats, for either man: it turns the ship in pitch, roll and yaw.',
    },
    {
      node: 'Ctl_ManeuverController',
      name: 'Manoeuvre hand controller',
      about: 'Under the command pilot’s panel: it thrusts the ship forward, aft, sideways, up and down. Pushed in, it stows.',
    },
    {
      node: 'Ctl_EjectCommandPilot',
      name: 'Ejection ring (command pilot)',
      about: 'The D-ring between the knees. Either man’s fires both seats.',
    },
    { node: 'Ctl_EjectPilot', name: 'Ejection ring (pilot)', about: 'The D-ring between the knees. Either man’s fires both seats.' },
  ],
  // each hatch's window: the middle of its outer pane and the way the pane faces (vehicles/gemini_shell.py: Window),
  // in the viewer's axes; about 14.8 in across
  windows: [
    { at: [0.536, 1.02, 0.466], out: [0.433, 0.819, 0.376], across: 0.376, name: 'Left window' },
    { at: [0.536, 1.02, -0.466], out: [0.433, 0.819, -0.376], across: 0.376, name: 'Right window' },
  ],
  // The three floodlights (`LIGHTS`, in the same order as their fittings here) and the one switch for them the panels
  // have: CENTER LIGHT, at the head of the overhead panel's forward row, RED over OFF over WHT (SEDR 300, p. 3-20 and
  // Figure 3-5 sheet 2, which is spacecraft 3's: assumed for the later ships). It was the centre lamp's alone: each side
  // lamp had a selector and a rheostat of its own on its fixture, which the model's fittings do not have, so here the one
  // switch throws all three (a simplification). At RED each lamp lights in red at a third of its white strength: that
  // each fixture had a red bulb is documented; the red's colour and how bright, estimated.
  lighting: {
    control: 'Ctl_CabinLights',
    name: 'Cabin lights',
    about:
      'CENTER LIGHT, on the overhead panel: RED, OFF, WHT (SEDR 300, p. 3-20). Three floodlights, one each side and one at the centre, each with a white bulb and a red one. On the ship this switch was the centre lamp’s and each side lamp had its own on its fixture; here it throws all three. The red’s colour and brightness are estimated.',
    ways: [
      { says: 'White', lit: [0, 1, 2] },
      { says: 'Off', lit: [] },
      { says: 'Red', lit: [0, 1, 2].map((light) => ({ light, colour: RED_LIGHT, level: 1 / 3 })) },
    ],
    fittings: ['Lamp_Left', 'Lamp_Right', 'Lamp_Centre'],
  },
});

/**
 * The spacecraft's and the launch vehicle's dimensions, which are the type's: McDonnell's Figure 2-3 and Martin's
 * general arrangement. `spacecraft` is how far they can be said of this ship ('documented' where a manual that covers
 * it gives them, 'assumed' where they are another ship's manual's) and `whose` the words that say so.
 */
export const dimensions = (spacecraft: Confidence, whose: string, vehicleFigure: string): Spec[] => [
  {
    group: 'Spacecraft',
    label: 'Length at launch',
    value: 225.84 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `225.84 in, launch configuration: Z13.44 to Z239.28 (${whose}); ${vehicleFigure} has the same two stations for this vehicle; model: 5.736 m`,
  },
  {
    group: 'Spacecraft',
    label: 'Length in orbit',
    value: 219.03 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `219.03 in, orbit configuration (${whose}): without the nose fairing, and without the inch and a half of adapter left on the launch vehicle`,
  },
  {
    group: 'Spacecraft',
    label: 'Diameter at the adapter’s base',
    value: 120 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `120.00 in (${whose}); model: 3.048 m`,
  },
  { group: 'Spacecraft', label: 'Heat shield diameter', value: 90 * IN, unit: 'm', confidence: spacecraft, note: `90.00 in (${whose})` },
  {
    group: 'Spacecraft',
    label: 'Heat shield spherical radius',
    value: 144 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `144.0 in (${whose})`,
  },
  {
    group: 'Spacecraft',
    label: 'Adapter length',
    value: 90 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `90.00 in, Z13.44 to Z103.44, tapering at 10° from 120.00 in to 88.30 in across (${whose})`,
  },
  {
    group: 'Spacecraft',
    label: 'Cabin section length',
    value: 70.53 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `70.53 in, Z103.44 to Z173.97, at 20° (${whose})`,
  },
  {
    group: 'Spacecraft',
    label: 'Re-entry control section',
    value: 18 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `18.00 in long and 38.66 in across (${whose})`,
  },
  {
    group: 'Spacecraft',
    label: 'Rendezvous and recovery section',
    value: 42 * IN,
    unit: 'm',
    confidence: spacecraft,
    note: `42.00 in, Z191.97 to Z233.97, tapering at 7° from Z201.47 (${whose})`,
  },
  {
    group: 'Spacecraft',
    label: 'Window, aft edge above the heat shield’s rim',
    value: (141.3 - 103.44) * IN,
    unit: 'm',
    confidence: 'estimated',
    note: 'Z141.3, where the outer pane meets the skin, 41° round from the top; the opening about 14.8 in across and 8.5 in fore and aft. Read off NASA S65-21090, which is spacecraft 3 on the morning it flew, and taken to be the same on this ship: good to about two inches',
  },
  {
    group: 'Spacecraft',
    label: 'Seat cant, outboard',
    value: 12,
    unit: 'deg',
    confidence: spacecraft,
    note: '12° outboard and 8° forward (SEDR 300 vol. 1, p. 3-3)',
  },
  {
    group: 'Launch vehicle',
    label: 'Height on the pad',
    value: (225.84 + 1071.278) * IN,
    unit: 'm',
    confidence: 'derived',
    note: `1,297.118 in: the spacecraft’s 225.84 in on the launch vehicle’s 1,071.278 in. The same follows from ${vehicleFigure}, which puts the spacecraft’s tip at launch vehicle station 50.985 and the interface at 276.825; model: 32.947 m`,
  },
  {
    group: 'Launch vehicle',
    label: 'Launch vehicle length',
    value: 1071.278 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `1,071.278 in, "89 ft 3.278 in": station 276.825 to station 1348.103 (${LAUNCH_SYSTEMS}, Figure II.C-1, which is the Gemini Launch Vehicle's general arrangement). ${vehicleFigure} has the engines at station 1342.31: not resolved`,
  },
  {
    group: 'Launch vehicle',
    label: 'Diameter',
    value: 120 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `120 in (${LAUNCH_SYSTEMS}, Figure II.C-1)`,
  },
  {
    group: 'Launch vehicle',
    label: 'First stage length',
    value: 848.103 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `848.103 in, from the separation plane at station 500 to the engines’ exit (${LAUNCH_SYSTEMS}, Figure II.C-1)`,
  },
  {
    group: 'Launch vehicle',
    label: 'Second stage forward skirt',
    value: 22.326 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `station 276.825 to 299.151 (${vehicleFigure}; ${LAUNCH_SYSTEMS}, Figure II.C-1). Bare on this vehicle: the insulation GLV-1 to GLV-3 wore there was left off from GLV-4 (${GIV}, 3.2.1.2)`,
  },
];

/** The spacecraft's own rockets and thrusters, which are the type's from spacecraft 4 on (all sixteen OAMS chambers real). */
export const thrusters = (whose: string): Motor[] => [
  {
    name: 'Retrograde rocket',
    count: 4,
    thrustN: 2500 * LBF,
    burnS: 5.5,
    propellant: 'solid',
    kind: 'solid',
    confidence: 'assumed',
    note: `"approximately 2500 pounds of thrust for 5.5 seconds", fired separately (NASA release 65-81, the Gemini-Titan 3 press kit, p. 8); a titanium case "approximately 13 inches in diameter" (SEDR 300 vol. 1, p. 11-71). The type's figures, taken for ${whose}`,
  },
  {
    name: 'OAMS attitude thruster',
    count: 8,
    thrustN: 25 * LBF,
    propellant: 'monomethylhydrazine / nitrogen tetroxide',
    confidence: 'assumed',
    note: `eight of 25 lb (Gemini Midprogram Conference, NASA SP-121, p. 16, whose text is misprinted "95"). The type's figure, taken for ${whose}`,
  },
  {
    name: 'OAMS forward-firing thruster',
    count: 2,
    thrustN: 85 * LBF,
    propellant: 'monomethylhydrazine / nitrogen tetroxide',
    confidence: 'assumed',
    note: `two of 85 lb (NASA SP-121, p. 16). The type's figure, taken for ${whose}`,
  },
  {
    name: 'OAMS aft-firing and lateral thruster',
    count: 6,
    thrustN: 100 * LBF,
    propellant: 'monomethylhydrazine / nitrogen tetroxide',
    confidence: 'assumed',
    note: `two of 100 lb at the foot, firing aft, and four that translate sideways, up and down, real ones from spacecraft 4 (NASA SP-121, p. 16; ${GIV}, 3.1.2.7). The type's figure, taken for ${whose}`,
  },
  {
    name: 'Re-entry control thruster',
    count: 16,
    thrustN: 25 * LBF,
    propellant: 'monomethylhydrazine / nitrogen tetroxide',
    confidence: 'assumed',
    note: `sixteen thrust chamber assemblies of 25 lb in two rings (SEDR 300 vol. 1, Section VIII, pp. 8-281 to 8-284; ${GIV}, Figure 3-12). The type's figure, taken for ${whose}`,
  },
];
