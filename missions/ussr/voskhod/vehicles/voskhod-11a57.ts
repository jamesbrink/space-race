import { doc, estimated } from '../../../../src/measure.ts';
import type { CabinDef, JetDef, Measure, ModelDef, Motor, Move, Part, Spec, ViewDef } from '../../../../src/types.ts';
import { TDU_THRUST } from '../../vostok/vehicles/vostok-3ka.ts';
import {
  ATTITUDE_JET,
  BOOSTERS,
  DEG,
  MAST_AZ,
  STRAPS,
  type Burn,
  ENTRY,
  type Hardware,
  KGF,
  LAUNCHER as VOSTOK_LAUNCHER,
  LIFT,
  type PartWords,
  SHIP,
  SHIP_PARTS as VOSTOK_SHIP,
  STRAP_ON_PARTS,
  along,
  kN,
  kgf,
  later,
  outward,
  says,
  stackParts,
  tf,
} from '../../vostok/vehicles/vostok-stack.ts';

/**
 * A Voskhod on its 11A57 as flight data, said once: what the type gives both flights of it (the 3KV of Voskhod 1, the
 * 3KD of Voskhod 2). The launch vehicle is the Vostok's core and strap-ons under a longer third stage, Block I, and its
 * fairing (voskhod-11a57.md); the ship is a Vostok's ball and instrument module with a reserve engine on top
 * (voskhod.md). So this takes from vostok-stack.ts what is the same (`along`, the azimuths, the strap-ons, the
 * Vostok's parts that did not change) and says what is the Voskhod's: how its own parts come away (`voskhodParts`), its
 * views (`VIEW`), the model (`voskhodStack`), its specs (`SPEC`) and engines (`voskhodMotors`). A flight gives its
 * parts' words, its couches, its record and what differed on its ship (the airlock, the later swing of the straps).
 */

export { along, outward, later, BOOSTERS, LIFT, SHIP, ENTRY, KGF, DEG, STRAPS, MAST_AZ };
export type { PartWords };

// Where things are on the model, as vehicles/voskhod.py and the Vostok's vostok_3ka.py have them (vostok-stack.ts for
// what they share). The numbers live there.
/** Hatch No. 2: beyond their heads (vehicles/voskhod.py: off OKB-1's drawings). */
export const PARACHUTE = { az: 45, lat: 21 };
/** The way the crew's feet point, which is where the viewer's cutaway opens the ball. */
export const FEET = 225;
/**
 * The launch vehicle, as vehicles/voskhod_11a57/ has it: the main nozzles' exits below the model's origin (the
 * spacecraft's braking nozzle), m; the spacecraft's own station 0 is 36.6 m up. Quoted for the views.
 */
export const BASE = 36.6;
/** The three pieces of the third stage's aft section, by the azimuth of the middle of each (voskhod_11a57/upper.py). */
export const AFT = [60, 180, 300];

/**
 * A couch and the man in it: the couches differ in who he was and in where the couch stood. Each is drawn out past the
 * entry hatch's side one after another, so that each can be seen whole: nothing left the ship this way.
 */
export const couch = (
  node: string,
  name: string,
  summary: string,
  detail: string,
  facts: [string, string][],
  out: number,
  at: number,
): Part => ({
  node,
  group: 'Spacecraft',
  inside: true,
  name,
  summary,
  detail,
  facts,
  explode: [0, LIFT, 0],
  moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, out), from: later(at), to: later(at + 0.24) }],
  order: SHIP + 1,
});

/**
 * The 11A57's parts: the fairing as the Vostok's comes away, Block I and the three pieces of its aft section, the
 * lattice, and the Vostok's core and strap-ons, which stand a metre lower in the explode under the longer third stage.
 */
