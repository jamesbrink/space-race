import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { afloatAt, floatOn } from '../src/sim/afloat.ts';
import { targetAt } from '../src/sim/orbital-target.ts';
import { shipOf, targetFrom } from '../src/sim/orbital.ts';
import { placeFrom } from '../src/sim/pursuit.ts';
import { between, orbitalFlown, recordOf } from '../src/sim/run.ts';
import { guided } from '../src/sim/fliers.ts';
import { sequenceOf } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { wavesOf } from '../src/sim/sea.ts';
import { ecefToSite, ecefToSiteDirection, length, siteFrame, sub } from '../src/world/frames.ts';
import { hermite, step } from '../src/world/orbit.ts';

const run0 = () => recordOf(flight);

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
  // (flown eleven days on its own forces, with nothing put on the tracking: the S-IVB's vent and dump flown, the
  // rendezvous flown by guidance, the ship's drag a quarter of its outside, and the deorbit burn timed by guidance for the
  // place it came down at, as the ground timed it. November 2026: 66 s after 260:09:03, and 59 km across the track from
  // the recovery force's place. The first run on its own forces, with none of those, was 652 s late)
  assert.ok(Math.abs(landing - 936543) < 300, `splashdown within five minutes of 260:09:03: ${(landing - 936543).toFixed(0)} s`);
  const results = orbitalFlown(flight).coast.results;
  assert.ok(Math.abs(results.alongTrack) < 20_000, `level with the place along its track: ${(results.alongTrack / 1000).toFixed(1)} km`);
  assert.ok(Math.abs(results.crossTrack) < 150_000, `and ${(results.crossTrack / 1000).toFixed(0)} km across it`);
  assert.ok(Math.abs(results.retroLate) < 300, `the deorbit burn is lit ${results.retroLate.toFixed(0)} s from the record's instant`);
  const heel = (at) => (Math.acos(Math.cos(afloatAt(run.afloat, landing + at).heel)) * 180) / Math.PI;
  assert.ok(heel(535) > 130, 'still inverted when the crew starts the pumps');
  assert.ok(heel(777) < 45, 'apex-up by the end of the recorded recovery phase');
  const config = flight.flies.uprighting;
  const uninflated = floatOn(config.body, wavesOf(flight.weather.sea.trains), 0, 780, { initialHeel: Math.PI });
  assert.ok(Math.cos(afloatAt(uninflated, 777).heel) < 0, 'without inflation the capsule stays inverted');
});

