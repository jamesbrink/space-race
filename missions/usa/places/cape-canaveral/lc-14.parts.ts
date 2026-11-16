import type { Action, Keyframe, Machine, ModelDef, Move, Part, Runs } from '../../../../src/types.ts';

/**
 * Launch Complex 14's pad as a flight's data: the parts of pad.glb (places/cape-canaveral/lc_14.py), what each does and how
 * it moves. The hardware is the place's and is the same for every flight from it, so it is said once, here; a flight gives
 * the day (`PadDay`): where its count falls on the slider, and what it says of each part. places/cape-canaveral/lc-14.md has
 * every pivot, travel and source ("Moving parts").
 */

const FT = 0.3048;
const DEG = Math.PI / 180;
const X: [number, number, number] = [1, 0, 0];
const Y: [number, number, number] = [0, 1, 0];
const Z: [number, number, number] = [0, 0, 1];

/**
 * How the vehicle stood in the site's frame: degrees about the vertical, anticlockwise from above, from the frame's +X
 * (105 degrees true, the pitch axis) to the capsule hatch's middle. The Atlas rolled to its heading after liftoff, so the
 * stand was not turned for a flight: every Mercury-Atlas stood the same way, its two booster engines and their pods on
 * the pitch axis (documented: Results of the First United States Manned Orbital Space Flight, p. 46; NASA SP-45, Figures
 * 5-4 and 5-10), the window toward the blockhouse over the long pod and the hatch 45 degrees round from it, on 240
 * degrees true (estimated, from the photographs: lc-14.md, "Which way the hatch faced"). lc14/site.py `HATCH_TURN`.
 */
export const HATCH_TURN = 225;
/** The engines' exit plane over the stand's deck, metres (estimated: lc14/site.py `LAUNCHER_TOP`): what the vehicle stands on. */
export const LAUNCHER_TOP = 8 * FT;

/** Where things happen on the pad's slider (0 to 1), from the pilot going aboard to the vehicle gone. The stops are layout. */
export interface PadStops {
  /** The white room is opened: its roof's leaves folded back, its two doors slid apart. */
  whiteRoom: number;
  /** The leaves are folded up off the vehicle, the white room's floor last. */
  leaves: number;
  /** The structure rolls north off the stand on to the transfer table. */
  roll: number;
  /** The table carries it east to its parking place. */
  carry: number;
  /** It stands parked. */
  parked: number;
  /** T-35 s: the capsule's umbilical is thrown off and its boom swings clear. */
  umbilical: number;
  /** Liftoff: the launcher's two arms let go. */
  liftoff: number;
}

/** What a flight says of one part of the pad. */
export interface PartWords {
  summary: string;
  detail: string;
  facts?: [string, string][];
}

/** The pad's parts, by their nodes in pad.glb. */
export type PadNode = 'ServiceStructure' | 'EgressTower' | 'Launcher' | 'LaunchStand' | 'FlameDeflector';

/** One morning at the pad. */
export interface PadDay {
  T: PadStops;
  words: Record<PadNode, PartWords>;
}

/** What drives each of the pad's motions, as it is heard (types.ts Machine). How each sounded is ours throughout. */
const BY: Record<'structure' | 'table' | 'leaves' | 'doors' | 'lift' | 'door' | 'bascule' | 'boom' | 'arms', Machine> = {
  structure: {
    kind: 'rails',
    confidence: 'documented',
    source:
      'it moved on rails under a diesel engine: "the diesel engine used for retracting and stowing the gantry" (NASA SP-45, of Mercury-Atlas 9)',
  },
  table: {
    kind: 'rails',
    confidence: 'documented',
    source: 'a rail-mounted transfer table carried it east (HAER FL-8-7, p. 22); what drove the table is not in anything read',
  },
  leaves: {
    kind: 'motor',
    confidence: 'estimated',
    source: 'the decks were movable (HAER FL-8-7, p. 22): that winches raised them is ours',
  },
  doors: {
    kind: 'motor',
    confidence: 'estimated',
    source: 'the white room’s doors slid (Results, p. 47): what moved them is not in anything read',
  },
  lift: { kind: 'lift', confidence: 'documented', source: 'a passenger lift (lc-14.md): where it ran is estimated' },
  door: { kind: 'door', confidence: 'derived', source: 'a hinged leaf worked by hand: what the model is' },
  bascule: {
    kind: 'hydraulic',
    confidence: 'estimated',
    source: 'lowered "in about 30 seconds by means of remote control from the blockhouse" (Results, p. 48): that it was hydraulic is ours',
  },
  boom: {
    kind: 'release',
    confidence: 'estimated',
    source: 'the umbilical was "ejected" at T-35 s (Results, p. 67): how its boom was drawn clear is not in anything read',
  },
  arms: {
    kind: 'release',
    confidence: 'documented',
    source: 'the two hold-down arms "released through air pressure when sufficient thrust built" (HAER FL-8-7, p. 20)',
  },
};

