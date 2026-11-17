import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the morning of 21 August 1965, as Gemini 5's pad.glb has it (model/pad.py: the site's modules at
 * that date, which build as Gemini 3's did). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is
 * the morning.
 *
 * What the record gives of it: the planned count (NASA release 65-262, the press kit: the crew's morning on p. 13, "Crew
 * leaves ready room" at T-1 hour 49 minutes, "Crew arrives at 100-foot level" at T-1 hour 44, "Crew enters spacecraft" at
 * T-1 hour 40; the launch count on pp. 22 and 23, "White Room evacuation complete; erector lowering preparations complete;
 * erector cleared to lower" at T-40 minutes and "Start lowering erector" at T-35); and the mission report (MSC-G-R-65-4):
 * "The crew entered the spacecraft at the proper time" (7.1.1.1), a count "completely nominal" with no hold (6.1.1.4),
 * and liftoff at 13:59:59.518 G.m.t., "0.482 second earlier than planned" (4.1). **So each time on the clock is the plan's,
 * which the day kept**: derived, and how long each motion took is estimated, and said so. It was the second try: on
 * 19 August the erector was raised again round the crew and the count cancelled for thunderstorms (5.2.10.1).
 *
 * Not built: the people. Only the two men who flew are modelled.
 */

/** Seconds from liftoff (08:59:59.518 EST) of a minute of the count, which ran to the plan: T-0 was 09:00. */
const T = (minutes: number) => -minutes * 60;

const KIT = 'NASA release 65-262, the Gemini 5 press kit (12 August 1965)';
const GV = 'the Gemini V mission report (MSC-G-R-65-4)';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';
const NOMINAL = `${GV}, 6.1.1.4: "The countdown was completely nominal"; 7.1.1.1: "The crew entered the spacecraft at the proper time and all prelaunch crew functions were completed on time"`;
const LATER_COUNT =
  'the count Martin’s handbook prints for the later flights ("T-55 Start lowering erector. T-50 ... Verify erector position is less than 40°"): the type’s, taken for this flight';

/** Where each event falls on the pad's slider: layout, chosen so that each can be seen. The times on the clock are below. */
const S = {
  aboard: 0.08,
  room: [0.14, 0.26] as [number, number],
  platforms: [0.32, 0.44] as [number, number],
  door: [0.5, 0.56] as [number, number],
  erector: [0.56, 0.88] as [number, number],
  liftoff: 0.94,
};

const MORNING: Keyframe[] = [
  {
    at: T(104),
    slider: 0,
    event: 'T−104, about 07:16: Cooper and Conrad reach the 100 ft level of the erector',
    confidence: 'derived',
    source: `${KIT}, p. 13: "Crew arrives at 100-foot level" at T-1 hour, 44 minutes; ${NOMINAL}`,
  },
  {
    at: T(100),
    slider: S.aboard,
    event: 'T−100, about 07:20: the two men climb into the spacecraft',
    confidence: 'derived',
    source: `${KIT}, p. 13: "Crew enters spacecraft" at T-1 hour, 40 minutes; ${NOMINAL}`,
  },
  {
    at: T(45),
    slider: S.room[0],
    event: 'The white room is cleared and its floors raised from round the spacecraft',
    confidence: 'estimated',
    source: `${KIT}, p. 22: "White Room evacuation complete" at T-40. When it began, and that it was the floors that were raised, are ours`,
  },
  {
    at: T(40),
    slider: S.room[1],
    event: 'T−40, about 08:20: the white room is empty and the erector cleared to lower',
    confidence: 'derived',
    source: `${KIT}, p. 22: "White Room evacuation complete; erector lowering preparations complete; erector cleared to lower". The crew felt a vibration in the vehicle "during erector lowering preparations", never explained (${GV}, 5.2.10.3)`,
  },
  {
    at: T(40),
    slider: S.platforms[0],
    event: 'The five work platforms are raised from round the launch vehicle',
    confidence: 'estimated',
    source: `not recorded for this flight. They were hydraulic and "lowered into place" once a vehicle stood (${HANDBOOK}); when they were raised is ours`,
  },
  {
    at: T(37),
    slider: S.platforms[1],
    event: 'The platforms are up',
    confidence: 'estimated',
    source: 'not recorded: three minutes taken',
  },
  {
    at: T(37),
    slider: S.door[0],
    event: 'The white room’s north door is rolled up to clear the spacecraft',
    confidence: 'estimated',
    source: `"Just prior to lowering the erector, this door is opened to allow clearance of the spacecraft" (${HANDBOOK}, p. 7-13); two minutes before the erector is ours`,
  },
  {
    at: T(35),
    slider: S.erector[0],
    event: 'T−35, about 08:25: the erector begins to go down',
    confidence: 'derived',
    source: `${KIT}, p. 22: "Start lowering erector" at T-35; ${NOMINAL}. NASA S65-49568 has it part way down that morning`,
  },
  {
    at: T(25),
    slider: S.erector[1],
    event: 'The erector lies on the deck: the ejection seats’ way out is clear',
    confidence: 'estimated',
    source: `how long it took is not recorded for this flight: ten minutes, from ${LATER_COUNT}`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 08:59:59.518 EST: the hold-down nuts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `${GV}, 4.1: lift-off at 13:59:59.518 G.m.t.; the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13)`,
  },
  {
    at: 4,
    slider: 1,
    event: 'The lines hang from their booms',
    confidence: 'estimated',
    source: 'as NASA S65-29636 has them in the smoke of Gemini 4’s liftoff; how long they took to fall is ours',
  },
];

export const pad = lc19Pad({
  url: 'models/usa/gemini/gt-5/pad.glb',
  slider: ['The crew go up · 07:16', 'Liftoff · 09:00'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'On 19 August it had been lowered for Gemini 5 and raised again round the crew, with a thunderstorm coming over the ' +
          'pad, and the count cancelled. Two days later the count ran without a hold: the erector was to start down at T−35, ' +
          'about 08:25, and nothing read says it did otherwise. The times are the plan’s, which the day kept.',
        facts: [
          ['19 August 1965', 'raised again round the crew after a hold at T−10; the attempt cancelled (documented)'],
          ['21 August 1965', 'lowered from about 08:25 EST (derived); how long it took: not recorded'],
        ],
      },
      UmbilicalTower: { facts: [['21 August 1965', 'let go at liftoff, 08:59:59.518 EST']] },
      ThrustMount: { facts: [['21 August 1965', 'released at 08:59:59.518 EST (documented)']] },
      LaunchStand: { detail: 'After Gemini 5 left it, "Pad damage was minimal" (the Gemini V mission report, 5.2.10.3).' },
    },
  }),
});
