// viewer/globemesh.ts: the globe's vertices are where world/surface.ts says the sea is, and the
// eye may go as far as `remakeAfter` says before the mesh is made again without the part of it
// that is drawn (outside the site's own ground) leaving the sea by anything that could be seen.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fillGlobe, meshReach, RINGS, remakeAfter, SPOKES } from '../src/viewer/globemesh.ts';
import { add, cross, dot, ecefToGeodetic, enuAxes, geodeticToEcef, length, scale, sub, unit } from '../src/world/frames.ts';
import { ellipsoidNormal, gaussianRadius, horizonAngle, horizonDistance, seaPoint } from '../src/world/surface.ts';

// a site like the Cape's: its origin 3 m above a sea 29 m below the ellipsoid, +X east, +Y up
const SITE = { latitude: 28.4697, longitude: -80.5712, height: -26 };
const SEA = -29;
const ORIGIN = geodeticToEcef(SITE);
const { east, up } = enuAxes(SITE);
const AXES = [east, up, cross(east, up)];
const RADIUS = gaussianRadius(SITE.latitude);
const toEcef = (p) => add(ORIGIN, add(add(scale(AXES[0], p[0]), scale(AXES[1], p[1])), scale(AXES[2], p[2])));
const toSite = (q) => AXES.map((a) => dot(a, sub(q, ORIGIN)));
const VERTICES = (RINGS + 1) * (SPOKES + 1);
const arrays = () => [new Float32Array(VERTICES * 3), new Float32Array(VERTICES * 3), new Float32Array(VERTICES * 3)];

/** The mesh as globe.ts made it before the filling was written out: from the library's own functions, a vertex at a time. */
function byTheBook(under, height) {
  const [pos, nor, dir] = arrays();
  const u0 = unit(under);
  const reach = Math.min(1.5, horizonAngle(1.35 * height, RADIUS) * 1.05 + 1e-4);
  const span = reach * RADIUS;
  const k = Math.asinh(span / height) / RINGS;
  const e = length(cross([0, 0, 1], u0)) > 1e-6 ? unit(cross([0, 0, 1], u0)) : [1, 0, 0];
  const n = cross(u0, e);
  const anchor = toSite(under);
  let v = 0;
  for (let i = 0; i <= RINGS; i++) {
    const theta = (height * Math.sinh(k * i)) / RADIUS;
    const [ct, st] = [Math.cos(theta), Math.sin(theta)];
    for (let j = 0; j <= SPOKES; j++, v += 3) {
      const a = Math.cos((2 * Math.PI * j) / SPOKES) * st,
        b = Math.sin((2 * Math.PI * j) / SPOKES) * st;
      const u = [u0[0] * ct + e[0] * a + n[0] * b, u0[1] * ct + e[1] * a + n[1] * b, u0[2] * ct + e[2] * a + n[2] * b];
      const p = seaPoint(u, SEA);
      const s = toSite(p);
      const normal = ellipsoidNormal(p);
      for (let c = 0; c < 3; c++) {
        pos[v + c] = s[c] - anchor[c];
        nor[v + c] = dot(AXES[c], normal);
        dir[v + c] = u[c];
      }
    }
  }
  return { pos, nor, dir, anchor };
}

test('the mesh is filled with the same numbers, to the bit, as the library makes a vertex at a time', () => {
  for (const [eye, height] of [
    [[40, 24, -130], 30],
    [[-900, 400, 2500], 400],
    [[80_000, 150_000, 20_000], 180_000],
  ]) {
    const under = seaPoint(toEcef(eye), SEA);
    const want = byTheBook(under, height);
    const [pos, nor, dir] = arrays();
    const anchor = fillGlobe(under, height, RADIUS, SEA, ORIGIN, AXES, pos, nor, dir);
    assert.deepEqual(anchor, want.anchor);
    for (let v = 0; v < VERTICES * 3; v++) {
      if (!Object.is(pos[v], want.pos[v])) assert.fail(`position ${v}: ${pos[v]} for ${want.pos[v]} at ${height} m`);
      if (!Object.is(nor[v], want.nor[v])) assert.fail(`normal ${v}: ${nor[v]} for ${want.nor[v]} at ${height} m`);
      if (!Object.is(dir[v], want.dir[v])) assert.fail(`direction ${v}: ${dir[v]} for ${want.dir[v]} at ${height} m`);
    }
  }
});

