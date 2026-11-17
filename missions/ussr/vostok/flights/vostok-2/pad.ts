import type { Going, Keyframe, Part } from '../../../../../src/types.ts';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 6 August 1961, as Vostok 2's pad.glb has it (model/pad.py: the site's modules at that date).
 * The hardware is the site's (places/tyuratam/site-1.parts.ts); this is the morning. What the record gives of it is the plan of
 * 4 August (doc 190 of «Первый пилотируемый полёт», 2011, book 2: «График подготовки космонавтов ... в день старта»,
 * in local time, Moscow's plus two: derived), which Titov's report says the day kept to, the film of the morning («Снова
 * к звёздам», Моснаучфильм 1961) and RussianSpaceWeb's photographs. No transcript of the exchanges before liftoff and no
 * roster of the pad have been found for this flight: **the erector, the trusses, the cable mast and the fillers have no
 * times of their own**, and each is given Vostok 1's interval before its liftoff (09:06:59.7): estimated, and said so.
 *
 * The people: the film has some hundred on the concrete as the bus stopped and forty walking with him to the stair, in
 * summer dress (white short-sleeved shirts; officers in khaki summer shirts and peaked caps). They are built in summer dress
 * and walk on the clock (`people`, below; places/tyuratam/site1/august.py, site-1.md "The people of 6 August 1961"). Not
 * built: Smirnov, now the State Commission's chairman, in a white jacket and straw hat; Nikolayev suited beside him at the
 * bus. Kamanin and Gagarin were abroad.
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
    source: 'as Vostok 1’s (places/tyuratam/site-1.parts.ts): how long they took on this flight is not recorded',
  },
];

const NOT_OURS = 'Its time is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated).';

/**
 * The morning's people (places/tyuratam/site1/august.py: where each stood, in what), each walked on the clock (types.ts
 * `Going`). The ways are the model's frame, metres east and south of the rocket's axis. When any of them left is not
 * recorded for this flight: after the lift had gone up (the plan has him in the seat by 07:00), as Vostok 1's send-off
 * left about eight minutes after its pilot went up; the way out is the road west, round the bus, to the fence (out of
 * sight, 470 m off). Estimated, and said so in each part.
 */
