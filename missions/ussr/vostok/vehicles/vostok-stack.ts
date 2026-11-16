import { doc } from '../../../../src/measure.ts';
import type { CabinDef, Measure, ModelDef, Motor, Move, Part, Spec, ViewDef } from '../../../../src/types.ts';
import { G0 } from '../../../../src/world/bodies.ts';
import { vostokLights } from './cabin.ts';
import { TDU_THRUST } from './vostok-3ka.ts';
import { BASE } from './vostok-flies.ts';
import { BLOCK_E, BOOSTERS, CORE, LAUNCHER_JETS, STRAP_ONS } from './vostok-8k72k.ts';

/**
 * A Vostok (3KA) on its 8K72K as flight data, said once: what the type gives every flight of it (Vostoks 1 to 6). How
 * each part comes away (`HARDWARE`), the views, the type's dimensions (`SPEC`) and its engines (`vostokMotors`), each
 * quoting the type's own figure. A flight gives its parts' words, its record, its masses and times, and what differed
 * on its ship; its launch site wraps the model (`site1Vehicle`), and what its parts do in flight is vostok-flies.ts.
 */

export { BASE, BOOSTERS };
export const DEG = Math.PI / 180;
export const KGF = G0;

// Where things are on the model, as vehicles/vostok_3ka.py has them: azimuths about the long axis from the model's +X,
// latitudes on the sphere above the plane square to that axis. The numbers live there; these are quoted for the motions.
/** Hatch No. 1, and the line of the seat's rails. */
export const ENTRY = { az: 135, lat: 24 };
/** Hatch No. 2. */
export const PARACHUTE = { az: 45, lat: 30 };
export const STRAPS = [0, 90, 180, 270];
export const MAST_AZ = 202.5;
/** The pilot's right, where the viewer's cutaway opens the ball: the film camera and one television camera are on this side. */
export const RIGHT = 225;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
export const along = (az: number, lat: number, by: number): [number, number, number] => [
  by * Math.cos(lat * DEG) * Math.cos(az * DEG),
  by * Math.sin(lat * DEG),
  -by * Math.cos(lat * DEG) * Math.sin(az * DEG),
];
/** A swing outward about a hinge at the foot of something standing on the model at this azimuth. */
export const outward = (node: string, az: number, degrees: number, from: number, to: number): Move => ({
  kind: 'swing',
  node,
  axis: [-Math.sin(az * DEG), 0, -Math.cos(az * DEG)],
  angle: degrees * DEG,
  from,
  to,
});

/** How far the descent module is lifted off the instrument module at full explode, m. */
export const LIFT = 1.5;

/**
 * The instrument module's ten antennas are built stowed under the fairing (vostok_3ka.py: STOWED) and slide out as
 * the vehicle is taken apart: each by this much, m, in the viewer's axes. They were really folded, which is not modelled.
 */
export const ANTENNAS: [number, number, number][] = [
  ...[-35, 0, 40].map((rake) => along(67.5, rake, 1.33)),
  ...(
    [
      [22.5, 18, 1.72],
      [202.5, 18, 1.72],
      [112.5, 45, 1.9],
    ] as const
  ).map(([az, spread, by]) => along(az, spread - 90, by)),
  ...[0, 1, 2, 3].map((): [number, number, number] => [0, -0.7, 0]),
];

/**
 * The slider takes the launch vehicle apart first and the spacecraft after it. Every part of the launch vehicle is of
 * order 0, so it is away by half way; the spacecraft's parts are of orders SHIP to SHIP + 2 of SHIP + 2, which start
 * at 0.41, 0.45 and 0.5 (explode.ts: partProgress). Between about 0.4 and 0.45 the spacecraft stands alone and whole
 * with its antennas out: as it was in orbit.
 */
export const SHIP = 9;
/** A reading of the spacecraft's own sequence (0 to 1, as it was timed when it was shown alone) on the whole vehicle's slider. */
export const later = (t: number) => (SHIP / (SHIP + 2)) * 0.5 + (1 - (SHIP / (SHIP + 2)) * 0.5) * t;

