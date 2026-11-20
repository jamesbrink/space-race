/**
 * The first station ferry, 7K-T Nos. 31 and 32 (11F615A8; the 7K-OKS of later Western usage), as the orbital simulator flies
 * it (src/sim/orbital.ts): what the type had beyond the 7K-OK it was made from (soyuz-7kok-flown.ts), said once for the
 * flights that flew one (Soyuz 10 here; Soyuz 11 flew the other). Three crew without suits, an active probe with a hatch
 * through it, the Igla gear moved into the orbital module, no toroidal compartment round the engine bells, and the 7K-OK's
 * solar wings, main engine (the KTDU-35), descent module and landing system. Where a figure of the type's own was not found the
 * 7K-OK's is taken and says so. A flight gives its own masses, instants, burns and checks (its orbital.ts).
 */

import { doc } from '../../../../src/measure.ts';
import type { Measure } from '../../../../src/types.ts';
import { MPK } from './soyuz-11a511-flown.ts';

/** The type's account in the chapter on the first Salyut, its p. 224 (the 7K-T as a ferry for the DOS). */
export const MPK224 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 224');
/** Kamanin's diary of 1971, in which Soyuz 10 and Soyuz 11 flew («Скрытый космос»). */
export const KAMANIN71 = 'Kamanin’s diary, 1971 («Скрытый космос», militera.lib.ru/db/kamanin_np/71.html)';
/** NASA's account of the station ferries. */
export const MHH = 'Portree, Mir Hardware Heritage, NASA RP-1357';

/** What the type weighed fuelled, kg: the type's, where a flight's own figure is less. */
export const LAUNCH_MASS: Measure = doc(
  6_700,
  `${MPK224}: «Стартовая масса 7КТ увеличилась до 6700 кг (масса 7КОК – 6400–6500 кг), поэтому РН «Союз» (11А511) была доработана с целью увеличения ее грузоподъемности»; ${MHH}, §1.7.1: "about 6800 kg"`,
);

/** How long the type could fly on its own, days. */
export const AUTONOMOUS: Measure = doc(
  3,
  `${MPK224}: «Длительность автономного полета 7КТ составляла до 3 суток, а в составе ДОС – до 60 суток»`,
);

/**
 * Soyuz 11's descent, the other ship of the type, as it was planned for its last night (${KAMANIN71}, 30 June): the braking
 * engine on at 01:35:24 for 187 s, the ship parting at 01:47:28. A flight of the type with no figures of its own for these
 * takes them, and says so.
 */
export const SOYUZ11 = {
  /** The braking burn's length, s. */
  burn: doc(
    187,
    `${KAMANIN71}, 30 June: «По программе спуска ТДУ должна включиться в 01:35:24 и через 187 секунд  выключиться»: Soyuz 11’s plan`,
  ),
  /** From the braking burn's start to the ship's parting, s. */
  parting: doc(
    1 * 3600 + 47 * 60 + 28 - (1 * 3600 + 35 * 60 + 24),
    `${KAMANIN71}, 30 June: the engine on at 01:35:24, and «В 01:47:28 должно произойти разделение корабля (от спускаемого аппарата отделяются приборный и бытовой отсеки)»: Soyuz 11’s plan, 12 min 4 s`,
  ),
  /** The height the parachute system worked at, m: the type's in 1971. */
  chutes: doc(7_000, `${KAMANIN71}, 30 June: «Штатный спуск корабля на парашюте с высоты 7000 метров длится около пятнадцати минут»`),
};
