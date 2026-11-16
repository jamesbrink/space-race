import type { Action, Flight, Keyframe, Machine, ModelDef, Move, Part } from '../../../../src/types.ts';

/**
 * Launch Complex 19's pad as a flight's data: the parts of pad.glb (places/cape-canaveral/lc_19.py), what each does and how
 * it moves. The hardware is the site's and is the same for every Gemini flight from it, so it is said once, here; a
 * flight gives the day (`Lc19Day`): where its count falls on the slider and what it adds to each part's words.
 * places/cape-canaveral/lc-19.md has every pivot, travel and source.
 */

export const DEG = Math.PI / 180;
const FT = 0.3048;
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';

// The model's figures, in its feet (places/cape-canaveral/lc19/site.py and erector.py): change them together.
/** The first stage engines' exits over the launch deck: the thrust mount's 13.9 ft less the 123.8 in the engines hang below the skirt's foot. */
export const ENGINE_EXIT = (13.9 - (1348.103 - 1224.311) / 12) * FT;
/** The erector's hinge: south of the vehicle's axis, and over the deck. */
export const HINGE: [south: number, up: number] = [13 * FT, 5.5 * FT];
const BASE = 3; // the floor at the erector's foot, ft over the deck
const WORK_LEVELS = [36, 47, 58, 69, 80]; // the five work platforms, ft
const ROOM_LEVELS = [91 + 2 / 12, 102 + 2 / 12, 109 + 2 / 12, 118 + 2 / 12]; // the white room's four floors, ft (documented)
const DOOR_LENGTHS = 4;
const DOOR_LENGTH = (ROOM_LEVELS[3]! + 8 - 88) / DOOR_LENGTHS; // one length of the north door, ft
/** Which way the umbilical tower's lines run to the vehicle, in the viewer's frame (x along the stand, z toward the west): from the tower, 22 ft north and 20 ft west. */
const LINE: [number, number] = [22 / Math.hypot(22, 20), 20 / Math.hypot(22, 20)];

/**
 * What drives each of the pad's motions, as it is heard (types.ts Machine). What drove each is the record's where it
 * says, and how each sounded is ours throughout (sound/model.ts).
 */
export const BY: Record<'erector' | 'platforms' | 'northDoor' | 'lift' | 'door' | 'lines', Machine> = {
  erector: {
    kind: 'winch',
    confidence: 'documented',
    source: `"Through a winch system, a small, 150-horsepower electrically driven motor raises and lowers the 140-ton erector" (${HANDBOOK}, p. 7-10)`,
  },
  platforms: {
    kind: 'hydraulic',
    confidence: 'documented',
    source: `"nine hydraulically operated work platforms which cradle around the booster and its spacecraft" (${HANDBOOK}, p. 7-10)`,
  },
  northDoor: {
    kind: 'motor',
    confidence: 'derived',
    source: `"A rollup door extending down the entire north side of the white room" (${HANDBOOK}, p. 7-13): that a motor rolled it is ours`,
  },
  lift: {
    kind: 'lift',
    confidence: 'documented',
    source: `a service elevator on the west side and an express elevator on the east (${HANDBOOK}, p. 7-10)`,
  },
  door: { kind: 'door', confidence: 'derived', source: 'a hinged leaf worked by hand: what the model is' },
  lines: {
    kind: 'release',
    confidence: 'documented',
    source: `"disconnected in one of three methods at liftoff: ordnance-initiated, mechanical, and/or by dropweights" (${HANDBOOK}, p. 7-13)`,
  },
};

/** A hinged piece turning `degrees` about `axis` between two positions on the slider, driven by `machine`. */
const swing = (node: string, axis: [number, number, number], degrees: number, from: number, to: number, machine: Machine): Move => ({
  kind: 'swing',
  node,
  axis,
  angle: degrees * DEG,
  from,
  to,
  machine,
});

/**
 * Where things happen on the pad's slider (0 to 1), from the crew coming up to four seconds after liftoff. The stops
 * are layout, chosen so that each event can be seen; a flight's `sequence` says when each fell on the clock.
 */
