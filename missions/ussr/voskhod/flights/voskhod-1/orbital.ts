/**
 * Voskhod 1 as an orbital flight: its record (vostok-record.ts `VostokRecord`, the shape every flight on an R-7 has here), which
 * `flight.ts` writes its plan from (vostok-plan.ts). The record with its sources and disagreements is set out in README.md and
 * mission.md beside this file; the numbers live here. The launch vehicle is the 11A57's (vehicles/voskhod-11a57-flown.ts) and
 * the ship the Voskhod's (vehicles/voskhod-ship.ts); what is here is this flight's.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 10:30:01 Moscow time on
 * 12 October 1964 (07:30:01 UTC). The checks were written before this record was flown, from how well each figure is known.
 *
 * **No document of this ascent has been found** but its two last instants: the third stage's cutoff at 523 s (Kamanin;
 * Siddiqi) and the spacecraft's separation at 525 s (Chertok). The others are Kosmos 47's six days before (Kamanin's diary),
 * the same type from the same pad (`assumed`). **The descent is heard more than recorded**: the braking burn's start to the
 * second rests on one secondary account (Zak, from Baturin), its length and impulse were not found, and no height of the
 * landing system's steps after the parachute container's cover is in anything read.
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
  RAREFIED,
  softLanding,
  TDU_THRUST,
  TORN,
} from '../../vehicles/voskhod-ship.ts';
import { AFT_MASS, ascent11A57, BLOCK_I, CORE_11A57, SIDDIQI, STRAP_ONS_11A57, stages11A57 } from '../../vehicles/voskhod-11a57-flown.ts';
import { BOBKOV, GCTC, KICK, VERTICAL } from '../../../vostok/vehicles/vostok-8k72k.ts';
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';

/** Seconds from liftoff, 10:30:01 Moscow time on 12 October 1964, of a Moscow time on a day of October 1964. */
export const MSK = (day: number, h: number, min: number, s = 0): number => ((day - 12) * 24 + h - 10) * 3600 + (min - 30) * 60 + (s - 1);

const KAMANIN = 'Kamanin’s diary, October 1964 («Скрытый космос», book 2; militera.lib.ru/db/kamanin_np/64.html)';
const TASS = 'TASS, 12 and 13 October 1964, as printed in «Заря Востока» (Tbilisi), Nos. 241 and 242, p. 1';
const CHERTOK = 'Chertok, Rockets and People, vol. 3 (NASA SP-2009-4110)';
const RSW =
  'Zak, RussianSpaceWeb, “Voskhod-1: the landing”, citing Baturin (ed.), «Мировая пилотируемая космонавтика» (2005), which was not read: secondary';
/** OKB-1's prospectus for the ship, 12 February 1964: the design, five months before it was built. */
const PROSPECTUS = 'OKB-1, prospectus «Многоместный космический корабль "Восход"», 12 February 1964 (roscosmos.ru/26922, as archived)';
const SPACEFACTS = 'spacefacts.de, “Voskhod 1”: 54°02′00″ N 68°08′00″ E, printed beside “312 km northwest” of Kustanay';
/** Kosmos 47's instant, taken for this vehicle: the words for an instant this flight's record does not give. */
const KOSMOS_47 = (what: string, at: string) =>
  `NOT this flight’s: Kosmos 47’s ${what}, ${at} on 6 October 1964 («На 120-й секунде отделяются боковушки, на 150-й — сбрасывается обтекатель, на 290-й — начинает работать последняя ступень, а на 523-й секунде корабль выходит на орбиту»: ${KAMANIN}, 6 October), the same type from the same pad, taken for this vehicle`;

/** The braking engine's start, as the one account with seconds has it. */
const TDU = MSK(13, 10, 18, 58);
/** How long it burned: not found; the most it could, which is also what the type's impulse takes on this ship. */
const BURN = 45;
/** When the strap-ons, the fairing and the core went, and when Block I lit and its aft section went. */
const STRAPS = assumed(120, KOSMOS_47('strap-ons’ separation', '120 s'));
const THIRD = assumed(290, KOSMOS_47('third stage’s start, the core cut loose', '290 s'));
const AFT = estimated(
  300,
  'NOT FOUND: the aft section let go some ten seconds after the core, once the stage has pulled clear of the lattice: the order of today’s Soyuz’s, by judgement',
);
const CUTOFF = doc(523, `${KAMANIN}, 12 October: «Томительные 523 секунды — и вздох облегчения»; ${SIDDIQI}, p. 423: "T+523 seconds"`);
const PARTED = doc(
  525,
  `${CHERTOK}, p. 239: "After 525 seconds of flight, Vorshev triumphantly announced: 'We have separation of the object.'"`,
);

