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