export interface Lc19Stops {
  /** The white room's three opening floors are raised from round the spacecraft. */
  room: [number, number];
  /** The five work platforms are raised from round the launch vehicle. */
  platforms: [number, number];
  /** The white room's north door is rolled up, "just prior to lowering the erector". */
  door: [number, number];
  /** The erector is laid down. */
  erector: [number, number];
  /** The umbilicals are released and fall, at liftoff. */
  lines: [number, number];
}

/** What a flight says of one part of the pad. */
export interface PartWords {
  summary: string;
  detail: string;
  facts?: [string, string][];
}

/** The pad's parts, by their nodes in pad.glb. */
export type Lc19Node =
  | 'Erector'
  | 'UmbilicalTower'
  | 'ThrustMount'
  | 'LaunchStand'
  | 'Ramp'
  | 'Stage2Stand'
  | 'Stage2UmbilicalTower'
  | 'Stage2Erector'
  | 'HoistingCrane'
  | 'CameraTower'
  | 'DeckFittings'
  | 'Floodlights';

/** One morning at the pad. */
export interface Lc19Day {
  stops: Lc19Stops;
  /** What the flight adds to the site's words for a part: a sentence of its own morning, a fact. */
  adds?: Partial<Record<Lc19Node, Partial<PartWords>>>;
}

