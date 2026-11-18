import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/ma-6-friendship-7/flight.ts';
import { flight as mercury } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as vostok } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { autopilot } from '../src/sim/autopilot.ts';
import { contact } from '../src/sim/contact.ts';
import { ballisticOf } from '../src/sim/fly.ts';
import { turn } from '../src/sim/rigid.ts';
import { coastContacts, orbitalRecord } from '../src/sim/run.ts';
import { Sheds } from '../src/sim/shed.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { add, cross, dot, length, scale, siteFrame, sub } from '../src/world/frames.ts';

const record = orbitalRecord(flight);
const parting = record.sheds.get('adapter-clamp').from;
const centre = flight.flies.datum + flight.plan.record.centre.value;
const pair = () => coastContacts(flight, flight.plan, record.samples, parting, record.dropped, record.sheds, centre).sheds;
const make = (t, r, v, q, w = [0, 0, 0]) => ({ t, r, v, q, w, mass: flight.plan.record.orbit.mass.value, station: centre });

test('the spacecraft strikes the broad side of a detached stage away from its joint', () => {
  const sheds = pair(),
    run = sheds.get('adapter-clamp');
  const t = parting + 1,
    dt = 0.1,
    first = run.at(t),
    last = run.at(t + dt);
  const side = turn(first.q, [0, 1, 0]);
  const before = make(t, add(first.r, scale(side, -5)), add(first.v, scale(side, 100)), first.q);
  const after = make(t + dt, add(last.r, scale(side, 5)), add(last.v, scale(side, 100)), last.q);
  const hit = sheds.meet(before, after, centre, 'adapter-clamp');
  assert.equal(hit.hits.length, 1);
  const impact = hit.hits[0];
  assert.ok(length(impact.dw) > 0.001 && length(hit.w) > 0.001, 'the off-centre hit spins the spacecraft');
  const struck = run.at(t + dt);
  assert.ok(length(sub(struck.w, last.w)) > 0.001, 'the detached stage starts tumbling');
  assert.ok(
    struck.q.some((x, i) => Math.abs(x - last.q[i]) > 1e-6),
    'the outgoing attitude advances from the impact time',
  );
  assert.ok(length(sub(run.at(impact.t - 1e-8).w, run.at(impact.t).w)) > 0.001, 'incoming and outgoing spin are preserved at impact');
  assert.equal(sheds.activeBrokenAt, impact.t);
  assert.equal(impact.activeBroken, true);
  assert.deepEqual(impact.broken, ['adapter-clamp']);
  assert.equal(run.fork(impact.t - 1e-8).brokenAt, Infinity);
  assert.equal(run.fork(impact.t).brokenAt, impact.t);
  assert.ok(length(sub(hit.v, after.v)) > 1);
  assert.ok(length(sub(run.at(t + dt).v, last.v)) > 1);
  assert.ok(length(add(scale(sub(hit.v, after.v), after.mass), scale(sub(run.at(t + dt).v, last.v), run.shedder.release.mass))) < 1e-6);
});

test('discarding a stage removes the mating station it used to carry', () => {
  const sheds = pair(),
    run = sheds.get('booster-latch');
  const t = parting + 0.1,
    dt = 0.1,
    first = run.at(t),
    last = run.at(t + dt);
  const on = run.shedder.def.to.value;
  const arm = on - run.shedder.release.centre;
  // Cross the booster section’s old seat on the tank. The tank is detached and the cabin is 18 m further up.
  const pose = (at, s, clear) => {
    const q = s.q,
      axis = turn(q, [1, 0, 0]),
      seat = add(s.r, scale(axis, arm));
    return make(at, add(seat, scale(axis, centre - on + clear)), add(s.v, scale(axis, -20)), q);
  };
  const before = pose(t, first, 1),
    after = pose(t + dt, last, -1);
  const met = sheds.meet(before, after, centre, 'booster-latch');
  assert.deepEqual(met.hits, []);
  assert.equal(met.v, after.v);
});

