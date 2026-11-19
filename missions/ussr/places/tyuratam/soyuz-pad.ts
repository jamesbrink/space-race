import type { ModelDef, Part } from '../../../../src/types.ts';

import { DEG, TURN } from './site-1.parts.ts';

export function soyuzTower(side: 'North' | 'South', group: string): Part {
  const node = `${side}ServiceTower`;
  const bearing = TURN + (side === 'North' ? 45 : 225) * DEG;
  return {
    ...structure(
      node,
      `${side} service tower`,
      'One half of each work platform reached around the upper stages.',
      'Two lattice towers carried decks up to the Soyuz shroud. The slider lowers the towers to clear the launcher. Their profile follows NASA photograph S75-32339. The motion and timing are reconstructed.',
    ),
    group,
    moves: [
      {
        kind: 'swing',
        node: `${node}_Frame`,
        axis: [-Math.sin(bearing), 0, -Math.cos(bearing)],
        angle: 86 * DEG,
        from: 0,
        to: 1,
        machine: {
          kind: 'hydraulic',
          confidence: 'assumed',
          source:
            'Site 1 hardware notes document hydraulic actuation for the earlier 8T119 service trusses. The Soyuz tower drive is assumed to use the same principle.',
        },
      },
    ],
  };
}

function structure(node: string, name: string, summary: string, detail: string): Part {
  return { node, name, summary, detail, group: 'Site 1', order: 0, explode: [0, 0, 0] };
}

export const soyuzPad: ModelDef = {
  id: 'pad',
  name: 'Site 1 · Soyuz service towers',
  backdrop: 'ground',
  url: 'models/ussr/places/tyuratam/site1/soyuz.glb',
  scale: '41 m concrete deck · 43 m reconstructed pit depth',
  home: 'towers',
  slider: ['Servicing', 'Cleared'],
  sequence: [
    {
      at: -7200,
      slider: 0,
      event: 'Towers around the launcher',
      confidence: 'estimated',
      source: 'Illustrative start of the servicing view. Times of individual tower operations are unverified.',
    },
    {
      at: -1800,
      slider: 0,
      event: 'Access towers begin to lower',
      confidence: 'estimated',
      source: 'Illustrative prelaunch clearance interval. The sequence and appearance follow NASA S75-32339.',
    },
    {
      at: -1500,
      slider: 1,
      event: 'Access towers clear',
      confidence: 'estimated',
      source: 'Estimated travel time and final angle for the two service towers.',
    },
  ],
  views: [
    { id: 'towers', label: 'Servicing towers', nodes: ['NorthServiceTower', 'SouthServiceTower', 'LaunchRing'], from: [-1, 0.17, 0.6] },
    { id: 'ring', label: 'Suspended vehicle', nodes: ['LaunchRing'], from: [1, 0.2, 0.7] },
    { id: 'pit', label: 'Flame pit', nodes: ['FlamePit', 'FlameDeflector'], from: [1, 0.4, -0.55] },
  ],
  parts: [
    structure(
      'Platform',
      'Launch platform',
      'Four concrete pylons carry the deck across the head of the pit.',
      'The deck measures 135 feet square in the early photographic surveys. Its load-bearing structure is assumed to have survived through these Soyuz launches.',
    ),
    structure(
      'FlamePit',
      'Flame pit',
      'The exhaust had a clear path east through the excavated pit.',
      'The model follows the outline of the excavation and the terraced ground down to its floor. The reconstruction uses the earlier surveys.',
    ),
    structure(
      'FlameDeflector',
      'Flame deflector',
      'The curved lining below the rocket turned the exhaust into the pit.',
      'The dimensions and lining follow the Site 1 reconstruction. Repairs and individual refractory blocks are omitted.',
    ),
    structure(
      'DeckRails',
      'Deck rails',
      'Rail lines cross the concrete platform and stop at the opening.',
      'The tracks carried ground equipment up to the suspended launcher. Their detailed layout is assumed from the earlier Site 1 surveys.',
    ),
    structure(
      'Tracks',
      'Rail approach',
      'The assembly train brought the stack to the opening from the west.',
      'These rails meet the embedded tracks on the platform. Their course follows the Site 1 survey and surviving rights of way.',
    ),
    structure(
      'Masts',
      'Mast beside the platform',
      'The tall lattice mast stands clear of the access towers.',
      'NASA image S75-32339 shows the mast behind the Soyuz installation. Its height and fittings here are assumed from the earlier Site 1 surveys.',
    ),
    structure(
      'LaunchRing',
      'Support ring and arms',
      'Four counterweighted arms held the launcher above the open deck.',
      'The four arms supported the rocket around its lower core. The geometry below the support points follows the shared Site 1 reconstruction.',
    ),
    structure(
      'CommandBunker',
      'Launch control bunker',
      'Controllers worked underground across the pad from the rail approach.',
      'The mound, periscopes and entrance follow the shared Site 1 survey. Fittings are assumed from the earlier reconstruction.',
    ),
    structure(
      'StorageBunker',
      'Storage bunker',
      'Three earth-covered bays open onto the road west of launch control.',
      'The bays survive at Site 1. The model uses the earlier surveyed dimensions and assumed fittings.',
    ),
    soyuzTower('North', 'Site 1'),
    soyuzTower('South', 'Site 1'),
  ],
};
