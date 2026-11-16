import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudAt, cloudMiddle } from '../src/viewer/air.ts';
import { LAYER_THROUGH_GLSL, layerThrough, overGlsl, SHEET_DEPTH } from '../src/viewer/clouds.ts';
import { dayOf } from '../src/viewer/day.ts';

const mr4 = (await import('../missions/usa/mercury/flights/mr-4-liberty-bell-7/flight.ts')).flight;

// (the Cape's at liftoff, missions/usa/places/cape-canaveral/ground.ts: a tenth of the sky in cells of 1,500 m)
const cumulus = (cover) => ({ height: 720, depth: 650, cover, size: 1500, wind: [0, 0] });

/** The share of a wide patch of sky (48 km square, every 60 m) where a cloud stands: where the field is over one half. */
function covered(c, driftX = 0, driftZ = 0) {
  let over = 0,
    all = 0;
  for (let x = -24000; x < 24000; x += 60)
    for (let z = -24000; z < 24000; z += 60) {
      if (cloudAt(c, x + 7, z + 13, driftX, driftZ) > 0.5) over++;
      all++;
    }
  return over / all;
}

test("the record's cover is the share of the sky the clouds stand over, whatever the noise is made of", () => {
  for (const cover of [0.1, 0.3, 0.5]) {
    const got = covered(cumulus(cover));
    assert.ok(Math.abs(got - cover) < 0.03, `cover ${cover}: ${got.toFixed(3)} of the sky`);
  }
  // (and more cover is a lower cut of the same noise)
  assert.ok(cloudMiddle(cumulus(0.3)) < cloudMiddle(cumulus(0.1)));
});

test('the field drifts whole: a cloud and its shadow are read from the same place, moved by the wind', () => {
  const c = cumulus(0.1);
  for (const [x, z] of [
    [0, 0],
    [1234, -987],
    [-20500, 31000],
  ])
    assert.equal(cloudAt(c, x, z, 0, 0), cloudAt(c, x + 700, z - 300, 700, -300));
});

test('cumulus stand in groups: the sky is clear over wide stretches and crowded over others, not sprinkled evenly', () => {
  const c = cumulus(0.1);
  // the cover of each 6 km square of a 60 km one
  const shares = [];
  for (let i = -5; i < 5; i++)
    for (let j = -5; j < 5; j++) {
      let over = 0,
        all = 0;
      for (let x = 0; x < 6000; x += 100)
        for (let z = 0; z < 6000; z += 100) {
          if (cloudAt(c, i * 6000 + x, j * 6000 + z, 0, 0) > 0.5) over++;
          all++;
        }
      shares.push(over / all);
    }
  shares.sort((a, b) => a - b);
  assert.ok(shares[10] < 0.04, `a tenth of the squares are nearly clear: ${shares[10].toFixed(3)}`);
  assert.ok(shares[90] > 0.18, `a tenth have nearly twice the cover and more: ${shares[90].toFixed(3)}`);
});

// ---- the sheets are layers the eye climbs through (clouds.ts: SHEET_DEPTH, layerThrough) ----

test('a sheet is a layer: whole from outside it, and from inside it as much as is left that way, never stepping', () => {
  const [lo, hi] = [5400, 5700];
  // from outside, above and under, every way: the whole of it (its opacity along the ray is the sheet's own business)
  for (const eye of [0, 5399, 5701, 30_000])
    for (const ud of [-1, -0.2, -0.01, 0.01, 0.3, 1]) assert.equal(layerThrough(eye, lo, hi, ud, 1e9), 1);
  // from inside: what is left of its depth that way
  assert.equal(layerThrough(5550, lo, hi, 1, 1e9), 0.5);
  assert.equal(layerThrough(5550, lo, hi, -1, 1e9), 0.5);
  // climbing up through it, a ray up meets all of it, then less and less, and none as the eye leaves its top; coming
  // down, a ray down the same: each half a metre of the climb changes it by no more than half a metre's share
  for (const [ud, from, to, by] of [
    [1, lo - 50, hi, 0.5],
    [0.3, lo - 50, hi, 0.5],
    [-1, hi + 50, lo, -0.5],
    [-0.3, hi + 50, lo, -0.5],
  ]) {
    let was = layerThrough(from, lo, hi, ud, 1e9);
    assert.equal(was, 1);
    for (let eye = from + by; by > 0 ? eye < to : eye > to; eye += by) {
      const now = layerThrough(eye, lo, hi, ud, 1e9);
      assert.ok(Math.abs(now - was) <= 0.5 / (hi - lo) + 1e-12, `ud ${ud} at ${eye} m: ${was} to ${now}`);
      was = now;
    }
    assert.ok(was < 0.002, `ud ${ud}: ${was} left as the eye leaves the layer`);
  }
  // what stands in front within it (the vehicle, 40 m off) has only the layer between it and the eye in front of it
  assert.equal(layerThrough(5550, lo, hi, 0.5, 40), (40 * 0.5) / 300);
});

test('nothing of a sheet is cut away round the eye: what is drawn of it is the ray and the layer, not how far off it is', () => {
  // (the deck was faded out within 3 km of the eye and the high cloud within 8 km: a hole that went up with the
  // vehicle, the cumulus seen through it as if they followed it)
  const text = overGlsl(dayOf(mr4));
  assert.doesNotMatch(text, /smoothstep\(0\.0, kind == 0 \? 3000\.0 : 8000\.0, tm\)/);
  assert.match(text, /float through = layerThrough\(uEyeH, lo, hi, ud, d\);/);
  // the layers are the day's: the deck from its base (5,400 m on 21 July) up, the veil about its height (10,500 m)
  assert.match(text, /float lo = kind == 0 \? 5400\.0 : 10100\.0, hi = kind == 0 \? 5700\.0 : 10900\.0;/);
  assert.deepEqual(SHEET_DEPTH, { deck: 300, high: 800 });
  // and the shader's is the function tested above, to the letter
  const body = (s) => s.replace(/\s+/g, ' ').trim();
  assert.ok(
    body(LAYER_THROUGH_GLSL).includes(
      'if (!(eyeH > lo && eyeH < hi)) return 1.0; float left = ud > 0.0 ? hi - eyeH : eyeH - lo; return min(left, d * abs(ud)) / (hi - lo);',
    ),
  );
  assert.ok(
    body(layerThrough.toString()).includes(
      'if (!(eyeH > lo && eyeH < hi)) return 1; const left = ud > 0 ? hi - eyeH : eyeH - lo; return Math.min(left, d * Math.abs(ud)) / (hi - lo);',
    ),
  );
});
