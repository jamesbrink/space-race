// The front page's view (src/front/view.ts): the instant it shows and what the sky is then, against the
// ephemeris and JPL Horizons; the camera's path as numbers; and that what is baked for it (public/front) was
// baked for these figures.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import {
  cameraAt,
  cameraFor,
  ease,
  FIELD,
  INSTANT,
  instantAt,
  LENS,
  limbPoint,
  moonUnder,
  PACE,
  PATH,
  pathAt,
  skyAt,
} from '../src/front/view.ts';
import { EARTH } from '../src/world/bodies.ts';
import { skyFrom } from '../src/world/ephemeris.ts';
import { angleBetween, cross, DEG, dot, length, rotate, sub, unit } from '../src/world/frames.ts';
import { MOON_RADIUS, selenographic } from '../src/world/moon.ts';
import { julianDate } from '../src/world/time.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const sky0 = skyAt(instantAt(0));

test('the instant is the one a person first left the Earth: Vostok 1’s liftoff, as its flight has it', () => {
  assert.equal(INSTANT, vostok1.launch);
  assert.equal(instantAt(0), julianDate(INSTANT));
  // the world's time runs on from it at the page's pace
  near((instantAt(60) - instantAt(0)) * 86400, 60 * PACE, 1e-4, 'a minute of ours');
});

test('the sky from the Moon at the instant: the Earth’s phase and the points under it, against JPL Horizons', () => {
  // Horizons (DE441), the Moon from the Earth's centre at 1961-04-12 06:07 UT: the point of the Moon under the Earth
  // 1.5129 E 0.9285 N, under the Sun 220.8286 E 1.1461 S; the Sun 39.2248 degrees from the Moon; range 0.00246105 au
  near(sky0.subEarth.longitude, 1.5129, 0.03, 'the Moon’s longitude under the Earth');
  near(sky0.subEarth.latitude, 0.9285, 0.03, 'the Moon’s latitude under the Earth');
  near(sky0.subSolar.longitude, 220.8286 - 360, 0.03, 'the Moon’s longitude under the Sun');
  near(sky0.subSolar.latitude, -1.1461, 0.03, 'the Moon’s latitude under the Sun');
  near(sky0.earthPhase / DEG, 39.2248, 0.02, 'the Earth’s phase angle');
  near(sky0.earthLit, 0.887, 0.002, 'nine tenths of the Earth is lit');
  near(length(sky0.earth), 0.00246105 * 149_597_870_700, 60_000, 'the Earth’s distance');
  near(sky0.earthBreadth / DEG, 1.985, 0.002, 'the Earth is two degrees across from there');
  // the Sun is behind the camera's shoulder: 141 degrees from the Earth
  near(angleBetween(sky0.earth, sky0.sun) / DEG, 180 - 39.2248, 0.2, 'the Sun from the Earth, seen from the Moon');
});

test('the face of the Earth turned to the Moon, and where its noon is: the same answers the ground gives', () => {
  // the Moon is overhead at the point under it, and the Sun at the point under the Sun (skyFrom, tested against Horizons)
  const underMoon = skyFrom({ ...sky0.earthUnderMoon, height: 0, bearingX: 0 }, sky0.jdUT);
  near(underMoon.moon.elevation / DEG, 90, 0.25, 'the Moon’s elevation where it is overhead'); // (geocentric against geodetic latitude)
  const underSun = skyFrom({ ...sky0.earthUnderSun, height: 0, bearingX: 0 }, sky0.jdUT);
  near(underSun.sun.elevation / DEG, 90, 0.25, 'the Sun’s elevation where it is overhead');
  // East Africa and the Indian Ocean face the Moon; noon is over the Bay of Bengal; Tyuratam is on the disc, in daylight
  near(sky0.earthUnderMoon.latitude, -7.3, 0.2, 'latitude under the Moon');
  near(sky0.earthUnderMoon.longitude, 52.5, 0.2, 'longitude under the Moon');
  near(sky0.earthUnderSun.latitude, 8.6, 0.2, 'latitude under the Sun');
  near(sky0.earthUnderSun.longitude, 88.5, 0.2, 'longitude under the Sun');
  const tyuratam = skyFrom({ latitude: 45.92, longitude: 63.342, height: 100, bearingX: 0 }, sky0.jdUT);
  assert.ok(tyuratam.moon.elevation > 30 * DEG && tyuratam.sun.elevation > 40 * DEG, 'Tyuratam sees the Moon and the Sun');
});

