/**
 * Vostok 1 as an orbital flight: what `flight.ts` gives as `Flight.orbital` (src/sim/orbital.ts). The record with its
 * sources and disagreements is set out in mission.md beside this file; the numbers live here.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 09:06:59.7 Moscow time
 * (06:06:59.7 UTC). Nothing here was adjusted after the simulator was run: the checks' tolerances were written before
 * `flyOrbit` existed (the commit that added this file has no simulator in it).
 */

import type { OrbitalFlight } from '../../../../../src/sim/orbital.ts';
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
  reserveCanopy,
  SEAT_CHUTE,
  SEATED_DRAG,
  TDU_THRUST,
  THROWN,
  TORN,
} from '../../vehicles/vostok-3ka.ts';
import {
  ascent8K72K,
  BOBKOV,
  GCTC,
  KICK,
  NK,
  PPP,
  SIDDIQI,
  SOYUZ,
  SPUTNIK,
  stages8K72K,
  VERTICAL,
  ZAK,
} from '../../vehicles/vostok-8k72k.ts';
import { derived, doc, estimated, measure } from '../../../../../src/measure.ts';

/** Seconds from liftoff of a Moscow time on the morning of 12 April 1961. */
export const MSK = (h: number, min: number, s = 0): number => (h - 9) * 3600 + (min - 6) * 60 + (s - 59.7);

const OKB1 =
  'OKB-1, preliminary report of 3 May 1961 (Korolev, Bushuyev, Tikhonravov; RKK Energia archive 13029; Wilson Center record 260547)';
const GAGARIN = 'Gagarin’s report to the State Commission, 13 April 1961 (APRF f. 3, op. 47, d. 278; Wilson Center record 260544)';
const KAMANIN_LOCK =
  'Kamanin’s diary, 12 April 1961 (Skrytyi kosmos, book 1): «В 8 часов я вместе с ведущим инженером корабля на лифте поднялся к верху ракеты и проверил шифр (145) логического замка. Логический замок работал нормально.»';
const TASK =
  'Gagarin’s flight task, its three sheets (ЦА РКВ, ф. 19, оп. 114сс, д. 15, лл. 126–128), as the Ministry of Defence published them in 2021 («Покорители космоса», 60cosmonauts.mil.ru)';
const BATURIN =
  'Baturin (co-editor of the 2011 documents), «Подлинная история полета Гагарина», Novaya Gazeta, 12 April 2021: secondary, no footnotes';

/** The command to the braking engine (OKB-1: "the TDU was turned on at 1025:04.2"), which everything about the burn is timed from. */
const TDU = MSK(10, 25, 4.2);

