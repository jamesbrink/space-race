import type { ModelDef, Part } from '../../../../src/types.ts';

/**
 * The crew of a Gemini flight as they stood on the deck at Complex 19, each a standing figure the site is walked as
 * (crew/g3c_suit.py `build`, in his own suit: g4c_suit.py). Gemini 3's two men are its own flight.ts; from Gemini 4 on,
 * each flight names its men here. What each part of the suit is is said once, for the G4C (g4c-suit.md); a flight adds
 * what its own men's suits had (`own`).
 */

/** What a flight says of its own man's suit beyond the G4C's: the summary and words for any part, by node. */
export type SuitWords = Partial<Record<'Helmet' | 'Torso' | 'Arms' | 'Gloves' | 'Legs' | 'Boots', { summary?: string; detail?: string }>>;

/** What is said of a G4C's parts (g4c-suit.md: nothing of its size is in print; every part is placed from photographs). */
export const g4cParts = (who: string, own: SuitWords = {}): Part[] => {
  const part = (
    node: keyof SuitWords,
    name: string,
    summary: string,
    detail: string,
    explode: [number, number, number],
    order: number,
  ): Part => ({
    node,
    name,
    summary: own[node]?.summary ?? summary,
    detail: own[node]?.detail ?? detail,
    explode,
    order,
  });
  return [
    part(
      'Helmet',
      'Helmet',
      'A white shell with a clear visor on side pivots, on a bare aluminium neck ring.',
      `${who} wore it to the pad with the visor down and the suit on a portable ventilator’s air. The G4C’s visor was thicker than the G3C’s, and the helmet was made to take an overvisor for going outside; the neck ring is bare metal, where the G3C’s was blue.`,
      [0, 0.5, 0],
      0,
    ),
    part(
      'Torso',
      'Suit',
      'The G4C: a pressure suit under a white outer layer, a second zip outside the first.',
      'David Clark’s G4C was the G3C made over: a pressure-sealing zip outside the old one so that the suit could be opened and closed again in orbit, and a cover layer over the whole. Over it is the personal parachute harness. The name tag, the insignia and the connectors on the chest are placed from the photographs of the day.',
      [0, 0, 0],
      1,
    ),
    part(
      'Arms',
      'Sleeves',
      'The flag on the left upper arm; a pocket on each; a gauge on the left forearm.',
      'The fifty-star flag is sewn high on the left sleeve: NASA S65-29643 has it on McDivitt’s on the morning of Gemini 4. The gauge showed the suit’s pressure.',
      [0, 0, 0],
      1,
    ),
    part('Gloves', 'Gloves', 'Locked on at wrist rings.', 'Each glove turned on to a ring at the cuff.', [0, 0, 0], 1),
    part('Legs', 'Trousers', 'A pocket on each shin.', 'The pockets held what he would want to hand in his seat.', [0, 0, 0], 1),
    part(
      'Boots',
      'Boots',
      'White, laced, with two red straps.',
      'To the foot of the spacecraft he wore yellow overshoes over them, taken off at the hatch so that nothing from the pad went aboard. The overshoes are not built.',
      [0, 0, 0],
      1,
    ),
  ];
};

/**
 * One man as he stood on the deck by the foot of the crew's ramp, facing the erector: a figure the site can be walked
 * as. Where each stood is ours. `height`: the figure's, in helmet and boots (the build's own figure), which its views
 * are framed on as Gemini 3's are on Grissom's 1.763 m. `boarding`: seconds from liftoff of the morning's first
 * keyframe, which is how the pad stands round him.
 */
export const standing = (m: {
  flight: string;
  id: 'crew' | 'pilot';
  name: string;
  scale: string;
  parts: Part[];
  height: number;
  at: [number, number, number];
  boarding: number;
}): ModelDef => ({
  id: m.id,
  name: m.name,
  url: `models/usa/gemini/${m.flight}/${m.id}.glb`,
  scale: m.scale,
  backdrop: 'ground',
  parts: m.parts,
  position: m.at,
  rotationY: Math.atan2(-m.at[0], -m.at[2]),
  walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
  wide: false,
  specGroups: ['Pressure suit'],
  home: 'figure',
  views: [
    { id: 'figure', label: 'Figure', centreY: 0.54 * m.height, span: 2.5, from: [-0.75, 0.08, -0.66] },
    { id: 'helmet', label: 'Helmet', centreY: m.height - 0.14, span: 0.62, from: [-0.75, 0.08, -0.66] },
    { id: 'walkout', label: 'At the ramp', centreY: 3.2, span: 9, from: [0.86, 0.02, -0.5] },
  ],
  // as they went up: the erector standing, its platforms down
  with: [{ model: 'pad', at: m.boarding }],
});
