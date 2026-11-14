/**
 * Vostok 1 as an orbital flight: what `flight.ts` gives as `Flight.orbital` (src/sim/orbital.ts). The record with its
 * sources and disagreements is set out in mission.md beside this file; the numbers live here.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 09:06:59.7 Moscow time
 * (06:06:59.7 UTC). Nothing here was adjusted after the simulator was run: the checks' tolerances were written before
 * `flyOrbit` existed (the commit that added this file has no simulator in it).
 */

import type { OrbitalFlight } from '../../../../../src/sim/orbital.ts';
import type { Confidence, Measure } from '../../../../../src/types';

const m = (value: number, confidence: Confidence, source: string): Measure => ({ value, confidence, source });
const doc = (value: number, source: string): Measure => m(value, 'documented', source);
const derived = (value: number, source: string): Measure => m(value, 'derived', source);
const guess = (value: number, source: string): Measure => m(value, 'estimated', source);

/** Seconds from liftoff of a Moscow time on the morning of 12 April 1961. */
export const MSK = (h: number, min: number, s = 0): number => (h - 9) * 3600 + (min - 6) * 60 + (s - 59.7);

const G0 = 9.80665;
const OKB1 =
  'OKB-1, preliminary report of 3 May 1961 (Korolev, Bushuyev, Tikhonravov; RKK Energia archive 13029; Wilson Center record 260547)';
const GAGARIN = 'Gagarin’s report to the State Commission, 13 April 1961 (APRF f. 3, op. 47, d. 278; Wilson Center record 260544)';
const SIDDIQI = 'Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
const KAMANIN_LOCK =
  'Kamanin’s diary, 12 April 1961 (Skrytyi kosmos, book 1): «В 8 часов я вместе с ведущим инженером корабля на лифте поднялся к верху ракеты и проверил шифр (145) логического замка. Логический замок работал нормально.»';
const ZAK = 'Zak, RussianSpaceWeb';
const ENERGOMASH = 'NPO Energomash’s table by vehicle, row 8K72K, as reproduced by Brügge (b14643.eu): secondary';
const MINAKOV = 'Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor';
const ASTRONAUTIX = 'Encyclopedia Astronautica, Vostok 8K72K stage data: secondary';
const PPP =
  '«Первый пилотируемый полёт», book 2 (Davydov, ed., 2011), as quoted by page in Gammal and Tuchin, «Реконструкция траектории полёта КА «Восток-1»», Keldysh Institute preprint 2025 No. 15';
const NK =
  'Lissov and Afanasyev, «106 минут Гагарина в свете рассекреченных документов», Novosti Kosmonavtiki 2011 No. 6, pp. 2–11, written page by page from «Первый пилотируемый полёт» (2011): the flight task (book 1, pp. 429–430), the launch cyclogram (book 1, p. 431) and NIIP-5’s operational report of 13 May 1961 (book 2, pp. 54–69): secondary';
const TASK =
  'Gagarin’s flight task, its three sheets (ЦА РКВ, ф. 19, оп. 114сс, д. 15, лл. 126–128), as the Ministry of Defence published them in 2021 («Покорители космоса», 60cosmonauts.mil.ru)';
const BATURIN =
  'Baturin (co-editor of the 2011 documents), «Подлинная история полета Гагарина», Novaya Gazeta, 12 April 2021: secondary, no footnotes';
const SOYUZ =
  'Starsem, Soyuz User’s Manual ST-GTD-SUM-01, issue 3, 2001, Fig. 2-4 (pitch against time): a different vehicle on the same first two stages';
const SPUTNIK =
  'в/ч 11284, the reports of 17 October and 14 November 1957 on 8K71PS No. M1-1 (TsAMO f. 19, op. 110ss, d. 14), as published by rvsn.info: the same first two stages, two-stage, a different vehicle';
const BOBKOV = 'Bobkov (OKB-1), «Космический корабль "Восток"», Krylya Rodiny 1991 No. 4 and 6: secondary';
const GCTC = 'Gagarin Cosmonaut Training Centre, «Корабль "Восток"» (gctc.ru): secondary, unsigned';

