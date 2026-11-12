// src/viewer/shake.ts: the camera's shake as a function of the clock's time and what is felt.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  atRate,
  buffetPressure,
  decibels,
  joltStrength,
  levels,
  MAX_ROLL,
  MAX_SHIFT,
  MAX_TURN,
  NOTHING,
  shake,
  soundPressure,
  still,
  TOP_HZ,
} from '../src/viewer/shake.ts';

const DEG = Math.PI / 180;
const AXES = ['pitch', 'yaw', 'roll', 'x', 'y', 'z'];
const size = (s) => Math.max(...AXES.map((k) => Math.abs(s[k])));
/** A Redstone's engine: 78,860 lbf at 214.8 s. */
const THRUST = 350_790;
const EXHAUST = 214.8 * 9.80665;
const pad = (distance) => ({ ...NOTHING, sound: soundPressure(THRUST, EXHAUST, distance, 1.225) });
const everything = {
  sound: 1e5,
  buffet: 1e5,
  load: 20,
  jolts: [
    { since: 0.05, strength: 1 },
    { since: 0.1, strength: 1 },
  ],
};

test('nothing shakes a camera without a cause', () => {
  assert.ok(still(NOTHING));
  for (const t of [0, 1.234, 77, 510.5]) assert.deepEqual(shake(t, NOTHING), { pitch: 0, yaw: 0, roll: 0, x: 0, y: 0, z: 0 });
  // one g, a whisper and a breath of air are not causes
  const quiet = { sound: 1, buffet: 10, load: 1.5, jolts: [] };
  assert.ok(still(quiet));
  assert.equal(size(shake(3, quiet)), 0);
  // a jolt has not rung before it happens, and has died away three seconds after
  assert.equal(levels({ ...NOTHING, jolts: [{ since: 0, strength: 1 }] }).jolt, 0);
  assert.ok(levels({ ...NOTHING, jolts: [{ since: 3, strength: 1 }] }).jolt < 2e-4);
});

test('the engine is loud where it should be', () => {
  // half a per cent of the jet's power as sound, over a sphere: about 128 dB at 150 m from a Redstone at sea level
  const db = decibels(soundPressure(THRUST, EXHAUST, 150, 1.225));
  assert.ok(db > 127 && db < 130, `at 150 m: ${db.toFixed(1)} dB`);
  // 6 dB less for each doubling of distance
  const fall = db - decibels(soundPressure(THRUST, EXHAUST, 300, 1.225));
  assert.ok(Math.abs(fall - 6.02) < 0.01, `per doubling: ${fall}`);
  // thin air carries little: at 30 km, 18 dB less
  const thin = db - decibels(soundPressure(THRUST, EXHAUST, 150, 0.0184));
  assert.ok(thin > 17 && thin < 19, `in the air at 30 km: ${thin} dB less`);
  assert.equal(soundPressure(THRUST, EXHAUST, 150, 0), 0, 'and none carries nothing');
  // so the shake falls off with distance and is gone by a few kilometres
  const at = (d) => levels(pad(d)).engine;
  assert.ok(at(30) > at(150) && at(150) > at(600) && at(600) > at(2000));
  assert.ok(at(150) > 0.5 && at(150) < 0.8, `150 m from the pad: ${at(150)}`);
  assert.equal(at(5000), 0, 'nothing at five kilometres');
});

test('buffet is strongest through the speed of sound, and jolts go by the step in the load', () => {
  assert.ok(buffetPressure(26_000, 1.0) > 4 * buffetPressure(26_000, 2.5));
  assert.equal(buffetPressure(0, 1), 0);
  assert.ok(levels({ ...NOTHING, buffet: buffetPressure(26_000, 1.1) }).buffet > 0.9, 'Mach 1.1 at 26 kPa is near the most there is');
  assert.equal(levels({ ...NOTHING, buffet: buffetPressure(1600, 0.15) }).buffet, 0, 'twenty seconds up, nothing yet');
  assert.ok(joltStrength(6.2) === 1 && joltStrength(0.35) > 0.3 && joltStrength(0.35) < 0.4 && joltStrength(0) === 0);
  assert.equal(levels({ ...NOTHING, load: 2 }).load, 0);
  assert.equal(levels({ ...NOTHING, load: 11 }).load, 1);
});

