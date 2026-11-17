import type { Keyframe } from '../../../../../src/types.ts';
import { SUPPORTS_GO, site1Pad, site1Parts } from '../../../places/tyuratam/site-1.parts.ts';
import { MSK } from './orbital.ts';

/**
 * Site 1 on the morning of 18 March 1965, as Voskhod 2's pad.glb has it (model/pad.py: the site's modules at that date). The
 * hardware is the site's (places/tyuratam/site-1.parts.ts); this is the morning. What the record gives of it: the two woken at
 * 03:30, suited by 07:00 and aboard by about 07:30, Leonov first (the crew's report, its times faint in the copy read), and
 * snow all night: «Снег лежит на вершине корабля, на фермах обслуживания» (Borisenko, p. 77). **No bus is built**: none is in
 * anything read for this morning. The erector, the trusses and the cable mast have no times of their own, and each is given
 * Vostok 1's interval before its liftoff (09:06:59.7), put before this one: estimated, and said so.
 *
 * Not built: the people, the snow, and what had changed at the pad for a vehicle six metres taller (places/tyuratam/site-1.md,
 * "What stood when").
 */

const CREW_REPORT = '«Отчет экипажа космического корабля "Восход-2"» (roscosmos.ru/28187, as archived): its times faint in the copy read';
/** Vostok 1's interval from an event to its liftoff (its transcript), put before this one's: no time for this flight was found. */
const AS_VOSTOK_1 = (was: string) =>
  `not recorded for this flight: Vostok 1’s ${was} (its transcript) put as far before this liftoff, which is the procedure's and not this morning's`;
/** Vostok 1's minutes before liftoff, as this morning's: its time of `h:m` against its liftoff at 09:06:59.7. */
const before = (h: number, m: number, s = 0) => -(9 * 3600 + 6 * 60 + 59.7 - (h * 3600 + m * 60 + s));
const at = (h: number, m: number, s = 0) => MSK(18, h, m, s);

/** The pad's slider: its first tenth the crew going aboard, the rest from their couches to four seconds after liftoff. */
const ARRIVAL = 0.1;
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
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
    at: at(7, 0),
    slider: 0,
    event: 'Both suited by 07:00',
    confidence: 'documented',
    source: CREW_REPORT,
  },
  {
    at: at(7, 30),
    slider: T.seat,
    event: 'Aboard by about 07:30, Leonov first',
    confidence: 'documented',
    source: `${CREW_REPORT}: «about» is the record's`,
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
    event: 'Liftoff, 10:00:00',
    confidence: 'documented',
    source: '«в 7 часов 00 минут 00 секунд по гринвичскому времени», by stopwatch (the record commissioners’ act: Borisenko, p. 124)',
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
  'Its time on 18 March 1965 is Vostok 1’s interval before liftoff, put before this one: none was recorded for this flight (estimated).';
const TALLER =
  'For this vehicle, six metres taller than a Vostok’s, it is built as it stood for the Vostoks: what was raised or added for the 11A57’s third stage and ship is not in anything read.';

export const pad = site1Pad({
  url: 'models/ussr/voskhod/voskhod-2/pad.glb',
  slider: ['Aboard · about 07:30', 'Liftoff · 10:00'],
  sequence: MORNING,
  parts: site1Parts({
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
      Erector: { detail: `${NOT_OURS} ${TALLER}`, facts: [['18 March 1965', 'drawn off: not recorded']] },
      ServiceTrusses: {
        detail: `${NOT_OURS} ${TALLER} Snow lay on them that morning (Borisenko): not drawn.`,
        facts: [['18 March 1965', 'lowered: not recorded']],
      },
      UpperCableMast: { detail: `${NOT_OURS} ${TALLER}`, facts: [['18 March 1965', 'away: not recorded']] },
      LaunchRing: { facts: [['Let go', 'at liftoff, 10:00:00 Moscow time, 18 March 1965']] },
    },
    erectorCrew: null,
    fillers: false,
  }),
});
