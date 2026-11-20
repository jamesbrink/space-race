/**
 * A Soyuz flight's plan (src/sim/plan.ts), written from its record (`SoyuzRecord`, soyuz-record.ts: the flight's orbital.ts,
 * on the 11A511's figures and the ship's). The launch vehicle, its sequence, the braking burn's chain, the descent and its
 * bodies are written as every flight on an R-7 has them (vostok-plan.ts `vostokPlan`, given the record in its own shape),
 * and what a Soyuz has beyond a Vostok is laid on that plan here, in data:
 * - three modules: the orbital module, let go with the instrument and propulsion module as the modules part;
 * - one engine, the main engine on the instrument module, drawing on one load of propellant for every burn in orbit and
 *   for the braking burn (`EngineDef.tanks`: what the burns before it used is not there for it, orbital.ts `shipOf`);
 * - each burn in orbit, as Gemini's manoeuvres are flown (orbital.ts `movesOf`): turned to its attitude, lit with its
 *   recorded impulse, cut, and left to itself again;
 * - a descent module that flies its entry on its own lift, trimmed and banked (`AeroDef.lift`, `Hold.bank`).
 * Every figure is carried over as the record has it. The ids are this module's: the main engine and its tank are `skd`,
 * the orbital module's body and joint `orbital-module`, a burn's events `<id>:turn`, `<id>` and `<id>:cut`.
 */
import type { AttitudeDef, BodyDef, EngineDef, EventDef, FlightPlan } from '../../../../src/sim/plan.ts';
import type { Measure } from '../../../../src/types.ts';
import { vostokPlan } from '../../vostok/vehicles/vostok-plan.ts';
import type { VostokRecord } from '../../vostok/vehicles/vostok-record.ts';
import type { SoyuzRecord } from './soyuz-record.ts';

/** The main engine's and its propellant's id. */
export const SKD = 'skd';
/** The orbital module's body and the joint that lets it go. */
export const ORBITAL_MODULE = 'orbital-module';

const atTime = (at: Measure) => [{ time: at.value }];

/** The record in the shape every flight on an R-7 has (vostok-record.ts), for the plan they share. */
export function asVostok(o: SoyuzRecord): VostokRecord {
  const { modules: _m, engine, burns: _b, retro, entry, manual, ...rest } = o;
  return {
    ...rest,
    retro: { on: retro.on, off: retro.off, deltaV: retro.deltaV, aim: retro.aim },
    entry: { separation: entry.separation, mass: entry.mass, area: entry.area, drag: entry.drag },
    manual: { rate: manual.rate, thrust: engine.thrust, deltaV: retro.deltaV, parting: manual.parting },
  };
}

