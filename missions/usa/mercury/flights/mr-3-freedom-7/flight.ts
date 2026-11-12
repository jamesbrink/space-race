import type {
  AbortRecord,
  Action,
  Body,
  Curve,
  Flight,
  FlightCheck,
  Heating,
  Keyframe,
  MassPart,
  Measure,
  ModelDef,
  Move,
  Part,
  RcsSupply,
  Signal,
  Thruster,
  Trajectory,
} from '../../../../../src/types';
import { LC5 } from '../../sites/lc-5.ts';

const IN = 0.0254;
const LBF = 4.4482216;
const LB = 0.45359237;

const vehicleParts: Part[] = [
  {
    node: 'EscapeTower',
    group: 'Spacecraft',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing booster.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for under a ' +
      'second through three nozzles canted 19° clear of the capsule. Unused, it is dead weight: at booster cutoff ' +
      'the clamp ring lets go and the tower is fired clear. On MR-3 that was T+2:22.',
    facts: [
      ['Escape motor', '52,000 lbf for 0.78 s'],
      ['Nozzles', '3, canted 19°'],
      ['Jettison motor', '800 lbf for 1.5 s, 3 nozzles'],
      ['Pylon', 'about 10 ft of 4130 steel tube'],
      ['Jettisoned', 'T+2:22'],
    ],
    explode: [0, 12.6, 0],
    order: 0,
  },
  {
    node: 'AntennaCanister',
    group: 'Spacecraft',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners, drogue parachute.',
    detail:
      'The pale band is an 8-inch dielectric window: the metal above and below it are the two halves of a bicone ' +
      'antenna that handles voice, telemetry and command. Two infrared scanners find the horizon in pitch and ' +
      'roll. The flap on top turns the capsule blunt-end-first if it ever enters nose-first.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Antenna', 'bicone, voice and telemetry'],
      ['Scanners', '2 infrared, pitch and roll'],
      ['Jettisoned', 'at main parachute deploy'],
    ],
    explode: [0, 11.6, 0],
    order: 1,
  },
  {
    node: 'RecoveryCompartment',
    group: 'Spacecraft',
    name: 'Recovery compartment',
    summary: 'Main and reserve parachutes; pitch and yaw thrusters.',
    detail:
      'A 32-inch cylinder holding a 63-foot ring-sail main parachute and its reserve, skinned in thick beryllium ' +
      'shingles that soak up heat where the cone’s thin ones radiate it. Pitch and yaw thrusters sit at its top, ' +
      'as far from the centre of mass as the vehicle allows.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium shingles, 0.22 in'],
      ['Main parachute', '63 ft ring-sail, plus reserve'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
    explode: [0, 10.8, 0],
    order: 2,
  },
  {
    node: 'Hatch',
    group: 'Spacecraft',
    name: 'Side hatch',
    summary: 'Held by latches, with a handle inside and out.',
    detail:
      'The first design bolted the hatch on with 70 bolts, which would have left the pilot sealed in until ' +
      'someone came. Spacecraft No. 7 flew a heavier hatch held by mechanical latches, with a release handle ' +
      'inside and out. It was lost in the sea during recovery. The explosive hatch, lighter at 23 lb, arrived ' +
      'one flight later on Liberty Bell 7.',
    facts: [
      ['Type', 'mechanical latch'],
      ['Latch mechanism', '69 lb (31 kg)'],
      ['Release', 'handles inside and outside'],
      ['Explosive hatch', '23 lb, from MR-4'],
    ],
    explode: [1.15, 9.9, 0],
    order: 3,
  },
  {
    node: 'Afterbody',
    group: 'Spacecraft',
    name: 'Conical afterbody',
    summary: 'René 41 shingles over the pressure vessel.',
    detail:
      'Corrugated nickel-alloy shingles, 0.016 inch thick and oxidised blue-black, each fastened through ' +
      'oversized holes so it can grow when hot. No. 7 has two 10-inch portholes instead of the later overhead ' +
      'window, so the periscope was Shepard’s main view outside.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Portholes', '2, 10 in diameter'],
      ['Thrusters', 'roll: 6 lbf and 1 lbf'],
    ],
    explode: [0, 9.9, 0],
    order: 3,
  },
  {
    node: 'CrewCabin',
    group: 'Spacecraft',
    inside: true,
    name: 'Crew cabin',
    summary: 'Where the pilot lies: couch, panel, periscope, and no window ahead.',
    detail:
      'A cone of two thin titanium skins holding pure oxygen at 5.1 psi. The pilot lies on a fibreglass couch ' +
      'moulded to his body, back to the heat shield, so that launch and entry loads both push him into it. ' +
      'In front of him is No. 7’s own panel: three attitude needles where a later craft has a ball, a clock that ' +
      'counts seconds from launch, a column of sequence lights each with a ring or a button to do the thing by hand, ' +
      'and in the middle the periscope’s 8-inch screen, his main view outside. Two portholes, high at his left and ' +
      'low at his right, are all the windows there are. Fly the flight and sit in it (C, on board): the needles read ' +
      'the flight, the rings work, and a click on the periscope or a porthole looks out. ' +
      'Behind the heat shield a fabric landing bag drops four feet before splashdown to cushion the impact.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5.1 psi nominal'],
      ['Couch', 'fibreglass, moulded to the pilot'],
      ['Panel', 'as the Postlaunch Report’s Figure 3.1-2; 27 in wide (derived)'],
      ['Periscope', '8 in screen; 172° field at low power'],
      ['Windows', 'two 10 in portholes'],
    ],
    explode: [0, 8.9, 0],
    order: 4,
  },
  {
    node: 'HeatShield',
    inside: true,
    group: 'Spacecraft',
    name: 'Heat shield',
    summary: 'Beryllium heat sink, 74.5 inches across.',
    detail:
      'A suborbital entry is short enough that the Redstone flights used a solid beryllium shield that soaks up ' +
      'the heat. The orbital flights replaced it with an ablative fibreglass-and-resin shield that chars away.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Radius of curvature', '80 in'],
      ['Material', 'beryllium heat sink, about 1 in'],
      ['Orbital flights', 'ablative fibreglass and resin'],
    ],
    explode: [0, 8.3, 0],
    order: 5,
  },
  {
    node: 'Retropack',
    inside: true,
    group: 'Spacecraft',
    name: 'Retropack',
    summary: 'Three retrograde and three posigrade motors.',
    detail:
      'The small posigrade motors push the capsule away from the spent Redstone. The three large motors are the ' +
      'braking burn that brings an orbital flight home; MR-3 was coming down anyway and fired them as a test. ' +
      'Three straps hold the pack against the shield, joined under its centre by a single explosive bolt.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', '5 s apart, from T+5:14'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Jettisoned', 'T+6:14'],
    ],
    explode: [0, 7.6, 0],
    order: 6,
  },
  {
    node: 'RedstoneAdapter',
    group: 'Launch vehicle',
    name: 'Spacecraft adapter',
    summary: 'Joins a 74.5-inch capsule to a 70-inch booster.',
    detail:
      'A short flared ring with the retropack nested inside it. A Marman clamp at its top rim holds the capsule; ' +
      'at separation explosive bolts open the clamp and the posigrade motors push the capsule clear, ten seconds ' +
      'after the engine has shut down.',
    facts: [
      ['Diameter', '70 in to 73.2 in'],
      ['Clamp', 'Marman ring, explosive bolts'],
      ['Separation', 'T+2:32, 74 km up'],
    ],
    explode: [0, 6.8, 0],
    order: 7,
  },
  {
    node: 'RedstoneAftUnit',
    group: 'Launch vehicle',
    name: 'Aft unit',
    summary: 'Top of the booster: autopilot, abort sensing, ballast.',
    detail:
      'On the Redstone missile this section flew on with the warhead. Here it stays bolted to the tanks and ' +
      'carries the LEV-3 autopilot and the abort sensing system, which watches attitude, rates, chamber pressure ' +
      'and electrical power and fires the escape tower without asking anyone. Above the instruments sit 487 lb ' +
      'of steel ballast, restoring the stability the long nose took away, and some 340 lb of lead-loaded ' +
      'compound to damp a vibration found on earlier flights.',
    facts: [
      ['Length', '139.64 in, plus a 7.08 in stretch'],
      ['Instrument compartment', '53.66 in, pressurised'],
      ['Autopilot', 'LEV-3'],
      ['Skin', '0.090 in aluminium'],
    ],
    explode: [0, 5.8, 0],
    order: 8,
  },
  {
    node: 'RedstoneCenterUnit',
    group: 'Launch vehicle',
    name: 'Centre unit',
    summary: 'Alcohol above, liquid oxygen below.',
    detail:
      'The tank walls are the airframe. They are the Jupiter-C’s lengthened tanks, which stretched the burn by ' +
      'twenty seconds to 143.5. The fuel is ethyl alcohol cut with water: less energetic than the Jupiter-C’s ' +
      'Hydyne, and far less toxic to a pilot sitting on top of it. The alcohol’s feed line runs down through ' +
      'the middle of the oxygen tank.',
    facts: [
      ['Length', '37.50 ft (11.43 m)'],
      ['Alcohol tank', '18.8 ft · 3,348 US gal'],
      ['Oxygen tank', '16.83 ft · 3,072 US gal'],
      ['Skin', '0.063 in and 0.080 in aluminium'],
      ['Fuel', 'ethyl alcohol, cut with water'],
    ],
    explode: [0, 4.6, 0],
    order: 9,
  },
  {
    node: 'RedstoneTailUnit',
    group: 'Launch vehicle',
    name: 'Tail unit',
    summary: 'Four fins, four air rudders, the engine bay.',
    detail:
      'The fins keep the vehicle stable; the small rudders at their tips steer it while there is air to push ' +
      'against. The black-and-white paint, here and striped round the aft unit, is a roll pattern: tracking ' +
      'cameras read the vehicle’s roll angle from it.',
    facts: [
      ['Length', '9.27 ft (2.83 m)'],
      ['Fins', '4, with air rudders (±11°)'],
      ['Skin', '0.125 in aluminium'],
      ['Attached by', '12 fasteners in tension'],
    ],
    explode: [0, 3.4, 0],
    order: 10,
  },
  {
    node: 'RedstoneEngine',
    group: 'Launch vehicle',
    inside: true,
    name: 'A-7 engine',
    summary: '78,000 lbf, steered by vanes in its own exhaust.',
    detail:
      'Rocketdyne’s A-7, a direct descendant of the V-2’s engine: a single fixed chamber fed by a turbopump that ' +
      'runs on steam from decomposed hydrogen peroxide. It cannot swivel, so four graphite vanes sit in the ' +
      'exhaust and deflect it.',
    facts: [
      ['Thrust', '78,000 lbf (347 kN) at sea level'],
      ['Burn', '143.5 s nominal; 141.8 s on MR-3'],
      ['Specific impulse', '214.8 s measured on MR-3'],
      ['Steering', '4 carbon jet vanes, ±27.5°'],
      ['Turbopump', 'hydrogen-peroxide steam'],
    ],
    explode: [0, 0, 0],
    order: 11,
  },
];

/** Height of the pedestal's ring, where the fins rest: 6 ft. */
/** Where liftoff falls on the pad's slider (see T, with the pad's parts). */
const LIFTOFF = 0.8;
const PEDESTAL = 5.5 * 0.3048; // the launcher's support level (lc5/site.py: LAUNCHER_TOP)
/** The vehicle's origin is the capsule's plane of maximum diameter, 716.0 in above the fins. */
const VEHICLE_Y = PEDESTAL + 716.0 * IN;

/**
 * Where the pilot stands in every scene: on open concrete seven metres from the launcher, on the
 * side opposite the hatch, with nothing between him and a camera in front of him. (Where he
 * actually stood is not the point: he walked from the transfer van to the structure's lift.)
 */
const PILOT_FACING = -Math.PI / 2; // toward -X, the sunlit side that morning, his back to the vehicle
const PILOT = { position: [-7, 0, -0.9] as [number, number, number], rotationY: PILOT_FACING };
/** A direction to look at the pilot from: in front of him, turned `aside` radians, `lift` up. */
const facingPilot = (lift: number, aside = 0.12): [number, number, number] => [
  Math.sin(PILOT_FACING + aside),
  lift,
  Math.cos(PILOT_FACING + aside),
];

/** The spacecraft without its tower. */
const CAPSULE = ['AntennaCanister', 'RecoveryCompartment', 'Hatch', 'Afterbody', 'CrewCabin', 'HeatShield', 'Retropack'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/mercury/mr-3-freedom-7/vehicle.glb',
  scale: '25.41 m tall · spacecraft 7.91 m · to scale',
  backdrop: 'cape-canaveral',
  slider: ['Assembled', 'Exploded'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts: vehicleParts,
  position: [0, VEHICLE_Y, 0],
  // The two cabin floodlights: "on full white light" in flight (Postlaunch Report, p. 76). How many No. 7 had and where is
  // not in anything read: the model has two fittings above and either side of the pilot's head (the orbital capsule's
  // arrangement, SEDR 104, 10-19). Each light is put toward the middle of the cabin, not at its fitting: a bare point of
  // light at the wall burns the wall beside it, where a floodlight's reflector spreads it (for the same reason the
  // viewer lets a cabin's light fall off with distance, not its square: cabin.ts). Strength chosen by eye.
  lights: [
    { position: [0.15, 0.55, 0.28], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [-0.15, 0.55, 0.28], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
  ],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack' },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'] },
    { id: 'capsule', label: 'Capsule', nodes: CAPSULE },
    { id: 'engine', label: 'Engine', nodes: ['RedstoneTailUnit', 'RedstoneEngine'] },
  ],
  // the pad as it was at liftoff: structure at its launch position, masts down, the cab lowered
  with: [{ model: 'pad', at: 0 }],
};

/**
 * The pad's slider is the morning of 5 May 1961, from the pilot going aboard to the pad standing
 * empty. These are the positions on it (0 to 1) at which things happen; the motions below are
 * timed against them. Times are from TM X-53107's countdown and the MR-3 reports; how long each
 * motion takes on the slider is ours.
 */
const T = {
  platforms: 0.0, // T-85 to T-60: the work platforms part, two halves each, so the structure can leave
  rollback: 0.13, // T-55 (06:37 EST): the structure rolls to the edge of the pad
  cabIn: 0.33, // the cherry picker's cab comes to the hatch
  launchPosition: 0.48, // T-8:45: the structure rolls on to its launch position
  cabAway: 0.58, // T-4 or T-2:30: the cab is lowered "away and down" by remote control
  umbilical: 0.72, // T-35 s: the capsule's mast is pulled over by its bungee
  boom: 0.76, // about T-14 s: "boom drop"
  liftoff: LIFTOFF, // 09:34 EST
  stow: 0.82, // afterwards (not documented): the tower is folded down onto the truck
  drive: 0.91, // and driven off
};
/** Seconds from liftoff (09:34:13 EST) of a time on the Cape's clocks that morning. */
const est = (hours: number, minutes: number): number => (hours * 60 + minutes) * 60 - (9 * 3600 + 34 * 60 + 13);
const MIN = 60;
const GANTRY_REMOVED = est(6, 37);
/** The structure stands at the edge of the pad and the pilot can be seen in his window: what the crew section asks of the pad. */
const ROLLED_BACK = GANTRY_REMOVED + 5 * MIN;
/**
 * The couch, boarded on foot through the hatch from the white room: from the start of insertion
 * (05:20 EST, documented, as in the pad's sequence) until the structure and its white room rolled
 * back (06:37, documented). When the hatch was closed within that is not recorded here, so the
 * window ends at the last moment there was a way to the hatch at all. `Seat_Pilot` is the model's
 * own node (vehicles/mercury_cabin.py): at the seated figure's eyes, looking at the panel between
 * the clock and the periscope, the top of his head overhead. It is also where the camera sits on
 * board, and there his own helmet and face are not drawn: he sees his chest, arms, knees and hands.
 */
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
vehicle.seats = [
  {
    node: 'Seat_Pilot',
    label: 'the couch',
    from: 'Hatch',
    open: [est(5, 20), GANTRY_REMOVED],
    hide: HELMET.map((mesh) => `CrewCabin_Pilot_Helmet_${mesh}`),
    // there is one Shepard: the figure on the pad apron is not drawn while he is in the couch
    figure: 'crew',
    // the hatch could not be opened from inside in flight and the suit was not made for it: the pad only
    egress: ['pad'],
  },
];

