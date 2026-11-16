import { doc } from '../../../../src/measure.ts';
import type { Measure, Part, Spec } from '../../../../src/types.ts';

/**
 * The Mercury capsule as flight data, said once for every flight of it, on the Redstone or the Atlas
 * (mercury-redstone-stack.ts, mercury-atlas.ts): the units its drawings are in, where things are round it, `along`,
 * the type's figures that do not depend on the launch vehicle, and the thrusts of its motors and thrusters as Measures,
 * with a formatter so that a note quoting one is written from it. The capsule's own sizes live in
 * vehicles/mercury_capsule.py and its cabins in cabin.ts.
 */

export const IN = 0.0254;
export const FT = 0.3048;
export const LB = 0.45359237;
export const LBF = 4.4482216;
export const NMI = 1852;
export const DEG = Math.PI / 180;

// Where things are round the vehicle, as vehicles/mercury_capsule.py has them: degrees about the long axis from the
// pilot's right. The capsule stands turned so that its hatch is on +X, as a launch site's frame has it
// (mercury_capsule.stand): STAND is that turn. The numbers live there; these are quoted for the views and for how the
// parts come away.
export const STAND = -315;
export const WINDOW_AZ = 270 + STAND;
export const HATCH_AZ = 315 + STAND;
export const PERISCOPE_AZ = 90 + STAND;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
export const along = (az: number, lift: number, by = 1): [number, number, number] => [
  by * Math.cos(az * DEG),
  by * lift,
  -by * Math.sin(az * DEG),
];

/** What a flight says of one of the stack's parts: its words, and anything that differed on its ship (its periscope's times). */
export type PartWords = Pick<Part, 'node' | 'name' | 'summary' | 'detail'> & Partial<Part>;
/** How a part comes away, which is the stack's: its heading in the parts list, whether it is inside, where it goes and when. */
export type Hardware = Pick<Part, 'group' | 'inside' | 'explode' | 'moves' | 'order'>;

/**
 * A flight's parts, in the order it gives them, each part of the stack taking how it comes away from `hardware` (the
 * flight's own value for one of those wins). Every part of the stack must be given words but those in `optional`.
 */
export const stackParts = (flight: string, words: PartWords[], hardware: Record<string, Hardware>, optional: string[] = []): Part[] => {
  for (const node of Object.keys(hardware)) {
    if (!optional.includes(node) && !words.some((p) => p.node === node)) throw new Error(`${flight}: no words for the stack's ${node}`);
  }
  return words.map((p) => {
    const part = { ...hardware[p.node], ...p };
    if (part.explode === undefined || part.order === undefined)
      throw new Error(`${flight}: ${p.node} is not the stack's: say where it goes and when`);
    return part as Part;
  });
};

const SP45 = 'NASA SP-45';
/**
 * The capsule's motors and thrusters, nominal, as Measures: what every flight's motor quotes. The escape, jettison,
 * posigrade and retrograde motors' are the nominal figures the flight reports tabulate (NASA SP-45 among them); the
 * thrusters' are the reaction control system's two automatic sets and its low chambers (Hammack and Heberlig).
 */
export const THRUST = {
  escape: doc(52000 * LBF, `52,000 lb for about 1 s, nominal (${SP45}, Table 3-III, p. 53)`),
  towerJettison: doc(800 * LBF, `800 lb for 1.5 s, nominal (${SP45}, Table 3-III)`),
  posigrade: doc(400 * LBF, `400 lb for 1 s, nominal (${SP45}, Table 3-III)`),
  retrograde: doc(1000 * LBF, `1,000 lb for 10 s, nominal (${SP45}, Table 3-III)`),
  pitchYawHigh: doc(24 * LBF, '24 lb, the automatic system’s pitch and yaw chambers (Hammack and Heberlig)'),
  rollHigh: doc(6 * LBF, '6 lb, the automatic system’s roll chambers (Hammack and Heberlig)'),
  low: doc(1 * LBF, '1 lb, the automatic system’s low chambers, all axes (Hammack and Heberlig)'),
} satisfies Record<string, Measure>;

const thousands = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
/** A thrust in pounds, as the American reports print them: `52,000`, `1,000`. A note writes its figure from the Measure with this. */
export const lb = (m: Measure): string => thousands.format(m.value / LBF);

/** The capsule's figures that are the same on either launch vehicle. */
export const SPEC = {
  afterbodyHalfAngle: {
    group: 'Spacecraft',
    label: 'Afterbody half-angle',
    value: 20,
    unit: 'deg',
    confidence: 'documented',
    note: 'NASA CR-649',
  },
  windowPane: {
    group: 'Spacecraft',
    label: 'Window, outer pane length',
    value: 21.0 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '21.00 in along the cone, 11.254 in wide at the heat shield’s end and 7.511 in at the nose’s (NASA SP-45, Figure 19-1: the Mercury spacecraft window)',
  },
} satisfies Record<string, Spec>;
