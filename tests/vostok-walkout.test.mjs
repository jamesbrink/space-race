import assert from 'node:assert/strict';
import { test } from 'node:test';
import { materialsUnder } from './glb.mjs';

test('Tereshkova wears the photographed white overshoes on the walkout at every detail level', () => {
  for (const level of ['', '.lod1', '.lod2']) {
    const boots = (flight) =>
      materialsUnder(new URL(`../public/models/ussr/vostok/vostok-${flight}/crew${level}.glb`, import.meta.url), 'Boots');
    assert.deepEqual(new Set(boots(6)), new Set(['walkout-overshoes-white-cloth']));
    assert.ok(boots(5).includes('boot-leather-black'));
  }
});
