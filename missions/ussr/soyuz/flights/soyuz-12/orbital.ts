/**
 * Soyuz 12 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511's (vehicles/soyuz-11a511-flown.ts), the ship the two-seat ferry's, 7K-T
 * No. 37 (vehicles/soyuz-7kt-flown.ts), on the 7K-OK's engine and descent module (vehicles/soyuz-7kok-flown.ts); what is here
 * is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 15:18:16 Moscow time on
 * 27 September 1973 (12:18:16 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **The orbit was raised in burns no record read gives one by one**: TASS gave the orbit after them, 326 by 345 km, and
 * Siddiqi has them within seven hours of the launch. They are flown as two burns on the fifth revolution, at the perigee and
 * the apogee, each of the impulse that takes the published orbit before to the published orbit after. **No ascent instant of
 * this flight's own was found**: the 11A511's table's are taken (MPK, p. 83), and the spacecraft's separation is McDowell's.
 * **The orbital module was let go in orbit before the braking burn** (it stayed up until January 1974), at McDowell's instant.
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
  RAREFIED,
  SHIELD,
  SIDDIQI,
  SKD,
  softLandingEngines,
  soyuzChutes,
  TRIM,
} from '../../vehicles/soyuz-7kok-flown.ts';
import { SOYUZ11 } from '../../vehicles/soyuz-7koks-flown.ts';
import { AUTONOMOUS, LAUNCH_MASS, RAREFIED_SHIP } from '../../vehicles/soyuz-7kt-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';

/** Seconds from liftoff, 15:18:16 Moscow time on 27 September 1973, of a Moscow time on a day of September 1973. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 27) * 24 + h - 15) * 3600 + (min - 18) * 60 + (s - 16);

const MPK234 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 234');
const TABLE = `${SIDDIQI}, Table IB, p. 877: "Soyuz 12 6720 31 193 X 248.6 51.61 01:23:15:32"`;
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const GSE =
  '«Ежегодник Большой советской энциклопедии», 1974, «Космические исследования, выполненные в Советском Союзе в 1973 г.» (epizodsspace.narod.ru/bibl/ejeg/1974/74.html)';
const NIZH = '«Полеты продолжаются», «Наука и жизнь», no. 11, 1973 (nkj.ru/archive/articles/52879)';
const AA = 'NASA, Astronautics and Aeronautics, 1973, p. 273, from TASS';
const ZAK = 'Zak, RussianSpaceWeb, “Soyuz-12” (russianspaceweb.com/soyuz12.html): secondary';
/** Christy's account of a Soyuz's guided entry, of Soyuz 4 and 5 in January 1969. */
const CHRISTY =
  'Christy, Orbital Focus, “Soyuz 4/5 – Touchdown” (orbitalfocus.uk/Diaries/Soyuz/Soyuz4-5/Landing.php): “At this moment the re-entry compartment travels at zero bank angle, which provides for maximum lift-drag ratio”: secondary, of Soyuz 4 and 5';
const TYPE = `${MPK}: the type's «Время отделения»`;
const SOYUZ3 = 'Soyuz 3’s ascent on Mishin’s instants (Zak, RussianSpaceWeb, “Flight scenario for Soyuz-2 and -3”, note 774): secondary';
/** Soyuz 10's braking burn's start (TASS, 01:59) to its touchdown (02:40), s. */
const SOYUZ10_DOWN = 41 * 60;

/** The ship in orbit, kg, and its main engine's thrust, exhaust speed and flow. */
const SHIP = 6_720;
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;
const FLOW = THRUST / EXHAUST;

/**
 * The ascent's instants: Soyuz 3's for the stages (the last crewed 11A511 whose instants were read; the type's table's, 118 s
 * for the strap-ons and 286 s for the core, leave the core a tonne and a half short of Soyuz 3's burn), the type's table's
 * for the escape tower and the fairing.
 */
