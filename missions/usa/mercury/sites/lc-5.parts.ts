import type { Action, Flight, Move, Part, Runs } from '../../../../src/types';
import { LC5 } from './lc-5.ts';

/**
 * Launch Complex 5's pad as a flight's data: the parts of pad.glb (sites/lc_5.py), what each does and how it moves.
 * The hardware is the site's and is the same for every flight from it, so it is said once, here; a flight gives the
 * day (`PadDay`): where its count falls on the slider, what it says of each part, and what differed that morning
 * (how the tower waited, when the platforms parted, what was cleared off the pad and when). sites/lc-5.md has every
 * pivot, travel and source.
 */

/**
 * Where things happen on the pad's slider (0 to 1), from the pilot going aboard to the pad standing empty. The stops
 * are layout, chosen so that each event can be seen; a flight's `sequence` says when each fell on the clock.
 */
export interface PadStops {
  /** The work platforms part, two halves each, so the structure can leave. */
  platforms: number;
  /** T-55: the structure rolls to the edge of the pad. */
  rollback: number;
  /** The cherry picker's cab comes to the hatch. */
  cabIn: number;
  /** T-8:45: the structure rolls on to its launch position. */
  launchPosition: number;
  /** T-4 or T-2:30: the cab is lowered "away and down" by remote control. */
  cabAway: number;
  /** T-35 s: the capsule's mast is pulled over by its bungee. */
  umbilical: number;
  /** About T-14 s: "boom drop". */
  boom: number;
  liftoff: number;
  /** Afterwards (not documented): the tower is folded down onto the truck. */
  stow: number;
  /** And driven off. */
  drive: number;
}

/** What a flight says of one part of the pad. */
export interface PartWords {
  summary: string;
  detail: string;
  facts?: [string, string][];
}

/** The pad's parts, by their nodes in pad.glb. */
export type PadNode =
  | 'ServiceStructure'
  | 'CherryPicker'
  | 'LaunchPedestal'
  | 'UmbilicalMast'
  | 'BoosterMast'
  | 'Hardstand'
  | 'GroundEquipment'
  | 'CameraTowers'
  | 'Floodlights';

