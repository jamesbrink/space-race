import { assumed, doc, estimated } from '../../../../../src/measure.ts';
import type { Flight, JetDef, Motor } from '../../../../../src/types.ts';
import { LC34_FT as FT } from '../../../places/cape-canaveral/lc-34.ts';
import { apollo7Plan } from './orbital.ts';
import { UPRIGHTING } from './uprighting.ts';

const IN = 0.0254;
const ELS = 'Apollo Experience Report: Earth Landing System (NASA TN D-7437), appendix A';
const MAIN = 'Northrop, Apollo Parachute Performance Analysis (NTRS 19740011560), §2.3';
const RCS = 'North American Rockwell Apollo News Reference, Reaction Control, p. 150';
const RCS_THRUST = assumed(100 * 4.4482216152605, `${RCS}, per engine`);

// The simulated CSM points into the net translation. The four aft-facing outlets cancel their radial cant.
export const translationJets: JetDef[] = Array.from({ length: 4 }, (_, quad) => ({
  node: `RCS_Nozzle_${quad}_1`,
  gas: 'hypergolic',
  radius: assumed(2.8 * IN, `${RCS}, half the 5.6-in exit`),
  thrust: RCS_THRUST,
  exit: estimated(2500, 'Display pressure for expansion of the SM RCS exhaust in vacuum'),
  when: { with: 'sm-rcs' },
}));

const craft = apollo7Plan.craft[0]!;
function drop(on: string, nodes: string[]) {
  const joint = craft.joints.find((j) => j.id === on);
  if (!joint?.at) throw new Error(`Missing Apollo 7 visual separation time for ${on}`);
  return { on, at: joint.at.value, nodes };
}

const stageNames: Record<string, string> = {
  'h1-inboard': 'Four inboard H-1 engines',
  'h1-outboard': 'Four outboard H-1 engines',
  'sivb-j2': 'J-2 engine',
  sps: 'Service Propulsion System',
  'sm-rcs': 'Service module reaction control',
};
const propellant: Record<string, string> = {
  'h1-inboard': 'RP-1 / liquid oxygen',
  'h1-outboard': 'RP-1 / liquid oxygen',
  'sivb-j2': 'Liquid hydrogen / liquid oxygen',
  sps: 'Aerozine 50 / nitrogen tetroxide',
  'sm-rcs': 'Monomethylhydrazine / nitrogen tetroxide',
};
export const motors: Motor[] = craft.engines
  .filter((engine) => engine.id in stageNames)
  .map((engine) => {
    const rcs = engine.id === 'sm-rcs';
    const rating = rcs ? RCS_THRUST : engine.thrust.vacuum;
    return {
      name: stageNames[engine.id]!,
      count: rcs ? 16 : engine.count,
      thrustN: rating.value,
      propellant: propellant[engine.id]!,
      kind: engine.kind,
      confidence: rating.confidence,
      note: rating.source,
      operation: engine.id === 'sps' ? 'Eight ignitions in orbit' : rcs ? 'Pulsed' : 'Ascent',
    };
  });

// NASA SP-4029 Apollo 7 timeline. The later recovery entries are read on the mission timeline.
const activities: [number, number, string][] = [
  [25, 10, 'Sextant tracking of the S-IVB'],
  [41, 0, 'Sextant calibration'],
  [45, 30, 'S-IVB tracked to 160 nautical miles'],
  [53, 20, 'S-IVB tracked to 320 nautical miles'],
  [61, 0, 'Rendezvous radar transponder test'],
  [71, 43, 'First live television broadcast'],
  [95, 25, 'Second television broadcast'],
  [98, 40, 'S005 Earth photography'],
  [99, 10, 'S006 synoptic weather photography'],
  [119, 8, 'Third television broadcast'],
  [141, 11, 'Fourth television broadcast'],
  [147, 0, 'Lunar landmark and star sightings'],
  [167, 0, 'Passive thermal control test'],
  [168, 0, 'SPS cold-soak test'],
  [189, 4, 'Fifth television broadcast'],
  [213, 10, 'Sixth television broadcast'],
  [236, 18, 'Seventh television broadcast'],
  [260, 18, 'Crew begins inflating uprighting bags'],
  [260, 22, 'Crew reports apex up'],
  [260, 23, 'Recovery aircraft receives beacon'],
  [260, 30, 'Helicopter sights the command module'],
  [260, 32, 'Swimmers and flotation collar deployed'],
  [260, 41, 'Flotation collar inflated'],
  [260, 45, 'Crew opens hatch'],
  [260, 58, 'Crew aboard recovery helicopter'],
  [261, 6, 'Crew aboard USS Essex'],
  [262, 1, 'Command module aboard USS Essex'],
];
export const timeline: Flight['timeline'] = [
  ...activities.map(([hour, minute, event]) => ({ t: hour * 3600 + minute * 60, event })),
  ...apollo7Plan.events.flatMap((event) => (event.at ? [{ t: event.at.value, event: event.label }] : [])),
  ...(apollo7Plan.record?.marks ?? []).map((mark) => ({ t: mark.at.value, event: mark.label })),
].sort((a, b) => a.t - b.t);

