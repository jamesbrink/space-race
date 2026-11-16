/**
 * Vostok 4 as an orbital flight: its record (vostok-record.ts `VostokRecord`), which `flight.ts` writes its plan from (vostok-plan.ts). The record with its
 * sources and disagreements is set out in mission.md beside this file; the numbers live here. The launch vehicle and the
 * ship are the type's (vehicles/vostok-8k72k.ts, vehicles/vostok-3ka.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 11:02:33 Moscow time on
 * 12 August 1962 (08:02:33 UTC). The checks were written before this record was flown (the commit that added them flew
 * nothing), from how well each figure is known.
 *
 * **No document of this ascent has been found**: Kamanin says only that it differed little from Vostok 3's. Every instant
 * of it is the type's, as Vostok 1's record flies it, labelled `estimated`. **The braking burn's instant is derived** from
 * the pilot's landing (mission.md, "The braking burn"): its minute was not found, nor its length.
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

/** Seconds from liftoff, 11:02:33 Moscow time on 12 August 1962, of a Moscow time on day `d` of that August. */
export const MSK = (d: number, h: number, min: number, s = 0): number => ((d - 12) * 24 + h - 11) * 3600 + (min - 2) * 60 + (s - 33);

const KAMANIN = 'Kamanin’s diary («Скрытый космос», book 1, 1962)';
const TABLE = `${SIDDIQI}, Table IB`;
const FLIGHT =
  'TASS, as of 12:12 Moscow time on 12 August 1962, in Flight International, 23 August 1962, pp. 288 to 289 (as read for docs/sources.md)';
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110)';
const BSE = 'the Great Soviet Encyclopedia, 3rd edition, «Восток (космический корабль)»';
/** The type's ascent as Vostok 1's record flies it: the words for an instant this flight's record does not give. */
const TYPE = (what: string) =>
  `NOT this flight’s: no cyclogram, flight task or range report of E103-22 has been found. The type’s ${what}, as Vostok 1’s record flies it (vostok-1/orbital.ts)`;

/**
 * The braking engine's command, derived (mission.md, "The braking burn"): the pilot's landing at 09:59:00 on 15 August
 * less Vostok 1's 27.9 minutes from its command (10:25:04) to its pilot on the ground (10:53). Everything about the burn is timed from it.
 */
const TDU = MSK(15, 9, 59) - 27.9 * 60;