/**
 * The cabin as somewhere to fly from (types.ts: CabinDef; viewer/cabin.ts). The nodes are the model's
 * (vehicles/mercury_cabin.py), each needle with its scale in its own extras; this says what each reads.
 * The layout is the Postlaunch Report's Figure 3.1-2; the faces are as the flown capsule's read today.
 */
const NOT_SIMULATED = 'Not simulated: the needle stands where its face was drawn.';
const FIG = 'Postlaunch Report, Figure 3.1-2';
const sequenceLamp = (node: string, name: string, shows: Signal | undefined, about: string) => ({
  node: `Tele_${node}`,
  name,
  about,
  colour: 0x58ff8a,
  ...(shows ? { shows } : {}),
});
vehicle.cabin = {
  within: ['CrewCabin'],
  // a head in a helmet fixed to the suit, and the eyes' own turn: estimated, nothing read gives it. Down is from a gaze
  // that already rests 40 degrees toward his feet: further, and he is looking into his own collar
  head: { side: 1.75, up: 0.95, down: 0.6 },
  instruments: [
    {
      node: 'Gauge_Altimeter',
      name: 'Altimeter',
      about: 'Thousands of feet, to 100: above that it is on its stop. MAIN at 10, SNORKEL at 20.',
      reads: 'altitude',
      per: 304.8,
    },
    {
      node: 'Gauge_DescentRate',
      name: 'Rate of descent',
      about: 'Feet a second downward. Shepard read "about 35 ft/sec" on it under the main parachute.',
      reads: 'descent',
      per: 0.3048,
    },
    {
      node: 'Gauge_Accelerometer',
      name: 'Longitudinal accelerometer',
      about: 'G units along the capsule, -9 to +12: 6 at burnout and 11 coming back in.',
      reads: 'g',
    },
    {
      node: 'Gauge_Roll',
      name: 'Roll attitude',
      about: 'One of three needles where a later craft has a ball. Degrees from wings level.',
      reads: 'roll',
    },
    {
      node: 'Gauge_Pitch',
      name: 'Pitch attitude',
      about: 'Degrees the small end is above the horizon. RETRO marks the 34 degrees held to fire the retrorockets.',
      reads: 'pitch',
    },
    { node: 'Gauge_Yaw', name: 'Yaw attitude', about: 'Degrees the small end is off the line flown.', reads: 'yaw' },
    {
      node: 'Gauge_RollRate',
      name: 'Roll rate',
      about: 'The rate needles in the middle square. Their full travel is taken as 6 degrees a second: estimated.',
      reads: 'rollRate',
    },
    { node: 'Gauge_PitchRate', name: 'Pitch rate', about: 'Degrees a second, the bar that rises and falls.', reads: 'pitchRate' },
    { node: 'Gauge_YawRate', name: 'Yaw rate', about: 'Degrees a second.', reads: 'yawRate' },
    {
      node: 'Gauge_ClockHour',
      name: 'Clock',
      about: 'A twelve-hour watch, here on Cape time: the Redstone flights had no time-to-retrograde counter.',
      reads: 'timeOfDay',
    },
    { node: 'Gauge_ClockMinute', name: 'Clock', about: 'Minutes.', reads: 'timeOfDay' },
    { node: 'Gauge_ClockSecond', name: 'Clock', about: 'Seconds.', reads: 'timeOfDay' },
    ...[0, 1, 2, 3, 4].map((place) => ({
      node: `Gauge_Counter${place}`,
      name: 'Seconds from launch',
      about: 'Started by the lift-off signal, or by the TIME ZERO button if that failed.',
      reads: 'elapsed' as const,
    })),
    {
      node: 'Gauge_FuelAuto',
      name: 'Control fuel, automatic',
      about: 'Hydrogen peroxide left for the automatic jets, percent of 32 lb.',
      reads: 'supply0',
      per: 0.01,
    },
    {
      node: 'Gauge_FuelManual',
      name: 'Control fuel, manual',
      about: 'Hydrogen peroxide left for the hand controller’s own jets, percent of 23 lb.',
      reads: 'supply1',
      per: 0.01,
    },
    { node: 'Gauge_CabinPressure', name: 'Cabin pressure', about: `Pounds a square inch. ${NOT_SIMULATED}` },
    { node: 'Gauge_CabinAir', name: 'Cabin air temperature', about: `Degrees Fahrenheit. ${NOT_SIMULATED}` },
    {
      node: 'Gauge_Humidity',
      name: 'Cabin humidity',
      about: `Listed among what was aboard (Postlaunch Report, Figure 10.1-1); its face is ours. ${NOT_SIMULATED}`,
    },
    {
      node: 'Gauge_Coolant',
      name: 'Coolant quantity',
      about: `Water for the suit and cabin heat exchangers, percent left. ${NOT_SIMULATED}`,
    },
    { node: 'Gauge_Oxygen', name: 'Oxygen quantity', about: `Percent left, with the emergency supply’s sector. ${NOT_SIMULATED}` },
    { node: 'Gauge_DCVolts', name: 'D.C. volts', about: `Whichever battery the selector below is on. ${NOT_SIMULATED}` },
    { node: 'Gauge_DCAmps', name: 'D.C. amps', about: NOT_SIMULATED },
    { node: 'Gauge_ACVolts', name: 'A.C. volts', about: `The fans’ or the control system’s inverter. ${NOT_SIMULATED}` },
  ],
  lamps: [
    // "A green light will show that the function occurred and a red light will indicate some failure" (Results of the First U.S. Manned Suborbital Space Flight, p. 23)
    sequenceLamp('TowerJett', 'Tower jettison', 'tower', 'Green when the escape tower has gone. The ring beside it does it by hand.'),
    sequenceLamp('CapsuleSep', 'Capsule separation', 'separated', 'Green when the spacecraft has left the booster.'),
    sequenceLamp('RetroSeq', 'Start retro sequence', 'retro', 'Green when the retrorockets’ sequence has begun.'),
    sequenceLamp(
      'RetroAtt',
      'In retro attitude',
      undefined,
      'Whether the gyros have the capsule at 34 degrees for retrofire. Not simulated: it stays dark.',
    ),
    sequenceLamp('RetroFire', 'Retro fire', 'retro', 'Green when the first retrorocket has lit.'),
    sequenceLamp('JettRetro', 'Jettison retropack', 'retropack', 'Green when the pack has been dropped.'),
    sequenceLamp('PointZeroFiveG', '.05 g switch', 'entry', 'Green when the air is first felt coming down: a twentieth of a g.'),
    sequenceLamp('Drogue', 'Drogue', 'drogue', 'Green when the drogue parachute is out, at 21,000 ft.'),
    sequenceLamp('MainDeploy', 'Main deploy', 'main', 'Green when the main parachute is out, at 10,000 ft.'),
    sequenceLamp('ReserveDeploy', 'Reserve deploy', undefined, 'The reserve parachute: not simulated, it stays dark.'),
    sequenceLamp('Ready', 'Ready', 'ready', 'Lit on the pad once the capsule is ready for launch.'),
    {
      node: 'Tele_Mayday',
      name: 'Mayday',
      about: '"Warns the astronaut of an abort" (Results of the First U.S. Manned Suborbital Space Flight, p. 24).',
      shows: 'abort',
      colour: 0xff4a36,
    },
    { node: 'Tele_Recording', name: 'Recording', about: 'The onboard tape recorder. Not simulated: it stays dark.' },
    { node: 'Tele_OxygenWarning', name: 'Oxygen warning', about: 'Not simulated: it stays dark.' },
    { node: 'Tele_StandbyDC', name: 'Standby D.C. auto', about: 'Not simulated: it stays dark.' },
    { node: 'Tele_StandbyAC', name: 'Standby A.C. auto', about: 'Not simulated: it stays dark.' },
    {
      node: 'Tele_O2EmergFlow',
      name: 'O2 emergency flow',
      about: `The one light on its plate: the two water lights the figure draws beside it were not aboard (${FIG}; Figure 10.1-1).`,
    },
    { node: 'Tele_GroundComm', name: 'Ground command', about: 'Not simulated: it stays dark.' },
    { node: 'Tele_HeatersOn', name: 'Retro heaters on', about: 'Not simulated: it stays dark.' },
    { node: 'Tele_RetroCold', name: 'Retro rockets cold', about: 'Not simulated: it stays dark.' },
    { node: 'Tele_LandingBag', name: 'Landing bag', about: 'Not simulated: it stays dark.' },
  ],
  controls: [
    {
      node: 'Ctl_TowerJett',
      name: 'Jettison tower',
      about: 'Pull ring. Found pulled out after the flight (Postlaunch Report, p. 98).',
      does: 'tower',
    },
    {
      node: 'Ctl_CapsuleSep',
      name: 'Separate capsule',
      about: 'Pull ring: fires the clamp ring and the posigrade rockets.',
      does: 'separate',
    },
    { node: 'Ctl_RetroSeq', name: 'Start retro sequence', about: 'Push button.', does: 'retro' },
    {
      node: 'Ctl_RetroFire',
      name: 'Fire retrorockets',
      about: 'Guarded push button. Shepard fired them himself as a check; here the guard is off.',
      does: 'retro',
    },
    { node: 'Ctl_JettRetro', name: 'Jettison retropack', about: 'Guarded push button.', does: 'retropack' },
    { node: 'Ctl_PointZeroFiveG', name: '.05 g override', about: 'Push button. Not simulated.' },
    { node: 'Ctl_Drogue', name: 'Deploy drogue', about: 'Push button.', does: 'drogue' },
    { node: 'Ctl_MainDeploy', name: 'Deploy main parachute', about: 'Pull ring.', does: 'main' },
    { node: 'Ctl_ReserveDeploy', name: 'Deploy reserve parachute', about: 'Pull ring. Not simulated: there is no reserve to deploy.' },
    { node: 'Ctl_Abort', name: 'Abort handle', about: 'Twisted, it fires the escape rocket. Click twice: it has a lock.', does: 'abort' },
    {
      node: 'Ctl_HandController',
      name: 'Hand controller',
      about: 'Three axes in one hand: fore and aft for pitch, side to side for roll, a twist for yaw. It moves as the keys do.',
    },
  ],
  // the two portholes as light: where the model has them (model/vehicle.py PORTHOLES), 9.2 in of glass each
  windows: [
    { at: [0.715, 0.33, -0.413], out: [0.814, 0.342, -0.47], across: 0.234 },
    { at: [-0.33, 1.016, 0.472], out: [-0.539, 0.342, 0.77], across: 0.234 },
  ],
  // how far it tips at full command is estimated; the axes are the node's own (X to his right, Y along the grip, Z toward his head)
  stick: { node: 'Ctl_HandController', throw: 0.23, pitch: [1, 0, 0], roll: [0, 0, 1], yaw: [0, 1, 0] },
  periscope: {
    screen: 'Periscope_Screen',
    name: 'Periscope',
    about:
      'An 8 in screen of the Earth under the capsule: with no window ahead, Shepard’s main view outside. Click to look into it, and again for high power.',
    // the objective's cartridge stands out of the cone at the pilot's feet (station 13, estimated from the flown capsule)
    at: [0, 0.382, -0.969],
    // toward the Earth with the small end 14.5 degrees below the horizon (SEDR 104 Figure 12-3; NASA SP-45 p. 282, "-14 degrees": both the orbital capsule's)
    axis: [0, Math.sin((14.5 * Math.PI) / 180), -Math.cos((14.5 * Math.PI) / 180)],
    // the top of the picture is toward the small end: estimated, nothing read says which way up the display was
    up: [0, 1, 0],
    top: [0, 0, 1],
    // low power: SP-45 p. 282, "172 degrees". High power: Hammack and Heberlig p. 5, 80 nautical miles of ground from 100 up, which is 43.6 degrees: derived
    fields: [172, 43.6],
  },
};
const TMX = 'NASA TM X-53107, section 7.5, countdown pp. 7-25 to 7-33';
const NOT_RECORDED = 'not recorded: how long the motion took is ours, from its distance at a walking pace';
const HOLDS = 'Postlaunch Report for Mercury-Redstone No. 3, section 10.2';
const AFTER_HOLDS = `the count was held once more after this, for one minute at T-2 (${HOLDS}), so it was a minute longer before liftoff than the count says`;
/**
 * The morning on the clock: when each stop on the pad's slider (T, above) happened, in seconds
 * from liftoff. The count did not run straight: after the gantry's removal at T-55 it was held a
 * minute at T-30, 86 minutes at T-15 and recycled to T-35, 17 minutes at T-15 again and a minute at
 * T-2 (Postlaunch Report, section 10.2). So a time in the count is a time before liftoff only
 * once the holds after it are added: the events of the last two minutes are fixed, those between
 * T-15 and T-2 are a minute earlier than they read, and the reports give 05:20 and 06:37 by the
 * wall clock. How long each motion took is nowhere recorded. sites/lc-5.md, "Where things stood".
 */
