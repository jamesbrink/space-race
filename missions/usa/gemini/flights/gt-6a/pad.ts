import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the morning of 15 December 1965, as Gemini 6A's pad.glb has it (model/pad.py: the site's modules
 * at that date, which build as Gemini 3's did). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is
 * the morning.
 *
 * What the record gives of it is least of any flight here: the mission report (MSC-G-R-66-2) has not been found. What
 * there is: the planned count (NASA release 65-362, the Gemini 7/6 press kit, p. 29: "Flight Crew to Complex 19" at T-120
 * minutes, "Crew enters spacecraft" at T-90, "Close spacecraft hatches" at T-75, "White Room evacuation" at T-50, "Begin
 * erector lowering" at T-35, and a "25-minute hold" at T-3, built in so that the Titan could be let go when Gemini 7 came
 * over); the launch systems final report's "CD Holds: None" for the flight (Table I-1); NASA S65-59974, the two men leaving
 * the suiting trailer in the dark; and liftoff at 13:37:26.471 G.m.t. (TRW's guidance reconstruction, p. 2-6). **So each
 * time on the clock is the plan's, with its 25-minute hold taken whole**, which the dark of the photograph bears out:
 * estimated, every one, and said so. Three days before, on the 12th, the engines had lit at 9:54 and shut down 1.2 s
 * later, the erector raised again at 11:28 and the crew taken out at 11:33 (NASA SP-4002, 12 December 1965): that is in
 * its words, not on its slider.
 *
 * Not built: the people. Only the two men who flew are modelled.
 */

/** The built-in hold at T-3: 25 minutes (the press kit, p. 29), taken whole. */
const HOLD = 25 * 60;
/** Seconds from liftoff (08:37:26.471 EST) of a minute of the count before the hold at T-3. */
const T = (minutes: number) => -minutes * 60 - HOLD;

const KIT = 'NASA release 65-362, the Gemini 7/6 press kit (29 November 1965), p. 29: the planned count for Gemini 6';
const CLOCK =
  'on the clock with the count’s 25-minute hold at T-3 taken whole, which nothing read confirms: the mission report has not been found';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';
const LATER_COUNT =
  'the count Martin’s handbook prints for the later flights ("T-55 Start lowering erector. T-50 ... Verify erector position is less than 40°"): the type’s, taken for this flight';

/** Where each event falls on the pad's slider: layout, chosen so that each can be seen. The times on the clock are below. */
const S = {
  aboard: 0.06,
  room: [0.14, 0.26] as [number, number],
  platforms: [0.32, 0.44] as [number, number],
  door: [0.5, 0.56] as [number, number],
  erector: [0.56, 0.8] as [number, number],
  liftoff: 0.94,
};

const MORNING: Keyframe[] = [
  {
    at: T(95),
    slider: 0,
    event: 'About 06:37, in the dark: Schirra and Stafford ride the erector’s elevator up',
    confidence: 'estimated',
    source: `${KIT}: "Crew enters spacecraft" at T-90, ${CLOCK}; NASA S65-59974 has them leaving the suiting trailer at Complex 16 before sunrise. Five minutes from the elevator to the seats is ours`,
  },
  {
    at: T(90),
    slider: S.aboard,
    event: 'T−90, about 06:42: the two men are in the spacecraft',
    confidence: 'estimated',
    source: `${KIT}: "Crew enters spacecraft" at T-90, ${CLOCK}`,
  },
  {
    at: T(55),
    slider: S.room[0],
    event: 'The hatches shut since T−75; the white room is cleared and its floors raised from round the spacecraft',
    confidence: 'estimated',
    source: `${KIT}: "Close spacecraft hatches" at T-75 and "White Room evacuation" at T-50, ${CLOCK}. That the floors were raised then is ours`,
  },
  {
    at: T(50),
    slider: S.room[1],
    event: 'T−50, about 07:22: the white room is empty',
    confidence: 'estimated',
    source: `${KIT}: "White Room evacuation" at T-50, ${CLOCK}`,
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
    event: 'T−35, about 07:37: the erector begins to go down',
    confidence: 'estimated',
    source: `${KIT}: "Begin erector lowering" at T-35, ${CLOCK}`,
  },
  {
    at: T(25),
    slider: S.erector[1],
    event: 'The erector lies on the deck: the ejection seats’ way out is clear',
    confidence: 'estimated',
    source: `how long it took is not recorded for this flight: ten minutes, from ${LATER_COUNT}`,
  },
  {
    at: -3 * 60,
    slider: 0.88,
    event: 'T−3: the count holds for Gemini 7 to come over; about 08:34 it is taken up',
    confidence: 'estimated',
    source: `${KIT}: "T-3 minutes 25-minute hold", ${CLOCK}`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 08:37:26.471 EST: the hold-down nuts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `the guidance reconstruction (Supplemental Report 4 to MSC-G-R-66-2, TRW, p. 2-6): liftoff at 13:37:26.471 G.m.t.; the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13)`,
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
  url: 'models/usa/gemini/gt-6a/pad.glb',
  slider: ['The crew go up · 06:37', 'Liftoff · 08:37'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'It stood GLV-6 up the day after Gemini 7 left, and was laid down for it twice. On 12 December the engines lit at 9:54 ' +
          'and stopped 1.2 s later, an electrical plug in the Titan’s tail having dropped out too soon, and the vehicle stood on ' +
          'the thrust mount, fuelled, with Schirra and Stafford in it, while emergency procedures ran: the erector was not raised ' +
          'round them again until 11:28, and they were out at 11:33. On the 15th it went down as planned; when, the mission ' +
          'report, not found, would say.',
        facts: [
          ['12 December 1965', 'raised again at 11:28 EST after the shutdown at 9:54; the crew out at 11:33 (documented)'],
          ['15 December 1965', 'lowered from about 07:37 EST (estimated: the plan with its built-in hold)'],
        ],
      },
      UmbilicalTower: { facts: [['15 December 1965', 'let go at liftoff, 08:37:26.471 EST']] },
      ThrustMount: {
        detail:
          'On 12 December the nuts were never blown: the engines stopped while the vehicle was still bolted down. Its gas generator ' +
          'was found the next morning with a dust cap left in its oxidizer inlet, which would have shut an engine down anyway.',
        facts: [['15 December 1965', 'released at 08:37:26.471 EST (documented)']],
      },
      LaunchStand: {
        detail:
          'It still had Gemini 7’s scorch on it: after that liftoff the workmen "wasted little time on normal painting or cleaning" ' +
          '(On the Shoulders of Titans, p. 282).',
      },
    },
  }),
});
