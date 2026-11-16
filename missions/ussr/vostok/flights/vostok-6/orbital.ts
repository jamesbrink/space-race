/**
 * Vostok 6 as an orbital flight: its record (vostok-record.ts `VostokRecord`), which `flight.ts` writes its plan from
 * (vostok-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file;
 * the numbers live here. The launch vehicle and the ship are the type's (vehicles/vostok-8k72k.ts, vehicles/vostok-3ka.ts);
 * what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 12:29:52 Moscow time on
 * 16 June 1963 (09:29:52 UTC). The checks were written before this record was flown (the commit that added them flew
 * nothing), from how well each figure is known.
 *
 * **No document of this ascent has been found**: no cyclogram, no flight task for 8K72K No. E103-25, no range report. So
 * every instant of the ascent is Vostok 1's, taken for this vehicle (`assumed`); what Tereshkova felt and saw is beside
 * each. The descent has more than any Vostok's since the first: the command that began the automatic landing cycle to the
 * second, her report to the State Commission in OKB-1's own typescript (the burn's 39 s and the parting 10 s after it), and
 * the descent's scheme in OKB-1's report on the flight. **The braking burn's instant is derived** from the command and the
 * cycle's minutes (mission.md, "The braking burn"), not from the landing.
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

/** Seconds from liftoff, 12:29:52 Moscow time on 16 June 1963, of a Moscow time on a day of June 1963. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 16) * 24 + h - 12) * 3600 + (min - 29) * 60 + (s - 52);

const KAMANIN = 'Kamanin’s diary, June 1963 («Скрытый космос», book 1; militera.lib.ru/db/kamanin_np/63.html)';
/** Her report to the State Commission of 20 June 1963: as Kamanin wrote it down, and in OKB-1's typescript of it. */
const REPORT = `Tereshkova’s report to the State Commission, 20 June 1963, as Kamanin wrote it down, "with cuts" (${KAMANIN}, 20 June)`;
const TYPESCRIPT =
  'the same report in the Commission’s typescript (RGANTD ф. 1, оп. 13-1, д. 11, the odd pages; rgantd.ru, "Women in space")';
/** The descent's scheme in OKB-1's report on this flight: the type's design, not a measurement. */
const SCHEME = '«Схема спуска», OKB-1’s report on the flight of Vostok 6, 1963 (RGANTD ф. 24, оп. 1, д. 14, л. 27)';
const TRANSCRIPT = 'the transcripts of her exchanges with the ground (RGANTD), as Siddiqi gives them in Spaceflight 51, January 2009';
const KOGUTENKO = 'Kogutenko (of the team that made the «Гранит» programme timer), Novaya Gazeta, 18 September 2013';
const TASS = 'TASS, 16 to 20 June 1963, as printed in «Заря Востока» (Tbilisi)';
const TABLE = `${SIDDIQI}, Table IB`;
/** Vostok 1's record, taken for this vehicle: the words for an instant this flight's record does not give. */
const TYPE = (what: string) =>
  `NOT this flight’s: no cyclogram, flight task or range report of E103-25 has been found. Vostok 1’s ${what}, as its record flies it (vostok-1/orbital.ts), taken for this vehicle`;

/** The command that began the automatic landing cycle: to the second (Kamanin; Siddiqi, p. 372). */
const CYCLE = MSK(19, 9, 39, 40);
/**
 * The braking engine's command, derived (mission.md, "The braking burn"): the cycle's command and the about 71 minutes from
 * it to the engine's control (Kogutenko). Everything about the burn is timed from it.
 */
const TDU = CYCLE + 71 * 60;

