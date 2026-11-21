// The Moon in a flight's scene (src/viewer/flightmoon.ts): where it is put against the flight's own gravity's Moon, its
// axes against the Moon's own frame, the eye's up turned toward it without a step, and its eclipse of the Sun.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { flight as apollo8 } from '../missions/usa/apollo/flights/apollo-8/flight.ts';
import { RSPHERE } from '../src/sim/core/gravity.ts';
import { moonPosition } from '../src/world/ephemeris.ts';
import { FlightMoon } from '../src/viewer/flightmoon.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { angleBetween, DEG, ecefToSite, siteFrame } from '../src/world/frames.ts';
import { fromMoon, fromSelenographic, MOON_RADIUS } from '../src/world/moon.ts';
import { julianDate, terrestrialTime } from '../src/world/time.ts';

const site = siteFrame(apollo8.site);
const frame = frameOf(apollo8);
const LOI = 69 * 3600 + 8 * 60 + 20;
const at = (t) => {
  const m = new FlightMoon(site, frame, '/', true, 1);
  m.at(julianDate(apollo8.launch) + t / 86_400, 0);
  return m;
};

test('the Moon stands where the flight’s gravity has it, in the scene as the vehicle is put there', () => {
  for (const t of [0, 3 * 3600, LOI]) {
    const m = at(t);
    // (core/gravity.ts placeOf: Meeus's of date where DE440 is not loaded, as here and on the page; then as viewer/ascent.ts
    // puts a place of the run in the scene)
    const want = ecefToSite(site, frame.toFixed(frame.fromDate(moonPosition(frame.jdTT(t))), t));
    const off = m.centre.distanceTo(new THREE.Vector3(...want));
    assert.ok(off < 1e-3, `${off} m from where the gravity has it`);
    const d = m.centre.distanceTo(new THREE.Vector3(...ecefToSite(site, [0, 0, 0])));
    assert.ok(d > 356_000e3 && d < 407_000e3, `the Moon ${(d / 1000).toFixed(0)} km from the Earth's centre`);
  }
});

test('its axes are the Moon’s own: the point under the Earth as the Moon’s frame has it', () => {
  for (const t of [0, LOI]) {
    const m = at(t);
    const earth = m.earthMe;
    const jdTT = terrestrialTime(julianDate(apollo8.launch) + t / 86_400);
    const want = fromMoon(jdTT).subEarth;
    const off = angleBetween(earth, fromSelenographic(want.longitude, want.latitude)) / DEG;
    assert.ok(off < 0.05, `the point under the Earth ${off.toFixed(4)} degrees from the Moon frame's`);
    // and a place over it is where it says: its height over the sphere
    const o = m.over(0.674, 23.473, 110_000);
    assert.ok(Math.abs(o.at.distanceTo(m.centre) - (MOON_RADIUS + 110_000)) < 1e-3);
    assert.ok(Math.abs(o.up.length() - 1) < 1e-12 && Math.abs(o.east.dot(o.up)) < 1e-12 && Math.abs(o.north.dot(o.up)) < 1e-12);
  }
});

test('the eye’s up is turned from the Earth’s vertical to the Moon’s across its sphere, evenly and never at once', () => {
  const m = at(LOI);
  const sphere = RSPHERE.value;
  const way = new THREE.Vector3(1, 0.3, -0.2).normalize();
  const place = (r) => m.centre.clone().addScaledVector(way, r);
  assert.equal(m.toward(place(0.4 * sphere)), 1, 'inside half the sphere: the Moon’s');
  assert.equal(m.toward(place(1.6 * sphere)), 0, 'beyond one and a half: the Earth’s');
  let last = 1;
  let most = 0;
  for (let r = 0.4 * sphere; r <= 1.6 * sphere; r += 0.001 * sphere) {
    const k = m.toward(place(r));
    assert.ok(k <= last + 1e-12, 'it only goes one way');
    most = Math.max(most, last - k);
    last = k;
  }
  assert.ok(most < 0.002, `the most it turns in a thousandth of the sphere: ${most}`);
});

test('its eclipse of the Sun: all of it seen off the Moon’s disc, none behind its middle, and no step across its edge', () => {
  const m = at(LOI);
  const fromSun = m.sun.clone();
  // behind the Moon from the Sun, 10,000 km out: the Sun is hidden
  assert.equal(m.sunShown(m.centre.clone().addScaledVector(fromSun, -10_000e3)), 0);
  // to the Sun's side of it: all of it is seen
  assert.equal(m.sunShown(m.centre.clone().addScaledVector(fromSun, 10_000e3)), 1);
  // across the edge of the shadow, a step of 100 m at a time, 3,000 km behind it: never more than a little at a time
  const side = new THREE.Vector3().crossVectors(fromSun, new THREE.Vector3(0, 1, 0)).normalize();
  let last = m.sunShown(m.centre.clone().addScaledVector(fromSun, -3_000e3));
  let most = 0;
  for (let x = 0; x < 3_000e3; x += 100) {
    const s = m.sunShown(m.centre.clone().addScaledVector(fromSun, -3_000e3).addScaledVector(side, x));
    assert.ok(s >= 0 && s <= 1 && Number.isFinite(s));
    most = Math.max(most, Math.abs(s - last));
    last = s;
  }
  assert.equal(last, 1, 'out of the shadow at last');
  assert.ok(most < 0.01, `the most it changes in 100 m: ${most}`);
});
