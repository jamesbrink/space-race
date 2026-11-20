/**
 * Soyuz 16 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511U's (vehicles/soyuz-11a511u-flown.ts), its first flight with a crew; the
 * ship the Apollo–Soyuz type's, 7K-TM No. 73 (vehicles/soyuz-7ktm-flown.ts), on the 7K-OK's engine and descent module
 * (vehicles/soyuz-7kok-flown.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 12:40:00 Moscow time on
 * 2 December 1974 (09:40:00 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **The orbit was changed in three corrections no record read gives one by one** (the 4th or 5th, the 17th and the 18th
 * revolutions), to the near-circular orbit of 225 km the joint flight would be assembled on. The 17th's and the 18th's are
 * flown as two burns at the apsides, the first raising the perigee and the second lowering the apogee to it, each of the
 * impulse that joins the published orbits (vis-viva); the first, whose purpose and size are in nothing read, is not flown.
 * **No ascent instant of this flight's own was found** but the ship's separation (McDowell's): Soyuz 3's are taken for the stages
 * and the second-generation escape system's for the tower. **The docking ring was shot off in orbit on 7 December** and is let go
 * then, a body of its own.
 */

import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { TORN } from '../../../vostok/vehicles/vostok-3ka.ts';
import { KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { MPK, SHIP_0 } from '../../vehicles/soyuz-11a511-flown.ts';
import { ascent11A511U, ENERGIA6, MPK264, stages11A511U, UPRATING_11A511U } from '../../vehicles/soyuz-11a511u-flown.ts';
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
  MODULES as OK_MODULES,
  RAREFIED,
  RAREFIED_SHIP,
  SHIELD,
  SIDDIQI,
  SKD,
  softLandingEngines,
  soyuzChutes,
  TRIM,
} from '../../vehicles/soyuz-7kok-flown.ts';
import { SOYUZ11 } from '../../vehicles/soyuz-7koks-flown.ts';
import { AUTONOMOUS, LAUNCH_MASS, MPK262 } from '../../vehicles/soyuz-7ktm-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';

/** Seconds from liftoff, 12:40:00 Moscow time on 2 December 1974, of a Moscow time on a day of December 1974. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 2) * 24 + h - 12) * 3600 + (min - 40) * 60 + s;

const MPK266 = MPK262.replace('p. 262', 'pp. 265–266');
const TABLE = `${SIDDIQI}, Table IB, p. 877: "Soyuz 16 6800 96 191.7 X 314.8 51.79 05:22:23:35"`;
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const GSE =
  '«Ежегодник Большой советской энциклопедии», 1975, «Космические исследования, выполненные в Советском Союзе в 1974 г.» (epizodsspace.narod.ru/bibl/ejeg/1975/75.html)';
const AA = 'NASA, Astronautics and Aeronautics, 1974, pp. 205–207, from TASS';
const ZAK =
  'Zak, RussianSpaceWeb, “The USSR launches dress rehearsal for a joint mission with Apollo” (russianspaceweb.com/soyuz16.html): secondary';
const SF = 'Spacefacts, “Soyuz 16” (spacefacts.de/mission/english/soyuz-16.htm): secondary';
/** Christy's account of a Soyuz's guided entry, of Soyuz 4 and 5 in January 1969. */
const CHRISTY =
  'Christy, Orbital Focus, “Soyuz 4/5 – Touchdown” (orbitalfocus.uk/Diaries/Soyuz/Soyuz4-5/Landing.php): “At this moment the re-entry compartment travels at zero bank angle, which provides for maximum lift-drag ratio”: secondary, of Soyuz 4 and 5';
const TYPE = `${MPK}: the 11A511’s «Время отделения»`;
const SOYUZ3 = 'Soyuz 3’s ascent on Mishin’s instants (Zak, RussianSpaceWeb, “Flight scenario for Soyuz-2 and -3”, note 774): secondary';
/** Soyuz 10's braking burn's start (TASS, 01:59) to its touchdown (02:40), s. */
const SOYUZ10_DOWN = 41 * 60;

/** The ship in orbit, kg, and its main engine's thrust, exhaust speed and flow. */
const SHIP = 6_800;
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;
const FLOW = THRUST / EXHAUST;

/**
 * The ascent's instants: Soyuz 3's for the stages (the last crewed flight whose instants were read; the 11A511U's own were not
 * found), the second-generation escape system's for the tower, the 11A511's table's for the fairing, McDowell's for the ship's
 * separation.
 */