const MORNING: Keyframe[] = [
  {
    at: est(5, 20),
    slider: T.platforms,
    event: 'Pilot aboard: insertion begun from the white room',
    confidence: 'documented',
    source: 'Results of the First U.S. Manned Suborbital Space Flight, p. 77; Postlaunch Report timeline: 05:20 EST',
  },
  {
    at: GANTRY_REMOVED - 37 * MIN,
    slider: T.platforms,
    event: 'T-85: the work platforms begin to open',
    confidence: 'estimated',
    source: `${TMX}: T-85 to T-60 in the MR-4 standard count; placed 30 minutes of count and the 7 minute hold at T-80 (${HOLDS}) before the gantry's removal at T-55`,
  },
  {
    at: GANTRY_REMOVED - 5 * MIN,
    slider: T.platforms + 0.125,
    event: 'T-60: the platforms are open',
    confidence: 'estimated',
    source: `${TMX}: placed 5 minutes before the gantry's removal, the same way`,
  },
  {
    at: GANTRY_REMOVED,
    slider: T.rollback,
    event: 'Gantry removed: the structure starts for the edge of the pad',
    confidence: 'documented',
    source: 'Results, p. 77: 06:37 EST; Postlaunch Report 7.1: "gantry removal at -55 minutes"',
  },
  {
    at: ROLLED_BACK,
    slider: T.cabIn - 0.01,
    event: 'The structure stands at the edge of the pad',
    confidence: 'estimated',
    source: NOT_RECORDED,
  },
  {
    at: ROLLED_BACK + 0.5 * MIN,
    slider: T.cabIn,
    event: 'The cherry picker’s cab starts for the hatch',
    confidence: 'estimated',
    source: `${TMX}, p. 7-29: once the structure had gone; the minute is ours`,
  },
  { at: ROLLED_BACK + 2.5 * MIN, slider: T.cabIn + 0.09, event: 'The cab is at the hatch', confidence: 'estimated', source: NOT_RECORDED },
  {
    at: -(8 * MIN + 45) - 1 * MIN,
    slider: T.launchPosition,
    event: 'T-8:45: the structure is driven on to its launch position',
    confidence: 'derived',
    source: `${TMX}, p. 7-32 (Hammack: T-9): ${AFTER_HOLDS}`,
  },
  {
    at: -(6 * MIN + 45) - 1 * MIN,
    slider: T.cabAway - 0.02,
    event: 'The structure is at its launch position',
    confidence: 'estimated',
    source: NOT_RECORDED,
  },
  {
    at: -(2 * MIN + 30) - 1 * MIN,
    slider: T.cabAway,
    event: 'T-2:30: the cab is lowered away and down',
    confidence: 'derived',
    source: `${TMX}, p. 7-33, and Hammack (7.3.3.1 has T-4): ${AFTER_HOLDS}`,
  },
  { at: -(1 * MIN + 30) - 1 * MIN, slider: T.cabAway + 0.12, event: 'The cab is down', confidence: 'estimated', source: NOT_RECORDED },
  {
    at: -35,
    slider: T.umbilical,
    event: 'T-35 s: the capsule umbilical is dropped',
    confidence: 'derived',
    source: `${TMX}, p. 7-33: in the count, and nothing was held after T-2 (${HOLDS})`,
  },
  {
    at: -33,
    slider: T.umbilical + 0.035,
    event: 'The capsule mast is down',
    confidence: 'estimated',
    source: 'a mast pulled over by a bungee falls in a second or two',
  },
  {
    at: -14,
    slider: T.boom,
    event: 'T-14 s: boom drop',
    confidence: 'derived',
    source: `${TMX}, p. 7-33 ("about"); Hammack p. 21: in the count, and nothing was held after T-2 (${HOLDS})`,
  },
  { at: -12, slider: T.boom + 0.035, event: 'The booster mast is down', confidence: 'estimated', source: 'as the capsule mast' },
  {
    at: 0,
    slider: T.liftoff,
    event: 'Liftoff',
    confidence: 'documented',
    source: 'Postlaunch Report for Mercury-Redstone No. 3: 09:34:13 EST',
  },
  {
    at: 10 * MIN,
    slider: T.stow,
    event: 'The cherry picker is folded down',
    confidence: 'estimated',
    source: 'not documented: when the pad was cleared afterwards is ours',
  },
  { at: 13 * MIN, slider: T.drive, event: 'It drives off', confidence: 'estimated', source: 'not documented, as above' },
  {
    at: 13.5 * MIN,
    slider: 1,
    event: 'The pad is clear',
    confidence: 'estimated',
    source: 'not documented, as above; half a minute to cross the apron',
  },
];
const DEG = Math.PI / 180;
const X: [number, number, number] = [1, 0, 0];
const Z: [number, number, number] = [0, 0, 1];
/** A hinged piece turning `degrees` about `axis` between two positions on the slider. */
const swing = (node: string, axis: [number, number, number], degrees: number, from: number, to: number): Move => ({
  kind: 'swing',
  node,
  axis,
  angle: degrees * DEG,
  from,
  to,
});
/** A pose held from the start: the piece is built somewhere else and stands here until it moves. */
const held = (node: string, axis: [number, number, number], degrees: number): Move => swing(node, axis, degrees, -1, -0.5);
const WHEEL_R = 0.457; // the structure's rail wheels
const ROLL = [33.53, 19.2]; // metres: to the edge of the pad, then on to the launch position

/** A door leaf on its own hinged node, opened and shut on foot. `degrees` is its `swing` in the model: about the vertical, anticlockwise from above. */
const doorAction = (id: string, node: string, degrees: number): Action => ({
  id,
  label: 'Open',
  on: node,
  do: { kind: 'toggle', moves: [swing(node, [0, 1, 0], degrees, 0, 1)], back: 'Close' },
});