/** The ball's parachutes' areas, m² of canopy: what they drag (here) and how they are drawn (flight.ts) are both from these. */
export const AREAS = [
  {
    name: 'pilot parachute',
    area: assumed(1.5, `the Vostok ball’s, 1.5 m² (${BOBKOV}; ${GCTC}): the 3KV’s "exhaust" parachute (${SIDDIQI}, p. 411) was not found`),
  },
  {
    name: 'braking parachute',
    area: assumed(18, `the Vostok ball’s, 18 m² (${BOBKOV}; ${GCTC}): the 3KV’s braking parachute (${SIDDIQI}, p. 411) was not found`),
  },
  {
    name: 'main parachutes',
    area: assumed(
      2 * 574,
      `two of the Vostok ball’s main canopy, 574 m² each (${BOBKOV}; ${GCTC}): "two primary parachutes" (${SIDDIQI}, p. 411), «с двумя куполами парашютов» (${KAMANIN}, 13 October); their own area was not found. Under them the 2.9 t ball falls 7.4 m/s at the ground, as flown here, where Kamanin had the design’s 7 to 8 should the rocket fail`,
    ),
  },
];
const area = (name: string) => AREAS.find((a) => a.name === name)!.area;
/** The ground under the landing, m above the sea. */
const GROUND = estimated(
  165,
  'NOT FOUND in any source. ETOPO 2022 at spacefacts’ point is 163 m above the geoid, 160 to 168 within 2 km; the point itself is estimated (`landing`)',
);
/** The ball once its cover has gone: what touches down. */
const LANDED = 2_900 - COVER.mass.value;
/** The design's speed at the ground under the main parachutes, should the rocket fail, m/s (Kamanin's 7 to 8). */
const UNDER = 7.5;
/** What the soft-landing rocket was to leave of it, m/s, and the probe's reach below the ball, m (Siddiqi, p. 411). */
const LEFT = 0.2;
const PROBE = doc(1.2, `${SIDDIQI}, p. 411: the probe "deployed ... to a length of 1.2 meters"; Zak: "a special 120-centimeter probe"`);
/** Its even deceleration over the probe's reach, m/s^2: the design's speeds over its length. */
const DECEL = (UNDER ** 2 - LEFT ** 2) / (2 * PROBE.value);
const ROCKET_SAYS = `NOT FOUND: no thrust, impulse, burn or mass of it is in anything read, and Zak has "a small cluster of solid rockets" where ${SIDDIQI}, p. 411, has "one solid-propellant engine affixed to the base of the parachute". Worked from the design: from Kamanin’s 7 to 8 m/s under the main parachutes («если откажет движок, то «Восход» соприкоснется с Землей на скорости 7–8 метров в секунду», 13 October) to Siddiqi’s "bearable two-tenths meter per second" over the probe’s 1.2 m, at an even deceleration of ${DECEL.toFixed(1)} m/s², which is ours`;

