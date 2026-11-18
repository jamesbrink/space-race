import assert from 'node:assert/strict';
import test from 'node:test';
import { DockPair, portGap } from '../src/sim/docking.ts';
import { aboutAxis, IDENTITY, turn, unturn } from '../src/sim/rigid.ts';
import { add, cross, length, scale, sub } from '../src/world/frames.ts';
const limits = { stroke: 0.25, radius: 0.1, tilt: 0.1, roll: 0.1, closing: 0.3, sideways: 0.1, angular: 0.1, retract: 4 };
function pair(overrides = {}, geometry = {}) {
  const b = { r: [6700000, 0, 0], v: [0, 0, 7700], q: IDENTITY, w: [0, 0, 0], port: 2, mass: 1200, inertia: [500, 400, 600] };
  const a = { ...b, r: add(b.r, [0, 4.2, 0]), v: add(b.v, [0, -0.2, 0]), q: aboutAxis([0, 0, 1], Math.PI), mass: 800, ...overrides };
  return new DockPair(a, b, { ...limits, ...geometry });
}
function conserved(run) {
  const a = run.bodies[0],
    m = run.bodies.reduce((m, b) => m + b.mass, 0);
  const average = (field) => run.bodies.reduce((c, b) => add(c, scale(sub(b[field], a[field]), b.mass / m)), a[field]);
  const r = average('r'),
    v = average('v');
  const h = run.bodies.reduce(
    (h, x) =>
      add(
        h,
        add(
          turn(
            x.q,
            x.w.map((s, i) => s * x.inertia[i]),
          ),
          scale(cross(sub(x.r, r), sub(x.v, v)), x.mass),
        ),
      ),
    [0, 0, 0],
  );
  return { r, v, h };
}
test('closed shrouds and out-of-envelope ports reject a docking request', () => {
  for (const p of [
    pair({}, { blocked: true }),
    pair({ r: [6700001, 4.2, 0] }),
    pair({ r: [6700000, 5, 0] }),
    pair({ q: IDENTITY }),
    pair({ w: [0, 0.2, 0] }),
    pair({ v: [0, -1, 7700] }),
    pair({ v: [1, 0, 7700] }),
    pair({ v: [0, 0.1, 7700] }),
  ]) {
    assert.equal(p.attempt(), false);
    assert.equal(p.phase, 'free');
  }
});
test('capture and draw-in conserve angular momentum, seat both ports, and allow repeated docking', () => {
  const run = pair({ r: [6700000.03, 4.2, 0], w: [0.01, 0.01, 0.01] });
  const initial = conserved(run);
  assert.ok(run.attempt());
  assert.equal(run.phase, 'capture');
  assert.ok(length(sub(conserved(run).v, initial.v)) < 1e-10);
  for (let i = 0; i < 20; i++) {
    run.advance(0.2, 0);
    assert.ok(length(sub(conserved(run).h, initial.h)) < 1e-4);
  }
  assert.equal(run.phase, 'hard');
  assert.ok(Math.abs(portGap(...run.bodies).gap) < 1e-8);
  const before = conserved(run);
  for (const invalid of [-0.1, NaN, Infinity]) {
    assert.equal(run.undock(invalid), false);
    assert.equal(run.phase, 'hard');
  }
  assert.ok(run.undock(0));
  assert.ok(length(sub(conserved(run).v, before.v)) < 1e-10);
  assert.ok(run.attempt());
  run.advance(4, 1);
  assert.ok(run.undock(0.12));
  assert.ok(Math.abs(portGap(...run.bodies).closing + 0.12) < 1e-6);
});
test('firing either spacecraft accelerates the full joined mass', () => {
  for (const pilot of [0, 1]) {
    const run = pair(),
      inert = pair();
    for (const x of [run, inert]) {
      assert.ok(x.attempt());
      x.advance(4, 0);
    }
    run.advance(0.1, pilot, [0, 2000, 0]);
    inert.advance(0.1, pilot);
    const dv = unturn(run.bodies[pilot].q, sub(conserved(run).v, conserved(inert).v));
    assert.ok(Math.abs(dv[1] - 0.1) < 1e-7);
    assert.ok(Math.abs(portGap(...run.bodies).gap) < 1e-8);
  }
});

