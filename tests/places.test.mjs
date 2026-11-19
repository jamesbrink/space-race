// The places' pads and what is laid round them (missions/<nation>/places/<place>/): pure, no page.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { LC5 } from '../missions/usa/places/cape-canaveral/lc-5.ts';
import { LC14 } from '../missions/usa/places/cape-canaveral/lc-14.ts';
import { LC19 } from '../missions/usa/places/cape-canaveral/lc-19.ts';
import { COMPLEXES, neighboursOn, ownFrame } from '../missions/usa/places/cape-canaveral/scenery.ts';
import { standsInSite1, TYURATAM_GROUND } from '../missions/ussr/places/tyuratam/ground.ts';
import { SITE1 } from '../missions/ussr/places/tyuratam/site-1.ts';
import { SITE31 } from '../missions/ussr/places/tyuratam/site-31.ts';
import { SEASONS, seasonOf, steppeCelGround, steppeFlora, steppeGround } from '../missions/ussr/places/tyuratam/steppe.ts';
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
  // Complex 14's deck is the ramp's top, 22 ft over the paving at its foot (HAER FL-8-7, p. 20), and the land 12 cm under that
  assert.equal(LC14.grade.value, -(22 * FT + 0.12));
  assert.equal(LC14.grade.confidence, 'derived');
  // Complex 19's stand is "28 feet tall" (Martin's press handbook, p. 7-8)
  assert.equal(LC19.grade.value, -28 * FT);
  assert.equal(LC19.grade.confidence, 'documented');
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

test('the bearings: Complex 14’s frame on its documented pitch line; Complex 19’s frame along its stand', () => {
  // the pitch line on 105 degrees (Results of the First United States Manned Orbital Space Flight, p. 46): the frame's +X, and the vehicle
  // stands turned in it, its hatch on 240 (lc-14.parts.ts HATCH_TURN: estimated, from the photographs)
  assert.equal(LC14.bearingX.value, 105);
  assert.equal(LC14.bearingX.confidence, 'documented');
  // the stand's centre line "five degrees west of north" (Martin's press handbook, p. 7-2): +X along it to the south, the way the
  // erector was laid down and the hatches faced. The launch vehicle's pitch plane, 72 + 12.9 by Gemini IV's roll, is square to it
  assert.equal(LC19.bearingX.value, 175);
  assert.ok(Math.abs(((72 + 12.9 - LC19.bearingX.value + 360) % 180) - 90) < 1);
  assert.equal(LC19.bearingX.confidence, 'derived');
});

// What stood round the Cape's pads on 5 May 1961, as drawn before the neighbours were dated past it: Freedom 7's and
// Liberty Bell 7's must stand among exactly these, in this order (their ground is laid from the list).
const MAY_1961 = [
  'LC-26B',
  'LC-26A',
  'LC-26 blockhouse',
  'LC-30A',
  'LC-30B',
  'LC-30 blockhouse',
  'LC-25A',
  'LC-25B',
  'LC-25 blockhouse',
  'LC-17B',
  'LC-29A',
  'LC-29 blockhouse',
  'LC-17A',
  'LC-17 blockhouse',
  'LC-18B',
  'LC-18A',
  'LC-9',
  'LC-31A',
  'LC-32A',
  'LC-21',
  'LC-11',
  'LC-12',
  'LC-13',
  'LC-14',
  'LC-15',
  'LC-16',
  'LC-19',
  'LC-20',
  'LC-34',
];

