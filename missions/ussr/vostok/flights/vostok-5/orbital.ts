/**
 * Vostok 5 as an orbital flight: its record (vostok-record.ts `VostokRecord`), which `flight.ts` writes its plan from
 * (vostok-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file;
 * the numbers live here. The launch vehicle and the ship are the type's (vehicles/vostok-8k72k.ts, vehicles/vostok-3ka.ts);
 * what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 14:58:58 Moscow time on
 * 14 June 1963 (11:58:58 UTC). The checks were written before this record was flown (the commit that added them flew
 * nothing), from how well each figure is known.
 *
 * **No document of this ascent has been found**: no cyclogram, no flight task for 8K72K No. E103-24, no range report, and
 * no account of why its third stage left the ship 6 km low at perigee and 13 km at apogee. So every instant of the ascent
 * is Vostok 1's, taken for this vehicle (`assumed`); what Bykovskiy felt is beside each. **The braking burn's instant is
 * derived** from the pilot's landing (mission.md, "The braking burn"): no minute of it was found.
 */

import type { VostokRecord } from '../../vehicles/vostok-record.ts';
import {
  CREW,
  ENTRY_AREA,
  ENTRY_DRAG,
  ENTRY_MASS,
  HAND_RATE,
  HATCHES,
  HEATING,
  MODULE_CHUTES,
  MODULE_DRAG,
  mainCanopy,
  PARTING,
  RAREFIED,
  SEAT_CHUTE,
  SEATED_DRAG,
  TDU_THRUST,
  THROWN,
  TORN,
} from '../../vehicles/vostok-3ka.ts';
import { ascent8K72K, BOBKOV, coreThrottle, KICK, SIDDIQI, stages8K72K, strapOnThrottle, VERTICAL } from '../../vehicles/vostok-8k72k.ts';
import { assumed, derived, doc, estimated, measure } from '../../../../../src/measure.ts';

/** Seconds from liftoff, 14:58:58 Moscow time on 14 June 1963, of a Moscow time on a day of June 1963. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 14) * 24 + h - 14) * 3600 + (min - 58) * 60 + (s - 58);

const KAMANIN = 'Kamanin’s diary, June 1963 («Скрытый космос», book 1; militera.lib.ru/db/kamanin_np/63.html)';
const REPORT = `Bykovskiy’s report to the State Commission, 20 June 1963, as Kamanin wrote it down, "with cuts" (${KAMANIN}, 20 June)`;
/** The descent's scheme in OKB-1's report on Vostok 6, 1963: the type's design, not a measurement of either flight. */
const SCHEME =
  '«Схема спуска», OKB-1’s report on the flight of Vostok 6, 1963 (RGANTD ф. 24, оп. 1, д. 14, л. 27; rgantd.ru, "Women in space")';
const TASS = 'TASS, 14 to 20 June 1963, as printed in «Заря Востока» (Tbilisi)';
const TABLE = `${SIDDIQI}, Table IB`;
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110)';
/** Vostok 1's record, taken for this vehicle: the words for an instant this flight's record does not give. */
const TYPE = (what: string) =>
  `NOT this flight’s: no cyclogram, flight task or range report of E103-24 has been found. Vostok 1’s ${what}, as its record flies it (vostok-1/orbital.ts), taken for this vehicle`;

/**
 * The braking engine's command, derived (mission.md, "The braking burn"): the pilot's landing at 14:06 less Vostok 1's
 * 27.9 minutes from the command to its pilot on the ground (10:25:04 to 10:53). Everything about the burn is timed from it.
 */
const TDU = MSK(19, 14, 6) - 27.9 * 60;

