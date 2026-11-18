import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contact } from '../src/sim/contact.ts';
import { Sheds } from '../src/sim/shed.ts';
import { flyOrbit } from '../src/sim/orbital.ts';
import { between, orbitalRecord, coastContacts, keepContact } from '../src/sim/run.ts';
import { flight } from '../missions/usa/mercury/flights/ma-6-friendship-7/flight.ts';
import { length, add, sub, scale, dot, siteFrame } from '../src/world/frames.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { stagedVehicle } from '../src/sim/stagedlive.ts';
import { steer } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { flight as ballistic } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { turn } from '../src/sim/rigid.ts';

test('two fast bodies strike between samples, conserve momentum, and keep their tangential speed', () => {
  const a = { before: [-12, 0, 0], after: [18, 3, 0], velocity: [30, 3, 0], radius: 1, mass: 2 };
  const b = { before: [0, 0, 0], after: [0, 3, 0], velocity: [0, 3, 0], radius: 1, mass: 3 };
  const hit = contact(a, b, 1);
  assert.ok(hit);
  assert.ok(Math.abs(hit.after - 1 / 3) < 1e-12);
  assert.deepEqual(add(a.velocity, hit.a.v), [12, 3, 0]);
  assert.deepEqual(add(b.velocity, hit.b.v), [12, 3, 0]);
  assert.equal(hit.energy, 540);
  assert.ok(Math.abs(length(sub(add(a.after, hit.a.r), add(b.after, hit.b.r))) - 2) < 1e-12);
  assert.equal(contact({ ...a, before: [-12, 5, 0], after: [18, 8, 0] }, b, 1), null);
  assert.equal(contact({ ...a, before: [2, 0, 0] }, b, 1), null);
});

test('reversing into a released spacecraft adapter changes both outgoing trajectories and preserves earlier replay', () => {
  const run = orbitalRecord(flight);
  const stage = run.sheds.get('adapter-clamp');
  const at = stage.from,
    dt = 0.1;
  const src = stage.shedder.release,
    axis = turn(src.q, [1, 0, 0]);
  const centre = flight.flies.datum + flight.plan.record.centre.value;
  const assembly = coastContacts(flight, flight.plan, run.samples, at, run.dropped, run.sheds, centre);
  const own = assembly.sheds.get('adapter-clamp');
  const first = own.at(at),
    last = own.at(at + dt);
  const base = sub(first.r, scale(axis, src.centre));
  const before = { r: add(base, scale(axis, 1)), v: sub(first.v, scale(axis, 40)) };
  const after = { r: add(sub(last.r, scale(axis, src.centre)), scale(axis, -3)), v: sub(last.v, scale(axis, 40)) };
  // Query the future beforehand, as a chase camera / scrub can do.
  own.at(at + 5);
  const solved = assembly.contacts.advance(before, at, after, at + dt);
  assert.equal(assembly.hits.length, 1);
  assert.ok(assembly.hits[0].t > at && assembly.hits[0].t < at + dt);
  const changed = own.at(at + dt);
  const mass = flight.plan.record.orbit.mass.value;
  assert.ok(length(add(scale(sub(solved.v, after.v), mass), scale(sub(changed.v, last.v), src.mass))) < 0.001);
  assert.ok(dot(sub(solved.v, after.v), axis) > 1);
  assert.ok(dot(sub(changed.v, last.v), axis) < -1);
  assert.ok(length(sub(own.at(at).r, first.r)) < 1e-8);
  assert.ok(length(sub(stage.at(at + dt).v, last.v)) < 1e-6, 'historical run stays independent');
});

test('detached parts strike each other while the crew is elsewhere', () => {
  const run = orbitalRecord(flight);
  const release = run.sheds.get('adapter-clamp').shedder.release;
  const base = release.r,
    q = [1, 0, 0, 0],
    t = release.t;
  const assembly = new Sheds(flight.plan, siteFrame(flight.site), flight.site.seaLevel.value, { frame: run.frame });
  const defs = flight.plan.craft[0].sheds;
  const bodies = ['booster-latch', 'adapter-clamp'].map((on, i) => {
    const d = defs.find((x) => x.on === on);
    const r = add(base, [0, i === 0 ? -3 : 3, 0]);
    const v = add(release.v, [0, i === 0 ? 100 : -100, 0]);
    return assembly.add({ ...release, on, q, r, v, centre: d.centre.value, mass: d.mass.value });
  });
  const after = bodies.map((b) => b.at(t + 0.05));
  const impacts = assembly.siblings(t, t + 0.05);
  assert.equal(impacts.length, 1);
  assert.ok(impacts[0].energy > 0);
  const forces = bodies.map((b, i) => scale(sub(b.at(t + 0.05).v, after[i].v), b.shedder.release.mass));
  assert.ok(length(add(...forces)) < 1e-5);
});

