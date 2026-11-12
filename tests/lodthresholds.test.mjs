import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOD_ABOVE as VIEWERS } from '../src/viewer/lod.ts';
import { ALLOWED, apart, carry, LOD_ABOVE, records, thresholdFrom } from '../tools/lod-thresholds.mjs';

test('the tool and the viewer have the same thresholds for a thing with none of its own', () => {
  assert.deepEqual(LOD_ABOVE, [...VIEWERS]);
});

test('a threshold is the largest size at and under which no more differs than is allowed, and never under the viewer\u2019s', () => {
  const rows = (...differ) => [2.5, 5, 10, 20, 40].map((ppm, i) => ({ ppm, differ: differ[i] })).filter((r) => r.differ !== undefined);
  assert.equal(thresholdFrom(rows(0, 0, 0, 0, 0), 0), 40, 'the same at every size: as soon as was measured');
  assert.equal(thresholdFrom(rows(5, 20, ALLOWED[0], ALLOWED[0] + 1), 0), 10);
  assert.equal(
    thresholdFrom(rows(5, 20, ALLOWED[0] + 1, 3, 3), 0),
    LOD_ABOVE[0],
    'what is fine again above a size that is not does not count',
  );
  assert.equal(thresholdFrom(rows(ALLOWED[0] + 1), 0), LOD_ABOVE[0], 'too much everywhere: the viewer\u2019s own, as before');
  assert.equal(thresholdFrom([], 1), LOD_ABOVE[1]);
  assert.deepEqual(apart([20, 28]), [20, 14], 'the second change is kept a size under the first');
  assert.deepEqual(apart([LOD_ABOVE[0], 10]), [LOD_ABOVE[0], 7]);
  assert.deepEqual(apart([40, 5]), [40, 5]);
});

test('every model carries the thresholds its record gives it (after a rebuild: node tools/lod-thresholds.mjs)', () => {
  const found = records();
  for (const { file, glb } of found) assert.deepEqual(carry(file, glb, true), []);
});
