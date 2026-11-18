import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/ma-6-friendship-7/flight.ts';
import { flight as ballistic } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { contact } from '../src/sim/contact.ts';
import { flyOrbit } from '../src/sim/orbital.ts';
import { turn } from '../src/sim/rigid.ts';
import {
  attitudeBetween,
  between,
  coastContacts,
  either,
  keepContact,
  orbitalFlown,
  orbitalRecord,
  orbitalRelease,
} from '../src/sim/run.ts';
import { Sheds } from '../src/sim/shed.ts';
import { recordSamples, steer } from '../src/sim/staged.ts';
import { stagedVehicle } from '../src/sim/stagedlive.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, dot, length, scale, siteFrame, sub } from '../src/world/frames.ts';

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
  assert.deepEqual(
    impacts[0].broken,
    bodies.map((body) => body.shedder.def.on),
  );
  assert.ok(bodies.every((body) => body.brokenAt === impacts[0].t));
  assert.equal(assembly.activeBrokenAt, Infinity);
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
    const kept = keepContact(history, 1, before, free, [{ t: at, dv: hit.a.v, dw: [0, 0, 1] }], sample);
    history.push(sample(solved));
    assert.equal(kept, 4);
    assert.deepEqual(
      history.map((s) => s.t),
      [earlier.t, before.t, at, at, solved.t],
    );
    assert.deepEqual(history[2].r, history[3].r);
    assert.deepEqual(history[2].v, v);
    assert.deepEqual(history[3].v, solved.v);
    assert.deepEqual(history[2].attitude, history[3].attitude);
    assert.deepEqual(sub(history[3].rates, history[2].rates), [0, 0, 1]);
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

test('an off-centre coast impact turns the retained capsule through replay and its next release', () => {
  const record = orbitalRecord(flight);
  const stage = record.sheds.get('adapter-clamp');
  const t = stage.from;
  const release = stage.shedder.release;
  const centre = flight.flies.datum + flight.plan.record.centre.value;
  const encounter = coastContacts(flight, flight.plan, record.samples, t, record.dropped, record.sheds, centre);
  const side = turn(release.q, [0, 1, 0]);
  const axis = turn(release.q, [1, 0, 0]);
  const offset = scale(axis, centre);
  const start = { t, r: sub(add(release.r, scale(side, -4)), offset), v: add(release.v, scale(side, 8)) };
  const coast = flyOrbit(
    flight.plan,
    siteFrame(flight.site),
    record.frame,
    flight.site.seaLevel.value,
    0.05,
    start,
    { given: { stop: t + 2 }, switched: [] },
    encounter.contacts,
  );
  const hit = encounter.hits.find((h) => h.on === 'adapter-clamp');
  assert.ok(hit);
  const sides = coast.samples.filter((s) => s.t === hit.t);
  assert.equal(sides.length, 2);
  assert.equal(sides[0].rotation, undefined);
  assert.ok(length(sides[1].rotation.rates) > 0.01);
  const whole = { ...orbitalFlown(flight), coast, down: null };
  const drawn = recordSamples(flight.plan, whole, record.frame, centre, () => [1e11, 0, 0]);
  const outgoing = drawn.filter((s) => s.t === hit.t).at(-1);
  const end = drawn.at(-1);
  assert.ok(length(sub(end.axis, outgoing.axis)) > 0.01);
  assert.ok(length(end.rates) > 0.01);
  assert.ok(length(sub(end.centre, add(end.r, scale(end.axis, centre)))) < 1e-8);
  const shed = orbitalRelease(flight.plan, stage.shedder.def, drawn, end.t);
  assert.ok(shed.q.every((v, i) => Math.abs(v - end.attitude[i]) < 1e-12));
  const arm = sub(shed.r, end.centre);
  const joint = flight.plan.craft[0].joints.find((j) => j.id === shed.on);
  const facing = stage.shedder.def.forward ? 1 : -1;
  const kick = scale(end.axis, facing * (joint.push?.value ?? stage.shedder.def.push?.value ?? 0));
  const tangential = cross(turn(end.attitude, end.rates), arm);
  assert.ok(length(sub(shed.v, add(end.v, add(tangential, kick)))) < 1e-7);
  assert.deepEqual(shed.w, end.rates);
  assert.ok(record.samples.every((s) => !s.rotation));
});