export const orbital: VostokRecord = {
  liftoffMass: estimated(
    287_000,
    `${TYPE('liftoff mass')}: 287 t (RKK Energia 1946–1996; Minakov). This vehicle’s own was not found; its spacecraft was 3 kg heavier than Vostok 1’s`,
  ),
  stages: stages8K72K({
    boosters: {
      cutoff: estimated(119.5, `${TYPE('strap-ons’ integrator command')}: 119.50 s flown`),
      separation: estimated(119.5, TYPE('strap-ons’ separation, with their cutoff')),
      throttle: strapOnThrottle(119.5),
    },
    core: {
      cutoff: estimated(300, TYPE('core cutoff')),
      separation: estimated(300, TYPE('core’s separation, with the third stage’s fire through the lattice')),
      throttle: coreThrottle(300),
    },
    third: {
      ignition: estimated(300, TYPE('third stage’s start')),
      cutoff: estimated(
        677.08,
        `${TYPE('third stage’s cutoff')}: 677.08 s flown. Kamanin: the launch «мало чем отличались» from Vostok 3’s (14 August), whose end the bunker counted at 687 s. Cut here on its integrator (below), so this is a result`,
      ),
      separation: estimated(687.08, 'ten seconds after the cutoff, the type’s (Titov’s, on Vostok 2): not recorded for this flight'),
      velocity: {
        apparent: true,
        speed: estimated(
          2_283.52,
          'm/s of apparent velocity: Vostok 1’s flight task’s setting for its third stage (the 2011 documents). NOT this flight’s: E103-22’s flight task is not published',
        ),
      },
    },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(0, `${SIDDIQI}, p. 357 and Table IA: 1102:33 Moscow time; Keldysh, 21 August 1962: 11:02`),
      also: `11:08 (${KAMANIN}, 14 August), against his own record of Nikolayev’s report («в 11:03 ... взлета корабля не видел») and every other source; 08:02:17 UTC (McDowell)`,
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: estimated(119.5, TYPE('strap-ons’ separation')) },
    { id: 'fairing', label: 'Fairing jettisoned', at: estimated(154.6, TYPE('fairing’s jettison')) },
    {
      id: 'core-main-off',
      label: 'Core’s main chambers off: its steering chambers alone',
      at: estimated(290, TYPE('core’s preliminary command')),
    },
    { id: 'third', label: 'Third stage alight; the core cut loose', at: estimated(300, TYPE('third stage’s start')) },
    { id: 'third-stage-off', label: 'Third stage cut off: in orbit', at: estimated(677.08, TYPE('third stage’s cutoff')) },
    {
      id: 'spacecraft-separates',
      label: 'Spacecraft separates; antennas out',
      at: estimated(687.08, 'ten seconds after the cutoff, the type’s: not recorded for this flight'),
    },
    { id: 'sleep', label: 'He goes to sleep', at: doc(MSK(12, 21, 30), `${FLIGHT}: 21:30`) },
    { id: 'wake', label: 'He is woken', at: doc(MSK(13, 4, 53), `${KAMANIN}, 13 August: «Поповича разбудили в 4:53»`) },
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
      label: 'Braking engine commanded on, on the 49th orbit',
      at: derived(
        TDU,
        `not found: the pilot’s landing at 09:59:00 (${TABLE}: 2 d 22 h 56 min 27 s) less Vostok 1’s 27.9 minutes from its command to its pilot on the ground (mission.md, "The braking burn"). That it was the 49th orbit: ${KAMANIN}, 14 August; within six minutes of Vostok 3’s: ${SIDDIQI}, p. 360`,
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
      at: estimated(
        TDU + 3.7 + 38.5,
        'not recorded for this flight: Vostok 1’s 38.5 s of thrust (its fuel pressure fell 42.2 s after the command: OKB-1’s report), put after this command',
      ),
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: estimated(
        TDU + 3.7 + 38.5 + PARTING.value,
        'not recorded: the type’s ten seconds after a burn the integrator ends (vostok-3ka.ts PARTING). Nothing read says the modules held together on this flight, nor that they did not',
      ),
    },
    {
      id: 'module-down',
      label: 'Descent module lands',
      at: doc(
        MSK(15, 9, 46, 33),
        `the ship’s 2 d 22 h 44 min: Glushko (ed.), «Космонавтика: энциклопедия» (1985), p. 66, as ${SIDDIQI} gives it (p. 360, n. 29). To the minute`,
      ),
    },
    {
      id: 'seat-ejected',
      label: 'Hatch No. 1 off and the seat out',
      at: estimated(
        MSK(15, 9, 47),
        'not recorded: the pilot’s landing at 09:59 less the twelve minutes Vostok 1’s pilot took from 7 km (10:42 to 10:53, to the minute); which puts it after the module’s landing in the record, as Vostok 3’s twelve minutes between them do (mission.md)',
      ),
      also: 'Popovich: «Катапультирование было плавное» (his report, Kamanin, 16 August)',
    },
    {
      id: 'pilot-down',
      label: 'Popovich lands',
      at: doc(MSK(15, 9, 59), `${TABLE}: 02:22:56:27; ${SIDDIQI}, p. 360: "a two-day, twenty-two-hour, fifty-seven-minute flight"`),
      also: '10:01 (the TASS message of 15 August, as Flight International printed it)',
    },
  ],
  ascent: ascent8K72K({
    guidance: {
      azimuth: estimated(
        34 + 37 / 60 + 59.2 / 3600,
        'Vostok 1’s aiming azimuth, 34°37′59″.2 (its flight task), for an orbit of the same inclination as this one’s 64.95°: E103-22’s flight task is not published',
      ),
      vertical: VERTICAL,
      kick: KICK,
      turn: estimated(119.5, 'the law changes at the strap-ons’ separation, the type’s 119.5 s'),
      target: {
        at: 'third-stage-off',
        altitude: assumed(
          180_000,
          'Vostok 2’s planned perigee, 180 km (the memorandum of 3 July 1961, «Первый пилотируемый полёт», 2011, book 2, doc. 184, p. 153), taken as the height the design put the last cutoff at: this flight’s plan was not read',
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(64.95, `${TABLE} and p. 357: 64.95°. TASS: 64°57′`),
      },
    },
    boostersGo: estimated(119.5, TYPE('strap-ons’ separation')),
    lastCutoff: estimated(677.08, TYPE('third stage’s cutoff')),
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
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 179_800,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${TABLE}: 179.8 km. NOT an independent check: the law is solved to put the cutoff level at the planned 180 km`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 236_700,
        unit: 'm',
        tolerance: 10_000,
        confidence: 'documented',
        source: `${TABLE}: 236.7 km. The hard check of the type’s stages, as Vostok 1’s, 2’s and 3’s`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64.95,
        unit: 'deg',
        tolerance: 0.05,
        confidence: 'documented',
        source: `${TABLE}: 64.95°. On Vostok 1’s aiming azimuth (estimated), so it checks that the two orbits’ planes were alike`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 88.3 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${FLIGHT}: 88.3 min. 15 s is some 5 km on the semi-major axis`,
      },
    ],
  }),
  orbit: {
    radius: estimated(
      6_371_000,
      'not stated, and not used: with a period given, the period fixes the axis and the ball the heights are over is what is left (world/meanelements.ts). The mean Earth is written here',
    ),
    perigee: doc(179_800, `${TABLE} and p. 357: 179.8 km; ${BSE}: «высота перигея 179,8 км». TASS of 12 August (12:12): 177.9 km`),
    apogee: doc(236_700, `${TABLE} and p. 357: 236.7 km; ${BSE}: «236,7 км». TASS of 12 August: 234.8 km`),
    inclination: doc(64.95, `${TABLE}: 64.95°; TASS: 64°57′`),
    period: doc(
      88.3 * 60,
      `${FLIGHT}: 88.3 min, the only period published of this ship, determined within its first hour and a half. Russian Wikipedia’s box repeats Vostok 3’s 88.33; Siddiqi gives none (mission.md, "The orbit")`,
    ),
  },
  injection: {
    at: estimated(677.08, `${TYPE('third stage’s cutoff')}. The orbit is taken to begin here`),
    heading: 'north',
    arc: estimated(
      27.5,
      'NOT documented: Vostok 1’s reckoning of where its cutoff was, 27.5 degrees of arc downrange, for the same vehicle on the same plane. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as Vostok 1’s'),
  },
  mass: doc(4_728, `${TABLE}: 4,728 kg. Not given out at the time: "about five tons" (Keldysh and Popovich, 21 August 1962)`),
  retro: {
    on: derived(TDU + 3.7, 'the command (derived from the landing: mission.md) and the type’s 3.7 s to working mode'),
    off: estimated(TDU + 3.7 + 38.5, 'Vostok 1’s 38.5 s of thrust: Popovich’s burn is not timed in anything read'),
    deltaV: estimated(136, 'not found for this flight: the type’s integrator setting, 136 m/s (Chertok, vol. 3, p. 80, of Vostok 1)'),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'estimated',
      source: 'the type’s: the braking engine’s axis put on the Sun, as Vostok 2’s programme has it. Not stated for this flight',
    },
  },
  entry: {
    separation: estimated(TDU + 3.7 + 38.5 + PARTING.value, 'not recorded: the type’s ten seconds after the burn (vostok-3ka.ts PARTING)'),
    mass: ENTRY_MASS,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: estimated(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961). This ship’s code is in nothing read: he oriented the ship by hand in the Earth’s shadow (his report)',
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
  ejection: { altitude: estimated(7_000, `the type’s barometric switch, about 7 km (${BOBKOV}; ${ZAK}): Popovich gives no height`) },
  heating: HEATING,
  descent: {
    ground: derived(
      600,
      'the landing place’s height: SRTM (90 m) at the two places printed for it, 601 m at 48°09′ N 71°51′ E (Russian Wikipedia) and 592 m at 48°10′ N 71°53′30″ E (spacefacts.de)',
    ),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: estimated(
          2_272,
          `the 2,460 kg of the module with its pilot aboard (${SIDDIQI}, p. 195) less a pilot in his suit and a seat, as Vostok 1’s (88 and 100 kg): Popovich’s own mass was not read`,
        ),
        dragArea: MODULE_DRAG,
        chutes: MODULE_CHUTES,
      },
      {
        id: 'pilot',
        label: 'Popovich, on his seat and then under his canopy',
        mass: estimated(188, 'he in his suit and his seat, as Vostok 1’s: not found'),
        dragArea: SEATED_DRAG,
        thrown: THROWN,
        // no reserve: «После открытия основного парашюта зачековал запасной, как и Николаев» (his report, Kamanin, 16 August 1962)
        chutes: [
          SEAT_CHUTE,
          mainCanopy(
            assumed(4_000, `the type’s: at 4 km, as he leaves the seat (${BOBKOV}). Popovich gives no height`),
            estimated(131, 'he in his suit with the survival pack, as Vostok 1’s (88 and 43 kg)'),
          ),
        ],
      },
      ...HATCHES,
    ],
    automatic:
      'Popovich had no say in the descent but his reserve canopy, which he locked once the main had opened, as Nikolayev had: the burn, the modules’ parting, the hatches, the seat and the main canopy were the automatic system’s',
    torn: TORN,
    crew: CREW,
    checks: [
      {
        id: 'pilot.at',
        label: 'Popovich on the ground',
        value: MSK(15, 9, 59),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${TABLE}: 2 d 22 h 56 min 27 s; TASS on the day: 10:01`,
      },
      {
        id: 'module.at',
        label: 'Descent module on the ground',
        value: MSK(15, 9, 46, 33),
        unit: 's',
        tolerance: 90,
        confidence: 'documented',
        source: 'Glushko (1985), p. 66, through Siddiqi (p. 360, n. 29): 2 d 22 h 44 min, to the minute',
      },
    ],
  },
  landing: {
    latitude: doc(
      48 + 9 / 60,
      `Russian Wikipedia, «Восток-4»: 48°09′ N, a published figure of unknown origin (spacefacts.de, also unsourced: 48°10′00″, "193 km south-west of Karaganda"). ${BSE}: «в районе посёлка Атасу Карагандинской области»`,
    ),
    longitude: doc(71 + 51 / 60, 'Russian Wikipedia: 71°51′ E, a published figure of unknown origin (spacefacts.de: 71°53′30″)'),
    at: doc(MSK(15, 9, 59), TABLE),
    near: 'Karaganda',
  },
  checks: [
    {
      id: 'period',
      label: 'Period, node to node, of the orbit begun',
      value: 88.3 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${FLIGHT}: 88.3 min. NOT independent: the published orbit is read as mean elements with this nodal period`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 236_700,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${TABLE}: 236.7 km`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source:
        'Russian Wikipedia: 48°09′ N 71°51′ E (spacefacts.de 3 km off it). The plane is flown from an estimated azimuth; no wind on the parachutes. Independent of the burn’s instant',
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source:
        'Russian Wikipedia: 48°09′ N 71°51′ E. Not wholly independent: the burn’s instant is derived from the pilot’s landing time (mission.md), though not from this place',
    },
  ],
};

/**
 * Where the two ships of the group flight were nearest, as published: a check of the two records' orbits together, flown
 * in tests/group.test.mjs from Vostok 3's coast and this one's (a run of its own, `group`, in src/sim/misses.ts). Set
 * before the two were flown together.
 */
export const NEAREST_VOSTOK_3 = {
  id: 'closest',
  label: 'Nearest to Vostok 3, in the first revolutions',
  value: 6_500,
  unit: 'm',
  tolerance: 1_500,
  confidence: 'documented' as const,
  source: `"approximately 6.5 km" (TASS, as the encyclopedias repeat it; English Wikipedia, citing Gatland, Manned Spacecraft); "about five kilometres" (both pilots, 21 August 1962); ${SIDDIQI}, p. 358, n. 22: "Reports differ as to the closest approach, varying from five to six and a half kilometers"; ${BSE}: «минимальное расстояние между кораблями около 5 км». 1.5 km either way takes in both`,
};
