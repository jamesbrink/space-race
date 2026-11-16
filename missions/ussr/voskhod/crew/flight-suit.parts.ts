import type { ModelDef, Part } from '../../../../src/types.ts';
import { COSMONAUT_AT } from '../../vostok/crew/sk-1.parts.ts';

/**
 * A Voskhod 1 crewman standing, in what he flew in (flight_suit.py, flight-suit.md), as a flight's crew model: its parts,
 * where he stands at Site 1 on the way from the bus to the lift (where the Vostoks' pilots stand), and the views. The flight
 * gives the model's file, its scale line and who it is.
 */

const FACING = Math.atan2(-COSMONAUT_AT[0], -COSMONAUT_AT[2]);
const facing = (lift: number, aside = 0.2): [number, number, number] => [Math.sin(FACING + aside), lift, Math.cos(FACING + aside)];

const parts = (who: string): Part[] => [
  {
    node: 'Helmet',
    name: 'Headset cap',
    summary: 'White cloth, with an earphone at each ear and two microphones at the mouth: no helmet.',
    detail:
      'The three flew without pressure suits, so there was no helmet: only the headset’s white cap, close over the head and ears, ' +
      'its earphones in round cups and two small microphones on booms. That it was white is the record’s (Kamanin; TASS); its cut and the ' +
      'microphones’ form are read off the photographs taken in the cabin.',
    facts: [
      ['Colour', 'white (Kamanin, 12 October 1964)'],
      ['Microphones', '2, on short booms'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Wool suit',
    summary: 'A light grey wool pullover and trousers: what the three wore into orbit.',
    detail:
      `«В 10:15 подъехал автобус с космонавтами, одетыми в легкие шерстяные костюмы серого цвета» (Kamanin). Over them they wore light ` +
      `blue jackets to the pad, and boots, and left both at the hatch for slippers: the jacket and the boots are not built, so ${who} stands ` +
      'here as he was in the cabin. The suit is drawn from a flight costume of the kind kept at Kaluga, which the museum does not say was this crew’s.',
    facts: [
      ['Colour', 'grey (Kamanin; Siddiqi); "dark" (TASS’s correspondent)'],
      ['Not built', 'the blue jacket and the boots worn to the lift'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'Sleeves loose over the wrists.',
    detail: 'The pullover’s sleeves end loose over the wrists.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Hands',
    summary: 'Bare: no gloves without a pressure suit.',
    detail: 'Bare hands, as the cabin photographs show them.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Trousers',
    summary: 'Grey wool, hanging to the ankle.',
    detail: 'Of one grey wool with the pullover, the legs hanging over the shoes’ tops.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Shoes',
    summary: 'Soft low shoes: the slippers they went aboard in.',
    detail:
      'At the top of the lift they took off their boots and put on slippers, "suede slippers" by the crew’s own account. None was found in a ' +
      'photograph: these are figurelib’s boot cut low (estimated). The boots they walked to the lift in are not built.',
    explode: [0, 0, 0],
    order: 0,
  },
];

export const flightSuitCrew = (m: { url: string; scale: string; who: string }): ModelDef => ({
  id: 'crew',
  name: 'Crew',
  url: m.url,
  scale: m.scale,
  backdrop: 'ground',
  parts: parts(m.who),
  position: COSMONAUT_AT,
  rotationY: FACING,
  walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
  wide: false,
  home: 'figure',
  views: [
    { id: 'figure', label: 'Cosmonaut', centreY: 0.9, span: 2.4, from: facing(0.05) },
    { id: 'cap', label: 'Headset cap', centreY: 1.57, span: 0.5, from: facing(0.05) },
    { id: 'shoes', label: 'Shoes', centreY: 0.15, span: 0.6, from: facing(0.2) },
  ],
});