/** What a flight says of one of the stack's parts: its words, and anything that differed on its ship. */
export type PartWords = Pick<Part, 'node' | 'name' | 'summary' | 'detail'> & Partial<Part>;
/** How a part comes away, which is the type's: its heading in the parts list, whether it is inside, where it goes and when. */
export type Hardware = Pick<Part, 'group' | 'inside' | 'explode' | 'moves' | 'order'>;

/** The four strap-ons, which the Voskhods' 11A57 kept (voskhod/vehicles/voskhod-11a57.ts). */
export const STRAP_ON_PARTS: Record<string, Hardware> = Object.fromEntries(
  BOOSTERS.map(([letter, , az]): [string, Hardware] => [
    `Booster_${letter}`,
    {
      group: 'Strap-on boosters',
      inside: true,
      explode: [0, 0, 0],
      moves: [outward(`Booster_${letter}`, az, -14, 0.0, 0.2), { kind: 'slide', by: along(az, -52, 9), from: 0.14, to: 0.5 }],
      order: 0,
    },
  ]),
);

/**
 * The launch vehicle's parts, the 8K72K's (vehicles/vostok_8k72k/): the fairing's halves part square to the hatch
 * (documented: two halves; how they hinge and how far is ours), each strap-on swings out about its tip ball
 * (documented; the angle is ours: far enough to show the joint), then falls behind.
 */
export const LAUNCHER: Record<string, Hardware> = {
  Fairing: {
    group: 'Third stage',
    explode: [0, 0, 0],
    moves: [
      outward('Fairing_Left', ENTRY.az, 26, 0.0, 0.16),
      outward('Fairing_Right', ENTRY.az + 180, 26, 0.0, 0.16),
      { kind: 'slide', node: 'Fairing_Left', by: along(ENTRY.az, -25, 7), from: 0.1, to: 0.36 },
      { kind: 'slide', node: 'Fairing_Right', by: along(ENTRY.az + 180, -25, 7), from: 0.1, to: 0.36 },
    ],
    order: 0,
  },
  BlockE: { group: 'Third stage', inside: true, explode: [0, -2.6, 0], order: 0 },
  Interstage: { group: 'Third stage', explode: [0, -5.6, 0], order: 0 },
  CoreStage: { group: 'Core, Block A', inside: true, explode: [0, -9.5, 0], order: 0 },
  CoreEngine: { group: 'Core, Block A', inside: true, explode: [0, -13.5, 0], order: 0 },
  ...STRAP_ON_PARTS,
};

/**
 * The spacecraft's parts, the 3KA's (vehicles/vostok_3ka.py). The descent module lifts off the instrument module; hatch
 * No. 1 is thrown well clear, since the seat comes out along the same line; the straps and the cable mast swing out; the
 * antennas come out once the ship is clear of its fairing and its third stage, and before anything of the ship itself
 * moves. The two cameras are the later ships' (Vostok 2's film camera; Vostok 3's television): a flight that carried
 * one gives its words.
 */
