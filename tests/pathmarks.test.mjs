// The predicted path's markers on the page (src/viewer/pathmarks.ts): nothing on a panel, nothing on another
// marker, nothing in the clear zone round the vehicle, the most important kept when there is not room for all,
// and nothing that jumps from frame to frame.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boxToSegment,
  clearArea,
  crossFade,
  FIRST,
  GLYPH,
  labelBox,
  layChips,
  layMarks,
  layWords,
  MIDDLE,
  SECOND,
  SMALL,
  unseen,
} from '../src/viewer/pathmarks.ts';

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

// ---- chips: a marker that matters and is not in view, at the edge of the clear part of the view (`layChips`)

/** The flight deck at 1440 by 900: the clock across the top, the deck's middle across the bottom, its two side panels in the corners. */
const deck = [
  { x0: 505, y0: 28, x1: 935, y1: 68 }, // the clock
  { x0: 446, y0: 672, x1: 1007, y1: 872 }, // the deck's middle
  { x0: 28, y0: 693, x1: 372, y1: 872 }, // the navball
  { x0: 1083, y0: 640, x1: 1411, y1: 872 }, // the systems
];
const chip = (id, at, dx = 0, dy = 0, rank = 100, w = 130) => ({
  id,
  rank,
  w,
  h: 18,
  at,
  dx: at ? at.x - W / 2 : dx,
  dy: at ? at.y - H / 2 : dy,
});
const lay = (chips, over = {}, taken = [], before) => layChips(chips, field({ panels: deck, ...over }), W / 2, H / 2, taken, before);
const middle = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

/** Every chip inside the clear part, off the panels, the clear zone, what was taken and each other. */
function chipsSound(out, f, taken = []) {
  const area = clearArea(f);
  const boxes = out.filter((o) => o.box).map((o) => o.box);
  for (const [i, b] of boxes.entries()) {
    assert.ok(b.x0 >= area.x0 && b.y0 >= area.y0 && b.x1 <= area.x1 && b.y1 <= area.y1, `chip ${i} outside the clear part`);
    for (const p of f.panels) assert.ok(!overlap(b, p), `chip ${i} lies on a panel`);
    for (const t of taken) assert.ok(!overlap(b, t), `chip ${i} lies on a marker`);
    for (const c of boxes.slice(i + 1)) assert.ok(!overlap(b, c), `chip ${i} on another`);
    if (f.clear.r > 0) assert.ok(boxToSegment(b, f.clear.ax, f.clear.ay, f.clear.bx, f.clear.by) >= f.clear.r, `chip ${i} on the vehicle`);
  }
}

test('the clear part is the window less the bands of panels across its top and bottom', () => {
  assert.deepEqual(clearArea(field({ panels: deck })), { x0: 0, y0: 68, x1: W, y1: 672 });
  // a panel in a corner is no band
  assert.deepEqual(clearArea(field({ panels: [deck[2]] })), { x0: 0, y0: 0, x1: W, y1: H });
});

test('a marker in view has no chip; one above the view has one at the top edge, toward it', () => {
  const [inView] = lay([chip('apogee', { x: 700, y: 300 })]);
  assert.equal(inView.box, null);
  const [above] = lay([chip('apogee', { x: 900, y: -400 })]);
  assert.ok(above.box);
  assert.ok(above.box.y0 < 68 + 20, `at the top: ${JSON.stringify(above.box)}`);
  // on the bearing from the middle: the ray to (900, -400) crosses the top of the clear part right of the middle
  const m = middle(above.box);
  assert.ok(m.x > W / 2 && m.x < 900, `x ${m.x}`);
  assert.ok(Math.sin(above.angle) < -0.9, 'the pointer points up');
  assert.ok(Math.abs(above.py - above.box.y0) < 1e-6, 'from the chip’s top edge');
  chipsSound([above], field({ panels: deck }));
});

test('a marker under a panel has a chip at the edge above the panel, pointing down at it', () => {
  const [o] = lay([chip('down', { x: 700, y: 760 }, 0, 0, 95)]);
  assert.ok(o.box, 'shown');
  assert.ok(o.box.y1 <= 672 && o.box.y1 > 640, `just over the deck: ${JSON.stringify(o.box)}`);
  assert.ok(Math.sin(o.angle) > 0.9, 'pointing down');
});