test('sustained fast tumble preserves far-field step counts and resolves whole turns between samples', () => {
  const record = orbitalRecord(flight),
    stage = record.sheds.get('adapter-clamp');
  const t = stage.from,
    centre = flight.flies.datum + flight.plan.record.centre.value;
  const start = { ...orbitalFlown(flight).ascent.separation, t };
  const stop = t + 3600;
  const fly = (rates) => {
    const encounter = coastContacts(
      flight,
      flight.plan,
      record.samples,
      t,
      record.dropped.map(() => Infinity),
      undefined,
      centre,
      rates,
    );
    let steps = 0;
    const contacts = {
      ...encounter.contacts,
      advance(...args) {
        steps++;
        return encounter.contacts.advance(...args);
      },
    };
    const coast = flyOrbit(
      flight.plan,
      siteFrame(flight.site),
      record.frame,
      flight.site.seaLevel.value,
      10,
      start,
      { given: { stop }, switched: [] },
      contacts,
    );
    return { coast, steps };
  };
  const still = fly([0, 0, 0]),
    turning = fly([0, 0, Math.PI * 2]);
  assert.equal(still.steps, turning.steps);
  assert.equal(still.coast.samples.length, turning.coast.samples.length);
  assert.ok(still.steps <= 365, 'orbital RK4 stays on ten-second steps');
  const whole = { ...orbitalFlown(flight), coast: turning.coast, down: null };
  const drawn = recordSamples(flight.plan, whole, record.frame, centre, () => [1e11, 0, 0]);
  const a = drawn.find((s) => !s.riding && s.t === t);
  const b = drawn[drawn.indexOf(a) + 1];
  const side = turn(a.attitude, [0, 1, 0]);
  const q = attitudeBetween(a, b, 0.25 / (b.t - a.t));
  assert.ok(length(sub(turn(q, [1, 0, 0]), side)) < 1e-8, 'one quarter revolution within a ten-second interval');
});

test('a scheduled coast release after half a turn leaves from its actual station about the capsule COM', () => {
  const run = orbitalRecord(flight),
    def = flight.plan.craft[0].sheds.find((d) => d.on === 'adapter-clamp');
  const start = run.sheds.get(def.on).from,
    t = start + 1;
  const centre = flight.flies.datum + flight.plan.record.centre.value;
  const dropped = run.dropped.map(() => Infinity);
  dropped[flight.flies.drops.findIndex((d) => d.on === def.on)] = t;
  const encounter = coastContacts(flight, flight.plan, run.samples, start, dropped, undefined, centre, [0, 0, Math.PI]);
  const at = { r: [6980000, 0, 0], v: [0, 7500, 0] };
  encounter.contacts.advance(at, t, { ...at, r: add(at.r, scale(at.v, 0.01)) }, t + 0.01);
  const release = encounter.sheds.get(def.on).shedder.release;
  const com = add(at.r, scale(either(run.samples, start)[0].axis, centre));
  const arm = turn(release.q, [def.centre.value - centre, 0, 0]);
  assert.ok(length(sub(release.r, add(com, arm))) < 1e-7);
});

test('a gentle coast contact followed by breakup on the same body within half a second records both', () => {
  const run = orbitalRecord(flight),
    stage = run.sheds.get('adapter-clamp'),
    start = stage.from;
  const centre = flight.flies.datum + flight.plan.record.centre.value;
  const encounter = coastContacts(flight, flight.plan, run.samples, start, run.dropped, run.sheds, centre);
  const loose = encounter.sheds.get('adapter-clamp');
  const axis = turn(loose.shedder.release.q, [1, 0, 0]);
  const pose = (t, gap, speed) => {
    const s = loose.at(t);
    return { r: add(s.r, scale(axis, gap - loose.shedder.release.centre)), v: add(s.v, scale(axis, speed)) };
  };
  encounter.contacts.advance(pose(start, 0.03, -1), start, pose(start + 0.05, -0.02, -1), start + 0.05);
  assert.equal(encounter.hits.length, 1);
  assert.ok(!encounter.hits[0].activeBroken);
  encounter.contacts.advance(pose(start + 0.05, 0.04, -40), start + 0.05, pose(start + 0.1, -1.96, -40), start + 0.1);
  assert.equal(encounter.hits.length, 2);
  assert.ok(encounter.hits[1].activeBroken);
  assert.ok(encounter.hits[1].broken.includes('adapter-clamp'));
});
