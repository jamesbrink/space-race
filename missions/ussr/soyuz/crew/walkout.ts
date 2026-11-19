import type { ModelDef, Part } from '../../../../src/types.ts';

export function soyuzWalker(
  id: string,
  name: string,
  url: string,
  suit: 'flight' | 'sokol-k' | 'sokol-kv2',
  position: [number, number, number],
  height = 1.7,
): ModelDef {
  const pressure = suit !== 'flight';
  const garment = suit === 'sokol-kv2' ? 'Sokol KV-2' : suit === 'sokol-k' ? 'Sokol-K' : 'flight clothing';
  const rotationY = Math.atan2(-position[0], -position[2]);
  const pieces: [node: string, title: string, summary: string][] = [
    [
      'Helmet',
      pressure ? 'Pressure hood and visor' : 'Communications cap',
      pressure ? 'A soft hood and a curved visor enclose the head.' : 'Earphones and microphone booms fit close to the face.',
    ],
    [
      'Torso',
      pressure ? 'Pressure garment' : 'Flight garment',
      pressure
        ? 'Closure strips and a pressure fitting cross the chest.'
        : 'The soft garment allowed the cosmonaut to move in the confined cabin.',
    ],
    ['Arms', 'Sleeves', 'The sleeves bend with the elbows.'],
    [
      'Gloves',
      pressure ? 'Gloves' : 'Hands',
      pressure ? 'The pale gloves continue the pressure garment.' : 'The cosmonaut wears ordinary flight clothing with the hands exposed.',
    ],
    ['Legs', 'Trouser legs', 'The garment folds at the knees and ankles.'],
    ['Boots', 'Footwear', 'The model shares the foot geometry used in the cabin.'],
  ];
  const parts: Part[] = pieces.map(([node, title, summary]) => ({
    node,
    name: title,
    summary,
    detail: `This standing figure uses the same reconstructed ${garment} as the seated figure. The launch apron position is illustrative.`,
    order: 0,
    explode: [0, 0, 0],
  }));
  return {
    id,
    name,
    url,
    backdrop: 'ground',
    parts,
    position,
    rotationY,
    wide: false,
    home: 'figure',
    scale: `${name} · ${height.toFixed(2)} m nominal stature · ${garment}`,
    walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
    views: [{ id: 'figure', label: name, centreY: height / 2, span: height * 1.4, from: [Math.sin(rotationY), 0.05, Math.cos(rotationY)] }],
  };
}
