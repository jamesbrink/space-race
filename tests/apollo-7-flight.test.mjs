import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { afloatAt, floatOn } from '../src/sim/afloat.ts';
import { targetAt } from '../src/sim/orbital-target.ts';
import { shipOf } from '../src/sim/orbital.ts';
import { between, orbitalFlown, recordOf } from '../src/sim/run.ts';
import { sequenceOf } from '../src/sim/staged.ts';
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

// Issue #112: the run is one state, and these are the four places it used to be moved without a force: the staging, the
// coast across each tracking timestamp, each finite SPS firing, and the entry. Across every one the place is continuous
// and the velocity changes by gravity and by the engine or the air named there, and by nothing else.
test('Apollo 7 is one state through its staging, every tracking timestamp, each SPS firing and the entry', () => {
  const whole = orbitalFlown(flight);
  const plan = flight.plan;
  const ship = shipOf(plan);
  const GM = 3.986004418e14;
  const gravity = (r) => r.map((x) => (-GM * x) / length(r) ** 3);
  /** What gravity does not explain of the change in velocity from `a` to `b`, m/s, and of the change in place, m. */
  const unexplained = (samples, a, b) => {
    const [p, q] = [between(samples, a), between(samples, b)];
    const dt = b - a;
    const free = gravity(p.r).map((g, i) => ((g + gravity(q.r)[i]) / 2) * dt);
    return {
      dv: length(sub(sub(q.v, p.v), free)),
      dr: length(
        sub(
          sub(q.r, p.r),
          p.v.map((v, i) => ((v + q.v[i]) / 2) * dt),
        ),
      ),
    };
  };
  // the staging: the first stage let go, the J-2 lit, the J-2 cut by the guidance. Each is flown through by thrust alone
  // (four g at the most over the second about it)
  const seq = sequenceOf(plan);
  for (const [what, t] of [
    ['the S-IB let go', seq.stages[0].sep],
    ['the J-2 lit', seq.stages.at(-1).from],
    ['the J-2 cut', whole.ascent.stops.at(-1)],
  ]) {
    const x = unexplained(whole.ascent.samples, t - 0.5, t + 0.5);
    assert.ok(x.dv < 45, `${what}, T+${t.toFixed(2)}: ${x.dv.toFixed(2)} m/s in a second, where four g is 39`);
    assert.ok(x.dr < 25, `${what}: the place steps ${x.dr.toFixed(2)} m`);
  }
  // every tracking timestamp: the run coasts through it (or burns through it, where the record took it at an ignition or a
  // cutoff), and the tracked state moves nothing
  const burns = [
    ...ship.moves.map((m) => ({ on: m.on, off: m.off, accel: m.accel })),
    { on: ship.on, off: ship.off, accel: ship.flown / (ship.off - ship.on) },
  ];
  let coasted = 0;
  for (const fix of plan.record.coastFixes) {
    const t = fix.at.value;
    // (on the S-IVB after its cutoff, or alone: not within two seconds of an end of either run)
    const parted = whole.ascent.separation.t;
    if (t < whole.ascent.stops.at(-1) + 20 || Math.abs(t - parted) < 2 || t >= whole.coast.samples.at(-1).t - 2) continue;
    const burning = burns.filter((b) => t + 1 > b.on && t - 1 < b.off);
    const x = unexplained(t < parted ? whole.ascent.samples : whole.coast.samples, t - 1, t + 1);
    const push = burning.reduce((sum, b) => sum + b.accel, 0) * 2;
    // (0.15 m/s over the two seconds: the Earth's flattening is 0.03 of it, the air and the cubic between samples the rest;
    // a state joined there was tens of metres a second)
    assert.ok(
      x.dv <= push + 0.15,
      `across the tracking at T+${t}: ${x.dv.toFixed(3)} m/s unexplained, where what burns there gives ${push.toFixed(2)}`,
    );
    assert.ok(x.dr < 5, `across the tracking at T+${t}: the place steps ${x.dr.toFixed(2)} m`);
    if (!burning.length) coasted++;
  }
  assert.ok(coasted >= 2, `${coasted} tracking timestamps coasted through`);
  // each SPS firing gives the impulse the record gives it, over its own length, and nothing more
  const sps = ship.moves.filter((m) => m.engine === 'sps');
  assert.equal(sps.length, 7, 'seven firings before the deorbit');
  for (const b of [...sps, { on: ship.on, off: ship.off, accel: ship.flown / (ship.off - ship.on) }]) {
    const x = unexplained(whole.coast.samples, b.on - 1, b.off + 1);
    const want = b.accel * (b.off - b.on);
    assert.ok(
      Math.abs(x.dv - want) < 0.02 * want + 0.3,
      `the firing at T+${b.on}: ${x.dv.toFixed(2)} m/s, where the record's impulse is ${want.toFixed(2)}`,
    );
  }
  // the entry: from the modules' parting to the drogues, what the air does is what the samples say it does, second by second
  const entry = whole.coast.samples.filter((s) => s.t >= ship.parted);
  let most = 0;
  for (let i = 1; i < entry.length; i++) {
    const [a, b] = [entry[i - 1], entry[i]];
    const dt = b.t - a.t;
    if (dt < 1e-9) continue;
    const free = gravity(a.r).map((g, k) => ((g + gravity(b.r)[k]) / 2) * dt);
    const dv = length(sub(sub(b.v, a.v), free));
    const allowed = (1.5 * Math.max(a.g, b.g, entry[i - 2]?.g ?? 0, entry[i + 1]?.g ?? 0) * 9.80665 + 0.3) * dt + 0.02;
    assert.ok(dv <= allowed, `in the entry at T+${b.t}: ${dv.toFixed(2)} m/s, where the load read allows ${allowed.toFixed(2)}`);
    most = Math.max(most, b.g);
  }
  assert.ok(most > 3 && most < 4.5, `the entry's greatest load is ${most.toFixed(2)} g`);
  // and the descent begins where the coast ends
  const track = Object.values(whole.down.tracks)[0];
  assert.ok(length(sub(track[0].r, whole.coast.samples.at(-1).r)) < 1e-6, 'the descent begins where the coast ends');
});
