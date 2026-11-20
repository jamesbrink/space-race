import type { Measure, ModelDef, Move, Part, Spec } from '../../../../src/types.ts';
import { PARACHUTE_COVER } from './soyuz-flies.ts';

const MHH = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357';
export const CRAFT = 'Spacecraft';
const LAUNCHER = 'Launch vehicle';
export const orbital: [number, number, number] = [0, 13, 0];
export const descent: [number, number, number] = [0, 9, 0];
const towerTravel: [number, number, number] = [0, 18, 0];
const portTilt = (12 * Math.PI) / 180;
export const service: [number, number, number] = [0, 7, 0];
// The first half shows the flight configuration with the modules still joined. The second takes the exhibit apart.
export const moduleTravel = (by: [number, number, number], order: number) => ({
  kind: 'slide' as const,
  by,
  from: 0.53 + order * 0.012,
  to: 0.7 + order * 0.015,
});

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
      { kind: 'slide', node: 'Fairing_Left', by: [0, 0, 5], from: 0.1, to: 0.27 },
      { kind: 'slide', node: 'Fairing_Right', by: [0, 0, -5], from: 0.1, to: 0.27 },
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
    summary: 'The third stage accelerated the spacecraft to orbit after the core fell away.',
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

/**
 * The main parachute container's cover, a part of every ship's descent module and a node of its own in its model
 * (soyuz_7kok.py `descent`): it goes with the module as the gallery takes the ship apart, and in flight it is shot off at
 * the height the flight's record starts the parachute system at (`at`; soyuz-flies.ts drops it). `flew`: what followed on
 * the day, where that was not the type's sequence.
 */
export function parachuteCover(at: Measure, flew = 'The drogue slowed the module until the main parachute took its place.'): Part {
  const km = Number((at.value / 1000).toFixed(1));
  return {
    node: PARACHUTE_COVER,
    name: 'Parachute container cover',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'The lid over the main parachute container, shot off to begin the landing.',
    detail: `The descent module carried a main and a reserve parachute system in two containers on its shoulder, each under its own cover. Shooting off the main container’s cover let the drogue parachute out. ${flew} The lid’s oval outline, its size and its place on the hull are estimated, and the container under it is not modelled.`,
    facts: [
      ['Container', 'Main parachute system · ОСП'],
      ['Shot off at', `${km} km · ${at.confidence}`],
      ['Shape and place', 'Estimated'],
    ],
  };
}

export const soyuzGallerySpecs: Spec[] = [
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
    note: `${MHH}, §1.3.1, Original Soyuz type figure assumed for this spacecraft.`,
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
];

export function wingMoves(side: 'Left' | 'Right'): Move[] {
  const sign = side === 'Right' ? 1 : -1;
  return [
    moduleTravel(service, 4),
    { kind: 'slide', node: `Solar${side}Whip`, by: [0, 1.88, 0], from: 0.36, to: 0.47 },
    ...[-Math.PI / 2, Math.PI, -Math.PI, Math.PI].map(
      (angle, i): Move => ({
        kind: 'swing',
        node: `Solar${side}Leaf${i + 1}`,
        axis: [0, 1, 0],
        angle: sign * angle,
        from: 0.28,
        to: 0.47,
      }),
    ),
  ];
}

export const iglaMoves: Move[] = [
  moduleTravel(orbital, 2),
  { kind: 'swing', node: 'IglaBoom', axis: [1, 0, 0], angle: -Math.PI / 3, from: 0.28, to: 0.47 },
];

export function soyuzGallery(
  id: string,
  name: string,
  surname: string,
  spacecraft: Part[],
  extraHelmetParts: readonly string[] = [],
): ModelDef {
  return {
    id: 'vehicle',
    name: `${name} · 11A511`,
    url: `models/ussr/soyuz/${id}/vehicle.glb`,
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
        label: `${surname}’s centre couch`,
        from: 'BO_SideHatchFace',
        open: [-7200, -3600], // Estimated prelaunch access interval for the seat contract. Studio visits are untimed.
        hide: ['Head', 'Cap', 'Earphones', 'ChinStrap', 'MicrophoneBooms', 'Microphones', 'Eyes', 'Brows', 'Lips', ...extraHelmetParts].map(
          (part) => `${surname}_Helmet_${part}`,
        ),
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
      { id: 'descent', label: 'Descent module', nodes: ['DescentModule', PARACHUTE_COVER], isolate: true },
      { id: 'cabin', label: 'Descent cabin', nodes: ['Cabin', 'Couches'], from: [-1, 0.2, 1] },
      { id: 'service', label: 'Instrument and propulsion module', nodes: ['ServiceModule', 'SolarLeft', 'SolarRight'], isolate: true },
    ],
    parts: [...launcher, ...spacecraft].map((part) => ({ ...part, moves: part.moves ?? [moduleTravel(part.explode, part.order)] })),
  };
}

/** The model origin is the spacecraft's aft face. Its nozzle datum is 35.695 m below,
 * from the measured lattice station and the reconstructed Block I and adapter in soyuz_11a511.py. */
export function onSoyuzPad(vehicle: ModelDef, rotationY: number, tail: number): ModelDef {
  const y = tail + 35.695;
  return {
    ...vehicle,
    backdrop: 'ground',
    rotationY,
    seats: vehicle.seats?.map((seat) => ({ ...seat, from: 'Fairing_AccessCover' })),
    position: [0, y, 0],
    home: 'launcher',
    wide: false,
    views: vehicle.views.map((view) => {
      const from = view.from;
      return {
        ...view,
        ...(view.centreY !== undefined ? { centreY: y + view.centreY } : {}),
        ...(from
          ? {
              from: [
                from[0] * Math.cos(rotationY) + from[2] * Math.sin(rotationY),
                from[1],
                -from[0] * Math.sin(rotationY) + from[2] * Math.cos(rotationY),
              ] as [number, number, number],
            }
          : {}),
      };
    }),
  };
}
