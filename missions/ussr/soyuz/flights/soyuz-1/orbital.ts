/**
 * Soyuz 1 as an orbital flight: its record (soyuz-record.ts `SoyuzRecord`), which `flight.ts` writes its plan from
 * (soyuz-plan.ts). The record with its sources and disagreements is set out in README.md and mission.md beside this file; the
 * numbers live here. The launch vehicle is the 11A511's (vehicles/soyuz-11a511-flown.ts) and the ship the 7K-OK's
 * (vehicles/soyuz-7kok-flown.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 03:35:00 Moscow time on
 * 23 April 1967 (00:35:00 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **The flight as the record has it**: the left solar wing folded, one correction on the fifth orbit, the braking burn on the
 * nineteenth after two failed attempts, **an entry flown ballistic** (the descent control system off: no bank is held and its
 * lift is never flown), and the parachutes as they failed: the drogue out with the cover, **the main stayed in its
 * container**, and the reserve, put out by the system on its speed check, **fouled in the shadow of the drogue**, which
 * stayed fast to the main's pack, and did not fill. **No instant of this vehicle's ascent was found**: it is flown on Soyuz 3's
 * vehicle's (Mishin), as the type's.
 */

import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { TORN } from '../../../vostok/vehicles/vostok-3ka.ts';
import { KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { canopy } from '../../../voskhod/vehicles/voskhod-ship.ts';
import { ascent11A511, MPK, stages11A511 } from '../../vehicles/soyuz-11a511-flown.ts';
import {
  AREAS,
  COVER,
  COVER_OFF,
  crewAboard,
  ENERGIA,
  ENTRY_AREA,
  ENTRY_DRAG,
  ENTRY_LIFT,
  HAND_RATE,
  HEATING,
  MAIN_AFTER,
  MODULE_DRAG,
  MODULES,
  RAREFIED,
  RAREFIED_SHIP,
  SIDDIQI,
  SKD,
  SKD_TANKS,
  softLandingEngines,
  TRIM,
} from '../../vehicles/soyuz-7kok-flown.ts';
import type { SoyuzRecord } from '../../vehicles/soyuz-record.ts';
import { orbital as S3 } from '../soyuz-3/orbital.ts';

/** Seconds from liftoff, 03:35:00 Moscow time on 23 April 1967, of a Moscow time on a day of April 1967. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 23) * 24 + h - 3) * 3600 + (min - 35) * 60 + s;

/** Mishin's diaries as Zak gives them: secondary. */
const MISHIN = (page: string) => `Mishin’s diaries as Zak gives them (RussianSpaceWeb, “${page}”, his note 774): secondary`;
const KAMANIN = 'Kamanin’s diary, April 1967 («Скрытый космос», militera.lib.ru/db/kamanin_np/67.html)';
const TSR =
  'Siddiqi, “Fifty years later: Soyuz-1 revisited (part 2)”, The Space Review, 1 May 2017, from the flight’s communications transcripts';
const MPK84 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'pp. 84 and 85');
const GCAT = 'McDowell, General Catalog of Artificial Space Objects (planet4589.org), its launch and satellite catalogues';
const SPACEFACTS = 'Spacefacts, “Soyuz 1” (spacefacts.de/mission/english/soyuz-1.htm)';
const ORBIT_1 = `${MISHIN('Soyuz-1 begins its fateful flight')}, his table of the orbit, the columns “1” and “1,2”`;
const ORBIT_LATE = `${MISHIN('Soyuz-1 begins its fateful flight')}, his table of the orbit, the columns “Planned orbit” and “Actual orbit”, which do not say which orbit they are of: read here as the orbit after the correction of the fifth orbit, being 0.06 to 0.07 min shorter in period than the first orbits’, as a push against the motion of that size leaves it`;

/** The ship in orbit, kg. */
const SHIP = 6_450;
/** The main engine's thrust and exhaust speed, for the impulses worked from times. */
const THRUST = SKD.thrust.value;
const EXHAUST = SKD.isp.value * 9.80665;

