import type { Keyframe } from '../../../../../src/types.ts';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 16 June 1963, as Vostok 6's pad.glb has it (model/pad.py: the site's modules at that date), two
 * days after Vostok 5 left it. The hardware is the site's (places/tyuratam/site-1.parts.ts); this is the morning. What the
 * record gives of it is Kamanin's diary of 16 June (his times the range's, Moscow's plus two, converted here, so `derived`)
 * and Golovanov's of her pulse. Nothing went wrong: «По четкости и слаженности работы всех служб и систем старт Терешковой
 * напомнил мне старт Гагарина». No transcript of the exchanges before liftoff and no roster of the pad have been found:
 * **the erector, the trusses and the cable mast have no times of their own**, and each is given Vostok 1's interval before
 * its liftoff (09:06:59.7), put before this one: estimated, and said so.
 *
 * Not built: the people (the State Commission, Korolev with her flowers, Gagarin, Nikolayev; Solovyeva, the back-up,
 * suited), in summer dress the figures do not have; and what had changed at the pad since 1961 (places/tyuratam/site-1.md,
 * "What stood when").
 */

const KAMANIN = 'Kamanin’s diary, 16 June 1963 («Скрытый космос», book 1; militera.lib.ru/db/kamanin_np/63.html)';
const GOLOVANOV = 'Golovanov, «Королёв: факты и мифы» (1994), the chapter on the flights of 1963 (testpilot.ru)';
/** Vostok 1's interval from an event to its liftoff (its transcript), put before this one's: no time for this flight was found. */
const AS_VOSTOK_1 = (was: string) =>
  `not recorded for this flight: Vostok 1’s ${was} (its transcript) put as far before this liftoff, which is the procedure's and not this morning's`;
/** Vostok 1's minutes before liftoff, as this morning's: its time of `h:m` against its liftoff at 09:06:59.7. */
const before = (h: number, m: number, s = 0) => -(9 * 3600 + 6 * 60 + 59.7 - (h * 3600 + m * 60 + s));
const at = (h: number, m: number, s = 0) => MSK(16, h, m, s);

/**
 * The pad's slider: as Vostok 1's and 2's, its first tenth the pilot's arrival (the bus to the lift), the rest from her
 * seat to four seconds after liftoff. The stops are layout; the times on the clock are below.
 */
const ARRIVAL = 0.1;
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
  bus: 0.03,
  seat: ARRIVAL,
  radio: seated(0.01),
  erector: seated(0.1),
  boomAway: seated(0.3),
  trusses: seated(0.45),
  boomDown: seated(0.55),
  cleared: seated(0.75),
  pulse: seated(0.78),
  mast: seated(0.8),
  mastOff: seated(0.86),
  liftoff: seated(0.9),
};

const MORNING: Keyframe[] = [
  {
    at: at(10, 14),
    slider: 0,
    event: 'The bus comes up the road to the pad',
    confidence: 'estimated',
    source: `the minute before it stopped: ours (${KAMANIN})`,
  },
  {
    at: at(10, 15),
    slider: T.bus,
    event:
      '10:15 exactly: the bus brings Tereshkova to the pad; she reports to the State Commission’s chairman, is given flowers and hands them to Korolev',
    confidence: 'derived',
    source: `${KAMANIN}: «Ровно в 12 часов 15 минут автобус доставил Терешкову на старт. Она коротко и четко доложила: „Товарищ председатель Госкомиссии, космонавт Терешкова к полету готова“. Ей вручили цветы, которые она тут же передала Королеву», by the range’s clock (Moscow’s plus two: converted; 2 h 15 min before the 12:30 set, as Vostok 5’s). Siddiqi (2009): 09:15`,
  },
  {
    at: at(10, 20),
    slider: T.seat,
    event: 'Up to the lift, “rather heavily”, and into the ship with a pulse of 140',
    confidence: 'estimated',
    source: `${KAMANIN}: «К лифту Валя поднималась довольно тяжело, а при посадке в корабль пульс у нее был 140 ударов в минуту». The minute is ours`,
  },
  {
    at: at(10, 32),
    slider: T.radio,
    event: 'Ten or fifteen minutes later she has the radio up and reports on her checks',
    confidence: 'estimated',
    source: `${KAMANIN}: «Через 10–15 минут она установила радиосвязь с КП и доложила о ходе проверки оборудования». The minute is ours, within his quarter hour`,
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
    at: -240,
    slider: T.pulse,
    event: 'Four minutes before the command to lift off her pulse is 84',
    confidence: 'documented',
    source: `${GOLOVANOV}: «за четыре минуты до команды „Подъем!“ пульс был уже 84»`,
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
    event: 'Liftoff, 12:29:52',
    confidence: 'documented',
    source: 'Siddiqi, Challenge to Apollo, p. 369 and the launch log: 12:29:52 Moscow time; McDowell: 09:29:52 UTC. TASS: 12:30',
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
  'Its time on 16 June 1963 is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated).';

export const pad = site1Pad({
  url: 'models/ussr/vostok/vostok-6/pad.glb',
  slider: ['The bus arrives · 10:15', 'Liftoff · 12:29'],
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
        mast: [T.mast, T.mastOff],
      },
      adds: {
        Erector: { detail: NOT_OURS, facts: [['16 June 1963', 'drawn off: not recorded']] },
        ServiceTrusses: { detail: NOT_OURS, facts: [['16 June 1963', 'lowered: not recorded']] },
        UpperCableMast: { detail: NOT_OURS, facts: [['16 June 1963', 'away: not recorded']] },
        LaunchRing: { facts: [['Let go', 'at liftoff, 12:29:52 Moscow time, 16 June 1963']] },
      },
      erectorCrew: null,
      fillers: false,
    }),
    // in along the road at 10:15; away at thirty minutes' readiness (estimated)
    busPart(
      'The morning of 16 June 1963',
      {
        summary: 'The same cream and blue LAZ-695B brought Tereshkova to the pad at a quarter past ten exactly.',
        detail:
          'Kamanin: «Ровно в 12 часов 15 минут автобус доставил Терешкову на старт», by the range’s clock. Where it stood is April 1961’s ' +
          'place, taken: nothing of this morning’s was measured. When it left is not recorded: here at thirty minutes’ readiness ' +
          '(estimated), as on Vostok 2. The crowd round it is not built.',
        facts: [
          ['Type', 'LAZ-695B (the bus of 1961, taken)'],
          ['Came', '10:15 Moscow time (Kamanin, converted)'],
          ['Left', 'not recorded (here 12:00, estimated)'],
        ],
      },
      { in: [at(10, 14), at(10, 15)], back: [at(12, 0), at(12, 0, 45)], away: [at(12, 0, 50), at(12, 3)] },
    ),
  ],
  views: [{ id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] }],
});
