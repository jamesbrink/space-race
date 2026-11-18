// Gallery motion preserves the installation of the antennas, wings and cabin. The
// flown configuration distinguishes No. 4’s sole working wing from the later pairs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import { flight as soyuz1 } from '../missions/ussr/soyuz/flights/soyuz-1/flight.ts';
import { flight as soyuz3 } from '../missions/ussr/soyuz/flights/soyuz-3/flight.ts';
import { flight as soyuz4 } from '../missions/ussr/soyuz/flights/soyuz-4/flight.ts';
import { flight as soyuz10 } from '../missions/ussr/soyuz/flights/soyuz-10/flight.ts';
import { flight as soyuz12 } from '../missions/ussr/soyuz/flights/soyuz-12/flight.ts';
import { flight as soyuz16 } from '../missions/ussr/soyuz/flights/soyuz-16/flight.ts';
import { plinths } from '../src/app/address.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { framesOf, hierarchy } from './glb.mjs';

function boundsOf(gltf) {
  const meshBounds = gltf.meshes.map((mesh) =>
    mesh.primitives.map((primitive) => {
      const { min, max } = gltf.accessors[primitive.attributes.POSITION];
      return new Box3(new Vector3(...min), new Vector3(...max));
    }),
  );
  return (node) => {
    const box = new Box3();
    node.traverse((child) => {
      for (const local of meshBounds[child.userData.mesh] ?? []) box.union(local.clone().applyMatrix4(child.matrixWorld));
    });
    return box;
  };
}

