// Inspect the committed exports: source flags can be lost when static meshes merge.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Group } from 'three';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { Exploder } from '../src/viewer/explode.ts';

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Apollo 7 exports a continuous vehicle cutaway, with engines and equipment whole${suffix}`, () => {
    const bytes = readFileSync(new URL(`../public/models/usa/apollo/apollo-7/vehicle${suffix}.glb`, import.meta.url));
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const meshes = (name) => {
      const root = gltf.nodes.find((n) => n.name === name);
      assert.ok(root, `missing part ${name}`);
      const out = [];
      const visit = (node) => {
        if (node.mesh !== undefined) {
          assert.ok(gltf.meshes[node.mesh].primitives.every((p) => gltf.accessors[p.attributes.POSITION].count > 0));
          out.push(node);
        }
        for (const index of node.children ?? []) visit(gltf.nodes[index]);
      };
      visit(root);
      return out;
    };
    for (const part of ['SaturnFirstStage', 'SaturnInterstage', 'SaturnSecondStage', 'InstrumentUnit', 'SpacecraftAdapter', 'BoostCover']) {
      const skin = meshes(part).filter((n) => !n.name.startsWith('SIVB_AuxiliaryPropulsion_'));
      assert.ok(skin.length, `${part}: no actual enclosing geometry`);
      for (const mesh of skin) assert.equal(mesh.extras?.shell, 1, `${part}/${mesh.name}: closed skin or stranded fitting`);
    }
    const escapeMeshes = meshes('LaunchEscape');
    const motor = escapeMeshes.find((n) => n.name === 'LES_Motor');
    assert.equal(motor?.extras?.shell, 1, 'motor case must not merge into the uncut truss');
    for (const mesh of escapeMeshes.filter((n) => n !== motor))
      assert.ok(!mesh.extras?.shell, `${mesh.name}: truss and nozzles stay whole`);
    for (const part of [
      'FirstStageEngines',
      'SecondStageEngine',
      'ServiceEngine',
      'ReactionControl',
      'ServiceSumpTanks',
      'CrewCouches',
      'MainConsole',
      'FlightDirectorIndicators',
      'ConsoleEquipment',
      'DSKYFrontWeb',
    ]) {
      for (const mesh of meshes(part)) assert.ok(!mesh.extras?.shell, `${part}/${mesh.name}: equipment must remain whole`);
    }
    const internals = [
      'CabinWindows',
      'ForwardCompartment',
      'CabinEquipmentBays',
      'ServicePower',
      'ServiceHelium',
      'FirstStageTankStructure',
      'SecondStageTankStructure',
      'InstrumentUnitEquipment',
    ];
    for (const part of internals) {
      const contents = meshes(part);
      if (suffix) assert.equal(contents.length, 0, `${part}: interior omitted at distance`);
      else assert.ok(contents.length > 0, `${part}: empty full-detail compartment`);
    }
    if (!suffix) {
      const windows = meshes('CabinWindows');
      assert.equal(windows.length, 15);
      for (const pane of windows) {
        const thickness = pane.name.endsWith('thermal')
          ? 0.7
          : pane.name.includes('rendezvous')
            ? 0.2
            : pane.name.includes('hatch')
              ? 0.23
              : 0.25;
        assert.ok(Math.abs(pane.extras.pane_thickness_in - thickness) < 1e-8, pane.name);
        assert.equal(pane.extras.shell, 1);
      }
      const keys = meshes('DSKYFrontWeb')
        .map((n) => n.extras?.dsky_key)
        .filter(Boolean);
      assert.equal(new Set(keys).size, 19);
      assert.ok(keys.includes('PRO'));
      assert.equal(meshes('ForwardCompartment').filter((n) => n.name.startsWith('CM_MainParachutePack_')).length, 3);
      for (const name of ['SIB_TankBulkheads', 'SIVB_CommonBulkhead', 'CM_ForwardPressureHatch', 'CM_SideHatchPressureDoor']) {
        assert.equal(gltf.nodes.find((n) => n.name === name)?.extras?.shell, 1, `${name} must open into the interior`);
      }
    }
    const aps = meshes('SaturnSecondStage').filter((n) => n.name.startsWith('SIVB_AuxiliaryPropulsion_'));
    assert.ok(aps.length, 'separate APS geometry must survive the shell merge');
    for (const mesh of aps) assert.ok(!mesh.extras?.shell, `${mesh.name}: separate APS equipment remains whole`);
  });
}

test('Apollo 7 adapter lifts above the instrument unit as its four attached panels unfold', () => {
  const root = new Group();
  const parts = flight.models[0].parts;
  for (const part of parts) {
    const g = new Group();
    g.name = part.node;
    root.add(g);
    for (const move of part.moves ?? []) {
      if (!move.node) continue;
      const hinge = new Group();
      hinge.name = move.node;
      g.add(hinge);
    }
  }
  const exploded = new Exploder(root, parts);
  for (let i = 0; i <= 100; i++) {
    exploded.set(i / 100);
    const height = (name) => root.getObjectByName(name).position.y;
    assert.ok(height('SpacecraftAdapter') + 1e-8 >= height('InstrumentUnit'), 'adapter enters the IU');
    assert.ok(height('ServiceEngine') + 1e-8 >= height('SpacecraftAdapter'), 'adapter enters the engine');
  }
  assert.equal(root.getObjectByName('SpacecraftAdapter').position.y, 21);
});
