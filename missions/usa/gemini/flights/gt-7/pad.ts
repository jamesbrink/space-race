import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the afternoon of 4 December 1965, as Gemini 7's pad.glb has it (model/pad.py: the site's modules
 * at that date, which build as Gemini 3's did). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is
 * the afternoon.
 *
 * What the record gives of it: the planned count (NASA release 65-362, the Gemini 7/6 press kit, p. 4: "Flight Crew to
 * Complex 19" at T-120 minutes, "Crew enters spacecraft" at T-100, "Close spacecraft hatches" at T-75, "White Room
 * evacuation" at T-50, "Begin erector lowering" at T-35); the photograph of Lovell walking to the erector's elevator "one
 * hour and 40 minutes before launch" (NASA S65-61848); and the mission report (MSC-G-R-66-1): a count with no hold, "No
 * erector vibrations ... as were noted by the Gemini V crew" (5.2.10), and liftoff at 19:30:03.702 G.m.t., 3.7 s after
 * the count's zero because the range sequencer was not synchronized with the range clock (4.1). **So each time on the
 * clock is the plan's, which the day kept**: derived, and how long each motion took is estimated, and said so.
 *
 * Not built: the people. Only the two men who flew are modelled.
 */

/** Seconds from liftoff (14:30:03.702 EST) of a minute of the count, whose zero was 14:30:00. */
const T = (minutes: number) => -minutes * 60 - 3.702;

const KIT = 'NASA release 65-362, the Gemini 7/6 press kit (29 November 1965), p. 4: the planned count';
const GVII = 'the Gemini VII mission report (MSC-G-R-66-1)';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';
const NOMINAL = `${GVII}, 5.2.10: "No hold-fires were experienced during the countdown"; 7.1.2.1: "the crew countdown went very well"`;
const LATER_COUNT =
  'the count Martin’s handbook prints for the later flights ("T-55 Start lowering erector. T-50 ... Verify erector position is less than 40°"): the type’s, taken for this flight';

/** Where each event falls on the pad's slider: layout, chosen so that each can be seen. The times on the clock are below. */
const S = {
  aboard: 0.06,
  room: [0.14, 0.26] as [number, number],
  platforms: [0.32, 0.44] as [number, number],
  door: [0.5, 0.56] as [number, number],
  erector: [0.56, 0.88] as [number, number],
  liftoff: 0.94,
};

const MORNING: Keyframe[] = [
  {
    at: T(100),
    slider: 0,
    event: 'T−100, 12:50: Lovell and Borman walk to the erector’s elevator and ride up to the white room',
    confidence: 'documented',
    source: `NASA S65-61848: Lovell "walks to the elevator at Pad 19 one hour and 40 minutes before launch ... Moments later astronauts Lovell and Frank Borman, command pilot, rode the elevator to the White Room where they were inserted into the spacecraft"`,
  },
  {
    at: T(95),
    slider: S.aboard,
    event: 'About 12:55: the two men are in the spacecraft',
    confidence: 'estimated',
    source: `${KIT}: "Crew enters spacecraft" at T-100; the photograph has them on their way up then. Five minutes to the seats is ours`,
  },
  {
    at: T(55),
    slider: S.room[0],
    event: 'The hatches shut since T−75; the white room is cleared and its floors raised from round the spacecraft',
    confidence: 'estimated',
    source: `${KIT}: "Close spacecraft hatches" at T-75 and "White Room evacuation" at T-50; ${NOMINAL}. That the floors were raised then is ours`,
  },
  {
    at: T(50),
    slider: S.room[1],
    event: 'T−50, about 13:40: the white room is empty',
    confidence: 'derived',
    source: `${KIT}: "White Room evacuation" at T-50; ${NOMINAL}`,
  },
  {
    at: T(45),
    slider: S.platforms[0],
    event: 'The five work platforms are raised from round the launch vehicle',
    confidence: 'estimated',
    source: `not recorded for this flight. They were hydraulic and "lowered into place" once a vehicle stood (${HANDBOOK}); when they were raised is ours`,
  },
  {
    at: T(40),
    slider: S.platforms[1],
    event: 'The platforms are up',
    confidence: 'estimated',
    source: 'not recorded: five minutes taken',
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
    event: 'T−35, about 13:55: the erector begins to go down, for the first time since it stood GLV-7 up',
    confidence: 'derived',
    source: `${KIT}: "Begin erector lowering" at T-35; ${NOMINAL}. From Gemini 7 on there was no wet mock simulated launch, which had lowered it (NASA SP-4002, 11 November 1965). NASA S65-61632 has it part way down`,
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
    event: 'Liftoff, 14:30:03.702 EST, 3.7 s late: the hold-down nuts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `${GVII}, 4.1: lift-off at 19:30:03.702 G.m.t., the range sequencer "not properly synchronized with the range countdown clock"; the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13)`,
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
  url: 'models/usa/gemini/gt-7/pad.glb',
  slider: ['The crew go up · 12:50', 'Liftoff · 14:30'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'For Gemini 7 it stood from 29 October, when it stood GLV-7 up, to the afternoon of the flight: the wet mock simulated ' +
          'launch, which had lowered it, was no longer flown, and the spacecraft was wired to the Titan by a jumper cable while it ' +
          'hung six feet over the second stage. The count ran without a hold; it went down from T−35, about 13:55, and nothing read ' +
          'says it did otherwise. A day later it stood GLV-6 up in its place.',
        facts: [
          ['4 December 1965', 'lowered from about 13:55 EST (derived); how long it took: not recorded'],
          ['5 December 1965', 'GLV-6 erected by 11:00 EST, 20 hours after the liftoff (documented)'],
        ],
      },
      UmbilicalTower: { facts: [['4 December 1965', 'let go at liftoff, 14:30:03.702 EST']] },
      ThrustMount: { facts: [['4 December 1965', 'released at 14:30:03.702 EST (documented)']] },
      LaunchStand: {
        detail:
          'Gemini 7 left it with "minimal" damage (the mission report, 5.2.10): the workmen skipped the usual painting and cleaning, ' +
          'replaced what instruments they had to, and had Gemini 6 standing on it the next day.',
      },
    },
  }),
});
