/**
 * A Saturn V flight's plan (sim/plan.ts), written from its record (saturn-v-record.ts `SaturnVRecord`, the flight's
 * orbital.ts): the S-IC's five F-1s, the centre cut early; the S-II's five J-2s, its centre cut as the flight had it and the
 * four outboard shifting their mixture ratio, cut at the record's instant or, where the record has them cut by the stage's
 * depletion sensors, when the run's own propellant is spent (`siiSpent`: an S-II that lost its centre early burns longer); the S-II's aft interstage let go at the second plane and the escape tower
 * after it; the S-IVB's first burn to the parking orbit, cut by its guidance on the orbit reached; the coast, the stack held
 * level by the S-IVB's own attitude jets; and the S-IVB lit again for the translunar injection, steered by a law of its
 * own (sim/orbital.ts `Guidance.injection`) and cut by its guidance on its speed. The ascent is the stated law, as every
 * flight's into orbit (sim/staged.ts): the S-IC's tilt programme is not in anything read, and the iterative guidance's
 * closed loop is the law's linear tangent from the instant it began.
 *
 * The run ends with the S-IVB's second cutoff: the stack, whole, then coasts on toward the Moon, which pulls on it
 * (`FlightPlan.gravity`). What the crew did next (the transposition, the lunar module drawn out, the S-IVB sent past the
 * Moon) is not flown. Nothing here names a flight: each figure is the record's.
 */
import { type Confidence, derived, doc, estimated, type Measure, measure } from '../../../../src/measure.ts';
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
  Trigger,
} from '../../../../src/sim/plan.ts';
import { integral } from '../../../../src/sim/staged.ts';
import type { ShedBody } from '../../../../src/types.ts';
import { G0, P0 } from '../../../../src/world/bodies.ts';
import { cmAero } from './command-module-aero.ts';
import type { F1Figures, J2Figures, MixtureShift, SaturnVRecord, SiiMatch } from './saturn-v-record.ts';

const IN = 0.0254;

/**
 * The flown model's stations, inches up from the F-1s' exits (saturn_v.py, saturn-v.md): where each piece that leaves
 * begins and ends, for what is shed (sim/shed.ts). The model's own, so `estimated` where the model is.
 */
export const STATIONS = {
  firstTop: 1564 + 115,
  collarTop: 1760 + 115,
  secondTop: 2519 + 115,
  taperTop: 2519 + 115 + 19 * 12,
  thirdTop: 3222 + 115,
  slaTop: 3222 + 115 + 36 + 28 * 12,
  tip: 363 * 12,
};
export const LOWER = 198 * IN;
const MODEL = 'saturn_v.py and saturn-v.md, the model’s stations (inches above the F-1 exits)';

/** An F-1 as the plan flies it: the record's sea-level thrust and impulse, and in vacuum what its exit area adds at one atmosphere. */
function f1(id: string, label: string, count: number, f: F1Figures, decay?: Measure): EngineDef {
  const lift = f.exitArea.value * P0;
  const vacuum = f.thrust.value + lift;
  const how = `the sea-level figure (${f.thrust.source}) and one atmosphere on the exit (${f.exitArea.source})`;
  return {
    id,
    label,
    body: 'sic',
    count,
    tanks: ['sic-propellant'],
    kind: 'liquid',
    thrust: { seaLevel: f.thrust, vacuum: derived(vacuum, `${how}: thrust in vacuum`) },
    isp: { seaLevel: f.isp, vacuum: derived((f.isp.value * vacuum) / f.thrust.value, `${how}: the same flow at the vacuum thrust`) },
    exitArea: f.exitArea,
    starts: {
      count: 1,
      ground: true,
      confidence: 'documented',
      source: 'MSFC-MAN-503, §IV: the F-1s were started on the pad by ground equipment',
    },
    burns: 'kerosene-lox',
    ...(decay ? { decay } : {}),
  };
}

/** The weaker of two confidences, for a figure made from both. */
const weaker = (a: Confidence, b: Confidence): Confidence => {
  const order: Confidence[] = ['documented', 'derived', 'assumed', 'estimated'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))]!;
};

