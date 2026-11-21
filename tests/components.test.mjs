// Several craft in one run (simulator.md, "Several craft in one run"): a craft is a connected set of a plan's bodies under
// the joints that hold; a parting splits one craft into two, and a joint made in flight (`JointDef.formed`) joins two as
// the physics captures it. Held here on a plan built from Apollo 9's data (tests/transposition.mjs): its craft as each
// joint parts and is made, each event done by the craft that holds what it names, the crew moved only within a craft;
// and the transposition flown (sim/proximity.ts): the record's crew back away, turn and close, the probe is captured near
// the record's instant at its closing speed, and the split and the merge each keep the mass and the momentum.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commanderOf, componentsOf, followedOf, holderOf, together } from '../src/sim/components.ts';
import { act, form, part, startCraft } from '../src/sim/craft.ts';
import { problems } from '../src/sim/plan.ts';
import { craftAt } from '../src/sim/proximity.ts';
import { add, length, scale, sub } from '../src/world/frames.ts';
import { flight as apollo7 } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { estimated } from '../src/measure.ts';
import { flyWhole } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';
import { flownOnce, plan, t0 } from './transposition.mjs';

const ids = (s, t) =>
  componentsOf(plan, s, t)
    .map((p) => [...p.bodies].sort().join('+'))
    .sort();
const FT = 0.3048;

test('the fixture is a whole plan', () => {
  assert.deepEqual(problems(plan), []);
});

test('a craft is the bodies the holding joints join: split by a parting, joined by a capture, split again', () => {
  let s = startCraft(plan);
  assert.deepEqual(ids(s), ['carrier+lander+ship']);
  assert.equal(s.joints.docking.made, Infinity);
  assert.equal(commanderOf(plan), 'commander');
  // (undocking what has not docked does nothing)
  assert.equal(act(plan, s, { separate: 'docking' }, 10, false).state, s);
  s = part(plan, act(plan, s, { separate: 'adapter-separation' }, 10, false).state, 'adapter-separation', 10);
  assert.deepEqual(ids(s), ['carrier+lander', 'ship']);
  assert.deepEqual(ids(s, 5), ['carrier+lander+ship'], 'as it stood before the parting');
  assert.deepEqual(followedOf(plan, s).bodies, ['ship']);
  // (a crew member goes only to a body of the craft they are in)
  const refused = act(plan, s, { board: 'lander-pilot', to: 'lander' }, 20, false);
  assert.deepEqual(
    refused.refused.map((r) => r.why),
    ['apart'],
  );
  s = form(plan, s, 'docking', 30);
  assert.deepEqual(ids(s), ['carrier+lander+ship']);
  assert.deepEqual(ids(s, 29), ['carrier+lander', 'ship']);
  const extract = plan.events.find((e) => e.id === 'extract');
  assert.equal(holderOf(plan, s, extract).id, 'ship', 'the extraction is done by the joined craft, which holds the joint');
  s = part(plan, act(plan, s, { separate: 'lander-release' }, 40, false).state, 'lander-release', 40);
  assert.deepEqual(ids(s), ['carrier', 'lander+ship']);
  s = act(plan, s, { board: 'lander-pilot', to: 'lander' }, 50, false).state;
  assert.equal(s.crew['lander-pilot'], 'lander');
  assert.ok(together(plan, s, 'lander', 'ship'));
  s = part(plan, act(plan, s, { separate: 'docking' }, 60, false).state, 'docking', 60);
  assert.deepEqual(ids(s), ['carrier', 'lander', 'ship']);
  assert.deepEqual(followedOf(plan, s).bodies, ['ship'], 'the player goes with the commander');
});

test('the record crew back away, turn end for end and close: the probe captured near the record’s instant at its rate', () => {
  const run = flownOnce();
  assert.equal(run.captures.length, 1);
  const [c] = run.captures;
  const record = plan.craft[0].joints.find((j) => j.id === 'docking').formed;
  assert.ok(Math.abs(c.t - record.approach.contact.value) < 30, `captured at ${c.t} s, the record's ${record.approach.contact.value}`);
  assert.ok(Math.abs(c.closing / FT - 0.3) < 0.02, `closing at ${c.closing / FT} ft/s`);
  assert.ok(c.tilt < (10 * Math.PI) / 180 && c.roll < (10 * Math.PI) / 180);
  assert.ok(Math.abs(c.hard - c.t - record.capture.retract.value) < 0.3, 'drawn to the hard joint in the retraction’s time');
  assert.deepEqual(
    run.events.map((e) => e.event),
    ['separate', 'extract', 'board'],
  );
  assert.deepEqual(
    run.partings.map((p) => [p.joint, p.kept, p.gone]),
    [
      ['adapter-separation', 'ship', 'lander'],
      ['lander-release', 'ship', 'carrier'],
    ],
  );
  // (the ship backed away, turned and came back: it was off at its stand-off between)
  const ship = run.tracks.find((k) => k.bodies.length === 1 && k.id === 'ship' && k.from === t0);
  const carrier = run.tracks.find((k) => k.id === 'lander' && k.from === t0);
  const far = Math.max(...ship.samples.map((x) => length(sub(x.r, craftAt([carrier], 'lander', x.t).r))));
  assert.ok(far > 20 && far < 40, `the two at most ${far} m apart`);
});

/** Mass and momentum of a set of samples. */
const sum = (xs) => xs.reduce((a, x) => ({ m: a.m + x.mass, p: add(a.p, scale(x.v, x.mass)) }), { m: 0, p: [0, 0, 0] });

