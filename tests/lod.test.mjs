// Levels of detail: which level a size on screen calls for, what distance is measured to, and the
// hand-over from one level to the next (src/viewer/lod.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Crossfade, chooseLevel, distanceTo, FADE, LOD_ABOVE, Scenery, Staged, thresholdsOf } from '../src/viewer/lod.ts';

test('a level is chosen by size on screen, finest when large', () => {
  assert.equal(chooseLevel(1000, 2), 0);
  assert.equal(chooseLevel(LOD_ABOVE[0] * 2, 2), 0);
  assert.equal(chooseLevel((LOD_ABOVE[0] + LOD_ABOVE[1]) / 2, 0), 1);
  assert.equal(chooseLevel(LOD_ABOVE[1] / 2, 0), 2);
  assert.equal(chooseLevel(0, 0), LOD_ABOVE.length);
});

test('a camera resting on a boundary does not flutter between two levels', () => {
  for (const [i, at] of LOD_ABOVE.entries()) {
    // coming in from far off, then wobbling 8 % either side of the threshold: one change at most
    let level = chooseLevel(at * 0.5, LOD_ABOVE.length);
    let changes = 0;
    for (let k = 0; k < 200; k++) {
      const next = chooseLevel(at * (1 + 0.08 * Math.sin(k * 1.7)), level);
      if (next !== level) changes++;
      level = next;
    }
    assert.ok(changes <= 1, `threshold ${i}: ${changes} changes`);
    // and going steadily through it changes once, each way
    assert.equal(chooseLevel(at * 1.2, i + 1), i);
    assert.equal(chooseLevel(at * 0.8, i), i + 1);
  }
});

test('any number of levels: thresholds are data', () => {
  const above = [50, 20, 8, 3, 1];
  let level = 0;
  const seen = [];
  for (let ppm = 100; ppm > 0.5; ppm *= 0.97) {
    const next = chooseLevel(ppm, level, above);
    assert.ok(next === level || next === level + 1, 'one level at a time going away');
    if (next !== level) seen.push(next);
    level = next;
  }
  assert.deepEqual(seen, [1, 2, 3, 4, 5]);
  assert.equal(chooseLevel(100, 5, above), 0, 'and straight to the finest when it is suddenly near');
  assert.equal(chooseLevel(100, 9, above), 0, 'a level there is not is not kept');
});

test('distance is to the nearest point of the box: beside any part of a long thing is beside it', () => {
  const box = new THREE.Box3(new THREE.Vector3(-130, 0, -5), new THREE.Vector3(130, 12, 5));
  assert.equal(distanceTo(box, new THREE.Vector3(0, 2, 0)), 1, 'inside: the least there is');
  assert.equal(distanceTo(box, new THREE.Vector3(128, 1.7, 7)), 2, 'beside its far end');
  assert.equal(distanceTo(box, new THREE.Vector3(330, 0, 0)), 200);
  // the old measure (to the middle, less 0.6 of the radius) put the eye 50 m from a pole it stood beside
  assert.ok(distanceTo(box, new THREE.Vector3(128, 1.7, 7)) < 128 - 0.6 * 130.3);
});

/** A model level: a group holding one mesh of `size` at the origin. */
function level(name, size = 2) {
  const root = new THREE.Group();
  const node = new THREE.Group();
  node.name = name;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ name: 'paint' }));
  node.add(mesh);
  root.add(node);
  return { root, node, mesh, material: mesh.material };
}

test('one level gives way to another over a moment, and everything is put back', () => {
  const a = level('Thing'),
    b = level('Thing');
  b.root.visible = false;
  const fade = new Crossfade();
  fade.start(a.root, b.root);
  assert.ok(fade.running && a.root.visible && b.root.visible, 'both are drawn while it lasts');
  assert.notEqual(a.mesh.material, a.material, 'in materials that fade');
  assert.ok(Object.hasOwn(a.mesh.material.defines, 'LOD_FADE') && Object.hasOwn(b.mesh.material.defines, 'LOD_FADE'));
  assert.notEqual(a.mesh.material.id, a.material.id, 'with ids of their own (three sends uniforms when the material changes)');
  assert.equal(a.mesh.material.name, 'paint', 'which are the materials themselves in every other way');
  a.material.color.set(0x123456);
  assert.equal(a.mesh.material.color.getHex(), 0x123456);
  assert.ok(a.mesh.customDepthMaterial && b.mesh.customDepthMaterial, 'and in the shadow map');
  // each pixel is drawn by exactly one of the two: the sides are opposite and the fraction the same
  const sides = [a, b].map((l) => {
    const shader = { uniforms: {} };
    l.mesh.material.onBeforeCompile(shader, null);
    return shader.uniforms.uLodFade.value;
  });
  assert.equal(sides[0].y, -1);
  assert.equal(sides[1].y, 1);
  let last = -1;
  for (let i = 0; i < 9; i++) {
    assert.ok(fade.step(FADE / 10) && fade.running);
    assert.equal(sides[0].x, sides[1].x);
    assert.ok(sides[0].x > last && sides[0].x < 1, 'it runs one way');
    last = sides[0].x;
  }
  fade.step(FADE);
  assert.ok(!fade.running && !a.root.visible && b.root.visible);
  assert.equal(a.mesh.material, a.material);
  assert.equal(b.mesh.material, b.material);
  assert.equal(a.mesh.customDepthMaterial, undefined);
  assert.equal(fade.step(1), false, 'and then there is nothing to draw');
});

