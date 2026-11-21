// A spacecraft's attitude in orbit as a rigid body turned by its own jets (src/sim/attitude.ts), on the hardware the
// flights give (Apollo 7's service module RCS, a Gemini's orbit attitude and manoeuvre system): each chamber's torque from
// where it stands, against the record's moments of inertia; the propellant it burns; a tumble with Hold off, untouched by
// anything, keeps its angular momentum and energy; Hold damps a tumble into its deadbands; the keys ask a rate of it; and
// what it comes to does not depend on how often it is asked (so a kept run flies again the same: tests/resume.test.mjs).
// And guidance on a burn lit by hand (src/sim/craftlive.ts `guide`): it steers the axis and cuts the engine when the
// velocity it was given is gained.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { advance, advanceTo, attitudeOf, attitudeStart, errorOf, gasOf, stepAttitude } from '../src/sim/attitude.ts';
import { craftVehicle } from '../src/sim/craftlive.ts';
import { craftAt, injectionState } from '../src/sim/orbital.ts';
import { problems } from '../src/sim/plan.ts';
import { turn } from '../src/sim/rigid.ts';
import { TICK } from '../src/sim/vehicle.ts';
import { G0 } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { DEG, dot, length, siteFrame, sub, unit } from '../src/world/frames.ts';

const apollo7 = flights.find((f) => f.id === 'usa/apollo/apollo-7');
const gemini = flights.filter((f) => f.id.startsWith('usa/gemini/gt-') && f.plan?.kind === 'orbital');
const csm = attitudeOf(apollo7.plan);
/** The CSM in free flight, near the record's first service propulsion firing (Table A.5-I, row 3), kg. */
const MASS = 32_356 * 0.45359237;
const still = (a, w = [0, 0, 0]) => attitudeStart(a, 0, [1, 0, 0, 0], w);
const hands = (stick, hold = false, mass = MASS) => ({ hold, stick, mass });

test('the hardware: Apollo 7’s CSM and every Gemini in orbit have their jets, supplies and mass properties; the plans hold', () => {
  assert.ok(csm, 'Apollo 7: the service module RCS as hardware');
  assert.equal(csm.jets.length, 16);
  assert.ok(Math.abs(csm.supplies[0].full - 1341.7 * 0.45359237) < 1e-9, 'the four quads’ load, as the mission report has it');
  for (const f of gemini) {
    const a = attitudeOf(f.plan);
    assert.ok(a, `${f.id}: the attitude chambers as hardware`);
    assert.equal(new Set(a.jets.map((j) => j.name)).size, 8, `${f.id}: eight chambers, the side ones listed for yaw and roll`);
  }
  for (const f of [apollo7, ...gemini]) assert.deepEqual(problems(f.plan), [], f.id);
  // (and a flight whose jets are not given as hardware is turned as a hand turns it, as before)
  const vostok = flights.find((f) => f.id === 'ussr/vostok/vostok-1');
  assert.equal(attitudeOf(vostok.plan), null);
});

test('the jets’ torque against the inertia: a second of the hand’s pitch from rest gives the pitch chambers’ torque over the record’s moment, and the quads’ offset’s yaw', () => {
  const I = csm.inertia(MASS);
  // (the record's row 3: Iy 56,210 slug ft²)
  assert.ok(Math.abs(I[1] - 56_210 * 1.35581795) < 1e-6, `${I[1]}`);
  const pitch = csm.jets.filter((j) => j.axis === 1 && j.sense === 1);
  assert.equal(pitch.length, 2, 'two chambers pitch it each way: the axial ones of the quads by ±Z');
  const torque = pitch.reduce((sum, j) => sum + j.torque[1], 0);
  // (each 100 lbf at the quads' 83.56 in, along the axis canted 10 degrees, as R-547 and the handbook place them)
  const want = 2 * 100 * 4.448221615 * 83.56 * 0.0254 * Math.cos(10 * DEG) * Math.cos(7.25 * DEG);
  assert.ok(Math.abs(torque - want) / want < 0.02, `${torque.toFixed(1)} N m against ${want.toFixed(1)}`);
  let s = still(csm);
  const ticks = Math.round(1 / TICK);
  for (let i = 0; i < ticks; i++) s = stepAttitude(csm, s, hands([0, 1, 0]));
  const expected = (torque / I[1]) * ticks * TICK;
  assert.ok(
    Math.abs(s.w[1] - expected) / expected < 1e-3,
    `pitch rate ${(s.w[1] / DEG).toFixed(4)} deg/s against ${(expected / DEG).toFixed(4)}`,
  );
  // (the quads stand 7.25 degrees off the axes, so the pitch pair pushes at that offset from the yaw axis too: it yaws the
  // craft by the offset's tangent, against the moments' ratio, as the hardware did; roll it does not)
  const coupled = (Math.tan(7.25 * DEG) * I[1]) / I[2];
  assert.ok(
    Math.abs(Math.abs(s.w[2] / s.w[1]) - coupled) < 0.01,
    `yaw over pitch ${(s.w[2] / s.w[1]).toFixed(4)} against ${coupled.toFixed(4)}`,
  );
  assert.ok(Math.abs(s.w[0]) < 1e-3 * expected, `roll ${s.w[0]}`);
  console.log(
    `# the CSM's pitch chambers: ${torque.toFixed(0)} N m on ${I[1].toFixed(0)} kg m², ${(s.w[1] / DEG).toFixed(3)} deg/s after a second`,
  );
});

