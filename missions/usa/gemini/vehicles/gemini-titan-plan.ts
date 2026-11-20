/**
 * A Gemini-Titan flight into orbit as the simulator flies it: its record (`GeminiTitanRecord`, which the flight's orbital.ts
 * gives, every figure a Measure with its confidence and source) and the plan written from it (`geminiTitanPlan`,
 * src/sim/plan.ts). Only this module and the flight's orbital.ts read the record; the flight carries the plan. The ids are
 * this module's own, the hardware's names: nothing in src/ names one.
 *
 * The Titan II is two stages, each on its own propellant (Aerozine 50 and nitrogen tetroxide, flown as one load a stage).
 * At staging the second stage's engine is lit with the stages still joined and fires through the interstage's open sides
 * ("fire in the hole": the joint's `hot`), and the first stage is let go a moment later. The spacecraft is cut free of the
 * second stage after its cutoff. In orbit the spacecraft's own thrusters change its orbit: the orbit attitude and
 * manoeuvre system's aft-firing pair, on the equipment section, pushes toward the nose, and its forward-firing pair, on
 * the retrograde section, toward the tail (`EngineDef.astern`). Each manoeuvre is an attitude, a lighting with its own
 * impulse as the crew's velocity indicator gave it (`Action.flown`), and a cut, at the record's instants (src/sim/
 * orbital.ts `movesOf`). Before retrofire the equipment section is let go; the retrograde section's four solids, fired one
 * after another, are the coast's burn, flown as their whole impulse spread evenly from the first's lighting to the last's
 * burning out; the section goes so long after, and the re-entry module comes down on its offset centre of mass, its lift
 * turned by the bank the crew held (`AeroDef.lift`, `Hold.bank`), its drogue and its main.
 */
import { derived, type Measure } from '../../../../src/measure.ts';
import { chuteEvent, type DescentCrew, type Guidance, type OrbitResults } from '../../../../src/sim/orbital.ts';
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

/** One engine as the record has it: one chamber's figures, `count` alike. */
export interface TitanEngine {
  name: string;
  count: number;
  thrust: { seaLevel?: Measure; vacuum: Measure };
  isp: { seaLevel?: Measure; vacuum: Measure };
  nozzle?: Nozzle;
}