// The S-IVB is a craft of its own from the separation (sim/pursuit.ts): gravity and the air move it and nothing else,
// whatever the spacecraft does and whatever the record saw of it. The rendezvous is the record's burns as commands, each
// solved by guidance on where the two then are; what it gives is held to the record in the plan's checks (src/sim/misses.ts).
test('the S-IVB is flown on its own forces from the separation, and the spacecraft is flown back to it by guidance', () => {
  const run = recordOf(flight),
    whole = orbitalFlown(flight),
    config = flight.flies.target,
    plan = flight.plan,
    target = whole.target;
  assert.ok(target, 'the flight has its target');
  assert.equal(run.target, target, 'what is drawn is the craft the guidance flew on');
  const parted = whole.ascent.separation;
  assert.equal(target.from, parted.t);
  // it begins where the stack was, moving off at the speed the joint pushes the two apart at
  const push = plan.craft[0].joints.find((j) => j.id === plan.target.joint).push.value;
  assert.ok(length(sub(target.at(parted.t).r, parted.r)) < 1e-6, 'it begins at the place of the parting');
  assert.ok(Math.abs(length(sub(target.at(parted.t).v, parted.v)) - push) < 1e-9, 'and leaves at the joint’s push');
  // nothing moves it but gravity and the air: across the separation's first minutes, every burn of the spacecraft's, the
  // station kept on it and a day after (before it comes down into thicker air), ten seconds of gravity alone carry one state to the next but for the air (which at
  // these heights is under a millimetre a second in ten seconds)
  const instants = [
    parted.t,
    parted.t + 600,
    ...whole.coast.burns.filter((b) => b.on < 60 * 3600).flatMap((b) => [b.on - 10, b.on, b.off]),
    30 * 3600,
    45.5 * 3600,
    60 * 3600,
  ];
  for (const t of instants) {
    const [a, b] = [target.at(t), target.at(t + 10)];
    const free = step(a, t, 10);
    assert.ok(
      length(sub(b.v, free.v)) < 2e-3,
      `the stage at T+${t}: ${length(sub(b.v, free.v)).toExponential(2)} m/s in 10 s that gravity does not give`,
    );
    assert.ok(length(sub(b.r, free.r)) < 0.02, `the stage at T+${t}: its place steps ${length(sub(b.r, free.r)).toExponential(2)} m`);
  }
  // and it is the same craft however far it has been asked for, and whoever asks: flown again from the parting alone
  const again = targetFrom(plan, run.frame, flight.site.seaLevel.value, target.at(parted.t) && { t: parted.t, ...target.at(parted.t) });
  for (const t of [3 * 3600, 30 * 3600, 60 * 3600])
    assert.deepEqual(again.at(t), target.at(t), `the stage at T+${t} is its own flight from the parting, not the spacecraft’s`);
  assert.deepEqual(targetAt(flight, run, 30 * 3600), target.at(30 * 3600), 'the scene’s stage is that craft');

  // the rendezvous. Beside the stage until the first phasing burn; the corrective combination leaves it 80 nautical miles
  // ahead and 7.8 above as the coelliptic manoeuvre lights; that one leaves the height between them steady; the terminal
  // phase arrives; the braking ends within 70 ft, and the station is kept to 30:20
  const ship = (t) => {
    const samples = whole.coast.samples;
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].t <= t) lo = mid;
      else hi = mid;
    }
    const [p, q] = [samples[lo], samples[hi]];
    return hermite(p.t, p.r, p.v, q.t, q.r, q.v, t);
  };
  const from = (t) => placeFrom(ship(t), target.at(t).r);
  const range = (t) => length(sub(target.at(t).r, ship(t).r));
  const NMI = 1852;
  const FT = 0.3048;
  const T = (h, m, sec) => h * 3600 + m * 60 + sec;
  for (let t = T(3, 5, 0); t <= T(3, 20, 0); t += 60)
    assert.ok(Math.abs(range(t) - 100 * FT) < 2, `beside the stage at T+${t}: ${range(t).toFixed(1)} m, where the photograph has about 30`);
  const lit = from(T(28, 0, 56.5));
  assert.ok(
    Math.abs(lit.ahead - 80 * NMI) < 50 && Math.abs(lit.above - 7.8 * NMI) < 50 && Math.abs(lit.across) < 50,
    'the corrective combination arrives where it was aimed',
  );
  // (coelliptic: the height between them at the coelliptic burn's end and at the terminal phase's beginning, 75 minutes on)
  const [after, later] = [from(T(28, 1, 10)).above, from(T(29, 16, 30)).above];
  assert.ok(
    Math.abs(later - after) < 0.5 * NMI,
    `the height between them goes from ${(after / NMI).toFixed(2)} to ${(later / NMI).toFixed(2)} nautical miles`,
  );
  // (the line of sight as the terminal phase begins: the record's burn was made at the standard 27 degrees and a half)
  const tpi = from(T(29, 16, 33));
  const elevation = (Math.atan2(tpi.above, tpi.ahead) * 180) / Math.PI;
  assert.ok(
    Math.abs(elevation - 27.45) < 3,
    `the stage is ${elevation.toFixed(1)} degrees above the level ahead as the terminal phase begins`,
  );
  for (let t = T(29, 55, 43); t <= T(30, 20, 0); t += 60)
    assert.ok(Math.abs(range(t) - 70 * FT) < 1, `keeping station at T+${t}: ${range(t).toFixed(1)} m`);
  // the solved burns are the run's own (`BurnFlown.solved`), and each gave what the samples show
  const solved = whole.coast.burns.filter((b) => b.solved).map((b) => b.lit);
  assert.deepEqual(solved, ['rcs-formation', 'sps-1', 'sps-2', 'rcs-terminal', 'rcs-braking']);

  // a stage let go at another instant is that run's own craft, with the joint's push
  const first = flight.flies.drops.find((d) => d.on === config.drop);
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

