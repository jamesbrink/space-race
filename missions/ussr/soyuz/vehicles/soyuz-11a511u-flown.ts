/**
 * The Soyuz-U, 11A511U, as the orbital simulator flies it (src/sim/staged.ts): the R-7 made one vehicle for the crewed ships and
 * the uncrewed satellites both, from either range, in place of the six it had been (`MPK264`), first flown in May 1973 and with a
 * crew on Soyuz 16 in December 1974; it carried the 7K-TM, the later 7K-T ferries and the Soyuz T to Soyuz T-11 (1984). Its blocks
 * are the 11A511's (soyuz-11a511-flown.ts) with new engines on the strap-ons and the core, the 11D512 and the 11D511, worked to a new
 * schedule that ran them longer at their boosted thrust (`LPRE`), and a new, more compact control system that lightened the
 * core's instrument compartment (`MPK264`). The engines' thrusts are the type's own table's (`ENERGIA6`), their impulses the
 * makers' as lpre.de tabulates them; the blocks' masses and loads, of which no figure of the 11A511U's own was found, are the
 * 11A511's and say so. What the vehicle carried is documented twice (`CAPABILITY`) and held by tests/soyuz-11a511u.test.mjs.
 * A flight gives its own day (`Staging11A511`, `Ascent11A511`).
 */

import { assumed, derived, doc, estimated } from '../../../../src/measure.ts';
import type { AscentRecord, StageRecord } from '../../vostok/vehicles/vostok-record.ts';
import {
  type Ascent11A511,
  ascent11A511,
  BLOCK_I_11A511,
  CORE_11A511,
  G0,
  type Hardware,
  MPK,
  STRAP_ONS_11A511,
  type Staging11A511,
  stages11A511,
} from './soyuz-11a511-flown.ts';

/** The type's account of the 11A511U, in the chapter on the Apollo–Soyuz flight: its p. 264. */
export const MPK264 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 264');
/** RKK Energia's own history, its chapter on the Soyuz T, and the table of the 11A511U's figures with that ship in it. */
export const ENERGIA6 =
  '«Ракетно-космическая корпорация «Энергия» имени С. П. Королёва, 1946–1996» (ed. Semenov), ch. 6 (testpilot.ru/espace/bibl/energia-50/06.php), the table «Ракета-носитель 11А511У (У-2) с кораблями 7К-СТ. Основные характеристики»';
/** The engines' figures, as lpre.de tabulates them from the makers'. */
const LPRE =
  'lpre.de’s page on the RD-107 and RD-108 family (Энергомаш), Table 1: tertiary. It names the strap-ons’ 11D512 the RD-118 and the core’s 11D511 the RD-117 in that table and the other way round in its text';
const KGF = G0;
/** Why each block's mass and load is the 11A511's. */
const SAME = `no figure of the 11A511U’s own blocks was found, and «Общие технические характеристики РН изменились незначительно» (${MPK264})`;

/** The first stage's thrust, strap-ons and core together, tf: the type's table's. */
const STAGE_I = { ground: 413.3, vacuum: 505.3 };
/** The core's in vacuum, tf: the type's table's «на II ступени»; at the ground, the maker's. */
const CORE = { ground: 79.4, vacuum: 99.7 };
const STRAP_ON = { ground: (STAGE_I.ground - CORE.ground) / 4, vacuum: (STAGE_I.vacuum - CORE.vacuum) / 4 };
const ISP = { strapOn: 3_085 / G0, core: 3_098 / G0 };

/** What the type carried, documented twice: the type's figure is held by tests/soyuz-11a511u.test.mjs. */
export const CAPABILITY = {
  /** The Soyuz T, to the insertion orbit of a flight to a station, kg. */
  ship: doc(
    6_855,
    `${ENERGIA6}: «11А511У "Союз Т" … Параметры орбиты выведения: наклонение 51,6°, высота (средняя) 220 км … Стартовая масса, т: ракетного комплекса 309,7, корабля 6,855»`,
  ),
  /** That orbit's mean height, m. */
  height: doc(220_000, `${ENERGIA6}: «высота (средняя), км 220», at 51.6°`),
  inclination: doc(51.6, `${ENERGIA6}: «наклонение...° 51,6»`),
  /** What it gave over the 11A511, kg of ship. */
  gained: doc(
    200,
    `${MPK264}: the 11A511U «позволяло увеличить массу корабля почти на 200 кг»; ${ENERGIA6.replace(/, the table.*/, '')}: «позволяла увеличить массу корабля примерно на 200 кг»`,
  ),
};

