import type { Confidence } from '../../../../src/measure.ts';
import type { Flight, ModelDef, Part } from '../../../../src/types.ts';
import type { PartWords } from '../../places/tyuratam/site-1.parts.ts';

/**
 * A Vostok pilot in the SK-1 or the SK-2 (sk_1.py, sk-1.md) as a flight's crew model: its parts, where the pilot stands at
 * Site 1 on the way from the bus to the stair, and the views. The flight gives what its record says of the suit that morning
 * (`Suit`: which, who wore it, the gloves, the neck, the mirror) and of the helmet (lettered, or not), the model's file and
 * its scale line (the pilot's name and height); the parts' words are written from that.
 */

// The cosmonaut on the deck's west edge, on his way from where the bus stopped south of the tracks to the foot of the
// erector's stair (which is on its south side: the film), facing the rocket. The film and a colour photograph have him
// walking this way along the wagon's south side; where he is stood on it is ours (estimated).
export const COSMONAUT_AT: [number, number, number] = [-19.5, 0, 6.5];
const COSMONAUT_FACING = Math.atan2(-COSMONAUT_AT[0], -COSMONAUT_AT[2]);
/** A direction to look at him from: in front of him, turned `aside` radians, `lift` up. */
const facingCosmonaut = (lift: number, aside = 0.2): [number, number, number] => [
  Math.sin(COSMONAUT_FACING + aside),
  lift,
  Math.cos(COSMONAUT_FACING + aside),
];

/** One thing about a suit as worn on one morning, with how sure it is and where it was read. */
interface Worn<T> {
  value: T;
  confidence: Confidence;
  source: string;
}

/**
 * The suit a flight's pilot wore that morning, as the flight's record has it (sk-1.md, "Who is in the suit"; sk_1.py's
 * `Wearer` builds the same to the figure): which suit, who wore it and the words that stand for them, the gloves, the
 * pressure suit's neck seen under the helmet's ring, the mirror on the right sleeve or none. The words of the crew model's
 * parts are written from it, so nothing about the wearer is fixed in this module.
 */
export interface Suit {
  /** The SK-1, or the SK-2, the SK-1 cut again for a woman (Abramov and Skoog, p. 58). */
  kind: Worn<'SK-1' | 'SK-2'>;
  /** Who wore it: the name as the flight gives it, and the words for them in a sentence ("he", "his"). */
  wearer: { name: string; they: string; their: string };
  /** The gloves' backs: the cover's orange cloth, or black leather. */
  gloves: Worn<'cover' | 'black'>;
  /** The pressure suit's own neck under the helmet's ring: grey, or pale. */
  neck: Worn<'grey' | 'pale'>;
  /** Whether a mirror was sewn to the right sleeve. */
  mirror: Worn<boolean>;
  /** What the figure in the model is, where it is not built to the wearer's own measure: said in the torso's text. */
  standsIn?: string;
}