test('a change of look in the middle of a fade is left as it was made', () => {
  const a = level('Thing'),
    b = level('Thing');
  const fade = new Crossfade();
  fade.start(a.root, b.root);
  const toon = new THREE.MeshToonMaterial();
  a.mesh.material = toon; // (Looks.set)
  fade.finish();
  assert.equal(a.mesh.material, toon);
  assert.equal(b.mesh.material, b.material);
});

test('a model: nearest is finest, a change fades, a cut is a cut', () => {
  const l0 = level('Thing'),
    l1 = level('Thing'),
    l2 = level('Thing');
  const s = new Staged(l0.root, []);
  s.group.updateMatrixWorld(true);
  s.measure();
  s.add(1, l1.root);
  s.add(2, l2.root);
  assert.ok(l0.root.visible && !l1.root.visible && !l2.root.visible);
  const scale = 1000;
  const eye = (d) => new THREE.Vector3(1 + d, 0, 0); // the box is 1 m either side of the origin
  // far off, in one go (the first frame, a test): a cut
  assert.ok(s.choose(eye(scale / (LOD_ABOVE[1] * 0.5)), scale, false));
  assert.equal(s.shownLevel, 2);
  assert.ok(!l0.root.visible && l2.root.visible && l2.mesh.material === l2.material);
  // coming nearer with time passing: a fade, drawn until it is over
  assert.ok(s.choose(eye(scale / (LOD_ABOVE[1] * 2)), scale, false, 0.016));
  assert.equal(s.shownLevel, 1);
  assert.ok(l2.root.visible && l1.root.visible && l1.mesh.material !== l1.material);
  let frames = 0;
  while (s.choose(eye(scale / (LOD_ABOVE[1] * 2)), scale, false, 0.016)) assert.ok(++frames < 200);
  assert.ok(Math.abs(frames * 0.016 - FADE) < 0.04, `the fade took ${frames * 0.016} s`);
  assert.ok(!l2.root.visible && l1.root.visible && l1.mesh.material === l1.material);
  // standing in it (the eye inside the box) is the finest, through the widest lens on the smallest screen
  s.choose(new THREE.Vector3(0, 0, 0), 150, false, 0.016);
  assert.equal(s.shownLevel, 0);
  // cut open: complete at once
  s.choose(eye(1e6), scale, false);
  assert.equal(s.shownLevel, 2);
  s.choose(eye(1e6), scale, true, 0.016);
  assert.equal(s.shownLevel, 0);
  assert.ok(l0.root.visible && !l2.root.visible && l0.mesh.material === l0.material);
  // forced, for tests
  s.forced = 1;
  s.choose(eye(0), scale, false, 0.016);
  assert.ok(s.shownLevel === 1 && l1.root.visible && !l0.root.visible);
});

test('a level that has not arrived is done without: the nearest finer one is drawn', () => {
  const l0 = level('Thing'),
    l2 = level('Thing');
  const s = new Staged(l0.root, []);
  s.group.updateMatrixWorld(true);
  s.measure();
  s.choose(new THREE.Vector3(1e6, 0, 0), 1000, false);
  assert.equal(s.shownLevel, 0);
  assert.ok(l0.root.visible);
  s.add(2, l2.root);
  assert.equal(s.shownLevel, 2);
  assert.ok(!l0.root.visible && l2.root.visible);
});

