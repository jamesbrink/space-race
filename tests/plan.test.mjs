// The plan model (src/sim/plan.ts): every flight that flies has a whole plan, which carries each figure of the record it
// was written from as it was (a Mercury-Redstone's, its day's and its stack's hardware's; a Vostok's, which says its
// braking burn's command, timer and chain as events of its own, its record's); and the model can say a flight of a kind
// not flown yet (a Gemini on its Titan) without anything new in the code.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ballisticOf } from '../src/sim/fly.ts';
import { coastEvents } from '../src/sim/orbital.ts';
import { clockAt, eventOf, problems } from '../src/sim/plan.ts';
import { byHand, givenUp } from '../src/sim/staged.ts';
import { HARDWARE } from '../missions/usa/mercury/vehicles/mercury-redstone.ts';
import { dayOf } from './ballistic.mjs';
import { recordFrom } from './records.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const ballistic = all.filter((f) => f.plan?.kind === 'ballistic');
const orbital = all.filter((f) => f.plan?.kind === 'orbital');
const craftOf = (plan) => plan.craft[0];
const byId = (xs, id) => xs.find((x) => x.id === id);
/** A stage's body, engine, tank and joint, by its place in the record (vostok-plan.ts). */
const stageId = (i) => `stage:${i}`;
/** What a plan's first craft weighs whole: each body's mass times its count. */
const bodiesMass = (plan) => craftOf(plan).bodies.reduce((sum, b) => sum + b.count * b.mass.value, 0);
/** Every action an event sets off, as `kind:id`. */
const doing = (e) => e.do.map((a) => Object.entries(a)[0].join(':'));

test('there are flights of both kinds to make plans of', () => {
  assert.ok(ballistic.length >= 2, 'the Mercury-Redstones');
  assert.ok(orbital.length >= 2, 'the Vostoks');
});

for (const f of [...ballistic, ...orbital]) {
  test(`${f.id}: its plan is whole, and is the flight's own`, () => {
    assert.deepEqual(problems(f.plan), []);
    assert.ok(['ballistic', 'orbital'].includes(f.plan.kind));
    for (const e of craftOf(f.plan).engines.filter((e) => e.nozzle))
      assert.ok(e.nozzle.exit.value > 0 && e.nozzle.exit.source, `${e.id}'s nozzle`);
  });
}

