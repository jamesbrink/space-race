/**
 * The command and service modules' part of an Apollo flight's plan (sim/plan.ts), written from the record's
 * (csm-record.ts) whatever carried them up: the Saturn IB's (saturn-ib-plan.ts) and the Saturn V's to the Moon
 * (apollo-lunar-plan.ts) both put these beside their own stages. The modules' bodies and what each sheds (apollo_csm.py's
 * and command_module.py's stations, from the command module's heat shield up the stack), the spacecraft's parting from its
 * last stage, the service propulsion system and the service module's thrusters, each firing in its own attitude, the
 * modules' parting, the Earth landing system's canopies and events, the heat shield's radius. Every figure the flight has
 * its own of is in its record; nothing here names a flight.
 */
import { assumed, derived, estimated, type Measure } from '../../../../src/measure.ts';
import type {
  AttitudeDef,
  BodyDef,
  ChuteDef,
  Craft,
  EngineDef,
  EventDef,
  JointDef,
  TankDef,
  ThrusterSet,
} from '../../../../src/sim/plan.ts';
import type { ShedBody } from '../../../../src/types.ts';
import { cmAero } from './command-module-aero.ts';
import { smRcsSet } from './sm-rcs.ts';
import type { Burn, CsmRecord, ElsRecord, EntryRecord } from './csm-record.ts';
import { event } from './saturn-v-plan.ts';

const FT = 0.3048;
const IN = 0.0254;
const LBF = 4.448221615;

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
export function released(
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

/** The service module, the forward heat shield and the command module, in that order up the stack. */
export function csmBodies(csm: CsmRecord): BodyDef[] {
  return [
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
}

/**
 * The spacecraft let go of its last stage (`gone`: the stage's bodies, with what rides on it), the modules let go of each
 * other, and the forward heat shield.
 */
export function csmJoints(csm: CsmRecord, els: ElsRecord, gone: string[]): JointDef[] {
  return [
    { id: 'spacecraft-separation', label: 'CSM/S-IVB separation', gone, at: csm.separation.at, push: csm.separation.push },
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
}

/**
 * The service propulsion system and the service module's thrusters. The engine flies the coast's firings where the
 * record gives the last one's impulse (`CsmRecord.sps`: `deltaV`, a braking burn cut by its integrator; `flown`, one
 * solved for an end).
 */
export function csmEngines(csm: CsmRecord): EngineDef[] {
  const sps = csm.sps;
  return [
    {
      id: 'sps',
      body: 'sm',
      label: 'Service Propulsion System',
      count: 1,
      tanks: ['sps-propellant'],
      kind: 'liquid',
      thrust: { vacuum: sps.thrust },
      isp: { vacuum: sps.isp },
      starts: { count: sps.starts.value, ground: false, confidence: sps.starts.confidence, source: sps.starts.source },
      ...(sps.deltaV ? { flown: sps.deltaV, deltaV: sps.deltaV } : sps.flown ? { flown: sps.flown } : {}),
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
}

/** The service propulsion system's propellant. */
export const spsTank = (csm: CsmRecord): TankDef => ({
  id: 'sps-propellant',
  body: 'sm',
  label: 'SPS propellant',
  holds: 'propellant',
  load: csm.sps.load,
});

/**
 * The service module's thrusters as a hand turns the modules: at the controller's rate, and where the record gives the
 * attitude's figures (`CsmRecord.rcs`) its chambers as hardware, the craft alone a rigid body they turn (sm-rcs.ts).
 */
export const smManualRate = (csm: CsmRecord): ThrusterSet => ({
  id: 'sm-manual-rate',
  label: 'SM RCS proportional rate',
  body: 'sm',
  does: ['rotation'],
  mode: 'manual',
  rate: assumed(
    0.7,
    'Apollo Operations Handbook, Block II vol. 1 §2.3, stabilization and control, proportional rate table: LOW setting, all three axes',
  ),
  ...(csm.rcs ? smRcsSet(csm.rcs) : {}),
});

/** What the modules shed, as bodies of their own: the service module and the forward heat shield, from the command module's heat shield at `stackCm` m above the stack's base. */
export function csmSheds(csm: CsmRecord, stackCm: number): ShedBody[] {
  return [
    {
      ...released(
        'cm-sm-separation',
        'Service module',
        csm.modules.leaves,
        'Apollo CSM model stations from MIT R-547 and apollo_csm.py: XA706 to XA993 with forward fairing',
        [stackCm - 294 * IN, stackCm + 19 * IN, 78 * IN, stackCm - 1.8],
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
        [stackCm + 81.13 * IN, stackCm + 112.25 * IN, 36 * IN, stackCm + 94 * IN],
        [2.6, 3.1, 1.4],
      ),
      forward: true,
    },
  ];
}

/** The Earth landing system's twin drogues and three mains, on the command module. */
export function elsChutes(els: ElsRecord): ChuteDef[] {
  return [
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
  ];
}

/** The command module's heat shield, for what the air's heat does to it (sim/heating.ts). */
export const cmHeating: NonNullable<Craft['heating']> = {
  noseRadius: assumed(
    184.8 * IN,
    'Block II spherical aft heat shield profile as modeled from North American structural training drawings, shared with CM-101',
  ),
  starts: estimated(290, 'Initial shield temperature is unused for shock-gas proxy with no heated surfaces'),
  surfaces: [],
};

/** A firing in orbit: its ignition, in its attitude and held to the record's impulse, and its cutoff. */
export const burnEvents = (b: Burn): EventDef[] => [
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

/** The spacecraft let go of its last stage, by the clock. */
export const spacecraftSeparation = (csm: CsmRecord): EventDef =>
  event('spacecraft-separation', 'CSM separates from S-IVB', csm.separation.at, [{ separate: 'spacecraft-separation' }]);

/** The modules let go of each other, the entry's attitude held from then. */
export const modulesParting = (csm: CsmRecord, entry: EntryRecord): EventDef =>
  event('cm-sm-separation', 'Command module separates from service module', csm.modules.at, [
    { separate: 'cm-sm-separation' },
    { attitude: entry.parting.id },
  ]);

/** The Earth landing system's events: the forward heat shield let go below its height once the modules have parted, the drogues a wait after, the mains below theirs. */
export function elsEvents(els: ElsRecord): EventDef[] {
  return [
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
  ];
}
