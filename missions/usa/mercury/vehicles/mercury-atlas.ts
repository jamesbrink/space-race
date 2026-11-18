import { assumed, doc, estimated } from '../../../../src/measure.ts';
import type { Nozzle } from '../../../../src/sim/plan.ts';
import type { CabinDef, Measure, MechanismDef, ModelDef, Motor, Spec, ViewDef } from '../../../../src/types.ts';
import { mercurySeat } from './cabin.ts';
import {
  FT,
  type Hardware,
  HATCH_AZ,
  IN,
  LBF,
  PERISCOPE_AZ,
  type PartWords,
  THRUST,
  WINDOW_AZ,
  along,
  stackParts,
} from './mercury-capsule.ts';

/**
 * A Mercury capsule on its Atlas (LV-3B) as flight data, said once for the orbital flights (MA-6 to MA-9): how each
 * part of the stack comes away, the stack's views (`VIEW`), the model (`mercuryAtlasStack`), the figures that are the
 * type's (`SPEC`), and the engines and motors (`mercuryAtlasMotors`) at the type's thrust. A flight gives its parts'
 * words, its record, its weights and times, its periscope's times (or, MA-9, none), and the words of its own views.
 * The capsule's own, shared with the Redstone flights, is mercury-capsule.ts.
 */

export { DEG, FT, HATCH_AZ, IN, LB, LBF, NMI, PERISCOPE_AZ, STAND, THRUST, WINDOW_AZ, along, lb } from './mercury-capsule.ts';
export type { PartWords } from './mercury-capsule.ts';

/** The long equipment pod, and the booster engine under it: under the capsule's window (vehicles/atlas_lv3b.py). */
export const POD_AZ = WINDOW_AZ;
/** The vernier beside which the vehicle's number is painted, and UNITED STATES down the tank. */
export const VERNIER_AZ = POD_AZ + 90;
/** The booster engines' exit plane below the model's origin (the capsule's plane of maximum diameter), m: 67 ft 4 in of Atlas, the adapter and 1.06 in. */
export const BASE = (808 + 50.75 + 1.06) * IN;
/** The spacecraft without its tower. */
export const CAPSULE = ['AntennaCanister', 'RecoveryCompartment', 'Hatch', 'Window', 'Afterbody', 'CrewCabin', 'HeatShield', 'Retropack'];

/** How each of the stack's parts comes away: the capsule's pieces lift off its top in turn, the Atlas's drop below. */
export const HARDWARE: Record<string, Hardware> = {
  EscapeTower: { group: 'Spacecraft', explode: [0, 7.6, 0], order: 1 },
  AntennaCanister: { group: 'Spacecraft', explode: [0, 6.6, 0], order: 2 },
  RecoveryCompartment: { group: 'Spacecraft', explode: [0, 5.8, 0], order: 3 },
  Hatch: { group: 'Spacecraft', explode: along(HATCH_AZ, 4.26, 1.15), order: 4 },
  Window: { group: 'Spacecraft', explode: along(WINDOW_AZ, 4.9, 1.0), order: 4 },
  Afterbody: { group: 'Spacecraft', explode: [0, 4.9, 0], order: 4 },
  CrewCabin: { group: 'Spacecraft', inside: true, explode: [0, 3.9, 0], order: 5 },
  HeatShield: { group: 'Spacecraft', inside: true, explode: [0, 3.3, 0], order: 6 },
  Retropack: { group: 'Spacecraft', inside: true, explode: [0, 2.6, 0], order: 7 },
  AtlasAdapter: { group: 'Launch vehicle', explode: [0, 1.6, 0], order: 8 },
  AtlasSustainer: { group: 'Launch vehicle', inside: true, explode: [0, -3, 0], order: 9 },
  AtlasVerniers: { group: 'Launch vehicle', explode: [0, 0, 0], order: 10 },
  AtlasPods: { group: 'Launch vehicle', explode: [0, 0, 0], order: 10 },
  AtlasTank: { group: 'Launch vehicle', explode: [0, 0, 0], order: 11 },
  AtlasBoosterSection: { group: 'Launch vehicle', explode: [0, -8.5, 0], order: 0 },
  AtlasBoosterEngines: { group: 'Launch vehicle', inside: true, explode: [0, -13, 0], order: 0 },
};

