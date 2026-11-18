import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { isBreakupImpact } from '../src/sim/breakup.ts';
import { Ascent } from '../src/viewer/ascent.ts';
import { BreakupFragment, FragmentTrack, fragmentPieces, separableBranches } from '../src/viewer/breakup.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame, siteToEcef, siteToEcefDirection } from '../src/world/frames.ts';

test('gentle contact and a hard touch of negligible energy leave game parts whole', () => {
  assert.equal(isBreakupImpact({ speed: 3, energy: 800 }), false);
  assert.equal(isBreakupImpact({ speed: 10, energy: 249 }), false);
  assert.equal(isBreakupImpact({ speed: 10, energy: 250 }), true);
});

test('the original mesh comes free at its own pose, coasts independently, and goes back in place on rewind', () => {
  const scene = new THREE.Group();
  const ship = new THREE.Group();
  const full = new THREE.Group();
  const assembly = new THREE.Group();
  const parts = ['first', 'second', 'third'].map((name, i) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.name = name;
    mesh.position.set(i + 0.5, 1, 0);
    assembly.add(mesh);
    return mesh;
  });
  full.add(assembly);
  const low = full.clone();
  ship.add(full, low);
  ship.position.y = 200;
  scene.add(ship);
  const chosen = fragmentPieces(separableBranches(assembly), ship, 2);
  assert.equal(chosen.length, 2);
  const piece = chosen[0];
  const original = piece.node.getWorldPosition(new THREE.Vector3());
  const at = 12;
  const motion = () => ({
    track: new FragmentTrack(frameOf(flight), siteFrame(flight.site), flight.site.seaLevel.value, at, original, new THREE.Vector3(8, 2, 0)),
    releaseTurn: new THREE.Quaternion(),
    earthAxis: new THREE.Vector3(0, 0, 1),
    earthRate: 0.00007,
    rates: new THREE.Vector3(),
  });
  const f = new BreakupFragment('active', at, piece, motion(), scene);
  f.hideLowerLevels(ship, full);
  assert.equal(low.getObjectByName(piece.node.name).visible, false);
  f.place(at);
  assert.ok(piece.node.getWorldPosition(new THREE.Vector3()).distanceTo(original) < 1e-6);
  assert.equal(piece.node.geometry, parts[0].geometry);
  assert.equal(assembly.children.length, 2);
  f.place(at + 2);
  const next = piece.node.getWorldPosition(new THREE.Vector3());
  ship.position.x += 1000;
  ship.rotation.y = 1.7;
  f.place(at + 9);
  f.place(at + 2);
  assert.ok(piece.node.getWorldPosition(new THREE.Vector3()).distanceTo(next) < 1e-6);
  assert.ok(next.distanceTo(original) > 10);
  f.restore();
  assert.deepEqual(
    assembly.children.map((o) => o.name),
    ['first', 'second', 'third'],
  );
  assert.equal(low.getObjectByName(piece.node.name).visible, true);
  assert.equal(f.holder.parent, null);
});

test('a fragment at the live head inherits the outgoing translation and rotation of its own point', () => {
  const frame = frameOf(flight),
    site = siteFrame(flight.site);
  const at = 12;
  const fixed = siteToEcef(site, [0, 1000, 0]);
  const r = frame.toInertial(fixed, at);
  const velocity = (x) => frame.velocityToInertial(fixed, siteToEcefDirection(site, [x, 0, 0]), at);
  const incoming = { t: at, riding: true, r, centre: r, v: velocity(25), attitude: [1, 0, 0, 0], rates: [0, 0, 0] };
  const spin = frame.toInertial(siteToEcefDirection(site, [0, 0, 2]), at);
  const outgoing = { ...incoming, v: velocity(-25), rates: spin };
  const ascent = Ascent.of(flight);
  ascent.use({ live: true, kept: true, duration: Infinity, samples: [{ ...incoming, t: 0 }, incoming, outgoing] });
  const pad = new THREE.Quaternion();
  const centre = new THREE.Vector3(0, 0, 0);
  const further = new THREE.Vector3(0, 2, 0);
  const a = ascent.fragmentMotion('active', at, pad, centre, new THREE.Vector3());
  const b = ascent.fragmentMotion('active', at, pad, further, new THREE.Vector3());
  const speed = (motion) =>
    motion.track
      .position(at + 0.0001)
      .sub(motion.track.position(at))
      .multiplyScalar(10000);
  assert.ok(speed(a).x < -20, 'outgoing translation is toward -X');
  const arm = b.track.position(at).sub(a.track.position(at));
  const expected = a.rates.clone().applyQuaternion(a.releaseTurn).addScaledVector(a.earthAxis, -a.earthRate).cross(arm);
  assert.ok(expected.length() > 3.9);
  assert.ok(speed(b).sub(speed(a)).distanceTo(expected) < 0.02, 'each fragment inherits its local tangential velocity');
});
