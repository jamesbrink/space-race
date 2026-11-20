import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/skylab/flights/skylab-4/flight.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf, materialsUnder } from './glb.mjs';

const stack = flight.models.find((model) => model.id === 'vehicle');
for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-208 carries eight reinforced fins and clears the service and booster engines at ${level || 'full detail'}`, async () => {
    const file = new URL(`../public/${stack.url.replace('.glb', `${level}.glb`)}`, import.meta.url);
    const frames = framesOf(file);
    const mounts = [];
    const first = frames.point('SA208_F1_Frame');
    const mountRadius = Math.hypot(first[0], first[2]);
    const finSpan = frames.box('SaturnFirstStage');
    assert.ok(Math.abs(finSpan.hi[0] - finSpan.lo[0] - 40.7 * 0.3048) < 0.02);
    for (let i = 1; i <= 8; i++) {
      const name = `SA208_F${i}_Frame`;
      mounts.push(name);
      const [x, y, z] = frames.point(name);
      const theta = ((i - 1) * Math.PI) / 4;
      assert.ok(Math.abs(x - mountRadius * Math.cos(theta)) < 0.001, name);
      assert.ok(Math.abs(z + mountRadius * Math.sin(theta)) < 0.001, name);
      assert.ok(Math.abs(y - first[1]) < 0.001, name);
      const materials = materialsUnder(file, name);
      assert.ok(materials.includes('sa208-fin-reinforcing-block'), name);
      assert.ok(materials.includes('sa208-fin-attachment-steel'), name);
      assert.deepEqual(materialsUnder(file, `SIB_OuterTank_${i - 1}`), ['saturn-white']);
    }
    const finFour = frames.box('FinFourAttachment');
    assert.ok(finFour.hi[1] - finFour.lo[1] > 0.3);
    for (const node of ['XRayExperiment', 'XRayRecorder', 'XRayGasSupply', 'M415SensorPanel1', 'M415SensorPanel2'])
      assert.equal(frames.point(node), null, node);
    assert.ok(Math.abs(frames.box('LaunchEscape').hi[1] - 223.5 * 0.3048) < 0.02);
    await assertAdapterClearance(stack, ['ServiceEngine'], level);
    await assertEnclosureClearance(stack, ['FirstStageEngines'], mounts, level);
  });
}
