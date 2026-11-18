import { assumed, doc, estimated } from '../../../../../src/measure.ts';
import type { AbortMode, EngineDef } from '../../../../../src/sim/plan.ts';

const KIT = 'Apollo 7 press kit (68-168K), p. 24';
const LES = 'North American Apollo News Reference, Launch Escape Subsystem, pp. 137–140';
const GROUND_TEST = 'Apollo Spacecraft S-64-602, design reference (NTRS 19690017921), figures 107–108';
const FT = 0.3048;
const LB = 0.45359237;
const NMI = 1852;
const TRANSLATION = { engine: 'sm-rcs', duration: doc(20, KIT) };
const MASS = doc(
  16_528.0,
  'AS-205 Saturn IB Flight Evaluation, Table 6-I, CSM mass at first motion; consumables used during ascent are held constant',
);

export const escapeEngine: EngineDef = {
  id: 'launch-escape-motor',
  body: 'les',
  label: 'Launch escape motor',
  kind: 'solid',
  count: 1,
  tanks: [],
  starts: { count: 1, ground: true, confidence: 'assumed', source: LES },
  thrust: { vacuum: assumed(147_000 * 4.448221615, `${LES}, p. 140; mean pad thrust held at all altitudes for this model`) },
  burn: assumed(3.2, `${LES}, p. 140, nominal launch-escape motor burn`),
  burns: 'solid-perchlorate',
};

export const aborts: AbortMode[] = [
  {
    until: doc(166.5, 'Apollo 7 Mission Report, Table 2-I, launch-escape tower jettison'),
    does: 'Mode I: the escape rocket pulls the command module and tower clear. The tower and boost cover leave before the main parachutes.',
    escape: {
      tower: {
        engine: escapeEngine.id,
        cover: 'forward-shield-jettison',
        service: 'cm-sm-separation',
        stages: ['sib-separation', 'spacecraft-separation'],
        tower: 'les-jettison',
        propellant: assumed((4_700 * 2 * LB) / 3, `${LES}, p. 140, about two-thirds of 4,700 pounds`),
        dragArea: estimated(10, 'Projected command module and boost cover; single effective ballistic drag area'),
        pitch: {
          until: assumed(42, `${GROUND_TEST}, fig. 107, cutoff for the pitch motor`),
          angle: estimated(30, 'Equivalent initial seaward pitch for the low abort. Pitch torque and aerodynamic moment are simplified.'),
          takes: assumed(0.5, `${LES}, p. 139, pitch motor burn time`),
        },
        canards: assumed(11, `${LES}, p. 137, canards deployed after abort`),
        turn: {
          mach: assumed(3.5, `${GROUND_TEST}, fig. 108, high-altitude turnaround`),
          takes: estimated(3, 'Smooth trim change toward heat shield first once the canards can turn the assembly'),
        },
        jettison: {
          after: assumed(14, `${GROUND_TEST}, fig. 107, low-altitude jettison`),
          height: assumed(24_000 * FT, `${GROUND_TEST}, fig. 108, high-altitude jettison`),
        },
        coverAfter: {
          low: assumed(0.4, `${GROUND_TEST}, fig. 107`),
          high: assumed(4, `${GROUND_TEST}, fig. 108`),
        },
        mainsAfterCover: assumed(
          14,
          'Apollo Operations Handbook SC-012 §2.9, low-altitude barometric bypass sequence; assumed common logic',
        ),
      },
    },
  },
  {
    until: doc(9 * 60 + 33, `${KIT}, planned Mode II/III boundary`),
    does: 'Mode II: separate from S-IVB, translate away on the service-module jets for 20 seconds, then separate the command module for entry.',
    escape: { cut: true, separate: { entry: true, motor: TRANSLATION } },
  },
  {
    until: doc(9 * 60 + 53, `${KIT}, planned end of Mode III overlap`),
    does: 'Mode III: separate from S-IVB and use the SPS retrograde for direct entry toward the 3,200-nautical-mile recovery region.',
    escape: {
      cut: true,
      separate: {
        entry: true,
        service: { engine: 'sps', translation: TRANSLATION, mass: MASS, goal: { kind: 'recovery', target: doc(3200 * NMI, KIT) } },
      },
    },
  },
  {
    from: doc(9 * 60 + 27, `${KIT}, planned opening of the abort-to-orbit alternative`),
    until: doc(626.76, 'AS-205 Saturn IB Flight Evaluation, §1, achieved orbital insertion time'),
    does: 'Mode IV: separate and use the SPS to reach orbit while retaining enough propellant to return.',
    escape: {
      cut: true,
      separate: {
        service: {
          engine: 'sps',
          translation: TRANSLATION,
          mass: MASS,
          goal: {
            kind: 'orbit',
            target: assumed(123 * NMI, 'Apollo 7 press kit, p. 8, nominal parking-orbit perigee used here as the contingency target'),
          },
        },
      },
    },
  },
];
