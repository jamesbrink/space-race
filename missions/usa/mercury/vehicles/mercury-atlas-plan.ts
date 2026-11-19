/**
 * A Mercury-Atlas flight into orbit as the simulator flies it: its record (`MercuryAtlasRecord`, which the flight's
 * orbital.ts gives, every figure a Measure with its confidence and source) and the plan written from it
 * (`mercuryAtlasPlan`, src/sim/plan.ts). Only this module and the flight's orbital.ts read the record; the flight carries
 * the plan. The ids are this module's own, the hardware's names: nothing in src/ names one.
 *
 * The Atlas is a stage and a half: all five engines lit on the pad, drawing on the one tank; at booster engine cutoff the
 * two booster chambers and the skirt they hang in (the booster section) are let go, and the sustainer burns on from the
 * same tank until the ground's guidance has the speed it wants. So the plan has one tank, on the tank section, and two
 * engines that draw on it, one on the booster section (src/sim/staged.ts `Stage.shares`). The verniers are flown as part
 * of the sustainer (derived, below). The capsule in orbit is the ship: its retropack's three solid motors fired five
 * seconds apart are its coast's burn, flown as their whole impulse spread evenly from the first's lighting to the
 * third's burning out; the pack is let go at the instant the record has it go, and the capsule comes down on its heat
 * shield, its drogue and its main.
 */
import { derived, type Measure } from '../../../../src/measure.ts';
import { chuteEvent, type Guidance, type OrbitResults } from '../../../../src/sim/orbital.ts';
import type {
  AttitudeDef,
  BodyDef,
  ChuteDef,
  Craft,
  EngineDef,
  EventDef,
  FlightPlan,
  JointDef,
  Lands,
  Nozzle,
  PlanCheck,
  TankDef,
  ThrusterSet,
} from '../../../../src/sim/plan.ts';
import type { Confidence, Curve, Heating, ShedBody } from '../../../../src/types.ts';
import { BASE } from './mercury-atlas.ts';
import { IN, LANDING_SPEED, retropack } from './mercury-redstone.ts';

/** One engine of the Atlas as the record has it: one chamber's figures, `count` alike. */
export interface AtlasEngine {
  name: string;
  count: number;
  thrust: { seaLevel: Measure; vacuum: Measure };
  isp: { seaLevel: Measure; vacuum: Measure };
  nozzle?: Nozzle;
}

/** A check the record sets: SI, its tolerance set before anything was flown. `id` names a field of what the run gives. */
export interface RecordCheck {
  id: string;
  label: string;
  value: number;
  unit: string;
  tolerance: number;
  confidence: Confidence;
  source: string;
}

/** Something the record has at an instant, s from liftoff. */
export interface Instant {
  id: string;
  label: string;
  at: Measure;
  also?: string;
}

