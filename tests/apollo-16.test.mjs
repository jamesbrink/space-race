import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-16/flight.ts';
import { orionStackParts } from '../missions/usa/apollo/flights/apollo-16/orion.ts';
import { lacks, openingFor } from '../src/app/address.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf, materialsUnder } from './glb.mjs';

const [stack, orion] = flight.models;
test('Apollo 16 opens Casper and Orion with the five flown crew stations', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((model) => model.id),
    ['vehicle', 'orion', 'pad', 'crew', 'pilot', 'lmp', 'rover'],
  );
  assert.deepEqual(
    stack.seats.map((seat) => seat.label),
    ['Young’s left couch', 'Mattingly’s centre couch', 'Duke’s right couch'],
  );
  assert.deepEqual(
    orion.seats.map((seat) => seat.label.split('’')[0]),
    ['Young', 'Duke'],
  );
  const retros = flight.motors.find((motor) => motor.name.includes('retrorocket'));
  assert.equal(retros.count, 8);
});

test('the crew can board Casper on ML-3 before arm 9 parks and retracts', () => {
  const pad = flight.models.find((model) => model.id === 'pad');
  const crew = flight.models.filter((model) => model.walker);
  assert.equal(pad.name, 'Mobile launcher 3');
  assert.match(pad.url, /pad-a-1972-04\.glb$/);
  assert.deepEqual(flight.site.zone, { name: 'EST', utcOffset: -5 });
  assert.equal(openingFor(flight, { fly: false, named: '', clockAt: 0, running: false }).model, 'pad');
  assert.deepEqual(
    stack.seats.map((seat) => [seat.figure, ...seat.open]),
    crew.map((model) => [model.id, -9600, -6300]),
  );
  const event = (words) => pad.sequence.find((key) => key.event.includes(words));
  assert.ok(event('12° standby').at <= -2995);
  assert.ok(event('retracts from standby').at < -272);
  assert.ok(event('fully retracted').at > -272);
  assert.equal(event('First vehicle motion').at, 0.3);
  for (const suffix of ['.glb', '.lod1.glb', '.lod2.glb']) {
    const url = (model) => new URL(`../public/${model.url.replace('.glb', suffix)}`, import.meta.url);
    const launcher = framesOf(url(pad));
    for (const node of ['LH2_Purge_Console', 'ECS_Room', 'ECS_Air_Plenum', 'Intertank_LOX_Carrier']) assert.ok(launcher.point(node), node);
    for (const suit of crew) {
      const file = url(suit);
      assert.ok(framesOf(file).point(suit.id === 'pilot' ? 'Torso_RearEntry' : 'Torso_SideEntry'));
      for (const limb of ['Arms', 'Legs']) assert.equal(materialsUnder(file, limb).includes('a7l-commander-red'), suit.id === 'crew');
    }
  }
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-511 and Orion expose the flown equipment and separate cleanly at ${level || 'full detail'}`, async () => {
    const frames = (model) => framesOf(new URL(`../public/${model.url.replace('.glb', level + '.glb')}`, import.meta.url));
    const rocket = frames(stack);
    const landed = frames(orion);
    assert.ok(Math.abs(rocket.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
    for (const name of ['YawActuator', 'SM113_YawActuatorHarness', 'SIVB511_APS1_FuelTank', 'SIVB511_APS2_FuelTank'])
      assert.ok(rocket.point(name), name);
    for (const fin of ['A', 'B', 'C', 'D']) {
      for (const motor of [1, 2]) {
        const name = `SIC11_Retro${fin}${motor}_Case`;
        assert.ok(rocket.point(name), name);
      }
    }
    for (let i = 0; i < 4; i++) {
      assert.ok(rocket.point(`SLA20_DoorPanel_${i}`));
      assert.ok(rocket.point(`SIC511_Bearing_${i + 1}`));
      assert.equal(rocket.point(`SII11_UllageFairing_${i + 1}`), null);
    }
    for (const name of [
      'LM11_SchmidtCamera',
      'LM11_OpticalAssembly',
      'LM11_ActiveSeismicGeophones',
      'LM11_FrontLeftWheelWireTire',
      'LM11_DetectorFrame',
      'LM11_DetectorPanel1',
      'LM11_UnderseatDustFlaps',
      'LM11_MagnetometerCableReel',
      'LM11_PortableMagnetometerReadoutAndSensor',
    ]) {
      assert.ok(rocket.point(name) && landed.point(name), name);
    }
    const span = (frame) => frame.box('LMLandingGear').hi[0] - frame.box('LMLandingGear').lo[0];
    assert.ok(span(landed) > span(rocket) + 1, 'folded launch gear and deployed landing gear');
    await assertEnclosureClearance(orion, ['LM11_CameraStowageBag'], ['LMFarUV', 'LMRoverPallet'], level);
    for (const pod of [1, 2]) {
      await assertEnclosureClearance(stack, [`SIVB511_APS${pod}_OuterCover`], [`ThirdStageAPS${pod}`], level);
    }
    await assertAdapterClearance(
      stack,
      orionStackParts.map((part) => part.node),
      level,
    );
    await assertEnclosureClearance(
      stack,
      ['SIMDoor'],
      ['SIMBay', 'SIMCameras', 'SIMBooms', 'Subsatellite', 'ReserveOxygen', 'ReserveHydrogen', 'ReactionControl'],
      level,
    );
  });
}
