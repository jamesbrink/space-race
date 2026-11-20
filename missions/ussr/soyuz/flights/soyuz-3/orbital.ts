/**
 * Soyuz 3 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511's (vehicles/soyuz-11a511-flown.ts) and the ship the 7K-OK's
 * (vehicles/soyuz-7kok-flown.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 11:34:18 Moscow time on
 * 26 October 1968 (08:34:18 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **The rendezvous with Soyuz 2 is not flown**: the target is not in the plan, and what the approach burned is not known burn
 * by burn. The flight is flown from the orbit published for its insertion, with the two firings of its main engine the
 * record has after the approach, and its braking burn. **The ascent's instants are Mishin's as Zak gives them** (secondary,
 * and not said to be the flown ones rather than the planned), and **the orbit after insertion is Siddiqi's table's**:
 * TASS's 205 by 225 km was the plan's.
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
  softLandingEngines,
  soyuzChutes,
  TRIM,
} from '../../vehicles/soyuz-7kok-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';

/** Seconds from liftoff, 11:34:18 Moscow time on 26 October 1968, of a Moscow time on a day of October 1968. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 26) * 24 + h - 11) * 3600 + (min - 34) * 60 + (s - 18);

const KAMANIN = 'Kamanin’s diary, October 1968 («Скрытый космос», militera.lib.ru/db/kamanin_np/68.html)';
/** Mishin's diaries as Zak gives them: secondary. */
const MISHIN = (page: string) => `Mishin’s diaries as Zak gives them (RussianSpaceWeb, “${page}”, his note 774): secondary`;
const INSERTION = `${MISHIN('Flight scenario for Soyuz-2 and -3')}, the table «Orbital insertion timeline» for Vehicle No. 10, which does not say whether its instants are the planned or the flown`;
const TASS = 'TASS, Pravda, 27 to 31 October 1968, as reprinted in «Освоение космического пространства в СССР 1967–1970», ch. II';
const TABLE = `${SIDDIQI}, Table IB, p. 877: "Soyuz 3 6575 64 183.5 X 222.2 51.69 03:22:50:45"`;
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const MPK87 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 87');
/** Christy's account of a Soyuz's guided entry, of Soyuz 4 and 5 in January 1969, the same type. */
const CHRISTY =
  'Christy, Orbital Focus, “Soyuz 4/5 – Touchdown” (orbitalfocus.uk/Diaries/Soyuz/Soyuz4-5/Landing.php): “At this moment the re-entry compartment travels at zero bank angle, which provides for maximum lift-drag ratio”, the computer then “controlling the bank angle” on what it measures: secondary, of Soyuz 4 and 5';

/** The ship in orbit, kg, and what of it the approach to Soyuz 2 burned of the approach thrusters' hydrogen peroxide. */
const SHIP = 6_575;
const PEROXIDE = 80;
/** The main engine's thrust and exhaust speed, for the impulses worked from times and the load worked from an impulse. */
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;
/** What the main engine could still give on orbit 35 and on 29 October, by Mishin's tables (m/s). */
const LEFT_35 = 170;
const LEFT_29 = 160;
/**
 * The approach to Soyuz 2 as one burn: the impulse that takes the insertion orbit (Siddiqi's table) to the size of the orbit
 * TASS published after the approaches, 179 by 252 km, on the ship's mean radius and speed (the vis-viva's `dv = mu da / 2 a^2 v`).
 */
const R_EARTH = 6_378_137;
const MU = 3.986004418e14;
const A_IN = R_EARTH + (183_500 + 222_200) / 2;
const A_OUT = R_EARTH + (179_000 + 252_000) / 2;
const APPROACH_DV = (MU * (A_OUT - A_IN)) / (2 * A_IN ** 2 * Math.sqrt(MU / A_IN));
const APPROACH_ON = MSK(26, 11, 55);
const APPROACH_OFF = APPROACH_ON + (SHIP * APPROACH_DV) / THRUST;
/** The three-second firing of 29 October, and what it gave on the ship. */
const TEST = 3;
const TEST_DV = (THRUST * TEST) / (SHIP - PEROXIDE);
/** The correction of 28 October: what is left of the ten metres a second the two firings took. */
const CORRECTION_DV = LEFT_35 - LEFT_29 - TEST_DV;
const CORRECTION_ON = MSK(28, 16, 0);
const CORRECTION_OFF = CORRECTION_ON + ((SHIP - PEROXIDE) * CORRECTION_DV) / THRUST;
const TEST_ON = MSK(29, 7, 25);

