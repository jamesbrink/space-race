/**
 * Voskhod 2 as an orbital flight: its record (vostok-record.ts `VostokRecord`), which `flight.ts` writes its plan from
 * (vostok-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file;
 * the numbers live here. The launch vehicle is the 11A57's (vehicles/voskhod-11a57-flown.ts) and the ship the Voskhod's
 * (vehicles/voskhod-ship.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 10:00:00 Moscow time on
 * 18 March 1965 (07:00:00 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **This flight has more of its own record than any Voskhod or Vostok here**: OKB-1's technical report of 6 June 1965 with
 * its tables of commands, the flight's logbook, the crew's report and the State Commission's typescript, and the record
 * commissioners' acts as Borisenko prints them. The ascent's instants are the crew's, and may be the cyclogram's (the
 * logbook prints the same as the plan); the separation is OKB-1's own. The descent was flown by hand a revolution late:
 * the burn's start and end are OKB-1's commands, its aim the crew's own by eye, and its impulse is derived.
 */

import type { VostokRecord } from '../../../vostok/vehicles/vostok-record.ts';
import {
  COVER,
  COVER_OFF,
  CREW,
  canopy,
  ENTRY_AREA,
  ENTRY_DRAG,
  HAND_RATE,
  HEATING,
  MODULE_DRAG,
  PARTING,
  softLanding,
  TDU_THRUST,
  TORN,
} from '../../vehicles/voskhod-ship.ts';
import { AFT_MASS, ascent11A57, BLOCK_I, CORE_11A57, SIDDIQI, STRAP_ONS_11A57, stages11A57 } from '../../vehicles/voskhod-11a57-flown.ts';
import { BOBKOV, G0, GCTC, KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';

/** Seconds from liftoff, 10:00:00 Moscow time on 18 March 1965, of a Moscow time on a day of March 1965. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 18) * 24 + h - 10) * 3600 + min * 60 + s;

const ARCHIVE = 'Roscosmos’s release for the flight’s fiftieth year (roscosmos.ru/28187, as archived)';
const OKB1 = `OKB-1, «Предварительный технический отчет … "Восход-2" (объект ЗКД № 4)», 6 June 1965 (${ARCHIVE})`;
const CREW_REPORT = `«Отчет экипажа космического корабля "Восход-2"» (${ARCHIVE})`;
const TRANSCRIPT = `the State Commission’s typescript of 22 March 1965 (RGANTD ф. 1, оп. 13-1, д. 36; ${ARCHIVE})`;
const LOGBOOK = `the flight’s logbook, «Бортовой журнал космического корабля "Восход-2"» (RKK Energia; ${ARCHIVE})`;
/** The record commissioners' acts, as Borisenko prints them (their times in GMT, converted: Moscow is three hours ahead). */
const ACT = 'the record commissioners’ acts, in Borisenko, «В космосе — Леонов» (3rd ed., 1984), pp. 124 to 128';
const KAMANIN = 'Kamanin’s diary, March and April 1965 («Скрытый космос», book 2; militera.lib.ru/db/kamanin_np/65.html)';
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110)';
/** The crew's instants of the ascent, which the logbook prints as the plan's: perhaps the cyclogram's, not measured. */
const ASCENT = (what: string, at: number) =>
  doc(
    at,
    `${CREW_REPORT}, p. 5: «Момент отделения первой ступени – 118 сек., сброс головного обтекателя – 153 сек., отделение промежуточной ступени – 292 сек. Выключение последней ступени – 523 сек.» (${what}). The same report says «времена точно совпадают с расчетными», and ${LOGBOOK}, p. 27, prints these as the plan: they may be the cyclogram’s`,
  );

