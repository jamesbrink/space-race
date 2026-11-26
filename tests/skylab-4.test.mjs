import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/skylab/flights/skylab-4/flight.ts';
import { lacks } from '../src/app/address.ts';
import { craftNodes, headingsOf } from '../src/app/lineup/row.ts';
import { assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack] = flight.models;
const cabinCargo = ['ExtendedVisitFood', 'CometBracketCase', 'ExperimentStowage', 'S201Camera'];
test('Skylab 4 has three Gallery seats and keeps the fin repair on the launch vehicle in the Lineup', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    stack.seats.map((seat) => seat.label),
    ['Carr’s left couch', 'Gibson’s centre couch', 'Pogue’s right couch'],
  );
  const frames = framesOf(new URL(`../public/${stack.url}`, import.meta.url));
  const craft = craftNodes(headingsOf(stack), (node) => frames.box(node)?.lo[1]);
  for (const node of cabinCargo) {
    assert.ok(stack.cabin.within.includes(node), node);
    assert.ok(craft.includes(node), node);
  }
  assert.ok(!craft.includes('FinFourAttachment'));
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`CSM-118 and SA-208 at ${level || 'full detail'} retain the final crew's hardware`, async () => {
    const file = new URL(`../public/${stack.url.replace('.glb', level + '.glb')}`, import.meta.url);
    const frames = framesOf(file);
    for (const node of [...cabinCargo, 'FinFourAttachment']) {
      assert.ok(frames.point(node), node);
      if (!level) assert.ok(frames.box(node).lo.every(Number.isFinite), node);
    }
    for (const node of ['HighGainAntenna', 'CircadianExperiment', 'XRayExperiment', 'ParasolCanister'])
      assert.equal(frames.point(node), null, node);
    if (!level) {
      await assertEnclosureClearance(stack, ['CrewCouches', 'CabinStructure', 'CabinEquipmentBays'], cabinCargo, level);
      await assertEnclosureClearance(stack, ['ServiceModule'], ['PropellantStorageModule', 'DescentBatteries'], level);
    }
  });
}

test('Skylab 4 opens in EST for all three crew members to board CSM-118', () => {
  assert.deepEqual(flight.site.zone, { name: 'EST', utcOffset: -5 });
  assert.equal(flight.opens.model, 'pad');
  const crew = flight.models.filter((model) => model.walker);
  assert.deepEqual(
    crew.map((model) => model.name),
    ['Carr', 'Gibson', 'Pogue'],
  );
  assert.deepEqual(
    stack.seats.map((seat) => seat.figure),
    crew.map((model) => model.id),
  );
  for (const seat of stack.seats) assert.equal(seat.open[0], flight.opens.at);
});
