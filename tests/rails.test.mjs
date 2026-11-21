// src/sim/rails.ts: a coast flown on rails, for a clock faster than an hour a second. It must be the coast the fixed-step
// simulator flies (orbital.ts `flyOrbit`), end exactly on the instant asked for, come out the same flown in one span or in a
// fast clock's frames, and say when the clock may run on and where it must stop. And a run's quiet coast kept by how fast
// its motion changes must read, between the samples it kept, as the run that kept every step.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { airAt } from '../src/sim/air.ts';
import { coastOf, flyOrbit, KEPT, shipPush, solarAt } from '../src/sim/orbital.ts';
import { apart, coast, coastBy, due, KEPT_TURN, onRails, RAILS_FLOOR, stretches } from '../src/sim/rails.ts';
import * as rails from '../src/sim/rails.ts';
import { EARTH_GRAVITY, fieldOf } from '../src/sim/core/gravity.ts';
import { acceleration } from '../src/sim/core/rk4.ts';
import { EARTH } from '../src/world/bodies.ts';
import { Clock, COAST_RATES, DEEPEST, RATES } from '../src/world/clock.ts';
import { attend, between, either, filled, orbitalFlown, orbitalRecord, shownAt } from '../src/sim/run.ts';
import { flyWhole, recordSamples } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { sunPosition } from '../src/world/ephemeris.ts';
import { length, siteFrame, sub } from '../src/world/frames.ts';
import { julianDate, terrestrialTime } from '../src/world/time.ts';

const frame = frameOf(flight);
const sea = flight.site.seaLevel.value;
const flown = flyOrbit(flight.plan, siteFrame(flight.site), frame, sea);
// (the coast as flown, before the braking attitude is taken: the spacecraft falling round under J2 and the air's drag)
const quiet = flown.samples.filter((s) => s.t < coastOf(flight.plan).on - 600);
const first = quiet[0];
const last = quiet.at(-1);
const drag = (t, r, v) => {
  const a = airAt(frame, r, v, t, sea);
  return shipPush(flight.plan, t, a.wind, a.altitude, null, solarAt(frame, r, t, a.altitude));
};

test('on rails the coast is the one the simulator flies: within 10 cm and a tenth of a millimetre a second over most of a revolution', () => {
  assert.ok(last.t - first.t > 3000, `${(last.t - first.t).toFixed(0)} s of coast`);
  const railed = coast(first, first.t, last.t, undefined, drag);
  const off = apart(railed, last);
  console.log(
    `# ${(last.t - first.t).toFixed(0)} s on rails in ${railed.steps} steps: ${off.r.toFixed(3)} m and ${(off.v * 1000).toFixed(3)} mm/s from the fixed-step run`,
  );
  assert.ok(off.r < 0.1 && off.v < 1e-4, `${off.r} m, ${off.v} m/s`);
  assert.ok(railed.steps < 200, `${railed.steps} steps`);
});

test('it ends exactly on the instant asked for, and flown in a fast clock’s frames it is the same coast', () => {
  const t1 = first.t + 1234.5;
  const one = coast(first, first.t, t1, undefined, drag);
  // (at 10,000 times a frame of a sixtieth of a second is 167 s; at 100,000, 1,667 s)
  for (const span of [167, 1667]) {
    const framed = coastBy(first, first.t, t1, span, undefined, drag);
    const off = apart(one, framed);
    assert.ok(off.r < 0.05 && off.v < 1e-4, `in frames of ${span} s: ${off.r} m, ${off.v} m/s`);
  }
  // and back again to where it began
  const back = coast(one, t1, first.t, undefined, drag);
  assert.ok(apart(back, first).r < 0.5, `there and back: ${apart(back, first).r} m`);
  // a span of nothing is no step
  assert.equal(coast(first, 10, 10).steps, 0);
});

test('the clock is held at the next instant to live, and let go only while there is nothing to do but fall round', () => {
  assert.equal(due([10, 50, Infinity, 30], 20), 30);
  assert.ok(Number.isNaN(due([10, Infinity], 20)), 'nothing to come: NaN');
  assert.ok(onRails({ altitude: 200_000, burning: [] }));
  assert.ok(!onRails({ altitude: 200_000, burning: [{ engine: 'x', thrust: 1 }] }), 'not while an engine burns');
  assert.ok(!onRails({ altitude: RAILS_FLOOR - 1, burning: [] }), 'not in the air');
  assert.ok(!onRails({ altitude: 200_000, burning: [] }, true), 'not with something asked for');
});

// ---- a quiet coast kept by how fast its motion changes (orbital.ts `flyOrbit`, sim/run.ts) ----

