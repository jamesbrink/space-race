import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { lockFor, roll, Vehicle } from '../src/viewer/drive.ts';

const chassis = { wheelbase: 3, lock: lockFor(3, 12), top: 11, reverse: 3 };
const still = { x: 0, z: 0, heading: 0, speed: 0, steer: 0 };
const run = (from, pedal, wheel, seconds, dt = 1 / 60) => {
  let m = from;
  for (let t = 0; t < seconds; t += dt) m = roll(m, pedal, wheel, dt, chassis);
  return m;
};

test('a vehicle gathers speed along its nose, tops out, brakes to a stop, and then backs', () => {
  const going = run(still, 1, 0, 2);
  assert.ok(going.speed > 4 && going.speed < 5.5 && going.x > 4 && Math.abs(going.z) < 1e-9 && going.heading === 0);
  assert.equal(run(still, 1, 0, 20).speed, chassis.top);
  const stopped = run(going, -1, 0, 1);
  assert.equal(stopped.speed, 0, 'the brake stops it, and does not throw it into reverse in the same breath');
  const backing = run(stopped, -1, 0, 4);
  assert.ok(backing.speed === -chassis.reverse && backing.x < stopped.x);
  assert.equal(run(going, 0, 0, 30).speed, 0, 'left alone it rolls to a stop');
});

test('it turns about its rear axle the way its front wheels point, and the same circle either way', () => {
  const slow = { ...still, speed: 2 };
  let m = { ...slow, steer: chassis.lock / (1 + (2 / 7) ** 2) }; // the wheel already hard over
  // hold the speed and full left lock: a circle
  for (let i = 0; i < 6000 && m.heading < Math.PI * 2; i++) m = { ...roll(m, 0, 1, 1 / 120, chassis), speed: 2 };
  assert.ok(Math.abs(m.x) < 0.2 && Math.abs(m.z) < 0.2, `back where it began after a full turn: ${m.x}, ${m.z}`);
  const left = run({ ...slow }, 0.4, 1, 3);
  const right = run({ ...slow }, 0.4, -1, 3);
  assert.ok(left.z < 0 && left.heading > 0, 'left is toward -Z, as the viewer has a vehicle facing +X');
  assert.ok(Math.abs(left.z + right.z) < 1e-9 && Math.abs(left.heading + right.heading) < 1e-9 && Math.abs(left.x - right.x) < 1e-9);
  // the turning circle it was built with: at a crawl, full lock goes round a circle of that width
  const radius = chassis.wheelbase / Math.tan(lockFor(3, 12));
  assert.ok(Math.abs(radius - 6) < 1e-9);
});

test('there is less lock to be had the faster it goes, and the wheel takes time to turn', () => {
  const crawl = run({ ...still, speed: 1 }, 0, 1, 2);
  const fast = { ...still, speed: 11 };
  let m = fast;
  for (let i = 0; i < 240; i++) m = { ...roll(m, 1, 1, 1 / 120, chassis), speed: 11 };
  assert.ok(m.steer < crawl.steer * 0.45 && m.steer > 0, `${m.steer} at speed against ${crawl.steer} at a crawl`);
  const flick = roll({ ...still, speed: 1 }, 0, 1, 1 / 60, chassis);
  assert.ok(flick.steer > 0 && flick.steer < 0.05, 'a sixtieth of a second is not full lock');
});

/** A flatbed built to the contract, parked at an angle under a turned parent. */
function truck() {
  const site = new THREE.Group();
  site.rotation.y = 0.7;
  site.position.set(40, 0, -10);
  const root = new THREE.Group();
  root.name = 'Truck';
  root.userData = { vehicle: 'flatbed', wheelbase: 3.5, wheel_radius: 0.4, turning_circle: 14 };
  root.position.set(5, 0, 5);
  root.rotation.y = -0.3;
  const add = (name, x, y, z, parent = root) => {
    const o = new THREE.Group();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 2));
  body.position.set(1.6, 1.1, 0);
  root.add(body);
  const rear = add('Truck_Wheel_1', 0, 0.4, -0.9);
  const knuckle = add('Truck_Knuckle_1', 3.5, 0.4, -0.9);
  const frontWheel = add('Truck_SteerWheel_1', 0, 0, -0.1, knuckle);
  add('Truck_Seat_Driver', 2.2, 1.0, -0.5);
  add('Truck_Stand_Driver', 2.2, 0, -1.7);
  site.add(root);
  site.updateMatrixWorld(true);
  return { site, root, rear, knuckle, frontWheel };
}
const open = { ground: () => 0, ahead: () => null };

