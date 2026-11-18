import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

const REPORT = 'Gemini XII mission report (MSC-G-R-67-1)';
const PAO = 'Gemini XII PAO launch commentary, the successful count (times reported in CST, converted to EST)';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook';

/** Seconds from liftoff, with the terminal hold and actual liftoff offset from the range's target second. */
const T = (minutes: number) => -minutes * 60 - 209 - 0.419;

/** The crew reach the white room, from the PAO’s launch commentary. */
export const crewArrives = -7353.419;

/** Both crew aboard, from the minute of the PAO update. */
export const crewAboard = -7233.419;

/** Both hatches initially shut, from the minute of the PAO update. */
export const hatchesShut = -6513.419;

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
    event: 'About 13:44 EST: Lovell and Aldrin reach the white room',
    confidence: 'estimated',
    source: `${PAO}: Tape 18 follows the crew up the elevator; Tape 19 reports them aboard already at T−116 min 25 s.`,
  },
  {
    at: crewAboard,
    slider: 0.06,
    event: 'About 13:46 EST: Lovell and Aldrin take their seats',
    confidence: 'estimated',
    source: `${PAO}: Tape 18 follows the crew up the elevator; Tape 19 reports them aboard already at T−116 min 25 s.`,
  },
  {
    at: hatchesShut,
    slider: 0.1,
    event: 'About 13:58 EST: both hatches are shut',
    confidence: 'estimated',
    source: `${PAO}: Tape 21 reports both hatches just shut at T−105 min.`,
  },
  {
    at: T(73),
    slider: S.room[0],
    event: 'About 14:30 EST: the white room is being cleared and its floors go up',
    confidence: 'estimated',
    source: `${PAO}: Tapes 25 and 26 bracket the white room's evacuation. The start is estimated. The floor timing is estimated.`,
  },
  {
    at: T(70),
    slider: S.room[1],
    event: 'The white room is clear and its floors are up',
    confidence: 'estimated',
    source: `${PAO}: Tapes 25 and 26 bracket the white room's evacuation. The start is estimated. The floor timing is estimated.`,
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
    at: T(59.6),
    slider: S.door[0],
    event: 'The white room’s north door rolls up to clear the spacecraft',
    confidence: 'estimated',
    source: `${HANDBOOK}, p. 7-13: the door opens just before the erector lowers; the interval is estimated`,
  },
  {
    at: T(58.3),
    slider: S.erector[0],
    event: 'About 14:44 EST: the erector starts down',
    confidence: 'estimated',
    source: `${PAO}: Tape 28 puts the start about 30 sec before T−57 min 48 s and expects eight minutes.`,
  },
  {
    at: T(50.3),
    slider: S.erector[1],
    event: 'The erector lies on the deck and the seats’ ejection path is clear',
    confidence: 'estimated',
    source: `${PAO}: Tape 28 puts the start about 30 sec before T−57 min 48 s and expects eight minutes.`,
  },
  {
    at: T(3),
    slider: 0.86,
    event: 'T−3: the built-in hold for the final rendezvous targeting',
    confidence: 'derived',
    source: `${REPORT}, 5.2.10: the actual hold lasted 3 min 29 s; mapped to the count’s zero`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 15:46:33.419 EST: the thrust mount releases and the umbilicals let go',
    confidence: 'documented',
    source: `${REPORT}, the launch vehicle sequence of events (pad disconnect separation)`,
  },
  {
    at: 4,
    slider: 1,
    event: 'The disconnected lines hang from their booms',
    confidence: 'estimated',
    source: `As in NASA S65-29636 (Gemini IV liftoff); estimated fall time`,
  },
];

export const pad = lc19Pad({
  url: 'models/usa/gemini/gt-12/pad.glb',
  slider: ['The crew go up · 13:44', 'Liftoff · 15:46'],
  sequence: SEQUENCE,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'The flight had been delayed by secondary autopilot problems. On 11 November, the erector lowered with the crew already aboard and the terminal hold took 3 min 29 sec.',
      },
      ThrustMount: { facts: [['Liftoff', '15:46:33.419 EST (documented)']] },
    },
  }),
});