export const SHIP_PARTS: Record<string, Hardware> = {
  DescentModule: { group: 'Spacecraft', explode: [0, LIFT, 0], order: SHIP + 1 },
  EntryHatch: {
    group: 'Spacecraft',
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 3.6), from: later(0.5), to: later(0.74) }],
    order: SHIP + 1,
  },
  ParachuteHatch: {
    group: 'Spacecraft',
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(PARACHUTE.az, PARACHUTE.lat, 1.0), from: later(0.6), to: later(0.78) }],
    order: SHIP + 1,
  },
  Cabin: { group: 'Spacecraft', inside: true, explode: [0, LIFT, 0], order: SHIP + 1 },
  EjectionSeat: {
    group: 'Spacecraft',
    inside: true,
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 2.3), from: later(0.72), to: 1 }],
    order: SHIP + 1,
  },
  TelevisionCameras: { group: 'Spacecraft', inside: true, explode: [0, LIFT, 0], order: SHIP + 1 },
  FilmCamera: { group: 'Spacecraft', inside: true, explode: [0, LIFT, 0], order: SHIP + 1 },
  RetainingStraps: {
    group: 'Spacecraft',
    explode: [0, 0, 0],
    moves: STRAPS.map((az, i) => outward(`Strap_${i + 1}`, az, 58, later(0.02 + 0.02 * i), later(0.2 + 0.02 * i))),
    order: SHIP,
  },
  CableMast: {
    group: 'Spacecraft',
    explode: [0, 0, 0],
    moves: [outward('CableMast_Arm', MAST_AZ, 40, later(0.06), later(0.24))],
    order: SHIP,
  },
  GasBottles: { group: 'Spacecraft', explode: [0, 0.5, 0], order: SHIP + 2 },
  InstrumentModule: { group: 'Spacecraft', inside: true, explode: [0, 0, 0], order: SHIP + 2 },
  Antennas: {
    group: 'Spacecraft',
    explode: [0, 0, 0],
    moves: ANTENNAS.map((by, i): Move => ({ kind: 'slide', node: `Antenna_${i + 1}`, by, from: 0.3, to: 0.4 })),
    order: SHIP,
  },
  RetroEngine: { group: 'Spacecraft', inside: true, explode: [0, -0.9, 0], order: SHIP + 2 },
};
/** Parts a flight may leave out: its ship did not carry them. */
const CARRIED_BY_SOME = new Set(['TelevisionCameras', 'FilmCamera']);

/**
 * A flight's parts, in the order it gives them, each part of the stack taking how it comes away from `hardware` (a
 * flight's own value for one of those wins: what differed). A part not in it says all of itself. Every part of the
 * stack must be given words but those only some ships carried.
 */
export const stackParts = (flight: string, words: PartWords[], hardware: Record<string, Hardware>, optional = CARRIED_BY_SOME): Part[] => {
  for (const node of Object.keys(hardware)) {
    if (!optional.has(node) && !words.some((p) => p.node === node)) throw new Error(`${flight}: no words for the stack's ${node}`);
  }
  return words.map((p) => {
    const part = { ...hardware[p.node], ...p };
    if (part.explode === undefined || part.order === undefined)
      throw new Error(`${flight}: ${p.node} is not the stack's: say where it goes and when`);
    return part as Part;
  });
};

/** A Vostok's parts: the launch vehicle's and then the ship's, each from the flight's words. */
export const vostokParts = (flight: string, words: PartWords[]): Part[] => stackParts(flight, words, { ...LAUNCHER, ...SHIP_PARTS });

/** The spacecraft's own nodes, for the views that stay on it. */
export const SPACECRAFT = ['DescentModule', 'InstrumentModule', 'RetroEngine', 'Antennas'];

/**
 * The stack's views, in the model's own frame (heights from its origin, the spacecraft's braking nozzle: the main nozzles'
 * exits are BASE below it). Those of named parts stay on them as the slider takes the vehicle apart. A camera's view is
 * there when the ship carried it: through the cutaway's opening, from his right and a little toward his feet for the
 * television (both cameras, and the man they look at); from a little aft of his right side for the film camera (the
 * turret, the magazine and the viewfinder all show).
 */