export const orbital: VostokRecord = {
  craft: { id: 'voskhod-11a57', label: 'The stack' },
  liftoffMass: derived(
    4 * STRAP_ONS_11A57.mass.value + CORE_11A57.mass.value + BLOCK_I.mass.value + AFT_MASS.value + 800 + 5_320,
    'what the blocks, the fairing (0.8 t, the Vostok-K’s) and the ship weigh fuelled, as this record has them: 305.8 t. McDowell’s table of launch vehicles has 305.1 t for the 11A57; Brügge 309.8 t; Siddiqi’s Table VI prints "—"',
  ),
  stages: stages11A57({
    boosters: { cutoff: STRAPS, separation: STRAPS },
    core: { cutoff: THIRD, separation: THIRD },
    third: { ignition: THIRD, cutoff: CUTOFF, separation: PARTED },
  }),
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(0, `${SIDDIQI}, p. 423 and the launch log: "exactly 1030 hours, 1 second Moscow Time"; McDowell’s launch log: 07:30:01 UTC`),
      also: '«Точно в 12:30 по местному времени (в 10:30 по московскому)» (Kamanin): to the minute',
    },
    { id: 'strap-ons-off', label: 'The four strap-ons separate', at: STRAPS },
    { id: 'fairing', label: 'Fairing jettisoned', at: assumed(150, KOSMOS_47('fairing’s jettison', '150 s')) },
    { id: 'third', label: 'Third stage alight; the core cut loose', at: THIRD },
    { id: 'aft-section', label: 'Block I’s aft section let go', at: AFT },
    { id: 'third-stage-off', label: 'Third stage cut off: in orbit, “an agonising 523 seconds”', at: CUTOFF },
    {
      id: 'spacecraft-separates',
      label: 'Spacecraft separates from the third stage',
      at: PARTED,
      also: 'McDowell’s catalogue: 07:39 UTC, to the minute',
    },
    {
      id: 'manual-1',
      label: 'Komarov turns the ship by hand against the stars, on the sixth orbit',
      at: estimated(
        MSK(12, 18, 0),
        `on the sixth orbit (${TASS}, 13 October): 18:00 to 19:30, the orbit reckoned from the period; when within it, not found`,
      ),
    },
    {
      id: 'manual-1-off',
      label: 'The sixth orbit ends',
      at: estimated(MSK(12, 19, 30), 'the sixth orbit’s end, reckoned from the period'),
    },
    {
      id: 'sun-orientation',
      label: 'The ship turns itself for the braking burn',
      at: doc(MSK(13, 9, 55, 39), `${RSW}: 09:55:39`),
    },
    {
      id: 'retro-on',
      label: 'Braking engine on, over the Gulf of Guinea',
      at: doc(TDU, `${RSW}: 10:18:58`),
      also: `${CHERTOK}, p. 241: "at 1008 hours 56 seconds over the Gulf of Guinea, during the 16th orbit, the braking engine should be started up", the sequencer’s programme`,
    },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      at: estimated(
        TDU + BURN,
        'NOT FOUND: its longest burn, 45 s (the TDU-1’s), taken: on 5.3 t its 1,614 kgf take that long to give the type’s 136 m/s',
      ),
      also: `«Через 2–3 минуты ИПы доложили о прохождении команд „Спуск-1“ и „Спуск-2“»; the ships Dolinsk and Krasnodar relayed at 10:25 "that the commands for engine startup and shutdown had passed" (${CHERTOK}, p. 241)`,
    },
    {
      id: 'modules',
      label: 'The modules part',
      at: estimated(TDU + BURN + PARTING.value, `the burn and the type’s ten seconds after it (${PARTING.source})`),
      also: `Moscow first heard the «ПО» signal, that the command to part the modules had passed (${KAMANIN}, 13 October)`,
    },
    {
      id: 'beacon',
      label: 'Moscow hears the ball’s beacon: it is alone',
      at: doc(MSK(13, 10, 22, 30), `${KAMANIN}, 13 October: «В 10:22:30 Москва сообщила, что слышит сигнал „СА“»`),
    },
    {
      id: 'cover-off',
      label: COVER_OFF.label,
      at: estimated(
        MSK(13, 10, 38),
        'not recorded as an instant: «Отстрелилась крышка парашютного люка» over the Kustanay area (Kamanin, 13 October). Some nine minutes before touchdown, as from 5 km on the ball’s parachutes, ours',
      ),
    },
    {
      id: 'module-down',
      label: 'Touchdown under two parachutes, 312 km north-east of Kustanay',
      at: derived(
        MSK(13, 10, 47, 4),
        `liftoff and the duration, 1 d 0 h 17 min 3 s (${SIDDIQI}, p. 425 and Table IB); ${TASS}: «в 10 часов 47 минут по московскому времени»`,
      ),
    },
  ],
  ascent: ascent11A57({
    // (no aiming azimuth was found: the launch plane is solved for the inclination reached)
    guidance: {
      vertical: VERTICAL,
      kick: KICK,
      turn: STRAPS,
      target: {
        at: 'third-stage-off',
        altitude: doc(
          177_500,
          `${SIDDIQI}, p. 423: "Initial orbital parameters were 177.5 x 408 kilometers at a 64.9-degree inclination—exactly as planned": the perigee taken as the height the design put the last cutoff at`,
        ),
        climb: estimated(
          0,
          'level at the last cutoff, so that it is the perigee: the usual design for a direct ascent, not read for this one',
        ),
        inclination: doc(64.9, `${SIDDIQI}, p. 423: 64.9°`),
      },
    },
    boostersGo: STRAPS,
    lastCutoff: CUTOFF,
    fairing: assumed(150, KOSMOS_47('fairing’s jettison', '150 s')),
    aft: { at: AFT, mass: AFT_MASS },
    left: {
      booster: derived(5_130, 'its 3.75 t empty and the 1,380 kg the ascent flown leaves in each'),
      core: derived(12_305, 'its 6.8 t empty and the 5,505 kg the ascent flown leaves'),
      blockI: derived(4_078, 'its 2.83 t empty (Brügge’s figures less the aft section) and the 1,248 kg the ascent flown leaves'),
    },
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at the last cutoff',
        value: 177_500,
        unit: 'm',
        tolerance: 5_000,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 423: 177.5 km. NOT an independent check: the law is solved to put the cutoff level there`,
      },
      {
        id: 'apogee',
        label: 'Apogee at the last cutoff',
        value: 408_000,
        unit: 'm',
        tolerance: 15_000,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 423: 408 km. The hard check of the type’s stages`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 64.9,
        unit: 'deg',
        tolerance: 0.1,
        confidence: 'documented',
        source: `${SIDDIQI}, p. 423: 64.9°. NOT independent: the launch plane is solved for it`,
      },
      {
        id: 'period',
        label: 'Period at the last cutoff',
        value: 90.1 * 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${TASS}: 90.1 min «по предварительным данным». 15 s is some 6 km on the semi-major axis`,
      },
    ],
  }),
  orbit: {
    perigee: doc(177_500, `${SIDDIQI}, p. 423 and Table IB (p. 876); the Soviet encyclopedia («высота перигея 177,5 км»). ${TASS}: 178 km`),
    apogee: doc(408_000, `${SIDDIQI}, p. 423 and Table IB; the Soviet encyclopedia («высота апогея 408 км»). ${TASS}: 409 km`),
    inclination: doc(64.9, `${SIDDIQI}, p. 423: 64.9° (his Table IB gives none). TASS and the UN registration: «около 65 градусов», 65`),
    period: doc(90.1 * 60, `${TASS}, 12 October: «период обращения — 90,1 минуты», «по предварительным данным»`),
  },
  injection: {
    at: CUTOFF,
    heading: 'north',
    arc: estimated(
      15.6,
      'NOT documented: where the type’s ascent flown on this record’s instants has the cutoff, 15.6 degrees of arc round from the pad. Flying the ascent replaces it',
    ),
    anomaly: estimated(0, 'NOT documented. Perigee is put at the cutoff, as the Vostoks’'),
  },
  mass: doc(
    5_320,
    `${SIDDIQI}, p. 412 and Table IB: 5,320 kg; McDowell’s log the same. Chertok (vol. 3, p. 231) has the mass rising "to 5.7 metric tons"`,
  ),
  retro: {
    on: doc(TDU, `${RSW}: 10:18:58. ${CHERTOK}, p. 241, has 10:08:56 as the programme’s time`),
    off: estimated(TDU + BURN, 'NOT FOUND: the TDU-1’s longest burn, 45 s, taken'),
    deltaV: assumed(
      136,
      'NOT FOUND for this flight: the Vostok’s integrator setting, 136 m/s (Chertok, vol. 3, p. 80, of Vostok 1), taken for the 3KV. Encyclopedia Astronautica (tertiary) gives the module’s 155 m/s',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'assumed',
      source:
        'the Vostok’s solar orientation, which the 3KV kept beside its new ion sensors that found the line of flight by night (spacecraft.md): which of the two aimed this burn is not found',
    },
  },
  entry: {
    separation: estimated(TDU + BURN + PARTING.value, `the burn and the type’s ten seconds after it (${PARTING.source})`),
    mass: doc(2_900, `${SIDDIQI}, p. 412: 2,900 kg, “about 500 kilograms heavier than Vostok”, with the crew aboard`),
    area: ENTRY_AREA,
    drag: ENTRY_DRAG,
  },
  manual: {
    code: assumed(
      145,
      'Vostok 1’s code, 1-4-5 (Kamanin’s diary, 12 April 1961), taken: whether the 3KV’s hand controls were locked, and how, is in nothing read',
    ),
    rate: HAND_RATE,
    thrust: TDU_THRUST,
    deltaV: assumed(136, 'the Vostok’s integrator setting (Chertok, vol. 3, p. 80)'),
    parting: PARTING,
    periods: [
      {
        from: estimated(MSK(12, 18, 0), 'the sixth orbit’s start, reckoned from the period'),
        to: estimated(MSK(12, 19, 30), 'the sixth orbit’s end, reckoned from the period'),
        what: 'Komarov’s orientation by hand on the sixth orbit, against the stars (TASS, 13 October 1964); when within the orbit, not found',
      },
    ],
  },
  supplies: {
    days: doc(
      3,
      `${KAMANIN}, 13 October: resources for three days. Chertok has two; Siddiqi’s engineers allowed "at most one full day of safety" for the leak`,
    ),
    rarefied: RAREFIED,
  },
  ejection: {
    altitude: doc(
      5_000,
      `the design: the parachute hatch’s cover shot off at 5,000 m (${PROSPECTUS}); Voskhod 2’s landing system on «at 5,000 m and 220 m/s» (its record). Not a measurement. Kamanin (2 September 1964) has the hatch opened «на высоте 7–8 километров по сигналу от датчика барометрического давления» in the drop tests`,
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
        mass: estimated(LANDED, `${SIDDIQI}, p. 412: 2,900 kg with the crew aboard, less the cover’s ${COVER.mass.value} kg (estimated)`),
        dragArea: MODULE_DRAG,
        chutes: [
          canopy({
            name: 'pilot parachute',
            after: doc(
              0,
              `drawn out by the cover as it is shot off: "an exhaust, a braking, and two primary parachutes" (${SIDDIQI}, p. 411)`,
            ),
            area: area('pilot parachute'),
            fills: estimated(1, 'chosen: no filling time found'),
          }),
          canopy({
            name: 'braking parachute',
            altitude: assumed(4_000, `the Vostok ball’s, 4 km (${BOBKOV}): the 3KV’s was not found`),
            area: area('braking parachute'),
            fills: estimated(2, 'chosen: no filling time found'),
            instead: ['pilot parachute'],
          }),
          canopy({
            name: 'main parachutes',
            altitude: assumed(2_500, `the Vostok ball’s main, 2.5 km (${BOBKOV}; ${GCTC}): the 3KV’s was not found`),
            area: area('main parachutes'),
            fills: estimated(6, 'chosen: no filling time found'),
            instead: ['braking parachute'],
          }),
        ],
        motors: [
          softLanding(
            'main parachutes',
            GROUND,
            estimated(LANDED * (DECEL + 9.80665), `N: ${ROCKET_SAYS}, against the ball’s weight`),
            estimated((UNDER - LEFT) / DECEL, `s: ${ROCKET_SAYS}`),
            PROBE,
          ),
        ],
      },
      COVER,
    ],
    automatic:
      'The crew had no say in the descent: the orientation, the burn, the parting, the parachutes and the rocket at the ground were the automatic system’s',
    torn: TORN,
    crew: CREW,
    checks: [
      {
        id: 'module.at',
        label: 'Touchdown',
        value: MSK(13, 10, 47, 4),
        unit: 's',
        tolerance: 120,
        confidence: 'derived',
        source: `liftoff and the duration, 1 d 0 h 17 min 3 s (${SIDDIQI}, p. 425); ${TASS}: 10:47. Dependent on the burn’s instant, which is one secondary account’s`,
      },
      {
        id: 'module.speed',
        label: 'Touchdown speed',
        value: LEFT,
        unit: 'm/s',
        tolerance: 1,
        confidence: 'documented',
        source: `the design: "dropping final velocity from about eight to ten meters per second to a bearable two-tenths" (${SIDDIQI}, p. 411). NOT a measurement, and NOT independent: the rocket is worked from it. Feoktistov later recalled sparks before their eyes and the ball rolling over`,
      },
    ],
  },
  landing: {
    latitude: estimated(
      54 + 2 / 60,
      `${SPACEFACTS}: no survey is stated, and the point is 311 km from Kustanay on a bearing of 71°, so it may be worked from the distance`,
    ),
    longitude: estimated(68 + 8 / 60, `${SPACEFACTS}`),
    at: derived(MSK(13, 10, 47, 4), `liftoff and the duration (${SIDDIQI}, p. 425); ${TASS}: 10:47`),
    near: 'Kustanay',
  },
  checks: [
    {
      id: 'period',
      label: 'Period, node to node, of the orbit begun',
      value: 90.1 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${TASS}: 90.1 min. NOT independent: the published orbit is read as mean elements with this nodal period`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 408_000,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${SIDDIQI}, p. 423: 408 km`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 60_000,
      confidence: 'documented',
      source: `«в 312 км к С.-В. от Кустаная» (the Soviet encyclopedia); ${SIDDIQI}, p. 425; «в 60 километрах восточнее Марьевки» (${KAMANIN}, 13 October). Held against spacefacts’ point (estimated), as wide as a bearing of "north-east" allows. Independent of the burn’s length`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source: `as above. Dependent on the burn’s instant (one secondary account’s seconds) and its length and impulse (not found)`,
    },
  ],
};