/** The braking burn's start and end, and the modules' parting: Soyuz 1's planned interval from its start (Mishin). */
const TDU = MSK(30, 9, 45, 5);
const TDU_OFF = MSK(30, 9, 47, 34);
const PARTED = TDU + 705;

/** When the strap-ons, the escape tower, the fairing, the core and the aft section went, and Block I was lit and cut. */
const STRAPS = doc(119.46, `${INSERTION}: "Stage I separation 119.46"`);
const FAIRING = doc(153.2, `${INSERTION}: "Payload fairing separation 153.2 seconds" (Vehicle No. 11’s 167.7)`);
const TOWER = assumed(
  FAIRING.value - 4,
  `NOT FOUND for this flight. The type’s four seconds between the escape tower’s jettison and the fairing’s (${MPK}: «между отделением ДУ САС на 157 сек полета и сбросом ГО на 161 сек»), put before this flight’s fairing at 153.2 s`,
);
const THIRD = doc(288.46, `${INSERTION}: "Stage III engine ignition 288.46"`);
const CORE_CUT = doc(289.71, `${INSERTION}: "Stage II separation command (KII) 289.71"`);
const CORE_GONE = doc(290.71, `${INSERTION}: "Stage II separation 290.71"`);
const AFT = doc(297.7, `${INSERTION}: "Stage III aft section separation 297.7 seconds (?)": Zak’s question mark; Vehicle No. 11’s 300.95`);
const CUTOFF = doc(527.67, `${INSERTION}: "Stage III engine cutoff command (KIII) 527.67"`);
const PARTS = derived(
  533,
  `${GCAT}: Soyuz 3 in orbit at 08:43:11 UTC (Block I at 08:43:08), 533 s after the liftoff at 08:34:18; the type’s table has the ship leave Block I at 526 s (${MPK})`,
);

/** The orbital and the instrument modules in orbit: the type's orbital module, and what is left of the ship. */
const SHIP_MODULES = {
  orbital: assumed(MODULES.orbital.value, `the type’s: ${MODULES.orbital.source}`),
  instrument: derived(
    SHIP - MODULES.descent.value - MODULES.orbital.value,
    'the ship’s 6,575 kg less the type’s descent module (2,800 kg) and orbital module (1,200 kg): MPK has the instrument module at 2.7 to 2.8 t, Siddiqi 2,560 kg',
  ),
};

