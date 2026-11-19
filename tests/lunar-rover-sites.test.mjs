import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { flight as apollo15 } from '../missions/usa/apollo/flights/apollo-15/flight.ts';
import { flight as apollo16 } from '../missions/usa/apollo/flights/apollo-16/flight.ts';
import { atSite } from '../src/app/address.ts';
import { LunarTerrain, TERRAIN_INTERVALS, TERRAIN_SPACING } from '../src/world/lunar-terrain.ts';
import { framesOf } from './glb.mjs';

for (const [flight, site] of [
  [apollo15, 'hadley'],
  [apollo16, 'descartes'],
]) {
  test(`${site} terrain meets at every mesh edge and supports the four landing pads`, () => {
    const file = readFileSync(`public/lunar/${site}.terrain.bin`);
    const terrain = new LunarTerrain(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    assert.equal(terrain.height(0, 0), 0);
    for (const step of TERRAIN_SPACING.slice(0, -1)) {
      const edge = (TERRAIN_INTERVALS / 2) * step;
      for (let i = -edge; i <= edge; i += step) {
        for (const sign of [-1, 1]) {
          const a = sign * edge,
            b = sign * (edge + 0.001);
          assert.ok(Math.abs(terrain.height(a, i) - terrain.height(b, i)) < 0.005);
          assert.ok(Math.abs(terrain.height(i, a) - terrain.height(i, b)) < 0.005);
        }
      }
    }
    const pads = [
      [-16.4, 0],
      [-7.6, 0],
      [-12, 4.4],
      [-12, -4.4],
    ].map(([x, z]) => terrain.height(x, z));
    assert.ok(Math.abs(pads[0] + pads[1] - pads[2] - pads[3]) < 0.02);
  });

  test(`${site} exhibits the flight rover with the documented wheelbase, track and its own science load`, () => {
    const rover = flight.models.find((model) => model.id === 'rover');
    assert.equal(rover.lunarRover.site, site);
    assert.ok(!atSite(flight).models.some((model) => model.id === 'rover'));
    assert.equal(rover.seats.length, 2);
    for (const level of ['', '.lod1', '.lod2']) {
      const frame = framesOf(`public/${rover.url.replace('.glb', `${level}.glb`)}`);
      const [fl, fr, rl] = ['FL', 'FR', 'RL'].map((corner) => frame.point(`LRV_Wheel_${corner}`));
      assert.ok(Math.abs(fl[0] - rl[0] - 90 * 0.0254) < 0.001);
      assert.ok(Math.abs(fr[2] - fl[2] - 72 * 0.0254) < 0.001);
      assert.equal(Boolean(frame.point('RoverScience')), site === 'descartes');
      for (const seat of rover.seats) assert.ok(frame.point(seat.node));
    }
  });
}
