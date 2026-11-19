import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flight } from '../missions/usa/apollo/flights/apollo-10/flight.ts';
import { framesOf } from './glb.mjs';

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Snoopy and its docking hardware in both exhibits at ${suffix || 'full detail'}`, () => {
    for (const id of ['vehicle', 'snoopy']) {
      const model = flight.models.find((m) => m.id === id);
      assert.ok(model, id);
      const path = new URL('../public/' + model.url.replace('.glb', suffix + '.glb'), import.meta.url);
      const frames = framesOf(fileURLToPath(path));
      if (!suffix) {
        for (const seat of model.seats) assert.ok(frames.point(seat.node), seat.label);
        const power = frames.box('LMDescentPower');
        // MSC-00126 appendix A.2.1 moves two batteries to quadrant I and two to IV.
        // With the ladder on +X, the two forward bays straddle the LM's centreline.
        assert.ok(power.lo[0] > 0, model.name);
        assert.ok(power.lo[2] < 0 && power.hi[2] > 0, model.name);
      }
      for (let i = 0; i < 4; i++) assert.ok(frames.point(`LM3_ProbeHinge_${i}`), model.name);
      // The same four diagonal outriggers ride inside the adapter and leave with the ascent stage.
      for (const quad of ['I', 'II', 'III', 'IV']) {
        for (const jet of ['U', 'D', 'F', 'S']) assert.ok(frames.point(`LM3_Thruster_${quad}_${jet}`), `${quad}-${jet}`);
        const [x, , z] = frames.point(`LM3_Thruster_${quad}_U`);
        for (const arm of [x, z]) assert.ok(Math.abs(Math.abs(arm) / 0.0254 - 66.1) < 0.02, quad);
      }
      for (const port of model.dockingPorts) assert.ok(frames.point(port.frame), port.frame);
    }
  });
}