/** What is said of the hardware no flight changed: the launcher, the two cable masts, the camera towers. */
export const HARDWARE_WORDS: Pick<Record<PadNode, PartWords>, 'LaunchPedestal' | 'UmbilicalMast' | 'BoosterMast' | 'CameraTowers'> = {
  LaunchPedestal: {
    summary: 'A ring table on four legs over a flame deflector.',
    detail:
      'The Redstone launch ring. A Redstone did not roll in flight: it tilted in a plane fixed in the vehicle, so ' +
      'that plane was laid on the flight’s azimuth here, by turning the table the vehicle stood on, and levelled ' +
      'before the count. The fin pads, the tail plugs and the two cable masts turned with it; the legs stand square ' +
      'to the rails. The Mercury-Redstone had no hold-down arms: it stood here under its own weight and left when thrust ' +
      'exceeded it. Its last ties to the ground were two plugs on top of the ring under one fin, pulled out ' +
      'by the rising vehicle. On MR-1 it rose 3.8 inches, shut down, and settled back. The ring stands on a ' +
      'steel scale plate: the vehicle was weighed before and after each propellant was loaded.',
    facts: [
      ['Table', 'about 10 ft across, 5.5 ft high (estimated)'],
      ['Hold-down arms', 'none'],
      ['Tail plugs', '60-pin and 4-pin, under fin II'],
      ['Flame deflector', 'four-sided'],
    ],
  },
  UmbilicalMast: {
    summary: 'Carries the capsule’s umbilical until T−35 seconds.',
    detail:
      'Cable mast No. 2: a slender pole hinged on the launcher’s table, standing a hand’s breadth off the booster ' +
      'and reaching to the capsule’s heat shield. The umbilical (ground power, cooling, communications) is strapped ' +
      'up it and goes from the release head at its top round the cone to the receptacle under the periscope’s lens. ' +
      'At T−35 seconds the plug was ejected, the periscope drew in and its door shut, and a bungee cord pulled the ' +
      'released mast straight out from the rocket about its foot. Shepard, watching through the periscope, "saw the ' +
      'head of the boom start to drop away". Where it stands round the vehicle is worked out from three photographs ' +
      'of July 1961; its form and height are estimated.',
    facts: [
      ['Released', 'pneumatically, at T−35 s'],
      ['Pulled clear by', 'a bungee cord'],
      ['Stands', '3.55 ft from the vehicle’s axis, 20° round from the periscope (derived, ±0.3 ft and ±5°)'],
      ['Height', '66.5 ft to the top of its head (estimated)'],
    ],
  },
  BoosterMast: {
    summary: 'Cooling and a plug for the booster; drops at about T−14 seconds.',
    detail:
      'Cable mast No. 1 served the booster: its "boom plug", and the cooling package that kept the instrument ' +
      'compartment between 10 and 40 °C through the count, drawing the compartment’s air out through a drop-off ' +
      'plate, chilling it with liquid nitrogen and sending it back. The package hangs outboard of the pole at the ' +
      'foot of the chequered section, a white vessel under its blower’s box, and the hoses arch from the pole’s top ' +
      'in to the booster. The countdown calls its release "boom drop": it falls straight out from the rocket, hinged ' +
      'on the launcher’s table beside a fin. Its place is worked out from three photographs of July 1961; its form ' +
      'and height are estimated.',
    facts: [
      ['Boom drop', 'about T−14 s'],
      ['Stands', '3.7 ft from the vehicle’s axis, beside a fin (derived, ±0.2 ft and ±5°)'],
      ['Height', '57.8 ft, 5.5 ft above the foot of the chequered section (estimated)'],
    ],
  },
  CameraTowers: {
    summary: 'Twenty engineering cameras watched the launch.',
    detail: 'Slim lattice towers carrying some of the fixed cameras that filmed every launch from this pad for the engineers.',
  },
};

/** One morning at the pad. */
export interface PadDay {
  T: PadStops;
  words: Record<PadNode, PartWords>;
  /** When each level's two halves part: [level, from, to] on the slider, in the order they went. */
  platforms: [level: number, from: number, to: number][];
  /** The cherry picker before its cab is lowered away: how it waits while the structure stands round the vehicle, and how it comes to the hatch. */
  tower: Move[];
  /** What is taken off the pad before the structure leaves, and when. */
  cleared: Move[];
  /** What the two ends of the mast's travel are called, where the tower did not wait with its mast up. */
  mastEnds?: [string, string];
  /** The flight's azimuth, degrees true: what the launcher's table was turned to, and the two cable masts with it (`launcherTurn`). */
  azimuth: number;
}

export const DEG = Math.PI / 180;
export const X: [number, number, number] = [1, 0, 0];
export const Z: [number, number, number] = [0, 0, 1];
/** A hinged piece turning `degrees` about `axis` between two positions on the slider. */
export const swing = (node: string, axis: [number, number, number], degrees: number, from: number, to: number): Move => ({
  kind: 'swing',
  node,
  axis,
  angle: degrees * DEG,
  from,
  to,
});
/** A pose held from the start: the piece is built somewhere else and stands here until it moves. */
export const held = (node: string, axis: [number, number, number], degrees: number): Move => swing(node, axis, degrees, -1, -0.5);
/**
 * The meridian of a Mercury capsule that lay down range on the launcher, degrees round from the hatch's middle
 * (anticlockwise from above): the periscope's, with a fin's. sites/lc5/site.py `PITCH_PLANE`.
 */
