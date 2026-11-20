import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/skylab/flights/skylab-2/flight.ts';
import { assertAdapterClearance } from './apollo-adapter-clearance.mjs';
import { framesOf, materialsUnder } from './glb.mjs';

const stack = flight.models[0];
for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-206 flight hardware and retained adapter clear the SPS at ${level || 'full detail'}`, async () => {
    const file = new URL(`../public/${stack.url.replace('.glb', `${level}.glb`)}`, import.meta.url);
    const frames = framesOf(file);
    for (let i = 0; i < 8; i++) assert.deepEqual(materialsUnder(file, `SIB_OuterTank_${i}`), ['saturn-white']);
    for (const [prefix, count, offset] of [
      ['SA206_Retro', 4, 0],
      ['SA206_Ullage', 3, 0],
      ['SA206_APS', 2, 1],
      ['M415_Panel', 2, 1],
    ]) {
      for (let i = offset; i < offset + count; i++) assert.ok(frames.point(prefix + i), prefix + i);
      assert.equal(frames.point(prefix + (offset + count)), null);
    }
    for (let i = 1; i <= 2; i++) {
      const box = frames.box(`SA206_APSCover${i}`);
      assert.ok(Math.abs(box.hi[1] - box.lo[1] - 80 * 0.0254) < 0.001);
      for (let r = 1; r <= 3; r++) assert.ok(frames.point(`M415_Cover${i}_${r}`));
    }
    const adapter = stack.parts.find((p) => p.node === 'SpacecraftAdapter');
    assert.equal(adapter.moves.filter((m) => m.node?.startsWith('SLA_Door_') && m.kind === 'swing' && m.angle === Math.PI / 4).length, 4);
    assert.ok(!adapter.moves.some((m) => m.node?.startsWith('SLA_Door_') && m.kind === 'slide'));
    await assertAdapterClearance(stack, ['ServiceEngine'], level);
  });
}
