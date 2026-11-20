import type { Part, ViewDef } from '../../../../../src/types.ts';
import { doors, escapeParts, lift, part, rocket } from '../../../apollo/vehicles/stack-gallery.ts';

import { nominalStageMotors, skylabStages, stageViews } from '../../vehicles/skylab-ib.ts';

export const SA206_THRUST = nominalStageMotors;

export const launcher: Part[] = [
  ...escapeParts.map((p) => ({ ...p, group: rocket })),
  {
    ...part(
      'SpacecraftAdapter',
      'SLA-23 spacecraft adapter',
      rocket,
      6,
      28,
      'The tapered shell carried the spacecraft above the instrument unit and surrounded the service engine.',
      'Four upper panels opened about hinges at station 1781.309 inches. The SA-206 flight manual describes a 45° opening for spacecraft separation. The short lower panels remained with the instrument unit. The adapter held no lunar module.',
    ),
    moves: [lift(6, 28), ...doors.filter((m) => m.kind === 'swing')],
  },
  part(
    'InstrumentUnit',
    'IU-206 instrument unit',
    rocket,
    7,
    24,
    'This three-foot-high ring guided both stages and later turned the spent stage for a coatings experiment.',
    'The unit stood between stations 1662.859 and 1698.859 inches. It commanded the roll that brought the experiment toward the Sun after the crew departed.',
  ),
  part(
    'InstrumentUnitEquipment',
    'Guidance and instrument racks',
    rocket,
    7,
    24,
    'An inertial platform and computer rode inside the upper ring.',
    'The cutaway shows electronics cases on cooled plates, the stable platform and its air supply. Their positions use the earlier SA-205 layout as a guide. The SA-206 manual records changes that included redundant coolant pumps and backup guidance from the spacecraft.',
    true,
  ),
  ...[1, 2].map(
    (p): Part => ({
      ...part(
        `M415SensorPanel${p}`,
        `M415 panel ${p} · ${p === 1 ? 'peripheral' : 'direct'} exposure`,
        rocket,
        7,
        24,
        'Two instrumented panels measured how thermal-control coatings weathered launch and orbit.',
        'Each panel carried four rows of three sensors. One row on each was exposed before launch. The others had covers that came off in sequence before retrofire, before tower jettison and after spacecraft separation. The panels sat about 51° apart so they received different exposures to the retro plumes. The slider lifts the covers for inspection.',
      ),
      moves: [
        lift(7, 24),
        ...[1, 2, 3].map((row) => ({
          kind: 'slide' as const,
          node: `M415_Cover${p}_${row}`,
          by: [0.12 + row * 0.04, 0, 0.44] as [number, number, number],
          from: 0.7 + (row - 1) * 0.06,
          to: 0.86 + (row - 1) * 0.06,
        })),
      ],
    }),
  ),
  ...skylabStages(206),
];

export const stackViews: ViewDef[] = [
  { id: 'escape-system', label: 'Launch escape system', nodes: escapeParts.map((p) => p.node) },
  ...[1, 2].map(
    (i): ViewDef => ({
      id: i === 1 ? 'm415' : 'm415-direct',
      label: `M415 panel ${i}`,
      nodes: [`M415SensorPanel${i}`],
      onSelect: true,
      isolate: true,
      from: i === 1 ? [0.63, 0.1, 0.78] : [1, 0.1, 0.02],
    }),
  ),
  ...stageViews,
];
