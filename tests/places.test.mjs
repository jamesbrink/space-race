// The places' pads and what is laid round them (missions/<nation>/places/<place>/): pure, no page.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LC5 } from '../missions/usa/places/cape-canaveral/lc-5.ts';
import { LC14 } from '../missions/usa/places/cape-canaveral/lc-14.ts';
import { LC19 } from '../missions/usa/places/cape-canaveral/lc-19.ts';
import { SITE1 } from '../missions/ussr/places/tyuratam/site-1.ts';

const PADS = [LC5, LC14, LC19, SITE1];
const FT = 0.3048;

test('every pad says where its model frame sits on the land, with its confidence and source', () => {
  for (const pad of PADS) {
    assert.equal(typeof pad.grade.value, 'number', pad.name);
    assert.ok(pad.grade.value <= 0, `${pad.name}: the land is not under its model's zero`);
    assert.ok(['documented', 'derived', 'estimated'].includes(pad.grade.confidence), pad.name);
    assert.ok(pad.grade.source.length > 40, `${pad.name}: the grade's source says too little`);
  }
  // the two pads drawn so far stand where they stood before the grade was theirs (the place's -0.12 m), to the bit
  assert.equal(LC5.grade.value, -0.12);
  assert.equal(SITE1.grade.value, -0.12);
  // Complex 14's deck is the ramp's top, 22 ft over the ground (HAER FL-8-7, p. 20)
  assert.equal(LC14.grade.value, -22 * FT);
  assert.equal(LC14.grade.confidence, 'derived');
  // Complex 19's three storeys: the storey's height is not read
  assert.equal(LC19.grade.confidence, 'estimated');
});
