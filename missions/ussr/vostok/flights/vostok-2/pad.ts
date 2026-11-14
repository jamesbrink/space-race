import type { Keyframe } from '../../../../../src/types';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../sites/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 6 August 1961, as Vostok 2's pad.glb has it (model/pad.py: the site's modules at that date).
 * The hardware is the site's (sites/site-1.parts.ts); this is the morning. What the record gives of it is the plan of
 * 4 August (doc 190 of «Первый пилотируемый полёт», 2011, book 2: «График подготовки космонавтов ... в день старта»,
 * in local time, Moscow's plus two: derived), which Titov's report says the day kept to, the film of the morning («Снова
 * к звёздам», Моснаучфильм 1961) and RussianSpaceWeb's photographs. No transcript of the exchanges before liftoff and no
 * roster of the pad have been found for this flight: **the erector, the trusses, the cable mast and the fillers have no
 * times of their own**, and each is given Vostok 1's interval before its liftoff (09:06:59.7): estimated, and said so.
 *
 * Not built: the people. The film has some hundred on the concrete as the bus stopped, forty walking with him to the stair,
 * in summer dress (white short-sleeved shirts; officers in khaki summer shirts and peaked caps); Smirnov, now the State
 * Commission's chairman, in a white jacket and straw hat; Nikolayev suited beside him at the bus. The ground party's figures
 * (crew/ground_party.py) are dressed for April, and summer clothes are new geometry: listed for a modelling agent
 * (sites/site-1.md, "What the model gets wrong or leaves out"). Kamanin and Gagarin were abroad.
 */

const PLAN =
  '«График подготовки космонавтов на технической и стартовой позициях в предстартовый день и в день старта», 4 August 1961 («Первый пилотируемый полёт», 2011, book 2, doc 190), in local time, Moscow’s plus two (derived)';
const FILM = 'the film of the morning («Снова к звёздам», Моснаучфильм 1961)';
/** Vostok 1's interval from an event to its liftoff (its transcript), put before this one's: no time for this flight was found. */
const AS_VOSTOK_1 = (was: string) =>
  `not recorded for this flight: Vostok 1’s ${was} (its transcript) put as far before this liftoff, which is the procedure's and not this morning's`;
/** Vostok 1's minutes before liftoff, as this morning's: its time of `h:m` against its liftoff at 09:06:59.7. */
const before = (h: number, m: number, s = 0) => MSK(9, 0) - (9 * 3600 + 6 * 60 + 59.7 - (h * 3600 + m * 60 + s));

/**
 * The pad's slider: as Vostok 1's, its first tenth the pilot's arrival (the bus to the lift), the rest from his seat to
 * four seconds after liftoff. The stops are layout; the times on the clock are below.
 */
const ARRIVAL = 0.1;
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
  bus: 0.03,
  seat: ARRIVAL,
  cars: seated(0.02),
  carsOff: seated(0.04),
  erector: seated(0.1),
  boomAway: seated(0.3),
  trusses: seated(0.45),
  boomDown: seated(0.55),
  cleared: seated(0.75),
  mast: seated(0.8),
  mastOff: seated(0.86),
  liftoff: seated(0.9),
};

const MORNING: Keyframe[] = [
  {
    at: MSK(6, 45),
    slider: 0,
    event: '06:45: the drive to the pad begins, the suits on the bus’s air',
    confidence: 'documented',
    source: `${PLAN}, p. 178: «Переезд на стартовую позицию и подъем в лифте на верхнюю площадку», 8.45 to 9.00 local. Planned, not recorded`,
  },
  {
    at: MSK(6, 50),
    slider: T.bus,
    event: 'The bus stops on the apron; Titov and Nikolayev, both suited, step down',
    confidence: 'estimated',
    source: `${FILM}, 21:45: the bus stopped about where April’s did. The minute is ours, inside the plan’s quarter hour; Titov (1973): «мы с Андрияном Николаевым в летных костюмах неуклюже вышли из его дверей»`,
  },
  {
    at: MSK(7, 0),
    slider: T.seat,
    event: '07:00: in the seat: straps, connections, the suit’s pressure, the radio',
    confidence: 'documented',
    source: `${PLAN}, pp. 179-181: 9.00 to 9.40 local. Planned`,
  },
  {
    at: MSK(7, 40),
    slider: seated(0.01),
    event: '07:40 to 07:55: hatch No. 1 closed',
    confidence: 'documented',
    source: `${PLAN}, p. 181: «Закрытие люка № 1 кабины», 9.40 to 9.55 local, by Khlystov and Morozov. Planned`,
  },
  { at: before(8, 8), slider: T.cars, event: 'The railway fillers are drawn off', confidence: 'estimated', source: AS_VOSTOK_1('08:08') },
  {
    at: before(8, 15),
    slider: T.carsOff,
    event: 'The fillers are off the pad',
    confidence: 'estimated',
    source: AS_VOSTOK_1('08:15, by when they had gone'),
  },
  { at: before(8, 35), slider: T.erector, event: 'The erector is to be drawn off', confidence: 'estimated', source: AS_VOSTOK_1('08:35') },
  {
    at: before(8, 37),
    slider: T.boomAway,
    event: 'The erector’s boom has come away',
    confidence: 'estimated',
    source: AS_VOSTOK_1('08:37'),
  },
  {
    at: before(8, 40),
    slider: T.trusses,
    event: 'The service trusses are drawn off',
    confidence: 'estimated',
    source: AS_VOSTOK_1('08:40'),
  },
  {
    at: before(8, 42),
    slider: T.boomDown,
    event: 'The boom lies on its wagon',
    confidence: 'estimated',
    source: 'not recorded: placed by us',
  },
  {
    at: before(8, 45),
    slider: T.cleared,
    event: 'The erector is off the pad and the trusses are down: “the rocket freed of every truss that held it”',
    confidence: 'estimated',
    source:
      'not recorded: placed by us. That it stood so at liftoff is TASS’s correspondent’s, from 1.5 km: «серебристая ракета, уже полностью освобожденная от всех поддерживающих ее ферм»',
  },
  { at: before(9, 6), slider: T.mast, event: 'The cable mast is away', confidence: 'estimated', source: AS_VOSTOK_1('09:06') },
  {
    at: before(9, 6, 10),
    slider: T.mastOff,
    event: 'The mast has swung back',
    confidence: 'estimated',
    source: 'not recorded: placed by us',
  },
  {
    at: 0,
    slider: T.liftoff,
    event: 'Liftoff, 09:00:00',
    confidence: 'documented',
    source:
      '«Отрыв ракеты от стартового устройства произошел в 6 часов 00 минут 00 секунд по гринвичскому времени»: the record file’s act (book 2, doc 194, p. 221)',
  },
  {
    at: SUPPORTS_GO[1],
    slider: 1,
    event: 'The four supports have fallen back: the launch system stands open',
    confidence: 'estimated',
    source: 'as Vostok 1’s (sites/site-1.parts.ts): how long they took on this flight is not recorded',
  },
];