export const flies: NonNullable<Flight['flies']> = {
  model: 'vehicle',
  target: {
    drop: 'spacecraft-separation',
    name: 'S-IVB',
    tailFirst: doc(11820, 'AS-205 flight evaluation §12.2, approximate time of tail-first alignment'),
    until: doc(168 * 3600 + 27 * 60, 'Apollo 7 Mission Report §3.4, approximate reentry time'),
    fixes: [
      {
        at: estimated(
          craft.joints.find((j) => j.id === 'spacecraft-separation')!.at!.value + 35,
          'Time to pull clear for transposition estimated from separation motion; precise time unknown',
        ),
        ahead: estimated(
          -50 * 0.3048,
          'NASA Apollo 7 mission history: Schirra pulled 50 ft ahead to turn around; separation projected along track',
        ),
        above: estimated(0, 'Line of sight reconstructed along track'),
        relative: true,
      },
      {
        at: doc(3 * 3600 + 16 * 60, 'NASA Apollo 7/S-IVB Rendezvous in Space, photo caption'),
        ahead: estimated(-100 * 0.3048, 'Photographed at approximately 100 ft during transposition. Stage assumed directly behind the CSM'),
        above: estimated(0, 'Photo range only'),
        relative: true,
      },

      {
        at: doc(28 * 3600 + 56.5, 'Mission Report table 2-I, SPS-2 ignition'),
        ahead: doc(80 * 1852, 'Mission Report §3.2.1, approximate downtrack separation'),
        above: doc(7.8 * 1852, 'Mission Report §3.2.1, altitude difference'),
      },
      {
        relative: true,
        at: doc(29 * 3600 + 43 * 60 + 55, 'Mission Report §3.2.1, braking'),
        ahead: estimated(1.2 * 1852, 'Reported slant range represented along track; direction unknown'),
        above: estimated(0, 'Relative elevation unknown'),
      },
      ...[29 * 3600 + 55 * 60 + 43, 30 * 3600 + 20 * 60].map((t) => ({
        relative: true,
        at: doc(t, 'SP-4029, station-keeping interval'),
        ahead: estimated(70 * 0.3048, 'Mission Report §2: final closure within 70 ft, reconstructed downtrack during station-keeping'),
        above: estimated(0, 'Relative elevation unknown'),
      })),
      ...[
        { t: 45.5 * 3600, range: 160 },
        { t: 53 * 3600 + 20 * 60, range: 320 },
      ].map(({ t, range }) => ({
        at: doc(t, 'SP-4029, Apollo 7 timeline, end of sextant tracking interval'),
        ahead: estimated(range * 1852, 'Reported sextant slant range represented along track; bearing unavailable'),
        above: estimated(0, 'Relative elevation unknown'),
      })),
    ],
  },
  drops: [
    drop('sib-separation', ['SaturnFirstStage', 'SaturnInterstage', 'FirstStageEngines', 'FirstStageTankStructure']),
    drop('les-jettison', ['LaunchEscape', 'BoostCover']),
    drop('spacecraft-separation', [
      'SaturnSecondStage',
      'SecondStageEngine',
      'SecondStageTankStructure',
      'InstrumentUnit',
      'InstrumentUnitEquipment',
      'SpacecraftAdapter',
    ]),
    drop('cm-sm-separation', ['ServiceModule', 'ServiceSumpTanks', 'ServicePower', 'ServiceHelium', 'ReactionControl', 'ServiceEngine']),
    drop('forward-shield-jettison', ['ForwardShield']),
  ],
  fires: [
    ...Array.from({ length: 8 }, (_, i) => ({
      node: `H1_Bell_${i}`,
      radius: 23 * IN,
      on: i < 4 ? 'h1-inboard' : 'h1-outboard',
      burns: 'kerosene-lox' as const,
    })),
    { node: 'J2_Bell', radius: 38.5 * IN, on: 'sivb-j2', burns: 'hydrogen-lox' },
    { node: 'SPS_Bell', radius: 47.25 * IN, on: 'sps', burns: 'hydrazine-n2o4' },
    ...Array.from({ length: 4 }, (_, i) => ({
      node: `LES_Nozzle_${i}`,
      radius: 5.5 * IN,
      on: 'launch-escape-motor',
      mount: true as const,
      burns: 'solid-perchlorate' as const,
    })),
  ],
  eventRotations: [
    ...[0, 1].map((i) => ({
      event: 'escape-canards',
      node: `LES_Canard_${i}`,
      axis: [0, 0, 1] as [number, number, number],
      angle: ((i === 0 ? -1 : 1) * Math.PI) / 2,
      from: 0,
      to: 0.4,
    })),
    // Mission Report §11.7: one attached door initially stopped short of the other three.
    ...(
      [
        [0, 0, -1],
        [-1, 0, 0],
        [0, 0, 1],
        [1, 0, 0],
      ] as [number, number, number][]
    ).map((axis, i) => ({
      event: 'spacecraft-separation',
      node: `SLA_PetalSkin_${i}`,
      axis,
      angle: ((i === 3 ? 25 : 45) * Math.PI) / 180,
      from: -0.35,
      to: 0.65,
    })),
    {
      event: 'spacecraft-separation',
      node: 'SLA_PetalSkin_3',
      axis: [1, 0, 0],
      angle: (20 * Math.PI) / 180,
      from: 28 * 3600 + 20 * 60 - drop('spacecraft-separation', []).at,
      to: 28 * 3600 + 20 * 60 + 5 - drop('spacecraft-separation', []).at,
    },
  ],
  chutes: [
    ...[0, 180].map((azimuth) => ({
      on: 'Twin drogues',
      body: 'cm',
      at: 'ForwardCompartment',
      cut: 'ribbon' as const,
      diameter: doc(16.5 * FT, ELS),
      gores: estimated(24, 'Conical ribbon drogue reconstruction; gore count not established for CM-101'),
      lines: estimated(24 * FT, 'Drogue suspension lines reconstructed from canopy scale'),
      riser: estimated(3 * FT, 'Drogue bridle estimated from the canopy installation'),
      colours: {
        value: ['#e66c3e', '#f1eddd'],
        confidence: 'estimated' as const,
        source: 'Apollo Earth Landing System photographs; CM-101 pattern uncertain',
      },
      cluster: { azimuth, tilt: estimated(29, 'Estimated visual angle between the two inflating drogues') },
    })),
    ...[0, 120, 240].map((azimuth) => ({
      on: 'Three main parachutes',
      body: 'cm',
      at: 'ForwardCompartment',
      cut: 'ringsail' as const,
      diameter: assumed(83.5 * FT, ELS),
      gores: assumed(68, MAIN),
      lines: assumed(120 * FT, MAIN),
      riser: estimated(7 * FT, 'Main riser estimated from the Earth Landing System installation'),
      colours: {
        value: ['#ee713f', '#f5ecda'],
        confidence: 'assumed' as const,
        source: 'Smithsonian Apollo main ringsail NASM A19700201000, orange and white; arrangement from recovered-capsule photographs',
      },
      disconnect: estimated(4, 'Apollo 7 Mission Report §6, released as soon as possible after water contact; exact interval unknown'),
      cluster: { azimuth, tilt: estimated(20, 'Estimated visual spread of the three mains about the common bridle') },
    })),
  ],
  air: { shield: 'HeatShield', collar: 'SaturnFirstStage' },
  uprighting: UPRIGHTING,
};
