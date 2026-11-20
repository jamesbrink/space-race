/**
 * Soyuz 4 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511's (vehicles/soyuz-11a511-flown.ts) and the ship the 7K-OK's
 * (vehicles/soyuz-7kok-flown.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 10:30:00 Moscow time on
 * 14 January 1969 (07:30:00 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **The rendezvous and docking with Soyuz 5 are not flown**: the target is not in the plan. Soyuz 4's own two corrections are
 * flown as burns (the fifth orbit's and the thirty-second's), each of the impulse that takes the orbit before it to the size
 * the record has after it; Igla's approach, the four and a half hours docked and the undocking are told, not flown. The
 * descent carries three: Khrunov and Yeliseyev came across from Soyuz 5 outside, and their mass is not added. **No instant of
 * this vehicle's ascent was found**: it is flown on Soyuz 3's vehicle's (Mishin), as the type's.
 */

import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { TORN } from '../../../vostok/vehicles/vostok-3ka.ts';
import { KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { ascent11A511, MPK, stages11A511 } from '../../vehicles/soyuz-11a511-flown.ts';
import {
  COVER,
  COVER_OFF,
  crewAboard,
  ENTRY_AREA,
  ENTRY_DRAG,
  ENTRY_LIFT,
  HAND_RATE,
  HEATING,
  MODULE_DRAG,
  MODULES,
  RAREFIED,
  RAREFIED_SHIP,
  SHIELD,
  SIDDIQI,
  SKD,
  SKD_TANKS,
  softLandingEngines,
  soyuzChutes,
  TRIM,
} from '../../vehicles/soyuz-7kok-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';
import { orbital as S3 } from '../soyuz-3/orbital.ts';

/** Seconds from liftoff, 10:30:00 Moscow time on 14 January 1969, of a Moscow time on a day of January 1969. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 14) * 24 + h - 10) * 3600 + (min - 30) * 60 + s;

/** Mishin's diaries as Zak gives them: secondary. */
const MISHIN = (page: string) => `Mishin’s diaries as Zak gives them (RussianSpaceWeb, “${page}”, his note 774): secondary`;
const KAMANIN = 'Kamanin’s diary, January 1969 («Скрытый космос», militera.lib.ru/db/kamanin_np/69.html)';
const MPK88 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'pp. 88 and 89');
const TABLE = `${SIDDIQI}, Table IB, p. 877: "Soyuz 4 6625 48 173 X 225.3 51.72 02:23:20:47"`;
const TEXT = `${SIDDIQI}, p. 670`;
const PAGE = (p: number) => `${SIDDIQI}, p. ${p}`;
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const CHRONOLOGY = 'NASA, Astronautics and Aeronautics, 1969 (NASA SP-4014), 14–18 January, p. 11';
const PRESS = 'Shatalov at the crew’s press conference, NASA translation (NTRS 19690007583), pp. 3 and 4';
/** Christy's account of this flight's guided entry. */
const CHRISTY =
  'Christy, Orbital Focus, “Soyuz 4/5 – Touchdown” (orbitalfocus.uk/Diaries/Soyuz/Soyuz4-5/Landing.php): “At this moment the re-entry compartment travels at zero bank angle, which provides for maximum lift-drag ratio”, the computer then “controlling the bank angle” on what it measures: secondary';