/** What is said of the hardware, the same for every flight from the pad. */
export const LC19_WORDS: Record<Lc19Node, PartWords> = {
  Erector: {
    summary: 'The tower that carried the rocket up, served it, and lay down before launch.',
    detail:
      'No gantry rolled away from this pad. The erector is a steel tower hinged at the deck: laid flat, each stage was rolled ' +
      'inside it on its trailer through the roof, and a 150 horsepower winch in the stand stood tower and stage up together. ' +
      'Upright it was the service structure, with nine hydraulic work platforms that closed round the vehicle, two elevators and ' +
      'stairs, and at its top the white room, a sealed aluminium box four floors high round the spacecraft, kept at 72 °F and 50 ' +
      'per cent humidity. The crew rode the express elevator on its east side to the white room and stepped across to the hatches, ' +
      'which face it. Before launch the platforms were raised, the white room’s north door was rolled up so that the room would ' +
      'clear the spacecraft, and the whole 140 tons was laid back down on the deck, out of the way of the ejection seats, which ' +
      'would have thrown the crew out over it. Its height, its weight, its white room and which elevator was where are Martin’s ' +
      'own figures; where each floor, stair and brace is, is read off photographs.',
    facts: [
      ['Height', '138 ft (documented)'],
      ['Weight', '140 tons, raised by a 150 hp winch (documented)'],
      ['White room', '50 ft high, 25 ft square; floors at 91, 102, 109 and 118 ft (documented)'],
      ['Work platforms', 'nine, hydraulic (documented); eight built to open'],
      ['Elevators', 'service on the west to 80 ft; express on the east to the white room (documented)'],
      ['Plan', '18.5 by 25 ft (documented, of the erector or of the white room: taken for the tower)'],
    ],
  },
  UmbilicalTower: {
    summary: 'A three-sided tower whose seven booms carried everything the vehicle needed until it left.',
    detail:
      'Every command from the blockhouse, the power, the propellants, the nitrogen and the cooling air reached the vehicle ' +
      'through this tower: 28 umbilicals to the launch vehicle and 3 to the spacecraft, on booms at seven levels. It was ' +
      'lengthened for Gemini to carry two more booms for the spacecraft. The fuel and oxidizer lines were taken off by hand ' +
      'late in the count. The rest let go at liftoff, by an explosive, a mechanical latch or a falling weight: as the vehicle ' +
      'began to move a weight dropped, and its lanyard pulled the plug and swung the cable clear. The booms stayed where they ' +
      'were. Its shape, height, sides and boom levels are Martin’s; where it stood is read off photographs to about six feet.',
    facts: [
      ['Height', '102 ft, triangular, 14 ft sides (documented)'],
      ['Booms', 'at 25, 43, 54 and 71 ft (first stage), 80 and 90 ft (second), 99 ft (spacecraft); 14 to 18 ft long (documented)'],
      ['Umbilicals', '28 to the launch vehicle, 3 to the spacecraft (documented)'],
      ['Stood', 'north-west of the vehicle (estimated, to 6 ft)'],
    ],
  },
  ThrustMount: {
    summary: 'Four A-frames, one under each longeron, each with a stud whose nuts had to be blown.',
    detail:
      'The Titan II did not rest on its engines. Four longerons on the first stage’s skirt sat on four A-frame mounts and were ' +
      'bolted down, one 1 3/8 inch stud each, with two nuts. The engines started with the vehicle held: it stayed on the pad for ' +
      'about three seconds while two safety systems watched the engines come up, and only then were the nuts sheared by ' +
      'explosive charges and the vehicle let go; one nut of each pair was enough. The engines hang below the skirt, over the ' +
      'opening in the deck that leads to the flame bucket. The mounts’ form is read off photographs.',
    facts: [
      ['Mounts', 'four A-frames (documented)'],
      ['Held by', 'four 1 3/8 in studs, eight nuts sheared by explosive charges (documented)'],
      ['Skirt over the deck', '13.9 ft (estimated, three photographs)'],
    ],
  },
  LaunchStand: {
    summary: 'A concrete stand three storeys high, with a steel deck built out over the flame.',
    detail:
      'Built for Titan I in 1957 and rebuilt for Gemini in 1963, the stand is a concrete building 65 feet wide whose roof is ' +
      'the deck. Inside were the rooms the vehicle was checked out from: a transfer room of 65 racks, power and hydraulic rooms, ' +
      'a guidance room, and on the second floor the motor and winch that raised the erector. At its north end the deck is steel, ' +
      'extended for Gemini, with an opening under each of two firing positions. Under each, a steel bucket turns the flame north ' +
      'into the flume, with 25,000 gallons of water a minute. The rooms are not built: the doors are shut.',
    facts: [
      ['Size', '28 ft tall, 65 ft wide, 450 ft long (documented)'],
      ['Flame bucket', '19 ft 8 in wide, 17 ft 6 in tall where the flame enters (documented)'],
      ['Level deck', '300 ft long, south from the pad (documented)'],
    ],
  },
  Ramp: {
    summary: 'The earth ramp every stage came up, tail first, on its trailer.',
    detail:
      'A Titan stage arrived lying on a trailer and was drawn up this ramp on to the deck, then rolled into the erector as it ' +
      'lay. The crew’s van came the same way. Its line is what is left on the ground today; its slope is not recorded.',
    facts: [['Length', 'about 220 ft (estimated, from imagery)']],
  },
  Stage2Stand: {
    summary: 'A second firing position, for a second stage on its own.',
    detail:
      'The complex was built to test as well as to launch. On the deck’s east half a second stage could be stood up alone and ' +
      'fired for checkout, over a flame bucket of its own. It was not used on a Gemini launch day.',
    facts: [['Stood', '39 ft east of the vehicle (estimated)']],
  },
  Stage2UmbilicalTower: {
    summary: 'The second-stage position’s own small tower.',
    detail: 'It carried the lines to a second stage on the test stand. Its booms were moved when the complex was rebuilt for Gemini.',
    facts: [['Height', 'about 42 ft (estimated)']],
  },
  Stage2Erector: {
    summary: 'The smaller erector, laid down beside the vehicle’s on every launch day.',
    detail:
      'A shorter tower of the same kind, hinged the same way, that stood a second stage on the test stand. Martin’s drawing of ' +
      'the complex on a Gemini launch day shows it lowered, and so it is built. Its size is read off photographs.',
    facts: [['Length', 'about 66 ft (estimated)']],
  },
  HoistingCrane: {
    summary: 'The crane that lifted the spacecraft from the ground to the deck.',
    detail:
      'The spacecraft came to the foot of the stand’s north-west side on a dolly, in a plastic shroud. This five-ton crane ' +
      'lifted it the 28 feet to the deck and set it down north of the vehicle; the bridge crane in the white room then raised ' +
      'it 109 feet and carried it in through the room’s north door.',
    facts: [
      ['Capacity', '5 tons (documented)'],
      ['Lift', '28 ft, ground to deck (documented)'],
    ],
  },
  CameraTower: {
    summary: 'A lattice tower beside the deck, with a platform at its head.',
    detail:
      'It stands on the land west of the deck and reaches 25 feet over it. What it carried is read off one photograph: a lamp and a housing taken for a camera.',
  },
  DeckFittings: {
    summary: 'The crew’s ramp, the guard’s shelter, the white fence, the windsock.',
    detail:
      'The red grating ramp is the one Grissom and Young walked up, to the floor at the erector’s foot and the express elevator. ' +
      'The shelter, the picket fence and the windsock are in photographs of the deck in March 1965; where each stood is estimated. ' +
      'The steps on the erector’s other side are ours.',
  },
  Floodlights: {
    summary: 'A lamp to a pole, down both edges of the deck.',
    detail: 'They lit the deck and the erector through the night’s work. Their number and spacing are read off photographs.',
  },
};

