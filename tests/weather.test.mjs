import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudCutAt } from '../src/viewer/air.ts';
import { believed, coverNear, deckCutAt, deckTex, MOST, NEAR, toScene, weatherAt } from '../src/viewer/weather.ts';

const sea = { shore: -40, height: -3000 };
const land = { shore: 40, height: 20 };

test('at the site the cumulus cover is the record’s, whatever the map says; away from it, the map’s', () => {
  assert.equal(coverNear(0.1, 0.6, 0), 0.1);
  assert.equal(coverNear(0.1, 0.6, NEAR[0]), 0.1);
  assert.equal(coverNear(0.1, 0.6, NEAR[1]), 0.6);
  assert.equal(coverNear(0.1, 0.6, 500_000), 0.6);
  let last = 0;
  for (let d = 0; d <= NEAR[1]; d += 500) {
    assert.ok(believed(d) >= last, 'the map comes in one way');
    last = believed(d);
  }
});

test('the weather is cloud cover: fractions of the sky, everywhere in the map', () => {
  for (let e = -2_000_000; e <= 2_000_000; e += 137_000)
    for (let n = -2_000_000; n <= 2_000_000; n += 149_000)
      for (const place of [sea, land, { shore: 0, height: 0 }, { shore: 30, height: 2500 }]) {
        const w = weatherAt(e, n, place);
        for (const v of [w.cumulus, w.cirrus, w.deck]) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v));
        assert.ok(w.cumulus <= MOST);
      }
});

test('the sea beside a shore and a lake are clearer than the open sea; high ground has more cumulus than low', () => {
  let beside = 0,
    open = 0,
    low = 0,
    high = 0;
  for (let i = 0; i < 400; i++) {
    const e = -300_000 + 2311 * i,
      n = 250_000 - 1787 * i;
    beside += weatherAt(e, n, { shore: -6, height: -10 }).cumulus;
    open += weatherAt(e, n, sea).cumulus;
    low += weatherAt(e, n, land).cumulus;
    high += weatherAt(e, n, { shore: 40, height: 1200 }).cumulus;
  }
  assert.ok(beside < 0.45 * open, `beside a shore ${beside / 400}, open sea ${open / 400}`);
  assert.ok(high > 1.5 * low, `high ground ${high / 400}, low ${low / 400}`);
  // the morning is fair: on the whole a fifth of the sky or less over low land and open sea
  assert.ok(open / 400 < 0.25 && low / 400 < 0.3);
});

test('the field cut for a cover covers that much, and more cover is a lower cut', () => {
  let last = Infinity;
  for (const cover of [0.02, 0.1, 0.25, 0.5, 0.85]) {
    const cut = cloudCutAt(cover);
    assert.ok(cut < last);
    last = cut;
  }
});

test('the middle deck cut for an eighth covers an eighth', () => {
  const cut = deckCutAt(0.125);
  let over = 0,
    all = 0;
  for (let i = 0; i < 260; i++)
    for (let j = 0; j < 260; j++) {
      all++;
      if (deckTex(i * 211.3 + 40_000, j * 197.9 - 90_000) > cut) over++;
    }
  assert.ok(Math.abs(over / all - 0.125) < 0.03, `${over / all}`);
});

test('east and north of the site in the scene’s frame: +X on the site’s bearing, +Z a quarter turn clockwise', () => {
  const b = (295 * Math.PI) / 180;
  // a point on the bearing is on +X; one a quarter turn clockwise of it is on +Z
  const [x, z] = toScene(Math.sin(b), Math.cos(b), b);
  assert.ok(Math.abs(x - 1) < 1e-12 && Math.abs(z) < 1e-12);
  const [x2, z2] = toScene(Math.sin(b + Math.PI / 2), Math.cos(b + Math.PI / 2), b);
  assert.ok(Math.abs(x2) < 1e-12 && Math.abs(z2 - 1) < 1e-12);
});
