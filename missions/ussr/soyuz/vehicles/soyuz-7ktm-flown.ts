/**
 * The Apollo–Soyuz ship, 7K-TM (11F615A12), as the orbital simulator flies it (src/sim/orbital.ts): the 7K-T made over for the
 * joint flight (`MPK262`), Soyuz 16 here (Soyuz 19 flew the other crewed one). Two crew in Sokol-K pressure suits; an androgynous
 * peripheral docking unit, APAS, on the orbital module in place of the probe, and Igla taken out; the solar wings back; a
 * cabin that could be run at 520 mm of mercury and 40 per cent oxygen; and the 7K-OK's main engine (the KTDU-35), descent module
 * and landing system. Where a figure of the type's own was not found the 7K-OK's or the 7K-T's is taken and says so
 * (soyuz-7kok-flown.ts, soyuz-7kt-flown.ts). It flew on the 11A511U (soyuz-11a511u-flown.ts). A flight gives its own masses,
 * instants, burns and checks (its orbital.ts).
 */

import { doc } from '../../../../src/measure.ts';
import type { Measure } from '../../../../src/types.ts';
import { MPK } from './soyuz-11a511-flown.ts';

/** The type's account in the chapter on the Apollo–Soyuz flight, its pp. 261–262. */
export const MPK262 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 262');
const MPK261 = MPK262.replace('p. 262', 'p. 261');

/** What the type weighed fuelled, kg. */
export const LAUNCH_MASS: Measure = doc(
  6_790,
  `${MPK261}: «Стартовая масса 7КТМ составляла 6790 кг, длина по корпусу – 7.13 м. Экипаж корабля состоял из двух человек»`,
);

/** How long the type could fly on its own, days: its solar wings'. */
export const AUTONOMOUS: Measure = doc(
  7.5,
  `${MPK262}: two unfolding three-section solar wings «Это позволяло увеличить длительность полета корабля с 3 до 7.5 суток»; regenerators «для обеспечения 7-суточного полета»`,
);
