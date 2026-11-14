// src/sound/model.ts: what the flight sounds like, as numbers. The path is physics (inverse-square, the air's absorption,
// the delay and Doppler of distance over the speed of sound, nothing airborne in vacuum) and is held to it here; the
// levels' rules of thumb are only held to behave (finite, continuous, monotonic).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { flownOnce } from '../src/sim/fly.ts';
import {
  absorbed,
  absorption,
  acousticPower,
  breath,
  craft,
  cueShots,
  cutoffAfter,
  gate,
  heardAt,
  loudness,
  mix,
  NEAR,
  PLACE,
  score,
  soundSpeed,
  spl,
  stateAt,
  stepShots,
} from '../src/sound/model.ts';
import { siteFrame } from '../src/world/frames.ts';

const TR = flight.trajectory;
const CRAFT = craft(TR.engine.thrust.value, TR.engine.isp.value, TR.engine.exitArea.value);
const { samples, results } = flownOnce(TR, siteFrame(flight.site), flight.site.seaLevel.value);
const C0 = atmosphere(0).soundSpeed;

/** A flight straight up the site's +Y at the record's heights: enough of a path to hear along. */
const where = (t) => [0, Math.max(0, stateAt(samples, t).altitude), 0];
/** As viewer/ascent.ts has it: up over half a second, and half a second dying at cutoff. */
const burn = (t) => Math.max(0, Math.min(1, t / 0.5, 1 - (t - TR.engine.cutoff.value) / 0.5));
const hearing = (over = {}) => ({
  t: 5,
  rate: 1,
  running: true,
  ears: [150, 2, 0],
  riding: 0,
  craft: CRAFT,
  where,
  burn,
  samples,
  out: { drogue: results.drogueAt, main: results.mainAt },
  duration: results.duration,
  stays: false,
  padHeight: 0,
  place: PLACE,
  ...over,
});
const finite = (o, path = '') => {
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${path}${k} is ${v}`);
    else if (v && typeof v === 'object') finite(v, `${path}${k}.`);
  }
};

test('level falls with the square of the distance: 6.02 dB for each doubling', () => {
  const p = acousticPower(CRAFT.thrust, CRAFT.exhaustSpeed);
  for (const d of [20, 150, 1000, 40_000]) assert.ok(Math.abs(spl(p, d) - spl(p, 2 * d) - 20 * Math.log10(2)) < 1e-9);
  assert.ok(Math.abs(spl(p, 100) - spl(10 * p, 100) + 10) < 1e-9, 'ten times the power is 10 dB');
});

test('a rocket of this thrust is about as loud as rockets are: 150 to 170 dB at 10 m, 125 to 145 dB at 150 m', () => {
  const p = acousticPower(CRAFT.thrust, CRAFT.exhaustSpeed);
  assert.ok(spl(p, 10) > 150 && spl(p, 10) < 170, String(spl(p, 10)));
  assert.ok(spl(p, 150) > 125 && spl(p, 150) < 145, String(spl(p, 150)));
  assert.ok(CRAFT.peak > 18 && CRAFT.peak < 160);
});

test('the air takes more from higher tones and from longer paths, and its table is ISO 9613-2', () => {
  assert.ok(Math.abs(absorption(1000) - 5.0) < 1e-9);
  assert.ok(Math.abs(absorption(4000) - 22.9) < 1e-9);
  let last = 0;
  for (let f = 10; f < 20_000; f *= 1.07) {
    assert.ok(absorption(f) > last, `at ${f} Hz`);
    last = absorption(f);
  }
  for (const f of [50, 500, 5000]) {
    let was = -1;
    for (const d of [0, 10, 150, 3000, 50_000]) {
      assert.ok(absorbed(f, d) > was);
      was = absorbed(f, d);
    }
  }
  let cut = Infinity;
  for (const d of [0, 100, 1000, 5000, 20_000, 100_000, 1e7]) {
    assert.ok(cutoffAfter(d) <= cut && cutoffAfter(d) >= 40, `${d} m`);
    cut = cutoffAfter(d);
  }
  assert.equal(cutoffAfter(0), 16_000);
  assert.ok(cutoffAfter(20_000) < 600, 'kilometres off, only the rumble is left');
});

test('sound arrives distance over the speed of sound late', () => {
  for (const d of [0, 150, 2000, 30_000]) {
    const h = heardAt(
      100,
      [d, 0, 0],
      () => [0, 0, 0],
      () => C0,
    );
    assert.ok(Math.abs(h.delay - d / C0) < 1e-4, `${d} m: ${h.delay}`);
    assert.ok(Math.abs(h.doppler - 1) < 1e-9);
  }
  // from the pad view the roar is 0.4 s behind the flame
  const pad = heardAt(3, [150, 2, 0], where, () => C0);
  assert.ok(Math.abs(pad.delay - 0.44) < 0.03, String(pad.delay));
  // a moving source: the delay is the distance it was at when the sound left, over the speed of sound
  const go = heardAt(60, [150, 2, 0], where, () => C0);
  assert.ok(Math.abs(go.delay - go.distance / C0) < 1e-3);
  assert.ok(Math.abs(go.emitted + go.delay - 60) < 1e-9);
});

test('Doppler: a source going away is heard low by c over c plus its speed, one coming is heard high', () => {
  const v = 100;
  const away = heardAt(
    10,
    [0, 0, 0],
    (t) => [v * t, 0, 0],
    () => C0,
  );
  assert.ok(Math.abs(away.doppler - C0 / (C0 + v)) < 1e-3, String(away.doppler));
  const coming = heardAt(
    10,
    [5000, 0, 0],
    (t) => [v * t, 0, 0],
    () => C0,
  );
  assert.ok(Math.abs(coming.doppler - C0 / (C0 - v)) < 1e-3, String(coming.doppler));
  // faster than sound, going away: still finite and still low
  const fast = heardAt(
    10,
    [0, 0, 0],
    (t) => [900 * Math.max(0, t), 0, 0],
    () => C0,
  );
  assert.ok(fast.doppler > 0 && fast.doppler < 0.5);
});

test('the speed of sound over a path lies between its ends', () => {
  const c = soundSpeed(0, 11_000);
  assert.ok(c < atmosphere(0).soundSpeed && c > atmosphere(11_000).soundSpeed);
  assert.ok(Math.abs(soundSpeed(0, 0) - C0) < 1e-9);
});

test('at liftoff from the pad view it is loud and low; further off it is quieter, duller and later', () => {
  const near = mix(hearing());
  const far = mix(hearing({ ears: [3000, 2, 0], t: 14 }));
  assert.ok(near.engine.gain > 0.35, String(near.engine.gain));
  assert.ok(near.engine.sub > 0.3);
  assert.ok(far.engine.gain < near.engine.gain && far.engine.gain > 0.05);
  assert.ok(far.engine.cutoff < near.engine.cutoff);
  assert.ok(far.heard.delay > 8 && near.heard.delay < 0.6);
  // the crackle, which is high, dies with distance faster than the rumble
  assert.ok(far.engine.crackle / far.engine.gain < near.engine.crackle / near.engine.gain);
  // the flame is seen before it is heard: at T+0.3 the pad view has heard nothing of the engine
  assert.equal(mix(hearing({ t: 0.3 })).engine.gain, 0);
  assert.ok(mix(hearing({ t: 0.3 })).heard.emitted < 0);
});

test('in vacuum there is no airborne sound: only what the structure carries to someone aboard', () => {
  // the engine burning at 150 km (as if): ears beside it in the same vacuum, and ears on the ground
  const high = { where: () => [0, 150_000, 0], burn: () => 1, samples: [{ t: 0, altitude: 150_000, q: 0, mach: 5 }] };
  const beside = mix(hearing({ ...high, ears: [30, 150_000, 0] }));
  assert.equal(beside.engine.gain, 0);
  assert.equal(beside.engine.crackle, 0);
  assert.equal(mix(hearing({ ...high, t: 2000 })).engine.gain, 0, 'nor on the ground under it');
  const aboard = mix(hearing({ ...high, ears: [30, 150_000, 0], riding: 1 }));
  assert.ok(aboard.engine.gain > 0.02, 'the structure still carries it');
  assert.ok(aboard.engine.cutoff < 250, 'and dully');
  assert.equal(aboard.air.gain, 0);
  assert.equal(aboard.place.wind, 0);
  // an event out there is heard aboard and not from beside
  const cue = { at: 0, kind: 'separation' };
  assert.equal(cueShots(cue, 30, 1e-9, 0, 1e-9).length, 0);
  assert.ok(cueShots(cue, 30, 1e-9, 1, 1e-9).length > 0);
});

test('riding with it the engine is duller and steadier than from the pad, and fades as the air thins', () => {
  const at = (t) => mix(hearing({ t, riding: 1, ears: [30, where(t)[1] + 10, 0] }));
  assert.ok(at(5).engine.gain < mix(hearing()).engine.gain);
  assert.ok(at(5).engine.cutoff < 2000);
  assert.ok(at(120).engine.gain < at(5).engine.gain, 'less at 30 km than at the pad');
  assert.ok(at(120).engine.gain > 0, 'but not gone');
  assert.equal(at(TR.engine.cutoff.value + 2).engine.gain, 0, 'and gone at cutoff');
});

test("whoever rides hears the vehicle's own instant, however far behind its sound in the air has fallen", () => {
  const t = 120; // well past Mach 1
  const ears = [30, where(t)[1] + 10, 0];
  assert.ok(mix(hearing({ t, ears, riding: 0 })).heard.delay > 5, 'ears at rest there would wait for it');
  const aboard = mix(hearing({ t, ears, riding: 1 })).heard;
  assert.equal(aboard.emitted, t);
  assert.equal(aboard.delay, 0);
});

test('the air: loudest at the greatest dynamic pressure going up, silent in space, a roar again at entry', () => {
  const at = (t) => mix(hearing({ t, riding: 1, ears: [30, where(t)[1], 0] })).air;
  const maxQ = samples.filter((s) => s.t < TR.engine.cutoff.value).reduce((a, b) => (b.q > a.q ? b : a));
  const entry = samples.filter((s) => s.t > results.apogeeAt).reduce((a, b) => (b.q > a.q ? b : a));
  assert.ok(at(maxQ.t).gain > at(10).gain && at(maxQ.t).gain > at(TR.engine.cutoff.value).gain);
  assert.equal(at(results.apogeeAt).gain, 0);
  assert.ok(at(entry.t).gain > 0.03, String(at(entry.t).gain));
  assert.ok(at(entry.t).gain > at(maxQ.t).gain * 0.5);
  // standing on the ground, none of it is heard
  assert.equal(mix(hearing({ t: maxQ.t })).air.gain, 0);
  // under the main the air flaps
  assert.ok(at(results.mainAt + 20).flutter > 0.5 && at(results.mainAt + 20).gain > 0);
  assert.equal(at(results.duration + 5).gain, 0);
});

test('nothing is NaN or infinite: at no distance, in no air, before, during and long after the flight', () => {
  for (const t of [-100, 0, 0.01, 5, 80, 142, 300, results.apogeeAt, 500, results.mainAt, results.duration, results.duration + 100, 1e5])
    for (const ears of [where(t), [0, 0, 0], [150, 2, 0], [0, 1e6, 0], [1e7, 0, 0]])
      for (const riding of [0, 0.5, 1]) finite(mix(hearing({ t, ears, riding })));
  finite(mix(hearing({ samples: [], craft: { thrust: 0, exhaustSpeed: 0, peak: 50 } })));
  finite(mix(hearing({ samples: [{ t: 0, altitude: 1e9, q: 0, mach: 0 }], where: () => [0, 1e9, 0] })));
  assert.equal(spl(0, 0), Number.NEGATIVE_INFINITY);
  assert.equal(loudness(Number.NEGATIVE_INFINITY), 0);
  assert.equal(loudness(Number.NaN), 0);
  assert.ok(Number.isFinite(spl(1, 0)) && spl(1, 0) === spl(1, NEAR));
});

test('nothing steps: through every change of phase each gain moves a little at a time', () => {
  for (const riding of [0, 1]) {
    let was = null;
    const step = 0.05;
    for (let t = -2; t < results.duration + 20; t += step) {
      const ears = riding ? [30, where(t)[1] + 10, 0] : [150, 2, 0];
      const m = mix(hearing({ t, ears, riding }));
      const now = [m.engine.gain, m.engine.sub, m.engine.crackle, m.air.gain, m.jets, m.place.wind, m.place.water, m.place.hum];
      // (the engine's own start and stop are quick, as they were: half a second each, and a gain goes as the fourth root of the power)
      const te = m.heard.emitted;
      const lit = [0, TR.engine.cutoff.value].some((e) => te > e - 0.1 && te < e + 0.7);
      const most = lit ? 0.3 : 0.09;
      if (was)
        now.forEach((v, i) =>
          assert.ok(Math.abs(v - was[i]) < most, `gain ${i} jumps ${was[i]} to ${v} at T+${t.toFixed(2)}, riding ${riding}`),
        );
      was = now;
    }
  }
});

test('the clock: stopped or backwards the flight is silent, fast it is a bed, and the place goes on', () => {
  assert.equal(gate(false, 1), 0);
  assert.equal(gate(true, -1), 0);
  assert.equal(gate(true, 1), 1);
  assert.equal(gate(true, 2), 1);
  assert.ok(gate(true, 10) < 0.5 && gate(true, 10) > 0);
  assert.equal(gate(true, 3600), 0);
  const stopped = mix(hearing({ running: false, t: 0 }));
  assert.equal(stopped.flight, 0);
  assert.ok(stopped.place.wind > 0 && stopped.place.water > 0 && stopped.place.hum > 0);
});

test('a site inland has no surf and no sea: nothing is heard at Tyuratam before an engine is lit but its wind and hum', async () => {
  // (every Soviet flight so far leaves from this site: its bed is theirs)
  const site = Object.values(await import('../missions/ussr/vostok/sites/site-1.ts')).find((v) => v?.quiet);
  assert.ok(site, 'Site 1 says what its place sounds like, and does not fall back on a site by the sea');
  const steppe = site.quiet;
  assert.equal(steppe.surf, 0, 'no surf on the steppe');
  assert.equal(steppe.sea, 0, 'and a flight from here comes down on land');
  // standing on the pad a minute before liftoff: no engine, no air, no water; the wind and the hum as on any ground
  const before = mix(hearing({ t: -60, running: true, ears: [150, 2, 0], place: steppe, burn: () => 0 }));
  assert.equal(before.engine.gain, 0);
  assert.equal(before.place.water, 0);
  assert.ok(before.place.wind > 0 && before.place.hum > 0);
  // and one that has come down there and stayed is on land: no sea round it, where the Cape's flights come down in theirs
  const down = { t: results.duration + 60, stays: true, riding: 1, ears: [0, 2, 0] };
  assert.equal(mix(hearing({ ...down, place: steppe })).place.water, 0);
  assert.ok(mix(hearing(down)).place.water > 0, 'Freedom 7 is in the sea');
});

test('the place is heard on its ground and not from far above or far away', () => {
  const at = (ears) => mix(hearing({ t: 0, running: false, ears })).place;
  assert.ok(at([0, 2, 0]).water > at([0, 3000, 0]).water * 10);
  assert.equal(at([200_000, 2, 0]).wind, 0);
  assert.equal(at([0, 150_000, 0]).wind, 0);
});

test("the events are the record's own, in order, and what has not happened is not among them", () => {
  const plan = {
    drops: flight.flies.drops.map((d) => ({ at: d.at, on: d.on })),
    retro: { fires: TR.retro.fires.map((f) => f.value), burn: TR.retro.burn.value, thrust: TR.retro.thrust.value },
    out: { drogue: results.drogueAt, main: results.mainAt },
    duration: results.duration,
  };
  const cues = score(plan);
  assert.deepEqual(
    cues.map((c) => c.kind),
    ['ignition', 'tower', 'separation', 'retro', 'retro', 'retro', 'release', 'mortar', 'canopy', 'splash'],
  );
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].at >= cues[i - 1].at);
  assert.deepEqual(
    cues.filter((c) => c.kind === 'retro').map((c) => c.at),
    TR.retro.fires.map((f) => f.value),
  );
  const early = score({ ...plan, retro: null, out: { drogue: Infinity, main: Infinity }, duration: Infinity });
  assert.ok(!early.some((c) => ['retro', 'mortar', 'canopy', 'splash'].includes(c.kind)));
  // every one of them can be played, aboard and from beside in thick air, and is finite
  for (const c of cues)
    for (const riding of [0, 1]) {
      const shots = cueShots(c, 30, 1, riding, 1);
      assert.ok(shots.length > 0, c.kind);
      for (const s of shots) {
        finite(s);
        assert.ok(s.gain > 0 && s.gain <= 1.4 && s.from >= 20 && s.to >= 20 && s.decay > 0);
      }
    }
  // further off is quieter
  const g = (d) => Math.max(...cueShots(cues[0], d, 1, 0, 1).map((s) => s.gain));
  assert.ok(g(150) > g(1500));
});

test('the walk is quiet: a step under a landing, a landing louder the further it fell, a breath that comes and goes', () => {
  const most = (shots) => Math.max(...shots.map((s) => s.gain));
  assert.ok(most(stepShots('step', 1.4)) < 0.08);
  assert.ok(most(stepShots('step', 4)) > most(stepShots('step', 1)));
  assert.ok(most(stepShots('landing', 0, 3)) > most(stepShots('landing', 0, 0.4)));
  assert.ok(most(stepShots('landing', 0, 100)) <= 0.4);
  assert.equal(stepShots('rung', 0.6).length, 1);
  for (const s of [...stepShots('step', 1.4), ...stepShots('rung', 0.6), ...stepShots('landing', 1, 2)]) assert.equal(s.bus, 'walk');
  assert.equal(breath(0).gain, 0);
  assert.ok(breath(0.2).gain > 0 && breath(0.7).gain > 0 && breath(0.2).gain < 0.02);
  assert.ok(Math.abs(breath(0.46).gain) < 1e-12 && Math.abs(breath(0.97).gain) < 1e-12);
  assert.ok(breath(1.2).gain === breath(0.2).gain);
});

test('the jets hiss only while one fires, and only for someone aboard', () => {
  const firing = [{ t: 0, altitude: 100_000, q: 0, mach: 4, rcs: { firing: [0, 107, 0] } }];
  const high = { where: () => [0, 100_000, 0], burn: () => 0, ears: [3, 100_000, 0] };
  assert.ok(mix(hearing({ ...high, samples: firing, riding: 1 })).jets > 0.01);
  assert.equal(mix(hearing({ ...high, samples: firing, riding: 0 })).jets, 0);
  assert.equal(mix(hearing({ ...high, samples: [{ ...firing[0], rcs: { firing: [0, 0, 0] } }], riding: 1 })).jets, 0);
  assert.equal(
    mix(hearing({ ...high, samples: [{ t: 0, altitude: 100_000, q: 0, mach: 4 }], riding: 1 })).jets,
    0,
    'a record with no jets',
  );
});
