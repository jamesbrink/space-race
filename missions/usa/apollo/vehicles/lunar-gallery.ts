import type { DockingPort, ModelDef, Move, Part, ViewDef } from '../../../../src/types.ts';

export const lmPort: DockingPort = {
  system: 'apollo-probe-and-drogue',
  role: 'drogue',
  part: 'LMDockingPort',
  frame: 'SpiderDockingFrame',
};
export const lower = 'Descent stage';
export const upper = 'Ascent stage';
const radial: [number, number][] = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
];
const gear: Move[] = radial.map(([x, z], i) => ({
  kind: 'swing',
  node: `LM3_GearHinge_${i}`,
  axis: [-z, 0, x],
  angle: (49 * Math.PI) / 180,
  from: 0.73,
  to: 1,
}));
const probes: Move[] = radial.map((_, i) => ({
  kind: 'swing',
  node: `LM3_ProbeHinge_${i}`,
  axis: [0, 0, 1],
  angle: (158 * Math.PI) / 180,
  from: 0.88,
  to: 1,
}));

const internal = new Set([
  'LMAscentLifeSupport',
  'LMAscentPower',
  'LMDescentPower',
  'LMDescentConsumables',
  'LMDescentStructure',
  'LMControlPanels',
  'LMStations',
  'LMDPSTanks',
  'LMAPSTanks',
  'LMReactionSupply',
  'LMAscentEngine',
  'LMDescentEngine',
]);
export function lunarGallery(
  id: string,
  callsign: string,
  craft: string,
  seats: ModelDef['seats'],
  stageParts: [string, string, string, string, string][],
  facts: Record<string, Part['facts']>,
  forwardProbe = true,
) {
  const deployedParts: Part[] = [...stageParts]
    .sort((a, b) => Number(a[2] === upper) - Number(b[2] === upper))
    .map(([node, name, group, summary, detail]) => ({
      node,
      name,
      group,
      summary,
      detail,
      order: group === upper ? 0 : 1,
      explode: [0, group === upper ? 4 : 0, 0],
      inside: internal.has(node),
      facts: facts[node],
    }));
  const travel: Move = { kind: 'slide', by: [0, 28, 0], from: 0.25, to: 0.75 };
  const stage: Move = { kind: 'slide', by: [0, 4, 0], from: 0.89, to: 1 };
  const stackParts: Part[] = deployedParts.map((p) => ({
    ...p,
    group: `${callsign} in adapter`,
    order: 6,
    inside: true,
    explode: [0, 33, 0],
    moves: [
      travel,
      { kind: 'slide', by: [0, 5, 0], from: 0.65, to: 0.88 },
      ...(p.group === upper ? [stage] : []),
      ...(p.node === 'LMLandingGear' ? [...gear, ...(forwardProbe ? probes : probes.slice(1))] : []),
      ...(p.node === 'LMEquipment'
        ? [
            {
              kind: 'swing' as const,
              node: 'LM3_SBandHinge',
              axis: [1, 0, 0] as [number, number, number],
              angle: (-60 * Math.PI) / 180,
              from: 0.72,
              to: 0.89,
            },
          ]
        : []),
    ],
  }));
  const views: ViewDef[] = [
    { id: 'drogue', label: `${callsign} docking drogue`, nodes: [lmPort.part], span: 1.55, isolate: true, from: [0.55, 0.95, -0.3] },
    { id: 'power', label: 'Electrical power', nodes: ['LMDescentPower', 'LMAscentPower'], isolate: true, from: [-1, 0.3, 0.6] },
    {
      id: 'life-support',
      label: 'Environmental control',
      nodes: ['LMAscentLifeSupport', 'LMDescentConsumables'],
      isolate: true,
      from: [-0.8, 0.35, 0.5],
    },
    { id: 'landing-radar', label: 'Landing radar', nodes: ['LMLandingRadar'], isolate: true, from: [-1, -0.65, 0.5] },
    { id: 'front', label: 'Forward hatch', nodes: ['LMAscent', 'LMPorch'], from: [1, 0.12, -0.25] },
    { id: 'porch', label: 'Forward porch', nodes: ['LMPorch'], isolate: true, from: [1, 0.65, -0.25] },
    { id: 'dps', label: 'Descent engine', nodes: ['LMDescentEngine'], isolate: true, from: [1, -0.25, 0.7] },
    { id: 'aps', label: 'Ascent engine', nodes: ['LMAscentEngine'], isolate: true, from: [1, -0.25, 0.7] },
    {
      id: 'descent-system',
      label: 'Descent propulsion',
      nodes: ['LMDescentEngine', 'LMDPSTanks', 'LMDescentStructure'],
      isolate: true,
      from: [1, 0.5, 0.7],
    },
    { id: 'ascent-system', label: 'Ascent propulsion', nodes: ['LMAscentEngine', 'LMAPSTanks'], isolate: true, from: [1, 0.15, 0.7] },
    { id: 'rcs', label: 'Radar and attitude control', nodes: ['LMEquipment', 'LMReactionSupply'], isolate: true, from: [1, 0.3, -0.4] },
    { id: 'stations', label: 'Crew stations', nodes: ['LMStations', 'LMControlPanels'], isolate: true, from: [-0.9, 0.35, 0.25] },
    {
      id: 'cabin-interior',
      label: 'Inside the pressure cabin',
      nodes: ['LMStations', 'LMControlPanels', 'LMAscentLifeSupport'],
      isolate: true,
      from: [-1, 0.48, -0.2],
    },
    { id: 'panels', label: 'Instrument panels', nodes: ['LMControlPanels'], isolate: true, from: [-1, 0.17, 0.2] },
    {
      id: 'ascent-stage',
      label: 'Independent ascent stage',
      nodes: deployedParts.filter((p) => p.group === upper).map((p) => p.node),
      isolate: true,
      from: [1, 0.15, -0.25],
    },
  ];
  const point = (x: number, y: number, z: number): [number, number, number] => [x * 0.0254, z * 0.0254, -y * 0.0254];
  const model: ModelDef = {
    id: callsign.toLowerCase(),
    dockingPorts: [lmPort],
    cutawayQuadrant: [1, -1],
    galleryFrom: [1, 0.18, -0.55],
    boardingLabel: 'Take a flight station',
    galleryAlias: `lunar-module-${callsign.toLowerCase()}`,
    galleryCraft: craft,
    name: craft,
    url: `models/usa/apollo/${id}/${callsign.toLowerCase()}.glb`,
    backdrop: 'studio',
    cutaway: true,
    scale: '31 ft over the deployed footpads · 23 ft 1 in from pad plane to S-band antenna',
    slider: ['Two stages joined', 'Ascent stage separated'],
    specGroups: [`Lunar module · ${callsign}`],
    motorNames: ['Descent engine', 'Ascent engine', 'LM attitude thruster'],
    parts: deployedParts,
    views,
    seats,
    lights: [
      { position: point(58, 24, 213), colour: 0xfff5e8, intensity: 0.7, reach: 2.3 },
      { position: point(58, -24, 213), colour: 0xfff5e8, intensity: 0.7, reach: 2.3 },
    ],
    cabin: {
      within: ['LMStations', 'LMControlPanels'],
      overhead: [0, 1, 0],
      instruments: [],
      lighting: {
        name: 'Cabin floodlights',
        about:
          'The crew-area lamps illuminate both stations. Their placement and brightness are estimated. Individual dimmers are not modelled.',
        ways: [
          { says: 'Flood', lit: [0, 1] },
          {
            says: 'Dim',
            lit: [
              { light: 0, level: 0.25 },
              { light: 1, level: 0.25 },
            ],
          },
          { says: 'Off', lit: [] },
        ],
      },
      windows: [
        { name: 'Commander’s forward window', at: point(74.8, 23.3, 199.3), out: [1, 0, 0], across: 0.45 },
        { name: 'Pilot’s forward window', at: point(74.8, -23.3, 199.3), out: [1, 0, 0], across: 0.45 },
        {
          name: 'Overhead docking window',
          at: point(55, 11.5, 223.9),
          out: [0, Math.cos(Math.PI / 12), -Math.sin(Math.PI / 12)],
          across: 0.4,
        },
      ],
    },
  };

  return { model, stackParts, views };
}
