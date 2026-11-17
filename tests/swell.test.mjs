// The sea drawn where a flight comes down (src/viewer/swell.ts) is the simulator's sea (src/sim/sea.ts) where a body
// rides it, and dies away to the globe's level sea by the square's edge; what came to it (src/viewer/recovery.ts) is
// flown along its track and is nowhere outside it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { GRISSOM, HUNT_CLUB_1, HUNT_CLUB_3 } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/recovery.ts';
import { AFLOAT } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/afloat.ts';
import { WEATHER } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/weather.ts';
import { surfaceAt, wavesOf } from '../src/sim/sea.ts';
import { trackAt } from '../src/viewer/recovery.ts';
import { seaSlopes } from '../src/viewer/globe.ts';
import { chopOf, chopSlope, fillSwell, SWELL_HALF, swellGeometry, swellGlsl, swellHeight } from '../src/viewer/swell.ts';
import { geodeticToEcef } from '../src/world/frames.ts';

const waves = wavesOf(WEATHER.sea?.trains);
const centre = geodeticToEcef({ latitude: 27.53, longitude: -75.73, height: 0 });
// (the scene's frame taken as ECEF itself, about the centre)
const frame = fillSwell(
  swellGeometry(),
  centre,
  0,
  (q) => q,
  (d) => d,
);

test('where a body rides it, the drawn sea is the simulator’s', () => {
  for (const t of [0, 3.3, 61, 600]) {
    assert.ok(Math.abs(swellHeight(frame, waves, t, centre) - surfaceAt(waves, t).height) < 1e-6);
    const off = [centre[0] + 5 * frame.east[0], centre[1] + 5 * frame.east[1], centre[2] + 5 * frame.east[2]];
    assert.ok(Math.abs(swellHeight(frame, waves, t, off) - surfaceAt(waves, t, 5, 0).height) < 1e-3);
  }
});

test('by the square’s edge the drawn sea is level, as the globe’s is', () => {
  const edge = [0, 1, 2].map((i) => centre[i] + 0.97 * SWELL_HALF * frame.north[i]);
  for (const t of [0, 17, 200]) assert.equal(swellHeight(frame, waves, t, edge), 0);
});

test('the swell’s mesh lies on the sea, facing up', () => {
  const g = swellGeometry();
  fillSwell(
    g,
    centre,
    0,
    (q) => [q[0] - centre[0], q[1] - centre[1], q[2] - centre[2]],
    (d) => d,
  );
  const p = g.getAttribute('position');
  const index = g.getIndex();
  const [a, b, c] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, index.getX(k)));
  const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  assert.ok(n.dot(new THREE.Vector3(...frame.up)) > 0.99, 'its triangles wind counter-clockwise seen from above');
});

// The light's slope over the sea is a sum of sines (the trains and the chop), so how alike it is at two points `r` apart is
// the sum of their cosines, each weighted by its mean square slope. A lattice is a pattern that comes back: somewhere off
// the middle it is as alike as at the middle. Three short sines on the two trains came back to 0.96 within 4 m and to 0.99
// within 35 m, and the glitter on Liberty Bell 7's sea was a checkerboard.
test('the glitter on the sea is no lattice: its slopes nowhere repeat near the eye', () => {
  const slope = chopSlope(seaSlopes(WEATHER.wind.speed.value), waves);
  const all = [...waves, ...chopOf(waves).map((w) => ({ ...w, a: w.a * slope }))];
  const weight = all.map((w) => (w.a * Math.hypot(...w.k)) ** 2 / 2);
  const total = weight.reduce((s, x) => s + x, 0);
  let most = 0;
  for (let x = -40; x <= 40; x += 0.25)
    for (let y = -40; y <= 40; y += 0.25) {
      if (Math.hypot(x, y) < 1) continue; // (the middle's own lobe)
      let alike = 0;
      all.forEach((w, i) => {
        alike += weight[i] * Math.cos(w.k[0] * x + w.k[1] * y);
      });
      most = Math.max(most, alike / total);
    }
  assert.ok(most < 0.7, `the slopes 1 to 40 m apart are at most ${most.toFixed(2)} alike`);
});

