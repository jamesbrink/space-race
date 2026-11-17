import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the morning of 16 March 1966, as Gemini 8's pad.glb has it (model/pad.py: the site's modules at that
 * date, which build as Gemini 3's did). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is the
 * morning. The Atlas-Agena that went up from Complex 14 at 10:00 is another pad's, and is not here.
 *
 * What the record gives of it: the crew's morning to the minute (the mission report, MSC-G-R-66-4, Table 7.2-V: "Depart
 * suiting area" at 9:29, "Ingress into spacecraft" at 9:38); the hatch held up about ten minutes by glue in a harness
 * fitting (5.1.10.1.3); the count's clock (5.2.10: the range count begun at 7:35 a.m. at T-240 minutes, run without an
 * unscheduled hold to the scheduled hold at T-3, which "lasted 5 minutes and 54 seconds", and liftoff at 11:41:02); and
 * the planned count (NASA release 66-52, the press kit, pp. 9 and 10: "Close spacecraft hatches" at T-100, "White Room
 * evacuation" at T-70, "Begin erector lowering" at T-55). **So the crew's times are the record's, and the white room's and
 * the erector's are the plan's on a clock the record gives**: derived; how long each motion took is estimated.
 *
 * Not built: the people. Only the two men who flew are modelled.
 */

/** Seconds from liftoff (11:41:02.389 EST) of a time on the Cape's clocks that morning. */
const EST = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s - (11 * 3600 + 41 * 60 + 2.389);
/** The scheduled hold at T-3: 5 min 54 s (the mission report, 5.2.10). */
const HOLD = 5 * 60 + 54;
/** Seconds from liftoff of a minute of the count before the hold at T-3. */
const T = (minutes: number) => -minutes * 60 - HOLD;

const KIT = 'NASA release 66-52, the Gemini 8 press kit, pp. 9 and 10: the planned count';
const GVIII = 'the Gemini VIII mission report (MSC-G-R-66-4)';
const CLOCK = `${GVIII}, 5.2.10: the count "initiated" at 7:35 a.m. e.s.t. at T-240 minutes and run "to the scheduled 6-minute hold at T - 3 minutes without any unscheduled holds"`;
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
    at: EST(9, 34),
    slider: 0,
    event: 'About 09:34: Armstrong and Scott reach pad 19 and ride the erector’s elevator up',
    confidence: 'estimated',
    source: `${GVIII}, Table 7.2-V: "Depart suiting area" at 9:29 and "Ingress into spacecraft" at 9:38; the minute between is ours`,
  },
  {
    at: EST(9, 38),
    slider: S.aboard,
    event: '09:38: the two men climb into the spacecraft',
    confidence: 'documented',
    source: `${GVIII}, Table 7.2-V: "Ingress into spacecraft", 9:38 a.m. e.s.t.`,
  },
  {
    at: T(90),
    slider: S.room[0],
    event: 'About 10:05: the hatches shut, ten minutes late: glue in a fitting of Scott’s harness',
    confidence: 'estimated',
    source: `${GVIII}, 5.1.10.1.3: "approximately a 10-minute delay in closing the hatch while the substance was removed"; ${KIT}: "Close spacecraft hatches" at T-100, on the clock of ${CLOCK}`,
  },
  {
    at: T(70),
    slider: S.room[1],
    event: 'T−70, about 10:25: the white room is cleared and its floors raised from round the spacecraft',
    confidence: 'derived',
    source: `${KIT}: "White Room evacuation" at T-70; ${CLOCK}. That the floors were raised then is ours`,
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
    event: 'T−55, about 10:40: the erector begins to go down',
    confidence: 'derived',
    source: `${KIT}: "Begin erector lowering" at T-55; ${CLOCK}. The crew saw "Small Gemini Launch Vehicle (GLV) oscillations due to erector lowering" on their rate needles (${GVIII}, 7.1.2.1)`,
  },
  {
    at: T(45),
    slider: S.erector[1],
    event: 'The erector lies on the deck: the ejection seats’ way out is clear',
    confidence: 'estimated',
    source: `how long it took is not recorded: ten minutes, from ${LATER_COUNT}`,
  },
  {
    at: -3 * 60 - HOLD,
    slider: 0.86,
    event: 'T−3, about 11:32: the scheduled hold, for the Agena to come round; 5 min 54 s',
    confidence: 'derived',
    source: `${GVIII}, 5.2.10: "The scheduled 6-minute hold at T - 3 minutes lasted 5 minutes and 54 seconds"`,
  },
  {
    at: 0,
    slider: S.liftoff,
    event: 'Liftoff, 11:41:02.389 EST: the hold-down nuts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `${GVIII}, 5.2.10 and its table of events: lift-off at 16:41:02.389 G.m.t.; the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13). The spacecraft's upper umbilical did not drop: its lanyard to the tower pulled it free (5.2.10)`,
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
  url: 'models/usa/gemini/gt-8/pad.glb',
  slider: ['The crew go up · 09:34', 'Liftoff · 11:41'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'For Gemini 8 the count gave it longer: it was to start down at T−55, about 10:40 on that morning’s clock, while the ' +
          'Agena it was to meet was already in orbit. The crew felt it go on their rate needles. GLV-8 had stood in it since 13 ' +
          'January, and GLV-9 stood in it eight days after this launch.',
        facts: [['16 March 1966', 'lowered from about 10:40 EST (derived); how long it took: not recorded']],
      },
      UmbilicalTower: {
        detail:
          'On Gemini 8 the spacecraft’s upper umbilical was not pulled by its drop weight at liftoff: the static lanyard to the tower ' +
          'pulled it as the vehicle rose, and the lanyards were given more slack for the next flight.',
        facts: [['16 March 1966', 'let go at liftoff, 11:41:02.389 EST']],
      },
      ThrustMount: { facts: [['16 March 1966', 'released at 11:41:02.389 EST (documented)']] },
      LaunchStand: {
        detail: 'After Gemini 8, "Pad damage was minimal and comparable to that of previous launches" (the mission report, 5.2.10).',
      },
    },
  }),
});