const swing = (node: string, axis: [number, number, number], degrees: number, from: number, to: number, machine: Machine): Move => ({
  kind: 'swing',
  node,
  axis,
  angle: degrees * DEG,
  from,
  to,
  machine,
});

/** A door leaf on its own hinged node, opened and shut on foot. `degrees` is its `swing` in the model: about the vertical, anticlockwise from above. */
const doorAction = (id: string, node: string, degrees: number): Action => ({
  id,
  label: 'Open',
  on: node,
  do: { kind: 'toggle', moves: [swing(node, Y, degrees, 0, 1, BY.door)], back: 'Close' },
});

// The service structure, as lc14/service_structure.py builds it (feet above its rails; the model's frame)
const LEVELS = [0, 1, 2, 3, 4, 5, 6].map((k) => 42 + ((22 + 8 + 859.81 / 12 - 0.6 - 42) * k) / 6);
/** The structure's outer face from its middle at a height above the rails, feet. */
const outer = (h: number): number => (h <= 32 ? 36 : 36 - (12 * (Math.min(h, 125) - 32)) / 93);
/** How far the structure rolls north on to the table, and how far the table carries it east, metres (lc14/site.py `TABLE_Y`, `PARKED_X`). */
const ROLL = 54 * FT;
const CARRY = 300 * FT;
const SIDES = ['Left', 'Right'] as const;
/** A leaf folds up through this, about its hinge along the slot's edge (estimated: the photographs have them near upright). */
const FOLD = 84;
/** The bascule's travel from upright to lowered, degrees about its hinge (lc14/tower.py `STOW`: derived from the model). */
const BASCULE = 61.7;

/** What the structure's wheels run on: its two rails on the paving (the place's) and on the transfer table. */
/** The rails' joints, which the wheels knock over (sound/model.ts): not read off any drawing of the complex. */
const JOINTS: Runs['joints'] = {
  value: 39 * FT,
  confidence: 'estimated',
  source: 'a 39 ft length of rail, the American standard rail length of the time: ordinary practice, as taken at Complex 5 (lc-5.md)',
};
const ON_RAILS: Runs = {
  on: ['Tracks/steel-rail', 'TransferTable/steel-rail'],
  joints: JOINTS,
  wheels: 'ServiceStructure_Wheel_',
  wheelRadius: 1.5 * FT,
  axle: 'x',
};
/** What the table's wheels run on: the two rails in its pit (the place's). */
const ON_TABLE: Runs = {
  on: ['TablePit/steel-rail'],
  joints: JOINTS,
  wheels: 'TransferTable_Wheel_',
  wheelRadius: 1.0 * FT,
  axle: 'z',
};

