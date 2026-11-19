// What is solid to the simulator (src/sim/solids.ts, siteworld.ts), on cases made here: a sphere swept against boxes
// head-on, grazing, fast, from inside; the tree against asking every box; a piece that moves; the file's round trip;
// and the bake's own cutting of triangles into boxes (tools/collision-bake.mjs `boxesOf`).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SiteWorld } from '../src/sim/siteworld.ts';
import { BoxTree, decodeSolids, encodeSolids, poseAt, sweepBox } from '../src/sim/solids.ts';
import { boxesOf } from '../tools/collision-bake.mjs';

const near = (a, b, slack, what) => assert.ok(Math.abs(a - b) <= slack, `${what}: ${a} against ${b}`);
const STILL = { p: [0, 0, 0], q: [0, 0, 0, 1] };
/** One piece of a model: `boxes` as rows of six. */
const piece = (node, boxes, more = {}) => ({ node, part: node, cell: 0.25, pose: STILL, boxes: Float32Array.from(boxes.flat()), ...more });
const model = (...pieces) => ({ cell: 0.25, source: 'test', pieces, hulls: [] });
/** A small generator, so a failure is the same failure every run. */
function random(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const UNIT = Float32Array.from([0, 0, 0, 1, 1, 1]);

test('head-on: a sphere meets a face where its surface touches it, with the face’s normal', () => {
  const hit = sweepBox(UNIT, 0, [0.5, 5, 0.5], [0, -10, 0], 0.5);
  near(hit.fraction, 0.35, 1e-6, 'fraction'); // (from 5 down to 1.5)
  assert.deepEqual(
    hit.normal.map((v) => Math.round(v * 1e6) / 1e6),
    [0, 1, 0],
  );
});

test('grazing: past a face by more than its radius it misses, by less it is met side-on', () => {
  assert.equal(sweepBox(UNIT, 0, [1.501, 5, 0.5], [0, -10, 0], 0.5), null);
  // over the edge at x = 1, y = 1: met on the edge, the normal leaning out along +x
  const hit = sweepBox(UNIT, 0, [1.4, 5, 0.5], [0, -10, 0], 0.5);
  assert.ok(hit, 'met');
  near(Math.hypot(...hit.normal), 1, 1e-9, 'unit normal');
  near(hit.normal[0], 0.8, 1e-4, 'normal x'); // (0.4 out of a radius of 0.5)
  near(hit.normal[1], 0.6, 1e-4, 'normal y');
  assert.equal(hit.normal[2], 0);
  // and where it touches is on the edge itself
  const y = 5 - 10 * hit.fraction;
  near(Math.hypot(1.4 - 1, y - 1), 0.5, 1e-5, 'touching the edge');
});

test('a corner is met along the line to it', () => {
  const hit = sweepBox(UNIT, 0, [3, 3, 3], [-2, -2, -2], 0.25);
  const at = hit.fraction * -2 + 3;
  near(Math.hypot(at - 1, at - 1, at - 1), 0.25, 1e-5, 'distance to the corner');
  for (const n of hit.normal) near(n, 1 / Math.sqrt(3), 1e-5, 'normal');
});

test('fast: a body crossing ten kilometres in a step does not pass through a sheet a centimetre thick', () => {
  const sheet = Float32Array.from([-50, 0, -50, 50, 0.01, 50]);
  for (const radius of [0.001, 0.3, 5]) {
    const hit = sweepBox(sheet, 0, [3, 5000, -7], [1, -10000, 2], radius);
    assert.ok(hit, `radius ${radius}`);
    near(5000 - 10000 * hit.fraction, 0.01 + radius, 1e-3, 'where it stops');
    assert.ok(hit.normal[1] > 0.999999);
  }
});

test('what it starts in, or touching, is not met; once out, it is met again', () => {
  assert.equal(sweepBox(UNIT, 0, [0.5, 0.5, 0.5], [0, 3, 0], 0.2), null, 'from inside');
  assert.equal(sweepBox(UNIT, 0, [0.5, 1.1, 0.5], [0, -3, 0], 0.2), null, 'from overlapping');
  assert.equal(sweepBox(UNIT, 0, [0.5, 1.2, 0.5], [0, -3, 0], 0.2), null, 'from touching');
  const back = sweepBox(UNIT, 0, [0.5, 1.205, 0.5], [0, -3, 0], 0.2);
  near(back.fraction, 0.005 / 3, 1e-6, 'from five millimetres clear');
  assert.equal(sweepBox(UNIT, 0, [0.5, 1.205, 0.5], [0, 3, 0], 0.2), null, 'going away');
});

test('the tree gives what asking every box gives', () => {
  const next = random(7);
  const boxes = new Float32Array(6 * 600);
  for (let i = 0; i < 600; i++) {
    const at = [next() * 60 - 30, next() * 40, next() * 60 - 30];
    const size = [0.05 + next() * 3, 0.05 + next() * 3, 0.05 + next() * 3];
    boxes.set([...at, at[0] + size[0], at[1] + size[1], at[2] + size[2]], 6 * i);
  }
  const tree = new BoxTree(boxes);
  let hits = 0;
  for (let trial = 0; trial < 400; trial++) {
    const from = [next() * 80 - 40, next() * 60 - 10, next() * 80 - 40];
    const to = [next() * 80 - 40, next() * 60 - 10, next() * 80 - 40];
    const radius = next() * 1.5;
    const by = to.map((v, k) => v - from[k]);
    let best = null;
    for (let i = 0; i < 600; i++) {
      const hit = sweepBox(boxes, 6 * i, from, by, radius);
      if (hit && (!best || hit.fraction < best.fraction)) best = { ...hit, box: i };
    }
    const got = tree.sweep(from, to, radius);
    assert.equal(got?.box, best?.box, `trial ${trial}`);
    if (best) {
      hits++;
      assert.equal(got.fraction, best.fraction);
    }
    const touching = [];
    for (let i = 0; i < 600; i++) if (new BoxTree(boxes.subarray(6 * i, 6 * i + 6)).touching(from, radius).length) touching.push(i);
    assert.deepEqual(
      tree.touching(from, radius).sort((a, b) => a - b),
      touching,
    );
  }
  assert.ok(hits > 100, `the trials meet something (${hits})`);
});

test('a file comes back as it went, from a buffer that starts anywhere, and no box comes back smaller', () => {
  const next = random(3);
  const boxes = [];
  for (let i = 0; i < 50; i++) {
    const at = [next() * 400 - 200, next() * 90 - 45, next() * 400 - 200];
    boxes.push([...at, at[0] + next() * 5, at[1] + next() * 5, at[2] + next() * 5]);
  }
  const track = Float32Array.from([0, 1, 2, 3, 0, 0, 0, 1, 4, 1, 2, 9, 0, 0.6, 0, 0.8]);
  const first = piece('Arm', boxes, { part: 'Tower', cell: 0.5, pose: { p: [1, 2, 3], q: [0, 0, 0, 1] }, track });
  const before = {
    cell: 0.25,
    source: 'abc',
    pieces: [first, piece('Deck', [[0, 0, 0, 1, 1, 1]])],
    hulls: [{ node: 'Stage', beads: Float32Array.from([0, 1, 0, 0.5]) }],
  };
  const bytes = encodeSolids(before);
  // (as node reads a file: a view somewhere inside a larger buffer, at an odd offset)
  const held = new Uint8Array(bytes.length + 7);
  held.set(bytes, 3);
  const after = decodeSolids(Buffer.from(held.buffer, 3, bytes.length));
  assert.equal(after.source, 'abc');
  assert.deepEqual(
    after.pieces.map((p) => [p.node, p.part, p.cell]),
    [
      ['Arm', 'Tower', 0.5],
      ['Deck', 'Deck', 0.25],
    ],
  );
  assert.deepEqual([...after.pieces[0].track], [...track]);
  assert.deepEqual(after.pieces[0].pose, { p: [1, 2, 3], q: [0, 0, 0, 1] });
  assert.deepEqual([...after.hulls[0].beads], [0, 1, 0, 0.5]);
  after.pieces[0].boxes.forEach((v, i) => {
    const was = first.boxes[i];
    assert.ok(i % 6 < 3 ? v <= was : v >= was, `box figure ${i} grew inward`);
    near(v, was, 0.01, `box figure ${i}`); // (16 bits over 205 m: 6 mm a step)
  });
});

test('a piece is where its track has it: its liftoff pose before, its last after, a straight line between', () => {
  const arm = piece('Arm', [[0, 0, 0, 1, 1, 1]], { track: Float32Array.from([0, 0, 0, 0, 0, 0, 0, 1, 10, 0, 20, 0, 0, 0, 0, 1]) });
  assert.deepEqual(poseAt(arm, -5).p, [0, 0, 0]);
  assert.deepEqual(poseAt(arm, 5).p, [0, 10, 0]);
  assert.deepEqual(poseAt(arm, 99).p, [0, 20, 0]);
});

test('a moving structure is met where it is at that instant, and by its own motion', () => {
  // an arm across the way at liftoff, swung clear (slid 20 m aside) over the first ten seconds
  const arm = piece('Arm', [[-1, 10, -1, 1, 11, 1]], { track: Float32Array.from([0, 0, 0, 0, 0, 0, 0, 1, 10, 20, 0, 0, 0, 0, 0, 1]) });
  const world = new SiteWorld([{ id: 'pad', solids: model(arm) }]);
  const up = (t0, t1) => world.sweep([0, 0, 0], [0, 30, 0], 0.5, t0, t1);
  const struck = up(0, 0);
  assert.equal(struck.node, 'Arm');
  near(struck.fraction, 9.5 / 30, 1e-6, 'under the arm at liftoff');
  assert.equal(up(10, 10), null, 'the arm has gone');
  assert.equal(up(60, 61), null, 'and stays gone');
  // standing still beside it while it moves: the arm comes to the sphere
  const beside = world.sweep([3, 10.5, 0], [3, 10.5, 0], 0.5, 0, 10);
  assert.ok(beside, 'met by the arm’s motion');
  near(beside.fraction, 1.5 / 20, 1e-6, 'when the arm’s end reaches it');
  assert.ok(beside.normal[0] > 0.999, 'pushed the way the arm goes');
});

test('a model is placed as its flight places it', () => {
  const tower = piece('Tower', [[4, 0, -1, 6, 30, 1]]);
  const world = new SiteWorld([{ id: 'pad', solids: model(tower), position: [0, 2, 0], rotationY: Math.PI / 2 }]);
  // (a turn of +90 degrees about +Y carries +X to -Z)
  const hit = world.sweep([0, 10, -20], [0, 10, 0], 1, 0);
  near(hit.fraction, (20 - 6 - 1) / 20, 1e-6, 'the tower stands on -Z');
  near(hit.normal[2], -1, 1e-6, 'facing back along the way');
  assert.equal(world.sweep([20, 10, 0], [0, 10, 0], 1, 0), null, 'and not on +X');
  const under = world.below([0, 100, -5], 0);
  near(under.height, 32, 1e-9, 'the tower’s top, on the model’s two metres');
  assert.deepEqual([under.model, under.node, under.part], ['pad', 'Tower', 'Tower']);
  assert.equal(world.below([0, 100, 5], 0), null);
  assert.deepEqual(world.touching([0, 10, -5], 0.5, 0), ['pad/Tower']);
});

test('the bake cuts a cube into one box, a deck into one slab, and a slope into steps no more than a cell out', () => {
  const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
  const cube = [
    quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]),
    quad([0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]),
    quad([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]),
    quad([0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]),
    quad([0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]),
    quad([1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]),
  ].flat();
  // (a shell: its six faces, joined where they line up; together they are the cube and nothing beyond it)
  const shell = boxesOf(Float32Array.from(cube));
  assert.ok(shell.length / 6 <= 30, `${shell.length / 6} boxes`);
  for (let i = 0; i < shell.length; i += 6)
    for (let k = 0; k < 3; k++) assert.ok(shell[i + k] >= -1e-6 && shell[i + 3 + k] <= 1 + 1e-6, 'within the cube');
  const tree = new BoxTree(shell);
  for (const [from, to] of [
    [
      [0.3, 4, 0.6],
      [0.3, -4, 0.6],
    ],
    [
      [-4, 0.4, 0.2],
      [4, 0.4, 0.2],
    ],
    [
      [0.7, 0.1, 5],
      [0.7, 0.1, -5],
    ],
  ]) {
    const hit = tree.sweep(from, to, 0.1);
    const k = from.findIndex((v, i) => v !== to[i]);
    near(from[k] + (to[k] - from[k]) * hit.fraction, from[k] > 0 ? 1.1 : -0.1, 1e-5, 'met on the face');
  }
  const deck = boxesOf(Float32Array.from(quad([-40.3, 2, -17.2], [55.1, 2, -17.2], [55.1, 2, 31.9], [-40.3, 2, 31.9])));
  assert.deepEqual(
    [...deck].map((v) => Math.round(v * 1e4) / 1e4),
    [-40.3, 2, -17.2, 55.1, 2, 31.9],
  );
  // a ramp rising 1 in 2: nowhere does a box stand more than a cell above or below it
  const ramp = boxesOf(Float32Array.from(quad([0, 0, 0], [10, 5, 0], [10, 5, 3], [0, 0, 3])));
  for (let i = 0; i < ramp.length; i += 6) {
    assert.ok(ramp[i + 4] <= ramp[i + 3] / 2 + 1e-5, 'no higher than the ramp at its high side');
    assert.ok(ramp[i + 1] >= ramp[i] / 2 - 1e-5, 'no lower than the ramp at its low side');
    assert.ok(ramp[i + 3] - ramp[i] <= 0.25 + 1e-5 && ramp[i + 4] - ramp[i + 1] <= 0.25 + 1e-5, 'a cell at most');
  }
  near(new BoxTree(ramp).below(5, 50, 1.5), 2.5, 0.25, 'the ramp’s height at its middle');
});