/** A J-2 as the plan flies it, its thrust and flow held at the record's share after a mixture-ratio shift. */
export function j2(
  id: string,
  label: string,
  body: string,
  tank: string,
  count: number,
  f: J2Figures,
  shift: MixtureShift | undefined,
  more: Partial<EngineDef> = {},
  decay?: Measure,
): EngineDef {
  const step = (before: Measure, after: Measure): [number, number][] =>
    shift
      ? [
          [0, before.value],
          [shift.at.value, before.value],
          [shift.at.value + 0.01, after.value],
        ]
      : [];
  return {
    id,
    label,
    body,
    count,
    tanks: [tank],
    kind: 'liquid',
    thrust: { vacuum: f.thrust },
    isp: { vacuum: f.isp },
    ...(shift
      ? {
          throttle: {
            curve: {
              points: step(shift.before, shift.after),
              confidence: shift.before.confidence === 'documented' ? shift.after.confidence : shift.before.confidence,
              source: `before the shift: ${shift.before.source}; after it: ${shift.after.source}; the shift at ${shift.at.source}. ${shift.flow ? 'The thrust’s share: the flow’s is its own' : 'Thrust and flow held at one share, the impulse unchanged'}`,
            },
            ...(shift.flow
              ? {
                  flow: {
                    points: step(shift.before, shift.flow),
                    confidence: shift.before.confidence === 'documented' ? shift.flow.confidence : shift.before.confidence,
                    source: `the flow's share: before the shift as the thrust's (${shift.before.source}); after it ${shift.flow.source}, so that the impulse after it is the thrust's share over this, ${((shift.after.value / shift.flow.value) * f.isp.value).toFixed(1)} s`,
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(decay ? { decay } : {}),
    starts: {
      count: 1,
      ground: false,
      confidence: 'documented',
      source: 'MSFC-MAN-503, §VI and §VII: lit in flight by the switch selector',
    },
    burns: 'hydrogen-lox',
    ...more,
  };
}

/**
 * The S-II's J-2s' figures as flown: the record's, times the trajectory match's adjustment where the record has one
 * (`SaturnVRecord.sii.match`): the thrust by its factor and the flow by its own, and the low ratio's shares by the low
 * ratio's factors.
 */
export function siiFigures(o: SaturnVRecord): { centre: J2Figures; outboard: J2Figures; shift: MixtureShift | undefined } {
  const s2 = o.sii;
  const m: SiiMatch | undefined = s2.match;
  const shift = s2.outboard.shift;
  if (!m) return { centre: s2.centre, outboard: s2.outboard, shift };
  const times = (x: Measure, by: number, what: string, of: Measure[]): Measure =>
    measure(
      x.value * by,
      of.reduce<Confidence>((c, y) => weaker(c, y.confidence), x.confidence === 'documented' ? 'derived' : x.confidence),
      `${x.source}; times ${by.toFixed(5)}, ${what}`,
    );
  const high = (f: J2Figures): J2Figures => ({
    thrust: times(f.thrust, m.high.thrust.value, `the trajectory match's factor on the thrust (${m.high.thrust.source})`, [m.high.thrust]),
    isp: times(
      f.isp,
      m.high.thrust.value / m.high.flow.value,
      `the match's factor on the thrust over its factor on the flow (${m.high.flow.source})`,
      [m.high.thrust, m.high.flow],
    ),
  });
  const low = m.low;
  return {
    centre: high(s2.centre),
    outboard: high(s2.outboard),
    shift:
      shift && low
        ? {
            ...shift,
            after: times(shift.after, low.thrust.value, `the match's factor on the low ratio's thrust share (${low.thrust.source})`, [
              low.thrust,
            ]),
            ...(shift.flow
              ? {
                  flow: times(shift.flow, low.flow.value, `the match's factor on the low ratio's flow share (${low.flow.source})`, [
                    low.flow,
                  ]),
                }
              : {}),
          }
        : shift,
  };
}

/** The S-II's two engines as the plan flies them (the centre and the four), lit at the record's mainstage. */
export function siiEngines(o: SaturnVRecord): { centre: EngineDef; outboard: EngineDef; lit: Measure } {
  const s2 = o.sii;
  const { centre, outboard, shift } = siiFigures(o);
  return {
    centre: j2('j2-centre', 'Centre J-2', 'sii', 'sii-propellant', 1, centre, shift, {}, s2.decay?.centre),
    outboard: j2('j2-outboard', 'Four outboard J-2s', 'sii', 'sii-propellant', 4, outboard, shift, {}, s2.decay?.outboard),
    lit: s2.ignition,
  };
}

const at = (time: Measure): Trigger[] => [{ time: time.value }];

/** One of the record's events, set off by the clock at its instant unless `trigger` says otherwise: the instant is a figure the run is held to. */
export const event = (id: string, label: string, when: Measure, does: EventDef['do'], trigger: Trigger[] = at(when)): EventDef => ({
  id,
  label,
  when: trigger,
  do: does,
  automatic: true,
  at: when,
  record: { id, label },
  source: when.source,
});

/**
 * When the S-II's propellant is spent, s from liftoff: its usable load over what its five J-2s draw, the centre to its cut
 * and the four to the end, each at its thrust over its impulse (sim/staged.ts `flowOf`) and its share after the
 * mixture-ratio shift. The instant sim/staged.ts `schedule` finds the tank dry at with no cut of the four's own
 * (tests/plan.test.mjs holds the two together): where the record has the four cut by the stage's depletion sensors
 * (`sii.outboard.spent`), the run cuts them here and not at the record's instant.
 */
export function siiSpent(o: SaturnVRecord): number {
  const s2 = o.sii;
  const { centre, outboard, lit } = siiEngines(o);
  // what each draws from its lighting to t: its rated flow at its flow's shares (sim/staged.ts `integral`, as `schedule` has it)
  const drawn = (e: EngineDef, t: number) =>
    ((e.count * e.thrust.vacuum.value) / (G0 * e.isp!.vacuum.value)) * integral(e.throttle?.flow ?? e.throttle?.curve, lit.value, t);
  const burned = (t: number) => drawn(centre, Math.min(t, s2.centre.cut.value)) + drawn(outboard, t);
  const load = s2.propellant.usable.value;
  let [lo, hi] = [lit.value, lit.value + 3600];
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (burned(mid) < load) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * What the stack flying on gains from the S-II's ullage motors as the S-IC leaves, m/s: their impulse over its mass then,
 * all that is above the S-IC as it stood on the pad (none of it has burned yet).
 */
function ullageAhead(o: SaturnVRecord, impulse: Measure): Measure {
  const parts = [o.sii.mass, o.sii.skirt.mass, o.les.mass, o.sivb.mass, ...(o.sivb.payload ? [o.sivb.payload.mass] : []), o.csm.mass];
  const mass = parts.reduce((sum, m) => sum + m.value, 0);
  return derived(
    impulse.value / mass,
    `m/s: the S-II's ullage motors' impulse (${impulse.source}) over the stack above the S-IC, ${(mass / 1000).toFixed(1)} t (the record's masses at first motion: the S-II, its aft interstage, the tower, the S-IVB with what it carries and the command and service modules)`,
  );
}

/** What leaves, as a body of its own (sim/shed.ts): the model's stretch of the stack, its radius, and a shell's figures for the rest. */
export function shed(on: string, name: string, mass: Measure, from: number, to: number, radius: number, forward = false): ShedBody {
  const a = derived(from * IN, MODEL);
  const b = derived(to * IN, MODEL);
  const length = (to - from) * IN;
  return {
    on,
    name,
    mass,
    from: a,
    to: b,
    radius: derived(radius, MODEL),
    centre: estimated(((from + to) / 2) * IN, `${MODEL}: half way along it`),
    gyration: {
      roll: estimated(radius * 0.78, 'a thin shell of its radius'),
      across: estimated(Math.hypot(length / Math.sqrt(12), radius / Math.sqrt(2)), 'a thin shell of its radius and length'),
    },
    ahead: estimated(Math.PI * radius * radius, 'its disc, at 1.0'),
    astern: estimated(Math.PI * radius * radius, 'its disc, at 1.0'),
    side: { from: a, to: b, dragArea: estimated(2 * radius * length, 'its side, length by diameter, at 1.0') },
    ...(forward ? { forward: true } : {}),
  };
}

export function saturnVPlan(o: SaturnVRecord): FlightPlan {
  const s1 = o.sic;
  const s2 = o.sii;
  const s3 = o.sivb;
  // (the four cut by the stage's depletion sensors, where the record has it so: at the run's own instant of it, and what the
  // instrument unit timed from that cutoff at the record's intervals after it: each event's instant is then the run's, derived,
  // and the record's is a figure in its source and in the checks)
  const spent = s2.outboard.spent ? siiSpent(o) : null;
  const cutAt =
    spent === null
      ? s2.outboard.cut
      : derived(
          spent,
          `the S-II's usable propellant spent (saturn-v-plan.ts siiSpent), where the record has the four cut ${s2.outboard.spent}: its instant, ${s2.outboard.cut.value} s (${s2.outboard.cut.source}), a figure the run is held to`,
        );
  const fromCut = (m: Measure): Measure =>
    spent === null
      ? m
      : derived(
          spent + m.value - s2.outboard.cut.value,
          `the S-II's outboard cutoff as the run has it, and the record's ${(m.value - s2.outboard.cut.value).toFixed(2)} s after it to this, as the instrument unit timed it from that cutoff: the record's instant, ${m.value} s (${m.source}), a figure the run is held to`,
        );
  const sii = siiEngines(o);
  const bodies: BodyDef[] = [
    { id: 'sic', label: 'S-IC, the first stage', count: 1, mass: s1.mass, nodes: ['SaturnFirstStage'] },
    { id: 'sii-skirt', label: 'S-II aft interstage', count: 1, mass: s2.skirt.mass, nodes: ['LowerInterstage'] },
    { id: 'sii', label: 'S-II, the second stage', count: 1, mass: s2.mass, nodes: ['SaturnSecondStage'] },
    { id: 'les', label: 'Launch escape tower and boost cover', count: 1, mass: o.les.mass, nodes: ['LaunchEscape'] },
    { id: 'sivb', label: 'S-IVB, the instrument unit and the adapter', count: 1, mass: s3.mass, nodes: ['SaturnThirdStage'] },
    ...(s3.payload ? [{ id: 'payload', label: s3.payload.label, count: 1, mass: s3.payload.mass, nodes: s3.payload.nodes }] : []),
    {
      id: 'sm',
      label: 'Service module',
      count: 1,
      mass: derived(o.csm.mass.value - o.csm.cm.value, `${o.csm.mass.source}, less the command module (${o.csm.cm.source})`),
      nodes: ['ServiceModule'],
    },
    { id: 'cm', label: 'Command module', count: 1, mass: o.csm.cm, nodes: ['CommandModule'], aero: cmAero() },
  ];
  const joints: JointDef[] = [
    // (the S-II's J-2s stand in the closed interstage over the S-IC, and the S-IVB's in the one over the S-II: neither joint
    // was hot-staged, and an engine lit above one while it holds fires into it: plan.ts `JointDef.closed`)
    {
      id: 'sic-separation',
      label: 'S-IC/S-II separation',
      gone: ['sic'],
      at: s1.separation,
      push: s1.push,
      ...(s1.ullage ? { ahead: ullageAhead(o, s1.ullage) } : {}),
      closed: { engines: ['j2-centre', 'j2-outboard'] },
    },
    { id: 'sii-skirt', label: 'S-II aft interstage jettison', gone: ['sii-skirt'], at: s2.skirt.at },
    { id: 'les-jettison', label: 'Launch escape tower jettison', gone: ['les'], at: o.les.at },
    {
      id: 'sii-separation',
      label: 'S-II/S-IVB separation',
      gone: ['sii'],
      at: fromCut(s2.separation),
      push: s2.push,
      closed: { engines: ['sivb-j2', 'sivb-tli'] },
    },
  ];
  const engines: EngineDef[] = [
    f1('f1-centre', 'Centre F-1', 1, s1.f1, s1.decay?.centre),
    f1('f1-outboard', 'Four outboard F-1s', 4, s1.f1, s1.decay?.outboard),
    sii.centre,
    sii.outboard,
    j2('sivb-j2', 'S-IVB J-2', 'sivb', 'sivb-propellant', 1, s3.first, undefined),
    j2('sivb-tli', 'S-IVB J-2 relit', 'sivb', 'sivb-propellant', 1, s3.second, s3.second.shift, {
      again: 'sivb-j2',
      starts: {
        count: 1,
        ground: false,
        confidence: 'documented',
        source: 'MSFC-MAN-503, §VII: the J-2 of the S-IVB restarted once in orbit, after its start tank was recharged',
      },
    }),
  ];
  const tanks: TankDef[] = [
    { id: 'sic-propellant', label: 'S-IC RP-1 and liquid oxygen', body: 'sic', holds: 'propellant', ...s1.propellant },
    { id: 'sii-propellant', label: 'S-II liquid hydrogen and oxygen', body: 'sii', holds: 'propellant', ...s2.propellant },
    { id: 'sivb-propellant', label: 'S-IVB liquid hydrogen and oxygen', body: 'sivb', holds: 'propellant', ...s3.propellant },
  ];
  const thrusters: ThrusterSet[] = [
    { id: 'saturn-steering', label: 'Steering', body: 'sivb', does: ['rotation'], mode: 'automatic', authority: o.ascent.steering },
    {
      id: 'sivb-aps',
      label: 'S-IVB attitude jets',
      body: 'sivb',
      does: ['rotation'],
      mode: 'automatic',
      authority: s3.jets,
      coasting: true,
    },
  ];
  const sheds: ShedBody[] = [
    shed(
      'sic-separation',
      'S-IC',
      derived(s1.mass.value - s1.propellant.usable.value, `${s1.mass.source}, less its usable propellant`),
      0,
      STATIONS.firstTop,
      LOWER,
    ),
    shed('sii-skirt', 'S-II aft interstage', s2.skirt.mass, STATIONS.firstTop, STATIONS.collarTop, LOWER),
    {
      ...shed('les-jettison', 'Escape tower and boost cover', o.les.mass, STATIONS.slaTop + 162, STATIONS.tip, 78 * IN, true),
      motors: [{ name: 'Tower jettison motor', thrust: o.les.motor.thrust, burn: o.les.motor.burn }],
    },
    shed(
      'sii-separation',
      'S-II',
      derived(s2.mass.value - s2.propellant.usable.value, `${s2.mass.source}, less its usable propellant`),
      STATIONS.collarTop,
      STATIONS.taperTop,
      LOWER,
    ),
  ];
  const events: EventDef[] = [
    event('liftoff', 'Liftoff', doc(0, 'range zero'), [{ ignite: 'f1-centre' }, { ignite: 'f1-outboard' }]),
    event('sic-centre-cutoff', 'S-IC centre engine cutoff', s1.centreCut, [{ cut: 'f1-centre' }]),
    event('sic-outboard-cutoff', 'S-IC outboard engines cutoff', s1.outboardCut, [{ cut: 'f1-outboard' }]),
    event('sic-separation', 'S-IC/S-II separation', s1.separation, [{ separate: 'sic-separation' }]),
    // (one step each, as the live vehicle's sequence takes them: the four, then the centre, at the one instant)
    event('sii-ignition', 'S-II ignition: the four outboard J-2s', sii.lit, [{ ignite: 'j2-outboard' }]),
    event('sii-centre-ignition', 'S-II ignition: the centre J-2', sii.lit, [{ ignite: 'j2-centre' }]),
    event('sii-skirt', 'S-II aft interstage jettison', s2.skirt.at, [{ separate: 'sii-skirt' }]),
    event('les-jettison', 'Launch escape tower jettison', o.les.at, [{ separate: 'les-jettison' }]),
    event('sii-centre-cutoff', `S-II centre engine cutoff${s2.centre.why ? ` (${s2.centre.why})` : ''}`, s2.centre.cut, [
      { cut: 'j2-centre' },
    ]),
    event('sii-outboard-cutoff', 'S-II outboard engines cutoff', cutAt, [{ cut: 'j2-outboard' }]),
    event('sii-separation', 'S-II/S-IVB separation', fromCut(s2.separation), [{ separate: 'sii-separation' }]),
    event('sivb-ignition', 'S-IVB ignition', fromCut(s3.first.ignition), [{ ignite: 'sivb-j2' }]),
    // (the guidance's own cutoff: where the orbit reached is the published one; the record's instant is a figure the run is held to)
    event('sivb-cutoff', 'S-IVB cutoff: parking orbit', s3.first.cutoff, [{ cut: 'sivb-j2' }], [{ orbit: 'published' }]),
    event('tli-ignition', 'S-IVB lit again: translunar injection', s3.second.ignition, [{ ignite: 'sivb-tli' }]),
    // (cut on its speed, as its guidance cut it; the record's instant a figure)
    event('tli-cutoff', 'S-IVB cutoff: translunar injection', s3.second.cutoff, [{ cut: 'sivb-tli' }], [{ speed: s3.second.speed.value }]),
  ];
  const attitude: AttitudeDef[] = [
    {
      id: 'steering-law',
      label: 'Steering law',
      hold: {
        law: {
          ...o.ascent.guidance,
          injection: { engine: 'sivb-tli', align: s3.second.align, target: s3.second.target },
        },
      },
      source: 'sim/staged.ts: a stated law, solved for its targets; the injection solved for its own',
    },
  ];
  const craft: Craft = {
    id: 'saturn-v',
    label: o.label,
    mass: o.liftoff,
    bodies,
    joints,
    engines,
    tanks,
    thrusters,
    chutes: [],
    limits: [],
    // (the S-IC's base pushes until its outboard engines stop: the record's instant)
    drag: o.ascent.drag.map(({ base, ...d }) => (base ? { ...d, base: { ...base, until: s1.outboardCut } } : d)),
    rarefied: o.ascent.rarefied,
    sheds,
    lands: { on: 'sea', ship: 'the command module' },
  };
  return {
    kind: 'orbital',
    craft: [craft],
    events,
    attitude,
    gravity: { central: 'earth', terms: ['j2', 'moon'] },
    checks: o.checks,
    record: {
      orbit: o.orbit,
      coastFixes: o.coastFixes,
      aborts: o.aborts,
      marks: o.marks,
      ...(o.bound ? { bound: o.bound } : {}),
      centre: o.ascent.centre,
    },
  };
}