/** The pad's parts for one morning. */
export function lc14Parts(day: PadDay): Part[] {
  const T = day.T;
  const span = (T.roll - T.leaves) / 7; // each level's leaves in turn, the lowest first
  const leaf = (level: number, side: (typeof SIDES)[number]): Move =>
    swing(
      `ServiceStructure_Platform${level}_${side}`,
      Z,
      side === 'Left' ? FOLD : -FOLD,
      T.leaves + (level - 1) * span,
      T.leaves + (level - 0.15) * span,
      BY.leaves,
    );
  const opened = (T.leaves - T.whiteRoom) * 0.45;
  return [
    {
      node: 'ServiceStructure',
      name: 'Service structure',
      ...day.words.ServiceStructure,
      actions: [
        {
          // The car rides the leaning tower's outer face, so each stop is further in than the one below; at the ground it
          // stands off the leg, to be walked into. `by` is from where it is built: metres across and up.
          id: 'lift',
          label: 'Lift',
          on: 'ServiceStructure_Lift',
          do: {
            kind: 'lift',
            node: 'ServiceStructure_Lift',
            machine: BY.lift,
            stops: [
              { name: 'Ground', by: [0, 0, 0] },
              ...LEVELS.map((h, k) => ({
                name: k === 6 ? 'Level 7 · white room' : `Level ${k + 1}`,
                by: [(outer(h) + 0.45 - 38.8) * FT, (h - 0.6) * FT, 0] as [number, number, number],
              })),
            ],
          },
        },
        doorAction('white-room-stair-door', 'ServiceStructure_WhiteRoomDoor_Left', 100),
        doorAction('white-room-lift-door', 'ServiceStructure_WhiteRoomDoor_Right', -100),
      ],
      explode: [0, 0, 0],
      order: 0,
      functions: [
        {
          nodes: SIDES.map((s) => `ServiceStructure_SlidingDoor_${s}`),
          name: 'White room doors',
          ends: ['shut', 'slid apart'],
          seconds: 20,
        },
        { nodes: SIDES.map((s) => `ServiceStructure_Roof_${s}`), name: 'White room roof', ends: ['down', 'folded back'], seconds: 15 },
        ...[7, 6, 5, 4, 3, 2, 1].map((level) => ({
          nodes: SIDES.map((s) => `ServiceStructure_Platform${level}_${s}`),
          name: level === 7 ? 'White room floor (level 7)' : `Level ${level} leaves`,
          ends: ['down round the vehicle', 'folded up'] as [string, string],
          seconds: 15,
        })),
        {
          nodes: ['ServiceStructure_Tower', 'ServiceStructure'],
          name: 'Roll off the stand and away',
          ends: ['round the vehicle', 'parked'],
          // 16.5 m on its rails and 91 m on the table: fourteen minutes on Mercury-Atlas 7's morning, here two
          seconds: 120,
          needs: [
            ...[1, 2, 3, 4, 5, 6, 7].map((level) => ({
              node: `ServiceStructure_Platform${level}_Left`,
              atLeast: 1,
              why: level === 7 ? 'the white room’s floor is still down round the capsule' : 'the leaves are still down round the vehicle',
            })),
            { node: 'ServiceStructure_SlidingDoor_Left', atLeast: 1, why: 'the white room’s doors are shut behind the capsule' },
            { node: 'ServiceStructure_Roof_Left', atLeast: 1, why: 'the white room’s roof is down round the escape tower' },
          ],
        },
      ],
      moves: [
        // the white room is opened first: its roof's two leaves back, its doors apart
        swing('ServiceStructure_Roof_Left', Z, 100, T.whiteRoom, T.whiteRoom + opened, BY.leaves),
        swing('ServiceStructure_Roof_Right', Z, -100, T.whiteRoom, T.whiteRoom + opened, BY.leaves),
        {
          kind: 'slide',
          node: 'ServiceStructure_SlidingDoor_Left',
          by: [-10 * FT, 0, 0],
          from: T.whiteRoom + opened,
          to: T.leaves - 0.01,
          machine: BY.doors,
        },
        {
          kind: 'slide',
          node: 'ServiceStructure_SlidingDoor_Right',
          by: [10 * FT, 0, 0],
          from: T.whiteRoom + opened,
          to: T.leaves - 0.01,
          machine: BY.doors,
        },
        // then the leaves, a level at a time from the lowest, the white room's floor last
        ...[1, 2, 3, 4, 5, 6, 7].flatMap((level) => SIDES.map((s) => leaf(level, s))),
        // north off the stand on to the table: the tower is a node of its own under the part's, and the table another
        {
          kind: 'slide',
          node: 'ServiceStructure_Tower',
          by: [0, 0, -ROLL],
          from: T.roll,
          to: T.carry - 0.02,
          runs: ON_RAILS,
          machine: BY.structure,
        },
        // and east on the table to its parking place
        { kind: 'slide', by: [CARRY, 0, 0], from: T.carry, to: T.parked, runs: ON_TABLE, machine: BY.table },
      ],
    },
    {
      node: 'EgressTower',
      name: 'Umbilical and egress tower',
      ...day.words.EgressTower,
      explode: [0, 0, 0],
      order: 0,
      functions: [
        {
          nodes: ['EgressTower_Bascule'],
          name: 'Bascule',
          ends: ['upright', 'lowered to the hatch'],
          // "in about 30 seconds" (Results, p. 48)
          seconds: 30,
        },
        { nodes: ['EgressTower_Boom'], name: 'Umbilical boom', ends: ['over the capsule', 'swung clear'], seconds: 6 },
      ],
      moves: [
        // the capsule's umbilical is thrown off and its boom swung clear of the vehicle's way (how far, and which way, is ours)
        swing('EgressTower_Boom', Y, -105, T.umbilical, T.umbilical + 0.03, BY.boom),
        // The bascule stayed upright through the count and was not lowered on any flight: it is not on the script. Its one
        // move lies past the slider's end, so that it is worked only by hand
        swing('EgressTower_Bascule', X, -BASCULE, 1.5, 2, BY.bascule),
      ],
    },
    {
      node: 'Launcher',
      name: 'Launcher',
      ...day.words.Launcher,
      explode: [0, 0, 0],
      order: 0,
      functions: [{ nodes: ['Launcher_Arm_1', 'Launcher_Arm_2'], name: 'Hold-down arms', ends: ['holding', 'let go'], seconds: 2 }],
      moves: [
        swing('Launcher_Arm_1', X, 23, T.liftoff, T.liftoff + 0.01, BY.arms),
        swing('Launcher_Arm_2', X, -23, T.liftoff, T.liftoff + 0.01, BY.arms),
      ],
    },
    { node: 'LaunchStand', name: 'Launch stand', ...day.words.LaunchStand, explode: [0, 0, 0], order: 0 },
    { node: 'FlameDeflector', name: 'Flame bucket', ...day.words.FlameDeflector, explode: [0, 0, 0], order: 0 },
  ];
}