for (const f of ballistic) {
  const day = dayOf(f);
  const hw = HARDWARE;
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the ballistic plan carries its day's and its stack's figures`, () => {
    assert.equal(c.mass, day.liftoffMass);
    assert.ok(Math.abs(bodiesMass(plan) - day.liftoffMass.value) < 1e-6, 'the bodies sum to what leaves the pad');
    // (each found by what it is, as every simulator finds it: fly.ts `ballisticOf`)
    const b = ballisticOf(plan);
    const main = b.engine;
    assert.equal(main.thrust.seaLevel, day.thrust);
    assert.equal(main.isp.seaLevel, day.isp);
    assert.equal(main.exitArea, hw.exitArea);
    assert.equal(main.depletion, hw.depletion);
    assert.equal(main.thrust.vacuum.confidence, 'derived');
    const cut = plan.events.find((e) => doing(e).includes(`cut:${main.id}`) && e.automatic);
    assert.equal(cut.at, day.cutoff);
    assert.equal(b.cutoff, day.cutoff.value);
    const sep = b.separation;
    assert.equal(sep.push, day.separation.speed);
    assert.equal(sep.after, day.separation.mass);
    assert.equal(sep.leaves, day.separation.boosterMass);
    assert.equal(sep.heading, day.separation.heading);
    assert.equal(b.parting.when[0].time, day.separation.at.value);
    // the retrorockets: the first lit at its instant, each other so long after it, all as the record has them
    const lights = [b.retro, ...b.chained];
    assert.equal(lights.length, day.retro.fires.length);
    day.retro.fires.forEach((fire, k) => {
      assert.equal(lights[k].at, fire);
      assert.equal(b.motors[k].burn, hw.retro.burn);
      assert.equal(b.motors[k].thrust.vacuum, hw.retro.thrust);
      assert.deepEqual(doing(lights[k]), [`ignite:${b.motors[k].id}`]);
    });
    assert.equal(b.retroPitch, day.retro.pitch);
    assert.equal(b.packJoint.after, day.retropack.mass);
    assert.equal(b.packOff.at, day.retropack.at);
    assert.equal(b.drogueHeight, day.drogue.value);
    assert.equal(b.mainHeight, day.main.value);
    for (const [chute, own] of [
      [b.drogue, hw.drogue],
      [b.main, hw.main],
    ]) {
      assert.equal(chute.dragArea, own.dragArea);
      assert.equal(chute.fills, own.fills);
    }
    assert.deepEqual(b.main.instead, [b.drogue.id]);
    assert.equal(c.drag[0].curve, hw.ascentDrag);
    assert.equal(c.drag[0].area, hw.area);
    assert.equal(b.spacecraft.aero.drag, hw.entryDrag);
    assert.equal(b.spacecraft.aero.area, hw.area);
    assert.equal(plan.attitude[0].hold.programme, hw.tilt);
    assert.equal(plan.attitude[0].hold.azimuth, day.azimuth);
    assert.equal(plan.winds, day.winds);
    assert.equal(plan.checks.length, (f.checks ?? []).length);
  });
}

for (const f of orbital) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the orbital plan carries the record's figures`, () => {
    assert.equal(c.mass, o.liftoffMass);
    o.stages.forEach((s, i) => {
      const e = byId(c.engines, stageId(i));
      assert.equal(e.thrust, s.thrust);
      assert.equal(e.isp, s.isp);
      assert.equal(byId(c.tanks, stageId(i)).load, s.propellant, 'one unit’s load');
      assert.equal(byId(c.bodies, stageId(i)).mass, s.mass, 'one unit’s mass');
      assert.equal(byId(c.bodies, stageId(i)).count, s.count);
      const lit = s.ignition.value > 0 ? eventOf(plan, `${stageId(i)}:ignite`) : eventOf(plan, 'liftoff');
      assert.ok(doing(lit).includes(`ignite:${stageId(i)}`), `${s.name} is lit`);
      if (s.separation) assert.equal(eventOf(plan, `${stageId(i)}:separate`).at, s.separation);
      const cut = eventOf(plan, `${stageId(i)}:cut`);
      if (s.velocity) {
        const w = cut.when[0];
        assert.equal(w.speed, s.velocity.speed.value + (s.velocity.over?.value ?? 0));
        assert.equal(w.apparent, s.velocity.apparent ? stageId(i) : undefined);
      }
    });
    // every instant of the record is either an event's or a mark
    const instants = new Set([...plan.events.flatMap((e) => (e.at ? [e.at.value] : [])), ...plan.record.marks.map((m) => m.at.value)]);
    for (const e of o.events) assert.ok(instants.has(e.at.value), `${e.id} at ${e.at.value} s`);
    // ...and by its id: each record event is the record of an event the plan sets off, or a mark (none is lost at an instant it shares)
    const named = new Set([...plan.events.flatMap((e) => (e.record ? [e.record.id] : [])), ...plan.record.marks.map((m) => m.id)]);
    for (const e of o.events) assert.ok(named.has(e.id), `the record's ${e.id} is in the plan`);
    assert.equal(eventOf(plan, 'retro-on').at, o.retro.on);
    assert.equal(eventOf(plan, 'retro-off').at, o.retro.off);
    // every event the clock sets off at a record instant is set off at it to the bit, chained or not
    for (const e of plan.events)
      if (e.at && e.when.some((w) => 'time' in w || 'after' in w))
        assert.equal(clockAt(plan, e), e.at.value, `${e.id} at its record instant`);
    assert.equal(byId(c.engines, 'braking').flown, o.retro.deltaV);
    assert.equal(byId(c.joints, 'modules').after, o.entry.mass);
    assert.equal(eventOf(plan, 'ejection').when.find((w) => 'height' in w).height, o.ejection.altitude.value);
    for (const b of o.descent?.bodies ?? []) {
      assert.equal(byId(c.bodies, b.id).mass, b.mass);
      for (const ch of b.chutes) assert.equal(byId(c.chutes, `${b.id}/${ch.name}`).dragArea, ch.dragArea);
    }
    assert.equal(plan.checks.length, (o.ascent?.checks.length ?? 0) + o.checks.length + (o.descent?.checks.length ?? 0));
    assert.equal(plan.record.orbit.period, o.orbit.period);
  });
  test(`${f.id}: the braking burn is commanded, lit, cut and the modules parted in a chain; a timer is started by the command`, () => {
    const k = coastEvents(plan);
    const has = (id) => o.events.some((e) => e.id === id);
    assert.equal(k.command?.record?.id, has('retro-command') ? 'retro-command' : undefined, 'the lighting follows the command');
    assert.equal(k.on.when[0].after, k.command?.id);
    assert.equal(k.off.when[0].after, k.on.id, 'the cut follows the lighting');
    assert.equal(k.parting.when[0].after, k.off.id, 'the parting follows the cut');
    assert.deepEqual(
      k.armed.map((e) => [e.record?.id, e.armed]),
      has('retro-timer') ? [['retro-timer', false]] : [],
      'the timer waits for the command to start it',
    );
    // the pilot set loose and the landings carry the record's names for them
    assert.equal(eventOf(plan, 'ejection').record?.id, 'ejection');
    assert.deepEqual(
      plan.record.marks.filter((m) => m.lands).map((m) => [m.id, m.lands]),
      (o.descent?.bodies ?? []).filter((b) => has(`${b.id}-down`)).map((b) => [`${b.id}-down`, b.id]),
    );
    // a hand's burn: commanded and lit at its instant, cut by its integrator, the modules parting after; no timer started
    const t = o.retro.on.value - 600;
    const hand = byHand(plan, t, [1, 0, 0]);
    const h = coastEvents(hand);
    assert.equal(clockAt(hand, h.command), k.command ? t : Infinity);
    assert.equal(clockAt(hand, h.on), t);
    assert.ok(clockAt(hand, h.off) > t && clockAt(hand, h.parting) === clockAt(hand, h.off) + plan.record.manual.parting.value);
    assert.deepEqual(h.armed, [], 'a hand’s command starts no timer');
    // given up: nothing on the clock
    const never = coastEvents(givenUp(plan));
    for (const e of [never.command, never.on, never.off, never.parting].filter(Boolean))
      assert.equal(clockAt(givenUp(plan), e), Number.MAX_SAFE_INTEGER);
  });
}

