/**
 * What a fire looks like by what it burns: its colours, how much light it gives and how much of what is behind it it
 * hides. The fire's shape (plume.ts) is the air's and the nozzle's; its colour and brightness are the chemistry's, and
 * one flame does not stand for another. exhaust.ts marches every fire with its own entry here (`Flame.burns`).
 *
 * Why they differ. A flame that makes soot glows as the soot does: a continuum, bright and yellow-white, from the whole
 * body of the flame, and the soot is thick enough near the nozzle to hide what is behind it. Kerosene and oxygen make
 * soot (carbon freed in the fuel-rich gas); alcohol and oxygen, and the hydrazines and nitrogen tetroxide, make almost
 * none, so their light is the gas's own bands, faint, and the flame is seen through: the Redstone's pale column, the
 * Titan II's nearly invisible peach-pink jet whose shock diamonds are what shows. The temperatures are close (3,000 to
 * 3,700 K in the chamber): it is the soot, not the heat, that makes the R-7's five fires blaze.
 *
 * Each entry's figures. `temperature` is the chamber's adiabatic flame temperature, documented where a table gives it
 * for that pair (NASA SP-125, Huzel and Huang 1967, tables 1-7 to 1-9, 1,000 psia) and derived (an equilibrium
 * calculation at the engine's own mixture and pressure, Cantera with NASA thermodynamic data, checked against SP-125's
 * cases to 6 to 20 K) where it is not; it is the record of why the entries differ, not a number the shader reads.
 * Everything the shader reads (colours, `luminous`, `opacity`, `body`) is estimated: read off launch film and
 * photographs (named on each), against the alcohol flame, whose look was the first judged (plume.ts) and is the unit.
 */

import type { Burns } from '../types.ts';

export type { Burns };

type Rgb = readonly [number, number, number];

export interface FlameLook {
  /** What it is, for the reader. */
  name: string;
  /** The gas's colour by heat, linear: going out (an orange skirt), warm, and hottest. */
  cool: Rgb;
  warm: Rgb;
  hot: Rgb;
  /** The gas straight from the throat, for the first few radii. */
  core: Rgb;
  /** In no air: the gas only glows, over the whole balloon. */
  vacuum: Rgb;
  /** Light given off against the alcohol flame's at the same heat (the soot's continuum). */
  luminous: number;
  /** How much of the light behind it it takes back, against the alcohol flame's. */
  opacity: number;
  /** How much the body of the flame glows against its hot core, against the alcohol flame's (soot glows wherever it is, not only on the axis). */
  body: number;
  /** The colour of the light it throws on what is round it, linear. */
  light: Rgb;
  /** The chamber's adiabatic flame temperature, K, and where it is from. */
  temperature: { value: number; confidence: 'documented' | 'derived' | 'estimated'; source: string };
  /** What the look was judged on (estimated). */
  look: string;
}

