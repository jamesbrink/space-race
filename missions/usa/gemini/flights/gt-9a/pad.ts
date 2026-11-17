import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the morning of 3 June 1966, as Gemini 9A's pad.glb has it (model/pad.py: the site's modules at that
 * date, which build as Gemini 3's did). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is the
 * morning. The Atlas that put the target up from Complex 14 on 1 June is another pad's, and is not here.
 *
 * What the record gives of it: "the crew ingressed at T-115 minutes, and the subsequent tasks and checkout progressed
 * smoothly to the scheduled hold at T-3 minutes" (the mission report, MSC-G-R-66-6, 7.1.2.1); the count's zero, "the
 * nominal 13:39:30 G.m.t.", and liftoff at 13:39:33.335 (5.2.10.3 and Table 4.2-I); and the planned count (NASA release
 * 66-97, the press kit, pp. 6 and 7: "Close spacecraft hatches" at T-100, "White Room evacuation" at T-70, "Begin erector
 * lowering" at T-55, a "Built-in hold" at T-3). How long the hold at T-3 lasted is not in what was read: Gemini 8's
 * scheduled six minutes are taken. **So every time on the clock is estimated**, the count's minutes the record's or the
 * plan's, and said so.
 *
 * Not built: the people. Only the two men who flew are modelled.
 */

/** The built-in hold at T-3: its length not found; Gemini 8's scheduled 6 minutes (its mission report, 5.2.10), assumed. */
const HOLD = 6 * 60;
/** Seconds from liftoff (08:39:33.335 EST) of a minute of the count before the hold at T-3; its zero was 08:39:30. */
const T = (minutes: number) => -minutes * 60 - HOLD - 3.335;

const KIT = 'NASA release 66-97, the Gemini 9 press kit (10 May 1966), pp. 6 and 7: the planned count';
const GIX = 'the Gemini IX-A mission report (MSC-G-R-66-6)';
const CLOCK = 'on the clock with a hold at T-3 of Gemini 8’s six minutes, its own length not being in what was read';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';
const LATER_COUNT =
  'the count Martin’s handbook prints for the later flights ("T-55 Start lowering erector. T-50 ... Verify erector position is less than 40°"), the count this flight’s was';

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
    at: T(119),
    slider: 0,
    event: 'About 06:34: Stafford and Cernan reach the 100 ft level of the erector',
    confidence: 'estimated',
    source: `${KIT}: "Crew arrives at 100-foot level" at T-119, ${CLOCK}`,
  },
  {
    at: T(115),
    slider: S.aboard,
    event: 'T−115, about 06:38: the two men climb into the spacecraft',
    confidence: 'estimated',
    source: `${GIX}, 7.1.2.1: "the crew ingressed at T-115 minutes" (documented, in the count's minutes), ${CLOCK}`,
  },
  {
    at: T(70),
    slider: S.room[0],
    event: 'The hatches shut since T−100; at T−70, about 07:23, the white room is cleared and its floors raised',
    confidence: 'estimated',
    source: `${KIT}: "Close spacecraft hatches" at T-100 and "White Room evacuation" at T-70, ${CLOCK}. NASA S66-34065 has the technicians about to close the hatches. That the floors were raised then is ours`,
  },
  {
    at: T(66),
    slider: S.room[1],
    event: 'The white room’s floors are up',
    confidence: 'estimated',
    source: 'not recorded: four minutes taken',
  },
  {
    at: T(62),
    slider: S.platforms[0],
    event: 'The five work platforms are raised from round the launch vehicle',
    confidence: 'estimated',
    source: `not recorded for this flight. They were hydraulic and "lowered into place" once a vehicle stood (${HANDBOOK}); when they were raised is ours`,
  },
  {
    at: T(58),
    slider: S.platforms[1],
    event: 'The platforms are up',
    confidence: 'estimated',
    source: 'not recorded: four minutes taken',
  },
  {
    at: T(57),
    slider: S.door[0],
    event: 'The white room’s north door is rolled up to clear the spacecraft',
    confidence: 'estimated',
    source: `"Just prior to lowering the erector, this door is opened to allow clearance of the spacecraft" (${HANDBOOK}, p. 7-13); two minutes before the erector is ours`,
  },
  {
    at: T(55),
    slider: S.erector[0],
    event: 'T−55, about 07:38: the erector begins to go down',
    confidence: 'estimated',
    source: `${KIT}: "Begin erector lowering" at T-55, ${CLOCK}`,
  },
  {
    at: T(45),
    slider: S.erector[1],
    event: 'The erector lies on the deck: the ejection seats’ way out is clear',
    confidence: 'estimated',
    source: `how long it took is not recorded: ten minutes, from ${LATER_COUNT}`,
  },
  {
    at: -3 * 60 - HOLD - 3.335,
    slider: 0.86,
    event: 'T−3: the built-in hold, for the target to come round; the count is taken up without the computer’s update, by a backup plan',
    confidence: 'estimated',
    source: `${GIX}, 7.1.2.1 and 4.1: the update "was not received", and "a backup procedure ... prevented a hold in the countdown"; the hold’s length ${CLOCK}`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 08:39:33.335 EST, at the second for the rendezvous: the hold-down nuts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `${GIX}, Table 4.2-I: lift-off at 13:39:33.335 G.m.t.; the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13); the upper umbilical's drop weight, re-rigged after Gemini 8, "functioned properly" (5.2.10.3)`,
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
  url: 'models/usa/gemini/gt-9a/pad.glb',
  slider: ['The crew go up · 06:34', 'Liftoff · 08:39'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'For Gemini 9A it stood GLV-9 up on 24 March and was laid down for it three times. On 17 May the count stopped at T−85 ' +
          'when the Atlas carrying the Agena failed, and the crew came down from the white room; on 1 June, after the target ' +
          'had gone up, the count stopped at T−3, the ground unable to give the ship’s computer its update, and they took the ' +
          'elevator down again; on 3 June it went. When it went down that morning is not in what was read: the plan’s T−55 is ' +
          'taken, on a clock with an assumed hold.',
        facts: [
          ['17 May and 1 June 1966', 'the crew down from the white room again after scrubs (documented)'],
          ['3 June 1966', 'lowered from about 07:38 EST (estimated); how long it took: not recorded'],
        ],
      },
      UmbilicalTower: {
        detail:
          'After Gemini 8 its drop-weight lanyards were rigged anew, and on Gemini 9A the spacecraft’s upper umbilical dropped as it should.',
        facts: [['3 June 1966', 'let go at liftoff, 08:39:33.335 EST']],
      },
      ThrustMount: { facts: [['3 June 1966', 'released at 08:39:33.335 EST (documented)']] },
    },
  }),
});
