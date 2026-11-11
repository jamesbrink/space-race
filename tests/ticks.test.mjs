import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Tossed } from '../src/viewer/carry.ts';
import { Hose } from '../src/viewer/hose.ts';
import { Ragdoll } from '../src/viewer/ragdoll.ts';

// What falls and hangs (the limp figure, what it dropped, the hose) is worked in ticks of one
// length whatever the frames are: the same fall must come out the same on any display.

/** A stick figure with the fifteen joints where a 1.8 m man has them, standing as built. */
function figure() {
  const root = new THREE.Group();
  const made = {};
  const add = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    (made[parent] ?? root).add(o);
    made[name] = o;
  };
  add('Hips', null, 0, 0.98, 0);
  add('Spine', 'Hips', 0, 0.15, 0);
  add('Head', 'Spine', 0, 0.5, 0);
  for (const [s, x] of [
    ['L', 1],
    ['R', -1],
  ]) {
    add(`UpperArm${s}`, 'Spine', 0.2 * x, 0.4, 0);
    add(`LowerArm${s}`, `UpperArm${s}`, 0, -0.3, 0);
    add(`Hand${s}`, `LowerArm${s}`, 0, -0.27, 0);
    add(`UpperLeg${s}`, 'Hips', 0.09 * x, -0.05, 0);
    add(`LowerLeg${s}`, `UpperLeg${s}`, 0, -0.43, 0);
    add(`Foot${s}`, `LowerLeg${s}`, 0, -0.42, 0);
  }
  root.updateMatrixWorld(true);
  return root;
}

const floor = (p, r) => {
  if (p.y >= r) return null;
  p.y = r;
  return new THREE.Vector3(0, 1, 0);
};

/** Frame lengths, by the display: steady, or a sixtieth of a second give or take a third of a millisecond (seeded). */
function frames(kind) {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (kind === 'jittered 60 Hz') return () => 1 / 60 + (random() - 0.5) * 0.0006;
  const rate = { '60 Hz': 60, '120 Hz': 120, '144 Hz': 144, '30 Hz': 30 }[kind];
  return () => 1 / rate;
}
const DISPLAYS = ['60 Hz', 'jittered 60 Hz', '120 Hz', '144 Hz'];

test('a limp figure thrown along a floor comes to rest in the same place at the same time, whatever the frames', () => {
  const runs = DISPLAYS.map((kind) => {
    const doll = Ragdoll.of(figure());
    doll.throw(new THREE.Vector3(4, -6, 0));
    doll.shift(new THREE.Vector3(0, 1, 0));
    const dt = frames(kind);
    const x0 = doll.hips.x;
    let t = 0;
    let fastest = 0;
    let last = doll.hips.clone();
    while (!doll.atRest && t < 10) {
      const h = dt();
      doll.step(h, floor);
      t += h;
      // (how fast the hips are seen to go, frame to frame: it must not double and halve)
      if (t > 0.1) fastest = Math.max(fastest, doll.hips.distanceTo(last) / h);
      last = doll.hips.clone();
    }
    return { kind, t, x: doll.hips.x - x0, fastest };
  });
  const [steady] = runs;
  assert.ok(steady.t < 4, `at a steady sixty a second it lies still after ${steady.t} s`);
  for (const run of runs) {
    assert.ok(Math.abs(run.t - steady.t) < 0.1, `${run.kind}: at rest after ${run.t} s, against ${steady.t} s`);
    assert.ok(Math.abs(run.x - steady.x) < 0.05, `${run.kind}: it went ${run.x} m, against ${steady.x} m`);
    assert.ok(
      run.fastest < steady.fastest * 1.2 + 0.5,
      `${run.kind}: its hips are seen at up to ${run.fastest} m/s, against ${steady.fastest}`,
    );
  }
});

