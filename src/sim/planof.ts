/**
 * A plan (sim/plan.ts) made from each of the two shapes a flight's data has today: `Trajectory` (a ballistic flight) and
 * `OrbitalFlight` (one into orbit). Every figure is carried over as it is, with its confidence and source; where a figure
 * the plan wants is worked from the old shape's, it is `derived` and says how. These go when the flights' data says
 * its plan itself (tests/plan.test.mjs holds each plan to what it was made from until then).
 */
import { derived, type Measure } from '../measure.ts';
import type { FlightCheck, Trajectory } from '../types.ts';
import { G0 } from '../world/bodies.ts';
import { chuteEvent, type OrbitalFlight } from './orbital.ts';
import type {
  AttitudeDef,
  BodyDef,
  ChuteDef,
  Craft,
  EngineDef,
  EventDef,
  FlightPlan,
  JointDef,
  LimitDef,
  PlanCheck,
  TankDef,
  ThrusterSet,
} from './plan.ts';
import { vacuumOf } from './thrust.ts';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const atTime = (at: Measure) => [{ time: at.value }];

/** A ballistic flight's plan. `checks` are the flight's own (`Flight.checks`): a ballistic flight keeps them beside its trajectory. */
export function planOfTrajectory(tr: Trajectory, checks: readonly FlightCheck[] = []): FlightPlan {
  const body = tr.body;
  const e = tr.engine;
  const flow = e.thrust.value / (G0 * e.isp.value);
  const cutoff = e.cutoff.value;
  const vacuum = vacuumOf(e);
  const sep = tr.separation;
  const burned = flow * cutoff;
  const towerMass = tr.liftoffMass.value - burned - sep.boosterMass.value - sep.mass.value;
  const hasTower = Boolean(body?.tower || body?.escape);
  const bodies: BodyDef[] = [
    {
      id: 'booster',
      label: 'Booster',
      count: 1,
      mass: derived(
        sep.boosterMass.value + burned,
        `its mass at separation (${sep.boosterMass.value} kg) and what its engine burns to cutoff, thrust over g0 times specific impulse for ${cutoff} s`,
      ),
      dry: sep.boosterMass,
    },
    ...(hasTower
      ? [
          {
            id: 'tower',
            label: 'Escape tower',
            count: 1,
            mass: derived(towerMass, 'what leaves the pad less the booster at liftoff and the capsule at separation'),
          },
        ]
      : []),
    {
      id: 'retropack',
      label: 'Retropack',
      count: 1,
      mass: derived(sep.mass.value - tr.retropack.mass.value, 'the capsule at separation less the capsule once the retropack has gone'),
    },
    {
      id: 'capsule',
      label: 'Capsule',
      count: 1,
      mass: tr.retropack.mass,
      aero: { area: tr.area, drag: tr.entryDrag },
    },
  ];
  const joints: JointDef[] = [
    ...(hasTower ? [{ id: 'tower', label: 'Tower jettisoned', gone: ['tower'], ...(body?.tower ? { at: body.tower.at } : {}) }] : []),
    {
      id: 'separation',
      label: 'Capsule separation',
      gone: ['booster'],
      push: sep.speed,
      at: sep.at,
      after: sep.mass,
      leaves: sep.boosterMass,
    },
    { id: 'retropack', label: 'Retropack jettisoned', gone: ['retropack'], at: tr.retropack.at, after: tr.retropack.mass },
  ];
  const nature = body?.engine;
  const engines: EngineDef[] = [
    {
      id: 'main',
      label: 'Booster engine',
      body: 'booster',
      count: 1,
      tanks: ['booster'],
      thrust: { seaLevel: e.thrust, vacuum },
      isp: {
        seaLevel: e.isp,
        vacuum: derived(
          vacuum.value / (flow * G0),
          'the vacuum thrust over the flow (sea-level thrust over g0 times specific impulse) and g0',
        ),
      },
      exitArea: e.exitArea,
      kind: nature?.kind ?? 'liquid',
      ...(nature?.throttle ? { throttle: { range: nature.throttle } } : {}),
      ...(body ? { gimbal: { deflection: body.control.deflection, station: body.control.station } } : {}),
      starts: nature
        ? { count: nature.starts, ground: false, confidence: nature.confidence, source: nature.source }
        : {
            count: 1,
            ground: false,
            confidence: 'estimated',
            source: 'not given: started once, as a liquid at fixed thrust is taken to be',
          },
      ...(e.depletion ? { depletion: e.depletion } : {}),
    },
    ...tr.retro.fires.map(
      (_, k): EngineDef => ({
        id: `retro-${k + 1}`,
        label: `Retrorocket ${k + 1}`,
        body: 'retropack',
        count: 1,
        tanks: [],
        thrust: { vacuum: tr.retro.thrust },
        kind: 'solid',
        burn: tr.retro.burn,
        starts: { count: 1, ground: false, confidence: 'documented', source: 'a solid motor: lit once' },
      }),
    ),
    ...(body?.escape
      ? [
          {
            id: 'escape',
            label: 'Escape rocket',
            body: 'tower',
            count: 1,
            tanks: [],
            thrust: { vacuum: body.escape.thrust },
            kind: 'solid' as const,
            burn: body.escape.burn,
            impulse: body.escape.impulse,
            ...(body.escape.curve ? { curve: body.escape.curve } : {}),
            starts: { count: 1, ground: false, confidence: 'documented' as const, source: 'a solid motor: lit once' },
          },
        ]
      : []),
  ];
  const tanks: TankDef[] = [
    {
      id: 'booster',
      label: 'Booster propellant',
      body: 'booster',
      load: derived(
        flow * (e.depletion ?? e.cutoff).value,
        `the flow (thrust over g0 times specific impulse) for ${e.depletion ? 'the time it can burn before a propellant runs out' : 'its burn to cutoff'}`,
      ),
      holds: 'propellant',
    },
  ];
  const rcs = body?.capsule.rcs;
  for (const s of rcs?.supplies ?? [])
    tanks.push({ id: `rcs:${s.name}`, label: s.name, body: 'capsule', load: s.propellant, holds: 'control', isp: s.isp });
  const thrusters: ThrusterSet[] = rcs
    ? rcs.supplies.map((s) => ({
        id: s.name,
        label: s.name,
        body: 'capsule',
        does: ['rotation'],
        tank: `rcs:${s.name}`,
        mode: s.mode,
        chambers: rcs.thrusters.filter((t) => t.supply === s.name),
        ...(rcs.rate && s.mode === 'manual' ? { rate: rcs.rate.full } : {}),
      }))
    : body?.capsule.jets
      ? [{ id: 'jets', label: 'Attitude jets', body: 'capsule', does: ['rotation'], mode: 'automatic', torque: body.capsule.jets }]
      : [];
  const lim = body?.limits;
  const chutes: ChuteDef[] = [
    {
      id: 'drogue',
      label: 'Drogue',
      body: 'capsule',
      dragArea: tr.drogue.dragArea,
      fills: tr.drogue.fills,
      ...(lim ? { strength: lim.drogue, ...(lim.pull?.drogue ? { pull: lim.pull.drogue } : {}) } : {}),
    },
    {
      id: 'main',
      label: 'Main parachute',
      body: 'capsule',
      dragArea: tr.main.dragArea,
      fills: tr.main.fills,
      instead: ['drogue'],
      ...(lim ? { strength: lim.main, ...(lim.pull?.main ? { pull: lim.pull.main } : {}) } : {}),
    },
  ];
  const limits: LimitDef[] = [];
  if (lim) limits.push({ of: 'qAlpha', value: lim.qAlpha, at: lim.joint });
  const crewLimits = body?.capsule.limits;
  if (crewLimits) limits.push({ of: 'landing-speed', value: crewLimits.landingSpeed }, { of: 'load', value: crewLimits.load });
  const craft: Craft = {
    id: 'stack',
    label: 'The stack',
    mass: tr.liftoffMass,
    bodies,
    joints,
    engines,
    tanks,
    thrusters,
    chutes,
    limits,
    drag: [{ until: sep.at, area: tr.area, curve: tr.ascentDrag }],
    ...(body ? { rigid: body } : {}),
    ...(tr.heating ? { heating: tr.heating } : {}),
    ...(body?.sheds ? { sheds: body.sheds } : {}),
  };
  const attitude: AttitudeDef[] = [
    { id: 'programme', label: 'Tilt programme', hold: { programme: tr.tilt, azimuth: tr.azimuth }, source: tr.tilt.source },
    { id: 'retro', label: 'Retro attitude', hold: { retro: tr.retro.pitch }, source: tr.retro.pitch.source },
    {
      id: 'blunt',
      label: 'Heat shield first',
      hold: { blunt: true, ...(body?.capsule.earthward ? { earthward: body.capsule.earthward } : {}) },
      source: 'the capsule comes down heat shield first',
    },
  ];
  const events: EventDef[] = [
    {
      id: 'ignition',
      label: 'Ignition',
      when: [{ time: 0 }],
      do: [{ ignite: 'main' }],
      automatic: true,
      source: 'the clock starts with the engine',
    },
    {
      id: 'cutoff',
      label: 'Cutoff',
      when: atTime(e.cutoff),
      do: [{ cut: 'main' }],
      automatic: true,
      at: e.cutoff,
      source: e.cutoff.source,
    },
  ];
  if (body?.tower)
    events.push({
      id: 'tower',
      label: 'Tower jettisoned',
      when: atTime(body.tower.at),
      do: [{ separate: 'tower' }],
      automatic: true,
      at: body.tower.at,
      source: body.tower.at.source,
    });
  events.push(
    {
      id: 'separation',
      label: 'Capsule separation',
      when: atTime(sep.at),
      do: [{ separate: 'separation' }, { attitude: 'retro' }],
      automatic: true,
      at: sep.at,
      source: sep.at.source,
    },
    // the retrorockets' sequence: begun with the first, each other so long after it (a hand may begin it at any time)
    ...tr.retro.fires.map(
      (f, k): EventDef => ({
        id: k === 0 ? 'retro' : `retro-${k + 1}`,
        label: k === 0 ? 'Retrorocket sequence: the first fires' : `Retrorocket ${k + 1} fires`,
        when: k === 0 ? atTime(f) : [{ after: 'retro', wait: f.value - tr.retro.fires[0]!.value }],
        do: [{ ignite: `retro-${k + 1}` }],
        automatic: true,
        at: f,
        source: f.source,
      }),
    ),
    {
      id: 'retropack',
      label: 'Retropack jettisoned',
      when: atTime(tr.retropack.at),
      do: [{ separate: 'retropack' }, { attitude: 'blunt' }],
      automatic: true,
      at: tr.retropack.at,
      source: tr.retropack.at.source,
    },
    {
      id: 'drogue',
      label: 'Drogue out',
      when: [{ after: 'separation' }, { height: tr.drogue.altitude.value, going: 'down' }],
      do: [{ deploy: 'drogue' }],
      automatic: true,
      source: tr.drogue.altitude.source,
    },
    {
      id: 'main',
      label: 'Main parachute out',
      when: [{ after: 'drogue' }, { height: tr.main.altitude.value, going: 'down' }],
      do: [{ deploy: 'main' }],
      automatic: true,
      source: tr.main.altitude.source,
    },
  );
  if (body?.escape)
    events.push({
      id: 'abort',
      label: 'Abort',
      when: [{ command: 'abort' }],
      do: [{ cut: 'main' }, { ignite: 'escape' }, { separate: 'separation' }],
      automatic: false,
      source: 'the abort handle, or the sequencer’s abort signal',
    });
  if (body?.escape?.sequence?.retropack)
    events.push({
      id: 'abort-retropack',
      label: 'Retropack dropped as the spacecraft leaves',
      when: [{ after: 'abort' }],
      do: [{ separate: 'retropack' }],
      automatic: true,
      source: body.escape.sequence.ceiling.source,
    });
  return {
    kind: 'ballistic',
    craft: [craft],
    events,
    attitude,
    ...(tr.winds ? { winds: tr.winds } : {}),
    checks: checks.map((c) => ({ ...c, of: 'flight' as const })),
    ...(body?.escape
      ? {
          record: {
            abort: {
              ...(body.escape.sequence ? { sequence: body.escape.sequence } : {}),
              ...(body.escape.record ? { record: body.escape.record } : {}),
            },
          },
        }
      : {}),
  };
}