/** What is said of the hardware no flight changed. */
export const HARDWARE_WORDS: Pick<Record<PadNode, PartWords>, 'Launcher' | 'LaunchStand' | 'FlameDeflector'> = {
  Launcher: {
    summary: 'Two steel arms held the Atlas down until its thrust had built.',
    detail:
      'An Atlas is a steel balloon: its tanks are its structure, held in shape by the pressure inside them, and it cannot be ' +
      'lifted or stood by its skin. It was brought up the ramp on its trailer, backed into the launcher, which was turned on ' +
      'its side to take it, and raised with it. On the stand it rests on the launcher at the booster section’s foot, and two ' +
      'arms hold it there. All five engines are lit on the ground; the arms let go, on air pressure, only when the thrust has ' +
      'built, about four seconds after the count reaches zero. The arms’ places and form are read off photographs.',
    facts: [
      ['Hold-down', 'two arms, released by air pressure (documented)'],
      ['Engines’ exit plane', 'about 8 ft over the deck (estimated)'],
      ['Released', 'about T+4 s, when thrust had built'],
    ],
  },
  LaunchStand: {
    summary: 'A deck of concrete on steel, 22 ft over the ground, at the head of a ramp.',
    detail:
      'The stand is the northernmost of the twelve bays of the stand and ramp, 432 ft long in all: the missile’s trailer was ' +
      'driven up the ramp to it. The deck is a concrete slab on a steel frame with a pipe rail round it, 60 ft by 78. Under ' +
      'the launcher the deck is open, and the engines hang in the opening over the flame bucket. Through the firing, water ' +
      'was poured on the stand at about 30,000 gallons a minute. The huts on the deck are in the photographs; what they held ' +
      'is not recorded.',
    facts: [
      ['Deck', '60 ft by 78 ft, 22 ft over the ground (HAER FL-8-7)'],
      ['Ramp and stand', '432 ft, twelve bays'],
      ['Deluge', 'about 30,000 gallons a minute'],
    ],
  },
  FlameDeflector: {
    summary: 'Turns the exhaust north, out under the stand into the flume.',
    detail:
      'A water-cooled steel bucket under the opening in the deck. It turns the five engines’ exhaust from straight down to ' +
      'level and sends it north, across the transfer table’s pit and down a concrete flume to a basin 600 ft away, where the ' +
      'water and whatever propellant went with it were collected and the kerosene skimmed off. Its curve here is ours: no ' +
      'drawing of it has been read.',
    facts: [['Flume and skimming basin', 'run north from under the stand (HAER FL-8-7, p. 22)']],
  },
};

/** The pad as a model, from a flight's morning. */
export const lc14Pad = (m: { url: string; slider: [string, string]; sequence: Keyframe[]; parts: Part[] }): ModelDef => ({
  id: 'pad',
  name: 'Launch pad',
  url: m.url,
  scale: 'Launch Complex 14 · stand 18 m by 24 m, 6.7 m over the ground · service structure 47 m · to scale',
  backdrop: 'ground',
  slider: m.slider,
  sequence: m.sequence,
  specGroups: ['Launch pad'],
  parts: m.parts,
  home: 'stand',
  views: [
    { id: 'stand', label: 'Stand and tower', nodes: ['LaunchStand', 'EgressTower', 'Launcher'] },
    { id: 'structure', label: 'Service structure', nodes: ['ServiceStructure'] },
    { id: 'whiteroom', label: 'White room level', centreY: 26, span: 14 },
    { id: 'launcher', label: 'Launcher', nodes: ['Launcher'] },
  ],
});
