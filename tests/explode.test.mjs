import assert from 'node:assert/strict';
import { test } from 'node:test';
import { partProgress } from '../src/viewer/explode.ts';

test('assembled at 0, fully apart at 1, whatever the order', () => {
  for (const orders of [0, 1, 5])
    for (let order = 0; order <= orders; order++) {
      assert.equal(partProgress(0, order, orders), 0);
      assert.equal(partProgress(1, order, orders), 1);
    }
});

test('a part never moves backwards as the slider advances', () => {
  for (let order = 0; order <= 4; order++) {
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const k = partProgress(i / 100, order, 4);
      assert.ok(k >= last && k <= 1, `order ${order} at t=${i / 100}`);
      last = k;
    }
  }
});

test('parts leave in order: a later part is never ahead of an earlier one', () => {
  for (let i = 0; i <= 100; i++)
    for (let order = 1; order <= 4; order++)
      assert.ok(partProgress(i / 100, order, 4) <= partProgress(i / 100, order - 1, 4), `order ${order} at t=${i / 100}`);
});

test('the first part has left before the last one starts', () => {
  assert.equal(partProgress(0.5, 0, 4), 1);
  assert.equal(partProgress(0.5, 4, 4), 0);
});

test('a route starts at the origin facing along its first leg and ends at its last point', async () => {
  const { Route } = await import('../src/viewer/explode.ts');
  const route = new Route([
    [0, 10],
    [10, 20],
  ]);
  const start = route.at(0);
  const end = route.at(route.length);
  assert.ok(Math.abs(start.x) < 1e-6 && Math.abs(start.z) < 1e-6 && Math.abs(start.heading) < 1e-6);
  assert.ok(Math.abs(end.x - 10) < 1e-6 && Math.abs(end.z - 20) < 1e-6);
  assert.ok(route.length > Math.hypot(10, 20) && route.length < 30, `length ${route.length}`);
  assert.ok(end.heading > 0.3 && end.heading < Math.PI / 2, `turned toward +x: ${end.heading}`);
  // distance along it never runs backwards
  let last = -1;
  for (let i = 0; i <= 50; i++) {
    const p = route.at((route.length * i) / 50);
    assert.ok(p.z >= last - 1e-6);
    last = p.z;
  }
});

test('a sequence plays each motion over its own stretch, and goes back the way it came', async () => {
  const THREE = await import('three');
  const { Exploder } = await import('../src/viewer/explode.ts');
  const root = new THREE.Group();
  const truck = new THREE.Group();
  truck.name = 'Truck';
  const arm = new THREE.Group();
  arm.name = 'Arm';
  arm.position.set(0, 2, 0);
  truck.add(arm);
  root.add(truck);
  const part = {
    node: 'Truck',
    name: '',
    summary: '',
    detail: '',
    explode: [0, 0, 0],
    order: 0,
    moves: [
      { kind: 'swing', node: 'Arm', axis: [0, 0, 1], angle: Math.PI / 2, from: 0, to: 0.5 },
      { kind: 'slide', by: [10, 0, 0], from: 0.5, to: 1 },
    ],
  };
  const exploder = new Exploder(root, [part]);
  const turn = () => 2 * Math.acos(Math.min(1, Math.abs(arm.quaternion.w)));
  exploder.set(0.5); // half way along the slider the arm is down and the truck has not moved
  assert.ok(Math.abs(turn() - Math.PI / 2) < 1e-6);
  assert.ok(Math.abs(truck.position.x) < 1e-9);
  exploder.set(1);
  assert.ok(Math.abs(truck.position.x - 10) < 1e-9);
  assert.equal(arm.position.y, 2, 'a swing turns a node about its own origin: it does not move it');
  exploder.set(0);
  assert.ok(turn() < 1e-9 && Math.abs(truck.position.x) < 1e-9, 'back where it was built');
});