test('the Cape: each built flight stands among what the data says stood on its day, and never beside itself', () => {
  for (const c of COMPLEXES) {
    assert.ok(['documented', 'derived', 'estimated'].includes(c.stood.confidence), c.name);
    assert.ok(c.stood.source.length > 20, `${c.name}: its dates have no source`);
    assert.ok(!c.stood.until || !c.stood.from || c.stood.from < c.stood.until, `${c.name}: gone before it came`);
  }
  const cape = flights.filter((f) => f.site?.place.name === 'cape-canaveral');
  assert.ok(cape.length >= 11, 'the Cape’s flights are not all here');
  for (const f of cape) {
    const date = f.launch.slice(0, 10);
    const names = neighboursOn(compassAt(f.site), date);
    // what the data says: every entry whose dates hold that day, but the pad itself
    const said = COMPLEXES.filter(
      (c) => c.pad !== f.site && (!c.stood.from || c.stood.from <= date) && (!c.stood.until || date < c.stood.until),
    ).map((c) => c.name);
    assert.deepEqual(names, said, f.id);
    // the origin pad is never its own neighbour, under any of its names
    for (const c of COMPLEXES.filter((c) => c.pad === f.site)) assert.ok(!names.includes(c.name), `${f.id} stands beside ${c.name}`);
    // and no two states of one complex stand on one day
    const at = names.map((n) => COMPLEXES.find((c) => c.name === n)).map((c) => `${c.lat},${c.lon}`);
    assert.equal(new Set(at).size, at.length, `${f.id}: two states of a complex at once`);
  }
  const on = (id) => {
    const f = flights.find((x) => x.id === id);
    return neighboursOn(compassAt(f.site), f.launch.slice(0, 10));
  };
  // Freedom 7 and Liberty Bell 7: the May 1961 set, as before
  assert.deepEqual(on('usa/mercury/mr-3-freedom-7'), MAY_1961);
  assert.deepEqual(on('usa/mercury/mr-4-liberty-bell-7'), MAY_1961);
  // Friendship 7 from Complex 14: Complex 5 is a neighbour now, Complex 19 still Titan I's, Complex 13's old tower and Complex 34's stub still up
  const ma6 = on('usa/mercury/ma-6-friendship-7');
  for (const n of ['LC-5', 'LC-19', 'LC-13', 'LC-34', 'LC-12, a tower again', 'LC-20']) assert.ok(ma6.includes(n), `MA-6 without ${n}`);
  for (const n of ['LC-14', 'LC-12', 'LC-13, its new tower building']) assert.ok(!ma6.includes(n), `MA-6 with ${n}`);
  // Faith 7: Complex 19 a building site, Complex 34 past its stub, Complex 13 without its old tower
  const ma9 = on('usa/mercury/ma-9-faith-7');
  for (const n of ['LC-19', 'LC-34', 'LC-13']) assert.ok(!ma9.includes(n), `MA-9 with ${n}`);
  for (const n of ['LC-5', 'LC-34, its new umbilical tower', 'LC-13, its new tower building'])
    assert.ok(ma9.includes(n), `MA-9 without ${n}`);
  // Gemini 3 from Complex 19: Complex 14 rebuilt for Atlas-Agena, Complex 20 rebuilt (no stand-in), and not itself
  const gt3 = on('usa/gemini/gt-3');
  for (const n of ['LC-5', 'LC-14 for Atlas-Agena', 'LC-11']) assert.ok(gt3.includes(n), `GT-3 without ${n}`);
  for (const n of ['LC-19', 'LC-14', 'LC-20']) assert.ok(!gt3.includes(n), `GT-3 with ${n}`);
});

test('the Cape: Complex 5 seen from Complex 14 stands in its own frame, at its own grade over the land there', () => {
  const round = compassAt(LC14);
  const flat = () => LC14.grade.value; // the land kept level at the clearing
  const frame = ownFrame(LC5, flat, round);
  const at = round.frame(LC5);
  const origin = { x: 0, y: 0, z: 0 };
  const o = [origin.x, origin.y, origin.z];
  const e = frame.elements;
  const apply = ([x, y, z]) => [
    e[0] * x + e[4] * y + e[8] * z + e[12],
    e[1] * x + e[5] * y + e[9] * z + e[13],
    e[2] * x + e[6] * y + e[10] * z + e[14],
  ];
  const zero = apply(o);
  assert.ok(Math.abs(zero[0] - at.x) < 1e-9 && Math.abs(zero[2] - at.z) < 1e-9);
  // its zero is the pad's surface, 12 cm over the land, which is Complex 14's deck less 22 ft
  assert.ok(Math.abs(zero[1] - (LC14.grade.value - LC5.grade.value)) < 1e-9);
  // and its +X (square to the rails, toward the blockhouse) bears 295 degrees on the compass: east and south of it
  const x = apply([1, 0, 0]);
  const bearing = (Math.atan2(x[0] - zero[0], -(x[2] - zero[2])) * 180) / Math.PI;
  assert.ok(Math.abs(((bearing + 360) % 360) - LC5.bearingX.value) < 0.05, `its +X bears ${bearing}`);
  // 6.2 km off on 205 degrees: Complex 5 lies south-south-west of Complex 14
  assert.ok(Math.abs(Math.hypot(at.x, at.z) - 6230) < 100, `${Math.hypot(at.x, at.z)}`);
});