export interface MercuryAtlasRecord {
  /** Everything that left the pad, kg. */
  liftoffMass: Measure;
  atlas: {
    /** The booster section: what it weighs (empty: its engines draw on the tank above), its engines, and when they were cut and it was let go. */
    booster: { name: string; nodes: string[]; mass: Measure; engine: AtlasEngine; cutoff: Measure; separation: Measure };
    /** The tank section, fuelled and empty, the propellant it holds for all the engines, and the sustainer with its verniers. */
    tank: {
      name: string;
      nodes: string[];
      mass: Measure;
      dry: Measure;
      propellant: Measure;
      engine: AtlasEngine;
      /** Cut by the ground's guidance at this space-fixed speed, m/s; `cutoff` is the record's instant, held as a check. */
      velocity: Measure;
      cutoff: Measure;
    };
  };
  /** The escape tower: what it weighs, and when it was let go. */
  tower: { mass: Measure; separation: Measure };
  /** The spacecraft let go of the Atlas: when, how fast the posigrades pushed the two apart, and what flew on. */
  separation: { at: Measure; push: Measure; mass: Measure };
  ascent: {
    guidance: Guidance;
    drag: { until: Measure; area: Measure; curve: Curve }[];
    steering: { authority: Measure };
    centre: Measure;
    sheds: ShedBody[];
    checks: RecordCheck[];
  };
  /** The orbit as published, its heights over the ball of `radius`, and what kind of period its period is where it is not the convention's (nodal). */
  orbit: {
    radius: Measure;
    perigee: Measure;
    apogee: Measure;
    inclination: Measure;
    period: Measure;
    kind?: NonNullable<NonNullable<FlightPlan['record']>['orbit']>['kind'];
  };
  injection: { at: Measure; heading: 'north' | 'south'; arc: Measure; anomaly: Measure };
  /** The spacecraft in orbit, kg. */
  mass: Measure;
  /** The free-molecule flow of the orbit on the capsule with its retropack, as it was held (plan.ts `Craft.rarefied`). */
  rarefied: NonNullable<Craft['rarefied']>;
  /** How fast a hand turned the capsule (deg/s). */
  hand: Measure;
  retro: {
    /** The retrosequence: when the capsule was turned to retrofire attitude, and that attitude's pitch below the level, degrees. */
    sequence: Measure;
    below: Measure;
    /** Where the retrofire was flown off its line: the push turned in the level toward the left of the motion, degrees (negative, the right). */
    yaw?: Measure;
    /** The first motor lit, the spacing between them, how many, each one's thrust and burning time, and the impulse the three gave, m/s. */
    on: Measure;
    spacing: Measure;
    count: number;
    thrust: Measure;
    burn: Measure;
    deltaV: Measure;
    /** When the pack went: as planned (jettisoned so long after retrofire), and on the day. */
    planned: Measure;
    gone: Measure;
  };
  /** The capsule once the pack has gone: its mass then, its drag against Mach number on its shield's disc. */
  entry: { mass: Measure; area: Measure; drag: Curve };
  /** Its heat of entry (sim/heating.ts): the shock layer drawn. */
  heating: Heating;
  descent: {
    ground: Measure;
    /** The capsule as it landed, kg: what it weighs under its parachutes. */
    mass: Measure;
    drogue: { altitude: Measure; dragArea: Measure; fills: Measure };
    main: { altitude: Measure; dragArea: Measure; fills: Measure };
    checks: RecordCheck[];
  };
  /** What the crew came down in and what on, as the decks' cards and the verdict say it (sim/plan.ts `Lands`). */
  lands: Lands;
  landing: { latitude: Measure; longitude: Measure; at: Measure; near: string };
  /** The record's instants: the ones the plan's events are set off at are theirs; the rest are marks. */
  events: Instant[];
  checks: (Omit<RecordCheck, 'id'> & { id: keyof OrbitResults })[];
}

const atTime = (at: Measure) => [{ time: at.value }];

/** The sustainer's verniers with it as one engine, or a booster chamber as it is: one chamber's figures for the plan. */
const engineOf = (e: AtlasEngine): Pick<EngineDef, 'thrust' | 'isp' | 'nozzle'> => ({
  thrust: { seaLevel: e.thrust.seaLevel, vacuum: e.thrust.vacuum },
  isp: { seaLevel: e.isp.seaLevel, vacuum: e.isp.vacuum },
  ...(e.nozzle ? { nozzle: e.nozzle } : {}),
});