const crewParts = (helmet: PartWords, suit: Suit): Part[] => {
  const { they, their } = suit.wearer;
  const sk2 = suit.kind.value === 'SK-2';
  return [
    { node: 'Helmet', name: 'Helmet', ...helmet, explode: [0, 0, 0], order: 0 },
    {
      node: 'Torso',
      name: 'Torso',
      summary: 'An orange cover over the suit that holds pressure.',
      detail:
        'What is seen is not the pressure suit. ' +
        (sk2
          ? `The SK-2 is the SK-1 cut again for a woman, narrower at the shoulders and fuller at the hips (${suit.kind.source}), and like it is two layers`
          : 'The SK-1 is two layers') +
        ', a rubber bladder inside a restraint layer of ' +
        'lavsan (polyester) cloth, and over them this orange cover, the colour chosen to be found by: Vostok’s pilot ' +
        `left the cabin on ${their} ejection seat and came down under ${their} own parachute, anywhere along the track. The ` +
        `${suit.neck.value} at the neck is the suit itself. The hoses leave at ${their} right side; on the way to the pad the suit was ` +
        'ventilated from the bus.' +
        (suit.standsIn ? ` ${suit.standsIn}` : ''),
      facts: [
        ['Suit', `${suit.kind.value}, Zvezda (Tomilino)`],
        ['Mass', sk2 ? 'not found (the SK-1’s, 20 kg)' : '20 kg'],
        ['Pressure if the cabin fails', '270 to 300 hPa'],
        ['Markings', 'none but the helmet’s'],
      ],
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'Arms',
      name: 'Arms',
      ...(suit.mirror.value
        ? {
            summary: 'A mirror is sewn to the right sleeve.',
            detail:
              `Strapped into the seat in a helmet that does not turn far, ${they} could not see everything in the cabin. The ` +
              'mirror on the sleeve is for looking at what is out of sight: a switch, a gauge, the suit’s own fittings.',
          }
        : {
            summary: 'No mirror on the right sleeve.',
            detail:
              'The SK-1 had a mirror sewn to the right sleeve, for looking at what the helmet hid from the seat: a switch, a gauge, ' +
              `the suit’s own fittings. This one had none (${suit.mirror.source}).`,
          }),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'Gloves',
      name: 'Gloves',
      summary: `On metal rings, and off until ${they} was in the cabin.`,
      detail:
        'The gloves lock to metal rings at the wrists. ' +
        (suit.gloves.value === 'cover'
          ? 'Their palms are faced with leather; the backs are the cover’s orange. '
          : `They are black leather with tan palms (${suit.gloves.source}). `) +
        'They are modelled on, as flown.',
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'Legs',
      name: 'Legs',
      summary: 'One garment from the collar down, zipped to the crotch, a pocket on each thigh.',
      detail:
        'The cover is a loose overall. Its legs hang over the tops of the boots. What the thigh pockets held ' +
        'has not been read in a source; survival gear rode in the seat.',
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'Boots',
      name: 'Boots',
      summary: 'Black laced leather, worn over the suit’s feet.',
      detail: 'Ordinary-looking high boots, laced on hooks, pulled on over the feet of the pressure suit.',
      explode: [0, 0, 0],
      order: 0,
    },
  ];
};

export const sk1Crew = (m: { url: string; scale: string; helmet: PartWords; suit: Suit }): ModelDef => ({
  id: 'crew',
  name: 'Crew',
  url: m.url,
  scale: m.scale,
  backdrop: 'ground',
  parts: crewParts(m.helmet, m.suit),
  position: COSMONAUT_AT,
  rotationY: COSMONAUT_FACING,
  walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
  wide: false,
  specGroups: ['Pressure suit'],
  home: 'figure',
  views: [
    { id: 'figure', label: 'Cosmonaut', centreY: 0.9, span: 2.4, from: facingCosmonaut(0.05) },
    { id: 'helmet', label: 'Helmet', centreY: 1.57, span: 0.62, from: facingCosmonaut(0.05) },
    { id: 'hands', label: 'Gloves', centreY: 0.86, span: 0.62, from: facingCosmonaut(0.05) },
    { id: 'boots', label: 'Boots', centreY: 0.18, span: 0.62, from: facingCosmonaut(0.2) },
  ],
});

/** The suit's own figures, the same whoever wore it (the specs' 'Pressure suit' group; the man's height and mass are the flight's). */
export const SK1_SPECS: Flight['specs'] = [
  {
    group: 'Pressure suit',
    label: 'Suit mass',
    value: 20,
    unit: 'kg',
    confidence: 'documented',
    note: '20 kg (K. Thomas, NASA JSC, 2016, after Abramov and Skoog); 23 kg is also printed, perhaps with helmet, gloves and boots',
  },
  {
    group: 'Pressure suit',
    label: 'Operating pressure',
    value: 28.5,
    unit: 'kPa',
    confidence: 'documented',
    note: '270 to 300 hPa, held only if the cabin loses pressure (the same synopsis); the middle is shown',
  },
];
