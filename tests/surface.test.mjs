// src/world/surface.ts: the sea's shape against WGS 84's published constants (NIMA TR8350.2, 3rd
// edition, Tables 3.1 and 3.3) and against frames.ts's own geodetic conversions.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WGS84_A, WGS84_B } from '../src/world/bodies.ts';
import { ecefToGeodetic, enuAxes, geodeticToEcef, length, sub } from '../src/world/frames.ts';
import { curvatureRadii, drop, ellipsoidNormal, gaussianRadius, horizonAngle, horizonDistance, seaPoint } from '../src/world/surface.ts';

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('radii of curvature are WGS 84 published values', () => {
  // TR8350.2 Table 3.3: polar radius of curvature c = 6,399,593.6258 m; the semi-minor axis b = 6,356,752.3142 m
  near(curvatureRadii(90).meridian, 6_399_593.6258, 1e-3, 'meridian at the pole');
  near(curvatureRadii(90).primeVertical, 6_399_593.6258, 1e-3, 'prime vertical at the pole');
  near(curvatureRadii(0).primeVertical, WGS84_A, 1e-6, 'prime vertical at the equator is a');
  near(curvatureRadii(0).meridian, 6_335_439.327, 1e-3, 'meridian at the equator, a (1 - e^2)');
  // the Gaussian radius at the equator is sqrt(a^2 (1 - e^2)) = b
  near(gaussianRadius(0), 6_356_752.3142, 1e-3, 'Gaussian radius at the equator');
  near(gaussianRadius(90), 6_399_593.6258, 1e-3, 'Gaussian radius at the pole');
  near(WGS84_B, 6_356_752.3142, 1e-3, 'b');
});

test('the sea lies at its stated height above the ellipsoid, under the place it is asked for', () => {
  for (const [latitude, longitude] of [
    [28.439426, -80.573292],
    [0, 0],
    [-89.9, 135],
    [51.5, -0.1],
    [-33.9, 151.2],
  ]) {
    const want = geodeticToEcef({ latitude, longitude, height: -29 });
    const got = seaPoint(geodeticToEcef({ latitude, longitude, height: 0 }), -29);
    assert.ok(length(sub(want, got)) < 1e-6, `${latitude}, ${longitude}: ${length(sub(want, got))} m`);
    const g = ecefToGeodetic(seaPoint(geodeticToEcef({ latitude, longitude, height: 5000 }), -29));
    near(g.height, -29, 1e-6, 'height');
    // the normal is the plumb line frames.ts calls up
    const up = enuAxes({ latitude, longitude }).up;
    const n = ellipsoidNormal(geodeticToEcef({ latitude, longitude, height: 0 }));
    assert.ok(length(sub(up, n)) < 1e-9, 'normal');
  }
});

test('horizon and drop', () => {
  // from the eye of a person 1.7 m tall on a sphere of the Earth's mean radius the horizon is 4.65 km off
  near(horizonDistance(1.7, 6_371_000), 4654, 1, 'horizon from 1.7 m');
  // 187.4 km up (Freedom 7's apogee) the horizon dips 13.7 degrees
  near((horizonAngle(187_400, gaussianRadius(28.44)) * 180) / Math.PI, 13.7, 0.05, 'dip at apogee');
  // 487 km downrange of the Cape the sea is 18.6 km below the pad's level (the flight's README)
  near(drop(487_000, gaussianRadius(28.44)) / 1000, 18.6, 0.05, 'drop at the landing');
});
