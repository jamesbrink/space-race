/**
 * What a Saturn V flight's run carries off the pad and what it sheds on the way (types.ts `Flight.flies`), by the nodes
 * saturn_v.py and launch_escape.py name: the S-IC with its engines, the S-II's aft interstage, the escape tower and its
 * boost cover, the S-II with its engines and the S-IVB's interstage, each let go by its plan's joint
 * (saturn-v-plan.ts), with what a stage carried as a node of its own where this vehicle had it (the S-IC's retrorocket
 * fairings from SA-510, two pairs on it and four after; the S-II centre engine's pogo accumulator from SA-509); and each
 * engine's fire, under its own bell, burning while the run has its plan's engine burn.
 */
import type { Flight } from '../../../../src/types.ts';
import type { FlightPlan } from '../../../../src/sim/plan.ts';

const IN = 0.0254;
/** The F-1's exit, 11 ft 7 in across (saturn_v.py `F1_EXIT_RADIUS`), and the J-2's (Apollo 7's fires: flown.ts). */
const F1_EXIT = ((11 * 12 + 7) / 2) * IN;
const J2_EXIT = 38.5 * IN;
/** The service propulsion engine's exit, 94.5 in across (apollo_csm.py; the Saturn IB's fires: saturn-ib-flies.ts). */
const SPS_EXIT = 47.25 * IN;

/**
 * `carried`: the nodes of the launch vehicle's own parts list (its `launcher`). A node a stage carried on some vehicles
 * and not on others leaves with its stage only where this one's list has it, so no drop names a node its model lacks
 * (tests/flights.test.mjs holds every flight to that).
 */
export function saturnVFlies(plan: FlightPlan, carried: readonly string[], model = 'vehicle'): NonNullable<Flight['flies']> {
  const had = (names: string[]) => names.filter((name) => carried.includes(name));
  const joints = plan.craft[0]!.joints;
  // (a plan flown on past the injection: the spacecraft parts from the S-IVB)
  const lunar = joints.some((j) => j.id === 'spacecraft-separation');
  const drop = (on: string, nodes: string[]) => {
    const at = joints.find((j) => j.id === on)?.at;
    if (!at) throw new Error(`the Saturn V's plan has no instant for its joint '${on}'`);
    return { on, at: at.value, nodes };
  };
  return {
    model,
    drops: [
      drop('sic-separation', [
        'SaturnFirstStage',
        'FirstStageEngines',
        'FirstStageTankStructure',
        ...had(['A', 'B', 'C', 'D'].map((fin) => `FirstStageRetros${fin}`)),
      ]),
      drop('sii-skirt', ['LowerInterstage']),
      drop('les-jettison', ['LaunchEscape', 'BoostCover']),
      drop('sii-separation', [
        'SaturnSecondStage',
        'SecondStageEngines',
        'SecondStageTankStructure',
        'SaturnInterstage',
        ...had(['PogoAccumulator']),
      ]),
      ...(lunar
        ? [
            drop('spacecraft-separation', [
              'SaturnThirdStage',
              'ThirdStageTankStructure',
              'ThirdStageEngine',
              'InstrumentUnit',
              'InstrumentUnitEquipment',
              'SpacecraftAdapter',
              ...(plan.craft[0]!.bodies.find((b) => b.id === 'payload')?.nodes ?? []),
            ]),
            drop('cm-sm-separation', [
              'ServiceModule',
              'ServiceSumpTanks',
              'ServicePower',
              'ServiceHelium',
              'ReactionControl',
              'ServiceEngine',
              'HighGainAntenna',
            ]),
            drop('forward-shield-jettison', ['ForwardShield']),
          ]
        : []),
    ],
    fires: [
      // (saturn_v.py: the fifth of each cluster is its centre)
      ...[1, 2, 3, 4, 5].map((i) => ({
        node: `F1_Bell_${i}`,
        radius: F1_EXIT,
        on: i === 5 ? 'f1-centre' : 'f1-outboard',
        burns: 'kerosene-lox' as const,
      })),
      ...[1, 2, 3, 4, 5].map((i) => ({
        node: `SII_J2_${i}`,
        radius: J2_EXIT,
        on: i === 5 ? 'j2-centre' : 'j2-outboard',
        burns: 'hydrogen-lox' as const,
      })),
      { node: 'ThirdStageEngine', radius: J2_EXIT, on: 'sivb-j2', burns: 'hydrogen-lox' as const },
      { node: 'ThirdStageEngine', radius: J2_EXIT, on: 'sivb-tli', burns: 'hydrogen-lox' as const },
      ...(lunar ? [{ node: 'SPS_Bell', radius: SPS_EXIT, on: 'sps', burns: 'hydrazine-n2o4' as const }] : []),
    ],
    air: lunar ? { shield: 'HeatShield', collar: 'SaturnFirstStage' } : { collar: 'SaturnFirstStage' },
  };
}