/** The command to the braking engine (OKB-1: "the TDU was turned on at 1025:04.2"), which everything about the burn is timed from. */
const TDU = MSK(10, 25, 4.2);

export const orbital: OrbitalFlight = {
  liftoffMass: doc(
    287_000,
    `RKK Energia 1946–1996, of this flight: «со стартовой массой 287 т»; Minakov; Siddiqi. ${NK}, p. 9: «Масса заправленного изделия 8К72 с кораблем 3КА №3 составила 291 619 кг»: not flown yet, being 4.9 t more than the blocks' figures add to (mission.md, "The 2011 documents"). Also in print: 290.5 t (Zak), 291.15 t (Brügge), 281.4 t (Astronautix)`,
  ),
  stages: [
    {
      name: 'Strap-on boosters, Blocks B, V, G, D',
      count: 4,
      engine: 'RD-107 (8D74)',
      nodes: ['Booster_B', 'Booster_V', 'Booster_G', 'Booster_D'],
      mass: doc(43_300, `${ASTRONAUTIX}: 43.3 t each. Minakov’s table has 170 t for the four (42.5 t); Brügge 177.65 t (44.4 t)`),
      dry: doc(3_750, `${MINAKOV}: 3.75 t. Astronautix has 3.71 t`),
      propellant: derived(
        39_550,
        '43.3 t fuelled (Astronautix) less 3.75 t dry (Minakov): all that is not structure, as the 8K71’s own table counts it (militaryrussia.ru: 42,950 less 3,750 is 39,200 kg «топливо»). ' +
          'The kerosene, oxygen, peroxide and nitrogen are not split for the 8K72K in anything found. The flow drawn from it is the engine’s whole flow, which is what its specific impulse is reckoned on: ' +
          'thrust over kerosene, oxygen and peroxide together (lpre.de, from Gakhun et al. 1989: 1,000.3 kN over 326.2 kg/s is 3,066.5 m/s, the published 3,067); the 0.28 t of nitrogen (militaryrussia.ru) is not burned and is left in. ' +
          'Brügge’s figures (b14643.eu) are not this vehicle’s: his block masses for every R-7 are Soyuz-ST’s, from Arianespace’s Soyuz CSG User’s Manual, issue 2, 2012, Fig. 1.5.1a, where a strap-on carries 27,900 kg of oxygen and 11,260 of kerosene (39.16 t) and a core 63,800 and 26,300 (90.10 t), the peroxide and nitrogen outside those (1.47 and 3.12 t)',
      ),
      // the strap-ons go to their first intermediate stage of thrust before they part (documented in kind); level and length are another R-7's
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
          '6.4 s (the command at 109.94 s, separation at 116.38 s: ${SPUTNIK}), put before the 8K72K’s 119.5 s',
      },
      thrust: {
        seaLevel: doc(815_900, `${ENERGOMASH}: 815.9 kN. Minakov’s table: 82 tf (804 kN)`),
        vacuum: doc(997_700, `${ENERGOMASH}: 997.7 kN`),
      },
      isp: {
        seaLevel: doc(2510 / G0, `${ENERGOMASH}: 2,510 N·s/kg (256 s)`),
        vacuum: doc(3069 / G0, `${ENERGOMASH}: 3,069 N·s/kg (313 s)`),
      },
      ignition: guess(
        0,
        'lit on the pad before liftoff, through a preliminary and an intermediate stage of thrust (Gagarin’s report); how many seconds before has not been read, and the propellant burned before liftoff is not known',
      ),
      cutoff: doc(
        119.5,
        `${PPP}, §4: «команда на разделение выдана интегратором на 119.50 секунде с её исполнением через 0.03 секунды». ${SIDDIQI}, p. 277, and ${ZAK}: 119 s. ` +
          'The engines were throttled to their first intermediate stage some seconds before (RKK Energia 1946–1996; on Sputnik’s 8K71PS 7.1 s before: ' +
          `${SPUTNIK}); the level of that stage has not been found, so it is not flown: rated thrust to the integrator’s command. Rated burns in print: 118 s (Minakov), 120.5 s (Brügge, computed)`,
      ),
      separation: doc(119.5, `${PPP}: the integrator’s command at 119.50 s. ${SIDDIQI}, p. 277; ${ZAK}: 119 s`),
    },
    {
      name: 'Core, Block A',
      count: 1,
      engine: 'RD-108 (8D75)',
      nodes: ['CoreStage', 'CoreEngine', 'Interstage'],
      mass: doc(100_400, `${ASTRONAUTIX}: 100.4 t. Brügge 99.76 t; Minakov 102 t`),
      dry: doc(6_800, `${ASTRONAUTIX}: 6.8 t. Minakov: 7 t for the 8K71’s core, 8 t in his 8K72 table`),
      propellant: derived(
        93_600,
        '100.4 t fuelled less 6.8 t dry (both Astronautix, of the 8K72K’s core): all that is not structure, peroxide and nitrogen with the kerosene and oxygen, drawn at the engine’s whole flow (see the strap-ons). ' +
          'Brügge’s figures (b14643.eu) are not this vehicle’s: his block masses for every R-7 are Soyuz-ST’s, from Arianespace’s Soyuz CSG User’s Manual, issue 2, 2012, Fig. 1.5.1a, where a strap-on carries 27,900 kg of oxygen and 11,260 of kerosene (39.16 t) and a core 63,800 and 26,300 (90.10 t), the peroxide and nitrogen outside those (1.47 and 3.12 t)',
      ),
      // the RD-108's main chambers stop at the preliminary command and it runs on its steering chambers alone until the main
      // command: the final stage of thrust. Its instants are the cyclogram's, as late as the day had them; its level is estimated
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
      thrust: {
        seaLevel: doc(744_300, `${ENERGOMASH}: 744.3 kN. Minakov’s table: 81.2 tf`),
        vacuum: doc(945_400, `${ENERGOMASH}: 945.4 kN`),
      },
      isp: {
        seaLevel: doc(2432 / G0, `${ENERGOMASH}: 2,432 N·s/kg (248 s)`),
        vacuum: doc(3089 / G0, `${ENERGOMASH}: 3,089 N·s/kg (315 s)`),
      },
      ignition: guess(0, 'lit on the pad with the strap-ons, as theirs'),
      cutoff: guess(
        300,
        `the main command, which put out the steering chambers: planned at 312.74 s (the cyclogram, ${NK}, p. 4) and not recorded on the day; taken as late as the preliminary command was (0.51 s). ` +
          `«300 s» (${SIDDIQI}, p. 277) and 299 s (${ZAK}) are not the documents’ figures. The core reached 22.0 m/s over its design (NIIP-5’s report, ibid.): a result here, not an input`,
      ),
      separation: doc(
        300,
        `the third stage’s «Зажигание» at T+321.42 s (NIIP-5’s report, ${NK}, p. 4), whose fire through the lattice cuts the core loose: the separation itself was not recorded. The plan had the third stage started at 311.74 s, before the core’s main command; the 9.7 s between plan and record is not explained in anything read`,
      ),
    },
    {
      name: 'Third stage, Block E',
      count: 1,
      engine: 'RD-0109 (8D719)',
      nodes: ['BlockE'],
      // (NK's figures from the 2011 documents, 1,210 kg dry and 6,576 kg of propellant, are not flown yet: mission.md, "The 2011 documents")
      mass: doc(
        7_984,
        `${MINAKOV}: 7,984 kg, of the 8K72’s stage. ${NK}, p. 10, note 31: 7,786 kg (1,210 dry, 4,482 + 2,088 + 6 kg filled), not flown yet. Astronautix 7,775 kg; RKK Energia “8 t”; Brügge 8.36 t`,
      ),
      dry: doc(1_472, `${MINAKOV}: 1,472 kg burnt out. ${NK}: 1,210 kg dry, not flown yet. Astronautix 1,440 kg; Zak 1.34 t dry`),
      propellant: derived(6_512, 'Minakov’s two figures, 7,984 less 1,472 kg. Brügge has 6.93 t; NK 6,576 kg'),
      thrust: { vacuum: doc(54_500, 'Brügge: 54.5 kN; Astronautix 54.52 kN: secondary') },
      isp: { vacuum: doc(3172 / G0, 'Brügge: 3,172 N·s/kg (323.5 s); Astronautix 324 s: secondary') },
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
  ],
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
      at: m(MSK(9, 50), 'documented', `${ZAK}: planned for 09:50, and “around 09:50” Gagarin confirmed it. To the minute at best`),
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
  ascent: {
    guidance: {
      azimuth: doc(
        34 + 37 / 60 + 59.2 / 3600,
        '«Азимут линии прицеливания 34°37′59″,2»: Gagarin’s flight task, page 1, section IV (ЦА РКВ, ф. 19, оп. 114сс, д. 15), as pictured in Kommersant Nauka No. 9, 14 April 2021. ' +
          'The aiming line’s bearing at the pad, which the launch system turned the vehicle to and the gyros held. (The 37.5° derived before was the plane’s in the frame that does not turn.) ' +
          'Soyuz’s manual has 34.8° for 64.9° from Baikonur today',
      ),
      vertical: guess(
        15,
        `${SOYUZ}: within half a degree of the vertical at 19 s and 3.3 degrees off it at 29 s. The 8K72K’s own programme has not been found; its boosters reached their main stage of thrust 6 s after liftoff (as Sputnik’s did: ${SPUTNIK})`,
      ),
      kick: guess(10, 'how long the pitch-over takes: chosen. Its angle is solved, not chosen (staged.ts: steer)'),
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
        climb: guess(0, 'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one'),
        inclination: doc(
          64.95,
          `${OKB1}: 64°57′. TASS on the day: 65°4′. ${SOYUZ}: Table 2-1 gives 34.8° of azimuth for 64.9° from Baikonur today`,
        ),
      },
    },
    drag: [
      {
        until: doc(119.5, `${PPP}: the strap-ons leave at 119.50 s`),
        area: derived(
          29.4,
          'the cluster seen end on: the core’s 2.95 m (Minakov) and four strap-ons of 2.68 m (Minakov), π/4 (2.95² + 4 × 2.68²) = 29.4 m², their overlap left out',
        ),
        curve: {
          points: [
            [0, 0.25],
            [0.8, 0.28],
            [1.1, 0.5],
            [1.5, 0.45],
            [2.5, 0.33],
            [4, 0.25],
            [8, 0.2],
          ],
          confidence: 'estimated',
          source:
            'NOT FOUND for any R-7: no drag figure against Mach number for the 8K72K, the R-7 or Soyuz was found (mission.md). A curve of the usual form for a slender clustered vehicle on its frontal area, chosen: a transonic rise to 0.5 and falling to 0.2 at Mach 8. tests/staged.test.mjs says what ±30 % of it moves',
        },
      },
      {
        until: doc(677.08, `NIIP-5’s report (${NK}, p. 4): to the last cutoff`),
        area: derived(6.835, 'the core seen end on, 2.95 m (Minakov): Block E and the fairing are narrower'),
        curve: {
          points: [
            [0, 0.25],
            [0.8, 0.28],
            [1.1, 0.5],
            [1.5, 0.45],
            [2.5, 0.33],
            [4, 0.25],
            [8, 0.2],
          ],
          confidence: 'estimated',
          source: 'the same chosen curve as the whole stack’s; the air is a ten-thousandth of the ground’s by then',
        },
      },
    ],
    drops: [
      {
        id: 'fairing',
        at: doc(154.6, `${PPP}: 09:09:34.3`),
        mass: doc(
          800,
          `${ZAK}: 0.8 t. Brügge 0.64 t: secondary. ${NK}, p. 10, note 31: «Масса головного обтекателя составляла 582 кг», not flown yet (mission.md, "The 2011 documents")`,
        ),
      },
    ],
    // For the live vehicle flown by hand (src/sim/stagedlive.ts): how hard its steering chambers turn it. No figure read.
    steering: {
      authority: guess(
        5,
        'deg/s² at full throw, about each axis: NOT FOUND. Of the order the steering chambers give: the core’s four of 2.5 tf (RKK Energia 1946–1996) and the strap-ons’ eight, swung, ' +
          '15 m or so from the centre of mass of a stack of 287 t and 30 m (about 2 × 10⁷ kg m² as a rod), a few degrees a second squared; taken as the same on every stage and at every mass, which it was not',
      ),
    },
    // For the scene: where the spacecraft's centre of mass is, and what leaves as a body of its own (sim/shed.ts). Stations
    // are metres above the main nozzles' exits, as vostok-8k72k.md has them. Every drag figure is estimated; so is every
    // centre and gyration, from the stations and masses there.
    centre: guess(
      1.6,
      'the spacecraft’s centre of mass above its station 0 (the braking nozzle): about the instrument module’s top and the ball’s bottom, from the stations of vostok-3ka.md',
    ),
    sheds: [
      {
        on: 'boosters',
        name: 'The four strap-ons',
        from: doc(0, 'the main nozzles’ exits (vostok-8k72k.md)'),
        to: doc(19.8, `${ZAK}; Brügge: 19.8 m with the nozzles`),
        radius: derived(
          4.12,
          'the four as one body: each 2.68 m across (Minakov), its axis 2.78 m out at the base (vostok-8k72k.md): 2.78 + 1.34',
        ),
        mass: derived(
          21_130,
          '4 × (3,750 kg dry (Minakov) + the 1,533 kg the ascent flown leaves in each): flown as one body, which they were not',
        ),
        centre: guess(8, 'about two fifths up a strap-on, empty: its engine and tail are the heaviest part'),
        gyration: { roll: guess(2.9, 'four blocks 2.8 m out'), across: guess(6, 'a 19.8 m block, its mass low') },
        ahead: guess(18, 'four tips, 5.6 m² each, at 0.8'),
        astern: guess(22, 'four tails, 5.6 m² each, at 1.0'),
        side: {
          dragArea: guess(140, '4 × 19.8 m × 2 m on average, at 0.9'),
          from: doc(0, 'the body’s own stretch, as above'),
          to: doc(19.8, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'fairing',
        name: 'The fairing',
        from: derived(31.73, 'on Block E’s adapter: 28.75 m (core with lattice) + 2.98 m (Block E with adapter), Minakov'),
        to: doc(38.36, `${MINAKOV}: the whole vehicle’s length`),
        radius: doc(1.35, `${MINAKOV}: 2.7 m across`),
        mass: doc(800, `${ZAK}: 0.8 t; Brügge 0.64 t. Flown as one body: it was two halves`),
        centre: guess(34.5, 'a little below the middle of a shell that narrows to its tip'),
        gyration: { roll: guess(1.1, 'a thin shell 1.35 m in radius'), across: guess(2, 'a 6.6 m shell') },
        ahead: guess(2.5, 'its nose, 5.7 m², at 0.45'),
        astern: guess(6, 'its open foot, at 1.0'),
        side: {
          dragArea: guess(18, '6.6 m × 2.7 m at 1.0'),
          from: derived(31.73, 'the body’s own stretch, as above'),
          to: doc(38.36, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'core',
        name: 'Block A, the core',
        from: doc(0, 'the main nozzles’ exits'),
        to: doc(28.75, `${MINAKOV}: the core with its lattice`),
        radius: doc(1.475, `${MINAKOV}: 2.95 m across`),
        mass: derived(
          11_320,
          'its 100.4 t fuelled less the 89.08 t the ascent flown burns: what the record’s figures leave (6.8 t dry, Astronautix)',
        ),
        centre: guess(9, 'below its middle: the engine and the empty tanks’ lower half'),
        gyration: { roll: guess(1.0, 'a shell 1.2 to 1.5 m in radius'), across: guess(8, 'a 28.75 m block') },
        ahead: guess(4, 'its lattice end, 5.2 m², at 0.8'),
        astern: guess(5, 'its tail, 3.3 m², and the engine, at 1.5'),
        side: {
          dragArea: guess(70, '28.75 m × 2.5 m on average, at 1.0'),
          from: doc(0, 'the body’s own stretch, as above'),
          to: doc(28.75, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'separation',
        name: 'Block E, the third stage',
        from: doc(28.75, `${MINAKOV}: on the lattice’s top`),
        to: derived(31.73, 'its adapter’s rim, 2.98 m higher (Minakov)'),
        radius: doc(1.29, `${MINAKOV}: 2.58 m across`),
        mass: derived(1_518, '1,472 kg burnt out (Minakov) and the 46 kg the ascent flown leaves'),
        centre: guess(29.8, 'the engine in its tanks’ ring, low in the stage'),
        gyration: { roll: guess(0.9, 'ring tanks 1.29 m in radius'), across: guess(1, 'a stage 3 m long') },
        push: guess(
          1,
          'not found: the spacecraft left Block E’s adapter on pushers (spacecraft.md: four of them), at a speed nothing read gives; 1 m/s apart, of the order spring pushers give, is chosen. Block E’s venting of what was left in its tanks after cutoff, which would have moved it further, is not modelled',
        ),
        ahead: guess(5, 'its adapter’s open rim, at 1.0'),
        astern: guess(5, 'its base, at 1.0'),
        side: {
          dragArea: guess(8, '3 m × 2.6 m at 1.0'),
          from: doc(28.75, 'the body’s own stretch, as above'),
          to: derived(31.73, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'modules',
        name: 'The instrument module and braking engine',
        from: derived(30.53, 'the spacecraft’s station 0, the braking nozzle (vostok-8k72k.md)'),
        to: guess(32.8, 'the instrument module’s top, from RKK Energia’s drawing as vostok-3ka.md has it'),
        radius: guess(1.25, 'its widest, 2.43 m (Siddiqi)'),
        mass: doc(2_265, `${BOBKOV}: the instrument module, 2.265 t`),
        centre: guess(31.5, 'the middle of its two cones'),
        gyration: { roll: guess(0.8, 'two cones 1.2 m in radius'), across: guess(0.8, 'two cones 2.3 m long') },
        ahead: guess(3, 'its concave top, 4.6 m², at 0.7'),
        astern: guess(3, 'its base, at 0.7'),
        side: {
          dragArea: guess(5, '2.3 m × 2.2 m at 1.0'),
          from: derived(30.53, 'the body’s own stretch, as above'),
          to: guess(32.8, 'the body’s own stretch, as above'),
        },
      },
    ],
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
  },
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
    arc: guess(
      27.5,
      'NOT documented: no source read gives where the spacecraft was at cutoff. Reckoned by hand from the record’s times and round speeds: some 45 km downrange when the strap-ons left, ' +
        '580 km more to the core’s cutoff at “about 5.5 km/s” (Zak), then 376 s on the third stage rising to the 7.84 km/s the orbit needs at perigee, at a mean of 6.5 km/s: 2,440 km. ' +
        'About 3,070 km in all, 27 to 28 degrees of arc; good to perhaps 3 degrees, which is 340 km along the track. It is the weakest input the coast has, and flying the ascent is what replaces it',
    ),
    anomaly: guess(
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
    mass: doc(2_460, `${SIDDIQI}, p. 195: 2.46 t for the type, the pilot and his seat aboard. No. 3’s own figure has not been found`),
    area: derived(Math.PI * 1.15 ** 2, 'the disc of the 2.3 m ball (Siddiqi p. 195; RKK Energia’s drawing: Ø2300)'),
    drag: {
      points: [
        [0, 0.47],
        [0.7, 0.5],
        [1, 0.75],
        [1.5, 1.0],
        [3, 0.95],
        [6, 0.92],
        [25, 0.92],
      ],
      confidence: 'estimated',
      source:
        'a smooth sphere’s drag coefficient against Mach number as the textbooks plot it (Hoerner, Fluid-Dynamic Drag; Bailey and Hiatt, AIAA Journal 1972), set down from memory: neither was opened, ' +
        'so it is an estimate until one is. 0.92 above Mach 6 is the figure that matters (it sets the load and how far the ball carries); below Mach 1 a ball this size may be past its drag crisis ' +
        'and lower than 0.47. Nothing published for the Vostok ball itself, charred and with its straps’ stubs, was found. Free-molecule drag above 120 km (about 2) is left out: it is worth nothing in ten minutes',
    },
  },
  manual: {
    code: doc(
      145,
      `${KAMANIN_LOCK}: the code he checked on the ship that morning, in the diary of the day. ${SIDDIQI} and the later memoirs (Gallay, as Tyapchenko gives it) have 1-2-5: the record disagrees, and the diary is the nearer to the hardware (mission.md, "The lock's code"). With it, manual orientation by the Vzor and a manual command to the braking engine`,
    ),
    rate: guess(
      2,
      'how fast the hand controller turned the spacecraft, deg/s: not found. The automatic system’s rates in the record are 2 to 3 deg/s (Gagarin, before orientation)',
    ),
    thrust: doc(1614 * G0, `${SIDDIQI}, p. 197: the TDU-1, 1,614 kgf`),
    deltaV: doc(136, 'Chertok, Rockets and People, vol. 3, p. 80: the integrator’s command at 136 m/s; Zak: 136 programmed'),
    parting: guess(
      10,
      'the modules part ten to twelve seconds after a burn the integrator ends (the sequencer as planned: Siddiqi, The Space Review, 2015); ten taken',
    ),
  },
  ejection: { altitude: doc(7_000, `${GAGARIN}: “approximately at the altitude of 7,000 meters, the hatch cover of hatch Nº 1 ejected”`) },
  // From 7 km down: the descent module on its own parachutes, and the pilot on his seat and then his canopies. The
  // checks below were written before flyDown had flown anything.
  heating: {
    noseRadius: doc(1.15, 'the 2.3 m ball (Siddiqi p. 195; RKK Energia’s drawing: Ø2300): a sphere’s face is its own radius'),
    starts: guess(290, 'not read: the cabin’s 19 °C at launch (his report) taken for the outside; it is not used, there being no surface'),
    // (no surfaces: the ablator's thickness, density, heat of ablation and the shield's temperatures have not been read)
    surfaces: [],
    round: true,
  },
  descent: {
    ground: doc(43, `${PPP} via Keldysh’s preprint: the landing place at 43 m. ${ZAK}: about 50 m above the sea`),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: guess(
          2_272,
          `the 2,460 kg of the module with its pilot aboard (${SIDDIQI}, p. 195) less the pilot in his suit (88 kg: his service record’s 68 kg and the SK-1’s 20 kg) and a seat taken as 100 kg (not found: Siddiqi’s 800 kg is not credible)`,
        ),
        dragArea: guess(
          1.95,
          'the 2.3 m ball’s disc, 4.15 m², at the sphere’s 0.47 below Mach 0.7 (the entry curve here, itself estimated)',
        ),
        chutes: [
          {
            name: 'pilot parachute',
            after: doc(
              0,
              `${BOBKOV}: drawn out by the parachute container’s cover, shot off by the barometric sensors with the hatch, at about 7 km`,
            ),
            dragArea: guess(
              1.1,
              `1.5 m² of canopy (${BOBKOV}; ${GCTC}) at a drag coefficient of 0.75 on its cloth, which is the usual round canopy’s and is chosen`,
            ),
            fills: guess(1, 'chosen: no filling time found'),
          },
          {
            name: 'braking parachute',
            altitude: doc(4_000, `${BOBKOV}: “на высоте 4 км при скорости 200 м/с”; ${GCTC}`),
            dragArea: guess(13.5, `18 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
            fills: guess(2, 'chosen: no filling time found'),
            // (the usual train: the small parachute draws the next out and goes with it; not stated for Vostok in anything read)
            instead: ['pilot parachute'],
          },
          {
            name: 'main parachute',
            altitude: doc(2_500, `${BOBKOV}; ${GCTC}: at 2.5 km`),
            dragArea: guess(430, `574 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
            fills: guess(6, 'chosen: no filling time found'),
            instead: ['braking parachute'],
          },
        ],
      },
      {
        id: 'pilot',
        label: 'Gagarin, on his seat and then under his canopies',
        mass: guess(188, 'he in his suit, 88 kg (as for the module), and a seat taken as 100 kg: not found'),
        dragArea: guess(0.6, 'a seated man and his seat, chosen'),
        thrown: guess(
          20,
          `${BOBKOV} and ${GCTC} via mission.md: the seat left “at up to 20 m/s”, on its two rockets, two seconds after the hatch; taken at that bound, and at the hatch’s instant`,
        ),
        chutes: [
          {
            name: 'seat’s braking parachute',
            after: doc(
              0.5,
              `ru.wikipedia, «Парашютная система космического корабля "Восток-1"»: “через полсекунды”, tertiary; ${BOBKOV}: as the seat leaves`,
            ),
            dragArea: guess(1.5, `2 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
            fills: guess(1, 'chosen: no filling time found'),
          },
          {
            name: 'main canopy',
            altitude: doc(
              4_000,
              `${BOBKOV}: at 4 km, as he leaves the seat with its back, the reserve and the survival pack; ${BATURIN}: “Через 50 секунд на высоте примерно 4 км ввелся основной парашют, одновременно произошел сход пилота с кресла”`,
            ),
            dragArea: guess(62.6, `83.5 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
            fills: guess(4, 'chosen: no filling time found'),
            replaces: {
              mass: guess(
                131,
                'he in his suit, 88 kg, with the survival pack, 43 kg (Baturin), which hung on its line and was then lost: carried to the ground here',
              ),
              leaves: {
                id: 'seat',
                label: 'The ejection seat',
                dragArea: guess(
                  1.8,
                  'the empty seat, 0.3 m² (chosen), under its stabilising parachute, 1.5 m² as above, which stays with it: chosen',
                ),
              },
            },
          },
          {
            name: 'reserve canopy',
            altitude: doc(
              3_000,
              `${BATURIN}: “На высоте 3 км ввелся дополнительно запасной парашют”; ${BOBKOV}: put out automatically after the main, on this flight only`,
            ),
            dragArea: guess(42, `56 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
            fills: guess(4, 'chosen: no filling time found'),
          },
        ],
      },
      {
        id: 'hatch',
        label: 'Hatch No. 1',
        mass: guess(30, 'not found: a cover 1 m across in the clear, its heat shield and its lock, by judgement'),
        dragArea: guess(0.8, 'a plate a little over 1 m across, tumbling: chosen'),
        thrown: guess(
          30,
          'not found: blown off by its pyrotechnics at 7 km, two seconds before the seat; chosen to keep it ahead of the seat, which here leaves at the same instant',
        ),
        chutes: [],
      },
      {
        id: 'cover',
        label: 'Hatch No. 2, the parachute container’s cover',
        mass: guess(25, 'not found: by judgement, as hatch No. 1'),
        dragArea: guess(0.8, 'as hatch No. 1: chosen'),
        thrown: guess(10, `not found: shot off with the hatch at about 7 km, drawing out the module’s small parachute (${BOBKOV}); chosen`),
        chutes: [],
      },
    ],
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