for (const [flight, leftOpens] of [
  [soyuz1, false],
  [soyuz3, true],
  [soyuz4, true],
  [soyuz10, true],
]) {
  const model = flight.models[0];
  for (const suffix of ['', '.lod1', '.lod2']) {
    test(`${flight.designation}${suffix}: the flown wings unfold and fittings follow their modules`, () => {
      const file = new URL(`../public/${model.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
      const buffer = readFileSync(file);
      const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)));
      const root = hierarchy(gltf);
      const slider = new Exploder(root, model.parts);
      const bounds = boundsOf(gltf);
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
      if (flight !== soyuz1) pairs.push(['InfraredVertical', 'ServiceModule']);
      if (flight === soyuz3 || flight === soyuz4) pairs.push(['RendezvousLights', 'OrbitalModule']);
      if (flight === soyuz10) pairs.push(['DockingCollar', 'OrbitalModule']);
      if (flight === soyuz4) pairs.push(['EvaHandrails', 'OrbitalModule']);
      const rest = pairs.map(([a, b]) => relative(a, b));
      const box = framesOf(file);
      const length = flight === soyuz10 ? 7.5 : 7.6;
      assert.ok(Math.abs(box.box('DockingProbe').hi[1] - box.box('ServiceModule').lo[1] - length) < 0.002);
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
        const reach = outerHinge('Right').x;
        if (flight === soyuz10) {
          const span = bounds(root.getObjectByName('SolarRight')).max.x - bounds(root.getObjectByName('SolarLeft')).min.x;
          assert.ok(Math.abs(span - 8.37) < 0.01, `the station transport's deployed wings span 8.37 m (got ${span})`);
        } else assert.ok(Math.abs(reach - 2.25) < 0.002, 'the working right wing extends to starboard');
        assert.ok(Math.abs(whip('Right').y - 1.88) < 0.001, 'the right shortwave element extends from the open leaf');
        if (leftOpens) {
          assert.ok(Math.abs(outerHinge('Left').x + reach) < 0.002, 'the working left wing extends to port');
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

test('Soyuz 4 models Shatalov’s solo launch with the two return places vacant', () => {
  const model = soyuz4.models[0];
  const file = new URL(`../public/${model.url}`, import.meta.url);
  const buffer = readFileSync(file);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)));
  const root = hierarchy(gltf);
  const couches = root.getObjectByName('Couches');
  assert.deepEqual(soyuz4.crew, ['Vladimir A. Shatalov']);
  assert.deepEqual(
    couches.children.filter((node) => node.name.startsWith('Crew_')).map((node) => node.name),
    ['Crew_Shatalov'],
  );
  assert.deepEqual(
    model.seats.map((seat) => seat.node),
    ['Seat_Commander'],
  );
  assert.equal(model.seats[0].from, 'BO_SideHatchFace');
  assert.ok(couches.getObjectByName('Seat_Commander'));
  assert.ok(couches.getObjectByName('Kazbek_Liners'));
  assert.ok(model.seats[0].hide.every((node) => couches.getObjectByName(node)));
  const transfer = model.views.find((view) => view.id === 'transfer');
  assert.ok(transfer.isolate && transfer.from[2] > 0, 'the transfer view shows the access side without the fairing');
  assert.deepEqual(transfer.nodes, ['OrbitalModule', 'EvaHandrails', 'DockingProbe']);
});

test('Soyuz 10 places its three crew in separate couches under the station docking assembly', () => {
  const model = soyuz10.models[0];
  const file = new URL(`../public/${model.url}`, import.meta.url);
  const buffer = readFileSync(file);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)));
  const root = hierarchy(gltf);
  const couches = root.getObjectByName('Couches');
  const surnames = ['Shatalov', 'Yeliseyev', 'Rukavishnikov'];
  const seated = ['Shatalov', 'Rukavishnikov', 'Yeliseyev'];
  assert.deepEqual(
    soyuz10.crew.map((name) => name.split(' ').at(-1)),
    surnames,
  );
  assert.deepEqual(
    model.seats.map((seat) => seat.node),
    ['Seat_Commander', 'Seat_Port', 'Seat_Starboard'],
  );
  for (const [index, seat] of model.seats.entries()) {
    const wearer = seated[index];
    assert.ok(couches.getObjectByName(`Crew_${wearer}`));
    assert.ok(couches.getObjectByName(seat.node));
    assert.ok(seat.hide.length && seat.hide.every((node) => node.startsWith(wearer) && couches.getObjectByName(node)));
  }
  const collar = root.getObjectByName('DockingCollar');
  for (const name of ['SSVP_TunnelBody', 'SSVP_PressureHatch', 'SSVP_LatchPockets']) assert.ok(collar.getObjectByName(name), name);
  assert.ok(root.getObjectByName('DockingProbe').getObjectByName('SSVP_ProbeBellows'));
  assert.equal(root.getObjectByName('SSVP_ClosedCompartment'), undefined, 'the earlier solid docking compartment was replaced');
  assert.equal(root.getObjectByName('PAO_AftEquipmentTorus'), undefined, 'the station transport omits the aft torus');
  const dock = model.views.find((view) => view.id === 'dock');
  assert.deepEqual(dock.nodes, ['OrbitalModule', 'DockingCollar', 'DockingProbe']);
  assert.ok(dock.isolate);
});

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Soyuz 12${suffix}: the wingless ferry keeps its whips, suit supplies and docking unit with their modules`, () => {
    const model = soyuz12.models[0];
    const file = new URL(`../public/${model.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
    const bytes = readFileSync(file);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const root = hierarchy(gltf);
    const slider = new Exploder(root, model.parts);
    const position = (name) => root.getObjectByName(name).getWorldPosition(new Vector3());
    for (const side of ['Left', 'Right']) assert.equal(root.getObjectByName(`Solar${side}`), undefined);

    const fittings = [
      ['WhipAntennaLeft', 'ServiceModule'],
      ['WhipAntennaRight', 'ServiceModule'],
      ['DockingCollar', 'OrbitalModule'],
      ['DockingProbe', 'OrbitalModule'],
      ['SuitSupply', 'DescentModule'],
      ['LksaCamera', 'OrbitalModule'],
    ];
    const offset = (node, parent) => position(node).sub(position(parent));
    const home = fittings.map(([node, parent]) => offset(node, parent));
    const masts = ['WhipLeftMast', 'WhipRightMast'].map((name) => root.getObjectByName(name));
    const stowed = masts.map((mast) => mast.quaternion.clone());
    const joined = offset('DockingProbe', 'ServiceModule');
    const length = framesOf(file);
    assert.ok(Math.abs(length.box('DockingProbe').hi[1] - length.box('ServiceModule').lo[1] - 7.5) < 0.002);
    for (let tick = 0; tick <= 100; tick++) {
      slider.set(tick / 100);
      if (tick <= 27 || tick === 50) {
        const angle = tick === 50 ? Math.PI / 2 : 0;
        for (const [i, mast] of masts.entries()) assert.ok(Math.abs(mast.quaternion.angleTo(stowed[i]) - angle) < 0.001);
        assert.ok(offset('DockingProbe', 'ServiceModule').distanceTo(joined) < 0.001);
      }
      for (const [index, [node, parent]] of fittings.entries()) {
        assert.ok(offset(node, parent).distanceTo(home[index]) < 0.001, `${node} moves with ${parent} at ${tick}%`);
      }
    }

    slider.set(0);
    for (const [i, mast] of masts.entries()) assert.ok(mast.quaternion.angleTo(stowed[i]) < 0.001);

    if (!suffix) {
      const camera = model.views.find((view) => view.id === 'lksa-camera');
      assert.deepEqual(camera.nodes, ['LksaCamera']);
      assert.ok(camera.isolate && root.getObjectByName('LksaCamera').children.length > 0);
      const couches = root.getObjectByName('Couches');
      assert.deepEqual(
        model.seats.map((seat) => seat.node),
        ['Seat_Commander', 'Seat_Port'],
      );
      assert.deepEqual(
        couches.children
          .filter((child) => child.name.startsWith('Crew_'))
          .map((child) => child.name)
          .sort(),
        ['Crew_Lazarev', 'Crew_Makarov'],
      );
      assert.equal(couches.getObjectByName('Seat_Starboard'), undefined);
      assert.ok(root.getObjectByName('SuitSupply').children.length > 0);
      for (const seat of model.seats) {
        assert.ok(couches.getObjectByName(seat.node));
        assert.ok(seat.hide.length && seat.hide.every((name) => couches.getObjectByName(name)));
      }
    }
  });
}

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Soyuz 16${suffix}: both arrays deploy and the Apollo test ring separates from the Soyuz docking mechanism`, () => {
    const model = soyuz16.models[0];
    const file = new URL(`../public/${model.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
    const bytes = readFileSync(file);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const root = hierarchy(gltf);
    const slider = new Exploder(root, model.parts);
    const bounds = boundsOf(gltf);
    const pos = (name) => root.getObjectByName(name).getWorldPosition(new Vector3());
    const offset = (part, parent) => pos(part).sub(pos(parent));
    const span = () => {
      root.updateMatrixWorld(true);
      return bounds(root.getObjectByName('SolarRight')).max.x - bounds(root.getObjectByName('SolarLeft')).min.x;
    };
    for (const node of ['Igla', 'DockingProbe', 'LksaCamera']) assert.equal(root.getObjectByName(node), undefined);
    const frames = framesOf(file);
    const aft = frames.box('ServiceModule').lo[1];
    assert.ok(Math.abs(frames.box('ApasCaptureRing').hi[1] - aft - 7.48) < 0.002, 'native guide tips match the adopted sister-ship datum');
    assert.ok(Math.abs(frames.box('TestDockingRing').hi[1] - aft - 7.6) < 0.002, 'the test fixture defines the taller flown configuration');
    assert.ok(Math.abs(frames.box('EscapeTower').hi[1] - frames.box('CoreEngine').lo[1] - 49.3) < 0.002, 'nominal Soyuz-U stack height');
    const initialSpan = span();
    assert.ok(initialSpan < 3, 'both wings are stowed inside the launch shroud');
    const mounted = offset('TestDockingRing', 'ApasCollar');
    const collar = offset('ApasCollar', 'OrbitalModule');
    slider.set(0.48);
    assert.ok(Math.abs(span() - 8.37) < 0.015, '8.37 m tip to tip across the deployed solar arrays');
    assert.ok(offset('TestDockingRing', 'ApasCollar').distanceTo(mounted) < 0.001, 'test fixture still mounted after array deployment');
    slider.set(1);
    assert.ok(offset('TestDockingRing', 'ApasCollar').y > mounted.y + 0.5, 'the released test ring clears the spacecraft nose');
    assert.ok(offset('ApasCollar', 'OrbitalModule').distanceTo(collar) < 0.001, 'the docking collar stays on the orbital module');
    slider.set(0);
    assert.ok(offset('TestDockingRing', 'ApasCollar').distanceTo(mounted) < 0.001);
    assert.ok(Math.abs(span() - initialSpan) < 0.001);
    if (!suffix) {
      const couches = root.getObjectByName('Couches');
      for (const member of ['Filipchenko', 'Rukavishnikov']) assert.ok(couches.getObjectByName(`Crew_${member}`));
      assert.equal(model.seats.length, 2);
      for (const seat of model.seats)
        assert.ok(couches.getObjectByName(seat.node) && seat.hide.length && seat.hide.every((n) => couches.getObjectByName(n)));
    }
    for (const view of ['dock', 'test-ring']) assert.ok(model.views.find((v) => v.id === view)?.isolate);
  });
}