/** The ship's in orbit, kg, and the airlock it let go. */
const SHIP = 5_682;
const AIRLOCK = doc(
  250,
  `${SIDDIQI}, p. 450: "The complete airlock system had a mass of 250 kilograms" (and the drawing on p. 449). McDowell has 240 kg`,
);
/** The braking engine by hand: its main valve opened, and its shutdown in a gap in the telemetry. */
const VALVE = MSK(19, 11, 36, 29.5);
const SHUT = MSK(19, 11, 37, 9);
/** What the burn gave: the engine's measured mean thrust over its burn, on the ship without its airlock. */
const BURN_THRUST = 1575;
const DV = (BURN_THRUST * G0 * (SHUT - VALVE)) / (SHIP - AIRLOCK.value);

/** The ball's parachutes' areas, m² of canopy: what they drag (here) and how they are drawn (flight.ts). As Voskhod 1's. */
export const AREAS = [
  { name: 'pilot parachute', area: assumed(1.5, `the Vostok ball’s, 1.5 m² (${BOBKOV}; ${GCTC}): the Voskhod’s was not found`) },
  { name: 'braking parachute', area: assumed(18, `the Vostok ball’s, 18 m² (${BOBKOV}; ${GCTC}): the Voskhod’s was not found`) },
  {
    name: 'main parachutes',
    area: assumed(
      2 * 574,
      `two of the Vostok ball’s main canopy, 574 m² each (${BOBKOV}; ${GCTC}): "two primary parachutes" (${SIDDIQI}, p. 411); the system «не отличается от работы этой системы в предыдущих пусках объектов ЗКВ» (${OKB1}, p. 12); their area was not found`,
    ),
  },
];
const area = (name: string) => AREAS.find((a) => a.name === name)!.area;
/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  237,
  'NOT FOUND: the SRTM’s and ASTER’s surface at the commissioners’ point, 237 m, which over the taiga is the trees’ tops: the ground may be some 25 m lower',
);
const LANDED = 2_900 - COVER.mass.value;
const UNDER = 7.5;
const LEFT = 0.2;
const PROBE = doc(1.2, `${SIDDIQI}, p. 411: the probe "deployed ... to a length of 1.2 meters"`);
const DECEL = (UNDER ** 2 - LEFT ** 2) / (2 * PROBE.value);
const ROCKET_SAYS = `NOT FOUND, as Voskhod 1’s: worked from Kamanin’s 7 to 8 m/s without it (13 October 1964) to Siddiqi’s 0.2 m/s over the probe’s 1.2 m at an even deceleration of ${DECEL.toFixed(1)} m/s², which is ours`;

/**
 * The middle of revolution `n`, s from liftoff, as the record counts them: the burn, 16.9 periods after the separation, was
 * on the 18th (Kamanin; the logbook), so the n-th spans the (n-1)th period from the separation. Reckoned on the first
 * orbit's period: the record's file gives the revolution, not an instant.
 */
const REV = (n: number) => 528.1 + (n - 1.5) * 90.944 * 60;