const padParts: Part[] = [
  {
    node: 'ServiceStructure',
    name: 'Service structure',
    summary: 'The gantry: round the rocket until T−55 minutes, then rolled back.',
    detail:
      'A Noble Company "reclining single-mast" stand, modelled on an oil derrick: an open A-frame mast on a ' +
      'steel base that rides four powered rail trucks. Its work platforms reach forward and close round the ' +
      'vehicle, each in two halves that part to let it go. For Mercury it was given remote control from the ' +
      'blockhouse, a deflector against an accidental firing of the escape rocket, and at capsule level an ' +
      'enclosed, air-conditioned white room: films from the unmanned flights had shown dust floating round ' +
      'the cabin in weightlessness. Shepard rode its elevator at 05:15 and entered the capsule from the white ' +
      'room. The elevator was an open mesh cage boarded from the pad; ladders climbed the legs in stages beside it. It rolled to the edge of the pad at T−55 minutes and to its launch position at T−8:45.',
    facts: [
      ['Height', 'about 135 ft (41 m); 140 ft is quoted'],
      ['Built', 'Noble Co., Oakland; at this complex from 1955'],
      ['White room', 'level 3, added February–May 1961'],
      ['Platforms', 'four, each in two halves'],
      ['Moves', 'on rails, under its own power'],
      ['Rolled back', '06:37 EST, T−55 min'],
      ['Lift', 'an open cage up the hatch side’s leg, from the pad'],
    ],
    actions: [
      {
        // The car rides the leaning leg's outboard face, so each stop is a little further in than the one below.
        // `by` is from where it is built, at the pad: metres across (toward the mast is negative) and up.
        id: 'lift',
        label: 'Lift',
        on: 'ServiceStructure_Lift',
        do: {
          kind: 'lift',
          node: 'ServiceStructure_Lift',
          stops: [
            { name: 'Pad', by: [0, 0, 0] },
            { name: 'Level 1', by: [-1.415, 13.188, 0] },
            { name: 'Level 2', by: [-1.585, 15.839, 0] },
            { name: 'Level 3 · white room', by: [-1.787, 18.979, 0] },
            { name: 'Level 4', by: [-2.015, 22.545, 0] },
            { name: 'Crane', by: [-2.714, 33.437, 0] },
          ],
        },
      },
      doorAction('office-door', 'ServiceStructure_OfficeDoor', 100),
      doorAction('level-2-lift-door', 'ServiceStructure_Platform2_Right_LiftDoor', 100),
      doorAction('level-2-cabin-door', 'ServiceStructure_Platform2_Right_Door', 100),
      doorAction('level-2-far-cabin-door', 'ServiceStructure_Platform2_Left_Door', -100),
      doorAction('white-room-door', 'ServiceStructure_Platform3_Right_LiftDoor', 100),
      doorAction('level-4-door', 'ServiceStructure_Platform4_Right_LiftDoor', 100),
    ],
    explode: [0, 0, 0],
    order: 0,
    // what it does, each workable by hand: the four platform pairs, and the roll along the rails (which waits for them)
    functions: [
      ...[1, 2, 3, 4].map((level) => ({
        nodes: [`ServiceStructure_Platform${level}_Left`, `ServiceStructure_Platform${level}_Right`],
        name: level === 3 ? 'White room (level 3)' : `Level ${level} platforms`,
        ends: ['closed', 'parted'] as [string, string],
        seconds: 12,
      })),
      {
        nodes: ['ServiceStructure', ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `ServiceStructure_Wheel_${n}`)],
        name: 'Roll along the rails',
        ends: ['at the vehicle', 'rolled back'],
        // 52.7 m at a walking pace
        seconds: 110,
        needs: [1, 2, 3, 4].map((level) => ({
          node: `ServiceStructure_Platform${level}_Left`,
          atLeast: 1,
          why: 'the platforms are still closed round the rocket',
        })),
      },
    ],
    moves: [
      // the platforms part, lowest first and the white room last, before anything rolls
      ...[1, 2, 4, 3].flatMap((level, i): Move[] => [
        {
          kind: 'slide',
          node: `ServiceStructure_Platform${level}_Left`,
          by: [-1.372, 0, 0],
          from: T.platforms + i * 0.025,
          to: T.platforms + 0.05 + i * 0.025,
        },
        {
          kind: 'slide',
          node: `ServiceStructure_Platform${level}_Right`,
          by: [1.372, 0, 0],
          from: T.platforms + i * 0.025,
          to: T.platforms + 0.05 + i * 0.025,
        },
      ]),
      { kind: 'slide', by: [0, 0, -ROLL[0]!], from: T.rollback, to: T.cabIn - 0.01 },
      { kind: 'slide', by: [0, 0, -ROLL[1]!], from: T.launchPosition, to: T.cabAway - 0.02 },
      ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((n): Move[] => [
        { kind: 'swing', node: `ServiceStructure_Wheel_${n}`, axis: X, angle: -ROLL[0]! / WHEEL_R, from: T.rollback, to: T.cabIn - 0.01 },
        {
          kind: 'swing',
          node: `ServiceStructure_Wheel_${n}`,
          axis: X,
          angle: -ROLL[1]! / WHEEL_R,
          from: T.launchPosition,
          to: T.cabAway - 0.02,
        },
      ]),
    ],
  },
  {
    node: 'CherryPicker',
    name: 'Mobile aerial tower',
    summary: 'The “cherry picker”: the pilot’s way out.',
    detail:
      'Once the service structure had rolled back, this truck-mounted tower held a cab at the capsule hatch so ' +
      'the pilot could step across and be swung clear. It could reach 125 feet, and a push-button in the ' +
      'blockhouse sent the cab "away and down" in the last minutes of the count. The truck, an International ' +
      'Harvester, stood on its outriggers through the launch: the liftoff photographs show it still there, ' +
      'mast up and cab on the pad. Its folding and driving off afterwards, at the end of the slider, is how ' +
      'such a tower travels, not something the record shows.',
    facts: [
      ['Reach', '125 ft (38 m)'],
      ['Stood', 'about 65 ft from the launcher, on the hatch side'],
      ['At the hatch', 'from T−55 min'],
      ['Cab lowered', 'T−4 min, or T−2:30 (sources differ)'],
      ['Control', 'ground, cab, or blockhouse'],
    ],
    explode: [0, 0, 0],
    order: 0,
    actions: [doorAction('driver-door', 'CherryPicker_Door_1', -70)],
    // What it does, each worked from its lever at the control station behind the cab (the model's
    // `lever` marks). The interlocks are how any such truck is kept upright, not something the
    // record shows of this one: it stood on its outriggers to raise the tower, and drove only with
    // the tower down and the legs up.
    functions: [
      {
        nodes: ['CherryPicker_Mast'],
        name: 'Mast',
        ends: ['raised', 'down on its rest'],
        seconds: 40,
        at: 'CherryPicker_Controls',
        lever: 'CherryPicker_Controls_Mast',
        needs: [{ node: 'CherryPicker_Outrigger_1', atMost: 0, why: 'the outriggers are up: it must stand on them first' }],
      },
      {
        nodes: ['CherryPicker_Jib'],
        name: 'Jib',
        ends: ['standing by', 'folded'],
        seconds: 40,
        at: 'CherryPicker_Controls',
        lever: 'CherryPicker_Controls_Jib',
        needs: [{ node: 'CherryPicker_Outrigger_1', atMost: 0, why: 'the outriggers are up: it must stand on them first' }],
      },
      {
        nodes: ['CherryPicker_Cab'],
        name: 'Cab level',
        ends: ['standing by', 'stowed'],
        seconds: 30,
        at: 'CherryPicker_Controls',
        lever: 'CherryPicker_Controls_Cab',
      },
      {
        nodes: [1, 2, 3, 4].map((n) => `CherryPicker_Outrigger_${n}`),
        name: 'Outriggers',
        ends: ['down', 'up'],
        seconds: 15,
        at: 'CherryPicker_Controls',
        lever: 'CherryPicker_Controls_Outriggers',
        needs: [{ node: 'CherryPicker_Mast', atLeast: 1, why: 'the mast is up: the legs hold it' }],
      },
      {
        nodes: ['CherryPicker'],
        name: 'Drive off',
        ends: ['on station', 'gone'],
        seconds: 40,
        at: 'CherryPicker_SteeringWheel',
        needs: [
          { node: 'CherryPicker_Outrigger_1', atLeast: 1, why: 'the outriggers are down' },
          { node: 'CherryPicker_Mast', atLeast: 1, why: 'the mast is up' },
        ],
      },
    ],
    moves: [
      // standing by, clear of the structure, until it has gone; the cab hangs level whatever the jib does
      held('CherryPicker_Jib', Z, 29.94),
      held('CherryPicker_Cab', Z, -29.94),
      swing('CherryPicker_Jib', Z, -29.94, T.cabIn, T.cabIn + 0.09),
      swing('CherryPicker_Cab', Z, 29.94, T.cabIn, T.cabIn + 0.09),
      // away and down, by remote control
      swing('CherryPicker_Jib', Z, 71.27, T.cabAway, T.cabAway + 0.12),
      swing('CherryPicker_Cab', Z, -71.27, T.cabAway, T.cabAway + 0.12),
      // afterwards: jib folded, mast laid forward on its rest, legs up, and away
      swing('CherryPicker_Jib', Z, -1.16, T.stow, T.stow + 0.03),
      swing('CherryPicker_Mast', Z, -65.59, T.stow, T.stow + 0.07),
      swing('CherryPicker_Cab', Z, 66.75, T.stow, T.stow + 0.07),
      swing('CherryPicker_Outrigger_1', X, -105, T.stow + 0.06, T.drive),
      swing('CherryPicker_Outrigger_3', X, -105, T.stow + 0.06, T.drive),
      swing('CherryPicker_Outrigger_2', X, 105, T.stow + 0.06, T.drive),
      swing('CherryPicker_Outrigger_4', X, 105, T.stow + 0.06, T.drive),
      {
        kind: 'drive',
        from: T.drive,
        to: 1,
        // out along the stub road on the hatch side, then round toward the blockhouse road
        path: [
          [12, 0],
          [26, 1],
          [40, 8],
          [50, 24],
        ],
        pivot: [0, 0.527, 0],
        forward: [1, 0],
        wheelRadius: 0.527,
        wheelbase: 5.029,
        // estimated: a 5 m wheelbase at about 35 degrees of lock
        turningCircle: 18,
        wheels: 'CherryPicker_Wheel',
        steered: 'CherryPicker_SteerWheel',
        axle: 'z',
      },
    ],
  },
  {
    node: 'LaunchPedestal',
    name: 'Launcher',
    summary: 'A ring table on four legs over a flame deflector.',
    detail:
      'The Redstone launch ring, turned to the flight azimuth and levelled before the count. The ' +
      'Mercury-Redstone had no hold-down arms: it stood here under its own weight and left when thrust ' +
      'exceeded it. Its last ties to the ground were two plugs on top of the ring under one fin, pulled out ' +
      'by the rising vehicle. On MR-1 it rose 3.8 inches, shut down, and settled back. The ring stands on a ' +
      'steel scale plate: the vehicle was weighed before and after each propellant was loaded.',
    facts: [
      ['Table', 'about 10 ft across, 5.5 ft high (estimated)'],
      ['Hold-down arms', 'none'],
      ['Tail plugs', '60-pin and 4-pin, under fin II'],
      ['Flame deflector', 'four-sided'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'UmbilicalMast',
    name: 'Capsule cable mast',
    summary: 'Carries the capsule’s umbilical until T−35 seconds.',
    detail:
      'A slender pole beside the vehicle carrying the capsule’s ground power, cooling and communications. ' +
      'At T−35 seconds the umbilical was ejected and a bungee cord pulled the released mast over about its ' +
      'foot, clear of the rocket.',
    facts: [
      ['Released', 'pneumatically, at T−35 s'],
      ['Pulled clear by', 'a bungee cord'],
      ['Height', 'about 55–60 ft (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    moves: [swing('UmbilicalMast', X, 88, T.umbilical, T.umbilical + 0.035)],
  },
  {
    node: 'BoosterMast',
    name: 'Booster cable mast',
    summary: 'Cooling and a plug for the booster; drops at about T−14 seconds.',
    detail:
      'The second mast served the booster: a plug, and a cooling package fed with liquid nitrogen for the ' +
      'instrument compartment. The countdown calls its release "boom drop". Its form and exact place are ' +
      'the least certain things on this pad.',
    facts: [['Boom drop', 'about T−14 s']],
    explode: [0, 0, 0],
    order: 0,
    moves: [swing('BoosterMast', X, 88, T.boom, T.boom + 0.035)],
  },
  {
    node: 'Hardstand',
    name: 'Hardstand and rails',
    summary: 'Two hundred feet of concrete; four rails for the service structure.',
    detail:
      'Pad 5 is one of two pads of Complex 5/6, 520 feet apart on one track, with a blockhouse whose point ' +
      'is about 300 feet from each. The structure’s rails cross the slab flush either side of the launcher and run on to ' +
      'its launch position. Twenty-three rockets left this pad between 1956 and 1961. The last was Liberty ' +
      'Bell 7; it never launched again.',
    facts: [
      ['Slab', 'about 200 ft square'],
      ['Rails', 'four, in two pairs'],
      ['Launch azimuth', '105° for MR-3'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'GroundEquipment',
    name: 'Ground equipment',
    summary: 'What was still on the pad at liftoff.',
    detail:
      'The liquid-oxygen topping trailer, which fed the tank until a minute before launch, the nitrogen ' +
      'trailers, and the enclosures and cameras the liftoff photographs show round the launcher. Everything ' +
      'else had left by T−35 minutes. Their positions here are read off photographs. The emergency shower ' +
      'at the pad’s edge and the trailer lettered NASA SP-No 1 are in NASA’s photographs of this pad that ' +
      'week; the huts and the barricade are from photographs taken in July. The shower cart and the packing ' +
      'case are wheeled and carried off up the road toward pad 6 while the platforms open: that they left, ' +
      'when, and where to are all estimated. Each hut is dragged off on its skids by a pickup, which is ' +
      'estimated too: nothing records how the huts were moved, or that they were. The trailer leaves behind a ' +
      'tractor, north off the pad: also estimated; the tractor is an Army M275 of the kind photographed coupled to it. The three searchlights stay where they ' +
      'stand: the record has their crews clearing the area and the lights switched off ("secured"), not taken away.',
    moves: [
      // cleared from the pad's north edge before the gantry is removed (estimated: nothing records it)
      { kind: 'slide', node: 'GroundEquipment_Shower', by: [5.49, 0, 45.4], from: T.platforms + 0.02, to: T.platforms + 0.11 },
      { kind: 'slide', node: 'GroundEquipment_Case', by: [2.51, 0, 42.4], from: T.platforms + 0.03, to: T.platforms + 0.12 },
      // the trailer's door steps fold up first, so nothing hangs below its frame while it is towed (estimated)
      swing('GroundEquipment_TrailerSteps', Z, 95, T.platforms, T.platforms + 0.008),
      // the trailer taken away behind a tractor unit, north off the pad past the cherry picker (estimated throughout)
      {
        kind: 'drive',
        node: 'GroundEquipment_Tractor',
        from: T.platforms + 0.01,
        to: T.platforms + 0.12,
        // in the frame of the bay it stands in, which faces the way it does: x ahead, z to its right. It starts
        // straight ahead (a route's first leg is the way it faces) and eases 12 ft to its left over 40 m, clear of
        // the structure's stair, so that the trailer behind it tracks without cutting in
        path: [
          [4, 0],
          [10, -0.4],
          [20, -1.83],
          [30, -3.26],
          [36, -3.6],
          [44, -3.66],
          [82.6, -3.66],
        ],
        pivot: [0, 0.513, 0],
        forward: [1, 0],
        wheelRadius: 0.513,
        wheelbase: 3.607,
        wheels: 'GroundEquipment_Tractor_Wheel',
        steered: 'GroundEquipment_Tractor_SteerWheel',
        axle: 'z',
      },
      {
        kind: 'drive',
        node: 'GroundEquipment_Trailer',
        from: T.platforms + 0.01,
        to: T.platforms + 0.12,
        // Its bogie heads always for the kingpin on the tractor's fifth wheel, 6.54 m ahead: the tractor's route
        // worked through as a trailer follows it (a tractrix), so the two stay coupled to within 2 cm all the way
        path: [
          [0, 5.01],
          [0.05, 8.01],
          [0.17, 11],
          [0.38, 13.99],
          [0.67, 16.97],
          [1.02, 19.95],
          [1.41, 22.93],
          [1.82, 25.91],
          [2.24, 28.88],
          [2.63, 31.86],
          [2.95, 34.84],
          [3.2, 37.82],
          [3.36, 40.81],
          [3.47, 43.81],
          [3.54, 46.81],
          [3.59, 49.81],
          [3.62, 52.81],
          [3.64, 55.81],
          [3.65, 58.81],
          [3.67, 66.81],
          [3.67, 74.82],
          [3.66, 82.6],
        ],
        pivot: [0, 0.472, 0],
        forward: [0, 1],
        wheelRadius: 0.472,
        wheelbase: 6.54,
        wheels: 'GroundEquipment_Trailer_Wheel',
        steered: 'GroundEquipment_Trailer_NoSteer',
        axle: 'x',
      },
      // each hut dragged off on its skids by a pickup, straight out across the pad's edge to the road behind (estimated)
      ...[1, 2].flatMap((k): Move[] => [
        { kind: 'slide', node: `GroundEquipment_Hut${k}`, by: [72, 0, 0], from: T.platforms + 0.03 * k, to: T.platforms + 0.03 * k + 0.08 },
        {
          kind: 'drive',
          node: `GroundEquipment_Tow${k}`,
          from: T.platforms + 0.03 * k,
          to: T.platforms + 0.03 * k + 0.08,
          path: [
            [24, 0],
            [48, 0],
            [72, 0],
          ],
          pivot: [0, 0.361, 0],
          forward: [1, 0],
          wheelRadius: 0.361,
          wheelbase: 2.794,
          wheels: `GroundEquipment_Tow${k}_Wheel`,
          steered: `GroundEquipment_Tow${k}_SteerWheel`,
          axle: 'z',
        },
      ]),
    ],
    // (the two huts' doors stay shut: what they held is not recorded, so no inside is offered: ground_equipment.py)
    actions: [doorAction('trailer-door', 'GroundEquipment_TrailerDoor', -100)],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'CameraTowers',
    name: 'Camera towers',
    summary: 'Twenty engineering cameras watched the launch.',
    detail: 'Slim lattice towers carrying some of the fixed cameras that filmed every launch from this pad for the engineers.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Floodlights',
    name: 'Floodlights',
    summary: 'The count ran through the night.',
    detail:
      'Timber poles in the grass at the pad’s edge, each with a crossarm of floodlights. ' +
      'Shepard was woken at 01:10, went up the gantry at 05:15 and was in the capsule at 05:20, before sunrise. ' +
      'He waited there four hours and fourteen minutes.',
    explode: [0, 0, 0],
    order: 0,
  },
];

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/usa/mercury/mr-3-freedom-7/pad.glb',
  scale: 'Launch Complex 5 · hardstand 62 m square · to scale',
  backdrop: 'cape-canaveral',
  slider: ['Pilot aboard · 05:20', 'Pad clear'],
  sequence: MORNING,
  specGroups: ['Launch pad'],
  parts: padParts,
  views: [
    { id: 'pedestal', label: 'Launcher', nodes: ['LaunchPedestal'] },
    { id: 'hatch', label: 'Hatch level', centreY: 21, span: 12 },
    { id: 'truck', label: 'Cherry picker', nodes: ['CherryPicker'] },
  ],
};

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'Fibreglass shell, clear visor, pneumatic seal.',
    detail:
      'The visor closes against an inflatable seal fed from a small pressure bottle through a fitting by the left ' +
      'jaw. Used oxygen leaves through the hose on the right side. In flight Shepard kept the visor closed; the ' +
      'suit itself stayed soft, because the cabin held pressure and the suit is only the backup.',
    facts: [
      ['Shell', 'fibreglass'],
      ['Neck ring', 'aluminium'],
      ['Outlet hose', 'right side'],
      ['Visor seal', 'pneumatic, fed at the left jaw'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber-coated bladder.',
    detail:
      'A Navy Mark IV high-altitude suit by B.F. Goodrich, reworked for Mercury: the grey outer shell became ' +
      'aluminium-coated nylon, and the breathing loop was closed so that one flow of oxygen both cools and ' +
      'feeds the pilot. It enters at the waist. The long entry zipper runs diagonally across the chest. On the ' +
      'right chest are the NASA insignia and a leather name tag, and no mission patch: crews did not have ' +
      'those until Gemini 5, four years later.',
    facts: [
      ['Suit', 'Navy Mark IV, B.F. Goodrich'],
      ['Markings', 'NASA insignia, "A. B. SHEPARD"'],
      ['Mass', 'about 20 lb (9 kg)'],
      ['Pressure if the cabin fails', '4.6 psi'],
      ['Oxygen inlet', 'waist'],
      ['Each pilot had', 'three: training, flight, spare'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'Laced to length, with restraint cords at the joints.',
    detail:
      'A pressurised sleeve wants to straighten like a balloon. Cords and lacing along each arm stop it ' +
      'ballooning and set its length to the man; even so, bending a pressurised elbow is work. The gauge on the ' +
      'left forearm shows suit pressure.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'Zipped to the sleeves; one straight finger.',
    detail:
      'Four fingers are curved to rest on the hand controller. The middle finger is straight, for pushing ' +
      'buttons. On this flight the gloves were zipped directly to the sleeves, so the wrists could not turn; ' +
      'the bearing-and-lock-ring wrist arrived on the next flight.',
    facts: [
      ['Attachment on MR-3', 'zipper'],
      ['From MR-4', 'ring lock with wrist bearing'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Tailored and laced; the biomedical plug is on the thigh.',
    detail:
      'Each suit was tailored to its pilot and laced snug. A flap on the right thigh covers the connector that ' +
      'carries heartbeat, breathing and temperature to the telemetry.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Laced leather over the suit’s feet.',
    detail: 'Separate lace-up boots worn over the pressure suit’s socks. The last Mercury flight built the boots into ' + 'the suit.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Ventilator',
    name: 'Portable ventilator',
    summary: 'The suitcase in every photograph of the walk-out.',
    detail:
      'A sealed suit has no way to shed heat, so from the suiting room to the capsule Shepard carried his own ' +
      'air-conditioning: a blower and cooler in a case, plugged into the waist inlet. At the capsule the hose ' +
      'came off and the spacecraft’s own system took over.',
    explode: [0, 0, 0],
    order: 0,
  },
];

const crew: ModelDef = {
  id: 'crew',
  name: 'Crew',
  url: 'models/usa/mercury/mr-3-freedom-7/crew.glb',
  scale: 'Alan B. Shepard Jr. · 1.80 m, 1.89 m suited · to scale',
  backdrop: 'cape-canaveral',
  parts: crewParts,
  ...PILOT,
  walker: {
    eyes: 'Helmet_Eyes',
    forward: [0, 1],
    // the portable ventilator, in his right hand as on the day, its hose up to the inlet at his left waist
    carries: [{ node: 'Ventilator', hand: 'R', hose: { mesh: 'Ventilator_Hose', from: 'Ventilator_HosePort', to: 'Inlet' } }],
  },
  wide: false,
  specGroups: ['Pressure suit'],
  home: 'walkout',
  views: [
    // from low on his far side, so the vehicle he is about to ride stands up behind him
    { id: 'walkout', label: 'Walk-out', centreY: 2.4, span: 6.2, from: facingPilot(-0.3) },
    { id: 'figure', label: 'Pilot', centreY: 0.98, span: 2.5, from: facingPilot(0.05) },
    { id: 'helmet', label: 'Helmet', centreY: 1.72, span: 0.62, from: facingPilot(0.05) },
    { id: 'hands', label: 'Gloves', centreY: 0.95, span: 0.62, from: facingPilot(0.05) },
    { id: 'boots', label: 'Boots', centreY: 0.2, span: 0.62, from: facingPilot(0.2) },
  ],
  // just after rollback, so that he can be seen: when he walked out the gantry still stood round the rocket
  with: [{ model: 'pad', at: ROLLED_BACK }],
};

const FT = 0.3048;
const NMI = 1852;
const PSF = 47.880259; // pascals in a pound per square foot
const PLR = 'Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961)';
const TMX_8_1 = 'NASA TM X-53107, Table 8-1, column MR-3';
const TMX_491 = 'NASA TM X-491 (Brown and Moseley, 1961)';
const doc = (value: number, source: string): Measure => ({ value, confidence: 'documented', source });
const derived = (value: number, source: string): Measure => ({ value, confidence: 'derived', source });
const guess = (value: number, source: string): Measure => ({ value, confidence: 'estimated', source });

const THRUST = 78_860 * LBF;
const ISP = 214.8;
const CUTOFF = 141.8;
const LIFTOFF_MASS = 66_098 * LB;
/** What is left at cutoff: everything, less the propellant the engine has passed. */
const CUTOFF_MASS = LIFTOFF_MASS - (THRUST / (9.80665 * ISP)) * CUTOFF;
/** The capsule's greatest cross-section, 74.5 in across: what TM X-491's coefficients are referred to. */
const CAPSULE_AREA = (Math.PI * (74.5 * IN) ** 2) / 4;
/**
 * The tilt programme as TM X-53107 draws it (Figure 4-9: degrees from the launch vertical against
 * seconds), which is the programme of MR-1 to MR-2, beginning at 24.3 s. MR-3 flew the "flatter
 * trajectory", whose programme began at 15.0 s and was arrested at the same 131.7 s (Table 3-1);
 * its curve is not published, so the drawn one is stretched to begin at 15.0 s.
 */
const TILT_FIGURE: [number, number][] = [
  [24.3, 0],
  [30, 1.4],
  [40, 3.3],
  [50, 6.8],
  [60, 10.6],
  [70, 16.3],
  [80, 21],
  [90, 26.7],
  [100, 31],
  [110, 34.9],
  [120, 37.9],
  [130, 40.7],
  [131.7, 41],
];
const TILT_BEGINS = 15.0;
const TILT_ARREST = 131.7;

/** Postlaunch Report, event table: the escape tower fired clear at 02:22.2, and the capsule had turned heat shield first by 02:37. */
const TOWER_OFF = 142.2;
const TURNED = 157;

const TMX_4 = 'NASA TM X-53107, section 4';
/** Stations on the stack, inches above the fin trailing edges (vehicles/redstone-mrlv.md), where the sections meet. */
const TAIL_TOP = 111.24;
const CENTRE_TOP = TAIL_TOP + 37.5 * 12;
const BOOSTER_TOP = 708;
/** The capsule's plane of greatest diameter on the stack, the tip of its heat shield below that, its canister's top and the tower's spike above. */
const CAPSULE_PLANE = 716;
const SHIELD_TIP = CAPSULE_PLANE - 9.2;
const CANISTER_TOP = CAPSULE_PLANE + 104.57;
const SPIKE_TIP = CAPSULE_PLANE + 284.55;
/** The oxygen tank stands on the tail unit and the alcohol tank on it; the 1.87 ft Figure 4-1 leaves unexplained is taken to be above them. */
const LOX_TOP = TAIL_TOP + 16.83 * 12;
const ALCOHOL_TOP = LOX_TOP + 18.8 * 12;
/** The capsule's centre of mass above the tip of its heat shield, inches: a guess. The Postlaunch Report has it; it has not been read for it. */
const CAPSULE_CG = 25;
/** Pounds. The booster dry for MR-3, what of that the tables place, and the capsule with and without its tower. */
const BOOSTER_DRY = 8093;
const PLACED = 902.6 + 1659 + 437.4 + 487 + 330;
const CAPSULE_LAUNCH = 4040.28;
const CAPSULE_ORBIT = 2855.14;
/** Everything liquid aboard at liftoff, lb: the liftoff weight less everything that is not. */
const FLUIDS = 66_098 - BOOSTER_DRY - CAPSULE_LAUNCH;
const STRUCTURE = `${TMX_4}.2.1: structural weights; stations from Figure 4-1 (vehicles/redstone-mrlv.md)`;
const part = (
  name: string,
  from: number,
  to: number,
  pounds: number,
  confidence: MassPart['confidence'],
  source: string,
  more: Partial<MassPart> = {},
): MassPart => ({ name, from: from * IN, to: to * IN, mass: pounds * LB, confidence, source, ...more });

/**
 * The spacecraft's reaction control system as hardware (src/sim/vehicle.ts). The chambers' ratings are Hammack and
 * Heberlig's (p. 7), as spacecraft.md has them, and so is what the tanks held (pp. 7 and 8); where each chamber stands and
 * the specific impulse the chambers delivered are not in anything read, and say so. Places are metres from the spacecraft's centre of mass in the body's axes (+X to the
 * small end); each chamber pushes the spacecraft away from the side its nozzle is on.
 */
const PEROXIDE_ISP = guess(
  150,
  'what the chambers delivered is not in anything read. Hammack and Heberlig (p. 7) give "a theoretical specific impulse of about 160 pound-seconds" for the decomposing peroxide; ' +
    'the simulator divides each chamber’s rated thrust by this figure for its flow, so it wants the delivered one, which is below the theoretical by the losses of a small nozzle and catalyst bed: 150 s is taken, six per cent under. Ours',
);
const RCS_SUPPLIES: RcsSupply[] = [
  {
    name: 'automatic',
    mode: 'automatic',
    propellant: doc(32 * LB, 'Hammack and Heberlig, p. 7: "A 32-pound supply of hydrogen peroxide is available for the automatic system"'),
    isp: PEROXIDE_ISP,
  },
  {
    name: 'manual',
    mode: 'manual',
    propellant: doc(23 * LB, 'Hammack and Heberlig, p. 8: "A 23-pound supply of hydrogen peroxide is available for the manual system"'),
    isp: PEROXIDE_ISP,
  },
];
/** How far up the axis from the centre of mass the pitch and yaw chambers stand, and how far from the axis; the roll chambers' distance from the axis: all ours. */
const JET_ARM = 1.8;
const JET_OUT = 16 * IN;
const ROLL_OUT = 0.8;
const RATED =
  'Hammack and Heberlig (spacecraft.md, Propulsion): the automatic system has two 24 lbf and two 1 lbf chambers each in pitch and yaw, and two 6 lbf and two 1 lbf in roll';
const PLACED_PY = `on the recovery compartment, taken as ${JET_ARM} m up the axis from the centre of mass assumed above and on its 32 in skin: the place is ours`;
const PLACED_ROLL = `taken as ${ROLL_OUT} m from the axis at the centre of mass’s own station, so that by these figures roll does not pitch: where the roll chambers stood along the cone has not been read`;
const VARIABLE =
  'not in anything read: spacecraft.md has the manual system as six chambers of variable thrust, range not found; 4 to 24 lbf in pitch and yaw and 1 to 6 lbf in roll are the figures commonly quoted';
const jet = (name: string, supply: string, axis: Thruster['axis'], sense: 1 | -1, pounds: number, least?: number): Thruster => {
  // pitch turns about +Y and yaw about +Z, so their chambers push along Z and Y from the small end; one roll chamber pushes across an arm out on +Y
  const at: Thruster['at'] =
    axis === 'pitch' ? [JET_ARM, 0, sense * JET_OUT] : axis === 'yaw' ? [JET_ARM, -sense * JET_OUT, 0] : [0, ROLL_OUT, 0];
  const push: Thruster['push'] = axis === 'pitch' ? [0, 0, -sense] : axis === 'yaw' ? [0, sense, 0] : [0, 0, sense];
  return {
    name,
    supply,
    axis,
    sense,
    at,
    push,
    thrust: pounds * LBF,
    ...(least === undefined ? {} : { least: least * LBF }),
    confidence: 'estimated',
    source: `${supply === 'manual' ? VARIABLE : RATED}. ${axis === 'roll' ? PLACED_ROLL : PLACED_PY}`,
  };
};
const RCS_THRUSTERS: Thruster[] = (['pitch', 'yaw', 'roll'] as const).flatMap((axis) =>
  ([1, -1] as const).flatMap((sense) => {
    const way = `${axis} ${sense > 0 ? '+' : '−'}`;
    return [
      jet(`${way}, automatic high`, 'automatic', axis, sense, axis === 'roll' ? 6 : 24),
      jet(`${way}, automatic low`, 'automatic', axis, sense, 1),
      jet(`${way}, manual`, 'manual', axis, sense, axis === 'roll' ? 6 : 24, axis === 'roll' ? 1 : 4),
    ];
  }),
);

const TMX_422 = 'Blanchard and Raper, NASA TM X-422 (1960)';
const TMX_629 = 'Baber, Carter and English, NASA TM X-629';
const SEDR_109 = 'McDonnell SEDR 109-7, the Capsule Flight Operations Manual for capsule 7 (1960)';

/** How fast the spacecraft and the booster parted: the trajectory's figure, and the booster's own push as a body let go. */
const trajectoryPush = doc(30 * FT, `${PLR}, section 4.2: separation velocity approximately 30 plus or minus 3 ft/s, from AZUSA and radar`);

/** The escape rocket: what pulls the spacecraft clear in an abort (`body.escape`), and what carries the tower off a good flight (`body.sheds`). */
const ESCAPE = {
  thrust: doc(
    52_000 * LBF,
    'McDonnell SEDR 104 (spacecraft.md, Propulsion): 52,000 lbf, the nominal figure along the axis, its three nozzles being canted 19 degrees. ' +
      'Also in print: 58,500 lbf (Hammack and Heberlig, p. 4) and 56,000 lbf (SEDR 104, section 5)',
  ),
  burn: doc(0.78, 'McDonnell SEDR 104 (spacecraft.md, Propulsion): 52,000 lbf for 0.78 s, then decaying'),
  impulse: doc(
    56_500 * LBF,
    'McDonnell SEDR 104 (spacecraft.md, Propulsion): 56,500 lb-s in all. Taken as along the axis, as the thrust is: if it is the motor’s own, the cant makes it 5 per cent less. ' +
      'How the thrust decays is not given: it is taken to fall evenly to nothing, which spends the rest of the impulse in 0.61 s',
  ),
  curve: {
    points: (
      [
        [0, 0],
        [0.03, 30],
        [0.06, 53],
        [0.08, 54.5],
        [0.28, 56],
        [0.3, 62],
        [0.32, 67.5],
        [0.35, 68.5],
        [0.4, 68],
        [0.5, 65.5],
        [0.6, 62.5],
        [0.63, 61],
        [0.7, 54],
        [0.8, 44],
        [0.9, 36],
        [0.97, 31.5],
        [1, 29],
        [1.05, 23],
        [1.1, 17],
        [1.2, 9],
        [1.3, 4.5],
        [1.36, 3],
        [1.5, 1.8],
        [1.8, 0.8],
        [1.9, 0],
      ] as [number, number][]
    ).map(([t, klbf]) => [t, klbf * 1000 * LBF]),
    confidence: 'documented',
    source:
      `${TMX_422}, Figure 9: "Typical variation of thrust with time for capsule motor with three nozzles", a static firing of the Grand Central motor, read to about 1,000 lbf and 0.01 s. ` +
      'The figure’s own legend: burning time 0.601 s, action time 1.248 s, total impulse (10 % to 10 %) 56,795 lb-s, average thrust for action time 45,508 lbf, propellant weight 290.5 lb. ' +
      'The points as read enclose 58,100 lb-s in all, and 56,900 between the 10 per cent points against the legend’s 56,795. One motor on a stand, not capsule 7’s own; the 52,000 lbf for 0.78 s above is the nominal rating of the same motor',
  } as Curve,
  propellant: doc(
    290.5 * LB,
    `${TMX_422}, Figure 9: "Propellent weight, 290.5 lb"; its Table I has the test vehicle 290 lb lighter at burnout (3,109 to 2,819 lb)`,
  ),
  cant: doc(
    19,
    `McDonnell SEDR 104, section 6: "The exit cones are canted at 19 degrees from centerline of rocket case to centerline of exit cones so as to direct the rocket blast outward and away from the tower and capsule"; ${TMX_422}, p. 5, has the same 19 degrees. ` +
      'The thrust figures are taken as the resultant along the motor’s axis (the curve is a stand’s reading), so the cant takes nothing more off them',
  ),
  offset: doc(
    1 * IN,
    `${TMX_629}, p. 7, of a Little Joe flight whose escape system "was composed of current production Mercury components": "The thrust axis of the escape rocket was misalined about 1 inch to the side of the spacecraft-escape-system center of gravity ` +
      `to make certain that this part of the configuration would be pulled out of the flight path of the launch vehicle". ${TMX_422}, p. 5, of the first full-scale firing of the Grand Central motor: "canted in order to obtain a misalinement of the thrust vector of 0.78 inch, to give the capsule a lateral displacement". ` +
      'This New Ocean, p. 141: "about one inch". The system’s figure, to the nearest inch: capsule 7’s own alignment, sighted with the motor’s thrust alignment mirror (SEDR 104, section 6), is not in anything read',
  ),
  toward: guess(
    0,
    'which side of the vehicle the line was set toward is not in anything read. Taken as downrange, away from the blockhouse and toward the sea, which is where one would choose to be carried. Ours',
  ),
  sequence: {
    retropack: true,
    ceiling: doc(
      42_000 * FT,
      `${SEDR_109}, p. 2-2: "For aborts below 10,000 feet, the drogue chute is deployed 2 seconds after tower jettison. Two seconds later, the antenna fairing is jettisoned and the main chute is deployed. On aborts between 10,000 feet and 42,000 feet, ` +
        'the drogue chute is deployed 2 seconds after tower jettison and the main chute is deployed at 10,000 feet. If the abort is initiated above 42,000 feet, the normal recovery sequence is initiated". ' +
        'The same page: an abort signal will "fire the escape rocket and jettison the retrograde package. At maximum altitude, the escape tower is jettisoned"',
    ),
    drogue: doc(2, `${SEDR_109}, p. 2-2: "the drogue chute is deployed 2 seconds after tower jettison"`),
    main: doc(
      2,
      `${SEDR_109}, p. 2-2: "Two seconds later, the antenna fairing is jettisoned and the main chute is deployed", for an abort below 10,000 ft; above that the main waits for 10,000 ft, which is how both are flown: two seconds after the drogue, once under the main’s own height`,
    ),
  },
  record: [
    {
      test: 'Beach Abort, 9 May 1960',
      of: 'apogee',
      label: 'Greatest height',
      value: 2465 * FT,
      unit: 'm',
      tolerance: 0.15 * 2465 * FT,
      confidence: 'documented',
      source:
        'This New Ocean, p. 262: spacecraft No. 1, from a launcher on the beach at Wallops Island with "its pylon toward the sea", flew "one minute and 16 seconds but covering half a mile in an arc 2465 feet high". ' +
        'How far the launcher leaned and what the spacecraft weighed are not in anything read: the comparison is with this flight’s spacecraft off a launcher leaning as the 1959 trial’s did (71 degrees: NASA TM X-422), which is an assumption',
    },
    {
      test: 'Beach Abort, 9 May 1960',
      of: 'range',
      label: 'Distance covered',
      value: 2640 * FT,
      unit: 'm',
      tolerance: 0.3 * 2640 * FT,
      confidence: 'documented',
      source: 'This New Ocean, p. 262: "half a mile", taken as a statute half mile; a round figure in a history, so held to 30 per cent',
    },
    {
      test: 'Beach Abort, 9 May 1960',
      of: 'duration',
      label: 'Time of flight',
      value: 76,
      unit: 's',
      tolerance: 0.15 * 76,
      confidence: 'documented',
      source: 'This New Ocean, p. 262: "one minute and 16 seconds"; NASA SP-45, the table of flights: 00:01:16',
    },
    {
      test: 'off the pad, upright',
      of: 'apogee',
      label: 'Greatest height',
      value: 2500 * FT,
      unit: 'm',
      tolerance: 0.15 * 2500 * FT,
      confidence: 'documented',
      source:
        'McDonnell SEDR 104, section 6: "For off the pad escapes the rocket will obtain a maximum capsule altitude of approximately 2500 feet". The maker’s expectation for the orbital spacecraft, not a flight',
    },
  ] as AbortRecord[],
};
/** Hammack and Heberlig on how the tower left a good flight. */
const TOWER_FIRED =
  'Hammack and Heberlig, p. 15: "At booster cutoff, the tower clamp ring was released and both the escape and pylon jettison rockets fired to remove the tower"';

/**
 * The stack as a body that turns (src/sim/vehicle.ts). The lengths and most of the weights are
 * the reports'; how the weight lies along each section, where the air pushes and how hard the
 * vanes steer are not in anything read, and say so.
 */
const body: Body = {
  radius: doc(35 * IN, `${TMX_4}, Figure 4-11: body diameter 70 in`),
  parts: [
    part('tail unit', 0, TAIL_TOP, 902.6, 'documented', STRUCTURE),
    part('centre section', TAIL_TOP, CENTRE_TOP, 1659, 'documented', STRUCTURE),
    part(
      'aft section, ballast and damping compound',
      CENTRE_TOP,
      BOOSTER_TOP,
      437.4 + 487 + 330,
      'documented',
      `${STRUCTURE}. The report gives MR-3’s damping compound as both 330 and 340 lb: 330 is taken`,
    ),
    part(
      'engine and tail equipment',
      0,
      TAIL_TOP,
      (BOOSTER_DRY - PLACED) * 0.55,
      'estimated',
      `the dry booster (8,093 lb for MR-3) less the structure, ballast and compound the tables place leaves ${BOOSTER_DRY - PLACED} lb of engine, pumps, pressurisation and instruments: ` +
        '55 per cent of it is put in the tail unit and the rest in the aft section. The split is ours',
    ),
    part(
      'instruments and aft equipment',
      CENTRE_TOP,
      BOOSTER_TOP,
      (BOOSTER_DRY - PLACED) * 0.45,
      'estimated',
      'the rest of the same remainder',
    ),
    part(
      'liquid oxygen',
      TAIL_TOP,
      LOX_TOP,
      (FLUIDS * 29_250) / 53_250,
      'estimated',
      'everything liquid at liftoff (the liftoff weight less the dry booster and the capsule: 53,965 lb, peroxide and nitrogen with it: that much is derived), shared between the tanks as their volumes at assumed densities ' +
        '(29,250 to 24,000 lb: vehicles/redstone-mrlv.md). The densities are assumed and no report read gives either tank’s load, so the share is an estimate: the Firing Site Weight Report has the loads and has not been read. ' +
        'The oxygen tank is the lower (Figure 4-1), 16.83 ft long',
      { fluid: true, propellant: 'oxidizer' },
    ),
    part(
      'alcohol',
      LOX_TOP,
      ALCOHOL_TOP,
      (FLUIDS * 24_000) / 53_250,
      'estimated',
      'the rest of the same, and an estimate for the same reason (the share between the tanks stands on assumed densities); the alcohol tank is 18.8 ft long, over the oxygen',
      { fluid: true, propellant: 'fuel' },
    ),
    part(
      'spacecraft',
      SHIELD_TIP,
      CANISTER_TOP,
      CAPSULE_ORBIT,
      'documented',
      `${PLR}, section 3.1: 2855.14 lb in the "orbit" configuration; SEDR 104, Figure 1-3 for its length. Taken as a uniform cylinder of 0.6 m radius, which it is not`,
      { radius: 0.6 },
    ),
    part(
      'escape tower',
      CANISTER_TOP,
      SPIKE_TIP,
      CAPSULE_LAUNCH - CAPSULE_ORBIT,
      'derived',
      `${PLR}, section 3.1: the launch weight (4040.28 lb) less the weight in the "orbit" configuration: 1,185 lb, which is the tower and whatever else left with it`,
      { radius: 0.2, sheds: 'tower' },
    ),
  ],
  surfaces: [
    {
      name: 'nose',
      station: (CANISTER_TOP - (104.57 * 2) / 3) * IN,
      slope: 2,
      confidence: 'estimated',
      source:
        'slender-body theory: any nose has a normal-force slope of 2 per radian on its base area, here the capsule’s; a cone’s acts two thirds of the way back from its tip, ' +
        'taken from the canister’s top. The tower ahead of it is left out. Not from a tunnel',
    },
    {
      name: 'fins',
      station: 55.2 * IN,
      slope: 3.15,
      confidence: 'estimated',
      source:
        'Barrowman’s method for four fins of 41 in exposed span, 100 in root and 38 in tip chord (the chords themselves estimated: vehicles/redstone-mrlv.md) on a 70 in body, referred to the capsule’s area. ' +
        'Subsonic, and held at every Mach number: how the real centre of pressure moved through the speed of sound is not taken from any report',
    },
  ],
  control: {
    deflection: guess(
      4,
      `${TMX_4}.4.8: four carbon jet vanes turning 27.5 degrees either way. How far that turns the thrust is not given: 4 degrees is what vanes of the kind are credited with, and is ours`,
    ),
    station: guess(0, 'the vanes stand in the exhaust at the nozzle’s exit, taken as the base'),
    rollArm: guess(0.3, 'the vanes’ distance from the axis, from the 33 in nozzle exit (itself estimated)'),
  },
  engine: {
    kind: 'liquid',
    starts: 1,
    confidence: 'estimated',
    source:
      'the A-7 burned alcohol and liquid oxygen at one thrust, was started once on the pad and was shut down by the velocity integrator’s signal (the cutoff above) or by running dry. ' +
      'That it had no throttle and no means of relighting is what is generally said of it and what the reports’ single thrust figure implies: no page read states it',
  },
  mixture: guess(
    29_250 / 24_000,
    'the engine’s mixture ratio is not in anything read. Taken as the ratio the two tanks’ loads stand in (29,250 to 24,000 lb: vehicles/redstone-mrlv.md, themselves the tanks’ volumes at assumed densities), ' +
      'so by these figures both run dry together, 147.0 s into the burn, with the peroxide and nitrogen counted in them. That, and not `engine.depletion`’s 143.5 s, now ends a burn nobody cuts',
  ),
  tower: { at: doc(TOWER_OFF, `${PLR}, section 4.1: the escape tower released at 02:22.2`) },
  escape: ESCAPE,
  capsule: {
    centre: guess(
      (SHIELD_TIP + CAPSULE_CG) * IN,
      'the capsule’s centre of mass taken as 25 in above the tip of its heat shield, in the wide end where the weight is. The Postlaunch Report gives it; that page has not been read',
    ),
    gyration: {
      roll: guess(0.55, 'a solid cone of the capsule’s base has 0.52 m; the weight is nearer the skin than that'),
      across: guess(
        0.75,
        'judged from its 3.3 m length with most of the weight in the wide end. The Postlaunch Report gives the moments of inertia; not read',
      ),
    },
    surfaces: [
      {
        name: 'heat shield',
        station: (80 - CAPSULE_CG) * IN,
        slope: 0.5,
        confidence: 'estimated',
        source:
          'the pressure on a spherical shield acts through its centre of curvature, 80 in behind its tip (CR-649: an 80 in radius), which is 55 in behind the centre of mass assumed above. ' +
          `The slope, 0.5 per radian, is a guess at ${TMX_491}’s curves, not a reading of them`,
      },
    ],
    rcs: { supplies: RCS_SUPPLIES, thrusters: RCS_THRUSTERS },
    base: guess(CAPSULE_CG * IN, 'the tip of the heat shield, 25 in below the centre of mass assumed above'),
    chuteArm: guess(1.8, 'the parachutes pull at the top of the recovery compartment, about 1.8 m from the centre of mass assumed above'),
    earthward: guess(
      80,
      'the periscope’s side. The record has the spacecraft yawed 180 degrees to go heat shield first and held at 34 degrees ' +
        '(Results of the First U.S. Manned Suborbital Space Flight, the flight plan, page 13 of the NTRS file) with the pilot watching the Earth in the periscope; which side that is ' +
        'on the pad is the model’s: the periscope under the pilot’s feet, bearing 205 degrees true with the hatch at 295 (LC-5’s bearing, itself ' +
        'estimated), and the body’s +Z bearing 285, against the 105 degree azimuth: 80 degrees between them',
    ),
    side: {
      dragArea: guess(
        3.6,
        'the spacecraft seen from the side is a cone from 74.5 in to 32 in across over 60 in and a 32 in cylinder above it, about 4,600 sq in (3.0 sq m), at 1.2, ' +
          'the drag coefficient of a round body across the flow (the textbook figure for a cylinder below its critical Reynolds number; held at every Mach number). Not from a tunnel',
      ),
      from: guess(
        -0.41,
        'the side’s area lies about a point 27 in toward the small end from the centre of mass assumed above; it is spread evenly 1.1 m either way of that',
      ),
      to: guess(1.79, 'as the other end'),
    },
    limits: {
      landingSpeed: guess(
        12,
        'not in anything read. The design landing was 28 to 30 ft/s (8.5 to 9.1 m/s: Hammack p. 25) onto the landing bag; 12 m/s, a third more, is taken as the most a pilot on the couch walks away from. Ours',
      ),
      load: guess(
        20,
        'not in anything read. The flight itself put 11.0 g on the pilot at entry (Postlaunch Report 4.2) and an abort off the pad is some 13 g by the escape rocket’s figures; 20 g for a few seconds, chest to back on a contour couch, is the figure usually given for what the couch was built to. ' +
          'Documented, and not the same thing: Hammack and Heberlig (p. 6) say tests of the couch "reached values as high as 25g on a profile representing reentry with no injury to the occupant". ' +
          'That is a level tested and come through on one profile, not the most that can be lived through, so it is not taken as the limit: 20 g stays, under it, and is ours',
      ),
    },
  },
  side: {
    dragArea: guess(
      42,
      'the stack seen from the side: a 70 in body 708 in long and the spacecraft above it, about 54,000 sq in (35 sq m), at 1.2, the drag coefficient of a round body across the flow ' +
        '(the textbook figure for a cylinder below its critical Reynolds number; held at every Mach number). The fins are `surfaces`; the tower is left out. Not from a tunnel',
    ),
    from: doc(0, 'the fins’ trailing edges, the stations’ zero'),
    to: guess(
      777 * IN,
      'the side’s area lies about station 388.5 in (the body’s 49,560 sq in about 354 in and the spacecraft’s 4,600 about 760 in); spread evenly from the base, that is a stretch 777 in long. ' +
        'The stack itself is 820.6 in to the canister’s top. The spacecraft’s area and its middle are round figures of ours and the even spread is a choice, so this is an estimate, not a derivation',
    ),
  },
  sheds: [
    {
      on: 'tower',
      name: 'Escape tower',
      from: doc(CANISTER_TOP * IN, 'SEDR 104, Figure 1-3: the tower stands on the canister’s top'),
      to: doc(SPIKE_TIP * IN, 'SEDR 104, Figure 1-3: spike tip at 284.55 in above the capsule’s widest plane'),
      radius: guess(0.2, 'the escape motor’s case is 15 in across (SEDR 104, Figure 1-3); the pylon under it is wider and open'),
      ahead: guess(0.35, 'spike first: the 15 in motor case (0.11 sq m) and the open pylon’s tubes behind it, by judgement. Not measured'),
      astern: guess(0.5, 'clamp ring first: the open pylon, the nozzles and the case’s flat end, by judgement. Not measured'),
      side: {
        dragArea: guess(1.2, 'side on: a 15 in case 4 ft long, the spike and the pylon’s tubes, about 1 sq m at 1.2. By judgement'),
        from: doc(CANISTER_TOP * IN, 'the tower’s foot'),
        to: doc(SPIKE_TIP * IN, 'the spike’s tip'),
      },
      // The clamp ring is let go first, so both rockets push on the tower alone: the stack feels nothing of them but their exhaust, which is not modelled.
      motors: [
        {
          name: 'escape rocket',
          unless: 'abort',
          thrust: doc(ESCAPE.thrust.value, `${TOWER_FIRED}. The rocket’s figures are \`body.escape\`’s: ${ESCAPE.thrust.source}`),
          burn: doc(ESCAPE.burn.value, ESCAPE.burn.source),
          impulse: doc(
            ESCAPE.impulse.value,
            `${ESCAPE.impulse.source}. The tower’s weight is not lightened as the rocket burns (the 1,185 lb has its propellant in it), so it is flown a little slow`,
          ),
        },
        {
          name: 'tower jettison rocket',
          thrust: doc(
            800 * LBF,
            `${TOWER_FIRED}. NASA SP-45, Table 3-III (spacecraft.md, Propulsion): the tower jettison motor, 800 lbf nominal (SEDR 104 has 785 lbf, through three nozzles canted 30 degrees). ` +
              'Taken as along the axis, through the centre of mass. After an abort it is this rocket alone that takes the tower off, the escape rocket being spent',
          ),
          burn: doc(1.5, 'NASA SP-45, Table 3-III (spacecraft.md, Propulsion): 1.5 s'),
        },
      ],
    },
    {
      on: 'separation',
      name: 'Redstone booster',
      from: doc(0, 'the fins’ trailing edges'),
      to: doc(BOOSTER_TOP * IN, `${TMX_4}, Figure 4-1: the booster’s top, 708 in`),
      radius: doc(35 * IN, `${TMX_4}, Figure 4-11: body diameter 70 in`),
      ahead: guess(
        3.0,
        'adapter first: the open, flat end of a 70 in cylinder (2.48 sq m) at 1.2, between the 0.8 of a flat-faced cylinder below the speed of sound and the 1.6 or so above it. One figure at every Mach number. Not measured',
      ),
      astern: guess(2.7, 'tail first: the same flat end with the nozzle in it and four fins edge on, taken a little less. By judgement'),
      side: {
        dragArea: guess(
          38.4,
          '70 in by 708 in is 49,560 sq in (32.0 sq m), at 1.2, the drag coefficient of a round body across the flow. The fins are `surfaces`. Not from a tunnel',
        ),
        from: doc(0, 'the fins’ trailing edges'),
        to: doc(BOOSTER_TOP * IN, 'the booster’s top'),
      },
      surfaces: [
        {
          name: 'fins',
          station: 55.2 * IN,
          slope: 3.15,
          confidence: 'estimated',
          source: 'the stack’s own fins (`body.surfaces`): Barrowman’s method, subsonic, held at every Mach number and at every angle',
        },
      ],
      push: trajectoryPush,
    },
    {
      on: 'retropack',
      name: 'Retropack',
      from: doc(
        (CAPSULE_PLANE - 27) * IN,
        'SEDR 104, Figure 1-3: the retro nozzles’ exits, 27.0 in below the capsule’s widest plane (model/vehicle.py: Z_RETRO_BOTTOM)',
      ),
      to: derived(
        SHIELD_TIP * IN,
        'the tip of the heat shield, which it is strapped under: 9.2 in below the capsule’s widest plane, the depth of a spherical cap of 80 in radius on a 74.5 in chord (both CR-649; spacecraft.md)',
      ),
      radius: guess(0.38, 'about 30 in across, off the model; no drawing of the housing has been read for it'),
      mass: derived(
        (CAPSULE_ORBIT - 2579.0) * LB,
        `${PLR}, section 3.1: the "orbit" weight less the re-entry weight, 276.14 lb. That is everything that went between the two, the retrorockets’ and posigrades’ burned propellant with it, ` +
          'so the pack as it fell away was lighter than this (by some 170 lb, if the motors’ 13,000 lb-s each came at a specific impulse of 230 s, which is not recorded): it is flown at the whole figure',
      ),
      centre: guess(
        (CAPSULE_PLANE - 17) * IN,
        'the middle of the housing and its motors, 17 in below the capsule’s widest plane, by eye from the model',
      ),
      gyration: {
        roll: guess(0.27, 'a solid disc of its radius has 0.27 m'),
        across: guess(0.2, 'a disc 0.45 m deep and 0.38 m in radius has 0.23 m; the motors are near the middle'),
      },
      ahead: guess(0.45, 'either face on: a disc of its radius (0.45 sq m) at 1.0, by judgement'),
      astern: guess(0.45, 'as the other face'),
      side: {
        dragArea: guess(0.35, 'edge on: 0.76 m by 0.45 m at 1.0, by judgement. Its three straps are left out'),
        from: doc((CAPSULE_PLANE - 27) * IN, 'its lower end'),
        to: derived(SHIELD_TIP * IN, 'its upper end: the tip of the heat shield, derived as `to` above'),
      },
      push: guess(
        1,
        'not in anything read. Its straps cut, the pack was thrown off the heat shield by a spring, as is remembered of Mercury; a metre a second is ours, to be replaced by the figure when one is read. ' +
          'Shared with the spacecraft by their masses (which gets a tenth of it); fly.ts gives the spacecraft none',
      ),
    },
  ],
  limits: {
    qAlpha: guess(
      4000 * 47.880259 * (Math.PI / 180),
      'not in anything read: no bending strength, design angle of attack or load factor of the Mercury-Redstone is in the reports here. 4,000 lb/sq ft degrees (3,340 Pa rad) is of the order ' +
        'launch vehicles of the time are credited with, and at this flight’s own greatest dynamic pressure (586 lb/sq ft: Postlaunch Report 4.2) it is 6.8 degrees off the wind. Ours',
    ),
    joint: 'separation',
    drogue: guess(
      7000,
      'not in anything read. Opened at Mach 1.5 at 70,000 ft, the most remembered of the Mercury drogue’s qualification, it would meet 7.0 kPa (0.7 times 4.44 kPa times 1.5 squared); ' +
        'this flight’s own opens it falling at its terminal speed, in about 4 kPa. Ours',
    ),
    main: guess(
      5000,
      'not in anything read. The main had to open with the drogue failed, the spacecraft falling alone at its terminal speed: its weight over its own drag area, 4.0 kPa at any height. A quarter over that. Ours',
    ),
    torn: guess(0.05, 'a canopy torn or streaming is taken to keep a twentieth of its drag area: chosen, not recorded'),
  },
};

const HANDBOOK =
  'quoted from memory as the figure the CRC Handbook of Chemistry and Physics gives; the handbook was not opened, no edition or page is recorded, and it is unverified';
/**
 * What the air's heat is worked on (src/sim/heating.ts). The shield's size, shape and thickness are the record's; how the
 * heat is shared out over each surface, and how well each radiates, are not in anything read, and say so. Nothing is fitted:
 * no temperature measured on the flight is in the sources read, so there is nothing here to hold the result against.
 */
const heating: Heating = {
  noseRadius: doc(80 * IN, 'NASA CR-649: the heat shield is a spherical cap of 80 in radius'),
  starts: guess(300, 'a May morning at the Cape, about 27 C: what the shield and skin stood at on the pad is not in anything read'),
  surfaces: [
    {
      name: 'Heat shield',
      materials: ['heatsink-beryllium'],
      share: {
        down: guess(
          0.9,
          'the laminar heat flux over a sphere falls off from its stagnation point about as the cosine of the angle to the power 1.5, and the cap reaches only 27.7 degrees ' +
            '(74.5 in across on an 80 in radius): 0.83 at the rim, some 0.9 over the face. The rise at the corner is left out. No measured distribution read',
        ),
      },
      arealMass: guess(
        1848 * 1.0 * IN,
        `Hammack and Heberlig (p. 5): a beryllium heat sink "approximately 1-inch-thick"; beryllium taken as 1,848 kg/m3 (${HANDBOOK}): 46.9 kg behind each square metre, 140 kg over the cap's 2.98 m2. ` +
          'The thickness is the record’s and approximate; the density is not from anything read, so the product is an estimate',
      ),
      specificHeat: guess(
        1825,
        `beryllium at 25 C, ${HANDBOOK}. It rises with temperature (about half as much again by 600 K, also from memory), so held constant it overstates the rise`,
      ),
      emissivity: guess(
        0.5,
        'between bare polished beryllium (about 0.2) and an oxidised face (about 0.6): the shield’s finish is not in anything read',
      ),
      limit: guess(1560, `beryllium melts at 1,287 C: ${HANDBOOK}`),
    },
    {
      name: 'Afterbody shingles',
      materials: ['shingle-rene41'],
      share: {
        up: guess(
          0.3,
          'a 20-degree cone flank in attached flow, against the stagnation point of a 2 m sphere: a judgement. CR-649 has the measurements; not read for them',
        ),
        down: guess(
          0.05,
          'in the wake behind the shield: a few per cent of the stagnation flux is the usual figure for a blunt body’s afterbody. CR-649 not read for it',
        ),
      },
      arealMass: guess(
        8250 * 0.016 * IN,
        'Hammack and Heberlig; CR-649: Rene 41 shingles 0.016 in thick, at 8.25 g/cm3 for the alloy: 3.35 kg/m2. The gauge is the record’s; the density is quoted from memory of the maker’s data sheet, ' +
          'which was not opened, so the product is an estimate and unverified. The insulation behind is left out',
      ),
      specificHeat: guess(
        452,
        'Rene 41 at room temperature, 0.108 Btu/lb F, as its maker’s data sheet is remembered: quoted from memory, not looked up, unverified',
      ),
      emissivity: guess(0.85, 'the shingles were given a dark oxidised finish so as to radiate: no figure read'),
      limit: guess(1255, 'Rene 41 is used to about 1,800 F: the shingles’ own limit is not in anything read'),
    },
    {
      name: 'Recovery compartment shingles',
      materials: ['shingle-beryllium'],
      share: {
        up: guess(0.15, 'a cylinder lying along the flow behind the canister: half the cone’s share, by judgement'),
        down: guess(0.03, 'furthest back in the wake: by judgement'),
      },
      arealMass: guess(
        1848 * 0.22 * IN,
        `Hammack and Heberlig; CR-649: beryllium shingles 0.22 in thick, at 1,848 kg/m3 (${HANDBOOK}): 10.3 kg/m2. The gauge is the record’s; the density is not from anything read, so the product is an estimate`,
      ),
      specificHeat: guess(1825, `beryllium at 25 C, ${HANDBOOK}`),
      emissivity: guess(0.5, 'as the heat shield: between polished and oxidised beryllium, the finish not read'),
      limit: guess(1560, `beryllium melts at 1,287 C: ${HANDBOOK}`),
    },
    {
      name: 'Booster skin, aft section',
      materials: [],
      share: { up: guess(0.1, 'a cylinder’s side at no angle to the flow, far behind the nose: by judgement. No measurement read') },
      arealMass: guess(
        2680 * 0.09 * IN,
        `${TMX_4}.2.1 (vehicles/redstone-mrlv.md): aft section skin 0.090 in of 5052 aluminium, at 2.68 g/cm3 for the alloy: 6.1 kg/m2. The gauge is the record’s; the density is quoted from memory, ` +
          'from no source opened, so the product is an estimate and unverified',
      ),
      specificHeat: guess(880, '5052 aluminium at room temperature, as remembered: quoted from memory, not looked up, unverified'),
      emissivity: guess(0.85, 'white paint: by judgement'),
      limit: guess(
        475,
        'aluminium alloys of this kind lose their strength from about 200 C: the booster’s own limit is not in anything read',
      ),
    },
  ],
};

/**
 * What the simulator flies Freedom 7 from (src/sim/fly.ts). Every figure is an input from a
 * report; none was adjusted against the results below. Where a report gives no figure the entry
 * is `estimated` and says what it stands on: tests/sim.test.mjs prints how far each of those moves
 * each result.
 */
const trajectory: Trajectory = {
  azimuth: doc(
    105,
    'NASA TM X-53107, section 7.2: a 105-degree launch azimuth; the Postlaunch Report has the Earth-fixed heading at separation as 105.23',
  ),
  liftoffMass: doc(LIFTOFF_MASS, `${TMX_8_1}: weight at liftoff 66,098 lb`),
  engine: {
    thrust: doc(THRUST, `${TMX_8_1}: thrust, sea level, 78,860 lb`),
    isp: doc(
      ISP,
      `${TMX_8_1}: engine specific impulse, sea level, 214.8 s (so 367.1 lb/s, taken as the whole flow, turbine exhaust included)`,
    ),
    exitArea: derived(
      (6.3 * 9.80665 * CUTOFF_MASS - THRUST) / 101_325,
      `${PLR}, section 4.2: the load at cutoff was 6.3 g, so the thrust there, in near vacuum, was 6.3 times the weight left (14,040 lb): 88,450 lbf, 9,590 lbf more than at sea level, ` +
        'which over one atmosphere is 652 sq in of nozzle exit. (The A-7 is elsewhere rated 78,000 lbf at sea level and 89,000 lbf in vacuum: Aircraft Engine Historical Society, "The Redstone Engine". That is 749 sq in, and would give 6.4 g.)',
    ),
    cutoff: doc(CUTOFF, `${PLR}, section 4.1: booster cut-off at 02:21.8, by the velocity integrator`),
    depletion: guess(
      143.5,
      `${TMX_4}: a nominal burning time of 143.5 s, taken as when a propellant would have run out, which the report does not say (1,285 lb of liquids are then still aboard by our count). ` +
        'The 143.5 s is documented as a burning time; that it is depletion is our reading of it, so as this input it is an estimate',
    ),
  },
  tilt: {
    points: TILT_FIGURE.map(([t, tilt]) => [TILT_BEGINS + ((t - 24.3) * (TILT_ARREST - TILT_BEGINS)) / (TILT_ARREST - 24.3), tilt]),
    confidence: 'estimated',
    source:
      'documented: begins 15.0 s, arrested 131.7 s (NASA TM X-53107, Table 3-1), 41 degrees at the end (Figure 4-9; Table 8-1). ' +
      'Estimated: the curve between, which is Figure 4-9 (read to about half a degree) stretched from its 24.3 s beginning to 15.0 s',
  },
  area: derived(CAPSULE_AREA, 'the capsule is 74.5 in across at its widest (CR-649): 30.27 sq ft'),
  ascentDrag: {
    points: [
      [0, 0.52],
      [0.5, 0.56],
      [0.8, 0.66],
      [1.0, 0.9],
      [1.1, 0.92],
      [1.5, 0.8],
      [2, 0.7],
      [2.5, 0.58],
      [3, 0.48],
      [4, 0.36],
      [5, 0.31],
      [6, 0.3],
      [7, 0.3],
    ],
    confidence: 'estimated',
    source:
      `${TMX_491}, Figure 20: drag coefficient at no angle of attack of the capsule with its escape tower, alone in the tunnel, read to about 0.02. ` +
      'On the booster the capsule has no wake of its own and the Redstone adds its skin, fins and base: the two are taken to cancel, which nobody measured for us. No drag figure for the whole vehicle was found',
  },
  separation: {
    at: doc(152.3, `${PLR}, section 4.1: capsule separation at 02:32.3`),
    mass: doc(2855.14 * LB, `${PLR}, section 3.1: capsule weight in the "orbit" configuration, 2855.14 lb`),
    boosterMass: derived(
      CUTOFF_MASS - 4040.28 * LB,
      'the liftoff weight, less the flow for 141.8 s, less the capsule and tower at launch (4040.28 lb): about 10,000 lb of booster and residuals',
    ),
    speed: trajectoryPush,
  },
  retro: {
    fires: [314.1, 318.8, 323.6].map((t, i) => doc(t, `${PLR}, section 4.1: retro no. ${i + 1} fire`)),
    thrust: doc(992 * LBF, 'McDonnell SEDR 104: 992 lbf (SP-45 has a nominal 1,000 lbf for 10 s, a quarter less impulse)'),
    burn: doc(13.2, 'McDonnell SEDR 104: 13.2 s'),
    pitch: derived(
      20,
      `${PLR}, section 4.2: "an average retro-attitude angle of 20 degrees above the local horizontal" (34 was planned). ` +
        'That is the blunt end’s elevation, so the push on the capsule is taken as rearward and 20 degrees below the level',
    ),
  },
  retropack: {
    at: doc(373.6, `${PLR}, section 4.1: retro-package jettison at 06:13.6`),
    mass: doc(2579.0 * LB, `${PLR}, section 3.1: capsule weight in the re-entry configuration, 2579.00 lb`),
  },
  entryDrag: {
    points: [
      [0, 1.0],
      [0.5, 1.05],
      [0.8, 1.2],
      [1, 1.3],
      [1.5, 1.42],
      [2, 1.52],
      [3, 1.57],
      [4, 1.6],
      [20, 1.6],
    ],
    confidence: 'documented',
    source: `${TMX_491}, Figure 22: drag coefficient at no angle of attack of the re-entry configuration, Mach 0.5 to 20, read to about 0.03; "above Mach 4 it remains constant"`,
  },
  drogue: {
    altitude: doc(21_000 * FT, 'Results of the First U.S. Manned Suborbital Space Flight, p. 7; Hammack p. 9: deployed at 21,000 ft'),
    dragArea: guess(
      0.5 * Math.PI * (3 * FT) ** 2,
      'a 6 ft conical ribbon parachute (Hammack p. 9) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found',
    ),
    fills: guess(1, 'a small ribbon parachute fills in about a second: not recorded'),
  },
  main: {
    altitude: doc(10_000 * FT, 'Results, p. 7; Hammack p. 9: main parachute at 10,000 ft'),
    dragArea: derived(
      (2 * 2579.0 * LB * 9.80665) / (1.225 * (29 * FT) ** 2) - 1.0 * CAPSULE_AREA,
      'what brings the re-entry weight down at 29 ft/s at sea level ("descent velocities of 28 to 30 feet per second were always achieved", Hammack p. 25), less the capsule’s own drag: ' +
        '0.82 on a 63 ft canopy',
    ),
    fills: guess(
      9,
      'it comes out reefed and then opens: the pilot reports "main on green" at 10:15, "main chute is reefed" at 10:18, "coming unreefed" at 10:22 and "good" at 10:28 (Postlaunch Report, air-ground transcript). Nine seconds from out to full, evenly, is ours',
    ),
  },
  body,
  heating,
};

/**
 * What the reports say happened, for the simulator to be held against. The tolerances were set
 * before it was run: 2 per cent on heights and distances, 1 per cent on speeds, half a g, ten
 * seconds, a degree. tests/sim.test.mjs.
 */
const check = (id: FlightCheck['id'], label: string, value: number, unit: string, tolerance: number, source: string): FlightCheck => ({
  id,
  label,
  value,
  unit,
  tolerance,
  confidence: 'documented',
  source,
});
const checks: FlightCheck[] = [
  check('apogee', 'Greatest height', 101.2 * NMI, 'm', 0.02 * 101.2 * NMI, `${PLR}, section 4.2: maximum altitude 101.2 n. mi.`),
  check('range', 'Range', 263.1 * NMI, 'm', 0.02 * 263.1 * NMI, `${PLR}, section 4.2: range 263.1 n. mi.`),
  check('duration', 'Liftoff to landing', 922.0, 's', 10, `${PLR}, section 4.1: main chute disconnect, at landing, 15:22.0`),
  check(
    'separationSpeed',
    'Space-fixed speed at separation',
    7388 * FT,
    'm/s',
    0.01 * 7388 * FT,
    `${PLR}, section 4.2: inertial velocity 7388 ft/s at capsule separation`,
  ),
  check(
    'separationGroundSpeed',
    'Earth-fixed speed at separation',
    6414 * FT,
    'm/s',
    0.01 * 6414 * FT,
    `${PLR}, section 4.2: Earth-fixed velocity 6414 ft/s`,
  ),
  check(
    'separationClimb',
    'Space-fixed climb angle at separation',
    39.01,
    'deg',
    1,
    `${PLR}, section 4.2: inertial flight-path angle 39.01 degrees`,
  ),
  check(
    'separationGroundClimb',
    'Earth-fixed climb angle at separation',
    46.47,
    'deg',
    1,
    `${PLR}, section 4.2: Earth-fixed flight-path angle 46.47 degrees`,
  ),
  check('separationAltitude', 'Height at separation', 243_640 * FT, 'm', 0.02 * 243_640 * FT, `${PLR}, section 4.2: altitude 243,640 ft`),
  check(
    'exitQ',
    'Greatest dynamic pressure, going up',
    586 * PSF,
    'Pa',
    0.05 * 586 * PSF,
    `${PLR}, section 4.2: maximum exit dynamic pressure 586 lb/sq ft`,
  ),
  // not an independent check: the nozzle's exit area above is derived from this figure
  check('exitG', 'Greatest load, going up', 6.3, 'g', 0.5, `${PLR}, section 4.2: maximum exit longitudinal load factor 6.3 g`),
  check(
    'entryQ',
    'Greatest dynamic pressure, coming down',
    605 * PSF,
    'Pa',
    0.05 * 605 * PSF,
    `${PLR}, section 4.2: maximum re-entry dynamic pressure 605 lb/sq ft`,
  ),
  check('entryG', 'Greatest load, coming down', 11.0, 'g', 0.5, `${PLR}, section 4.2: maximum re-entry longitudinal load factor 11.0 g`),
  check('entryAt', 'A twentieth of a g, coming down', 468.2, 's', 10, `${PLR}, section 4.1: .05 g relay at 07:48.2`),
  check('drogueAt', 'Drogue parachute', 578.1, 's', 10, `${PLR}, section 4.1: drogue chute deploy at 09:38.1`),
  check('mainAt', 'Main parachute', 614.8, 's', 10, `${PLR}, section 4.1: main chute deploy at 10:14.8`),
];

/** Mercury-Redstone 3. Prose versions of this file: ./README.md (flight), ./spacecraft.md (ship). */
export const flight: Flight = {
  id: 'usa/mercury/mr-3-freedom-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Redstone 3',
  callsign: 'Freedom 7',
  spacecraft: 'Mercury spacecraft No. 7 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Redstone MRLV, MR-7',
  launch: '1961-05-05T14:34:13Z',
  launchSite: LC5.name,
  site: LC5,
  crew: ['Alan B. Shepard Jr.'],
  summary:
    'The first American in space. A fifteen-minute suborbital arc from Cape Canaveral into the Atlantic, ' +
    'during which Shepard took manual control of the spacecraft in all three axes.',
  facts: [
    { label: 'Liftoff', value: '5 May 1961, 14:34:13 UTC' },
    { label: 'Pilot', value: 'Alan B. Shepard Jr.' },
    { label: 'Duration', value: '15 min 22 s' },
    { label: 'Apogee', value: '187.4 km' },
    { label: 'Range', value: '487.3 km' },
    { label: 'Peak velocity', value: '8,107 km/h, space-fixed' },
    { label: 'Peak load', value: '11.0 g on entry' },
    { label: 'Recovery', value: 'USS Lake Champlain' },
  ],
  // Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961), event table
  timeline: [
    { t: 0, event: 'Liftoff' },
    { t: 84, event: 'Maximum dynamic pressure, 586 lb/ft²' },
    { t: 141.8, event: 'Booster engine cutoff, 6.3 g' },
    { t: TOWER_OFF, event: 'Escape tower released and fired clear' },
    { t: 152.3, event: 'Spacecraft separation at 74.3 km: posigrade motors fire' },
    { t: TURNED, event: 'Turnaround to heat-shield-forward' },
    { t: 184, event: 'Manual control: pitch, then yaw, then roll' },
    { t: 311, event: 'Apogee, 187.4 km' },
    { t: 314.1, event: 'Retrofire: three motors, five seconds apart' },
    { t: 373.6, event: 'Retropack jettison' },
    { t: 468.2, event: 'Entry begins (0.05 g)' },
    { t: 501, event: 'Peak entry load, 11.0 g' },
    { t: 578.1, event: 'Drogue parachute, 6.4 km' },
    { t: 614.8, event: 'Main parachute, 3.2 km' },
    { t: 922, event: 'Landing, 27°13.7′N 75°53′W' },
  ],
  specs: [
    { group: 'Spacecraft', label: 'Heat shield diameter', value: 74.5 * IN, unit: 'm', confidence: 'documented', note: '74.5 in' },
    { group: 'Spacecraft', label: 'Heat shield radius of curvature', value: 80 * IN, unit: 'm', confidence: 'documented', note: '80 in' },
    { group: 'Spacecraft', label: 'Afterbody half-angle', value: 20, unit: 'deg', confidence: 'documented', note: 'NASA CR-649' },
    {
      group: 'Spacecraft',
      label: 'Recovery compartment diameter',
      value: 32 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '32 in (NASA CR-649)',
    },
    {
      group: 'Spacecraft',
      label: 'Recovery compartment length',
      value: 22.76 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '22.76 in: stations 58.38 to 81.14 (NASA CR-649, Figure 1; its text says 20 in). SEDR 104 Figure 1-3 gives 22.86 in',
    },
    {
      group: 'Spacecraft',
      label: 'Afterbody length',
      value: 58.38 * IN,
      unit: 'm',
      confidence: 'derived',
      note: 'frustum from 74.5 in to 32 in at 20 degrees',
    },
    {
      group: 'Spacecraft',
      label: 'Antenna canister length',
      value: 23.43 * IN,
      unit: 'm',
      confidence: 'derived',
      note: '23.43 in: from the cylinder top at 81.14 in to the canister top at Z209.07 (SEDR 104, Figure 1-3). CR-649 says 24 in',
    },
    {
      group: 'Spacecraft',
      label: 'Antenna canister base diameter',
      value: 24 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '24 in, tapering to 20 in at the top (NASA CR-649); SEDR 104 Figure 1-3 scales to the same',
    },
    {
      group: 'Spacecraft',
      label: 'Length, retro nozzles to canister top',
      value: 131.57 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '131.57 in: Z77.50 to Z209.07 (SEDR 104, Figure 1-3; Hammack & Heberlig, Figure 2)',
    },
    {
      group: 'Spacecraft',
      label: 'Length with escape tower',
      value: 311.55 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '311.55 in: Z77.50 to Z389.05 (SEDR 104, Figure 1-3; Hammack & Heberlig, Figure 2)',
    },
    {
      group: 'Spacecraft',
      label: 'Escape tower length',
      value: 203.6 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '203.60 in: pylon base ring at Z185.45 to spike tip at Z389.05; truss bays, motor case and spike at the stations of SEDR 104, Figure 1-3',
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 25.414,
      unit: 'm',
      confidence: 'documented',
      note: '83.38 ft, fins to spike (TM X-53107, 4.1); model: 25.414 m',
    },
    { group: 'Launch vehicle', label: 'Booster diameter', value: 70 * IN, unit: 'm', confidence: 'documented', note: '70 in' },
    {
      group: 'Launch vehicle',
      label: 'Booster length',
      value: 59 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '59.00 ft (TM X-53107, Figure 4-1)',
    },
    {
      group: 'Launch vehicle',
      label: 'Booster top to the capsule’s widest plane',
      value: 8.0 * IN,
      unit: 'm',
      confidence: 'derived',
      note: '8.0 in: 83.38 ft less the 59.00 ft booster and the 284.55 in from that plane to the spike tip. Hammack & Heberlig Figure 17 implies 2.3 in; its total is 4.5 in short of 83.38 ft',
    },
    {
      group: 'Launch vehicle',
      label: 'Tail unit length',
      value: 9.27 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '9.27 ft (TM X-53107, Figure 4-1)',
    },
    {
      group: 'Launch vehicle',
      label: 'Centre section length',
      value: 37.5 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '37.50 ft: alcohol tank 18.8 ft over oxygen tank 16.83 ft',
    },
    {
      group: 'Launch vehicle',
      label: 'Aft section length',
      value: 139.64 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '139.64 in as drawn; the model’s is 146.76 in, taking in the 7.08 in Mercury stretch',
    },
    {
      group: 'Launch vehicle',
      label: 'Booster dry mass',
      value: 8093 * LB,
      unit: 'kg',
      confidence: 'derived',
      note: '8,093 lb: the 8,195 lb of TM X-53107 4.2.1, which counts 442 lb of damping compound, less the 102 lb of it added after MR-3',
    },
    {
      group: 'Launch vehicle',
      label: 'Fuel volume',
      value: 3348 * 3.785411784,
      unit: 'L',
      confidence: 'documented',
      note: '3,348 US gal of alcohol',
    },
    {
      group: 'Launch vehicle',
      label: 'Oxidiser volume',
      value: 3072 * 3.785411784,
      unit: 'L',
      confidence: 'documented',
      note: '3,072 US gal of liquid oxygen',
    },
    {
      group: 'Launch vehicle',
      label: 'Fin span',
      value: 152 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '152 in across the air rudders (Hammack & Heberlig, Figure 17)',
    },
    {
      group: 'Launch vehicle',
      label: 'Liftoff mass, whole vehicle',
      value: 66098 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '66,098 lb',
    },
    {
      group: 'Spacecraft',
      label: 'Spacecraft launch mass',
      value: 4040 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '4,040 lb, with escape tower',
    },
    { group: 'Spacecraft', label: 'Mass after separation', value: 2855.14 * LB, unit: 'kg', confidence: 'documented', note: '2,855 lb' },
    { group: 'Spacecraft', label: 'Mass at entry', value: 2579 * LB, unit: 'kg', confidence: 'documented', note: '2,579 lb' },
    { group: 'Spacecraft', label: 'Mass afloat', value: 2316.03 * LB, unit: 'kg', confidence: 'documented', note: '2,316 lb' },
    {
      group: 'Pressure suit',
      label: 'Pilot height',
      value: 1.803,
      unit: 'm',
      confidence: 'estimated',
      note: 'Shepard is widely given as 5 ft 11 in, the selection limit; no primary record read',
    },
    {
      group: 'Pressure suit',
      label: 'Suit mass',
      value: 20 * LB,
      unit: 'kg',
      confidence: 'estimated',
      note: '20 lb in NASA’s fact sheet, 22 lb elsewhere: secondary figures that disagree',
    },
    {
      group: 'Pressure suit',
      label: 'Operating pressure',
      value: 4.6 * 6.894757,
      unit: 'kPa',
      confidence: 'documented',
      note: '4.6 psi, held by the suit regulator only if the cabin loses pressure (SEDR 104; Results of the First U.S. Manned Suborbital Space Flight)',
    },
    {
      group: 'Launch pad',
      label: 'Mobile aerial tower reach',
      value: 125 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '125 ft (TM X-53107, 7.3.3.1)',
    },
    {
      group: 'Launch pad',
      label: 'White room',
      value: 3,
      unit: 'level',
      confidence: 'documented',
      note: 'level 3 of the service structure',
    },
    {
      group: 'Launch pad',
      label: 'Pedestal height',
      value: 6 * 0.3048,
      unit: 'm',
      confidence: 'estimated',
      note: '6 ft, scaled off photographs',
    },
    {
      group: 'Launch pad',
      label: 'Service structure height',
      value: 118 * 0.3048,
      unit: 'm',
      confidence: 'estimated',
      note: '118 ft to the crane, scaled off TM X-53107 Figure 7-7',
    },
    {
      group: 'Launch pad',
      label: 'Hardstand',
      value: 204 * 0.3048,
      unit: 'm',
      confidence: 'derived',
      note: 'about 204 ft square: Figure 7-6 scaled on the 535 ft between pads 5 and 6',
    },
    {
      group: 'Launch pad',
      label: 'Service structure launch position',
      value: 195 * 0.3048,
      unit: 'm',
      confidence: 'derived',
      note: 'about 195 ft from the pad centre, same scaling',
    },
    {
      group: 'Launch pad',
      label: 'Blockhouse',
      value: 345 * 0.3048,
      unit: 'm',
      confidence: 'derived',
      note: 'about 345 ft from each pad centre; drawn as scenery',
    },
  ],
  motors: [
    {
      name: 'Rocketdyne A-7 (booster)',
      count: 1,
      thrustN: 78000 * LBF,
      burnS: 143.5,
      propellant: 'ethyl alcohol / liquid oxygen',
      confidence: 'documented',
      note: 'sea level, nominal. MR-3 measured 78,860 lbf, Isp 214.8 s, cutoff at 141.8 s',
    },
    {
      name: 'Escape motor (Grand Central)',
      count: 1,
      thrustN: 52000 * LBF,
      burnS: 0.78,
      propellant: 'solid',
      confidence: 'documented',
      note: '52,000 lbf for 0.78 s, then decaying; three nozzles canted 19° (SEDR 104)',
    },
    {
      name: 'Tower jettison motor',
      count: 1,
      thrustN: 800 * LBF,
      burnS: 1.5,
      propellant: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 785 lbf. Three nozzles canted 30°',
    },
    {
      name: 'Posigrade motor',
      count: 3,
      thrustN: 400 * LBF,
      burnS: 1,
      propellant: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 370 lbf',
    },
    {
      name: 'Retrograde motor (Thiokol)',
      count: 3,
      thrustN: 1000 * LBF,
      burnS: 10,
      propellant: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 992 lbf over 13.2 s. Fired 5 s apart',
    },
    {
      name: 'Pitch and yaw thruster, high',
      count: 4,
      thrustN: 24 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system',
    },
    {
      name: 'Roll thruster, high',
      count: 2,
      thrustN: 6 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system',
    },
    {
      name: 'Attitude thruster, low',
      count: 6,
      thrustN: 1 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system, all axes',
    },
  ],
  trajectory,
  checks,
  flownNote:
    'The powered flight ends 4 % too fast, and what follows from that is high and long: leaving the pad at 1.19 g, one per cent in thrust or weight is four in speed, and the engine is two figures from a summary table. Flown from the separation the report gives, the capsule’s half agrees: height and range within a per cent, the landing within a second (tests/sim.test.mjs).',
  flies: {
    model: 'vehicle',
    drops: [
      { at: TOWER_OFF, nodes: ['EscapeTower'], on: 'tower' },
      {
        at: trajectory.separation.at.value,
        on: 'separation',
        nodes: ['RedstoneAdapter', 'RedstoneAftUnit', 'RedstoneCenterUnit', 'RedstoneTailUnit', 'RedstoneEngine'],
      },
      { at: trajectory.retropack.at.value, nodes: ['Retropack'], on: 'retropack' },
      // the drogue pulls the antenna canister off, and the canister draws the main parachute out after it (the part's own text: "at main parachute deploy")
      { at: 614.8, nodes: ['AntennaCanister'], on: 'main', under: 'drogue' },
    ],
    turned: TURNED,
    datum: CAPSULE_PLANE * IN,
    engine: 'RedstoneEngine',
    // drawn (viewer/effects.ts): the glow of entry off the heat shield, the collar of cloud at Mach 1 where the capsule's cone ends, ice off the oxygen tank
    air: { shield: 'HeatShield', collar: 'HeatShield', frost: ['frost-lox'] },
    chutes: [
      {
        on: 'drogue',
        at: 'AntennaCanister',
        cut: 'ribbon',
        diameter: doc(6 * FT, 'Hammack and Heberlig, p. 9: a 6 ft conical ribbon drogue parachute'),
        gores: guess(8, 'not in anything read: a ribbon parachute this small is drawn with eight'),
        lines: guess(12 * FT, 'not recorded: twice the canopy’s diameter, a usual proportion for a drogue'),
        riser: guess(
          7,
          'not recorded: long enough to carry the canopy clear of the wake of a 74.5 in heat shield, some four of its diameters',
        ),
        colours: {
          value: ['#e9e4d6'],
          confidence: 'estimated',
          source: 'undyed nylon, by judgement: no record of its colour has been read',
        },
        stretch: guess(
          0.35,
          'not recorded: a mortar throws the pack to the end of 10.7 m of riser and lines at some thirty metres a second, by judgement',
        ),
      },
      {
        on: 'main',
        at: 'RecoveryCompartment',
        cut: 'ringsail',
        diameter: doc(
          63 * FT,
          'Hammack and Heberlig, "Landing system" (p. 9): "the main chute is a 63-foot, ring-sail chute" (as the trajectory’s `main` has it)',
        ),
        gores: guess(
          48,
          'not in anything read. Forty-eight is the number remembered for the Mercury ringsail and it is drawn so: unverified',
        ),
        lines: guess(63 * FT, 'not recorded: a line as long as the canopy is wide, the usual proportion for the type'),
        riser: guess(3, 'not recorded: a short riser from the top of the recovery compartment, by judgement'),
        colours: {
          value: ['#ee7a30', '#efeadc'],
          confidence: 'documented',
          source:
            'Hammack and Heberlig, p. 9: "a 63-foot, ring-sail chute with alternate international orange and white gores". ' +
            'Which colours, and that they turn about by gore, are the record’s; the two shades drawn are ours, from no colour chip',
        },
        reefed: {
          mouth: guess(0.25, 'drawn: a reefed ringsail is a narrow bulb. The reefing line’s length is not recorded'),
          until: derived(
            7,
            'Postlaunch Report, air-ground transcript: "main on green" at 10:15, "main chute is reefed" at 10:18, "coming unreefed" at 10:22: about seven seconds after it came out. ' +
              'Drawn only: the simulator’s drag grows evenly over the nine seconds (`trajectory.main.fills`)',
          ),
        },
        stretch: guess(
          0.8,
          'not recorded: the antenna canister, leaving on the drogue, draws 22 m of riser and lines out of the recovery compartment at the 25 to 30 m/s it falls behind by: by judgement',
        ),
      },
    ],
  },
  models: [vehicle, pad, crew],
  surroundings: 'models/usa/mercury/sites/lc5/1961-05.glb',
};