/** The ship at launch, kg. */
const SHIP = 6_625;
/** The main engine's thrust and exhaust speed, for the impulses worked from orbits. */
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;
const R_EARTH = 6_378_137;
const MU = 3.986004418e14;
/** The impulse along the motion that takes an orbit of one size to another, on its mean radius and speed (`dv = mu da / 2 a^2 v`), m/s. */
const sizeDV = (from: [number, number], to: [number, number]): number => {
  const a = R_EARTH + (from[0] + from[1]) / 2;
  const da = (to[0] + to[1] - from[0] - from[1]) / 2;
  return (MU * da) / (2 * a ** 2 * Math.sqrt(MU / a));
};
/** The orbits: at insertion (Siddiqi's table), after the fifth orbit's correction (Siddiqi's text) and after the 32nd's (TASS). */
const INSERTED: [number, number] = [173_000, 225_300];
const FIFTH: [number, number] = [207_000, 237_000];
const THIRTY_SECOND: [number, number] = [201_000, 253_000];
const FIFTH_DV = sizeDV(INSERTED, FIFTH);
const FIFTH_ON = MSK(14, 16, 30);
const FIFTH_OFF = FIFTH_ON + (SHIP * FIFTH_DV) / THRUST;
const AFTER_FIFTH = SHIP - (SHIP * FIFTH_DV) / EXHAUST;
const LATER_DV = sizeDV(FIFTH, THIRTY_SECOND);
const LATER_ON = MSK(16, 9, 0);
const LATER_OFF = LATER_ON + (AFTER_FIFTH * LATER_DV) / THRUST;

/** The braking burn: Soyuz 3's impulse, on the ship as it then was. */
const TDU = MSK(17, 9, 10, 48);
const TDU_DV = S3.retro.deltaV.value;
const BEFORE_TDU = AFTER_FIFTH - (AFTER_FIFTH * LATER_DV) / EXHAUST;
const TDU_OFF = TDU + (BEFORE_TDU * -Math.expm1(-TDU_DV / EXHAUST)) / (THRUST / EXHAUST);
const PARTED = MSK(17, 9, 22, 52);
const DOWN = MSK(17, 9, 50, 47);

/** When the strap-ons, the escape tower, the fairing, the core and the aft section went, and Block I was lit and cut. */
const no10 = (at: { value: number; source: string }) =>
  assumed(at.value, `NOT FOUND for this vehicle (11A511 Ya15000-012): Soyuz 3’s vehicle’s, the same type. ${at.source}`);
const S3_AT = (id: string) => S3.events.find((e) => e.id === id)!.at;
const STRAPS = no10(S3.stages[0]!.separation!);
const FAIRING = no10(S3_AT('fairing'));
const TOWER = no10(S3_AT('escape-tower'));
const THIRD = no10(S3.stages[2]!.ignition);
const CORE_CUT = no10(S3.stages[1]!.cutoff);
const CORE_GONE = no10(S3.stages[1]!.separation!);
const AFT = no10(S3_AT('aft-section'));
const CUTOFF = no10(S3.stages[2]!.cutoff);
const PARTS = derived(533, `${GCAT}: Soyuz-4 in orbit at 07:38:53 UTC (Block I at 07:38:50), 533 s after the liftoff at 07:30:00`);

/** The orbital and the instrument modules in orbit: the type's orbital module, and what is left of the ship. */
const SHIP_MODULES = {
  orbital: assumed(MODULES.orbital.value, `the type’s: ${MODULES.orbital.source}`),
  instrument: derived(
    SHIP - MODULES.descent.value - MODULES.orbital.value,
    'the ship’s 6,625 kg less the type’s descent module (2,800 kg) and orbital module (1,200 kg): MPK has the instrument module at 2.7 to 2.8 t, Siddiqi 2,560 kg',
  ),
};

