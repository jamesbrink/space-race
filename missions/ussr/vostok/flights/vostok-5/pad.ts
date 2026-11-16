import type { Keyframe } from '../../../../../src/types.ts';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on 14 June 1963, as Vostok 5's pad.glb has it (model/pad.py: the site's modules at that date). The hardware is
 * the site's (places/tyuratam/site-1.parts.ts); this is the day. What the record gives of it is Kamanin's diary of 14 June
 * (he was at the pad and then in the bunker; his times are the range's, Moscow's plus two, and his readiness times are
 * counted from a launch set for 14:00 by that clock: converted here, so `derived`) and Golovanov's account of the cable
 * mast. No transcript of the exchanges before liftoff and no roster of the pad have been found: **the erector and the
 * trusses have no times of their own**, and each is given Vostok 1's interval before its liftoff (09:06:59.7), put before
 * this one: estimated, and said so. That leaves out what two and a half hours' hold with the rocket fuelled did to them (a
 * gyroscope of the third stage was changed with the pilot aboard, and how it was reached is not recorded). **The cable mast
 * is the exception**: the ground-to-board command had not passed seconds before the engines lit and the mast had not
 * swung away; as the preliminary stage lit and the rocket shook, the plug jumped out and the mast swung back (Golovanov).
 *
 * Not built: the people (the State Commission at the pad from 06:00; the farewell; Volynov, the back-up, suited), in summer
 * dress the figures do not have; and what had changed at the pad since 1961 (the new room beside the bunker, whatever the
 * repairs after the fire of 1 June 1962 replaced): places/tyuratam/site-1.md, "What stood when".
 */

const KAMANIN = 'Kamanin’s diary, 14 June 1963 («Скрытый космос», book 1; militera.lib.ru/db/kamanin_np/63.html)';
/** Kamanin's times on 14 June are the range's (he has the launch «в 17 часов по местному времени» for 14:58:58 Moscow time). */
const LOCAL =
  'in the range’s time, Moscow’s plus two, from a launch set «с началом пуска „Востока-5“ в 14:00» by that clock (12:00 Moscow time): converted';
const GOLOVANOV = 'Golovanov, «Королёв: факты и мифы» (1994), the chapter on the flights of 1963 (testpilot.ru)';
/** Vostok 1's interval from an event to its liftoff (its transcript), put before this one's: no time for this flight was found. */
const AS_VOSTOK_1 = (was: string) =>
  `not recorded for this flight: Vostok 1’s ${was} (its transcript) put as far before this liftoff, which is the procedure's and not this day's`;
/** Vostok 1's minutes before liftoff, as this day's: its time of `h:m` against its liftoff at 09:06:59.7. */
const before = (h: number, m: number, s = 0) => -(9 * 3600 + 6 * 60 + 59.7 - (h * 3600 + m * 60 + s));
const at = (h: number, m: number, s = 0) => MSK(14, h, m, s);

/**
 * The pad's slider: as Vostok 1's and 2's, its first tenth the pilot's arrival (the bus to the lift), the rest from his
 * seat to four seconds after liftoff. The stops are layout; the times on the clock are below.
 */
const ARRIVAL = 0.1;
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
  bus: 0.03,
  seat: ARRIVAL,
  reopened: seated(0.02),
  closed: seated(0.03),
  lamp: seated(0.04),
  erector: seated(0.1),
  boomAway: seated(0.3),
  trusses: seated(0.45),
  boomDown: seated(0.55),
  cleared: seated(0.75),
  mast: seated(0.86),
  liftoff: seated(0.9),
};