test('the carrier and mated spacecraft part with continuous port pose, total momentum and inherited spin', () => {
  const run = pair({ w: [0.004, 0.002, 0.001] });
  const targetMass = run.bodies[1].mass;
  run.mountTarget(2200, 5, [1900, 1400, 1550]);
  assert.equal(run.extract(), false);
  assert.ok(run.attempt());
  run.advance(4, 0);
  const before = conserved(run),
    positions = [...run.bodies[0].r];
  assert.ok(run.extract());
  assert.equal(run.extract(), false);
  assert.equal(run.bodies[1].mass, targetMass);
  assert.equal(run.released.mass, 2200);
  const union = conserved({ bodies: [...run.bodies, run.released] });
  assert.ok(length(sub(before.r, union.r)) < 1e-8);
  assert.ok(length(sub(before.v, union.v)) < 1e-8);
  assert.ok(length(sub(before.h, union.h)) < 1e-5);
  assert.ok(length(sub(positions, run.bodies[0].r)) < 1e-8);
  assert.ok(Math.abs(portGap(...run.bodies).gap) < 1e-8);
});

test('each terminal approach reaches its own outcome with the sequence engaged', async () => {
  const { terminalApproach } = await import('../src/sim/approach.ts');
  for (const id of ['gemini/gt-8', 'gemini/gt-9a', 'gemini/gt-10', 'gemini/gt-11', 'gemini/gt-12', 'apollo/apollo-9']) {
    const [program, name] = id.split('/');
    const { flight } = await import('../missions/usa/' + program + '/flights/' + name + '/flight.ts');
    for (const redock of name === 'apollo-9' ? [false, true] : [false]) {
      const run = terminalApproach(flight, redock);
      const start = run.t;
      let captured;
      for (let i = 0; i < 1700 && run.phase !== 'hard'; i++) {
        run.advance(0.05, 0);
        if (run.attempt()) captured = run.t;
      }
      if (name === 'gt-9a') {
        assert.equal(run.phase, 'free');
        continue;
      }
      assert.equal(run.phase, 'hard', id);
      assert.ok(Math.abs(captured - (redock ? 99 * 3600 + 2 * 60 + 26 : flight.docking.at)) < 0.5, id + ' contact epoch');
      assert.ok(run.t > start && Math.abs(portGap(...run.bodies).gap) < 1e-7, id);
    }
  }
});

test('the Gemini X and XI Agenas burn for the joined ships and the XI tether carries tension through a turn', async () => {
  const { terminalApproach, startDockedBurn, startTether } = await import('../src/sim/approach.ts');
  const { tetherAnchor } = await import('../src/sim/tether.ts');
  const { elementsOf } = await import('../src/world/orbit.ts');
  const { WGS84_A } = await import('../src/world/bodies.ts');
  for (const n of [10, 11]) {
    const { flight } = await import('../missions/usa/gemini/flights/gt-' + n + '/flight.ts');
    const run = terminalApproach(flight);
    while (run.phase !== 'hard') {
      run.advance(0.05, 0);
      run.attempt();
    }
    const results = [];
    for (const burn of flight.docking.burns) {
      const op = startDockedBurn(run, burn);
      assert.ok(op);
      run.advance(op.until - run.t, 1, [0, op.thrust, 0]);
      const { a, e } = elementsOf(run.bodies[1].r, run.bodies[1].v);
      results.push((a * (1 + e) - WGS84_A) / 1852);
      assert.ok(Math.abs(portGap(...run.bodies).gap) < 1e-8);
    }
    // Historical apsides reconstructed from tracking, compared to osculating apogee at thrust cutoff.
    if (n === 10) assert.ok(Math.abs(results[0] - 412) < 6);
    else {
      assert.ok(Math.abs(results[1] - 741.5) < 2);
      assert.ok(Math.abs(results[2] - 164.2) < 4);
      assert.ok(startTether(run, flight.docking.tether));
      let pulled = false;
      for (let t = 0; t < 620; t += 0.25) {
        run.advance(0.25, 0);
        const span = length(sub(...run.bodies.map(tetherAnchor)));
        assert.ok(span < run.tetherLength + 0.001);
        assert.ok(run.tension >= 0);
        pulled ||= run.tension > 0.1;
      }
      assert.ok(pulled);
    }
  }
});

test('Apollo 9 departs co-aligned, turns through 180 degrees, waits at stand-off and closes at its measured speed', async () => {
  const { terminalApproach, transpositionInput } = await import('../src/sim/approach.ts');
  const { flight } = await import('../missions/usa/apollo/flights/apollo-9/flight.ts');
  const run = terminalApproach(flight, false, true);
  assert.ok(portGap(...run.bodies).tilt > 3.14);
  let outside = false;
  let before;
  for (let n = 0; n < 27000 && run.phase === 'free'; n++) {
    const { force, torque } = transpositionInput(run, flight);
    run.advance(0.05, 0, force, torque);
    before = portGap(...run.bodies);
    outside ||= before.tilt < 0.01 && before.gap > 17.5;
    run.attempt();
  }
  assert.ok(outside);
  assert.equal(run.phase, 'capture');
  assert.ok(Math.abs(before.closing / 0.3048 - 0.3) < 0.01);
  assert.ok(Math.abs(before.offset / 0.0254 - 3.2) < 0.2);
});

