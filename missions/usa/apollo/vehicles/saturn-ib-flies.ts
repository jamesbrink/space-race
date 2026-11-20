/**
 * What a Saturn IB flight's run carries off the pad and what it sheds on the way (types.ts `Flight.flies`), by the nodes
 * saturn_ib.py, launch_escape.py and apollo_csm.py name: the S-IB with its interstage and engines, the escape tower and its
 * boost cover, the S-IVB with the instrument unit and the adapter, the service module and the forward heat shield, each let
 * go by its plan's joint (saturn-ib-plan.ts); and each engine's fire, under its own bell, burning while the run has its
 * plan's engine burn. What a flight adds of its own (the spent stage flown on as a target, the adapter's panels, the
 * parachutes' canopies, the uprighting) it puts beside these.
 */
import type { FlightPlan } from '../../../../src/sim/plan.ts';
import type { Flight } from '../../../../src/types.ts';

const IN = 0.0254;

export function saturnIBFlies(
  plan: FlightPlan,
  model = 'vehicle',
): Pick<NonNullable<Flight['flies']>, 'model' | 'drops' | 'fires' | 'air'> & { model: string } {
  const joints = plan.craft[0]!.joints;
  const drop = (on: string, nodes: string[]) => {
    const at = joints.find((j) => j.id === on)?.at;
    if (!at) throw new Error(`the Saturn IB's plan has no instant for its joint '${on}'`);
    return { on, at: at.value, nodes };
  };
  return {
    model,
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
      // (saturn_ib.py: the first four bells are the inboard engines)
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
    air: { shield: 'HeatShield', collar: 'SaturnFirstStage' },
  };
}