export const FLAMES: Record<Burns, FlameLook> = {
  // the unit: plume.ts's first fire, unchanged (Freedom 7's Redstone)
  'alcohol-lox': {
    name: '75 % ethyl alcohol and liquid oxygen (the Redstone’s A-7)',
    cool: [1.0, 0.3, 0.05],
    warm: [1.0, 0.56, 0.15],
    hot: [1.0, 0.9, 0.62],
    core: [1.0, 0.93, 0.78],
    vacuum: [0.7, 0.8, 1.0],
    luminous: 1,
    opacity: 1,
    body: 1,
    light: [1.0, 180 / 255, 104 / 255], // (0xffb468, the light it was first given)
    temperature: {
      value: 3050,
      confidence: 'derived',
      source:
        'equilibrium at the A-7’s mixture (oxygen to fuel 1.2 to 1.4) and 20.7 bar: 2,990 to 3,100 K (Cantera, NASA data). SP-125 table 1-9 gives 3,389 K for 95 % alcohol at 1.73',
    },
    look: 'film and photographs of MR-2, MR-3 and MR-4 leaving LC-5 (docs/sources.md, "Launch photographs"): pale, seen through, an orange skirt, faint diamonds',
  },
  'kerosene-lox': {
    name: 'kerosene (T-1, RP-1) and liquid oxygen (the R-7’s RD-107, RD-108 and RD-0109)',
    cool: [1.0, 0.42, 0.08],
    warm: [1.0, 0.7, 0.26],
    hot: [1.0, 0.94, 0.78],
    core: [1.0, 0.97, 0.9],
    vacuum: [1.0, 0.72, 0.42],
    luminous: 2.6,
    opacity: 3,
    body: 2.2,
    light: [1.0, 0.8, 0.52],
    temperature: {
      value: 3672,
      confidence: 'documented',
      source: 'SP-125 table 1-9: oxygen and RP-1 at 2.56, 6,150 °F (3,622 K at the RD-107’s 2.47 and 58.8 bar: derived)',
    },
    look: 'launch photographs and film of R-7s from Site 1 (the launch of 12 April 1961 from across the pit, RussianSpaceWeb, Vostok 1; the 1961 newsreel "Pervyi reis k zvezdam", its launch footage not shown to be Vostok 1’s) and colour film of Soyuz launches from the same pad: the five fires white at the nozzles, yellow and opaque for their first lengths, orange further aft, the pad lit as by day; Clark, Ignition! (1972), p. 96: kerosene burns luminous with free carbon',
  },
  'hydrazine-n2o4': {
    name: 'Aerozine 50 or UDMH and nitrogen tetroxide (the Titan II’s LR87 and LR91)',
    cool: [0.95, 0.4, 0.3],
    warm: [1.0, 0.58, 0.45],
    hot: [1.0, 0.76, 0.64],
    core: [1.0, 0.86, 0.76],
    vacuum: [1.0, 0.72, 0.62],
    luminous: 0.4,
    opacity: 0.3,
    body: 0.6,
    light: [1.0, 0.7, 0.58],
    temperature: {
      value: 3342,
      confidence: 'documented',
      source: 'SP-125 table 1-8: nitrogen tetroxide and Aerozine 50 at 2.00, 5,590 °F',
    },
    look: 'NASA film of Gemini-Titan launches ("Gemini: The Twins", 1965, Gemini 3): nearly transparent, peach to pink, the shock diamonds what shows; Clark, Ignition!, p. 96: nearly invisible',
  },
  'amine-nitric': {
    name: 'amine fuel (TG-02, xylidine and triethylamine) and nitric acid (AK-20F, AK-27): Vostok’s braking engine',
    cool: [0.9, 0.35, 0.12],
    warm: [1.0, 0.56, 0.22],
    hot: [1.0, 0.82, 0.55],
    core: [1.0, 0.9, 0.72],
    vacuum: [1.0, 0.68, 0.45],
    luminous: 1.3,
    opacity: 1.2,
    body: 1.3,
    light: [1.0, 0.7, 0.45],
    temperature: {
      value: 3000,
      confidence: 'derived',
      source:
        'equilibrium at 3.0 to 3.3 and 40 bar: 2,960 to 3,090 K (Cantera; xylidine’s heat of formation estimated). SP-125 table 1-7: IRFNA and UDMH 3,222 K',
    },
    look: 'no film of it burning: an aromatic amine makes some soot, so between the alcohol flame and kerosene’s, orange (estimated); fired above the air, it is seen only as the faint balloon',
  },
  'solid-perchlorate': {
    name: 'polysulfide and ammonium perchlorate, not aluminised (Mercury’s escape and retrorockets, Gemini’s retros)',
    cool: [1.0, 0.5, 0.2],
    warm: [1.0, 0.75, 0.42],
    hot: [1.0, 0.93, 0.8],
    core: [1.0, 0.97, 0.9],
    vacuum: [1.0, 0.85, 0.62],
    luminous: 2,
    opacity: 2,
    body: 1.8,
    light: [1.0, 0.82, 0.6],
    temperature: {
      value: 2650,
      confidence: 'estimated',
      source: 'equilibrium for 70 to 75 % perchlorate: 2,500 to 2,800 K (Cantera; the binder’s figures assumed)',
    },
    look: 'no colour description found: bright, yellow-white, with white smoke (estimated)',
  },
};

/** The order the shader's tables hold them in (`kindOf`). */
export const KINDS: readonly Burns[] = ['alcohol-lox', 'kerosene-lox', 'hydrazine-n2o4', 'amine-nitric', 'solid-perchlorate'];

/** A fire's entry in the shader's tables: what it burns, or with nothing said the alcohol flame the fire was first drawn as. */
export function kindOf(burns: Burns | undefined): number {
  return Math.max(0, KINDS.indexOf(burns ?? 'alcohol-lox'));
}

const vec3 = (c: Rgb): string => `vec3(${c.map((x) => x.toFixed(3)).join(', ')})`;
const table = (name: string, pick: (f: FlameLook) => Rgb): string =>
  `const vec3 ${name}[${KINDS.length}] = vec3[${KINDS.length}](${KINDS.map((k) => vec3(pick(FLAMES[k]))).join(', ')});`;

/** The shader's tables: each flame's colours, by `kindOf`. */
export const FLAME_TABLES = [
  table('FLAME_COOL', (f) => f.cool),
  table('FLAME_WARM', (f) => f.warm),
  table('FLAME_HOT', (f) => f.hot),
  table('FLAME_CORE', (f) => f.core),
  table('FLAME_VACUUM', (f) => f.vacuum),
].join('\n  ');
