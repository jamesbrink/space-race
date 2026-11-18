import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

const REPORT = 'Gemini XI mission report (MSC-G-R-66-8)';
const PAO = 'Gemini XI PAO launch commentary, the successful count (times reported in CST, converted to EST)';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook';

/** Seconds from liftoff, with the terminal hold and actual liftoff offset from the range's target second. */
const T = (minutes: number) => -minutes * 60 - 141 - 0.546;

/** The crew reach the white room, from the PAO’s launch commentary. */
export const crewArrives = -8246.546;

/** Both crew aboard, from the minute of the PAO update. */
export const crewAboard = -8186.546;

/** Both hatches initially shut, from the minute of the PAO update. */
export const hatchesShut = -7406.546;

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
    event: 'About 07:25 EST: Conrad and Gordon reach the white room',
    confidence: 'estimated',
    source: `${PAO}: Tape 18 has the crew in the room and then in their seats by T−117 min 38 s.`,
  },
  {
    at: crewAboard,
    slider: 0.06,
    event: 'About 07:26 EST: Conrad and Gordon take their seats',
    confidence: 'estimated',
    source: `${PAO}: Tape 18 has the crew in the room and then in their seats by T−117 min 38 s.`,
  },
  {
    at: hatchesShut,
    slider: 0.1,
    event: 'About 07:39 EST: both hatches are shut',
    confidence: 'estimated',
    source: `${PAO}: Tape 21 has the initial closure; tapes 23 to 25 cover the hold and repeat leak checks.`,
  },
  {
    at: -6926.546,
    slider: 0.11,
    event: 'T−97: the count holds for a suspected leak at the left hatch; the crew stays aboard',
    confidence: 'estimated',
    source: `${REPORT}, 6.1.2.3 and 7.1.2.1; ${PAO}, Tape 23: the countdown recycles to T−103 for the reseal and leak checks`,
  },
  {
    at: T(103),
    slider: 0.12,
    event: 'T−103: the count resumes while checks of the resealed hatch continue',
    confidence: 'derived',
    source: `${REPORT}, 6.1.2.3 and 7.1.2.1: the countdown resumes at T−103; the crew report approximately 15 minutes of delay. PAO Tape 26 has the hatch checks still in progress`,
  },
  {
    at: T(73),
    slider: S.room[0],
    event: 'About 08:27 EST: the white room is being cleared and its floors go up',
    confidence: 'estimated',
    source: `${PAO}: Tape 34 reports the room cleared by T−70. The start is estimated. The floor timing is estimated.`,
  },
  {
    at: T(70),
    slider: S.room[1],
    event: 'The white room is clear and its floors are up',
    confidence: 'estimated',
    source: `${PAO}: Tape 34 reports the room cleared by T−70. The start is estimated. The floor timing is estimated.`,
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
    at: T(59.0),
    slider: S.door[0],
    event: 'The white room’s north door rolls up to clear the spacecraft',
    confidence: 'estimated',
    source: `${HANDBOOK}, p. 7-13: the door opens just before the erector lowers; the interval is estimated`,
  },
  {
    at: T(57.7),
    slider: S.erector[0],
    event: 'About 08:42 EST: the erector starts down',
    confidence: 'estimated',
    source: `${PAO}: Tape 36 puts the start about 20 to 30 sec before T−57 min 16 s and expects ten minutes; Tape 37 confirms the erector is down.`,
  },
  {
    at: T(47.7),
    slider: S.erector[1],
    event: 'The erector lies on the deck and the seats’ ejection path is clear',
    confidence: 'estimated',
    source: `${PAO}: Tape 36 puts the start about 20 to 30 sec before T−57 min 16 s and expects ten minutes; Tape 37 confirms the erector is down.`,
  },
  {
    at: T(3),
    slider: 0.86,
    event: 'T−3: the built-in hold for the final rendezvous targeting',
    confidence: 'derived',
    source: `${REPORT}, 5.2.10.3: the actual hold lasted 2 min 21 s; mapped to the count’s zero`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 09:42:26.546 EST: the thrust mount releases and the umbilicals let go',
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
  url: 'models/usa/gemini/gt-11/pad.glb',
  slider: ['The crew go up · 07:25', 'Liftoff · 09:42'],
  sequence: SEQUENCE,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'The Titan and spacecraft stood free after the erector was lowered. The terminal hold at T−3 was called off after 2 min 21 sec to reach the first-orbit rendezvous window.',
      },
      ThrustMount: { facts: [['Liftoff', '09:42:26.546 EST (documented)']] },
    },
  }),
});
