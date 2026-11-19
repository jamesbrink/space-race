// The pad and rocket are separate assets. Check their decoded triangles together in the site frame.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, BufferAttribute, BufferGeometry, Matrix4, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { Exploder } from '../src/viewer/explode.ts';
import { sliderAt } from '../src/world/sequence.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { framesOf, hierarchy } from './glb.mjs';
import { countdownSamples, flights } from './lc39-clearance.mjs';

const file = (model, level) => new URL(`../public/${model.url.replace('.glb', `${level}.glb`)}`, import.meta.url);

async function surfaces(model, level) {
  const { gltf, triangles } = await readGlb(file(model, level));
  const root = hierarchy(gltf);
  if (model.position) root.position.fromArray(model.position);
  root.rotation.y = model.rotationY ?? 0;
  root.updateMatrixWorld(true);
  const motion = new Exploder(root, model.parts);
  const byName = new Map(gltf.nodes.map((node, index) => [node.name, index]));
  const meshes = [];
  root.traverse((object) => {
    const index = byName.get(object.name);
    if (index === undefined) return;
    for (const primitive of triangles(index)) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(primitive.positions, 3));
      geo.setIndex(new BufferAttribute(primitive.indices, 1));
      geo.boundsTree = new MeshBVH(geo);
      geo.computeBoundingBox();
      meshes.push({ object, geo, world: new Box3(), previous: new Matrix4() });
    }
  });
  function pose(t) {
    if (model.sequence) motion.set(sliderAt(model.sequence, t));
    motion.clock(t);
    root.updateMatrixWorld(true);
    for (const mesh of meshes) {
      mesh.moved = mesh.world.isEmpty() || !mesh.previous.equals(mesh.object.matrixWorld);
      if (mesh.moved) {
        mesh.previous.copy(mesh.object.matrixWorld);
        mesh.world.copy(mesh.geo.boundingBox).applyMatrix4(mesh.previous);
      }
    }
  }
  return { meshes, pose };
}
for (const [flight, serial, firstMotion] of flights) {
  const stack = flight.models.find((m) => m.id === 'vehicle'),
    pad = flight.models.find((m) => m.id === 'pad');
  const levels = ['', '.lod1', '.lod2'];
  // The tower and rocket independently choose a level during a camera move.
  for (const padLevel of levels)
    for (const vehicleLevel of levels) {
      test(`${flight.id} pad (${padLevel || 'full'}) clears its stack (${vehicleLevel || 'full'}) through boarding and retraction`, async () => {
        const rocket = await surfaces(stack, vehicleLevel),
          site = await surfaces(pad, padLevel);
        const problems = new Map();
        const matrix = new Matrix4(),
          inverse = new Matrix4();
        for (const t of countdownSamples(stack, pad, 32)) {
          rocket.pose(t);
          site.pose(t);
          for (const surface of site.meshes) {
            inverse.copy(surface.object.matrixWorld).invert();
            for (const body of rocket.meshes) {
              if (!(surface.moved || body.moved) || !surface.world.intersectsBox(body.world)) continue;
              const key = `${surface.object.name} / ${body.object.name}`;
              if (problems.has(key)) continue;
              matrix.multiplyMatrices(inverse, body.object.matrixWorld);
              if (surface.geo.boundsTree.intersectsGeometry(body.geo, matrix)) problems.set(key, Math.round(t * 100) / 100);
            }
          }
        }
        assert.deepEqual([...problems], []);
      });
    }
  test(`${flight.id} rests on its launcher at four bearing points between its F-1 engines at every detail level`, async () => {
    // Viewer +X is north at Pad A, +Z east. MSFC-MAN-504 figure 8-7 numbers position I in the east.
    const directions = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    for (const suffix of ['', '.lod1', '.lod2']) {
      const vehicle = framesOf(file(stack, suffix));
      const { gltf, triangles } = await readGlb(file(pad, suffix));
      const scene = hierarchy(gltf);
      scene.position.fromArray(pad.position);
      scene.updateMatrixWorld(true);
      const supports = scene.getObjectByName('Holddown_Arms');
      const indices = new Map(gltf.nodes.map((node, i) => [node.name, i]));
      // Cast just above each sole onto the stationary bearing steel in the exported pad.
      const surfaces = supports.children.flatMap((child) =>
        triangles(indices.get(child.name)).map((mesh) => ({
          ...mesh,
          matrix: child.matrixWorld,
        })),
      );
      for (const [i, [north, east]] of directions.entries()) {
        const lug = vehicle.box(`SIC${serial}_BearingLug_${i + 1}`);
        const x = (lug.lo[0] + lug.hi[0]) / 2;
        const z = (lug.lo[2] + lug.hi[2]) / 2;
        assert.ok(north * x + east * z > 5 && Math.abs(east * x - north * z) < 0.001);
        const ray = new Ray(new Vector3(x, lug.lo[1] + 0.01, z), new Vector3(0, -1, 0));
        const a = new Vector3(),
          b = new Vector3(),
          c = new Vector3(),
          hit = new Vector3();
        let top = -Infinity;
        for (const mesh of surfaces) {
          for (let j = 0; j < mesh.indices.length; j += 3) {
            a.fromArray(mesh.positions, mesh.indices[j] * 3).applyMatrix4(mesh.matrix);
            b.fromArray(mesh.positions, mesh.indices[j + 1] * 3).applyMatrix4(mesh.matrix);
            c.fromArray(mesh.positions, mesh.indices[j + 2] * 3).applyMatrix4(mesh.matrix);
            if (ray.intersectTriangle(a, b, c, false, hit)) top = Math.max(top, hit.y);
          }
        }
        assert.ok(Math.abs(lug.lo[1] - top) < 0.001, `bearing ${i + 1}${suffix}: lug ${lug.lo[1]} m, support ${top} m`);
        const [engineX, , engineZ] = vehicle.point(`F1_Mount_${i + 1}`);
        const [nextNorth, nextEast] = directions[(i + 1) % 4];
        assert.ok(Math.abs(Math.abs(engineX) - Math.abs(engineZ)) < 0.001);
        assert.ok(engineX * (north + nextNorth) > 0 && engineZ * (east + nextEast) > 0);
      }
    }
  });
  test(`${flight.id} releases its four links, closes its working hoods and withdraws all three tail masts on the pad clock`, async () => {
    const links = pad.parts.find((part) => part.node === 'Holddown_Arms').clocked.filter((move) => move.node.startsWith('Holddown_Link_'));
    assert.equal(links.length, 4);
    for (const link of links) assert.equal(link.from, firstMotion, link.node);
    if (serial === 508) {
      // AS-508 §3.6.1: all three masts retracted together and their hoods closed within
      // four seconds of aft umbilical plate separation. Individual stroke times were lost.
      const moves = pad.parts.flatMap((part) => part.clocked ?? []);
      for (const mast of ['1_2', '3_2', '3_4']) {
        const carrier = moves.find((move) => move.node === `Tail_Carrier_${mast}`);
        const visor = moves.find((move) => move.node === `Tail_Visor_${mast}`);
        assert.equal(carrier.from, firstMotion);
        assert.ok(visor.to >= carrier.to && visor.to - carrier.from <= 4, mast);
      }
    }
    for (const level of ['', '.lod1', '.lod2']) {
      const { gltf } = await readGlb(file(pad, level));
      const root = hierarchy(gltf);
      const slider = new Exploder(root, pad.parts);
      const angleSince = (name, before) => before.angleTo(root.getObjectByName(name).quaternion);
      const rotation = (name) => root.getObjectByName(name).quaternion.clone();
      slider.clock(firstMotion - 0.01);
      const original = new Map();
      const carriers = new Map();
      for (let arm = 1; arm <= 4; arm++) {
        for (const name of [`Holddown_Link_${arm}`, `Holddown_Hood_${arm}`]) original.set(name, rotation(name));
      }
      for (const suffix of ['1_2', '3_2', '3_4']) {
        const carrier = root.getObjectByName(`Tail_Carrier_${suffix}`);
        carriers.set(carrier, carrier.position.clone());
        for (const name of [`Tail_Boom_${suffix}`, `Tail_Visor_${suffix}`]) original.set(name, rotation(name));
      }
      slider.clock(firstMotion + 9);
      for (const [node, initial] of carriers) assert.ok(node.position.distanceTo(initial) > 0.2, node.name);
      for (const [name, before] of original) {
        const angle = angleSince(name, before);
        if (serial === 506 && name === 'Holddown_Hood_1') assert.ok(angle < 1e-6, name);
        else assert.ok(angle > Math.PI / 4, name);
      }
      slider.clock(flight.opens.at);
      for (const [node, initial] of carriers) assert.ok(node.position.distanceTo(initial) < 1e-6, node.name);
      for (const [name, before] of original) assert.ok(angleSince(name, before) < 1e-6, `${name} returns for boarding`);
    }
  });
}