export const orbital: VostokRecord = {
  craft: { id: 'voskhod-11a57', label: 'The stack' },
  liftoffMass: derived(
    4 * STRAP_ONS_11A57.mass.value + CORE_11A57.mass.value + BLOCK_I.mass.value + AFT_MASS.value + 800 + SHIP,
    'what the blocks, the fairing (0.8 t, the Vostok-K’s) and the ship weigh fuelled, as this record has them: 306.2 t. McDowell’s table of launch vehicles has 305.1 t for the 11A57',
  ),
  stages: stages11A57({
    boosters: { cutoff: ASCENT('the strap-ons', 118), separation: ASCENT('the strap-ons', 118) },
    core: { cutoff: ASCENT('the core', 292), separation: ASCENT('the core', 292) },
    third: {
      ignition: ASCENT('the third stage', 292),
      cutoff: ASCENT('the cutoff', 523),
      separation: doc(
        528.1,
        `${OKB1}, Table 1, p. 7: «Время отделения объекта от носителя (ОВ) … 10ʰ08′48,1 / 528,1»; the crew’s report has 527 s`,
      ),
    },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(
        0,
        `${ACT}, p. 124: «Отрыв ракеты со стартового устройства произошел в 7 часов 00 минут 00 секунд по гринвичскому времени»; ${OKB1}, p. 6`,
      ),
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: ASCENT('the strap-ons', 118) },
    { id: 'fairing', label: 'Fairing jettisoned', at: ASCENT('the fairing', 153) },
    { id: 'third', label: 'Third stage alight; the core cut loose', at: ASCENT('the core', 292) },
    {
      id: 'aft-section',
      label: 'Block I’s aft section let go',
      at: estimated(302, 'NOT FOUND: some ten seconds after the core, as Voskhod 1’s, by judgement'),
    },
    { id: 'third-stage-off', label: 'Third stage cut off: in orbit', at: ASCENT('the cutoff', 523) },
    {
      id: 'spacecraft-separates',
      label: 'Spacecraft separates from the third stage',
      at: doc(528.1, `${OKB1}, Table 1, p. 7: 10:08:48.1`),
      also: '527 s by the crew’s report; Kamanin and Chertok heard 530 counted',
    },
    {
      id: 'airlock-out',
      label: 'The airlock is let out, «с рывками и потрескиванием»',
      at: doc(MSK(18, 10, 22, 54.3), `${OKB1}, Table 2, p. 13: «Раскрытие шлюза 10ʰ22′54,3″»; ${CREW_REPORT}, p. 6`),
    },
    {
      id: 'outer-hatch',
      label: 'The airlock’s outer hatch opens',
      at: doc(MSK(18, 11, 32, 31.5), `${OKB1}, Table 2: 11:32:31.5; fully open at 11:32:54 (${ACT}, p. 126, 08:32:54 GMT)`),
    },
    {
      id: 'egress',
      label: 'Leonov comes out of the airlock: the first walk in space',
      at: doc(MSK(18, 11, 34, 51), `${ACT}: «В 8 час 34 мин 51 сек выход космонавта из шлюзовой камеры» (GMT)`),
    },
    {
      id: 'ingress',
      label: 'He is back in the airlock',
      at: doc(MSK(18, 11, 47), `${ACT}: «В 8 час 47 мин 00 сек вход космонавта в шлюзовую камеру»`),
    },
    {
      id: 'hatch-closed',
      label: 'The outer hatch closed',
      at: doc(MSK(18, 11, 48, 34.3), `${OKB1}, Table 2: 11:48:34.3`),
      also: '11:48:40 by the commissioners’ act',
    },
    {
      id: 'airlock',
      label: 'The airlock shot off: «резкий толчок … хлопок взрывного характера»',
      at: estimated(
        MSK(18, 12, 20),
        `NOT RECORDED as an instant: ${OKB1}, Table 2, has it planned 134 to 138 min after separation (12:22:48 to 12:26:48) with no telemetry, and its Fig. 2 (p. 34) marks «ориентировочный момент отстрела шлюза» at about 12:15 to 12:20, read off the plot. ${CREW_REPORT}, p. 7: «После нажатия тумблера "отстрел ШК" сразу почувствовали резкий толчок»`,
      ),
    },
    {
      id: 'automatic-cycle',
      label: 'The automatic descent commanded on the 16th orbit; the solar orientation fails and it is called off',
      at: doc(
        MSK(19, 9, 1, 11.8),
        `${OKB1}, Table 7: command УС № 5 at 09:01:11.8, cancelled at 10:19:04.7; «отказа в пневмосистеме солнечной ориентации» (p. 30)`,
      ),
    },
    {
      id: 'manual-1',
      label: 'Hand orientation on: Belyayev, out of his couch, turns the ship by the Vzor',
      at: doc(MSK(19, 11, 19), `${ACT}: «В 8 час 19 мин 00 сек … включение системы ручной ориентации»; ${LOGBOOK}, p. 7: «11.19»`),
    },
    {
      id: 'retro-command',
      label: 'Braking engine fired by hand, 46 seconds late',
      at: doc(MSK(19, 11, 36, 27.2), `${OKB1}, Tables 6 and 7: the ignition command (ИКН) at 11:36:27.2 (its Table 1: 11:36:25.2)`),
      also: `the time read up to them was 11:35:44 (${LOGBOOK}, p. 7: «11,35′44″!»): late by 46 s (${KAMANIN}, 22 April 1965: «опоздал с включением ТДУ на 46 секунд»)`,
    },
    { id: 'retro-on', label: 'Braking engine at thrust', at: doc(VALVE, `${OKB1}, Table 7: the main valve (КЗ) at 11:36:29.5`) },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      at: doc(
        SHUT,
        `${OKB1}, Table 7: the shutdown command (ГК) «~11ʰ37′09″ (в сбое)», in a gap in the telemetry; «ориентировочно 39 сек. работала ТДУ» (${TRANSCRIPT}, p. 8)`,
      ),
    },
    {
      id: 'modules',
      label: 'The modules part, fourteen minutes after the burn, on the thermal sensors',
      at: doc(
        MSK(19, 11, 50, 56.5),
        `${OKB1}, p. 11: «Разделение произошло (19.03.65г. в 11 50 56,5″)», 14′31.3″ after the ignition command, «по термодатчикам»`,
      ),
    },
    {
      id: 'cover-off',
      label: COVER_OFF.label,
      at: doc(MSK(19, 11, 56, 8), `${ACT}: «В 8 час 56 мин 08 сек от автоматики спуска введена в действие система приземления» (GMT)`),
    },
    {
      id: 'module-down',
      label: 'Touchdown in the taiga, 180 km north-north-west of Perm',
      at: doc(MSK(19, 12, 2, 17), `${ACT}, p. 125: «в 9 часов 02 минуты 17 секунд по гринвичскому времени»`),
      also: '12:06 by Kamanin',
    },
  ],
  ascent: ascent11A57({
    guidance: {
      vertical: VERTICAL,
      kick: KICK,
      turn: ASCENT('the strap-ons', 118),
      target: {
        at: 'third-stage-off',
        altitude: doc(
          180_000,
          `${OKB1}, Table 1, p. 7: the planned perigee («Расчётное значение»), 180 km, against 470 at apogee: taken as the height the design put the last cutoff at`,
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(65, `${OKB1}, Table 1: «~65»; TASS: «около 65 градусов»; ${SIDDIQI}, Table IB: 65`),
      },
    },
    boostersGo: ASCENT('the strap-ons', 118),
    lastCutoff: ASCENT('the cutoff', 523),
    fairing: ASCENT('the fairing', 153),
    aft: { at: estimated(302, 'NOT FOUND: some ten seconds after the core, by judgement'), mass: AFT_MASS },
    jettisons: [
      {
        id: 'airlock',
        at: estimated(MSK(18, 12, 20), 'NOT RECORDED: OKB-1’s Fig. 2, read off the plot (the record’s `airlock`)'),
        mass: AIRLOCK,
      },
    ],
    left: {
      booster: derived(5_130, 'its 3.75 t empty and what the ascent flown leaves in each'),
      core: derived(12_305, 'its 6.8 t empty and what the ascent flown leaves'),
      blockI: derived(4_078, 'its 2.83 t empty and what the ascent flown leaves'),
    },
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 173_500,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `the record’s file, the first orbit: 173.5 km (${ACT}, p. 128); ${OKB1}, Table 1: 173. Planned: 180`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 497_700,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `the record’s file, the first orbit: 497.7 km (${ACT}, p. 128); ${OKB1}, Table 1: 495, against 470 planned. No source read says why it went higher`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 65,
        unit: 'deg',
        tolerance: 0.2,
        confidence: 'documented',
        source: `${OKB1}, Table 1: «~65». NOT independent: the launch plane is solved for it`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 90.944 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `the record’s file, the first orbit: 90.944 min (${ACT}, p. 128)`,
      },
    ],
  }),
  orbit: {
    perigee: doc(173_500, `the record’s file, the first orbit: 173.5 km (${ACT}, p. 128). TASS at liftoff: 173 km`),
    apogee: doc(497_700, `the record’s file, the first orbit: 497.7 km (${ACT}, p. 128). TASS: 495 km; ${SIDDIQI}, p. 455: 498`),
    inclination: doc(65, `${OKB1}, Table 1: «~65»; TASS: «около 65 градусов»; ${SIDDIQI}, Table IB: 65. McDowell’s elements give 64.79°`),
    period: doc(90.944 * 60, `the record’s file, the first orbit: 90.944 min (${ACT}, p. 128). TASS: 90.9 min`),
  },
  injection: {
    at: doc(528.1, `${OKB1}, Table 1: the separation at 528.1 s. The orbit is taken to begin here`),
    heading: 'north',
    arc: estimated(15.9, 'NOT documented: about where the type’s ascent flown has the cutoff. Flying the ascent replaces it'),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff'),
  },
  mass: doc(SHIP, `${SIDDIQI}, Table IB: 5,682 kg (p. 448: "approximately 5.685"), the airlock aboard`),
  retro: {
    on: doc(VALVE, `${OKB1}, Table 7: the main valve at 11:36:29.5, on the 18th orbit as Kamanin and the logbook count`),
    off: doc(SHUT, `${OKB1}, Table 7: «~11ʰ37′09″ (в сбое)»; about 39 s («ориентировочно 39 сек»: ${TRANSCRIPT}, p. 8)`),
    deltaV: derived(
      DV,
      `the engine’s mean thrust as measured, 1,575 kgf (${OKB1}, Table 5; planned 1,600 ± 50), over 39.5 s on the 5,432 kg ship without its airlock: ${DV.toFixed(1)} m/s. No impulse or integrator setting was found`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'estimated',
      source: `by hand, against the line of flight by the Vzor: Belyayev «перевернулся поперек корабля, поперек кресел … Пришлось развернуть корабль почти на 180°» (${TRANSCRIPT}, pp. 7-8). How true he held it is not recorded`,
    },
  },
  entry: {
    separation: doc(MSK(19, 11, 50, 56.5), `${OKB1}, p. 11: 11:50:56.5, by the thermal sensors`),
    mass: assumed(2_900, `the 3KV’s, 2,900 kg with its crew (${SIDDIQI}, p. 412): the 3KD’s was not found`),
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: assumed(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961), taken: whether the 3KD’s hand controls were locked is in nothing read',
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: derived(DV, 'as the record’s burn: no integrator setting was found'),
    parting: PARTING,
    periods: [
      {
        from: doc(MSK(19, 11, 19), `${ACT}: 08:19:00 GMT`),
        to: doc(MSK(19, 11, 36, 27.2), `${OKB1}: the ignition command`),
        what: 'Belyayev’s orientation by hand for the descent, lying across the cabin out of his couch, by the Vzor, a revolution after the automatic cycle failed',
      },
    ],
  },
  ejection: {
    altitude: doc(
      5_000,
      `«на высоте 5000 метров, когда скорость … 220 метрам в секунду» (Borisenko, p. 103); the design (OKB-1’s prospectus of 1964)`,
    ),
    event: COVER_OFF,
  },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with the crew',
        mass: estimated(LANDED, `the 3KV’s 2,900 kg (assumed) less the cover’s ${COVER.mass.value} kg (estimated)`),
        dragArea: MODULE_DRAG,
        chutes: [
          canopy({
            name: 'pilot parachute',
            after: doc(0, `«Отстрелился люк, вышел тормозной парашютик, а затем основная система» (${TRANSCRIPT}, p. 9)`),
            area: area('pilot parachute'),
            fills: estimated(1, 'chosen: no filling time found'),
          }),
          canopy({
            name: 'braking parachute',
            altitude: assumed(4_000, `the Vostok ball’s, 4 km (${BOBKOV}): the Voskhod’s was not found`),
            area: area('braking parachute'),
            fills: estimated(2, 'chosen: no filling time found'),
            instead: ['pilot parachute'],
          }),
          canopy({
            name: 'main parachutes',
            altitude: assumed(2_500, `the Vostok ball’s main, 2.5 km (${BOBKOV}; ${GCTC}): the Voskhod’s was not found`),
            area: area('main parachutes'),
            fills: estimated(6, 'chosen: no filling time found'),
            instead: ['braking parachute'],
          }),
        ],
        motors: [
          softLanding(
            'main parachutes',
            GROUND,
            estimated(LANDED * (DECEL + G0), `N: ${ROCKET_SAYS}, against the ball’s weight`),
            estimated((UNDER - LEFT) / DECEL, `s: ${ROCKET_SAYS}`),
            PROBE,
          ),
        ],
      },
      COVER,
    ],
    automatic:
      'The descent after the burn was the automatic system’s: the parting on the thermal sensors, the parachutes and the rocket at the ground. The orientation and the burn were the crew’s, by hand',
    torn: TORN,
    crew: CREW,
    lands: { on: 'land', ship: 'the descent module' },
    checks: [
      {
        id: 'module.at',
        label: 'Touchdown',
        value: MSK(19, 12, 2, 17),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${ACT}, p. 125: 09:02:17 GMT`,
      },
      {
        id: 'module.speed',
        label: 'Touchdown speed',
        value: LEFT,
        unit: 'm/s',
        tolerance: 1,
        confidence: 'documented',
        source: `the design (${SIDDIQI}, p. 411). NOT a measurement, and NOT independent: the rocket is worked from it`,
      },
    ],
  },
  landing: {
    latitude: doc(
      59 + 34 / 60 + 3 / 3600,
      `${ACT}, p. 125: 59°34′03″ N, «в 180 километрах в северо-, северо-западном направлении от г. Перми»; spacefacts.de 1.6 km off it`,
    ),
    longitude: doc(55 + 28 / 60, `${ACT}, p. 125: 55°28′00″ E`),
    at: doc(MSK(19, 12, 2, 17), `${ACT}, p. 125`),
    near: 'Perm',
  },
  checks: [
    {
      id: 'period',
      label: 'Period, node to node, of the orbit begun',
      value: 90.944 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `the record’s file (${ACT}, p. 128). NOT independent: the published orbit is read as mean elements with this nodal period`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 497_700,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `the record’s file, the first orbit (${ACT}, p. 128)`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${ACT}, p. 125: 59°34′03″ N 55°28′00″ E. Independent of the burn’s instant`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source: `${ACT}, p. 125. The burn’s instant and length are OKB-1’s commands; its impulse is derived from the measured thrust, and its aim by hand is not known. The record’s own miss was 368 km (Kamanin; ${CHERTOK}, p. 272) or 386 km (${SIDDIQI}, p. 459)`,
    },
    // the record's file's orbits on the ninth and eighteenth revolutions, read as the published orbit is, at each one's middle
    // (reckoned from the first orbit's period: the file gives the revolution, not an instant)
    ...(
      [
        [9, 173_300, 496_200, 90.928],
        [18, 173_100, 494_600, 90.91],
      ] as const
    ).flatMap(([n, pe, ap, period]) =>
      (['perigee', 'apogee', 'period'] as const).map((field) => ({
        id: `rev${n}.${field}` as const,
        label: `${field === 'period' ? 'Period' : field === 'perigee' ? 'Perigee' : 'Apogee'} on the ${n}th orbit`,
        value: field === 'perigee' ? pe : field === 'apogee' ? ap : period * 60,
        unit: field === 'period' ? 's' : 'm',
        tolerance: field === 'period' ? 2 : 2_000,
        confidence: 'documented' as const,
        source: `the record’s file (${ACT}, p. 128): the ${n}th orbit, ${pe / 1000} by ${ap / 1000} km, ${period} min. Its instant is the revolution’s middle, reckoned as the burn’s is counted the 18th`,
        at: REV(n),
      })),
    ),
  ],
};
