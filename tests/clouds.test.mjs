import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudAt, cloudMiddle } from '../src/viewer/air.ts';

// (the Cape's at liftoff, cape.ts: a tenth of the sky in cells of 1,500 m)
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