export const orbital: VostokRecord = {
  liftoffMass: assumed(287_000, `${TYPE('liftoff mass')}: 287 t (RKK Energia 1946–1996; Minakov). This vehicle’s own was not found`),
  stages: stages8K72K({
    boosters: {
      cutoff: assumed(
        119.5,
        `${TYPE('strap-ons’ integrator command')}: 119.50 s flown, 119.45 s planned. «Перегрузки были слабые, ниже пяти» (${REPORT})`,
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
      ignition: assumed(300, TYPE('third stage’s start')),
      cutoff: assumed(
        677.08,
        `${TYPE('third stage’s cutoff')}: 677.08 s flown, 674.68 s planned. Cut here on its integrator (below), so this is a result`,
      ),
      separation: assumed(
        687.08,
        `${TYPE('spacecraft’s separation')}, ten seconds after the cutoff. «Видела в правый иллюминатор третью ступень» (${REPORT})`,
      ),
      velocity: {
        apparent: true,
        speed: assumed(
          2_283.52,
          'm/s of apparent velocity: Vostok 1’s flight task’s setting for its third stage (the 2011 documents), for an orbit of 180 km perigee. NOT this flight’s: E103-25’s flight task is not published',
        ),
      },
    },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(0, `${SIDDIQI}, p. 369 and the launch log: 12:29:52 Moscow time; McDowell’s launch log: 09:29:52 UTC`),
      also: '12:29:51 (Borisenko, the record’s commissioner; Siddiqi, 2009; spacefacts.de). TASS: 12:30',
    },
    {
      id: 'strap-ons-off',
      label: 'The four strap-ons separate',
      at: assumed(119.5, TYPE('strap-ons’ separation')),
      also: 'The loads were light, under five g (her report)',
    },
    { id: 'fairing', label: 'Fairing jettisoned', at: assumed(154.6, TYPE('fairing’s jettison')) },
    {
      id: 'core-main-off',
      label: 'Core’s main chambers off: its steering chambers alone',
      at: assumed(290, TYPE('core’s preliminary command')),
    },
    { id: 'third', label: 'Third stage alight; the core cut loose', at: assumed(300, TYPE('third stage’s start')) },
    { id: 'third-stage-off', label: 'Third stage cut off: in orbit', at: assumed(677.08, TYPE('third stage’s cutoff')) },
    {
      id: 'spacecraft-separates',
      label: 'Spacecraft separates from the third stage',
      at: assumed(687.08, TYPE('spacecraft’s separation, ten seconds after the cutoff')),
      also: 'She saw the third stage through the right porthole, and in the Earth’s shadow a star three times as bright as Vega that she took for Vostok 5 (her report)',
    },
    {
      id: 'manual-1',
      label: 'She turns the ship by hand to the attitude for descent, on the 45th or 47th orbit',
      at: doc(MSK(19, 7, 40), `${TRANSCRIPT}: "from seven hours 40 minutes until eight hours five minutes … on the 47th orbit"`),
      also: '«На 45-м витке я за 20 минут сориентировала корабль по-посадочному» (her report); «15 минут держала корабль в таком положении» (Kamanin, 19 June)',
    },
    {
      id: 'manual-1-off',
      label: 'Manual orientation off: the attitude held fifteen minutes',
      at: doc(MSK(19, 8, 5), `${TRANSCRIPT}`),
    },
    {
      id: 'landing-cycle',
      label: 'The ground’s command for the automatic landing cycle goes up, and is seen to arrive',
      at: doc(
        CYCLE,
        `${KAMANIN}, 19 June: «В 9 часов 39 минут 40 секунд была выдана команда на включение автоматического цикла посадки корабля „Восток-6“. Через несколько секунд мы узнали, что команда прошла»; ${SIDDIQI}, p. 372: 0939:40`,
      ),
    },
    {
      id: 'spusk-1',
      label: 'By her key: the descent programme’s first stage on',
      at: doc(MSK(19, 9, 42), `${TRANSCRIPT}: "At nine hours 42 minutes Spusk-I was turned on"`),
    },
    {
      id: 'spusk-2',
      label: 'By her key: its second stage on',
      at: doc(MSK(19, 9, 51), `${TRANSCRIPT}: "At nine hours 51 minutes Spusk-II"`),
    },
    {
      id: 'sun-orientation',
      label: 'Solar orientation on, in the Earth’s shadow',
      at: assumed(
        TDU - 35 * 60,
        `Vostok 1’s cycle, 35 minutes before the burn (09:50 for 10:25), taken for this ship. «Еще в тени Земли включилась солнечная ориентация» (${REPORT})`,
      ),
    },
    {
      id: 'retro-command',
      label: 'Braking engine commanded on, on the 49th orbit',
      at: derived(
        TDU,
        `not found as an instant. The cycle’s command at 09:39:40 (${KAMANIN}) and «приблизительно на 71-й минуте, если в течение первой минуты сохранялась устойчивая ориентация корабля, — система управления ТДУ» (${KOGUTENKO}): 10:50:40. Not from the landing: with Vostok 1’s 27.9 min from command to pilot on the ground it would put her down at 11:18:34, where TASS has 11:20. The 49th orbit: «„Чайку“ будем сажать на 49-м витке» (${KAMANIN}, 18 June)`,
      ),
    },
    {
      id: 'retro-on',
      label: 'Braking engine at thrust',
      at: derived(TDU + 3.7, 'the command and Vostok 1’s 3.7 s to working mode (its OKB-1 report)'),
      also: '«Включение ТДУ было слабо слышимым» (her report): she barely heard it',
    },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      at: derived(TDU + 3.7 + 39, `«После отработки ТДУ /39 секунд ТДУ работала/ сразу загорелось табло» (${TYPESCRIPT}, p. 53)`),
    },
    {
      id: 'modules',
      label: 'The modules part, with a jerk',
      at: derived(TDU + 3.7 + 39 + 10, `«Через 10 секунд произошло разделение» (${TYPESCRIPT}, p. 53): ten seconds after the burn`),
      also: '«Разделение отсеков произошло рывком. Корабль сначала шел устойчиво, а потом были раскачивания» (her report)',
    },
    {
      id: 'seat-ejected',
      label: 'Hatch No. 1 off and the seat out',
      at: estimated(
        MSK(19, 11, 10, 40),
        'not recorded as such: 11:10:40, where the flight’s record time of 70 h 40 min 48 s ends, if it ends as the commissioner’s notebook ends Vostok 3’s, with the pilot leaving the ship (Vostok 5’s README, "Where the sources disagree"). «Кресло из корабля выходит очень плавно и отделяется быстро» (her report)',
      ),
      also: 'Siddiqi (p. 372, note 65, from Glushko) gives 11:10:40 as the descent module’s landing instead',
    },
    {
      id: 'module-down',
      label: 'Descent module lands',
      at: estimated(
        MSK(19, 11, 13),
        'not found as such: 11:10:40 if the record’s time is the ball’s (Siddiqi from Glushko), later if it is her leaving it. 11:13 taken, between. «В 400 метрах от меня находился корабль» (her report)',
      ),
    },
    {
      id: 'pilot-down',
      label: 'Tereshkova lands, on her back',
      at: doc(MSK(19, 11, 20), `${TASS}, 19 June: 11:20; ${TABLE}: 02:22:50:08`),
      also: '«Необходимо сделать управление куполом парашюта, так как я приземлилась спиной» (her report)',
    },
  ],
  ascent: ascent8K72K({
    guidance: {
      azimuth: assumed(
        34 + 37 / 60 + 59.2 / 3600,
        'Vostok 1’s aiming azimuth, 34°37′59″.2 (its flight task), taken for this vehicle, for an orbit inclined a minute of arc more than this one’s 64.95°: E103-25’s flight task is not published',
      ),
      vertical: VERTICAL,
      kick: KICK,
      turn: assumed(119.5, 'the law changes at the strap-ons’ separation, Vostok 1’s 119.5 s'),
      target: {
        at: 'third-stage-off',
        altitude: estimated(
          183_000,
          `TASS’s first figures, 183 by 233 km (${TASS}, 16 June, at liftoff), taken as the orbit asked for, as Vostok 5’s were two days before: this flight’s plan is not read. Taken as the height the design put the last cutoff at`,
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(64.95, `${SIDDIQI}, p. 369 and Table IB: 64.95°`),
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
        id: 'firstG',
        label: 'Greatest load on the first stage',
        value: 4.5,
        unit: 'g',
        tolerance: 1,
        confidence: 'documented',
        source: `«Перегрузки были слабые, ниже пяти» (${REPORT}). By feel: 4.5 taken, 1 either way, as Vostok 2’s`,
      },
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 180_900,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 369 and Table IB: 180.9 km. NOT an independent check: the law is solved to put the cutoff level at the 183 km taken as asked for`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 231_100,
        unit: 'm',
        tolerance: 10_000,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 369 and Table IB: 231.1 km. The hard check of the type’s stages, as Vostok 1’s`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64.95,
        unit: 'deg',
        tolerance: 0.05,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 369 and Table IB: 64.95°. On Vostok 1’s aiming azimuth (assumed), so it checks that the two orbits’ planes were alike`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 88.3 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${TASS}: 88.3 min at liftoff and at 22:00 on 16 June. 15 s is some 5 km on the semi-major axis`,
      },
    ],
  }),
  orbit: {
    radius: derived(
      6_363_000,
      'not stated. The published heights and period agree by Kepler’s law only over a ball of 6,363 km (180.9 by 231.1 km with 88.3 min; μ 398,600 km³/s²), as Vostok 2’s do; over 6,371 km they give 88.5 min. With the period read as nodal (world/meanelements.ts) the period fixes the axis and this is not used',
    ),
    perigee: doc(
      180_900,
      `${SIDDIQI}, p. 369 and Table IB, "initial orbital parameters": 180.9 km. TASS at 22:00 on 16 June: 181 km (at liftoff: 183)`,
    ),
    apogee: doc(231_100, `${SIDDIQI}, p. 369 and Table IB: 231.1 km. TASS at 22:00: 231 km (at liftoff: 233)`),
    inclination: doc(64.95, `${SIDDIQI}, p. 369 and Table IB: 64.95°. TASS: «около 65 градусов»`),
    period: doc(
      88.3 * 60,
      `${TASS}: 88.3 min at liftoff and at 22:00 on 16 June, on the seventh orbit; RussianSpaceWeb’s table the same. To a tenth of a minute`,
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
  mass: doc(4_713, `${TABLE}: 4,713 kg, the lightest of the six`),
  retro: {
    on: derived(TDU + 3.7, 'the command (derived: mission.md) and Vostok 1’s 3.7 s to working mode'),
    off: derived(TDU + 3.7 + 39, `39 s of thrust: «/39 секунд ТДУ работала/» (${TYPESCRIPT}, p. 53)`),
    deltaV: assumed(
      136,
      'not found for this flight: the type’s integrator setting, 136 m/s (Chertok, vol. 3, p. 80, of Vostok 1), taken for this ship. 1,614 kgf for 39 s on 4.7 t would give 132',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'documented',
      source: `the type’s solar orientation (Vostoks 1 and 2): «Еще в тени Земли включилась солнечная ориентация» (${REPORT})`,
    },
  },
  entry: {
    separation: derived(TDU + 3.7 + 39 + 10, `ten seconds after the burn: «Через 10 секунд произошло разделение» (${TYPESCRIPT}, p. 53)`),
    mass: ENTRY_MASS,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: assumed(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961), taken for this ship: how the code of No. 8’s lock reached her, and what it was, is in no document read',
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: assumed(136, 'the type’s integrator setting (Chertok, vol. 3, p. 80)'),
    parting: PARTING,
    periods: [
      {
        from: doc(MSK(19, 7, 40), `${TRANSCRIPT}`),
        to: doc(MSK(19, 8, 5), `${TRANSCRIPT}`),
        what: 'Tereshkova’s orientation by hand on the last morning, after two that failed in pitch: the ship turned to the attitude for descent, engine first, in twenty minutes, and held fifteen',
      },
    ],
  },
  supplies: {
    days: doc(3, `${KAMANIN}, 4 June 1963: «женщины — до 3 суток»; the stores for up to three days (spacecraft.md)`),
    rarefied: RAREFIED,
  },
  ejection: {
    altitude: doc(
      6_500,
      `the design, in this flight’s own report: «Отстрел крышки люка. Высота 7000 м. Скорость 220 м/сек … Катапультирование космонавта. Высота 6500 м. Скорость 220 м/сек» (${SCHEME}). Not a measurement. The hatches are let go with her here, not 500 m before (mission.md)`,
    ),
  },
  heating: HEATING,
  descent: {
    ground: estimated(
      200,
      'not read: the landing place’s height. The steppe of the Altai krai round Bayevo lies some 150 to 250 m above the sea',
    ),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: derived(
          2_275,
          `the type’s 2,460 kg with its pilot aboard (${SIDDIQI}, p. 195) less her in her suit, 85 kg (estimated, below), and Vostok 1’s seat, 100 kg`,
        ),
        dragArea: MODULE_DRAG,
        chutes: MODULE_CHUTES,
      },
      {
        id: 'pilot',
        label: 'Tereshkova, on her seat and then under her canopy',
        mass: estimated(
          185,
          'she in her suit, 85 kg, and Vostok 1’s seat, 100 kg. Her weight was not found: the women were chosen at no more than 70 kg (1962); 62 kg taken, and the suit’s 23 kg with its kit (Abramov and Skoog)',
        ),
        dragArea: SEATED_DRAG,
        thrown: THROWN,
        chutes: [
          SEAT_CHUTE,
          mainCanopy(
            measure(
              4_000,
              'documented',
              `the design: «Введение автоматической системы приземления. Высота 4000 м» (${SCHEME}); the type’s 4 km (${BOBKOV})`,
            ),
            estimated(128, 'she in her suit, 85 kg (estimated, above), and Vostok 1’s survival pack, 43 kg'),
          ),
        ],
      },
      ...HATCHES,
    ],
    automatic:
      'Tereshkova had no say in the descent but the orientation she gave beforehand by hand: the burn by the automatic programme on the ground’s command, the modules’ parting, the hatches, the seat and every parachute were the automatic system’s. She reported each by the telegraph key, and the ground heard none of it',
    torn: TORN,
    // (in her words: the verdict and the deck speak of whoever rode it as the flight's data does)
    crew: { ...CREW, words: { who: 'She', they: 'she', their: 'her', many: false } },
    checks: [
      {
        id: 'pilot.at',
        label: 'Tereshkova on the ground',
        value: MSK(19, 11, 20),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${TASS}: 11:20, to the minute. Independent of the burn’s instant, which is derived from the cycle’s command`,
      },
      {
        id: 'module.at',
        label: 'Descent module on the ground',
        value: MSK(19, 11, 13),
        unit: 's',
        tolerance: 300,
        confidence: 'derived',
        source:
          'between 11:10:40 (the record’s time as Siddiqi reads it, the ball’s landing) and about 11:16 (the same time read as her leaving the ship, and the type’s six minutes to the ground from 7 km)',
      },
      {
        id: 'apart',
        label: 'The two landings apart',
        value: 400,
        unit: 'm',
        tolerance: 3_000,
        confidence: 'documented',
        source: '«В 400 метрах от меня находился корабль» (her report). No wind is flown: the distance is mostly the wind’s, as Vostok 1’s',
      },
    ],
  },
  landing: {
    latitude: doc(
      53 + 16 / 60 + 18 / 3600,
      'spacefacts.de and RussianSpaceWeb: 53°16′18″ N; McDowell to a hundredth of a degree. No survey is stated',
    ),
    longitude: doc(
      80 + 27 / 60 + 34 / 3600,
      'spacefacts.de and RussianSpaceWeb: 80°27′34″ E. The roadside monument near Bayevo is 23 km away, at 53.209° N 80.804° E',
    ),
    at: doc(MSK(19, 11, 20), `${TASS}: 11:20`),
    near: 'Bayevo',
  },
  checks: [
    {
      id: 'period',
      label: 'Period, node to node, of the orbit begun',
      value: 88.3 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${TASS}: 88.3 min. NOT independent: the published orbit is read as mean elements with this nodal period`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 231_100,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${SIDDIQI}, p. 369: 231.1 km`,
    },
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 8,
      unit: 'g',
      tolerance: 2,
      confidence: 'documented',
      source: `«Перегрузки — не более 8» (${REPORT}): by feel, and at most`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source:
        'spacefacts.de: 53°16′18″ N 80°27′34″ E. The plane is flown from an assumed azimuth; no wind on the parachutes. Independent of the burn’s instant',
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source: `spacefacts.de. Independent of the landing’s time (the burn is from the cycle’s command). Both ships landed «на два градуса севернее расчетной точки» (${KAMANIN}, 19 June): the record’s own aim missed by some 220 km along the track`,
    },
    // TASS's orbit announced at 15:00 on 18 June, two days on (T+50.5 h), read as the published orbit is: mean elements over
    // its ball. Tolerances as every Vostok's apogee check (5 km) and to a tenth of a minute (6 s); set after the physics
    // agent's probe of these instants had been seen (176.5 by 220.6 km, 88.15 min), which is said here
    ...(['perigee', 'apogee', 'period'] as const).map((field) => ({
      id: `tass18.${field}` as const,
      label: `${field === 'period' ? 'Period' : field === 'perigee' ? 'Perigee' : 'Apogee'} at 15:00 on 18 June, two days on`,
      value: field === 'perigee' ? 174_000 : field === 'apogee' ? 218_000 : 88.1 * 60,
      unit: field === 'period' ? 's' : 'm',
      tolerance: field === 'period' ? 6 : 5_000,
      confidence: 'documented' as const,
      source: `${TASS}: «Заря Востока», 19 June 1963, the orbit at 15:00 Moscow time on 18 June: 174 by 218 km, 88.1 min. Its ball not stated: taken as the published orbit’s`,
      at: MSK(18, 15, 0),
    })),
  ],
};
