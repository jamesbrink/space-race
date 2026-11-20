import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-17/flight.ts';
import { challengerStackParts } from '../missions/usa/apollo/flights/apollo-17/challenger.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { sliderAt } from '../src/world/sequence.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { lacks, openingFor } from '../src/app/address.ts';
import { ROVER_SITES } from '../src/world/lunar-terrain.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf, hierarchy, materialsUnder } from './glb.mjs';

const [stack, lander, pad] = flight.models;
const figures = flight.models.filter((model) => model.walker);
const rover = flight.models.find((model) => model.id === 'rover');
test('Apollo 17 presents the flight hardware and crew in the Gallery', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((m) => m.id),
    ['vehicle', 'challenger', 'pad', 'crew', 'pilot', 'lmp', 'rover'],
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

test('Apollo 17 opens at crew ingress and returns the white room to standby during the launch hold', async () => {
  assert.equal(openingFor(flight, { fly: false, named: '', clockAt: 0, running: false }).model, 'pad');
  assert.deepEqual(
    stack.seats.map((s) => [s.figure, ...s.open]),
    figures.map((m) => [m.id, -19200, -15900]),
  );
  assert.match(pad.url, /pad-a-1972-12\.glb$/);
  const { gltf } = await readGlb(new URL(`../public/${pad.url}`, import.meta.url));
  const root = hierarchy(gltf);
  const motion = new Exploder(root, pad.parts);
  const arm = root.getObjectByName('Service_Arm_9');
  const parked = (t) => {
    motion.set(sliderAt(pad.sequence, t));
    motion.clock(t);
    return arm.quaternion.clone();
  };
  const ingress = parked(flight.opens.at);
  const standby = parked(-12000);
  const firstRetraction = parked(-9630);
  const recycled = parked(-4880);
  const finalRetraction = parked(-240);
  const degrees = (a, b) => (a.angleTo(b) * 180) / Math.PI;
  assert.ok(Math.abs(degrees(ingress, standby) - 12) < 0.01);
  assert.ok(degrees(standby, firstRetraction) > 50);
  assert.ok(degrees(standby, recycled) < 0.01);
  assert.ok(degrees(firstRetraction, finalRetraction) < 0.01);
  assert.equal(pad.sequence.find((k) => k.event.includes('First vehicle motion')).at, 0.24);
});

test('all three launch suits retain the crew markings and pressure-garment cuts at each detail level', () => {
  for (const figure of figures) {
    for (const suffix of ['.glb', '.lod1.glb', '.lod2.glb']) {
      const url = new URL(`../public/${figure.url.replace('.glb', suffix)}`, import.meta.url);
      const suit = framesOf(url);
      assert.ok(suit.point(figure.id === 'pilot' ? 'Torso_RearEntry' : 'Torso_SideEntry'));
      for (const limb of ['Arms', 'Legs']) assert.equal(materialsUnder(url, limb).includes('a7l-commander-red'), figure.id === 'crew');
    }
  }
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`ML-3 retains its xenon lenses and arm 7 vent fitting at ${level || 'full detail'}`, async () => {
    const { gltf } = await readGlb(new URL(`../public/${pad.url.replace('.glb', level + '.glb')}`, import.meta.url));
    const root = hierarchy(gltf);
    assert.equal(root.getObjectByName('Arm7_Vent_Disconnect')?.parent?.name, 'Service_Arm_7');
    const racks = root.getObjectByName('Xenon_Banks').children;
    assert.equal(racks.length, 10);
    for (const rack of racks) {
      const lens = gltf.nodes.find((n) => n.name === `${rack.name}_Xenon`);
      assert.ok(lens.extras.candela > 0 && lens.extras.spread > 0 && lens.extras.lens_out);
      const primitive = gltf.meshes[lens.mesh].primitives[0];
      assert.equal(gltf.materials[primitive.material].name, 'lamp-flood-xenon');
    }
  });

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