// The S-IVB's oxygen tank vent and oxygen dump are forces on the attached stack (`Craft.vents`), along the axis its
// attitude programme holds: across each, the velocity gains what the flight evaluation's platform measured, and the
// stack lies along the motion as it does.
test('the S-IVB’s vent and oxygen dump push the attached stack by what the platform measured, along the axis it holds', () => {
  const whole = orbitalFlown(flight);
  const samples = whole.ascent.samples;
  const GM = 3.986004418e14;
  const g = (r) => r.map((x) => (-GM * x) / length(r) ** 3);
  // (the gain beyond gravity between two instants, summed sample by sample, along the motion)
  const gained = (from, to) => {
    let sum = 0;
    for (let i = 1; i < samples.length; i++) {
      const [a, b] = [samples[i - 1], samples[i]];
      if (a.t < from || b.t > to || b.t - a.t < 1e-9) continue;
      const free = g(a.r).map((x, k) => ((x + g(b.r)[k]) / 2) * (b.t - a.t));
      const dv = sub(sub(b.v, a.v), free);
      sum += (dv[0] * a.v[0] + dv[1] * a.v[1] + dv[2] * a.v[2]) / length(a.v);
    }
    return sum;
  };
  // (0.15 m/s of room: the Earth's flattening over the interval, which a point mass's gravity leaves in)
  const vent = gained(640, 690);
  assert.ok(
    Math.abs(vent - 1.1) < 0.15,
    `the oxygen tank's vent gives ${vent.toFixed(2)} m/s along the motion, where the platform measured 1.1`,
  );
  const dump = gained(5660, 6400);
  assert.ok(Math.abs(dump - 6.6) < 0.5, `the oxygen dump gives ${dump.toFixed(2)} m/s, where the platform measured 6.6`);
  const quiet = gained(2000, 5000);
  assert.ok(Math.abs(quiet) < 0.4, `between them nothing pushes: ${quiet.toFixed(2)} m/s`);
  // the axis through the dump: along the motion, level (the attitude programme, part of the law)
  for (const t of [1000, 5700, 6300, 9000]) {
    const at = samples.find((x) => x.t >= t);
    const up = at.r.map((x) => x / length(at.r));
    const along = (at.axis[0] * at.v[0] + at.axis[1] * at.v[1] + at.axis[2] * at.v[2]) / length(at.v);
    const lifted = at.axis[0] * up[0] + at.axis[1] * up[1] + at.axis[2] * up[2];
    assert.ok(
      along > 0.999 && Math.abs(lifted) < 0.03,
      `at T+${t} the stack lies along the motion: ${along.toFixed(4)}, ${lifted.toFixed(4)} up`,
    );
  }
  // pitched 20 degrees down before the separation, and held among the stars from the freeze: the same line at both ends
  const [frozen, parting] = [samples.find((x) => x.t >= 10271), samples.at(-1)];
  const turned = Math.acos(
    Math.min(1, frozen.axis[0] * parting.axis[0] + frozen.axis[1] * parting.axis[1] + frozen.axis[2] * parting.axis[2]),
  );
  assert.ok(
    (turned * 180) / Math.PI < 0.6,
    `held from the freeze to the separation within ${((turned * 180) / Math.PI).toFixed(2)} degrees`,
  );
});

