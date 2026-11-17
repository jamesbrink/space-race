// The sea drawn where a flight comes down (src/viewer/swell.ts) is the simulator's sea (src/sim/sea.ts) where a body
// rides it, and dies away to the globe's level sea by the square's edge; what came to it (src/viewer/recovery.ts) is
// flown along its track and is nowhere outside it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { HUNT_CLUB_1 } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/recovery.ts';
import { WEATHER } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/weather.ts';
import { surfaceAt, wavesOf } from '../src/sim/sea.ts';
import { trackAt } from '../src/viewer/recovery.ts';
import { fillSwell, SWELL_HALF, swellGeometry, swellHeight } from '../src/viewer/swell.ts';
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

test('the helicopter is flown only along its track', () => {
  const track = HUNT_CLUB_1.track;
  assert.equal(trackAt(track, track[0].at - 1), null);
  assert.equal(trackAt(track, track.at(-1).at + 1), null);
  for (const p of track) {
    const at = trackAt(track, p.at);
    assert.ok(Math.abs(at.east - p.east) < 1e-6 && Math.abs(at.north - p.north) < 1e-6 && Math.abs(at.height - p.height) < 1e-6);
  }
  for (let i = 1; i < track.length; i++) assert.ok(track[i].at > track[i - 1].at, 'its instants in order');
});