export const vostokViews = (parts: Part[]): ViewDef[] => {
  const has = (node: string) => parts.some((p) => p.node === node);
  return [
    { id: 'stack', label: 'Full stack' },
    { id: 'base', label: 'Engines', centreY: 1.0 - BASE, span: 9.5, from: along(35, 4, 1) },
    { id: 'booster', label: 'Strap-on', nodes: ['Booster_B'], from: along(-55, 6, 1) },
    { id: 'tips', label: 'Tip joints', centreY: 19.6 - BASE, span: 4.6, from: along(-40, 14, 1) },
    { id: 'third', label: 'Third stage', nodes: ['Interstage', 'BlockE'], from: along(60, 4, 1) },
    { id: 'fairing', label: 'Fairing', nodes: ['Fairing'], from: along(ENTRY.az, 10, 1) },
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT },
    { id: 'descent', label: 'Descent module', nodes: ['DescentModule'] },
    { id: 'hatch', label: 'Entry hatch', nodes: ['EntryHatch'], from: along(ENTRY.az, 12, 1) },
    ...(has('TelevisionCameras')
      ? [{ id: 'television', label: 'Television', nodes: ['TelevisionCameras'], from: along(RIGHT - 18, 20, 1) }]
      : []),
    ...(has('FilmCamera') ? [{ id: 'konvas', label: 'Film camera', nodes: ['FilmCamera'], from: along(RIGHT - 32, 24, 1) }] : []),
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ];
};

/**
 * The stack as a model, as built and in its own frame, from the flight's parts (`vostokParts`, with whatever the flight
 * adds to them), its seat and its cabin: the GLB is the flight's folder's. It stands in the gallery on its nozzles; a
 * flight whose launch site is built hangs it in the launch system's supports there (`site1Vehicle`).
 */
export const vostokStack = (ship: { flight: string; parts: Part[]; seats: NonNullable<ModelDef['seats']>; cabin: CabinDef }): ModelDef => ({
  id: 'vehicle',
  name: 'Vehicle',
  url: `models/ussr/vostok/${ship.flight}/vehicle.glb`,
  scale: '38.36 m on the pad · 10.3 m across the rudders · to scale',
  backdrop: 'studio',
  slider: ['On the pad', 'Taken apart'],
  cutaway: true,
  specGroups: ['Launch vehicle', 'Spacecraft'],
  parts: ship.parts,
  // the cabin's two lamps (cabin.ts)
  lights: vostokLights(),
  home: 'stack',
  views: vostokViews(ship.parts),
  seats: ship.seats,
  cabin: ship.cabin,
  // what leaves the launcher that is not an engine's fire: its turbines' exhausts and its strap-ons' vents (viewer/jets.ts)
  jets: LAUNCHER_JETS,
});

const SIDDIQI = 'Siddiqi, Challenge to Apollo';
const MINAKOV = 'Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor';
/**
 * The type's dimensions and masses as specs, each with its source: a flight lists those it shows, in its own order, and
 * gives its own where its ship's differed or its record says more (`{ ...SPEC.length, note }`).
 */
