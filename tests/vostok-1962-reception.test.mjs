import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as first } from '../missions/ussr/vostok/flights/vostok-3/flight.ts';
import { flight as second } from '../missions/ussr/vostok/flights/vostok-4/flight.ts';
import { plan } from '../src/viewer/onfoot/crowd.ts';
import { goneAt } from '../src/viewer/onfoot/going.ts';
import { framesOf } from './glb.mjs';

for (const flight of [first, second]) {
  test(`${flight.id}: people meet the bus, walk clear of it and leave before launch`, () => {
    const pad = flight.models.find((model) => model.id === 'pad');
    const reception = pad.parts.find((part) => part.node === 'Reception');
    const route = reception.going[0];
    const bus = pad.parts.find((part) => part.node === 'Bus').clocked[0];
    const [dx, dz] = bus.path.at(-1);
    for (const level of ['', '.lod1', '.lod2']) {
      const frames = framesOf(new URL(`../public/${pad.url.replace('.glb', `${level}.glb`)}`, import.meta.url));
      const { lo, hi } = frames.box('Bus');
      const starts = [];
      for (let i = 1; ; i++) {
        const position = frames.point(`Reception_Person_${i}`);
        if (!position) break;
        starts.push({ at: [position[0], position[2]], facing: 0 });
      }
      assert.equal(starts.length, 17);
      for (const [i, { going, delay }] of plan(route, starts).entries()) {
        const from = starts[i].at;
        assert.equal(goneAt(going, from, flight.opens.at, delay).out, false);
        for (let time = going.at.value; time < going.at.value + 90; time += 0.25) {
          const { x, z } = goneAt(going, from, time, delay);
          assert.ok(x < lo[0] + dx - 0.25 || x > hi[0] + dx + 0.25 || z < lo[2] + dz - 0.25 || z > hi[2] + dz + 0.25);
        }
        assert.equal(goneAt(going, from, 0, delay).out, true);
      }
    }
  });
}