/** A stage's body, engine, tank and joint id: by its place in the record's list, base first. */
export const stageId = (i: number) => `stage:${i}`;

/** An orbital flight's plan: its stages, drops and spacecraft, the record's sequence, its braking burn, entry and descent. */
export function planOfOrbital(o: OrbitalFlight): FlightPlan {
  const a = o.ascent;
  const last = o.stages.length - 1;
  const d = o.descent;
  const dbodies = d?.bodies ?? [];
  const module = dbodies[0];
  const bodies: BodyDef[] = o.stages.map((s, i) => ({
    id: stageId(i),
    label: s.name,
    count: s.count,
    mass: s.count === 1 ? s.mass : derived(s.count * s.mass.value, `${s.count} of ${s.mass.value} kg`),
    dry: s.count === 1 ? s.dry : derived(s.count * s.dry.value, `${s.count} of ${s.dry.value} kg`),
    nodes: s.nodes,
  }));
  for (const x of a?.drops ?? []) bodies.push({ id: x.id, label: x.id, count: 1, mass: x.mass });
  bodies.push({
    id: 'instrument',
    label: 'Instrument module',
    count: 1,
    mass: derived(o.mass.value - o.entry.mass.value, 'the spacecraft in orbit less what comes down'),
  });
  const entryAero = {
    area: o.entry.area,
    drag: o.entry.drag,
    ...(module ? { dragArea: module.dragArea } : {}),
    ...(o.supplies ? { rarefied: o.supplies.rarefied } : {}),
  };
  if (module)
    for (const b of dbodies)
      bodies.push({
        id: b.id,
        label: b.label,
        count: 1,
        mass: b.mass,
        aero: b === module ? entryAero : { area: o.entry.area, drag: o.entry.drag, dragArea: b.dragArea },
        ...(b.thrown ? { thrown: b.thrown } : {}),
      });
  else bodies.push({ id: 'module', label: 'Descent module', count: 1, mass: o.entry.mass, aero: entryAero });
  const below = (i: number) => o.stages.slice(0, i + 1).map((_, j) => stageId(j));
  const covered = dbodies.length ? dbodies.map((b) => b.id) : ['module'];
  const joints: JointDef[] = o.stages.flatMap((s, i): JointDef[] =>
    s.separation
      ? [
          {
            id: stageId(i),
            label: i === last ? 'Spacecraft separation' : `${s.name.split(',')[0]} let go`,
            // a stage let go takes every stage below it that is still on (the strap-ons hang on the core)
            gone: below(i),
            at: s.separation,
            ...(o.stages[i + 1]?.hot ? { hot: { engine: stageId(i + 1), ...o.stages[i + 1]!.hot! } } : {}),
          },
        ]
      : [],
  );
  for (const x of a?.drops ?? [])
    joints.push({
      id: x.id,
      label: `The ${x.id} let go`,
      gone: [x.id],
      at: x.at,
      ...(x.q ? { q: x.q } : {}),
      ...(x.covers ? { covers: ['instrument', ...covered], holds: [stageId(last)] } : {}),
    });
  joints.push({ id: 'modules', label: 'The modules part', gone: ['instrument'], at: o.entry.separation, after: o.entry.mass });
  for (const b of dbodies.slice(1))
    joints.push({ id: b.id, label: `${b.label} leaves`, gone: [b.id], ...(b.thrown ? { push: b.thrown } : {}) });
  const engines: EngineDef[] = o.stages.map((s, i) => ({
    id: stageId(i),
    label: s.engine,
    body: stageId(i),
    count: s.count,
    tanks: [stageId(i)],
    thrust: s.thrust,
    isp: s.isp,
    ...(s.exitArea ? { exitArea: s.exitArea } : {}),
    kind: 'liquid',
    ...(s.throttle ? { throttle: { curve: s.throttle } } : {}),
    starts: s.start ?? { count: 1, ground: false, confidence: 'estimated', source: 'not given: started once, anywhere' },
  }));
  engines.push({
    id: 'braking',
    label: 'Braking engine',
    body: 'instrument',
    count: 1,
    tanks: [],
    thrust: { vacuum: o.manual?.thrust ?? derived(0, 'not given: the record’s burn is flown as its impulse, evenly') },
    kind: 'liquid',
    starts: { count: 1, ground: false, confidence: 'documented', source: 'fired once, on the way down' },
    ...(o.manual ? { deltaV: o.manual.deltaV } : {}),
    flown: o.retro.deltaV,
  });
  const tanks: TankDef[] = o.stages.map((s, i) => ({
    id: stageId(i),
    label: `${s.name.split(',')[0]} propellant`,
    body: stageId(i),
    load: s.count === 1 ? s.propellant : derived(s.count * s.propellant.value, `${s.count} of ${s.propellant.value} kg`),
    ...(s.usable ? { usable: s.count === 1 ? s.usable : derived(s.count * s.usable.value, `${s.count} of ${s.usable.value} kg`) } : {}),
    holds: 'propellant',
  }));
  const thrusters: ThrusterSet[] = [];
  if (a?.steering)
    thrusters.push({
      id: 'steering',
      label: 'Steering',
      body: stageId(0),
      does: ['rotation'],
      mode: 'automatic',
      authority: a.steering.authority,
    });
  if (o.manual)
    thrusters.push({
      id: 'orientation',
      label: 'Orientation by hand',
      body: 'instrument',
      does: ['rotation'],
      mode: 'manual',
      rate: o.manual.rate,
    });
  const chutes: ChuteDef[] = dbodies.flatMap((b) =>
    b.chutes.map(
      (c): ChuteDef => ({
        id: chuteEvent(b.id, c.name),
        label: c.name,
        body: b.id,
        dragArea: c.dragArea,
        fills: c.fills,
        ...(c.instead ? { instead: c.instead.map((x) => chuteEvent(b.id, x)) } : {}),
        ...(c.replaces ? { replaces: c.replaces } : {}),
        ...(c.strength ? { strength: c.strength } : {}),
        ...(c.pull ? { pull: c.pull } : {}),
      }),
    ),
  );
  const limits: LimitDef[] = [];
  if (a?.limits)
    limits.push({ of: 'qAlpha', value: a.limits.qAlpha, at: stageId(0) }, { of: 'axial', value: a.limits.axial, at: stageId(0) });
  if (d?.crew)
    limits.push(
      { of: 'landing-speed', value: d.crew.landing.aboard, at: 'aboard' },
      { of: 'landing-speed', value: d.crew.landing.alone, at: 'alone' },
      { of: 'blast', value: d.crew.blast },
      { of: 'fastest', value: d.crew.fastest },
    );
  const craft: Craft = {
    id: 'stack',
    label: 'The stack',
    mass: o.liftoffMass,
    bodies,
    joints,
    engines,
    tanks,
    thrusters,
    chutes,
    limits,
    drag: a?.drag ?? [],
    ...(o.heating ? { heating: o.heating } : {}),
    ...(d?.crew ? { crew: d.crew } : {}),
    ...(a?.sheds ? { sheds: a.sheds } : {}),
  };
  const attitude: AttitudeDef[] = [];
  if (a)
    attitude.push({
      id: 'ascent',
      label: 'Steering law',
      hold: { law: a.guidance },
      source: 'sim/staged.ts: a stated law, solved for its targets',
    });
  attitude.push(
    { id: 'free', label: 'Left to itself', hold: { free: true }, source: 'in orbit, its attitude is not flown' },
    {
      id: 'braking',
      label: 'Braking attitude',
      hold: {
        aim: o.retro.aim.along,
        sense: o.retro.aim.sense,
        ...(o.retro.aim.vector ? { vector: o.retro.aim.vector } : {}),
        confidence: o.retro.aim.confidence,
      },
      source: o.retro.aim.source,
    },
  );
  // the record's sequence, as stagedlive.ts's `sequence` gives it: each stage lit (unless at liftoff), cut (where that
  // is not its separation, or on its integrator's velocity), let go; each drop
  const events: EventDef[] = [
    {
      id: 'liftoff',
      label: 'Liftoff',
      when: [{ time: 0 }],
      do: o.stages.flatMap((s, i) => (s.ignition.value > 0 ? [] : [{ ignite: stageId(i) }])),
      automatic: true,
      source: 'the clock starts with the first engines',
    },
  ];
  // turned to its braking attitude at the record's orientation, where it has one, or as the engine lights
  const oriented = o.events.find((e) => e.id === 'orientation')?.at ?? o.retro.on;
  const record = (at: Measure) => {
    const e = o.events.find((x) => Math.abs(x.at.value - at.value) < 1e-6);
    return e ? { record: { id: e.id, label: e.label } } : {};
  };
  const word = (s: string) => s.split(',')[0]!;
  // in the order the record has them, and at one instant: lit, cut, a drop let go, a stage let go (stagedlive.ts's order)
  const sequence: (EventDef & { order: number })[] = [];
  o.stages.forEach((s, i) => {
    const sep = s.separation?.value ?? Infinity;
    if (s.ignition.value > 0)
      sequence.push({
        id: `${stageId(i)}:ignite`,
        label: `Light the ${word(s.name).replace(/^(Third|Second|First) stage$/, (m) => m.toLowerCase())}`,
        when: atTime(s.ignition),
        do: [{ ignite: stageId(i) }],
        automatic: true,
        at: s.ignition,
        ...record(s.ignition),
        source: s.ignition.source,
        order: 0,
      });
    if (i === last || s.cutoff.value < sep - 1e-9) {
      const v = s.velocity;
      sequence.push({
        id: `${stageId(i)}:cut`,
        label: `Cut off the ${word(s.name).toLowerCase()}`,
        when: v ? [{ speed: v.speed.value + (v.over?.value ?? 0), ...(v.apparent ? { apparent: stageId(i) } : {}) }] : atTime(s.cutoff),
        do: [{ cut: stageId(i) }],
        automatic: true,
        at: s.cutoff,
        ...record(s.cutoff),
        source: v ? v.speed.source : s.cutoff.source,
        order: 1,
      });
    }
    if (s.separation)
      sequence.push({
        id: `${stageId(i)}:separate`,
        label:
          i === last
            ? 'Separate the spacecraft'
            : `Drop the ${word(s.name)
                .toLowerCase()
                .replace(/^strap-on boosters$/, 'strap-ons')}`,
        when: atTime(s.separation),
        do: [{ separate: stageId(i) }],
        automatic: true,
        at: s.separation,
        ...record(s.separation),
        source: s.separation.source,
        order: 3,
      });
  });
  for (const x of a?.drops ?? [])
    sequence.push({
      id: `${x.id}:separate`,
      label: `Drop the ${x.id}`,
      when: atTime(x.at),
      do: [{ separate: x.id }],
      automatic: true,
      at: x.at,
      ...record(x.at),
      source: x.at.source,
      order: 2,
    });
  sequence.sort((p, q) => p.at!.value - q.at!.value || p.order - q.order);
  for (const { order: _, ...e } of sequence) events.push(e);
  events.push(
    {
      id: 'braking-attitude',
      label: 'Oriented for the braking burn',
      when: atTime(oriented),
      do: [{ attitude: 'braking' }],
      automatic: true,
      at: oriented,
      source: oriented.source,
    },
    {
      id: 'retro-on',
      label: 'Braking engine on',
      when: atTime(o.retro.on),
      do: [{ ignite: 'braking' }],
      automatic: true,
      at: o.retro.on,
      source: o.retro.on.source,
    },
    {
      id: 'retro-off',
      label: 'Braking engine off',
      when: atTime(o.retro.off),
      do: [{ cut: 'braking' }],
      automatic: true,
      at: o.retro.off,
      source: o.retro.off.source,
    },
    {
      id: 'modules',
      label: 'The modules part',
      when: atTime(o.entry.separation),
      do: [{ separate: 'modules' }],
      automatic: true,
      at: o.entry.separation,
      source: o.entry.separation.source,
    },
    {
      id: 'ejection',
      label: 'Ejection',
      when: [{ after: 'modules' }, { height: o.ejection.altitude.value, going: 'down' }],
      do: dbodies.slice(1).flatMap((b) => ((b.with ?? ['ejection']).includes('ejection') ? [{ separate: b.id }] : [])),
      automatic: true,
      source: o.ejection.altitude.source,
    },
  );
  for (const b of dbodies)
    for (const c of b.chutes) {
      const id = chuteEvent(b.id, c.name);
      const leaving = dbodies.slice(1).filter((x) => x.with?.includes(id));
      events.push({
        id,
        label: `${b.label}: ${c.name}`,
        when: [
          ...(b === module ? [{ after: 'modules' }] : [{ after: 'ejection' }]),
          ...(c.altitude ? [{ height: c.altitude.value, going: 'down' as const }] : []),
          ...(c.after ? [{ after: 'ejection', wait: c.after.value }] : []),
        ],
        do: [{ deploy: id }, ...leaving.map((x) => ({ separate: x.id }))],
        automatic: true,
        source: (c.altitude ?? c.after)?.source ?? 'with what it follows',
      });
    }
  // the record's own events at the instants the plan's others are set off at (the braking burn, the modules' parting)
  for (const e of events) if (e.at && !e.record) Object.assign(e, record(e.at));
  // (an instant is an event's only where the clock sets it off: one a stage is cut at on its velocity stays a mark, the record's instant of what the integrator did)
  const actionAt = new Set(events.flatMap((e) => (e.at && e.when.some((w) => 'time' in w) ? [e.at.value] : [])));
  const checks: PlanCheck[] = [
    ...(a?.checks ?? []).map((c): PlanCheck => ({ ...c, of: 'ascent', ...ascentWhen(c.id, o) })),
    ...o.checks.map((c): PlanCheck => ({ ...c, of: 'orbit' })),
    ...(d?.checks ?? []).map((c): PlanCheck => ({ ...c, of: 'descent' })),
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
      ...(o.supplies ? { supplies: o.supplies.days } : {}),
      ...(d ? { ground: d.ground, ...(d.torn ? { torn: d.torn } : {}), ...(d.automatic ? { automatic: d.automatic } : {}) } : {}),
      ...(o.manual ? { manual: { code: o.manual.code, ...(o.manual.periods ? { periods: o.manual.periods } : {}) } } : {}),
      ...(a?.aborts ? { aborts: a.aborts } : {}),
      ...(a?.centre ? { centre: a.centre } : {}),
      marks: o.events
        .filter((e) => !actionAt.has(e.at.value))
        .map((e) => ({ id: e.id, label: e.label, at: e.at, ...(e.also ? { also: e.also } : {}) })),
    },
  };
}

/** Where an ascent check is read, for the ones that are not an event's state or the summary's own result. */
function ascentWhen(id: string, o: OrbitalFlight): Pick<PlanCheck, 'when'> {
  const n = o.stages.length;
  if (id === 'minuteG') return { when: { at: 60, reading: 'g' } };
  if (id === 'firstG') return { when: { most: 'g', aboard: [stageId(0)] } };
  if (id === 'coreG' && n > 2) return { when: { most: 'g', aboard: [stageId(1)], gone: [stageId(0)] } };
  if (id === 'lastG') return { when: { most: 'g', burning: stageId(n - 1) } };
  return {};
}

/** Every mass a plan's first craft carries, kg: its bodies' sum (which the record's liftoff figure need not equal). */
export const bodiesMass = (plan: FlightPlan): number => sum(plan.craft[0]!.bodies.map((b) => b.mass.value));
