import type { Flight, Part } from '../../../../../src/types.ts';

const TASS = 'TASS communiqué of 23 April 1967, NASA translation ST-PR-10595, p. 1 (preliminary orbit)';
const MHH = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357';
const SIDDIQI = 'Asif A. Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
const CRAFT = 'Spacecraft';
const LAUNCHER = 'Launch vehicle';
const orbital: [number, number, number] = [0, 13, 0];
const descent: [number, number, number] = [0, 9, 0];
const towerTravel: [number, number, number] = [0, 18, 0];
const portTilt = (12 * Math.PI) / 180;
const service: [number, number, number] = [0, 7, 0];
// The first half shows the flight configuration with the modules still joined. The second takes the exhibit apart.
const moduleTravel = (by: [number, number, number], order: number) => ({
  kind: 'slide' as const,
  by,
  from: 0.53 + order * 0.012,
  to: 0.7 + order * 0.015,
});

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The extra room ahead of the entry cabin, with a side hatch for spacewalks.',
    detail:
      'Komarov would have received two spacewalking cosmonauts here after docking with the planned Soyuz 2. A bench and sideboard furnish the extra room, following early Soyuz designs in the Moscow Museum of Cosmonautics’ Balashova collection. The orbital module was discarded before entry. The outline follows the 7K-OK type, with estimated individual fittings and blanket seams.',
    facts: [
      ['Module', 'БО · бытовой отсек'],
      ['Crew transfer', 'By spacewalk'],
    ],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The probe would have caught the socket on Soyuz 2.',
    detail:
      'The forward probe and its surrounding ring were the active half of the first Soyuz docking system. Soyuz 1 was to close in and capture the passive port on Soyuz 2. The coupled ships would have had no passage through the docking mechanism. Here the exterior of the probe and ring are reconstructed and static.',
    facts: [
      ['Docking role', 'Active · documented'],
      ['Planned partner', 'Soyuz 2 · launch cancelled'],
    ],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'The rounded cabin that took Komarov to orbit and back through the atmosphere.',
    detail:
      'The descent module was the only part of Soyuz meant to reach the ground. It came in with its broad heat shield forward. On Soyuz 1 the main parachute stayed in its container and the reserve failed to fill. The cutaway exposes a reconstruction of the pressure cabin and couch bay.',
    facts: [
      ['Module', 'СА · спускаемый аппарат'],
      ['Return', 'Heat shield, parachutes and soft-landing engines'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'The cabin around Komarov’s couch and flight controls.',
    detail:
      'Komarov launched and came down in this cabin. When the automatic orientation system inhibited the first attempted braking burn, he aligned the ship by hand for the next attempt. The Sirius-7K layout follows engineer Yuri Tyapchenko’s account of the original type. The centre board has a navigation globe and a cathode-ray screen, flanked by two command-and-signal panels with numbered keys. The exhibit’s controls and displays are static.',
    facts: [['Exhibit', 'Reconstructed cabin and static controls']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Komarov flew alone, with two cosmonauts expected to join him for the return.',
    detail:
      'The spacecraft was meant to return with three cosmonauts after two transferred from Soyuz 2. Komarov flew the mission alone. The couch shapes and their mounting are reconstructed from early Soyuz references.',
    facts: [
      ['Crew aboard', 'Vladimir M. Komarov'],
      ['Planned return crew', 'Three'],
    ],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'Power, attitude control and the engine that brought Soyuz out of orbit.',
    detail:
      'The aft module housed the equipment that ran the ship and supported its two solar wings. Its engine performed the braking burn after Komarov had oriented the ship manually. The module separated before atmospheric entry. Its exterior and visible fittings are reconstructed.',
    facts: [
      ['Module', 'ПАО · приборно-агрегатный отсек'],
      ['Maximum diameter', '2.72 m · assumed from the published type figure'],
    ],
  },
  {
    node: 'SolarLeft',
    name: 'Left solar array',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The left wing stayed folded throughout the flight.',
    detail:
      'Soyuz 1 reported that its left solar wing had failed to deploy after launch. Losing the wing reduced power and complicated attitude control. In this exhibit the left wing stays stowed as it did on the flight.',
    facts: [['Flight state', 'Stowed · documented']],
  },
  {
    node: 'SolarRight',
    name: 'Right solar array',
    group: CRAFT,
    order: 4,
    explode: service,
    moves: [
      moduleTravel(service, 4),
      { kind: 'slide', node: 'SolarRightWhip', by: [0, 1.88, 0], from: 0.36, to: 0.47 },
      ...[-Math.PI / 2, Math.PI, -Math.PI, Math.PI].map((angle, i) => ({
        kind: 'swing' as const,
        node: `SolarRightLeaf${i + 1}`,
        axis: [0, 1, 0] as [number, number, number],
        angle,
        from: 0.28,
        to: 0.47,
      })),
    ],
    summary: 'The one wing that opened and supplied power in sunlight.',
    detail:
      'Komarov reported the right wing opening after separation. At the slider’s midpoint the right wing is open and the three spacecraft modules are still joined. The movement shows the result of deployment, with estimated hinge positions and travel.',
    facts: [['Flight state', 'Deployed · documented']],
  },
  {
    node: 'Igla',
    moves: [moduleTravel(orbital, 2), { kind: 'swing', node: 'IglaBoom', axis: [1, 0, 0], angle: -Math.PI / 3, from: 0.28, to: 0.47 }],
    name: 'Igla rendezvous antennas',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'Radar equipment for finding and closing on the second Soyuz.',
    detail:
      'The Igla system used radio measurements to find the target and guide the two ships together. Soyuz 2 never launched, so Soyuz 1 had no target to acquire. The folding truss follows the training center’s 7K-OK section. Its opening angle and motion are illustrative.',
    facts: [
      ['System', 'Игла (Igla), “needle”'],
      ['Purpose', 'Rendezvous'],
    ],
  },
];

const launcher: Part[] = [
  {
    node: 'EscapeTower',
    name: 'Launch escape tower',
    group: LAUNCHER,
    order: 0,
    explode: towerTravel,
    moves: [{ kind: 'slide', by: towerTravel, from: 0, to: 0.1 }],
    summary: 'The solid-rocket tower could pull the crew compartments away from a failing launcher.',
    detail:
      'The escape system was sized to lift the orbital and descent modules clear together. The tower rode at the tip of the fairing and was discarded during a normal ascent. Fine detail on the tower and its attachment is estimated.',
    facts: [['System', 'САС · система аварийного спасения']],
  },
  {
    node: 'Fairing',
    name: 'Payload fairing',
    group: LAUNCHER,
    order: 1,
    explode: [0, 0, 0],
    moves: [
      { kind: 'slide', node: 'Fairing_Left', by: [5, 0, 0], from: 0.1, to: 0.27 },
      { kind: 'slide', node: 'Fairing_Right', by: [-5, 0, 0], from: 0.1, to: 0.27 },
    ],
    summary: 'The shell that enclosed the spacecraft and its folded solar wings on the climb.',
    detail:
      'The early 7K-OK shroud enclosed all three spacecraft modules during ascent. The exhibit slides its two halves outward to reveal the spacecraft. The shell profile follows the period cutaway and its seams and fittings are reconstructed.',
    facts: [['Exhibit motion', 'Illustrative separation']],
  },
  {
    node: 'BlockI',
    name: 'Block I third stage',
    group: LAUNCHER,
    order: 5,
    explode: [0, 4, 0],
    summary: 'The third stage accelerated Soyuz 1 to orbit after the core fell away.',
    detail:
      'The 11A511’s Block I carried the RD-0110, a four-chamber engine that continued accelerating the spacecraft after core separation. The stage outline and internal stations are reconstructed from period references and shared R-7-family geometry.',
    facts: [['Engine', 'RD-0110 · documented']],
  },
  {
    node: 'AftSection',
    name: 'Block I aft skirt',
    group: LAUNCHER,
    order: 5,
    explode: [0, 3, 0],
    summary: 'The skirt around the third stage’s engine installation.',
    detail:
      'The skirt closes the lower end of Block I, where the engine and its connections sit above the interstage. The model reconstructs the exterior and the principal visible hardware.',
    facts: [['Stage', 'Block I']],
  },
  {
    node: 'Interstage',
    name: 'Open interstage',
    group: LAUNCHER,
    order: 6,
    explode: [0, 2, 0],
    summary: 'A lattice gives the third-stage exhaust a way out while the stages are still joined.',
    detail:
      'The lattice joins the Block I upper stage to the core and lets the hot-staging exhaust escape sideways as the upper engine lights. The lattice proportions and attachment details are reconstructed.',
    facts: [['Joint', 'Block A to Block I']],
  },
  {
    node: 'CoreStage',
    name: 'Block A core',
    group: LAUNCHER,
    order: 7,
    explode: [0, 0, 0],
    summary: 'The central stage lit on the pad and kept firing after the four boosters fell away.',
    detail:
      'The core of the 11A511 was part of the R-7 family. Like its predecessors it began burning with the side boosters, then continued by itself before passing the climb to Block I. The early Soyuz model reuses shared R-7 geometry where flight-specific dimensions are unavailable.',
    facts: [['Propellants', 'Liquid oxygen and kerosene']],
  },
  {
    node: 'CoreEngine',
    name: 'Core-stage engine',
    group: LAUNCHER,
    order: 7,
    explode: [0, 0, 0],
    summary: 'Four main chambers and four smaller steering chambers under the core.',
    detail:
      'The core’s RD-108-family engine had four main chambers and four small movable chambers for steering. The engine shown is a reconstruction using the dimensions of shared R-7-family hardware as a guide.',
    facts: [['Engine family', 'RD-108']],
  },
  ...(['B', 'V', 'G', 'D'] as const).map((block, index): Part => {
    const offsets: [number, number, number][] = [
      [8, 0, 0],
      [0, 0, -8],
      [-8, 0, 0],
      [0, 0, 8],
    ];
    return {
      node: `Booster_${block}`,
      name: `Block ${block} booster`,
      group: LAUNCHER,
      order: 5,
      explode: offsets[index]!,
      summary: 'One of the four tapered boosters that lifted the rocket off the pad.',
      detail:
        'The side boosters burned alongside the core through the first part of the climb. After cutoff their lower ends swung away before the upper attachments let go. The exhibit spreads them outward for inspection. Their geometry is shared with the earlier R-7 models.',
      facts: [
        ['Engine family', 'RD-107'],
        ['Propellants', 'Liquid oxygen and kerosene'],
      ],
    };
  }),
];

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-1',
  nation: 'USSR',
  agency: 'TsKBEM (formerly OKB-1)',
  program: 'Soyuz',
  designation: 'Soyuz 1',
  callsign: 'Rubin',
  spacecraft: 'Soyuz 7K-OK No. 4',
  launchVehicle: 'Soyuz 11A511',
  launch: '1967-04-23T00:35:00Z',
  launchSite: 'Tyuratam (Baikonur), Site 1',
  crew: ['Vladimir M. Komarov'],
  summary:
    'Vladimir Komarov flew the first crewed Soyuz and was to dock with a second ship. A solar wing stayed folded, the second launch was cancelled, and Komarov died when the parachutes failed during his early return.',
  facts: [
    { label: 'Spacecraft', value: '7K-OK No. 4 · active docking probe' },
    { label: 'Call sign', value: 'Rubin (Рубин), “ruby”' },
    { label: 'Model status', value: 'Gallery · reconstructed 7K-OK and 11A511' },
  ],
  timeline: [
    { t: 0, event: 'Liftoff from Site 1 at Tyuratam.' },
    { t: 540, event: 'Ground control confirms spacecraft separation and orbit. The left solar wing remains stowed.' },
    { t: 84072, event: 'The first attempted braking burn is inhibited when the automatic orientation sequence fails.' },
    { t: 95078.5, event: 'Komarov reports that the braking engine shut down after a successful burn.' },
    { t: 96540, event: 'Approximate impact time near Orsk. The main and reserve parachutes fail to arrest the descent.' },
  ],
  specs: [
    {
      group: LAUNCHER,
      label: 'Height on the pad',
      value: 49.913,
      unit: 'm',
      confidence: 'documented',
      note: 'RKK Energia Soyuz launch vehicle cutaway, 49,913 mm above the main-nozzle plane. The inherited steering bell extends 52 mm below that plane. Siddiqi p. 469 rounds the figure to 49.91 m.',
    },
    {
      group: LAUNCHER,
      label: 'Span across the booster rudders',
      value: 10.412,
      unit: 'm',
      confidence: 'assumed',
      note: 'RKK Energia’s 11A511 cutaway gives 10,412 mm. The rudder reach fits the type dimension for this ship.',
    },
    {
      group: CRAFT,
      label: 'Length with probe as modelled',
      value: 7.6,
      unit: 'm',
      confidence: 'estimated',
      note: 'Rounded early 7K-OK figure in Energia’s history. The model assumes this includes the active probe. The reference does not provide length stations.',
    },
    {
      group: CRAFT,
      label: 'Length of the body as modelled',
      value: 6.98,
      unit: 'm',
      confidence: 'estimated',
      note: 'Gagarin Cosmonaut Training Center type figure, interpreted as the body length. No station drawing was found.',
    },
    {
      group: CRAFT,
      label: 'Maximum diameter',
      value: 2.72,
      unit: 'm',
      confidence: 'assumed',
      note: `${MHH}, §1.3.1, Original Soyuz type figure assumed for No. 4.`,
    },
    {
      group: CRAFT,
      label: 'Descent module length',
      value: 2.16,
      unit: 'm',
      confidence: 'assumed',
      note: 'Gagarin Cosmonaut Training Center, 7K-OK, descent module dimensions.',
    },
    {
      group: CRAFT,
      label: 'Descent module diameter',
      value: 2.2,
      unit: 'm',
      confidence: 'assumed',
      note: 'Gagarin Cosmonaut Training Center, 7K-OK, descent module dimensions.',
    },
    {
      group: CRAFT,
      label: 'Orbital module side hatch',
      value: 0.64,
      unit: 'm',
      confidence: 'assumed',
      note: 'Gagarin Cosmonaut Training Center, 7K-OK, orbital module and EVA hatch.',
    },
    {
      group: CRAFT,
      label: 'Mass in orbit',
      value: 6450,
      unit: 'kg',
      confidence: 'documented',
      note: `${SIDDIQI}, appendix, Table I, Soyuz 1 row.`,
    },
    {
      group: 'Flight',
      label: 'Orbits',
      value: 18,
      unit: 'orbits',
      confidence: 'documented',
      note: `${SIDDIQI}, appendix, Table I, Soyuz 1 row.`,
    },
    { group: 'Flight', label: 'Apogee', value: 224000, unit: 'm', confidence: 'documented', note: TASS },
    { group: 'Flight', label: 'Perigee', value: 201000, unit: 'm', confidence: 'documented', note: TASS },
    { group: 'Flight', label: 'Period', value: 88.6, unit: 'min', confidence: 'documented', note: TASS },
    {
      group: 'Flight',
      label: 'Inclination',
      value: 51.67,
      unit: 'deg',
      confidence: 'derived',
      note: `${TASS}: 51°40′, converted to decimal degrees and rounded to 0.01°.`,
    },
    {
      group: 'Flight',
      label: 'Duration to reported impact',
      value: 96540,
      unit: 's',
      confidence: 'derived',
      note: `${SIDDIQI}, pp. 581 and 585: 03:35 MSK to the approximate ballistics estimate of 06:24 MSK the next day.`,
    },
  ],
  motors: [],
  models: [
    {
      id: 'vehicle',
      name: 'Soyuz 1 · 11A511',
      url: 'models/ussr/soyuz/soyuz-1/vehicle.glb',
      backdrop: 'studio',
      enclosedSpacecraft: true,
      cutaway: true,
      cabin: {
        within: ['Cabin', 'Couches'],
        overhead: [0, 0, 1],
        instruments: [],
        windows: [
          { name: 'Port-side window', at: [-0.981, 3.4, 0], out: [-Math.cos(portTilt), Math.sin(portTilt), 0], across: 0.208 },
          { name: 'Starboard-side window', at: [0.981, 3.4, 0], out: [Math.cos(portTilt), Math.sin(portTilt), 0], across: 0.208 },
        ],
        lighting: {
          name: 'Cabin light',
          about: 'The gallery controls the right-hand cabin lamp. Its physical switch is not modelled.',
          ways: [
            { says: 'On', lit: [0] },
            { says: 'Off', lit: [] },
          ],
          fittings: ['Lamp_1'],
        },
      },
      lights: [{ position: [0.381, 3.166, 0.582], colour: 0xffe7c4, intensity: 4.2, reach: 4 }],
      seats: [
        {
          node: 'Seat_Commander',
          label: 'Komarov’s centre couch',
          from: 'BO_SideHatchFace',
          open: [-7200, -3600], // Estimated prelaunch access interval for the seat contract. Studio visits are untimed.
          hide: [
            'Komarov_Helmet_Head',
            'Komarov_Helmet_Cap',
            'Komarov_Helmet_Earphones',
            'Komarov_Helmet_ChinStrap',
            'Komarov_Helmet_MicrophoneBooms',
            'Komarov_Helmet_Microphones',
            'Komarov_Helmet_Eyes',
            'Komarov_Helmet_Brows',
            'Komarov_Helmet_Lips',
          ],
        },
      ],
      scale: '49.913 m stack · RKK Energia drawing · hardware detail reconstructed',
      slider: ['Assembled', 'Taken apart'],
      views: [
        {
          id: 'launcher',
          label: '11A511',
          nodes: ['CoreStage', 'CoreEngine', 'Booster_B', 'Booster_V', 'Booster_G', 'Booster_D', 'Interstage', 'AftSection', 'BlockI'],
        },
        { id: 'escape', label: 'Fairing and escape tower', nodes: ['Fairing', 'EscapeTower'] },
        { id: 'spacecraft', label: 'Soyuz spacecraft', nodes: spacecraft.map((part) => part.node), isolate: true },
        { id: 'dock', label: 'Docking probe', nodes: ['OrbitalModule', 'DockingProbe'], isolate: true },
        { id: 'descent', label: 'Descent module', nodes: ['DescentModule'], isolate: true },
        { id: 'cabin', label: 'Descent cabin', nodes: ['Cabin', 'Couches'], from: [-1, 0.2, 1] },
        { id: 'service', label: 'Instrument and propulsion module', nodes: ['ServiceModule', 'SolarLeft', 'SolarRight'], isolate: true },
      ],
      parts: [...launcher, ...spacecraft].map((part) => ({ ...part, moves: part.moves ?? [moduleTravel(part.explode, part.order)] })),
    },
  ],
};
