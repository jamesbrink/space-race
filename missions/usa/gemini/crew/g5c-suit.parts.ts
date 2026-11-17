import type { Part } from '../../../../src/types.ts';
import { g4cParts, type SuitWords } from './g4c-suit.parts.ts';

/**
 * What is said of a G5C's parts (g5c-suit.md): the G4C's but for the hood and the suit made light, which is what the
 * G5C changed. A man in it stands at Complex 19 as any Gemini crew does (g4c-suit.parts.ts `standing`).
 */
export const g5cParts = (who: string, own: SuitWords = {}): Part[] =>
  g4cParts(who, {
    Helmet: {
      summary: 'A soft hood with its visor sewn in, zipped on at the neck: no hard helmet, no neck ring.',
      detail: `${who} wore it to the pad zipped on and closed, and kept it on through the launch; an hour up the crew took their hoods and gloves off. Under it is an aviator's crash helmet, which carried the earphones and microphones and is not built. Unzipped, the hood folded back behind the head to make a headrest. Its form is the G4C helmet's, of cloth: no drawing of it has been read.`,
    },
    Torso: {
      summary: 'The G5C: two layers, a bladder under an outer layer of nylon, 16 lb.',
      detail:
        'Made for Gemini 7’s fourteen days, of the G4C’s materials without its restraint layer and inner liner: a neoprene-coated nylon bladder under six-ounce HT-1 nylon, 16 lb with its crash helmet. With no neck ring there is no tie-down on the chest. The NASA insignia is under the name tag, on the right breast, where the photographs of the day have it.',
    },
    ...own,
  });