// Not a flight's data: figures of 1 stand in for every number, so nothing here can be read as a Gemini's. What is
// held is that a Gemini's kind of flight is said in the plan's own terms.
const m = (value = 1) => ({ value, confidence: 'estimated', source: 'shape only' });
const curve = { points: [[0, 1]], confidence: 'estimated', source: 'shape only' };
const starts = { count: 1, ground: false, confidence: 'estimated', source: 'shape only' };
const gemini = {
  kind: 'orbital',
  craft: [
    {
      id: 'stack',
      label: 'Gemini-Titan',
      mass: m(),
      bodies: [
        { id: 'first', label: 'Stage I', count: 1, mass: m() },
        { id: 'second', label: 'Stage II', count: 1, mass: m() },
        { id: 'adapter', label: 'Adapter', count: 1, mass: m() },
        { id: 'reentry', label: 'Reentry module', count: 1, mass: m(), aero: { area: m(), drag: curve, lift: curve, trim: m() } },
      ],
      joints: [
        { id: 'staging', label: 'Staging', gone: ['first'], hot: { engine: 'second', open: m(), turn: m(), endures: m() } },
        { id: 'spacecraft', label: 'Spacecraft separation', gone: ['second'], push: m() },
        { id: 'adapter', label: 'Adapter let go', gone: ['adapter'] },
      ],
      engines: [
        {
          id: 'first',
          label: 'LR87',
          body: 'first',
          count: 2,
          tanks: ['first-ox', 'first-fuel'],
          thrust: { seaLevel: m(), vacuum: m() },
          isp: { vacuum: m() },
          kind: 'liquid',
          starts,
        },
        {
          id: 'second',
          label: 'LR91',
          body: 'second',
          count: 1,
          tanks: ['second-ox', 'second-fuel'],
          thrust: { vacuum: m() },
          isp: { vacuum: m() },
          kind: 'liquid',
          starts,
        },
        {
          id: 'retro',
          label: 'Retrorockets',
          body: 'adapter',
          count: 4,
          tanks: [],
          thrust: { vacuum: m() },
          kind: 'solid',
          burn: m(),
          starts,
        },
      ],
      tanks: [
        { id: 'first-ox', label: 'Stage I oxidizer', body: 'first', load: m(), holds: 'oxidizer' },
        { id: 'first-fuel', label: 'Stage I fuel', body: 'first', load: m(), holds: 'fuel' },
        { id: 'second-ox', label: 'Stage II oxidizer', body: 'second', load: m(), holds: 'oxidizer' },
        { id: 'second-fuel', label: 'Stage II fuel', body: 'second', load: m(), holds: 'fuel' },
        { id: 'oams', label: 'OAMS propellant', body: 'adapter', load: m(), holds: 'control', isp: m() },
        { id: 'rcs', label: 'RCS propellant', body: 'reentry', load: m(), holds: 'control', isp: m() },
      ],
      thrusters: [
        { id: 'oams', label: 'OAMS', body: 'adapter', does: ['rotation', 'translation'], tank: 'oams', mode: 'manual', push: m() },
        { id: 'rcs', label: 'Reentry control', body: 'reentry', does: ['rotation'], tank: 'rcs', mode: 'automatic', authority: m() },
      ],
      chutes: [{ id: 'main', label: 'Main', body: 'reentry', dragArea: m(), fills: m() }],
      limits: [],
      drag: [{ until: m(), area: m(), curve }],
    },
  ],
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      when: [{ time: 0 }],
      do: [{ ignite: 'first' }, { attitude: 'ascent' }],
      automatic: true,
      source: 'shape only',
    },
    // fire in the hole: Stage II lit before the joint lets go, cut on its guidance's velocity
    {
      id: 'staging',
      label: 'Staging',
      when: [{ time: 1 }],
      do: [{ ignite: 'second' }, { cut: 'first' }, { separate: 'staging' }],
      automatic: true,
      source: 'shape only',
    },
    { id: 'seco', label: 'SECO', when: [{ speed: 1 }], do: [{ cut: 'second' }], automatic: true, source: 'shape only' },
    {
      id: 'insertion',
      label: 'Spacecraft separation',
      when: [{ after: 'seco', wait: 1 }],
      do: [{ separate: 'spacecraft' }, { attitude: 'free' }],
      automatic: false,
      source: 'shape only',
    },
    {
      id: 'translate',
      label: 'Translate',
      when: [{ command: 'translate' }],
      do: [{ arm: 'retro' }],
      automatic: false,
      source: 'shape only',
    },
    {
      id: 'retro',
      label: 'Retrofire',
      when: [{ after: 'translate', wait: 1 }],
      do: [{ ignite: 'retro' }, { attitude: 'retro' }],
      automatic: true,
      armed: false,
      source: 'shape only',
    },
    {
      id: 'adapter',
      label: 'Adapter let go',
      when: [{ after: 'retro', wait: 1 }],
      do: [{ separate: 'adapter' }, { attitude: 'bank' }],
      automatic: true,
      source: 'shape only',
    },
    {
      id: 'main',
      label: 'Main out',
      when: [{ height: 1, going: 'down' }, { after: 'adapter' }],
      do: [{ deploy: 'main' }],
      automatic: true,
      source: 'shape only',
    },
  ],
  attitude: [
    { id: 'ascent', label: 'Programme', hold: { programme: curve, azimuth: m() }, source: 'shape only' },
    { id: 'free', label: 'Free', hold: { free: true }, source: 'shape only' },
    { id: 'retro', label: 'Retro', hold: { retro: m() }, source: 'shape only' },
    { id: 'bank', label: 'Lifting entry', hold: { bank: m() }, source: 'shape only' },
  ],
  checks: [],
};

test('the plan says a Gemini: two stages on their own tanks, hot staging, translation thrusters, a lifting entry', () => {
  assert.deepEqual(problems(gemini), []);
});

test('a plan that names what is not there says so', () => {
  const broken = structuredClone(gemini);
  const c = broken.craft[0];
  c.engines[1].tanks.push('third-ox');
  c.joints.push({ ...c.joints[0] });
  broken.events.push({ id: 'nowhere', label: 'x', when: [{ after: 'never' }], do: [{ deploy: 'drogue' }], automatic: true, source: 'x' });
  broken.events.find((e) => e.id === 'translate').do = [];
  const said = problems(broken);
  assert.ok(said.some((s) => s.includes("'third-ox'")));
  assert.ok(said.some((s) => s.includes("joint 'staging' is named twice")));
  assert.ok(said.some((s) => s.includes("event 'never'")));
  assert.ok(said.some((s) => s.includes("chute 'drogue'")));
  assert.ok(said.some((s) => s.includes('nothing arms it')));
});
