/**
 * Soyuz T-2 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511U's (vehicles/soyuz-11a511u-flown.ts), the ship the Soyuz T, 7K-ST No. 7L
 * (vehicles/soyuz-7kst-flown.ts), on the 7K-OK's descent module and parachutes (vehicles/soyuz-7kok-flown.ts); what is here is
 * this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 17:19:30 Moscow time on
 * 5 June 1980 (14:19:30 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **The rendezvous with Salyut 6 is not flown**: the station is not in the plan. The first day's two-impulse raise of the fourth
 * revolution (Vasilyev) is flown as two burns at the apsides, each of the impulse that takes the published insertion orbit to the
 * orbit McDowell gives the ship on 6 June, before the docking; the far approach on the last revolution of the day, the
 * semi-automatic approach to some 200 m, Malyshev's docking by hand and the three days docked are told as the record's events,
 * not flown, and the ship waits out those days in that orbit. **No ascent instant of this flight's own was found** but the
 * ship's separation (McDowell's): Soyuz 3's are taken for the stages, the Soyuz T's escape system's for the tower. **The orbital
 * module was let go before the braking burn**, a revolution after the undocking, as on every Soyuz T.
 */

import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { TORN } from '../../../vostok/vehicles/vostok-3ka.ts';
import { KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { MPK } from '../../vehicles/soyuz-11a511-flown.ts';
import { ascent11A511U, stages11A511U, UPRATING_11A511U } from '../../vehicles/soyuz-11a511u-flown.ts';
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
  RAREFIED_SHIP,
  SHIELD,
  SIDDIQI,
  softLandingEngines,
  soyuzChutes,
  TRIM,
} from '../../vehicles/soyuz-7kok-flown.ts';
import { SOYUZ11 } from '../../vehicles/soyuz-7koks-flown.ts';
import { AUTONOMOUS, ENERGIA6, LAUNCH_MASS, MODULES, MPK287, SKD, SOFT_MOTORS, VASILYEV } from '../../vehicles/soyuz-7kst-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';

/** Seconds from liftoff, 17:19:30 Moscow time on 5 June 1980, of a Moscow time on a day of June 1980. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 5) * 24 + h - 17) * 3600 + (min - 19) * 60 + (s - 30);

const MPK288 = MPK287.replace('p. 287', 'pp. 288–289');
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const GSE =
  '«Ежегодник Большой советской энциклопедии», 1981, «Космические исследования, выполненные в Советском Союзе в 1980 г.» (epizodsspace.narod.ru/bibl/ejeg/1981/81.html)';
const AA = 'NASA, Astronautics and Aeronautics, 1979–1984, p. 177, from TASS';
const SF = 'Spacefacts, “Soyuz T-2” (spacefacts.de/mission/english/soyuz-t2.htm): secondary';
/** Christy's account of a Soyuz's guided entry, of Soyuz 4 and 5 in January 1969. */
const CHRISTY =
  'Christy, Orbital Focus, “Soyuz 4/5 – Touchdown” (orbitalfocus.uk/Diaries/Soyuz/Soyuz4-5/Landing.php): “At this moment the re-entry compartment travels at zero bank angle, which provides for maximum lift-drag ratio”: secondary, of Soyuz 4 and 5';
const TYPE = `${MPK}: the 11A511’s «Время отделения»`;
const SOYUZ3 = 'Soyuz 3’s ascent on Mishin’s instants (Zak, RussianSpaceWeb, “Flight scenario for Soyuz-2 and -3”, note 774): secondary';
const INSERTION = `${SF}: "Altitude: 202 - 249 km", "Inclination: 51.6°"; Russian Wikipedia the same, with 88.7 min, and no source. Encyclopedia Astronautica: 195 by 232 km (tertiary). No Soviet figure of it was read`;
/** Soyuz 10's braking burn's start (TASS, 01:59) to its touchdown (02:40), s. */
const SOYUZ10_DOWN = 41 * 60;

/** The ship in orbit, kg, and its main engine's thrust, exhaust speed and flow. */
const SHIP = 6_850;
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;
const FLOW = THRUST / EXHAUST;

