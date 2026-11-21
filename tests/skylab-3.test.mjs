import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/skylab/flights/skylab-3/flight.ts';
import { lacks } from '../src/app/address.ts';
import { craftNodes, headingsOf } from '../src/app/lineup/row.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf, materialsUnder } from './glb.mjs';

const [stack] = flight.models;
const experiments = ['XRayExperiment', 'XRayGasSupply', 'XRayRecorder'];
test('the Skylab 3 gallery seats the second visiting crew and puts its flight hardware on the right plinth', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.equal(lacks(flight, 'fly'), null);
  const frames = framesOf(new URL(`../public/${stack.url}`, import.meta.url));
  const spacecraft = craftNodes(headingsOf(stack), (node) => frames.box(node)?.lo[1]);
  for (const node of ['CircadianExperiment', 'BackupParasol', 'RateGyroPackages', 'PropellantStorageModule', 'DockingProbe'])
    assert.ok(spacecraft.includes(node), node);
  for (const node of ['InstrumentUnit', 'LaunchEscape', ...experiments]) assert.ok(!spacecraft.includes(node), node);
  assert.deepEqual(
    stack.seats.map((seat) => seat.label.split('’')[0]),
    ['Bean', 'Garriott', 'Lousma'],
  );
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`CSM-117 and SA-207 retain the second visit's equipment at ${level || 'full detail'}`, async () => {
    const file = new URL(`../public/${stack.url.replace('.glb', level + '.glb')}`, import.meta.url);
    const frames = framesOf(file);
    for (const node of [
      ...experiments,
      'S150_DeploymentPivot',
      'S150_CoverPivot',
      'CircadianExperiment',
      'BackupParasol',
      'RateGyroPackages',
    ]) {
      assert.ok(frames.point(node), node);
      if (!level || experiments.includes(node)) assert.ok(frames.box(node).lo.every(Number.isFinite), node);
    }
    for (const node of ['HighGainAntenna', 'ParasolCanister', 'M415SensorPanel1', 'M415SensorPanel2'])
      assert.equal(frames.point(node), null, node);
    assert.ok(materialsUnder(file, 'CommandModule').includes('skylab-117-thermal-tape'));
    assert.ok(!materialsUnder(file, 'ServiceModule').some((name) => name.includes('thermal-tape')));
    for (let i = 0; i < 8; i++) assert.deepEqual(materialsUnder(file, `SIB_OuterTank_${i}`), ['saturn-white']);
    assert.ok(Math.abs(frames.box('LaunchEscape').hi[1] - 223.5 * 0.3048) < 0.02);
    await assertAdapterClearance(stack, ['ServiceEngine'], level);
    await assertEnclosureClearance(
      stack,
      ['InstrumentUnit', 'InstrumentUnitEquipment', 'XRayGasSupply', 'XRayRecorder', 'SpacecraftAdapter'],
      ['S150_DeploymentPivot'],
      level,
    );
    if (!level) {
      await assertEnclosureClearance(
        stack,
        ['ServiceModule', 'PropellantStorageModule', 'DescentBatteries'],
        ['CircadianExperiment'],
        level,
      );
      await assertEnclosureClearance(
        stack,
        ['CrewCouches', 'CabinStructure', 'CabinEquipmentBays'],
        ['BackupParasol', 'RateGyroPackages'],
        level,
      );
    }
  });
}

test('the Skylab 3 site opens for ingress with the three visiting astronauts assigned to their launch couches', () => {
  const crew = flight.models.filter((model) => model.walker);
  assert.deepEqual(
    crew.map((person) => person.name),
    ['Bean', 'Garriott', 'Lousma'],
  );
  assert.deepEqual(
    stack.seats.map((seat) => seat.figure),
    crew.map((person) => person.id),
  );
  assert.equal(flight.opens.at, stack.seats[0].open[0]);
  assert.equal(flight.weather.observed.at, flight.launch);
  for (const person of crew) {
    for (const level of ['', '.lod1', '.lod2']) {
      const file = new URL(`../public/${person.url.replace('.glb', level + '.glb')}`, import.meta.url);
      assert.ok(framesOf(file).point(`Torso_${person.name}`));
      assert.ok(materialsUnder(file, 'Torso').includes('skylab-ii-insignia'));
    }
  }
});