test('a vehicle built to the contract is driven where the pedals and the wheel take it, whatever frame its site is in', () => {
  const { root, rear, knuckle, frontWheel } = truck();
  const vehicle = new Vehicle(root);
  assert.ok(vehicle.drivable);
  assert.ok(Math.abs(vehicle.chassis.wheelbase - 3.5) < 1e-9);
  const start = root.getWorldPosition(new THREE.Vector3());
  const nose = new THREE.Vector3(1, 0, 0).transformDirection(root.matrixWorld);
  assert.ok(
    Math.abs(Math.cos(vehicle.motion.heading) - nose.x) < 1e-6 && Math.abs(-Math.sin(vehicle.motion.heading) - nose.z) < 1e-6,
    'its heading is the way its nose points in the world',
  );
  for (let i = 0; i < 120; i++) vehicle.drive(1, 0, 1 / 60, open);
  const end = root.getWorldPosition(new THREE.Vector3());
  const went = end.clone().sub(start);
  assert.ok(went.length() > 4 && went.clone().normalize().dot(nose) > 0.9999, `straight along its nose: ${went.toArray()}`);
  assert.ok(rear.rotation.z < -5 && frontWheel.rotation.z === rear.rotation.z, 'the wheels have rolled, all alike');
  for (let i = 0; i < 60; i++) vehicle.drive(0.3, 1, 1 / 60, open);
  assert.ok(knuckle.rotation.y > 0.1, 'and the front ones are steered at their knuckles');
  assert.ok(new THREE.Vector3(1, 0, 0).transformDirection(root.matrixWorld).angleTo(nose) > 0.1, 'and it has turned');
  // where the driver sits, and where they get out
  assert.ok(vehicle.hips(new THREE.Vector3()).y > 0.9 && Math.abs(vehicle.standing(new THREE.Vector3()).y) < 1e-6);
});

test('it stops short of what is in its way, stays on the ground under it, and noses up a slope', () => {
  const { root } = truck();
  const vehicle = new Vehicle(root);
  const start = root.getWorldPosition(new THREE.Vector3());
  const nose = new THREE.Vector3(1, 0, 0).transformDirection(root.matrixWorld);
  // a wall across its way, 5 m ahead of its rear axle (its nose is 4.35 m ahead of that)
  const face = start.clone().addScaledVector(nose, 5);
  const wall = {
    ground: () => 0,
    ahead: (from, way, far) => {
      const d = face.clone().sub(from).dot(nose) / Math.max(1e-6, way.dot(nose));
      return d >= 0 && d < far ? d : null;
    },
  };
  for (let i = 0; i < 300; i++) vehicle.drive(1, 0, 1 / 60, wall);
  const went = root.getWorldPosition(new THREE.Vector3()).distanceTo(start);
  assert.ok(vehicle.motion.speed === 0 && went > 0.2 && went < 0.66, `held by the wall after ${went} m, its nose short of it`);
  const hill = truck();
  const climber = new Vehicle(hill.root);
  const x0 = climber.motion.x;
  const slope = { ground: (x) => Math.max(0, (x - x0 - 3) * 0.1), ahead: () => null };
  climber.motion = { ...climber.motion, heading: 0 };
  for (let i = 0; i < 400; i++) climber.drive(0.5, 0, 1 / 60, slope);
  const y = hill.root.getWorldPosition(new THREE.Vector3()).y;
  assert.ok(y > 0.3, `it has climbed: ${y}`);
  assert.ok(Math.abs(hill.root.rotation.z - Math.atan(0.1)) < 0.02, `nose up by the slope: ${hill.root.rotation.z}`);
});

test('a part its flight drives off is marked a vehicle from its drive, if it is built to the contract; a chase view clears it', async () => {
  const { markDriven } = await import('../src/viewer/drive.ts');
  const { root } = truck();
  root.userData = {};
  const drive = {
    path: [[9, 0]],
    pivot: [0, 0.4, 0],
    forward: [1, 0],
    wheelRadius: 0.4,
    wheelbase: 3.5,
    turningCircle: 14,
    wheels: 'Truck_Wheel',
    steered: 'Truck_SteerWheel',
    axle: 'z',
  };
  const part = (d) => ({
    node: 'Truck',
    name: 'Tow truck',
    summary: '',
    detail: '',
    explode: [0, 0, 0],
    order: 0,
    moves: [{ kind: 'drive', from: 0, to: 1, ...d }],
  });
  markDriven(root.parent, [part({ ...drive, axle: 'x' })]);
  assert.equal(root.userData.vehicle, undefined, 'not to the contract: not driven by hand');
  markDriven(root.parent, [part(drive)]);
  assert.deepEqual(
    [root.userData.vehicle, root.userData.wheelbase, root.userData.wheel_radius, root.userData.turning_circle],
    ['Tow truck', 3.5, 0.4, 14],
  );
  const vehicle = new Vehicle(root);
  assert.ok(Math.abs(vehicle.chassis.lock - lockFor(3.5, 14)) < 1e-9);
  const eyes = vehicle.hips(new THREE.Vector3()).add(new THREE.Vector3(0, 0.7, 0));
  const { back, up } = vehicle.chase(eyes);
  assert.ok(back > 2.2 + 1.15 && up > 0, `behind its tail and above: ${back}, ${up}`);
});