/** The ascent's instants: Soyuz 3's for the stages, the Soyuz T's escape system's for the tower, McDowell's for the separation. */
const STRAPS = assumed(119.46, `${SOYUZ3}: "Stage I separation 119.46"; no instant of this flight’s or of the 11A511U’s was found`);
const TOWER = doc(
  123,
  `${ENERGIA6}: the Soyuz T’s escape system, with two pairs of motors on the fairing, «позволило внедрить ранний сброс ДУ САС (123 с полета вместо 160 с)»; ${MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 453')}: the 11A511U2 «сброс ДУ был перенесен со 123-й на 116-ю секунду». The type’s, not this flight’s own`,
);
const FAIRING = assumed(161, `${TYPE}: «Время сброса ГО T+161 cек», the 11A511’s, taken: the 11A511U’s was not found`);
const THIRD = assumed(288.46, `${SOYUZ3}: "Stage III engine ignition 288.46"`);
const CORE_CUT = assumed(289.71, `${SOYUZ3}: "Stage II separation command (KII) 289.71"`);
const CORE_GONE = assumed(290.71, `${SOYUZ3}: "Stage II separation 290.71"`);
const AFT = assumed(297.7, `${SOYUZ3}: "Stage III aft section separation 297.7 seconds (?)", Zak’s question mark`);
const PARTS = derived(528, `${GCAT}: Soyuz T-2 in orbit at 14:28:18 UTC (Block I at 14:28:15), 528 s after the liftoff at 14:19:30`);
const CUTOFF = assumed(
  PARTS.value - 5.33,
  `Block I’s cutoff 5.33 s before the ship left it, as on ${SOYUZ3} (its cutoff command at 527.67 s, McDowell’s separation at 533 s), before this flight’s separation (McDowell)`,
);

/**
 * The first day's raise, as two burns on the fourth revolution: at the perigee of the insertion orbit the apogee taken up to the
 * phasing orbit's, and at that apogee the perigee taken up to its, over the ellipsoid under the apsides (`BALL`, the vis-viva). The perigee is
 * put at the cutoff (`injection.anomaly`), so the first burn is centred three revolutions after it.
 */
/** The ball the heights are over: the WGS 84 ellipsoid's radius under the apsides, which lie near the orbit's highest latitudes (the perigee at the cutoff, some 16° of arc on from the pad: orbital.ts `heightsBall`), m. */
const BALL = (() => {
  const [a, b, phi] = [6_378_137, 6_356_752.3142, (51.6 * Math.PI) / 180];
  const [c, s] = [Math.cos(phi), Math.sin(phi)];
  return Math.sqrt(((a * a * c) ** 2 + (b * b * s) ** 2) / ((a * c) ** 2 + (b * s) ** 2));
})();
const MU = 3.986004418e14;
const R = (h: number) => BALL + h;
const speedAt = (r: number, a: number) => Math.sqrt(MU * (2 / r - 1 / a));
const period = (a: number) => 2 * Math.PI * Math.sqrt(a ** 3 / MU);
const P1 = R(202_000);
const A1 = R(249_000);
const A2 = R(317_000);
const P2 = R(262_000);
const RAISE1_DV = speedAt(P1, (P1 + A2) / 2) - speedAt(P1, (P1 + A1) / 2);
const RAISE2_DV = speedAt(A2, (P2 + A2) / 2) - speedAt(A2, (P1 + A2) / 2);
const RAISE1_S = (SHIP * RAISE1_DV) / THRUST;
const AFTER1 = SHIP - FLOW * RAISE1_S;
const RAISE2_S = (AFTER1 * RAISE2_DV) / THRUST;
const AFTER2 = AFTER1 - FLOW * RAISE2_S;
const RAISE1_AT = CUTOFF.value + 3 * period((P1 + A1) / 2);
const RAISE2_AT = RAISE1_AT + period((P1 + A2) / 2) / 2;
const RAISE1_ON = RAISE1_AT - RAISE1_S / 2;
const RAISE2_ON = RAISE2_AT - RAISE2_S / 2;

/** The modules: the type's (MPK), the instrument module what is left of the ship. */
const BO_OFF = MSK(9, 13, 30);
const SHIP_MODULES = {
  orbital: MODULES.orbital,
  instrument: derived(
    SHIP - MODULES.orbital.value - MODULES.descent.value,
    `the ship’s 6,850 kg (McDowell) less the orbital module (1,100 kg) and the descent module (about 3,000 kg), both the type’s (${MPK287}), which has the instrument module at 2.75 t`,
  ),
  parted: doc(
    BO_OFF,
    `${GCAT}: Soyuz T-2 BO in orbit from «1980 Jun  9 1030?» UTC, his own question mark, and down on 5 September; ${MPK288}: «Рано утром 9 июня «Союз Т-2» отстыковался от комплекса. Через виток был отделен бытовой отсек»; ${GSE}: «отделение орбитального отсека, включение двигательной установки на торможение, отделение спускаемого аппарата»`,
  ),
};