/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  500,
  'NOT FOUND: the Kazakh uplands 70 km north of Karaganda; the station at Karaganda is at 538 m (NOAA ISD 35394099999), the country to its north a little lower. By judgement',
);
/** The descent module as it lands: its mass in orbit less the cover and the heat shield it has let go. */
const LANDED = MODULES.descent.value - COVER.mass.value - SHIELD.mass.value;

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511', label: 'The stack' },
  liftoffMass: derived(
    307_515,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t, the escape tower and fairing’s 1.95 t (${MPK}) and the ship’s 6.575 t: 307.5 t. The type’s table has 307.65 t with a ship of 6.56 t`,
  ),
  stages: stages11A511({
    // (cut as they are let go, as every R-7 flight's here: the separation command 0.56 s before is a mark, `strap-ons-command`)
    boosters: { cutoff: STRAPS, separation: STRAPS },
    core: { cutoff: CORE_CUT, separation: CORE_GONE },
    third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTS },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff from Site 31',
      at: doc(0, `${MPK87}: «Старт: 26 октября 1968 г. в 11:34:18 ДМВ; стартовая площадка №31»; ${GCAT}: 08:34:18 UTC`),
      also: `the announcer’s 11:34:18.4, 0.3 s after the ideal instant (${MISHIN('Soyuz-3 lifts off to intercept Soyuz-2')})`,
    },
    {
      id: 'strap-ons-command',
      label: 'The strap-ons’ separation command (NG-I)',
      at: doc(118.9, `${INSERTION}: "Stage I separation command (NG-I) 118.9 seconds"`),
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower let go', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    { id: 'spacecraft-separates', label: 'Soyuz 3 separates from the third stage, 11 km from Soyuz 2', at: PARTS },
    {
      id: 'approach-burn',
      label: 'Igla closes on Soyuz 2 from 11 km, the main engine correcting the orbit',
      at: estimated(APPROACH_ON, 'the approach’s corrections put as one burn: the burns’ estimated instant (`burns`)'),
    },
    {
      id: 'approach',
      label: 'Igla has brought the two ships to 80 m, closing at 0.6 m/s; Beregovoy has taken over by hand',
      at: doc(
        MSK(26, 12, 15),
        `${MISHIN('Soyuz-3 lifts off to intercept Soyuz-2')}: "As of 12:15 Moscow Time, tracking data showed that the two spacecraft were just 80 meters from each other and moving with a relative speed of just 0.6 meters per second"`,
      ),
    },
    {
      id: 'approach-given-up',
      label: 'Out of the shadow, 30 to 40 m from Soyuz 2 and turned 180° to it: the docking is given up',
      at: doc(
        MSK(26, 12, 25),
        `Beregovoy’s report, "As of 12:25, as soon as (I) came out of the shadow, (I) saw that my pitch axis was with a 180-degree error" (Zak, from Chertok, his note 466: secondary); ${KAMANIN}, 31 October: «Корабли сблизились до 30–40 метров»`,
      ),
    },
    {
      id: 'correction',
      label: 'Beregovoy orients the ship by hand and fires the main engine: the orbit raised',
      at: estimated(
        CORRECTION_ON,
        `on the 36th orbit (${TASS}: «на 36-м витке осуществил с помощью ручного управления ориентацию корабля и включил бортовой двигатель»; ${SIDDIQI}, p. 660), 15:15 to 16:44 by the period; out of the ground’s sight (${MISHIN('Soyuz-3 continues its mission')}). When within it, not found: its middle`,
      ),
    },
    {
      id: 'test-firing',
      label: 'After an orbit held in the landing attitude, the main engine fired for three seconds',
      at: estimated(
        TEST_ON,
        `${KAMANIN}, 29 October: «С помощью ручного управления он сориентировал корабль по-посадочному, затем почти целый виток удерживал его в этом положении с помощью гироскопов, а в заданное время включил на три секунды ТДУ»; the rehearsal began on Mishin’s 62nd orbit, 05:58 to 07:27 by the period (${MISHIN('Soyuz-3 continues its mission')}). The minute is ours, near the end of the revolution held`,
      ),
    },
    {
      id: 'retro-orientation',
      label: 'Beregovoy orients the ship by hand, then on the ion and infrared sensors: “Ion flow present!”',
      at: doc(
        MSK(30, 8, 32),
        `${MISHIN('Landing of Soyuz-3')}, from Kamanin (Zak’s note 820): "at 8:32 in the morning, during the 80th orbit, Beregovoi initiated manual orientation"`,
      ),
      also: `the first descent command did not pass and was sent again (${KAMANIN}, 30 October: «Приняли решение повторить передачу команды»)`,
    },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn, over the Atlantic',
      at: doc(
        TDU,
        `${KAMANIN}, 30 October: «включение ТДУ в 9:45:05 на 149 секунд с тормозящим импульсом 95 метров в секунду»; ${MISHIN('Landing of Soyuz-3')}: "from 09:45:05 to 09:47:34"`,
      ),
    },
    {
      id: 'retro-off',
      label: 'Main engine off',
      at: doc(TDU_OFF, `${MISHIN('Landing of Soyuz-3')}: "from 09:45:05 to 09:47:34, which amounts to 149 seconds"`),
      also: `${TASS}, 31 October: «Тормозной двигатель проработал 145 секунд»; Mishin’s plan of the day before: 143 s from 09:44:59`,
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: assumed(
        PARTED,
        `Soyuz 1’s planned interval from the braking engine’s start to the parting, 11 min 45 s (Mishin: 05:57:15 and 06:09, Zak, “Soyuz-1: the reentry”), put after this burn’s start. ${KAMANIN}: the short-wave link ceased «через несколько минут» after the cutoff`,
      ),
    },
    {
      id: 'cover-off',
      label: 'At 7 km the parachute container’s cover goes; a search aircraft sees the parachute open',
      at: doc(
        MSK(30, 10, 12, 26),
        `${MISHIN('Landing of Soyuz-3')}: "calculated to reach an altitude of seven kilometers ... at 10:12:26 Moscow Time": a calculation, not a measurement. ${KAMANIN}, 30 October: «срабатывание парашютной системы в 10:12:24 на высоте 7000 метров»`,
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown on the soft-landing engines, 70 km north of Karaganda',
      at: doc(
        MSK(30, 10, 25, 3),
        `${MPK87}: «Посадка: 30 октября 1968 г. в 10:25:03 ДМВ; в 70 км севернее г.Караганда»; ${GCAT}: 07:25:03 UTC`,
      ),
    },
  ],
  ascent: ascent11A511({
    // (no aiming azimuth was found: the launch plane is solved for the inclination reached)
    guidance: {
      vertical: VERTICAL,
      kick: KICK,
      turn: STRAPS,
      target: {
        at: 'third-stage-off',
        altitude: doc(183_500, `${TABLE}: the perigee taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.69, `${TABLE}`),
      },
    },
    boostersGo: STRAPS,
    lastCutoff: CUTOFF,
    tower: TOWER,
    fairing: FAIRING,
    aft: AFT,
    left: {
      booster: derived(5_250, 'its 3.85 t empty and the 1,400 kg the ascent flown leaves in each'),
      core: derived(12_440, 'its 6.94 t empty and the 5,500 kg the ascent flown leaves'),
      blockI: derived(3_700, 'its 2.5 t empty (the table’s less the aft section) and the 1,200 kg the ascent flown leaves'),
    },
    modules: SHIP_MODULES,
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 183_500,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 222_200,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${TABLE}. The hard check of the type’s stages`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.69,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${TABLE}. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(183_500, `${TABLE}. ${TASS}, 27 October: 205 km, which is the plan’s 204.3 km (${INSERTION})`),
    apogee: doc(222_200, `${TABLE}. ${TASS}: 225 km, the plan’s 225.0 km`),
    inclination: doc(51.69, `${TABLE}. ${TASS}: «51 градус 40 минут»`),
  },
  injection: {
    at: CUTOFF,
    heading: 'north',
    arc: estimated(
      16.5,
      'NOT documented: where the type’s ascent flown on this record’s instants has the cutoff, degrees of arc round from the pad. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as the Vostoks’ and the Voskhods’'),
  },
  mass: doc(SHIP, `${TABLE}; ${MISHIN('Flight scenario for Soyuz-2 and -3')}: "The 6,575-kilogram active ship". ${GCAT}: 6,560 kg`),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    propellant: derived(
      Math.round((SHIP - PEROXIDE) * -Math.expm1(-LEFT_35 / EXHAUST) + SHIP * -Math.expm1(-APPROACH_DV / EXHAUST)),
      `what the main engine could still give on orbit 35, 27 October, 170 m/s (${MISHIN('Soyuz-2 lands')}: the table of what the two ships had left, "SKDU ... 170 meters per second"), at its 278 s on the ship less the 80 kg of peroxide the approach burned (${KAMANIN}, 26 October), and what the approach flown as one burn takes besides: what is flown from insertion. The tanks held up to 900 kg (MPK, p. 81); what the approach used of it in fact is not known`,
    ),
  },
  burns: [
    {
      id: 'approach',
      label: 'The approach to Soyuz 2, flown as one burn',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the orbit grew, from 183.5 by 222.2 km (${TABLE}) to 179 by 252 km, 88.6 min (${TASS}, 27 October): a push along the motion. Igla steered the ship to the target on its own (${KAMANIN}, 29 October: «За 20 минут сближения в автоматическом режиме»)`,
      },
      turned: estimated(
        APPROACH_ON - 120,
        'two minutes before: the approach’s attitudes were Igla’s, turn by turn, and are not on any record read',
      ),
      on: estimated(
        APPROACH_ON,
        `its corrections were made by the main engine in the approach’s first part, after the separation at 11:43 with Soyuz 2 11 km away and closing at 15 m/s (${KAMANIN}, 26 October), and before 12:15, when the two were 80 m apart (${MISHIN('Soyuz-3 lifts off to intercept Soyuz-2')}). "At least two orbital corrections" (${SIDDIQI}, p. 660); how many, when and how big, not recorded: put as one, at 11:55`,
      ),
      off: estimated(APPROACH_OFF, 'as long after as the impulse below takes at the engine’s 417 kgf on the ship'),
      deltaV: derived(
        APPROACH_DV,
        `the impulse along the motion that grows the orbit’s semi-major axis from the insertion orbit’s (183.5 by 222.2 km, ${TABLE}) to the one TASS gave after the approaches (179 by 252 km, ${TASS}, 27 October), on the WGS 84 equator’s radius: ${APPROACH_DV.toFixed(1)} m/s. TASS has the manoeuvres on the 27th; Kamanin and Mishin have none that day for want of propellant`,
      ),
    },
    {
      id: 'correction',
      label: 'The orbit raised on the 36th orbit',
      attitude: {
        label: 'Along the motion, oriented by hand',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the orbit raised, 88.6 to 88.8 min (${TASS}): a push along the motion. The attitude was Beregovoy’s by hand («с помощью ручного управления»)`,
      },
      turned: estimated(CORRECTION_ON - 600, 'ten minutes before the firing: when within the orbit he oriented it, not found'),
      on: estimated(CORRECTION_ON, 'on the 36th orbit (TASS; Siddiqi, p. 660): when within it, not found (the record’s events)'),
      off: estimated(CORRECTION_OFF, 'as long after as the impulse below takes at the engine’s 417 kgf on the ship'),
      deltaV: derived(
        CORRECTION_DV,
        `what the main engine could give fell from 170 m/s on orbit 35 to 160 m/s on 29 October (${MISHIN('Soyuz-3 continues its mission')}: "only 10 meters per second less than in Orbit 35"), less the three-second firing’s ${TEST_DV.toFixed(1)} m/s: ${CORRECTION_DV.toFixed(1)} m/s. Mishin’s table is to the ten metres a second`,
      ),
    },
    {
      id: 'test-firing',
      label: 'The three-second firing',
      attitude: {
        label: 'The landing attitude, held on the gyroscopes',
        aim: 'velocity',
        sense: -1,
        confidence: 'documented',
        source: `${KAMANIN}, 29 October: «сориентировал корабль по-посадочному»: the braking attitude, tail first`,
      },
      turned: estimated(
        MSK(29, 6, 0),
        `oriented by hand on Mishin’s 62nd orbit, from 05:58 by the period (${MISHIN('Soyuz-3 continues its mission')})`,
      ),
      on: estimated(TEST_ON, 'after «почти целый виток» held on the gyroscopes: the minute is ours (the record’s events)'),
      off: estimated(TEST_ON + TEST, `${KAMANIN}, 29 October: «включил на три секунды ТДУ», three seconds after an estimated start`),
      deltaV: derived(TEST_DV, `three seconds at the engine’s 417 kgf on the ship: ${TEST_DV.toFixed(2)} m/s`),
    },
  ],
  retro: {
    turned: doc(
      MSK(30, 8, 32),
      `${MISHIN('Landing of Soyuz-3')}, from Kamanin: manual orientation from 8:32, then the ion and infrared sensors`,
    ),
    on: doc(TDU, `${KAMANIN}, 30 October: «включение ТДУ в 9:45:05»; ${MISHIN('Landing of Soyuz-3')}: from 09:45:05`),
    off: doc(TDU_OFF, `${MISHIN('Landing of Soyuz-3')}: to 09:47:34, 149 s. ${TASS}: 145 s`),
    deltaV: doc(
      95,
      `${KAMANIN}, 30 October: «с тормозящим импульсом 95 метров в секунду»; ${MISHIN('Landing of Soyuz-3')}: 95 m/s in his notes before and after the landing`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: `tail first, the main engine against the motion, held on the ion sensors (which find the line of flight) and the infrared vertical: «ориентация по-посадочному» (${KAMANIN}, 30 October); "Turn the spacecraft 180 degrees (tail first)" for Soyuz 1’s burn (Mishin, Zak, “Soyuz-1: the reentry”)`,
    },
  },
  entry: {
    separation: assumed(
      PARTED,
      'Soyuz 1’s planned 11 min 45 s from the braking engine’s start to the parting (Mishin, via Zak), put after this burn’s',
    ),
    mass: assumed(MODULES.descent.value, `the type’s: ${MODULES.descent.source}. ${GCAT} has 2,810 kg`),
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
    lift: ENTRY_LIFT,
    trim: TRIM,
    bank: assumed(
      0,
      `${CHRISTY}: the lift held up from the start of the entry. What the descent control system then commanded on the day is not on any record read: its later rolls, which steered the range, are not flown`,
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
    altitude: doc(
      7_000,
      `${KAMANIN}, 30 October: «срабатывание парашютной системы в 10:12:24 на высоте 7000 метров», the day’s plan; the search aircraft saw the parachute open at 7 km (Zak, from Kamanin). The type’s description has it at 9.5 km (${SIDDIQI}, p. 472)`,
    ),
    event: COVER_OFF,
  },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with Beregovoy',
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
      'Beregovoy oriented the ship for the burn by hand before the ion and infrared sensors held it; the burn, the parting, the guided entry, the parachutes and the engines at the ground were the automatic system’s',
    torn: TORN,
    crew: crewAboard(),
    lands: { on: 'land', ship: 'the descent module' },
    checks: [
      {
        id: 'module.at',
        label: 'Touchdown',
        value: MSK(30, 10, 25, 3),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${MPK87}: 10:25:03 Moscow time; ${GCAT}: 07:25:03 UTC. Dependent on the parting’s instant (assumed) and the bank held (assumed)`,
      },
      {
        id: 'module.speed',
        label: 'Touchdown speed',
        value: 2.5,
        unit: 'm/s',
        tolerance: 2,
        confidence: 'assumed',
        source: `the type’s design: the engines "reduce landing velocity to a final two to three meters per second" (${SIDDIQI}, p. 472). NOT a measurement, and NOT independent: the engines are worked from it`,
      },
    ],
  },
  landing: {
    aimed: {
      confidence: 'documented',
      source: `the descent was commanded from the ground for a landing 50 to 100 km north of Karaganda (${KAMANIN}, 29 October); the module came down «не долетев до расчетной точки всего 10 километров» (30 October). The place it came down is taken for the place its burn was timed for`,
    },
    latitude: doc(50.5, `${GCAT}: 50.5 N, to a tenth of a degree. Mishin’s 7 km point was 50.8 N 73 E`),
    longitude: doc(72.8, `${GCAT}: 72.8 E`),
    at: doc(MSK(30, 10, 25, 3), `${MPK87}: 10:25:03 Moscow time`),
    near: 'Karaganda',
  },
  checks: [
    {
      id: 'approached.perigee',
      label: 'Perigee after the approaches, 27 October',
      value: 179_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${TASS}, 27 October: «После сближения корабли вышли на орбиты со следующими параметрами ... в перигее – 179 километров», as at 18:50. NOT independent of the approach’s impulse, which is worked from it`,
      at: MSK(27, 18, 50),
    },
    {
      id: 'approached.apogee',
      label: 'Apogee after the approaches, 27 October',
      value: 252_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${TASS}, 27 October: «в апогее – 252 километра». NOT independent: as above`,
      at: MSK(27, 18, 50),
    },
    {
      id: 'approached.period',
      label: 'Period after the approaches, 27 October',
      value: 88.6 * 60,
      unit: 's',
      tolerance: 15,
      confidence: 'documented',
      source: `${TASS}, 27 October: «период обращения вокруг Земли – 88,6 минуты»: to a tenth of a minute`,
      at: MSK(27, 18, 50),
    },
    {
      id: 'correction.perigee',
      label: 'Perigee after the correction of 28 October',
      value: 199_400,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${MISHIN('Soyuz-3 continues its mission')}: "Perigee ... 196.7 / 199.4", planned and actual; ${TASS}: 199 km; ${SIDDIQI}, p. 660: "199 by 244 kilometers". Read an orbit after the firing`,
      at: CORRECTION_ON + 5_400,
    },
    {
      id: 'correction.apogee',
      label: 'Apogee after the correction of 28 October',
      value: 244_200,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${MISHIN('Soyuz-3 continues its mission')}: "Apogee ... 243.7 / 244.2"; ${TASS}: 244 km`,
      at: CORRECTION_ON + 5_400,
    },
    {
      id: 'correction.period',
      label: 'Period after the correction of 28 October',
      value: 88.81 * 60,
      unit: 's',
      tolerance: 15,
      confidence: 'documented',
      source: `${MISHIN('Soyuz-3 continues its mission')}: "Orbital period 88.78 / 88.81 minutes"; ${TASS}: 88.8 min`,
      at: CORRECTION_ON + 5_400,
    },
    {
      id: 'entryG',
      label: 'Greatest load of the entry',
      value: 3.5,
      unit: 'g',
      tolerance: 1,
      confidence: 'assumed',
      source: `the type’s guided descent, «с перегрузкой не более 3–4 g» (MPK, p. 81): no figure of this flight’s was found. Dependent on the bank held (assumed)`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${GCAT}’s point, to a tenth of a degree (11 km), and Kamanin’s 10 km short of the aim; a lifting entry’s rolls, not flown, move it across`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `as above. NOT independent: the burn is timed for the place (\`landing.aimed\`)`,
    },
  ],
};