/** A Soyuz flight's plan, from its record. */
export function soyuzPlan(o: SoyuzRecord): FlightPlan {
  const plan = vostokPlan(asVostok(o));
  const c = plan.craft[0]!;
  const byId = <T extends { id: string }>(xs: T[], id: string): T => {
    const x = xs.find((y) => y.id === id);
    if (!x) throw new Error(`the R-7's plan has no '${id}'`);
    return x;
  };

  // the three modules: the orbital module a body of its own, the instrument and propulsion module the record's
  const instrument = byId(c.bodies, 'instrument');
  instrument.label = 'Instrument and propulsion module';
  instrument.mass = o.modules.instrument;
  const orbital: BodyDef = { id: ORBITAL_MODULE, label: 'Orbital module', count: 1, mass: o.modules.orbital };
  c.bodies.splice(c.bodies.indexOf(instrument), 0, orbital);
  for (const j of c.joints) if (j.covers?.includes('instrument')) j.covers = [ORBITAL_MODULE, ...j.covers];
  const modules = byId(c.joints, 'modules');
  c.joints.splice(c.joints.indexOf(modules), 0, {
    id: ORBITAL_MODULE,
    label: 'The orbital module let go',
    gone: [ORBITAL_MODULE],
    at: o.entry.separation,
  });

  // the descent module: its own lift at its trim, flown while a bank is held (orbital.ts `shipPush`)
  const module = c.bodies.find((b) => b.aero && b.id !== ORBITAL_MODULE)!;
  const { passiveSphere: _p, ...air } = module.aero!;
  module.aero = { ...air, lift: o.entry.lift, trim: o.entry.trim };

  // the main engine in place of a Vostok's braking engine: on the instrument module, on its own tank, lit as often as it could be
  const braking = c.engines.find((e) => e.flown)!;
  const skd: EngineDef = {
    id: SKD,
    label: o.engine.name,
    body: 'instrument',
    count: 1,
    tanks: [SKD],
    thrust: { vacuum: o.engine.thrust },
    isp: { vacuum: o.engine.isp },
    kind: 'liquid',
    ...(o.engine.nozzle ? { nozzle: o.engine.nozzle } : braking.nozzle ? { nozzle: braking.nozzle } : {}),
    starts: { count: o.engine.starts.count, ground: false, confidence: o.engine.starts.confidence, source: o.engine.starts.source },
    burns: 'amine-nitric',
    deltaV: o.retro.deltaV,
    flown: o.retro.deltaV,
  };
  c.engines.splice(c.engines.indexOf(braking), 1, skd);
  c.tanks.push({ id: SKD, label: 'Main engine propellant', body: 'instrument', load: o.engine.propellant, holds: 'propellant' });
  for (const e of plan.events)
    e.do = e.do.map((a) =>
      'ignite' in a && a.ignite === braking.id ? { ...a, ignite: SKD } : 'cut' in a && a.cut === braking.id ? { cut: SKD } : a,
    );

  // the burns in orbit and the entry's banks, as attitudes
  const free = plan.attitude.find((a) => 'free' in a.hold)!;
  const aim = plan.attitude.findIndex((a) => a.id === 'braking-aim');
  const burns: AttitudeDef[] = o.burns.map((b) => ({
    id: `${b.id}-attitude`,
    label: b.attitude.label,
    hold: {
      aim: b.attitude.aim,
      sense: b.attitude.sense,
      ...(b.attitude.below ? { below: b.attitude.below } : {}),
      confidence: b.attitude.confidence,
    },
    source: b.attitude.source,
  }));
  const banks: AttitudeDef[] = [
    { id: 'banked-attitude', label: 'Banked for the entry', hold: { bank: o.entry.bank }, source: o.entry.bank.source },
    ...(o.entry.banks ?? []).map(
      (b, i): AttitudeDef => ({ id: `banked-attitude-${i + 2}`, label: b.label, hold: { bank: b.bank }, source: b.bank.source }),
    ),
  ];
  // (the braking attitude stays the last aim: the coast's burn lights in it, orbital.ts `shipOf`)
  plan.attitude.splice(aim, 0, ...burns, ...banks);

  // the events: each burn turned to, lit with its impulse, cut and left to itself; the braking attitude at the record's
  // instant; the orbital module let go as the modules part; the entry banked
  const timed = (id: string, label: string, at: Measure, does: EventDef['do']): EventDef => ({
    id,
    label,
    when: atTime(at),
    do: does,
    automatic: true,
    at,
    source: at.source,
  });
  const moves = o.burns.flatMap((b): EventDef[] => [
    timed(`${b.id}:turn`, `${b.label}: turned to its attitude`, b.turned, [{ attitude: `${b.id}-attitude` }]),
    timed(b.id, b.label, b.on, [{ ignite: SKD, flown: b.deltaV }]),
    timed(`${b.id}:cut`, `${b.label}: engine off`, b.off, [{ cut: SKD }, { attitude: free.id }]),
  ]);
  const oriented = byId(plan.events, 'braking-attitude');
  Object.assign(oriented, { when: atTime(o.retro.turned), at: o.retro.turned, source: o.retro.turned.source });
  // (its record is found again below, at its own instant: the R-7's plan had it turned as the engine lit)
  delete oriented.record;
  plan.events.splice(plan.events.indexOf(oriented), 0, ...moves);
  const parting = byId(plan.events, 'modules');
  parting.do = [{ separate: ORBITAL_MODULE }, ...parting.do];
  plan.events.splice(
    plan.events.indexOf(parting) + 1,
    0,
    timed('entry-bank', 'Banked for the entry', o.entry.banked, [{ attitude: 'banked-attitude' }]),
    ...(o.entry.banks ?? []).map((b, i) => timed(`entry-bank-${i + 2}`, b.label, b.at, [{ attitude: `banked-attitude-${i + 2}` }])),
  );

  // (a drop's words as its name reads, not its id: the escape tower, the aft section)
  for (const x of o.ascent?.drops ?? []) {
    const words = x.id.replaceAll('-', ' ');
    const e = plan.events.find((y) => y.id === `${x.id}:separate`);
    if (e) e.label = `Drop the ${words}`;
    const j = c.joints.find((y) => y.id === x.id);
    if (j) j.label = `The ${words} let go`;
  }

  // the record's own events at the instants these are set off at; the rest stay marks
  const record = plan.record!;
  for (const e of plan.events)
    if (e.at && !e.record) {
      const r = o.events.find((x) => Math.abs(x.at.value - e.at!.value) < 1e-6);
      if (r) e.record = { id: r.id, label: r.label };
    }
  const actionAt = new Set(plan.events.flatMap((e) => (e.at && e.when.some((w) => 'time' in w || 'after' in w) ? [e.at.value] : [])));
  record.marks = (record.marks ?? []).filter((m) => !actionAt.has(m.at.value));
  return plan;
}