/** The braking burn: Spacefacts' three to four minutes, lit as long before the touchdown as Soyuz 10's was; the parting Soyuz 11's 12 min 4 s after. */
const BURN = estimated(210, `${SF}: "The deorbit burn lasted about 3 to 4 minutes": the middle, 3.5 min`);
const DOWN = MSK(9, 15, 39);
const TDU = DOWN - SOYUZ10_DOWN;
const TDU_OFF = TDU + BURN.value;
const AT_BURN = AFTER2 - MODULES.orbital.value;
const TDU_DV = EXHAUST * Math.log(AT_BURN / (AT_BURN - FLOW * BURN.value));
const PARTED = TDU + SOYUZ11.parting.value;

/** Where it came down: 200 km south-east of Dzhezkazgan, on the sphere from the town (47°47′ N 67°43′ E). */
const TOWN = { lat: 47.783, lon: 67.717 };
const AWAY = 200 / 6371;
const BEARING = (135 * Math.PI) / 180;
const PHI = (TOWN.lat * Math.PI) / 180;
const LAT2 = Math.asin(Math.sin(PHI) * Math.cos(AWAY) + Math.cos(PHI) * Math.sin(AWAY) * Math.cos(BEARING));
const LON2 =
  (TOWN.lon * Math.PI) / 180 +
  Math.atan2(Math.sin(BEARING) * Math.sin(AWAY) * Math.cos(PHI), Math.cos(AWAY) - Math.sin(PHI) * Math.sin(LAT2));
const WHERE = `200 km south-east (135°) of Dzhezkazgan, 47°47′ N 67°43′ E, on a sphere of 6,371 km: ${MPK288}: «Посадка: 9 июня 1980 г. в 15:39:00 ДМВ в 200 км юго-восточнее г. Джезказган»; ${GSE}: the same words. No point of it was read`;

