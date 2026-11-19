import assert from 'node:assert/strict';
import { test } from 'node:test';
import { falconStackParts } from '../missions/usa/apollo/flights/apollo-15/falcon.ts';
import { flight } from '../missions/usa/apollo/flights/apollo-15/flight.ts';
import { lacks } from '../src/app/address.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack, lander] = flight.models;
test('Apollo 15 exhibits Endeavour and Falcon with their flown crew stations', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.ok(lacks(flight, 'site') && lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((model) => model.id),
    ['vehicle', 'falcon'],
  );
  assert.deepEqual(
    stack.seats.map((seat) => seat.label),
    ['Scott’s left couch', 'Worden’s centre couch', 'Irwin’s right couch'],
  );
  assert.deepEqual(
    lander.seats.map((seat) => seat.label.split('’')[0]),
    ['Scott', 'Irwin'],
  );
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-510 carries Falcon clear of SLA-19 through the Gallery slider at ${level || 'full detail'}`, async () => {
    const frames = (model) => framesOf(new URL(`../public/${model.url.replace('.glb', level + '.glb')}`, import.meta.url));
    const rocket = frames(stack);
    const deployed = frames(lander);
    assert.ok(Math.abs(rocket.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
    for (let i = 0; i < 4; i++) {
      assert.ok(rocket.point(`SLA19_DoorPanel_${i}`));
      assert.ok(rocket.point(`SIC510_Bearing_${i + 1}`));
    }
    for (const node of ['SIMDoor', 'SIMCameras', 'SIMBooms', 'Subsatellite', 'ReserveHydrogen', 'PogoAccumulator']) {
      assert.ok(rocket.point(node), node);
    }
    for (const fin of ['A', 'C']) {
      for (const motor of [1, 2]) assert.ok(rocket.point(`SIC10_Retro${fin}${motor}_Case`));
    }
    for (let i = 1; i <= 4; i++) assert.equal(rocket.point(`SII10_UllageFairing_${i}`), null);
    for (const end of ['Front', 'Rear']) {
      for (const side of ['Left', 'Right']) {
        const wheel = `LM10_${end}${side}WheelWireTire`;
        assert.ok(rocket.point(wheel) && deployed.point(wheel), wheel);
      }
    }
    const span = (frame) => frame.box('LMLandingGear').hi[0] - frame.box('LMLandingGear').lo[0];
    assert.ok(span(deployed) > span(rocket) + 1, 'gear folds in flight and stands extended on the separate Falcon plinth');
    await assertEnclosureClearance(
      stack,
      ['SIMDoor'],
      ['SIMBay', 'SIMCameras', 'SIMBooms', 'Subsatellite', 'ReserveOxygen', 'ReserveHydrogen', 'ReactionControl'],
      level,
    );
    await assertAdapterClearance(
      stack,
      falconStackParts.map((part) => part.node),
      level,
    );
  });
}
