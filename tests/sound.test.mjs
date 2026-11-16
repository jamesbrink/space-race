// src/sound/model.ts: what the flight sounds like, as numbers. The path is physics (inverse-square, the air's absorption,
// the delay and Doppler of distance over the speed of sound, nothing airborne in vacuum) and is held to it here; the
// levels' rules of thumb are only held to behave (finite, continuous, monotonic).
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { TYURATAM } from '../missions/ussr/places/tyuratam/place.ts';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { ballisticOf, flownOnce } from '../src/sim/fly.ts';
import { G0 } from '../src/world/bodies.ts';
import { liftoffEngine } from '../src/sim/staged.ts';
import { orbitalRecord } from '../src/viewer/ascent.ts';
import {
  absorbed,
  absorption,
  acousticPower,
  breath,
  craft,
  cueShots,
  cutoffAfter,
  engineVoice,
  gate,
  heardAt,
  loudness,
  MACHINES,
  mix,
  NEAR,
  score,
  dropCue,
  soundSpeed,
  spl,
  stateAt,
  stepShots,
  treadOf,
  tyreVoice,
  WORK_VOICES,
  Works,
} from '../src/sound/model.ts';
import { siteFrame } from '../src/world/frames.ts';
import { BALLISTIC } from './ballistic.mjs';

/** What a ballistic flight is heard from: its engine, its record's run, a path straight up the site's +Y at the run's heights. */
function heard(f) {
  const B = ballisticOf(f.plan);
  const CRAFT = craft(B.engine.thrust.seaLevel.value, B.engine.isp.seaLevel.value, B.engine.exitArea.value);
  const { samples, results } = flownOnce(f.plan, siteFrame(f.site), f.site.seaLevel.value);
  /** A flight straight up the site's +Y at the record's heights: enough of a path to hear along. */
  const where = (t) => [0, Math.max(0, stateAt(samples, t).altitude), 0];
  /** As viewer/ascent.ts has it: up over half a second, and half a second dying at cutoff. */
  const burn = (t) => Math.max(0, Math.min(1, t / 0.5, 1 - (t - B.cutoff) / 0.5));
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
    place: f.site.place.quiet,
    ...over,
  });
  return { B, CRAFT, samples, results, where, burn, hearing };
}
// (what is the model's alone is held on Freedom 7's; what a flight's own run is heard as is held for every ballistic flight, below)
const { CRAFT, results, where, hearing } = heard(flight);
const C0 = atmosphere(0).soundSpeed;
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
  const steppe = TYURATAM.quiet;
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

