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