test('gas drawn: each chamber open burns its thrust over g0 Isp from its supply, and an empty supply turns nothing', () => {
  let s = still(csm);
  const ticks = 200;
  for (let i = 0; i < ticks; i++) s = stepAttitude(csm, s, hands([0, 0, 1]));
  const open = csm.jets.filter((j) => j.axis === 2 && j.sense === 1);
  const want = open.reduce((sum, j) => sum + j.flow, 0) * ticks * TICK;
  const drawn = csm.supplies[0].full - s.left[0];
  assert.ok(Math.abs(drawn - want) < 1e-9, `${drawn} kg against ${want}`);
  assert.ok(Math.abs(open[0].flow - (100 * 4.448221615) / (G0 * 280)) < 1e-12);
  const dry = { ...still(csm), left: [0] };
  const after = stepAttitude(csm, dry, hands([1, 1, 1]));
  assert.deepEqual(after.w, [0, 0, 0], 'no propellant: nothing turns it');
});

test('a tumble with Hold off: nothing fires, no gas is drawn, and its angular momentum in space and its energy stay as they were', () => {
  const w0 = [0.03, 0.08, -0.05];
  const s0 = still(csm, w0);
  const I = csm.inertia(MASS);
  const momentum = (s) => turn(s.q, [I[0] * s.w[0], I[1] * s.w[1], I[2] * s.w[2]]);
  const energy = (s) => (I[0] * s.w[0] ** 2 + I[1] * s.w[1] ** 2 + I[2] * s.w[2] ** 2) / 2;
  const s = advance(csm, s0, hands([0, 0, 0], false), 1800);
  assert.deepEqual(s.left, s0.left, 'nothing drawn');
  const [h0, h1] = [momentum(s0), momentum(s)];
  assert.ok(length(sub(h1, h0)) / length(h0) < 1e-6, `momentum ${length(sub(h1, h0)) / length(h0)}`);
  assert.ok(Math.abs(energy(s) - energy(s0)) / energy(s0) < 1e-6, 'energy');
  assert.ok(length(sub(s.w, w0)) > 1e-3, 'and with three moments unlike, its rates have moved about its axes as a free body’s do');
  console.log(
    `# a free tumble for half an hour: momentum to ${(length(sub(h1, h0)) / length(h0)).toExponential(1)}, energy to ${(Math.abs(energy(s) - energy(s0)) / energy(s0)).toExponential(1)}`,
  );
});

test('Hold damps a tumble: its rates within the rate deadband and its attitude within the deadband of where it holds, on its own chambers and gas', () => {
  for (const [name, a] of [
    ['Apollo 7', csm],
    ['Gemini', attitudeOf(gemini[0].plan)],
  ]) {
    const mass = a === csm ? MASS : 3600;
    const s0 = still(a, [2 * DEG, -3 * DEG, 1.5 * DEG]);
    const s = advance(a, s0, hands([0, 0, 0], true, mass), 1200);
    const e = errorOf(s);
    for (let i = 0; i < 3; i++) {
      // (within the rate deadband, and a pulse's worth more: the least impulse's change of rate)
      const pulse = (a.authority[i][0] * a.minimum) / a.inertia(mass)[i];
      assert.ok(Math.abs(s.w[i]) <= a.rateband + pulse + 1e-12, `${name}: axis ${i} rate ${(s.w[i] / DEG).toFixed(3)} deg/s`);
      // (on the switching line: still, within the deadband; drifting at the rate deadband, within twice it)
      assert.ok(Math.abs(e[i]) <= 2 * a.deadband + 1e-9, `${name}: axis ${i} ${(e[i] / DEG).toFixed(3)} deg off`);
    }
    const gas = gasOf(a, s);
    assert.ok(gas.left < gas.full && gas.left > 0, `${name}: it drew ${(gas.full - gas.left).toFixed(2)} kg`);
    console.log(
      `# ${name}: a tumble of 2, -3, 1.5 deg/s damped and held: ${s.w.map((x) => (x / DEG).toFixed(3)).join(', ')} deg/s, ${e.map((x) => (x / DEG).toFixed(2)).join(', ')} deg off, ${(gas.full - gas.left).toFixed(2)} kg drawn`,
    );
  }
});