/** The two elevators, as actions of the erector: each stop a slide from where its car is built, at the foot. */
const lift = (id: string, node: string, stops: [string, number][]): Action => ({
  id,
  label: 'Elevator',
  on: node,
  do: { kind: 'lift', node, machine: BY.lift, speed: 1.0, stops: stops.map(([name, ft]) => ({ name, by: [0, (ft - BASE) * FT, 0] })) },
});

/** The pad's parts for one morning. */
export function lc19Parts(day: Lc19Day): Part[] {
  const s = day.stops;
  const said = (node: Lc19Node): PartWords => {
    const site = LC19_WORDS[node];
    const add = day.adds?.[node];
    return {
      summary: add?.summary ?? site.summary,
      detail: add?.detail ? `${site.detail} ${add.detail}` : site.detail,
      ...(site.facts || add?.facts ? { facts: [...(site.facts ?? []), ...(add?.facts ?? [])] } : {}),
    };
  };
  const plain = (node: Lc19Node, name: string, group: string): Part => ({ node, name, group, ...said(node), explode: [0, 0, 0], order: 0 });
  // each level's two leaves fold up about their outer edges; the white room's three go first, then the five below
  const levels = [...WORK_LEVELS, ...ROOM_LEVELS.slice(0, 3)];
  const leaves = levels.flatMap((_, k) => {
    const [from, to] = k < WORK_LEVELS.length ? s.platforms : s.room;
    const n = k < WORK_LEVELS.length ? WORK_LEVELS.length : 3;
    const i = k < WORK_LEVELS.length ? k : k - WORK_LEVELS.length;
    const a = from + ((to - from) * i) / (n + 1);
    const b = a + ((to - from) * 2) / (n + 1);
    return [
      swing(`Erector_Platform_${k + 1}_East`, [1, 0, 0], -90, a, b, BY.platforms),
      swing(`Erector_Platform_${k + 1}_West`, [1, 0, 0], 90, a, b, BY.platforms),
    ];
  });
  const doors: Move[] = Array.from({ length: DOOR_LENGTHS }, (_, k) => ({
    kind: 'slide',
    node: `Erector_NorthDoor_${k + 1}`,
    by: [0, (DOOR_LENGTHS - k) * DOOR_LENGTH * FT, 0],
    from: s.door[0],
    to: s.door[1],
    machine: BY.northDoor,
  }));
  const lines = Array.from({ length: 7 }, (_, k) =>
    // each falls about its boom's tip, toward the tower, to hang; the lower ones a moment after the upper
    swing(
      `UmbilicalTower_Line_${k + 1}`,
      [-LINE[1], 0, -LINE[0]],
      78,
      s.lines[0],
      s.lines[0] + (s.lines[1] - s.lines[0]) * (0.6 + 0.05 * k),
      BY.lines,
    ),
  );
  return [
    {
      node: 'Erector',
      name: 'Launch vehicle erector',
      group: 'Launch Complex 19',
      ...said('Erector'),
      explode: [0, 0, 0],
      order: 0,
      actions: [
        lift('express-elevator', 'Erector_Lift_East', [
          ['Deck', BASE],
          ['White room, 91 ft level', ROOM_LEVELS[0]!],
          ['White room, 102 ft level · the spacecraft', ROOM_LEVELS[1]!],
          ['White room, 109 ft level', ROOM_LEVELS[2]!],
        ]),
        lift('service-elevator', 'Erector_Lift_West', [
          ['Deck', BASE],
          ...WORK_LEVELS.map((z, k): [string, number] => [`Work platform ${k + 1}, ${z} ft`, z]),
        ]),
        {
          id: 'white-room-door',
          label: 'Open',
          on: 'Erector_WhiteRoom_Door',
          do: { kind: 'toggle', moves: [swing('Erector_WhiteRoom_Door', [0, 1, 0], -95, 0, 1, BY.door)], back: 'Close' },
        },
      ],
      functions: [
        ...levels.map((z, k) => ({
          nodes: [`Erector_Platform_${k + 1}_East`, `Erector_Platform_${k + 1}_West`],
          name: k < WORK_LEVELS.length ? `Work platform ${k + 1} (${z} ft)` : `White room floor (${Math.round(z)} ft)`,
          ends: ['down', 'raised'] as [string, string],
          seconds: 20,
        })),
        { nodes: doors.map((m) => m.node!), name: 'White room north door', ends: ['shut', 'rolled up'] as [string, string], seconds: 40 },
        {
          nodes: ['Erector'],
          name: 'Lower the erector',
          ends: ['standing', 'laid down'] as [string, string],
          seconds: 120,
          needs: [
            ...levels.map((z, k) => ({
              node: `Erector_Platform_${k + 1}_East`,
              atLeast: 1,
              why: `The platform at ${Math.round(z)} ft is still down round the vehicle.`,
            })),
            {
              node: 'Erector_NorthDoor_1',
              atLeast: 1,
              why: 'The white room’s north door is shut: the room would not clear the spacecraft.',
            },
          ],
        },
      ],
      moves: [
        ...leaves,
        ...doors,
        // laid down to the south about its hinge at the deck: its head toward the ramp
        swing('Erector', [0, 0, -1], 90, s.erector[0], s.erector[1], BY.erector),
      ],
    },
    {
      node: 'UmbilicalTower',
      name: 'Umbilical tower',
      group: 'Launch Complex 19',
      ...said('UmbilicalTower'),
      explode: [0, 0, 0],
      order: 0,
      functions: [{ nodes: lines.map((m) => m.node!), name: 'Umbilicals', ends: ['plugged in', 'released'], seconds: 3 }],
      moves: lines,
    },
    plain('ThrustMount', 'Thrust mount', 'Launch Complex 19'),
    plain('LaunchStand', 'Launch stand', 'Launch Complex 19'),
    plain('Ramp', 'Ramp', 'Launch Complex 19'),
    plain('HoistingCrane', 'Spacecraft hoisting crane', 'Launch Complex 19'),
    plain('Stage2Stand', 'Second-stage test stand', 'The second-stage position'),
    plain('Stage2UmbilicalTower', 'Second-stage umbilical tower', 'The second-stage position'),
    plain('Stage2Erector', 'Second-stage erector', 'The second-stage position'),
    plain('DeckFittings', 'On the deck', 'On and round the deck'),
    plain('Floodlights', 'Floodlights', 'On and round the deck'),
    plain('CameraTower', 'Camera tower', 'On and round the deck'),
  ];
}