export const PITCH_PLANE = 135;
/**
 * How far the launcher's table stood turned for a flight on `azimuth` (degrees true), and the vehicle on it: degrees
 * about the vertical, anticlockwise from above, from the site's +X to the capsule hatch's middle. The Redstone
 * tilted in a plane fixed in the vehicle and had no roll programme (TM X-53107 4.4 and Figure 4-8), so it was
 * "positioned to flight azimuth" on the launcher (7.1.3, L-25); the capsule rode with the pilot's feet, and the
 * periscope under them, down range. Derived: the site's bearing is estimated. sites/lc5/site.py `launcher_turn`.
 */
export const launcherTurn = (azimuth: number): number => (((LC5.bearingX.value - azimuth - PITCH_PLANE) % 360) + 360) % 360;
/** Where each cable mast stands round the vehicle, degrees from the hatch's middle (anticlockwise from above): sites/lc5/site.py `MASTS`. */
const MAST_AT = { booster: 241, capsule: 115 };
/** The axis a mast standing `degrees` round from the site's +X (toward the structure's side, viewer -Z) falls about, straight out from the vehicle: its hinge pin, in the viewer's frame. */
const fallAxis = (degrees: number): [number, number, number] => [-Math.sin(degrees * DEG), 0, -Math.cos(degrees * DEG)];
/**
 * The cherry picker's angles, degrees about its pins (the viewer's +Z; lc5/cherry_picker.py `pose`, which each build
 * returns): the jib lowering the cab to the pad from the hatch; the jib swung clear of the closed structure; the
 * mast laid forward on its rest; the jib's last fold on to it.
 */
export const TOWER = { lower: 71.94, standby: 31.77, stow: 66.81, fold: 0.86 };
const WHEEL_R = 0.457; // the structure's rail wheels
const ROLL = [33.53, 19.2]; // metres: to the edge of the pad, then on to the launch position
/** What the structure rolls on (types.ts Runs): its rails, on the hardstand and on along the track beyond it (the place's). */
const ON_RAILS: Runs = {
  on: ['Hardstand/steel-rail', 'Track/steel-rail'],
  wheels: 'ServiceStructure_Wheel_',
  wheelRadius: WHEEL_R,
  axle: 'x',
};
/**
 * What a road vehicle, a cart or a hut on skids runs on: the hardstand's concrete and whatever of it lies on that (a rail
 * crossed, a deck plate over a trench), the road between the pads (the place's), and the land off them.
 */
export const ON_ROAD: Runs = { on: ['Hardstand', 'Road'], ground: true };

/** A door leaf on its own hinged node, opened and shut on foot. `degrees` is its `swing` in the model: about the vertical, anticlockwise from above. */
export const doorAction = (id: string, node: string, degrees: number): Action => ({
  id,
  label: 'Open',
  on: node,
  do: { kind: 'toggle', moves: [swing(node, [0, 1, 0], degrees, 0, 1)], back: 'Close' },
});