export const SPEC = {
  length: {
    group: 'Spacecraft',
    label: 'Length, without antennas',
    value: 4.4,
    unit: 'm',
    confidence: 'documented',
    note: `4.4 m, the type (${SIDDIQI}, p. 195; the Soviet encyclopedia text: «длина (без антенн) 4,4 м»)`,
  },
  diameter: {
    group: 'Spacecraft',
    label: 'Greatest diameter',
    value: 2.43,
    unit: 'm',
    confidence: 'documented',
    note: '2.43 m, the instrument module where its two cones meet (Siddiqi p. 195)',
  },
  descentDiameter: {
    group: 'Spacecraft',
    label: 'Descent module diameter',
    value: 2.3,
    unit: 'm',
    confidence: 'documented',
    note: '2.3 m over the heat shield; the pressure hull is 2.2 m (Siddiqi p. 195; the encyclopedia text)',
  },
  instrumentLength: {
    group: 'Spacecraft',
    label: 'Instrument module length',
    value: 2.25,
    unit: 'm',
    confidence: 'documented',
    note: '2.25 m (the encyclopedia text; Siddiqi). The model’s hull is 2.24 m from the nozzle to its forward rim',
  },
  hatch: {
    group: 'Spacecraft',
    label: 'Hatch clear diameter',
    value: 1.0,
    unit: 'm',
    confidence: 'documented',
    note: 'three hatches of 1 m (Siddiqi p. 195; «три люка диаметром "в свету" 1 м»)',
  },
  instrumentMass: {
    group: 'Spacecraft',
    label: 'Instrument module mass',
    value: 2270,
    unit: 'kg',
    confidence: 'assumed',
    note: '2.27 t for the type (Siddiqi p. 195)',
  },
  televisionCase: {
    group: 'Spacecraft',
    label: 'Television camera, case length as modelled',
    value: 0.226,
    unit: 'm',
    confidence: 'estimated',
    note: 'no dimension of the camera was found. The case is 104 × 118 × 226 mm in the model, scaled off the one photograph of a Seliger camera (Efimov) by its one-inch tube and its plug; where the two stood in the cabin is estimated too',
  },
  padLength: {
    group: 'Launch vehicle',
    label: 'Length on the pad',
    value: 38.36,
    unit: 'm',
    confidence: 'documented',
    note: `38.36 m with the fairing, the type (${MINAKOV}, table; ${SIDDIQI}, table of launch vehicles). RussianSpaceWeb also quotes 41 m`,
  },
  rudders: {
    group: 'Launch vehicle',
    label: 'Width over the air rudders',
    value: 10.3,
    unit: 'm',
    confidence: 'documented',
    note: '10.3 m (Minakov; Siddiqi)',
  },
  core: {
    group: 'Launch vehicle',
    label: 'Core with the lattice',
    value: 28.75,
    unit: 'm',
    confidence: 'documented',
    note: '28.75 m (Minakov: «Длина 2-й ступени с переходной фермой»), taken from the nozzles’ exits; the lattice is 1.26 m of it',
  },
  coreDiameter: {
    group: 'Launch vehicle',
    label: 'Core, greatest diameter',
    value: 2.95,
    unit: 'm',
    confidence: 'documented',
    note: '2.95 m (Minakov; RussianSpaceWeb). It is 2.05 m at the foot (Brügge’s tables) and 2.58 m at the top (estimated)',
  },
  strapOn: {
    group: 'Launch vehicle',
    label: 'Strap-on length',
    value: 19.2,
    unit: 'm',
    confidence: 'documented',
    note: '19.2 m without the nozzles (Minakov); 19.8 m with them (RussianSpaceWeb; Brügge)',
  },
  strapOnDiameter: {
    group: 'Launch vehicle',
    label: 'Strap-on diameter',
    value: 2.68,
    unit: 'm',
    confidence: 'documented',
    note: '2.68 m at its foot (Minakov; RussianSpaceWeb)',
  },
  third: {
    group: 'Launch vehicle',
    label: 'Third stage with its adapter',
    value: 2.98,
    unit: 'm',
    confidence: 'documented',
    note: '2.98 m long, 2.58 m across (Minakov). Brügge has 2.86 m by 2.47; Encyclopedia Astronautica 2.84 by 2.56',
  },
  fairing: {
    group: 'Launch vehicle',
    label: 'Fairing',
    value: 6.63,
    unit: 'm',
    confidence: 'documented',
    note: '6.6 m long and 2.7 m across (Minakov); 6.63 is his 9.61 m for stage and fairing less 2.98. Brügge has 6.74 m by 2.58. Its shape is estimated, and assumed the same as Vostok 1’s',
  },
} satisfies Record<string, Spec>;

/** The attitude jets, sixteen in two independent sets of eight. */
export const ATTITUDE_JET: Measure = doc(1.5 * KGF, `${SIDDIQI}, p. 197: two independent sets of eight, 1.5 kgf each`);

/** What a flight says of one of its engines: how long it burnt (where it is known), how sure, what it adds to the type's words, and anything that differed. */
export type Burn = Pick<Motor, 'confidence'> & Partial<Motor>;

/** A figure the stage table gives, which a motor quotes: it must be there. */
export const given = (m: Measure | undefined): number => {
  if (!m) throw new Error('a figure the stage table does not give');
  return m.value;
};