test('a split and a merge keep the mass and the momentum', () => {
  const run = flownOnce();
  const at = (t, fn) =>
    run.tracks
      .filter(fn)
      .map((k) => k.samples.find((x) => Math.abs(x.t - t) < 1e-9))
      .filter(Boolean);
  const check = (before, after, what) => {
    const [a, b] = [sum(before), sum(after)];
    assert.ok(Math.abs(a.m - b.m) < 1e-6, `${what}: ${a.m} kg then ${b.m}`);
    assert.ok(length(sub(a.p, b.p)) / length(a.p) < 1e-12, `${what}: momentum moved by ${length(sub(a.p, b.p))} kg m/s`);
  };
  for (const p of run.partings) {
    const whole = at(p.t, (k) => k.until === p.t);
    const pieces = at(p.t, (k) => k.from === p.t && k.until > p.t);
    assert.equal(pieces.length, 2);
    check(whole, pieces, p.joint);
  }
  const [c] = run.captures;
  check(
    at(c.t, (k) => k.until === c.t),
    at(c.t, (k) => k.from === c.t && k.until > c.t),
    'the capture',
  );
  // (the lander is in the ship's craft from the capture: one track holds both)
  const t = c.hard + 100;
  assert.deepEqual(craftAt(run.tracks, 'lander', t), craftAt(run.tracks, 'ship', t));
  assert.notDeepEqual(craftAt(run.tracks, 'carrier', run.t - 1).r, craftAt(run.tracks, 'ship', run.t - 1).r);
});

/**
 * The batch run of a plan with a joint made in flight (staged.ts `flyWhole`, `flySeveral`): Apollo 7's plan, changed for
 * the test only (its stations, moments and port are estimates of the test's, and Apollo 7 never docked), its crew made
 * to dock with the S-IVB's adapter after the separation and to undock five minutes later, then the coast flown on.
 */
function dockingSeven() {
  const p = structuredClone(apollo7.plan);
  const c = p.craft[0];
  const e = (v) => estimated(v, 'the test’s');
  const rigid = { sivb: [20, 1e5, 1e6, 1e6], sm: [32, 2e4, 4e4, 4e4], 'forward-shield': [37.5, 100, 100, 100], cm: [36, 6e3, 5e3, 5e3] };
  for (const b of c.bodies) if (rigid[b.id]) b.rigid = { centre: e(rigid[b.id][0]), inertia: rigid[b.id].slice(1).map(e) };
  c.thrusters.push({
    id: 'translation',
    label: 'the test’s',
    body: 'sm',
    does: ['rotation', 'translation'],
    mode: 'manual',
    push: e(1780),
    torque: { roll: e(1888), pitch: e(1888), yaw: e(1888) },
  });
  const parting = p.events.find((x) => x.do.some((a) => a.separate === 'spacecraft-separation'));
  const contact = parting.at.value + 600;
  c.joints.push({
    id: 'probe',
    label: 'the test’s',
    gone: [],
    push: e(0.3),
    formed: {
      ports: [
        { body: 'cm', station: e(39), faces: 1, clock: e(60) },
        { body: 'sivb', station: e(27), faces: 1, clock: e(0) },
      ],
      capture: {
        stroke: e(0.3),
        radius: e(0.3),
        tilt: e(10),
        roll: e(10),
        closing: e(0.3),
        sideways: e(0.15),
        angular: e(1),
        retract: e(10),
      },
      approach: { by: 'translation', departing: e(0.18), turnAfter: e(15), standOff: e(18), closing: e(0.09), contact: e(contact) },
    },
  });
  parting.do.push({ dock: 'probe' });
  p.events = p.events.filter((x) => !x.id.startsWith('rcs-formation'));
  p.events.push({
    id: 'undock',
    label: 'the test’s',
    when: [{ time: contact + 300 }],
    do: [{ separate: 'probe' }],
    automatic: true,
    source: 'the test’s',
  });
  return { plan: p, contact, parted: parting.at.value };
}

test('the batch run carries every craft: flown together from the parting through a docking, then the coast', () => {
  const { plan: p, contact, parted } = dockingSeven();
  assert.deepEqual(problems(p), []);
  const whole = flyWhole(p, siteFrame(apollo7.site), frameOf(apollo7), apollo7.site.seaLevel.value, undefined, 10);
  const crafts = whole.crafts;
  assert.ok(crafts, 'a plan with a formed joint flies its craft');
  assert.ok(Math.abs(crafts.until - (contact + 301)) < 1e-6);
  assert.deepEqual([...crafts.followed].sort(), ['cm', 'forward-shield', 'sm']);
  const docked = crafts.tracks.find((k) => k.bodies.includes('sivb') && k.bodies.includes('cm'));
  assert.ok(docked && Math.abs(docked.from - contact) < 30, 'captured near the instant the crew timed it on');
  // (the coast is the followed craft's, begun where the craft flown together left it, and the stage flies on by itself)
  const first = whole.coast.samples.find((x) => x.t >= crafts.until - 1e-9);
  assert.ok(length(sub(first.r, crafts.at('cm', first.t).r)) < 1e-6);
  for (const t of [parted + 1, contact + 100, crafts.until + 3600]) {
    assert.ok(crafts.at('sivb', t) && crafts.at('cm', t), `both craft at ${t} s`);
  }
  assert.ok(length(sub(crafts.at('sivb', contact + 100).r, crafts.at('cm', contact + 100).r)) < 30, 'docked');
  assert.ok(
    length(sub(crafts.at('sivb', crafts.until + 3600).r, crafts.at('cm', crafts.until + 3600).r)) > 100,
    'apart after the undocking',
  );
  assert.equal(crafts.at('sib', contact), undefined, 'what left before the parting is not flown as a craft');
  assert.ok(whole.down, 'the coast flew on to the descent');
});
