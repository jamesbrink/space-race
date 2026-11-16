// The plan model (src/sim/plan.ts) and the plans made from today's two shapes (src/sim/planof.ts): every flight that
// flies has a whole plan, which carries each figure of what it was made from as it was; and the model can say a flight
// of a kind not flown yet (a Gemini on its Titan) without anything new in the code.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { eventOf, problems } from '../src/sim/plan.ts';
import { bodiesMass, planOfOrbital, planOfTrajectory, stageId } from '../src/sim/planof.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const ballistic = all.filter((f) => f.trajectory);
const orbital = all.filter((f) => f.orbital);
const craftOf = (plan) => plan.craft[0];
const byId = (xs, id) => xs.find((x) => x.id === id);
/** Every action an event sets off, as `kind:id`. */
const doing = (e) => e.do.map((a) => Object.entries(a)[0].join(':'));

test('there are flights of both kinds to make plans of', () => {
  assert.ok(ballistic.length >= 2, 'the Mercury-Redstones');
  assert.ok(orbital.length >= 2, 'the Vostoks');
});

for (const f of [...ballistic, ...orbital]) {
  const plan = f.trajectory ? planOfTrajectory(f.trajectory, f.checks) : planOfOrbital(f.orbital);
  test(`${f.id}: its plan is whole, and is the flight's own`, () => {
    assert.deepEqual(problems(plan), []);
    assert.equal(plan.kind, f.trajectory ? 'ballistic' : 'orbital');
    assert.deepEqual(f.plan, plan, 'Flight.plan is the plan made of its record');
  });
}

for (const f of ballistic) {
  const tr = f.trajectory;
  const plan = planOfTrajectory(tr, f.checks);
  const c = craftOf(plan);
  test(`${f.id}: the ballistic plan carries the trajectory's figures`, () => {
    assert.equal(c.mass, tr.liftoffMass);
    assert.ok(Math.abs(bodiesMass(plan) - tr.liftoffMass.value) < 1e-6, 'the bodies sum to what leaves the pad');
    const main = byId(c.engines, 'main');
    assert.equal(main.thrust.seaLevel, tr.engine.thrust);
    assert.equal(main.isp.seaLevel, tr.engine.isp);
    assert.equal(main.exitArea, tr.engine.exitArea);
    assert.equal(main.thrust.vacuum.confidence, 'derived');
    assert.equal(eventOf(plan, 'cutoff').at, tr.engine.cutoff);
    assert.deepEqual(doing(eventOf(plan, 'cutoff')), ['cut:main']);
    const sep = byId(c.joints, 'separation');
    assert.equal(sep.push, tr.separation.speed);
    assert.equal(sep.after, tr.separation.mass);
    assert.equal(sep.leaves, tr.separation.boosterMass);
    assert.equal(eventOf(plan, 'separation').when[0].time, tr.separation.at.value);
    tr.retro.fires.forEach((fire, k) => {
      const e = eventOf(plan, k === 0 ? 'retro' : `retro-${k + 1}`);
      assert.equal(e.at, fire);
      assert.equal(byId(c.engines, `retro-${k + 1}`).burn, tr.retro.burn);
    });
    assert.equal(byId(c.joints, 'retropack').after, tr.retropack.mass);
    const height = (id) => eventOf(plan, id).when.find((w) => 'height' in w).height;
    assert.equal(height('drogue'), tr.drogue.altitude.value);
    assert.equal(height('main'), tr.main.altitude.value);
    assert.equal(byId(c.chutes, 'main').dragArea, tr.main.dragArea);
    assert.deepEqual(byId(c.chutes, 'main').instead, ['drogue']);
    assert.equal(c.drag[0].curve, tr.ascentDrag);
    assert.equal(byId(c.bodies, 'capsule').aero.drag, tr.entryDrag);
    assert.equal(plan.attitude[0].hold.programme, tr.tilt);
    assert.equal(plan.checks.length, (f.checks ?? []).length);
    if (tr.body) assert.equal(c.rigid, tr.body);
  });
}

for (const f of orbital) {
  const o = f.orbital;
  const plan = planOfOrbital(o);
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
    assert.equal(eventOf(plan, 'retro-on').at, o.retro.on);
    assert.equal(eventOf(plan, 'retro-off').at, o.retro.off);
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
