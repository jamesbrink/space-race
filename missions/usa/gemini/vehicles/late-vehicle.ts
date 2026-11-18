import type { ModelDef } from '../../../../src/types.ts';
import { lc19Vehicle } from '../../places/cape-canaveral/lc-19.parts.ts';
import { AGENA, AGENA_TARGET, agenaMotors, agenaParts, type TargetWords, withTarget } from './gemini-targets.ts';
import { along, BASE, cabin, DEG, geminiTitanStack, hingeAxis, IN, outOfAdapter, type PartWords, seats } from './gemini-titan.ts';

type Ship = 10 | 11 | 12;
const targets = { 10: '5005', 11: '5006', 12: '5001' };
const payload = {
  10: [
    'Hand-held maneuvering unit supply',
    'Two nitrogen bottles supplied Collins’s hand gun through an umbilical. The valve and disconnect were on the adapter’s outside.',
  ],
  11: [
    'Apollo sump experiment',
    'Eight lamps backlit a transparent one-eighth-scale Apollo sump. A mirror gave two views to the cameras on the access panel.',
  ],
  12: [
    'Adapter EVA workstation',
    'Foot restraints held Aldrin at a board of electrical connectors, fluid fittings and tools. The target carried a second station of its own.',
  ],
} as const;

function targetParts(unit: string) {
  const descriptions: TargetWords[] = [
    {
      node: 'TargetDockingAdapter',
      name: 'Target docking adapter',
      summary: 'The collar that received the spacecraft.',
      detail: (
        {
          '5003':
            'Collins reached this adapter on the dormant Gemini VIII target and brought its micrometeorite collector back to his spacecraft. The package was closed; only its four outer panels had been exposed.',
          '5005':
            'Young docked with this collar before firing the Agena engine. Its S-26 sensors measured the wake the Gemini spacecraft left in the ionosphere.',
          '5006':
            'Gordon retrieved a 100-foot tether and clamp from the container on this collar and attached the tether to the spacecraft’s index bar.',
          '5001':
            'Aldrin could tether himself to the adapter and use the wrench, fluid disconnect and electrical connector. The temporary handrail connected the target to the Gemini.',
        } as Record<string, string>
      )[unit],
    },
    {
      node: 'AgenaForwardSection',
      name: 'Forward equipment section',
      summary: 'Guidance equipment and electrical supplies ahead of the tanks.',
      detail:
        'The target could receive commands from the docked crew. The horizon sensors on the outside gave its guidance equipment a reference to the Earth.',
    },
    {
      node: 'AgenaTankSection',
      name: 'Tank section',
      summary: 'The large cylinder at the center of the Agena.',
      detail:
        'The two main propellants occupied separate compartments. Outside, longitudinal fairings carried lines past the tanks to the equipment at either end.',
    },
    {
      node: 'AgenaAftSection',
      name: 'Aft section',
      summary: 'The equipment rack around the main engine.',
      detail:
        'With the ascent fairing left behind, the crew could see the structure carrying the secondary propulsion units on opposite sides of the tail.',
    },
    {
      node: 'AgenaEngine',
      name: 'Agena main engine',
      summary: 'The restartable engine at the target’s tail.',
      detail:
        unit === '5001'
          ? 'An anomaly during the Agena’s ascent burn led Mission Control to cancel the planned docked main-engine firings.'
          : unit === '5003'
            ? 'The target had been shut down after Gemini VIII. Gemini X approached it under its own power.'
            : 'Once docked, the astronauts could command a burn of the Agena’s main engine to change the orbit of both vehicles.',
    },
  ];
  if (unit === '5001' || unit === '5006')
    descriptions.push({
      node: 'DockingCone',
      detail:
        'The V-shaped notch guided the index bar as the nose entered the cone. Three latches caught the spacecraft and the cone retracted six inches to rigidize the joint. The discharge fingers used on earlier adapters were removed.',
      facts: [
        ['Travel', '6 in'],
        ['Discharge fingers', 'removed'],
      ],
    });
  return agenaParts(descriptions);
}

