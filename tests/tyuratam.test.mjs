import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BROW, pastBrow, siteRelief } from '../src/viewer/tyuratamrelief.ts';

// What the place's models are built on (missions/ussr/vostok/sites/site1/relief.py), as that file prints it:
// `python3 missions/ussr/vostok/sites/site1/relief.py > tests/fixtures/site1-relief.json` after changing either.
const built = JSON.parse(readFileSync(new URL('./fixtures/site1-relief.json', import.meta.url), 'utf8'));

test('Site 1: the land the walker stands on is the land the place was built on, to a tenth of a millimetre', () => {
  assert.ok(built.length > 400);
  let worst = 0;
  for (const [x, y, g] of built) worst = Math.max(worst, Math.abs(siteRelief(x, y) - g));
  assert.ok(worst < 1e-4, `the JavaScript and the Python differ by ${worst} m`);
});

test('Site 1: the tracks, the platform and the ground south of them are level; the bunker stands 8 m down', () => {
  // the centre track for its last 1,400 m, the four spurs' ends, the platform's corners, the apron, the south fence
  for (const [x, y] of [
    [-1400, 10.6],
    [-700, 4.6],
    [-160, 0],
    [-25.8, 0],
    [-39.8, 28.9],
    [-121.8, 25.7],
    [-212.6, 15.2],
    [20.6, 20.6],
    [-28.2, -20.6],
    [-60, -30],
    [0, -191],
    [-477, -51],
  ])
    assert.equal(siteRelief(x, y), 0, `the ground at ${x}, ${y} is not at the tracks' level`);
  assert.equal(siteRelief(3.6, 206.6), -8); // the command bunker
  assert.equal(siteRelief(-47, 207.4), -8); // the storage bunker
  assert.ok(Math.abs(siteRelief(239, 1.5) + 5.5) < 0.5); // the pit's tip
});

test('Site 1: the fall has no step in it, and nowhere is it steeper than a man can walk', () => {
  let steepest = 0;
  for (let x = -600; x <= 500; x += 7)
    for (let y = -260; y <= 320; y += 0.5) {
      const rise = Math.abs(siteRelief(x, y + 0.5) - siteRelief(x, y)) / 0.5;
      steepest = Math.max(steepest, rise);
    }
  assert.ok(steepest < 0.65, `the ground climbs ${steepest.toFixed(2)} in 1 somewhere`);
  // the road from the storage bunker comes up its ramp at about 1 in 14
  for (let y = 45; y < 145; y += 5) {
    const grade = Math.abs(siteRelief(-83, y + 5) - siteRelief(-83, y)) / 5;
    assert.ok(grade < 0.12, `the road climbs ${grade.toFixed(2)} in 1 at ${y} m north`);
  }
  // and the pump house's plot is level
  assert.ok(Math.abs(siteRelief(-45.5, 56) - siteRelief(-36, 67)) < 1e-9);
});

test('Site 1: the brow runs west to east with the low ground on its left', () => {
  assert.ok(BROW.every((p, i) => i === 0 || p[0] > BROW[i - 1][0]));
  assert.ok(pastBrow(0, 100) > 0 && pastBrow(0, 0) < 0 && pastBrow(300, 0) > 0 && pastBrow(100, -150) < 0);
});

// The country past the place's own ground (viewer/tyuratamworks.ts): SRTM's lie of the land, and the worked ground off
// the Corona frames of December 1960 and May 1962 (missions/ussr/vostok/sites/tyuratam-works.ts).
const { heightsAt } = await import('../src/viewer/tyuratamworks.ts');
const { TYURATAM_WORKS, FANS } = await import('../missions/ussr/vostok/sites/tyuratam-works.ts');
const { TYURATAM_HEIGHTS } = await import('../missions/ussr/vostok/sites/tyuratam-heights.ts');

test('Site 1: the land beyond holds the country’s form, against the sheet and the record', () => {
  const H = TYURATAM_HEIGHTS;
  assert.equal(Buffer.from(H.bytes, 'base64').length, H.n * H.n);
  assert.ok(H.half >= 8000 + 2 * H.step, 'the grid reaches past the land’s edge, with the spline’s margin');
  // Kilinshek: 132.6 m on the 1:100,000 sheet L-41-79, 1.2 km west and 1.4 km south of the pad
  const top = heightsAt(-1200, -1400) + H.level;
  assert.ok(Math.abs(top - 132.6) < 2, `Kilinshek at ${top.toFixed(1)} m`);
  // the steppe north of the pad 7 to 8 m below the deck (site-1.md: SRTM 104 to 107 m from 65 to 400 m north)
  assert.ok(heightsAt(0, 400) < -5 && heightsAt(0, 400) > -10);
  // the hollow to the north and the Takyrsai's valley to the south lie low
  assert.ok(heightsAt(500, 5500) < -8);
  assert.ok(heightsAt(0, -4000) < -10);
});

test('Site 1: the land beyond is smooth: no step and no crease along its grid, and nowhere a cliff', () => {
  let worst = 0;
  let bend = 0;
  const e = 0.5;
  for (let x = -7900; x <= 7900; x += 37.3)
    for (let y = -7900; y <= 7900; y += 410.7) {
      const a = heightsAt(x - e, y),
        b = heightsAt(x, y),
        c = heightsAt(x + e, y);
      worst = Math.max(worst, Math.abs(c - a) / (2 * e));
      bend = Math.max(bend, Math.abs(c - 2 * b + a) / (e * e));
    }
  assert.ok(worst < 0.12, `steepest slope ${worst.toFixed(3)}`);
  assert.ok(bend < 0.01, `sharpest bend ${bend.toFixed(4)} per metre`);
});

test('Site 1: every piece of the worked ground was there in April 1961, says where it is from, and is drawable', () => {
  const kinds = new Set(['worn', 'bare', 'graded', 'rail', 'road', 'track']);
  assert.ok(TYURATAM_WORKS.length > 20);
  const ids = new Set();
  for (const w of TYURATAM_WORKS) {
    assert.ok(!ids.has(w.id), `${w.id} twice`);
    ids.add(w.id);
    assert.ok(kinds.has(w.kind), w.id);
    // on both frames, which bracket the flight: anything on the frame of 1962 alone is left out
    assert.equal(w.frames, 'both', w.id);
    assert.ok(['documented', 'derived', 'estimated'].includes(w.confidence), w.id);
    assert.match(w.source, /CORONA/, w.id);
    assert.ok(w.note.length > 20, w.id);
    const pts = w.ring ?? w.line;
    assert.ok(pts && pts.length >= (w.ring ? 3 : 2), w.id);
    for (const [x, y] of [...pts, ...(w.holes ?? []).flat()])
      assert.ok(Math.abs(x) <= 8000 && Math.abs(y) <= 8000, `${w.id} at ${x}, ${y}`);
    if (w.line) assert.ok(w.width > 0 && w.width <= 60, `${w.id}: a way has a breadth`);
    else assert.equal(w.width, undefined, w.id);
  }
  // the ways the frames show: the main line and the spur to Site 51, the roads, the tracks
  for (const id of ['rail-main', 'rail-site51', 'road-station', 'road-site2-south-east', 'track-east', 'track-west-south'])
    assert.ok(ids.has(id), id);
  for (const f of FANS) assert.ok(Math.hypot(...f.at) < 3000 && f.name.length > 5);
});