export const orbital: OrbitalFlight = {
  liftoffMass: doc(
    287_000,
    `RKK Energia 1946–1996, of this flight: «со стартовой массой 287 т»; Minakov; Siddiqi. ${NK}, p. 9: «Масса заправленного изделия 8К72 с кораблем 3КА №3 составила 291 619 кг»: not flown yet, being 4.9 t more than the blocks' figures add to (mission.md, "The 2011 documents"). Also in print: 290.5 t (Zak), 291.15 t (Brügge), 281.4 t (Astronautix)`,
  ),
  stages: stages8K72K({
    boosters: {
      throttle: {
        points: [
          [0, 1],
          [113.1, 1],
          [113.11, 0.6],
          [119.5, 0.6],
        ],
        confidence: 'estimated',
        source:
          'The RD-107 goes from its main to its first intermediate stage of thrust before the strap-ons part, and the 8D74K shut down through it (lpre.de; RKK Energia 1946–1996; Minakov: «маршевые двигатели переводились на режим малой тяги»). ' +
          'Neither its level nor its length on the 8K72K was found. The level is the 8K71’s and 8A91’s, 60 per cent (590.0 of 972.3 kN: Energomash’s table as Brügge copies it, secondary); the length is Sputnik’s, ' +
          `6.4 s (the command at 109.94 s, separation at 116.38 s: ${SPUTNIK}), put before the 8K72K’s 119.5 s`,
      },
      cutoff: doc(
        119.5,
        `${PPP}, §4: «команда на разделение выдана интегратором на 119.50 секунде с её исполнением через 0.03 секунды». ${SIDDIQI}, p. 277, and ${ZAK}: 119 s. ` +
          'The engines were throttled to their first intermediate stage some seconds before (RKK Energia 1946–1996; on Sputnik’s 8K71PS 7.1 s before: ' +
          `${SPUTNIK}); the level of that stage has not been found, so it is not flown: rated thrust to the integrator’s command. Rated burns in print: 118 s (Minakov), 120.5 s (Brügge, computed)`,
      ),
      separation: doc(119.5, `${PPP}: the integrator’s command at 119.50 s. ${SIDDIQI}, p. 277; ${ZAK}: 119 s`),
    },
    core: {
      throttle: {
        points: [
          [0, 1],
          [290, 1],
          [290.01, 0.104],
          [300, 0.104],
        ],
        confidence: 'estimated',
        source:
          `When: the cyclogram's «Предварительная» to switch the core off at 305.74 s and «Главная» at 312.74 s, 7.00 s of final stage, and on the day the preliminary command carried out 0.51 s late (${NK}, p. 4): 306.25 s, derived. ` +
          'The main command and the separation were not recorded; the main is taken as late as the preliminary (313.25 s: estimated). ' +
          '«За несколько секунд до выключения двигателя РД-108 переводится на конечную ступень тяги, на которой работают только рулевые КС, и при том – на пониженном режиме» ' +
          '(lpre.de). Gagarin felt 10 to 15 s of weightlessness before the third stage lit, which the third stage’s ignition at 321.42 s explains. ' +
          'The level is not found: the four steering chambers at their rated 2.5 tf each (RKK Energia 1946–1996), 10 tf of the engine’s 96.4 in vacuum, 10.4 per cent, is the most it can be (“at a reduced setting”), and is taken; thrust and flow fall together here, which the steering chambers’ own lower impulse does not quite do',
      },
      cutoff: estimated(
        300,
        `the main command, which put out the steering chambers: planned at 312.74 s (the cyclogram, ${NK}, p. 4) and not recorded on the day; taken as late as the preliminary command was (0.51 s). ` +
          `«300 s» (${SIDDIQI}, p. 277) and 299 s (${ZAK}) are not the documents’ figures. The core reached 22.0 m/s over its design (NIIP-5’s report, ibid.): a result here, not an input`,
      ),
      separation: doc(
        300,
        `the third stage’s «Зажигание» at T+321.42 s (NIIP-5’s report, ${NK}, p. 4), whose fire through the lattice cuts the core loose: the separation itself was not recorded. The plan had the third stage started at 311.74 s, before the core’s main command; the 9.7 s between plan and record is not explained in anything read`,
      ),
    },
    third: {
      ignition: doc(
        300,
        `NIIP-5’s report: «Запуск “головной двигательной установки” 3-й ступени произошел в T+321.42 сек (команда “Зажигание”)» (${NK}, p. 4). The cyclogram had its start command at 311.74 s. Gagarin felt 10 to 15 s of weightlessness between the core and the third stage (${GAGARIN}), which this explains; “about 300 s” (${SIDDIQI}; ${ZAK}) is not the documents’ figure`,
      ),
      cutoff: doc(
        677.08,
        `NIIP-5’s report: shut down «через 677.08 сек после старта вместо 674.68 сек по циклограмме по команде от интегратора КИ22-8В-2 при наборе кажущейся скорости 2285.55 м/с и уровне перегрузки 0.92» (${NK}, p. 4). ${SIDDIQI}, p. 277: T+676 s. It burned long: a valve assembled wrongly (Siddiqi 2015)`,
      ),
      separation: doc(
        MSK(9, 18, 28),
        `${OKB1}: “separated from the booster at 0918:28”. ${ZAK} notes 09:18:07 from another source (Novosti Kosmonavtiki)`,
      ),
      // cut as its integrator cut it: at the speed the planned orbit needs, and the error the record gives for the day
      // cut as its integrator cut it: on the apparent velocity the flight task set for it
      velocity: {
        apparent: true,
        speed: doc(
          2_283.52,
          `«Установочное значение кажущейся скорости в момент выдачи главной команды на выключение двигателя III ступени ... 2283,52 м/сек»: ${TASK}, sheet 126, section VI, read off the 800 × 1,200 scan: 2,283.52 and not 2,263.52. ` +
            `On the day it cut at 2,285.55 m/s, 2.03 over its setting (NIIP-5’s report, ${NK}, p. 4): that is a result here. ` +
            'The apparent velocity is the sensed acceleration summed over Block E’s burn, taken from its ignition (from when is not on the page): not a speed in any frame. ' +
            'Baturin’s 25.43 m/s over the design (the core 0.46 s late, Block E 2.4 s long) is what the day made of it, a result here and not an input',
        ),
      },
    },
  }),
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${SIDDIQI}, launch log: 09:06:59.7 Moscow time. ${OKB1}: 0906:59`) },
    {
      id: 'boosters',
      label: 'The four strap-ons separate',
      at: doc(119.5, `${PPP}: the integrator’s command at 119.50 s, done 0.03 s later; Keldysh’s table: 09:08:59.2`),
      also: '119 s (Siddiqi, p. 277; Zak)',
    },
    {
      id: 'fairing',
      label: 'Fairing jettisoned',
      at: doc(154.6, `${PPP}: «Сброс головного обтекателя» 09:09:34.3`),
      also: '150 s (Gagarin: “At second 150 the fairing separated”, from memory the next day); 154 s (Zak); 156 s (the figure in Siddiqi). The radio guidance’s power failed at 156 s (Zak; Baturin)',
    },
    {
      id: 'core',
      label: 'Core’s main chambers off: its steering chambers alone',
      at: derived(
        306.25,
        `the preliminary command, planned at 305.74 s and carried out 0.51 s late: the «Наддув» command that starts the staging came from the integrator at 305.20 s, 0.46 s late, the radio system’s antennas having had no proper power since 156 s (a converter failed at 117 s): NIIP-5’s report (${NK}, p. 4)`,
      ),
      also: '300 s (Siddiqi, p. 277) and 299 s (Zak) are not the documents’ figures. The main command and the separation were not recorded; the core ended 22.0 m/s over its design. Chertok, vol. 3, p. 291: “shut down by a command from the autonomous system integrator, which had been set for a velocity exceeding the design velocity for the radio system”',
    },
    {
      id: 'third',
      label: 'Third stage alight; the core cut loose',
      at: doc(321.42, `NIIP-5’s report: «команда “Зажигание”» at T+321.42 s (${NK}, p. 4). The cyclogram had it started at 311.74 s`),
    },
    {
      id: 'orbit',
      label: 'Third stage cut off: in orbit',
      at: doc(
        677.08,
        `NIIP-5’s report: 677.08 s, by its integrator, where the cyclogram had 674.68 s (${NK}, p. 4). ${SIDDIQI}, p. 277: 676 s`,
      ),
      also: 'It burned 2.4 s longer than calculated (Baturin); the whole over-speed was 25.43 m/s, and the apogee 327 km for 230',
    },
    {
      id: 'separation',
      label: 'Spacecraft separates from the third stage; the Granit-5V timer starts',
      at: doc(MSK(9, 18, 28), `${OKB1}: 0918:28. Gagarin: “about 10 seconds” after the cutoff, and the clock and cycle 1 started with it`),
      also: '09:18:26.8, T+687.1 s (PPP, telemetry); 09:18:07 (Zak, citing Novosti Kosmonavtiki)',
    },
    {
      id: 'orientation',
      label: 'Solar orientation switched on, in the Earth’s shadow',
      at: measure(MSK(9, 50), 'documented', `${ZAK}: planned for 09:50, and “around 09:50” Gagarin confirmed it. To the minute at best`),
    },
    {
      id: 'descent-1',
      label: 'The timer’s first descent command: «Спуск-1» lit',
      at: derived(
        MSK(9, 18, 28) + 56 * 60,
        `the separation (${OKB1}: 0918:28) and 56 minutes on the cycle's clock: Gagarin, «На 56 минуте прошла первая команда» (his report, as printed in «Первый пилотируемый полёт», 2011, vol. 1); the flight plan's 56 minutes (ibid., doc. 90, p. 352). To the minute`,
      ),
    },
    { id: 'retro-command', label: 'Braking engine commanded on', at: doc(TDU, `${OKB1}: 1025:04.2 (“pressurize”)`) },
    {
      id: 'retro-on',
      label: 'Braking engine at thrust',
      at: derived(TDU + 2.2 + 1.5, `${OKB1}: “launch” 2.2 s after the command, and at its working mode 1.5 s after that`),
    },
    {
      id: 'retro-off',
      label: 'Braking engine starved: thrust ends',
      at: derived(TDU + 42.2, `${OKB1}: fuel pressure after the pump fell 42.2 s after the command`),
      also: 'Gagarin timed the burn at “exactly 40 seconds” on his stopwatch; Siddiqi (2015) writes of 44 s of firing, which is the timer’s cutoff, not the thrust’s end',
    },
    {
      id: 'retro-timer',
      label: 'Braking engine shut down by its timer; separation cancelled',
      at: doc(TDU + 44, `${OKB1}: 44.0 s after the command, 1025:48.2`),
    },
    {
      id: 'modules',
      label: 'Descent module and instrument module separate',
      at: doc(MSK(10, 36), `${OKB1}: “at 1036 (evidently, from the emergency separation system, from temperature-sensitive elements)”`),
      also: '10:35 (Gagarin). Lissov (in Zak) doubts the thermal sensors could have fired so high; unresolved',
    },
    {
      id: 'ejection',
      label: 'Hatch No. 1 off and the seat out, at about 7 km',
      at: doc(MSK(10, 42), `${ZAK}: 10:42, to the minute. The height is Gagarin’s`),
      also: 'planned for 10:44:12 (Zak’s table of the plan)',
    },
    { id: 'module-down', label: 'Descent module lands', at: doc(MSK(10, 48), `${OKB1}: 1048`) },
    {
      id: 'pilot-down',
      label: 'Gagarin lands',
      at: doc(MSK(10, 53), `${OKB1}: 1053`),
      also: '10:55 (TASS, the marker put up at the place, and Major Gasiev); 10:52 by Private Pekarsky’s watch (Zak)',
    },
  ],
  // The ascent as the simulator flies it (src/sim/staged.ts). No pitch programme, drag figure or throttle history of the
  // 8K72K has been found (mission.md, "Inputs"): what stands in for each is stated, and labelled. The checks below were
  // written before staged.ts had flown anything.
  ascent: ascent8K72K({
    guidance: {
      azimuth: doc(
        34 + 37 / 60 + 59.2 / 3600,
        '«Азимут линии прицеливания 34°37′59″,2»: Gagarin’s flight task, page 1, section IV (ЦА РКВ, ф. 19, оп. 114сс, д. 15), as pictured in Kommersant Nauka No. 9, 14 April 2021. ' +
          'The aiming line’s bearing at the pad, which the launch system turned the vehicle to and the gyros held. (The 37.5° derived before was the plane’s in the frame that does not turn.) ' +
          'Soyuz’s manual has 34.8° for 64.9° from Baikonur today',
      ),
      vertical: VERTICAL,
      kick: KICK,
      turn: doc(
        119.5,
        `the law changes at the strap-ons’ separation (${PPP}: 119.50 s), above all but a tenth of a per cent of the air; the instant is documented, the choice to change the law there is ours`,
      ),
      target: {
        at: 'orbit',
        altitude: doc(
          180_000,
          `the planned perigee, over the record’s reference ball: Zak’s table of the plan, 180 by 230 km: secondary. Taken as the height the design put the last cutoff at`,
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(
          64.95,
          `${OKB1}: 64°57′. TASS on the day: 65°4′. ${SOYUZ}: Table 2-1 gives 34.8° of azimuth for 64.9° from Baikonur today`,
        ),
      },
    },
    boostersGo: doc(119.5, `${PPP}: the strap-ons leave at 119.50 s`),
    lastCutoff: doc(677.08, `NIIP-5’s report (${NK}, p. 4): to the last cutoff`),
    fairing: doc(154.6, `${PPP}: 09:09:34.3`),
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
        id: 'minuteG',
        label: 'Load a minute up',
        value: 3.5,
        unit: 'g',
        tolerance: 1,
        confidence: 'documented',
        source: `${ZAK}, from Gagarin and the medical record: “3 to 4 g” a minute after liftoff. A man’s feeling and a round figure`,
      },
      {
        id: 'firstG',
        label: 'Greatest load on the first stage',
        value: 5,
        unit: 'g',
        tolerance: 1,
        confidence: 'documented',
        source: `${GAGARIN}: “approximately five G” before the strap-ons left; ${BOBKOV}: “5 units for 100 seconds”. By feel. Soyuz’s manual has at most 4.3 g there (a heavier upper stage)`,
      },
      {
        id: 'core.speed',
        label: 'Speed as the core cut off',
        value: 5_500,
        unit: 'm/s',
        tolerance: 400,
        confidence: 'documented',
        source: `${ZAK}: “about 5.5 km/s”. Round, and it does not say whether over the ground or space-fixed (they differ by some 250 m/s here): the run’s space-fixed figure is held to it, and 400 m/s allows for both`,
      },
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 181_000,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${OKB1}: 181 km. NOT an independent check: the law is solved to put the cutoff level at the planned 180 km, so this holds by construction`,
      },
      {
        id: 'cutoffAt',
        label: 'Third stage cut off',
        value: 677.08,
        unit: 's',
        tolerance: 3,
        confidence: 'documented',
        source: `NIIP-5’s report: 677.08 s (${NK}, p. 4); ${SIDDIQI}, p. 277: T+676 s, which this check had until November 2026. The tolerance was set with the cut on velocity, before it was flown: 3 s is the record’s second and Baturin’s 2.4 s of over-burn`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 327_000,
        unit: 'm',
        tolerance: 10_000,
        confidence: 'documented',
        source: `${OKB1}: 327 km, where 230 were planned. 25.43 m/s too fast made the 97 km (Baturin), so 10 km is under 3 m/s at the cutoff: a hard check of the stages’ figures, and the one that says whether the vehicle as recorded reaches the orbit it reached`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64.95,
        unit: 'deg',
        tolerance: 0.05,
        confidence: 'documented',
        source: `${OKB1}: 64°57′. Independent since the flight task’s aiming azimuth is flown (until then the plane was solved for it)`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 89.44 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${OKB1}: 89.44 min. It follows from the heights; 15 s is some 5 km on the semi-major axis`,
      },
    ],
  }),
  orbit: {
    radius: derived(
      6_371_000,
      'not stated in the report. Its two heights and its period agree by Kepler’s law only if the heights are over a ball of 6,371 km (mean height 254 km on 6,371 gives 89.44 min; on the equatorial 6,378 it gives 89.58). TASS’s figures of the day fit the same ball, and the untraced 169 by 315 km, 89.34 min fit 6,378: tests/orbit.test.mjs',
    ),
    perigee: doc(
      181_000,
      `${OKB1}: perigee 181 km. TASS on the day: 175 km. Also in print, untraced (NASA’s NSSDC catalogue is where it is thought to be from; its page answered with an error twice): 169 km (over 6,378 km). US radar, of Block E: 190.6 km (Zak, after Lissov)`,
    ),
    apogee: doc(
      327_000,
      `${OKB1}: apogee 327 km. TASS on the day: 302 km. Untraced: 315 km. US radar, of Block E: 326.2 km. The FAI record: 327 km. Planned: 230 km`,
    ),
    inclination: doc(64.95, `${OKB1}: 64°57′. TASS on the day: 65°4′`),
    period: doc(89.44 * 60, `${OKB1}: 89.44 min. TASS on the day: 89.1 min. Untraced: 89.34 min`),
  },
  injection: {
    at: doc(
      677.08,
      `NIIP-5’s report: third stage cutoff at T+677.08 s (${NK}, p. 4); ${SIDDIQI}, p. 277: 676 s. The orbit is taken to begin here; the push of separation twelve seconds later is not known and is left out`,
    ),
    heading: 'north',
    arc: estimated(
      27.5,
      'NOT documented: no source read gives where the spacecraft was at cutoff. Reckoned by hand from the record’s times and round speeds: some 45 km downrange when the strap-ons left, ' +
        '580 km more to the core’s cutoff at “about 5.5 km/s” (Zak), then 376 s on the third stage rising to the 7.84 km/s the orbit needs at perigee, at a mean of 6.5 km/s: 2,440 km. ' +
        'About 3,070 km in all, 27 to 28 degrees of arc; good to perhaps 3 degrees, which is 340 km along the track. It is the weakest input the coast has, and flying the ascent is what replaces it',
    ),
    anomaly: estimated(
      0,
      'NOT documented. Perigee is put at the cutoff: a stage that burns a little long along a level path raises the far side of the orbit and leaves its low point where it stopped. ' +
        'Gagarin’s “about when I was passing Cape Horn (at apogee)” is the only word on it in the record, and is loose',
    ),
  },
  mass: doc(4_725, 'RKK Energia 1946–1996, of this flight; the FAI record; Encyclopedia Astronautica. The type: 4.73 t (Siddiqi)'),
  retro: {
    on: derived(TDU + 3.7, `${OKB1}: command at 1025:04.2, “launch” 2.2 s later, at its working mode 1.5 s after that`),
    off: derived(
      TDU + 42.2,
      `${OKB1}: the fuel pressure after the pump fell 42.2 s after the command; the timer shut the engine down at 44.0 s. So 38.5 s of thrust; Gagarin timed 40 s`,
    ),
    deltaV: doc(
      132,
      `${ZAK}, after Lissov in Novosti Kosmonavtiki: 132 m/s where 136 were programmed: secondary. ${OKB1} says only that the impulse “was close to the estimated one”. ` +
        'What the gas that went on escaping afterwards added is not known and is left out. (1,614 kgf for 38.5 s on 4.7 t would be about 131 m/s.)',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'documented',
      source: `${GAGARIN}: “The TDU was directed to the Sun and quite steadily”; ${OKB1}: “oriented toward the Sun before the braking engine unit was turned on”. The nozzle to the Sun, so the push is away from it. How exactly the sensor’s axis lay to the engine’s is not stated; taken as the same line`,
    },
  },
  entry: {
    separation: doc(MSK(10, 36), `${OKB1}: 1036. Gagarin: 10:35`),
    mass: ENTRY_MASS,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: doc(
      145,
      `${KAMANIN_LOCK}: the code he checked on the ship that morning, in the diary of the day. ${SIDDIQI} and the later memoirs (Gallay, as Tyapchenko gives it) have 1-2-5: the record disagrees, and the diary is the nearer to the hardware (mission.md, "The lock's code"). With it, manual orientation by the Vzor and a manual command to the braking engine`,
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: doc(136, 'Chertok, Rockets and People, vol. 3, p. 80: the integrator’s command at 136 m/s; Zak: 136 programmed'),
    parting: PARTING,
  },
  supplies: {
    days: doc(
      10,
      'mission.md, “What it cost”: the answer to a failed braking engine was the orbit’s decay within the supplies’ ten days (planned: two to seven days, Ustinov’s memorandum of 30 March); S15 (Siddiqi, The Space Review, 2015): from the 327 km flown, about thirty days',
    ),
    rarefied: RAREFIED,
  },
  ejection: { altitude: doc(7_000, `${GAGARIN}: “approximately at the altitude of 7,000 meters, the hatch cover of hatch Nº 1 ejected”`) },
  // From 7 km down: the descent module on its own parachutes, and the pilot on his seat and then his canopies. The
  // checks below were written before flyDown had flown anything.
  heating: {
    ...HEATING,
    starts: estimated(
      290,
      'not read: the cabin’s 19 °C at launch (his report) taken for the outside; it is not used, there being no surface',
    ),
  },
  descent: {
    ground: doc(43, `${PPP} via Keldysh’s preprint: the landing place at 43 m. ${ZAK}: about 50 m above the sea`),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: estimated(
          2_272,
          `the 2,460 kg of the module with its pilot aboard (${SIDDIQI}, p. 195) less the pilot in his suit (88 kg: his service record’s 68 kg and the SK-1’s 20 kg) and a seat taken as 100 kg (not found: Siddiqi’s 800 kg is not credible)`,
        ),
        dragArea: MODULE_DRAG,
        chutes: MODULE_CHUTES,
      },
      {
        id: 'pilot',
        label: 'Gagarin, on his seat and then under his canopies',
        mass: estimated(188, 'he in his suit, 88 kg (as for the module), and a seat taken as 100 kg: not found'),
        dragArea: SEATED_DRAG,
        thrown: THROWN,
        chutes: [
          SEAT_CHUTE,
          mainCanopy(
            doc(
              4_000,
              `${BOBKOV}: at 4 km, as he leaves the seat with its back, the reserve and the survival pack; ${BATURIN}: “Через 50 секунд на высоте примерно 4 км ввелся основной парашют, одновременно произошел сход пилота с кресла”`,
            ),
            estimated(
              131,
              'he in his suit, 88 kg, with the survival pack, 43 kg (Baturin), which hung on its line and was then lost: carried to the ground here',
            ),
          ),
          reserveCanopy(
            doc(
              3_000,
              `${BATURIN}: “На высоте 3 км ввелся дополнительно запасной парашют”; ${BOBKOV}: put out automatically after the main, as it was again on Vostok 2 (Titov’s report, «Первый пилотируемый полёт», 2011, book 2, doc. 192, p. 198); the pilots of Vostoks 3 and 4 pinned it once the main was open (Kamanin, 16 August 1962)`,
            ),
          ),
        ],
      },
      ...HATCHES,
    ],
    automatic:
      'Gagarin had no say in the descent: the modules’ parting (the sequencer’s, and on the day the thermal backup’s at 10:36), the hatches and the seat (the barometric switch at 7 km) and every parachute (their own barometric switches and timers) were the automatic system’s',
    torn: TORN,
    crew: CREW,
    checks: [
      {
        id: 'module.at',
        label: 'Descent module on the ground',
        value: MSK(10, 48),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${OKB1}: 1048, to the minute`,
      },
      {
        id: 'pilot.at',
        label: 'Gagarin on the ground',
        value: MSK(10, 53),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${OKB1}: 1053. TASS and the marker: 10:55; Pekarsky’s watch: 10:52`,
      },
      {
        id: 'module.speed',
        label: 'Descent module landing',
        value: 10,
        unit: 'm/s',
        tolerance: 2,
        confidence: 'documented',
        source: `${BOBKOV}: “Скорость приземления спускаемого аппарата составляла 10 м/с”`,
      },
      {
        id: 'pilot.speed',
        label: 'Gagarin landing',
        value: 5,
        unit: 'm/s',
        tolerance: 1.5,
        confidence: 'documented',
        source: `${GCTC}: 5 m/s; ${BOBKOV}: 6 m/s, on the main alone. He came down on two`,
      },
      {
        id: 'apart',
        label: 'The two landings apart',
        value: 1_500,
        unit: 'm',
        tolerance: 3_000,
        confidence: 'documented',
        source: `${OKB1}: about 1.5 km; Gagarin thought four. No wind is flown, and the wind at 7 km was strong and westerly (Zak): the separation is mostly the wind’s`,
      },
    ],
  },
  landing: {
    latitude: doc(
      51 + 16 / 60,
      `${OKB1}: the pilot’s landing, 51°16′ N: to the minute of arc, 1.9 km. The descent module came down about 1.5 km away (the report; Gagarin thought four). The monument is at 51.2707° N (Wikipedia, from maps)`,
    ),
    longitude: doc(
      45 + 59 / 60,
      `${OKB1}: 45°59′ E: to the minute of arc, 1.2 km. The monument: 45.9973° E. Zak’s table prints “51.16 North, 45.58 East”, the minutes written as decimals`,
    ),
    at: doc(MSK(10, 48), `${OKB1}: the reentry apparatus at 1048, the pilot at 1053`),
    near: 'Smelovka',
  },
  // Tolerances were set here before src/sim/orbital.ts could fly anything (see the file's history), from how well each figure is known.
  checks: [
    {
      id: 'period',
      label: 'Period, from the published heights',
      value: 89.44 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${OKB1}: 89.44 min, printed to 0.01 min (0.6 s); the heights to 1 km, which is 0.6 s each`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 327_000,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${OKB1}: 327 km. The oblateness moves the height round an orbit by more than the report’s last figure; 5 km allows for the report not saying what kind of elements its are`,
    },
    {
      id: 'separationAltitude',
      label: 'Height when the modules separated',
      value: 155_000,
      unit: 'm',
      tolerance: 15_000,
      confidence: 'derived',
      source: `Lissov’s reckoning, in ${ZAK}: “by 10:36 the spacecraft could only have descended to an altitude of 150-160 kilometers”; Siddiqi (2015): 150 to 170 km. Another’s calculation, not a measurement`,
    },
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 10,
      unit: 'g',
      tolerance: 2,
      confidence: 'documented',
      source: `${GAGARIN}: “According to my sensations the G-force was beyond 10g”; to the questions: “to 10 and even somewhat higher”. Siddiqi (2015): 10 to 12. A man’s sense of it, not an accelerometer’s trace; about 8 is also in print, unsourced`,
    },
    {
      id: 'ejectionAt',
      label: 'Reaching 7 km',
      value: MSK(10, 42),
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${ZAK}: ejection at 10:42, given to the minute`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${OKB1}: 51°16′ N, 45°59′ E. Wind on the parachutes is not flown, the descent module landed 1.5 km from the pilot, and the orbit’s plane is derived from the inclination and the pad alone: 25 km is what those allow`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source: `${OKB1}: 51°16′ N, 45°59′ E. Held to 100 km as a record-grade answer would be, knowing that the place on the orbit at cutoff is an estimate good to 340 km: a miss here is that input’s until the ascent is flown`,
    },
  ],
};