test('what moves on the clock goes by the clock alone: the slider takes the part apart and leaves its door as the clock has it', async () => {
  const THREE = await import('three');
  const { Exploder } = await import('../src/viewer/explode.ts');
  const { periscopeMoves, TAKES } = await import('../missions/usa/mercury/vehicles/periscope.ts');
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'Afterbody';
  const door = new THREE.Group();
  door.name = 'Periscope_Door';
  const lens = new THREE.Group();
  lens.name = 'Periscope_Objective';
  const link = new THREE.Group();
  link.name = 'Periscope_Link';
  lens.add(link);
  body.add(door, lens);
  root.add(body);
  // each node's own motion, as the model's script writes it (three samples: built, half way, out): the door turns a
  // quarter about +Y, the objective slides 0.1 m along +X, the link stays as built
  const quarter = Math.SQRT1_2;
  door.userData.run = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8), 0, 0, 0, 0, quarter, 0, quarter];
  lens.userData.run = [0, 0, 0, 0, 0, 0, 1, 0.02, 0, 0, 0, 0, 0, 1, 0.1, 0, 0, 0, 0, 0, 1];
  link.userData.run = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];
  const clocked = periscopeMoves([
    [-1000, true],
    [-35, false],
    [150, true],
  ]);
  const part = { node: 'Afterbody', name: '', summary: '', detail: '', explode: [0, 5, 0], order: 0, clocked };
  const exploder = new Exploder(root, [part]);
  assert.ok(exploder.onTheClock);
  const turn = () => 2 * Math.acos(Math.min(1, Math.abs(door.quaternion.w)));
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  assert.ok(turn() < 1e-9 && lens.position.x === 0, 'as built (no clock): shut, drawn in');
  exploder.clock(-500);
  assert.ok(near(turn(), Math.PI / 2) && near(lens.position.x, 0.1), 'on the pad: open, out');
  exploder.clock(-35 + TAKES / 2);
  assert.ok(
    near(turn(), Math.PI / 4) && near(lens.position.x, 0.02),
    'half way in: where its own motion has it half way, not half of the whole',
  );
  exploder.clock(-35 + TAKES / 4);
  assert.ok(near(turn(), (3 * Math.PI) / 8) && near(lens.position.x, 0.06), 'between two samples: straight from the one to the other');
  exploder.clock(0);
  assert.ok(turn() < 1e-6 && Math.abs(lens.position.x) < 1e-9, 'at liftoff: shut, drawn in');
  exploder.clock(150 + TAKES / 2);
  assert.ok(near(turn(), Math.PI / 4), 'and out again at separation, the same motion');
  exploder.clock(200);
  exploder.set(1);
  assert.ok(Math.abs(body.position.y - 5) < 1e-9, 'the slider still takes the part apart');
  assert.ok(near(turn(), Math.PI / 2), 'and leaves the door as the clock has it');
  // worked by hand: held at an instant of its own, whatever the clock says, and given back
  for (const node of ['Periscope_Door', 'Periscope_Objective', 'Periscope_Link']) exploder.work(node, 150 + TAKES / 2);
  exploder.clock(200);
  assert.ok(near(turn(), Math.PI / 4) && near(lens.position.x, 0.02), 'held half way out with the clock long past');
  for (const node of ['Periscope_Door', 'Periscope_Objective', 'Periscope_Link']) exploder.work(node, null);
  exploder.clock(200);
  assert.ok(near(turn(), Math.PI / 2), 'and on the clock again');
});

