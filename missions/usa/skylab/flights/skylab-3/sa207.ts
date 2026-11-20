import type { Motor, Part, ViewDef } from '../../../../../src/types.ts';
import { doors, escapeParts, lift, part, rocket } from '../../../apollo/vehicles/stack-gallery.ts';
import { nominalStageMotors, skylabStages, stageViews } from '../../vehicles/skylab-ib.ts';

export const SA207_THRUST: Motor[] = nominalStageMotors.map((motor) => ({
  ...motor,
  confidence: 'assumed',
  note: `${motor.note} Shared nominal rating used for SA-207. Its measured propulsion performance is in MPR-SAT-FE-73-5, §§6 and 7.`,
}));

export const launcher: Part[] = [
  ...escapeParts.map((p) => ({ ...p, group: rocket })),
  {
    ...part(
      'SpacecraftAdapter',
      'SLA-25 spacecraft adapter',
      rocket,
      6,
      28,
      'Four hinged upper panels carried CSM-117 above the instrument unit and enclosed the service engine.',
      'At separation the adapter remained on the spent stage. The open upper end let the X-ray instrument in the ring below look out into space. The model uses the shared Skylab adapter stations and 45° panel travel in the SA-206 flight manual.',
    ),
    moves: [lift(6, 28), ...doors.filter((move) => move.kind === 'swing')],
  },
  part(
    'InstrumentUnit',
    'S-IU-208 instrument unit',
    rocket,
    7,
    24,
    'SA-207 flew with instrument unit 208. It guided the crew into orbit and then pointed an X-ray experiment.',
    'After CSM-117 pulled away, the computer commanded seven observation maneuvers. Sensors looking at stars provided a separate measure of where the instrument had pointed. The flight evaluation identifies this unit in the mission description and prelaunch milestones.',
  ),
  part(
    'InstrumentUnitEquipment',
    'Guidance and instrument racks',
    rocket,
    7,
    24,
    'This ring held the stable platform, guidance computer, telemetry and cooled equipment cases.',
    'The added experiment drew power through the 6D31 bus. Its recorder, detector and P-10 gas-supply panel occupied dedicated bays. The ordinary guidance-case layout is reconstructed from SA-205.',
    true,
  ),
  {
    ...part(
      'XRayExperiment',
      'S150 galactic X-ray detector',
      rocket,
      7,
      24,
      'A gas-flow proportional counter rode inside instrument-unit bay 24. Its launch cover protected a thin window made from Kimfoil.',
      'The spacecraft had to leave before the detector could swing into observing position. The slider tilts the instrument 62½° and folds its protective cover away to expose the collimator. Two star sensors supplied pointing data. The detailed shape follows photographs of the flight assembly.',
      true,
    ),
    moves: [
      lift(7, 24),
      { kind: 'swing', node: 'S150_DeploymentPivot', axis: [0, 0, -1], angle: (62.5 * Math.PI) / 180, from: 0.44, to: 0.78 },
      { kind: 'swing', node: 'S150_CoverPivot', axis: [0, 0, -1], angle: -Math.PI, from: 0.67, to: 1 },
    ],
  },
  part(
    'XRayGasSupply',
    'S150 P-10 supply',
    rocket,
    7,
    24,
    'A high-pressure sphere supplied the detector with a mixture of ninety percent argon and ten percent methane.',
    'Regulators replenished gas lost through the thin window. When the counter pressure fell below twelve pounds per square inch absolute, its high voltage switched off. The flight returned 110 minutes of X-ray data out of 265 planned.',
    true,
  ),
  part(
    'XRayRecorder',
    'S150 storage and playback',
    rocket,
    7,
    24,
    'Five electronics packages in bay 23 stored observations while the stage was out of range of a tracking station.',
    'The tape retained 5,400 seconds. When contact at Goldstone ended during the second playback, some of the missing data remained on the tape and reached the next station. Relative box outlines follow the contractor’s photograph of the flight panel.',
    true,
  ),
  ...skylabStages(207),
];
export const stackViews: ViewDef[] = [
  { id: 'escape-system', label: 'Launch escape system', nodes: escapeParts.map((p) => p.node) },
  { id: 's150', label: 'S150 X-ray detector', nodes: ['XRayExperiment'], onSelect: true, isolate: true, from: [0.65, 0.42, -0.65] },
  { id: 's150-gas', label: 'P-10 gas supply', nodes: ['XRayGasSupply'], onSelect: true, isolate: true, from: [-0.26, 0.2, 0.97] },
  { id: 's150-recorder', label: 'Storage and playback', nodes: ['XRayRecorder'], onSelect: true, isolate: true, from: [0.85, 0.2, -0.5] },
  ...stageViews,
];
