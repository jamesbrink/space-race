import type { Flight, ModelDef, Part } from '../../../../src/types';
import type { PartWords } from '../sites/site-1.parts.ts';

/**
 * A Vostok pilot in his SK-1 (sk_1.py, sk-1.md) as a flight's crew model: its parts, where he stands at Site 1 on his way
 * from the bus to the stair, and the views of him. The suit is the same for every Vostok pilot; the flight gives what its
 * record says of his helmet (lettered, or not, that morning), the model's file and its scale line (the man's name and
 * height). Moved here from Vostok 1's flight.ts unchanged.
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

const crewParts = (helmet: PartWords): Part[] => [
  { node: 'Helmet', name: 'Helmet', ...helmet, explode: [0, 0, 0], order: 0 },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'An orange cover over the suit that holds pressure.',
    detail:
      'What is seen is not the pressure suit. The SK-1 is two layers, a rubber bladder inside a restraint layer of ' +
      'lavsan (polyester) cloth, and over them this orange cover, the colour chosen to be found by: Vostok’s pilot ' +
      'left the cabin on his ejection seat and came down under his own parachute, anywhere along the track. The ' +
      'grey at the neck is the suit itself. The hoses leave at his right side; on the way to the pad the suit was ' +
      'ventilated from the bus.',
    facts: [
      ['Suit', 'SK-1, Zvezda (Tomilino)'],
      ['Mass', '20 kg'],
      ['Pressure if the cabin fails', '270 to 300 hPa'],
      ['Markings', 'none but the helmet’s'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'A mirror is sewn to the right sleeve.',
    detail:
      'Strapped into the seat in a helmet that does not turn far, he could not see everything in the cabin. The ' +
      'mirror on the sleeve is for looking at what is out of sight: a switch, a gauge, the suit’s own fittings.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'On metal rings, and off until he was in the cabin.',
    detail:
      'The gloves lock to metal rings at the wrists. Their palms are faced with leather; the backs are the cover’s orange. ' +
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

export const sk1Crew = (m: { url: string; scale: string; helmet: PartWords }): ModelDef => ({
  id: 'crew',
  name: 'Crew',
  url: m.url,
  scale: m.scale,
  backdrop: 'tyuratam',
  parts: crewParts(m.helmet),
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
