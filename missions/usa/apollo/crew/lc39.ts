import type { ModelDef } from '../../../../src/types.ts';

/**
 * Standing launch configurations. Each crew member can be walked from the hardstand to the access stairs. `landed`: the
 * LM's crew went out onto the Moon (they are stood at the landing site while the flight is on its surface: app/surface.ts).
 */
export function lc39Crew(
  names: [string, string, string],
  lunarModule: boolean,
  suits: readonly (Pick<ModelDef, 'url' | 'scale'> & { torso?: string })[] = [],
  landed = false,
): ModelDef[] {
  return names.map((who, i) => {
    const ev = lunarModule && i !== 1;
    const type = ev ? 'EV' : 'IV';
    const suit = suits[i];
    const parts = [
      ['Helmet', 'Pressure helmet', 'The pressure bubble seals to the neck ring above the communications carrier.'],
      [
        'Torso',
        'Pressure garment',
        suit?.torso ??
          (ev
            ? 'The EV garment has extra chest connections for transferring to portable life support.'
            : 'The IV garment connects to the cabin oxygen circuit.'),
      ],
      ['Arms', 'Sleeves', 'The loose outer fabric covers the arm joints.'],
      ['Gloves', 'Pressure gloves', 'Wrist rings connect the gloves to the suit.'],
      ['Legs', 'Trousers', 'The outer garment covers the leg assemblies.'],
      ['Boots', 'Pressure boots', 'Laced boots enclose the feet for launch.'],
    ] as const;
    return {
      id: ['crew', 'pilot', 'lmp'][i]!,
      name: who,
      backdrop: 'ground',
      wide: false,
      home: 'figure',
      url: suit?.url ?? (ev ? 'models/usa/apollo/apollo-9/a7l-ev.glb' : 'models/usa/apollo/apollo-8/a7l-iv.glb'),
      scale: suit?.scale ?? `${who} · A7L ${type} launch suit · representative fit`,
      walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
      ...(ev && landed ? { surface: true } : {}),
      position: [-90, -47 * 0.3048 - (90 - 170 * 0.3048) * 0.05, -18 + i * 2.2],
      rotationY: Math.PI / 2 - 0.17,
      // Frame the six garment parts. Hidden suit levels can retain stale skinned bounds.
      views: [{ id: 'figure', label: who, nodes: parts.map(([node]) => node), span: 2.45, from: [-0.6, 0.08, -0.8] }],
      parts: parts.map(([node, name, detail]) => ({ node, name, detail, summary: name, order: 0, explode: [0, 0, 0] })),
    };
  });
}
