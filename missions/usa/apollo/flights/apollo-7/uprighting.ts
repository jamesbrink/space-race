import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { Flight } from '../../../../../src/types.ts';

const IN = 0.0254;
const MASS = 'Apollo 7 Mission Report, table A.5-I, landing row';
const EVENTS = 'NASA SP-4029, Apollo 7 Timeline, splashdown 260:09:03, inflation 260:18, upright 260:22; latter times to nearest minute';
const BAGS =
  'NASA NTRS 19700024853, Apollo postlanding systems qualification tests, two 43-inch bags and one 34-inch bag; assumed for CSM-101';
const mass = 11409 * 0.45359237;
const radius = (diameter: number) => assumed((diameter * IN) / 2, BAGS);
const centre = (37.4 + 1.3) * IN;
const source =
  'Nominal Block II afterbody, NASA TN D-5686 fig. 2(g), North American A-512S ST-428A. Profile sampled from command_module.py; forward cover released.';
export const UPRIGHTING: NonNullable<NonNullable<Flight['flies']>['uprighting']> = {
  initialHeel: doc(180, EVENTS + ', apex-down stable II; nominal inverted attitude'),
  delay: derived(537, EVENTS),
  inflation: estimated(
    240,
    EVENTS + '. Four minutes from the crew starting inflation to stable I; individual bag pressure histories unknown.',
  ),
  end: derived(777, EVENTS),
  body: {
    mass: derived(mass, MASS + ', 11,409 lb'),
    hull: {
      profile: [
        [0, 0],
        [0.25, 9.6092],
        [1, 19.199],
        [3, 33.1632],
        [6, 46.7076],
        [10, 59.9667],
        [14, 70.5578],
        [14.7357, 72.313],
        [21.8217, 77],
        [24, 76.6855],
        [26.0154, 75.7578],
        [40, 66.6761],
        [60, 53.6879],
        [82.43, 39.1217],
      ].map(([h, r]) => [h! * IN, r! * IN]),
      confidence: 'assumed',
      source,
    },
    datum: derived(
      -((80.2 + 58.4) * 12 + 36 + 28 * 12 + 162 - 1.3) * IN,
      'SA-205 stations to XA1000 and the aft apex at Xc -1.30 in, saturn-ib.md and command-module.md',
    ),
    heel: {
      centre: {
        up: derived(centre, MASS + ', XA1037.4 minus heat shield apex XA998.7'),
        out: derived(6.1 * IN, MASS + ', ZA6.1 inches, in the plane of uprighting'),
      },
      gyration: derived(Math.sqrt((4567 * 1.35581795) / mass), MASS + ', transverse Iyy in slug ft² divided by mass, square root'),
      damping: estimated(0.55, 'Rotational damping fraction in the sea; wave and roll histories unavailable.'),
    },
    bags: [
      { out: 0, across: -0.75, up: 2.92, radius: radius(43) },
      { out: 0, across: 0.75, up: 2.92, radius: radius(43) },
      { out: -0.75, across: 0, up: 2.92, radius: radius(34) },
    ],
    spaces: [],
    leaves: [],
    heave: estimated(0.55, 'Heave damping in Atlantic swell.'),
    drag: estimated(4.0, 'Submerged drag area approximated for the command module.'),
    rights: estimated(4, 'Initial roll into stable II after splashdown, exact time unknown.'),
  },
};
