import type { ModelDef, Move, Part, ViewDef } from '../../../../../src/types.ts';

const lm = 'Lunar module · Spider';
const lower = 'Descent stage';
const upper = 'Ascent stage';
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

const stageParts: [string, string, string, string, string][] = [
  [
    'LMDescentPower',
    'Four descent batteries',
    lower,
    'Four silver-zinc batteries supplied the descent buses.',
    'Each battery was rated at 400 ampere-hours. Open the blankets to inspect their cases, covers, terminals and leads. Installed envelopes are estimated.',
  ],
  [
    'LMAscentPower',
    'Ascent battery bay',
    upper,
    'Two 310 ampere-hour silver-zinc batteries travelled with the ascent stage.',
    'They could share propulsion manoeuvre loads with the descent batteries before staging. The cases, terminals and cabling represent the installation.',
  ],
  [
    'LMDescentConsumables',
    'Descent water and oxygen stores',
    lower,
    'One oxygen vessel and one water vessel remained with the descent stage.',
    'Water supplied the crew and the cooling system. The vessels and fittings are reconstructed from the mission report system diagrams.',
  ],
  [
    'LMAscentLifeSupport',
    'Oxygen, water and suit circuit',
    upper,
    'Two oxygen tanks and two water tanks stayed with the crew after staging.',
    'The cabin suit circuit removed moisture and carbon dioxide. The model includes the storage vessels, a suit-circuit assembly, cartridges and ducts.',
  ],
  [
    'LMLandingRadar',
    'Landing radar antenna',
    lower,
    'The antenna looked down from beneath Spider’s descent stage.',
    'Apollo 9 exercised both antenna positions and monitored the radar signals in Earth orbit. The antenna face and electronics enclosure are estimated from Mission Report figure A.2-16.',
  ],
  [
    'LMDescent',
    'Thermal blankets and outriggers',
    lower,
    'The octagonal lower stage carried the whole spacecraft at launch.',
    'Gold, copper and black blanket panels wrapped the stage. Four outriggers carried its loads into the adapter and supported the deployed legs. Panel finishes follow AS09-21-3212.',
  ],
  [
    'LMPorch',
    'EVA porch and foot restraints',
    lower,
    'Schweickart stood on the forward porch during his spacewalk.',
    'A grated platform projected from the forward outrigger below the cabin hatch. The two golden slippers held his feet while he faced the hatch with his camera.',
  ],
  [
    'LMLandingGear',
    'Landing gear, ladder and probes',
    lower,
    'Each of Spider’s four footpads carried a lunar surface probe.',
    'A ladder ran along the forward primary strut. In the launch stack the four assemblies fold inward beneath the outriggers. Their hinges and illustrated deployment paths are estimated from NASA TN D-6850.',
  ],
  [
    'LMDescentStructure',
    'Cruciform thrust structure',
    lower,
    'Two pairs of beams divided the descent stage into bays.',
    'The central compartment held the engine. Four neighbouring bays held its propellants. Cut away the blankets or isolate the propulsion system to see the beam layout.',
  ],
  [
    'LMDescentEngine',
    'Throttleable descent engine',
    lower,
    'The crew fired this gimballed engine first with Gumdrop docked and later during the independent flight.',
    'Below its gimbal, the insulated chamber flares into a thin crushable nozzle extension. The engine view exposes the chamber jacket, mounting ring, attachments and external fittings. Their local shapes are reconstructed.',
  ],
  [
    'LMDPSTanks',
    'Descent propellant and helium tanks',
    lower,
    'Four tanks fed Spider’s descent engine.',
    'Two held fuel and two held oxidizer. The model includes the helium vessels, tank bands and representative feed and pressurization lines. Routing and tank centres are estimated.',
  ],
  [
    'LMAscent',
    'Crew compartment and docking tunnel',
    upper,
    'McDivitt and Schweickart flew standing up behind two triangular windows.',
    'A third window above the commander looked up toward the docking target. Gumdrop’s probe met the conical drogue in the tunnel atop the midsection.',
  ],
  [
    'LMStations',
    'Two standing flight stations',
    upper,
    'Armrests and restraints held each pilot in position.',
    'McDivitt stood on the left and Schweickart on the right. The deck, side lockers, armrests, restraints and eye positions are reconstructed. Enter either station to look through the glazing.',
  ],
  [
    'LMControlPanels',
    'Displays and hand controllers',
    upper,
    'The crew shared the central guidance keyboard between two pilot stations.',
    'The instrument boards, attitude displays, switches, armrests and hand controllers are static. Panel relief and positions are estimated from the LM handbook.',
  ],
  [
    'LMAscentEngine',
    'Fixed ascent engine',
    upper,
    'A separate engine powered the ascent stage back to Gumdrop.',
    'The small bell nests in the opening at the top of the descent stage. Its chamber, jacket, mount and external feed fittings leave with the cabin. It delivered a nominal 3,500 lbf.',
  ],
  [
    'LMAPSTanks',
    'Ascent propellant and helium tanks',
    upper,
    'Two spherical tanks supplied the pressure-fed ascent engine.',
    'One held fuel and the other oxidizer. Two smaller helium vessels supplied pressurization. Their external envelopes and feed runs are reconstructed.',
  ],
  [
    'LMEquipment',
    'Attitude thrusters, radar and antennas',
    upper,
    'Sixteen thrusters let Spider turn and translate independently.',
    'Each corner quad has opposed vertical jets and two horizontal jets at right angles. The rendezvous radar tracked Gumdrop. The 26-inch S-band antenna provided a separate link to Earth.',
  ],
  [
    'LMReactionSupply',
    'Reaction-control tankage',
    upper,
    'Two independent systems supplied the four thruster clusters.',
    'Each system had a fuel tank, an oxidizer tank and a helium vessel. External envelopes and installed positions are approximate.',
  ],
];
const facts: Record<string, Part['facts']> = {
  LMDescent: [['Width across flats', '166 in · Mission Report fig. A.2-2']],
  LMLandingGear: [
    ['Pads', '4 × 37 in · press kit p. 43'],
    ['Tread radius', '167.57 in · NASA TN D-6850 p. 6'],
  ],
  LMDescentEngine: [
    ['Overall length / exit diameter', 'Approx. 85 / 58 in · NASA engine specifications, table I'],
    ['Mount', 'Two-axis gimbal · Mission Report A.2.11'],
  ],
  LMAscentEngine: [['Overall length / exit diameter', 'Approx. 51 / 31 in · NASA engine specifications, table I']],
  LMAscent: [
    ['Crew compartment', '92 in diameter × 42 in deep · press kit p. 42'],
    ['Forward hatch', '32 in square · press kit p. 42'],
  ],
};
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
const deployedParts: Part[] = stageParts
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
export const spiderStackParts: Part[] = deployedParts.map((p) => ({
  ...p,
  group: 'Spider in adapter',
  order: 6,
  inside: true,
  explode: [0, 33, 0],
  moves: [
    travel,
    { kind: 'slide', by: [0, 5, 0], from: 0.65, to: 0.88 },
    ...(p.group === upper ? [stage] : []),
    ...(p.node === 'LMLandingGear' ? [...gear, ...probes] : []),
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
export const spiderViews: ViewDef[] = [
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
  { id: 'porch', label: 'EVA porch', nodes: ['LMPorch'], isolate: true, from: [1, 0.65, -0.25] },
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
export const spiderModel: ModelDef = {
  id: 'spider',
  cutawayQuadrant: [1, -1],
  galleryFrom: [1, 0.18, -0.55],
  boardingLabel: 'Take a flight station',
  galleryAlias: 'lunar-module-spider',
  galleryCraft: 'LM-3 Spider',
  name: 'LM-3 Spider',
  url: 'models/usa/apollo/apollo-9/spider.glb',
  backdrop: 'studio',
  cutaway: true,
  scale: '31 ft over the deployed footpads · 23 ft 1 in from pad plane to S-band antenna',
  slider: ['Two stages joined', 'Ascent stage separated'],
  specGroups: [lm],
  motorNames: ['Descent engine', 'Ascent engine', 'LM attitude thruster'],
  parts: deployedParts,
  views: spiderViews,
  seats: [
    { node: 'LM_CommanderStation', label: 'McDivitt’s standing station', from: 'LMAscent', open: [44 * 3600, 100 * 3600] },
    { node: 'LM_PilotStation', label: 'Schweickart’s standing station', from: 'LMAscent', open: [43.3 * 3600, 101 * 3600] },
  ],
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