test('an off-axis spinning contact conserves angular and linear momentum and dissipates the reported energy', () => {
  const q = [1, 0, 0, 0];
  const rotor = (point, centre, w) => ({
    before: point,
    after: point,
    velocity: [0, 0, 0],
    radius: 1,
    mass: 2,
    body: { start: centre, end: centre, q0: q, q1: q, w, inertia: [2, 2, 2] },
  });
  const a = rotor([0, 1, 0], [0, 0, 0], [0, 0, -2]),
    b = rotor([2, 1, 0], [2, 2, 0], [0, 0, 0]);
  const h = contact(a, b, 0.02);
  assert.ok(h.speed > 0 && h.energy > 0 && length(h.a.w) > 0 && length(h.b.w) > 0);
  assert.ok(length(add(scale(h.a.v, 2), scale(h.b.v, 2))) < 1e-12);
  const angular = (body, kick) => add(cross(body.body.start, scale(kick.v, 2)), scale(kick.w, 2));
  assert.ok(length(add(angular(a, h.a), angular(b, h.b))) < 1e-12);
  const kinetic = (body, kick) => {
    const w = add(body.body.w, kick.w);
    return dot(kick.v, kick.v) + dot(w, w);
  };
  assert.ok(Math.abs(4 - kinetic(a, h.a) - kinetic(b, h.b) - h.energy) < 1e-12);
});

test('a small body can pass down a hollow fairing or strike its wall 45 degrees off its middle', () => {
  const record = orbitalRecord(vostok);
  const on = 'fairing/Left',
    released = record.sheds.get(on).shedder.release;
  const craft = vostok.plan.craft[0],
    shell = craft.sheds.find((d) => d.on === on);
  const plan = {
    ...vostok.plan,
    craft: [{ ...craft, bodies: [{ aero: { area: { value: Math.PI * 0.05 ** 2 } } }], rigid: undefined, sheds: [shell] }],
  };
  function crossWall(radial) {
    const scene = new Sheds(plan, siteFrame(vostok.site), vostok.site.seaLevel.value, { frame: record.frame });
    const run = scene.add(released),
      t = run.from + 1,
      dt = 0.1;
    const pose = (at, x) => {
      const s = run.at(at);
      const off = [x - released.centre, radial / Math.sqrt(2), radial / Math.sqrt(2) - shell.sideways.across.value];
      return { t: at, r: add(s.r, turn(s.q, off)), q: s.q, station: 0, w: [0, 0, 0], v: add(s.v, turn(s.q, [100, 0, 0])), mass: 1 };
    };
    const x = shell.from.value - 1;
    return scene.meet(pose(t, x), pose(t + dt, x + 10), 0, on).hits;
  }
  assert.deepEqual(crossWall(0), []);
  assert.equal(crossWall(shell.radius.value * 0.9).length, 1);
});

test('a hard strike on a detached Mercury capsule releases the carried pack through its real joint exactly once', () => {
  const site = siteFrame(mercury.site),
    v = vehicle(mercury.plan, site, mercury.site.seaLevel.value);
  let state = v.start();
  const guide = autopilot(v);
  assert.equal(v.impactRelease(state), state, 'the adapter contains the pack on the stack');
  while (!state.separation && state.t < 200) state = v.tick(state, guide);
  assert.ok(state.separation);
  const scene = new Sheds(mercury.plan, site, mercury.site.seaLevel.value);
  for (const released of state.released) scene.add(released);
  const stage = scene.get(ballisticOf(mercury.plan).separation.id);
  const t = state.t + 1,
    dt = 0.1,
    s0 = stage.at(t),
    s1 = stage.at(t + dt);
  const lateral = turn(s0.q, [0, 1, 0]);
  const before = { ...state, t, r: add(s0.r, scale(lateral, -5)), v: add(s0.v, scale(lateral, 100)), q: s0.q };
  const after = { ...before, t: t + dt, r: add(s1.r, scale(lateral, 5)), v: add(s1.v, scale(lateral, 100)) };
  const met = scene.ballistic(v, before, after);
  const pack = ballisticOf(mercury.plan).packJoint.id;
  const hit = met.hits.find((h) => h.activeReleased);
  assert.equal(hit?.activeReleased, pack);
  assert.equal(scene.activeReleased, pack);
  const physical = scene.get(pack);
  assert.equal(physical.from, met.state.t);
  assert.ok(length(sub(physical.at(physical.from + 0.3).r, physical.at(physical.from).r)) > 0);
  assert.ok(Math.abs(after.mass - met.state.mass - physical.shedder.release.mass) < 1e-6);
  assert.equal(v.impactRelease(met.state), met.state);
  const again = v.tick(met.state, { ...guide(met.state), do: [{ separate: pack }] });
  assert.equal(again.released.filter((r) => r.on === pack).length, 1);
  assert.equal(scene.add(again.released.at(-1)), physical);
});
