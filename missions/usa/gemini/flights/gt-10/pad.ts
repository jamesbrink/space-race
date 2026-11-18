import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

const REPORT = 'Gemini X mission report (MSC-G-R-66-7)';
const PAO = 'Gemini X PAO launch commentary, the successful count (times reported in CST, converted to EST)';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook';

/** Seconds from liftoff, with the terminal hold and actual liftoff offset from the range's target second. */
const T = (minutes: number) => -minutes * 60 - 326 - 0.648;

/** The crew reach the white room, from the PAO’s launch commentary. */
export const crewArrives = -7526.648;

/** Both crew aboard, from the minute of the PAO update. */
export const crewAboard = -7226.648;

/** Both hatches initially shut, from the minute of the PAO update. */
export const hatchesShut = -6806.648;

/** The stops are chosen to show each movement clearly on the pad slider. */
const S = {
  room: [0.14, 0.26] as [number, number],
  platforms: [0.32, 0.44] as [number, number],
  door: [0.5, 0.56] as [number, number],
  erector: [0.56, 0.8] as [number, number],
  liftoff: 0.94,
};

const SEQUENCE: Keyframe[] = [
  {
    at: crewArrives,
    slider: 0,
    event: 'About 15:15 EST: Young and Collins reach the white room',
    confidence: 'estimated',
    source: `${PAO}: Tape 19 puts both men in the white room; Tape 20 has them getting settled at T−114 min 42 s.`,
  },
  {
    at: crewAboard,
    slider: 0.06,
    event: 'About 15:20 EST: Young and Collins take their seats',
    confidence: 'estimated',
    source: `${PAO}: Tape 19 puts both men in the white room; Tape 20 has them getting settled at T−114 min 42 s.`,
  },
  {
    at: hatchesShut,
    slider: 0.1,
    event: 'About 15:27 EST: both hatches are shut',
    confidence: 'estimated',
    source: `${PAO}: Tape 22 reports both hatches sealed about a minute before its 2:28 p.m. CST call.`,
  },
  {
    at: T(77.77),
    slider: S.room[0],
    event: 'About 15:57 EST: the white room is being cleared and its floors go up',
    confidence: 'estimated',
    source: `${PAO}: Tape 27 reports the first work clearing the white room; Tape 28 says it has been cleared. The floor timing is estimated.`,
  },
  {
    at: T(69.75),
    slider: S.room[1],
    event: 'The white room is clear and its floors are up',
    confidence: 'estimated',
    source: `${PAO}: Tape 27 reports the first work clearing the white room; Tape 28 says it has been cleared. The floor timing is estimated.`,
  },
  {
    at: T(66),
    slider: S.platforms[0],
    event: 'The five work platforms start folding up around the launch vehicle',
    confidence: 'estimated',
    source: `The platforms are hydraulic (${HANDBOOK}, ch. 7); estimated timing`,
  },
  {
    at: T(62),
    slider: S.platforms[1],
    event: 'The work platforms are up',
    confidence: 'estimated',
    source: 'Estimated four minutes for the platforms to fold',
  },
  {
    at: T(56.0),
    slider: S.door[0],
    event: 'The white room’s north door rolls up to clear the spacecraft',
    confidence: 'estimated',
    source: `${HANDBOOK}, p. 7-13: the door opens just before the erector lowers; the interval is estimated`,
  },
  {
    at: T(54.7),
    slider: S.erector[0],
    event: 'About 16:20 EST: the erector starts down',
    confidence: 'estimated',
    source: `${PAO}: Tapes 29 and 31 bracket the lowering. Ten minutes are taken within the bracket.`,
  },
  {
    at: T(44.7),
    slider: S.erector[1],
    event: 'The erector lies on the deck and the seats’ ejection path is clear',
    confidence: 'estimated',
    source: `${PAO}: Tapes 29 and 31 bracket the lowering. Ten minutes are taken within the bracket.`,
  },
  {
    at: T(3),
    slider: 0.86,
    event: 'T−3: the built-in hold for the final rendezvous targeting',
    confidence: 'derived',
    source: `${REPORT}, 5.2.10.3: the actual hold lasted 5 min 26 s; mapped to the count’s zero`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 17:20:26.648 EST: the thrust mount releases and a stage II umbilical stays attached',
    confidence: 'documented',
    source: `${REPORT}, the launch vehicle sequence of events (pad disconnect separation) and the final countdown section (stage II fuel vent umbilical)`,
  },
  {
    at: 4,
    slider: 1,
    event: 'The disconnected lines hang from their booms',
    confidence: 'estimated',
    source: `As in NASA S65-29636 (Gemini IV liftoff); estimated fall time; the stage II fuel vent umbilical that left with Gemini X is not animated`,
  },
];

export const pad = lc19Pad({
  url: 'models/usa/gemini/gt-10/pad.glb',
  slider: ['The crew go up · 15:15', 'Liftoff · 17:20'],
  sequence: SEQUENCE,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      UmbilicalTower: {
        detail:
          'The stage II fuel vent and topping umbilical failed to release. The line parted at the tower tie point, leaving approximately 14.5 feet of line and five feet of lanyard attached to the ascending Titan. The gallery shows the usual disconnect.',
      },
      ThrustMount: { facts: [['Liftoff', '17:20:26.648 EST (documented)']] },
    },
  }),
});
