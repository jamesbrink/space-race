// The predicted path's markers on the page (src/viewer/pathmarks.ts): nothing on a panel, nothing on another
// marker, nothing in the clear zone round the vehicle, the most important kept when there is not room for all,
// and nothing that jumps from frame to frame.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boxToSegment, FIRST, GLYPH, labelBox, layMarks, MIDDLE, SECOND, SMALL } from '../src/viewer/pathmarks.ts';

const W = 1440;
const H = 900;
const none = { ax: 0, ay: 0, bx: 0, by: 0, r: 0 };
const field = (over = {}) => ({ width: W, height: H, panels: [], clear: none, ...over });
const mark = (id, x, y, rank = 50, w = 120) => ({ id, x, y, rank, w, h: 18 });
const overlap = (a, b) => a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
const glyphOf = (m) => ({ x0: m.x - GLYPH, y0: m.y - GLYPH, x1: m.x + GLYPH, y1: m.y + GLYPH });

/** Every placed label and glyph, checked against each other, the panels, the window and the clear zone. */
function sound(marks, f, out) {
  const boxes = [];
  out.forEach((o, i) => {
    if (o.glyph) boxes.push(glyphOf(marks[i]));
    if (o.box) {
      assert.ok(o.glyph, `${o.id}: a label without its glyph`);
      boxes.push(o.box);
      assert.ok(o.box.x0 >= 0 && o.box.y0 >= 0 && o.box.x1 <= f.width && o.box.y1 <= f.height, `${o.id}: off the window`);
    }
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlap(boxes[i], boxes[j]), `boxes ${i} and ${j} overlap`);
    for (const p of f.panels) assert.ok(!overlap(boxes[i], p), `box ${i} lies on a panel`);
    if (f.clear.r > 0)
      assert.ok(boxToSegment(boxes[i], f.clear.ax, f.clear.ay, f.clear.bx, f.clear.by) >= f.clear.r, `box ${i} is in the clear zone`);
  }
}

test('a label goes above its glyph when there is room, and never over a panel', () => {
  const f = field({ panels: [{ x0: 0, y0: 680, x1: 380, y1: 900 }] });
  const marks = [mark('apogee', 700, 300, 100)];
  const [o] = layMarks(marks, f, 800);
  assert.equal(o.side, 'above');
  assert.deepEqual(o.box, labelBox(marks[0], 'above'));
  // just over the deck's panel, the label goes where it fits; on it, the glyph too is not shown
  const near = [mark('down', 200, 668, 95)];
  const [p] = layMarks(near, f, 800);
  assert.ok(p.glyph && p.box && !overlap(p.box, f.panels[0]), `placed ${p.side}`);
  sound(near, f, [p]);
  const [q] = layMarks([mark('down', 200, 700, 95)], f, 800);
  assert.equal(q.glyph, false);
  assert.equal(q.box, null);
});

test('crowded markers: no two overlap, and the most important keep their labels', () => {
  // eleven markers bunched along a short stretch, as the end of a descent seen from far off
  const kinds = [
    ['apogee', 100],
    ['down', 95],
    ['retro', 58],
    ['peak', 54],
    ['main', 52],
    ['entry', 50],
    ['drogue', 48],
    ['separation', 46],
    ['tower', 40],
    ['retropack', 38],
    ['cutoff', 62],
  ];
  const marks = kinds.map(([id, rank], i) => mark(id, 600 + i * 15, 400 + i * 10, rank));
  const f = field();
  const out = layMarks(marks, f, 800);
  sound(marks, f, out);
  const by = new Map(out.map((o) => [o.id, o]));
  assert.ok(by.get('apogee').box && by.get('down').box, 'apogee and where it comes down keep their labels');
  assert.ok(out.filter((o) => o.box).length < marks.length, 'not all of them fit');
});

test('a small arc offers only the most important; a middling one the next', () => {
  const marks = [mark('apogee', 400, 300, 100), mark('down', 700, 500, 95), mark('retro', 300, 600, 58), mark('entry', 1000, 200, 50)];
  const shown = (span) =>
    layMarks(marks, field(), span)
      .filter((o) => o.glyph)
      .map((o) => o.id)
      .sort();
  assert.deepEqual(shown(SMALL - 1), ['apogee', 'down']);
  assert.ok(FIRST > SECOND);
  assert.deepEqual(shown(MIDDLE - 1), ['apogee', 'down'].sort()); // (retro at 58 is under SECOND)
  assert.deepEqual(shown(MIDDLE + 1), ['apogee', 'down', 'entry', 'retro']);
});

test('nothing in the clear zone round the vehicle', () => {
  const clear = { ax: 700, ay: 300, bx: 720, by: 600, r: 60 };
  const f = field({ clear });
  const marks = [mark('cutoff', 790, 280, 62), mark('apogee', 900, 200, 100), mark('tower', 712, 450, 40)];
  const out = layMarks(marks, f, 800);
  sound(marks, f, out);
  assert.equal(out[2].glyph, false, 'a marker on the vehicle itself is not shown');
  assert.ok(out[0].glyph, 'one just off it is');
  assert.notEqual(out[0].side, 'left', 'and its label is not laid across the vehicle');
});

test('labels stay where they were while that is clear, and do not flicker at a margin', () => {
  const f = field({ panels: [{ x0: 1000, y0: 0, x1: 1440, y1: 900 }] });
  const marks = [mark('apogee', 700, 300, 100), mark('retro', 760, 330, 58)];
  let before = new Map(layMarks(marks, f, 800).map((o) => [o.id, o]));
  const sides = [...before.values()].map((o) => o.side);
  // moved a pixel at a time for a while: the same sides, frame after frame
  for (let k = 1; k <= 30; k++) {
    const moved = marks.map((m) => ({ ...m, x: m.x + k * 0.7, y: m.y - k * 0.4 }));
    const out = layMarks(moved, f, 800, before);
    sound(moved, f, out);
    assert.deepEqual(
      out.map((o) => o.side),
      sides,
      `frame ${k}`,
    );
    before = new Map(out.map((o) => [o.id, o]));
  }
  // a label's right edge against a panel: once shown it stays shown as it creeps up to the edge, with no margin asked of it
  const edge = [mark('apogee', 1000 - 14 - 60, 400, 100)];
  let was = new Map(layMarks(edge, f, 800).map((o) => [o.id, o]));
  assert.ok(was.get('apogee').box);
  const on = [];
  for (let dx = 0; dx <= 3; dx += 0.5) {
    const out = layMarks([{ ...edge[0], x: edge[0].x + dx }], f, 800, was);
    on.push(Boolean(out[0].box));
    was = new Map(out.map((o) => [o.id, o]));
  }
  assert.ok(on.every(Boolean), `shown at every step: ${on}`);
});

test('the distance from a box to a segment', () => {
  const box = { x0: 10, y0: 10, x1: 20, y1: 20 };
  assert.equal(boxToSegment(box, 0, 0, 0, 30), 10);
  assert.equal(boxToSegment(box, 15, 0, 15, 30), 0);
  assert.ok(Math.abs(boxToSegment(box, 30, 30, 40, 40) - Math.hypot(10, 10)) < 1e-6);
});