/** A stage of the Titan: its weights fuelled and at burnout, what of its propellant it burns, its engine and its instants. */
export interface TitanStage {
  name: string;
  nodes: string[];
  mass: Measure;
  dry: Measure;
  propellant: Measure;
  engine: TitanEngine;
  ignition: Measure;
  cutoff: Measure;
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

/** A pair of the spacecraft's thrusters that changes its orbit: what they are, each chamber's thrust and impulse. */
export interface Thrusters {
  name: string;
  count: number;
  thrust: Measure;
  isp: Measure;
}

/**
 * A manoeuvre by the crew: the attitude they turned to (`aim`, with whose figure it is), when they were in it, when the
 * thrusters were lit and cut, and the impulse the velocity indicator gave for it, where it gave one.
 */
export interface Manoeuvre {
  id: string;
  label: string;
  /** Which pair fired: the aft-firing (pushing toward the nose) or the forward-firing (toward the tail). */
  thrusters: 'aft' | 'forward';
  /** `below`: along the motion, the line pitched down from the level by so many degrees (up, negative: plan.ts `Hold`). */
  attitude: { label: string; aim: 'velocity' | 'normal'; sense: 1 | -1; below?: Measure; confidence: Confidence; source: string };
  turned: Measure;
  on: Measure;
  off: Measure;
  deltaV?: Measure;
}

/** Something the spacecraft let go of in orbit besides its fairings (a pod it threw out): its joint's id, which its shed in `ascent.sheds` is `on`, and its nodes. */
export interface Released {
  id: string;
  label: string;
  nodes: string[];
  at: Measure;
}

export interface GeminiTitanRecord {
  /** Everything that left the pad, kg. */
  liftoffMass: Measure;
  titan: {
    first: TitanStage;
    second: TitanStage;
    /** When the first stage is let go, s: so long after the second stage's engine was lit. */
    staging: Measure;
    /** The second stage's engine fired into the interstage with the stages joined (plan.ts `JointDef.hot`). */
    hot: { open: Measure; turn: Measure; endures: Measure };
  };
  /** The spacecraft let go of the second stage: when, how fast the two were pushed apart, and what flew on. */
  separation: { at: Measure; push: Measure; mass: Measure };
  /** What else it let go of in orbit, each at its instant (`Released`). */
  released?: Released[];
  ascent: {
    guidance: Guidance;
    drag: { until: Measure; area: Measure; curve: Curve }[];
    steering: { authority: Measure };
    centre: Measure;
    sheds: ShedBody[];
    checks: RecordCheck[];
  };
  /**
   * The orbit as published; what its heights are over where a source says (`radius` a ball, `over` the oblate earth as
   * flown apsides; else the ball its heights and period imply: orbital.ts `heightsBall`), and what kind its period is.
   */
  orbit: {
    radius?: Measure;
    over?: NonNullable<NonNullable<FlightPlan['record']>['orbit']>['over'];
    perigee: Measure;
    apogee: Measure;
    inclination: Measure;
    period: Measure;
    kind?: NonNullable<NonNullable<FlightPlan['record']>['orbit']>['kind'];
  };
  injection: { at: Measure; heading: 'north' | 'south'; arc: Measure; anomaly: Measure };
  /** The spacecraft in orbit, kg. */
  mass: Measure;
  /** The free-molecule flow of the orbit on the whole spacecraft as it was held (plan.ts `Craft.rarefied`). */
  rarefied: NonNullable<Craft['rarefied']>;
  /** How fast a hand turned the spacecraft (deg/s). */
  hand: Measure;
  oams: { aft: Thrusters; forward: Thrusters };
  moves: Manoeuvre[];
  /** The adapter's two sections: the equipment section, its mass and when it was let go; the retrograde section, its mass with its rockets unfired. */
  adapter: { equipment: { mass: Measure; gone: Measure }; retro: { mass: Measure } };
  retro: {
    /** When the spacecraft was turned to its retrofire attitude, and that attitude's pitch below the level, degrees. */
    sequence: Measure;
    below: Measure;
    /** The first rocket lit, the spacing between them, how many, each one's thrust and burning time, and the impulse the four gave, m/s. */
    on: Measure;
    spacing: Measure;
    count: number;
    thrust: Measure;
    burn: Measure;
    deltaV: Measure;
    /** When the retrograde section was let go. */
    gone: Measure;
  };
  /**
   * The re-entry module once the retrograde section has gone: its mass then, its drag against Mach number on its heat
   * shield's disc, its lift over drag as flown (`lift`) and as predicted (`predicted`, said and not flown), the angle of
   * attack it trimmed at, and the bank held from `banked`; and, where the record has the crew roll it again, each later
   * bank from its instant (`banks`).
   */
  entry: {
    mass: Measure;
    area: Measure;
    drag: Curve;
    lift: Curve;
    predicted: Measure;
    trim: Measure;
    bank: Measure;
    banked: Measure;
    banks?: { label: string; bank: Measure; at: Measure }[];
  };
  /** Its heat of entry (sim/heating.ts): the shock layer drawn. */
  heating: Heating;
  descent: {
    ground: Measure;
    /** The re-entry module under its parachutes, kg. */
    mass: Measure;
    drogue: { altitude: Measure; dragArea: Measure; fills: Measure };
    main: { altitude: Measure; dragArea: Measure; fills: Measure };
    checks: RecordCheck[];
  };
  /** The crew, who come down in the ship: what they are held to (sim/verdict.ts) and the words for them. */
  crew: DescentCrew;
  /** What the crew came down in and what on, as the decks' cards and the verdict say it (sim/plan.ts `Lands`). */
  lands: Lands;
  landing: NonNullable<NonNullable<FlightPlan['record']>['landing']> & { near: string };
  /** The record's instants: the ones the plan's events are set off at are theirs; the rest are marks. */
  events: Instant[];
  checks: (Omit<RecordCheck, 'id'> & { id: keyof OrbitResults })[];
}

const atTime = (at: Measure) => [{ time: at.value }];

const engineOf = (e: TitanEngine): Pick<EngineDef, 'thrust' | 'isp' | 'nozzle'> => ({
  thrust: { ...(e.thrust.seaLevel ? { seaLevel: e.thrust.seaLevel } : {}), vacuum: e.thrust.vacuum },
  isp: { ...(e.isp.seaLevel ? { seaLevel: e.isp.seaLevel } : {}), vacuum: e.isp.vacuum },
  ...(e.nozzle ? { nozzle: e.nozzle } : {}),
});

/** The body each pair of thrusters is on: the aft-firing pair at the equipment section's foot, the forward-firing on the retrograde section. */
const THRUSTER_BODY = { aft: 'equipment-section', forward: 'retro-section' } as const;
const THRUSTER_ID = { aft: 'aft-thrusters', forward: 'forward-thrusters' } as const;

/** A Gemini-Titan flight's plan, from its record. */
export function geminiTitanPlan(o: GeminiTitanRecord): FlightPlan {
  const [s1, s2] = [o.titan.first, o.titan.second];
  const r = o.retro;
  const bodies: BodyDef[] = [
    { id: 'titan-first-stage', label: s1.name, count: 1, mass: s1.mass, dry: s1.dry, nodes: s1.nodes },
    { id: 'titan-second-stage', label: s2.name, count: 1, mass: s2.mass, dry: s2.dry, nodes: s2.nodes },
    { id: 'equipment-section', label: 'Equipment section', count: 1, mass: o.adapter.equipment.mass },
    { id: 'retro-section', label: 'Retrograde section', count: 1, mass: o.adapter.retro.mass },
    {
      id: 'reentry-module',
      label: 'Re-entry module',
      count: 1,
      mass: o.descent.mass,
      aero: {
        area: o.entry.area,
        drag: o.entry.drag,
        lift: o.entry.lift,
        trim: o.entry.trim,
        dragArea: derived(
          o.entry.area.value * o.entry.drag.points[0]![1],
          'the drag curve’s figure at rest on the heat shield’s disc: what the module falls on below its parachutes',
        ),
      },
    },
  ];
  const fairings = o.events.find((e) => e.id === 'fairings')!;
  const joints: JointDef[] = [
    // Their combined mass is included in the recorded spacecraft mass; only their detached bodies use individual estimates.
    { id: 'fairings', label: 'Nose and scanner fairings let go', gone: [], at: fairings.at },
    ...(o.released ?? []).map((x): JointDef => ({ id: x.id, label: x.label, gone: [], at: x.at })),
    {
      id: 'staging-nuts',
      label: 'First stage let go',
      gone: ['titan-first-stage'],
      hot: { engine: 'second-stage-engine', ...o.titan.hot },
      at: o.titan.staging,
    },
    {
      id: 'adapter-separation',
      label: 'Spacecraft separation',
      gone: ['titan-first-stage', 'titan-second-stage'],
      push: o.separation.push,
      at: o.separation.at,
      after: o.separation.mass,
    },
    { id: 'equipment-section-release', label: 'Equipment section let go', gone: ['equipment-section'], at: o.adapter.equipment.gone },
    { id: 'retro-section-release', label: 'Retrograde section let go', gone: ['retro-section'], at: r.gone, after: o.entry.mass },
  ];
  const ground = { count: 1, ground: true, confidence: 'documented' as const, source: 'the first stage’s engine was started on the pad' };
  const thrusters = (pair: 'aft' | 'forward'): EngineDef => {
    const t = o.oams[pair];
    return {
      id: THRUSTER_ID[pair],
      label: t.name,
      body: THRUSTER_BODY[pair],
      count: t.count,
      tanks: [],
      thrust: { vacuum: t.thrust },
      isp: { vacuum: t.isp },
      kind: 'liquid',
      starts: {
        count: 1000,
        ground: false,
        confidence: 'estimated',
        source: 'hypergolic thrusters opened and shut by their valves as often as the crew asked: no limit read, taken as a thousand',
      },
      burns: 'hydrazine-n2o4',
      ...(pair === 'forward' ? { astern: true as const } : {}),
    };
  };
  const engines: EngineDef[] = [
    {
      id: 'first-stage-engine',
      label: s1.engine.name,
      body: 'titan-first-stage',
      count: s1.engine.count,
      tanks: ['first-stage-propellant'],
      ...engineOf(s1.engine),
      kind: 'liquid',
      starts: ground,
      burns: 'hydrazine-n2o4',
    },
    {
      id: 'second-stage-engine',
      label: s2.engine.name,
      body: 'titan-second-stage',
      count: s2.engine.count,
      tanks: ['second-stage-propellant'],
      ...engineOf(s2.engine),
      kind: 'liquid',
      starts: {
        count: 1,
        ground: false,
        confidence: 'documented',
        source: 'started once, in flight, by its own start cartridge at the staging signal (Launch Systems Final Report, p. II.C-23)',
      },
      burns: 'hydrazine-n2o4',
    },
    thrusters('aft'),
    thrusters('forward'),
    {
      id: 'retrorockets',
      label: 'Retrograde rockets',
      body: 'retro-section',
      count: r.count,
      tanks: [],
      thrust: { vacuum: r.thrust },
      kind: 'solid',
      burn: derived(
        r.spacing.value * (r.count - 1) + r.burn.value,
        `the four as a set: each burning ${r.burn.value} s, lit ${r.spacing.value} s apart, from the first’s lighting to the last’s burning out`,
      ),
      starts: { count: 1, ground: false, confidence: 'documented', source: 'solid rockets: each lit once' },
      deltaV: r.deltaV,
      flown: r.deltaV,
      burns: 'solid-perchlorate',
    },
  ];
  const tanks: TankDef[] = [
    { id: 'first-stage-propellant', label: 'First stage propellant', body: 'titan-first-stage', load: s1.propellant, holds: 'propellant' },
    {
      id: 'second-stage-propellant',
      label: 'Second stage propellant',
      body: 'titan-second-stage',
      load: s2.propellant,
      holds: 'propellant',
    },
  ];
  const sets: ThrusterSet[] = [
    {
      id: 'titan-steering',
      label: 'Steering',
      body: 'titan-second-stage',
      does: ['rotation'],
      mode: 'automatic',
      authority: o.ascent.steering.authority,
    },
    { id: 'oams', label: 'Attitude by hand', body: 'equipment-section', does: ['rotation', 'translation'], mode: 'manual', rate: o.hand },
    { id: 'reentry-control', label: 'Re-entry control by hand', body: 'reentry-module', does: ['rotation'], mode: 'manual', rate: o.hand },
  ];
  const chute = (name: string, x: { dragArea: Measure; fills: Measure }, instead?: string): ChuteDef => ({
    id: chuteEvent('reentry-module', name),
    label: name,
    body: 'reentry-module',
    dragArea: x.dragArea,
    fills: x.fills,
    ...(instead ? { instead: [chuteEvent('reentry-module', instead)] } : {}),
  });
  const chutes = [chute('drogue parachute', o.descent.drogue), chute('main parachute', o.descent.main, 'drogue parachute')];
  const attitude: AttitudeDef[] = [
    {
      id: 'steering-law',
      label: 'Steering law',
      hold: { law: o.ascent.guidance },
      source: 'sim/staged.ts: a stated law, solved for its targets',
    },
    { id: 'orbit-attitude', label: 'Orbit attitude', hold: { free: true }, source: 'between its manoeuvres its attitude is not flown' },
    ...o.moves.map(
      (m): AttitudeDef => ({
        id: `${m.id}-attitude`,
        label: m.attitude.label,
        hold: {
          aim: m.attitude.aim,
          sense: m.attitude.sense,
          ...(m.attitude.below ? { below: m.attitude.below } : {}),
          confidence: m.attitude.confidence,
        },
        source: m.attitude.source,
      }),
    ),
    {
      id: 'banked-attitude',
      label: 'Banked for the entry',
      hold: { bank: o.entry.bank },
      source: o.entry.bank.source,
    },
    ...(o.entry.banks ?? []).map(
      (b, i): AttitudeDef => ({ id: `banked-attitude-${i + 2}`, label: b.label, hold: { bank: b.bank }, source: b.bank.source }),
    ),
    // (the retrofire attitude last: the coast's burn lights in it, orbital.ts `shipOf`)
    {
      id: 'retrofire-attitude',
      label: 'Retrofire attitude',
      hold: { aim: 'velocity', sense: -1, below: r.below, confidence: r.below.confidence },
      source: r.below.source,
    },
  ];
  const record = (at: Measure) => {
    const e = o.events.find((x) => Math.abs(x.at.value - at.value) < 1e-6);
    return e ? { record: { id: e.id, label: e.label } } : {};
  };
  const timed = (id: string, label: string, at: Measure, does: EventDef['do'], asked?: string): EventDef => ({
    id,
    label,
    when: atTime(at),
    do: does,
    automatic: true,
    at,
    ...record(at),
    ...(asked ? { asked } : {}),
    source: at.source,
  });
  const moves = o.moves.flatMap((m): EventDef[] => {
    const id = THRUSTER_ID[m.thrusters];
    return [
      timed(`${m.id}:turn`, `${m.label}: turned to its attitude`, m.turned, [{ attitude: `${m.id}-attitude` }]),
      timed(`${m.id}`, m.label, m.on, [m.deltaV ? { ignite: id, flown: m.deltaV } : { ignite: id }]),
      timed(`${m.id}:cut`, `${m.label}: thrusters off`, m.off, [{ cut: id }, { attitude: 'orbit-attitude' }]),
    ];
  });
  const events: EventDef[] = [
    {
      id: 'liftoff',
      label: 'Liftoff',
      when: [{ time: 0 }],
      do: [{ ignite: 'first-stage-engine' }],
      automatic: true,
      source: 'the first stage’s two chambers, started on the pad and let go at full thrust',
    },
    // (fire in the hole: the staging signal lights the second stage with the stages joined, and the first is cut; one action
    // to an event, so that each is a step of its own, stagedlive.ts `sequence`)
    timed('staging', 'Staging: the second stage lit through the interstage', s2.ignition, [{ ignite: 'second-stage-engine' }]),
    timed('first-stage-engine:cut', 'First stage cutoff', s1.cutoff, [{ cut: 'first-stage-engine' }]),
    timed('staging-nuts:separate', 'Drop the first stage', o.titan.staging, [{ separate: 'staging-nuts' }]),
    // The second stage is shut down by the radio guidance on the velocity for the orbit, not by the clock: the run cuts it
    // on the state it has flown, when its orbit has the record's period (plan.ts `{ orbit }`), and the record's instant is
    // held as a figure. The spacecraft parts as long after the stage stops as the record has between the two.
    {
      ...timed('second-stage-engine:cut', 'Second stage engine cutoff', s2.cutoff, [{ cut: 'second-stage-engine' }]),
      when: [{ orbit: 'published' }],
    },
    {
      ...timed('adapter-separation:separate', 'Separate the spacecraft', o.separation.at, [{ separate: 'adapter-separation' }]),
      when: [{ after: 'second-stage-engine:cut', wait: o.separation.at.value - s2.cutoff.value }],
    },
    timed('fairings:separate', fairings.label, fairings.at, [{ separate: 'fairings' }]),
    ...(o.released ?? []).map((x) => timed(`${x.id}:separate`, x.label, x.at, [{ separate: x.id }])),
    ...moves,
    timed('retrosequence', 'Retrosequence: to retrofire attitude', r.sequence, [{ attitude: 'retrofire-attitude' }]),
    timed(
      'equipment-section-off',
      'The equipment section goes',
      o.adapter.equipment.gone,
      [{ separate: 'equipment-section-release' }],
      'Jettison the equipment section',
    ),
    timed('retrofire', 'Retrofire', r.on, [{ ignite: 'retrorockets' }]),
    {
      id: 'retro-section-off',
      label: 'The retrograde section goes',
      when: [{ after: 'retrofire', wait: r.gone.value - r.on.value }],
      do: [{ separate: 'retro-section-release' }],
      automatic: true,
      asked: 'Jettison the retrograde section',
      at: r.gone,
      ...record(r.gone),
      source: r.gone.source,
    },
    timed('entry-bank', 'Banked for the entry', o.entry.banked, [{ attitude: 'banked-attitude' }]),
    ...(o.entry.banks ?? []).map((b, i) => timed(`entry-bank-${i + 2}`, b.label, b.at, [{ attitude: `banked-attitude-${i + 2}` }])),
    // (the drogue at its height, once the retrograde section has gone: what lets what comes down loose, orbital.ts `coastOf`)
    {
      id: chuteEvent('reentry-module', 'drogue parachute'),
      label: 'Drogue parachute',
      asked: 'Drogue parachute',
      when: [{ after: 'retro-section-off' }, { height: o.descent.drogue.altitude.value, going: 'down' }],
      do: [{ deploy: chuteEvent('reentry-module', 'drogue parachute') }],
      automatic: true,
      source: o.descent.drogue.altitude.source,
    },
    {
      id: chuteEvent('reentry-module', 'main parachute'),
      label: 'Main parachute',
      asked: 'Main parachute',
      when: [{ after: chuteEvent('reentry-module', 'drogue parachute') }, { height: o.descent.main.altitude.value, going: 'down' }],
      do: [{ deploy: chuteEvent('reentry-module', 'main parachute') }],
      automatic: true,
      source: o.descent.main.altitude.source,
    },
  ];
  events.sort((a, b) => (a.at?.value ?? (a.id === 'liftoff' ? 0 : Infinity)) - (b.at?.value ?? (b.id === 'liftoff' ? 0 : Infinity)));
  const actionAt = new Set(events.flatMap((e) => (e.at && e.when.some((w) => 'time' in w || 'after' in w) ? [e.at.value] : [])));
  const craft: Craft = {
    id: 'gemini-titan',
    label: 'The stack',
    mass: o.liftoffMass,
    bodies,
    joints,
    engines,
    tanks,
    thrusters: sets,
    chutes,
    limits: [],
    drag: o.ascent.drag,
    heating: o.heating,
    rarefied: o.rarefied,
    crew: o.crew,
    lands: o.lands,
    sheds: o.ascent.sheds,
  };
  const ascentWhen = (id: string): Pick<PlanCheck, 'when'> =>
    id === 'firstG'
      ? { when: { most: 'g', aboard: ['titan-first-stage'] } }
      : id === 'lastG' || id === 'coreG'
        ? { when: { most: 'g', aboard: ['titan-second-stage'], gone: ['titan-first-stage'] } }
        : {};
  const checks: PlanCheck[] = [
    ...o.ascent.checks.map((c): PlanCheck => ({ ...c, of: 'ascent', ...ascentWhen(c.id) })),
    ...o.checks.map((c): PlanCheck => {
      // (`<name>.<perigee|apogee|period>`: the orbit read at an instant after a manoeuvre, orbital.ts `readingsOf`)
      const reading = /^after-(\d+)\./.exec(c.id);
      return { ...c, of: 'orbit', ...(reading ? { when: { at: Number(reading[1]), reading: 'orbit' as const } } : {}) };
    }),
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
      // (the hands: no lock on the hand controller, and a hand-fired retrofire's section goes as the record's did, so long after it)
      manual: { parting: derived(r.gone.value - r.on.value, 'the retrograde section going as long after retrofire as it did on the day') },
      automatic:
        'on the day the crew did these: the retrograde section by its switch once its light came on, the drogue and the main by their switches',
      marks: o.events
        .filter((e) => !actionAt.has(e.at.value))
        .map((e) => ({
          id: e.id,
          label: e.label,
          at: e.at,
          ...(e.also ? { also: e.also } : {}),
          ...(e.at.value === o.landing.at.value ? { lands: 'reentry-module' } : {}),
        })),
    },
  };
}