/** A Mercury-Atlas flight's plan, from its record. */
export function mercuryAtlasPlan(o: MercuryAtlasRecord): FlightPlan {
  const b = o.atlas.booster;
  const k = o.atlas.tank;
  const r = o.retro;
  const packMass = derived(
    o.mass.value - o.entry.mass.value,
    'the spacecraft in orbit less the capsule once the pack has gone, including consumables spent since insertion; an upper bound for the spent pack',
  );
  const bodies: BodyDef[] = [
    { id: 'atlas-booster-section', label: b.name, count: 1, mass: b.mass, dry: b.mass, nodes: b.nodes },
    { id: 'atlas', label: k.name, count: 1, mass: k.mass, dry: k.dry, nodes: k.nodes },
    { id: 'escape-tower', label: 'Escape tower', count: 1, mass: o.tower.mass },
    {
      id: 'retro-package',
      label: 'Retropack',
      count: 1,
      mass: packMass,
    },
    {
      id: 'mercury-capsule',
      label: 'Capsule',
      count: 1,
      mass: o.descent.mass,
      aero: {
        area: o.entry.area,
        drag: o.entry.drag,
        dragArea: derived(
          o.entry.area.value * o.entry.drag.points[0]![1],
          'the drag curve’s figure at rest on the shield’s disc: what the capsule falls on below its parachutes',
        ),
      },
    },
  ];
  const joints: JointDef[] = [
    { id: 'booster-latch', label: 'Booster section let go', gone: ['atlas-booster-section'], at: b.separation },
    { id: 'tower-clamp', label: 'Escape tower released', gone: ['escape-tower'], at: o.tower.separation },
    {
      id: 'adapter-clamp',
      label: 'Spacecraft separation',
      gone: ['atlas-booster-section', 'atlas'],
      push: o.separation.push,
      at: o.separation.at,
      after: o.separation.mass,
    },
    { id: 'retropack-straps', label: 'The retropack goes', gone: ['retro-package'], at: r.gone, after: o.entry.mass },
  ];
  const ground = { count: 1, ground: true, confidence: 'documented' as const, source: 'lit on the pad, as every Atlas’s were' };
  const engines: EngineDef[] = [
    {
      id: 'booster-engines',
      label: b.engine.name,
      body: 'atlas-booster-section',
      count: b.engine.count,
      tanks: ['atlas-propellant'],
      ...engineOf(b.engine),
      kind: 'liquid',
      starts: ground,
    },
    {
      id: 'sustainer',
      label: k.engine.name,
      body: 'atlas',
      count: k.engine.count,
      tanks: ['atlas-propellant'],
      ...engineOf(k.engine),
      kind: 'liquid',
      starts: ground,
    },
    {
      id: 'retrorockets',
      label: 'Retrorockets',
      body: 'retro-package',
      count: r.count,
      tanks: [],
      thrust: { vacuum: r.thrust },
      kind: 'solid',
      burn: derived(
        r.spacing.value * (r.count - 1) + r.burn.value,
        `the three as a set: each burning ${r.burn.value} s, lit ${r.spacing.value} s apart, from the first’s lighting to the last’s burning out`,
      ),
      starts: { count: 1, ground: false, confidence: 'documented', source: 'solid motors: each lit once' },
      deltaV: r.deltaV,
      flown: r.deltaV,
    },
  ];
  const tanks: TankDef[] = [{ id: 'atlas-propellant', label: 'Propellant', body: 'atlas', load: k.propellant, holds: 'propellant' }];
  const thrusters: ThrusterSet[] = [
    {
      id: 'atlas-steering',
      label: 'Steering',
      body: 'atlas',
      does: ['rotation'],
      mode: 'automatic',
      authority: o.ascent.steering.authority,
    },
    { id: 'reaction-control', label: 'Attitude by hand', body: 'mercury-capsule', does: ['rotation'], mode: 'manual', rate: o.hand },
  ];
  const chute = (name: string, x: { dragArea: Measure; fills: Measure }, instead?: string): ChuteDef => ({
    id: chuteEvent('mercury-capsule', name),
    label: name,
    body: 'mercury-capsule',
    dragArea: x.dragArea,
    fills: x.fills,
    ...(instead ? { instead: [chuteEvent('mercury-capsule', instead)] } : {}),
  });
  const chutes = [chute('drogue parachute', o.descent.drogue), chute('main parachute', o.descent.main, 'drogue parachute')];
  const attitude: AttitudeDef[] = [
    {
      id: 'steering-law',
      label: 'Steering law',
      hold: { law: o.ascent.guidance },
      source: 'sim/staged.ts: a stated law, solved for its targets',
    },
    { id: 'orbit-attitude', label: 'Orbit attitude', hold: { free: true }, source: 'in orbit its attitude is not flown' },
    {
      id: 'retrofire-attitude',
      label: 'Retrofire attitude',
      hold: { aim: 'velocity', sense: -1, below: r.below, ...(r.yaw ? { yaw: r.yaw } : {}), confidence: r.below.confidence },
      source: r.yaw ? `${r.below.source}; ${r.yaw.source}` : r.below.source,
    },
  ];
  const record = (at: Measure) => {
    const e = o.events.find((x) => Math.abs(x.at.value - at.value) < 1e-6);
    return e ? { record: { id: e.id, label: e.label } } : {};
  };
  const timed = (id: string, label: string, at: Measure, does: EventDef['do']): EventDef => ({
    id,
    label,
    when: atTime(at),
    do: does,
    automatic: true,
    at,
    ...record(at),
    source: at.source,
  });
  // (what Space offers for it once alone, before the pack: the pilot's retro button, the next thing he could do in the record's order)
  const fire: EventDef = { ...timed('retrofire', 'Retrofire', r.on, [{ ignite: 'retrorockets' }]), asked: 'Fire the retrorockets' };
  const pack: EventDef = {
    id: 'retropack-off',
    label: 'The retropack goes',
    when: [{ after: 'retrofire', wait: r.gone.value - r.on.value }],
    do: [{ separate: 'retropack-straps' }],
    automatic: true,
    asked: 'Jettison the retropack',
    at: r.gone,
    ...record(r.gone),
    also: `planned: jettisoned at ${r.planned.value} s, ${r.planned.value - r.on.value} s after the first motor (${r.planned.source})`,
    source: r.gone.source,
  };
  const events: EventDef[] = [
    {
      id: 'liftoff',
      label: 'Liftoff',
      when: [{ time: 0 }],
      do: [{ ignite: 'booster-engines' }, { ignite: 'sustainer' }],
      automatic: true,
      source: 'all five engines lit on the pad',
    },
    timed('booster-engines:cut', 'Booster engine cutoff', b.cutoff, [{ cut: 'booster-engines' }]),
    timed('booster-latch:separate', 'Drop the booster section', b.separation, [{ separate: 'booster-latch' }]),
    timed('tower-clamp:separate', 'Release the escape tower', o.tower.separation, [{ separate: 'tower-clamp' }]),
    // The sustainer is shut down by the ground guidance when the insertion it computes is the orbit wanted, not at an instant
    // and not at a speed set beforehand: the run cuts it on the state it has flown, when the orbit it will be on once the
    // posigrades have pushed it off has the record's period (plan.ts `{ orbit }`). The recorded speed and instant at cutoff
    // are figures the run is held to (`cutoffSpeed`, below; `at`). The spacecraft parts as long after as the record has.
    {
      id: 'sustainer:cut',
      label: 'Sustainer engine cutoff',
      when: [{ orbit: 'published' }],
      do: [{ cut: 'sustainer' }],
      automatic: true,
      at: k.cutoff,
      source: k.velocity.source,
    },
    {
      ...timed('adapter-clamp:separate', 'Separate the spacecraft', o.separation.at, [{ separate: 'adapter-clamp' }]),
      when: [{ after: 'sustainer:cut', wait: o.separation.at.value - k.cutoff.value }],
    },
    timed('retrosequence', 'Retrosequence: to retrofire attitude', r.sequence, [{ attitude: 'retrofire-attitude' }]),
    fire,
    pack,
    // (the drogue's barostat, once the pack has gone: what lets what comes down loose, orbital.ts `coastOf`)
    {
      id: chuteEvent('mercury-capsule', 'drogue parachute'),
      label: 'Drogue parachute',
      asked: 'Drogue parachute',
      when: [{ after: 'retropack-off' }, { height: o.descent.drogue.altitude.value, going: 'down' }],
      do: [{ deploy: chuteEvent('mercury-capsule', 'drogue parachute') }],
      automatic: true,
      source: o.descent.drogue.altitude.source,
    },
    {
      id: chuteEvent('mercury-capsule', 'main parachute'),
      label: 'Main parachute',
      asked: 'Main parachute',
      when: [{ after: chuteEvent('mercury-capsule', 'drogue parachute') }, { height: o.descent.main.altitude.value, going: 'down' }],
      do: [{ deploy: chuteEvent('mercury-capsule', 'main parachute') }],
      automatic: true,
      source: o.descent.main.altitude.source,
    },
  ];
  const actionAt = new Set(events.flatMap((e) => (e.at && e.when.some((w) => 'time' in w || 'after' in w) ? [e.at.value] : [])));
  const craft: Craft = {
    id: 'mercury-atlas',
    label: 'The stack',
    mass: o.liftoffMass,
    bodies,
    joints,
    engines,
    tanks,
    thrusters,
    chutes,
    limits: [],
    drag: o.ascent.drag,
    heating: o.heating,
    rarefied: o.rarefied,
    lands: o.lands,
    sheds: [...o.ascent.sheds, retropack(BASE / IN, packMass)],
    // (the pilot lands in the capsule, on its couch: the Redstone flights' figure for what he walks away from)
    crew: {
      landing: { aboard: LANDING_SPEED },
      aboard: 'He landed in the capsule, on its couch and its landing bag, as every Mercury pilot did',
    },
  };
  const ascentWhen = (id: string): Pick<PlanCheck, 'when'> =>
    id === 'firstG'
      ? { when: { most: 'g', aboard: ['atlas-booster-section'] } }
      : id === 'coreG'
        ? { when: { most: 'g', aboard: ['atlas'], gone: ['atlas-booster-section'] } }
        : {};
  const checks: PlanCheck[] = [
    ...o.ascent.checks.map((c): PlanCheck => ({ ...c, of: 'ascent', ...ascentWhen(c.id) })),
    // The recorded speed at the sustainer's cutoff: flown to until November 2026, and since then what the guidance's cutoff
    // on the orbit is held against. Ten feet a second either way, the scale of the guidance's own miss (Friendship 7's
    // cutoff was "seven feet per second below nominal"): set as the cutoff became the guidance's, when the run cut on this
    // speed was known to leave the orbit within 5 m/s of the published one.
    {
      id: 'cutoffSpeed',
      label: 'Space-fixed speed at sustainer cutoff',
      value: k.velocity.value,
      unit: 'm/s',
      tolerance: 10 * 0.3048,
      confidence: k.velocity.confidence,
      source: k.velocity.source,
      of: 'ascent',
    },
    ...o.checks.map((c): PlanCheck => ({ ...c, of: 'orbit' })),
    ...o.descent.checks.map((c): PlanCheck => ({ ...c, of: 'descent' })),
  ];
  return {
    kind: 'orbital',
    craft: [craft],
    events,
    attitude,
    checks,
    record: {
      orbit: { ...o.orbit, injection: o.injection, mass: o.mass },
      landing: o.landing,
      ground: o.descent.ground,
      centre: o.ascent.centre,
      // (the hands: no lock, and a hand-fired retrofire's pack goes as the record's did, so long after it)
      manual: { parting: derived(r.gone.value - r.on.value, 'the pack going as long after retrofire as it did on the day') },
      marks: o.events
        .filter((e) => !actionAt.has(e.at.value))
        .map((e) => ({
          id: e.id,
          label: e.label,
          at: e.at,
          ...(e.also ? { also: e.also } : {}),
          ...(e.at.value === o.landing.at.value ? { lands: 'mercury-capsule' } : {}),
        })),
    },
  };
}
