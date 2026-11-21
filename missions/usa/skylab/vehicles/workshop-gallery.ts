import type { DockingPort, ModelDef, Part, ViewDef } from '../../../../src/types.ts';

/**
 * The Skylab Saturn Workshop as each crew found it when they docked (workshop.py, workshop.md): visit 2 on 25 May 1973
 * with the meteoroid shield gone, wing 2 lost and wing 1 held by a strap; visit 3 on 28 July 1973 under the parasol with
 * wing 1 out; visit 4 on 16 November 1973 with the twin-pole sail over the parasol. An exhibit of the flight that went
 * to it, not a flight of its own.
 */
export type Visit = 2 | 3 | 4;

const workshop = 'Orbital workshop';
const passage = 'Airlock and docking adapter';
const observatory = 'Solar observatory';
const repairs = 'Damage and repairs';

const port = (frame: string): DockingPort => ({ system: 'apollo-probe-and-drogue', role: 'drogue', part: 'DockingAdapter', frame });

export function workshopModel(visit: Visit): ModelDef {
  const first = visit === 2;
  const parts: Part[] = [];
  const views: ViewDef[] = [];
  function part(
    node: string,
    name: string,
    group: string,
    summary: string,
    detail: string,
    facts: Part['facts'],
    explode: Part['explode'],
    order: number,
  ) {
    parts.push({ node, name, group, summary, detail, facts, explode, order });
  }
  part(
    'OrbitalWorkshop',
    'Orbital workshop',
    workshop,
    'A Saturn V third stage’s hydrogen tank, fitted out on the ground as two floors of rooms and a tall working space.',
    first
      ? 'This is the wall Conrad’s crew saw on their fly-around: bare goldized Kapton where a meteoroid shield should have stood five inches off it. The shield tore away 63 seconds into the launch, and inside the workshop the air reached about 130 °F. The wardroom window looks out on the side away from the Sun.'
      : visit === 3
        ? 'The bare gold wall lies in the parasol’s shade. The first crew pushed the parasol out through the scientific airlock on the Sun side, and the workshop cooled to a habitable temperature within days.'
        : 'Two sunshades now cover the bare gold wall: the first crew’s parasol and, over it, the sail the second crew rigged from the solar observatory on a spacewalk.',
    [
      ['Length', '48.1 ft · TM X-64814, fig. 2-1'],
      ['Diameter', '21.7 ft over the skirts, 260 in at the tank · MSC 04727, §2.0.10'],
      ['Working volume', '10,426 cu ft · TM X-64814, fig. 2-1'],
    ],
    [0, 0, 0],
    4,
  );
  part(
    'InstrumentUnit',
    'Instrument unit',
    workshop,
    'The ring of guidance computers that flew the launch and deployed the station.',
    'It shed the payload shroud, swung out the solar observatory and opened the solar wings, all within the 7.5 hours its batteries lasted. After that it was only a piece of structure between the workshop and the airlock shroud.',
    [['Size', '21.6 ft across, 3 ft high · MSC 04727, §2.0.2']],
    [0, 1, 0],
    3,
  );
  part(
    'FixedAirlockShroud',
    'Fixed airlock shroud',
    passage,
    'The open ring that carries the airlock, the solar observatory’s mount and six oxygen tanks.',
    'Its six oxygen tanks held 5,611 pounds of oxygen for all three crews, launched with the workshop. The two discone antenna booms swing out from its forward ring on the side away from the Sun.',
    [
      ['Size', '260 in across, about 80 in long · MSC 04727, §2.0.9.3'],
      ['Oxygen tanks', '6, each 45 in across and 90 in long · MSC 04727, §2.4.4'],
      ['Discone booms', '36 ft 8 in deployed · MSC 04727, §2.0.4'],
    ],
    [0, 2, 0],
    3,
  );
  part(
    'AirlockModule',
    'Airlock module',
    passage,
    'A tunnel with a hatch at each end of its middle, so a crew could go outside without emptying the station.',
    'The spacewalks to free the wing, to rig the sail and to change the telescope film began at the hatch in the lock compartment. The nitrogen spheres on the trusses supplied the station’s air with the shroud’s oxygen.',
    [
      ['Tunnel', '55 in across, 153 in long · MSC 04727, §2.0.8.3.2'],
      ['Lock compartment', '80 in long, 154 cu ft · MSC 04727, §2.0.8.3.2'],
      ['Nitrogen', '6 titanium spheres, 40 in across · MSC 04727, §2.4.4'],
    ],
    [0, 4, 0],
    2,
  );
  part(
    'DockingAdapter',
    'Multiple docking adapter',
    passage,
    'Two docking ports, the solar observatory’s control panel and the Earth-observation cameras.',
    'The command and service module docked at the port on the end. The second port, on the side facing away from the Sun, was the backup and rescue port. The cameras and antennas of the Earth resources experiments look out from that side.',
    [
      ['Size', '17.3 ft long, 10 ft across, 1,140 cu ft · TM X-64814, fig. 2-1'],
      ['Ports', 'Axial (5) and radial (3) on −Z · MSC 04727, §2.0.7'],
      ['Radial port', '103 in forward of its aft end · MSC 04727, §2.0.7.3'],
    ],
    [0, 7, 0],
    2,
  );
  part(
    'TelescopeMount',
    'Apollo Telescope Mount',
    observatory,
    'Eight solar telescopes in a canister on gimbals, pointed at the Sun from a rack beside the docking adapter.',
    'It rode to orbit on top of the stack and swung 90 degrees aside on its deployment assembly, clearing the end port for the crews. Astronauts walked out to its Sun end on spacewalks to change the film. The control moment gyroscopes on its rack held the whole station’s attitude.',
    [
      ['Rack', 'About 11 ft across and 12 ft high · MSC 04727, §2.0.5.2'],
      ['Sun shield', '14 ft across · MSC 04727, §2.0.5.2'],
      ['Canister', 'About 7 ft across, 10 ft long · MSC 04727, §2.0.5.3'],
    ],
    [0, 4, -7],
    1,
  );
  part(
    'TelescopeSolarArray',
    'Solar observatory wings',
    observatory,
    'Four wings set at 45 degrees round the Sun end gave the observatory its own power.',
    'They were the station’s only power until the first crew freed the workshop wing. Each wing folded for launch and unfolded once the observatory had swung out.',
    [
      ['Wing', '521 × 101.5 in, four panels and a half panel · TM X-64814, fig. 7-20'],
      ['Span', 'About 100 ft · MSC 04727, §2.0.5.4'],
    ],
    [0, 4, -7],
    1,
  );
  part(
    'DeploymentAssembly',
    'Deployment assembly',
    observatory,
    'The trusses that swung the solar observatory 90 degrees from the top of the stack to its working place.',
    'Motors reeled in cables against the trunnion springs, and the rotation took about three minutes. A latch then locked it. The trusses drawn show its form; their joints are estimated.',
    [['Rotation', '90 degrees in about 3 minutes · MSC 04727, §2.0.6.3']],
    [0, 2, -4],
    1,
  );
  part(
    'MeteoroidShieldRemnant',
    first ? 'Torn shield and strap' : 'Torn meteoroid shield',
    repairs,
    first
      ? 'A strip of the lost meteoroid shield lay over wing 1, and an aluminium strap from it held the wing’s beam almost shut.'
      : 'All that stayed of the meteoroid shield: its joint beside wing 1, torn from end to end.',
    first
      ? 'Weitz tried to pull the strap free with a pole from the command module’s open hatch on the day they arrived, and failed. On 7 June Conrad cut it on a spacewalk, then he and Kerwin hauled the beam out on a rope. The strap’s place and the strip’s extent are estimated from the fly-around photographs.'
      : 'The shield ripped apart at the joint beside wing 1 and pulled part of it across the wing’s beam fairing. The strap that held the beam was cut away on the first crew’s spacewalk of 7 June 1973. The strip’s extent is estimated.',
    [['Shield', '0.025-in aluminium, deployed 5 in off the wall · MSC 04727, §2.0.10.4.7']],
    [-1.5, 0, 0],
    1,
  );
  part(
    'WorkshopSolarWing',
    'Workshop solar wing 1',
    repairs,
    first
      ? 'The workshop’s one remaining wing, its beam held a few degrees open with the wing sections still folded inside.'
      : 'The workshop’s one remaining wing, freed by the first crew: three wing sections of ten panels unfolded from its beam.',
    first
      ? 'With the beam fairing held almost shut the workshop had little power of its own: the wing was about 10 percent deployed. The angle it was held at is estimated from photograph SL2-04-248.'
      : 'When the strap was cut the beam swung out about 20 degrees, then all the way once the crew broke its frozen damper. The wing sections took six hours in the Sun to unfold, and the workshop’s power rose from about 4,000 to 7,000 watts.',
    [
      ['Panels', '3 sections × 10 active panels, each 120 × 27 in · MSC 04727, §2.0.10.4.6'],
      ['Beam fairing', '4 ft wide, about 37 ft long · MSC 04727, §2.0.10.4.6'],
      ['Freed', '7 June 1973 · TM X-64814, §3.3'],
    ],
    [-5, 0, 0],
    1,
  );
  part(
    'LostSolarWing',
    'Where wing 2 was',
    repairs,
    'Only the forward fairing of the other wing remained.',
    'Torn shield wrapped round wing 2 and broke its tie-downs during the launch. The wing then swung out into the exhaust of the second stage’s retrorockets and tore free at its hinge 593.9 seconds after liftoff. The ragged hinge is estimated.',
    [['Lost', '593.9 s after the workshop’s launch · TM X-64814, §4.3.2']],
    [1.5, 0, 0],
    1,
  );
  if (visit >= 3)
    part(
      'Parasol',
      'Parasol sunshade',
      repairs,
      'A folding sunshade the first crew pushed out through a small airlock in the workshop’s wall.',
      'Engineers at Houston designed it to fit a canister built for an experiment that went out through the same airlock. Its four spring rods opened 21 feet out, and the crew then drew it back toward the wall. It never opened to its full rectangle, but the workshop cooled within days.',
      [
        ['Canopy', '24 × 22 ft · NASA photograph S73-26380'],
        ['Deployed', '26 May 1973, through the +Z scientific airlock · TM X-64814, §10.4'],
        ['Fabric', 'Orange rip-stop nylon on aluminized Mylar · TM X-64813, §2.2.3'],
      ],
      [0, 0, -4],
      0,
    );
  if (visit >= 4)
    part(
      'TwinPoleSail',
      'Twin-pole sail',
      repairs,
      'A second sunshade hung between two 55-foot poles from the solar observatory, over the parasol.',
      'Garriott and Lousma assembled the poles from eleven sections each on a spacewalk on 6 August 1973. They hoisted the sail along clothes lines and swung the whole frame down over the workshop. Where the poles met the sail is estimated from the workshop report’s drawing.',
      [
        ['Poles', '55 ft · TM X-64814, §3.2'],
        ['Sail', '22 ft 3 in across its far edge, 24 ft 5 in long · TM X-64813, fig. 2.2.3-43'],
        ['Deployed', '6 August 1973 · TM X-64814, §10.4'],
      ],
      [0, 0, -6],
      0,
    );
  function view(id: string, label: string, nodes: string[], from: NonNullable<ViewDef['from']>) {
    views.push({ id, label, nodes, from, isolate: nodes.length === 1, onSelect: nodes.length === 1 });
  }
  view('wing', first ? 'Jammed wing and strap' : 'Workshop wing', ['WorkshopSolarWing', 'MeteoroidShieldRemnant'], [-0.85, 0.25, -0.45]);
  view('observatory', 'Solar observatory', ['TelescopeMount', 'TelescopeSolarArray'], [0.2, 0.35, -1]);
  view('ports', 'Docking ports', ['DockingAdapter'], [-0.35, 0.35, 0.87]);
  view('airlock', 'Airlock and shroud', ['AirlockModule', 'FixedAirlockShroud'], [0.6, 0.45, -0.66]);
  view('radiator', 'Aft end', ['OrbitalWorkshop'], [0.5, -0.45, -0.75]);
  if (visit >= 3) view('parasol', 'Parasol', ['Parasol'], [0.3, 0.3, -1]);
  if (visit >= 4) view('sail', 'Twin-pole sail', ['TwinPoleSail', 'Parasol'], [0.35, 0.45, -1]);
  const day = { 2: '25 May 1973', 3: '28 July 1973', 4: '16 November 1973' }[visit];
  return {
    id: 'workshop',
    name: `Skylab as found · ${day}`,
    galleryCraft: 'Skylab workshop',
    url: `models/usa/skylab/skylab-${visit}/workshop.glb`,
    scale: '86 ft from the workshop’s aft end to the docking port · about 100 ft across the observatory’s wings',
    backdrop: 'studio',
    galleryFrom: [-0.62, 0.2, -0.75],
    slider: ['Assembled', 'Modules apart'],
    specGroups: [],
    motorNames: [],
    dockingPorts: [port('MDA_AxialDockingFrame'), port('MDA_RadialDockingFrame')],
    parts,
    views,
  };
}
