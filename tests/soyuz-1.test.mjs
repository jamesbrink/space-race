// The Gallery slider shows No. 4 with its failed left wing and its working right wing.
// The same movement must preserve the installation of the antennas, wings and cabin in the exploded view.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { flight } from '../missions/ussr/soyuz/flights/soyuz-1/flight.ts';
import { plinths } from '../src/app/address.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { framesOf, hierarchy } from './glb.mjs';

const model = flight.models[0];
for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Soyuz 1${suffix}: only the right wing unfolds and each fitting follows its own module`, () => {
    const file = new URL(`../public/${model.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
    const buffer = readFileSync(file);
    const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)));
    const root = hierarchy(gltf);
    const slider = new Exploder(root, model.parts);
    const relative = (part, parent) =>
      root.getObjectByName(part).getWorldPosition(new Vector3()).sub(root.getObjectByName(parent).getWorldPosition(new Vector3()));
    const pairs = [
      ['Igla', 'OrbitalModule'],
      ['DockingProbe', 'OrbitalModule'],
      ['SolarRightLeaf1', 'ServiceModule'],
      ['SolarLeft', 'ServiceModule'],
      ['Cabin', 'DescentModule'],
      ['Couches', 'DescentModule'],
    ];
    const rest = pairs.map(([a, b]) => relative(a, b));
    const box = framesOf(file);
    assert.ok(Math.abs(box.box('DockingProbe').hi[1] - box.box('ServiceModule').lo[1] - 7.6) < 0.002);
    const nozzle = box.box('CoreEngine').lo[1];
    assert.ok(Math.abs(box.box('EscapeTower').hi[1] - nozzle - 49.913) < 0.001, 'nozzle datum to escape tower tip');
    assert.ok(Math.abs(box.box('Interstage').lo[1] - nozzle - 27.622) < 0.001, 'nozzle datum to core crown');
    assert.ok(Math.abs(box.box('Booster_B').hi[0] - box.box('Booster_G').lo[0] - 10.412) < 0.001, 'span over opposite rudders');
    const ship = plinths(model, (name) => box.box(name).lo[1]).find((plinth) => plinth.id === 'spacecraft');
    assert.deepEqual(
      ship.nodes,
      model.parts.filter((part) => part.group === 'Spacecraft').map((part) => part.node),
      'the spacecraft plinth leaves the fairing and tower behind',
    );
    const outerHinge = () => relative('SolarRightLeaf4', 'SolarRightLeaf1');
    const packed = outerHinge();
    const igla = root.getObjectByName('IglaBoom');
    const iglaPacked = igla.quaternion.clone();
    const whip = () => relative('SolarRightWhip', 'SolarRightLeaf4');
    for (const part of model.parts) {
      for (const move of part.moves ?? []) if (move.node) assert.ok(root.getObjectByName(move.node), `missing moving node ${move.node}`);
    }
    const coupled = relative('DockingProbe', 'ServiceModule');
    for (const name of ['SolarLeft', 'SolarRight']) {
      const { lo, hi } = box.box(name);
      assert.ok(
        Math.hypot(Math.max(Math.abs(lo[0]), Math.abs(hi[0])), Math.max(Math.abs(lo[2]), Math.abs(hi[2]))) < 1.44,
        'even the corners of the packed wing box fit inside the fairing',
      );
    }
    for (let tick = 0; tick <= 100; tick++) {
      slider.set(tick / 100);
      if (tick === 50) {
        assert.ok(Math.abs(igla.quaternion.angleTo(iglaPacked) - Math.PI / 3) < 0.001, 'the Igla boom has swung away from the hull');
        assert.ok(Math.abs(whip().y - 1.88) < 0.001, 'the shortwave element extends from the open leaf');
        assert.ok(relative('DockingProbe', 'ServiceModule').distanceTo(coupled) < 0.001, 'all three modules are still joined at midpoint');
        assert.ok(Math.abs(outerHinge().x - 2.25) < 0.002, 'the working wing is open at midpoint');
      }
      for (const [i, [a, b]] of pairs.entries())
        assert.ok(relative(a, b).distanceTo(rest[i]) < 0.001, `${a} travels with ${b} at ${tick}%`);
    }
    assert.ok(Math.abs(outerHinge().x - 2.25) < 0.002, 'three leaves between the first and last hinges extend to starboard');
    assert.ok(
      model.parts.find((p) => p.node === 'SolarLeft').moves.every((move) => move.kind === 'slide' && !move.node),
      'the failed wing stays packed',
    );
    slider.set(0);
    assert.ok(igla.quaternion.angleTo(iglaPacked) < 0.001 && Math.abs(whip().y) < 0.001, 'reassembly stows the antennas');
    assert.ok(outerHinge().distanceTo(packed) < 0.001, 'reassembling folds the right wing back under the fairing');
  });
}
