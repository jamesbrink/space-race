/**
 * A Saturn IB flight's plan (sim/plan.ts), written from its record (saturn-ib-record.ts `SaturnIBRecord`, the flight's
 * orbital.ts): the S-IB's eight H-1s, the inboard four cut before the outboard; the S-IB let go and the S-IVB's J-2 lit in the
 * closed interstage; the escape tower jettisoned; the J-2 cut by its guidance on the orbit reached; the spacecraft parted
 * from the stage, which flies on as a craft of its own where the record makes it the target; the command and service
 * modules' firings in orbit, each in its own attitude and held to the record's impulse (`Burn`); the modules parted; the
 * entry as the record flies it; and the Earth landing system (the forward heat shield, the twin drogues, the three mains) to
 * the sea. The ascent is the stated law, as every flight's into orbit (sim/staged.ts).
 *
 * What is the vehicle's is here: the bodies and what each sheds (saturn_ib.py's stations), the engines' kinds and the
 * service module's thrusters, the parachutes' canopies, the heat shield's radius. Every figure the flight has its own of
 * is in its record; nothing here names a flight. A J-2 is the Saturn V's (saturn-v-plan.ts `j2`).
 */
import { assumed, derived, estimated, doc, type Measure } from '../../../../src/measure.ts';
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
import { cmAero } from './command-module-aero.ts';
import type { Burn, H1Figures, SaturnIBRecord } from './saturn-ib-record.ts';
import { event, j2 } from './saturn-v-plan.ts';

const FT = 0.3048;
const IN = 0.0254;
const LBF = 4.448221615;
/** Where the Saturn IB's figures for its own hardware are read (its fifth flight's evaluation, AS-205). */
const AS205 = 'Results of the Fifth Saturn IB Launch Vehicle Test Flight (MPR-SAT-FE-68-4)';

/** saturn_ib.py: the SM aft bulkhead (XA838) meets the top of the adapter, m above the S-IB's base. */
export const CSM_MATING_HEIGHT = (80.2 * 12 + 58.4 * 12 + 36 + 28 * 12) * IN;
/** The command module's heat shield, m above the S-IB's base. */
const STACK_CM = CSM_MATING_HEIGHT + 162 * IN;

/** The outside of the command and service modules as a convex body, m²: the command module's cone, the service module's barrel with its fairing, a frustum to the engine's exit, and the exit's disc. */
export const CSM_OUTSIDE = (() => {
  const [radius, exit] = [77 * IN, (94.5 / 2) * IN];
  const [barrel, extension] = [(155 + 26) * IN, 112 * IN];
  const cone = 406.25 * IN - barrel - extension;
  return (
    Math.PI * radius * Math.hypot(cone, radius) +
    2 * Math.PI * radius * barrel +
    Math.PI * (radius + exit) * Math.hypot(extension, radius - exit) +
    Math.PI * exit * exit
  );
})();

/**
 * An attitude for a firing in orbit: along the motion, turned toward the left by the angle of `left` to `forward` and
 * pitched down by that of `up` to the level, from the firing's components in the local horizontal (forward, left, up).
 */
export function localAim(id: string, label: string, [forward, left, up]: readonly [number, number, number], source: string): AttitudeDef {
  return {
    id,
    label,
    source,
    hold: {
      aim: 'velocity',
      sense: 1,
      yaw: derived((Math.atan2(left, forward) * 180) / Math.PI, source),
      below: derived((-Math.atan2(up, Math.hypot(forward, left)) * 180) / Math.PI, source),
      confidence: 'derived',
    },
  };
}

/** What leaves, as a body of its own (sim/shed.ts): its stretch of the stack, its radius, centre, and drag areas fore, aft and broadside. */
function released(
  on: string,
  name: string,
  mass: Measure,
  source: string,
  [aft, forward, radius, centre]: [number, number, number, number],
  [foreDrag, aftDrag, sideDrag]: [number, number, number],
): ShedBody {
  const from = derived(aft, source);
  const to = derived(forward, source);
  return {
    on,
    name,
    mass,
    from,
    to,
    radius: derived(radius, source),
    centre: estimated(centre, `${source}; approximate center after release`),
    gyration: {
      roll: estimated(radius * 0.78, `${source}; hollow shell approximation`),
      across: estimated(Math.hypot((forward - aft) / Math.sqrt(12), radius / Math.sqrt(2)), `${source}; hollow shell approximation`),
    },
    ahead: estimated(foreDrag, `${source}; approximate fore drag area`),
    astern: estimated(aftDrag, `${source}; approximate aft drag area`),
    side: { from, to, dragArea: estimated(sideDrag, `${source}; approximate broadside drag area`) },
  };
}

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