/** Blocks B, V, G and D: the 11A511's strap-ons with the 11D512. */
export const STRAP_ONS_11A511U: Hardware = {
  ...STRAP_ONS_11A511,
  engine: '11D512 (RD-107 family)',
  mass: assumed(STRAP_ONS_11A511.mass.value, `the 11A511’s strap-on (${STRAP_ONS_11A511.mass.source}): ${SAME}`),
  dry: derived(STRAP_ONS_11A511.dry.value, 'its start mass less its load, both the 11A511’s (assumed): 3.85 t'),
  propellant: assumed(STRAP_ONS_11A511.propellant.value, `the 11A511’s strap-on’s load (${STRAP_ONS_11A511.propellant.source}): ${SAME}`),
  thrust: {
    seaLevel: derived(
      STRAP_ON.ground * 1000 * KGF,
      `the first stage’s 413.3 tf at the ground (${ENERGIA6}: «на I ступени: у земли 413,3») less the core’s 79.4 tf (${LPRE}: the 11D511), over four: ${STRAP_ON.ground.toFixed(2)} tf. ${LPRE}: the 11D512, 83.7 tf`,
    ),
    vacuum: derived(
      STRAP_ON.vacuum * 1000 * KGF,
      `the first stage’s 505.3 tf in vacuum (${ENERGIA6}: «в пустоте 505,3») less the core’s 99.7 tf (the same table), over four: ${STRAP_ON.vacuum.toFixed(1)} tf. ${LPRE}: the 11D512, 101.9 tf`,
    ),
  },
  isp: {
    seaLevel: derived(
      (ISP.strapOn * STRAP_ON.ground) / STRAP_ON.vacuum,
      `its thrust at the ground over its flow in vacuum, both as here: ${((ISP.strapOn * STRAP_ON.ground) / STRAP_ON.vacuum).toFixed(1)} s, where ${LPRE} prints 2,519 m/s (256.9 s) for the 11D512`,
    ),
    vacuum: doc(ISP.strapOn, `${LPRE}: the 11D512, «Удельный импульс тяги … в пустоте 3085 м/с», ${ISP.strapOn.toFixed(1)} s`),
  },
  nozzle: { ...STRAP_ONS_11A511.nozzle!, chamber: doc(5_860_000, `${LPRE}: the 11D512, «Давление в камере сгорания 5.86 МПа»`) },
};

/** Block A: the 11A511's core with the 11D511 and a lighter control system (by how much, not found: `MPK264`). */
export const CORE_11A511U: Hardware = {
  ...CORE_11A511,
  engine: '11D511 (RD-108 family)',
  mass: assumed(
    CORE_11A511.mass.value,
    `the 11A511’s core (${CORE_11A511.mass.source}): ${SAME}. Its control system was made smaller and lighter («позволило существенно уменьшить объем и массу приборного отсека центрального блока А», ${MPK264}), by how much is in nothing read`,
  ),
  dry: derived(CORE_11A511.dry.value, 'its start mass less its load, both the 11A511’s (assumed): 6.94 t'),
  propellant: assumed(CORE_11A511.propellant.value, `the 11A511’s core’s load (${CORE_11A511.propellant.source}): ${SAME}`),
  thrust: {
    seaLevel: doc(CORE.ground * 1000 * KGF, `${LPRE}: the 11D511, «Тяга у Земли 79.4 т»`),
    vacuum: doc(CORE.vacuum * 1000 * KGF, `${ENERGIA6}: «на II ступени в пустоте 99,7»; ${LPRE}: the 11D511, 99.7 t`),
  },
  isp: {
    seaLevel: derived(
      (ISP.core * CORE.ground) / CORE.vacuum,
      `its thrust at the ground over its flow in vacuum, both as here: ${((ISP.core * CORE.ground) / CORE.vacuum).toFixed(1)} s, where ${LPRE} prints 2,480 m/s (252.9 s) for the 11D511`,
    ),
    vacuum: doc(ISP.core, `${LPRE}: the 11D511, «Удельный импульс тяги … в пустоте 3098 м/с», ${ISP.core.toFixed(1)} s`),
  },
  nozzle: { ...CORE_11A511.nozzle!, chamber: doc(5_320_000, `${LPRE}: the 11D511, «Давление в камере сгорания 5.32 МПа»`) },
};

