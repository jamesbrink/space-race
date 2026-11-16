import type { Keyframe } from '../../../../../src/types.ts';
import { lc19Pad, lc19Parts } from '../../../places/cape-canaveral/lc-19.parts.ts';

/**
 * Launch Complex 19 on the morning of 23 March 1965, as Gemini 3's pad.glb has it (model/pad.py: the site's modules at
 * that date). The hardware is the site's (places/cape-canaveral/lc-19.parts.ts); this is the morning.
 *
 * What the record gives of it: the planned count (NASA release 65-81, the press kit, pp. 11 and 12: the crew aboard at
 * T-100 minutes, "Spacecraft hatch closure. Dismantle White Room" at T-75, "Erector lowering" at T-35), and the history's
 * account of how the morning went (On the Shoulders of Titans, pp. 232 to 237: the van to the pad "shortly after 7", the
 * elevator to the 11th level, "At 7:30, they were inside with the hatches sealed", a hold of 24 minutes for a leaking
 * oxidizer line "just 35 minutes before launch", and liftoff 35 minutes after the count was taken up again). The mission
 * report (MSC-G-R-65-2), which would have each event to the second, has not been found. So **the erector's and the
 * platforms' times are derived from the plan and the hold**, and how long each took is estimated, and said so.
 *
 * Not built: the people. Photographs of the deck that morning (NASA S65-20994) have some thirty round the foot of the
 * erector: the pad crew in white coats and hard hats, photographers, a guard, and the white room's crew above. Only
 * the two men who flew are modelled.
 */

/** Seconds from liftoff (09:24:00 EST) of a time on the Cape's clocks that morning. */
const EST = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s - (9 * 3600 + 24 * 60);
/** A minute of the count after the hold: minutes before liftoff are then the clock's. */
const T = (minutes: number) => -minutes * 60;
/** The hold: 24 minutes, taken up again 35 minutes before liftoff. A minute of the count before it fell this much earlier on the clock. */
const HOLD = 24 * 60;

const KIT = 'NASA release 65-81, the Gemini-Titan 3 press kit (17 March 1965), pp. 11 and 12: the planned count';
const TITANS = 'On the Shoulders of Titans (NASA SP-4203), pp. 232 to 237';
const HANDBOOK = 'Martin’s Gemini-Titan II press handbook, ch. 7';
const LATER_COUNT =
  'the count Martin’s handbook prints for the later flights ("T-55 Start lowering erector. T-50 ... Verify erector position is less than 40°. ... Verify erector is lowered"): the type’s, taken for this flight';

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
    at: EST(7, 10),
    slider: 0,
    event: 'The crew reach the pad and go up in the erector’s elevator to the 11th level',
    confidence: 'estimated',
    source: `${TITANS}: the van brought them to pad 19 "shortly after 7"; the minute is ours`,
  },
  {
    at: EST(7, 30),
    slider: S.aboard,
    event: '07:30: Grissom and Young are in their seats with the hatches sealed, twenty minutes ahead of the plan',
    confidence: 'documented',
    source: `${TITANS}: "At 7:30, they were inside with the hatches sealed"`,
  },
  {
    at: T(75) - HOLD,
    slider: S.room[0],
    event: 'T−75: the white room is cleared and its floors raised from round the spacecraft',
    confidence: 'derived',
    source: `${KIT}: "Spacecraft hatch closure. Dismantle White Room" at T-75; on the clock, 99 minutes before liftoff, the hold still to come. What was dismantled is not said: the floors’ raising is put here`,
  },
  {
    at: T(70) - HOLD,
    slider: S.room[1],
    event: 'The white room’s floors are up',
    confidence: 'estimated',
    source: 'not recorded: five minutes taken',
  },
  {
    at: T(45) - HOLD,
    slider: S.platforms[0],
    event: 'The five work platforms are raised from round the launch vehicle',
    confidence: 'estimated',
    source: `not recorded for this flight. They were hydraulic and "lowered into place" once a vehicle stood (${HANDBOOK}); that they were raised ten minutes before the erector moved is ours`,
  },
  {
    at: T(40) - HOLD,
    slider: S.platforms[1],
    event: 'The platforms are up. At T−35 the count is held: a first-stage oxidizer line is leaking',
    confidence: 'derived',
    source: `${TITANS}: the count was halted "just 35 minutes before launch" for 24 minutes, a nut tightened; the platforms’ five minutes are estimated`,
  },
  {
    at: T(37),
    slider: S.door[0],
    event: 'The count is taken up. The white room’s north door is rolled up to clear the spacecraft',
    confidence: 'derived',
    source: `"Just prior to lowering the erector, this door is opened to allow clearance of the spacecraft" (${HANDBOOK}, p. 7-13); two minutes before the erector is ours`,
  },
  {
    at: T(35),
    slider: S.erector[0],
    event: 'T−35, about 08:49: the erector begins to go down',
    confidence: 'derived',
    source: `${KIT}: "Erector lowering" at T-35; ${TITANS}: liftoff came 35 minutes after the count resumed. That it was lowered after the hold and not before is taken from the two`,
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
    event: 'Liftoff, 09:24:00 EST: the hold-down bolts are blown and the umbilicals let go',
    confidence: 'documented',
    source: `liftoff at 9:24:00.064 a.m. e.s.t. (On the Shoulders of Titans, Appendix B, p. 524); the umbilicals "disconnected ... at liftoff" (${HANDBOOK}, p. 7-13)`,
  },
  {
    at: 4,
    slider: 1,
    event: 'The lines hang from their booms',
    confidence: 'estimated',
    source: 'as NASA S65-29636 has them in the smoke of Gemini IV’s liftoff; how long they took to fall is ours',
  },
];

const DERIVED = 'On 23 March 1965 its time is derived from the planned count and the hold; the mission report has not been found.';

export const pad = lc19Pad({
  url: 'models/usa/gemini/gt-3/pad.glb',
  slider: ['The crew go up · 07:10', 'Liftoff · 09:24'],
  sequence: MORNING,
  parts: lc19Parts({
    stops: { room: S.room, platforms: S.platforms, door: S.door, erector: S.erector, lines: [S.liftoff, 1] },
    adds: {
      Erector: {
        detail:
          'On the morning of Gemini 3 Grissom and Young rode its elevator "to the 11th level, where their spacecraft awaited ' +
          `them", and were sealed in by 7:30. It was to go down at T−35, which a 24 minute hold put at about 08:49. ${DERIVED}`,
        facts: [['23 March 1965', 'lowered from about 08:49 EST (derived); how long it took: not recorded']],
      },
      UmbilicalTower: { facts: [['23 March 1965', 'let go at liftoff, 09:24:00 EST']] },
      ThrustMount: { facts: [['23 March 1965', 'released at 09:24:00.064 EST (documented)']] },
      DeckFittings: {
        detail:
          'NASA S65-20994 is this ramp on this morning: one of the two men walking up it in his suit and yellow overshoes, a ventilator in his hand, among some thirty people who are not built.',
      },
    },
  }),
});