test('a node’s own motion: its samples, evenly spaced, and straight between them', async () => {
  const THREE = await import('three');
  const { runAt } = await import('../src/viewer/explode.ts');
  const by = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const run = [0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 0, 0, 0, 1, 2, 2, 3, 0, 0, 1, 0];
  assert.ok(runAt(run, 0, by, turn) && by.length() === 0 && turn.w === 1);
  assert.ok(runAt(run, 0.25, by, turn));
  assert.deepEqual(by.toArray(), [0.5, 1, 1.5]);
  assert.ok(runAt(run, 1, by, turn));
  assert.deepEqual(by.toArray(), [2, 2, 3]);
  assert.ok(Math.abs(turn.z - 1) < 1e-12, 'turned half round about Z at its end');
  assert.ok(runAt(run, 0.75, by, turn) && Math.abs(turn.z - Math.SQRT1_2) < 1e-9, 'and a quarter round half way through its last step');
  assert.ok(runAt(run, 7, by, turn) && by.x === 2, 'past its end it stays at its end');
  assert.equal(runAt(undefined, 0.5, by, turn), false, 'a node with no motion of its own is left alone');
  assert.equal(runAt([0, 0, 0, 0, 0, 0, 1], 0.5, by, turn), false, 'and one sample is not a motion');
});

test('every node that moves is a function of its part; the flight names them and puts nodes together', async () => {
  const { functionsOf, scriptedAt, sliderFor, refusal } = await import('../src/viewer/explode.ts');
  const part = {
    node: 'Gantry',
    name: 'Gantry',
    summary: '',
    detail: '',
    explode: [0, 0, 0],
    order: 0,
    functions: [
      { nodes: ['Gantry_Left', 'Gantry_Right'], name: 'Platforms', ends: ['closed', 'parted'], seconds: 10 },
      { nodes: ['Gantry', 'Gantry_Wheel'], name: 'Roll', needs: [{ node: 'Gantry_Left', atLeast: 1, why: 'the platforms are closed' }] },
    ],
    moves: [
      { kind: 'swing', node: 'Gantry_Jib', axis: [1, 0, 0], angle: 1, from: -1, to: -0.5 }, // built one way, held another: not something it does
      { kind: 'slide', node: 'Gantry_Left', by: [-1, 0, 0], from: 0.1, to: 0.2 },
      { kind: 'slide', node: 'Gantry_Right', by: [1, 0, 0], from: 0.12, to: 0.22 },
      { kind: 'slide', by: [0, 0, 30], from: 0.3, to: 0.5 },
      { kind: 'slide', by: [0, 0, 20], from: 0.7, to: 0.9 },
      { kind: 'swing', node: 'Gantry_Wheel', axis: [1, 0, 0], angle: 60, from: 0.3, to: 0.9 },
      { kind: 'swing', node: 'Gantry_Lamp', axis: [0, 1, 0], angle: 1, from: 0.4, to: 0.45 },
    ],
  };
  const fns = functionsOf(part);
  assert.deepEqual(
    fns.map((f) => [f.id, f.name, f.nodes.length, f.from, f.to]),
    [
      ['Gantry_Left', 'Platforms', 2, 0.1, 0.22],
      ['Gantry', 'Roll', 2, 0.3, 0.9],
      ['Gantry_Lamp', 'Lamp', 1, 0.4, 0.45],
    ],
  );
  const [platforms, roll, lamp] = fns;
  assert.equal(platforms.seconds, 10);
  assert.ok(lamp.seconds >= 3, 'an unnamed function still has a pace');
  // where it is at a slider reading, and back
  assert.equal(scriptedAt(roll, 0.2), 0);
  assert.ok(Math.abs(scriptedAt(roll, 0.6) - 0.5) < 1e-9);
  assert.equal(scriptedAt(roll, 1), 1);
  assert.ok(Math.abs(sliderFor(roll, 0.5) - 0.6) < 1e-9);
  assert.ok(Math.abs(sliderFor(roll, 7) - 0.9) < 1e-9);
  // the roll waits for the platforms
  assert.equal(
    refusal(roll, () => 0.4),
    'the platforms are closed',
  );
  assert.equal(
    refusal(roll, () => 1),
    null,
  );
  assert.equal(
    refusal(platforms, () => 0),
    null,
  );
  assert.deepEqual(functionsOf({ ...part, moves: undefined, functions: undefined }), []);
});