/** The pad's parts for one morning. */
export function lc5Parts(day: PadDay): Part[] {
  const T = day.T;
  const turn = launcherTurn(day.azimuth);
  return [
    {
      node: 'ServiceStructure',
      name: 'Service structure',
      ...day.words.ServiceStructure,
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
          // (a level that had parted before the slider begins is not something the pad does that morning, and is not waited for)
          needs: [1, 2, 3, 4]
            .filter((level) => day.platforms.some(([parted, , to]) => parted === level && to > 0))
            .map((level) => ({
              node: `ServiceStructure_Platform${level}_Left`,
              atLeast: 1,
              why: 'the platforms are still closed round the rocket',
            })),
        },
      ],
      moves: [
        // the platforms part before anything rolls, each pair when the day says
        ...day.platforms.flatMap(([level, from, to]): Move[] => [
          { kind: 'slide', node: `ServiceStructure_Platform${level}_Left`, by: [-1.372, 0, 0], from, to },
          { kind: 'slide', node: `ServiceStructure_Platform${level}_Right`, by: [1.372, 0, 0], from, to },
        ]),
        { kind: 'slide', by: [0, 0, -ROLL[0]!], from: T.rollback, to: T.cabIn - 0.01, runs: ON_RAILS },
        { kind: 'slide', by: [0, 0, -ROLL[1]!], from: T.launchPosition, to: T.cabAway - 0.02, runs: ON_RAILS },
      ],
    },
    {
      node: 'CherryPicker',
      name: 'Mobile aerial tower',
      ...day.words.CherryPicker,
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
          ends: day.mastEnds ?? ['raised', 'down on its rest'],
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
        // how it waits while the structure stands round the vehicle, and how it comes to the hatch: the day's
        ...day.tower,
        // away and down, by remote control
        swing('CherryPicker_Jib', Z, TOWER.lower, T.cabAway, T.cabAway + 0.12),
        swing('CherryPicker_Cab', Z, -TOWER.lower, T.cabAway, T.cabAway + 0.12),
        // afterwards: jib folded, mast laid forward on its rest, legs up, and away
        swing('CherryPicker_Jib', Z, -TOWER.fold, T.stow, T.stow + 0.03),
        swing('CherryPicker_Mast', Z, -TOWER.stow, T.stow, T.stow + 0.07),
        swing('CherryPicker_Cab', Z, TOWER.fold + TOWER.stow, T.stow, T.stow + 0.07),
        swing('CherryPicker_Outrigger_1', X, -105, T.stow + 0.06, T.drive),
        swing('CherryPicker_Outrigger_3', X, -105, T.stow + 0.06, T.drive),
        swing('CherryPicker_Outrigger_2', X, 105, T.stow + 0.06, T.drive),
        swing('CherryPicker_Outrigger_4', X, 105, T.stow + 0.06, T.drive),
        {
          kind: 'drive',
          from: T.drive,
          to: 1,
          // out along the apron on the blockhouse side, then round toward the blockhouse road
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
          runs: ON_ROAD,
        },
      ],
    },
    {
      node: 'LaunchPedestal',
      name: 'Launcher',
      ...day.words.LaunchPedestal,
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'UmbilicalMast',
      name: 'Capsule cable mast',
      ...day.words.UmbilicalMast,
      explode: [0, 0, 0],
      order: 0,
      moves: [
        // straight out from the vehicle about the pin, until its head is on the pad (masts.py: resting)
        swing('UmbilicalMast', fallAxis(MAST_AT.capsule + turn), 94.9, T.umbilical, T.umbilical + 0.035),
        // the umbilical swings on over the head as the mast goes down, and lies from it on the pad (estimated: how it fell is not recorded)
        swing('UmbilicalMast_Cable', fallAxis(MAST_AT.capsule + turn), 49, T.umbilical, T.umbilical + 0.035),
      ],
    },
    {
      node: 'BoosterMast',
      name: 'Booster cable mast',
      ...day.words.BoosterMast,
      explode: [0, 0, 0],
      order: 0,
      moves: [swing('BoosterMast', fallAxis(MAST_AT.booster + turn), 93.7, T.boom, T.boom + 0.035)],
    },
    {
      node: 'Hardstand',
      name: 'Hardstand and rails',
      ...day.words.Hardstand,
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'GroundEquipment',
      name: 'Ground equipment',
      ...day.words.GroundEquipment,
      // what is taken off the pad before the structure leaves: the day's
      moves: day.cleared,
      // (the two huts' doors stay shut: what they held is not recorded, so no inside is offered: ground_equipment.py)
      actions: [doorAction('trailer-door', 'GroundEquipment_TrailerDoor', -100)],
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'CameraTowers',
      name: 'Camera towers',
      ...day.words.CameraTowers,
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'Floodlights',
      name: 'Floodlights',
      ...day.words.Floodlights,
      explode: [0, 0, 0],
      order: 0,
    },
  ];
}

/**
 * The trailer NASA SP-No 1 taken away behind its tractor, north off the pad past the cherry picker, between two
 * positions on the slider (estimated throughout: sites/lc-5.md, "Moving parts").
 */
