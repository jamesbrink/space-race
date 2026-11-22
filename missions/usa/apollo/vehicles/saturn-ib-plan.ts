/**
 * A Saturn IB flight's plan (sim/plan.ts), written from its record (saturn-ib-record.ts `SaturnIBRecord`, the flight's
 * orbital.ts): the S-IB's eight H-1s, the inboard four cut before the outboard; the S-IB let go and the S-IVB's J-2 lit in the
 * closed interstage; the escape tower jettisoned; the J-2 cut by its guidance on the orbit reached; the spacecraft parted
 * from the stage, which flies on as a craft of its own where the record makes it the target; the command and service
 * modules' firings in orbit, each in its own attitude and held to the record's impulse (`Burn`); the modules parted; the
 * entry as the record flies it; and the Earth landing system (the forward heat shield, the twin drogues, the three mains) to
 * the sea. The ascent is the stated law, as every flight's into orbit (sim/staged.ts).
 *
 * What is the vehicle's is here: the stages and what each sheds (saturn_ib.py's stations), the engines' kinds. The
 * command and service modules' part is every Apollo launch vehicle's (csm-plan.ts). Every figure the flight has its own of
 * is in its record; nothing here names a flight. A J-2 is the Saturn V's (saturn-v-plan.ts `j2`).
 */
import { derived, doc } from '../../../../src/measure.ts';
import type {
  AttitudeDef,
  BodyDef,
  Craft,
  EngineDef,
  EventDef,
  FlightPlan,
  JointDef,
  TankDef,
  ThrusterSet,
} from '../../../../src/sim/plan.ts';
import type { ShedBody } from '../../../../src/types.ts';
import {
  burnEvents,
  cmHeating,
  csmBodies,
  csmEngines,
  csmJoints,
  csmSheds,
  elsChutes,
  elsEvents,
  modulesParting,
  released,
  smManualRate,
  spacecraftSeparation,
  spsTank,
} from './csm-plan.ts';
import type { H1Figures, SaturnIBRecord } from './saturn-ib-record.ts';
import { event, j2 } from './saturn-v-plan.ts';

const FT = 0.3048;
const IN = 0.0254;
/** Where the Saturn IB's figures for its own hardware are read (its fifth flight's evaluation, AS-205). */
const AS205 = 'Results of the Fifth Saturn IB Launch Vehicle Test Flight (MPR-SAT-FE-68-4)';

/** saturn_ib.py: the SM aft bulkhead (XA838) meets the top of the adapter, m above the S-IB's base. */
export const CSM_MATING_HEIGHT = (80.2 * 12 + 58.4 * 12 + 36 + 28 * 12) * IN;
/** The command module's heat shield, m above the S-IB's base. */
const STACK_CM = CSM_MATING_HEIGHT + 162 * IN;

/** Four of the S-IB's H-1s, as the record has one. */
const h1 = (id: string, label: string, f: H1Figures): EngineDef => ({
  id,
  label,
  body: 'sib',
  count: 4,
  tanks: ['sib-propellant'],
  kind: 'liquid',
  thrust: f.thrust,
  isp: f.isp,
  starts: { count: 1, ground: true, confidence: 'documented', source: `${AS205}, §8` },
  burns: 'kerosene-lox',
});