test('in the open the mesh is made again after a tenth of the height; over the hole, after a tenth of the way to its edge', () => {
  assert.equal(remakeAfter(30, 0, RADIUS), 3);
  assert.equal(remakeAfter(30, 20, RADIUS), 3);
  assert.equal(remakeAfter(30, 4000, RADIUS), 400);
  assert.equal(remakeAfter(5000, 4000, RADIUS), 500);
  for (const height of [30, 200, 3000, 40_000])
    for (const inside of [0, 100, 2000, 20_000, 1e6]) {
      const far = remakeAfter(height, inside, RADIUS);
      assert.ok(far >= 0.1 * height && far <= 0.1 * Math.max(height, inside));
      // the mesh still reaches the horizon of an eye that has gone that far and climbed all it may before a making
      if (inside > height)
        assert.ok(far + horizonAngle(1.25 * height, RADIUS) * RADIUS < meshReach(height, RADIUS) * RADIUS, `${height} ${inside}`);
    }
});

test('an eye that has gone that far over the hole sees the mesh no further off the sea than from where it was made: a thirtieth of a pixel at most', () => {
  // the hole: a square of this half-width round the site, on its axes (the globe is drawn only outside it)
  const HALF = 6000;
  const PIXEL = 2.8e-4; // radians: 35 degrees over 2160 pixels
  for (const [made, height] of [
    [[40, 24, -130], 30],
    [[2500, 28, -1000], 30],
    [[-300, 900, 700], 950],
  ]) {
    const under = seaPoint(toEcef(made), SEA);
    const [pos, nor, dir] = arrays();
    const anchor = fillGlobe(under, height, RADIUS, SEA, ORIGIN, AXES, pos, nor, dir);
    const inside = HALF - Math.max(Math.abs(made[0]), Math.abs(made[2]));
    assert.ok(inside > height);
    // as far from where the mesh was made as it may go, toward the nearest edge and along it, and a quarter higher
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [-0.7, 0.7],
    ]) {
      const eye = [made[0], made[1] * 1.2, made[2]];
      // (step out until the next step would call for a making, as the viewer does frame by frame)
      for (let n = 0; n < 10_000; n++) {
        const next = [eye[0] + dx, eye[1], eye[2] + dz];
        const room = HALF - Math.max(Math.abs(next[0]), Math.abs(next[2]));
        if (!(length(sub(seaPoint(toEcef(next), SEA), under)) < remakeAfter(height, Math.max(0, room), RADIUS))) break;
        eye[0] = next[0];
        eye[2] = next[2];
      }
      assert.ok(Math.hypot(eye[0] - made[0], eye[2] - made[2]) > 0.05 * inside, 'the eye went nowhere');
      const at = (i, j) => {
        const v = 3 * (i * (SPOKES + 1) + j);
        return [pos[v] + anchor[0], pos[v + 1] + anchor[1], pos[v + 2] + anchor[2]];
      };
      let worst = 0,
        still = 0,
        drawn = 0;
      for (let i = 0; i < RINGS; i++)
        for (let j = 0; j < SPOKES; j++) {
          // the middle of the cell's diagonal: where its two triangles are furthest under the sea
          const a = at(i, j),
            b = at(i + 1, j + 1);
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
          if (Math.max(Math.abs(mid[0]), Math.abs(mid[2])) < HALF) continue; // under the site's ground: not drawn
          const sag = Math.abs(ecefToGeodetic(toEcef(mid)).height - SEA);
          const away = Math.hypot(mid[0] - eye[0], mid[1] - eye[1], mid[2] - eye[2]);
          worst = Math.max(worst, sag / away);
          still = Math.max(still, sag / Math.hypot(mid[0] - made[0], mid[1] - eye[1], mid[2] - made[2])); // (as seen from over where it was made)
          drawn++;
        }
      assert.ok(drawn > 1000);
      // (0.006 of a pixel with the eye 30 m up, 0.023 at 950 m: the mesh's standing error, moved or not)
      assert.ok(worst < 0.03 * PIXEL, `${(worst / PIXEL).toFixed(4)} of a pixel, made at ${made}`);
      assert.ok(worst < 1.05 * still, `${(worst / PIXEL).toFixed(4)} of a pixel against ${(still / PIXEL).toFixed(4)} where it was made`);
    }
  }
  // (and the eye's horizon, with the mesh made for 30 m: 19.6 km, inside the mesh's 23.9 km by more than the eye can have gone)
  assert.ok(horizonDistance(37.5, RADIUS) + remakeAfter(30, HALF, RADIUS) < meshReach(30, RADIUS) * RADIUS);
});