const LEFT: Pick<Going, 'confidence' | 'source'> = {
  confidence: 'estimated',
  source:
    'not recorded for this flight: placed after the lift had gone up (by 07:00 in the plan, doc 190), as Vostok 1’s send-off left about 07:08; the way is the road west, the nearest out of sight',
};
/** Off the apron along the road west to the fence (the lorry’s road of 12 April: places/tyuratam/site-1.md). */
const ROAD_WEST: [number, number][] = [
  [-92, 24],
  [-150, 23.5],
  [-470, 25],
];
/** The middle of the group round the bus's door as august.py builds it, and where the film has it stand at the stair's foot: 2 to 12 m west and south-west of it (22:13 to 22:24), metres east and north. */
const ESCORT_AT: [number, number] = [-39.47, -15.93];
const AT_STAIR: [number, number] = [-22.5, -8.0];
const people: Part[] = [
  {
    node: 'Escort',
    group: 'The morning of 6 August',
    name: 'With him to the stair',
    summary: 'Some forty walked Titov from the bus to the erector’s stair and stood at its foot to hear him.',
    detail:
      'The film of the morning has officers in khaki summer shirts, ties and air force caps round him as he got down from the bus, ' +
      'one in dark glasses and one in a tunic with shoulder boards; then, from the erector, some twenty-five walking east with him ' +
      'between the tracks and six or eight more about them, and thirty or so standing below the stair, faces up, as he turned on ' +
      'its landing and spoke. Thirty-four stand here, round the bus’s door; at about 06:55 they walk with him to the stair and stand ' +
      'there until the lift has gone. That they were there, in what, and where they stood is the film’s; how many, who each was ' +
      'and the minutes are estimated. Kamanin and Gagarin were abroad and are not among them.',
    facts: [
      ['Seen', 'some 40 at the stair’s foot (the film, 22:13 to 22:24); the count estimated off a 960 px copy'],
      ['Dress', 'white shirtsleeves; officers in khaki summer shirts, ties and air force caps, one in a tunic (the film)'],
      ['To the stair', 'about 06:55, between the tracks (the film; the minute ours)'],
      ['Left', 'about 07:06 (not recorded: estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    going: [
      {
        kind: 'leaves',
        at: { value: MSK(6, 55), confidence: 'estimated', source: 'the plan’s quarter hour, 06:45 to 07:00 (doc 190): the minute ours' },
        stagger: 0.3,
        way: [
          [-36, 11],
          [-27, 10.5],
        ],
        to: [AT_STAIR[0] - ESCORT_AT[0], -(AT_STAIR[1] - ESCORT_AT[1])],
        faces: [-11.3, 3.25],
        confidence: 'documented',
        source: `${FILM}, 21:56 to 22:24: east between the tracks with him, and at the stair’s foot, faces up. The minute is estimated`,
      },
      {
        kind: 'leaves',
        at: { value: MSK(7, 6), ...LEFT },
        stagger: 0.6,
        way: [[-30, 10.5], [-75, 10.5], [-92, 18], ...ROAD_WEST.slice(1)],
        ...LEFT,
      },
    ],
  },
  {
    node: 'Crowd',
    group: 'The morning of 6 August',
    name: 'The crowd at the bus',
    summary: 'Some fifty stood in files south of the bus as it stopped, nearly all in white shirtsleeves.',
    detail:
      'TASS’s correspondent, watching from 1.5 km off, wrote that the pad was deserted but for those it needed. The film says ' +
      'otherwise: from the erector’s head as the bus stops it has a hundred or more on the concrete, most of them in a dense body ' +
      'drawn up south of the bus, in white and pale short-sleeved shirts and dark trousers, one in five or so in a dark jacket or a ' +
      'uniform; and Titov wrote of the tens of people round them, all wishing him luck. Fifty-two stand here. Their dress is the ' +
      'film’s; how many, who each was and where in the body each stood are estimated, and so is when they left.',
    facts: [
      ['Seen', 'a body of some 50 to 60 south of the bus (the film, 21:45); counted off a 960 px copy'],
      ['Dress', 'white and pale shirtsleeves, dark trousers; a few dark jackets and uniforms (the film)'],
      ['Against', 'TASS: «Пустынна стартовая площадка», from the observation point'],
      ['Left', 'about 07:05 (not recorded: estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    going: [{ kind: 'leaves', at: { value: MSK(7, 5), ...LEFT }, stagger: 0.8, way: [[-60, 25], ...ROAD_WEST], ...LEFT }],
  },
  {
    node: 'CrowdWest',
    group: 'The morning of 6 August',
    name: 'Across the apron’s far end',
    summary: 'Beyond the crowd a line of twenty or so across the apron at its far, western end.',
    detail:
      'The film’s view from the erector as the bus stops has a line of people across the apron and its tracks at the far end of ' +
      'the view, beyond the body south of the bus (an earlier reading of the same frames had a file walking in there). Eighteen ' +
      'stand here. The count, and how far west they stood in a frame so foreshortened, are estimated, and so is when they left.',
    facts: [
      ['Seen', 'a line of some 20 (the film, 21:45)'],
      ['Left', 'about 07:05 (not recorded: estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    going: [{ kind: 'leaves', at: { value: MSK(7, 5, 30), ...LEFT }, stagger: 0.8, way: ROAD_WEST, ...LEFT }],
  },
];

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
          'stood is April’s place, taken: the film’s view from the erector agrees to some ten metres along the tracks and two ' +
          'across them, which is as well as its copy can be read; when it went is the readiness, and that it drove off then is ' +
          'estimated.',
        facts: [
          ['Type', 'LAZ-695B (the film: the roof’s air scoop)'],
          ['Came', 'about 06:50 Moscow time (the plan’s 06:45 to 07:00; the minute ours)'],
          ['Stood', 'about where April’s did (the film; the place taken from April)'],
          ['Left', '08:30, thirty minutes’ readiness, with Nikolayev (RussianSpaceWeb; that it drove then is estimated)'],
        ],
      },
      { in: [MSK(6, 49), MSK(6, 50)], back: [MSK(8, 30), MSK(8, 30, 45)], away: [MSK(8, 30, 50), MSK(8, 33)] },
    ),
    ...people,
  ],
  views: [
    // the crowd and the bus, from the south-west as the film's cameraman on the ground had them
    { id: 'send-off', label: 'The send-off', nodes: ['Crowd', 'Escort'], from: [-0.35, 0.16, 0.92] },
    { id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] },
  ],
});