// The same force in the three integrators of the ascent (`stackOf` `vent`): the batch run (staged.ts `ascend`), the live
// vehicle flown by its pilot (stagedlive.ts), and the path under guidance flown ahead from the live vehicle's state
// (fliers.ts `guided`). In the oxygen tank's vent each is pushed by 1.1 m/s in 30 s, along the stack's axis, and a
// little after it by nothing but the thin air.
test('the batch run, the live vehicle and the path under guidance all feel the S-IVB’s vent, and the same', () => {
  const whole = orbitalFlown(flight);
  const plan = flight.plan;
  const site = siteFrame(flight.site);
  const frame = run0().frame;
  const sea = flight.site.seaLevel.value;
  const x = whole.ascent.solved;
  const G0 = 9.80665;
  const want = 1.1 / 30;
  const v = stagedVehicle(plan, site, frame, sea, x);
  // (the law's angle as the tangent took over, kept by the pilot and handed to the path, as the deck hands it)
  const memo = { thetaTurn: null };
  const pilot = stagedPilot(v, x, site, frame, sea, { guidance: true, sequence: true, prescribed: true, memo });
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: sequenceOf(plan).stages.flatMap((st, i) => (st.from <= 0 ? [{ kind: 'ignite', stage: i }] : [])),
  });
  const pushes = {};
  for (const [name, t] of [
    ['venting', 662],
    ['after', 700],
  ]) {
    while (s.t < t && !s.broke && !s.landed) s = v.tick(s, pilot);
    assert.ok(!s.broke && !s.landed && !s.parted, `the live vehicle is in orbit with the spacecraft on at T+${t}`);
    const batch = whole.ascent.samples.find((q) => q.t >= s.t - 1e-6);
    const live = v.sample(s, 0);
    const flier = guided(plan, site, sea, s, {
      vehicle: v,
      state: s,
      sequence: true,
      live: true,
      solved: x,
      plan,
      thetaTurn: memo.thetaTurn,
    });
    flier.prepare?.();
    const height = frame.place(s.r, s.t).height - sea;
    const ahead = flier.push(s.t, s.r, s.v, height);
    pushes[name] = {
      batch: batch.g * G0,
      live: live.g * G0,
      guided: length(ahead),
      along: (ahead[0] * live.axis[0] + ahead[1] * live.axis[1] + ahead[2] * live.axis[2]) / (length(ahead) || 1),
    };
  }
  console.log(`  #   pushed, m/s²: ${JSON.stringify(pushes)}; the vent is ${want.toFixed(5)}`);
  for (const who of ['batch', 'live', 'guided'])
    assert.ok(
      Math.abs(pushes.venting[who] - want) < 0.03 * want,
      `${who}: ${pushes.venting[who]} m/s² in the vent, where 1.1 m/s in 30 s is ${want}`,
    );
  assert.ok(pushes.venting.along > 0.999, `the path’s push is along the axis the live vehicle holds: ${pushes.venting.along}`);
  for (const who of ['batch', 'live', 'guided'])
    assert.ok(pushes.after[who] < 0.02 * want, `${who}: ${pushes.after[who]} m/s² once the vent is shut`);
});

// Issue #112: the run is one state, and these are the four places it used to be moved without a force: the staging, the
// coast across each tracking timestamp, each finite SPS firing, and the entry. Across every one the place is continuous
// and the velocity changes by gravity and by the engine or the air named there, and by nothing else.
test('Apollo 7 is one state through its staging, every tracking timestamp, each SPS firing and the entry', () => {
  const whole = orbitalFlown(flight);
  const plan = flight.plan;
  // (the plan as the run flew it: its deorbit firing where guidance timed it for the landing place)
  const ship = shipOf(whole.plan ?? plan);
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
  // (the manoeuvres as this run flew them: guidance's own where it solved one on the stage, orbital.ts `BurnFlown`)
  const flown = whole.coast.burns.map((b) => ({ ...b, accel: b.velocity / (b.off - b.on) }));
  const burns = [...flown, { on: ship.on, off: ship.off, accel: ship.flown / (ship.off - ship.on) }];
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
  // each SPS firing gives its impulse (the record's, or what guidance solved on the stage), over its own length, and nothing more
  const sps = flown.filter((b) => b.lit.startsWith('sps-'));
  assert.equal(sps.length, 7, 'seven firings before the deorbit');
  for (const b of [...sps, { on: ship.on, off: ship.off, accel: ship.flown / (ship.off - ship.on) }]) {
    const x = unexplained(whole.coast.samples, b.on - 1, b.off + 1);
    const want = b.accel * (b.off - b.on);
    assert.ok(
      Math.abs(x.dv - want) < 0.02 * want + 0.3,
      `the firing at T+${b.on}: ${x.dv.toFixed(2)} m/s, where its impulse is ${want.toFixed(2)}`,
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
  // (3.33 g on the reconstructed trajectory, 3.41 in the structural analysis: the entry is steered to the computer's target
  // on its own events, sim/entry.ts. Flown at the record's instants after the burn, its banks gave 5.66 g)
  assert.ok(most > 2.9 && most < 3.8, `the entry's greatest load is ${most.toFixed(2)} g`);
  // and the descent begins where the coast ends
  const track = Object.values(whole.down.tracks)[0];
  assert.ok(length(sub(track[0].r, whole.coast.samples.at(-1).r)) < 1e-6, 'the descent begins where the coast ends');
});
