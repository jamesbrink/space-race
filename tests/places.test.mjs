// The places' pads and what is laid round them (missions/<nation>/places/<place>/): pure, no page.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LC5 } from '../missions/usa/places/cape-canaveral/lc-5.ts';
import { LC14 } from '../missions/usa/places/cape-canaveral/lc-14.ts';
import { LC19 } from '../missions/usa/places/cape-canaveral/lc-19.ts';
import { standsInSite1, TYURATAM_GROUND } from '../missions/ussr/places/tyuratam/ground.ts';
import { SITE1 } from '../missions/ussr/places/tyuratam/site-1.ts';
import { compassAt } from '../src/viewer/scenery/compass.ts';

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

// A made-up pad on the steppe 3 km north-east of Site 1 (not a real site): the place's ground laid round it must put
// everything drawn at Site 1's figures where it is round Site 1.
const ELSEWHERE = {
  ...SITE1,
  name: 'a made-up pad 3 km north-east of Site 1',
  latitude: { value: 45.94, confidence: 'estimated', source: 'a test fixture' },
  longitude: { value: 63.37, confidence: 'estimated', source: 'a test fixture' },
  bearingX: { value: 120, confidence: 'estimated', source: 'a test fixture: turned, to show the frame’s turn does not matter' },
  grade: { value: -3, confidence: 'estimated', source: 'a test fixture: a deck 3 m over the land' },
};
const APRIL = { date: '1961-04-12' };

test('Tyuratam: the ground laid round another pad puts Site 1’s land where it is round Site 1', () => {
  const round1 = compassAt(SITE1);
  const round = compassAt(ELSEWHERE);
  const at = round.frame(SITE1);
  // Site 1 lies some 2.2 km west and 2.2 km south of the made-up pad, and the made-up pad where Site 1's compass puts it
  assert.ok(Math.abs(at.x + 2150) < 40 && Math.abs(at.z - 2196) < 40, `Site 1 at ${at.x.toFixed(0)}, ${at.z.toFixed(0)}`);
  const back = round1.frame(ELSEWHERE);
  assert.ok(Math.hypot(back.x + at.x, back.z + at.z) < 2, 'the two pads do not agree where each other is');
  const own = TYURATAM_GROUND.land(APRIL, round1);
  const there = TYURATAM_GROUND.land(APRIL, round);
  // round Site 1 nothing is moved: none of its GLSL is renamed
  for (const key of ['cover', 'paint', 'ground', 'cel', 'reliefGlsl'])
    assert.ok(!own[key].includes('InSite1') && !own[key].includes('vec2 q = p -'), key);
  for (const key of ['cover', 'paint', 'ground', 'cel'])
    assert.ok(there[key].includes('InSite1(p - vec2(') && there[key].includes(at.x.toFixed(3)), `${key} is not put in Site 1's frame`);
  // the land is at the made-up pad's grade under its zero, and Site 1's lie is where Site 1 is, less the ground under the made-up pad
  assert.ok(Math.abs(there.relief(0, 0)) < 1e-9);
  const base = there.relief(at.x, at.z) - own.relief(0, 0);
  let worst = 0;
  for (let x = -600; x <= 600; x += 37)
    for (let z = -600; z <= 600; z += 41) worst = Math.max(worst, Math.abs(there.relief(at.x + x, at.z + z) - base - own.relief(x, z)));
  assert.ok(worst < 1e-6, `Site 1's lie is ${worst} m out round the made-up pad`);
  // the command bunker stands 8 m down from the deck, north of the tracks, here as at Site 1 (tests/tyuratam.test.mjs)
  assert.ok(Math.abs(there.relief(at.x + 3.6, at.z - 206.6) - there.relief(at.x, at.z) + 8) < 0.01);
  // the pit is open ground far down where it is round Site 1, and nowhere near the made-up pad
  assert.equal(TYURATAM_GROUND.under(at.x + 100, at.z, round), TYURATAM_GROUND.under(100, 0, round1));
  assert.ok(TYURATAM_GROUND.under(100, 0, round1) < -40);
  assert.equal(TYURATAM_GROUND.under(0, 0, round), null);
});

test('Tyuratam: what stands round Site 1 stands on the same land round another pad', () => {
  const round1 = compassAt(SITE1);
  const round = compassAt(ELSEWHERE);
  const land1 = { heightAt: TYURATAM_GROUND.land(APRIL, round1).relief };
  const land = { heightAt: TYURATAM_GROUND.land(APRIL, round).relief };
  const own = standsInSite1(round1, land1);
  const there = standsInSite1(round, land);
  assert.deepEqual([own.x, own.z], [0, 0]);
  const at = round.frame(SITE1);
  assert.deepEqual([there.x, there.z], [at.x, at.z]);
  // Site 2's assembly building, 2.04 km off on 252 degrees in Site 1's frame: its foot over the land's top under it is the
  // same round either pad (each model is built at Site 1's grade, so round the made-up pad it is lifted by the difference)
  const [x, z, half] = [-1940, 630, 60];
  const top = (l, ox, oz) =>
    Math.max(...[-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => l.heightAt(x + 0.7 * half * i + ox, z + 0.7 * half * j + oz))));
  const footOver1 = own.lift(x, z, half) - (SITE1.grade.value + top(land1, 0, 0));
  const footOver = there.lift(x, z, half) - (ELSEWHERE.grade.value + top(land, at.x, at.z));
  assert.ok(Math.abs(footOver - footOver1) < 1e-6, `the building stands ${footOver - footOver1} m otherwise on the land`);
  // and the scenery puts the model's frame there (no page: the model is not fetched, its group is placed)
  const built = TYURATAM_GROUND.scenery({
    compass: round,
    day: APRIL,
    land,
    groundAt: (x, z) => ELSEWHERE.grade.value + land.heightAt(x, z),
  });
  assert.equal(built.objects.length, 1);
  assert.deepEqual(built.objects[0].position.toArray(), [at.x, 0, at.z]);
});