test('it is never more than its stated maxima', () => {
  assert.ok(Math.abs(MAX_TURN / DEG - 0.6) < 1e-12 && Math.abs(MAX_ROLL / DEG - 0.3) < 1e-12 && MAX_SHIFT === 0.04);
  let most = { turn: 0, roll: 0, shift: 0 };
  let engine = { turn: 0, shift: 0 };
  for (let t = 0; t < 600; t += 0.0137) {
    const s = shake(t, everything);
    most = {
      turn: Math.max(most.turn, Math.abs(s.pitch), Math.abs(s.yaw)),
      roll: Math.max(most.roll, Math.abs(s.roll)),
      shift: Math.max(most.shift, Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)),
    };
    const e = shake(t, { ...NOTHING, sound: 1e5 });
    engine = {
      turn: Math.max(engine.turn, Math.abs(e.pitch), Math.abs(e.yaw)),
      shift: Math.max(engine.shift, Math.abs(e.x), Math.abs(e.y)),
    };
  }
  assert.ok(most.turn <= MAX_TURN && most.roll <= MAX_ROLL && most.shift <= MAX_SHIFT, JSON.stringify(most));
  assert.ok(most.turn > 0.5 * MAX_TURN, 'and with everything at once it comes near them');
  assert.ok(engine.turn <= 0.3 * DEG && engine.shift <= 0.015, `the engine alone: ${engine.turn / DEG} degrees, ${engine.shift} m`);
  console.log(
    `  everything at once: ${(most.turn / DEG).toFixed(2)} deg, roll ${(most.roll / DEG).toFixed(2)} deg, ${(most.shift * 100).toFixed(1)} cm; ` +
      `the engine alone at its loudest: ${(engine.turn / DEG).toFixed(2)} deg, ${(engine.shift * 100).toFixed(1)} cm`,
  );
});

test('the same instant shakes the same way', () => {
  const felt = pad(150);
  for (const t of [0.5, 3.21, 59.999, 141.8]) {
    assert.deepEqual(shake(t, felt), shake(t, felt));
    assert.deepEqual(shake(t, { ...felt }, 1, 1), shake(t, felt));
  }
  // and different instants differently
  assert.notDeepEqual(shake(3.21, felt), shake(3.3, felt));
});

test('it is continuous: no step between frames at 60 or 144 Hz, and the same motion at either', () => {
  // the fastest any axis can go is its amplitude times 2 pi times the top frequency
  for (const hz of [60, 144]) {
    const dt = 1 / hz;
    let worst = 0;
    let before = shake(0, everything);
    for (let i = 1; i < 6 * hz; i++) {
      // (the jolts ring on through the stretch, as they would)
      const t = i * dt;
      const felt = { ...everything, jolts: [{ since: 0.05 + t, strength: 1 }] };
      const now = shake(t, felt);
      worst = Math.max(worst, Math.abs(now.pitch - before.pitch), Math.abs(now.yaw - before.yaw));
      before = now;
    }
    const bound = 1.5 * MAX_TURN * 2 * Math.PI * TOP_HZ * dt;
    assert.ok(worst <= bound, `at ${hz} Hz the most between two frames is ${worst / DEG} degrees, bound ${bound / DEG}`);
    assert.ok(worst < 0.6 * MAX_TURN, `and it is a part of the whole, not a jump: ${worst / DEG}`);
  }
  // frame-rate independent: a frame at 144 Hz that falls on a 60 Hz frame's instant is that frame
  const felt = pad(100);
  assert.deepEqual(shake(60 / 60, felt), shake(144 / 144, felt));
  // and as its cause dies away so does it, without a step at the end
  const fading = (level) => size(shake(7.7, { ...NOTHING, sound: 3.56 * (1 + level) }));
  assert.ok(fading(1e-6) < 1e-8 && fading(0) === 0);
});

test('Motion scales it, to nothing', () => {
  const felt = pad(80);
  const full = shake(4.2, felt, 1);
  const reduced = shake(4.2, felt, 0.4);
  assert.ok(size(full) > 0);
  assert.ok(Math.abs(size(reduced) / size(full) - 0.4) < 0.02, 'reduced is two fifths of it');
  assert.deepEqual(shake(4.2, felt, 0), { pitch: 0, yaw: 0, roll: 0, x: 0, y: 0, z: 0 });
  assert.deepEqual(shake(4.2, everything, 0), { pitch: 0, yaw: 0, roll: 0, x: 0, y: 0, z: 0 });
});

test('a clock run fast does not turn it into flicker', () => {
  assert.equal(atRate(1), 1);
  assert.equal(atRate(-1), 1);
  assert.ok(atRate(2) > 0 && atRate(2) < 0.5);
  assert.equal(atRate(3), 0);
  assert.equal(atRate(1200), 0);
  assert.equal(size(shake(4.2, everything, 1, 10)), 0);
});