const NOT_OURS = 'Its time is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated).';

export const pad = site1Pad({
  url: 'models/ussr/vostok/vostok-2/pad.glb',
  slider: ['The drive to the pad · 06:45', 'Liftoff · 09:00'],
  sequence: MORNING,
  parts: [
    ...site1Parts({
      stops: {
        cars: [T.cars, T.carsOff],
        erector: T.erector,
        boomAway: T.boomAway,
        boomDown: T.boomDown,
        cleared: T.cleared,
        north: [T.trusses, seated(0.67)],
        south: [seated(0.51), T.cleared],
        mast: [T.mast, T.mastOff],
      },
      adds: {
        TankCars: {
          detail: `On 6 August a filler stood on the south track behind Smirnov and Titov at the farewell (RussianSpaceWeb’s photographs). ${NOT_OURS}`,
          facts: [['6 August', 'a filler on the south track at the farewell (a photograph); left: not recorded']],
        },
        Erector: {
          detail:
            'On 6 August the film shows the same boom and stair, green, Titov climbing the stair with one man behind him and the crowd ' +
            `below looking up; from the landing he spoke to them (TASS; in his own telling, on the concrete before it). ${NOT_OURS}`,
          facts: [['6 August', 'Titov up the stair (the film); drawn off: not recorded']],
        },
        ServiceTrusses: { detail: NOT_OURS, facts: [['6 August', 'lowered: not recorded']] },
        UpperCableMast: { detail: NOT_OURS, facts: [['6 August', 'away: not recorded']] },
        LaunchRing: { facts: [['Let go', 'at liftoff, 09:00:00 Moscow time, 6 August 1961']] },
      },
      erectorCrew: null,
      fillers: true,
    }),
    // in along the road at 06:50; at thirty minutes' readiness, with Nikolayev aboard, out and away to the viewing point
    busPart(
      'The morning of 6 August',
      {
        summary: 'The same cream and blue LAZ-695B brought Titov and Nikolayev, both suited, to the foot of the rocket.',
        detail:
          'The film of the morning shows it at the assembly building, on the road and from the erector’s head stopped on the ' +
          'apron about where April’s had stood; «голубой автобус», the blue bus, TASS’s correspondent called it. Titov drank ' +
          'from a tube on the way. Nikolayev, the back-up, got down with him, and they knocked their helmets together; he ' +
          'stayed aboard in his suit until thirty minutes’ readiness, then went to a viewing point (RussianSpaceWeb). Where it ' +
          'stood is April’s place, taken: the film’s view was not measured; when it went is the readiness, and that it drove off ' +
          'then is estimated. The crowd round it, some hundred in shirtsleeves, is not built.',
        facts: [
          ['Type', 'LAZ-695B (the film: the roof’s air scoop)'],
          ['Came', 'about 06:50 Moscow time (the plan’s 06:45 to 07:00; the minute ours)'],
          ['Stood', 'about where April’s did (the film; the place taken from April)'],
          ['Left', '08:30, thirty minutes’ readiness, with Nikolayev (RussianSpaceWeb; that it drove then is estimated)'],
        ],
      },
      { in: [MSK(6, 49), MSK(6, 50)], back: [MSK(8, 30), MSK(8, 30, 45)], away: [MSK(8, 30, 50), MSK(8, 33)] },
    ),
  ],
  views: [{ id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] }],
});
