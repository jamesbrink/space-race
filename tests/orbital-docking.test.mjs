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
