import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { billowsData, DETAIL_SIDE, detailData, NOISE } from '../src/viewer/cloudnoise.ts';

const whole = (making) => {
  let r = making.next();
  while (!r.done) r = making.next();
  return r.value;
};
const digest = (data) => createHash('sha256').update(data).digest('hex');

// The clouds are drawn from these two tiles: a byte different and every cloud is a different cloud. The digests are of
// what clouds.ts made on the page's own thread before a worker made them; whoever makes them, they are these.
test('the billows: the tile the clouds have always been drawn from, to the byte', () => {
  const data = whole(billowsData());
  assert.equal(data.length, NOISE ** 3 * 4);
  assert.equal(digest(data), 'e5cf438acc67ed28f3a6f9283432aad4ad3d175d4f369986a53efe00b13c3582');
});

test('the detail: the same', () => {
  const data = whole(detailData());
  assert.equal(data.length, DETAIL_SIDE ** 3);
  assert.equal(digest(data), '26204fb6d34249d4ce3099e060154c4d5130deeb41ca0a4ed4c293d1eb52cf4b');
});
