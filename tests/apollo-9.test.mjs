import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flight } from '../missions/usa/apollo/flights/apollo-9/flight.ts';
import { framesOf } from './glb.mjs';

const [vehicle, spider] = flight.models;
const inch = 0.0254;
const measure = (actual, inches, tolerance = 0.02) =>
  assert.ok(Math.abs(actual / inch - inches) < tolerance, `${actual / inch} in vs ${inches} in`);
for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Apollo 9 launch and deployed geometry at ${suffix || 'full detail'}`, () => {
    const frames = (model) => framesOf(fileURLToPath(new URL('../public/' + model.url.replace('.glb', suffix + '.glb'), import.meta.url)));
    const stack = frames(vehicle);
    const lm = frames(spider);
    for (let i = 1; i <= 4; i++) {
      const [x, , z] = stack.point(`F1_Mount_${i}`);
      measure(Math.hypot(x, z), 182);
    }
    measure(stack.box('FirstStageEngines').hi[1], 115 + 749 - 517 + 120 - 233.7);
    const pad = lm.box('LM3_Footpad_0');
    measure(pad.lo[1], 0);
    measure(pad.hi[0] - pad.lo[0], 37);
    measure(pad.hi[0] - lm.box('LM3_Footpad_2').lo[0], 372.14);
    measure(lm.box('LM3_SBand').hi[1], 277, 0.75);
    for (const model of [stack, lm]) {
      const plane = model.point('LMDescent')[1];
      measure(model.box('LM3_APS_NozzleExtension').lo[1] - plane, 112);
      measure(model.box('LM3_DPS_NozzleExtension').lo[1] - plane, 18.48);
      measure(model.box('LM3_InterstageDeck').lo[1] - plane, 127.16);
      assert.ok(model.point('LM3_AscentBlastDeflector'));
      // Each thruster where the guidance computer was told it was (MIT R-567 section 6, 6.4.1.4): the plane of the
      // clusters is 254 in above that document's origin, which is 180.15 in above the pads. Clusters I to IV go round
      // from the left forward corner by the rear; the viewer's +Z is the LM's right.
      for (const [quad, fore, right] of [
        ['I', 1, -1],
        ['II', -1, -1],
        ['III', -1, 1],
        ['IV', 1, 1],
      ]) {
        for (const [jet, x, height, z] of [
          ['U', 66.1, 180.15 + 4.8, 66.1],
          ['D', 66.1, 180.15 - 5.3, 66.1],
          ['F', 66.35, 180.15, 61.5],
          ['S', 61.5, 180.15, 66.35],
        ]) {
          const at = model.point(`LM3_Thruster_${quad}_${jet}`);
          assert.ok(at, `${quad}-${jet}`);
          measure(at[0], x * fore);
          measure(at[1] - plane, height);
          measure(at[2], z * right);
        }
      }
    }
    // On the forward face the radar's dish and the tracking light are on the centreline (AS09-21-3212), in both models.
    for (const model of [stack, lm]) {
      for (const name of ['LM3_RendezvousRadar', 'LM_TrackingLampLens']) {
        const { lo, hi } = model.box(name);
        measure((lo[2] + hi[2]) / 2, 0, 1.5);
      }
    }
    for (const seat of spider.seats) assert.ok(lm.point(seat.node), seat.label);
    for (const part of spider.parts) assert.ok(stack.point(part.node), part.name);
    assert.ok(stack.point('CM104_ProbeExtension'));
  });
}