/**
 * The 11A511U's gain, sized from its documented capability (`CAPABILITY`), not from any flight's orbit. On the 11A511's blocks
 * with its own engines (above) the vehicle carries 6,545 kg to the type's insertion orbit (a mean height of 220 km at 51.6°, its
 * perigee the type's planned 204.3 km), flown on Soyuz 16's instants from Site 1 in the standard air, cut where it reaches that
 * orbit's period (tests/soyuz-11a511u.test.mjs finds it again by bisection); the type's table's 6,855 kg is 310 kg more.
 */
export const UPRATING_11A511U = {
  /** What the 11A511U's changes beyond its engines gave, kg of payload to that orbit. */
  gained: derived(
    6_855 - 6_545,
    `the type’s 6,855 kg (${ENERGIA6}) less the 6,545 kg the vehicle as given here, on the 11A511’s blocks with its own engines, carries to a mean height of 220 km (perigee 204.3 km) at 51.6°, by bisection on its flown ascent (tests/soyuz-11a511u.test.mjs)`,
  ),
  /** Which figure carries it: Block I's own mass, a kilogram off it a kilogram carried. */
  carried: estimated(
    1,
    `NOT FOUND how much each change gave. What was changed: a smaller, lighter control system on the core («существенно уменьшить объем и массу приборного отсека центрального блока А», ${MPK264}) and the engines run longer at their boosted thrust (${LPRE}: «увеличению продолжительности работы двигателей на режиме форсирования»). Carried as mass out of Block I, where a kilogram is a kilogram of ship, as the 11A511’s own uprating is (soyuz-11a511-flown.ts \`UPRATING_7KT\`): off the core it would take a tonne, more than its control system weighed by any reckoning. Chosen`,
  ),
};

/** Block I: the 11A511's, its RD-0110 as the 11A511's (the type's table: 30.4 tf in vacuum), less the 11A511U's gain (`UPRATING_11A511U`). */
export const BLOCK_I_11A511U: Omit<Hardware, 'ignition'> = {
  ...BLOCK_I_11A511,
  mass: derived(
    BLOCK_I_11A511.mass.value - UPRATING_11A511U.gained.value,
    `the 11A511’s Block I (${BLOCK_I_11A511.mass.source}; ${SAME}), less the 11A511U’s gain, ${UPRATING_11A511U.gained.value} kg (${UPRATING_11A511U.gained.source}), carried as Block I’s own mass (${UPRATING_11A511U.carried.source})`,
  ),
  dry: derived(
    BLOCK_I_11A511.dry.value - UPRATING_11A511U.gained.value,
    `the 11A511’s Block I’s mass less its load (assumed), less the 11A511U’s gain, ${UPRATING_11A511U.gained.value} kg (as above)`,
  ),
  propellant: assumed(BLOCK_I_11A511.propellant.value, `the 11A511’s Block I’s load (${BLOCK_I_11A511.propellant.source}): ${SAME}`),
};

/** The three stages of a flight on the 11A511U, in order (orbital.ts `stages`); the throttles the 11A511's (the 8K72K's readings, estimated). */
export function stages11A511U(day: Staging11A511, blockI: Omit<Hardware, 'ignition'> = BLOCK_I_11A511U): StageRecord[] {
  return stages11A511(day, blockI, { strapOns: STRAP_ONS_11A511U, core: CORE_11A511U });
}

/**
 * A flight's ascent on the 11A511U: the 11A511's (the same stations, tower and fairing), with the escape the second-generation
 * system gave: a stronger tower motor, the head block carried up and aside by two pairs of motors on the fairing between the
 * tower's going and the fairing's, so that there was no moment without an escape (`MPK264`; `ENERGIA6`, ch. 6 on the Soyuz T).
 */
export function ascent11A511U(day: Ascent11A511): AscentRecord {
  const r = ascent11A511(day);
  const [, , ...rest] = r.aborts ?? [];
  return {
    ...r,
    aborts: [
      {
        until: day.tower,
        does: 'the escape tower’s motors, stronger than the first Soyuz’s, pulled the descent and orbital modules away inside the fairing’s upper part, high and far enough for the main parachute',
        // (not flown: the head block's own flight under the tower has no figures here)
      },
      {
        until: day.fairing,
        does: 'two pairs of solid motors on the fairing carried the head block up and aside: the gap between the tower’s going and the fairing’s that the first Soyuz had was closed',
        // (not flown, as above)
      },
      ...rest.map((x) => ({ ...x, until: assumed(x.until.value, `the 11A511’s: ${x.until.source}`) })),
    ],
  };
}

export { MPK };