export const oldAgena: ModelDef = {
  id: 'agena-8',
  specGroups: ['Gemini VIII target'],
  motorNames: agenaMotors().map((m) => m.name),
  galleryCraft: 'Gemini VIII’s Agena',
  name: 'GATV-5003',
  url: 'models/usa/gemini/gt-10/agena-8.glb',
  scale: '7.95 m from nozzle to docking cone',
  backdrop: 'studio',
  slider: ['Assembled', 'Taken apart'],
  cutaway: true,
  parts: targetParts('5003'),
  views: [{ id: 'whole', label: 'Dormant Agena', nodes: AGENA, from: along(-65, 0.12) }],
};

export function lateVehicle(n: Ship, open: [number, number]): ModelDef {
  const [load, description] = payload[n];
  const words: [string, string, string, string][] = [
    [
      'NoseFairing',
      'Nose fairing',
      'A removable glass-fibre cap protected the forward face on ascent.',
      'The cap covered the radar antennas, recovery equipment and docking fittings while the spacecraft was in the atmosphere.',
    ],
    [
      'RendezvousRecovery',
      'Rendezvous and recovery section',
      'The same nose that caught the Agena also carried the parachutes.',
      'The index bar extended 13.82 inches to engage the V in the target’s cone. Three equally spaced fittings took the hooks.' +
        (n === 12 ? ' A cap kept the tether loop from slipping over the end.' : ''),
    ],
    [
      'ReentryControl',
      'Reentry control system',
      'Two independent rings steered the returning cabin.',
      'After the adapter was discarded, either ring of eight chambers could roll the spacecraft and direct its lift during entry.',
    ],
    [
      'Hatches',
      'Crew hatches',
      'Each crew member had a window in a separately hinged hatch.',
      'The outboard hinges left a route through the pilot’s open hatch for EVA. Each hatch had twelve latches.' +
        (n === 12 ? ' Aldrin’s telescoping rail was stowed inside the right hatch.' : ''),
    ],
    [
      'ScannerFairing',
      'Horizon scanner fairing',
      'A protective cover over the infrared scanners.',
      'The scanners looked for the edge of the warm Earth. This fairing was discarded once the ship had left the atmosphere.',
    ],
    [
      'Cabin',
      'Cabin shell',
      'Ribbed shingles covered the outside of the reentry module.',
      'A pressure vessel sat inside the tapered outer shell. The trough ahead of each hatch window let the crew see forward toward the docking target.',
    ],
    [
      'CrewStation',
      'Crew station',
      'Two ejection seats faced the instrument panels.',
      'The command pilot flew from the left seat. The pilot could look forward through the right window, open the hatch, and work outside.',
    ],
    [
      'HeatShield',
      'Heat shield',
      'The broad end of the cabin entered the atmosphere first.',
      'The ablative shield carried away heat as its outer surface eroded. The adapter covered it until the spacecraft prepared to return.',
    ],
    [
      'RetroSection',
      'Retrograde adapter',
      'Four retrorockets in the forward half of the adapter.',
      'The crew discarded the equipment section first. After retrofire the remaining adapter separated, uncovering the heat shield.',
    ],
    [
      'EquipmentSection',
      'Equipment adapter',
      'The discarded service section carried power, consumables and EVA hardware.',
      description + ' The primary oxygen tank supplied both the crew and the fuel cells.',
    ],
    [
      'TitanStage2',
      'Titan second stage',
      'The upper stage carried the spacecraft into its insertion orbit.',
      'Gemini sat on the forward skirt. At separation the spacecraft flew forward clear of the spent stage.',
    ],
    [
      'TitanStage2Engine',
      'Second-stage engine',
      'A single bell between the upper stage and interstage.',
      'Openings around the interstage gave exhaust a path out during staging.',
    ],
    [
      'TitanInterstage',
      'Interstage',
      'A perforated skirt joined the two stages.',
      'The cutaway reveals the space around the upper-stage nozzle while the two stages were stacked.',
    ],
    [
      'TitanStage1',
      'Titan first stage',
      'The lower stage stood on the thrust mount at Complex 19.',
      'The long external conduit and vertical United States lettering help show the scale of the launch vehicle beside the pad.',
    ],
    [
      'TitanStage1Engine',
      'First-stage engine',
      'The paired thrust chambers at the base of the launch vehicle.',
      'The two bells share the first-stage engine installation. They stood over the flame opening in the deck.',
    ],
  ];
  // Dimensions of the common shell are McDonnell SEDR 300 vol. 2, figures 2-3 and 2-4.
  const facts: Record<string, [string, string][]> = {
    RendezvousRecovery: [
      ['Section length', '42.00 in'],
      ['Latch receptacles', 'Three, 120° apart'],
      ['Index-bar travel', '13.82 in'],
    ],
    ReentryControl: [
      ['Section length', '18.00 in'],
      ['Steering', 'Two independent rings of eight chambers'],
    ],
    Hatches: [
      ['Latches', 'Twelve on each hatch'],
      ['Outer pane', 'About 35° to the hatch'],
    ],
    CrewStation: [
      ['Command pilot', 'Left seat'],
      ['Pilot', 'Right seat'],
    ],
    EquipmentSection: [
      ['Extra main oxidizer tank', '22 in diameter'],
      ['Cylindrical reserve oxidizer tank', n === 12 ? 'Removed with the F-package' : 'Installed'],
    ],
    RetroSection: [
      ['Retrorockets', 'Four'],
      ['Collector', n === 11 ? 'S009 nuclear emulsion' : 'S012 micrometeorites'],
    ],
  };
  const parts: PartWords[] = words.map(([node, name, summary, detail]) => ({ node, name, summary, detail, facts: facts[node] }));
  for (const p of parts) {
    if (p.node === 'RendezvousRecovery') {
      p.moves = [
        { kind: 'slide', by: [0, 8.2, 0], from: 0.25, to: 0.75 },
        { kind: 'slide', node: 'RR_IndexBar', by: along(0, 0, 13.82 * IN), from: 0.78, to: 0.9 },
      ];
      p.functions = [{ nodes: ['RR_IndexBar'], name: 'Index bar', ends: ['Stowed', 'Extended'], seconds: 3 }];
    }
    if (p.node === 'Hatches')
      p.moves = [
        { kind: 'slide', by: along(0, 3.8, 1.7), from: 1 / 3, to: 5 / 6 },
        { kind: 'swing', node: 'HatchRight', axis: hingeAxis(1), angle: 100 * DEG, from: 0.6, to: 0.9 },
      ];
    if (p.node === 'RetroSection' || p.node === 'EquipmentSection') {
      const retro = p.node === 'RetroSection',
        rail = retro ? 'Retro_Handrail' : 'Equipment_Handrail';
      p.moves = [
        { kind: 'slide', by: [0, retro ? 3 : 1.8, 0], from: retro ? 11 / 24 : 0.5, to: retro ? 23 / 24 : 1 },
        { kind: 'slide', node: rail, by: outOfAdapter(12, 1.5 * IN), from: 0.8, to: 0.92 },
      ];
      p.functions = [{ nodes: [rail], name: retro ? 'Forward handrail' : 'Aft handrail', ends: ['Flush', 'Out'], seconds: 3 }];
    }
  }
  const missionNode = { 10: 'ManeuveringSupply', 11: 'ApolloSumpExperiment', 12: 'AdapterWorkstation' }[n];
  parts.push({
    node: missionNode,
    group: 'Spacecraft',
    name: load,
    summary: description,
    detail:
      'Shown in its launch configuration. The mission report identifies its components and attachment area. The dimensions of its mounting hardware are estimated.',
    explode: [0, -1.1, 2],
    order: 12,
    inside: true,
  });
  return lc19Vehicle(
    withTarget(
      geminiTitanStack({
        flight: `gt-${n}`,
        parts: [...parts, ...targetParts(targets[n])],
        seats: seats(open),
        cabin: cabin({
          radar: 'Range and closing speed to the transponder on the docking target.',
          fairing: 'Jettisons the covers over the docking nose and horizon scanners.',
          power: 'The fuel cells supplied electrical power to the spacecraft.',
        }),
        views: [
          { id: 'cabin', label: 'Crew station', nodes: ['CrewStation'], isolate: true, from: along(-25, 0.9) },
          { id: 'payload', label: load, nodes: [missionNode], isolate: true, from: n === 10 ? along(-75, -1.5) : along(60, -3) },
          { id: 'target', label: `GATV-${targets[n]}`, nodes: AGENA, isolate: true, from: along(-70, 0.12) },
          { id: 'cone', label: 'Docking cone', nodes: ['DockingCone', 'TargetDockingAdapter'], from: along(-60, 0.9) },
        ],
      }),
      `GATV-${targets[n]} · 7.95 m`,
      AGENA_TARGET,
    ),
    BASE,
  );
}
