/**
 * Vostok 2 as an orbital flight: what `flight.ts` gives as `Flight.orbital` (src/sim/orbital.ts). The record with its
 * sources and disagreements is set out in mission.md beside this file; the numbers live here. The launch vehicle and the
 * ship are the type's (vehicles/vostok-8k72k.ts, vehicles/vostok-3ka.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 09:00:00 Moscow time on
 * 6 August 1961 (06:00:00 UTC). The checks were written before this record was flown (the commit that added them flew
 * nothing), from how well each figure is known.
 *
 * **No document of this ascent has been found**: no cyclogram, no flight task for 8K72K No. E103-17, no range report. So
 * every instant of the ascent is the type's, as Vostok 1's record flies it, labelled `estimated` and not this flight's;
 * what Titov felt is beside each. **The braking burn's instant is derived** (mission.md, "The braking burn"): the one time
 * the record gives, Titov's 09:57, the orbit rules out.
 */

import type { OrbitalFlight } from '../../../../../src/sim/orbital.ts';
import type { Confidence, Measure } from '../../../../../src/types.ts';
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
  coreThrottle,
  KICK,
  SIDDIQI,
  stages8K72K,
  strapOnThrottle,
  VERTICAL,
  ZAK,
} from '../../vehicles/vostok-8k72k.ts';

const m = (value: number, confidence: Confidence, source: string): Measure => ({ value, confidence, source });
const doc = (value: number, source: string): Measure => m(value, 'documented', source);
const derived = (value: number, source: string): Measure => m(value, 'derived', source);
const guess = (value: number, source: string): Measure => m(value, 'estimated', source);

/** Seconds from liftoff, 09:00:00 Moscow time on 6 August 1961, of a Moscow time that day (h) or, past midnight, on the 7th (h + 24). */
export const MSK = (h: number, min: number, s = 0): number => (h - 9) * 3600 + min * 60 + s;

const PP2 = '«Первый пилотируемый полёт» (Davydov, ed., 2011), book 2';
const REPORT = `Titov’s report to the State Commission, 8 August 1961, from the tape (${PP2}, doc. 192; АП РФ ф. 3, оп. 47, д. 279)`;
const ANSWERS = `his answers to the Commission’s questions, the same day (${PP2}, doc. 193)`;
const FAI = `the record file for the FAI (${PP2}, doc. 194)`;
const PROGRAMME = `«Программа полёта корабля «Восток-II» с пилотом на борту (изделие № 4)», 15 July 1961 (${PP2}, doc. 187)`;
const MEMO = `the memorandum to the Central Committee of 3 July 1961, ВП-13/1039 (${PP2}, doc. 184)`;
const TASS = 'TASS, Pravda 7 August and Izvestiya 8 August 1961 (JPL Astronautics Information Translation No. 24)';
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110)';
/** The type's ascent as Vostok 1's record flies it: the words for an instant this flight's record does not give. */
const TYPE = (what: string) =>
  `NOT this flight’s: no cyclogram, flight task or range report of E103-17 has been found. The type’s ${what}, as Vostok 1’s record flies it (vostok-1/orbital.ts)`;

/** The braking engine's command, derived (mission.md, "The braking burn"); everything about the burn is timed from it. */
const TDU = MSK(33, 51);

