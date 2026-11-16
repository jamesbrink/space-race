/**
 * A Vostok flight's plan (src/sim/plan.ts), written from its record (`VostokRecord`, vostok-record.ts: the flight's orbital.ts, on the
 * 8K72K's and the 3KA's figures): its stages, drops and spacecraft, the record's sequence, its braking burn, entry and
 * descent. Every figure is carried over as the record has it, with its confidence and source; where the plan wants one
 * the record does not give, it is worked from those it does, `derived`, and says how. The ids are this module's: a
 * stage's body, engine, tank and joint are `stage:<i>` (base first), a descent parachute is `<body>/<name>`.
 */
import { derived, estimated, type Measure } from '../../../../src/measure.ts';
import { chuteEvent } from '../../../../src/sim/orbital.ts';
import type { VostokRecord } from './vostok-record.ts';
import { SHIP_RAREFIED } from './vostok-3ka.ts';
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
} from '../../../../src/sim/plan.ts';

const atTime = (at: Measure) => [{ time: at.value }];

/** A stage's body, engine, tank and joint id: by its place in the record's list, base first. */
export const stageId = (i: number) => `stage:${i}`;

/** A Vostok flight's plan, from its record. */
export function vostokPlan(o: VostokRecord): FlightPlan {
  const a = o.ascent;
  const last = o.stages.length - 1;
  const d = o.descent;
  const dbodies = d?.bodies ?? [];
  const module = dbodies[0];
  const bodies: BodyDef[] = o.stages.map((s, i) => ({
    id: stageId(i),
    label: s.name,
    count: s.count,
    mass: s.mass,
    dry: s.dry,
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
    ...(s.nozzle ? { nozzle: s.nozzle } : {}),
    kind: 'liquid',
    ...(s.throttle ? { throttle: { curve: s.throttle } } : {}),
    starts: s.start ?? { count: 1, ground: false, confidence: 'estimated' },
  }));
  engines.push({
    id: 'tdu-1',
    label: 'Braking engine',
    body: 'instrument',
    count: 1,
    tanks: [],
    thrust: { vacuum: o.manual?.thrust ?? derived(0, 'not given: the record’s burn is flown as its impulse, evenly') },
    kind: 'liquid',
    // (only its fire reads this: viewer/plume.ts)
    nozzle: {
      exit: estimated(
        4_390,
        'not found for the TDU-1: taken as the RD-0109’s, a few hundredths of an atmosphere, as any engine made to fire above the air leaves its gas at; it fires only there, where its jet is drawn as wide as a jet is drawn whatever this is',
      ),
    },
    starts: { count: 1, ground: false, confidence: 'documented', source: 'fired once, on the way down' },
    ...(o.manual ? { deltaV: o.manual.deltaV } : {}),
    flown: o.retro.deltaV,
  });
  const tanks: TankDef[] = o.stages.map((s, i) => ({
    id: stageId(i),
    label: `${s.name.split(',')[0]} propellant`,
    body: stageId(i),
    load: s.propellant,
    ...(s.usable ? { usable: s.usable } : {}),
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
      id: 'orientation-system',
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
    id: 'vostok-8k72k',
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
    rarefied: o.rarefied ?? SHIP_RAREFIED,
    ...(d?.crew ? { crew: d.crew } : {}),
    ...(a?.sheds ? { sheds: a.sheds } : {}),
  };
  const attitude: AttitudeDef[] = [];
  if (a)
    attitude.push({
      id: 'steering-law',
      label: 'Steering law',
      hold: { law: a.guidance },
      source: 'sim/staged.ts: a stated law, solved for its targets',
    });
  attitude.push(
    { id: 'left-to-itself', label: 'Left to itself', hold: { free: true }, source: 'in orbit, its attitude is not flown' },
    {
      id: 'braking-aim',
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
  const oriented = o.events.find((e) => e.id === 'sun-orientation')?.at ?? o.retro.on;
  // the braking burn's command (the timer's, where the record has it), the timer that shut the engine down, the ejection
  const command = o.events.find((e) => e.id === 'retro-command');
  const timer = o.events.find((e) => e.id === 'retro-timer');
  const ejected = o.events.find((e) => e.id === 'seat-ejected');
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
  // The braking burn as the record has it: commanded at the record's instant, where it has the command, and then lit, cut
  // and the modules parted, each so long after the one before. Those are the record's instants again, to the bit: the
  // difference of two instants within a factor of two of each other is exact, and so is the sum back. Where the record has
  // the timer that shut the engine down, the command starts it and it comes at its own instant.
  const after = (e: EventDef | undefined, at: Measure) => (e?.at ? [{ after: e.id, wait: at.value - e.at.value }] : atTime(at));
  const commanded: EventDef | undefined = command && {
    id: 'braking-command',
    label: 'Braking engine commanded on',
    when: atTime(command.at),
    do: timer ? [{ arm: 'braking-timer' }] : [],
    automatic: true,
    at: command.at,
    source: command.at.source,
  };
  const on: EventDef = {
    id: 'retro-on',
    label: 'Braking engine on',
    when: after(commanded, o.retro.on),
    do: [{ ignite: 'tdu-1' }],
    automatic: true,
    at: o.retro.on,
    source: o.retro.on.source,
  };
  const off: EventDef = {
    id: 'retro-off',
    label: 'Braking engine off',
    when: after(on, o.retro.off),
    do: [{ cut: 'tdu-1' }],
    automatic: true,
    at: o.retro.off,
    source: o.retro.off.source,
  };
  events.push(
    {
      id: 'braking-attitude',
      label: 'Oriented for the braking burn',
      when: atTime(oriented),
      do: [{ attitude: 'braking-aim' }],
      automatic: true,
      at: oriented,
      source: oriented.source,
    },
    ...(commanded ? [commanded] : []),
    on,
    off,
    ...(timer
      ? [
          {
            id: 'braking-timer',
            label: 'Braking engine shut down by its timer',
            when: atTime(timer.at),
            do: [{ cut: 'tdu-1' }],
            automatic: true,
            at: timer.at,
            source: timer.at.source,
            armed: false as const,
          },
        ]
      : []),
    {
      id: 'modules',
      label: 'The modules part',
      when: after(off, o.entry.separation),
      do: [{ separate: 'modules' }],
      automatic: true,
      at: o.entry.separation,
      source: o.entry.separation.source,
    },
    {
      id: 'seat-ejection',
      label: 'Ejection',
      when: [{ after: 'modules' }, { height: o.ejection.altitude.value, going: 'down' }],
      do: dbodies.slice(1).flatMap((b) => ((b.with ?? ['seat-ejection']).includes('seat-ejection') ? [{ separate: b.id }] : [])),
      automatic: true,
      ...(ejected ? { record: { id: ejected.id, label: ejected.label } } : {}),
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
          ...(b === module ? [{ after: 'modules' }] : [{ after: 'seat-ejection' }]),
          ...(c.altitude ? [{ height: c.altitude.value, going: 'down' as const }] : []),
          ...(c.after ? [{ after: 'seat-ejection', wait: c.after.value }] : []),
        ],
        do: [{ deploy: id }, ...leaving.map((x) => ({ separate: x.id }))],
        automatic: true,
        source: (c.altitude ?? c.after)?.source ?? 'with what it follows',
      });
    }
  // the record's own events at the instants the plan's others are set off at (the braking burn, the modules' parting)
  for (const e of events) if (e.at && !e.record) Object.assign(e, record(e.at));
  // (an instant is an event's only where the clock sets it off, at a time or so long after another: one a stage is cut at
  // on its velocity stays a mark, the record's instant of what the integrator did)
  const actionAt = new Set(events.flatMap((e) => (e.at && e.when.some((w) => 'time' in w || 'after' in w) ? [e.at.value] : [])));
  const checks: PlanCheck[] = [
    ...(a?.checks ?? []).map((c): PlanCheck => ({ ...c, of: 'ascent', ...ascentWhen(c.id, o) })),
    ...o.checks.map(({ at, ...c }): PlanCheck => ({ ...c, of: 'orbit', ...(at === undefined ? {} : { when: { at, reading: 'orbit' } }) })),
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
      ...(o.manual
        ? { manual: { code: o.manual.code, parting: o.manual.parting, ...(o.manual.periods ? { periods: o.manual.periods } : {}) } }
        : {}),
      ...(a?.aborts ? { aborts: a.aborts } : {}),
      ...(a?.centre ? { centre: a.centre } : {}),
      // (a body's landing, by the record's name for it: `<body>-down`)
      marks: o.events
        .filter((e) => !actionAt.has(e.at.value))
        .map((e) => {
          const lands = dbodies.find((b) => e.id === `${b.id}-down`);
          return { id: e.id, label: e.label, at: e.at, ...(e.also ? { also: e.also } : {}), ...(lands ? { lands: lands.id } : {}) };
        }),
    },
  };
}

/** Where an ascent check is read, for the ones that are not an event's state or the summary's own result. */
function ascentWhen(id: string, o: VostokRecord): Pick<PlanCheck, 'when'> {
  const n = o.stages.length;
  if (id === 'minuteG') return { when: { at: 60, reading: 'g' } };
  if (id === 'firstG') return { when: { most: 'g', aboard: [stageId(0)] } };
  if (id === 'coreG' && n > 2) return { when: { most: 'g', aboard: [stageId(1)], gone: [stageId(0)] } };
  if (id === 'lastG') return { when: { most: 'g', burning: stageId(n - 1) } };
  return {};
}