for (const each of BALLISTIC) {
  const name = `${each.designation} (${each.callsign})`;
  const { B, samples, results, where, hearing } = heard(each);
  /** The retrorockets' instants, as the plan's sequence has them: the first at the record's, each other so long after it. */
  const fires = B.retroWaits.map((w) => B.retroAt + w);

  test(`${name}: at liftoff from the pad view it is loud and low; further off it is quieter, duller and later`, () => {
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
  test(`${name}: riding with it the engine is duller and steadier than from the pad, and fades as the air thins`, () => {
    const at = (t) => mix(hearing({ t, riding: 1, ears: [30, where(t)[1] + 10, 0] }));
    assert.ok(at(5).engine.gain < mix(hearing()).engine.gain);
    assert.ok(at(5).engine.cutoff < 2000);
    assert.ok(at(120).engine.gain < at(5).engine.gain, 'less at 30 km than at the pad');
    assert.ok(at(120).engine.gain > 0, 'but not gone');
    assert.equal(at(B.cutoff + 2).engine.gain, 0, 'and gone at cutoff');
  });
  test(`${name}: whoever rides hears the vehicle's own instant, however far behind its sound in the air has fallen`, () => {
    const t = 120; // well past Mach 1
    const ears = [30, where(t)[1] + 10, 0];
    assert.ok(mix(hearing({ t, ears, riding: 0 })).heard.delay > 5, 'ears at rest there would wait for it');
    const aboard = mix(hearing({ t, ears, riding: 1 })).heard;
    assert.equal(aboard.emitted, t);
    assert.equal(aboard.delay, 0);
  });
  test(`${name}: the air: loudest at the greatest dynamic pressure going up, silent in space, a roar again at entry`, () => {
    const at = (t) => mix(hearing({ t, riding: 1, ears: [30, where(t)[1], 0] })).air;
    const maxQ = samples.filter((s) => s.t < B.cutoff).reduce((a, b) => (b.q > a.q ? b : a));
    const entry = samples.filter((s) => s.t > results.apogeeAt).reduce((a, b) => (b.q > a.q ? b : a));
    assert.ok(at(maxQ.t).gain > at(10).gain && at(maxQ.t).gain > at(B.cutoff).gain);
    assert.equal(at(results.apogeeAt).gain, 0);
    assert.ok(at(entry.t).gain > 0.03, String(at(entry.t).gain));
    assert.ok(at(entry.t).gain > at(maxQ.t).gain * 0.5);
    // standing on the ground, none of it is heard
    assert.equal(mix(hearing({ t: maxQ.t })).air.gain, 0);
    // under the main the air flaps
    assert.ok(at(results.mainAt + 20).flutter > 0.5 && at(results.mainAt + 20).gain > 0);
    assert.equal(at(results.duration + 5).gain, 0);
  });
  test(`${name}: nothing is NaN or infinite: at no distance, in no air, before, during and long after the flight`, () => {
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
  test(`${name}: nothing steps: through every change of phase each gain moves a little at a time`, () => {
    for (const riding of [0, 1]) {
      let was = null;
      const step = 0.05;
      for (let t = -2; t < results.duration + 20; t += step) {
        const ears = riding ? [30, where(t)[1] + 10, 0] : [150, 2, 0];
        const m = mix(hearing({ t, ears, riding }));
        const now = [m.engine.gain, m.engine.sub, m.engine.crackle, m.air.gain, m.jets, m.place.wind, m.place.water, m.place.hum];
        // (the engine's own start and stop are quick, as they were: half a second each, and a gain goes as the fourth root of the power)
        const te = m.heard.emitted;
        const lit = [0, B.cutoff].some((e) => te > e - 0.1 && te < e + 0.7);
        const most = lit ? 0.3 : 0.09;
        if (was)
          now.forEach((v, i) =>
            assert.ok(Math.abs(v - was[i]) < most, `gain ${i} jumps ${was[i]} to ${v} at T+${t.toFixed(2)}, riding ${riding}`),
          );
        was = now;
      }
    }
  });
  test(`${name}: the events are the record's own, in order, and what has not happened is not among them`, () => {
    const plan = {
      drops: each.flies.drops.map((d) => ({ at: d.at, cue: dropCue(each.plan, d.on) })),
      retro: { fires, burn: B.motors[0].burn.value, thrust: B.motors[0].thrust.vacuum.value },
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
      fires,
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
}

// A flight into orbit is heard from its record's run as the scene shows it (viewer/ascent.ts `orbitalRecord`), the engines lit
// on the ground as one (sim/staged.ts `liftoffEngine`), as sound/index.ts hears it.
const ORBITERS = (
  await Promise.all(
    globSync('missions/*/*/flights/*/flight.ts', { cwd: join(import.meta.dirname, '..') }).map(
      async (f) => (await import(pathToFileURL(join(import.meta.dirname, '..', f)).href)).flight,
    ),
  )
).filter((f) => f.plan?.kind === 'orbital' && f.site);
for (const each of ORBITERS) {
  const run = orbitalRecord(each);
  const lit = liftoffEngine(each.plan);
  const samples = run.samples;
  const where = (t) => [0, Math.max(0, stateAt(samples, t).altitude), 0];
  const burn = (t) => {
    const s = stateAt(samples, t);
    return t < 0 ? 0 : Math.min(1, t / 0.5) * (s.burning?.length ? 1 : 0);
  };
  const hearing = (over = {}) => ({
    t: 5,
    rate: 1,
    running: true,
    ears: [150, 2, 0],
    riding: 0,
    craft: craft(lit.thrust, lit.exhaustSpeed / G0, lit.exitArea),
    where,
    burn,
    samples,
    out: { drogue: Infinity, main: Infinity },
    duration: run.duration,
    stays: false,
    padHeight: 0,
    place: each.site.place.quiet,
    ...over,
  });

  test(`${each.designation}: nothing is NaN or infinite, before, going up, in orbit and coming down`, () => {
    for (const t of [-100, 0, 0.01, 5, 60, 119.5, 300, 676, 3000, run.duration - 600, run.duration, run.duration + 100])
      for (const ears of [where(t), [150, 2, 0], [0, 1e6, 0]]) for (const riding of [0, 1]) finite(mix(hearing({ t, ears, riding })));
  });

  test(`${each.designation}: the air is loudest going up at the greatest dynamic pressure, silent in orbit`, () => {
    const at = (t) => mix(hearing({ t, riding: 1, ears: [30, where(t)[1], 0] })).air;
    const up = samples.filter((s) => s.t < 300);
    const maxQ = up.reduce((a, b) => (b.q > a.q ? b : a));
    assert.ok(at(maxQ.t).gain > at(10).gain && at(maxQ.t).gain > 0, String(at(maxQ.t).gain));
    assert.equal(at(3000).gain, 0, 'nothing in orbit');
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// On the ground (issues #2 and #4): a driven vehicle, and the machines that move a site's parts (model.ts `Works`).

const HEAR = 0.05; // (index.ts sets the engine every 50 ms)
const ENGINE = { fuel: 'petrol', cylinders: 6, idle: 450, most: 4000, confidence: 'estimated', source: 'a test' };
/** `seconds` of hearings of a `Works`, each source given by `at(t)` (null: not posed), from `ears`: what each hearing gave. */
function hearings(sources, seconds, ears = [5, 1.7, 0], works = new Works(), land = 'concrete') {
  const out = [];
  for (let t = 0; t <= seconds + 1e-9; t += HEAR) {
    const now = sources.map((s) => s(t)).filter(Boolean);
    const { voices, shots } = works.hear(now, ears, HEAR, land);
    out.push({ t, voices, shots, playing: works.playing });
  }
  return out;
}
const loud = (h) => h.voices.reduce((sum, v) => sum + (v?.gain ?? 0), 0);

test('seated at the wheel, the walker makes no footfalls and no breath and says it is driving; out again, the footfalls come back', async () => {
  globalThis.window ??= { addEventListener() {}, setTimeout, clearTimeout };
  globalThis.document ??= { addEventListener() {}, pointerLockElement: null, hasFocus: () => true, exitPointerLock() {} };
  globalThis.matchMedia ??= () => ({ matches: false });
  const THREE = await import('three');
  const { Walker } = await import('../src/viewer/onfoot/walk.ts');
  const root = new THREE.Scene();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 400), new THREE.MeshBasicMaterial({ name: 'concrete-joint' }));
  slab.position.y = -0.5;
  root.add(slab);
  root.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1000);
  const canvas = { addEventListener() {}, setPointerCapture() {}, requestPointerLock() {} };
  const walker = new Walker(canvas, camera, {
    solids: () => [root],
    ground: () => -0.45,
    reach: () => 500,
    leave() {},
    act() {},
    viewed() {},
    locked() {},
  });
  const heard = { footfalls: 0, breaths: 0, driving: [], ended: 0 };
  walker.sounds = {
    footfall: () => heard.footfalls++,
    breath: () => heard.breaths++,
    driving: (d) => (d ? heard.driving.push(d) : heard.ended++),
  };
  walker.start(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), 1.7, 1.85);
  walker.stick(0, 1);
  for (let i = 0; i < 120; i++) walker.update(1 / 60);
  assert.ok(heard.footfalls > 2, `walking two seconds: ${heard.footfalls} footfalls`);
  // a seat that carries him along at 8 m/s, as a vehicle's does (drive.ts)
  const at = { x: walker.body.position.x, z: walker.body.position.z, speed: 0 };
  walker.sit({
    drive: (pedal, _wheel, dt) => {
      at.speed = Math.min(8, at.speed + 3 * pedal * dt);
      at.x += at.speed * dt;
    },
    eyes: (to) => to.set(at.x, 1.4, at.z),
    facing: () => 0,
    driving: () => ({ at: [at.x + 3, 0.4, at.z], speed: at.speed, top: 11, throttle: 1, engine: 'test' }),
  });
  const before = { footfalls: heard.footfalls, breaths: heard.breaths };
  for (let i = 0; i < 300; i++) walker.update(1 / 60);
  assert.equal(heard.footfalls, before.footfalls, 'no footfall at the wheel, though the seat went 30 m');
  assert.equal(heard.breaths, before.breaths, 'no walking breath at the wheel');
  assert.ok(heard.driving.length >= 290, `driving said each frame: ${heard.driving.length}`);
  const last = heard.driving.at(-1);
  assert.ok(last.speed > 7 && last.throttle === 1 && last.engine === 'test', JSON.stringify(last));
  assert.equal(last.under, 'concrete-joint', 'and what is under it is the slab’s material');
  // out again, and walking
  walker.sit(null, new THREE.Vector3(at.x, 0, at.z + 2));
  walker.stick(0, 1);
  for (let i = 0; i < 120; i++) walker.update(1 / 60);
  assert.equal(heard.ended, 1, 'getting out is said once');
  assert.ok(heard.footfalls > before.footfalls + 2, 'the footfalls come back');
});

test('a driven vehicle: its engine idles standing and turns faster and louder with its speed and its throttle', () => {
  const idle = engineVoice(ENGINE, 0, 11, 0);
  assert.equal(idle.rpm, ENGINE.idle);
  assert.ok(Math.abs(idle.firing - (450 / 60) * 3) < 1e-9, 'a four-stroke six fires three times a turn');
  let was = idle;
  for (const v of [1, 3, 6, 9, 11]) {
    const e = engineVoice(ENGINE, v, 11, 0.3);
    assert.ok(e.rpm > was.rpm && e.level > was.level && e.buzz.hertz > was.buzz.hertz, `at ${v} m/s`);
    was = e;
  }
  assert.ok(engineVoice(ENGINE, 11, 11, 1).rpm <= ENGINE.most + 1e-9, 'never past its most');
  assert.ok(engineVoice(ENGINE, 4, 11, 1).level > engineVoice(ENGINE, 4, 11, 0).level + 8, 'under load it is louder');
  assert.ok(engineVoice({ ...ENGINE, fuel: 'diesel' }, 0, 11, 0).level > idle.level, 'a diesel is the louder');
  // heard: idling while it stands, and its engine voice following the speed
  const driven = (speed, throttle) => () => ({
    key: 'v',
    kind: 'road',
    along: 0,
    travel: Infinity,
    where: [0, 0.5, 0],
    driven: { speed, top: 11, throttle },
    engine: ENGINE,
  });
  const standing = hearings([driven(0, 0)], 3);
  const engine = (h) => h.voices.find((_, i) => h.playing[i]?.part === 'engine');
  assert.ok(engine(standing.at(-1))?.gain > 0, 'it idles where it stands');
  assert.ok(!standing.at(-1).playing.some((p) => p?.part === 'tyres'), 'and its tyres are silent');
  assert.ok(standing[0].shots.length > 0, 'and it was started: the starter');
  const going = hearings([driven(9, 0.6)], 3);
  assert.ok(
    engine(going.at(-1)).gain > engine(standing.at(-1)).gain && engine(going.at(-1)).buzz.hertz > engine(standing.at(-1)).buzz.hertz,
  );
  // out of it (no longer posed), it runs down and is silent
  const works = new Works();
  hearings([driven(5, 0.5)], 2, undefined, works);
  const after = hearings([], 3, undefined, works);
  assert.equal(loud(after.at(-1)), 0, 'silent once its driver has got out and it has run down');
});

test('tyres follow the surface: silent standing, 35 dB a decade of speed, each surface its own, the place’s land off the made ones', () => {
  for (const on of ['concrete', 'gravel', 'earth', 'steppe', 'sand', 'steel', 'timber']) {
    assert.equal(tyreVoice(on, 0).level, -Infinity, `${on}: silent standing`);
    assert.ok(Math.abs(tyreVoice(on, 10).level - tyreVoice(on, 1).level - 35) < 1e-9, on);
    finite(tyreVoice(on, 7));
  }
  assert.ok(tyreVoice('gravel', 8).grit.gain > tyreVoice('gravel', 8).hiss.gain, 'gravel crunches');
  assert.ok(tyreVoice('concrete', 8).hiss.gain > tyreVoice('concrete', 8).grit.gain, 'concrete hisses');
  assert.ok(tyreVoice('gravel', 8).level > tyreVoice('concrete', 8).level && tyreVoice('concrete', 8).level > tyreVoice('sand', 8).level);
  // the places' own: their models' materials, and the land
  const cape = flights.find((f) => f.site.place.name === 'cape-canaveral').site.place.tread;
  const tyuratam = TYURATAM.tread;
  assert.equal(treadOf('concrete-joint', cape), 'concrete');
  assert.equal(treadOf('ballast-gravel', cape), 'gravel');
  assert.equal(treadOf('steel-rail', cape), 'steel');
  assert.equal(treadOf(null, cape), 'sand');
  assert.equal(treadOf('road-gravel', tyuratam), 'gravel');
  assert.equal(treadOf('concrete-apron-band', tyuratam), 'concrete');
  assert.equal(treadOf(null, tyuratam), 'steppe');
  assert.equal(treadOf('paint-auto-black', tyuratam), 'steppe', 'what is not a surface is the land');
  // heard: a driven vehicle's tyres are what is under it
  const on = (tread) =>
    hearings(
      [
        () => ({
          key: 'v',
          kind: 'road',
          along: 0,
          travel: Infinity,
          where: [0, 0.5, 0],
          driven: { speed: 8, top: 11, throttle: 0.4 },
          engine: ENGINE,
          tread,
        }),
      ],
      2,
    )
      .at(-1)
      .playing.find((p) => p?.part === 'tyres');
  assert.equal(on('gravel').tread, 'gravel');
  assert.equal(on('steppe').tread, 'steppe');
  assert.ok(on('gravel').gain > on('steppe').gain);
});

/** A move of `travel` that goes from 0 to the whole of it over `from`..`to` seconds (eased, as the slider eases it), `metres` from the ears. */
const moving =
  (kind, from, to, metres = 3, travel = 2) =>
  (t) => ({
    key: kind,
    kind,
    along: travel * Math.min(1, Math.max(0, (t - from) / (to - from))) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (t - from) / (to - from)))),
    travel,
    where: [5 + metres, 1.7, 0],
    engine: kind === 'road' || kind === 'locomotive' ? ENGINE : null,
  });

for (const kind of Object.keys(MACHINES)) {
  test(`${kind}: silent standing, heard while it moves, finite and without a step, silent again once it has stopped`, () => {
    const runs = hearings([moving(kind, 1, 5)], 10);
    for (const h of runs) for (const v of h.voices) if (v) finite(v);
    assert.equal(loud(runs.find((h) => h.t > 0.5)), 0, 'still before it moves');
    const during = runs.filter((h) => h.t > 2 && h.t < 4);
    assert.ok(
      during.every((h) => loud(h) > 0),
      'heard all the while it moves',
    );
    assert.equal(loud(runs.at(-1)), 0, 'silent once it has stopped and run down');
    // no step: from one hearing to the next it comes up and runs down no faster than its own `up` and `down` say
    const m = MACHINES[kind];
    const most = Math.max(...runs.map(loud));
    for (let i = 1; i < runs.length; i++) {
      const step = Math.abs(loud(runs[i]) - loud(runs[i - 1]));
      assert.ok(
        step <= most * (HEAR / Math.min(m.up, m.down) + 0.15),
        `${kind} at ${runs[i].t.toFixed(2)} s: a step of ${step} of ${most}`,
      );
    }
    // falls off with distance, and comes late by it
    const at = (metres) => hearings([moving(kind, 0, 4, metres)], 2).at(-1);
    assert.ok(loud(at(2)) > loud(at(6)) && loud(at(6)) > loud(at(24)), `${loud(at(2))} ${loud(at(6))} ${loud(at(24))}`);
    const far = at(24).voices.find(Boolean);
    if (far) assert.ok(Math.abs(far.delay - 24 / C0) < 1e-6 && far.cutoff <= at(2).voices.find(Boolean).cutoff);
  });
}

test('a machine heard starting and stopping: its one-shots once each, a door latching only as it shuts, nothing for a move passed over', () => {
  const shots = (runs) => runs.flatMap((h) => h.shots.map((s) => ({ t: h.t, s })));
  const motor = shots(hearings([moving('motor', 1, 3)], 6));
  assert.equal(motor.length, 2, 'a motor: a start and a stop');
  assert.ok(motor[0].t < 1.2 && motor[1].t > 3 && motor.every(({ s }) => s.bus === 'works' && s.gain > 0));
  // a door: open, then shut
  const door = (t) => ({
    ...moving('door', 1, 2)(t),
    along: t < 3 ? moving('door', 1, 2)(t).along : moving('door', 4, 5)(t).along * -1 + 2,
  });
  const latch = shots(hearings([door], 7));
  assert.ok(latch.length === 2 && latch[1].s.gain > latch[0].s.gain, 'it bumps open, and latches louder as it shuts');
  // the slider dragged across the whole of a move: nothing heard
  const jump = (t) => ({ ...moving('winch', 0, 1)(t), along: t < 1 ? 0 : 2 });
  const over = hearings([jump], 4);
  assert.ok(
    over.every((h) => loud(h) === 0 && !h.shots.length),
    'a jump plays nothing it passed over',
  );
  // a wagon knocks over its rails' joints, one for each it passes
  const wagon = shots(hearings([moving('locomotive', 0, 30, 10, 80)], 31)).filter(({ s }) => s.thump);
  assert.equal(wagon.length, 3, '80 m over 25 m rails');
});

test('no more voices than the works have, each kept in its slot while it sounds', () => {
  const kinds = Object.keys(MACHINES).filter((k) => k !== 'locomotive' && k !== 'road');
  const sources = kinds.map((k, i) => (t) => ({ ...moving(k, 0, 6, 4 + 3 * i)(t), key: `m${i}` }));
  const runs = hearings(sources, 5);
  for (const h of runs) assert.equal(h.voices.length, WORK_VOICES);
  const name = (p) => p && `${p.key}/${p.part}`;
  for (let i = 1; i < runs.length; i++)
    runs[i - 1].playing.forEach((was, slot) => {
      const now = runs[i].playing.map(name).indexOf(name(was));
      if (was && now >= 0) assert.equal(now, slot, `${name(was)} kept its slot at ${runs[i].t.toFixed(2)} s`);
    });
  assert.ok(runs.at(-1).playing.every(Boolean), 'and all of them in use while more are moving');
});

test('posing a move that names a machine tells the sound: the slider, a hand, the clock alike (explode.ts, audio.ts)', async () => {
  const THREE = await import('three');
  const { Sequence } = await import('../src/viewer/explode.ts');
  const { machinery } = await import('../src/sound/audio.ts');
  const scene = new THREE.Scene();
  const part = new THREE.Group();
  part.name = 'Part';
  const arm = new THREE.Group();
  arm.name = 'Arm';
  part.add(arm);
  scene.add(part);
  const swing = {
    kind: 'swing',
    node: 'Arm',
    axis: [0, 0, 1],
    angle: 1.5,
    from: 0.2,
    to: 0.6,
    machine: { kind: 'hydraulic', confidence: 'estimated', source: 'a test' },
  };
  const quiet = {
    kind: 'slide',
    node: 'Arm',
    by: [1, 0, 0],
    from: 0,
    to: 1,
    machine: { kind: 'none', confidence: 'derived', source: 'a test' },
  };
  const sequence = new Sequence(part, part.position.clone(), [swing, quiet]);
  sequence.set(0.4);
  const entry = machinery.working().find(([key]) => key === swing)?.[1];
  assert.ok(entry && entry.node === arm && Math.abs(entry.along - 0.75) < 1e-9 && entry.travel === 1.5, JSON.stringify(entry?.along));
  assert.ok(!machinery.working().some(([key]) => key === quiet), 'a move that is no machine is not heard');
  scene.remove(part);
  assert.ok(!machinery.working().some(([key]) => key === swing), 'gone from the scene, forgotten');
});

test('every swing, slide and drive at a site names its machine, every vehicle and locomotive its engine, every one its place lists', () => {
  const missing = [];
  const engines = [];
  const seen = new Set();
  const check = (f, where, move) => {
    if (seen.has(move)) return;
    seen.add(move);
    if (!move.machine) missing.push(`${f.id} ${where} ${move.kind} ${move.node ?? ''}`);
    else if ((move.machine.kind === 'road' || move.machine.kind === 'locomotive') && !f.site.place.engines[move.machine.engine])
      engines.push(`${f.id} ${where} ${move.node ?? ''}: ${move.machine.engine}`);
  };
  for (const f of flights)
    for (const m of f.models)
      for (const p of m.parts) {
        // a site's model is on the clock (a morning's sequence): its moves are hardware; a vehicle's slider takes it apart, and is not
        if (m.sequence) for (const move of p.moves ?? []) check(f, `${m.id}/${p.node}`, move);
        for (const move of p.clocked ?? []) check(f, `${m.id}/${p.node} (clocked)`, move);
        for (const a of p.actions ?? []) {
          if (a.do.kind === 'toggle') for (const move of a.do.moves) check(f, `${m.id}/${p.node} ${a.id}`, move);
          if (a.do.kind === 'lift' && !a.do.machine) missing.push(`${f.id} ${m.id}/${p.node} ${a.id} lift`);
        }
      }
  assert.ok(seen.size > 100, `${seen.size} moves`);
  assert.deepEqual(missing, [], 'moves with no machine (silent)');
  assert.deepEqual(engines, [], 'engines no place lists');
  // every vehicle a site's models carry (its extras' `vehicle`), drivable by hand, has its engine in its place's list
  const vehicles = (file) => {
    const glb = readFileSync(file);
    return JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'))
      .nodes.filter((n) => typeof n.extras?.vehicle === 'string')
      .map((n) => n.extras.vehicle);
  };
  const unlisted = new Set();
  for (const f of flights) {
    const files = [...f.models.filter((m) => m.sequence).map((m) => m.url)];
    for (const file of globSync(`public/models/*/places/${f.site.place.name}/**/*.glb`)) files.push(file.replace(/^public\//, ''));
    for (const url of files)
      for (const name of vehicles(join('public', url))) if (!f.site.place.engines[name]) unlisted.add(`${f.site.place.name}: ${name}`);
  }
  assert.deepEqual([...unlisted], [], 'vehicles whose engine their place does not list');
});