test('the place round the pad: each piece by its own box, every level drawn for warming and put back', () => {
  const place = (names) => {
    const root = new THREE.Group();
    const made = names.map((name, i) => {
      const l = level(name, 4);
      l.node.position.set(i * 400, 0, 0);
      root.add(l.node);
      return l;
    });
    root.updateMatrixWorld(true);
    return { root, made };
  };
  const p0 = place(['Near', 'Far']),
    p1 = place(['Near', 'Far']),
    p2 = place(['Near', 'Far', 'Stray']);
  const scenery = new Scenery(p0.root);
  scenery.add(1, p1.root);
  scenery.add(2, p2.root);
  assert.ok(!p2.made[2].node.visible, 'what has no piece in the full level is never drawn');
  const scale = 1000;
  const eye = new THREE.Vector3(0, 0, 10); // beside Near; Far is 400 m off
  scenery.choose(eye, scale);
  assert.deepEqual(scenery.shown, [
    { name: 'Near', level: 0 },
    { name: 'Far', level: 1 },
  ]);
  assert.ok(p0.made[0].node.visible && !p0.made[1].node.visible && p1.made[1].node.visible && !p2.made[1].node.visible);
  // walking toward Far: it fades to the full level, Near away from it
  const there = new THREE.Vector3(400, 0, 10);
  assert.ok(scenery.choose(there, scale, 0.016));
  assert.ok(p0.made[1].node.visible && p1.made[1].node.visible, 'both of Far while it changes');
  let frames = 0;
  while (scenery.choose(there, scale, 0.016)) assert.ok(++frames < 200);
  assert.deepEqual(
    scenery.shown.map((s) => s.level),
    [1, 0],
  );
  assert.ok(!p1.made[1].node.visible && p0.made[1].node.visible && p1.made[0].node.visible && !p0.made[0].node.visible);
  for (const p of [p0, p1, p2]) for (const l of p.made) assert.equal(l.mesh.material, l.material);
  // warming: every level drawn, fading or not, then back to what suited
  scenery.everyLevel(true, true);
  assert.ok([p0, p1, p2].every((p) => p.made.slice(0, 2).every((l) => l.node.visible)));
  assert.ok(Object.hasOwn(p1.made[0].mesh.material.defines ?? {}, 'LOD_FADE'));
  scenery.everyLevel(true);
  for (const p of [p0, p1, p2]) for (const l of p.made) assert.equal(l.mesh.material, l.material);
  scenery.everyLevel(false);
  assert.ok(
    !p1.made[1].node.visible && p0.made[1].node.visible && p1.made[0].node.visible && !p0.made[0].node.visible && !p2.made[0].node.visible,
  );
});

test('a thing with thresholds of its own goes coarser where they say, and never later than the rest', () => {
  assert.deepEqual(thresholdsOf([40, 5]), [40, 5]);
  assert.equal(thresholdsOf(undefined), LOD_ABOVE);
  assert.equal(thresholdsOf([40]), LOD_ABOVE, 'one for each boundary, or none');
  assert.equal(thresholdsOf([4, 1]), LOD_ABOVE, 'held finer for longer than the rule: not from here');
  assert.equal(thresholdsOf([20, 30]), LOD_ABOVE, 'out of order');
  assert.equal(thresholdsOf([Number.NaN, 2]), LOD_ABOVE);
  assert.equal(thresholdsOf(['40', '5']), LOD_ABOVE);
  // a model
  const l0 = level('Thing'),
    l1 = level('Thing');
  l0.root.userData.lod_above = [40, 5];
  const s = new Staged(l0.root, []);
  s.group.updateMatrixWorld(true);
  s.measure();
  s.add(1, l1.root);
  const scale = 1000;
  const eye = (d) => new THREE.Vector3(1 + d, 0, 0); // the box is 1 m either side of the origin
  s.choose(eye(scale / 20), scale, false);
  assert.ok(l1.root.visible && !l0.root.visible, 'at 20 px/m it is under its own 40');
  s.choose(eye(scale / 60), scale, false);
  assert.ok(l0.root.visible && !l1.root.visible);
  // a place: two pieces side by side at the same size on screen, one with thresholds of its own
  const place = [0, 1].map(() => {
    const root = new THREE.Group();
    for (const name of ['Plain', 'Own']) {
      const made = level(name);
      root.add(made.node);
    }
    return root;
  });
  place[0].children[1].userData.lod_above = [40, 5];
  const scenery = new Scenery(place[0]);
  scenery.add(1, place[1]);
  scenery.choose(eye(scale / 20), scale);
  assert.deepEqual(
    scenery.shown.map((p) => p.level),
    [0, 1],
  );
  scenery.choose(eye(scale / (LOD_ABOVE[0] * 0.5)), scale);
  assert.deepEqual(
    scenery.shown.map((p) => p.level),
    [1, 1],
  );
});