const STRAPS = assumed(119.46, `${SOYUZ3}: "Stage I separation 119.46"; no instant of this flight’s or of the 11A511U’s was found`);
const TOWER = assumed(
  123,
  `${ENERGIA6.replace(/, the table.*/, '')}: the second-generation escape system «позволило внедрить ранний сброс ДУ САС (123 с полета вместо 160 с)», and ${MPK264} has that system, its stronger motor and the fairing’s two pairs of motors, on the 7K-TM’s head block. Zak (RussianSpaceWeb, “Emergency escape system”) has it first flown on Soyuz 19`,
);
const FAIRING = assumed(161, `${TYPE}: «Время сброса ГО T+161 cек», the 11A511’s, taken: the 11A511U’s was not found`);
const THIRD = assumed(288.46, `${SOYUZ3}: "Stage III engine ignition 288.46"`);
const CORE_CUT = assumed(289.71, `${SOYUZ3}: "Stage II separation command (KII) 289.71"`);
const CORE_GONE = assumed(290.71, `${SOYUZ3}: "Stage II separation 290.71"`);
const AFT = assumed(297.7, `${SOYUZ3}: "Stage III aft section separation 297.7 seconds (?)", Zak’s question mark`);
const PARTS = derived(528, `${GCAT}: Soyuz-16 in orbit at 09:48:48 UTC (Block I at 09:48:45), 528 s after the liftoff at 09:40:00`);
const CUTOFF = assumed(
  PARTS.value - 5.33,
  `Block I’s cutoff 5.33 s before the ship left it, as on ${SOYUZ3} (its cutoff command at 527.67 s, McDowell’s separation at 533 s), before this flight’s separation (McDowell)`,
);

/**
 * The orbit made circular, as two burns: at the apogee of the insertion orbit (Siddiqi's table) the perigee taken up to the
 * circle's 225 km, and at that perigee half a revolution on the apogee taken down to it, over the ellipsoid under the
 * apsides (`BALL`, the vis-viva). The perigee is put at the cutoff (`injection.anomaly`), so the first is sixteen and a half revolutions after it.
 */
/** The ball the heights are over: the WGS 84 ellipsoid's radius under the apsides, which lie near the orbit's highest latitudes (the perigee at the cutoff, some 16° of arc on from the pad: orbital.ts `heightsBall`), m. */
const BALL = (() => {
  const [a, b, phi] = [6_378_137, 6_356_752.3142, (51.79 * Math.PI) / 180];
  const [c, s] = [Math.cos(phi), Math.sin(phi)];
  return Math.sqrt(((a * a * c) ** 2 + (b * b * s) ** 2) / ((a * c) ** 2 + (b * s) ** 2));
})();
const MU = 3.986004418e14;
const R = (h: number) => BALL + h;
const speedAt = (r: number, a: number) => Math.sqrt(MU * (2 / r - 1 / a));
const period = (a: number) => 2 * Math.PI * Math.sqrt(a ** 3 / MU);
const P1 = R(191_700);
const A1 = R(314_800);
const C = R(225_000);
const UP_DV = speedAt(A1, (C + A1) / 2) - speedAt(A1, (P1 + A1) / 2);
const DOWN_DV = speedAt(C, (C + A1) / 2) - speedAt(C, C);
const UP_S = (SHIP * UP_DV) / THRUST;
const AFTER1 = SHIP - FLOW * UP_S;
const DOWN_S = (AFTER1 * DOWN_DV) / THRUST;
const AFTER2 = AFTER1 - FLOW * DOWN_S;
const UP_AT = CUTOFF.value + 16.5 * period((P1 + A1) / 2);
const DOWN_AT = UP_AT + period((C + A1) / 2) / 2;
const UP_ON = UP_AT - UP_S / 2;
const DOWN_ON = DOWN_AT - DOWN_S / 2;

/** The docking ring, shot off on the fifth day. */
const RING_OFF = MSK(7, 12, 0);
const RING = doc(20, `${SF}: "a simulated 20 kg American docking ring"`);
const RING_FROM = SHIP_0 + 7.392;
const RING_TO = SHIP_0 + 7.6;

/** The modules: the type's orbital module (the 7K-OK's), McDowell's descent module, and what is left of the ship. */
const ORBITAL = assumed(OK_MODULES.orbital.value, `the 7K-OK’s: ${OK_MODULES.orbital.source}; the 7K-TM’s own was not found`);
const DESCENT = doc(2_850, `${GCAT}: Soyuz-16’s descent module, 2,850 kg of a ship of 6,800 kg`);
const SHIP_MODULES = {
  orbital: ORBITAL,
  instrument: derived(
    SHIP - ORBITAL.value - DESCENT.value - RING.value,
    'the ship’s 6,800 kg (Siddiqi) less the orbital module (1,200 kg, the 7K-OK’s), the descent module (2,850 kg, McDowell’s) and the docking ring it let go in orbit (20 kg)',
  ),
};

