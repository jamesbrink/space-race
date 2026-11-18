// Gallery motion preserves the installation of the antennas, wings and cabin. The
// flown configuration also distinguishes No. 4’s sole working wing from No. 10’s pair.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import { flight as soyuz1 } from '../missions/ussr/soyuz/flights/soyuz-1/flight.ts';
import { flight as soyuz3 } from '../missions/ussr/soyuz/flights/soyuz-3/flight.ts';
import { plinths } from '../src/app/address.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { framesOf, hierarchy } from './glb.mjs';

for (const [flight, leftOpens] of [
  [soyuz1, false],
  [soyuz3, true],
]) {
  const model = flight.models[0];
  for (const suffix of ['', '.lod1', '.lod2']) {
    test(`${flight.designation}${suffix}: the flown wings unfold and fittings follow their modules`, () => {
      const file = new URL(`../public/${model.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
      const buffer = readFileSync(file);
      const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)));
      const root = hierarchy(gltf);
      const slider = new Exploder(root, model.parts);
      const meshBounds = gltf.meshes.map((mesh) =>
        mesh.primitives.map((primitive) => {
          const { min, max } = gltf.accessors[primitive.attributes.POSITION];
          return new Box3(new Vector3(...min), new Vector3(...max));
        }),
      );
      const bounds = (node) => {
        const box = new Box3();
        node.traverse((child) => {
          for (const local of meshBounds[child.userData.mesh] ?? []) box.union(local.clone().applyMatrix4(child.matrixWorld));
        });
        return box;
      };
      const relative = (part, parent) =>
        root.getObjectByName(part).getWorldPosition(new Vector3()).sub(root.getObjectByName(parent).getWorldPosition(new Vector3()));
      const pairs = [
        ['Igla', 'OrbitalModule'],
        ['DockingProbe', 'OrbitalModule'],
        ['SolarRightLeaf1', 'ServiceModule'],
        ['SolarLeftLeaf1', 'ServiceModule'],
        ['Cabin', 'DescentModule'],
        ['Couches', 'DescentModule'],
      ];
      if (flight === soyuz3) pairs.push(['RendezvousLights', 'OrbitalModule'], ['InfraredVertical', 'ServiceModule']);
      const rest = pairs.map(([a, b]) => relative(a, b));
      const box = framesOf(file);
      assert.ok(Math.abs(box.box('DockingProbe').hi[1] - box.box('ServiceModule').lo[1] - 7.6) < 0.002);
      const centre = (name) => {
        const { lo, hi } = box.box(name);
        return new Vector3(...lo).lerp(new Vector3(...hi), 0.5);
      };
      const hatch = centre('BO_SideHatchFace');
      const cover = centre('Fairing_AccessCover');
      assert.ok(Math.abs(cover.y - hatch.y) < 0.001, 'fairing access cover and orbital hatch share a station');
      const radial = (point) => new Vector3(point.x, 0, point.z).normalize();
      // A coarse circular hatch can sample one side's extreme up to 5.5 mm inward, moving the box centre by half that.
      assert.ok(radial(cover).distanceTo(radial(hatch)) < 0.003, 'fairing access cover and orbital hatch share an azimuth');
      const standoff = Math.hypot(cover.x, cover.z) - Math.hypot(hatch.x, hatch.z);
      assert.ok(standoff > 0 && standoff < 0.4, 'the access cover sits outside the orbital hatch against the fairing');
      const leftFairing = root.getObjectByName('Fairing_Left');
      const skinOutside = Math.max(
        ...leftFairing.children.filter((child) => child.name !== 'Fairing_AccessCover').map((child) => box.box(child.name).hi[2]),
      );
      assert.ok(Math.abs(box.box('Fairing_AccessCover').hi[2] - skinOutside) < 0.035, 'the access cover stays on the fairing surface');
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
      const craftParts = ship.nodes.map((name) => root.getObjectByName(name));
      const rightFairing = root.getObjectByName('Fairing_Right');
      const leftHome = leftFairing.getWorldPosition(new Vector3());
      const rightHome = rightFairing.getWorldPosition(new Vector3());
      const axis = radial(cover);
      const opening = (half, home) => half.getWorldPosition(new Vector3()).sub(home);
      const clearance = (tick) => {
        root.updateMatrixWorld(true);
        const craft = new Box3();
        for (const part of craftParts) craft.union(bounds(part));
        assert.ok(craft.max.z + 0.001 < bounds(leftFairing).min.z, `access half clears the spacecraft at ${tick}%`);
        assert.ok(bounds(rightFairing).max.z + 0.001 < craft.min.z, `opposite half clears the spacecraft at ${tick}%`);
      };
      const outerHinge = (side) => relative(`Solar${side}Leaf4`, `Solar${side}Leaf1`);
      const rightPacked = outerHinge('Right');
      const leftPacked = outerHinge('Left');
      const wingReady = () => {
        assert.ok(Math.abs(outerHinge('Right').x - 2.25) < 0.002, 'the working right wing extends to starboard');
        assert.ok(Math.abs(whip('Right').y - 1.88) < 0.001, 'the right shortwave element extends from the open leaf');
        if (leftOpens) {
          assert.ok(Math.abs(outerHinge('Left').x + 2.25) < 0.002, 'the working left wing extends to port');
          assert.ok(Math.abs(whip('Left').y - 1.88) < 0.001, 'the left shortwave element extends from the open leaf');
        } else {
          assert.ok(
            outerHinge('Left').distanceTo(leftPacked) < 0.001 && Math.abs(whip('Left').y) < 0.001,
            'the failed left wing stays packed',
          );
        }
      };
      const igla = root.getObjectByName('IglaBoom');
      const iglaPacked = igla.quaternion.clone();
      const whip = (side) => relative(`Solar${side}Whip`, `Solar${side}Leaf4`);
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
        if (tick === 27) {
          assert.ok(
            opening(leftFairing, leftHome).distanceTo(axis.clone().multiplyScalar(5)) < 0.001,
            'the access half slides out along the hatch axis',
          );
          assert.ok(
            opening(rightFairing, rightHome).distanceTo(axis.clone().multiplyScalar(-5)) < 0.001,
            'the opposite half slides away from the hatch axis',
          );
        }
        if (tick >= 27) clearance(tick);
        else {
          assert.ok(igla.quaternion.angleTo(iglaPacked) < 0.001, 'the Igla boom stays folded until the fairing clears');
          assert.ok(outerHinge('Right').distanceTo(rightPacked) < 0.001, 'the right wing stays folded until the fairing clears');
          assert.ok(outerHinge('Left').distanceTo(leftPacked) < 0.001, 'the left wing stays folded until the fairing clears');
        }
        if (tick === 50) {
          assert.ok(Math.abs(igla.quaternion.angleTo(iglaPacked) - Math.PI / 3) < 0.001, 'the Igla boom has swung away from the hull');
          wingReady();
          assert.ok(
            relative('DockingProbe', 'ServiceModule').distanceTo(coupled) < 0.001,
            'all three modules are still joined at midpoint',
          );
        }
        for (const [i, [a, b]] of pairs.entries())
          assert.ok(relative(a, b).distanceTo(rest[i]) < 0.001, `${a} travels with ${b} at ${tick}%`);
      }
      wingReady();
      slider.set(0);
      assert.ok(opening(leftFairing, leftHome).length() < 0.001, 'reassembly closes the access half');
      assert.ok(opening(rightFairing, rightHome).length() < 0.001, 'reassembly closes the opposite half');
      assert.ok(igla.quaternion.angleTo(iglaPacked) < 0.001, 'reassembly folds the Igla boom back in');
      assert.ok(Math.abs(whip('Left').y) < 0.001 && Math.abs(whip('Right').y) < 0.001, 'reassembly stows both shortwave antennas');
      assert.ok(outerHinge('Right').distanceTo(rightPacked) < 0.001, 'reassembly folds the right wing back under the fairing');
      assert.ok(outerHinge('Left').distanceTo(leftPacked) < 0.001, 'reassembly folds the left wing back under the fairing');
    });
  }
}
