import type { Keyframe } from '../../../../../src/types.ts';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 11 August 1962, as Vostok 3's pad.glb has it (model/pad.py: the site's modules at that date).
 * The hardware is the site's (places/tyuratam/site-1.parts.ts); this is the morning. The launching structure had burnt on
 * 1 June and been repaired: what the repair changed is not in anything read, and it is built as it stood in 1961
 * (places/tyuratam/site-1.md, "What stood when"). What the record gives of the morning is Kamanin's diary of 12 and
 * 14 August 1962: the State Commission at 07:30 by the range's clock in a new room by the bunker, the bus at 11:30 by
 * the same clock (Moscow's plus two: derived), the report to Smirnov, the lift. No transcript of the exchanges before
 * liftoff and no roster of the pad have been read: **the erector, the trusses and the cable mast have no times of their
 * own**, and each is given Vostok 1's interval before its liftoff (09:06:59.7): estimated, and said so. No record of the
 * railway fillers that morning: they are not built.
 *
 * Not built: the people (Smirnov, Korolev, Keldysh, Rudenko, Gagarin and Titov at the bus, "more than a dozen" more; summer
 * dress, which the figures do not have), Korolev's post under its concrete canopy ten metres from the rocket, and the new
 * room by the bunker: listed for a modelling agent (places/tyuratam/site-1.md, "What the model gets wrong or leaves out").
 */

const KAMANIN = 'Kamanin’s diary («Скрытый космос», book 1), 12 and 14 August 1962';
/** Vostok 1's interval from an event to its liftoff (its transcript), put before this one's: no time for this flight was found. */
const AS_VOSTOK_1 = (was: string) =>
  `not recorded for this flight: Vostok 1’s ${was} (its transcript) put as far before this liftoff, which is the procedure's and not this morning's`;
/** Vostok 1's minutes before liftoff, as this morning's: its time of `h:m` against its liftoff at 09:06:59.7. */
const before = (h: number, m: number, s = 0) => -(9 * 3600 + 6 * 60 + 59.7 - (h * 3600 + m * 60 + s));

/**
 * The pad's slider: as Vostok 1's, its first tenth the pilot's arrival (the bus to the lift), the rest from his seat to
 * four seconds after liftoff. The stops are layout; the times on the clock are below.
 */
const ARRIVAL = 0.1;
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
  bus: 0.03,
  seat: ARRIVAL,
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
    at: MSK(11, 9, 29),
    slider: 0,
    event: 'The bus comes up the road',
    confidence: 'estimated',
    source: 'not recorded: the minute before it stopped, ours',
  },
  {
    at: MSK(11, 9, 30),
    slider: T.bus,
    event: '09:30: the bus stops; Nikolayev, suited, reports to Smirnov: «космонавт Николаев к полету готов»',
    confidence: 'documented',
    source: `${KAMANIN}: «В 11:30 подъехал специальный автобус с двумя космонавтами, одетыми в скафандры», 11:30 by the range’s clock, two hours ahead of Moscow’s (derived: the liftoff was at 11:30 Moscow time)`,
  },
  {
    at: MSK(11, 9, 40),
    slider: T.seat,
    event: 'In the seat; he checks the cabin at length before he calls',
    confidence: 'estimated',
    source: `not recorded: placed by us, after the lift. «Николаев долго и обстоятельно усаживался в корабле, внимательно проверил всю аппаратуру и только после этого вышел на радиосвязь» (${KAMANIN}); he reported 26 °C and 50 per cent humidity`,
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
    event: 'Liftoff, 11:30',
    confidence: 'documented',
    source: `${KAMANIN}: set three days before for 11:30 Moscow time and «выдержаны с точностью до 0,5 секунды»`,
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
  'Its time is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated). The launching structure had burnt on 1 June 1962 and been repaired; what the repair changed is not known, and it is built as it stood in 1961.';

export const pad = site1Pad({
  url: 'models/ussr/vostok/vostok-3/pad.glb',
  slider: ['The bus arrives · 09:29', 'Liftoff · 11:30'],
  sequence: MORNING,
  parts: [
    ...site1Parts({
      stops: {
        // (no fillers this morning: their stops are not used)
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
        Erector: {
          detail: `On 11 August Nikolayev went up in the lift and, turning in its door, thanked everyone for the work; his voice caught on the last words (${KAMANIN}). ${NOT_OURS}`,
          facts: [['11 August', 'up in the lift at about 09:35 (Kamanin; the minute ours); drawn off: not recorded']],
        },
        ServiceTrusses: { detail: NOT_OURS, facts: [['11 August', 'lowered: not recorded']] },
        UpperCableMast: { detail: NOT_OURS, facts: [['11 August', 'away: not recorded']] },
        LaunchRing: { facts: [['Let go', 'at liftoff, 11:30:00 Moscow time, 11 August 1962']] },
      },
      erectorCrew: null,
      fillers: false,
    }),
    // in along the road at 09:30; at thirty minutes' readiness (as on 6 August 1961: not recorded), out and away
    busPart(
      'The morning of 11 August 1962',
      {
        summary: 'A bus brought Nikolayev and his back-up Bykovskiy, both suited, to the foot of the rocket two hours before liftoff.',
        detail:
          'Nikolayev got down with Karpov’s help and reported to Smirnov, the State Commission’s chairman; Smirnov, ' +
          'Korolev, Keldysh and Rudenko kissed him, and more than a dozen others wanted to (Kamanin). That it was the same cream ' +
          'and blue LAZ-695B as the year before is taken: Kamanin had the cosmonauts driven that summer in the «Львов», a LAZ. ' +
          'Where it stood is April 1961’s place, taken; when it left is not recorded (estimated: at thirty minutes’ readiness, as on ' +
          '6 August 1961). The people round it are not built.',
        facts: [
          ['Came', '09:30 Moscow time, 11:30 by the range’s clock (Kamanin)'],
          ['Type', 'LAZ-695B, as in 1961 (assumed)'],
          ['Stood', 'April 1961’s place, taken'],
          ['Left', 'not recorded (estimated: 11:00, thirty minutes’ readiness)'],
        ],
      },
      { in: [MSK(11, 9, 29), MSK(11, 9, 30)], back: [MSK(11, 11, 0), MSK(11, 11, 0, 45)], away: [MSK(11, 11, 0, 50), MSK(11, 11, 3)] },
    ),
  ],
  views: [{ id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] }],
});
