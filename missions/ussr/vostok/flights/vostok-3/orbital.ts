/**
 * Vostok 3 as an orbital flight: its record (vostok-record.ts `VostokRecord`), which `flight.ts` writes its plan from (vostok-plan.ts). The record with its
 * sources and disagreements is set out in mission.md beside this file; the numbers live here. The launch vehicle and the
 * ship are the type's (vehicles/vostok-8k72k.ts, vehicles/vostok-3ka.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 11:30:00 Moscow time on
 * 11 August 1962 (08:30:00 UTC). The checks were written before this record was flown (the commit that added them flew
 * nothing), from how well each figure is known.
 *
 * **No document of this ascent has been found** but the two instants Kamanin heard counted in the bunker: the third stage's
 * cutoff at 687 s and the ship's separation at 720 s. Every other instant of the ascent is the type's, as Vostok 1's record
 * flies it, labelled `estimated` and not this flight's. **The braking burn's instant is derived** from the pilot's landing
 * (mission.md, "The braking burn"): its minute was not found.
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
import {
  ascent8K72K,
  BOBKOV,
  coreThrottle,
  KICK,
  SIDDIQI,
  stages8K72K,
  strapOnThrottle,
  VERTICAL,
  ZAK,
} from '../../vehicles/vostok-8k72k.ts';
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';

/** Seconds from liftoff, 11:30:00 Moscow time on 11 August 1962, of a Moscow time on day `d` of that August. */
export const MSK = (d: number, h: number, min: number, s = 0): number => ((d - 11) * 24 + h - 11) * 3600 + (min - 30) * 60 + s;

const KAMANIN = 'Kamanin’s diary («Скрытый космос», book 1, 1962)';
const TABLE = `${SIDDIQI}, Table IB`;
const BSE = 'the Great Soviet Encyclopedia, 3rd edition, «Восток (космический корабль)»';
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110)';
/** The type's ascent as Vostok 1's record flies it: the words for an instant this flight's record does not give. */
const TYPE = (what: string) =>
  `NOT this flight’s: no cyclogram, flight task or range report of E103-23 has been found. The type’s ${what}, as Vostok 1’s record flies it (vostok-1/orbital.ts)`;

/**
 * The braking engine's command, derived (mission.md, "The braking burn"): the pilot's landing at 09:52 on 15 August less
 * Vostok 1's 27.9 minutes from its command (10:25:04) to its pilot on the ground (10:53). Everything about the burn is timed from it.
 */
const TDU = MSK(15, 9, 52) - 27.9 * 60;