test('a marker behind the eye is at the edge on its own side, never mirrored through the middle', () => {
  // behind and to the right and above: on the right, up
  const [o] = lay([chip('apogee', null, 500, -200)]);
  assert.ok(o.box);
  const m = middle(o.box);
  assert.ok(m.x > W / 2 && m.y < H / 2, `at ${m.x}, ${m.y}`);
  assert.ok(Math.cos(o.angle) > 0 && Math.sin(o.angle) < 0, 'pointing right and up');
  // crossing from in front of the eye to behind it, through the side: no leap
  const front = lay([chip('apogee', { x: W / 2 + 5e6, y: H / 2 - 2e6 })])[0];
  const behind = lay([chip('apogee', null, 5e6, -2e6)])[0];
  assert.ok(Math.hypot(front.box.x0 - behind.box.x0, front.box.y0 - behind.box.y0) < 1, 'the same place either side of the eye');
});

test('a chip slides along the edge off a panel in the corner, the vehicle, the markers on the line and the chips before it', () => {
  const clear = { ax: 720, ay: 200, bx: 720, by: 500, r: 60 };
  const taken = [{ x0: 1300, y0: 300, x1: 1440, y1: 330 }];
  const f = field({ panels: deck, clear });
  const chips = [
    chip('apogee', { x: 1700, y: 700 }, 0, 0, 100), // toward the systems panel
    chip('separation', { x: 1700, y: 690 }, 0, 0, 71), // just beside it
    chip('down', { x: 720, y: -900 }, 0, 0, 95), // straight up, over the vehicle
    chip('retro', { x: 2400, y: 320 }, 0, 0, 58), // where a marker on the line has its label
  ];
  const out = layChips(chips, f, W / 2, H / 2, taken);
  assert.ok(
    out.every((o) => o.box),
    'all shown',
  );
  chipsSound(out, f, taken);
});

test('a chip moves little as its bearing moves a little, all the way round, past the panels in the corners too', () => {
  let before;
  let last = null;
  for (let k = 0; k <= 1440; k++) {
    const a = (k * Math.PI) / 720;
    const [o] = lay([chip('apogee', null, Math.cos(a) * 1000, Math.sin(a) * 1000)], {}, [], before);
    assert.ok(o.box, `shown at ${k / 4}°`);
    if (last) {
      // (brought in off a corner's panel along its inner edges, not slid round it: a quarter of a degree is a few pixels)
      const step = Math.hypot(o.box.x0 - last.x0, o.box.y0 - last.y0);
      assert.ok(step < 20, `at ${k / 4}° it moved ${step.toFixed(1)} px`);
      assert.equal(o.leap, false, `at ${k / 4}° it is said to have leapt`);
    }
    last = o.box;
    before = new Map([[o.id, o]]);
  }
});

test('a chip whose place leaps says so, to be faded out and in rather than glided across the page', () => {
  // its marker goes from behind the eye on the right to behind it on the left, between one frame and the next
  const [a] = lay([chip('apogee', null, 500, 0)]);
  const [b] = lay([chip('apogee', null, -500, 0)], {}, [], new Map([[a.id, a]]));
  assert.ok(a.box && b.box);
  assert.equal(b.leap, true);
  // and a chip slid round another that has come to stand where it was
  const first = lay([chip('down', { x: 900, y: -400 }, 0, 0, 95)]);
  const was = new Map(first.map((o) => [o.id, o]));
  const [, crowded] = lay([chip('apogee', { x: 900, y: -400 }, 0, 0, 100, 400), chip('down', { x: 900, y: -400 }, 0, 0, 95)], {}, [], was);
  assert.ok(crowded.box);
  assert.equal(crowded.leap, true, `slid ${crowded.slide} px`);
});

test('on a phone the chips keep to the strip between the clock and the deck', () => {
  const panels = [
    { x0: 8, y0: 8, x1: 382, y1: 44 }, // the clock
    { x0: 8, y0: 265, x1: 382, y1: 836 }, // the deck and its sheet
  ];
  const f = { width: 390, height: 844, panels, clear: none };
  assert.deepEqual(clearArea(f), { x0: 0, y0: 44, x1: 390, y1: 265 });
  const chips = [
    chip('apogee', null, 0, -500, 100, 120),
    chip('down', { x: 300, y: 600 }, 0, 0, 95, 120),
    chip('retro', null, 900, 20, 58, 120),
  ];
  const out = layChips(chips, f, 195, 422, []);
  assert.ok(
    out.every((o) => o.box),
    'all shown',
  );
  chipsSound(out, f);
});