/** A flight's parts, in its order, each from its words (the periscope's `clocked` moves on the afterbody are the flight's). */
export const mercuryAtlasParts = (flight: string, words: PartWords[]) => stackParts(flight, words, HARDWARE);

/**
 * The stack's views, each of named parts, so it stays on them as the slider takes the vehicle apart. A flight lists
 * those it shows, in its order, with its own between them.
 */
export const VIEW = {
  /** As the liftoffs were photographed: a vernier and the number toward the eye, the pods at either hand. */
  stack: { id: 'stack', label: 'Full stack', from: along(VERNIER_AZ - 22, 0.1) },
  spacecraft: { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'], from: along(WINDOW_AZ + 25, 0.1) },
  capsule: { id: 'capsule', label: 'Capsule', nodes: CAPSULE, from: along(WINDOW_AZ + 20, 0.15) },
  /** The window and the afterbody, where the capsule's name or emblem was painted: the flight says which. */
  painted: (id: string, label: string): ViewDef => ({ id, label, nodes: ['Window', 'Afterbody'], from: along(WINDOW_AZ + 4, 0.2) }),
  hatch: { id: 'hatch', label: 'Hatch', nodes: ['Hatch'], from: along(HATCH_AZ + 8, 0.3) },
  periscope: { id: 'periscope', label: 'Periscope side', nodes: ['Afterbody'], from: along(PERISCOPE_AZ + 22, 0.2) },
  adapter: { id: 'adapter', label: 'Adapter', nodes: ['AtlasAdapter'], from: along(WINDOW_AZ - 20, 0.15) },
  pod: { id: 'pod', label: 'Long pod', nodes: ['AtlasPods'], from: along(POD_AZ + 35, 0.1) },
  booster: {
    id: 'booster',
    label: 'Booster section',
    nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'],
    from: along(VERNIER_AZ - 15, 0.05),
  },
  engines: { id: 'engines', label: 'Engines', nodes: ['AtlasBoosterEngines', 'AtlasSustainer'], from: along(VERNIER_AZ - 30, -0.7) },
} satisfies Record<string, ViewDef | ((id: string, label: string) => ViewDef)>;

/**
 * The stack as a model, from the flight's parts, views, cabin and periscope (`mechanisms`: none on MA-9, which flew
 * without one). A flight whose launch site is built gives `stand`: how high over the site's zero its engines' exit plane
 * stood on the launcher, and how the vehicle was turned in the site's frame (radians about the vertical, from the
 * frame's +X to the hatch's middle: places/cape-canaveral/lc-14.parts.ts); it then stands at Complex 14, shown with the pad as it was
 * at liftoff. Without one only the vehicle is built: it stands in the gallery, on its engines. The couch's span is a
 * placeholder (estimated).
 */
export const mercuryAtlasStack = (ship: {
  flight: string;
  parts: ReturnType<typeof mercuryAtlasParts>;
  views: ViewDef[];
  cabin: CabinDef;
  mechanisms?: MechanismDef[];
  stand?: { over: number; rotationY: number };
}): ModelDef => ({
  id: 'vehicle',
  name: 'Vehicle',
  url: `models/usa/mercury/${ship.flight}/vehicle.glb`,
  scale: '29.07 m tall · spacecraft 7.91 m · to scale',
  backdrop: ship.stand ? 'ground' : 'studio',
  slider: ['Assembled', 'Taken apart'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts: ship.parts,
  ...(ship.mechanisms ? { mechanisms: ship.mechanisms } : {}),
  position: [0, (ship.stand?.over ?? 0) + BASE, 0],
  ...(ship.stand ? { rotationY: ship.stand.rotationY, with: [{ model: 'pad', at: 0 }] } : {}),
  // the two cabin lights, as Liberty Bell 7's: either side of the pilot's head, in the frame the capsule stands in
  lights: [
    { position: [0.304, 0.55, 0.092], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [0.092, 0.55, 0.304], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
  ],
  home: 'stack',
  views: ship.views,
  seats: [mercurySeat([-4 * 3600, -3600])],
  cabin: ship.cabin,
});

/** The Atlas's rated thrusts (NASA SP-45, pp. 85 and 88). */
export const ATLAS = {
  booster: doc(154000 * LBF, '154,000 lbf each of the two booster chambers, rated (NASA SP-45, p. 85)'),
  sustainer: doc(57000 * LBF, '57,000 lbf, rated (NASA SP-45, p. 88)'),
  vernier: doc(1000 * LBF, '1,000 lbf each (NASA SP-45, p. 88)'),
} satisfies Record<string, Measure>;

const SP8120 = 'NASA SP-8120, Liquid Rocket Engine Nozzles (1976), Table I, pp. 5 and 6';
const MCCUTCHEON =
  'McCutcheon, "Rocket Propulsion Evolution 5: Atlas Missile" (Aircraft Engine Historical Society, 2021), its table of launch vehicle engines: secondary';
const LR101 =
  'Rocketdyne’s LR101 vernier data sheet as heroicrelics.org transcribes it (Jetzer, "LR-101 Vernier Engine"): secondary, of the type, which dash number MA-2 carried not read';

/** The words for an exit pressure worked from a chamber's and an area ratio: how it was reached, and that it is an estimate. */
const expanded = (psia: number, ratio: number, atm: number): string =>
  `the chamber’s ${psia} psia expanded isentropically through ${ratio}:1 as a gas of gamma 1.2 (kerosene and oxygen’s in general, not this engine’s): ${atm} atmosphere`;

/**
 * The MA-2's nozzles, for the shape of their fires (sim/plan.ts `Nozzle`; viewer/plume.ts): nothing the simulator flies
 * reads them. The Atlas D's engines on every Mercury-Atlas flight: the two booster chambers (LR89-NA-5), the sustainer
 * (LR105-NA-5) and the verniers (LR101), whose fires are drawn from their own nozzles though they are flown as part of the
 * sustainer. psia to Pa by 6,894.757.
 */
export const MA2_NOZZLES = {
  booster: {
    chamber: doc(
      580 * 6894.757,
      `${MCCUTCHEON}: 580 psi, the LR89-5's (its 163,211 lbf at sea level is above the MA-2's 154,000 rating: which build the table is of is not said). ${SP8120} has 578 psia at sea level for the LR89-NA-7, the MA-5's booster`,
    ),
    expansion: doc(8, `${MCCUTCHEON}: 8, the LR89-5's. ${SP8120}: 8 for the LR89-NA-7, its exit 45.83 in across`),
    exit: estimated(67_460, expanded(580, 8, 0.67)),
  },
  sustainer: {
    chamber: doc(696 * 6894.757, `${MCCUTCHEON}: 696 psi, the LR105-5's. Encyclopedia Astronautica has 48 bar, the same`),
    expansion: doc(25, `${MCCUTCHEON}: 25, the LR105-5's. NASA SP-8120, p. 32: "The Atlas sustainer (expansion ratio of 25)"`),
    exit: estimated(18_260, expanded(696, 25, 0.18)),
  },
  vernier: {
    chamber: assumed(358 * 6894.757, `${LR101}: 358 psia at 1,000 lbf at sea level, fed by the sustainer's pump`),
    expansion: assumed(
      6,
      `${LR101}: "an expansion ratio of 6:1". A model specification of the YLR101-NA-15 (DTIC AD0409534, not opened) is cited for 5.61`,
    ),
    exit: estimated(61_360, expanded(358, 6, 0.61)),
  },
} satisfies Record<string, Nozzle>;

/** The orbital flights' figures that are the type's: the capsule on its Atlas. */
export const SPEC = {
  heatShield: {
    group: 'Spacecraft',
    label: 'Heat shield diameter',
    value: 74.5 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '74.5 in (NASA CR-649): the capsule’s mould line, the same for the ablation shield as for the heat sink',
  },
  capsuleLength: {
    group: 'Spacecraft',
    label: 'Length, retro nozzles to canister top',
    value: 131.57 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '131.57 in: Z77.50 to Z209.07 (SEDR 104, Figure 1-3); the report draws 6 ft 10 in from the adapter’s top (Results, Figure 4-11)',
  },
  towerLength: {
    group: 'Spacecraft',
    label: 'Length with escape tower',
    value: 311.55 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '311.55 in: Z77.50 to Z389.05 (SEDR 104, Figure 1-3)',
  },
  atlasLength: {
    group: 'Launch vehicle',
    label: 'Atlas, engines to the adapter’s foot',
    value: 67 * FT + 4 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '67 ft 4 in (the same figure, and Figure 4-3)',
  },
  tank: {
    group: 'Launch vehicle',
    label: 'Tank diameter',
    value: 10 * FT,
    unit: 'm',
    confidence: 'documented',
    note: '10 ft; "approximately 70 inches" at the top of the forward cone (NASA SP-45, p. 85)',
  },
  fairings: {
    group: 'Launch vehicle',
    label: 'Width across the booster fairings',
    value: 16 * FT,
    unit: 'm',
    confidence: 'documented',
    note: '16 ft (Results of the First United States Manned Orbital Space Flight, Figures 4-3 and 4-11); model: 16 ft 4 in, scaled off NASA SP-45, Figure 5-4',
  },
  adapter: {
    group: 'Launch vehicle',
    label: 'Adapter length',
    value: 50.75 * IN,
    unit: 'm',
    confidence: 'derived',
    note: '50.75 in: Z52.69 to Z103.44 (SEDR 104, Figure 1-3); the report draws 4 ft 3 in (Results, Figure 4-11)',
  },
  skin: {
    group: 'Launch vehicle',
    label: 'Tank skin, thickest',
    value: 0.048 * IN,
    unit: 'm',
    confidence: 'documented',
    note: 'stainless steel sheet from 0.048 in to 0.015 in (NASA SP-45, p. 85); the four forward skins were thickened for Mercury after MA-1 (p. 95)',
  },
} satisfies Record<string, Spec>;

/** What a flight says of one of its engines or motors: its burn (where it is known), how sure, and its note (written from the Measure, `lb`). */
export type Burn = Pick<Motor, 'confidence' | 'note'> & Partial<Motor>;

const HTP = '90% hydrogen peroxide';
/** The Atlas's engines and the capsule's motors and thrusters at the type's thrust, each with the flight's burn and words. */
export const mercuryAtlasMotors = (b: {
  booster: Burn;
  sustainer: Burn;
  verniers: Burn;
  escape: Burn;
  jettison: Burn;
  posigrade: Burn;
  retrograde: Burn;
  pitchYaw: Burn;
  roll: Burn;
  low: Burn;
}): Motor[] => [
  {
    name: 'Rocketdyne MA-2, booster chamber',
    count: 2,
    thrustN: ATLAS.booster.value,
    propellant: 'RP-1 / liquid oxygen',
    kind: 'liquid',
    ...b.booster,
  },
  {
    name: 'Rocketdyne MA-2, sustainer',
    count: 1,
    thrustN: ATLAS.sustainer.value,
    propellant: 'RP-1 / liquid oxygen',
    kind: 'liquid',
    ...b.sustainer,
  },
  {
    name: 'Rocketdyne MA-2, vernier',
    count: 2,
    thrustN: ATLAS.vernier.value,
    propellant: 'RP-1 / liquid oxygen',
    kind: 'liquid',
    ...b.verniers,
  },
  { name: 'Escape motor', count: 1, thrustN: THRUST.escape.value, propellant: 'solid', kind: 'solid', ...b.escape },
  { name: 'Tower jettison motor', count: 1, thrustN: THRUST.towerJettison.value, propellant: 'solid', kind: 'solid', ...b.jettison },
  { name: 'Posigrade motor', count: 3, thrustN: THRUST.posigrade.value, propellant: 'solid', kind: 'solid', ...b.posigrade },
  { name: 'Retrograde motor', count: 3, thrustN: THRUST.retrograde.value, propellant: 'solid', kind: 'solid', ...b.retrograde },
  { name: 'Pitch and yaw thruster, high', count: 4, thrustN: THRUST.pitchYawHigh.value, propellant: HTP, ...b.pitchYaw },
  { name: 'Roll thruster, high', count: 2, thrustN: THRUST.rollHigh.value, propellant: HTP, ...b.roll },
  { name: 'Attitude thruster, low', count: 6, thrustN: THRUST.low.value, propellant: HTP, ...b.low },
];