/** A firing in orbit: its ignition, in its attitude and held to the record's impulse, and its cutoff. */
const burnEvents = (b: Burn): EventDef[] => [
  event(b.id, b.label, b.on, [
    { attitude: b.aim.id },
    {
      ignite: b.engine,
      flown: b.flown,
      ...(b.firingTime ? { firingTime: b.firingTime } : {}),
      ...(b.massAtIgnition ? { massAtIgnition: b.massAtIgnition } : {}),
      ...(b.toward ? { toward: b.toward } : {}),
    },
  ]),
  event(`${b.id}-cutoff`, b.off.label, b.off.at, [{ cut: b.engine }]),
];

export function saturnIBPlan(o: SaturnIBRecord): FlightPlan {
  const { sib, sivb, les, csm, els } = o;
  const bodies: BodyDef[] = [
    { id: 'sib', label: 'S-IB, first stage and interstage', count: 1, mass: sib.mass, nodes: ['SaturnFirstStage'] },
    { id: 'sivb', label: 'S-IVB, instrument unit and adapter', count: 1, mass: sivb.mass, nodes: ['SaturnSecondStage'] },
    { id: 'les', label: 'Launch escape tower with boost cover', count: 1, mass: les.mass, nodes: ['LaunchEscape'] },
    { id: 'sm', label: 'Service module', count: 1, mass: csm.sm, nodes: ['ServiceModule'] },
    { id: 'forward-shield', label: 'Forward heat shield', count: 1, mass: csm.shield, nodes: ['ForwardShield'] },
    {
      id: 'cm',
      label: csm.cm.label,
      count: 1,
      mass: csm.cm.mass,
      nodes: ['CommandModule'],
      aero: { ...cmAero(), lift: csm.cm.lift, trim: csm.cm.trim },
    },
  ];
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
    { id: 'spacecraft-separation', label: 'CSM/S-IVB separation', gone: ['sivb'], at: csm.separation.at, push: csm.separation.push },
    {
      id: 'cm-sm-separation',
      label: 'Command/service module separation',
      gone: ['sm'],
      at: csm.modules.at,
      after: csm.modules.after,
      leaves: csm.modules.leaves,
    },
    {
      id: 'forward-shield-jettison',
      label: 'Forward heat shield jettison',
      gone: ['forward-shield'],
      at: els.shield.at,
      push: els.shield.push,
    },
  ];
  const engines: EngineDef[] = [
    h1('h1-inboard', 'Four inboard H-1 engines', sib.h1),
    h1('h1-outboard', 'Four outboard H-1 engines', sib.h1),
    les.escape,
    j2('sivb-j2', 'Rocketdyne J-2', 'sivb', 'sivb-propellant', 1, sivb.j2, sivb.j2.shift, {
      starts: { count: 1, ground: false, confidence: 'documented', source: sivb.j2.starts },
    }),
    {
      id: 'sps',
      body: 'sm',
      label: 'Service Propulsion System',
      count: 1,
      tanks: ['sps-propellant'],
      kind: 'liquid',
      thrust: { vacuum: csm.sps.thrust },
      isp: { vacuum: csm.sps.isp },
      starts: { count: csm.sps.starts.value, ground: false, confidence: csm.sps.starts.confidence, source: csm.sps.starts.source },
      ...(csm.sps.deltaV ? { flown: csm.sps.deltaV, deltaV: csm.sps.deltaV } : {}),
      burns: 'hydrazine-n2o4',
    },
    {
      id: 'sm-rcs',
      body: 'sm',
      label: 'Service module reaction control',
      count: 1,
      tanks: [],
      kind: 'liquid',
      thrust: { vacuum: assumed(2 * 100 * LBF, 'Apollo CSM News Reference, two 100-lbf SM thrusters on an axial translation axis') },
      starts: {
        count: 1000,
        ground: false,
        confidence: 'estimated',
        source: 'Pulse train represented as its average force; no relevant start limit in the flight record',
      },
      burns: 'hydrazine-n2o4',
    },
  ];
  const tanks: TankDef[] = [
    { id: 'sps-propellant', body: 'sm', label: 'SPS propellant', holds: 'propellant', load: csm.sps.load },
    { id: 'sib-propellant', body: 'sib', label: 'S-IB LOX/RP-1', holds: 'propellant', ...sib.propellant },
    { id: 'sivb-propellant', body: 'sivb', label: 'S-IVB LOX/LH₂', holds: 'propellant', ...sivb.propellant },
  ];
  const thrusters: ThrusterSet[] = [
    // What turns the stack going up: without it the live vehicle has no steering at all, and a flight taken over rose
    // straight up and was left behind by the turning Earth (until November 2026).
    { id: 'saturn-steering', label: 'Steering', body: 'sivb', does: ['rotation'], mode: 'automatic', authority: o.ascent.steering },
    {
      id: 'sm-manual-rate',
      label: 'SM RCS proportional rate',
      body: 'sm',
      does: ['rotation'],
      mode: 'manual',
      rate: assumed(
        0.7,
        'Apollo Operations Handbook, Block II vol. 1 §2.3, stabilization and control, proportional rate table: LOW setting, all three axes',
      ),
    },
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
    {
      ...released(
        'cm-sm-separation',
        'Service module',
        csm.modules.leaves,
        'Apollo CSM model stations from MIT R-547 and apollo_csm.py: XA706 to XA993 with forward fairing',
        [STACK_CM - 294 * IN, STACK_CM + 19 * IN, 78 * IN, STACK_CM - 1.8],
        [11, 12, 23],
      ),
      push: csm.modules.push,
    },
    {
      ...released(
        'forward-shield-jettison',
        'Forward heat shield',
        csm.shield,
        'Block II forward heat-shield stations 81.13–112.25 inches in command_module.py',
        [STACK_CM + 81.13 * IN, STACK_CM + 112.25 * IN, 36 * IN, STACK_CM + 94 * IN],
        [2.6, 3.1, 1.4],
      ),
      forward: true,
    },
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
    chutes: [
      {
        id: 'els-drogues',
        body: 'cm',
        label: 'Twin drogues',
        dragArea: estimated(
          0.55 * 2 * Math.PI * (8.25 * FT) ** 2,
          'Two 16.5 ft drogues, Apollo Earth Landing System; 0.55 effective coefficient for the ribbon canopies',
        ),
        fills: els.drogues.fills,
      },
      {
        id: 'els-mains',
        body: 'cm',
        label: 'Three main parachutes',
        instead: ['els-drogues'],
        dragArea: estimated(
          0.75 * 3 * Math.PI * (41.75 * FT) ** 2,
          'Three 83.5 ft ringsails, Apollo Earth Landing System; 0.75 effective coefficient for projected drag',
        ),
        fills: els.mains.fills,
      },
    ],
    limits: [],
    heating: {
      noseRadius: assumed(
        184.8 * IN,
        'Block II spherical aft heat shield profile as modeled from North American structural training drawings, shared with CM-101',
      ),
      starts: estimated(290, 'Initial shield temperature is unused for shock-gas proxy with no heated surfaces'),
      surfaces: [],
    },
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
    event('spacecraft-separation', 'CSM separates from S-IVB', csm.separation.at, [{ separate: 'spacecraft-separation' }]),
    ...o.burns.flatMap(burnEvents),
    event('cm-sm-separation', 'Command module separates from service module', csm.modules.at, [
      { separate: 'cm-sm-separation' },
      { attitude: o.entry.parting.id },
    ]),
    ...o.entry.events,
    event(
      'forward-shield-jettison',
      'Forward heat shield jettison',
      els.shield.at,
      [{ separate: 'forward-shield-jettison' }],
      [{ after: 'cm-sm-separation' }, { height: els.shield.height.value, going: 'down' }],
    ),
    event(
      'drogue-deployment',
      'Twin drogues deploy',
      els.drogues.at,
      [{ deploy: 'els-drogues' }],
      [{ after: 'forward-shield-jettison', wait: els.drogues.wait.value }],
    ),
    event(
      'main-deployment',
      'Three mains deploy',
      els.mains.at,
      [{ deploy: 'els-mains' }],
      [{ height: els.mains.height.value, going: 'down' }],
    ),
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