test('the chop carries what the day’s wind gives the slopes that the trains do not', () => {
  const slopes = seaSlopes(WEATHER.wind.speed.value);
  const trains = waves.reduce((s, w) => s + (w.a * Math.hypot(...w.k)) ** 2 / 2, 0);
  const chop = chopOf(waves).reduce((s, w) => s + (w.a * Math.hypot(...w.k)) ** 2 / 2, 0);
  assert.ok(Math.abs(chop - 1) < 1e-9, 'the chop as written has a root-mean-square slope of 1');
  assert.ok(Math.abs(trains + chopSlope(slopes, waves) ** 2 - slopes) < 1e-9, 'with the trains, Cox and Munk’s for the wind');
  assert.equal(chopSlope(0.001, waves), 0, 'none where the trains carry it all');
  // (in the drawn look the few short waves its bands are made of, unchanged; the chop in the real look)
  const glsl = swellGlsl(waves, [4, 1.5], true);
  assert.match(glsl, /#ifdef TOON[\s\S]*#else[\s\S]*uSwellChop[\s\S]*#endif/);
  assert.doesNotMatch(swellGlsl(waves, [6, 3]), /TOON/, 'the mesh is raised by the trains alone');
});

test('the helicopters are flown only along their tracks', () => {
  for (const { track } of [HUNT_CLUB_1, HUNT_CLUB_3]) {
    assert.equal(trackAt(track, track[0].at - 1), null);
    assert.equal(trackAt(track, track.at(-1).at + 1), null);
    for (const p of track) {
      const at = trackAt(track, p.at);
      assert.ok(Math.abs(at.east - p.east) < 1e-6 && Math.abs(at.north - p.north) < 1e-6 && Math.abs(at.height - p.height) < 1e-6);
    }
    for (let i = 1; i < track.length; i++) assert.ok(track[i].at > track[i - 1].at, 'its instants in order');
  }
});

test('Grissom is in the sea from the hatch to Hunt Club 3’s hoist, three to four minutes, and its hoist is over him as it lifts him', () => {
  const { track } = GRISSOM;
  const hoist = HUNT_CLUB_3.hoist;
  assert.equal(GRISSOM.by, HUNT_CLUB_3.name);
  assert.equal(track[0].at, AFLOAT.record.out.value, 'in the water as he went out');
  const minutes = (hoist.lift.value - track[0].at) / 60;
  assert.ok(minutes >= 3 && minutes <= 4, `in the water ${minutes.toFixed(1)} minutes ("about 3 to 4 minutes", Results, p. 7)`);
  assert.ok(
    hoist.on.value < hoist.grab.value && hoist.grab.value < hoist.lift.value && hoist.lift.value < hoist.aboard.value,
    'let down, taken, lifted, aboard',
  );
  assert.ok(hoist.aboard.value <= AFLOAT.record.cast.value + 30, 'aboard about when the capsule was let go');
  for (let i = 1; i < track.length; i++) assert.ok(track[i].at > track[i - 1].at, 'his instants in order');
  assert.ok(
    track.every((p) => p.shoulders >= -0.1 && p.shoulders <= 0.3),
    'his shoulders at the surface, give or take',
  );
  // (the sheave 0.61 m forward and 1.89 m to starboard of the craft's origin, the boom swung out: hus-1.md)
  const at = trackAt(HUNT_CLUB_3.track, hoist.lift.value);
  const h = (at.heading * Math.PI) / 180;
  const sheave = [at.east + 0.61 * Math.sin(h) + 1.89 * Math.cos(h), at.north + 0.61 * Math.cos(h) - 1.89 * Math.sin(h)];
  const him = track.at(-1);
  assert.ok(
    Math.hypot(sheave[0] - him.east, sheave[1] - him.north) < 0.05,
    `the sheave ${Math.hypot(sheave[0] - him.east, sheave[1] - him.north).toFixed(2)} m from over him`,
  );
});
