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
    count: 5,
    thrustN: (7680982 * LBF) / 5,
    propellant: 'RP-1 / liquid oxygen',
    confidence: 'derived',
    note: `${ten}, p. 49a, nominal S-IC total divided over five engines`,
  },
  {
    name: 'J-2 · second stage',
    count: 5,
    thrustN: (1163854 * LBF) / 5,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'derived',
    note: `${ten}, p. 49a, nominal S-II total divided over five engines`,
  },
  {
    name: 'J-2 · third stage',
    count: 1,
    thrustN: 203615 * LBF,
    propellant: 'Liquid hydrogen / liquid oxygen',
    confidence: 'documented',
    note: `${ten}, p. 49a, nominal S-IVB rating`,
  },
  {
    name: 'Service propulsion engine',
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
    count: 1,
    thrustN: 9870 * LBF,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    confidence: 'documented',
    note: `${ten}, p. 47, maximum rated thrust`,
  },
  {
    name: 'Ascent engine',
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
    note: `${ten}, pp. 46–47`,
  },
];
