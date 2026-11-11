import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { choices } from '../src/actions.ts';
import { rideTo, swingTo, Works } from '../src/viewer/works.ts';

test('a toggle runs to open and back at a steady pace and stops at each end', () => {
  let k = 0;
  let t = 0;
  while (k < 1 && t < 5) {
    k = swingTo(k, true, 1 / 60, 1.5);
    t += 1 / 60;
  }
  assert.ok(Math.abs(t - 1.5) < 0.03 && k === 1, `open in ${t} s`);
  assert.equal(swingTo(1, true, 1, 1), 1);
  assert.equal(swingTo(0.5, false, 0.25, 1), 0.25);
  assert.equal(swingTo(0.1, false, 1, 1), 0);
});

test('a lift goes to its stop at its speed, eases in over the last of the way, and arrives exactly', () => {
  let at = [0, 0, 0];
  let t = 0;
  let fastest = 0;
  while ((at[1] !== 10 || at[0] !== 0) && t < 60) {
    const to = rideTo(at, [0, 10, 0], 1 / 60, 2);
    fastest = Math.max(fastest, (to[1] - at[1]) * 60);
    assert.ok(to[1] >= at[1] && to[1] <= 10, 'never back, never past');
    at = to;
    t += 1 / 60;
  }
  assert.deepEqual(at, [0, 10, 0]);
  assert.ok(Math.abs(fastest - 2) < 1e-6 && t > 5 && t < 6.5, `${t} s at up to ${fastest} m/s`);
  assert.deepEqual(rideTo([0, 3, 0], [0, 3, 0], 1, 1), [0, 3, 0]);
  const slant = rideTo([0, 0, 0], [3, 4, 0], 1, 1);
  assert.ok(Math.abs(slant[0] / slant[1] - 0.75) < 1e-9, 'straight at it, whichever way it lies');
});

/** A shed with a door on a hinge and a lift beside it, at two levels of detail, in a model turned a quarter turn on the stage. */
function shed() {
  const model = new THREE.Group();
  model.rotation.y = Math.PI / 2;
  const level = () => {
    const root = new THREE.Group();
    const part = new THREE.Group();
    part.name = 'Shed';
    const door = new THREE.Group();
    door.name = 'Shed_Door';
    door.position.set(1, 0, 0);
    const car = new THREE.Group();
    car.name = 'Shed_Car';
    car.position.set(3, 0.2, 0);
    part.add(door, car);
    root.add(part);
    return { root, door, car };
  };
  const levels = [level(), level()];
  model.add(...levels.map((l) => l.root));
  model.updateMatrixWorld(true);
  const open = {
    id: 'door',
    label: 'Open',
    on: 'Shed_Door',
    do: {
      kind: 'toggle',
      back: 'Close',
      seconds: 1,
      moves: [{ kind: 'swing', node: 'Shed_Door', axis: [0, 1, 0], angle: Math.PI / 2, from: 0, to: 1 }],
    },
  };
  const lift = {
    id: 'lift',
    label: 'Call the lift',
    do: {
      kind: 'lift',
      node: 'Shed_Car',
      speed: 1,
      stops: [
        { name: 'the ground', by: [0, 0, 0] },
        { name: 'the roof', by: [0, 4, 0] },
      ],
    },
  };
  return { model, levels, open, lift, roots: levels.map((l) => l.root) };
}

test('a door swings open about its hinge at every level of detail, and shut again', () => {
  const { levels, open, roots } = shed();
  const works = new Works();
  assert.equal(works.step(0.1), null, 'nothing has been asked of anything');
  works.toggle('k', open, roots, 'Shed');
  assert.ok(works.isOpen('k'));
  for (let i = 0; i < 30; i++) assert.ok(works.step(1 / 60));
  for (const l of levels)
    assert.ok(l.door.rotation.y > 0.5 && l.door.rotation.y < 1.2 && l.door.position.x === 1, 'half way, turning in place');
  for (let i = 0; i < 40; i++) works.step(1 / 60);
  for (const l of levels) assert.ok(Math.abs(l.door.rotation.y - Math.PI / 2) < 1e-6);
  assert.equal(works.step(1 / 60), null, 'and then it is still');
  works.toggle('k', open, roots, 'Shed');
  assert.ok(!works.isOpen('k'));
  for (let i = 0; i < 70; i++) works.step(1 / 60);
  for (const l of levels) assert.ok(Math.abs(l.door.rotation.y) < 1e-9, 'as built');
});

test('a lift slides between its stops, says how far it went in the world, and knows which stop is nearest a height', () => {
  const { levels, lift, roots } = shed();
  const works = new Works();
  assert.equal(works.nearest('l', lift, roots, 'Shed', 3.9), 1);
  assert.equal(works.nearest('l', lift, roots, 'Shed', 0.4), 0);
  assert.equal(works.platform('l', lift, roots, 'Shed').length, 2);
  works.send('l', lift, roots, 'Shed', 1);
  assert.equal(works.stopOf('l'), 1);
  let risen = 0;
  let frames = 0;
  for (; frames < 600; frames++) {
    const carried = works.step(1 / 60);
    if (!carried) break;
    assert.equal(carried.length, 1);
    assert.ok(Math.abs(carried[0].delta.x) < 1e-9 && Math.abs(carried[0].delta.z) < 1e-9 && carried[0].delta.y > 0);
    risen += carried[0].delta.y;
  }
  assert.ok(Math.abs(risen - 4) < 1e-6 && frames / 60 > 4 && frames / 60 < 5.2, `${risen} m in ${frames / 60} s`);
  for (const l of levels) assert.ok(Math.abs(l.car.position.y - 4.2) < 1e-9 && l.car.position.x === 3);
  works.send('l', lift, roots, 'Shed', 0);
  for (let i = 0; i < 600 && works.step(1 / 60); i++);
  for (const l of levels) assert.ok(Math.abs(l.car.position.y - 0.2) < 1e-9);
});

test('the wheel calls a door by what it would do next, offers it only at the door, and rides a lift only from on it', () => {
  const { open, lift } = shed();
  const part = { node: 'Shed', name: 'Shed', summary: '', detail: '', explode: [0, 0, 0], order: 0, actions: [open, lift] };
  const flight = { models: [{ id: 'site', name: 'Site', parts: [part] }] };
  const state = { shut: true, on: false, at: 0 };
  const works = { open: () => !state.shut, riding: () => state.on, stop: () => state.at };
  const labels = (path) => choices({ model: 'site', node: 'Shed', path }, flight, 'x', works).map((c) => c.label);
  assert.deepEqual(labels(['Shed_Wall', 'Shed']), ['Info', 'Call the lift', 'Inspect'], 'away from the door there is no Open');
  assert.deepEqual(labels(['Shed_Door', 'Shed']), ['Info', 'Open', 'Call the lift', 'Inspect']);
  state.shut = false;
  assert.deepEqual(labels(['Shed_Door', 'Shed']), ['Info', 'Close', 'Call the lift', 'Inspect']);
  state.on = true;
  assert.deepEqual(labels(['Shed_Car', 'Shed']), ['Info', 'Ride to the roof', 'Inspect']);
  state.at = 1;
  const ride = choices({ model: 'site', node: 'Shed', path: [] }, flight, 'x', works).find((c) => c.label === 'Ride to the ground');
  assert.deepEqual(ride.verb, { do: 'action', model: 'site', node: 'Shed', action: lift, stop: 0 });
  state.on = false;
  assert.equal(
    choices({ model: 'site', node: 'Shed', path: [] }, flight, 'x', works).find((c) => c.id === 'action:lift').verb.stop,
    'call',
  );
});
