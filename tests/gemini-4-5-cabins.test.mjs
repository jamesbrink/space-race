import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { flight as four } from '../missions/usa/gemini/flights/gt-4/flight.ts';
import { flight as five } from '../missions/usa/gemini/flights/gt-5/flight.ts';
import { materialsUnder } from './glb.mjs';

for (const [flight, wearers] of [
  [four, ['mcdivitt', 'white']],
  [five, ['cooper', 'conrad']],
]) {
  test(`${flight.id}: the two men see from their own eyes and the flight carries its equipment`, () => {
    const vehicle = flight.models.find((model) => model.id === 'vehicle');
    const file = new URL(`../public/${vehicle.url}`, import.meta.url);
    const glb = readFileSync(file);
    const gltf = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
    const nodes = new Set(gltf.nodes.map((node) => node.name));
    for (const [i, seat] of vehicle.seats.entries()) {
      const man = seat.node.replace('Seat_', 'Crew_');
      assert.ok(materialsUnder(file, `${man}_Torso_NameTag`).includes(`name-tag-${wearers[i]}`));
      const helmet = [...nodes].filter((name) => name.startsWith(`${man}_Helmet_`));
      assert.ok(helmet.length > 0);
      assert.deepEqual(new Set(seat.hide), new Set(helmet));
    }
    for (const name of ['Retro_MSC1Sensor', 'Retro_MSC1Electronics', 'Retro_MSC1Door']) assert.ok(nodes.has(name), name);
    assert.equal(nodes.has('Eva_VentilationModule'), flight === four);
    assert.equal(nodes.has('Retro_DockingLight'), flight === five);
  });
}
