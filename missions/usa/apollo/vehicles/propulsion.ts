import type { Motor } from '../../../../src/types.ts';
import { doc } from '../../../../src/measure.ts';

const LBF = 4.4482216152605;
const saturn = 'MSFC-MAN-503, Saturn V Flight Manual SA-503, fig. 1-3';
const kit = 'NASA Apollo 8 press kit 68-208';

export const SA503_THRUST = {
  f1: doc(1522000 * LBF, saturn),
  sii: doc(228000 * LBF, saturn),
  sivb: doc(203000 * LBF, saturn),
};

export const CSM103_THRUST = {
  sps: doc(20500 * LBF, `${kit}, p. 34`),
  smRcs: doc(100 * LBF, `${kit}, p. 35`),
  cmRcs: doc(94 * LBF, `${kit}, p. 35`),
};

const nine = 'NASA Apollo 9 press kit, Saturn V and spacecraft propulsion descriptions';
/** Published nominal ratings. F-1 thrust is the quoted stage total divided over five engines. */
export const APOLLO9_THRUST: Motor[] = [
  {
    name: 'F-1',
    operation: 'Staggered centre and outboard cutoff',
    count: 5,
    thrustN: (7700000 * LBF) / 5,
    propellant: 'RP-1 / liquid oxygen',
    confidence: 'derived',
    note: nine + ', p. 48, 7,700,000 lb for the stage (p. 8: 7,720,174 lb at first motion)',
  },
  {
    name: 'J-2 · second stage',
    operation: 'Single boost firing',
    count: 5,
    thrustN: 230000 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: nine + ', p. 9, maximum vacuum thrust raised from 225,000 lb',
  },
  {
    name: 'J-2 · third stage',
    operation: 'Restartable engine',
    count: 1,
    thrustN: 230000 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note:
      nine +
      ', p. 49: 230,000 lb for the third stage at operating altitude (its SA-504 fact sheet gives 232,000 lb for the first burn and 211,000 lb for the second)',
  },
  {
    name: 'Service propulsion engine',
    operation: 'Multiple orbital burns',
    count: 1,
    thrustN: 20500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: nine + ', p. 39',
  },
  {
    name: 'SM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: nine + ', p. 39, four to a quad',
  },
  {
    name: 'CM attitude thruster',
    count: 12,
    thrustN: 94 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: nine + ', p. 40, six to each of two subsystems',
  },
  {
    name: 'Descent engine',
    operation: 'Throttleable orbital burns',
    count: 1,
    thrustN: 9870 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: nine + ', p. 47, maximum rated thrust',
  },
  {
    name: 'Ascent engine',
    operation: 'Fixed-thrust orbital burns',
    count: 1,
    thrustN: 3500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: nine + ', p. 47',
  },
  {
    name: 'LM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: nine + ', pp. 46–47',
  },
];

const ten = 'NASA Apollo 10 press kit, May 1969';
/** SA-505 stage totals on the nominal-configuration plate, spacecraft engine ratings in the system descriptions. */
export const APOLLO10_THRUST: Motor[] = [
  {
    name: 'F-1',
    operation: 'Staggered centre and outboard cutoff',
    count: 5,
    thrustN: 1536197 * LBF,
    propellant: 'RP-1 / liquid oxygen',
    confidence: 'documented',
    note: `${ten}, p. 51, each engine at liftoff (p. 49a: 7,680,982 lb for the stage)`,
  },
  {
    name: 'J-2 · second stage',
    operation: 'Centre engine cut off early',
    count: 5,
    thrustN: (1163854 * LBF) / 5,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'derived',
    note: `${ten}, p. 49a, nominal S-II total divided over five engines`,
  },
  {
    name: 'J-2 · third stage',
    operation: 'Restartable engine',
    count: 1,
    thrustN: 203615 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: `${ten}, p. 49a, nominal S-IVB rating`,
  },
  {
    name: 'Service propulsion engine',
    operation: 'Multiple burns',
    count: 1,
    thrustN: 20500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 39`,
  },
  {
    name: 'SM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 39`,
  },
  {
    name: 'CM attitude thruster',
    count: 12,
    thrustN: 93 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 40`,
  },
  {
    name: 'Descent engine',
    operation: 'Throttleable burns in lunar orbit',
    count: 1,
    thrustN: 9870 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 47, maximum rated thrust`,
  },
  {
    name: 'Ascent engine',
    operation: 'Fixed-thrust burns',
    count: 1,
    thrustN: 3500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 47`,
  },
  {
    name: 'LM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 47`,
  },
];

