// src/sim/entry.ts: an entry steered to a place. The Apollo command module computer's entry programs (P63 to P67, as
// Colossus 2A's listing has them) flown on a return from the Moon before any flight flies one: Apollo 10's entry from
// its tracked state at the interface to its target, held to what its reports have of it (NASA TN D-6725, "Postflight
// analysis"; the Apollo 10 Mission Report, MSC-00126, Table 6-VII and section 7.6), and Apollo 11's corridor (TN D-6725,
// "Entry targeting"). The tolerances were set from the reports before anything was run: the run has no navigation
// error, the standard air and CM-107's trim aerodynamics for CM-106. Apollo 7's entry from orbit is its flight's own
// (missions/usa/apollo/flights/apollo-7/orbital.ts: its checks entry.*, held by tests/apollo-7-flight.test.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cmEntryAero } from '../missions/usa/apollo/vehicles/command-module-aero.ts';
import { assumed, doc } from '../src/measure.ts';
import { apolloLaw, bankFlown, CMC, entryPilot, REFERENCE, referenceAt } from '../src/sim/entry.ts';
import { flyEntry, trackedState } from '../src/sim/orbital.ts';
import { earthFrame } from '../src/world/earthframe.ts';
import { add, cross, dot, geodeticToEcef, length, scale, sub, unit } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

const FT = 0.3048;
const NMI = 1852;
const LB = 0.45359237;
const T = (h, m, s) => h * 3600 + m * 60 + s;
const TN = 'NASA TN D-6725';
const MR = 'Apollo 10 Mission Report (MSC-00126)';

/** The computer and its autopilot as Apollo 11's program has them, at the nominal pad loads. */
const computer = {
  kind: 'apollo',
  lad: assumed(0.3, 'R-577, Section 5, Fig. 7.0-1a: LADPAD, nominal'),
  lod: assumed(0.18, 'R-577, Section 5, Fig. 7.0-1a: LOD, nominal'),
  program: { confidence: 'documented', source: 'Colossus 2A (Comanche 055), REENTRY CONTROL' },
};
const roll = { rate: doc(20, 'Comanche 055, CM ENTRY DIGITAL AUTOPILOT: VM'), acceleration: doc(9.1, 'the same: A') };
const entryTo = (latitude, longitude) => ({
  target: { latitude: doc(latitude, MR), longitude: doc(longitude, MR) },
  // (the computer has it from the start, lift up until it decides otherwise: no crew's backup bank on a return from the Moon)
  initial: doc(0, `${TN}: a lift-vector-up attitude is commanded`),
  computer,
  roll,
});
/** The command module in the air: CM-107's trim drag and lift (TN D-6725, Table I) at the mass Apollo 10's had at the interface. */
const cm = { mass: 12_137 * LB, aero: cmEntryAero('assumed') };
/** Drogue deployment: 23,500 ft on the barometric switch (the Apollo 7 report, section 5.5; the type's). */
const DROGUE = 23_500 * FT;

/** The greatest load between two instants of a run, and the sample it was at. */
const peak = (run, from, to) =>
  run.samples.filter((s) => s.t >= from && s.t <= to).reduce((m, s) => (s.g > m.g ? s : m), { g: 0, t: Number.NaN });
const milesFrom = (end, def) =>
  length(
    sub(
      geodeticToEcef({ latitude: end.latitude, longitude: end.longitude, height: 0 }),
      geodeticToEcef({ latitude: def.target.latitude.value, longitude: def.target.longitude.value, height: 0 }),
    ),
  ) / NMI;