test('the keys ask a rate under Hold: held, the craft turns at the hand’s rate; let go, it is held where it was let go', () => {
  let s = advance(csm, still(csm), hands([0, 1, 0], true), 60);
  assert.ok(Math.abs(s.w[1] - csm.rate) <= csm.rateband + 1e-9, `${(s.w[1] / DEG).toFixed(3)} deg/s against ${csm.rate / DEG}`);
  const turned = Math.acos(Math.min(1, dot(turn(s.q, [1, 0, 0]), [1, 0, 0])));
  s = advance(csm, s, hands([0, 0, 0], true), 600);
  assert.ok(Math.abs(s.w[1]) <= csm.rateband * 1.5, 'let go, it stops turning');
  const after = Math.acos(Math.min(1, dot(turn(s.q, [1, 0, 0]), [1, 0, 0])));
  assert.ok(
    Math.abs(after - turned) < 2 * csm.deadband + 0.5 * DEG,
    `held near where it was let go: ${(turned / DEG).toFixed(2)} then ${(after / DEG).toFixed(2)} deg`,
  );
});

test('what it comes to does not depend on how often it is asked: one call, or a frame at a time', () => {
  const c1 = hands([0, 0, 0], true);
  const s0 = still(csm, [1 * DEG, -0.5 * DEG, 0.3 * DEG]);
  const once = advance(csm, s0, c1, 300);
  let framed = s0;
  for (let t = 0.0137; t < 300; t += 0.0137 + (t % 0.01)) framed = advance(csm, framed, c1, t);
  framed = advance(csm, framed, c1, 300);
  assert.deepEqual(framed, once);
  // (and flown to an instant exactly, then on: the same as the steps it would have taken where the instant is on one)
  const to = advanceTo(csm, s0, c1, 0.5);
  assert.ok(Math.abs(to.t - 0.5) < 1e-9);
});

test('Gemini’s side chambers: a yaw pair turns it in yaw and its rolls cancel; a roll pair in roll and its yaws cancel', () => {
  const a = attitudeOf(gemini[0].plan);
  for (const [axis, other] of [
    [2, 0],
    [0, 2],
  ]) {
    let s = still(a);
    const stick = [0, 0, 0];
    stick[axis] = 1;
    for (let i = 0; i < 100; i++) s = stepAttitude(a, s, hands(stick, false, 3600));
    assert.ok(Math.abs(s.w[axis]) > 0 && Math.abs(s.w[other]) < 1e-3 * Math.abs(s.w[axis]), `axis ${axis}: ${s.w}`);
  }
});

test('G on a burn lit by hand: guidance points the axis along its line each tick and cuts the engine when the velocity it was given is gained', () => {
  const f = apollo7;
  const p = f.plan;
  const frame = frameOf(f);
  const t = p.record.orbit.injection.at.value + 600;
  const at = injectionState(p, siteFrame(f.site), frame);
  const v = craftVehicle(p, frame, f.site.seaLevel.value, { engines: ['sps'] });
  const own = craftAt(p, t, ['sps']);
  const prograde = unit(at.v);
  let s = v.start({ t, r: at.r, v: at.v, mass: own.mass, tanks: own.tanks, starts: own.starts, axis: prograde });
  const steering = v.guide({ ...s, lever: 1 }, 'sps', { line: prograde, size: 60 });
  assert.ok(steering, 'the SPS can be steered');
  let light = ['sps'];
  for (let n = 0; n < 10_000 && (light || v.burning(s, 'sps')); n++) {
    const thrust = steering.thrustAt({ r: s.r, v: s.v }, s.t);
    const axis = length(thrust) > 0 ? unit(thrust) : s.axis;
    const before = s.burns.at(-1)?.push ?? [0, 0, 0];
    const opened = s.burns.length;
    s = v.tick(s, { axis, ...(light ? { light } : {}), ...(steering.cutAt !== undefined ? { stop: { sps: steering.cutAt } } : {}) });
    steering.felt(sub(s.burns.at(-1).push, s.burns.length > opened ? [0, 0, 0] : before), 1);
    light = undefined;
  }
  const b = s.burns.at(-1);
  assert.equal(b.ended, 'guidance', 'cut by guidance');
  assert.ok(Math.abs(b.sensed - 60) < 0.5, `gave ${b.sensed.toFixed(2)} m/s of the 60 asked`);
  console.log(`# the SPS steered by guidance: ${b.sensed.toFixed(3)} m/s of 60 in ${(b.off - b.on).toFixed(2)} s, cut by guidance`);
});
