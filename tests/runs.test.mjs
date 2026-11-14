import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { chordAt, Route, Sequence } from '../src/viewer/explode.ts';
import { bearing, fitPlane, Rider, restOn, rollOf, Surfaces, treadsOf } from '../src/viewer/runs.ts';

const near = (a, b, eps, what) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} is not ${b}`);

test('the plane through points on a plane is that plane', () => {
  const pts = [];
  for (const [x, z] of [
    [0, 0],
    [4, 0],
    [0, 2],
    [4, 2],
    [2, 1],
  ])
    pts.push({ x, z, d: 0.3 + 0.05 * (x - 2) - 0.02 * (z - 1) });
  const f = fitPlane(pts, 0);
  near(f.a, 0.3, 1e-12, 'height');
  near(f.b, 0.05, 1e-12, 'slope along x');
  near(f.c, -0.02, 1e-12, 'slope along z');
  near(f.x, 2, 1e-12, 'middle x');
  near(f.z, 1, 1e-12, 'middle z');
});

test('points on one line say nothing of the slope across it: it is held level', () => {
  const f = fitPlane([
    { x: 0, z: 5, d: 0.1 },
    { x: 3, z: 5, d: 0.4 },
  ]);
  near(f.b, 0.1, 1e-3, 'slope along the line');
  near(f.c, 0, 1e-12, 'slope across it');
});

test('a wheel rolls as far round as it is carried, the right way', () => {
  // carried 1 m along -x, a wheel on an axle along +z turns +1/r about it (the erector's wheels, as they were swung)
  near(rollOf(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), 0.5), 2, 1e-12, 'along -x');
  // carried along -z, an axle along +x turns the other way about it (the structure at the Cape)
  near(rollOf(new THREE.Vector3(0, 0, -2), new THREE.Vector3(1, 0, 0), 0.5), -4, 1e-12, 'along -z');
});

test('a tread bears on a rail head, not on the land in the flangeway beside it; a tyre on its deepest point', () => {
  // a rail's head at 0.009 under the tread (low 0.009); the flange (low -0.0186) over the land at 0, no rail under it
  const onRail = bearing([
    { x: 0, z: 0.73, low: -0.0186, on: null, land: 0 },
    { x: 0, z: 0.78, low: 0.009, on: 0.009, land: 0 },
    { x: 0, z: 0.8, low: 0.0095, on: 0.009, land: 0 },
  ]);
  near(onRail.d, 0, 1e-12, 'the tread is on the head');
  // a tyre with a rail's foot under its edge, below the land: the land is what it is on, at its deepest point
  const tyre = bearing([
    { x: 0, z: 0, low: -0.05, on: -0.244, land: -0.12 },
    { x: 0, z: 0.1, low: -0.06, on: null, land: -0.12 },
  ]);
  near(tyre.d, -0.06, 1e-12, 'the tyre drops to the land');
  assert.equal(bearing([{ x: 0, z: 0, low: 0, on: null, land: null }]), null);
});

test('a rigid thing rests on the high points of what is under it, not on a hollow', () => {
  // four corners on a plane rising 1 in 10 along x, and a hollow under the middle
  const fit = restOn([
    { x: 0, z: 0, d: 0 },
    { x: 2, z: 0, d: 0.2 },
    { x: 0, z: 1, d: 0 },
    { x: 2, z: 1, d: 0.2 },
    { x: 1, z: 0.5, d: -0.3 },
  ]);
  near(fit.b, 0.1, 1e-3, 'its slope');
  near(fit.a + fit.b * (0 - fit.x) + fit.c * (0 - fit.z), 0, 1e-3, 'on its corner');
});

test('a wheel set has a tread at each end; a single wheel one across it', () => {
  assert.equal(treadsOf(-0.9, 0.9).length, 2);
  assert.equal(treadsOf(-0.1, 0.1).length, 1);
  const [a, b] = treadsOf(-0.9, 0.9);
  assert.ok(a.every((u) => u >= 0.6 - 1e-9) && b.every((u) => u <= -0.6 + 1e-9));
});

/** A wagon: a body with two wheel sets, each a node with its origin on its axle (along z), r = 0.5, sets 1.5 m wide. */
function wagon() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'Wagon';
  root.add(body);
  for (const [n, x] of [
    [1, -3],
    [2, 3],
  ]) {
    const set = new THREE.Group();
    set.name = `Wagon_Wheel_${n}`;
    set.position.set(x, 0.5, 0);
    for (const z of [-0.75, 0.75]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24).rotateX(Math.PI / 2));
      wheel.position.z = z;
      set.add(wheel);
    }
    body.add(set);
  }
  root.updateMatrixWorld(true);
  return { root, body };
}

/** The lowest point of each tread, in the world. */
function treadBottoms(body) {
  body.parent.updateMatrixWorld(true);
  const out = [];
  body.traverse((o) => {
    if (!o.isMesh) return;
    const centre = o.getWorldPosition(new THREE.Vector3());
    const axle = new THREE.Vector3(0, 0, 1).transformDirection(o.matrixWorld);
    out.push({ x: centre.x, z: centre.z, y: centre.y - 0.5 * Math.sqrt(1 - axle.y ** 2) });
  });
  return out;
}

test('a wagon slid onto a slope stands on it, pitched between its wheels, each on the ground', () => {
  const { root, body } = wagon();
  // a ramp along -x: level to x = -2, then down 1 in 25
  const height = (x) => (x > -2 ? 0 : (x + 2) / 25);
  const surfaces = new Surfaces((x) => height(x));
  surfaces.set([root]);
  const runs = { ground: true, wheels: 'Wagon_Wheel_', wheelRadius: 0.5, axle: 'z' };
  const seq = new Sequence(body, body.position.clone(), [{ kind: 'slide', by: [-20, 0, 0], from: 0, to: 1, runs }], surfaces);
  for (const k of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
    seq.set(k);
    for (const b of treadBottoms(body)) near(b.y, height(b.x), 2e-3, `at ${k}, the tread at x ${b.x.toFixed(2)}`);
  }
  // all on the slope: pitched as it is, 1 in 25
  const nose = new THREE.Vector3(1, 0, 0).applyQuaternion(body.quaternion);
  near(nose.y / Math.hypot(nose.x, nose.z), 1 / 25, 1e-5, 'pitch');
  // and the wheels have turned as far as it went, 20 m on 0.5 m wheels
  const turn = new THREE.Euler().setFromQuaternion(body.getObjectByName('Wagon_Wheel_1').quaternion);
  near(Math.abs(Math.atan2(Math.sin(turn.z), Math.cos(turn.z))), Math.abs(Math.atan2(Math.sin(40), Math.cos(40))), 1e-6, 'roll');
});

test('a rail wagon stands on its rails, not on what lies between them', () => {
  const { root, body } = wagon();
  // two rail heads 0.07 wide at z = ±0.75, their tops at 0.2; nothing else
  const rails = new THREE.Group();
  rails.name = 'Rails';
  for (const z of [-0.75, 0.75]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(40, 0.2, 0.07).translate(0, 0.1, z));
    rails.add(rail);
  }
  root.add(rails);
  root.updateMatrixWorld(true);
  const surfaces = new Surfaces(() => -5);
  surfaces.set([root]);
  const rider = new Rider(body, { on: ['Rails'], ground: true }, { prefixes: ['Wagon_Wheel_'], radius: 0.5, axle: 'z', rolls: false });
  rider.stand(surfaces);
  for (const b of treadBottoms(body)) near(b.y, 0.2, 1e-6, 'tread on the rail');
  // a body turned about the vertical (a drive's heading) is not rolled by standing it
  body.position.set(0, 0, 0);
  body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3);
  for (const w of ['Wagon_Wheel_1', 'Wagon_Wheel_2']) body.getObjectByName(w).position.y = 0.5;
  root.updateMatrixWorld(true);
  rider.stand(surfaces);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(body.quaternion);
  near(up.y, 1, 1e-9, 'still upright');
});

test('a thing with no wheels stands on the corners of its own box, none of them in the ground', () => {
  const root = new THREE.Group();
  const hut = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1).translate(0, 0.5, 0));
  hut.name = 'Hut';
  root.add(hut);
  root.updateMatrixWorld(true);
  const surfaces = new Surfaces((x, z) => 0.1 + 0.02 * x + 0.01 * z);
  surfaces.set([root]);
  const rider = new Rider(hut, { ground: true }, { prefixes: [], radius: 0, axle: 'z', rolls: false });
  rider.stand(surfaces);
  root.updateMatrixWorld(true);
  for (const [x, z] of [
    [-1, -0.5],
    [1, -0.5],
    [-1, 0.5],
    [1, 0.5],
  ]) {
    const p = new THREE.Vector3(x, 0, z).applyMatrix4(hut.matrixWorld);
    near(p.y, 0.1 + 0.02 * p.x + 0.01 * p.z, 1e-3, `corner ${x}, ${z}`);
  }
});

test('a rail wagon lies along the line between its bogies, both on its track', () => {
  // west 50 m, then a bend of 1 in 10 to the north
  const route = new Route([
    [-50, 0],
    [-150, -10],
  ]);
  // on the straight: along it
  near(chordAt(route, 10, 16), route.at(18).heading + route.start, 2e-3, 'on the straight');
  // straddling the corner: the line between two points on the route, not the way the rear one is pointing
  const rear = route.at(45);
  const front = route.at(61);
  near(chordAt(route, 45, 16), Math.atan2(front.x - rear.x, front.z - rear.z), 1e-12, 'across the corner');
  // past the end: the front carried on straight, so the line turns no further
  const end = route.at(route.length).heading + route.start;
  near(chordAt(route, route.length - 1, 16), end, 2e-3, 'at the end');
});

test("a rail wagon's wheel sets keep to its track past a corner, each moved across to it", () => {
  // a car 12 m between its bogies' middles, a set 1 m either side of each: built facing -x, its rear bogie at the origin
  const root = new THREE.Group();
  const car = new THREE.Group();
  car.name = 'Car';
  root.add(car);
  for (const [n, x] of [
    [1, 1],
    [2, -1],
    [3, -11],
    [4, -13],
  ]) {
    const set = new THREE.Group();
    set.name = `Car_Wheel_${n}`;
    set.position.set(x, 0.5, 0);
    car.add(set);
  }
  // west 40 m, then a corner of 1 in 20 to the north (-z), its legs cut every 4 m as a track's route is
  const path = [];
  let [x0, z0] = [0, 0];
  for (const [x, z] of [
    [-40, 0],
    [-140, -5],
  ]) {
    for (let i = 1; i <= 25; i++) path.push([x0 + ((x - x0) * i) / 25, z0 + ((z - z0) * i) / 25]);
    [x0, z0] = [x, z];
  }
  const move = {
    kind: 'drive',
    from: 0,
    to: 1,
    path,
    pivot: [0, 0.5, 0],
    forward: [-1, 0],
    wheelRadius: 0.5,
    wheelbase: 12,
    wheels: 'Car_Wheel_',
    steered: 'Car_Steered_',
    axle: 'z',
    bogies: true,
  };
  const seq = new Sequence(car, car.position.clone(), [move]);
  const route = new Route(path);
  for (const k of [0.25, 0.28, 0.31, 0.34, 0.4]) {
    seq.set(k);
    root.updateMatrixWorld(true);
    for (let n = 1; n <= 4; n++) {
      const p = car.getObjectByName(`Car_Wheel_${n}`).getWorldPosition(new THREE.Vector3());
      const on = route.at(route.nearest(p.x, p.z, k * route.length, 30));
      near(Math.hypot(on.x - p.x, on.z - p.z), 0, 5e-3, `at ${k}, set ${n} off its track`);
    }
  }
});