export const LAUNCHER: Record<string, Hardware> = {
  Fairing: VOSTOK_LAUNCHER.Fairing,
  BlockI: { group: 'Third stage', inside: true, explode: [0, -3.0, 0], order: 0 },
  AftSection: {
    group: 'Third stage',
    explode: [0, -3.0, 0],
    moves: AFT.flatMap((az, i): Move[] => [
      { kind: 'slide', node: `AftSection_${i + 1}`, by: along(az, 0, 2.6), from: 0.04, to: 0.22 },
      { kind: 'slide', node: `AftSection_${i + 1}`, by: along(az, -70, 5), from: 0.18, to: 0.44 },
    ]),
    order: 0,
  },
  Interstage: { group: 'Third stage', explode: [0, -6.6, 0], order: 0 },
  CoreStage: { group: 'Core, Block A', inside: true, explode: [0, -10.5, 0], order: 0 },
  CoreEngine: { group: 'Core, Block A', inside: true, explode: [0, -14.5, 0], order: 0 },
  ...STRAP_ON_PARTS,
};

/**
 * The ship's parts that are the type's: the Vostok's that did not change, its hatches as the Voskhod's (hatch No. 1 not
 * thrown so far, since no seat comes out after it; hatch No. 2 where OKB-1's drawings put it), and the reserve engine
 * lifted off the top of the ball. The couches are the flight's (`couch`), and so is the 3KD's airlock.
 */
export const SHIP_PARTS: Record<string, Hardware> = {
  DescentModule: VOSTOK_SHIP.DescentModule,
  EntryHatch: {
    group: 'Spacecraft',
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 1.3), from: later(0.42), to: later(0.6) }],
    order: SHIP + 1,
  },
  ParachuteHatch: {
    group: 'Spacecraft',
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(PARACHUTE.az, PARACHUTE.lat, 1.0), from: later(0.5), to: later(0.68) }],
    order: SHIP + 1,
  },
  Cabin: VOSTOK_SHIP.Cabin,
  ReserveEngine: { group: 'Spacecraft', explode: [0, LIFT + 1.1, 0], order: SHIP + 1 },
  RetainingStraps: VOSTOK_SHIP.RetainingStraps,
  CableMast: VOSTOK_SHIP.CableMast,
  GasBottles: VOSTOK_SHIP.GasBottles,
  InstrumentModule: VOSTOK_SHIP.InstrumentModule,
  Antennas: VOSTOK_SHIP.Antennas,
  RetroEngine: VOSTOK_SHIP.RetroEngine,
};

/** A Voskhod's parts: the launch vehicle's and then the ship's, each from the flight's words (a couch says all of itself). */
export const voskhodParts = (flight: string, words: PartWords[]): Part[] =>
  stackParts(flight, words, { ...LAUNCHER, ...SHIP_PARTS }, new Set());

/** The spacecraft's own nodes, for the views that stay on it (a flight adds the parts only its ship had). */
export const SPACECRAFT = ['DescentModule', 'ReserveEngine', 'InstrumentModule', 'RetroEngine', 'Antennas'];

/**
 * The type's views, in the model's own frame (heights from its origin, the spacecraft's braking nozzle: the main nozzles'
 * exits are BASE below it). A flight lists those it shows, in its order, with its own between them.
 */