test('a model drawn piece by piece: what the eye is beside is the finest, the far side is not, and what stands apart under one node is taken apart', () => {
  // a mast at the origin, and four things 100 m apart under one node, at three levels
  const built = (others = ['A', 'B', 'C', 'D']) => {
    const root = new THREE.Group();
    const thing = (name, x) => {
      const node = new THREE.Group();
      node.name = name;
      node.position.x = x;
      node.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial()));
      return node;
    };
    root.add(thing('Mast', 0));
    const equipment = new THREE.Group();
    equipment.name = 'Equipment';
    others.forEach((name, i) => void equipment.add(thing(name, 100 * (i + 1))));
    root.add(equipment);
    return root;
  };
  const levels = [built(), built(), built(['A', 'B', 'C', 'Other'])];
  const s = new Staged(levels[0], [], true);
  s.group.updateMatrixWorld(true);
  s.measure();
  s.add(1, levels[1]);
  s.add(2, levels[2]);
  const node = (level, name) => levels[level].getObjectByName(name);
  const drawn = (name) => [0, 1, 2].filter((l) => node(l, name)?.visible).join();
  assert.ok(
    levels.every((l) => l.visible),
    'every level is shown: the pieces are shown and hidden under them',
  );
  assert.equal(s.shown, levels[0], 'level 0 is the one picked and walked on');
  const scale = 1000;
  // beside the mast: A is 100 m off (10 px/m: level 0), D 400 m off (2.5 px/m: level 1)
  s.choose(new THREE.Vector3(0, 0, 3), scale, false);
  assert.deepEqual(['Mast', 'A', 'D'].map(drawn), ['0', '0', '1']);
  assert.equal(s.shownLevel, 0, 'the finest that is drawn');
  // from 2 km everything is coarse; D has no node at level 2 (that level was built with other children), so it stays at 1
  s.choose(new THREE.Vector3(0, 0, 2000), scale, false);
  assert.deepEqual(['Mast', 'A', 'D'].map(drawn), ['2', '1', '1']);
  assert.equal(node(2, 'Other').visible, false, 'what has no piece at level 0 is not drawn');
  assert.equal(s.shownLevel, 1);
  assert.deepEqual(
    s.drawn('Equipment').map((o) => levels.indexOf(o.parent)),
    [0, 1, 2],
    'a part is outlined wherever its pieces are drawn from',
  );
  // within 9 m nothing is below level 0, whatever the lens
  s.choose(new THREE.Vector3(0, 0, 6), 10, false);
  assert.equal(drawn('Mast'), '0');
  // a test's switch: every piece, or one
  s.forced = 2;
  s.choose(new THREE.Vector3(0, 0, 3), scale, false);
  assert.deepEqual(['Mast', 'A'].map(drawn), ['2', '1']);
  s.forced = { A: 1 };
  s.choose(new THREE.Vector3(0, 0, 3), scale, false);
  assert.deepEqual(['Mast', 'A'].map(drawn), ['0', '1']);
  s.forced = null;
  // cut open, it is all drawn in full
  s.choose(new THREE.Vector3(0, 0, 2000), scale, true);
  assert.deepEqual(['Mast', 'A', 'D'].map(drawn), ['0', '0', '0']);
  // a piece that has moved is measured where it is: D brought beside the eye
  s.choose(new THREE.Vector3(0, 0, 2000), scale, false);
  assert.equal(drawn('D'), '1');
  node(0, 'D').position.set(0, 0, 1990);
  s.measure();
  s.choose(new THREE.Vector3(0, 0, 2000), scale, false);
  assert.equal(drawn('D'), '0');
  // what is driven by hand moves at level 0 alone: in full from then on, wherever it is left
  s.loosen('A', true);
  s.loosen('A', false);
  s.choose(new THREE.Vector3(0, 0, 2000), scale, false);
  assert.equal(drawn('A'), '0');
  // a change of level with time passing is a fade: both nodes drawn until it is over
  assert.ok(s.choose(new THREE.Vector3(0, 0, 3), scale, false, 0.016));
  assert.ok(node(2, 'Mast').visible && node(0, 'Mast').visible, 'the mast comes in over the coarse one');
  for (let i = 0; i < 60; i++) s.choose(new THREE.Vector3(0, 0, 3), scale, false, 0.016);
  assert.equal(drawn('Mast'), '0');
});
