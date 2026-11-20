import type { Motor, Part, ViewDef } from '../../../../../src/types.ts';
import { doors, escapeParts, lift, part, rocket } from '../../../apollo/vehicles/stack-gallery.ts';
import { nominalStageMotors, skylabStages, stageViews } from '../../vehicles/skylab-ib.ts';

export const SA208_THRUST: Motor[] = nominalStageMotors.map((motor) => ({
  ...motor,
  confidence: 'assumed',
  note: `${motor.note} Nominal rating assumed for SA-208. MPR-SAT-FE-74-1, §§6–7, gives the measured stage performance.`,
}));

export const launcher: Part[] = [
  ...escapeParts.map((p) => ({ ...p, group: rocket })),
  {
    ...part(
      'SpacecraftAdapter',
      'SLA-24 spacecraft adapter',
      rocket,
      6,
      28,
      'Four upper panels enclosed the service engine of CSM-118. Their hinges stayed with the upper stage.',
      'The crew commanded separation after orbit insertion. The panels swung outward so the service module could withdraw from the adapter. The October flight readiness review pairs CSM-118 with SLA-24. The 45° travel and hinge station come from the SA-206 flight manual.',
    ),
    moves: [lift(6, 28), ...doors.filter((move) => move.kind === 'swing')],
  },
  part(
    'InstrumentUnit',
    'S-IU-207 instrument unit',
    rocket,
    7,
    24,
    'Instrument unit 207 guided SA-208 into orbit, then turned the spent stage for disposal in the Pacific.',
    'On the fourth revolution, the instrument unit held the J-2 nozzle facing along the flight path. Dumping the remaining propellants through it slowed the stage enough to bring it back into the atmosphere. The liquid oxygen dump lasted 475 seconds and the hydrogen dump 86 seconds.',
  ),
  part(
    'InstrumentUnitEquipment',
    'Guidance and instrument racks',
    rocket,
    7,
    24,
    'The stable platform, flight computer and telemetry rode in a three-foot ring beneath SLA-24.',
    'The flight computer received ground commands for the disposal sequence after CSM-118 departed. The cutaway uses the SA-205 layout for the equipment cases, platform and cooling plates. Their exact locations on unit 207 are approximate.',
    true,
  ),
  part(
    'FinFourAttachment',
    'Fin 4 · repaired outrigger and attachment',
    rocket,
    11,
    0,
    'Before launch, inspectors found a crack in the lower web of the upper outrigger beam at fin position four.',
    'Workers removed a piece one inch by three inches by three quarters of an inch and restored the channel with a spacer and splice plate. A second inspection found cracks at all eight fins. Each replacement fin flew with blocks around its rear-spar attachment bolts to carry load if the fitting cracked again. The isolated view shows both repairs at position four.',
    true,
    [
      ['Replacement fins', '8 of 8 · MPR-SAT-FE-74-1 §8.3.2'],
      ['Outrigger splice', 'Fin position 4 · figure 8-16'],
    ],
  ),
  ...skylabStages(208),
];
export const stackViews: ViewDef[] = [
  { id: 'escape-system', label: 'Launch escape system', nodes: escapeParts.map((p) => p.node) },
  { id: 'fin-repair', label: 'Fin 4 attachment', nodes: ['FinFourAttachment'], onSelect: true, isolate: true, from: [0.47, 0.34, -0.88] },
  ...stageViews,
];