export const VIEW = {
  stack: { id: 'stack', label: 'Full stack' },
  base: { id: 'base', label: 'Engines', centreY: 1.0 - BASE, span: 9.5, from: along(35, 4, 1) },
  booster: { id: 'booster', label: 'Strap-on', nodes: ['Booster_B'], from: along(-55, 6, 1) },
  tips: { id: 'tips', label: 'Tip joints', centreY: 19.6 - BASE, span: 4.6, from: along(-40, 14, 1) },
  third: { id: 'third', label: 'Third stage', nodes: ['Interstage', 'AftSection', 'BlockI'], from: along(60, 4, 1) },
  fairing: { id: 'fairing', label: 'Fairing', nodes: ['Fairing'], from: along(ENTRY.az, 10, 1) },
  descent: { id: 'descent', label: 'Descent module', nodes: ['DescentModule', 'ReserveEngine'] },
  reserve: { id: 'reserve', label: 'Reserve engine', nodes: ['ReserveEngine'], from: along(200, 14, 1) },
  hatch: { id: 'hatch', label: 'Entry hatch', nodes: ['EntryHatch'], from: along(ENTRY.az, 12, 1) },
  /** Through the cutaway's opening, from beyond their feet and above. */
  crew: (couches: string[]): ViewDef => ({ id: 'crew', label: 'Crew', nodes: couches, from: along(FEET, 52, 1) }),
  instrument: { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
  engine: { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
} satisfies Record<string, ViewDef | ((couches: string[]) => ViewDef)>;

/**
 * The stack as a model, from the flight's parts, views, couches and cabin. The vehicle alone: Site 1 as it stood for
 * these flights is not built, so it is shown in the gallery only.
 */
export const voskhodStack = (ship: {
  flight: string;
  parts: Part[];
  views: ViewDef[];
  seats: NonNullable<ModelDef['seats']>;
  cabin: CabinDef;
  specGroups?: string[];
}): ModelDef => ({
  id: 'vehicle',
  name: 'Vehicle',
  url: `models/ussr/voskhod/${ship.flight}/vehicle.glb`,
  scale: '44.16 m on the pad · 10.3 m across the rudders · to scale',
  backdrop: 'studio',
  slider: ['On the pad', 'Taken apart'],
  cutaway: true,
  specGroups: ship.specGroups ?? ['Launch vehicle', 'Spacecraft'],
  parts: ship.parts,
  // the cabin's lamp, over the instrument board
  lights: [{ position: [0.14, 3.6, 0.14], colour: 0xffe4c0, intensity: 0.2, reach: 1.7 }],
  home: 'stack',
  views: ship.views,
  seats: ship.seats,
  cabin: ship.cabin,
  // the reserve braking engine's burst, forward off the nose (viewer/jets.ts)
  jets: [RESERVE_JET],
});

const BRUGGE = 'Brügge’s table for the 11A57';
/** The type's thrusts that are not the Vostok's: the 11A57's strap-ons and core, its third stage, and the ship's reserve engine. */
export const THRUST = {
  strapOn: doc(819_100, `${BRUGGE}: secondary, and uncited figure by figure`),
  core: doc(777_800, `${BRUGGE}: secondary`),
  third: doc(30.4 * 1000 * KGF, '“a vacuum thrust of 30.4 tons” (Siddiqi, Challenge to Apollo, p. 410, note 4, from Varfolomeyev)'),
  reserve: doc(
    12000 * KGF,
    '“a single powerful burst of 12,000 kilograms thrust, lasting approximately two seconds” (Siddiqi, Challenge to Apollo, p. 411)',
  ),
} satisfies Record<string, Measure>;

/**
 * The reserve braking engine's burst (`ModelDef.jets`, viewer/jets.ts), from the nozzle node on its face
 * (`ReserveEngine_Nozzle`: voskhod.md, "Parts in the model"), its gas going forward, off the nose, as the node has it
 * (derived from OKB-1's drawing: the ship braked nose first). An engine of its own: it was never fired, and with no plan
 * for the Voskhods nothing flies it, so it is drawn only in the gallery while its part is chosen, as it would have
 * burned in orbit. What it burned and its nozzle are in nothing read: the era's composite is taken for its look.
 */
const RESERVE_JET: JetDef = {
  node: 'ReserveEngine_Nozzle',
  gas: 'solid',
  burns: 'solid-perchlorate',
  radius: estimated(0.07, 'm: the boss on the engine’s face, 140 mm across at its face (voskhod.py): no nozzle of it was read'),
  thrust: THRUST.reserve,
  exit: estimated(
    30_000,
    'Pa: NOT FOUND: a third of an atmosphere, as a solid’s nozzle of the time; fired in orbit, any exit above none opens its jet as wide as it goes',
  ),
  when: { engine: 'reserve' },
};

/** The type's figures as specs, each with its source: a flight lists those it shows, and adds its own words where it says more. */
export const SPEC = {
  diameter: {
    group: 'Spacecraft',
    label: 'Greatest diameter',
    value: 2.43,
    unit: 'm',
    confidence: 'documented',
    note: '2.43 m (Siddiqi p. 412): the instrument module, as a Vostok’s',
  },
  padLength: {
    group: 'Launch vehicle',
    label: 'Length on the pad',
    value: 44.16,
    unit: 'm',
    confidence: 'derived',
    note: '16.665 m from the core’s top to the fairing’s tip (Zak, RussianSpaceWeb: “stretched by 2,710 millimeters to 16,665”) on the Vostok launcher’s core, 27.49 m (Minakov’s 28.75 m less his lattice of 1.26 m: assumed unchanged). Brügge’s table has 44.13 m; Siddiqi’s table of launch vehicles gives the type as 43.5 to 45.22 m',
  },
  rudders: {
    group: 'Launch vehicle',
    label: 'Width over the air rudders',
    value: 10.3,
    unit: 'm',
    confidence: 'documented',
    note: '10.303 m (Siddiqi, table of launch vehicles); 10.30 (Brügge)',
  },
  liftoffThrust: {
    group: 'Launch vehicle',
    label: 'Liftoff thrust',
    value: 413.3 * 1000 * KGF,
    unit: 'N',
    confidence: 'documented',
    note: '413.3 tf (Siddiqi, table of launch vehicles), which is 4,053 kN; Brügge’s table sums to 4,054.2 kN',
  },
  third: {
    group: 'Launch vehicle',
    label: 'Third stage with its adapter',
    value: 9.05,
    unit: 'm',
    confidence: 'documented',
    note: '9.05 m long and 2.66 m across (Brügge’s table for the 11A57 with Voskhod: secondary). The stage alone is 6.745 m as it flies today (Zak, from the maker’s manual); the adapter is the difference',
  },
} satisfies Record<string, Spec>;

/** What the type's sources say of each engine, written from the Measures the motors quote. A flight's note adds its own after them. */
export const ENGINE_WORDS = {
  strapOns: `${kN(4 * THRUST.strapOn.value)} at the ground for the four, ${kN(THRUST.strapOn.value)} each (${BRUGGE}: secondary, and uncited figure by figure)`,
  core: `${kN(THRUST.core.value)} at the ground (${BRUGGE}: secondary)`,
  third: `“a vacuum thrust of ${tf(THRUST.third.value)} tons” (Siddiqi p. 410, note 4, from Varfolomeyev)`,
  braking: `${tf(TDU_THRUST.value)} tf, 45 s at most: the Vostok’s engine, “the standard TDU-1 liquid-propellant engine” (Siddiqi pp. 197 and 411)`,
  reserve: `${kgf(THRUST.reserve.value)} kgf for about two seconds: “a single powerful burst of 12,000 kilograms thrust, lasting approximately two seconds” (Siddiqi p. 411)`,
  jets: `the Vostok’s: two sets of eight, ${kgf(ATTITUDE_JET.value)} kgf each (Siddiqi p. 197)`,
};

/** The stack's engines at the type's thrust, each flight giving its burn, its confidence and its own words. */
export const voskhodMotors = (burns: { strapOns: Burn; core: Burn; third: Burn; braking: Burn; reserve: Burn; jets: Burn }): Motor[] => [
  {
    name: 'RD-107, one in each strap-on',
    count: 4,
    thrustN: THRUST.strapOn.value,
    propellant: 'kerosene T-1 / liquid oxygen',
    kind: 'liquid',
    ...burns.strapOns,
    note: says(ENGINE_WORDS.strapOns, burns.strapOns.note),
  },
  {
    name: 'RD-108, core',
    count: 1,
    thrustN: THRUST.core.value,
    propellant: 'kerosene T-1 / liquid oxygen',
    kind: 'liquid',
    ...burns.core,
    note: says(ENGINE_WORDS.core, burns.core.note),
  },
  {
    name: 'RD-0108, third stage',
    count: 1,
    thrustN: THRUST.third.value,
    propellant: 'kerosene / liquid oxygen',
    kind: 'liquid',
    ...burns.third,
    note: says(ENGINE_WORDS.third, burns.third.note),
  },
  {
    name: 'TDU-1 (Isaev S5.4) braking engine',
    count: 1,
    thrustN: TDU_THRUST.value,
    propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
    kind: 'liquid',
    ...burns.braking,
    note: says(ENGINE_WORDS.braking, burns.braking.note),
  },
  {
    name: 'Reserve braking engine',
    count: 1,
    thrustN: THRUST.reserve.value,
    propellant: 'solid, 87 kg',
    kind: 'solid',
    ...burns.reserve,
    note: says(ENGINE_WORDS.reserve, burns.reserve.note),
  },
  {
    name: 'Attitude jet',
    count: 16,
    thrustN: ATTITUDE_JET.value,
    propellant: 'compressed nitrogen',
    ...burns.jets,
    note: says(ENGINE_WORDS.jets, burns.jets.note),
  },
];
