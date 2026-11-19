import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { afloatAt, floatOn } from '../src/sim/afloat.ts';
import { targetAt } from '../src/sim/orbital-target.ts';
import { between, recordOf } from '../src/sim/run.ts';
import { wavesOf } from '../src/sim/sea.ts';
import { ecefToSite, ecefToSiteDirection, length, siteFrame, sub } from '../src/world/frames.ts';

test('the Saturn IB rises vertically off LC-34 and then pitches downrange', () => {
  const run = recordOf(flight);
  const site = siteFrame(flight.site);
  const fromPad = (t) => ecefToSite(site, run.frame.toFixed(between(run.samples, t).r, t));
  let previousHeight = 0;
  for (const t of [1, 3, 5, 8, 10]) {
    const [x, height, z] = fromPad(t);
    assert.ok(height > previousHeight, `still climbing at ${t} s`);
    assert.ok(Math.hypot(x, z) < 1, `pad drift at ${t} s: ${Math.hypot(x, z)} m`);
    const state = run.samples.find((s) => Math.abs(s.t - t) < 1e-7);
    const [, up] = ecefToSiteDirection(site, run.frame.toFixed(state.axis, t));
    assert.ok(up > Math.cos(Math.PI / 1800), `nose within 0.1° of vertical at ${t} s`);
    previousHeight = height;
  }
  const [x, , z] = fromPad(60);
  const bearing = (Math.atan2(z, x) * 180) / Math.PI + site.bearingX;
  assert.ok(Math.abs(bearing - 72) < 5, `ground track after pitch-over: ${bearing}°`);
});

// The run is flown from the pad on its own forces and is never put on the tracking (docs/agents/simulator.md, "One
// state"): what it misses the measured states by is a finding, bounded here so that it cannot grow unseen. Chrysler's
// postflight trajectory, Table XIII, pp. 72 and 74: the first stage's separation, the J-2's cutoff, and insertion ten
// seconds on. The bounds were set from the first run flown this way (November 2026: 0.5 km and 14 m/s at separation, the
// first stage flown open on a programme read off a figure; 10 km along the track and 19 m/s at cutoff), with room.
test('Apollo 7 passes the measured first-stage separation, J-2 cutoff and orbital insertion within stated bounds, on physics alone', () => {
  const run = recordOf(flight);
  for (const [t, longitude, radiusKm, speed, place, fast] of [
    [145.59, -79.9558, 6435.104, 2320.3, 2_000, 25],
    [616.76, -61.9777, 6600.454, 7780.3, 20_000, 30],
    [626.76, -61.2293, 6600.459, 7788.6, 20_000, 30],
  ]) {
    const { r, v } = between(run.samples, t);
    const east = (run.frame.place(r, t).longitude - longitude) * (Math.PI / 180) * radiusKm * 1000 * Math.cos((31 * Math.PI) / 180);
    assert.ok(Math.abs(east) < place, `${(east / 1000).toFixed(2)} km east of the tracking at ${t} s`);
    assert.ok(Math.abs(length(r) - radiusKm * 1000) < 1_500, `radius at ${t} s: ${(length(r) / 1000 - radiusKm).toFixed(3)} km out`);
    assert.ok(Math.abs(length(v) - speed) < fast, `speed at ${t} s: ${(length(v) - speed).toFixed(1)} m/s out`);
  }
  // and nothing joins it to them: across each of those instants the velocity changes by no more than the engines can push
  for (const t of [145.59, 616.76, 626.76]) {
    const [before, after] = [between(run.samples, t - 0.5), between(run.samples, t + 0.5)];
    assert.ok(length(sub(after.v, before.v)) < 60, `no step in velocity across ${t} s`);
  }
});

test('Apollo 7 flies to the Atlantic and rights itself by inflating three bags', () => {
  const run = recordOf(flight);
  assert.ok(run.afloat);
  const landing = run.afloat.from;
  // (flown eleven days on its own forces, with nothing put on the tracking, it comes down within a quarter of an hour of
  // 260:09:03: the first such run, November 2026, was 652 s late and 92 km from the recorded place)
  assert.ok(Math.abs(landing - 936543) < 900, `splashdown within 900 seconds of 260:09:03: ${(landing - 936543).toFixed(0)} s`);
  const heel = (at) => (Math.acos(Math.cos(afloatAt(run.afloat, landing + at).heel)) * 180) / Math.PI;
  assert.ok(heel(535) > 130, 'still inverted when the crew starts the pumps');
  assert.ok(heel(777) < 45, 'apex-up by the end of the recorded recovery phase');
  const config = flight.flies.uprighting;
  const uninflated = floatOn(config.body, wavesOf(flight.weather.sea.trains), 0, 780, { initialHeel: Math.PI });
  assert.ok(Math.cos(afloatAt(uninflated, 777).heel) < 0, 'without inflation the capsule stays inverted');
});

test('the detached S-IVB and the CSM have distinct positions and preserve the observed rendezvous range', () => {
  const run = recordOf(flight),
    config = flight.flies.target;
  for (const fix of config.fixes) {
    const t = fix.at.value;
    const state = targetAt(flight, run, t);
    assert.ok(state);
    const range = length(sub(state.r, between(run.samples, t).r));
    assert.ok(Math.abs(range - Math.hypot(fix.ahead.value, fix.above.value)) < 0.1, `range at ${t}: ${range}`);
  }
  const first = flight.flies.drops.find((d) => d.on === config.drop);
  const center = between(run.samples, 30 * 3600);
  assert.ok(
    Math.abs(length(sub(targetAt(flight, run, 30 * 3600).r, center.r)) - 70 * 0.3048) < 0.2,
    'station-keeping holds between the two reported events',
  );
  const manual = Object.create(run);
  manual.dropped = [...run.dropped];
  const i = flight.flies.drops.indexOf(first);
  manual.dropped[i] = first.at + 10;
  const release = manual.dropped[i];
  assert.ok(
    length(sub(targetAt(flight, manual, release).v, between(run.samples, release).v)) > 0.5,
    'the freely coasting stage receives the separation impulse',
  );
  assert.equal(targetAt(flight, run, first.at - 1), undefined);
  assert.equal(targetAt(flight, run, config.until.value + 1), undefined);
});