export const orbital: VostokRecord = {
  liftoffMass: estimated(
    287_000,
    `${TYPE('liftoff mass')}: 287 t (RKK Energia 1946–1996; Minakov). This vehicle’s own was not found; its spacecraft was 3 kg lighter than Vostok 1’s`,
  ),
  stages: stages8K72K({
    boosters: {
      cutoff: estimated(
        119.5,
        `${TYPE('strap-ons’ integrator command')}: 119.50 s flown. Nikolayev: «Отделение ступеней заметно по спаду перегрузок» (${KAMANIN}, 16 August, his report)`,
      ),
      separation: estimated(119.5, TYPE('strap-ons’ separation, with their cutoff')),
      throttle: strapOnThrottle(119.5),
    },
    core: {
      cutoff: estimated(
        300,
        `${TYPE('core cutoff')}. Nikolayev: the vibration «усиливаются в конце работы 2-й ступени носителя» (${KAMANIN}, 16 August)`,
      ),
      separation: estimated(300, TYPE('core’s separation, with the third stage’s fire through the lattice')),
      throttle: coreThrottle(300),
    },
    third: {
      ignition: estimated(300, TYPE('third stage’s start')),
      cutoff: doc(
        687,
        `${KAMANIN}, 14 August: «все ждали отсчета 687 ... Нормальная работа всех агрегатов ракеты до 687-й секунды означала выход третьей ступени и корабля на орбиту»; ${SIDDIQI}, p. 356: "At T+687 seconds ... successfully inserted into orbit". The count the bunker waited for, so the planned instant, to the second. Cut here on its integrator (below), so this is a check`,
      ),
      separation: doc(
        720,
        `${KAMANIN}, 14 August: «На 720-й секунде произошло отделение корабля от носителя и „Восток-3“, расправив свои антенны ...»`,
      ),
      velocity: {
        apparent: true,
        speed: estimated(
          2_283.52,
          'm/s of apparent velocity: Vostok 1’s flight task’s setting for its third stage (the 2011 documents), for an orbit of 180 km perigee. NOT this flight’s: E103-23’s flight task is not published',
        ),
      },
    },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(
        0,
        `${KAMANIN}, 14 August: «старт Николаева — 11 августа в 11:30 по московскому времени ... назначенные сроки пусков были выдержаны с точностью до 0,5 секунды»; ${SIDDIQI}, p. 356 and Table IA: 1130`,
      ),
    },
    {
      id: 'strap-ons-off',
      label: 'The four strap-ons separate',
      at: estimated(119.5, TYPE('strap-ons’ separation')),
      also: 'Nikolayev: each stage’s parting felt as the load fell',
    },
    { id: 'fairing', label: 'Fairing jettisoned', at: estimated(154.6, TYPE('fairing’s jettison')) },
    {
      id: 'core-main-off',
      label: 'Core’s main chambers off: its steering chambers alone',
      at: estimated(290, TYPE('core’s preliminary command')),
    },
    { id: 'third', label: 'Third stage alight; the core cut loose', at: estimated(300, TYPE('third stage’s start')) },
    {
      id: 'third-stage-off',
      label: 'Third stage cut off: in orbit',
      at: doc(687, `${KAMANIN}, 14 August: the count of 687 the bunker waited for; ${SIDDIQI}, p. 356`),
      also: 'Nikolayev: «Слышно окончание работы 3-й ступени»',
    },
    {
      id: 'spacecraft-separates',
      label: 'Spacecraft separates; antennas out',
      at: doc(720, `${KAMANIN}, 14 August`),
      also: 'Nikolayev: «и отделение (толчком) от носителя»',
    },
    {
      id: 'sleep',
      label: 'He goes to sleep',
      at: doc(MSK(11, 22, 0), `${SIDDIQI}, p. 357: "he went to sleep at 2200 hours"`),
    },
    {
      id: 'oriented-for-vostok-4',
      label: 'Oriented by hand to watch for Vostok 4’s launch',
      at: derived(
        MSK(12, 10, 47, 33),
        `fifteen minutes before Vostok 4’s liftoff at 11:02:33 (${SIDDIQI}, p. 357): «За 15 минут до старта Поповича я сориентировал корабль» (Nikolayev’s report, ${KAMANIN}, 16 August)`,
      ),
    },
    {
      id: 'vostok-4-liftoff',
      label: 'Vostok 4 lifts off from the same pad below',
      at: doc(MSK(12, 11, 2, 33), `${SIDDIQI}, p. 357 and Table IA: 1102:33 Moscow time on 12 August`),
      also: `11:08 (${KAMANIN}, 14 August), against his own record of Nikolayev’s report and every other source`,
    },
    {
      id: 'pitched-73',
      label: 'Pitched 73 degrees, looking for the launch: nothing seen',
      at: doc(
        MSK(12, 11, 3),
        `«в 11:03 угол наклона корабля составил 73 градуса. Смотрел, но взлета корабля не видел» (Nikolayev’s report, ${KAMANIN}, 16 August)`,
      ),
    },
    {
      id: 'wake',
      label: 'He wakes by himself',
      at: doc(MSK(13, 4, 40), `${KAMANIN}, 13 August: «Николаев проснулся сам в 4:40»`),
    },
    {
      id: 'sun-orientation',
      label: 'Solar orientation on',
      at: estimated(
        TDU - 35 * 60,
        'the type’s cycle: 35 minutes before the burn, as Vostok 1’s (09:50 for 10:25). Not recorded for this flight',
      ),
    },
    {
      id: 'retro-command',
      label: 'Braking engine commanded on, on the 65th orbit',
      at: derived(
        TDU,
        `not found: the pilot’s landing at 09:52 (${TABLE}: 3 d 22 h 22 min) less Vostok 1’s 27.9 minutes from its command to its pilot on the ground (mission.md, "The braking burn"). That it was the 65th orbit: ${KAMANIN}, 14 August`,
      ),
    },
    {
      id: 'retro-on',
      label: 'Braking engine at thrust',
      at: derived(TDU + 3.7, 'the command and the type’s 3.7 s to working mode (Vostok 1’s OKB-1 report)'),
    },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      at: derived(
        TDU + 3.7 + 42,
        `forty-two seconds by ear: «При включении ТДУ ощущался толчок и была слышна в течение 42-х секунд ее работа» (Nikolayev’s report, ${KAMANIN}, 16 August)`,
      ),
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: estimated(
        TDU + 3.7 + 42 + PARTING.value,
        'not recorded: the type’s ten seconds after a burn the integrator ends (vostok-3ka.ts PARTING). Nothing read says the modules held together on this flight, nor that they did not',
      ),
    },
    {
      id: 'seat-ejected',
      label: 'Hatch No. 1 off and the seat out',
      at: estimated(
        MSK(15, 9, 34),
        'not recorded: the module’s landing at 09:39:59 less the six minutes Vostok 1’s module took from 7 km (10:42 to 10:48)',
      ),
    },
    {
      id: 'module-down',
      label: 'Descent module lands',
      at: doc(
        MSK(15, 9, 39, 59),
        `the ship’s 3 d 22 h 9 min 59 s: Glushko (ed.), «Космонавтика: энциклопедия» (1985), p. 66, as ${SIDDIQI} gives it (p. 360, n. 29)`,
      ),
    },
    {
      id: 'pilot-down',
      label: 'Nikolayev lands',
      at: doc(MSK(15, 9, 52), `${TABLE}: 03:22:22; ${SIDDIQI}, p. 360: "a three-day, twenty-two-hour, twenty-two-minute flight"`),
      also: '09:55 (the TASS message of 15 August, as Flight International printed it)',
    },
  ],
  ascent: ascent8K72K({
    guidance: {
      azimuth: estimated(
        34 + 37 / 60 + 59.2 / 3600,
        'Vostok 1’s aiming azimuth, 34°37′59″.2 (its flight task), for an orbit inclined two minutes of arc less than this one’s 64.98°: E103-23’s flight task is not published',
      ),
      vertical: VERTICAL,
      kick: KICK,
      turn: estimated(119.5, 'the law changes at the strap-ons’ separation, the type’s 119.5 s'),
      target: {
        at: 'third-stage-off',
        altitude: assumed(
          180_000,
          `Vostok 2’s planned perigee, 180 km (the memorandum of 3 July 1961, «Первый пилотируемый полёт», 2011, book 2, doc. 184, p. 153), taken as the height the design put the last cutoff at: this flight’s plan was not read. ${SIDDIQI}, p. 356, calls its 180.7 km perigee "nominal"`,
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(64.98, `${TABLE} and p. 356: 64.98°. TASS of 12 August: 64°59′`),
      },
    },
    boostersGo: estimated(119.5, TYPE('strap-ons’ separation')),
    lastCutoff: doc(687, `${KAMANIN}, 14 August; ${SIDDIQI}, p. 356`),
    fairing: estimated(154.6, TYPE('fairing’s jettison')),
    left: {
      booster: derived(5_283, '3,750 kg dry (Minakov; Astronautix 3,710) and the 1,533 kg the ascent flown leaves in each'),
      core: derived(
        11_320,
        'its 100.4 t fuelled less the 89.08 t the ascent flown burns: what the record’s figures leave (6.8 t dry, Astronautix)',
      ),
      blockE: derived(1_518, '1,472 kg burnt out (Minakov) and the 46 kg the ascent flown leaves'),
    },
    checks: [
      {
        id: 'cutoffAt',
        label: 'Third stage cut off',
        value: 687,
        unit: 's',
        tolerance: 3,
        confidence: 'documented',
        source: `${KAMANIN}, 14 August: the count of 687; ${SIDDIQI}, p. 356. The planned instant, to the second: 3 s either way for the day’s own`,
      },
      {
        id: 'firstG',
        label: 'Greatest load going up',
        value: 6.5,
        unit: 'g',
        tolerance: 1,
        confidence: 'documented',
        source: `«Максимальные перегрузки достигали 6–7 единиц» (Nikolayev’s report, ${KAMANIN}, 16 August). By feel, and where in the ascent is not said: read on the first stage, where Titov felt his greatest (Vostok 2’s check), the type’s other stages giving less`,
      },
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 180_700,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}: 180.7 km. NOT an independent check: the law is solved to put the cutoff level at the planned 180 km`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 234_600,
        unit: 'm',
        tolerance: 10_000,
        confidence: 'documented',
        source: `${TABLE}: 234.6 km. The hard check of the type’s stages, as Vostok 1’s and 2’s`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64.98,
        unit: 'deg',
        tolerance: 0.05,
        confidence: 'documented',
        source: `${TABLE}: 64.98°. On Vostok 1’s aiming azimuth (estimated), so it checks that the two orbits’ planes were alike`,
      },
    ],
  }),
  orbit: {
    perigee: doc(
      180_700,
      `${TABLE} and p. 356: 180.7 km, "nominal"; ${BSE}: «высота перигея 180,7 км». Announced on 21 August: 183 km; TASS of 12 August (12:12): 176.7 km`,
    ),
    apogee: doc(234_600, `${TABLE} and p. 356: 234.6 km; ${BSE}: «234,6 км». Announced: 251 km; TASS of 12 August: 227.6 km`),
    inclination: doc(64.98, `${TABLE}: 64.98°. Announced: 65°; TASS: 64°59′`),
    // (no period: none published with these heights has a traceable source. The orbit's axis is the heights' mean over
    // the ellipsoid under the apsis (orbital.ts `heightsBall`), and its period the mean orbit's, derived: mission.md, "The
    // orbit", has every value found)
  },
  injection: {
    at: doc(687, `${KAMANIN}, 14 August; ${SIDDIQI}, p. 356: the orbit is taken to begin at the third stage’s cutoff`),
    heading: 'north',
    arc: estimated(
      27.5,
      'NOT documented: Vostok 1’s reckoning of where its cutoff was, 27.5 degrees of arc downrange, for the same vehicle on the same plane. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as Vostok 1’s'),
  },
  mass: doc(4_722, `${TABLE}: 4,722 kg. Not given out at the time: "about five tons" (Keldysh and Popovich, 21 August 1962)`),
  retro: {
    on: derived(TDU + 3.7, 'the command (derived from the landing: mission.md) and the type’s 3.7 s to working mode'),
    off: derived(
      TDU + 3.7 + 42,
      `forty-two seconds of thrust by ear (Nikolayev’s report, ${KAMANIN}, 16 August); what shut it down is not stated`,
    ),
    deltaV: estimated(
      136,
      'not found for this flight: the type’s integrator setting, 136 m/s (Chertok, vol. 3, p. 80, of Vostok 1). 1,614 kgf for 42 s on 4.7 t would give 142',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'estimated',
      source: 'the type’s: the braking engine’s axis put on the Sun, as Vostok 2’s programme has it. Not stated for this flight',
    },
  },
  entry: {
    separation: estimated(TDU + 3.7 + 42 + PARTING.value, 'not recorded: the type’s ten seconds after the burn (vostok-3ka.ts PARTING)'),
    mass: ENTRY_MASS,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: estimated(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961). This ship’s code, and how it reached him, are in nothing read: he oriented the ship by hand more than once (his report)',
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: estimated(136, 'the type’s integrator setting (Chertok, vol. 3, p. 80)'),
    parting: PARTING,
  },
  supplies: {
    days: doc(
      10,
      `${CHERTOK}, p. 205, of both ships: power «for a flight duration of up to seven days, and in an energy-conserving mode, up to 10 days»; Bushuyev: a double margin in life support`,
    ),
    rarefied: RAREFIED,
  },
  ejection: { altitude: estimated(7_000, `the type’s barometric switch, about 7 km (${BOBKOV}; ${ZAK}): Nikolayev gives no height`) },
  heating: HEATING,
  descent: {
    ground: derived(
      720,
      'the landing place’s height: SRTM (90 m) at the two places printed for it, 738 m at 48°02′ N 75°45′ E (Russian Wikipedia) and 693 m at 48°03′32″ N 75°41′02″ E (spacefacts.de), the uplands south of Karkaraly',
    ),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: estimated(
          2_272,
          `the 2,460 kg of the module with its pilot aboard (${SIDDIQI}, p. 195) less a pilot in his suit and a seat, as Vostok 1’s (88 and 100 kg): Nikolayev’s own mass was not read`,
        ),
        dragArea: MODULE_DRAG,
        chutes: MODULE_CHUTES,
      },
      {
        id: 'pilot',
        label: 'Nikolayev, on his seat and then under his canopy',
        mass: estimated(188, 'he in his suit and his seat, as Vostok 1’s: not found'),
        dragArea: SEATED_DRAG,
        thrown: THROWN,
        // no reserve: «После открытия основного парашюта зачековал запасной, как и Николаев» (Popovich's report, Kamanin, 16 August 1962)
        chutes: [
          SEAT_CHUTE,
          mainCanopy(
            assumed(4_000, `the type’s: at 4 km, as he leaves the seat (${BOBKOV}). Nikolayev gives no height`),
            estimated(131, 'he in his suit with the survival pack, as Vostok 1’s (88 and 43 kg)'),
          ),
        ],
      },
      ...HATCHES,
    ],
    automatic:
      'Nikolayev had no say in the descent but his reserve canopy, which he locked once the main had opened: the burn, the modules’ parting, the hatches, the seat and the main canopy were the automatic system’s',
    torn: TORN,
    crew: CREW,
    lands: { on: 'land', ship: 'the descent module' },
    checks: [
      {
        id: 'pilot.at',
        label: 'Nikolayev on the ground',
        value: MSK(15, 9, 52),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${TABLE}: 3 d 22 h 22 min, to the minute; TASS on the day: 09:55`,
      },
      {
        id: 'module.at',
        label: 'Descent module on the ground',
        value: MSK(15, 9, 39, 59),
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: 'Glushko (1985), p. 66, through Siddiqi (p. 360, n. 29): 3 d 22 h 9 min 59 s, to the second',
      },
    ],
  },
  landing: {
    latitude: estimated(
      48 + 2 / 60,
      `Russian Wikipedia, «Восток-3»: 48°02′ N, a published figure of unknown origin (spacefacts.de, also unsourced: 48°03′32″). ${BSE}: «в районе г. Каркаралинск Карагандинской области»; the landing was planned «в районе Караганды» (${KAMANIN}, 14 August)`,
    ),
    longitude: estimated(75 + 45 / 60, 'Russian Wikipedia: 75°45′ E, a published figure of unknown origin (spacefacts.de: 75°41′02″)'),
    at: doc(MSK(15, 9, 52), TABLE),
    near: 'Karaganda',
  },
  checks: [
    {
      id: 'tass-12aug.perigee',
      label: 'Perigee at 12:12 on 12 August',
      value: 176_700,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `TASS, as of 12:12 Moscow time on 12 August 1962, in Flight International, 23 August 1962, pp. 288 to 289 (as read for docs/sources.md): 176.7 km. The orbit a day on, lower and faster by its decay: held at that instant, not flown from. TASS gives it to 0.1 km and 0.1 min, which would support 0.05 km and 3 s; the tolerance is wider for what the figures do not say, the ball its heights are over (Vostok 2's determined heights were over one 8 km smaller than the mean Earth) and how well a day's tracking fixed it. Read on the flight's ball (the ellipsoid under the injection's apsis, 6,361.1 km): TASS's own heights and period imply 6,359.5 km, 1.6 km under it (tests/apsis.test.mjs), so over the flight's ball TASS's heights would read 1.6 km lower; the ball is not changed for it`,
      at: MSK(12, 12, 12),
    },
    {
      id: 'tass-12aug.apogee',
      label: 'Apogee at 12:12 on 12 August',
      value: 227_600,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `TASS, as of 12:12 Moscow time on 12 August 1962, in Flight International, 23 August 1962, pp. 288 to 289 (as read for docs/sources.md): 227.6 km. The orbit a day on, lower and faster by its decay: held at that instant, not flown from. TASS gives it to 0.1 km and 0.1 min, which would support 0.05 km and 3 s; the tolerance is wider for what the figures do not say, the ball its heights are over (Vostok 2's determined heights were over one 8 km smaller than the mean Earth) and how well a day's tracking fixed it. Read on the flight's ball (the ellipsoid under the injection's apsis, 6,361.1 km): TASS's own heights and period imply 6,359.5 km, 1.6 km under it (tests/apsis.test.mjs), so over the flight's ball TASS's heights would read 1.6 km lower; the ball is not changed for it`,
      at: MSK(12, 12, 12),
    },
    {
      id: 'tass-12aug.period',
      label: 'Period at 12:12 on 12 August',
      value: 88.2 * 60,
      unit: 's',
      tolerance: 6,
      confidence: 'documented',
      source: `TASS, as of 12:12 Moscow time on 12 August 1962, in Flight International, 23 August 1962, pp. 288 to 289 (as read for docs/sources.md): 88.2 min, node to node as the convention reads it (world/meanelements.ts). 6 s is its last figure, a tenth of a minute`,
      at: MSK(12, 12, 12),
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 234_600,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${TABLE}: 234.6 km`,
    },
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 8.5,
      unit: 'g',
      tolerance: 2,
      confidence: 'documented',
      source: `«Перегрузки порядка 8–9 единиц я переносил лучше, чем на Земле» (Nikolayev’s report, ${KAMANIN}, 16 August). By feel`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 150_000,
      confidence: 'estimated',
      source:
        'Russian Wikipedia: 48°02′ N 75°45′ E, of unknown origin (spacefacts.de 5 km off it); the Great Soviet Encyclopedia gives only «в районе г. Каркаралинск», and the printed point lies 154 km south of the town: 150 km either way is what that region allows. The plane is flown from an estimated azimuth; no wind on the parachutes. Independent of the burn’s instant',
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 150_000,
      confidence: 'estimated',
      source:
        'Russian Wikipedia: 48°02′ N 75°45′ E, of unknown origin; the Great Soviet Encyclopedia gives only «в районе г. Каркаралинск», and the printed point lies 154 km south of the town: 150 km either way is what that region allows. Not wholly independent: the burn’s instant is derived from the pilot’s landing time (mission.md), though not from this place',
    },
  ],
};
