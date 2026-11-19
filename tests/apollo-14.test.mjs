import assert from 'node:assert/strict';
import { test } from 'node:test';
import { antaresStackParts } from '../missions/usa/apollo/flights/apollo-14/antares.ts';
import { flight } from '../missions/usa/apollo/flights/apollo-14/flight.ts';
import { lacks } from '../src/app/address.ts';
import { assertAdapterClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack, lander] = flight.models;

test('Apollo 14 opens Kitty Hawk and Antares with their flown stations', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.ok(lacks(flight, 'site'));
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((model) => model.id),
    ['vehicle', 'antares'],
  );
  assert.deepEqual(
    stack.seats.map((seat) => seat.label),
    ['Shepard’s left couch', 'Roosa’s centre couch', 'Mitchell’s right couch'],
  );
  assert.deepEqual(
    lander.seats.map((seat) => seat.label.split('’')[0]),
    ['Shepard', 'Mitchell'],
  );
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-509 carries Kitty Hawk and Antares inside SLA-17 at ${level || 'full detail'}`, async () => {
    const frames = (model) => framesOf(new URL(`../public/${model.url.replace('.glb', level + '.glb')}`, import.meta.url));
    const rocket = frames(stack);
    assert.ok(Math.abs(rocket.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
    for (let i = 0; i < 4; i++) {
      assert.ok(rocket.point(`SLA17_DoorPanel_${i}`));
      assert.ok(rocket.point(`SIC509_Bearing_${i + 1}`));
    }
    for (const name of ['PogoAccumulator', 'LunarImpactRadio', 'ReserveOxygen', 'ReserveOxygenCore', 'AuxiliaryBattery']) {
      assert.ok(rocket.point(name), name);
    }
    const deployed = frames(lander);
    for (const name of ['LM8_METPneumaticTires', 'LM8_CornerCubePanelCase', 'LM8_MagnetometerReadout']) {
      assert.ok(rocket.point(name) && deployed.point(name), name);
    }
    const gear = 'LMLandingGear';
    assert.ok(deployed.box(gear).hi[0] - deployed.box(gear).lo[0] > rocket.box(gear).hi[0] - rocket.box(gear).lo[0] + 1);
    await assertAdapterClearance(
      stack,
      antaresStackParts.map((part) => part.node),
      level,
    );
  });
}