export const spareTrailerLeaves = (from: number, to: number): Move[] => [
  {
    kind: 'drive',
    node: 'GroundEquipment_Tractor',
    from,
    to,
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
    runs: ON_ROAD,
  },
  {
    kind: 'drive',
    node: 'GroundEquipment_Trailer',
    from,
    to,
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
    runs: ON_ROAD,
  },
];

/** Hut `k` (1 or 2) dragged off on its skids by its pickup, straight out across the pad's edge to the road behind (estimated). */
export const hutLeaves = (k: number, from: number, to: number): Move[] => [
  { kind: 'slide', node: `GroundEquipment_Hut${k}`, by: [72, 0, 0], from, to, runs: ON_ROAD },
  {
    kind: 'drive',
    node: `GroundEquipment_Tow${k}`,
    from,
    to,
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
    runs: ON_ROAD,
  },
];

/**
 * The pad's own figures, as sites/lc-5.md and the model scripts have them (lc5/site.py): for a flight's `specs`,
 * under the heading 'Launch pad'.
 */
/** How the vehicle stood on the launcher for a flight on `azimuth` (degrees true), for its `specs`. */
export const launcherSpec = (azimuth: number): Flight['specs'][number] => ({
  group: 'Launch pad',
  label: 'Vehicle turned on the launcher',
  value: launcherTurn(azimuth),
  unit: 'deg',
  confidence: 'derived',
  note:
    `the capsule hatch’s middle ${launcherTurn(azimuth)}° round from square to the rails on the blockhouse side, toward the service ` +
    `structure’s parking place: bearing ${LC5.bearingX.value - launcherTurn(azimuth)}° true. The Redstone had no roll programme, so the launcher’s ` +
    `table was turned until the vehicle’s pitch plane lay on the ${azimuth}° azimuth (TM X-53107 4.4, 7.1.3), with the periscope, ` +
    `${PITCH_PLANE}° round from the hatch, down range. The site’s own bearing is estimated; photographs of July 1961 put Liberty Bell 7’s between 50° and 75° (sites/lc-5.md)`,
});

export const LC5_SPECS: Flight['specs'] = [
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
    note: 'level 3 of the service structure, built February to May 1961 (TM X-53107, 7.5.1.2)',
  },
  {
    group: 'Launch pad',
    label: 'Launcher support pads above the hardstand',
    value: 5.5 * 0.3048,
    unit: 'm',
    confidence: 'estimated',
    note: '5.5 ft: 4.9 to 6.0 ft scaled off NASA S63-02651 against the booster’s 70 in body (that photograph is of MR-1 in November 1960, on the same launcher: NASA’s archive has it as MR-4)',
  },
  {
    group: 'Launch pad',
    label: 'Service structure height',
    value: 135 * 0.3048,
    unit: 'm',
    confidence: 'derived',
    note: '135 ft to the crane’s top rail: Complex 26’s twin is 111 ft 9 in (the museum, from the blueprint) and this mast about 23 ft taller (A Noble Endeavor); the Corps of Engineers history says 140 ft',
  },
  {
    group: 'Launch pad',
    label: 'Hardstand',
    value: 200 * 0.3048,
    unit: 'm',
    confidence: 'derived',
    note: '200 ft square: OpenStreetMap’s outline is 195 to 202 ft; TM X-53107 Figure 7-6 scaled on the 520 ft between pads 5 and 6',
  },
  {
    group: 'Launch pad',
    label: 'Service structure’s roll to its launch position',
    value: 173 * 0.3048,
    unit: 'm',
    confidence: 'derived',
    note: '173 ft along the rails: Figure 7-6 puts it 181 ft from the launcher, less the 8 ft from the structure’s middle to the vehicle’s axis',
  },
  {
    group: 'Launch pad',
    label: 'Blockhouse',
    value: 305 * 0.3048,
    unit: 'm',
    confidence: 'derived',
    note: 'its point 305 ft from the launcher (OpenStreetMap way 195709358); drawn as scenery',
  },
];