/** The braking burn: Spacefacts' 188 s, lit as long before the touchdown as Soyuz 10's was; the parting Soyuz 11's 12 min 4 s after. */
const BURN = doc(188, `${SF}: "The deorbit burn lasted 188 seconds"`);
const DOWN = MSK(8, 11, 3, 35);
const TDU = DOWN - SOYUZ10_DOWN;
const TDU_OFF = TDU + BURN.value;
const TDU_DV = EXHAUST * Math.log(AFTER2 / (AFTER2 - FLOW * BURN.value));
const PARTED = TDU + SOYUZ11.parting.value;

/** The ground under the landing, m above the sea. */
const GROUND = estimated(330, 'NOT FOUND: the steppe 30 km south-west of Arkalyk, whose airfield is at some 300 to 350 m; by judgement');
const LANDED = DESCENT.value - COVER.mass.value - SHIELD.mass.value;
const WHERE = `${GCAT}: «68.1E 50.5N», to a tenth of a degree; ${GSE}: «в 300 км севернее Джезказгана»; ${SF}: "30 km southwest of Arkalyk"`;

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511u', label: 'The stack' },
  liftoffMass: derived(
    300_940 - UPRATING_11A511U.gained.value + SHIP,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t less the 11A511U’s gain (${UPRATING_11A511U.gained.value} kg: ${UPRATING_11A511U.gained.source}) and the escape tower and fairing’s 1.95 t, all the 11A511’s (MPK, p. 83, assumed), and the ship’s 6.8 t. ${MPK264}: «Длина РН 11А511У с кораблем 7КТМ составила 49.313 м, стартовая масса – 308 т»`,
  ),
  stages: stages11A511U({
    boosters: { cutoff: STRAPS, separation: STRAPS },
    core: { cutoff: CORE_CUT, separation: CORE_GONE },
    third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTS },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff from Site 1: the first crew on a Soyuz-U',
      at: doc(
        0,
        `${MPK266}: «Старт: 2 декабря 1974 г. в 12:40:00 ДМВ со стартового комплекса площадки №1 космодрома Байконур»; ${GCAT}: 09:40:00 UTC`,
      ),
      also: 'Filipchenko and Rukavishnikov in Sokol-K pressure suits; «это был первый запуск пилотируемого корабля с помощью модернизированной РН 11А511У «Союз-У»» (MPK, p. 265)',
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower let go, early: the fairing’s own motors take over', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    { id: 'spacecraft-separates', label: 'Soyuz 16 separates from the third stage', at: PARTS },
    {
      id: 'circular',
      label: 'In the orbit the joint flight was to be assembled on: a circle of 225 km',
      at: estimated(
        DOWN_AT + 5_400,
        `an orbit after the second burn (\`burns\`): ${GSE}: «корабль вышел на заданную круговую орбиту высотой около 225 км с периодом обращения, равным 88,9 мин, и наклонением 51,8°»`,
      ),
    },
    {
      id: 'ring-off',
      label: 'The docking ring shot off: the emergency undocking from Apollo rehearsed',
      at: doc(
        RING_OFF,
        `${GCAT}: the APAS simulator separated «1974 Dec  7 0900?» UTC, his own question mark; ${ZAK}: "on Dec. 7, 1974, or 119 hours and 20 minutes into the flight" (NASA SP-4209, ch. 9)`,
      ),
      also: '«Кажется, что мы летим среди болтов и гаек» (Rukavishnikov, MPK p. 266): the pyrotechnic bolts fired and the spring pushers threw the ring off; it came down the next day',
    },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn',
      at: assumed(TDU, `lit as long before the touchdown as Soyuz 10’s was (01:59 to 02:40, TASS, 1971), when not given`),
    },
    {
      id: 'retro-off',
      label: 'Main engine off',
      at: assumed(TDU_OFF, `${BURN.source}, after the instant taken for the burn’s start (assumed)`),
    },
    {
      id: 'modules',
      label: 'The descent module, the orbital module and the instrument module part',
      at: assumed(
        PARTED,
        `Soyuz 11’s planned 12 min 4 s from the burn’s start to the parting (${SOYUZ11.parting.source}), put after this burn’s`,
      ),
    },
    {
      id: 'cover-off',
      label: 'The parachute system works',
      at: estimated(
        DOWN - 15 * 60,
        `some fifteen minutes before the touchdown, as the type’s descent from 7 km took (${SOYUZ11.chutes.source})`,
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown on the soft-landing engines, 300 km north of Dzhezkazgan',
      at: doc(
        DOWN,
        `${MPK266}: «Посадка корабля: 8 декабря 1974 г. в 11:03:35 ДМВ в 300 км севернее г. Джезказган»; ${GCAT}: 08:03:35 UTC`,
      ),
    },
  ],
  ascent: ascent11A511U({
    // (no aiming azimuth was found: the launch plane is solved for the inclination reached)
    guidance: {
      vertical: VERTICAL,
      kick: KICK,
      turn: STRAPS,
      target: {
        at: 'third-stage-off',
        altitude: doc(191_700, `${TABLE}: the perigee taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.79, `${TABLE}`),
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
    jettisons: [
      {
        id: 'test-ring',
        at: doc(RING_OFF, `${GCAT}: «1974 Dec  7 0900?» UTC; ${ZAK}: 119 h 20 min into the flight`),
        mass: RING,
        loose: {
          name: 'The Apollo simulator ring',
          from: estimated(RING_FROM, 'the ring’s frame on the APAS guides (soyuz-16/model/vehicle.py: estimated)'),
          to: estimated(RING_TO, 'its contact face, the model’s'),
          radius: estimated(0.725, 'the ring’s outer frame, the model’s'),
          centre: estimated((RING_FROM + RING_TO) / 2, 'the middle of a flat ring'),
          gyration: { roll: estimated(0.65, 'a ring 0.6 to 0.73 m in radius'), across: estimated(0.47, 'a thin ring, about its diameter') },
          push: estimated(
            0.3,
            `NOT FOUND: thrown off by spring pushers («пружинные толкатели отбросили кольцо от корабля», ${MPK266}) at a speed nothing read gives; chosen`,
          ),
          forward: true,
          ahead: estimated(1.2, 'a ring 1.45 m across, open in its middle, face on at 1.0'),
          astern: estimated(1.2, 'as its face: a flat ring, either side alike'),
          side: {
            dragArea: estimated(0.3, '1.45 m × 0.21 m edge on'),
            from: estimated(RING_FROM, 'the body’s own stretch, as above'),
            to: estimated(RING_TO, 'the body’s own stretch, as above'),
          },
        },
      },
    ],
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 191_700,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 314_800,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${TABLE}; Zak notes it as "a considerably higher apogee than the one planned" (${ZAK}). TASS has 280 km (${AA}), Spacefacts 291 km. The hard check of the 11A511U’s figures with this ship`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.79,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${TABLE}. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(191_700, `${TABLE}. TASS: 194 km (${AA}); Spacefacts: 184 km`),
    apogee: doc(314_800, `${TABLE}. TASS: 280 km, 89.3 min (${AA}); Spacefacts: 291 km`),
    inclination: doc(51.79, `${TABLE}. TASS: 51.8° (${AA})`),
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
  mass: doc(
    SHIP,
    `${TABLE}; ${GCAT}: 6,800 kg. The type’s 6,790 kg (${LAUNCH_MASS.source}); the Czech Academy of Sciences’ catalogue 6,680 kg`,
  ),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    name: 'The 7K-TM’s main engine (СКД), the KTDU-35’s',
    propellant: derived(
      Math.round(FLOW * (UP_S + DOWN_S + BURN.value)),
      'what the record has the main engine burn, at its 417 kgf and 278 s: the two burns of the circularisation as flown and a braking burn of 188 s. What the tanks held is not known, and nothing is put by beyond what is flown',
    ),
  },
  burns: [
    {
      id: 'perigee-up',
      label: 'The 17th revolution’s correction: the perigee raised, at the apogee',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the perigee raised from 191.7 km (${TABLE}) to the circle’s 225 km (${GSE}): a push along the motion`,
      },
      turned: estimated(UP_ON - 600, 'ten minutes before: when the crew oriented the ship is on no record read'),
      on: estimated(
        UP_ON,
        `on the 17th revolution, centred on its apogee: «В результате коррекций, проведенных на 5-м, 17-м и 18-м витках» (${GSE}; ${MPK266}: «На 4-м, 17-м и 18-м витках»). Which burn did what, and when in each revolution, not found`,
      ),
      off: estimated(UP_ON + UP_S, 'as long after as the impulse below takes at the engine’s 417 kgf on the ship'),
      deltaV: derived(
        UP_DV,
        `the impulse at the apogee of the insertion orbit (191.7 by 314.8 km, ${TABLE}) that takes its perigee to the 225 km of the circle (${GSE}), over the ellipsoid under the apsides: ${UP_DV.toFixed(1)} m/s`,
      ),
    },
    {
      id: 'apogee-down',
      label: 'The 18th revolution’s correction: the apogee lowered, at the perigee',
      attitude: {
        label: 'Against the motion',
        aim: 'velocity',
        sense: -1,
        confidence: 'derived',
        source: `the apogee lowered from 314.8 km (${TABLE}) to the circle’s 225 km (${GSE}): a push against the motion`,
      },
      turned: estimated(DOWN_ON - 600, 'ten minutes before, as above'),
      on: estimated(DOWN_ON, 'half a revolution after the first, centred on the new perigee, on the 18th revolution'),
      off: estimated(DOWN_ON + DOWN_S, 'as long after as the impulse below takes at the engine’s 417 kgf on the ship'),
      deltaV: derived(
        DOWN_DV,
        `the impulse at the perigee of 225 km that takes the apogee from 314.8 km to the circle’s 225 km (${GSE}): ${DOWN_DV.toFixed(1)} m/s`,
      ),
    },
  ],
  retro: {
    turned: estimated(TDU - 1_800, 'half an hour before the burn, by judgement: when the ship was oriented is on no record read'),
    on: assumed(TDU, 'lit as long before the touchdown as Soyuz 10’s (41 min, TASS, 1971), when not given'),
    off: assumed(TDU_OFF, `${BURN.source}, after the instant taken for the start (assumed)`),
    deltaV: derived(
      TDU_DV,
      `188 s (${SF}) at the engine’s 417 kgf and 278 s on this ship after the circularisation: ${TDU_DV.toFixed(1)} m/s. Its own impulse was not found`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: 'tail first, the main engine against the motion, as every Soyuz’s braking burn',
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
    altitude: assumed(SOYUZ11.chutes.value, `the type’s in 1971: ${SOYUZ11.chutes.source}. This flight’s own was not found`),
    event: COVER_OFF,
  },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with Filipchenko and Rukavishnikov',
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
        source: `${MPK266}: 11:03:35 Moscow time; ${GCAT}: 08:03:35 UTC; ${GSE}: 11:04. Dependent on the burn’s instant (assumed) and parting (assumed) and the bank held (assumed)`,
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
      source: `the module came down «в 300 км севернее Джезказгана» (${GSE}). The place it came down is taken for the place its burn was timed for`,
    },
    latitude: doc(50.5, WHERE),
    longitude: doc(68.1, WHERE),
    at: doc(DOWN, `${MPK266}: 11:03:35 Moscow time`),
    near: 'Arkalyk',
  },
  checks: [
    {
      id: 'circular.perigee',
      label: 'Perigee after the corrections of the 17th and 18th revolutions',
      value: 225_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GSE}: «на заданную круговую орбиту высотой около 225 км»; ${AA}: "a circular orbit with a 225-km altitude". McDowell has 218 by 228 km on 4 December. NOT independent of the burns’ impulses, which are worked from it. Read an orbit after the second burn`,
      at: DOWN_AT + 5_400,
    },
    {
      id: 'circular.apogee',
      label: 'Apogee after the corrections of the 17th and 18th revolutions',
      value: 225_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `as above. NOT independent`,
      at: DOWN_AT + 5_400,
    },
    {
      id: 'circular.period',
      label: 'Period after the corrections',
      value: 88.9 * 60,
      unit: 's',
      tolerance: 30,
      confidence: 'documented',
      source: `${GSE}: «с периодом обращения, равным 88,9 мин»; ${AA}: 88.9 min`,
      at: DOWN_AT + 5_400,
    },
    {
      id: 'entryG',
      label: 'Greatest load of the entry',
      value: 3.5,
      unit: 'g',
      tolerance: 1,
      confidence: 'assumed',
      source:
        'the type’s guided descent, «с перегрузкой не более 3–4 g» (MPK, p. 81): no figure of this flight’s was found. Dependent on the bank held (assumed)',
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${GCAT}’s point, to a tenth of a degree (11 km); a lifting entry’s rolls, not flown, move it across`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: 'as above. NOT independent: the burn is timed for the place (`landing.aimed`)',
    },
  ],
};