/** The correction of the fifth orbit: a push against the motion, Mishin's 3.1 to 3.8 m/s. */
const CORRECTION_ON = MSK(23, 11, 14);
const CORRECTION_DV = (3.1 + 3.8) / 2;
const CORRECTION_OFF = CORRECTION_ON + (SHIP * CORRECTION_DV) / THRUST;
/** The braking burn: on and off as the ground had them; what it gave, from its length at the engine's thrust on the ship. */
const TDU = MSK(24, 5, 57, 15);
const TDU_OFF = MSK(24, 5, 59, 38.5);
const BEFORE_TDU = SHIP - (SHIP * CORRECTION_DV) / EXHAUST;
const TDU_DV = EXHAUST * Math.log(BEFORE_TDU / (BEFORE_TDU - (THRUST / EXHAUST) * (TDU_OFF - TDU)));
/** The modules' parting, as the plan had it. */
const PARTED = MSK(24, 6, 9);
/** The descent control system's "Failure-2". */
const FAILURE_2 = MSK(24, 6, 14, 9);
/** The descent module struck the ground. */
const DOWN = MSK(24, 6, 22, 52);

/** When the strap-ons, the escape tower, the fairing, the core and the aft section went, and Block I was lit and cut. */
const no10 = (at: { value: number; source: string }) =>
  assumed(at.value, `NOT FOUND for this vehicle (11A511 No. 3): Soyuz 3’s vehicle’s, the same type. ${at.source}`);
const S3_AT = (id: string) => S3.events.find((e) => e.id === id)!.at;
const STRAPS = no10(S3.stages[0]!.separation!);
const FAIRING = no10(S3_AT('fairing'));
const TOWER = no10(S3_AT('escape-tower'));
const THIRD = no10(S3.stages[2]!.ignition);
const CORE_CUT = no10(S3.stages[1]!.cutoff);
const CORE_GONE = no10(S3.stages[1]!.separation!);
const AFT = no10(S3_AT('aft-section'));
const CUTOFF = no10(S3.stages[2]!.cutoff);
const PARTS = doc(
  540,
  `${KAMANIN}, 23 April: «через 540 секунд после старта космический корабль “Союз-1” был выведен на орбиту»; the ground had the news of the separation 540 s after liftoff (Chertok, as Zak gives him, “Soyuz-1 begins its fateful flight”). ${GCAT} has it in orbit at 00:43:50 UTC, 530 s, Block I at 00:43:47: before the third stage flown here is cut, on the orbit, at 531 s`,
);

/** The orbital and the instrument modules in orbit: the type's orbital module, and what is left of the ship. */
const SHIP_MODULES = {
  orbital: assumed(MODULES.orbital.value, `the type’s: ${MODULES.orbital.source}`),
  instrument: derived(
    SHIP - MODULES.descent.value - MODULES.orbital.value,
    'the ship’s 6,450 kg less the type’s descent module (2,800 kg) and orbital module (1,200 kg): MPK has the instrument module at 2.7 to 2.8 t, Siddiqi 2,560 kg',
  ),
};

/** The ground where the descent module came down, m above the sea. */
const GROUND = estimated(
  330,
  'NOT FOUND: the open steppe some 65 km east of Orsk, near Karabutak, by judgement from the country round it (Orsk lies at about 200 m on the Ural, the uplands to its east rise to 300 or 400 m)',
);
/** The descent module as it struck: its mass in orbit less the cover it let go. The heat shield stayed on (it goes under the main). */
const STRUCK = MODULES.descent.value - COVER.mass.value;

/** The parachute system started at: the height its barometric switch was set to. */
const PARACHUTES = assumed(
  7_000,
  `NOT FOUND for this flight. Soyuz 3’s day’s plan (Kamanin, 30 October 1968: «срабатывание парашютной системы ... на высоте 7000 метров»), the same system; TASS’s statement had this flight’s main canopy opening "at an altitude of seven kilometers" (${TSR}). The type’s description has 9.5 km (${SIDDIQI}, p. 472)`,
);

