import type { Flight, FlightCheck, Keyframe, ModelDef, Part, Trajectory, Winds } from '../../../../../src/types.ts';
import {
  HARDWARE_WORDS,
  held,
  hutLeaves,
  LC5_SPECS,
  launcherSpec,
  launcherTurn,
  lc5Parts,
  ON_ROAD,
  SHOWER_RUNS,
  type PadNode,
  type PartWords,
  spareTrailerLeaves,
  swing,
  TOWER,
  Z,
} from '../../sites/lc-5.parts.ts';
import { LC5 } from '../../sites/lc-5.ts';
import { MERCURY_STICK, mercuryControls, mercuryInstruments, NOT_SIMULATED, sequenceLamp } from '../../vehicles/cabin.ts';
import { CAPSULE_PLANE, CHUTES, cutoffMass, MR3, trajectory as mercuryRedstone, PLR } from '../../vehicles/mercury-redstone.ts';
import { ON_THE_PAD, periscopeMechanism, periscopeMoves } from '../../vehicles/periscope.ts';
import { WEATHER } from './weather.ts';
import { derived, doc, estimated } from '../../../../../src/measure.ts';

const IN = 0.0254;

/**
 * Freedom 7's periscope, out and in (vehicles/periscope.ts): when. How it moves is the model's own (its door, its
 * objective and the link between them each carry their motion: mercury_capsule.periscope_run).
 * Out on the pad until the umbilical was released at T-35 s, the door seen to shut on the film (Postlaunch Report,
 * 10.7.2; Shepard's report, 7.1: "the head of the boom start to drop away as the periscope retracted"); out at
 * separation, 02:32.3 ("Periscope is coming out", 02:35.5: Figure 7.3-2, the pilot's voice); in at 06:44, thirty
 * seconds after the retropack was let go at 06:13.6 (Results, p. 10; "Periscope is retracting", 06:44.5); out with the
 * drogue at 09:38.1, at 21,000 ft, where this capsule's wiring put it ("as did the periscope", Results, p. 113; "The
 * drogue is green at 21,000. The periscope is out", 09:39, Figure 7.3-2).
 * Documented, but for T-35 s, which is derived from TM X-53107's count.
 */
const PERISCOPE_EVENTS: [number, boolean][] = [
  [ON_THE_PAD, true],
  [-35, false],
  [152.3, true],
  [404, false],
  [578.1, true],
];
const PERISCOPE = periscopeMoves(PERISCOPE_EVENTS);
const LBF = 4.4482216;
const LB = 0.45359237;