/** The same run with every sample that falls due kept, as until November 2026. */
const every = (make) => {
  KEPT.quiet = false;
  try {
    return make();
  } finally {
    KEPT.quiet = true;
  }
};
const kept = flyOrbit(flight.plan, siteFrame(flight.site), frame, sea, 1);
const whole = every(() => flyOrbit(flight.plan, siteFrame(flight.site), frame, sea, 1));

test('a quiet coast keeps the samples its motion changed between, each one of those every step would have kept, and gives the same results', () => {
  assert.deepEqual(kept.results, whole.results, 'the results are the run’s own steps’: what is kept moves none');
  const at = new Map(whole.samples.map((s) => [s.t, s]));
  for (const s of kept.samples) {
    const was = at.get(s.t);
    assert.ok(was, `a sample at ${s.t} that the whole run did not keep`);
    const { rails: _, ...mine } = s;
    assert.deepEqual(mine, was);
  }
  console.log(`# ${whole.samples.length} samples kept at every step, ${kept.samples.length} by the motion's change`);
  // (one revolution, most of it within sight of something happening: a flight of days is held to its budget in tests/longrun.test.mjs)
  assert.ok(
    kept.samples.filter((s) => s.rails).length >= 5 && kept.samples.length < whole.samples.length - 100,
    `${kept.samples.length} of ${whole.samples.length}`,
  );
  // every stretch let go is a quiet one: before the burn, and no further round than the velocity turns by KEPT_TURN (and a step)
  const on = coastOf(flight.plan).on;
  for (let i = 0; i + 1 < kept.samples.length; i++) {
    const [a, b] = [kept.samples[i], kept.samples[i + 1]];
    if (!a.rails) {
      assert.ok(b.t - a.t <= 10 + 1e-9, `${b.t - a.t} s between samples with nothing to fly them again, at ${a.t}`);
      continue;
    }
    assert.ok(b.t <= on, `a stretch let go to ${b.t}, past the burn at ${on}`);
    assert.ok(
      length(sub(b.v, a.v)) < (KEPT_TURN + 0.02) * length(a.v),
      `the velocity changed by ${length(sub(b.v, a.v)) / length(a.v)} of itself`,
    );
  }
});

test('between the samples kept the run reads as the run that kept every step: within 5 mm and 0.01 mm/s, and to the bit where one was kept', () => {
  let worst = { r: 0, v: 0, at: 0 };
  for (const s of whole.samples) {
    const got = between(kept.samples, s.t);
    const off = apart(got, s);
    if (off.r > worst.r) worst = { ...off, at: s.t };
    assert.ok(off.r < 5e-3 && off.v < 1e-5, `at ${s.t}: ${off.r} m, ${off.v} m/s`);
    const shown = shownAt(kept.samples, s.t);
    assert.equal(shown.t, s.t);
    for (const k of ['altitude', 'latitude', 'longitude', 'speed', 'groundSpeed', 'g', 'q', 'mach', 'sunlit'])
      assert.ok(Math.abs(shown[k] - s[k]) <= 1e-6 * Math.max(1, Math.abs(s[k])), `${k} at ${s.t}: ${shown[k]} for ${s[k]}`);
    assert.equal(shown.phase, s.phase);
  }
  console.log(`# the worst of ${whole.samples.length} instants: ${(worst.r * 1000).toFixed(3)} mm at ${worst.at} s`);
  // (nothing jumps as the clock passes a kept sample: either side of one, a millisecond apart, 16 m of flight and no more)
  const stretch = kept.samples.findIndex((s, i) => i > 0 && s.rails && kept.samples[i - 1].rails);
  const t = kept.samples[stretch].t;
  const step = apart(between(kept.samples, t - 5e-4), between(kept.samples, t + 5e-4));
  assert.ok(Math.abs(step.r - length(kept.samples[stretch].v) * 1e-3) < 1e-4, `${step.r} m across a kept sample in a millisecond`);
});

test('a stretch flown again is the same whatever was asked before, and is its ends exactly', () => {
  const again = stretches();
  const i = kept.samples.findIndex((s) => s.rails);
  const [a, b] = [kept.samples[i], kept.samples[i + 1]];
  const mid = (a.t + b.t) / 2;
  const first = again(a, b, mid);
  for (const t of [b.t - 1, a.t + 1, mid + 20, mid - 20]) again(a, b, t);
  // (and with other stretches flown between, more than are held)
  for (let k = i + 1; k < i + 12 && k + 1 < kept.samples.length; k++) again(kept.samples[k], kept.samples[k + 1], kept.samples[k].t + 1);
  assert.deepEqual(again(a, b, mid), first);
  assert.deepEqual(again(a, b, a.t), { r: a.r, v: a.v });
  assert.deepEqual(again(a, b, b.t), { r: b.r, v: b.v });
  const near = again(a, b, b.t - 1e-6);
  assert.ok(apart(near, b).r < 1e-2, `a microsecond before its end: ${apart(near, b).r} m from it`);
});

