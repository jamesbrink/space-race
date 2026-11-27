import type { Motor, Move, Part, ViewDef } from '../../../../../src/types.ts';
import { nominalStageMotors, skylabStages, stageViews } from '../../../skylab/vehicles/skylab-ib.ts';
import { doors, escapeParts, lift, nodes, part, rocket } from '../../vehicles/stack-gallery.ts';

export const SA210_THRUST: Motor[] = nominalStageMotors.map((motor, i) => ({
  ...motor,
  confidence: i < 2 ? 'documented' : 'assumed',
  note: i < 2 ? 'Apollo–Soyuz press kit, p. 82. Nominal thrust per engine.' : `${motor.note} Applied to SA-210.`,
}));

const docking = 'Docking module';
const extraction: Move = { kind: 'slide', by: [0, 3.5, 0], from: 0.7, to: 0.95 };
const dmPart = (node: string, name: string, summary: string, detail: string, inside = false): Part => ({
  ...part(node, name, docking, 6, 31.5, summary, detail, inside),
  moves: [lift(6, 28), extraction],
});
export const dockingModuleParts: Part[] = [
  dmPart(
    'DockingModule',
    'DM-2 pressure vessel',
    'This airlock let people cross between cabins that used different pressures and gas mixtures.',
    'Its narrow forward tunnel matched Apollo’s probe and drogue. The welded cylinder widened to the Soyuz end, where a bolted bulkhead carried the compatible docking system. The flight report gives 3.15 m between interfaces and a 1.42 m internal diameter.',
  ),
  dmPart(
    'DockingModuleGasSupply',
    'Four external gas bottles',
    'Two oxygen bottles nearer Apollo and two nitrogen bottles nearer Soyuz supplied the airlock.',
    'The flight’s thermal blankets and angular covers enclosed the sphere pairs. Before a transfer the crew changed the airlock’s pressure and oxygen content, keeping the spacecraft atmospheres separated by pressure hatches. The vessel covers open in cutaway.',
  ),
  dmPart(
    'CompatibleDockingSystem',
    'DS-5 compatible docking assembly',
    'Either side could extend its guide ring to dock with the other.',
    'Three guides lined up the rings, three capture latches caught, and six attenuators absorbed approach energy. Retraction brought the structural rings and pressure seals together, and eight structural latches held the joint shut.',
    true,
  ),
  dmPart(
    'DockingModuleExperiments',
    'Airlock antennas and experiments',
    'The external equipment included three VHF antennas, an ultraviolet spectrometer and a Doppler tracking transmitter.',
    'The spectrometer looked across the gap between spacecraft. A retroreflector on Soyuz returned light to its receiver. The Doppler measurements tracked the docking module during the final separated flight.',
  ),
  dmPart(
    'DockingModuleInterior',
    'Hatches, controls and stowage',
    'Both hatches opened toward the airlock and had pressure equalisation valves.',
    'The systems bay housed life-support equipment and the bilingual controls. Communications equipment, masks and removable lockers occupied the gaps between them. The cutaway reconstructs the hardware from appendix A, figures A-5 and A-27.',
    true,
  ),
];

export const launcher: Part[] = [
  ...escapeParts.map((piece) => ({ ...piece, group: rocket })),
  {
    ...part(
      'SpacecraftAdapter',
      'SLA-18 spacecraft adapter',
      rocket,
      6,
      28,
      'The adapter enclosed DM-2 and Apollo’s engine bell during launch.',
      'Four petals opened after Apollo separated in parking orbit. SA-210 then jettisoned the panels. Stafford turned Apollo around, docked with the module and pulled it away from the support truss.',
    ),
    moves: [lift(6, 28), ...doors],
  },
  part(
    'DockingModuleCradle',
    'Three-point launch cradle',
    rocket,
    6,
    28,
    'A truss held DM-2 inside SLA-18, with the Apollo tunnel pointing toward the service module.',
    'The release fittings stayed behind when the crew extracted the airlock. The truss geometry follows the press kit’s launch configuration diagram. The bars and joints are reconstructed.',
  ),
  part(
    'InstrumentUnit',
    'S-IU-210 instrument unit',
    rocket,
    7,
    24,
    'The ring atop S-IVB-210 guided the stack until the spacecraft reached parking orbit.',
    'Its guidance platform and digital computer commanded the launch sequence, steering and engine cutoff. The prime-vehicle configuration in the NASA technical data book identifies S-IU-210.',
  ),
  part(
    'InstrumentUnitEquipment',
    'Guidance and instrument racks',
    rocket,
    7,
    24,
    'The flight computer, navigation platform and telemetry shared a three-foot-high ring.',
    'The cutaway uses the published SA-206 and SA-205 arrangements. Individual racks, lines and exact clocking on S-IU-210 are approximate.',
    true,
  ),
  ...skylabStages(210),
];
export const stackViews: ViewDef[] = [
  { id: 'docking-module', label: 'DM-2 airlock', nodes: nodes(dockingModuleParts), isolate: true, from: [1, -0.15, 0.53] },
  { id: 'airlock', label: 'Airlock controls', nodes: ['DockingModuleInterior'], isolate: true, onSelect: true, from: [0.9, -0.12, -0.32] },
  {
    id: 'docking-system',
    label: 'Soyuz docking assembly',
    nodes: ['CompatibleDockingSystem'],
    isolate: true,
    onSelect: true,
    from: [0.7, -0.8, 0.5],
  },
  { id: 'dm-support', label: 'DM-2 launch cradle', nodes: ['DockingModuleCradle'], isolate: true, onSelect: true, from: [0.7, 0.6, 0.45] },
  { id: 'escape-system', label: 'Launch escape system', nodes: escapeParts.map((p) => p.node) },
  ...stageViews,
];
