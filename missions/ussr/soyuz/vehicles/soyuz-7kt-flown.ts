/**
 * The two-seat station ferry, 7K-T from No. 34 (11F615A8 still: the index did not change), as the orbital simulator flies it
 * (src/sim/orbital.ts): the ship rebuilt after Soyuz 11 (Soyuz 12 here; Soyuz 13 to 18 and 21 to 33 flew the type or its
 * variants). Two crew in Sokol-K pressure suits, the third couch's place given to the suits' gas supply, no solar wings but
 * batteries for two days of flight on its own, the 7K-OK's main engine (the KTDU-35), descent module and landing system. Where a
 * figure of the type's own was not found the 7K-OK's or the first ferry's is taken and says so (soyuz-7kok-flown.ts,
 * soyuz-7koks-flown.ts). A flight gives its own masses, instants, burns and checks (its orbital.ts).
 */

import { doc, estimated } from '../../../../src/measure.ts';
import type { Craft } from '../../../../src/sim/plan.ts';
import type { Measure } from '../../../../src/types.ts';
import { SHIP_RAREFIED } from '../../vostok/vehicles/vostok-3ka.ts';
import { MPK } from './soyuz-11a511-flown.ts';
import { MHH } from './soyuz-7koks-flown.ts';

/** The type's account, its p. 231 (the modernised 7K-T). */
export const MPK231 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 231');

/** What the type weighed fuelled, kg: the type's, where a flight's own figure is less. */
export const LAUNCH_MASS: Measure = doc(
  6_800,
  `${MPK231}: «Даже после того как с корабля сняли солнечные батареи, двухместный 7КТ был на 100 кг тяжелее предшественника – его стартовая масса достигла 6800 кг»; ${MHH}, §1.8.1: 6800 kg`,
);

/** How long the type could fly on its own, days: its batteries'. */
export const AUTONOMOUS: Measure = doc(
  2,
  `${MHH}, §1.8.2: "Addition of batteries ... The batteries restricted the Soyuz Ferry to only 2 days of autonomous flight"`,
);

/** The joined ship in the free-molecule flow of its orbit: the 7K-OK's without its wings. */
export const RAREFIED_SHIP: NonNullable<Craft['rarefied']> = {
  drag: SHIP_RAREFIED.drag,
  area: estimated(
    10,
    'm²: the joined ship turning as it flew, between end on (its 2.72 m skirt, 5.8 m²) and broadside (7.5 m long, about 15 m²), with no solar wings (MPK, p. 231): by judgement',
  ),
  length: estimated(7.5, `its length with the docking probe (${MHH}, §1.8.1: "about 7.5 m")`),
};
