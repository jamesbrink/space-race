import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/ma-6-friendship-7/flight.ts';
import { flight as vostok } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { turn } from '../src/sim/rigid.ts';
import { coastContacts, orbitalRecord } from '../src/sim/run.ts';
import { Sheds } from '../src/sim/shed.ts';
import { add, length, scale, siteFrame, sub } from '../src/world/frames.ts';

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

test('a spinning contact never manufactures translational kinetic energy from equal centre velocities', () => {
  const sheds = pair(),
    run = sheds.get('adapter-clamp');
  const t = parting + 1,
    dt = 0.1,
    first = run.at(t),
    last = run.at(t + dt);
  const lateral = turn(first.q, [0, 1, 0]);
  const before = make(t, add(first.r, scale(lateral, -2.5)), first.v, first.q, [0, 0, 10]);
  const after = make(t + dt, add(last.r, scale(lateral, -1.5)), last.v, last.q, [0, 0, 10]);
  const met = sheds.meet(before, after, centre, 'adapter-clamp');
  assert.ok(length(sub(met.r, after.r)) > 0.001, 'contact corrects overlap of the swept shapes');
  assert.deepEqual(met.v, after.v);
  assert.deepEqual(run.at(t + dt).v, last.v);
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