export const orbital: OrbitalFlight = {
  liftoffMass: guess(
    287_000,
    `${TYPE('liftoff mass')}: 287 t (RKK Energia 1946–1996; Minakov). This vehicle’s own was not found; its spacecraft was 6 kg heavier`,
  ),
  stages: stages8K72K({
    boosters: {
      cutoff: guess(
        119.5,
        `${TYPE('strap-ons’ integrator command')}: 119.50 s flown, 119.45 s planned. Titov: the greatest load at the strap-ons’ cutoff, «затем следует рывок» (${REPORT}, p. 184)`,
      ),
      separation: guess(119.5, TYPE('strap-ons’ separation, with their cutoff')),
      throttle: strapOnThrottle(119.5),
    },
    core: {
      cutoff: guess(
        300,
        `${TYPE('core cutoff')}. Titov: «По прекращению ее работы чувствуется небольшой толчок. В этот момент перегрузки резко спадают» (${REPORT}, p. 184)`,
      ),
      separation: guess(300, TYPE('core’s separation, with the third stage’s fire through the lattice')),
      throttle: coreThrottle(300),
    },
    third: {
      ignition: guess(
        300,
        `${TYPE('third stage’s start')}. Titov: «Запуск третьей ступени происходит примерно секунд через десять после отделения второй ступени» (${REPORT}, p. 184): the same gap Gagarin felt`,
      ),
      cutoff: guess(
        677.08,
        `${TYPE('third stage’s cutoff')}: 677.08 s flown, 674.68 s planned. Cut here on its integrator (below), so this is a result`,
      ),
      separation: guess(
        687.08,
        `about ten seconds after the cutoff: «Третья ступень отработала, выключилась, и секунд через десять произошло отделение» (${REPORT}, p. 184), on the type’s cutoff; McDowell’s catalogue: 06:11 UTC, to the minute`,
      ),
      velocity: {
        apparent: true,
        speed: guess(
          2_283.52,
          'm/s of apparent velocity: Vostok 1’s flight task’s setting for its third stage (the 2011 documents), for an orbit of 180 km perigee. NOT this flight’s: E103-17’s flight task is not published. Its planned perigee was the same 180 km (doc. 184)',
        ),
      },
    },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(0, `${FAI}, the act of launch, p. 222: «в 6 часов 00 минут 00 секунд по гринвичскому времени»`),
      also: '08:59:57 (RKK Energia, 2011; Zak): three seconds earlier, naming no document',
    },
    {
      id: 'boosters',
      label: 'The four strap-ons separate',
      at: guess(119.5, TYPE('strap-ons’ separation')),
      also: 'Titov felt it as the greatest load, then a jerk forward in the straps',
    },
    {
      id: 'fairing',
      label: 'Fairing jettisoned',
      at: guess(154.6, TYPE('fairing’s jettison')),
      also: `Titov: «Отделение конуса происходит очень заметно ... После отделения конуса в иллюминаторе «Взора» видна Земля была» (${REPORT}, p. 184)`,
    },
    { id: 'core', label: 'Core’s main chambers off: its steering chambers alone', at: guess(290, TYPE('core’s preliminary command')) },
    {
      id: 'third',
      label: 'Third stage alight; the core cut loose',
      at: guess(300, TYPE('third stage’s start')),
      also: 'Titov: about ten seconds after the second stage left; «Хлопка никакого я не слышал»',
    },
    {
      id: 'orbit',
      label: 'Third stage cut off: in orbit',
      at: guess(677.08, TYPE('third stage’s cutoff')),
      also: 'Titov: the rocket some 50° from the horizontal at the end of the third stage’s burn, the Earth in the Vzor’s ring',
    },
    {
      id: 'separation',
      label: 'Spacecraft separates from the third stage',
      at: guess(687.08, 'about ten seconds after the cutoff (Titov), on the type’s cutoff'),
      also: '06:11 UTC (McDowell, to the minute). «При этом чувствовался толчок. После этого стало тихо и объект начал вращаться»',
    },
    {
      id: 'manual-1',
      label: 'The logical lock on, in the Earth’s shadow: manual orientation on',
      at: doc(
        MSK(10, 0),
        `${REPORT}, p. 185: «Примерно в 10 часов включил логический замок. Затем кнопкой включил ручную ориентацию». To the minute at best`,
      ),
    },
    {
      id: 'manual-1-oriented',
      label: 'Oriented by hand: vertical to a few degrees, the heading within five',
      at: doc(
        MSK(10, 15),
        `${REPORT}, p. 186: «Ориентацию начал в 10 часов 05 минут ... Сориентировал я объект за 10 минут. В 10.15 я доложил, что объект сориентирован»`,
      ),
    },
    {
      id: 'manual-1-off',
      label: 'Manual orientation off, the ship left pitching',
      at: doc(MSK(11, 0), `${REPORT}, p. 187: off at 11:00 «с закруткой по тангажу»; 120 atm left in the bottles`),
    },
    {
      id: 'manual-2',
      label: 'Manual orientation on again, on the seventh orbit',
      at: doc(MSK(17, 30), `${REPORT}, p. 190: «Включил ориентацию в 17.30 на 7-м витке. Давление было 110 атмосфер»`),
    },
    {
      id: 'manual-2-off',
      label: 'Manual orientation off',
      at: doc(
        MSK(17, 55),
        `${REPORT}, p. 191: «Я ручную ориентацию выключил в 17.55»; 102 atm. Vertical to ±20°, not turned in yaw, to save gas`,
      ),
    },
    { id: 'sleep', label: 'Over Moscow: going to sleep', at: doc(MSK(18, 15), `${TASS}; ${CHERTOK}, p. 192`) },
    { id: 'wake', label: 'He wakes, on the thirteenth orbit', at: doc(MSK(26, 35), `${REPORT}, p. 192: 02:35`), also: '02:37 (TASS)' },
    {
      id: 'orientation',
      label: 'Solar orientation on, in the Earth’s shadow',
      at: guess(
        TDU - 35 * 60,
        `the type’s cycle: 35 minutes before the burn, as Vostok 1’s (09:50 for 10:25). Titov: at "about the 34th, maybe 34th to 36th minute" of the index, in the shadow (${REPORT}, p. 195)`,
      ),
    },
    {
      id: 'retro-command',
      label: 'Braking engine commanded on: the third command',
      at: derived(
        TDU,
        'derived two ways, neither from the landing place (mission.md, "The braking burn"): the type’s burn arc, 70.7° before the landing latitude, before the programme’s 51° N on the record’s orbit gives 09:51 to 09:52; the pilot’s landing at 10:18 less Vostok 1’s 27.9 min from command to landing gives 09:50. Titov’s «В 9 час. 57 мин. прошла третья команда» puts the ship near 8° N, twelve minutes short of the landing latitude, on the documented orbit',
      ),
      also: `09:57 (${REPORT}, p. 196; ${ANSWERS}, p. 205: «примерно в 9.57»): not possible on the documented orbit`,
    },
    {
      id: 'retro-on',
      label: 'Braking engine at thrust',
      at: derived(TDU + 3.7, 'the command and the type’s 3.7 s to working mode (Vostok 1’s OKB-1 report)'),
    },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      at: derived(TDU + 3.7 + 40, `forty seconds by ear: «Двигатель работал 40 секунд. Двигатель выключился» (${REPORT}, p. 196)`),
    },
    {
      id: 'modules',
      label: 'The cable bundle burns through: the modules part',
      at: doc(
        MSK(34, 7),
        `${REPORT}, p. 197: «В 10.07 произошло отделение от приборного отсека». By his clock, "approximately". The cable mast’s plate had not been thrown off (${CHERTOK}, pp. 193–194)`,
      ),
      also: 'The modules had been released mechanically ten seconds after the burn and stayed tied by the bundle (Chertok); Siddiqi, from Golovanov: "several straps"',
    },
    {
      id: 'ejection',
      label: 'Hatch No. 1 off and the seat out',
      at: derived(
        MSK(34, 10),
        'not in any document: about 10:09 to 10:11, where the ship would have crossed the landing latitude and up to a minute and a half (Vostok 1’s plan against its orbit): the record research of November 2026',
      ),
      also: 'Titov gives no time and no height: «Затем слышу отстрел люка ... Вылетел сразу» (his report, p. 197). 7 km is the type’s',
    },
    {
      id: 'module-down',
      label: 'Descent module lands',
      at: derived(
        MSK(34, 15),
        'not in any document: before him («Смотрю, шар уже лежит»: his report, p. 199); 10:14 to 10:16 fits the orbit. "25 h 11 min" for the ship (encyclopaedias) is too early for it',
      ),
    },
    {
      id: 'pilot-down',
      label: 'Titov lands',
      at: doc(MSK(34, 18), `${FAI}, the act of landing, p. 222: «в 7 часов 18 минут по гринвичскому времени»`),
      also: '10:11 (RussianSpaceWeb’s table)',
    },
  ],
  ascent: ascent8K72K({
    guidance: {
      azimuth: guess(
        34 + 37 / 60 + 59.2 / 3600,
        'Vostok 1’s aiming azimuth, 34°37′59″.2 (its flight task), for an orbit inclined a minute of arc more than this one’s 64°56′: E103-17’s flight task is not published',
      ),
      vertical: VERTICAL,
      kick: KICK,
      turn: guess(119.5, 'the law changes at the strap-ons’ separation, the type’s 119.5 s'),
      target: {
        at: 'orbit',
        altitude: doc(
          180_000,
          `${MEMO}, p. 153: «Выбор траектории полета корабля с высотой перигея 180 км»: the planned perigee, taken as the height the design put the last cutoff at`,
        ),
        climb: guess(0, 'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one'),
        inclination: doc(64 + 56 / 60, `${FAI}, the Coordination-Computing Centre’s orbit, p. 224: 64°56′`),
      },
    },
    boostersGo: guess(119.5, TYPE('strap-ons’ separation')),
    lastCutoff: guess(677.08, TYPE('third stage’s cutoff')),
    fairing: guess(154.6, TYPE('fairing’s jettison')),
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
        id: 'firstG',
        label: 'Greatest load on the first stage',
        value: 4.5,
        unit: 'g',
        tolerance: 1,
        confidence: 'documented',
        source: `${REPORT}, pp. 183–184: «По моим ощущениям перегрузки не превышали пяти», the greatest at the strap-ons’ cutoff. By feel: 4.5 taken, 1 either way`,
      },
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 183_000,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${FAI}, p. 224: 183 km. NOT an independent check: the law is solved to put the cutoff level at the planned 180 km`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 244_000,
        unit: 'm',
        tolerance: 10_000,
        confidence: 'documented',
        source: `${FAI}, p. 224: 244 km. TASS on the day, "preliminary": 257 km. The hard check of the type’s stages, as Vostok 1’s`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64 + 56 / 60,
        unit: 'deg',
        tolerance: 0.05,
        confidence: 'documented',
        source: `${FAI}, p. 224: 64°56′. On Vostok 1’s aiming azimuth (estimated), so it checks that the two orbits’ planes were alike`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 88.46 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${FAI}, p. 224: 88.46 min. 15 s is some 5 km on the semi-major axis`,
      },
    ],
  }),
  orbit: {
    radius: derived(
      6_363_000,
      'not stated. The determined heights and period agree by Kepler’s law only over a ball of 6,363 km (183 by 244 km with 88.46 min; μ 398,600 km³/s²): the heights are over the ground under the perigee, near 63° N, not over a mean sphere. TASS’s 178 by 257 km and 88.6 min fit 6,371 km (the record research of November 2026)',
    ),
    perigee: doc(
      183_000,
      `${FAI}, the Coordination-Computing Centre’s orbit, p. 224: «Минимальная высота ... 183 000 метров». TASS on the day: 178 km. US tracking (McDowell): 172 km`,
    ),
    apogee: doc(244_000, `${FAI}, p. 224: 244 000 m. TASS: 257 km. McDowell: 218 km`),
    inclination: doc(64 + 56 / 60, `${FAI}, p. 224: 64°56′ (64.93°, Siddiqi’s Table IB, is the same figure)`),
    period: doc(88.46 * 60, `${FAI}, p. 224: 88.46 min. TASS: 88.6 min. Titov timed 89 min by the shadow (his report, p. 188)`),
  },
  injection: {
    at: guess(677.08, `${TYPE('third stage’s cutoff')}. The orbit is taken to begin here`),
    heading: 'north',
    arc: guess(
      27.5,
      'NOT documented: Vostok 1’s reckoning of where its cutoff was, 27.5 degrees of arc downrange, for the same vehicle on the same plane. Flying the ascent replaces it',
    ),
    anomaly: guess(0, 'NOT documented. Perigee is put at the cutoff, as Vostok 1’s'),
  },
  mass: doc(
    4_731,
    `${FAI}, the act of weighing of 5 August 1961, p. 221: «взвешивание полезного груза в 4731 кг», with the pilot in full dress, without the last stage; TASS`,
  ),
  retro: {
    on: derived(TDU + 3.7, 'the command (derived: mission.md) and the type’s 3.7 s to working mode'),
    off: derived(
      TDU + 3.7 + 40,
      `forty seconds of thrust by ear (${REPORT}, p. 196). Pervushin has 45 s, unsourced; what shut it down is not stated`,
    ),
    deltaV: guess(
      136,
      'not found for this flight: the type’s integrator setting, 136 m/s (Chertok, vol. 3, p. 80, of Vostok 1). 1,614 kgf for 40 s on 4.6 t would give 138',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'documented',
      source: `${FAI}, the programme, p. 226: «ориентирование оси тормозного двигателя на Солнце»; Titov saw the Sun in the right window, then the rear one, and the ship steady through the burn (his report, p. 196)`,
    },
  },
  entry: {
    separation: doc(MSK(34, 7), `${REPORT}, p. 197: 10:07, by his clock; the bundle burnt through in the entry`),
    mass: ENTRY_MASS,
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: guess(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961). How the code of No. 4’s lock reached Titov, and what it was, is in no document read: he says only that he switched the lock on',
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: guess(136, 'the type’s integrator setting (Chertok, vol. 3, p. 80)'),
    parting: PARTING,
    // Titov's two periods by hand, by plan («При полёте на втором витке пилот производит проверку ручного управления»: the programme, p. 156)
    periods: [
      {
        from: doc(MSK(10, 0), `${REPORT}, p. 185: the lock on at about 10:00, the ship still in 20 s; the handle from 10:05`),
        to: doc(MSK(11, 0), `${REPORT}, p. 187: off at 11:00`),
        what: 'Titov’s first orientation by hand, by plan on the second orbit: the lock on in the shadow at about 10:00, oriented by 10:15 and held to five or seven degrees',
      },
      {
        from: doc(MSK(17, 30), `${REPORT}, p. 190`),
        to: doc(MSK(17, 55), `${REPORT}, p. 191`),
        what: 'Titov’s second, on the seventh orbit: vertical to twenty degrees, not turned in yaw, to save the gas',
      },
    ],
  },
  supplies: {
    days: doc(
      10,
      `${MEMO}, p. 153, and ${PROGRAMME}, p. 157: supplies for ten days; the orbit’s natural decay planned in two to eight days`,
    ),
    rarefied: RAREFIED,
  },
  ejection: { altitude: guess(7_000, `the type’s barometric switch, about 7 km (${BOBKOV}; ${ZAK}): Titov gives no height`) },
  heating: HEATING,
  descent: {
    ground: guess(
      30,
      'not read: the landing place’s height. The Volga’s left-bank lowland round Krasny Kut lies some 20 to 40 m above the sea',
    ),
    bodies: [
      {
        id: 'module',
        label: 'The descent module, empty',
        mass: guess(
          2_272,
          `the 2,460 kg of the module with its pilot aboard (${SIDDIQI}, p. 195) less a pilot in his suit and a seat, as Vostok 1’s (88 and 100 kg): Titov’s own mass was not read`,
        ),
        dragArea: MODULE_DRAG,
        chutes: MODULE_CHUTES,
      },
      {
        id: 'pilot',
        label: 'Titov, on his seat and then under his canopies',
        mass: guess(188, 'he in his suit and his seat, as Vostok 1’s: not found'),
        dragArea: SEATED_DRAG,
        thrown: THROWN,
        chutes: [
          SEAT_CHUTE,
          mainCanopy(
            m(
              4_000,
              'documented',
              `the type’s: at 4 km, as he leaves the seat (${BOBKOV}). Titov gives no height: a jerk, his feet struck the pack, the seat gone (his report, p. 198)`,
            ),
            guess(131, 'he in his suit with the survival pack, as Vostok 1’s (88 and 43 kg)'),
          ),
          reserveCanopy(
            doc(
              1_000,
              `put out by the automatic, unasked: «Потом ввелся запасной парашют и повис ... Чехол с него слетел на высоте тысячу метров, не раньше» (${REPORT}, p. 198). Its risers wound round the main’s`,
            ),
          ),
        ],
      },
      ...HATCHES,
    ],
    automatic:
      'Titov had no say in the descent: the burn by the ground’s commands, the modules’ parting (the bundle burnt through at 10:07), the hatches and the seat and every parachute were the automatic system’s; the reserve canopy came out unasked',
    torn: TORN,
    crew: CREW,
    checks: [
      {
        id: 'pilot.at',
        label: 'Titov on the ground',
        value: MSK(34, 18),
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${FAI}, the act of landing, p. 222: 07:18 UTC, to the minute`,
      },
      {
        id: 'module.at',
        label: 'Descent module on the ground',
        value: MSK(34, 15),
        unit: 's',
        tolerance: 240,
        confidence: 'derived',
        source: 'before the pilot (his report, p. 199); 10:14 to 10:16 fits the orbit (the record research). No document gives it',
      },
    ],
  },
  landing: {
    latitude: doc(50 + 51 / 60, `${FAI}, p. 222: «50°51′ сев. широты». The memorial: 50°51′10″ N`),
    longitude: doc(47 + 1.5 / 60, `${FAI}, p. 222: «47°01,5′ вост. долготы»`),
    at: doc(MSK(34, 18), `${FAI}, p. 222: ship and pilot both 07:18 UTC`),
    near: 'Krasny Kut',
  },
  checks: [
    {
      id: 'period',
      label: 'Period, from the published heights',
      value: 88.46 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${FAI}, p. 224: 88.46 min. NOT independent: the reference ball is derived from it (orbit.radius)`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 244_000,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${FAI}, p. 224: 244 km`,
    },
    {
      id: 'separationAltitude',
      label: 'Height when the bundle burnt through',
      value: 90_000,
      unit: 'm',
      tolerance: 15_000,
      confidence: 'derived',
      source:
        'the record research: at 10:07 a Vostok on this orbit is some 80 to 100 km up, a minute and a half to two and a half short of the landing latitude; antennas gone, the light orange (his report, p. 197)',
    },
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 10,
      unit: 'g',
      tolerance: 2,
      confidence: 'documented',
      source: `${REPORT}, p. 197: «порядка десяти», held some twenty seconds. By feel`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${FAI}, p. 222: 50°51′ N 47°01.5′ E. The plane is flown from an estimated azimuth; no wind on the parachutes. Independent of the burn's instant`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source: `${FAI}, p. 222. Not wholly independent: the burn’s instant is derived from the programme’s landing latitude, 51° N, and the pilot’s landing time (mission.md), not from this place`,
    },
  ],
};