test('the steppe: every flight from Tyuratam stands in its own season, with snow on the dates it was observed', () => {
  const want = {
    'ussr/vostok/vostok-1': 'spring',
    'ussr/vostok/vostok-2': 'summer',
    'ussr/vostok/vostok-3': 'summer',
    'ussr/vostok/vostok-4': 'summer',
    'ussr/vostok/vostok-5': 'summer',
    'ussr/vostok/vostok-6': 'summer',
    'ussr/voskhod/voskhod-1': 'autumn',
    'ussr/voskhod/voskhod-2': 'thaw',
    'ussr/soyuz/soyuz-4': 'winter',
    'ussr/soyuz/soyuz-16': 'winter',
  };
  for (const [id, name] of Object.entries(want)) {
    const f = flights.find((f) => f.id === id);
    assert.equal(f?.site?.place.name, 'tyuratam', id);
    assert.equal(seasonOf(f.launch.slice(0, 10)).name, name, id);
  }
  for (const s of SEASONS) {
    assert.ok(['documented', 'derived', 'estimated'].includes(s.confidence) && s.source.length > 60, s.name);
    // a season without snow or mud writes none into the ground's shaders: the spring's and the summer's are what they were
    const glsl = steppeGround(s) + steppeCelGround(s);
    assert.equal(glsl.includes('snowField'), Boolean(s.snow), s.name);
    assert.equal(glsl.includes('soaked'), Boolean(s.wet), s.name);
  }
  assert.ok(seasonOf('1969-01-14').snow.cover > 0.8, 'thick snow over the Soyuz 4 launch area');
  assert.equal(seasonOf('1974-12-02').snow, undefined, 'the Soyuz 16 date has its own ground evidence');
  const thaw = SEASONS.find((s) => s.name === 'thaw');
  assert.ok(thaw.snow.cover > 0 && thaw.snow.cover < 0.5, 'old snow in patches over well under half the ground');
  // nothing of the spring is up in March; in October nothing of it is left
  const up = (date) => steppeFlora({ date, wind: { from: { value: 0 }, speed: { value: 0 } } }).species.map((s) => s.name);
  for (const date of ['1965-03-18', '1964-10-12'])
    for (const gone of ['tulip', 'rhubarb']) assert.ok(!up(date).includes(gone), `${gone} on ${date}`);
  assert.ok(!up('1965-03-18').includes('meadow-grass'));
  assert.ok(up('1961-04-12').includes('tulip'));
});

test('Site 31 cuts the excavation into the steppe and keeps the surrounding land', () => {
  const local = TYURATAM_GROUND.land(APRIL, compassAt(SITE31));
  const regional = TYURATAM_GROUND.land(APRIL, compassAt({ ...SITE31 }));
  const a = (SITE31.bearingX.value * Math.PI) / 180;
  const along = (d) => [d * Math.sin(a), -d * Math.cos(a)];
  assert.ok(local.relief(...along(48)) < -25);
  assert.equal(local.relief(...along(-50)), 0);
  for (const distance of [200, 500, 1300]) {
    const at = along(distance);
    assert.equal(local.relief(...at), regional.relief(...at));
  }
});