test('the stored reference descales to the figures the listing itself annotates', () => {
  // (REENTRY CONTROL, p. 877: "RANGE TO GO SCALED RTOGO/2700", its second and third rows annotated 8.9 and 22.1; p. 880: Q5
  // ".3 23500/21600" and Q6 "2 DEG, APPROX 820/23500", the reference's speed and altitude rate where the final phase begins)
  assert.ok(Math.abs(REFERENCE.range[1] - 8.9) < 0.01 && Math.abs(REFERENCE.range[2] - 22.1) < 0.01);
  assert.ok(Math.abs(REFERENCE.v[11] - 23_500) < 1, String(REFERENCE.v[11]));
  assert.ok(Math.abs(REFERENCE.rate[11] + 820) < 1, String(REFERENCE.rate[11]));
  // between two points it is the line between them
  const mid = referenceAt((REFERENCE.v[3] + REFERENCE.v[4]) / 2);
  assert.ok(Math.abs(mid.range - (REFERENCE.range[3] + REFERENCE.range[4]) / 2) < 1e-9);
  assert.ok(Math.abs(referenceAt(REFERENCE.v[11]).onLift - REFERENCE.onLift[11]) < 1e-9);
  // the range it stores rises with the speed, and so does how far a unit of lift over drag carries it
  for (let k = 1; k < 13; k++) assert.ok(REFERENCE.range[k] > REFERENCE.range[k - 1] && REFERENCE.onLift[k] >= REFERENCE.onLift[k - 1]);
});

// Apollo 10, 26 May 1969: the best-estimated state at the interface (TN D-6725, Table II) and the target the computer was
// given (the Mission Report, Table 6-VII: 15.07 S, 164.67 W).
const frame10 = earthFrame(julianDate('1969-05-18T16:49:00Z'));
const interface10 = T(191, 48, 52.16);
const fixAt = (altitude, speed, climb) => ({
  at: doc(interface10, `${TN}, Table II`),
  latitude: doc(-23.652, TN),
  longitude: doc(174.244, TN),
  altitude: doc(altitude * FT, TN),
  speed: doc(speed * FT, TN),
  climb: doc(climb, TN),
  heading: doc(71.928, TN),
});
const state10 = trackedState(fixAt(406_441.29, 36_309.257, -6.616), frame10);
const apollo10 = entryTo(-15.07, -164.67);
let flown10;
const run10 = () => (flown10 ??= flyEntry(cm, apollo10, frame10, { t: interface10, ...state10 }, DROGUE));

test('Apollo 10 from the Moon: the computer flies it through the first peak, constant drag and the final phase to its target', () => {
  const run = run10();
  const f = run.flown;
  assert.ok(run.end, 'it comes down to the drogues’ height');
  const after = (t) => (t - interface10).toFixed(0);
  console.log(`#   phases: ${f.phases.map((p) => `${after(p.t)} s ${p.phase}`).join(', ')}`);
  // TN D-6725, p. 17: a first peak of 6.8 g with the lift up (the report's Table 6-VII: 6.78), then lift down to hold 4 g,
  // "the g-level reached a minimum of 2.8g and then increased to 3.4g"; in the final phase a peak of 4.5 g (the report,
  // section 7.6.1: 4.6 g at 9,972 ft/s)
  const first = peak(run, interface10, interface10 + 120);
  const second = peak(run, f.final, f.ended);
  console.log(
    `#   first peak ${first.g.toFixed(2)} g at ${after(first.t)} s (6.78), final phase from ${after(f.final)} s, its peak ${second.g.toFixed(2)} g at ${(second.speed / FT).toFixed(0)} ft/s through the air (4.6 at 9,972 space-fixed), steering ended at ${after(f.ended)} s (438.6), ${f.reversals} reversals`,
  );
  assert.ok(Math.abs(first.g - 6.78) < 0.5, `the first peak: ${first.g.toFixed(2)} g against 6.78`);
  assert.ok(Math.abs(second.g - 4.6) < 0.7, `the final phase’s peak: ${second.g.toFixed(2)} g against 4.6`);
  // its phases in the report's order: no skip out of the air on a 1,293 mile range (TN D-6725, p. 16: up control is not
  // entered short of about 1,305 miles)
  const order = f.phases.map((p) => p.phase);
  assert.equal(order[0], 'initial');
  assert.ok(order.includes('constant drag'), 'constant drag is flown');
  assert.ok(!order.includes('kepler'), 'no ballistic arc');
  assert.equal(order.at(-2), 'final');
  assert.equal(order.at(-1), 'ended');
  // Table III: guidance ended 438.6 s after the interface (191:56:10.8), 62,389 ft up
  assert.ok(Math.abs(f.ended - interface10 - 438.6) < 25, `steering ended ${after(f.ended)} s after the interface against 438.6`);
  const there = run.samples.findLast((s) => s.t <= f.ended);
  console.log(
    `#   at the end of steering ${(there.altitude / FT).toFixed(0)} ft (62,389), ${(there.speed / FT).toFixed(0)} ft/s through the air`,
  );
  assert.ok(Math.abs(there.altitude / FT - 62_389) < 10_000, `and ${(there.altitude / FT).toFixed(0)} ft up against 62,389`);
  // the report: 1.3 miles from the target by the reconstruction, 1.4 by the computer; the run navigates without error
  const miss = milesFrom(run.end, apollo10);
  console.log(`#   at the drogues ${miss.toFixed(2)} n. mi. from the target (1.3), ${after(run.end.t)} s after the interface (505.8)`);
  assert.ok(miss < 3, `${miss.toFixed(2)} n. mi. from the target`);
  assert.ok(
    Math.abs(run.end.t - interface10 - (T(191, 57, 18) - interface10)) < 30,
    `the drogues ${after(run.end.t)} s after the interface`,
  );
});