const tenths = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const upTo3 = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 });
/** A force in kilonewtons to a tenth, as the tables print them: `815.9 kN`, `3,276.4 kN`. */
export const kN = (newtons: number): string => `${tenths.format(newtons / 1000)} kN`;
/** A specific impulse to the second, or to a tenth. */
export const seconds = (s: number, digits = 0): string => (digits ? tenths.format(s) : String(Math.round(s)));
/** A force in tonnes-force or kilograms-force, as the Soviet sources give them: `1.614` tf, `1.5` kgf. */
export const tf = (newtons: number): string => upTo3.format(newtons / KGF / 1000);
export const kgf = (newtons: number): string => upTo3.format(newtons / KGF);
/** The type's words for a motor, then the flight's own after them. */
export const says = (type: string, own: string | undefined): string => (own ? `${type}. ${own}` : type);

/**
 * What the type's sources say of each engine, its figures written from the Measures the motor quotes, so that the
 * words cannot drift from the number. A flight's note adds its own after them.
 */
export const ENGINE_WORDS = {
  strapOns: `${kN(given(STRAP_ONS.thrust.seaLevel))} at the ground, ${kN(STRAP_ONS.thrust.vacuum.value)} in vacuum; ${seconds(given(STRAP_ONS.isp.seaLevel))} and ${seconds(STRAP_ONS.isp.vacuum.value)} s (NPO Energomash’s table by vehicle (row 8K72K), as reproduced by Brügge)`,
  core: `${kN(given(CORE.thrust.seaLevel))} at the ground, ${kN(CORE.thrust.vacuum.value)} in vacuum; ${seconds(given(CORE.isp.seaLevel))} and ${seconds(CORE.isp.vacuum.value)} s (the same table)`,
  third: `${kN(BLOCK_E.thrust.vacuum.value)} in vacuum, ${seconds(BLOCK_E.isp.vacuum.value, 1)} s (Brügge; Encyclopedia Astronautica 54.52 kN, 324 s)`,
  braking: `${tf(TDU_THRUST.value)} tf, 45 s at most (Siddiqi p. 197); 280 kg of propellant`,
  jets: `two independent sets of eight, ${kgf(ATTITUDE_JET.value)} kgf each (Siddiqi p. 197; the encyclopedia text gives 14.7 N)`,
};

/**
 * The stack's engines at the type's thrust (vostok-8k72k.ts, vostok-3ka.ts): the strap-ons' and the core's at the
 * ground, the third stage's in vacuum, the braking engine's and the attitude jets'. A flight gives each its burn, its
 * confidence and what its note says beyond the type's words (`ENGINE_WORDS`).
 */
export const vostokMotors = (burns: { strapOns: Burn; core: Burn; third: Burn; braking: Burn; jets: Burn }): Motor[] => [
  {
    name: 'RD-107 (8D74), one in each strap-on',
    count: 4,
    thrustN: given(STRAP_ONS.thrust.seaLevel),
    propellant: 'kerosene T-1 / liquid oxygen',
    kind: 'liquid',
    ...burns.strapOns,
    note: says(ENGINE_WORDS.strapOns, burns.strapOns.note),
  },
  {
    name: 'RD-108 (8D75), core',
    count: 1,
    thrustN: given(CORE.thrust.seaLevel),
    propellant: 'kerosene T-1 / liquid oxygen',
    kind: 'liquid',
    ...burns.core,
    note: says(ENGINE_WORDS.core, burns.core.note),
  },
  {
    name: 'RD-0109 (8D719), third stage',
    count: 1,
    thrustN: BLOCK_E.thrust.vacuum.value,
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
    name: 'Attitude jet',
    count: 16,
    thrustN: ATTITUDE_JET.value,
    propellant: 'compressed nitrogen',
    ...burns.jets,
    note: says(ENGINE_WORDS.jets, burns.jets.note),
  },
];