test('the Earth’s axes and the stars’ are rotations, and the Earth turns once a sidereal day', () => {
  for (const axes of [sky0.earthAxes, sky0.starAxes]) {
    for (const row of axes) near(length(row), 1, 1e-12, 'a unit row');
    near(dot(axes[0], axes[1]), 0, 1e-12, 'rows at right angles');
    assert.ok(dot(cross(axes[0], axes[1]), axes[2]) > 0.999999, 'right-handed');
  }
  // Greenwich's meridian, an hour of the world later, has gone 15.04 degrees round the Earth's own pole
  const later = skyAt(instantAt(3600 / PACE));
  const greenwich = (s) => rotate(s.earthAxes, [1, 0, 0]);
  near(angleBetween(greenwich(sky0), greenwich(later)) / DEG, 15.04, 0.6, 'an hour’s turn'); // (the Moon's own frame turns half a degree an hour under it)
  // the Earth's pole is where the stars' frame has it, give or take precession since 2000 (0.2 degrees)
  near(angleBetween(rotate(sky0.earthAxes, [0, 0, 1]), rotate(sky0.starAxes, [0, 0, 1])) / DEG, 0, 0.25, 'the two poles');
});

test('the lens: 500 mm on a 55 mm frame sees 6.3 degrees', () => {
  near(FIELD / DEG, 2 * Math.atan(LENS.frame.value / (2 * LENS.focal.value)) * (180 / Math.PI), 1e-12, 'derived from the two');
  near(FIELD / DEG, 6.296, 0.001, 'degrees across the frame');
  // so the Earth is a third of the frame's side across
  near(sky0.earthBreadth / FIELD, 0.315, 0.002, 'the Earth’s share of the frame');
  for (const f of Object.values(LENS)) assert.ok(f.source.length > 20 && ['documented', 'derived', 'estimated'].includes(f.confidence));
});

test('the path: one move outward, from 110 km to 100,000, smooth at both ends', () => {
  near(pathAt(0).height, PATH.from * 1000, 1e-6, 'where it starts');
  near(pathAt(PATH.seconds).height, PATH.to * 1000, 1e-3, 'where it settles');
  near(pathAt(1e6).height, PATH.to * 1000, 1e-3, 'and stays');
  // always outward, never a step: the height grows every second, and by no more than 4.5 per cent of itself
  for (let t = 0; t < PATH.seconds; t++) {
    const [a, b] = [pathAt(t).height, pathAt(t + 1).height];
    assert.ok(b > a, `outward at ${t} s`);
    assert.ok(b / a < 1.045, `no lurch at ${t} s: ${b / a}`);
  }
  // it starts and settles at rest (the easing has no speed or acceleration at its ends)
  near(ease(0), 0, 0, 'ease(0)');
  near(ease(1), 1, 0, 'ease(1)');
  near(ease(0.5), 0.5, 1e-12, 'half way');
  near((ease(1e-3) - ease(0)) / 1e-3, 0, 1e-4, 'no speed at the start');
  near((ease(1) - ease(1 - 1e-3)) / 1e-3, 0, 1e-4, 'none at the end');
  near(pathAt(1).height / pathAt(0).height, 1, 1e-5, 'the first second barely moves');
  // the Earth rises: its centre from a third of a degree over the limb to 2.35 by `risen`, drawing in to 1.9 at the end
  near(pathAt(0).rise / DEG, PATH.rise[0], 1e-12, 'the rise at the start');
  near(pathAt(PATH.risen).rise / DEG, PATH.rise[1], 1e-9, 'risen');
  near(pathAt(PATH.closing).rise / DEG, PATH.rise[1], 1e-9, 'held');
  near(pathAt(PATH.seconds).rise / DEG, PATH.rise[2], 1e-9, 'settled');
  assert.ok(PATH.still >= PATH.risen && PATH.still < PATH.closing, 'the still frame is of the Earth risen');
});