test('Apollo 11’s corridor: its target angle and both its ranges are reached, and the angles no correction was made for', () => {
  // TN D-6725: 36,194 ft/s at -6.48 degrees (Fig. 5), targeted at 1,285 nautical miles and flown to about 1,500 (p. 17);
  // no midcourse correction within 0.1 degree steep and 0.2 shallow of the target angle (p. 16); a guided range shorter
  // than about 1,200 miles passes 7 g in the second entry. The place is Apollo 10's and the target laid along its track:
  // so far round from the interface, where the Earth carries it in the computer's nominal 500 s.
  const at = (range, angle) => {
    const s = trackedState(fixAt(400_000, 36_194, angle), frame10);
    const up = unit(s.r);
    const ahead = cross(unit(cross(s.r, s.v)), up);
    const a = (range * NMI) / 6_371_000;
    const there = frame10.place(scale(add(scale(up, Math.cos(a)), scale(ahead, Math.sin(a))), 6_371_000), interface10 + CMC.NOMINAL);
    const def = entryTo(there.latitude, there.longitude);
    const run = flyEntry(cm, def, frame10, { t: interface10, ...s }, DROGUE);
    const most = peak(run, interface10, run.end?.t ?? Infinity);
    const miss = run.end ? milesFrom(run.end, def) : Number.NaN;
    console.log(
      `#   ${range} n. mi. at ${angle} deg: ${run.flown.phases.map((p) => p.phase).join(', ')}; ${most.g.toFixed(2)} g; ${miss.toFixed(2)} n. mi. from the target, ${run.flown.reversals} reversals`,
    );
    return { run, most, miss };
  };
  for (const [range, angle] of [
    [1285, -6.48],
    [1500, -6.48],
    [1285, -6.58],
    [1285, -6.28],
  ]) {
    const x = at(range, angle);
    assert.ok(x.miss < 3, `${range} n. mi. at ${angle} deg: ${x.miss.toFixed(2)} n. mi. from the target`);
    assert.ok(x.most.g < 8, `under the program’s limit of 8 g: ${x.most.g.toFixed(2)}`);
  }
});

