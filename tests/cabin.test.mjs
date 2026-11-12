// A cabin's instruments as nodes of a model (src/viewer/cabin.ts): what a needle is put to the first time it is read.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Cabin } from '../src/viewer/cabin.ts';

/** A cabin of the nodes given, with no flight to read: every instrument shows its own fixed `value`. */
function cabin(nodes, instruments) {
  const group = new THREE.Group();
  const full = new THREE.Group();
  group.add(full);
  for (const node of nodes) full.add(node);
  let redrawn = 0;
  const host = {
    camera: new THREE.PerspectiveCamera(),
    upAt: (_p, out) => out.set(0, 1, 0),
    redraw: () => redrawn++,
    reshade: () => {},
  };
  const flight = { site: { zone: { utcOffset: -5 }, bearingX: { value: 0 } } };
  const model = { cabin: { instruments, within: [] } };
  return { cabin: new Cabin(host, flight, model, group, full, []), redrawn: () => redrawn };
}

const node = (name, userData) => Object.assign(new THREE.Object3D(), { name, userData });
const turned = (n) => 2 * Math.acos(Math.min(1, Math.abs(n.quaternion.w)));

test('a needle is put on its first reading, with the clock stopped and nothing to ease from', () => {
  const dial = node('Dial', { turn: [0, 0, 10, 1], rest: 0 });
  const slider = node('Slider', { slide: [0, 0, 10, 0.1], rest: 0 });
  const wheel = node('Wheel', { drum: 10, place: 0 });
  const atRest = node('AtRest', { turn: [0, 0, 10, 1], rest: 5 });
  const c = cabin(
    [dial, slider, wheel, atRest],
    [
      { node: 'Dial', name: 'Dial', about: '', value: 5 },
      { node: 'Slider', name: 'Slider', about: '', value: 5 },
      { node: 'Wheel', name: 'Wheel', about: '', value: 3 },
      { node: 'AtRest', name: 'At rest', about: '', value: 5 },
    ],
  );
  c.cabin.step(0, 0, 2437424.5, 1);
  assert.ok(Math.abs(turned(dial) - 0.5) < 1e-6, `the dial is turned ${turned(dial)} rad, and its reading is at 0.5`);
  assert.ok(Math.abs(slider.position.x - 0.05) < 1e-9, `the slider is at ${slider.position.x} m, and its reading is at 0.05`);
  assert.ok(Math.abs(turned(wheel) - 0.6 * Math.PI) < 1e-6, `the wheel is turned ${turned(wheel)} rad, and its 3 is at 0.6 pi`);
  assert.ok(turned(atRest) < 1e-9, 'a needle built on its reading is left there');
  assert.ok(c.redrawn() > 0, 'and the frame is drawn again');
  // nothing has changed since: nothing more is asked for
  const before = c.redrawn();
  c.cabin.step(1 / 60, 0, 2437424.5, 1);
  assert.equal(c.redrawn(), before);
});
