import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/skylab/flights/skylab-2/flight.ts';
import { lacks } from '../src/app/address.ts';
import { craftNodes, headingsOf } from '../src/app/lineup/row.ts';
import { framesOf, materialsUnder } from './glb.mjs';

const [stack] = flight.models;
test('the Skylab 2 spacecraft plinth holds CSM-116 with its station equipment', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.ok(lacks(flight, 'fly'));
  const frames = framesOf(new URL(`../public/${stack.url}`, import.meta.url));
  const craft = craftNodes(headingsOf(stack), (node) => frames.box(node)?.lo[1]);
  for (const node of ['DockingProbe', 'PropellantStorageModule', 'DescentBatteries', 'ServiceWaterTank', 'VHFAntennas'])
    assert.ok(craft.includes(node), node);
  for (const node of ['BoostCover', 'LaunchEscape', 'SaturnInterstage', 'M415SensorPanel1', 'M415SensorPanel2'])
    assert.ok(!craft.includes(node), node);
  assert.deepEqual(
    stack.seats.map((s) => s.label.split('’')[0]),
    ['Conrad', 'Kerwin', 'Weitz'],
  );
  assert.equal(stack.dockingPorts[0].role, 'probe');
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`CSM-116 retains its solar coating and Skylab antennas at ${level || 'full detail'}`, () => {
    const url = new URL(`../public/${stack.url.replace('.glb', `${level}.glb`)}`, import.meta.url);
    const frames = framesOf(url);
    assert.ok(Math.abs(frames.box('LaunchEscape').hi[1] - 223.5 * 0.3048) < 0.02);
    // The export joins like-painted radomes. Their tips project past the skin on opposite sides.
    const antennas = frames.box('VHFAntennas');
    assert.ok(antennas.lo[2] < -2.05 && antennas.hi[2] > 2.05);
    assert.ok(materialsUnder(url, 'CM_CrewCompartmentSkin').includes('skylab-csm-solar-white'));
    for (const node of ['CommandModule', 'SM_EPSRadiators']) assert.ok(materialsUnder(url, node).includes('skylab-116-thermal-tape'), node);
    for (const node of ['HighGainAntenna', 'LunarSounder', 'LMLandingGear']) assert.equal(frames.point(node), null, node);
    if (level) return;
    for (const [fluid, count] of [
      ['Oxidizer', 5],
      ['Fuel', 4],
      ['Helium', 3],
    ]) {
      for (let i = 1; i <= count; i++) assert.ok(frames.point(`SM116_PSM_${fluid}${i}`));
      assert.equal(frames.point(`SM116_PSM_${fluid}${count + 1}`), null);
    }
    for (const node of ['SM116_DescentBatteryCases', 'SM116_WaterTank']) assert.ok(frames.point(node));
  });
}

test('each visiting crew member can board his assigned couch in his Skylab launch garment', () => {
  const crew = flight.models.filter((model) => model.walker);
  assert.deepEqual(
    crew.map((model) => model.name),
    ['Conrad', 'Kerwin', 'Weitz'],
  );
  assert.deepEqual(
    stack.seats.map((seat) => seat.figure),
    crew.map((model) => model.id),
  );
  for (const person of crew) {
    for (const suffix of ['', '.lod1', '.lod2']) {
      const url = new URL(`../public/${person.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
      const suit = framesOf(url);
      const torso = materialsUnder(url, 'Torso');
      assert.ok(suit.point(`Torso_${person.name}`), person.name);
      assert.ok(torso.includes('skylab-i-insignia'));
      assert.ok(torso.includes('skylab-launch-webbing'));
      // The red disconnects on the flown Skylab garments are grouped on the wearer's right.
      assert.ok(suit.box('Torso_Exhaust').hi[0] < suit.box('Torso_BlueConnectors').lo[0]);
    }
  }
});
