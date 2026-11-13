import type { Action, Flight, Move, Part } from '../../../../src/types';

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
  },
  UmbilicalMast: {
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
  },
  BoosterMast: {
    summary: 'Cooling and a plug for the booster; drops at about T−14 seconds.',
    detail:
      'The second mast served the booster: a plug, and a cooling package fed with liquid nitrogen for the ' +
      'instrument compartment. The countdown calls its release "boom drop". Its form and exact place are ' +
      'the least certain things on this pad.',
    facts: [['Boom drop', 'about T−14 s']],
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
const WHEEL_R = 0.457; // the structure's rail wheels
const ROLL = [33.53, 19.2]; // metres: to the edge of the pad, then on to the launch position

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
        swing('UmbilicalMast', X, -88, T.umbilical, T.umbilical + 0.035), // (over away from the vehicle, toward +Y: it stands behind it)
        // the umbilical swings down from the release head as the mast goes over, and hangs from it to the pad (estimated: how it fell is not recorded)
        swing('UmbilicalMast_Cable', X, 145, T.umbilical, T.umbilical + 0.035),
      ],
    },
    {
      node: 'BoosterMast',
      name: 'Booster cable mast',
      ...day.words.BoosterMast,
      explode: [0, 0, 0],
      order: 0,
      moves: [swing('BoosterMast', X, 88, T.boom, T.boom + 0.035)],
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
  },
];

/** Hut `k` (1 or 2) dragged off on its skids by its pickup, straight out across the pad's edge to the road behind (estimated). */
export const hutLeaves = (k: number, from: number, to: number): Move[] => [
  { kind: 'slide', node: `GroundEquipment_Hut${k}`, by: [72, 0, 0], from, to },
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
  },
];

/**
 * The pad's own figures, as sites/lc-5.md and the model scripts have them (lc5/site.py): for a flight's `specs`,
 * under the heading 'Launch pad'.
 */
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
    note: '5.5 ft: 4.9 to 6.0 ft scaled off NASA S63-02651 against the booster’s 70 in body',
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