/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  520,
  'NOT FOUND: the snow-covered steppe 40 km north-west of Karaganda; the station at Karaganda is at 538 m (NOAA ISD 35394099999), the country to its north-west a little lower. By judgement',
);
/** The descent module as it lands: its mass in orbit less the cover and the heat shield it has let go. */
const LANDED = MODULES.descent.value - COVER.mass.value - SHIELD.mass.value;

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511', label: 'The stack' },
  liftoffMass: derived(
    307_565,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t, the escape tower and fairing’s 1.95 t (${MPK}) and the ship’s 6.625 t: 307.57 t`,
  ),
  stages: stages11A511({
    // (cut as they are let go, as every R-7 flight's here)
    boosters: { cutoff: STRAPS, separation: STRAPS },
    core: { cutoff: CORE_CUT, separation: CORE_GONE },
    third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTS },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff from Site 31, a day after the first attempt was stopped nine minutes before launch',
      at: doc(0, `${MPK88}: «Старт: 14 января 1969 г. в 10:30:00 ДМВ; стартовая площадка №31»; ${GCAT}: 07:30:00 UTC`),
      also: `${TEXT} has 10:32; Kamanin «в 10:30 московского времени»`,
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower let go', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    { id: 'spacecraft-separates', label: 'Soyuz 4 separates from the third stage', at: PARTS },
    {
      id: 'correction-5',
      label: 'Shatalov turns the ship and fires the main engine: the orbit set for Soyuz 5’s launch',
      at: estimated(FIFTH_ON, `on the fifth orbit, "about six hours after launch" (${TEXT}): the minute is ours`),
    },
    {
      id: 'correction-32',
      label: 'Shatalov’s second correction, by hand, on the 32nd orbit',
      at: estimated(
        LATER_ON,
        `"on the morning of January 16 on his thirty-second orbit" (${TEXT}); that orbit ran from about 08:15 to 09:44: the minute is ours`,
      ),
    },
    {
      id: 'approach',
      label: 'Igla begins the approach to Soyuz 5, 10 km off',
      at: doc(MSK(16, 10, 37), `${MPK88}: «Автоматическое сближение кораблей началось 16 января в 10:37 ДМВ (на 34-м витке “Союза-4”)»`),
    },
    {
      id: 'docked',
      label: 'Shatalov docks with Soyuz 5 by hand: the first docking of two crewed ships',
      at: doc(MSK(16, 11, 20), `${MPK88}: «Это произошло в 11:20 ДМВ»; ${TEXT}: hard-docked at 11:20 at 25 cm/s`),
    },
    {
      id: 'transfer',
      label: 'Khrunov and Yeliseyev come across from Soyuz 5 outside, into Soyuz 4’s orbital module',
      at: estimated(MSK(16, 13, 0), `on Soyuz 4’s 35th orbit (${PAGE(671)}), about an hour in all, 37 min outside: the minute is ours`),
    },
    {
      id: 'undocked',
      label: 'The two ships part, Soyuz 4 now with three aboard',
      at: doc(
        MSK(16, 15, 54),
        `${PAGE(672)}: 15:54, "four hours and thirty-four minutes after docking"; TASS, 15:55; ${MPK88}: 4 h 33 min 49 s docked`,
      ),
    },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn, the ion flow found after a few seconds without it',
      at: doc(
        TDU,
        `${MISHIN('Soyuz-4 lands successfully')}: "the braking maneuver scheduled for 09:10:48 Moscow Time (during the 48th orbit)"; the plan’s instant`,
      ),
      also: `«Табло “Поток ионов” не горит» ... «Все в порядке, все в порядке» (${KAMANIN}, 17 January)`,
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: doc(
        PARTED,
        `${MISHIN('Soyuz-4 lands successfully')}: "separated from the Habitation Module and the Instrument Compartment at 09:22:52 Moscow Time"`,
      ),
    },
    {
      id: 'dense-air',
      label: 'Into the dense air: the guided descent begins',
      at: doc(MSK(17, 9, 29, 43), `${MISHIN('Soyuz-4 lands successfully')}: "began its aerodynamic descent at 09:29:43 Moscow Time"`),
    },
    {
      id: 'cover-off',
      label: 'The parachute container’s cover goes; Shatalov reports on through the slot antenna and the antenna in the parachute’s line',
      at: doc(
        MSK(17, 9, 35, 30),
        `${MISHIN('Soyuz-4 lands successfully')}: "The parachute was released at 09:35:30 Moscow Time". ${KAMANIN}, 17 January, on Shatalov’s reports`,
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown on the soft-landing engines, 40 km north-west of Karaganda, three aboard',
      at: doc(DOWN, `${MPK88}: «Посадка: 17 января 1969 г. в 09:50:47 ДМВ; в 40 км северо-западнее г.Караганда»`),
      also: `${PAGE(672)} and Kamanin: about 09:53`,
    },
  ],
  ascent: ascent11A511({
    guidance: {
      vertical: VERTICAL,
      kick: KICK,
      turn: STRAPS,
      target: {
        at: 'third-stage-off',
        altitude: doc(INSERTED[0], `${TABLE}: the perigee taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.72, TABLE),
      },
    },
    boostersGo: STRAPS,
    lastCutoff: CUTOFF,
    tower: TOWER,
    fairing: FAIRING,
    aft: AFT,
    left: {
      booster: assumed(5_250, 'Soyuz 3’s: its 3.85 t empty and the 1,400 kg the ascent flown on the same instants leaves in each'),
      core: assumed(12_440, 'Soyuz 3’s: its 6.94 t empty and the 5,500 kg the ascent flown on the same instants leaves'),
      blockI: assumed(3_700, 'Soyuz 3’s: its 2.5 t empty and the 1,200 kg the ascent flown on the same instants leaves'),
    },
    modules: SHIP_MODULES,
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: INSERTED[0],
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: INSERTED[1],
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${TABLE}. The hard check of the type’s stages`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.72,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${TABLE}. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(
      INSERTED[0],
      `${TABLE}, which is the orbit Mishin’s ballistics computed for the day’s window, 173 by 225.3 km, 51.72°, 88.23 min (${MISHIN('Soyuz-4 lifts off!')}). TASS gave 213 by 224 km, 88.8 min (${CHRONOLOGY}); ${GCAT} 206 by 224`,
    ),
    apogee: doc(INSERTED[1], `${TABLE}; TASS: 224 km`),
    inclination: doc(51.72, `${TABLE}; TASS: 51.7°`),
  },
  injection: {
    at: CUTOFF,
    heading: 'north',
    arc: estimated(
      16.5,
      'NOT documented: where the type’s ascent flown on Soyuz 3’s instants has the cutoff, degrees of arc round from the pad. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as the Vostoks’ and the Voskhods’'),
  },
  mass: doc(SHIP, `${TABLE}. ${GCAT}: 6,560 kg`),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    propellant: assumed(
      SKD_TANKS.value,
      `NOT FOUND what this ship carried: the most the tanks held (${SKD_TANKS.source}), taken as full for the active ship of a rendezvous`,
    ),
  },
  burns: [
    {
      id: 'correction-5',
      label: 'The correction of the fifth orbit',
      attitude: {
        label: 'Along the motion, oriented by hand',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the orbit grew, from 173 by 225.3 km (${TABLE}) to 207 by 237 km (${TEXT}): a push along the motion. "I reoriented the spaceship and switched the correcting engine on in accordance with the computed time" (${PRESS})`,
      },
      turned: estimated(FIFTH_ON - 600, 'ten minutes before the firing: when he oriented it, not found'),
      on: estimated(FIFTH_ON, `on the fifth orbit, "about six hours after launch" (${TEXT}): its middle`),
      off: estimated(FIFTH_OFF, 'as long after as the impulse below takes at the main engine’s 417 kgf on the ship'),
      deltaV: derived(
        FIFTH_DV,
        `the impulse along the motion that grows the orbit’s size from the insertion orbit’s (${TABLE}) to Siddiqi’s after it, 207 by 237 km (${TEXT}), on the WGS 84 equator’s radius: ${FIFTH_DV.toFixed(1)} m/s. Mishin as Zak gives him has 207.3 by 273 km and 88.7 min ("Soyuz-4 lifts off!"), a period that fits 237, not 273`,
      ),
    },
    {
      id: 'correction-32',
      label: 'The correction of the 32nd orbit, by hand',
      attitude: {
        label: 'Along the motion, oriented by hand',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the orbit grew, from 207 by 237 km (${TEXT}) to 201 by 253 km (TASS, as ${MISHIN('Soyuz-4 and Soyuz-5 dock in orbit')} gives the public update): a push along the motion`,
      },
      turned: estimated(LATER_ON - 600, 'ten minutes before the firing: when he oriented it, not found'),
      on: estimated(LATER_ON, `on the 32nd orbit, "on the morning of January 16" (${TEXT}): its middle`),
      off: estimated(LATER_OFF, 'as long after as the impulse below takes at the main engine’s 417 kgf on the ship'),
      deltaV: derived(
        LATER_DV,
        `the impulse along the motion that grows the orbit from 207 by 237 km (${TEXT}) to 201 by 253 km (TASS, as Zak gives it, "Soyuz-4 and Soyuz-5 dock in orbit"), on the WGS 84 equator’s radius: ${LATER_DV.toFixed(1)} m/s`,
      ),
    },
  ],
  retro: {
    turned: estimated(TDU - 1_800, 'NOT FOUND: the ion and infrared sensors’ orientation, half an hour before the burn, by judgement'),
    on: doc(TDU, `${MISHIN('Soyuz-4 lands successfully')}: the burn "scheduled for 09:10:48 Moscow Time": the plan’s instant`),
    off: derived(
      TDU_OFF,
      `as long after as Soyuz 3’s impulse takes at the main engine’s 417 kgf and 278 s on the ship: ${(TDU_OFF - TDU).toFixed(0)} s`,
    ),
    deltaV: assumed(
      TDU_DV,
      `NOT FOUND for this flight: Soyuz 3’s, a ship of the type brought down to the same country near Karaganda (${S3.retro.deltaV.source})`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: `tail first, the main engine against the motion, held on the ion sensors (${KAMANIN}, 17 January: «Табло “Поток ионов”»)`,
    },
  },
  entry: {
    separation: doc(PARTED, `${MISHIN('Soyuz-4 lands successfully')}: 09:22:52 Moscow time`),
    mass: assumed(MODULES.descent.value, `the type’s nominal: ${MODULES.descent.source}. Khrunov and Yeliseyev aboard are not added`),
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
    lift: ENTRY_LIFT,
    trim: TRIM,
    bank: doc(
      0,
      `${CHRISTY}: the lift held up from the start of the entry. Its later rolls, which steered the range, are not on any record read and are not flown`,
    ),
    banked: assumed(
      PARTED,
      'from the parting, as the descent control system took the module over: when it began to hold its roll is not recorded',
    ),
  },
  manual: {
    rate: HAND_RATE,
    parting: derived(PARTED - TDU_OFF, 'the modules parting as long after a burn by hand as they did after the record’s'),
  },
  supplies: {
    days: doc(
      10,
      `${MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 80')}: «Время активного существования на орбите – до 10 сут»`,
    ),
    rarefied: RAREFIED,
  },
  rarefied: RAREFIED_SHIP,
  ejection: {
    altitude: assumed(
      9_500,
      `NOT FOUND for this flight: the type’s (${SIDDIQI}, p. 472: the parachute system at 9.5 km). Volynov on Soyuz 5 the next day: «на высоте 10 км сработала парашютная система» (${MPK88}); Soyuz 3’s day’s plan, 7 km`,
    ),
    event: COVER_OFF,
  },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with Shatalov, Yeliseyev and Khrunov',
        mass: estimated(
          LANDED,
          `the type’s 2,800 kg (${MODULES.descent.source}) less the cover and the heat shield it lets go (both estimated)`,
        ),
        dragArea: MODULE_DRAG,
        chutes: soyuzChutes(),
        motors: [softLandingEngines(GROUND, LANDED)],
      },
      COVER,
      SHIELD,
    ],
    automatic:
      'The ion and infrared sensors held the ship for the burn; the burn, the parting, the guided entry, the parachutes and the engines at the ground were the automatic system’s',
    torn: TORN,
    crew: crewAboard({ who: 'The crew', they: 'they', their: 'their', many: true }),
    lands: { on: 'land', ship: 'the descent module' },
    checks: [
      {
        id: 'module.at',
        label: 'Touchdown',
        value: DOWN,
        unit: 's',
        tolerance: 180,
        confidence: 'documented',
        source: `${MPK88}: 09:50:47 Moscow time; ${PAGE(672)} and Kamanin: about 09:53. Dependent on the burn’s impulse (assumed) and the bank held (documented at its start only)`,
      },
      {
        id: 'module.speed',
        label: 'Touchdown speed',
        value: 2.5,
        unit: 'm/s',
        tolerance: 2,
        confidence: 'assumed',
        source: `the type’s design: the engines "reduce landing velocity to a final two to three meters per second" (${SIDDIQI}, p. 472); «отлично сработала система мягкой посадки» (${KAMANIN}, 17 January). NOT a measurement, and NOT independent: the engines are worked from it`,
      },
    ],
  },
  landing: {
    aimed: {
      confidence: 'documented',
      source: `the descent was planned for «в районе Караганды» (${KAMANIN}, 16 January); it came down «в 40 километрах от расчетной точки посадки» (17 January). The place it came down is taken for the place its burn was timed for`,
    },
    latitude: doc(49 + 58 / 60, `${MISHIN('Soyuz-4 lands successfully')}: "49 degrees 58 minutes North"; Spacefacts the same`),
    longitude: doc(72 + 39 / 60, `${MISHIN('Soyuz-4 lands successfully')}: "72 degrees 39 minutes East"`),
    at: doc(DOWN, `${MPK88}: 09:50:47 Moscow time`),
    near: 'Karaganda',
  },
  checks: [
    {
      id: 'fifth.perigee',
      label: 'Perigee after the correction of the fifth orbit',
      value: FIFTH[0],
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${TEXT}: "207 by 237 kilometers"; Mishin, 207.3 km. NOT independent of the correction’s impulse, which is worked from the orbit’s size`,
      at: FIFTH_ON + 5_400,
    },
    {
      id: 'fifth.apogee',
      label: 'Apogee after the correction of the fifth orbit',
      value: FIFTH[1],
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${TEXT}: 237 km; Mishin as Zak prints him, 273 km. NOT independent: as above`,
      at: FIFTH_ON + 5_400,
    },
    {
      id: 'fifth.period',
      label: 'Period after the correction of the fifth orbit',
      value: 88.7 * 60,
      unit: 's',
      tolerance: 15,
      confidence: 'documented',
      source: `${MISHIN('Soyuz-4 lifts off!')}: "It increased the orbital period to 88.7 minutes": to a tenth of a minute`,
      at: FIFTH_ON + 5_400,
    },
    {
      id: 'approached.perigee',
      label: 'Perigee after the correction of the 32nd orbit',
      value: THIRTY_SECOND[0],
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `TASS, as ${MISHIN('Soyuz-4 and Soyuz-5 dock in orbit')} gives it: "placing the spacecraft into a 253 by 201-kilometer orbit". NOT independent: as above`,
      at: LATER_ON + 3_000,
    },
    {
      id: 'approached.apogee',
      label: 'Apogee after the correction of the 32nd orbit',
      value: THIRTY_SECOND[1],
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: 'TASS, as above: 253 km. NOT independent: as above',
      at: LATER_ON + 3_000,
    },
    {
      id: 'entryG',
      label: 'Greatest load of the entry',
      value: 3.5,
      unit: 'g',
      tolerance: 1,
      confidence: 'assumed',
      source:
        'the type’s guided descent, «с перегрузкой не более 3–4 g» (MPK, p. 81): no figure of this flight’s was found. Dependent on the bank held (its start only documented)',
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source:
        'Mishin’s point to the minute of arc (2 km), and Kamanin’s 40 km from the aimed point; a lifting entry’s rolls, not flown, move it across',
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: 'as above. NOT independent: the burn is timed for the place (`landing.aimed`)',
    },
  ],
};