test('a distant stage re-enters collision physics when a later coast step sweeps back through it', () => {
  const record = orbitalRecord(flight);
  const stage = record.sheds.get('adapter-clamp');
  const release = stage.shedder.release;
  const t = release.t;
  const centre = flight.flies.datum + flight.plan.record.centre.value;
  const sim = coastContacts(flight, flight.plan, record.samples, t, record.dropped, record.sheds, centre);
  const axis = turn(release.q, [1, 0, 0]);
  function position(at, ahead, speed) {
    const body = stage.at(at);
    return { r: add(body.r, scale(axis, ahead - release.centre)), v: add(body.v, scale(axis, speed)) };
  }
  sim.contacts.advance(position(t, 1000, 50), t, position(t + 1, 1050, 50), t + 1);
  assert.ok(sim.contacts.limit(t + 1) > 1, 'coarse stepping outside the local encounter');
  const end = position(t + 3, -50, -550);
  const corrected = sim.contacts.advance(position(t + 1, 1050, -550), t + 1, end, t + 3);
  assert.ok(sim.hits.some((h) => h.on === 'adapter-clamp'));
  assert.ok(dot(sub(corrected.v, end.v), axis) > 1);
});

test('orbital replay keeps both velocities at impact and the capsule clears the adapter between samples', () => {
  const record = orbitalRecord(flight);
  const stage = record.sheds.get('adapter-clamp');
  const release = stage.shedder.release;
  const at = release.t;
  const axis = turn(release.q, [1, 0, 0]);
  const centre = flight.flies.datum + flight.plan.record.centre.value;
  const encounter = coastContacts(flight, flight.plan, record.samples, at, record.dropped, record.sheds, centre);
  const live = encounter.sheds.get('adapter-clamp');
  // Begin one metre clear with the capsule moving back toward its adapter. The display normally keeps one sample per second.
  const start = { t: at, r: add(release.r, scale(axis, 1 - release.centre)), v: sub(release.v, scale(axis, 40)) };
  const coast = flyOrbit(
    flight.plan,
    siteFrame(flight.site),
    record.frame,
    flight.site.seaLevel.value,
    1,
    start,
    { given: { stop: at + 2 }, switched: [] },
    encounter.contacts,
  );
  const time = encounter.hits[0].t;
  const sides = coast.samples.filter((s) => s.t === time);
  assert.equal(sides.length, 2);
  assert.deepEqual(sides[0].r, sides[1].r);
  assert.ok(dot(sub(sides[1].v, sides[0].v), axis) > 1);
  for (let i = 0; i <= 200; i++) {
    const t = at + i / 100;
    const active = between(coast.samples, t).r;
    const loose = live.at(t);
    const adapter = add(loose.r, turn(loose.q, [stage.shedder.def.to.value - release.centre, 0, 0]));
    const plane = add(active, scale(axis, stage.shedder.def.to.value));
    const gap = dot(sub(plane, adapter), axis);
    assert.ok(gap >= -1e-5, `T+${t}: replay put capsule ${-gap} m through joint`);
  }
});

for (const f of [ballistic, flight]) {
  test(`live ascent keeps the impact inside a sparse replay interval on ${f.name ?? f.id}`, () => {
    const site = siteFrame(f.site),
      frame = frameOf(f),
      sea = f.site.seaLevel.value;
    const body = f === ballistic ? vehicle(f.plan, site, sea) : stagedVehicle(f.plan, site, frame, sea, steer(f.plan, site, frame, sea));
    const sample = (state) => body.sample(state, (f.flies.datum ?? 0) + (f.plan.record.centre?.value ?? 0));
    const start = body.start(),
      v = [-40, 0, 0],
      dt = 0.01;
    const before = { ...start, held: false, t: 1, v };
    const free = { ...before, t: 1 + dt, r: add(before.r, scale(v, dt)) };
    const hit = contact(
      { before: [2.2, 0, 0], after: [1.8, 0, 0], velocity: v, radius: 1, mass: 1 },
      { before: [0, 0, 0], after: [0, 0, 0], velocity: [0, 0, 0], radius: 1, mass: 1 },
      dt,
    );
    const at = before.t + hit.after;
    const earlier = { ...before, t: 0.95, r: add(before.r, scale(v, -0.05)) };
    const history = [sample(earlier), sample(before)];
    const solved = { ...free, r: add(free.r, hit.a.r), v: add(v, hit.a.v) };
    const kept = keepContact(history, 1, before, free, [{ t: at, dv: hit.a.v }], sample);
    history.push(sample(solved));
    assert.equal(kept, 4);
    assert.deepEqual(
      history.map((s) => s.t),
      [earlier.t, before.t, at, at, solved.t],
    );
    assert.deepEqual(history[2].r, history[3].r);
    assert.deepEqual(history[2].v, v);
    assert.deepEqual(history[3].v, solved.v);
    for (const field of ['r', 'centre']) {
      const origin = sample(before)[field];
      const point = (s) => s[field];
      for (let i = 0; i <= 100; i++) {
        const t = before.t + (dt * i) / 100;
        const travelled = between(history, t, point).r[0] - origin[0];
        const loose = Math.max(0, t - at) * hit.b.v[0];
        assert.ok(Math.abs(travelled - loose + Math.min(0.2, (t - before.t) * 40)) < 1e-7, `T+${t}, ${field}`);
      }
    }
  });
}
