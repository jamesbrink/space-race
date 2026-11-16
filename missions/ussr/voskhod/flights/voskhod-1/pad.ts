import type { Keyframe } from '../../../../../src/types.ts';
import { busPart, SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 12 October 1964, as Voskhod 1's pad.glb has it (model/pad.py: the site's modules at that date). The
 * hardware is the site's (places/tyuratam/site-1.parts.ts); this is the morning. What the record gives of it is Kamanin's
 * diary of 12 October (his times at the pad the range's, Moscow's plus two, and he says so: converted here, so `derived`).
 * Without suits the morning was short: the State Commission at the pad at 08:00 by the range's clock, the bus at 10:15, all
 * three aboard by 10:35, liftoff at 12:30 («Точно в 12:30 по местному времени (в 10:30 по московскому)»). No transcript of
 * the exchanges before liftoff and no roster of the pad have been found: **the erector, the trusses and the cable mast have
 * no times of their own**, and each is given Vostok 1's interval before its liftoff (09:06:59.7), put before this one:
 * estimated, and said so.
 *
 * Not built: the people (the State Commission 200 m from the rocket, Korolev, the crew in grey wool suits and white caps),
 * whom the figures cannot yet be dressed as; and what had changed at the pad since 1963 for a vehicle six metres taller
 * (places/tyuratam/site-1.md, "What stood when").
 */

const KAMANIN = 'Kamanin’s diary, 12 October 1964 («Скрытый космос», book 2; militera.lib.ru/db/kamanin_np/64.html)';
/** Vostok 1's interval from an event to its liftoff (its transcript), put before this one's: no time for this flight was found. */
const AS_VOSTOK_1 = (was: string) =>
  `not recorded for this flight: Vostok 1’s ${was} (its transcript) put as far before this liftoff, which is the procedure's and not this morning's`;
/** Vostok 1's minutes before liftoff, as this morning's: its time of `h:m` against its liftoff at 09:06:59.7. */
const before = (h: number, m: number, s = 0) => -(9 * 3600 + 6 * 60 + 59.7 - (h * 3600 + m * 60 + s));
const at = (h: number, m: number, s = 0) => MSK(12, h, m, s);

/**
 * The pad's slider: as the Vostoks', its first tenth the crew's arrival (the bus to the lift), the rest from their couches
 * to four seconds after liftoff. The stops are layout; the times on the clock are below.
 */
const ARRIVAL = 0.1;
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
  bus: 0.03,
  seat: ARRIVAL,
  checks: seated(0.01),
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
    at: at(8, 14),
    slider: 0,
    event: 'The bus comes up the road to the pad',
    confidence: 'estimated',
    source: `the minute before it stopped: ours (${KAMANIN})`,
  },
  {
    at: at(8, 15),
    slider: T.bus,
    event: '08:15: the bus brings the three to the pad, in grey wool suits and white caps; Komarov reports to the State Commission',
    confidence: 'derived',
    source: `${KAMANIN}: the bus at 10:15 by the range’s clock (Moscow’s plus two, as he says of the day: converted). Siddiqi, Challenge to Apollo, p. 423`,
  },
  {
    at: at(8, 20),
    slider: T.seat,
    event: 'Up in the lift; at the top they take off their jackets and boots and go in in slippers, Yegorov first, Komarov last',
    confidence: 'estimated',
    source: `${KAMANIN}: the order aboard; the minute is ours, between the bus and «all three aboard»`,
  },
  {
    at: at(8, 35),
    slider: T.checks,
    event: 'All three aboard, checking the ship',
    confidence: 'derived',
    source: `${KAMANIN}: 10:35 by the range’s clock (converted)`,
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
    event: 'Liftoff, 10:30:01',
    confidence: 'documented',
    source: `Siddiqi, Challenge to Apollo, p. 423 and the launch log: "exactly 1030 hours, 1 second Moscow Time"; ${KAMANIN}: «Точно в 12:30 по местному времени (в 10:30 по московскому)»`,
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
  'Its time on 12 October 1964 is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated).';
const TALLER =
  'For this vehicle, six metres taller than a Vostok’s, it is built as it stood for the Vostoks: what was raised or added for the 11A57’s third stage and ship is not in anything read.';

export const pad = site1Pad({
  url: 'models/ussr/voskhod/voskhod-1/pad.glb',
  slider: ['The bus arrives · 08:15', 'Liftoff · 10:30'],
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
        Erector: { detail: `${NOT_OURS} ${TALLER}`, facts: [['12 October 1964', 'drawn off: not recorded']] },
        ServiceTrusses: { detail: `${NOT_OURS} ${TALLER}`, facts: [['12 October 1964', 'lowered: not recorded']] },
        UpperCableMast: { detail: `${NOT_OURS} ${TALLER}`, facts: [['12 October 1964', 'away: not recorded']] },
        LaunchRing: { facts: [['Let go', 'at liftoff, 10:30:01 Moscow time, 12 October 1964']] },
      },
      erectorCrew: null,
      fillers: false,
    }),
    // in along the road at 08:15; away at thirty minutes' readiness (estimated)
    busPart(
      'The morning of 12 October 1964',
      {
        summary: 'A bus brought the three to the pad at a quarter past eight, Moscow time: no suits, so no ventilation hoses.',
        detail:
          'Kamanin has the bus at the pad at 10:15 by the range’s clock. That it was the same cream and blue LAZ-695B that brought ' +
          'every Vostok pilot is assumed, and where it stood is April 1961’s place, taken: nothing of this morning’s was measured. ' +
          'When it left is not recorded: here at thirty minutes’ readiness (estimated), as on the Vostoks. The crowd round it is not built.',
        facts: [
          ['Type', 'LAZ-695B (the bus of 1961, assumed)'],
          ['Came', '08:15 Moscow time (Kamanin, converted)'],
          ['Left', 'not recorded (here 10:00, estimated)'],
        ],
      },
      { in: [at(8, 14), at(8, 15)], back: [at(10, 0), at(10, 0, 45)], away: [at(10, 0, 50), at(10, 3)] },
    ),
  ],
  views: [{ id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] }],
});
