/**
 * Soyuz 10 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511's (vehicles/soyuz-11a511-flown.ts), the ship the first station ferry's,
 * 7K-T No. 31 (vehicles/soyuz-7koks-flown.ts), on the 7K-OK's engine and descent module (vehicles/soyuz-7kok-flown.ts); what is
 * here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 02:54:06 Moscow time on
 * 23 April 1971 (23:54:06 UTC on the 22nd). The checks were written before this record was flown, from how well each figure is
 * known.
 *
 * **The rendezvous and soft docking with Salyut 1 are not flown**: the station is not in the plan, and of the approach's
 * burns only one has a length on any record read. The flight is flown from the orbit published for its insertion, with that
 * one firing of its main engine (01:34 on 24 April, 17 s) and its braking burn; the correction by hand of the 23rd, Igla's
 * firings on the approach, the 5 h 30 min held on the station's cone and the undocking are told as the record's events and
 * not flown. **No ascent instant of this flight's own was found**: the 11A511's table's are taken (MPK, p. 83), and the
 * spacecraft's separation is McDowell's.
 */

import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { TORN } from '../../../vostok/vehicles/vostok-3ka.ts';
import { KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { ascent11A511, BLOCK_I_7KT, MPK, stages11A511, UPRATING_7KT } from '../../vehicles/soyuz-11a511-flown.ts';
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
import { AUTONOMOUS, KAMANIN71, MPK224, SOYUZ11 } from '../../vehicles/soyuz-7koks-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';

/** Seconds from liftoff, 02:54:06 Moscow time on 23 April 1971, of a Moscow time on a day of April 1971. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 23) * 24 + h - 2) * 3600 + (min - 54) * 60 + (s - 6);

const MPK227 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'pp. 226–227');
const TABLE = `${SIDDIQI}, Table IB, p. 877: "Soyuz 10 6575 32 209.6 X 248.4 51.6 01:23:45:54"`;
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const CHERTOK = 'Chertok, «Ракеты и люди», vol. 4, ch. 15 (testpilot.ru/espace/bibl/chertok/kniga-4/g15.php)';
const TASS =
  'TASS, «Рейс «Союза-10» завершен», 26 April 1971, as reproduced by Kamanin («Скрытый космос», militera.lib.ru/memo/russian/kamanin_np/35.html)';
const GSE =
  '«Ежегодник Большой советской энциклопедии», 1972, «Советские космические исследования в 1971 г.» (epizodsspace.narod.ru/bibl/ejeg/1972/72.html)';
/** Christy's account of a Soyuz's guided entry, of Soyuz 4 and 5 in January 1969. */
const CHRISTY =
  'Christy, Orbital Focus, “Soyuz 4/5 – Touchdown” (orbitalfocus.uk/Diaries/Soyuz/Soyuz4-5/Landing.php): “At this moment the re-entry compartment travels at zero bank angle, which provides for maximum lift-drag ratio”: secondary, of Soyuz 4 and 5';
/** The 11A511's table of figures, p. 83, for the instants no source of this flight's gives. */
const TYPE = `${MPK}: the type's «Время отделения»`;
/** Soyuz 3's ascent instants (Mishin, via Zak), for the intervals the type's table has not. */
const SOYUZ3 = 'Soyuz 3’s ascent on Mishin’s instants (Zak, RussianSpaceWeb, “Flight scenario for Soyuz-2 and -3”, note 774): secondary';

/** The ship in orbit, kg. */
const SHIP = 6_575;
/** The main engine's thrust, exhaust speed and flow, for impulses worked from times. */
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;
const FLOW = THRUST / EXHAUST;
/** The correction of 01:34 on 24 April: its 17 s and what it gave on the ship. */
const CORRECTION_ON = MSK(24, 1, 34);
const CORRECTION = 17;
const CORRECTION_DV = EXHAUST * Math.log(SHIP / (SHIP - FLOW * CORRECTION));
/** Igla's firings of the main engine as Chertok heard them reported, s (one more was not timed). */
const IGLA = 13 + 4;
/** What the main engine could still give for the approach, m/s (Raushenbakh, via Chertok). */
const LEFT = 13;

/** The braking burn: on at 01:59 on 25 April, Soyuz 11's planned 187 s; the parting Soyuz 11's planned 12 min 4 s after. */
const TDU = MSK(25, 1, 59);
const TDU_OFF = TDU + SOYUZ11.burn.value;
const AT_BURN = SHIP - FLOW * CORRECTION;
const TDU_DV = EXHAUST * Math.log(AT_BURN / (AT_BURN - FLOW * SOYUZ11.burn.value));
const PARTED = TDU + SOYUZ11.parting.value;
const DOWN = MSK(25, 2, 40);

/**
 * The ascent's instants: Soyuz 3's for the stages (the last crewed 11A511 whose instants were read; the type's table's, 118 s
 * for the strap-ons and 286 s for the core, leave the core a tonne and a half short of Soyuz 3's burn), the type's table's
 * for the escape tower and the fairing.
 */
const STRAPS = assumed(
  119.46,
  `${SOYUZ3}: "Stage I separation 119.46"; no instant of this flight’s was found. The type’s table: «T+118 cек» (${MPK})`,
);
const TOWER = assumed(157, `${TYPE}: «Время сброса ДУ САС T+157 cек», the type’s, taken`);
const FAIRING = assumed(161, `${TYPE}: «Время сброса ГО T+161 cек», the type’s, taken`);
const THIRD = assumed(288.46, `${SOYUZ3}: "Stage III engine ignition 288.46"`);
const CORE_CUT = assumed(289.71, `${SOYUZ3}: "Stage II separation command (KII) 289.71"`);
const CORE_GONE = assumed(290.71, `${SOYUZ3}: "Stage II separation 290.71". The type’s table: «T+286 cек» (${MPK})`);
const AFT = assumed(297.7, `${SOYUZ3}: "Stage III aft section separation 297.7 seconds (?)", Zak’s question mark`);
const PARTS = derived(
  534,
  `${GCAT}: Soyuz 10 in orbit at 00:03:00 UTC on 23 April (Block I at 00:02:56), 534 s after the liftoff at 23:54:06; ${GSE}: «в 3 час 03 мин вышел на расчетную орбиту». The type’s table has the ship leave Block I at 526 s (${MPK})`,
);
const CUTOFF = assumed(
  PARTS.value - 5.33,
  `Block I’s cutoff 5.33 s before the ship left it, as on ${SOYUZ3} (its cutoff command at 527.67 s, McDowell’s separation at 533 s), before this flight’s separation (McDowell)`,
);

/** The orbital and the instrument modules in orbit: the 7K-OK's orbital module, and what is left of the ship. */
const DESCENT = doc(
  2_810,
  `${GCAT}: Soyuz-10’s descent module 2,810 kg of a ship of 6,560 kg. The 7K-OK’s 2,800 kg (${MODULES.descent.source})`,
);
const SHIP_MODULES = {
  orbital: assumed(
    MODULES.orbital.value,
    `the 7K-OK’s, taken for the 7K-T’s shortened orbital module (no figure of the ferry’s found): ${MODULES.orbital.source}`,
  ),
  instrument: derived(
    SHIP - DESCENT.value - MODULES.orbital.value,
    'the ship’s 6,575 kg less the descent module (2,810 kg, McDowell) and the 7K-OK’s orbital module (1,200 kg)',
  ),
};

/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  500,
  'NOT FOUND: the Kazakh uplands 120 km north-west of Karaganda; the station at Karaganda is at 538 m (NOAA ISD 35394099999), the country to its north-west much the same. By judgement',
);
/** The descent module as it lands: its mass in orbit less the cover and the heat shield it has let go. */
const LANDED = DESCENT.value - COVER.mass.value - SHIELD.mass.value;
/** Karaganda's centre, degrees, and the landing 120 km north-west of it. */
const KARAGANDA = { lat: 49.8, lon: 73.1 };
const NW = 120 / Math.SQRT2;
const LANDING_LAT = KARAGANDA.lat + NW / 111.2;
const LANDING_LON = KARAGANDA.lon - NW / (111.32 * Math.cos((((KARAGANDA.lat + LANDING_LAT) / 2) * Math.PI) / 180));
const WHERE = `${TASS}: «совершил мягкую посадку на территории Советского Союза в 120 километрах северо-западнее города Караганды»; ${GSE}; ${SIDDIQI}, pp. 774–775: "120 kilometers northwest of the town of Karaganda". Put 120 km at 315° from Karaganda’s centre (${KARAGANDA.lat}° N ${KARAGANDA.lon}° E), on a flat Earth over so short a way. MPK (p. 227) has «в 120 км северо-восточнее»: north-east, alone among the sources read`;

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511', label: 'The stack' },
  liftoffMass: derived(
    307_515 - UPRATING_7KT.gained.value,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t less the 7K-T era’s uprating (${UPRATING_7KT.gained.value} kg: ${UPRATING_7KT.gained.source}), the escape tower and fairing’s 1.95 t (${MPK}) and the ship’s 6.575 t. The type’s table has 307.65 t with a ship of 6.56 t`,
  ),
  stages: stages11A511(
    {
      boosters: { cutoff: STRAPS, separation: STRAPS },
      core: { cutoff: CORE_CUT, separation: CORE_GONE },
      third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTS },
    },
    BLOCK_I_7KT,
  ),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff from Site 1, the second attempt',
      at: doc(0, `${MPK227}: «Старт: 23 апреля 1971 г. в 02:54:06 ДМВ; стартовая площадка №1»; ${GCAT}: 23:54:06 UTC on 22 April`),
      also: `the attempt of the 22nd stopped a minute before ignition when the cable mast to Block I did not come away (${KAMANIN71}, 22 April); on the 23rd it failed to three commands and was let go on (Zak, RussianSpaceWeb, “Soyuz-10”)`,
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower let go', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    { id: 'spacecraft-separates', label: 'Soyuz 10 separates from the third stage, four days behind Salyut', at: PARTS },
    {
      id: 'correction-by-hand',
      label: 'After the automatic correction failed, Shatalov corrects the orbit by hand',
      at: doc(
        MSK(23, 13, 15),
        `${GSE}: «23 апреля, в 13 час 15 мин была проведена коррекция орбиты «Союза-10»»; ${MPK227}: on the 4th orbit «при выполнении коррекции орбиты в автоматическом режиме выявились аномалии в работе интегратора и гироскопов. В.Шаталову дали разрешение провести коррекцию вручную». Its impulse is on no record read: not flown`,
      ),
    },
    {
      id: 'approach',
      label: 'Igla locks on at 16 km and closes on Salyut, the main engine braking the approach',
      at: doc(
        MSK(24, 3, 0),
        `${KAMANIN71}, 30 April: «В три часа 24 апреля началась стыковка «Союза-10» со станцией «Салют». Коррекцией орбит корабль и станция были сведены на расстояние 16 километров»; ${CHERTOK}: «включилась СКД на торможение, работает двигатель, 5 секунд, 10 секунд, 13 секунд ... СКД работает 4 секунды». Not flown`,
      ),
    },
    {
      id: 'soft-docking',
      label: 'Shatalov flies in by hand from 180 m: the probe is caught in Salyut’s cone, but the collars stay 90 mm apart',
      at: doc(
        MSK(24, 4, 47),
        `${TASS}: «24 апреля в 4 часа 47 минут по московскому времени космический корабль «Союз-10» был состыкован»; ${KAMANIN71}, 30 April: «корабль и станция не «дотянулись» друг до друга на 90 миллиметров». Not flown: the ship is alone in the plan`,
      ),
    },
    {
      id: 'undocking',
      label: 'Freed from Salyut at the second attempt, Soyuz 10 drifts away',
      at: doc(
        MSK(24, 10, 17),
        `${MPK227}: «На 5-м витке в 10:17 ДМВ корабль отделился от станции»; ${TASS}: 5 h 30 min joined; ${CHERTOK}: the command passed «на 85-м витке в 8 часов 44 минуты»`,
      ),
    },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn, oriented by hand on the day side and held on the gyroscopes into the night',
      at: doc(
        TDU,
        `${TASS}: «Экипаж осуществил необходимую ориентацию корабля и в 1 час 59 минут по московскому времени включил тормозную двигательную установку»; ${GSE}: «в 1 час 59 мин он сошел с орбиты». To the minute`,
      ),
    },
    {
      id: 'retro-off',
      label: 'Main engine off',
      at: assumed(TDU_OFF, `Soyuz 11’s planned 187 s after the burn’s start (${SOYUZ11.burn.source}): this burn’s length was not found`),
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: assumed(
        PARTED,
        `Soyuz 11’s planned 12 min 4 s from the burn’s start to the parting (${SOYUZ11.parting.source}), put after this burn’s`,
      ),
    },
    {
      id: 'cover-off',
      label: 'The parachute container’s cover goes; a helicopter crew sees the parachute in the dark',
      at: estimated(
        DOWN - 15 * 60,
        `some fifteen minutes before the touchdown, as «Штатный спуск корабля на парашюте с высоты 7000 метров длится около пятнадцати минут» (${SOYUZ11.chutes.source}); ${KAMANIN71}, 30 April: «Экипаж вертолета Ми-4 наблюдает спуск корабля «Союз-10» на парашюте»`,
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown at night, 120 km north-west of Karaganda: the first Soviet landing in the dark',
      at: doc(
        DOWN,
        `${TASS}: «25 апреля 1971 года в 2 часа 40 минут по московскому времени ... совершил мягкую посадку»; ${MPK227}: «Посадка: 25 апреля 1971 г. в 02:40:00 ДМВ»; «Впервые посадка советского корабля была произведена в ночных условиях»`,
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
        altitude: doc(209_600, `${TABLE}: the perigee taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.6, `${TABLE}`),
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
      blockI: derived(2_800, 'its 2.5 t empty (the table’s less the aft section) and what the ascent flown leaves'),
    },
    modules: SHIP_MODULES,
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 209_600,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 248_400,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${TABLE}. The hard check of the type’s stages with a ship of the ferry’s weight (the 11A511 was uprated for it, MPK p. 224, in ways not found)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.6,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${TABLE}. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(209_600, `${TABLE}. TASS’s first figures, 200 km (NASA, Astronautics and Aeronautics, 1971, p. 107); ${GCAT}: 204 km`),
    apogee: doc(248_400, `${TABLE}. TASS’s first figures, 224 km; ${GCAT}: 232 km`),
    inclination: doc(51.6, `${TABLE}. TASS’s first figures, 51.3°; ${GCAT}: 51.57°`),
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
  mass: doc(SHIP, `${TABLE}. ${GCAT}: 6,560 kg; the type’s 6,700 kg fuelled (${MPK224})`),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    propellant: derived(
      Math.round(FLOW * (CORRECTION + IGLA + SOYUZ11.burn.value) + AT_BURN * -Math.expm1(-LEFT / EXHAUST)),
      `what the record has the main engine burn, at its 417 kgf and 278 s: the 17 s of 01:34, Igla’s firings of 13 and 4 s on the approach (${CHERTOK}; one more he heard begin was not timed, and is not counted), a braking burn of Soyuz 11’s 187 s, and the 13 m/s still there for the approach as the two closed («На борту для сближения осталось запасов топлива всего на 13 метров в секунду для СКД», ${CHERTOK}). What the tanks held is not known; Igla’s firings are not flown, and are left in`,
    ),
  },
  burns: [
    {
      id: 'correction',
      label: 'The correction of 24 April, 17 s',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: `NOT FOUND: which way it pushed is on no record read. Along the motion, as the station’s own correction of the same revolution was, «на разгон» (${CHERTOK}): chosen`,
      },
      turned: estimated(
        CORRECTION_ON - 600,
        `ten minutes before: «Елисеев доложил, что ориентация выполнена, к коррекции готовы» (${CHERTOK}), when not given`,
      ),
      on: doc(
        CORRECTION_ON,
        `${CHERTOK}: «Коррекция «Союза-10» назначена на 1 час 34 минуты, время работы двигателя 17 секунд», as scheduled and reported`,
      ),
      off: doc(CORRECTION_ON + CORRECTION, `${CHERTOK}: «время работы двигателя 17 секунд»`),
      deltaV: derived(CORRECTION_DV, `17 s at the engine’s 417 kgf and 278 s on the 6,575 kg ship: ${CORRECTION_DV.toFixed(1)} m/s`),
    },
  ],
  retro: {
    turned: estimated(
      TDU - 2_700,
      `oriented by hand on the day side and handed to the gyroscopes for the night («выполнить ориентацию вручную, сориентированный корабль поручить гироскопам», ${KAMANIN71}, 30 April); when, not given: 45 min before the burn, by judgement`,
    ),
    on: doc(TDU, `${TASS}: «в 1 час 59 минут по московскому времени включил тормозную двигательную установку». To the minute`),
    off: assumed(TDU_OFF, `Soyuz 11’s planned 187 s (${SOYUZ11.burn.source}), the other ship of the type`),
    deltaV: derived(
      TDU_DV,
      `Soyuz 11’s planned 187 s (assumed) at the engine’s 417 kgf and 278 s on this ship after its correction: ${TDU_DV.toFixed(1)} m/s. Its own impulse was not found`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: `tail first, the main engine against the motion: «осуществил необходимую ориентацию корабля» (${TASS}), held on the gyroscopes through the night (${KAMANIN71}, 30 April)`,
    },
  },
  entry: {
    separation: assumed(
      PARTED,
      `Soyuz 11’s planned 12 min 4 s from the braking engine’s start to the parting (${SOYUZ11.parting.source}), put after this burn’s`,
    ),
    mass: DESCENT,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
    lift: ENTRY_LIFT,
    trim: TRIM,
    bank: assumed(
      0,
      `${CHRISTY}: the lift held up from the start of the entry. Shatalov reported «Управляемый спуск» (${KAMANIN71}, 30 April); what the descent control system then commanded is not on any record read, and its later rolls are not flown`,
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
  supplies: { days: AUTONOMOUS, rarefied: RAREFIED },
  rarefied: RAREFIED_SHIP,
  ejection: {
    altitude: assumed(SOYUZ11.chutes.value, `the type’s in 1971 (${SOYUZ11.chutes.source}): this flight’s height was not found`),
    event: COVER_OFF,
  },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with Shatalov, Yeliseyev and Rukavishnikov',
        mass: estimated(LANDED, `McDowell’s 2,810 kg less the cover and the heat shield it lets go (both estimated)`),
        dragArea: MODULE_DRAG,
        chutes: soyuzChutes(),
        motors: [softLandingEngines(GROUND, LANDED)],
      },
      COVER,
      SHIELD,
    ],
    automatic:
      'Shatalov oriented the ship by hand on the day side and the gyroscopes held it into the night; the burn, the parting, the guided entry, the parachutes and the engines at the ground were the automatic system’s',
    torn: TORN,
    crew: crewAboard(),
    lands: { on: 'land', ship: 'the descent module' },
    checks: [
      {
        id: 'module.at',
        label: 'Touchdown',
        value: DOWN,
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${TASS}; ${MPK227}: 02:40:00 Moscow time. Dependent on the burn’s length and the parting’s instant (both assumed) and the bank held (assumed)`,
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
      source: `the landing commission chose the first daily revolution of 25 April «в 80–100 километрах северо-западнее Караганды» (${KAMANIN71}, 30 April), and it came down «в расчетном районе» (${TASS}). The place it came down is taken for the place its burn was timed for`,
    },
    latitude: derived(LANDING_LAT, WHERE),
    longitude: derived(LANDING_LON, WHERE),
    at: doc(DOWN, `${TASS}: 02:40 Moscow time`),
    near: 'Karaganda',
  },
  checks: [
    {
      id: 'entryG',
      label: 'Greatest load of the entry',
      value: 3.5,
      unit: 'g',
      tolerance: 1,
      confidence: 'assumed',
      source: `the type’s guided descent, «с перегрузкой не более 3–4 g» (MPK, p. 81): no figure of this flight’s was found; Shatalov: «Перегрузки нарастают» (${KAMANIN71}). Dependent on the bank held (assumed)`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'derived',
      source:
        'the place 120 km north-west of Karaganda (TASS), against the 80 to 100 km aimed at (Kamanin); a lifting entry’s rolls, not flown, move it across',
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'derived',
      source: `as above. NOT independent: the burn is timed for the place (\`landing.aimed\`)`,
    },
  ],
};