const vehicleParts: Part[] = [
  {
    node: 'EscapeTower',
    group: 'Spacecraft',
    name: 'Launch escape tower',
    commands: [{ label: 'Jettison the escape tower', ask: 'tower' }],
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
    commands: [{ label: 'Deploy the drogue parachute', ask: 'drogue' }],
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
    commands: [{ label: 'Deploy the main parachute', ask: 'main' }],
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
      'inside and a second for outside, carried stowed inside the hatch: outside there is only the small socket ' +
      'a rescuer put it into, low on the hatch (where exactly is estimated). It was lost in the sea during ' +
      'recovery. The explosive hatch, lighter at 23 lb, arrived one flight later on Liberty Bell 7.',
    facts: [
      ['Type', 'mechanical latch'],
      ['Latch mechanism', '69 lb (31 kg)'],
      ['Release', 'handle inside; socket outside'],
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
      'window, so the periscope was Shepard’s main view outside. Its door, under his feet, is shut here as it was at ' +
      'liftoff: the objective stood out on the pad and was drawn in, the door shutting over it, when the umbilical ' +
      'was pulled 35 seconds before. It came out at separation, went in for the entry and came out again with the ' +
      'drogue; at the launch site and in flight it does so on the clock, and flying the flight yourself you can ' +
      'send it out or in by hand. When each motion happened is documented, and that a link from the periscope’s ' +
      'cartridge worked the door; the linkage itself, and so how far the door opens, are estimated.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Portholes', '2, 10 in diameter'],
      ['Thrusters', 'roll: 6 lbf and 1 lbf'],
    ],
    clocked: PERISCOPE,
    // flying it yourself, a right click on the afterbody offers the periscope by hand (vehicles/periscope.ts)
    commands: [{ label: 'Extend the periscope', back: 'Retract the periscope', ask: 'work:periscope' }],
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
    commands: [
      { label: 'Fire the retrorockets', ask: 'retro' },
      { label: 'Jettison the retropack', ask: 'retropack' },
    ],
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
    commands: [{ label: 'Separate the spacecraft', ask: 'separate' }],
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
      ['Marked', 'UNITED STATES down the two sides abeam of the flight’s line; MR 7 on a plate over each fin'],
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
    commands: [{ label: 'Shut the engine down', ask: 'cutoff' }],
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
    commands: [{ label: 'Shut the engine down', ask: 'cutoff' }],
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
 * The flight's azimuth, degrees true (`trajectory.azimuth` has its sources), and how the vehicle therefore stood on
 * the launcher: the table turned until the pitch plane lay on the azimuth, the capsule's hatch 55 degrees round from
 * the site's +X toward the structure's side (sites/lc-5.parts.ts `launcherTurn`; sites/lc-5.md, "Which way round the
 * vehicle stood"). model/pad.py builds the launcher, the cable masts and the umbilical turned by the same figure.
 */
const AZIMUTH = 105;
const PAD_TURN = launcherTurn(AZIMUTH) * (Math.PI / 180);

/**
 * Where the pilot stands in every scene: on open concrete ten metres from the launcher, across the pad
 * from the cherry picker, with nothing between him and a camera in front of him. (Where he
 * actually stood is not the point: he walked from the transfer van to the structure's lift.) He is
 * 1.6 m and more from anything standing on the pad, and 4 m to one side of where the capsule's cable
 * mast comes down (it falls along 170 degrees round from +X: he stood under it until November 2026).
 */
const PILOT_FACING = -Math.PI / 2; // toward -X, the sunlit side that morning, his back to the vehicle
const PILOT = { position: [-9.4, 0, 3.2] as [number, number, number], rotationY: PILOT_FACING };
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
  // the periscope on its programme, and in the pilot's hands in a flight flown by hand (vehicles/periscope.ts)
  mechanisms: [periscopeMechanism(PERISCOPE_EVENTS)],
  scale: '25.41 m tall · spacecraft 7.91 m · to scale',
  backdrop: 'cape-canaveral',
  slider: ['Assembled', 'Exploded'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts: vehicleParts,
  position: [0, VEHICLE_Y, 0],
  // turned with the launcher's table to the flight's azimuth: the model's own frame has the hatch on +X (model/vehicle.py)
  rotationY: PAD_TURN,
  // The two cabin floodlights: "on full white light" in flight (Postlaunch Report, section 7.3, p. 65). Two, fluorescent,
  // four watts each, is the capsule's (SEDR 104 of December 1959, 10-44 and 10-47, capsules 2 to 8); where they hung is
  // not in anything read: the model has the two fittings above and either side of the pilot's head (the orbital capsule's
  // arrangement, SEDR 104 of 1962, 10-19), at 100 and 82 degrees round from his right toward his head, clear of the hatch
  // and the upper port: the left hand one first (`cabin.lighting` names them by this order). Each light is put toward the middle of the cabin, not at its fitting, 0.32 m out from the axis on its
  // fitting's bearing: a bare point of light at the wall burns the wall beside it, where a floodlight's reflector spreads it
  // (for the same reason the viewer lets a cabin's light fall off with distance, not its square: cabin.ts). Strength chosen
  // by eye. The model's frame is the pilot's turned 45 degrees about the long axis (the hatch on +X: model/vehicle.py).
  lights: [
    { position: [0.182, 0.55, 0.26], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [0.254, 0.55, 0.192], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
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
const FIG = 'Postlaunch Report, Figure 3.1-2';
vehicle.cabin = {
  within: ['CrewCabin'],
  // the top of the pilot's head: 45 degrees round from the hatch, which is on +X (model/vehicle.py)
  overhead: [Math.SQRT1_2, 0, Math.SQRT1_2],
  // a head in a helmet fixed to the suit, and the eyes' own turn: estimated, nothing read gives it. Down is from a gaze
  // that already rests 40 degrees toward his feet, and is as far as keeps all of a 62 degree picture 12 cm or more from
  // the eyes (measured in the model, and less over a shoulder: camera/head.ts): further, and the picture's lower edge is
  // in the suit's collar and the couch's headrest, which the helmet would hide
  head: { side: 1.75, up: 0.95, down: 0.3 },
  instruments: mercuryInstruments({
    Gauge_DescentRate: 'Feet a second downward. Shepard read "about 35 ft/sec" on it under the main parachute.',
    Gauge_Humidity: `Listed among what was aboard (Postlaunch Report, Figure 10.1-1); its face is ours. ${NOT_SIMULATED}`,
  }),
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
  controls: mercuryControls({
    Ctl_TowerJett: 'Pull ring. Found pulled out after the flight (Postlaunch Report, p. 98).',
    Ctl_RetroFire: 'Guarded push button. Shepard fired them himself as a check; here the guard is off.',
  }),
  // The cabin floodlights' switch: CABIN LITES at the outboard top of the left console, OFF above and ON below
  // (Postlaunch Report, Figure 3.1-2), found ON after the flight (Figure 10.1-1); the model is built ON. Two four-watt
  // fluorescent floodlights, white, one on each hand, on the 115 V a-c fans bus (SEDR 104 of December 1959, 10-44, 10-47
  // and Figure 10-7: capsules 2 to 8), with no dimmer and no red light on this capsule. `lights` above are the left
  // hand one and the right hand one, in that order, and `Lamp_Left`, `Lamp_Right` their tubes.
  lighting: {
    control: 'Ctl_CabinLights',
    name: 'Cabin lights',
    about:
      'CABIN LITES, off above and on below: two four-watt fluorescent floodlights, white, which were all the light the dials had. ' +
      'Shepard flew with them on, and saw no stars for it.',
    ways: [
      { says: 'On', lit: [0, 1] },
      { says: 'Off', lit: [] },
    ],
    fittings: ['Lamp_Left', 'Lamp_Right'],
  },
  // the two portholes as light: where the model has them (model/vehicle.py PORTHOLES, which the build prints in this
  // frame, each at the middle of its inner pane on the port's own line), 6.6 in of glass each. The lower first: 15 degrees round from the pilot's right toward his feet, station 28.5,
  // 60 degrees from +X as the capsule stands; the upper at 232.5 degrees, station 34.5, 277.5 as it stands
  windows: [
    { at: [0.32, 0.708, -0.554], out: [0.47, 0.342, -0.814], across: 0.168, name: 'Lower port' },
    { at: [0.076, 0.86, 0.578], out: [0.123, 0.342, 0.932], across: 0.168, name: 'Upper port' },
  ],
  stick: MERCURY_STICK,
  periscope: {
    screen: 'Periscope_Screen',
    name: 'Periscope',
    about:
      'An 8 in screen of the Earth under the capsule: with no window ahead, Shepard’s main view outside. Click to look into it, and again for high power. ' +
      'It shows nothing while its objective is drawn in behind its door: for the climb, and through the entry.',
    // (drawn in, the objective looks at the dark behind its door: what the screen then showed is not in anything read)
    mechanism: 'periscope',
    // the objective's cartridge stands out of the cone under the pilot's feet, level with the upper line of UNITED STATES
    // (station 37, estimated from the flown capsule), 135 degrees from +X as the capsule stands
    at: [-0.494, 0.974, -0.494],
    // toward the Earth with the small end 14.5 degrees below the horizon (SEDR 104 Figure 12-3; NASA SP-45 p. 282, "-14 degrees": both the orbital capsule's)
    axis: [
      -Math.SQRT1_2 * Math.cos((14.5 * Math.PI) / 180),
      Math.sin((14.5 * Math.PI) / 180),
      -Math.SQRT1_2 * Math.cos((14.5 * Math.PI) / 180),
    ],
    // the top of the picture is toward the small end: estimated, nothing read says which way up the display was. On the
    // screen that is toward the pilot's head
    up: [0, 1, 0],
    top: [Math.SQRT1_2, 0, Math.SQRT1_2],
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
/** What this flight says of each part of the pad: the hardware is the site's (sites/lc-5.parts.ts). */
const PAD_WORDS: Record<PadNode, PartWords> = {
  ...HARDWARE_WORDS,
  ServiceStructure: {
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
      ['Lift', 'an open cage up the blockhouse side’s leg, from the pad'],
    ],
  },
  CherryPicker: {
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
      ['Stood', 'about 65 ft from the launcher, on the blockhouse side'],
      ['At the hatch', 'from T−55 min'],
      ['Cab lowered', 'T−4 min, or T−2:30 (sources differ)'],
      ['Control', 'ground, cab, or blockhouse'],
    ],
  },
  Hardstand: {
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
  },
  GroundEquipment: {
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
  },
  Floodlights: {
    summary: 'The count ran through the night.',
    detail:
      'Timber poles in the grass at the pad’s edge, each with a crossarm of floodlights. ' +
      'Shepard was woken at 01:10, went up the gantry at 05:15 and was in the capsule at 05:20, before sunrise. ' +
      'He waited there four hours and fourteen minutes.',
  },
};

const padParts: Part[] = lc5Parts({
  T,
  words: PAD_WORDS,
  // the platforms part, lowest first and the white room last, before anything rolls
  platforms: [1, 2, 4, 3].map((level, i) => [level, T.platforms + i * 0.025, T.platforms + 0.05 + i * 0.025]),
  tower: [
    // standing by, clear of the structure, until it has gone; the cab hangs level whatever the jib does
    held('CherryPicker_Jib', Z, TOWER.standby),
    held('CherryPicker_Cab', Z, -TOWER.standby),
    swing('CherryPicker_Jib', Z, -TOWER.standby, T.cabIn, T.cabIn + 0.09),
    swing('CherryPicker_Cab', Z, TOWER.standby, T.cabIn, T.cabIn + 0.09),
  ],
  azimuth: AZIMUTH,
  cleared: [
    // cleared from the pad's north edge before the gantry is removed (estimated: nothing records it)
    {
      kind: 'slide',
      node: 'GroundEquipment_Shower',
      by: [5.49, 0, 45.4],
      from: T.platforms + 0.02,
      to: T.platforms + 0.11,
      runs: SHOWER_RUNS,
    },
    { kind: 'slide', node: 'GroundEquipment_Case', by: [2.51, 0, 42.4], from: T.platforms + 0.03, to: T.platforms + 0.12, runs: ON_ROAD },
    // the trailer's door steps fold up first, so nothing hangs below its frame while it is towed (estimated)
    swing('GroundEquipment_TrailerSteps', Z, 95, T.platforms, T.platforms + 0.008),
    // the trailer taken away behind a tractor unit, north off the pad past the cherry picker (estimated throughout)
    ...spareTrailerLeaves(T.platforms + 0.01, T.platforms + 0.12),
    // each hut dragged off on its skids by a pickup, straight out across the pad's edge to the road behind (estimated)
    ...[1, 2].flatMap((k) => hutLeaves(k, T.platforms + 0.03 * k, T.platforms + 0.03 * k + 0.08)),
  ],
});

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/usa/mercury/mr-3-freedom-7/pad.glb',
  scale: 'Launch Complex 5 · hardstand 61 m square · to scale',
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
      'buttons. On this flight each glove joined its sleeve by a zipper round the wrist, over a bearing that ' +
      'Shepard found in his way: turning his right hand to yaw, it bumped the parachute on his chest. The ' +
      'quick-removal ring, turning on ball bearings, arrived on the next flight.',
    facts: [
      ['Attachment on MR-3', 'zipper'],
      ['From MR-4', 'quick-removal bearing ring'],
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
const TMX_8_1 = 'NASA TM X-53107, Table 8-1, column MR-3';

/** MR-7 as measured, and its cutoff (vehicles/mercury-redstone.ts `MR3`: the A-7's nozzle is derived on these). */
const THRUST = MR3.thrust;
const ISP = MR3.isp;
const CUTOFF = MR3.cutoff;
const LIFTOFF_MASS = MR3.liftoff;
const CUTOFF_MASS = cutoffMass(LIFTOFF_MASS, THRUST, ISP, CUTOFF);

/** Postlaunch Report, event table: the escape tower fired clear at 02:22.2, and the capsule had turned heat shield first by 02:37. */
const TOWER_OFF = 142.2;
const TURNED = 157;
/** Pounds: capsule No. 7 with and without its tower (Postlaunch Report, 3.1). */
const CAPSULE_LAUNCH = 4040.28;
const CAPSULE_ORBIT = 2855.14;

const KT = 1852 / 3600;
const WIND_FIGURE = `${PLR}, Figure 10.3-1 (p. 96), "Cape wind profile approximately 5 minutes after launch"`;
/**
 * The winds aloft over the Cape that morning, read off the report's figure: two hand-drawn traces, speed in knots and
 * direction in degrees, against height to 60,000 ft. Each row is [height ft, speed kt, give or take kt, direction
 * degrees, give or take degrees]: every 1,000 ft or so and every kink, read twice (by eye, and by tracing the ink with
 * the grid masked) and reconciled; heights are good to 200 ft, so where a trace runs nearly level (the foot and the
 * top of the jet, 44,000 to 45,500 and 51,000 to 56,500 ft) the speed is looser than its own figure says.
 */
const WIND_READ: [ft: number, kt: number, giveKt: number, from: number, giveDeg: number][] = [
  [0, 12, 1, 70, 7],
  [1000, 7.5, 0.7, 90, 4],
  [2000, 5.3, 0.5, 100, 4],
  [3000, 3, 0.5, 107, 4],
  [4000, 1.2, 0.4, 75, 15],
  [5000, 2.8, 0.5, 26, 4],
  [6000, 5, 0.5, 38, 5],
  [6800, 6.3, 0.4, 47, 4],
  [8000, 4, 0.5, 63, 4],
  [9000, 2.5, 0.4, 35, 5],
  [10000, 2.2, 0.4, 84, 5],
  [11000, 3.3, 0.5, 55, 8],
  [12000, 4.7, 0.5, 35, 5],
  [12500, 5.3, 0.5, 30, 4],
  [13000, 6, 0.5, 38, 5],
  [14000, 7.2, 0.4, 50, 5],
  [14700, 6.4, 0.5, 59, 4],
  [15000, 6, 0.5, 47, 8],
  [16000, 4.3, 0.4, 8, 12],
  [17000, 5.4, 0.5, 332, 5],
  [18000, 7.6, 0.5, 326, 3],
  [19000, 8.9, 0.4, 320, 3],
  [20000, 7.1, 0.4, 310, 3],
  [21000, 8.4, 0.5, 318, 3],
  [22000, 9.9, 0.4, 325, 3],
  [23000, 9, 0.5, 315, 6],
  [24000, 7.1, 0.4, 295, 3],
  [25000, 9, 0.6, 302, 4],
  [26000, 11.8, 0.5, 308, 3],
  [26500, 12.5, 0.4, 305, 4],
  [27000, 12, 0.5, 290, 10],
  [28000, 11.5, 0.4, 260, 3],
  [29000, 13.5, 0.5, 273, 6],
  [30000, 15.8, 0.5, 291, 4],
  [30400, 16.5, 0.5, 294, 3],
  [31000, 17.8, 0.5, 289, 4],
  [32000, 19.6, 0.5, 278, 3],
  [32500, 20.5, 0.5, 276, 3],
  [34000, 22.8, 0.4, 280, 3],
  [35600, 22, 0.4, 288, 3],
  [36000, 22.1, 0.4, 289, 3],
  [38000, 23.8, 0.4, 293, 3],
  [40000, 25.1, 0.4, 303, 3],
  [42000, 27.5, 0.5, 289, 4],
  [43000, 29.5, 0.5, 277, 3],
  [44000, 34, 3, 275, 3],
  [44500, 42, 4, 275, 3],
  [45000, 51, 4, 276, 3],
  [46000, 57.8, 0.7, 283, 4],
  [47000, 58.8, 0.5, 291, 3],
  [48000, 57.1, 0.5, 292, 3],
  [49000, 58, 0.5, 292, 3],
  [50000, 60, 0.5, 293, 3],
  [51000, 57, 1.5, 297, 3],
  [52000, 50, 3, 302, 3],
  [53000, 43.5, 1.5, 304, 3],
  [54000, 42, 0.5, 307, 3],
  [55000, 39.5, 2, 312, 3],
  [56000, 32, 3, 324, 3],
  [56400, 28.2, 1, 323, 3],
  [57400, 26.4, 0.4, 317, 3],
  [58000, 26.9, 0.4, 314, 3],
  [59000, 28, 0.4, 314, 3],
  [60000, 23, 2, 312, 3],
];
const WINDS: Winds = {
  levels: [
    ...WIND_READ.map(([ft, kt, giveKt, from, giveDeg]) => ({
      height: ft * FT,
      speed: doc(kt * KT, `${WIND_FIGURE}: ${kt} kt at ${ft.toLocaleString('en-US')} ft, read to ${giveKt} kt`),
      from: doc(
        from,
        `${WIND_FIGURE}: ${from} degrees at ${ft.toLocaleString('en-US')} ft, read to ${giveDeg} degrees. The figure does not say which way the bearing is meant: taken as the bearing the wind blows from, ` +
          'as a sounding gives it, which the Cape’s 12Z rawinsonde of the same morning bears out from 300 hPa up (IGRA USM00074794: 280 degrees at 58 kt at 45,900 ft against this figure’s 282 at 57.5)',
      ),
    })),
    // above the figure: the Cape's routine sounding two and a half hours before liftoff, the only wind there is for those heights
    ...(
      [
        [20_681, 4, 70, 50],
        [23_915, 3, 120, 30],
      ] as const
    ).map(([m, speed, from, hPa]) => ({
      height: m,
      speed: doc(
        speed,
        `NOAA IGRA, station USM00074794 (Cape Kennedy), 5 May 1961 12Z, ${hPa} hPa at ${m.toLocaleString('en-US')} m: ${speed} m/s, given to the whole metre a second. Another balloon, 2 h 34 min before liftoff`,
      ),
      from: doc(from, `NOAA IGRA, station USM00074794, 5 May 1961 12Z, ${hPa} hPa: from ${from} degrees, given to ten degrees`),
    })),
  ],
  calmAbove: estimated(
    30_000,
    'no wind is recorded above 30 hPa (24 km). Taken as falling evenly to nothing by 30 km, where the air is a hundredth of the surface’s and what it does to the flight is past measuring. Ours',
  ),
};

/** How fast the spacecraft and the booster parted: the trajectory's figure, and the booster's own push as a body let go. */
const trajectoryPush = doc(30 * FT, `${PLR}, section 4.2: separation velocity approximately 30 plus or minus 3 ft/s, from AZUSA and radar`);

/**
 * What the simulator flies Freedom 7 from (src/sim/fly.ts): this flight's own day and figures, on the stack's hardware
 * (vehicles/mercury-redstone.ts). Every figure is an input from a report; none was adjusted against the results below.
 */
const trajectory: Trajectory = mercuryRedstone({
  winds: WINDS,
  azimuth: doc(
    AZIMUTH,
    'NASA TM X-53107, section 7.2: a 105-degree launch azimuth; the Postlaunch Report has the Earth-fixed heading at separation as 105.23',
  ),
  liftoffMass: doc(LIFTOFF_MASS, `${TMX_8_1}: weight at liftoff 66,098 lb`),
  thrust: doc(THRUST, `${TMX_8_1}: thrust, sea level, 78,860 lb`),
  isp: doc(
    ISP,
    `${TMX_8_1}: engine specific impulse, sea level, 214.8 s (so 367.1 lb/s, taken as the whole flow, turbine exhaust included)`,
  ),
  cutoff: doc(CUTOFF, `${PLR}, section 4.1: booster cut-off at 02:21.8, by the velocity integrator`),
  separation: {
    at: doc(152.3, `${PLR}, section 4.1: capsule separation at 02:32.3`),
    mass: doc(CAPSULE_ORBIT * LB, `${PLR}, section 3.1: capsule weight in the "orbit" configuration, 2855.14 lb`),
    boosterMass: derived(
      CUTOFF_MASS - CAPSULE_LAUNCH * LB,
      'the liftoff weight, less the flow for 141.8 s, less the capsule and tower at launch (4040.28 lb): about 10,000 lb of booster and residuals',
    ),
    speed: trajectoryPush,
    heading: doc(105.23, `${PLR}, section 4.2: Earth-fixed heading angle at separation, 105.23 degrees`),
  },
  retro: {
    fires: [314.1, 318.8, 323.6].map((t, i) => doc(t, `${PLR}, section 4.1: retro no. ${i + 1} fire`)),
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
  drogue: doc(21_000 * FT, 'Results of the First U.S. Manned Suborbital Space Flight, p. 7; Hammack p. 9: deployed at 21,000 ft'),
  main: doc(10_000 * FT, 'Results, p. 7; Hammack p. 9: main parachute at 10,000 ft'),
  starts: estimated(300, 'a May morning at the Cape, about 27 C: what the shield and skin stood at on the pad is not in anything read'),
  stack: {
    booster: 'MR-3',
    boosterDry: 8093,
    compound: 330,
    compoundSource: 'The report gives MR-3’s damping compound as both 330 and 340 lb: 330 is taken',
    liftoff: 66_098,
    fluids: 'derived',
    capsuleLaunch: CAPSULE_LAUNCH,
    capsuleOrbit: CAPSULE_ORBIT,
    orbitWeight: { confidence: 'documented', source: `${PLR}, section 3.1: 2855.14 lb in the "orbit" configuration` },
    towerWeight: {
      confidence: 'derived',
      source: `${PLR}, section 3.1: the launch weight (4040.28 lb) less the weight in the "orbit" configuration: 1,185 lb, which is the tower and whatever else left with it`,
    },
    tower: doc(TOWER_OFF, `${PLR}, section 4.1: the escape tower released at 02:22.2`),
    earthward: derived(
      180,
      'the periscope’s side. The record has the spacecraft yawed 180 degrees to go heat shield first and held at 34 degrees ' +
        '(Results of the First U.S. Manned Suborbital Space Flight, the flight plan, page 13 of the NTRS file) with the pilot watching the Earth in the periscope. ' +
        'On the pad that side lay down range: the Redstone tilted in a plane fixed in the vehicle and did not roll (TM X-53107 4.4, Figure 4-8), so the launcher’s table ' +
        'was turned until that plane lay on the azimuth (7.1.3: "positioned to flight azimuth"), and the capsule rode with the pilot’s feet and the periscope under them ' +
        'down range, so that pitched over he was head up. The body’s +Z points against the azimuth, so the periscope’s side is 180 degrees from it. ' +
        '(125 until November 2026, while the model stood the vehicle square to the rails, the hatch bearing 295 degrees true; 80 before that)',
    ),
    push: trajectoryPush,
    retropackMass: derived(
      (CAPSULE_ORBIT - 2579.0) * LB,
      `${PLR}, section 3.1: the "orbit" weight less the re-entry weight, 276.14 lb. That is everything that went between the two, the retrorockets’ and posigrades’ burned propellant with it, ` +
        'so the pack as it fell away was lighter than this (by some 170 lb, if the motors’ 13,000 lb-s each came at a specific impulse of 230 s, which is not recorded): it is flown at the whole figure',
    ),
  },
});

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
  weather: WEATHER,
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
    // (the pad's own figures are the site's, the same for every flight from it: sites/lc-5.parts.ts, from lc-5.md)
    ...LC5_SPECS,
    launcherSpec(AZIMUTH),
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
    // (75 % alcohol and liquid oxygen: the pale fire seen through, viewer/flames.ts)
    burns: 'alcohol-lox',
    // drawn (viewer/effects.ts): the glow of entry off the heat shield, the collar of cloud at Mach 1 where the capsule's cone ends, ice off the oxygen tank
    air: { shield: 'HeatShield', collar: 'HeatShield', frost: ['frost-lox'] },
    chutes: CHUTES,
  },
  models: [vehicle, pad, crew],
  surroundings: 'models/usa/mercury/sites/lc5/1961-05.glb',
};
