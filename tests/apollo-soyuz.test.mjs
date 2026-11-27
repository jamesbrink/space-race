import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-soyuz/flight.ts';
import { lacks, plinths } from '../src/app/address.ts';
import { craftNodes, headingsOf, keyFigures } from '../src/app/lineup/row.ts';
import { assertAdapterClearance, assertEnclosureClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack] = flight.models;
const airlock = ['DockingModule', 'DockingModuleGasSupply', 'CompatibleDockingSystem', 'DockingModuleExperiments', 'DockingModuleInterior'];
const electronics = ['ASTPExperimentControls', 'ASTPVideoRecorder'];

test('the Apollo–Soyuz Gallery gives DM-2 its own plinth and the spacecraft row shows CSM-111', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.ok(lacks(flight, 'site'));
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    stack.seats.map((seat) => seat.label),
    ['Stafford’s left couch', 'Brand’s centre couch', 'Slayton’s right couch'],
  );
  const frames = framesOf(new URL(`../public/${stack.url}`, import.meta.url));
  const craft = craftNodes(headingsOf(stack), (node) => frames.box(node)?.lo[1]);
  for (const node of ['CommandModule', 'ServiceModule', 'DockingProbe', ...electronics]) assert.ok(craft.includes(node), node);
  for (const node of [...airlock, 'LaunchEscape', 'SpacecraftAdapter', 'DockingModuleCradle']) assert.ok(!craft.includes(node), node);
  const plinth = plinths(stack).find((p) => p.nodes?.includes('DockingModule'));
  for (const node of airlock) assert.ok(plinth.nodes.includes(node), node);
  assert.ok(!plinth.nodes.includes('DockingModuleCradle'));
});

test('the Lineup compares the launch mass and the CSM’s own mass, excluding DM-2', () => {
  const figures = new Map(keyFigures(flight).map((figure) => [figure.slot, figure]));
  assert.equal(figures.get('liftoff').value, 600000);
  assert.equal(figures.get('craftMass').value, 12904.5);
  assert.match(figures.get('liftoff').note, /preflight/);
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-210's adapter clears Apollo and DM-2 throughout extraction at ${level || 'full detail'}`, async () => {
    const file = new URL(`../public/${stack.url.replace('.glb', level + '.glb')}`, import.meta.url);
    const frames = framesOf(file);
    for (const node of [...airlock, ...electronics, 'DockingModuleCradle', 'InstrumentUnitEquipment', 'HighGainAntenna'])
      assert.ok(frames.point(node), node);
    assert.ok(Math.abs(frames.box('LaunchEscape').hi[1] - 2681.859 * 0.0254) < 0.02);
    await assertAdapterClearance(stack, ['ServiceEngine', 'HighGainAntenna', ...airlock], level);
    await assertEnclosureClearance(stack, ['ServiceEngine', 'HighGainAntenna'], airlock, level);
    if (!level) {
      await assertEnclosureClearance(stack, ['DockingModule'], ['DockingModuleInterior'], level);
      await assertEnclosureClearance(stack, ['CrewCouches', 'CabinStructure', 'CabinEquipmentBays'], electronics, level);
    }
  });
}
