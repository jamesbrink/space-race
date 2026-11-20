/**
 * What a Saturn V flight's run carries off the pad and what it sheds on the way (types.ts `Flight.flies`), by the nodes
 * saturn_v.py and launch_escape.py name: the S-IC with its engines, the S-II's aft interstage, the escape tower and its
 * boost cover, the S-II with its engines and the S-IVB's interstage, each let go by its plan's joint
 * (saturn-v-plan.ts); and each engine's fire, under its own bell, burning while the run has its plan's engine burn.
 */
import type { Flight } from '../../../../src/types.ts';
import type { FlightPlan } from '../../../../src/sim/plan.ts';

const IN = 0.0254;
/** The F-1's exit, 11 ft 7 in across (saturn_v.py `F1_EXIT_RADIUS`), and the J-2's (Apollo 7's fires: flown.ts). */
const F1_EXIT = ((11 * 12 + 7) / 2) * IN;
const J2_EXIT = 38.5 * IN;

export function saturnVFlies(plan: FlightPlan, model = 'vehicle'): NonNullable<Flight['flies']> {
  const joints = plan.craft[0]!.joints;
  const drop = (on: string, nodes: string[]) => {
    const at = joints.find((j) => j.id === on)?.at;
    if (!at) throw new Error(`the Saturn V's plan has no instant for its joint '${on}'`);
    return { on, at: at.value, nodes };
  };
  return {
    model,
    drops: [
      drop('sic-separation', ['SaturnFirstStage', 'FirstStageEngines', 'FirstStageTankStructure']),
      drop('sii-skirt', ['LowerInterstage']),
      drop('les-jettison', ['LaunchEscape', 'BoostCover']),
      drop('sii-separation', ['SaturnSecondStage', 'SecondStageEngines', 'SecondStageTankStructure', 'SaturnInterstage']),
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
    ],
    air: { collar: 'SaturnFirstStage' },
  };
}