test('a limp figure falls as fast on any display, and no faster from one frame to the next than gravity makes it', () => {
  const none = () => null;
  const fell = DISPLAYS.map((kind) => {
    const doll = Ragdoll.of(figure());
    doll.throw(new THREE.Vector3(0, 0, 0));
    const dt = frames(kind);
    const y0 = doll.hips.y;
    let t = 0;
    let last = null;
    let worst = 0;
    while (t < 1) {
      const h = dt();
      const y = doll.hips.y;
      doll.step(h, none);
      t += h;
      const v = (y - doll.hips.y) / h;
      if (last !== null && last > 1) worst = Math.max(worst, v / last, last / v);
      last = v;
    }
    // (to the same moment: the frames do not all end on the second)
    return { kind, per: (y0 - doll.hips.y) / (t * t), worst };
  });
  for (const run of fell) {
    assert.ok(
      Math.abs(run.per - fell[0].per) < 0.05 * fell[0].per,
      `${run.kind}: fell ${run.per} m in its first second squared, against ${fell[0].per}`,
    );
    assert.ok(run.worst < 1.5, `${run.kind}: its speed changes by ${run.worst} times in a frame`);
  }
});

test('what it dropped tumbles to rest in the same place, whatever the frames', () => {
  const runs = DISPLAYS.map((kind) => {
    const item = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.12));
    item.position.set(0, 1.2, 0);
    item.rotation.set(0.3, 0.2, 0.5);
    item.updateMatrixWorld(true);
    const box = new Tossed(item, new THREE.Vector3(2.5, 1, 0.4));
    const dt = frames(kind);
    let t = 0;
    while (t < 8) {
      const h = dt();
      t += h;
      if (!box.step(h, floor)) break;
    }
    box.place(item);
    return { kind, t, at: item.position.clone() };
  });
  for (const run of runs) {
    assert.ok(run.t < 7.9, `${run.kind}: it lies still after ${run.t} s`);
    assert.ok(Math.abs(run.t - runs[0].t) < 0.1, `${run.kind}: at rest after ${run.t} s, against ${runs[0].t}`);
    assert.ok(
      run.at.distanceTo(runs[0].at) < 0.03,
      `${run.kind}: it lies ${run.at.distanceTo(runs[0].at)} m from where it lies at a steady sixty`,
    );
  }
});

test('a hose carried at a walk swings no harder on a display that is a hair off sixty a second', () => {
  const runs = [...DISPLAYS, '30 Hz'].map((kind) => {
    const hose = new Hose(1, 0.015, new THREE.MeshBasicMaterial());
    const a = new THREE.Vector3(0, 1, 0);
    const b = new THREE.Vector3(0.5, 1, 0);
    const down = new THREE.Vector3(0, -1, 0);
    hose.update(a, down, b, down, 1 / 60, null, null);
    const dt = frames(kind);
    let t = 0;
    let peak = 0;
    let settled = null;
    while (t < 3) {
      const h = dt();
      if (t < 1) {
        a.x += 1.4 * h;
        b.x += 1.4 * h;
      }
      hose.update(a, down, b, down, h, null, null);
      t += h;
      if (t > 0.3 && t < 1) peak = Math.max(peak, hose.speed);
      if (t > 1 && settled === null && hose.speed < 0.03) settled = t - 1;
    }
    // its ends are where its anchors are, on every frame
    const position = hose.mesh.geometry.getAttribute('position');
    const first = new THREE.Vector3();
    for (let i = 0; i < 8; i++) first.add(new THREE.Vector3().fromBufferAttribute(position, i).multiplyScalar(1 / 8));
    return { kind, peak, settled, off: first.distanceTo(a) };
  });
  for (const run of runs) {
    assert.ok(
      Math.abs(run.peak - runs[0].peak) < 0.15 * runs[0].peak,
      `${run.kind}: it goes at up to ${run.peak} m/s, against ${runs[0].peak}`,
    );
    assert.ok(
      run.settled !== null && Math.abs(run.settled - runs[0].settled) < 0.1,
      `${run.kind}: still ${run.settled} s after its ends are`,
    );
    assert.ok(run.off < 1e-3, `${run.kind}: its end is ${run.off} m from its anchor`);
  }
});
