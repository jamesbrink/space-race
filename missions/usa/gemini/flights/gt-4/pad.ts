import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the morning of 3 June 1965, as Gemini 4's pad.glb has it (model/pad.py: the site's modules at
 * that date, which build as Gemini 3's did). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is
 * the morning.
 *
 * What the record gives of it: the planned count (NASA release 65-158, the press kit, p. 16: "Crew enters spacecraft" at
 * T-100 minutes, "White Room evacuation complete; erector lowering preparations complete; erector cleared to lower" at
 * T-60, "Start lowering erector" at T-35); the mission report (MSC-G-R-65-3): the crew "ready for ingress at the scheduled
 * time of T-100 minutes" (7.1.1.1), the erector that could not be lowered from T-38 and a hold of 1 hour 16 minutes for
 * it (5.2.10, pp. 5-95 and 5-96), and the liftoff at 15:15:59.562 G.m.t., "approximately 1.24 hours later than planned"
 * (4.1); and the history's account (On the Shoulders of Titans, p. 245): the crew at pad 19 at 7:07, and the erector
 * that "stuck at a 12-degree angle from the booster. Raised to its full height, then lowered again, the erector still
 * stuck", until a connector wrongly fitted in a junction box was found. **When each try was made and how long each motion
 * took are not recorded**: the times between are estimated, and said so.
 *
 * Not built: the people. Only the two men who flew are modelled.
 */

/** Seconds from liftoff (10:15:59.562 EST) of a time on the Cape's clocks that morning. */
const EST = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s - (10 * 3600 + 15 * 60 + 59.562);
/** The hold: 1 hour 16 minutes at T-35 (the mission report, 5.2.10). A minute of the count before it fell this much earlier on the clock. */
const HOLD = 76 * 60;
/** A minute of the count before the hold, on the clock: the count planned liftoff for about 09:00 EST. */
const T = (minutes: number) => -minutes * 60 - HOLD;

const KIT = 'NASA release 65-158, the Gemini-Titan 4 press kit (May 1965), p. 16: the planned count';
const GIV = 'the Gemini IV mission report (MSC-G-R-65-3)';
const TITANS = 'On the Shoulders of Titans (NASA SP-4203), p. 245';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';
const LATER_COUNT =
  'the count Martin’s handbook prints for the later flights ("T-55 Start lowering erector. T-50 ... Verify erector position is less than 40°"): the type’s, taken for this flight';
const STUCK = `${TITANS}: "it stuck at a 12-degree angle from the booster. Raised to its full height, then lowered again, the erector still stuck"`;

/** Where each event falls on the pad's slider: layout, chosen so that each can be seen. The times on the clock are below. */
const S = {
  aboard: 0.06,
  room: [0.12, 0.2] as [number, number],
  platforms: [0.24, 0.32] as [number, number],
  door: [0.36, 0.4] as [number, number],
  tries: [
    [12, 0.42, 0.46],
    [-12, 0.5, 0.54],
    [12, 0.58, 0.62],
  ] as [number, number, number][],
  erector: [0.7, 0.88] as [number, number],
  liftoff: 0.94,
};