const eleven = 'NASA Apollo 11 press kit, release 69-83K, 6 July 1969';
/** Nominal thrust per engine. The J-2 figures are the upper published ratings across the mission’s operating conditions. */
export const APOLLO11_THRUST: Motor[] = [
  {
    name: 'F-1',
    operation: 'At liftoff',
    count: 5,
    thrustN: 1530771 * LBF,
    propellant: 'RP-1 / liquid oxygen',
    confidence: 'documented',
    note: `${eleven}, p. 114, approximately 1,530,771 lbf per engine at liftoff`,
  },
  {
    name: 'J-2 · second stage',
    operation: 'Upper thrust rating',
    count: 5,
    thrustN: 231000 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: `${eleven}, p. 115, individual engines develop 224,003 to 231,000 lbf across the phases of flight`,
  },
  {
    name: 'J-2 · third stage',
    operation: 'Upper thrust rating · restartable',
    count: 1,
    thrustN: 203779 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: `${eleven}, p. 109, SA-506 vehicle plate, single-engine stage rated at 178,161 to 203,779 lbf`,
  },
  {
    name: 'Service propulsion engine',
    operation: 'Multiple burns',
    count: 1,
    thrustN: 20500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${eleven}, p. 88, service propulsion system`,
  },
  {
    name: 'SM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: `${eleven}, p. 93, four-engine quads`,
  },
  {
    name: 'CM attitude thruster',
    count: 12,
    thrustN: 93 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: `${eleven}, p. 93, two six-engine subsystems`,
  },
  {
    name: 'Descent engine',
    operation: 'Maximum rated thrust · throttleable',
    count: 1,
    thrustN: 9870 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${eleven}, p. 106, descent propulsion system`,
  },
  {
    name: 'Ascent engine',
    operation: 'Fixed-thrust lunar ascent',
    count: 1,
    thrustN: 3500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${eleven}, p. 106, ascent propulsion system`,
  },
  {
    name: 'LM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${eleven}, p. 106, reaction control system`,
  },
];

const twelve = 'NASA Apollo 12 press kit, release 69-148, 5 November 1969';
/** Nominal thrust per engine. The J-2 figures are the upper published ratings across the mission’s operating conditions. */
export const APOLLO12_THRUST: Motor[] = [
  {
    name: 'F-1',
    operation: 'At liftoff',
    count: 5,
    thrustN: 1524085 * LBF,
    propellant: 'RP-1 / liquid oxygen',
    confidence: 'documented',
    note: `${twelve}, p. 51, approximately 1,524,085 lbf per engine at liftoff`,
  },
  {
    name: 'J-2 · second stage',
    operation: 'Upper thrust rating',
    count: 5,
    thrustN: 232283 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: `${twelve}, p. 52, individual engines develop 220,227 to 232,283 lbf across the phases of flight`,
  },
  {
    name: 'J-2 · third stage',
    operation: 'Upper thrust rating · restartable',
    count: 1,
    thrustN: 207256 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: `${twelve}, p. 50, single-engine flight range 176,982 to 207,256 lbf`,
  },
  {
    name: 'Service propulsion engine',
    operation: 'Multiple burns',
    count: 1,
    thrustN: 20500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'assumed',
    note: `Apollo 11 Press Kit, p. 88, Block II service propulsion engine nominal rating. The Apollo 12 kit p. 55 prints an extra zero; MSC-01855 appendix A lists valve-actuation filters as the SPS change.`,
  },
  {
    name: 'SM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: `${twelve}, p. 56, four-engine quads`,
  },
  {
    name: 'CM attitude thruster',
    count: 12,
    thrustN: 93 * LBF,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: `${twelve}, p. 56, two six-engine subsystems`,
  },
  {
    name: 'Descent engine',
    operation: 'Maximum rated thrust · throttleable',
    count: 1,
    thrustN: 9870 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${twelve}, p. 62, descent propulsion system`,
  },
  {
    name: 'Ascent engine',
    operation: 'Fixed-thrust lunar ascent',
    count: 1,
    thrustN: 3500 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${twelve}, p. 62, ascent propulsion system`,
  },
  {
    name: 'LM attitude thruster',
    count: 16,
    thrustN: 100 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${twelve}, p. 62, reaction control system`,
  },
];