export const orbital: SoyuzRecord = {
  craft: { id: 'soyuz-11a511', label: 'The stack' },
  liftoffMass: derived(
    307_390,
    `what the blocks, the head block and the ship weigh fuelled, as this record has them: four strap-ons of 43.325 t, the core’s 100.24 t, Block I’s 25.45 t, the escape tower and fairing’s 1.95 t (${MPK}) and the ship’s 6.45 t: 307.39 t`,
  ),
  stages: stages11A511({
    // (cut as they are let go, as every R-7 flight's here)
    boosters: { cutoff: STRAPS, separation: STRAPS },
    core: { cutoff: CORE_CUT, separation: CORE_GONE },
    third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTS },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff from Site 1',
      at: doc(0, `${MPK84}: «Старт: 23 апреля 1967 г. в 03:35:00 ДМВ; стартовая площадка №1»; ${GCAT}: 00:35:00 UTC`),
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'escape-tower', label: 'The escape tower let go', at: TOWER },
    { id: 'fairing', label: 'Fairing jettisoned', at: FAIRING },
    { id: 'third', label: 'Third stage alight through the lattice', at: THIRD },
    { id: 'core-off', label: 'The core let go', at: CORE_GONE },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off', at: CUTOFF },
    {
      id: 'spacecraft-separates',
      label: 'Soyuz 1 separates from the third stage; the left solar wing does not open',
      at: PARTS,
      also: `telemetry had every antenna out and the left solar wing folded, caught (MPK) on the insulation of the instrument module’s skirt; the 45K solar and star sensor fogged (${MISHIN('Soyuz-1 begins its fateful flight')}; ${MPK84})`,
    },
    {
      id: 'wing-reported',
      label: 'Komarov reports the left solar wing folded, the charging current 13 to 14 A and the turn to the Sun failed',
      at: estimated(MSK(23, 5, 0), `on the second orbit (${KAMANIN}, 23 April): the minute is ours`),
    },
    {
      id: 'correction',
      label: 'The correction of the fifth orbit, on the main engine and the approach and orientation thrusters',
      at: doc(
        CORRECTION_ON,
        `${MISHIN('Soyuz-1 begins its fateful flight')}: "Komarov successfully conducted that 'passing correction' at 11:14 Moscow Time, during the 5th orbit". ${KAMANIN}, 23 April: the State Commission decided «провести коррекцию орбиты “Союза-1”»`,
      ),
    },
    {
      id: 'retro-17',
      label: 'The braking burn on the 17th orbit inhibited: the ion sensors lose the flow in the shadow',
      at: doc(
        MSK(24, 2, 56, 12),
        `${MISHIN('Soyuz-1 attempts to return to Earth')}: "the SKD engine was scheduled for fire for 146 seconds beginning at 02:56:12 Moscow Time"; ${TSR}`,
      ),
    },
    {
      id: 'retro-orientation',
      label: 'Komarov orients the ship by hand in daylight, holds it on the gyroscopes through the shadow, corrects it by hand',
      at: doc(MSK(24, 4, 57), `Komarov, “At 0457 I switched on the [manual orientation]” (${TSR})`),
    },
    {
      id: 'retro-on',
      label: 'Main engine on: the braking burn',
      at: doc(TDU, `${TSR}: "the engine had indeed fired for 146 seconds, from 0557:15 to 0559:38.5"; the plan’s 05:57:15 (Mishin)`),
    },
    {
      id: 'retro-off',
      label: 'Main engine off: “The engine worked for 146 seconds. All is normal”',
      at: doc(
        TDU_OFF,
        `${MISHIN('Soyuz-1 attempts to return to Earth')}: "cut off at 05:59:38.5 Moscow Time after firing for 146 seconds"`,
      ),
      also: 'the ground’s instants are 143.5 s apart, Komarov’s report 146 s',
    },
    {
      id: 'modules',
      label: 'The modules part: “Separation...”',
      at: doc(
        PARTED,
        `the plan’s instant, ${MISHIN('Soyuz-1 attempts to return to Earth')}: "Descent module separation (UHF activation) 06:09"; Komarov’s last words reported it (${TSR}). When it happened is not recorded`,
      ),
    },
    {
      id: 'failure-2',
      label: 'The descent control system’s “Failure-2”: the entry goes on ballistic, without its lift',
      at: doc(
        FAILURE_2,
        `${MISHIN('Soyuz-1 attempts to return to Earth')}: "At 06:14:09, the Failure-2 command interrupted the nominal descent"`,
      ),
      also: `the attitude past eight degrees off, the ship being lopsided with one wing (Raushenbakh, ${TSR}); ${MPK84}: «ДПО не справились с возмущающим моментом из-за асимметрии корабля, и спуск проходил по баллистической траектории»; ${ENERGIA}: «из-за неполадок на борту был выбран режим баллистического спуска»; ${TSR}: the 19th orbit’s plan was a ballistic entry`,
    },
    {
      id: 'cover-off',
      label: 'The parachute system starts: the cover goes and the drogue comes out; the main stays in its container',
      at: estimated(
        MSK(24, 6, 21),
        `NOT FOUND: the radar tracked the module from 06:19:20 (${MISHIN('Investigation into the Soyuz-1 accident')}); some 7 km up at the drogue’s speed, about two minutes before the ground. The drogue’s and the reserve’s pilot parachutes were found 15 and 10 km short of the site (Mishin, as above)`,
      ),
    },
    {
      id: 'module-down',
      label: 'The descent module strikes the ground near Karabutak, 65 km east of Orsk: Komarov is killed',
      at: doc(
        DOWN,
        `${MPK84}: «Падение: 24 апреля 1967 г. в 06:22:52 ДМВ; в 65 км восточнее г.Орск, в районе пос.Карабулак»; three watches found at the site stopped at 06:23:00, 06:23:30 and 06:24 (${MISHIN('Investigation into the Soyuz-1 accident')})`,
      ),
    },
  ],
  ascent: ascent11A511({
    // (no aiming azimuth was found: the launch plane is solved for the inclination reached)
    guidance: {
      vertical: VERTICAL,
      kick: KICK,
      turn: STRAPS,
      target: {
        at: 'third-stage-off',
        altitude: doc(200_900, `${ORBIT_1}: perigee 200.9 km on the first orbit, taken as the height the design put the last cutoff at`),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(51.67, ORBIT_1),
      },
    },
    boostersGo: STRAPS,
    lastCutoff: CUTOFF,
    tower: TOWER,
    fairing: FAIRING,
    aft: AFT,
    left: {
      booster: assumed(5_250, 'Soyuz 3’s: its 3.85 t empty and the 1,400 kg the ascent flown on the same instants leaves in each'),
      core: assumed(12_440, 'Soyuz 3’s: its 6.94 t empty and the 5,500 kg the ascent flown on the same instants leaves'),
      blockI: assumed(3_700, 'Soyuz 3’s: its 2.5 t empty and the 1,200 kg the ascent flown on the same instants leaves'),
    },
    modules: SHIP_MODULES,
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 200_900,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${ORBIT_1}. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 224_100,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${ORBIT_1}; TASS’s 224 km (NASA translation ST-PR-10595, p. 1). The hard check of the type’s stages`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 51.67,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${ORBIT_1}. NOT independent: the launch plane is solved for it`,
      },
    ],
  }),
  orbit: {
    perigee: doc(200_900, `${ORBIT_1}; TASS: 201 km. Siddiqi’s table (Table IA) has 203.1 by 221.1 km, ${GCAT} 194 by 210`),
    apogee: doc(224_100, `${ORBIT_1}; TASS: 224 km`),
    inclination: doc(51.67, `${ORBIT_1}; TASS: «51 градус 40 минут»`),
  },
  injection: {
    at: CUTOFF,
    heading: 'north',
    arc: estimated(
      16.5,
      'NOT documented: where the type’s ascent flown on Soyuz 3’s instants has the cutoff, degrees of arc round from the pad. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as the Vostoks’ and the Voskhods’'),
  },
  mass: doc(SHIP, `${SIDDIQI}, Table IA: 6,450 kg; ${GCAT}: 6,450 kg`),
  modules: SHIP_MODULES,
  engine: {
    ...SKD,
    propellant: assumed(
      SKD_TANKS.value,
      `NOT FOUND what this ship carried: the most the tanks held (${SKD_TANKS.source}), taken as full for a flight that was to make the rendezvous`,
    ),
  },
  burns: [
    {
      id: 'correction',
      label: 'The correction of the fifth orbit',
      attitude: {
        label: 'Against the motion',
        aim: 'velocity',
        sense: -1,
        confidence: 'documented',
        source: `a small braking manoeuvre: it "reduced the speed of the spacecraft by between 3.1 and 3.8 meters per second" (${MISHIN('Soyuz-1 begins its fateful flight')})`,
      },
      turned: estimated(CORRECTION_ON - 600, 'ten minutes before the firing: when the ship was turned to it is not recorded'),
      on: doc(CORRECTION_ON, `${MISHIN('Soyuz-1 begins its fateful flight')}: 11:14 Moscow Time, the 5th orbit`),
      off: estimated(CORRECTION_OFF, 'as long after as the impulse below takes at the main engine’s 417 kgf on the ship'),
      deltaV: derived(
        CORRECTION_DV,
        `the middle of Mishin’s 3.1 to 3.8 m/s (${MISHIN('Soyuz-1 begins its fateful flight')}), which also has "between 102 and 111 kilograms of propellant in the DPO system" spent on it: Bushuev’s plan was the main engine and several approach and orientation thrusters together, Komarov moved to the left seat to bring the centre of mass back to the thrust line. Flown on the main engine alone`,
      ),
    },
  ],
  retro: {
    turned: doc(MSK(24, 4, 57), `Komarov: “At 0457 I switched on the [manual orientation]” (${TSR})`),
    on: doc(TDU, `${TSR}: "from 0557:15"; Mishin’s instruction "At 05:57:15, activate the SKD engine" (Zak)`),
    off: doc(TDU_OFF, `${TSR}: "to 0559:38.5"; Komarov’s report, 146 s`),
    deltaV: derived(
      TDU_DV,
      `the ground’s 143.5 s at the main engine’s 417 kgf and 278 s on the ship after the correction: ${TDU_DV.toFixed(1)} m/s (Komarov’s 146 s would give 94.3). No impulse was found for it; "the braking maneuver was long enough to guarantee the reentry" (Raushenbakh, Zak). MPK: «Двигатель выдал заданный тормозной импульс»`,
    ),
    aim: {
      along: 'velocity',
      sense: -1,
      confidence: 'documented',
      source: `tail first, the main engine against the motion: "Turn the spacecraft 180 degrees (tail first) ... in preparation for the SKD engine firing" (Mishin’s instructions, Zak); "The ship was oriented properly" (Komarov, ${TSR})`,
    },
  },
  entry: {
    separation: doc(
      PARTED,
      `the plan’s instant: ${MISHIN('Soyuz-1 attempts to return to Earth')}, "Descent module separation (UHF activation) 06:09"`,
    ),
    mass: assumed(MODULES.descent.value, `the type’s: ${MODULES.descent.source}`),
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
    lift: ENTRY_LIFT,
    trim: TRIM,
    // (no bank: flown ballistic, the descent control system off after its "Failure-2" or on a ballistic plan; the record's
    // events, `failure-2`. Its lift is never flown)
  },
  manual: {
    rate: HAND_RATE,
    parting: derived(PARTED - TDU_OFF, 'the modules parting as long after a burn by hand as the plan had them after the record’s'),
  },
  supplies: {
    days: derived(
      (23 * 88.62 * 60) / 86_400,
      `what the batteries could keep the ship alive for with one wing folded: "enough power for a 17-orbit flight" (${MISHIN('Soyuz-1 begins its fateful flight')}); on the 18th orbit "available resources of the primary battery would work for another orbit or two and the backup battery would supply power for three more orbits" (Yablokova, as Zak gives Chertok): some 23 orbits of 88.62 min. The type had 10 days (MPK, p. 80)`,
    ),
    rarefied: RAREFIED,
  },
  rarefied: RAREFIED_SHIP,
  ejection: { altitude: PARACHUTES, event: COVER_OFF },
  heating: HEATING,
  descent: {
    ground: GROUND,
    bodies: [
      {
        id: 'module',
        label: 'The descent module, with Komarov',
        mass: estimated(
          STRUCK,
          `the type’s 2,800 kg (${MODULES.descent.source}) less the cover it lets go (estimated): its heat shield stayed on, being let go under the main parachute`,
        ),
        dragArea: MODULE_DRAG,
        chutes: [
          canopy({
            name: 'drogue parachute',
            after: doc(0, `drawn out as the cover is shot off (${SIDDIQI}, p. 472). ${MPK84}: «Тормозной парашют раскрылся»`),
            area: AREAS.drogue,
            fills: estimated(2, 'chosen: no filling time found'),
          }),
          {
            ...canopy({
              name: 'main parachute',
              after: MAIN_AFTER,
              area: AREAS.main,
              fills: estimated(10, 'chosen: a reefed canopy of 1,000 m², no filling time found'),
              instead: ['drogue parachute'],
            }),
            stays: {
              confidence: 'documented',
              source: `the commission (Utkin): the main parachute’s pack did not come out of its container, held by its walls, pressed in by the cabin’s atmosphere against the low pressure in the opened container, the drogue not pulling hard enough (${ENERGIA}: «невыхода из контейнера блока (упаковки) основного парашюта»; ${MPK84}). Found at the site: the main canopy and the line that moves its suspension still stowed (${MISHIN('Investigation into the Soyuz-1 accident')}). Chertok’s later account blames the container’s walls made sticky in the autoclave; either way the hardware would not let it out`,
            },
          },
          {
            ...canopy({
              name: 'reserve parachute',
              altitude: estimated(
                2_000,
                `NOT FOUND for this flight: «Согласно логике работы системы в действие был введен запасной парашют» (${MPK84}), the automatics finding the speed too high (${ENERGIA}). The later Soyuz’s logic (Popov, «Спускаемый аппарат корабля “Союз”», astronaut.ru) watches the speed for 50 s after 5.5 km, where the main should be steady: at the drogue’s 70 m/s that is some 2 km up. Ours`,
              ),
              area: AREAS.reserve,
              fills: estimated(8, 'chosen: no filling time found'),
            }),
            fouls: {
              by: ['drogue parachute'],
              confidence: 'documented',
              source: `${ENERGIA}: «купол этой системы не наполнился, так как был затенен тормозным парашютом, жестко связанным с невышедшей из контейнера упаковкой основного»; ${MPK84}: «он не раскрылся, так как оказался в аэродинамической тени от тормозного парашюта». Streaming, it keeps a twentieth of its drag area (TORN, estimated, as every torn canopy here). The drogue could not be let go: the emergency release for it was fitted after this flight (${ENERGIA})`,
            },
          },
        ],
        motors: [softLandingEngines(GROUND, STRUCK)],
      },
      COVER,
    ],
    automatic:
      'Komarov oriented the ship for the burn by hand and on the gyroscopes; the burn’s cutoff, the parting, the entry, the parachutes and the reserve were the automatic system’s. No command of the crew’s own for the parachutes is in any source read, and nothing aboard could let the drogue go',
    torn: TORN,
    crew: crewAboard(),
    lands: { on: 'land', ship: 'the descent module' },
    checks: [
      {
        id: 'module.at',
        label: 'The descent module strikes the ground',
        value: DOWN,
        unit: 's',
        tolerance: 120,
        confidence: 'documented',
        source: `${MPK84}: 06:22:52 Moscow time; ${GCAT}: 03:22:52 UTC; the watches found at the site, 06:23:00 to 06:24; Kamanin’s 06:24, the radar’s projection. Dependent on the parting’s instant (the plan’s)`,
      },
      {
        id: 'module.speed',
        label: 'Speed at the ground',
        value: 37.5,
        unit: 'm/s',
        tolerance: 2.5,
        confidence: 'documented',
        source: `the sources disagree: ${KAMANIN}, his report from the site on the day, «ударился о землю со скоростью 35–40 метров в секунду», taken here; ${TSR}: 40 m/s, 144 km/h; ${MPK84}: «с огромной скоростью (более 50 м/с)»; the flight surgeons Bychkov and Artamoshin as Zak gives them: 26 to 30 m/s, 200 km/h. Dependent on what a fouled canopy keeps of its drag (estimated) and the height the reserve came out at (estimated)`,
      },
    ],
  },
  landing: {
    aimed: {
      confidence: 'documented',
      source: `the burn was timed for the reserve landing area east of Orsk, for a ballistic entry: «корабль сошел с орбиты и должен приземлиться в 50 километрах восточнее Орска» (${KAMANIN}, 24 April); "a reserve landing point for the mission, about 67 kilometers east of Orsk" (${TSR}). The place it came down, 65 km east of Orsk, is taken for the place its burn was timed for`,
    },
    latitude: doc(51 + 21 / 60 + 41 / 3600, `${SPACEFACTS}: 51°21′41″ N. ${GCAT}: 51 N 58 E, to a degree`),
    longitude: doc(59 + 33 / 60 + 45 / 3600, `${SPACEFACTS}: 59°33′45″ E, "3 km of Karabutak"`),
    at: doc(DOWN, `${MPK84}: 06:22:52 Moscow time`),
    near: 'Karabutak, east of Orsk',
  },
  checks: [
    {
      id: 'corrected.perigee',
      label: 'Perigee after the correction of the fifth orbit',
      value: 199_200,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${ORBIT_LATE}: "Actual orbit" perigee 199.2 km. Read an orbit after the firing`,
      at: CORRECTION_ON + 5_400,
    },
    {
      id: 'corrected.apogee',
      label: 'Apogee after the correction of the fifth orbit',
      value: 219_800,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${ORBIT_LATE}: 219.8 km`,
      at: CORRECTION_ON + 5_400,
    },
    {
      id: 'corrected.period',
      label: 'Period after the correction of the fifth orbit',
      value: 88.56 * 60,
      unit: 's',
      tolerance: 15,
      confidence: 'documented',
      source: `${ORBIT_LATE}: 88.56 min; the first orbits’ 88.62 and 88.63`,
      at: CORRECTION_ON + 5_400,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${SPACEFACTS}’s point, and Kamanin’s 50 km east of Orsk aimed against the 65 km where it came down`,
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