const MORNING: Keyframe[] = [
  {
    at: EST(7, 7),
    slider: 0,
    event: '07:07: McDivitt and White reach pad 19 and ride the erector’s elevator up',
    confidence: 'documented',
    source: `${TITANS}: "McDivitt and White arrived at pad 19 at 7:07 a.m., rode up in the elevator"; they had left the suiting trailer on portable ventilators at 7:05 (${GIV}, 7.2.1.7)`,
  },
  {
    at: T(100),
    slider: S.aboard,
    event: 'T−100, about 07:20: the two men climb into the spacecraft',
    confidence: 'derived',
    source: `${TITANS}: they "climbed into their spacecraft at T- 100 minutes"; ${GIV}, 7.1.1.1: "ready for ingress at the scheduled time of T-100 minutes". On the clock, the count’s minute put before the hold that came`,
  },
  {
    at: T(65),
    slider: S.room[0],
    event: 'The white room is cleared and its floors raised from round the spacecraft',
    confidence: 'estimated',
    source: `${KIT}: "White Room evacuation complete" at T-60. When it began, and that it was the floors that were raised, are ours`,
  },
  {
    at: T(60),
    slider: S.room[1],
    event: 'T−60, about 08:00: the white room is empty and the erector cleared to lower',
    confidence: 'derived',
    source: `${KIT}: "White Room evacuation complete; erector lowering preparations complete; erector cleared to lower"`,
  },
  {
    at: T(50),
    slider: S.platforms[0],
    event: 'The five work platforms are raised from round the launch vehicle',
    confidence: 'estimated',
    source: `not recorded for this flight. They were hydraulic and "lowered into place" once a vehicle stood (${HANDBOOK}); when they were raised is ours`,
  },
  {
    at: T(45),
    slider: S.platforms[1],
    event: 'The platforms are up',
    confidence: 'estimated',
    source: 'not recorded: five minutes taken',
  },
  {
    at: T(40),
    slider: S.door[0],
    event: 'The white room’s north door is rolled up to clear the spacecraft',
    confidence: 'estimated',
    source: `"Just prior to lowering the erector, this door is opened to allow clearance of the spacecraft" (${HANDBOOK}, p. 7-13); two minutes before the erector is ours`,
  },
  {
    at: T(38),
    slider: S.tries[0]![1],
    event: 'T−38, about 08:22: the erector is to go down. It stops 12° from the vehicle',
    confidence: 'derived',
    source: `${GIV}, 5.2.10: "At T-38 minutes neither the blockhouse automatic equipment nor the complex manual equipment could initiate erector lowering. Several attempts, using the manual controls, resulted in fail-safe stops"; ${STUCK}. The minute on the clock is derived; how far it went is the history’s`,
  },
  {
    at: T(35),
    slider: S.tries[1]![1],
    event: 'T−35, about 08:25: the count is held. The erector is raised to its full height again',
    confidence: 'derived',
    source: `${GIV}, 6.1.1.4: "At T-35 minutes, an estimated 20-minute hold was called because the erector would not lower"; ${STUCK}. When it was raised is ours`,
  },
  {
    at: T(35) + 15 * 60,
    slider: S.tries[2]![1],
    event: 'Lowered again, it stops again at 12°',
    confidence: 'estimated',
    source: `${STUCK}. When is ours`,
  },
  {
    at: EST(9, 31),
    slider: S.erector[0],
    event: 'A connector found wrongly fitted in a junction box: the erector goes down',
    confidence: 'estimated',
    source: `${TITANS}: "After more than an hour, technicians found a connector incorrectly installed in a junction box, replaced it properly, and gave the signal to lower the erector. This time it worked"; ${GIV}, 5.2.10: two wires put back wrongly after a moisture problem in the leg lock micro-switches was put right, following the wet mock simulated launch. Ten minutes for the lowering, from ${LATER_COUNT}, ending as the count was taken up`,
  },
  {
    at: EST(9, 41),
    slider: S.erector[1],
    event: 'About 09:41, after a hold of 1 hour 16 minutes, the count is taken up at T−35: the erector lies on the deck',
    confidence: 'derived',
    source: `${GIV}, 5.2.10: "The hold time for the erector problem was 1 hour 16 minutes"; 6.1.1.4: "After the erector was successfully lowered, the count proceeded to ignition with no further delays". The minute is liftoff less the count’s 35`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 10:15:59.562 EST: the hold-down nuts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `${GIV}, 4.1 and Table 4-I: lift-off at 15:15:59.562 G.m.t.; the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13). One did not: the first stage’s fuel vent and topping line pulled free "after the vehicle had lifted approximately 27 feet" (${GIV}, 5.2.10)`,
  },
  {
    at: 4,
    slider: 1,
    event: 'The lines hang from their booms',
    confidence: 'estimated',
    source: 'as NASA S65-29636 has them in the smoke of this liftoff; how long they took to fall is ours',
  },
];

export const pad = lc19Pad({
  url: 'models/usa/gemini/gt-4/pad.glb',
  slider: ['The crew reach the pad · 07:07', 'Liftoff · 10:16'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, tries: S.tries, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'On the morning of Gemini 4 it would not go down. At T−38 neither the blockhouse nor the controls on the complex could ' +
          'start it lowering; it stopped 12 degrees from the vehicle, was raised again, lowered, and stopped again, while McDivitt ' +
          'and White waited in their seats. The fault was two wires put back the wrong way round in a junction box after a ' +
          'moisture problem in the leg lock switches had been put right. The count held 1 hour 16 minutes, the only hold of the ' +
          'flight. The 12 degrees and the order of the tries are the history’s; when each was made is not recorded.',
        facts: [
          ['3 June 1965', 'would not lower from T−38 (about 08:22 EST); held 1 h 16 min (documented)'],
          ['Stuck at', '12° from the vehicle, twice (documented: On the Shoulders of Titans, p. 245)'],
        ],
      },
      UmbilicalTower: {
        facts: [
          ['3 June 1965', 'let go at liftoff, 10:15:59.562 EST; the first stage’s fuel vent line only at about 27 ft up (documented)'],
        ],
      },
      ThrustMount: { facts: [['3 June 1965', 'released at 10:15:59.562 EST (documented)']] },
      LaunchStand: {
        detail:
          'After Gemini 4 left it the damage to the complex was "minimal and not as extensive as previous launches" (the mission report, 5.2.10).',
      },
    },
  }),
});