/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  350,
  'NOT FOUND: the steppe 200 km south-east of Dzhezkazgan, whose station is at 346 m (NOAA ISD 35671099999); by judgement',
);
const LANDED = MODULES.descent.value - COVER.mass.value - SHIELD.mass.value;

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511u', label: 'The stack' },
  liftoffMass: derived(
    300_940 - UPRATING_11A511U.gained.value + SHIP,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t less the 11A511U’s gain (${UPRATING_11A511U.gained.value} kg) and the escape tower and fairing’s 1.95 t, all the 11A511’s (MPK, p. 83, assumed), and the ship’s 6.85 t. ${ENERGIA6}: the 11A511U with a Soyuz T «Стартовая масса, т: ракетного комплекса 309,7»`,
  ),
  stages: stages11A511U({
    boosters: { cutoff: STRAPS, separation: STRAPS },
    core: { cutoff: CORE_CUT, separation: CORE_GONE },
    third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTS },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff from Site 1: the first crew in a Soyuz T',
      at: doc(
        0,
        `${MPK288}: «Старт: 5 июня 1980 г. в 17:19:30 ДМВ со стартового комплекса площадки №1 космодрома Байконур»; ${GCAT}: 14:19:30 UTC`,
      ),
      also: 'Malyshev and Aksyonov in Sokol-KV2 pressure suits, the Argon-16 computer flying the ship and the crew watching it',
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower let go, early: the fairing’s own motors take over', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    { id: 'spacecraft-separates', label: 'Soyuz T-2 separates from the third stage', at: PARTS },
    {
      id: 'raised',
      label: 'The orbit raised, to close on Salyut 6 over the next day',
      at: estimated(RAISE2_AT + 5_400, `an orbit after the second burn (\`burns\`): ${GCAT}: 262 by 317 km at 51.62° on 6 June`),
    },
    {
      id: 'docked',
      label: 'Docked by hand at Salyut 6’s aft port, after the automatic approach was given up at 180 m (not flown)',
      at: doc(
        MSK(6, 18, 58),
        `${GSE}: «Она была осуществлена 6 июня в 18 час 58 мин. … до расстояния 180 м сближение осуществлялось в автоматическом режиме. Дальнейшее сближение и причаливание … выполнялось вручную»; ${AA}: 1858 Moscow time`,
      ),
      also: 'The far approach began on the last revolution of the day; near 200 m the computer asked leave to brake, the leave came late, the ship turned, Igla lost the station and the approach was given up. Malyshev backed away, found the station again and docked by hand, ten minutes before the shadow (Vasilyev, pp. 129–130)',
    },
    {
      id: 'undocked',
      label: 'Undocked from Salyut 6 (not flown: the ship waited in its own orbit)',
      at: doc(MSK(9, 12, 20), `${SF}: "Undocking Salyut 6: 09.06.1980, 09:20 UTC"; ${MPK288}: «Рано утром 9 июня»`),
    },
    { id: 'orbital-module-off', label: 'The orbital module let go, a revolution after the undocking', at: SHIP_MODULES.parted },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn, the Argon-16 flying it',
      at: assumed(TDU, 'lit as long before the touchdown as Soyuz 10’s was (01:59 to 02:40, TASS, 1971), when not given'),
    },
    { id: 'retro-off', label: 'Main engine off', at: estimated(TDU_OFF, `${BURN.source}, after the instant taken for its start`) },
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
      label: 'The parachute system works',
      at: estimated(
        DOWN - 15 * 60,
        `some fifteen minutes before the touchdown, as the type’s descent from 7 km took (${SOYUZ11.chutes.source})`,
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown on the soft-landing engines, 200 km south-east of Dzhezkazgan',
      at: doc(DOWN, `${MPK288}: «Посадка: 9 июня 1980 г. в 15:39:00 ДМВ»; ${GSE}: «В 15 час 39 мин»; ${SF}: 12:39:00 UTC`),
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
        altitude: doc(202_000, `${INSERTION}: the perigee taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.6, `${INSERTION}`),
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
      blockI: derived(2_500, 'its 2.2 t empty (the 11A511’s less the aft section and the 11A511U’s gain) and what the ascent flown leaves'),
    },
    modules: SHIP_MODULES,
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 202_000,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${INSERTION}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 249_000,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${INSERTION}. The check of the 11A511U’s figures with the Soyuz T, whose gain was sized on the type’s 6,855 kg to a mean height of 220 km, not on this orbit`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.6,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${INSERTION}; ${GCAT}: 51.62° on 6 June. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(202_000, INSERTION),
    apogee: doc(249_000, INSERTION),
    inclination: doc(51.6, INSERTION),
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
  mass: doc(SHIP, `${GCAT}: 6,850 kg; the type’s (${LAUNCH_MASS.source})`),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    propellant: derived(
      Math.round(FLOW * (RAISE1_S + RAISE2_S + BURN.value)),
      'what the record has the main engine burn, at its 315 kgf and 292 s: the two burns of the raise as flown and a braking burn of 210 s. What the tanks held, which the approach and attitude thrusters shared, is not known, and nothing is put by beyond what is flown',
    ),
  },
  burns: [
    {
      id: 'raise-apogee',
      label: 'The fourth revolution’s raise: the apogee taken up, at the perigee',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `the orbit grew, from 202 by 249 km (${INSERTION}) to 262 by 317 km (${GCAT}, 6 June): pushes along the motion`,
      },
      turned: estimated(RAISE1_ON - 600, 'ten minutes before: when the computer oriented the ship is on no record read'),
      on: estimated(
        RAISE1_ON,
        `on the fourth revolution, centred on its perigee (put at the cutoff, three revolutions of the insertion orbit before): «в первый день полета были проведены тесты бортовых систем и на четвертом витке выполнен первый двухимпульсный маневр подъема орбиты» (${VASILYEV}, p. 129). When in the revolution, not found`,
      ),
      off: estimated(RAISE1_ON + RAISE1_S, 'as long after as the impulse below takes at the engine’s 315 kgf on the ship'),
      deltaV: derived(
        RAISE1_DV,
        `the impulse at the perigee of the insertion orbit (202 by 249 km) that takes its apogee to the 317 km of the orbit McDowell gives on 6 June, over the ellipsoid under the apsides: ${RAISE1_DV.toFixed(1)} m/s`,
      ),
    },
    {
      id: 'raise-perigee',
      label: 'The fourth revolution’s raise: the perigee taken up, at the apogee',
      attitude: {
        label: 'Along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'derived',
        source: `as above: the perigee raised from 202 km (${INSERTION}) to 262 km (${GCAT}, 6 June)`,
      },
      turned: estimated(RAISE2_ON - 600, 'ten minutes before, as above'),
      on: estimated(
        RAISE2_ON,
        'half a revolution of the orbit between after the first, centred on its apogee: the second impulse of the two',
      ),
      off: estimated(RAISE2_ON + RAISE2_S, 'as long after as the impulse below takes at the engine’s 315 kgf on the ship'),
      deltaV: derived(
        RAISE2_DV,
        `the impulse at the apogee of 317 km that takes the perigee from 202 km to the 262 km of the orbit McDowell gives on 6 June: ${RAISE2_DV.toFixed(1)} m/s`,
      ),
    },
  ],
  retro: {
    turned: estimated(
      TDU - 1_800,
      'half an hour before the burn, by judgement: «Прошел разворот по крену» (Malyshev, MPK p. 288), when not given',
    ),
    on: assumed(TDU, 'lit as long before the touchdown as Soyuz 10’s (41 min, TASS, 1971), when not given'),
    off: estimated(TDU_OFF, `${BURN.source}`),
    deltaV: derived(
      TDU_DV,
      `three and a half minutes (${SF}, estimated) at the engine’s 315 kgf and 292 s on this ship after the raise and without its orbital module: ${TDU_DV.toFixed(1)} m/s. Its own impulse was not found`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: `against the motion: «включение двигательной установки на торможение» (${GSE})`,
    },
  },
  entry: {
    separation: assumed(
      PARTED,
      `Soyuz 11’s planned 12 min 4 s from the braking engine’s start to the parting (${SOYUZ11.parting.source}), put after this burn’s`,
    ),
    mass: MODULES.descent,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
    lift: ENTRY_LIFT,
    trim: TRIM,
    bank: assumed(
      0,
      `${CHRISTY}: the lift held up from the start of the entry. The Soyuz T's descent was steered «с текущим прогнозированием точки посадки» (${GSE}); what it commanded is not on any record read: its rolls are not flown`,
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
        label: 'The descent module, with Malyshev and Aksyonov',
        mass: estimated(LANDED, 'the type’s about 3,000 kg less the cover and the heat shield it lets go (both estimated)'),
        dragArea: MODULE_DRAG,
        chutes: soyuzChutes(),
        motors: [softLandingEngines(GROUND, LANDED, SOFT_MOTORS)],
      },
      COVER,
      SHIELD,
    ],
    automatic:
      'The Argon-16 oriented the ship and made the burn, the crew watching it; the parting, the guided entry, the parachutes and the engines at the ground were the automatic system’s',
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
        source: `${MPK288}: 15:39:00 Moscow time; ${SF}: 12:39:00 UTC. Dependent on the burn’s instant (assumed), length (estimated) and parting (assumed) and the bank held (assumed)`,
      },
      {
        id: 'module.speed',
        label: 'Touchdown speed',
        value: 2.5,
        unit: 'm/s',
        tolerance: 2,
        confidence: 'assumed',
        source: `the 7K-OK’s design: the engines "reduce landing velocity to a final two to three meters per second" (${SIDDIQI}, p. 472). NOT a measurement, and NOT independent: the engines are worked from it`,
      },
    ],
  },
  landing: {
    aimed: {
      confidence: 'documented',
      source: `the module came down «в 200 км юго-восточнее Джезказгана» (${GSE}). The place it came down is taken for the place its burn was timed for`,
    },
    latitude: derived((LAT2 * 180) / Math.PI, WHERE),
    longitude: derived((LON2 * 180) / Math.PI, WHERE),
    at: doc(DOWN, `${MPK288}: 15:39:00 Moscow time`),
    near: 'Dzhezkazgan',
  },
  checks: [
    {
      id: 'raised.perigee',
      label: 'Perigee after the fourth revolution’s raise',
      value: 262_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GCAT}: 262 km on 6 June, before the docking. NOT independent of the burns’ impulses, which are worked from it. Read an orbit after the second burn`,
      at: RAISE2_AT + 5_400,
    },
    {
      id: 'raised.apogee',
      label: 'Apogee after the fourth revolution’s raise',
      value: 317_000,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GCAT}: 317 km on 6 June. NOT independent: as above`,
      at: RAISE2_AT + 5_400,
    },
    {
      id: 'entryG',
      label: 'Greatest load of the entry',
      value: 3.5,
      unit: 'g',
      tolerance: 1,
      confidence: 'assumed',
      source:
        'the 7K-OK’s guided descent, «с перегрузкой не более 3–4 g» (MPK, p. 81), the Soyuz T keeping the module’s shape (MPK, p. 287): no figure of this flight’s was found. Dependent on the bank held (assumed)',
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'derived',
      source: `worked from words, "200 km south-east of Dzhezkazgan" (${WHERE}): to some 40 km. A lifting entry’s rolls, not flown, move it across`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'derived',
      source: 'as above. NOT independent: the burn is timed for the place (`landing.aimed`)',
    },
  ],
};
