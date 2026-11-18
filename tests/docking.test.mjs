import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Group, Vector3 } from 'three';
import { flight } from '../missions/usa/apollo/flights/apollo-9/flight.ts';
import { bindDockingProbe, dockingPose } from '../src/viewer/docking.ts';
import { framesOf } from './glb.mjs';

const [stack, spider] = flight.models;
const [probe, drogue] = stack.dockingPorts;
const near = (actual, expected) => assert.ok(actual.distanceTo(expected) < 0.00001, `${actual.toArray()} vs ${expected.toArray()}`);

function craftWithPort(port) {
  const craft = new Group();
  const part = new Group();
  part.name = port.part;
  craft.add(part);
  const frame = new Group();
  frame.name = port.frame;
  part.add(frame);
  return { craft, part, frame };
}

test('hard docking accounts for installed ring positions and orientation under independently moved spacecraft', () => {
  const source = craftWithPort(probe);
  const target = craftWithPort(drogue);
  source.craft.position.set(80, -5, -4);
  source.craft.rotation.set(0.04, 1.4, -0.32);
  source.part.rotation.z = -0.3;
  source.frame.position.set(0.3, 3.42, -1.02);
  target.craft.position.set(-40, 15, 8);
  target.craft.rotation.set(0.9, -0.05, 1.1);
  target.part.position.set(1, 3.2, 4);
  target.frame.rotation.x = 0.4;
  assert.equal(dockingPose(source.craft, probe, target.craft, { ...drogue, system: 'other' }, 'docked'), null);
  const pose = dockingPose(source.craft, probe, target.craft, drogue, 'docked');
  assert.ok(pose);
  const reverse = dockingPose(target.craft, drogue, source.craft, probe, 'docked');
  const roundTrip = new Vector3(1, 2, 3).applyMatrix4(pose).applyMatrix4(reverse);
  near(roundTrip, new Vector3(1, 2, 3));
  near(source.craft.position, new Vector3(80, -5, -4));
  target.craft.add(source.craft);
  pose.decompose(source.craft.position, source.craft.quaternion, source.craft.scale);
  for (const [from, to] of [
    [
      [0, 0, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, -1, 0],
    ],
    [
      [0, 0, 1],
      [0, 0, 1],
    ],
  ]) {
    near(source.frame.localToWorld(new Vector3(...from)), target.frame.localToWorld(new Vector3(...to)));
  }
  assert.equal(dockingPose(source.craft, probe, source.craft, probe, 'docked'), null);
  const capture = dockingPose(source.craft, probe, target.craft, drogue, 'capture');
  capture.decompose(source.craft.position, source.craft.quaternion, source.craft.scale);
  near(source.frame.localToWorld(new Vector3()), target.frame.localToWorld(new Vector3(0, 0.254, 0)));
  target.frame.removeFromParent();
  assert.equal(dockingPose(source.craft, probe, target.craft, drogue, 'docked'), null);
});

test('probe extends at capture and the twelve hinges lock only after the rings meet', () => {
  const { craft, frame } = craftWithPort(probe);
  const piston = new Group();
  piston.name = probe.piston;
  piston.position.set(0.2, 0.5, 0.4);
  frame.add(piston);
  assert.equal(bindDockingProbe(craft, probe), null);
  const hinges = probe.hinges.map((name, i) => {
    const hinge = new Group();
    hinge.name = name;
    hinge.rotation.y = (i * Math.PI) / 6;
    frame.add(hinge);
    return { hinge, open: hinge.quaternion.clone(), closed: hinge.clone().rotateZ((24 * Math.PI) / 180).quaternion };
  });
  const nose = probe.captureHooks.nodes.map((name, i) => {
    const hook = new Group();
    hook.name = name;
    hook.rotation.y = (i * 2 * Math.PI) / 3;
    piston.add(hook);
    return hook;
  });
  const set = bindDockingProbe(craft, probe);
  for (const state of ['approach', 'capture', 'capture', 'docked', 'docked', 'approach', 'stowed']) {
    set(state);
    near(piston.position, new Vector3(0.2, state === 'capture' || state === 'approach' ? 0.754 : 0.5, 0.4));
    for (const hook of nose) {
      const travel = state === 'capture' || state === 'docked' ? 0.34 * 0.0254 : 0;
      near(hook.position, new Vector3(travel, 0, 0).applyQuaternion(hook.quaternion));
    }
    for (const { hinge, open, closed } of hinges) assert.ok(hinge.quaternion.angleTo(state === 'docked' ? closed : open) < 1e-6);
  }
});

test('both installed Apollo 9 docking connectors have a Gallery close-up', () => {
  assert.deepEqual(
    stack.dockingPorts.map((port) => port.role),
    ['probe', 'drogue'],
  );
  assert.deepEqual(spider.dockingPorts, [drogue]);
  for (const model of [stack, spider]) {
    for (const port of model.dockingPorts) {
      assert.ok(model.parts.some((part) => part.node === port.part));
      assert.ok(model.views.some((view) => view.isolate && view.nodes?.length === 1 && view.nodes[0] === port.part));
    }
  }
});

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Apollo 9 docking frames occupy their connector in ${suffix || 'full detail'}`, () => {
    for (const model of [stack, spider]) {
      const frames = framesOf(fileURLToPath(new URL(`../public/${model.url.replace('.glb', `${suffix}.glb`)}`, import.meta.url)));
      if (model === stack) {
        for (const name of [probe.piston, ...probe.hinges, ...probe.captureHooks.nodes]) assert.ok(frames.point(name), name);
        const cmPlane = frames.point(probe.frame)[1];
        const lmPlane = frames.point(drogue.frame)[1];
        const seals = frames.box('CM104_ConcentricTunnelSeals');
        const receiver = frames.box(drogue.frame);
        const nose = frames.box('CM104_DockingProbe');
        assert.ok(Math.abs(seals.hi[1] - cmPlane) < 0.0001, 'the seals contact at the CM datum');
        assert.ok(Math.abs(receiver.hi[1] - lmPlane) < 0.0001, 'the LM mating ring ends at its datum');
        const noseReach = nose.hi[1] - cmPlane;
        const socketLip = (3.35 + 13.01) * 0.0254;
        assert.ok(noseReach > socketLip && noseReach < lmPlane - receiver.lo[1], 'the retracted probe reaches through the socket lip');
      }
      for (const port of model.dockingPorts) {
        const center = frames.point(port.frame);
        assert.ok(center, port.frame);
        // Saturn stack datum: F-1 exit to IU top, SLA height and XA838 to XA1000 on the CSM.
        const iuTop = 115 + 3222 + 36;
        const plane = port.role === 'probe' ? iuTop + 336 + (1000 - 838) + 110.25 : 238.65 + (model === stack ? iuTop - 36 : 0);
        near(new Vector3(...center), new Vector3(0, plane * 0.0254, 0));
        const { lo, hi } = frames.box(port.part);
        for (let i = 0; i < 3; i++) assert.ok(lo[i] - 0.001 <= center[i] && center[i] <= hi[i] + 0.001, port.part);
        const offset = (axis) => new Vector3(...frames.point(port.frame, axis)).sub(new Vector3(...center));
        near(offset([0, 1, 0]), new Vector3(0, 1, 0));
        near(offset([0, 0, 1]), new Vector3(0, 0, 1));
      }
    }
  });
}