test('a marker is never laid out twice, nor drawn at two places: its chip and its label cross-fade in place', () => {
  // the landing point wanders over the top edge of the deck and back, as it did at T+2:10 with the line near upright,
  // then under the deck, behind the eye and back into view; the apogee and the next event go about too
  const f = field({ panels: deck });
  const ids = ['down', 'apogee', 'retro'];
  const drawn = new Map(ids.map((id) => [id, unseen()]));
  let before = {};
  let handing = 0;
  let rnd = 7;
  const random = () => ((rnd = (rnd * 16807) % 2147483647) - 1) / 2147483646;
  for (let k = 0; k < 4000; k++) {
    const s = k / 60;
    const points = {
      down:
        k < 2400 ? { x: 690 + 30 * Math.sin(s * 3), y: 662 + 14 * Math.sin(s * 7.3) + 4 * random() } : k < 3000 ? { x: 700, y: 760 } : null,
      apogee: { x: 700 + 900 * Math.sin(s / 3), y: 120 + 80 * Math.cos(s) },
      retro: k % 900 < 450 ? { x: 400 + 4 * random(), y: 400 } : { x: 400, y: 1000 },
    };
    const marks = [];
    const chips = [];
    for (const [i, id] of ids.entries()) {
      const at = points[id];
      const rank = [95, 100, 58][i];
      if (at && at.x >= 0 && at.x <= W && at.y >= 0 && at.y <= H) marks.push({ id, x: at.x, y: at.y, rank, w: 130, h: 18 });
      chips.push(chip(id, at, 600, 300, rank));
    }
    const out = layWords(marks, chips, f, 800, W / 2, H / 2, before);
    before = { marks: new Map(out.marks.map((o) => [o.id, o])), chips: new Map(out.chips.map((o) => [o.id, o])) };
    for (const id of ids) {
      const m = before.marks.get(id);
      const c = before.chips.get(id);
      assert.ok(!(m?.glyph && c?.box), `frame ${k}: ${id} is laid on the line and as a chip`);
      const w = drawn.get(id);
      // (a frame of a sixtieth, against a fade of a fifth of a second; and now and then a long one)
      crossFade(w, m?.box ? { x: m.box.x0, y: m.box.y0 } : null, c?.box ? { x: c.box.x0, y: c.box.y0 } : null, k % 97 ? 1 / 12 : 0.6);
      if (w.label.op > 0 && w.chip.op > 0) handing++;
      if (w.label.op > 0 && w.chip.op > 0)
        assert.ok(w.label.x === w.chip.x && w.label.y === w.chip.y, `frame ${k}: ${id} is drawn at two places at once`);
      if (c?.box && w.chip.op === 1 && !w.leap)
        assert.deepEqual([w.chip.x, w.chip.y], [c.box.x0, c.box.y0], 'a chip shown is where it was laid');
      if (m?.box && w.label.op === 1) assert.deepEqual([w.label.x, w.label.y], [m.box.x0, m.box.y0], 'a label shown is where it was laid');
    }
  }
  assert.ok(handing > 50, `it handed over between the line and the edge (${handing} frames with both drawn)`);
});

test('the cross-fade: the one coming fades in where it belongs, the one going fades out over it there', () => {
  const w = unseen();
  const label = { x: 100, y: 200 };
  const edge = { x: 140, y: 650 };
  for (let i = 0; i < 10; i++) crossFade(w, null, edge, 0.25);
  assert.deepEqual(w.chip, { ...edge, op: 1 });
  // the marker comes onto the line: the chip goes, over the label, without its pointer
  crossFade(w, label, edge, 0.25);
  assert.deepEqual(w.label, { ...label, op: 0.25 });
  assert.deepEqual(w.chip, { ...label, op: 0.75 });
  assert.equal(w.own, false);
  for (let i = 0; i < 3; i++) crossFade(w, label, null, 0.25);
  assert.equal(w.chip.op, 0);
  assert.equal(w.label.op, 1);
  // and leaves it again: the label goes, over the chip
  crossFade(w, null, edge, 0.25);
  assert.deepEqual(w.chip, { ...edge, op: 0.25 });
  assert.deepEqual(w.label, { ...edge, op: 0.75 });
  assert.equal(w.own, true);
});