const STRAPS = assumed(
  119.46,
  `${SOYUZ3}: "Stage I separation 119.46"; no instant of this flight’s was found. The type’s table: «T+118 cек» (${MPK})`,
);
const TOWER = assumed(
  157,
  `${TYPE}: «Время сброса ДУ САС T+157 cек», the type’s, taken. From this flight the tower flew without its shroud (Zak, RussianSpaceWeb, “Emergency escape system”); no change of its instant was found, the earlier jettison at 123 s coming with the second-generation tower of Soyuz 19 (the same)`,
);
const FAIRING = assumed(161, `${TYPE}: «Время сброса ГО T+161 cек», the type’s, taken`);
const THIRD = assumed(288.46, `${SOYUZ3}: "Stage III engine ignition 288.46"`);
const CORE_CUT = assumed(289.71, `${SOYUZ3}: "Stage II separation command (KII) 289.71"`);
const CORE_GONE = assumed(290.71, `${SOYUZ3}: "Stage II separation 290.71". The type’s table: «T+286 cек» (${MPK})`);
const AFT = assumed(297.7, `${SOYUZ3}: "Stage III aft section separation 297.7 seconds (?)", Zak’s question mark`);
const PARTS = derived(
  533,
  `${GCAT}: Soyuz 12 in orbit at 12:27:09 UTC (Block I at 12:27:06), 533 s after the liftoff at 12:18:16. The type’s table has the ship leave Block I at 526 s (${MPK})`,
);
const CUTOFF = assumed(
  PARTS.value - 5.33,
  `Block I’s cutoff 5.33 s before the ship left it, as on ${SOYUZ3} (its cutoff command at 527.67 s, McDowell’s separation at 533 s), before this flight’s separation (McDowell)`,
);

/**
 * The orbit raised, as two burns: at the perigee of the insertion orbit (Siddiqi's table) the apogee taken up to the published
 * one, and at that apogee the perigee taken up to its, on the WGS 84 equator's radius (the vis-viva). The perigee is put at
 * the cutoff (`injection.anomaly`), so the first burn is centred four revolutions after it, on the fifth.
 */
const R_EARTH = 6_378_137;
const MU = 3.986004418e14;
const R = (h: number) => R_EARTH + h;
const speedAt = (r: number, a: number) => Math.sqrt(MU * (2 / r - 1 / a));
const period = (a: number) => 2 * Math.PI * Math.sqrt(a ** 3 / MU);
const P1 = R(193_000);
const A1 = R(248_600);
const A2 = R(345_000);
const P2 = R(326_000);
const RAISE1_DV = speedAt(P1, (P1 + A2) / 2) - speedAt(P1, (P1 + A1) / 2);
const RAISE2_DV = speedAt(A2, (P2 + A2) / 2) - speedAt(A2, (P1 + A2) / 2);
const RAISE1_S = (SHIP * RAISE1_DV) / THRUST;
const AFTER1 = SHIP - FLOW * RAISE1_S;
const RAISE2_S = (AFTER1 * RAISE2_DV) / THRUST;
const AFTER2 = AFTER1 - FLOW * RAISE2_S;
const RAISE1_AT = CUTOFF.value + 4 * period((P1 + A1) / 2);
const RAISE2_AT = RAISE1_AT + period((P1 + A2) / 2) / 2;
const RAISE1_ON = RAISE1_AT - RAISE1_S / 2;
const RAISE2_ON = RAISE2_AT - RAISE2_S / 2;

/** The modules: McDowell's orbital and descent modules, and what is left of the ship. */
const ORBITAL = doc(1_250, `${GCAT}: the orbital module, Soyuz-12 BO, 1,250 kg`);
const DESCENT = doc(2_850, `${GCAT}: Soyuz-12’s descent module, 2,850 kg of a ship of 6,800 kg (the type’s)`);
/** The orbital module let go in orbit before the braking burn. */
const BO_OFF = MSK(29, 11, 40);
const SHIP_MODULES = {
  orbital: ORBITAL,
  instrument: derived(
    SHIP - ORBITAL.value - DESCENT.value,
    'the ship’s 6,720 kg (Siddiqi) less the orbital module (1,250 kg) and the descent module (2,850 kg), both McDowell’s',
  ),
  parted: doc(
    BO_OFF,
    `${GCAT}: Soyuz-12 BO in orbit from «1973 Sep 29 0840?» UTC, his own question mark, and down on 21 January 1974: let go in orbit, not with the instrument module after the burn. Spacefacts: "A large object was jettisoned when the craft was preparing for retrofire. The object remained in orbit for 116 days"`,
  ),
};

