/**
 * The Soyuz T, 7K-ST (11F732), as the orbital simulator flies it (src/sim/orbital.ts): the ship that replaced the 7K-T ferry (`MPK287`),
 * Soyuz T-2 here, the first flown with a crew. Up to three in Sokol-KV suits; the Chaika control system on the Argon-16 computer;
 * solar wings; and a combined propulsion system, its main engine (the KTDU-426's 11D426, of 315 kgf on a gimbal) and its
 * approach and attitude thrusters fed from the same tanks; the braking burn made after the orbital module had been let go,
 * which saved propellant. The descent module kept the earlier shape; its reserve parachute was larger and it had six
 * soft-landing motors in place of four. Where a figure of the type's own was not found the 7K-OK's is taken and says so
 * (soyuz-7kok-flown.ts). It flew on the 11A511U (soyuz-11a511u-flown.ts). A flight gives its own masses, instants, burns and
 * checks (its orbital.ts).
 */

import { doc, estimated } from '../../../../src/measure.ts';
import type { Measure } from '../../../../src/types.ts';
import { G0, MPK } from './soyuz-11a511-flown.ts';
import { SKD as KTDU35 } from './soyuz-7kok-flown.ts';
import type { SoyuzEngine } from './soyuz-record.ts';

/** The type's account in the chapter on Salyut 6, its p. 287 (the Soyuz T and Soyuz T-2). */
export const MPK287 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 287');
/** RKK Energia's own history, its chapter on the Soyuz T. */
export const ENERGIA6 =
  '«Ракетно-космическая корпорация «Энергия» имени С. П. Королёва, 1946–1996» (ed. Semenov), ch. 6 (testpilot.ru/espace/bibl/energia-50/06.php)';
/** The instructor's account of the Soyuz T and of Soyuz T-2. */
export const VASILYEV = 'Vasilyev, «Пилотируемый космический корабль "Союз Т"…», Пилотируемые полеты в космос no. 4 (41), 2021 (gctc.ru)';
const KBKHM =
  'the KTDU-426 as lpre.de’s table of the KB Khimmash engines gives it (11Д426: «/0,315 тс», «/292 с», «Вытесн.», «Корректирующая и тормозная ДУ для КК Союз-Т-Т-15»): tertiary';

/** The KTDU-426's main engine, 11D426, without the flight's own load of propellant. */
export const SKD: Omit<SoyuzEngine, 'propellant'> = {
  name: 'KTDU-426 main engine (СКД, 11Д426)',
  thrust: doc(
    315 * G0,
    `${MPK287}: «маршевый двигатель 11Д426 тягой 315 кгс (вместо двух ЖРД тягой 417 и 411 кгс на «Союзе»)»; ${VASILYEV}: «маршевый двигатель тягой 315 кгс». The Czech Academy of Sciences’ catalogue has 4.1 kN`,
  ),
  isp: doc(292, `${KBKHM}`),
  starts: {
    count: 25,
    confidence: 'assumed',
    source: `the KTDU-35’s 25 starts (${KTDU35.starts.source}): ${KBKHM} has the 11D426’s «мног.», many, and no number`,
  },
  nozzle: {
    chamber: doc(851_000, `${KBKHM}: «Давление в КС, атм 8,68», 0.85 MPa: a pressure-fed engine`),
    exit: estimated(
      2_000,
      'NOT FOUND: its expansion is a blank in the table read; a few hundredths of an atmosphere, as any engine made to fire above the air, taken (only its fire reads it)',
    ),
  },
};

/** What the type weighed fuelled, kg. */
export const LAUNCH_MASS: Measure = doc(
  6_850,
  `${MPK287}: «масса – 6.83–7.00 т»; ${ENERGIA6}: «Корабль 7К-СТ имел стартовую массу 6830 кг»; McDowell’s catalogue: 6,850 kg for Soyuz T-2`,
);

/** The modules, the type's (`MPK287`). */
export const MODULES = {
  orbital: doc(1_100, `${MPK287}: «Бытовой отсек: диаметр – 2.2 м, масса – 1.1 т». McDowell’s catalogue has 1,250 kg for Soyuz T-2’s`),
  instrument: doc(2_750, `${MPK287}: «Приборно-агрегатный отсек: масса – 2.75 т»`),
  descent: doc(
    3_000,
    `${MPK287}: «Спускаемый аппарат имел высоту 2.14 м, диаметр – 2.2 м, массу – около 3 т»; ${ENERGIA6}: «при массе спускаемого аппарата до 3000 кг». McDowell’s catalogue has 2,850 kg`,
  ),
};

/** How long the type could fly on its own, days. */
export const AUTONOMOUS: Measure = doc(
  4.2,
  `${MPK287}: «Продолжительность автономного полета корабля была увеличена с 3 до 4.2 суток»; ${ENERGIA6}: «при времени автономного полета 4,2 суток»`,
);

/** The reserve parachute, m² of canopy: larger than the 7K-OK's. */
export const RESERVE: Measure = doc(
  590,
  `${MPK287}: «Усовершенствована парашютная система: площадь основного парашюта – 1000 м², запасного – 590 м² (вместо 570 м²)»`,
);

/** How many soft-landing motors fired at the ground: six where the 7K-OK had four. Their thrust is worked from the design's speeds. */
export const SOFT_MOTORS = doc(6, `${MPK287}: «В системе мягкой посадки стало 6 твердотопливных двигателей вместо 4»`);