/** The pad's own views (directions in the viewer's frame: +x along the stand to the south, +z to the west). */
export const LC19_VIEWS: ModelDef['views'] = [
  // from the south-east, as the crew's van came up: the erector's south face, the towers either side
  { id: 'erector', label: 'Erector', nodes: ['Erector'], from: [0.75, 0.12, -0.65] },
  { id: 'whiteroom', label: 'White room', centreY: 31.5, span: 16, from: [-0.55, 0.2, -0.81] },
  { id: 'foot', label: 'Erector’s foot', centreY: 3, span: 14, from: [0.86, 0.14, -0.5] },
  { id: 'tower', label: 'Umbilical tower', nodes: ['UmbilicalTower'], from: [-0.8, 0.1, -0.6] },
  { id: 'mount', label: 'Thrust mount', nodes: ['ThrustMount'], from: [-0.6, 0.2, -0.78] },
  // from the flume, as NASA S65-43447 has it: the deck's north face and the two flame buckets
  { id: 'ducts', label: 'Flame buckets', centreY: -3, span: 26, from: [-0.97, -0.06, -0.22] },
  { id: 'stage2', label: 'Second-stage position', nodes: ['Stage2Stand', 'Stage2UmbilicalTower', 'Stage2Erector'], from: [0.3, 0.3, -0.9] },
  { id: 'deck', label: 'The deck', nodes: ['DeckFittings'], from: [0.6, 0.35, -0.72] },
];