/** The braking burn: Soyuz 11's planned 187 s, lit as long before the touchdown as Soyuz 10's was; the parting Soyuz 11's 12 min 4 s after. */
const DOWN = MSK(29, 14, 33, 48);
const TDU = DOWN - SOYUZ10_DOWN;
const TDU_OFF = TDU + SOYUZ11.burn.value;
const AT_BURN = AFTER2 - ORBITAL.value;
const TDU_DV = EXHAUST * Math.log(AT_BURN / (AT_BURN - FLOW * SOYUZ11.burn.value));
const PARTED = TDU + SOYUZ11.parting.value;

/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  400,
  'NOT FOUND: the steppe 400 km south-west of Karaganda, 75 km east of Dzhezkazgan, whose station is at 346 m (NOAA ISD 35671099999); a little higher to the east. By judgement',
);
const LANDED = DESCENT.value - COVER.mass.value - SHIELD.mass.value;
const WHERE = `${GCAT}: «68.7E 47.7N?», to a tenth of a degree, his question mark; Spacefacts: 47°42′ N 69° E; ${GSE}: «в 400 км юго-западнее Караганды», which the point is`;

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511', label: 'The stack' },
  liftoffMass: derived(
    307_660 - UPRATING_7KT.gained.value,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t less the 7K-T era’s uprating (${UPRATING_7KT.gained.value} kg: ${UPRATING_7KT.gained.source}), the escape tower and fairing’s 1.95 t (${MPK}) and the ship’s 6.72 t. The type’s table has 307.65 t with a ship of 6.56 t`,
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
      label: 'Liftoff from Site 1: the first crew since Soyuz 11',
      at: doc(0, `${MPK234}: «Старт: 27 сентября 1973 г. в 15:18:16 ДМВ; стартовая площадка №1»; ${GCAT}: 12:18:16 UTC`),
      also: 'Lazarev and Makarov in Sokol-K pressure suits, worn for the launch and the descent (NASA, Astronautics and Aeronautics, 1973, p. 273)',
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower, without its shroud, let go', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    { id: 'spacecraft-separates', label: 'Soyuz 12 separates from the third stage', at: PARTS },
    {
      id: 'raised',
      label: 'The orbit raised as if to meet a station: 326 by 345 km',
      at: estimated(
        RAISE2_AT + 5_400,
        `an orbit after the second burn (\`burns\`): ${GSE}: «После выполненных маневров параметры орбиты ... 345 км; минимальное - 326 км; период обращения - 91 мин»`,
      ),
    },
    {
      id: 'orbital-module-off',
      label: 'The orbital module let go, to stay up for 116 days',
      at: SHIP_MODULES.parted,
    },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn, on the last revolution',
      at: assumed(
        TDU,
        `lit as long before the touchdown as Soyuz 10’s was (01:59 to 02:40, TASS, 1971): «На расчетном участке последнего витка ... включилась тормозная двигательная установка» (${NIZH}), when not given`,
      ),
    },
    {
      id: 'retro-off',
      label: 'Main engine off',
      at: assumed(TDU_OFF, `Soyuz 11’s planned 187 s (${SOYUZ11.burn.source}): this burn’s length was not found`),
    },
    {
      id: 'modules',
      label: 'The descent module and the instrument module part',
      at: assumed(
        PARTED,
        `Soyuz 11’s planned 12 min 4 s from the burn’s start to the parting (${SOYUZ11.parting.source}), put after this burn’s`,
      ),
    },
    {
      id: 'cover-off',
      label: 'At 7.5 km the parachute system works',
      at: estimated(
        DOWN - 15 * 60,
        `some fifteen minutes before the touchdown, as the type’s descent from 7 km took (${SOYUZ11.chutes.source})`,
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown on the soft-landing engines, 400 km south-west of Karaganda',
      at: doc(DOWN, `${MPK234}: «Посадка: 29 сентября 1973 г. в 14:33:48 ДМВ; в 400 км юго-западнее г.Караганда»; ${GCAT}: 11:33:48 UTC`),
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
        altitude: doc(193_000, `${TABLE}: the perigee taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.61, `${TABLE}`),
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
        value: 193_000,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 248_600,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${TABLE}. The hard check of the type’s stages with a ship of the ferry’s weight (the 11A511 was uprated for it, MPK p. 224, in ways not found)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.61,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${TABLE}. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(193_000, `${TABLE}. ${NIZH} and TASS: 194 km; ${AA}: 180 km`),
    apogee: doc(248_600, `${TABLE}. ${NIZH}: 249 km; ${AA}: 229 km`),
    inclination: doc(51.61, `${TABLE}. ${AA}: 51.7°`),
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
  mass: doc(SHIP, `${TABLE}. ${GCAT} and the type: 6,800 kg (${LAUNCH_MASS.source})`),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    name: 'The 7K-T’s main engine (СКД), the KTDU-35’s',
    propellant: derived(
      Math.round(FLOW * (RAISE1_S + RAISE2_S + SOYUZ11.burn.value)),
      'what the record has the main engine burn, at its 417 kgf and 278 s: the two burns of the raise as flown and a braking burn of Soyuz 11’s 187 s. What the tanks held is not known, and nothing is put by beyond what is flown',
    ),
  },
  burns: [
    {
      id: 'raise-apogee',
      label: 'The apogee raised, at the perigee',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the orbit grew, from 193 by 248.6 km (${TABLE}) to 326 by 345 km (${GSE}; ${AA}): pushes along the motion`,
      },
      turned: estimated(RAISE1_ON - 600, 'ten minutes before: when the crew oriented the ship is on no record read'),
      on: estimated(
        RAISE1_ON,
        `on the fifth revolution, centred on its perigee (put at the cutoff, four revolutions of the insertion orbit before): within seven hours of the launch (${SIDDIQI}, p. 816), «during the fifth orbit» (${ZAK}, whose "more than 15 hours into the flight" does not fit his orbit). How many burns and when, not found`,
      ),
      off: estimated(RAISE1_ON + RAISE1_S, 'as long after as the impulse below takes at the engine’s 417 kgf on the ship'),
      deltaV: derived(
        RAISE1_DV,
        `the impulse at the perigee of the insertion orbit (193 by 248.6 km, ${TABLE}) that takes its apogee to the 345 km of the orbit after the manoeuvres (${GSE}), on the WGS 84 equator’s radius: ${RAISE1_DV.toFixed(1)} m/s`,
      ),
    },
    {
      id: 'raise-perigee',
      label: 'The perigee raised, at the apogee',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `as above: the perigee raised from 193 km (${TABLE}) to 326 km (${GSE})`,
      },
      turned: estimated(RAISE2_ON - 600, 'ten minutes before, as above'),
      on: estimated(RAISE2_ON, 'half a revolution of the orbit between after the first, centred on its apogee'),
      off: estimated(RAISE2_ON + RAISE2_S, 'as long after as the impulse below takes at the engine’s 417 kgf on the ship'),
      deltaV: derived(
        RAISE2_DV,
        `the impulse at the apogee of 345 km that takes the perigee from 193 km to the 326 km of the orbit after the manoeuvres (${GSE}): ${RAISE2_DV.toFixed(1)} m/s`,
      ),
    },
  ],
  retro: {
    turned: estimated(
      TDU - 1_800,
      `«Перед спуском с орбиты была осуществлена ориентация корабля» (${GSE}); when, not given: half an hour before the burn, by judgement`,
    ),
    on: assumed(
      TDU,
      `lit as long before the touchdown as Soyuz 10’s (41 min, TASS, 1971): «в расчетное время включена тормозная двигательная установка» (${GSE}), when not given`,
    ),
    off: assumed(TDU_OFF, `Soyuz 11’s planned 187 s (${SOYUZ11.burn.source})`),
    deltaV: derived(
      TDU_DV,
      `Soyuz 11’s planned 187 s (assumed) at the engine’s 417 kgf and 278 s on this ship after the raise and without its orbital module: ${TDU_DV.toFixed(1)} m/s. Its own impulse was not found`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: `tail first, the main engine against the motion: «был определенным образом сориентирован в пространстве, включилась тормозная двигательная установка» (${NIZH})`,
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
      `${CHRISTY}: the lift held up from the start of the entry. What the descent control system then commanded is not on any record read: its later rolls are not flown`,
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
    altitude: doc(7_500, `${GSE}: «На высоте 7,5 км была введена в действие парашютная система»; ${NIZH}: 7.5 km; ${AA}: 7.6 km`),
    event: COVER_OFF,
  },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with Lazarev and Makarov',
        mass: estimated(LANDED, 'McDowell’s 2,850 kg less the cover and the heat shield it lets go (both estimated)'),
        dragArea: MODULE_DRAG,
        chutes: soyuzChutes(),
        motors: [softLandingEngines(GROUND, LANDED)],
      },
      COVER,
      SHIELD,
    ],
    automatic:
      'The crew oriented the ship; the burn, the parting, the guided entry, the parachutes and the engines at the ground were the automatic system’s',
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
        source: `${MPK234}: 14:33:48 Moscow time; ${GCAT}: 11:33:48 UTC. Dependent on the burn’s instant, length and parting (all assumed) and the bank held (assumed)`,
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
      source: `the module came down «в расчетном районе в 400 км юго-западнее Караганды» (${GSE}). The place it came down is taken for the place its burn was timed for`,
    },
    latitude: doc(47.7, WHERE),
    longitude: doc(68.7, WHERE),
    at: doc(DOWN, `${MPK234}: 14:33:48 Moscow time`),
    near: 'Karaganda',
  },
  checks: [
    {
      id: 'raised.perigee',
      label: 'Perigee after the manoeuvres of the first day',
      value: 326_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GSE}: «минимальное - 326 км»; ${AA}; Zak’s source (the 1985 encyclopedia) 332.9 km. NOT independent of the burns’ impulses, which are worked from it. Read an orbit after the second burn`,
      at: RAISE2_AT + 5_400,
    },
    {
      id: 'raised.apogee',
      label: 'Apogee after the manoeuvres of the first day',
      value: 345_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GSE}: «максимальное удаление от поверхности Земли - 345 км»; Zak’s source 347.9 km. NOT independent: as above`,
      at: RAISE2_AT + 5_400,
    },
    {
      id: 'raised.period',
      label: 'Period after the manoeuvres of the first day',
      value: 91 * 60,
      unit: 's',
      tolerance: 30,
      confidence: 'documented',
      source: `${GSE}: «период обращения - 91 мин»: to the minute`,
      at: RAISE2_AT + 5_400,
    },
    {
      id: 'entryG',
      label: 'Greatest load of the entry',
      value: 3.5,
      unit: 'g',
      tolerance: 1,
      confidence: 'assumed',
      source: `the type’s guided descent, «с перегрузкой не более 3–4 g» (MPK, p. 81); "Nominal descent deceleration load was 3-4 g’s" (Portree, Mir Hardware Heritage, §1.8.3): no figure of this flight’s was found. Dependent on the bank held (assumed)`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${GCAT}’s point, to a tenth of a degree (11 km) and queried; a lifting entry’s rolls, not flown, move it across`,
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
