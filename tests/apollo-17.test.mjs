import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-17/flight.ts';
import { challengerStackParts } from '../missions/usa/apollo/flights/apollo-17/challenger.ts';
import { lacks } from '../src/app/address.ts';
import { ROVER_SITES } from '../src/world/lunar-terrain.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack, lander, rover] = flight.models;
test('Apollo 17 presents the flight hardware and crew in the Gallery', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.ok(lacks(flight, 'site'));
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((m) => m.id),
    ['vehicle', 'challenger', 'rover'],
  );
  for (const [model, crew] of [
    [stack, ['Cernan', 'Evans', 'Schmitt']],
    [lander, ['Cernan', 'Schmitt']],
    [rover, ['Cernan', 'Schmitt']],
  ]) {
    assert.deepEqual(
      model.seats.map((s) => s.label.split('’')[0]),
      crew,
    );
  }
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-512 clears Challenger and America's SIM bay through separation at ${level || 'full detail'}`, async () => {
    const frames = (model) => framesOf(new URL(`../public/${model.url.replace('.glb', level + '.glb')}`, import.meta.url));
    const rocket = frames(stack);
    const landed = frames(lander);
    assert.ok(Math.abs(rocket.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
    const gearWidth = (frame) => frame.box('LMLandingGear').hi[0] - frame.box('LMLandingGear').lo[0];
    assert.ok(gearWidth(landed) > gearWidth(rocket) + 1);
    for (const node of ['LMTraverseGravimeter', 'LMSEP', 'LMSeismicCargo', 'LMCosmicRayDetector', 'LMRover', 'LMScienceBay']) {
      assert.ok(rocket.point(node) && landed.point(node), node);
    }
    for (const node of ROVER_SITES['taurus-littrow'].unloaded) assert.ok(landed.point(node), node);
    for (const node of ['LunarSounder', 'SounderAntennas', 'FarUltraviolet', 'InfraredRadiometer', 'UVOptics', 'IROptics', 'SIMCameras'])
      assert.ok(rocket.point(node), node);
    assert.equal(rocket.point('Subsatellite'), null);
    for (const fin of ['A', 'B', 'C', 'D']) {
      for (const motor of [1, 2]) assert.ok(rocket.point(`SIC12_Retro${fin}${motor}_Case`));
    }
    await assertAdapterClearance(
      stack,
      challengerStackParts.map((p) => p.node),
      level,
    );
    await assertEnclosureClearance(
      stack,
      ['SIMDoor'],
      [
        'SIMBay',
        'SIMCameras',
        'LunarSounder',
        'SounderAntennas',
        'FarUltraviolet',
        'InfraredRadiometer',
        'UVOptics',
        'IROptics',
        'ReserveOxygen',
        'ReserveHydrogen',
        'ReactionControl',
      ],
      level,
    );
    for (const pod of [1, 2]) {
      await assertEnclosureClearance(stack, [`SIVB512_APS${pod}_OuterCover`], [`ThirdStageAPS${pod}`], level);
    }
  });
}