/** A flight's pad model at Complex 19: its file, its slider's two ends, its morning (`sequence`), its parts and its own views. */
export const lc19Pad = (m: {
  url: string;
  slider: [string, string];
  sequence: Keyframe[];
  parts: Part[];
  views?: ModelDef['views'];
}): ModelDef => ({
  id: 'pad',
  name: 'Launch pad',
  url: m.url,
  scale: 'Launch Complex 19 · erector 42 m · deck 8.5 m over the land · to scale',
  backdrop: 'ground',
  slider: m.slider,
  sequence: m.sequence,
  specGroups: ['Launch pad'],
  parts: m.parts,
  home: 'erector',
  views: [...LC19_VIEWS, ...(m.views ?? [])],
});

/** The pad's figures, the same for every flight from it (the specs' 'Launch pad' group). */
export const LC19_SPECS: Flight['specs'] = [
  {
    group: 'Launch pad',
    label: 'Erector',
    value: 138 * FT,
    unit: 'm',
    confidence: 'documented',
    note: `"the 138-foot-high structure" (${HANDBOOK}, p. 7-10)`,
  },
  {
    group: 'Launch pad',
    label: 'Erector’s weight',
    value: 127_000,
    unit: 'kg',
    confidence: 'documented',
    note: `"the 140-ton erector" (${HANDBOOK}, p. 7-10; On the Shoulders of Titans has 127 tonnes)`,
  },
  {
    group: 'Launch pad',
    label: 'White room’s crew level',
    value: ROOM_LEVELS[1]! * FT,
    unit: 'm',
    confidence: 'documented',
    note: `"The white room contains four levels: 91 feet, 2 inches; 102 feet, 2 inches; 109 feet, 2 inches; and 118 feet, 2 inches" (${HANDBOOK}, pp. 7-10 and 7-11); that the crew went aboard from the second is derived: "the 100-foot level of the White Room" (the Gemini XI press kit)`,
  },
  {
    group: 'Launch pad',
    label: 'Umbilical tower',
    value: 102 * FT,
    unit: 'm',
    confidence: 'documented',
    note: `"Triangular in shape, the tower is 102 feet high with 14-foot sides" (${HANDBOOK}, p. 7-13); the NHL nomination and SP-4203 (31 m) agree`,
  },
  {
    group: 'Launch pad',
    label: 'Deck over the land',
    value: 28 * FT,
    unit: 'm',
    confidence: 'documented',
    note: `"It measures 28 feet tall, 65 feet wide, and 450 feet long" (${HANDBOOK}, p. 7-8)`,
  },
  {
    group: 'Launch pad',
    label: 'Engines’ exits over the deck',
    value: ENGINE_EXIT,
    unit: 'm',
    confidence: 'estimated',
    note: 'the first stage’s skirt 13.9 ft over the deck in three photographs (NASA S65-10461, S65-49568, S65-43447), less the 123.8 in the engines hang below it (stations 1224.311 to 1348.103)',
  },
  {
    group: 'Launch pad',
    label: 'Flume',
    value: 553 * FT,
    unit: 'm',
    confidence: 'documented',
    note: `"553 feet long from flame bucket to the basin" (${HANDBOOK}, p. 7-10)`,
  },
];

/**
 * A vehicle built to stand in the studio (its views in the model's own frame, heights from its origin), stood on Complex
 * 19's thrust mount: its engines' exits `ENGINE_EXIT` over the deck, square in the site's frame, since the frame's +X is
 * the way the hatches faced. `base`: how far the engines' exits are below the model's origin (vehicles/gemini-titan.ts
 * `BASE`). The gallery stands it on its engines whatever this says.
 */
export function lc19Vehicle(model: ModelDef, base: number): ModelDef {
  return {
    ...model,
    backdrop: 'ground',
    position: [0, base + ENGINE_EXIT, 0],
    views: model.views.map((v) => ({ ...v, ...(v.centreY !== undefined ? { centreY: v.centreY + base + ENGINE_EXIT } : {}) })),
  };
}