test('simultaneous loads act on their own vehicles when joined and after the pilots separate', () => {
  const run = pair(),
    base = pair();
  for (const state of [run, base]) {
    assert.ok(state.attempt());
    state.advance(4, 0);
  }
  const zero = [0, 0, 0],
    forceA = [0, 100, 0],
    forceB = [0, 1000, 0];
  run.advanceBoth(0.05, [forceA, forceB], [zero, zero]);
  base.advance(0.05, 0);
  const delta = sub(conserved(run).v, conserved(base).v);
  assert.ok(Math.abs(delta[1] - ((1000 - 100) * 0.05) / 2000) < 1e-8);
  assert.ok(run.undock(0));
  const inert = new DockPair(...structuredClone(run.bodies), run.limits, run.t);
  run.advanceBoth(0.05, [zero, forceB], [[100, 0, 0], zero]);
  inert.advance(0.05, 0);
  assert.deepEqual(run.bodies[1].w, inert.bodies[1].w);
  assert.ok(length(sub(run.bodies[0].w, inert.bodies[0].w)) > 0.001);
  assert.ok(length(sub(run.bodies[0].v, inert.bodies[0].v)) < 1e-7);
  assert.ok(length(sub(run.bodies[1].v, inert.bodies[1].v)) > 0.03);
});

test('Gemini X leaves its first target, flies its optical transfer, and station-keeps alongside Gemini VIII’s Agena', async () => {
  const { flight } = await import('../missions/usa/gemini/flights/gt-10/flight.ts');
  const { terminalApproach, startDockedBurn } = await import('../src/sim/approach.ts');
  const { startVisit, flybyInput, stationKeep } = await import('../src/sim/flyby.ts');
  const first = terminalApproach(flight);
  while (first.phase !== 'hard') {
    first.advance(0.05, 0);
    first.attempt();
  }
  for (const burn of flight.docking.burns) {
    const op = startDockedBurn(first, burn);
    first.advance(op.until - first.t, 1, [0, op.thrust, 0]);
  }
  const visit = flight.docking.visit;
  const run = startVisit(first, visit);
  const [a, b] = run.bodies;
  assert.ok(run.released && run.released !== b);
  assert.ok(Math.abs(length(sub(a.r, b.r)) / 1852 - 14.2) < 1e-8);
  assert.equal(run.attempt(), false);
  while (run.t < visit.hold) run.advance(0.1, 0, flybyInput(run, visit, 2 * flight.docking.controls.ahead.value));
  assert.ok(length(sub(a.r, b.r)) < 10);
  assert.ok(length(sub(a.v, b.v)) < 0.01);
  assert.ok(length(sub(b.r, run.released.r)) > 1000);
  assert.ok(stationKeep(run, visit));
  const nose = add(a.r, turn(a.q, [0, a.port, 0]));
  const reach = unturn(b.q, sub(nose, b.r));
  assert.ok(Math.abs((reach[2] - visit.radius.value) / 0.3048 - 5) < 1e-6);
  assert.ok(Math.abs(turn(a.q, [0, 1, 0]).reduce((n, x, i) => n + x * turn(b.q, [0, 1, 0])[i], 0) + 0.5) < 1e-9);
});

test('LM-active terminal rendezvous flies from the radar fix through the photographic stand-off into a hard joint', async () => {
  const { flight } = await import('../missions/usa/apollo/flights/apollo-9/flight.ts');
  const { startRendezvous, rendezvousInput } = await import('../src/sim/rendezvous.ts');
  const run = startRendezvous(flight),
    op = flight.docking.rendezvous;
  assert.ok(length(sub(...run.bodies.map((b) => b.r))) > 21 * 1852);
  let hold = NaN,
    contact,
    photographed = false;
  for (let i = 0; i < 81000 && run.phase !== 'hard'; i++) {
    const f = run.phase === 'free' ? rendezvousInput(run, flight) : [0, 0, 0];
    run.advance(0.05, 1, f);
    if (Math.abs(run.t - op.station) < 0.025) hold = portGap(...run.bodies).gap;
    if (
      run.t > op.station &&
      run.phase === 'free' &&
      Math.abs(portGap(...run.bodies).gap - op.hold.value) < 0.3 &&
      Math.abs(portGap(...run.bodies).closing) < 0.1
    )
      photographed = true;
    if (run.attempt()) contact = run.t;
  }
  assert.ok(Number.isFinite(hold));
  assert.ok(photographed, 'formation for photography');
  assert.ok(Math.abs(contact - op.contact) < 1, 'contact epoch ' + contact);
  assert.equal(run.phase, 'hard');
});
