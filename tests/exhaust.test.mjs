import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Plume, plumeShape } from '../src/viewer/plume.ts';

// The engine's fire as data: what the air lets it be, and what it is told (the drawing is exhaust.ts's, on the GPU).

test('the jet is nearly matched at sea level and opens as the air thins, without a step', () => {
  const sea = plumeShape(0);
  assert.equal(sea.width, 1, 'the exit is at nine tenths of an atmosphere: the jet does not swell');
  assert.equal(sea.air, 1);
  assert.ok(sea.length * 0.366 > 12 && sea.length * 0.366 < 16, 'about 14 m of fire under a 25 m vehicle');
  let last = sea;
  for (let v = 0.005; v <= 1; v += 0.005) {
    const s = plumeShape(v);
    assert.ok(s.width >= last.width && s.length >= last.length && s.air <= last.air && s.cell >= last.cell, `it only opens (${v})`);
    assert.ok(s.width - last.width < 6 && s.air - last.air > -0.03, `without a step (${v})`); // (fastest near vacuum: a tenth of its width in 0.005)
    last = s;
  }
  assert.ok(plumeShape(0.5).width > 3 && plumeShape(1).width >= 30, 'a wide balloon in near vacuum');
  assert.ok(plumeShape(1).air < 1e-3, 'with nothing to burn in or to stand shocks up');
});

test("the fire is the clock's: the same instant is the same fire, and its light is in the scene at no strength when it is out", () => {
  const plume = new Plume(0.366);
  assert.equal(plume.light.intensity, 0);
  assert.equal(plume.set(0, 0, -5, 1), false, 'nothing to draw before it lights');
  assert.equal(plume.mesh.visible, false);
  assert.equal(plume.set(1, 0, 3, 1), true);
  assert.ok(plume.mesh.visible && plume.light.intensity > 100);
  const day = plume.light.intensity;
  assert.equal(plume.time, 3, 'its motion is worked from the seconds it is given, not from a timer');
  plume.set(1, 0, 3, 12);
  assert.ok(plume.bright < 0.2 && plume.light.intensity < 0.2 * day, 'dimmed against a night exposure: not a white blot');
  plume.set(1, 0.95, 140, 1);
  assert.ok(plume.light.intensity < 0.4 * day, 'and fainter as the air thins');
  assert.equal(plume.set(0, 1, 143, 1), true, 'going out is a change');
  assert.equal(plume.light.intensity, 0);
  assert.equal(plume.set(0, 1, 144, 1), false);
});