test('a node held by hand is played to its own reading of the slider while the rest follow the slider', async () => {
  const THREE = await import('three');
  const { Exploder } = await import('../src/viewer/explode.ts');
  const root = new THREE.Group();
  const gantry = new THREE.Group();
  gantry.name = 'Gantry';
  const left = new THREE.Group();
  left.name = 'Gantry_Left';
  gantry.add(left);
  root.add(gantry);
  const part = {
    node: 'Gantry',
    name: '',
    summary: '',
    detail: '',
    explode: [0, 0, 0],
    order: 0,
    moves: [
      { kind: 'slide', node: 'Gantry_Left', by: [-2, 0, 0], from: 0, to: 0.5 },
      { kind: 'slide', by: [0, 0, 10], from: 0.5, to: 1 },
    ],
  };
  const exploder = new Exploder(root, [part]);
  exploder.set(0.25);
  assert.ok(Math.abs(left.position.x + 1) < 1e-9 && gantry.position.z === 0, 'the script: half parted, not yet rolling');
  // the roll worked by hand to its end, with the slider where it was
  exploder.hold('Gantry', 1);
  exploder.set(0.25);
  assert.ok(
    Math.abs(gantry.position.z - 10) < 1e-9 && Math.abs(left.position.x + 1) < 1e-9,
    'rolled by hand; the platform still where the slider has it',
  );
  // the slider moves on: the held node does not follow it
  exploder.set(0.6);
  assert.ok(Math.abs(gantry.position.z - 10) < 1e-9 && Math.abs(left.position.x + 2) < 1e-9);
  // let go: back to the script
  exploder.hold('Gantry', null);
  exploder.set(0.6);
  assert.ok(gantry.position.z > 0.5 && gantry.position.z < 2, `where the slider has it: ${gantry.position.z}`);
});

test('a node let loose (a truck driven by hand) is left where it is put while the slider plays the rest', async () => {
  const THREE = await import('three');
  const { Exploder } = await import('../src/viewer/explode.ts');
  const root = new THREE.Group();
  const truck = new THREE.Group();
  truck.name = 'Truck';
  const mast = new THREE.Group();
  mast.name = 'Truck_Mast';
  const wheel = new THREE.Group();
  wheel.name = 'Truck_Wheel_1';
  const tyre = new THREE.Mesh();
  tyre.name = 'Truck_Wheel_1_Tyre';
  wheel.add(tyre);
  truck.add(mast, wheel);
  root.add(truck);
  const drive = {
    path: [[20, 0]],
    pivot: [0, 0.5, 0],
    forward: [1, 0],
    wheelRadius: 0.5,
    wheelbase: 4,
    wheels: 'Truck_Wheel',
    steered: 'Truck_SteerWheel',
    axle: 'z',
  };
  const part = {
    node: 'Truck',
    name: '',
    summary: '',
    detail: '',
    explode: [0, 0, 0],
    order: 0,
    moves: [
      { kind: 'swing', node: 'Truck_Mast', axis: [0, 0, 1], angle: 1, from: 0, to: 0.5 },
      { kind: 'drive', from: 0.5, to: 1, ...drive },
    ],
  };
  const exploder = new Exploder(root, [part]);
  exploder.set(0.75);
  assert.ok(truck.position.x > 1, 'the script drives it');
  assert.ok(wheel.rotation.z !== 0 && tyre.rotation.z === 0, 'a wheel rolls; the meshes under it go round with it, not again on their own');
  exploder.loosen('Truck', true);
  truck.position.set(-7, 0, 3);
  exploder.set(0.25);
  assert.deepEqual(truck.position.toArray(), [-7, 0, 3], 'left where it was driven');
  assert.ok(Math.abs(mast.rotation.z - 0.5) < 0.01 || mast.quaternion.z > 0.1, 'while the rest of it follows the slider');
  exploder.loosen('Truck', false);
  exploder.set(0.25);
  assert.equal(truck.position.x, 0, 'given back, it is where the slider has it');
});