test('the record’s run as the scene shows it is the same between its samples, at its centre of mass and at the point drawn by', () => {
  const site = siteFrame(flight.site);
  const jd = julianDate(flight.launch);
  const sunAt = (t) => sunPosition(terrestrialTime(jd + t / 86_400));
  const centre = (flight.flies?.datum ?? 0) + (flight.plan.record?.centre?.value ?? 0);
  const run = orbitalRecord(flight);
  const flown = orbitalFlown(flight);
  const dense = every(() => flyWhole(flight.plan, site, frame, sea, undefined, 1));
  const all = recordSamples(dense.plan ?? flight.plan, dense, frame, centre, sunAt);
  assert.equal(dense.coast.samples.at(-1).t, flown.coast.samples.at(-1).t, 'the same flight, to its end');
  assert.ok(run.samples.length < all.length - 100, `${run.samples.length} of ${all.length}`);
  let worst = 0;
  for (const s of all) {
    const c = between(run.samples, s.t, (x) => x.centre);
    const off = length(sub(c.r, s.centre));
    worst = Math.max(worst, off);
    assert.ok(off < 5e-3, `the centre of mass at ${s.t}: ${off} m`);
    assert.ok(length(sub(between(run.samples, s.t).r, s.r)) < 2e-2, `the point drawn by at ${s.t}`);
    const [a, b] = either(run.samples, s.t);
    if (!a.rails || a.t === s.t || b.t === s.t) continue;
    const shown = run.at(s.t);
    assert.equal(shown.t, s.t);
    for (const k of ['altitude', 'latitude', 'longitude', 'speed', 'groundSpeed', 'range', 'mass'])
      assert.ok(Math.abs(shown[k] - s[k]) <= 1e-6 * Math.max(1, Math.abs(s[k])), `${k} at ${s.t}: ${shown[k]} for ${s[k]}`);
    const turned = 2 * Math.acos(Math.min(1, Math.abs(shown.attitude.reduce((sum, x, j) => sum + x * s.attitude[j], 0))));
    assert.ok(turned < 1e-3, `the attitude at ${s.t}: ${turned} rad from the whole run's`);
  }
  console.log(
    `# ${all.length} samples of the record's run kept as ${run.samples.length}; the centre of mass within ${(worst * 1000).toFixed(3)} mm between them`,
  );
  // what draws a line through the samples has them as close as ever
  const line = filled(run.samples, 10);
  for (let i = 1; i < line.length; i++)
    assert.ok(line[i].t - line[i - 1].t <= 10 + 1e-9, `${line[i].t - line[i - 1].t} s apart at ${line[i].t}`);
  // and what is written on the samples at an instant of its own has samples round it
  const i = run.samples.findIndex((s) => s.rails && run.samples[run.samples.indexOf(s) + 1].t - s.t > 60);
  const copy = run.samples.map((s) => ({ ...s }));
  const at = copy[i].t + 31;
  attend(copy, [at, at + 4]);
  const [a, b] = either(copy, at);
  assert.ok(a.t <= at && at - a.t <= 10 && b.t - (at + 4) <= 10 && b.t >= at + 4 - 10, `${a.t} and ${b.t} round ${at}`);
  const n = copy.length;
  attend(copy, [at, at + 4]);
  assert.equal(copy.length, n, 'done again, nothing more');
});

// ---- the deep coast's pace (sim/rails.ts `railsRate`), the live vehicle's railway (`Railway`), and a warp landing on its instant

test('how fast a coast on rails may go follows from its distance from the body it is nearest and from what is due, not from the flight', () => {
  const { railsRate, bodiesAt, EASE } = rails;
  const earth = (km) => railsRate([{ r: [km * 1000, 0, 0], gm: EARTH.gm.value }]);
  const leo = earth(6_578);
  assert.ok(leo >= 100_000 && leo < 120_000, `a low orbit: ${leo.toFixed(0)} times, about the 100,000 every coast always had`);
  assert.equal(earth(1_000), COAST_RATES.at(-1), 'never less than the coast always had (an orbit quicker than any about the Earth)');
  const out = earth(30_000);
  assert.ok(out > 0.9e6 && out < 1.2e6, `30,000 km out: ${out.toFixed(0)} times, a million`);
  assert.equal(earth(200_000), DEEPEST, 'from 140,000 km on, ten million times');
  // by the Moon the Moon's orbit is the quick one: 1,850 km from its centre, 384,000 from the Earth's
  const moon = railsRate(bodiesAt([384e6, 0, 0], 0, () => ({ r: [384e6 - 1.85e6, 0, 0] })));
  assert.ok(moon >= 100_000 && moon < 200_000, `in a low lunar orbit: ${moon.toFixed(0)} times`);
  // and what is due: never less than EASE seconds of ours away, down to an hour a second
  assert.equal(railsRate(bodiesAt([2e8, 0, 0], 0, null), 1000), 1000 / EASE);
  assert.equal(railsRate(bodiesAt([2e8, 0, 0], 0, null), 100), RATES.at(-1));
  assert.equal(railsRate(bodiesAt([2e8, 0, 0], 0, null), 1e12), DEEPEST);
});

