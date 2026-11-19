// The front page's view (src/app/front/view.ts): the instant it shows and what the sky is then, against the
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
  FIELD,
  INSTANT,
  instantAt,
  LENS,
  limbAngle,
  limbOf,
  limbPoint,
  moonUnder,
  PACE,
  PATH,
  pathAt,
  SITE,
  SITE_DIR,
  skyAt,
} from '../src/app/front/view.ts';
import { EARTH } from '../src/world/bodies.ts';
import { skyFrom } from '../src/world/ephemeris.ts';
import { angleBetween, cross, DEG, dot, length, rotate, scale, sub, unit } from '../src/world/frames.ts';
import { MOON_RADIUS, selenographic } from '../src/world/moon.ts';
import { julianDate } from '../src/world/time.ts';
import { ease } from '../src/util/math.ts';

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
  for (const f of Object.values(LENS))
    assert.ok(f.source.length > 20 && ['documented', 'assumed', 'derived', 'estimated'].includes(f.confidence));
});

test('the path: one move outward, from 40 m over the ground to 100,000 km, smooth at both ends', () => {
  const ground = SITE.ground.value;
  near(pathAt(0).over, PATH.from, 1e-9, 'where it starts, over the ground');
  near(pathAt(0).height, ground + PATH.from, 1e-9, 'which is that much over the site’s ground');
  near(pathAt(PATH.seconds).height, PATH.to * 1000, 1e-3, 'where it settles');
  near(pathAt(1e6).height, PATH.to * 1000, 1e-3, 'and stays');
  // always outward, never a step: the height over the site grows every second, and by no more than a tenth of itself
  for (let t = 0; t < PATH.seconds; t++) {
    const [a, b] = [pathAt(t).over, pathAt(t + 1).over];
    assert.ok(b > a, `outward at ${t} s`);
    assert.ok(b / a < 1.1, `no lurch at ${t} s: ${b / a}`);
  }
  // the going out begins before the climb is done, so the camera does not pause between them
  assert.ok(PATH.away < PATH.lift && PATH.lift < PATH.seconds, 'the two parts overlap');
  for (let t = PATH.away; t < PATH.lift + 20; t++) assert.ok(pathAt(t + 1).over / pathAt(t).over > 1.01, `no pause at ${t} s`);
  // it settles at rest (the easing has no speed or acceleration at its ends), and starts already rising, slowly:
  // a third of a metre in the first second, 1.2 per cent of its height
  near(ease(0), 0, 0, 'ease(0)');
  near(ease(1), 1, 0, 'ease(1)');
  near(ease(0.5), 0.5, 1e-12, 'half way');
  near((ease(1e-3) - ease(0)) / 1e-3, 0, 1e-4, 'no speed at the start of an easing');
  near((ease(1) - ease(1 - 1e-3)) / 1e-3, 0, 1e-4, 'none at the end');
  near(pathAt(1).over / pathAt(0).over, 1 + (PATH.drift * Math.log((PATH.mid * 1000) / PATH.from)) / PATH.lift, 5e-4, 'the first second');
  near(pathAt(1).over - pathAt(0).over, 0.49, 0.03, 'half a metre');
  near(pathAt(PATH.seconds).height / pathAt(PATH.seconds - 1).height, 1, 1e-5, 'the last second barely moves');
  // the most the Earth may stand over the limb: 2.35 degrees until `closing`, drawing in to 1.9 at the end
  near(pathAt(0).rise / DEG, PATH.rise[0], 1e-12, 'the most rise at the start');
  near(pathAt(PATH.closing).rise / DEG, PATH.rise[0], 1e-9, 'held');
  near(pathAt(PATH.seconds).rise / DEG, PATH.rise[1], 1e-9, 'settled');
  // the limb it is measured from: the site's own level near the ground, the Moon's mean sphere from far
  near(pathAt(0).level, ground, 1e-9, 'the site’s level at the start');
  near(pathAt(PATH.seconds).level, 0, 1e-9, 'the mean sphere at the end');
  for (let t = 0; t < PATH.seconds; t++) assert.ok(pathAt(t + 1).level <= pathAt(t).level, `the level only falls (${t} s)`);
  // the still frame is of the Earth risen: the camera has drawn back and holds it at its most
  const still = cameraAt(PATH.still, skyAt(instantAt(0)));
  assert.ok(!still.held && PATH.still < PATH.closing, 'the still frame is of the Earth risen');
  near(still.rise / DEG, PATH.rise[0], 1e-6, 'at its most over the limb');
});