export const orbital: VostokRecord = {
  liftoffMass: assumed(287_000, `${TYPE('liftoff mass')}: 287 t (RKK Energia 1946–1996; Minakov). This vehicle’s own was not found`),
  stages: stages8K72K({
    boosters: {
      cutoff: assumed(
        119.5,
        `${TYPE('strap-ons’ integrator command')}: 119.50 s flown, 119.45 s planned. Bykovskiy: «Перегрузки — плавные, отделения первой ступени почти не заметил» (${REPORT})`,
      ),
      separation: assumed(119.5, TYPE('strap-ons’ separation, with their cutoff')),
      throttle: strapOnThrottle(119.5),
    },
    core: {
      cutoff: assumed(300, TYPE('core cutoff')),
      separation: assumed(300, TYPE('core’s separation, with the third stage’s fire through the lattice')),
      throttle: coreThrottle(300),
    },
    third: {
      ignition: assumed(300, `${TYPE('third stage’s start')}. «Включения третьей ступени я не почувствовал» (${REPORT})`),
      cutoff: assumed(
        677.08,
        `${TYPE('third stage’s cutoff')}: 677.08 s flown, 674.68 s planned. Cut here on its integrator (below), so this is a result. «По окончании работы третьей ступени слышал хлопок» (${REPORT})`,
      ),
      separation: assumed(
        687.08,
        `${TYPE('spacecraft’s separation')}, ten seconds after the cutoff. «В момент разделения видел снежинки» (${REPORT})`,
      ),
      velocity: {
        apparent: true,
        speed: assumed(
          2_283.52,
          'm/s of apparent velocity: Vostok 1’s flight task’s setting for its third stage (the 2011 documents), for an orbit of 180 km perigee. NOT this flight’s: E103-24’s flight task is not published, and the stage is said to have fallen short of what was asked (Siddiqi, p. 368, with no source)',
        ),
      },
    },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(0, `${SIDDIQI}, p. 368: “1458 hours, 58 seconds Moscow Time”; McDowell’s launch log: 11:58:58 UTC`),
      also: '14:58:59 (Borisenko, the record’s commissioner; spacefacts.de). Bykovskiy: «Взлет произошел в 14 часов 59 минут, а по радио объявили — в 15 часов» (his report)',
    },
    {
      id: 'strap-ons-off',
      label: 'The four strap-ons separate',
      at: assumed(119.5, TYPE('strap-ons’ separation')),
      also: '«отделения первой ступени почти не заметил»: he hardly noticed them go',
    },
    { id: 'fairing', label: 'Fairing jettisoned', at: assumed(154.6, TYPE('fairing’s jettison')) },
    {
      id: 'core-main-off',
      label: 'Core’s main chambers off: its steering chambers alone',
      at: assumed(290, TYPE('core’s preliminary command')),
    },
    {
      id: 'third',
      label: 'Third stage alight; the core cut loose',
      at: assumed(300, TYPE('third stage’s start')),
      also: 'He did not feel the third stage light',
    },
    {
      id: 'third-stage-off',
      label: 'Third stage cut off: in orbit, low',
      at: assumed(677.08, TYPE('third stage’s cutoff')),
      also: 'He heard a bang as it stopped. The orbit came out 6 km low at perigee and 13 at apogee: “less-than-nominal performance by the third stage” (Siddiqi, p. 368, no source)',
    },
    {
      id: 'spacecraft-separates',
      label: 'Spacecraft separates from the third stage',
      at: assumed(687.08, TYPE('spacecraft’s separation, ten seconds after the cutoff')),
      also: 'He saw snowflakes at the separation (his report). Aviation Week (24 June 1963) argued from TASS’s two orbits that it had parted early',
    },
    {
      id: 'sun-orientation',
      label: 'Solar orientation takes hold',
      at: assumed(
        TDU - 35 * 60,
        `Vostok 1’s cycle, 35 minutes before the burn (09:50 for 10:25), taken for this ship. «Работу солнечной ориентации заметил» (${REPORT})`,
      ),
    },
    {
      id: 'retro-command',
      label: 'Braking engine commanded on, on the 82nd orbit',
      at: derived(
        TDU,
        `not found. The pilot’s landing at 14:06 (${TASS}) less Vostok 1’s 27.9 min from the command to its pilot on the ground (mission.md, "The braking burn"). The 82nd orbit: «„Ястреба“ — на 82-м» (${KAMANIN}, 18 June); ${CHERTOK}, p. 223`,
      ),
    },
    {
      id: 'retro-on',
      label: 'Braking engine at thrust',
      at: derived(TDU + 3.7, 'the command and Vostok 1’s 3.7 s to working mode (its OKB-1 report)'),
      also: '«ТДУ включилась плавно» (his report): it lit smoothly',
    },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      at: derived(TDU + 3.7 + 39, `39 s by his count: «работала 39 секунд» (${REPORT})`),
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: assumed(
        TDU + 3.7 + 39 + 10,
        'not recorded: ten seconds after the burn, the type’s sequence as planned, as Vostok 6’s report has it for hers two days later. Siddiqi (p. 372): “as with Gagarin and Titov, his instrument compartment failed to separate on time”, with no source; his report has only a fast, disorderly rotation until the compartments separated, and how late is not said (mission.md)',
      ),
      also: '«До разделения отсеков корабля было беспорядочное быстрое вращение. Больших перегрузок не было» (his report)',
    },
    {
      id: 'seat-ejected',
      label: 'Hatch No. 1 off and the seat out',
      at: estimated(
        MSK(19, 13, 55, 39),
        'not recorded as such: 13:55:39, where the flight’s record time of 118 h 56 min 41 s ends, if it ends as the commissioner’s notebook ends Vostok 3’s, with the pilot leaving the ship (README, "Where the sources disagree"). «Был сильный хлопок при отстреле люка, а через 2 секунды после этого произошло плавное катапультирование» (his report)',
      ),
      also: 'Siddiqi (p. 372, note 65, from Glushko) and Russian Wikipedia (10:54:40 UTC) give it as the descent module’s landing instead',
    },
    {
      id: 'module-down',
      label: 'Descent module lands',
      at: estimated(
        MSK(19, 14, 0),
        'not found as such: 13:55:39 if the record’s time is the ball’s (Siddiqi from Glushko; Russian Wikipedia’s 10:54:40 UTC), later if it is the pilot’s leaving it (README). 14:00 taken, between. «…к кораблю, который опустился в 1,5–2 километрах от меня» (his report)',
      ),
    },
    {
      id: 'pilot-down',
      label: 'Bykovskiy lands',
      at: doc(MSK(19, 14, 6), `${TASS}, 19 June: 14:06; the FAI’s file: 11:06 GMT; ${TABLE}: 04:23:07:02`),
      also: '14:03 (Borisenko)',
    },
  ],
  ascent: ascent8K72K({
    guidance: {
      azimuth: assumed(
        34 + 37 / 60 + 59.2 / 3600,
        'Vostok 1’s aiming azimuth, 34°37′59″.2 (its flight task), taken for this vehicle, for an orbit inclined a minute of arc more than this one’s 64.96°: E103-24’s flight task is not published',
      ),
      vertical: VERTICAL,
      kick: KICK,
      turn: assumed(119.5, 'the law changes at the strap-ons’ separation, Vostok 1’s 119.5 s'),
      target: {
        at: 'third-stage-off',
        altitude: estimated(
          181_000,
          `the orbit asked for: TASS’s first figures, 181 by 235 km (${TASS}, 14 June, at liftoff), read as the planned orbit, since Vostok 6 was given almost the same two days later and kept them (README, "The orbit"). Taken as the height the design put the last cutoff at`,
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(64.96, `${SIDDIQI}, p. 368 and Table IB: 64.96°. TASS at 22:12 on 14 June: 64°58′`),
      },
    },
    boostersGo: assumed(119.5, TYPE('strap-ons’ separation')),
    lastCutoff: assumed(677.08, TYPE('third stage’s cutoff')),
    fairing: assumed(154.6, TYPE('fairing’s jettison')),
    left: {
      booster: derived(5_283, '3,750 kg dry (Minakov; Astronautix 3,710) and the 1,533 kg the ascent flown leaves in each'),
      core: derived(11_320, 'its 100.4 t fuelled less the 89.08 t the ascent flown burns (6.8 t dry, Astronautix)'),
      blockE: derived(1_518, '1,472 kg burnt out (Minakov) and the 46 kg the ascent flown leaves'),
    },
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 174_700,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 368 and Table IB: 174.7 km. NOT an independent check: the law is solved to put the cutoff level at the 181 km asked for`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 222_100,
        unit: 'm',
        tolerance: 10_000,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 368 and Table IB: 222.1 km. TASS at liftoff, the orbit asked for: 235 km. The hard check of the type’s stages, as Vostok 1’s`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64.96,
        unit: 'deg',
        tolerance: 0.05,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 368 and Table IB: 64.96°. On Vostok 1’s aiming azimuth (assumed), so it checks that the two orbits’ planes were alike`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 88.27 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${TASS}, at 22:12 on 14 June: 88.27 min (the encyclopedias’ figure too). 15 s is some 5 km on the semi-major axis`,
      },
    ],
  }),
  orbit: {
    radius: derived(
      6_369_000,
      'not stated. The published heights and period agree by Kepler’s law over a ball of 6,369 km (174.7 by 222.1 km with 88.27 min; μ 398,600 km³/s²). With the period read as nodal (world/meanelements.ts) the period fixes the axis and this is not used',
    ),
    perigee: doc(
      174_700,
      `${SIDDIQI}, p. 368 and Table IB, "initial orbital parameters": 174.7 km. TASS at 22:12 on 14 June: 175 km (at liftoff, the orbit asked for: 181 km)`,
    ),
    apogee: doc(222_100, `${SIDDIQI}, p. 368 and Table IB: 222.1 km. TASS at 22:12: 222 km (at liftoff: 235 km)`),
    inclination: doc(64.96, `${SIDDIQI}, p. 368 and Table IB: 64.96°. TASS at 22:12: 64°58′`),
    period: doc(
      88.27 * 60,
      `${TASS}, at 22:12 on 14 June, the end of the fifth orbit: 88.27 min; RussianSpaceWeb’s table, from the Soviet encyclopedia: the same. At liftoff TASS gave 88.4 min, the orbit asked for`,
    ),
  },
  injection: {
    at: assumed(677.08, `${TYPE('third stage’s cutoff')}. The orbit is taken to begin here`),
    heading: 'north',
    arc: estimated(
      27.5,
      'NOT documented: Vostok 1’s reckoning of where its cutoff was, 27.5 degrees of arc downrange, for the same vehicle on the same plane. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as Vostok 1’s'),
  },
  mass: doc(4_720, `${TABLE}: 4,720 kg. McDowell rounds to 4.7 t`),
  retro: {
    on: derived(TDU + 3.7, 'the command (derived: mission.md) and Vostok 1’s 3.7 s to working mode'),
    off: derived(TDU + 3.7 + 39, `39 s of thrust by his count (${REPORT}). What shut it down is not stated`),
    deltaV: assumed(
      136,
      'not found for this flight: the type’s integrator setting, 136 m/s (Chertok, vol. 3, p. 80, of Vostok 1), taken for this ship. 1,614 kgf for 39 s on 4.7 t would give 132',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'documented',
      source: `the type’s solar orientation (Vostoks 1 and 2); «Работу солнечной ориентации заметил» before the burn (${REPORT})`,
    },
  },
  entry: {
    separation: assumed(
      TDU + 3.7 + 39 + 10,
      'not recorded: the type’s ten seconds after the burn (mission.md: whether it parted late, and by how much, is not settled)',
    ),
    mass: ENTRY_MASS,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: assumed(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961), taken for this ship: how the code of No. 7’s lock reached Bykovskiy, and what it was, is in no document read',
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: assumed(136, 'the type’s integrator setting (Chertok, vol. 3, p. 80)'),
    parting: PARTING,
  },
  supplies: {
    days: doc(
      10,
      `${KAMANIN}, 28 May 1963: air and oxygen reckoned for ten days, for a flight of up to eight («до 8 суток»: 13 April and 4 June)`,
    ),
    rarefied: RAREFIED,
  },
  ejection: {
    altitude: assumed(
      6_500,
      `the type’s design, taken for this ship: «Отстрел крышки люка. Высота 7000 м … Катапультирование космонавта. Высота 6500 м. Скорость 220 м/сек» (${SCHEME}). He gives no height; his hatch went and the seat two seconds after it (his report), which at 220 m/s down a steep path is about the scheme’s 500 m. The hatches are let go with him here, not 500 m before (mission.md)`,
    ),
  },
  heating: HEATING,
  descent: {
    ground: estimated(
      200,
      'not read: the landing place’s height. The steppe between Karatal and the Ishim north-west of Karaganda lies some 150 to 250 m above the sea',
    ),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: assumed(
          2_269.3,
          `the type’s 2,460 kg with its pilot aboard (${SIDDIQI}, p. 195) less Bykovskiy in his suit, 90.7 kg (Kamanin, 7 May 1963: documented), and Vostok 1’s seat, 100 kg`,
        ),
        dragArea: MODULE_DRAG,
        chutes: MODULE_CHUTES,
      },
      {
        id: 'pilot',
        label: 'Bykovskiy, on his seat and then under his canopy',
        mass: derived(
          190.7,
          'he in his suit, 90.7 kg (Kamanin, 7 May 1963: «Быковский, который в скафандре весит 90,7 килограммов»), and Vostok 1’s seat, 100 kg',
        ),
        dragArea: SEATED_DRAG,
        thrown: THROWN,
        chutes: [
          SEAT_CHUTE,
          mainCanopy(
            measure(4_000, 'assumed', `the type’s: at 4 km, as he leaves the seat (${BOBKOV}). He gives no height`),
            derived(133.7, 'he in his suit, 90.7 kg (Kamanin), and Vostok 1’s survival pack, 43 kg'),
          ),
        ],
      },
      ...HATCHES,
    ],
    automatic:
      'Bykovskiy had no say in the descent: the burn by the automatic programme on the ground’s command, the modules’ parting, the hatches, the seat and every parachute were the automatic system’s',
    torn: TORN,
    crew: CREW,
    checks: [
      {
        id: 'pilot.at',
        label: 'Bykovskiy on the ground',
        value: MSK(19, 14, 6),
        unit: 's',
        tolerance: 180,
        confidence: 'documented',
        source: `${TASS}: 14:06, to the minute; Borisenko has 14:03. Not wholly independent: the burn’s instant is derived from it`,
      },
      {
        id: 'module.at',
        label: 'Descent module on the ground',
        value: MSK(19, 13, 58),
        unit: 's',
        tolerance: 300,
        confidence: 'derived',
        source:
          'between 13:55:39 (the record’s time as Siddiqi reads it, the ball’s landing) and about 14:01 (the same time read as the pilot leaving the ship, and the type’s six minutes to the ground from 7 km): the README',
      },
    ],
  },
  landing: {
    latitude: doc(53 + 23 / 60 + 45 / 3600, 'spacefacts.de: 53°23′45″ N; McDowell to a hundredth of a degree. No survey is stated'),
    longitude: doc(67 + 36 / 60 + 41 / 3600, 'spacefacts.de: 67°36′41″ E; McDowell the same. TASS: 540 km north-west of Karaganda'),
    at: doc(MSK(19, 14, 6), `${TASS}: 14:06`),
    near: 'Karatal',
  },
  checks: [
    {
      id: 'period',
      label: 'Period, node to node, of the orbit begun',
      value: 88.27 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${TASS}, 22:12 on 14 June: 88.27 min. NOT independent: the published orbit is read as mean elements with this nodal period`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 222_100,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${SIDDIQI}, p. 368: 222.1 km`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source:
        'spacefacts.de: 53°23′45″ N 67°36′41″ E. The plane is flown from an assumed azimuth; no wind on the parachutes. Independent of the burn’s instant',
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source:
        'spacefacts.de. Not independent: the burn’s instant is derived from the pilot’s landing time (mission.md), and the coast is five days long in the standard air, not the day’s (the orbit fell faster than reckoned)',
    },
    // TASS's orbit announced at 15:00 on 18 June, four days on (T+96 h), read as the published orbit is: mean elements over
    // its ball. Tolerances as every Vostok's apogee check (5 km) and to a tenth of a minute (6 s); set after the physics
    // agent's probe of these instants had been seen (163.3 by 197.4 km, 87.91 min), which is said here
    ...(['perigee', 'apogee', 'period'] as const).map((field) => ({
      id: `tass18.${field}` as const,
      label: `${field === 'period' ? 'Period' : field === 'perigee' ? 'Perigee' : 'Apogee'} at 15:00 on 18 June, four days on`,
      value: field === 'perigee' ? 159_000 : field === 'apogee' ? 193_000 : 87.8 * 60,
      unit: field === 'period' ? 's' : 'm',
      tolerance: field === 'period' ? 6 : 5_000,
      confidence: 'documented' as const,
      source: `${TASS}: «Заря Востока», 19 June 1963, the orbit at 15:00 Moscow time on 18 June: 159 by 193 km, 87.8 min. Its ball not stated: taken as the published orbit’s`,
      at: MSK(18, 15, 0),
    })),
  ],
};