test('the camera: over the far side, the Earth where the path says over the Moon’s limb, the limb level under it', () => {
  for (const t of [0, 30, 80, 120, 180, 240, 300, 3600]) {
    const sky = skyAt(instantAt(t));
    const c = cameraAt(t, sky);
    const { height, rise } = pathAt(t);
    near(length(c.position) - MOON_RADIUS, height, 1e-3, `height at ${t} s`);
    // the Earth's centre stands `rise` above the limb of the Moon's mean sphere, seen from the camera
    const toEarth = unit(sub(sky.earth, c.position));
    const elevation = Math.asin(dot(unit(c.position), toEarth));
    near((elevation + c.dip) / DEG, rise / DEG, 0.01, `the Earth over the limb at ${t} s`);
    near(c.dip, Math.acos(MOON_RADIUS / (MOON_RADIUS + height)), 1e-12, 'the limb’s dip');
    // it looks at the Earth (no aim given), and its axes are a right-handed frame
    near(angleBetween(c.forward, toEarth) / DEG, 0, 1e-9, 'looking at the Earth');
    near(dot(c.right, c.up), 0, 1e-12, 'right and up');
    near(length(sub(cross(c.right, c.up), [-c.forward[0], -c.forward[1], -c.forward[2]])), 0, 1e-12, 'right cross up is backward');
    // level: the camera's up, the way it looks and straight up from the Moon lie in one plane
    near(dot(c.right, unit(c.position)), 0, 1e-9, 'the horizon is level');
    // it is over the far side, behind the limb the Earth stands over
    assert.ok(dot(unit(c.position), unit(sky.earth)) < 0, `over the far side at ${t} s`);
    assert.ok(dot(unit(c.position), limbPoint(sky, PATH.limb)) > 0, 'on the limb point’s side');
  }
  // an aim puts the Earth off the middle by that much (tangents), to the right and upward, near the Moon and far;
  // and wherever it is put, the Moon's centre is straight under it in the picture (the limb under the Earth is level)
  for (const height of [110_000, 500_000, 100_000_000]) {
    const c = cameraFor(sky0, height, 2 * DEG, [0.07, 0.018]);
    const d = unit(sub(sky0.earth, c.position));
    near(dot(d, c.right) / dot(d, c.forward), 0.07, 1e-7, 'aim to the right');
    near(dot(d, c.up) / dot(d, c.forward), 0.018, 1e-7, 'aim upward');
    // the plane of the eye, the Earth and the Moon's centre is a line in the picture: it runs straight up and down
    const plane = unit(cross(d, unit(c.position)));
    near(dot(cross(plane, c.forward), c.right), 0, 1e-9, 'the Moon’s centre is straight under the Earth');
    assert.ok(dot(unit(c.position), c.up) > 0, 'and the Earth is the upper of the two'); // (the Moon's centre is toward the picture's foot)
    near(length(sub(cross(c.right, c.up), [-c.forward[0], -c.forward[1], -c.forward[2]])), 0, 1e-12, 'still a frame');
  }
});

test('the path passes what it says it passes', () => {
  // Earthrise: at the start the Earth is half up over a horizon 20 degrees below the level, the camera 110 km over
  // the far side at 62 degrees south
  const start = cameraAt(0, sky0);
  near(start.dip / DEG, 19.9, 0.1, 'the horizon’s dip from 110 km');
  const under = moonUnder(start.position);
  near(under.latitude, -57.5, 1, 'latitude under the camera at the start');
  near(under.longitude, -124, 2, 'longitude under the camera at the start');
  // the limb point the Earth stands over, and the Sun's height there
  const limb = limbPoint(sky0, PATH.limb);
  near(selenographic(limb).latitude, -62, 0.5, 'the limb point’s latitude');
  near(dot(limb, unit(sky0.earth)), 0, 1e-12, 'it is on the limb as the Earth sees it');
  near(Math.asin(dot(limb, unit(sky0.sun))) / DEG, 17.6, 0.5, 'the Sun’s height at the limb point');
  // settled: the Moon a ball of two degrees and the Earth a degree and a half, a degree clear of each other, both in the lens's field
  const t = PATH.seconds;
  const sky = skyAt(instantAt(t));
  const end = cameraAt(t, sky);
  const moon = 2 * Math.asin(MOON_RADIUS / length(end.position));
  const earth = 2 * Math.asin(EARTH.equatorialRadius.value / length(sub(sky.earth, end.position)));
  near(moon / DEG, 1.96, 0.02, 'the Moon’s breadth at the end');
  near(earth / DEG, 1.55, 0.03, 'the Earth’s breadth at the end');
  near((pathAt(t).rise - earth / 2) / DEG, 1.12, 0.03, 'the gap between them');
  assert.ok(moon + earth / 2 + pathAt(t).rise < FIELD, 'both in the frame');
});

test('what is baked for the page was baked for these figures', () => {
  const moon = JSON.parse(readFileSync(join(root, 'public/front/moon.json'), 'utf8'));
  assert.equal(moon.for.instant, INSTANT, 'the Moon’s maps are for the instant (pnpm front:moon)');
  assert.equal(moon.for.limb, PATH.limb, 'and for the limb the camera looks across');
  near(angleBetween(moon.for.sun, sky0.sun) / DEG, 0, 1e-6, 'its cast shadows are for the Sun as it stood');
  // the finest map lies under where the camera starts and reaches the limb point
  const onNear = (p) => {
    const d = unit(p);
    const z = dot(d, moon.near.centre);
    return Math.max(Math.abs(dot(d, moon.near.east) / z), Math.abs(dot(d, moon.near.north) / z)) / moon.near.half;
  };
  assert.ok(onNear(limbPoint(sky0, PATH.limb)) < 0.6, 'the limb point is well inside the finest map');
  near(moon.near.metres, 481, 1, 'the finest map’s texel');
  const earth = JSON.parse(readFileSync(join(root, 'public/front/earth.json'), 'utf8'));
  // the day's cloud is the hour nearest the instant
  assert.ok(Math.abs(Date.parse(earth.day.at) - Date.parse(INSTANT)) <= 30 * 60 * 1000, `the day is ${earth.day.at} (pnpm front:earth)`);
});