export function saturnIBPlan(o: SaturnIBRecord): FlightPlan {
  const { sib, sivb, les, csm, els } = o;
  const bodies: BodyDef[] = [
    { id: 'sib', label: 'S-IB, first stage and interstage', count: 1, mass: sib.mass, nodes: ['SaturnFirstStage'] },
    { id: 'sivb', label: 'S-IVB, instrument unit and adapter', count: 1, mass: sivb.mass, nodes: ['SaturnSecondStage'] },
    { id: 'les', label: 'Launch escape tower with boost cover', count: 1, mass: les.mass, nodes: ['LaunchEscape'] },
    ...csmBodies(csm),
  ];
  const [separation, ...modules] = csmJoints(csm, els, ['sivb']);
  const joints: JointDef[] = [
    {
      id: 'sib-separation',
      label: 'S-IB/S-IVB separation',
      gone: ['sib'],
      at: sib.separation,
      leaves: sib.spent,
      push: sib.push,
      // (the S-IVB's J-2 stands in the closed interstage over the S-IB, which was not hot-staged)
      closed: { engines: ['sivb-j2'] },
    },
    { id: 'les-jettison', label: 'Launch escape tower jettison', gone: ['les'], at: les.at },
    separation!,
    ...modules,
  ];
  const engines: EngineDef[] = [
    h1('h1-inboard', 'Four inboard H-1 engines', sib.h1),
    h1('h1-outboard', 'Four outboard H-1 engines', sib.h1),
    les.escape,
    j2('sivb-j2', 'Rocketdyne J-2', 'sivb', 'sivb-propellant', 1, sivb.j2, sivb.j2.shift, {
      starts: { count: 1, ground: false, confidence: 'documented', source: sivb.j2.starts },
    }),
    ...csmEngines(csm),
  ];
  const tanks: TankDef[] = [
    spsTank(csm),
    { id: 'sib-propellant', body: 'sib', label: 'S-IB LOX/RP-1', holds: 'propellant', ...sib.propellant },
    { id: 'sivb-propellant', body: 'sivb', label: 'S-IVB LOX/LH₂', holds: 'propellant', ...sivb.propellant },
  ];
  const thrusters: ThrusterSet[] = [
    // What turns the stack going up: without it the live vehicle has no steering at all, and a flight taken over rose
    // straight up and was left behind by the turning Earth (until November 2026).
    { id: 'saturn-steering', label: 'Steering', body: 'sivb', does: ['rotation'], mode: 'automatic', authority: o.ascent.steering },
    smManualRate(csm),
  ];
  const sheds: ShedBody[] = [
    released(
      'sib-separation',
      'S-IB and interstage',
      sib.spent,
      'Saturn IB stage envelope in saturn_ib.py and MPR-SAT-FE-68-4, Figure A-1',
      [0, 1187 * IN, 130 * IN, 8.5],
      [35, 38, 180],
    ),
    {
      ...released(
        'les-jettison',
        'Escape tower and boost cover',
        les.mass,
        'Launch escape system envelope in launch_escape.py and Apollo 7 press kit Figure 25a',
        [STACK_CM, 224 * FT, 78 * IN, 64],
        [12, 12, 20],
      ),
      forward: true,
      motors: [{ name: 'Tower jettison motor', thrust: les.motor.thrust, burn: les.motor.burn }],
    },
    // (the stage the spacecraft leaves, as a body of its own: unless the record flies it on as the target its burns are made on)
    ...(o.target && 'joint' in o.target && o.target.joint === 'spacecraft-separation'
      ? []
      : [
          released(
            'spacecraft-separation',
            'S-IVB, instrument unit and adapter',
            derived(
              sivb.mass.value - (sivb.propellant.usable ?? sivb.propellant.load).value,
              `${sivb.mass.source}; less the usable propellant (${(sivb.propellant.usable ?? sivb.propellant.load).source})`,
            ),
            'S-IVB, instrument unit and adapter envelope in saturn_ib.py: 260 in across, from the S-IB’s top to the spacecraft',
            [80.2 * FT, CSM_MATING_HEIGHT, 130 * IN, 35],
            [34, 34, 180],
          ),
        ]),
    ...csmSheds(csm, STACK_CM),
  ];
  const craft: Craft = {
    id: 'saturn-ib',
    label: o.label,
    mass: o.liftoff,
    sheds,
    ...(sivb.vents ? { vents: sivb.vents } : {}),
    bodies,
    joints,
    engines,
    tanks,
    thrusters,
    chutes: elsChutes(els),
    limits: [],
    heating: cmHeating,
    drag: o.ascent.drag,
    rarefied: o.rarefied,
    lands: { on: 'sea', ship: 'the command module' },
  };
  const attitude: AttitudeDef[] = [
    { id: 'saturn-steering', label: 'Saturn IB ascent', source: o.ascent.source, hold: { law: o.ascent.guidance } },
    ...o.burns.map((b) => b.aim),
    o.entry.parting,
    ...o.entry.attitudes,
  ];
  const events: EventDef[] = [
    event('liftoff', 'Liftoff', doc(0, 'range zero'), [{ ignite: 'h1-inboard' }, { ignite: 'h1-outboard' }]),
    event('sib-inboard-cutoff', 'Inboard H-1 engines cut off', sib.inboardCut, [{ cut: 'h1-inboard' }]),
    event('sib-outboard-cutoff', 'Outboard H-1 engines cut off', sib.outboardCut, [{ cut: 'h1-outboard' }]),
    event('sib-separation', 'S-IB separates', sib.separation, [{ separate: 'sib-separation' }]),
    event('sivb-ignition', 'J-2 ignition', sivb.ignition, [{ ignite: 'sivb-j2' }]),
    event('les-jettison', 'Escape tower and boost cover jettison', les.at, [{ separate: 'les-jettison' }]),
    // (the guidance's own cutoff: flown where the orbit reached has the record's period; the recorded instant is held as a figure)
    event('sivb-cutoff', 'J-2 cutoff', sivb.cutoff, [{ cut: 'sivb-j2' }], [{ orbit: 'published' }]),
    spacecraftSeparation(csm),
    ...o.burns.flatMap(burnEvents),
    modulesParting(csm, o.entry),
    ...o.entry.events,
    ...elsEvents(els),
  ].sort((a, b) => a.at!.value - b.at!.value);
  return {
    kind: 'orbital',
    craft: [craft],
    attitude,
    ...(o.target ? { target: o.target } : {}),
    events,
    checks: o.checks,
    record: { aborts: o.aborts, ...o.mission, orbit: o.orbit, coastFixes: o.coastFixes, marks: o.marks },
  };
}
