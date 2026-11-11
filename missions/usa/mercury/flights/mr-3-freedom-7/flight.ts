import type { Action, Flight, FlightCheck, Keyframe, Measure, ModelDef, Move, Part, Trajectory } from '../../../../../src/types';
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
    summary: 'Where the pilot lies: couch, controls, instruments.',
    detail:
      'A cone of two thin titanium skins holding pure oxygen at 5.1 psi. The pilot lies on a fibreglass couch ' +
      'moulded to his body, back to the heat shield, so that launch and entry loads both push him into it. ' +
      'Behind the heat shield a fabric landing bag drops four feet before splashdown to cushion the impact.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5.1 psi nominal'],
      ['Couch', 'fibreglass, moulded to the pilot'],
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
  // the cabin floodlights, either side of the instrument panel: what the portholes show is lit by them
  lights: [
    { position: [0.3, 0.72, -0.25], colour: 0xffe4c0, intensity: 0.11, reach: 1.1 },
    { position: [-0.3, 0.72, 0.25], colour: 0xffe4c0, intensity: 0.11, reach: 1.1 },
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
    source: `${TMX}, p. 7-33 ("about"); Hammack p. 22: in the count, and nothing was held after T-2 (${HOLDS})`,
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
      'tractor unit, north off the pad: also estimated, as is the tractor. The three searchlights stay where they ' +
      'stand: the record has their crews clearing the area and the lights switched off ("secured"), not taken away.',
    moves: [
      // cleared from the pad's north edge before the gantry is removed (estimated: nothing records it)
      { kind: 'slide', node: 'GroundEquipment_Shower', by: [5.49, 0, 45.4], from: T.platforms + 0.02, to: T.platforms + 0.11 },
      { kind: 'slide', node: 'GroundEquipment_Case', by: [2.51, 0, 42.4], from: T.platforms + 0.03, to: T.platforms + 0.12 },
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
        pivot: [0, 0.483, 0],
        forward: [1, 0],
        wheelRadius: 0.483,
        wheelbase: 3.353,
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
          [0.16, 11],
          [0.37, 13.99],
          [0.66, 16.97],
          [1.01, 19.95],
          [1.4, 22.93],
          [1.81, 25.91],
          [2.23, 28.89],
          [2.62, 31.86],
          [2.94, 34.84],
          [3.19, 37.82],
          [3.36, 40.82],
          [3.47, 43.81],
          [3.54, 46.81],
          [3.59, 49.81],
          [3.62, 52.81],
          [3.64, 55.81],
          [3.65, 58.81],
          [3.66, 66.81],
          [3.66, 74.82],
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
    actions: [
      doorAction('trailer-door', 'GroundEquipment_TrailerDoor', -100),
      doorAction('hut-1-door', 'GroundEquipment_Hut1Door', -100),
      doorAction('hut-2-door', 'GroundEquipment_Hut2Door', -100),
    ],
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

/**
 * What the simulator flies Freedom 7 from (src/sim/fly.ts). Every figure is an input from a
 * report; none was adjusted against the results below. Where a report gives no figure the entry
 * is `estimated` and says what it stands on: tests/sim.test.mjs prints how far each of those moves
 * each result.
 */
/** Postlaunch Report, event table: the escape tower fired clear at 02:22.2, and the capsule had turned heat shield first by 02:37. */
const TOWER_OFF = 142.2;
const TURNED = 157;

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
    speed: doc(30 * FT, `${PLR}, section 4.2: separation velocity approximately 30 plus or minus 3 ft/s, from AZUSA and radar`),
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
    altitude: doc(21_000 * FT, 'Results of the First U.S. Manned Suborbital Space Flight, p. 7; Hammack p. 12: deployed at 21,000 ft'),
    dragArea: guess(
      0.5 * Math.PI * (3 * FT) ** 2,
      'a 6 ft conical ribbon parachute (Hammack p. 12) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found',
    ),
    fills: guess(1, 'a small ribbon parachute fills in about a second: not recorded'),
  },
  main: {
    altitude: doc(10_000 * FT, 'Results, p. 7; Hammack p. 12: main parachute at 10,000 ft'),
    dragArea: derived(
      (2 * 2579.0 * LB * 9.80665) / (1.225 * (29 * FT) ** 2) - 1.0 * CAPSULE_AREA,
      'what brings the re-entry weight down at 29 ft/s at sea level ("descent velocities of 28 to 30 feet per second were always achieved", Hammack p. 28), less the capsule’s own drag: ' +
        '0.82 on a 63 ft canopy',
    ),
    fills: guess(
      9,
      'it comes out reefed and then opens: the pilot reports "main on green" at 10:15, "main chute is reefed" at 10:18, "coming unreefed" at 10:22 and "good" at 10:28 (Postlaunch Report, air-ground transcript). Nine seconds from out to full, evenly, is ours',
    ),
  },
};

/**
 * What the reports say happened, for the simulator to be held against. The tolerances were set
 * before it was run: 2 per cent on heights and distances, 1 per cent on speeds, half a g, ten
 * seconds, a degree. tests/sim.test.mjs.
 */
const check = (id: string, label: string, value: number, unit: string, tolerance: number, source: string): FlightCheck => ({
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
  flies: {
    model: 'vehicle',
    drops: [
      { at: TOWER_OFF, nodes: ['EscapeTower'] },
      {
        at: trajectory.separation.at.value,
        nodes: ['RedstoneAdapter', 'RedstoneAftUnit', 'RedstoneCenterUnit', 'RedstoneTailUnit', 'RedstoneEngine'],
      },
      { at: trajectory.retropack.at.value, nodes: ['Retropack'] },
    ],
    turned: TURNED,
    engine: 'RedstoneEngine',
  },
  models: [vehicle, pad, crew],
  surroundings: 'models/usa/mercury/sites/lc5/1961-05.glb',
};