const MORNING: Keyframe[] = [
  {
    at: at(9, 44),
    slider: 0,
    event: 'The bus comes up the road to the pad',
    confidence: 'estimated',
    source: `the minute before it stopped: ours (${KAMANIN})`,
  },
  {
    at: at(9, 45),
    slider: T.bus,
    event: '09:45: the bus stops at the rocket; after the farewells Bykovskiy goes up to the ship by the lift',
    confidence: 'derived',
    source: `${KAMANIN}: «За 2 часа 15 минут до старта автобус с космонавтами прибыл к ракете. После коротких прощаний … Быковский на лифте поднялся к кораблю», ${LOCAL}. RussianSpaceWeb reads the same as 11:45 Moscow time`,
  },
  {
    at: at(10, 0),
    slider: T.seat,
    event:
      'In the seat. Within minutes both VHF transmitters are found dead: the ground can be heard aboard, he only on short wave. They decide to fly',
    confidence: 'estimated',
    source: `${KAMANIN}: «Через несколько минут … отказали оба УКВ-передатчика корабля»; «лететь!». The minute he was seated is ours`,
  },
  {
    at: at(11, 20),
    slider: T.reopened,
    event:
      '11:20: at the 40-minute readiness the seat’s lanyard is found cut with a knife under the closed hatch; the hatch comes off again',
    confidence: 'derived',
    source: `${KAMANIN}: «Была уже объявлена 40-минутная готовность …», ${LOCAL}. Chertok, vol. 3, p. 222: "after T minus 60"`,
  },
  {
    at: at(11, 50),
    slider: T.closed,
    event: 'The stub taken out; hatch No. 1 closed again: half an hour lost',
    confidence: 'derived',
    source: `${KAMANIN}: «Пришлось переносить старт на 30 минут, открывать люк и удалять обрывок фалы», ${LOCAL}`,
  },
  {
    at: at(12, 25),
    slider: T.lamp,
    event:
      '12:25: at the 5-minute readiness the lamp that says the third stage is ready does not light: a gyroscope of its guidance has failed, and is changed on the fuelled rocket',
    confidence: 'derived',
    source: `${KAMANIN}: «Была объявлена 5-минутная готовность … не горит табло, подтверждающее готовность блока „Е“», for the time put back half an hour, ${LOCAL}; Chertok, vol. 3, p. 222: "a gyro horizon on the third stage had failed"`,
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
    event: 'The erector is off the pad and the trusses are down',
    confidence: 'estimated',
    source: 'not recorded: placed by us',
  },
  {
    at: -5,
    slider: T.mast,
    event: 'The cable mast has not swung away; the engines light and the rocket shakes, the plug jumps out, and the mast swings back',
    confidence: 'estimated',
    source: `${GOLOVANOV}: «за секунды до включения двигателей не прошла команда „Земля-борт“ … кабель-мачта не откинулась … едва включилась предварительная ступень и ракета задрожала … штеккер выскочил и кабель-мачта откинулась». How many seconds before liftoff the preliminary stage lit is not recorded here: five taken`,
  },
  {
    at: 0,
    slider: T.liftoff,
    event: 'Liftoff, 14:58:58, at the end of the window, three hours late',
    confidence: 'documented',
    source: `Siddiqi, Challenge to Apollo, p. 368: “1458 hours, 58 seconds Moscow Time”. ${KAMANIN}: «Позже 17 часов запускать корабль было нельзя … старт состоялся в 17 часов по местному времени»`,
  },
  {
    at: SUPPORTS_GO[1],
    slider: 1,
    event: 'The four supports have fallen back: the launch system stands open',
    confidence: 'estimated',
    source: 'as Vostok 1’s (places/tyuratam/site-1.parts.ts): how long they took on this flight is not recorded',
  },
];

const NOT_OURS =
  'Its time on 14 June 1963 is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight, and what the hold of two and a half hours did to it is not known (estimated).';

export const pad = site1Pad({
  url: 'models/ussr/vostok/vostok-5/pad.glb',
  slider: ['The bus arrives · 09:45', 'Liftoff · 14:58'],
  sequence: MORNING,
  parts: [
    ...site1Parts({
      stops: {
        cars: [0, 0],
        erector: T.erector,
        boomAway: T.boomAway,
        boomDown: T.boomDown,
        cleared: T.cleared,
        north: [T.trusses, seated(0.67)],
        south: [seated(0.51), T.cleared],
        mast: [T.mast, T.liftoff],
      },
      adds: {
        Erector: { detail: NOT_OURS, facts: [['14 June 1963', 'drawn off: not recorded']] },
        ServiceTrusses: { detail: NOT_OURS, facts: [['14 June 1963', 'lowered: not recorded']] },
        UpperCableMast: {
          detail:
            'On 14 June 1963 the ground-to-board command did not pass seconds before the engines lit and it did not swing away; as the ' +
            'preliminary stage lit and the rocket shook, its plug jumped out and it swung back (Golovanov). Here it goes in the five ' +
            'seconds before liftoff, which is ours: how long the preliminary stage burned on the pad is not recorded here.',
          facts: [['14 June 1963', 'swung back only as the engines lit (Golovanov)']],
        },
        LaunchRing: { facts: [['Let go', 'at liftoff, 14:58:58 Moscow time, 14 June 1963']] },
      },
      erectorCrew: null,
      fillers: false,
    }),
    // in along the road at 09:45; away at thirty minutes' readiness for the time first set (estimated)
    busPart(
      'The afternoon of 14 June 1963',
      {
        summary:
          'The same cream and blue LAZ-695B brought Bykovskiy and Volynov to the rocket two hours and a quarter before the time set.',
        detail:
          'Kamanin: «За 2 часа 15 минут до старта автобус с космонавтами прибыл к ракете». Where it stood is April 1961’s place, taken: ' +
          'nothing of this day’s was measured. When it left is not recorded: here at thirty minutes’ readiness for the noon that had ' +
          'been set (estimated), as on Vostok 2. The crowd round it is not built.',
        facts: [
          ['Type', 'LAZ-695B (the bus of 1961, taken)'],
          ['Came', '09:45 Moscow time (Kamanin, converted)'],
          ['Left', 'not recorded (here 11:30, estimated)'],
        ],
      },
      { in: [at(9, 44), at(9, 45)], back: [at(11, 30), at(11, 30, 45)], away: [at(11, 30, 50), at(11, 33)] },
    ),
  ],
  views: [{ id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] }],
});
