import type { Keyframe } from '../../../../../src/types.ts';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 12 August 1962, as Vostok 4's pad.glb has it (model/pad.py: the site's modules at that date),
 * the day after Vostok 3 had left it: «Подготовка к старту и пуск „Востока-4“ мало чем отличались от подготовки и пуска
 * „Востока-3“, только все работали в еще более жестких условиях по времени» (Kamanin, 14 August). The pad was cleared and
 * a new rocket brought out through the night (Siddiqi, p. 357). The hardware is the site's (places/tyuratam/site-1.parts.ts),
 * the launching structure as it stood in 1961 (repaired after the fire of 1 June 1962: what changed is not known). **No time
 * of this morning was found**: the bus is put two hours before liftoff, as the day before, and the erector, the trusses and
 * the cable mast at Vostok 1's intervals before its liftoff, each estimated and said so. No record of the fillers: not built.
 *
 * Not built: the people at the bus (summer dress, which the figures do not have), Korolev's post under its canopy ten metres
 * from the rocket and the new room by the bunker (places/tyuratam/site-1.md, "What the model gets wrong or leaves out").
 */

const KAMANIN = 'Kamanin’s diary («Скрытый космос», book 1), 14 August 1962';
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
    at: MSK(12, 9, 1, 33),
    slider: 0,
    event: 'The bus comes up the road',
    confidence: 'estimated',
    source: 'not recorded: the minute before it stopped, ours',
  },
  {
    at: MSK(12, 9, 2, 33),
    slider: T.bus,
    event: 'About 09:02: the bus stops; Popovich, suited, with Komarov',
    confidence: 'estimated',
    source: `not recorded for this morning: two hours before liftoff, as Vostok 3’s bus the day before (${KAMANIN}: the launch «мало чем отличались»). That a bus brought him: the film «Звёздные братья» (1962)`,
  },
  {
    at: MSK(12, 9, 12, 33),
    slider: T.seat,
    event: 'In the seat',
    confidence: 'estimated',
    source: 'not recorded: placed by us, ten minutes after the bus, as the day before',
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
    event: 'Liftoff, 11:02:33',
    confidence: 'documented',
    source:
      'Siddiqi, Challenge to Apollo, p. 357 and Table IA: 1102:33 Moscow time. Kamanin’s 11:08, «с точностью до 0,5 секунды», is against his own record of Nikolayev’s report',
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
  'Its time is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated). It had been drawn back to Vostok 3 the day before and brought up to this rocket through the night (not recorded how).';

export const pad = site1Pad({
  url: 'models/ussr/vostok/vostok-4/pad.glb',
  slider: ['The bus arrives · 09:01', 'Liftoff · 11:02'],
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
        Erector: { detail: NOT_OURS, facts: [['12 August', 'drawn off: not recorded']] },
        ServiceTrusses: { detail: NOT_OURS, facts: [['12 August', 'lowered: not recorded']] },
        UpperCableMast: { detail: NOT_OURS, facts: [['12 August', 'away: not recorded']] },
        LaunchRing: { facts: [['Let go', 'at liftoff, 11:02:33 Moscow time, 12 August 1962']] },
      },
      erectorCrew: null,
      fillers: false,
    }),
    // in about two hours before liftoff, as the day before; at thirty minutes' readiness (not recorded), out and away
    busPart(
      'The morning of 12 August 1962',
      {
        summary: 'A bus brought Popovich and his back-up Komarov, both suited, to the rocket Vostok 3’s had stood in the day before.',
        detail:
          'Kamanin wrote nothing of this morning but that it differed little from the day before, everyone working to an even ' +
          'tighter clock and more tired. That the bus came is the film of the flight’s («Звёздные братья», 1962); when it came is ' +
          'put two hours before liftoff, as the 11th’s, and is estimated; that it was the same LAZ-695B, and where it stood, are taken ' +
          'from the day before and from April 1961. The people round it are not built.',
        facts: [
          ['Came', 'not recorded (estimated: 09:02, two hours before liftoff)'],
          ['Type', 'LAZ-695B, as in 1961 (assumed)'],
          ['Stood', 'April 1961’s place, taken'],
          ['Left', 'not recorded (estimated: 10:32, thirty minutes’ readiness)'],
        ],
      },
      {
        in: [MSK(12, 9, 1, 33), MSK(12, 9, 2, 33)],
        back: [MSK(12, 10, 32, 33), MSK(12, 10, 33, 18)],
        away: [MSK(12, 10, 33, 23), MSK(12, 10, 35, 33)],
      },
    ),
  ],
  views: [{ id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] }],
});