test('a railway is the coast `coast` flies, step for step to the last bit, however it is asked; and it ends where its floor is met', () => {
  const field = fieldOf(EARTH_GRAVITY);
  const accel = (t, r, v) => acceleration(field(r, t), drag(t, r, v));
  const t1 = first.t + 3000;
  const one = coast(first, first.t, t1, undefined, drag);
  const way = new rails.Railway(first, t1, accel);
  assert.deepEqual(way.at(t1), { r: one.r, v: one.v }, 'at its end, the coast to it to the bit');
  // asked a frame at a time (a sixtieth of a second at 1,000 times) and at once: the same railway
  const framed = new rails.Railway(first, t1, accel);
  for (let t = first.t; t < t1; t += 16.7) framed.at(t);
  const mid = first.t + 1234.5;
  assert.deepEqual(framed.at(mid), way.at(mid), 'the same state at the same instant, whatever was asked before');
  assert.deepEqual(framed.at(t1), way.at(t1));
  // between its steps, the coast flown there
  const off = apart(way.at(mid), coast(first, first.t, mid, undefined, drag));
  assert.ok(off.r < 0.01 && off.v < 1e-5, `between its steps: ${off.r} m, ${off.v} m/s`);
  // a floor met: it ends there, to a millisecond
  const floored = new rails.Railway(first, t1, accel, (t) => first.t + 500.25 - t);
  floored.at(t1);
  assert.ok(Math.abs(floored.end - (first.t + 500.25)) < 1e-3, `ends at ${floored.end - first.t} s`);
  assert.deepEqual(floored.at(t1), floored.at(floored.end), 'and goes no further');
});

test('a warp of days lands exactly on its instant at an hour a second, easing into it from a million times, and stops for anything due on the way', () => {
  const { railsRate, bodiesAt } = rails;
  // (Apollo 8's coast from its injection to its pass of the Moon, 200,000 km out: the clock as the deck drives it, each frame)
  const fly = (clock, held) => {
    let frames = 0;
    let fastest = 0;
    let leap = 0;
    while (clock.warp && frames < 100_000) {
      const stop = Math.min(clock.warp.t, held ?? Infinity);
      clock.allow(railsRate(bodiesAt([2e8, 0, 0], clock.t, null), stop - clock.t));
      clock.hold(held ?? Number.NaN);
      const left = stop - clock.t;
      clock.advance(1 / 60);
      frames++;
      fastest = Math.max(fastest, clock.rate);
      // (no frame takes more than a fifteenth of what is left while it eases: EASE is a quarter of a second, 15 frames)
      if (clock.warp && clock.rate > RATES.at(-1)) leap = Math.max(leap, (stop - clock.t) / left);
    }
    return { frames, fastest, leap };
  };
  const clock = new Clock('1968-12-21T12:51:00Z');
  clock.seek(10_500);
  clock.allow(railsRate(bodiesAt([2e8, 0, 0], 10_500, null), 271_256.3 - 10_500));
  clock.warpTo(271_256.3, 'the Moon');
  assert.ok(clock.running, 'a warp runs the clock');
  const went = fly(clock);
  assert.equal(clock.t, 271_256.3, 'it stops on the instant, not a frame past it');
  assert.equal(clock.rate, 1, 'at real time');
  assert.equal(clock.warp, null, 'and the warp is over');
  console.log(
    `# 72 hours in ${went.frames} frames (${(went.frames / 60).toFixed(2)} s at 60 a second), up to ${went.fastest.toFixed(0)} times`,
  );
  assert.ok(went.frames < 180, `in under three seconds: ${went.frames} frames`);
  assert.ok(went.fastest > 1e6, `at up to ${went.fastest.toFixed(0)} times`);
  // something due on the way: the warp stops on it
  const again = new Clock('1968-12-21T12:51:00Z');
  again.seek(10_500);
  again.allow(DEEPEST);
  again.warpTo(271_256.3, 'the Moon');
  fly(again, 100_000);
  assert.equal(again.t, 100_000, 'stopped on what was due');
  assert.equal(again.warp, null);
  // a hand on the controls: over at once, at real time
  const hand = new Clock('1968-12-21T12:51:00Z');
  hand.allow(DEEPEST);
  hand.warpTo(200_000, 'a time');
  hand.advance(1 / 60);
  hand.endWarp();
  assert.equal(hand.rate, 1);
  assert.equal(hand.warp, null);
});