test('a hand has the bank while the guidance switch is off: with Hold the stick asks a rate, without it the jets', () => {
  const def = { ...apollo10, computer: undefined };
  const s = { r: state10.r, v: state10.v };
  const fly = (hands, to) => {
    const pilot = entryPilot(def, frame10, 0, hands);
    for (let k = 0; k <= Math.round(to / 0.05); k++) pilot.advance(k * 0.05, s, 0);
    return pilot;
  };
  const off = [{ t: 0, on: false }];
  const at = (p, t) => bankFlown(p.flown.banks, t);
  // Hold: full stick to the right for 5 s, then let go: up to 20 deg/s at 9.1 deg/s^2, and it stops where it is left
  const held = fly(
    {
      steered: off,
      rolls: [
        { t: 1, stick: 1, hold: true },
        { t: 6, stick: 0, hold: true },
      ],
    },
    12,
  );
  assert.ok(Math.abs(at(held, 3) - 0.5 * 9.1 * 2 ** 2) < 1.5, `gathering rate: ${at(held, 3)}`);
  const rate = at(held, 5.5) - at(held, 4.5);
  assert.ok(Math.abs(rate - 20) < 0.5, `at its greatest rate: ${rate}`);
  assert.ok(Math.abs(at(held, 12) - at(held, 10)) < 1e-9 && at(held, 12) > 70, `and at rest where it was left: ${at(held, 12)}`);
  // no Hold: the same push leaves it rolling
  const free = fly(
    {
      steered: off,
      rolls: [
        { t: 1, stick: 1, hold: false },
        { t: 3, stick: 0, hold: false },
      ],
    },
    12,
  );
  const coasting = (at(free, 12) - at(free, 10)) / 2;
  assert.ok(Math.abs(coasting - 9.1 * 2) < 0.5, `rolling on at what the jets gave it: ${coasting} deg/s`);
  // the switch on again: the computer's (here, with none, the first attitude) is rolled back to
  const back = fly(
    {
      steered: [...off, { t: 8, on: true }],
      rolls: [
        { t: 1, stick: 1, hold: true },
        { t: 3, stick: 0, hold: true },
      ],
    },
    30,
  );
  assert.ok(Math.abs(at(back, 30)) < 1e-6, `back to lift up: ${at(back, 30)}`);
});

test('the law keeps the side while the target is within its limit across, and reverses it beyond', () => {
  const law = apolloLaw(computer, 0);
  assert.equal(law.cycle, 2);
  // level at 6 km/s, 60 km up, pulling 2 g: the final phase's speeds, the target a little to the right and ahead
  const r = scale(unit(state10.r), 6_371_000 + 60_000);
  const east = unit(cross([0, 0, 1], r));
  const v = scale(east, 6000);
  const u = unit(r);
  const right = cross(east, u);
  const target = (across) => () => unit(add(add(scale(u, Math.cos(0.05)), scale(east, Math.sin(0.05))), scale(right, across)));
  const nav = (across) => ({ t: 0, r, v, sensed: 2 * 9.80665, spin: [0, 0, 0], target: target(across) });
  assert.ok(Math.abs(dot(r, v)) < 1e-3);
  const first = law.command(nav(0.001));
  assert.equal(first.phase, 'initial');
  for (let k = 0; k < 4; k++) law.command(nav(0.001));
  const steady = law.command(nav(0.001));
  assert.equal(steady.phase, 'final');
  assert.ok(steady.bank >= 0, `banked toward a target to the right: ${steady.bank}`);
  assert.ok(steady.cross > 0 && steady.range > 0);
  assert.equal(law.reversals, 0);
  // the target far to the left of where the bank is taking it: the side is reversed, once
  for (let k = 0; k < 3; k++) law.command(nav(-0.05));
  assert.equal(law.reversals, 1);
  assert.ok(law.command(nav(-0.05)).bank <= 0);
});

test('another computer is another law on the same pilot: one that asks a steady roll is rolled at it', () => {
  // (a Gemini's computer, with range in hand, rolled the lift round to make none of it: its law is not written; this is the
  // seam it comes in by, sim/entry.ts `EntryLaw`, `EntryCommand.rolling`)
  const law = {
    cycle: 2,
    reversals: 0,
    command: (nav) => ({
      bank: 0,
      overTop: false,
      phase: 'final',
      ended: nav.t > 20,
      range: 0,
      cross: 0,
      ...(nav.t >= 4 ? { rolling: 15 } : {}),
    }),
  };
  const pilot = entryPilot(apollo10, frame10, 0, undefined, law);
  for (let k = 0; k <= 600; k++) pilot.advance(k * 0.05, state10, 0);
  const at = (t) => bankFlown(pilot.flown.banks, t);
  assert.ok(Math.abs(at(3.9)) < 1e-9, 'held on its command until then');
  assert.ok(Math.abs(at(12) - at(10) - 30) < 0.1, `rolled at fifteen degrees a second: ${at(12) - at(10)} in two`);
  // once the law has ended, what it last asked goes on
  assert.ok(Math.abs(at(30) - at(28) - 30) < 0.1 && pilot.flown.ended > 20);
});
