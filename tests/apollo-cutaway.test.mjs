// Inspect the committed exports: source flags can be lost when static meshes merge.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

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
    const aps = meshes('SaturnSecondStage').filter((n) => n.name.startsWith('SIVB_AuxiliaryPropulsion_'));
    assert.ok(aps.length, 'separate APS geometry must survive the shell merge');
    for (const mesh of aps) assert.ok(!mesh.extras?.shell, `${mesh.name}: separate APS equipment remains whole`);
  });
}