test('the camera: over the site and then behind the limb, the Earth where the path says, the limb level under it', () => {
  let was = null;
  for (const t of [0, 20, 40, 60, 80, 100, 130, 175, 240, 300, 380, 3600]) {
    const sky = skyAt(instantAt(t));
    const c = cameraAt(t, sky);
    const { height, rise, level } = pathAt(t);
    near(length(c.position) - MOON_RADIUS, height, 1e-3, `height at ${t} s`);
    const toEarth = unit(sub(sky.earth, c.position));
    const elevation = Math.asin(dot(unit(c.position), toEarth));
    near(c.dip, Math.acos((MOON_RADIUS + level) / (MOON_RADIUS + height)), 1e-12, 'the limb’s dip');
    // the Earth's centre stands `c.rise` above the limb of the sphere at the path's level, seen from the camera;
    // never more than the path's most, and less only near the ground, where the camera stands over the site
    near((elevation + c.dip) / DEG, c.rise / DEG, 0.01, `the Earth over the limb at ${t} s`);
    assert.ok(c.rise <= rise + 1e-12, `no more than the path's most at ${t} s`);
    if (c.held) near(angleBetween(c.position, SITE_DIR) / DEG, 0, 1e-12, `over the site at ${t} s`);
    else assert.ok(dot(unit(c.position), unit(sky.earth)) < dot(SITE_DIR, unit(sky.earth)), `behind the site at ${t} s`);
    assert.ok(t > 40 || c.held, `it goes straight up at first (${t} s)`);
    assert.ok(t < 80 || !c.held, `and has drawn back by ${t} s`);
    // it looks at the Earth (no aim given), and its axes are a right-handed frame
    near(angleBetween(c.forward, toEarth) / DEG, 0, 1e-9, 'looking at the Earth');
    near(dot(c.right, c.up), 0, 1e-12, 'right and up');
    near(length(sub(cross(c.right, c.up), [-c.forward[0], -c.forward[1], -c.forward[2]])), 0, 1e-12, 'right cross up is backward');
    // level: the camera's up, the way it looks and straight up from the Moon lie in one plane
    near(dot(c.right, unit(c.position)), 0, 1e-9, 'the horizon is level');
    // it is in the plane of the Earth, the Moon's centre and the site, on the site's side
    near(dot(unit(c.position), cross(unit(sky.earth), limbOf(sky))), 0, 1e-9, `in the site's plane at ${t} s`);
    assert.ok(dot(unit(c.position), limbOf(sky)) > 0, 'on the site’s side');
    was = c;
  }
  assert.ok(dot(unit(was.position), unit(sky0.earth)) < 0, 'it ends over the far side');
  // the camera never jumps or kicks: over a sixth of a second it moves no more than a third further than over the
  // sixth before (the turn from going up to drawing back has no corner)
  let before = cameraAt(0, sky0).position;
  let moved = length(sub(cameraAt(1 / 6, skyAt(instantAt(1 / 6))).position, before));
  let fastest = 0;
  for (let t = 1 / 6; t < PATH.seconds; t += 1 / 6) {
    const here = cameraAt(t, skyAt(instantAt(t))).position;
    const step = length(sub(here, before));
    assert.ok(step <= 1.35 * moved + 0.05, `no kick at ${t.toFixed(1)} s: ${step.toFixed(2)} m after ${moved.toFixed(2)} m`);
    fastest = Math.max(fastest, step / length(sub(here, scale(SITE_DIR, MOON_RADIUS))));
    [before, moved] = [here, step];
  }
  assert.ok(fastest < 0.06, `and never more than a third of its distance from the site in a second (${(6 * fastest).toFixed(2)})`);
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
  // it starts 40 m over a plain 56 degrees south on the south-western limb, the Earth low over the horizon
  const start = cameraAt(0, sky0);
  assert.ok(start.held, 'over the site');
  const under = moonUnder(start.position);
  near(under.latitude, SITE.latitude.value, 1e-9, 'latitude under the camera at the start');
  near(under.longitude, SITE.longitude.value, 1e-9, 'longitude under the camera at the start');
  near(Math.asin(dot(SITE_DIR, unit(sub(sky0.earth, start.position)))) / DEG, 0.41, 0.02, 'the Earth’s centre over the level at the start');
  near(Math.asin(dot(SITE_DIR, unit(sky0.sun))) / DEG, 20.5, 0.2, 'the Sun’s height at the site');
  // the limb point the camera's plane crosses, which the Earth stands over from far
  const limb = limbOf(sky0);
  near(dot(limb, unit(sky0.earth)), 0, 1e-12, 'it is on the limb as the Earth sees it');
  near(limbAngle(sky0), 213.85, 0.1, 'in the south-south-west');
  near(angleBetween(limb, limbPoint(sky0, limbAngle(sky0))) / DEG, 0, 1e-9, 'which is that angle round the limb');
  near(selenographic(limb).latitude, -56.5, 0.5, 'the limb point’s latitude');
  near(angleBetween(limb, SITE_DIR) / DEG, 0.68, 0.05, 'the site is two thirds of a degree on the Earth’s side of it');
  // Earthrise as Apollo 8 had it: 110 km up, the camera is over the far side with the Earth at its most over the limb
  let t110 = 0;
  while (pathAt(t110).over < 110_000) t110 += 0.25;
  const high = cameraAt(t110, skyAt(instantAt(t110)));
  assert.ok(!high.held && dot(unit(high.position), unit(sky0.earth)) < 0, 'over the far side from 110 km');
  near(high.dip / DEG, 19.9, 0.2, 'the horizon’s dip from 110 km');
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
  near(moon.for.limb, limbAngle(sky0), 1e-9, 'and for the limb the camera looks across');
  assert.deepEqual(moon.for.site, [SITE.longitude.value, SITE.latitude.value], 'from the place it starts');
  // (to a third of an arcsecond: the bake's Sun moved 0.03 arcseconds when the Earth's orientation became the IAU's of
  // 2006, under a thousandth of the shadows' soft edge, 0.26 degrees; a bake for another instant would be degrees off)
  near(angleBetween(moon.for.sun, sky0.sun) / DEG, 0, 1e-4, 'its cast shadows are for the Sun as it stood');
  // the finest map lies under where the camera starts and reaches the limb point
  const onNear = (p) => {
    const d = unit(p);
    const z = dot(d, moon.near.centre);
    return Math.max(Math.abs(dot(d, moon.near.east) / z), Math.abs(dot(d, moon.near.north) / z)) / moon.near.half;
  };
  assert.ok(onNear(limbOf(sky0)) < 0.6, 'the limb point is well inside the finest map');
  assert.ok(onNear(SITE_DIR) < 0.6, 'and so is the site');
  near(moon.near.metres, 481, 1, 'the finest map’s texel');
  // the site's own ground: view.ts's figure for it is the bake's, and the bake found the path clear of the ground
  near(moon.site.ground, SITE.ground.value, 0.05, 'the ground at the site (pnpm front:moon -- --only site)');
  assert.deepEqual(moon.site.at, { longitude: SITE.longitude.value, latitude: SITE.latitude.value });
  near(angleBetween(moon.site.up, SITE_DIR), 0, 1e-12, 'its up is the site’s direction');
  assert.equal(moon.site.seen.from, PATH.from, 'what is seen from the site was worked out from the path’s first height');
  assert.ok(
    moon.site.seen.earth - moon.site.seen.horizon > 0.05 && moon.site.seen.earth - moon.site.seen.horizon < 0.45,
    'the Earth is half risen there',
  );
  const { over, least } = moon.site.clear;
  near(over[0], PATH.from, 1e-9, 'the ground’s distance is known from the first height');
  assert.ok(over.at(-1) > 300_000, 'to where the camera is well clear of every mountain');
  for (const [k, h] of over.entries())
    assert.ok(least[k] > 0.85 * h, `the ground is no nearer than the camera is high (${h} m: ${least[k]} m)`);
  const earth = JSON.parse(readFileSync(join(root, 'public/front/earth.json'), 'utf8'));
  // the day's cloud is the hour nearest the instant
  assert.ok(Math.abs(Date.parse(earth.day.at) - Date.parse(INSTANT)) <= 30 * 60 * 1000, `the day is ${earth.day.at} (pnpm front:earth)`);
});
