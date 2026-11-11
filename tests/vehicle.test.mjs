// src/sim/vehicle.ts, rigid.ts and autopilot.ts: the live simulator against what is known in closed
// form, against itself at different frame rates, and against fly.ts flying the same flight.
//
// The tolerances were set before any of it was run, from the physics:
//   - with the air's sideways push switched off and the autopilot holding the programme, the two
//     simulators integrate the same forces, so they must agree to the autopilot's error and the
//     step: 0.2 per cent in speed, 0.5 per cent in height and range, a tenth of a degree in climb;
//   - with it on, the live vehicle has lift that fly.ts leaves out (it flies at an angle of attack
//     of a degree or so and takes only drag), so they may differ, by an amount stated here and
//     held: 1 per cent in speed, 2 per cent in height and range, half a degree in climb.
// Nothing in either simulator or in the gains was changed to bring a figure in.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, BOOSTER_GAINS, blend, flyLive, steer } from '../src/sim/autopilot.ts';
import { coast, fly, G0, sampleAt } from '../src/sim/fly.ts';
import { aboutAxis, fromAxes, massOf, multiply, turn, unturn } from '../src/sim/rigid.ts';
import { HANDS_OFF, TICK, vehicle } from '../src/sim/vehicle.ts';
import { angleBetween, cross, DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const TR = flight.trajectory;
const LB = 0.45359237;

/** The flight's trajectory with something changed. */
function with_(change) {
  const tr = structuredClone(TR);
  change(tr);
  return tr;
}
/** Tick a vehicle on under a pilot until `t`. */
function until(v, state, pilot, t) {
  while (state.t < t - TICK / 2 && !state.landing) {
    const next = v.tick(state, pilot);
    if (next.ticks === state.ticks) break;
    state = next;
  }
  return state;
}

const whole = vehicle(TR, SITE, SEA);
const live = flyLive(whole);
const batch = fly(TR, SITE, SEA);

test('quaternions turn vectors the way the axes say', () => {
  const q = aboutAxis([0, 0, 1], 90 * DEG);
  const x = turn(q, [1, 0, 0]);
  near(x[0], 0, 1e-15, 'x of +X turned a quarter about +Z');
  near(x[1], 1, 1e-15, 'which is +Y');
  assert.deepEqual(
    unturn(q, x).map((c) => Math.round(c * 1e12) / 1e12),
    [1, 0, 0],
  );
  const [a, b, c] = [unit([1, 2, 3]), unit(cross([1, 2, 3], [0, 0, 1])), null];
  const third = cross(a, b);
  const f = fromAxes(a, b, third);
  for (const [axis, want] of [
    [[1, 0, 0], a],
    [[0, 1, 0], b],
    [[0, 0, 1], third],
  ]) {
    near(length(sub(turn(f, axis), want)), 0, 1e-12, 'fromAxes puts each body axis where it was told');
  }
  assert.equal(c, null);
  const two = multiply(aboutAxis([1, 0, 0], 0.3), aboutAxis([0, 1, 0], 0.4));
  near(
    length(sub(turn(two, [0, 0, 1]), turn(aboutAxis([1, 0, 0], 0.3), turn(aboutAxis([0, 1, 0], 0.4), [0, 0, 1])))),
    0,
    1e-15,
    'a product is one turn after the other',
  );
});

test('the mass model: the parts are the liftoff weight, and the centre of mass and inertia follow the propellant', () => {
  const start = whole.start();
  const full = whole.mass(start);
  near(full.mass, TR.liftoffMass.value, 1e-6, 'the parts sum to the liftoff mass');
  near(full.mass / LB, 66_098, 1e-6, 'which is 66,098 lb');
  // a single uniform cylinder, by hand: m (R^2/4 + L^2/12) across, m R^2 / 2 about its axis
  const one = massOf([{ name: 'rod', from: 2, to: 6, mass: 10, confidence: 'documented', source: '' }], 0.5, 1, new Set());
  near(one.centre, 4, 1e-12, 'its middle');
  near(one.across, 10 * (0.25 / 4 + 16 / 12), 1e-12, 'a rod across its middle');
  near(one.roll, 10 * 0.125, 1e-12, 'and about its axis');
  // half a tank lies in its lower half
  const half = massOf([{ name: 'tank', from: 2, to: 6, mass: 10, fluid: true, confidence: 'documented', source: '' }], 0.5, 0.5, new Set());
  near(half.mass, 5, 1e-12, 'half the liquid');
  near(half.centre, 3, 1e-12, 'in the lower half');
  assert.equal(half.roll, 0, 'a liquid does not turn with its tank');
  // burning moves the centre of mass and shrinks the inertia
  const late = until(whole, start, autopilot(whole), 140);
  const empty = whole.mass(late);
  assert.ok(
    empty.centre > full.centre + 1,
    `the centre of mass climbs toward the capsule: ${full.centre.toFixed(2)} to ${empty.centre.toFixed(2)} m`,
  );
  assert.ok(empty.across < full.across, 'and the stack is easier to turn');
});

test('it stands on the pad until lit, and until its thrust is more than its weight', () => {
  const start = whole.start();
  const idle = whole.step(start, HANDS_OFF, 10);
  assert.equal(idle.t, 0, 'the clock waits for the engine');
  assert.deepEqual(idle.r, start.r);
  const s0 = whole.sample(start);
  assert.equal(s0.g, 1, 'an accelerometer on the pad reads one g');
  near(s0.groundSpeed, 0, 1e-9, 'still, on the turning Earth');
  near(s0.altitude, batch.samples[0].altitude, 1e-6, 'the point flown starts where fly.ts starts');
  near(length(sub(s0.r, batch.samples[0].r)), 0, 1e-6, 'at the same place');
  near(angleBetween(s0.axis, whole.launch.up), 0, 1e-9, 'upright');

  // an engine too weak to lift it burns where it stands
  const weak = vehicle(
    with_((tr) => (tr.engine.thrust.value *= 0.8)),
    SITE,
    SEA,
  );
  const sat = weak.step(weak.start(), { ...HANDS_OFF, throttle: 1 }, 5);
  assert.ok(sat.held && sat.ignited, 'lit, and held down by its own weight');
  near(sat.t, 5, 1e-9, 'for five seconds');
  near(weak.sample(sat).altitude, s0.altitude, 1e-6, 'at the pad’s height');
  near(weak.sample(sat).groundSpeed, 0, 1e-6, 'not moving over the ground');
  assert.ok(sat.mass < weak.start().mass - 600, 'and lighter by what it burned');

  // the real one leaves at once, at thrust over weight
  const lit = whole.tick(start, { ...HANDS_OFF, throttle: 1 });
  assert.ok(!lit.held, 'off the pad on the first tick');
  near(whole.sample(lit).g, TR.engine.thrust.value / (TR.liftoffMass.value * G0), 1e-3, 'at 1.19 g');
  const second = whole.step(start, { ...HANDS_OFF, throttle: 1 }, 1);
  assert.ok(whole.sample(second).altitude > s0.altitude + 0.5, 'and climbing a second later');
});

test('the engine: cut by command it stays cut, and left alone it runs dry at the nominal burn', () => {
  const run = { ...HANDS_OFF, throttle: 1 };
  let s = until(whole, whole.start(), run, 30);
  assert.equal(whole.sample(s).phase, 'powered');
  s = whole.tick(s, HANDS_OFF);
  assert.ok(s.cutoff, 'cut');
  const mass = s.mass;
  s = until(whole, s, run, 32);
  assert.equal(s.mass, mass, 'and asking again does not light it: nothing more is burned');
  assert.equal(whole.sample(s).phase, 'coast');
  assert.ok(whole.sample(s).g < 0.2, 'only the air is felt');

  let dry = until(whole, whole.start(), autopilot(whole, { sequence: false }), 150);
  assert.ok(dry.cutoff, 'it ran out');
  const flow = TR.engine.thrust.value / (G0 * TR.engine.isp.value);
  near(dry.mass, TR.liftoffMass.value - flow * TR.engine.depletion.value, flow * TICK * 1.5, 'after 143.5 s of flow');
  dry = whole.tick(dry, { ...HANDS_OFF, tower: true });
  near(
    dry.mass,
    TR.liftoffMass.value - flow * TR.engine.depletion.value - (4040.28 - 2855.14) * LB,
    flow * TICK * 1.5,
    'and the tower takes 1,185 lb with it',
  );
});

test('a flight is the same flight at any frame rate', () => {
  const N = 6000; // a minute, through the tilt and most of the way to the greatest pressure
  const frames = [() => 1 / 60, () => 1 / 30, (i) => 0.004 + 0.05 * Math.abs(Math.sin(i * 12.9898)), () => 0.25];
  const ends = frames.map((frame) => {
    let s = whole.start();
    const pilot = autopilot(whole);
    for (let i = 0; s.ticks + Math.floor((s.carry + frame(i)) / TICK + 1e-9) <= N; i++) s = whole.step(s, pilot, frame(i));
    while (s.ticks < N) s = whole.tick(s, pilot);
    return s;
  });
  const [first, ...rest] = ends;
  assert.equal(first.ticks, N);
  for (const other of rest) {
    for (const k of ['r', 'v', 'q', 'w', 'mass', 't']) assert.deepEqual(other[k], first[k], `${k} is the same to the last bit`);
  }
  // and the whole flight twice over
  assert.deepEqual(flyLive(whole).results, live.results);
});

test('turning freely, the spacecraft keeps its angular momentum and energy, and coasts as fly.ts coasts', () => {
  // no air on its sides, so nothing turns it: the drag still acts, through the centre of mass
  const v = vehicle(
    with_((tr) => tr.body.capsule.surfaces.forEach((s) => (s.slope = 0))),
    SITE,
    SEA,
  );
  let s = until(v, v.start(), autopilot(v), 200);
  assert.ok(s.shed.booster && whole.sample(s).altitude > 130_000, 'the spacecraft alone, above the air');
  s = { ...s, w: [0.3, 0.2, -0.1] }; // tumbling, about no axis of its own
  const props = v.mass(s);
  const momentum = (x) => turn(x.q, [props.roll * x.w[0], props.across * x.w[1], props.across * x.w[2]]);
  const energy = (x) => 0.5 * (props.roll * x.w[0] ** 2 + props.across * (x.w[1] ** 2 + x.w[2] ** 2));
  const [l0, e0, r0, v0] = [momentum(s), energy(s), s.r, s.v];
  const after = until(v, s, HANDS_OFF, 260);
  near(length(sub(momentum(after), l0)) / length(l0), 0, 1e-9, 'angular momentum, as a vector in space');
  near(energy(after) / e0, 1, 1e-9, 'rotational energy');
  assert.ok(Math.abs(after.w[1] - s.w[1]) > 0.05, 'while the rates themselves go round (it precesses)');
  near(Math.hypot(...after.q), 1, 1e-12, 'and the attitude is still a unit quaternion');
  const kepler = coast(r0, v0, 60, 1);
  // what drag there is at 150 km and up moves it millimetres in a minute
  near(length(sub(after.r, kepler.r)), 0, 0.05, 'where gravity alone takes it, to 5 cm');
  near(length(sub(after.v, kepler.v)), 0, 0.001, 'at the speed gravity alone gives it, to a millimetre a second');
});

/** The live run beside fly.ts's, at the instants and in the figures the powered flight is judged by. */
function beside(t, run, tolerance, what) {
  const report = [];
  const rows = [
    ['speed', 'm/s', tolerance.speed, true],
    ['groundSpeed', 'm/s', tolerance.speed, true],
    ['altitude', 'm', tolerance.height, true],
    ['range', 'm', tolerance.height, true],
    ['groundClimb', 'deg', tolerance.climb, false],
    ['climb', 'deg', tolerance.climb, false],
  ];
  // at separation fly.ts's kept sample already has the push the two part with, so its figures are the ones its results hold
  const parting = (flown) => ({
    t: TR.separation.at.value,
    speed: flown.results.separationSpeed,
    groundSpeed: flown.results.separationGroundSpeed,
    altitude: flown.results.separationAltitude,
    range: sampleAt(flown.samples, TR.separation.at.value).range,
    groundClimb: flown.results.separationGroundClimb,
    climb: flown.results.separationClimb,
  });
  const cutoff = TR.engine.cutoff.value;
  for (const [a, b] of [
    [sampleAt(batch.samples, cutoff), sampleAt(run.samples, cutoff)],
    [parting(batch), parting(run)],
  ]) {
    near(b.t, a.t, 1e-6, 'the two runs keep samples at the same instants');
    for (const [k, unit_, tol, relative] of rows) {
      const off = relative ? b[k] / a[k] - 1 : b[k] - a[k];
      report.push(
        `${k} at ${a.t} s: ${b[k].toFixed(2)} against ${a[k].toFixed(2)} ${unit_} (${relative ? `${(off * 100).toFixed(3)} %` : `${off.toFixed(3)} deg`})`,
      );
      assert.ok(Math.abs(off) <= tol, `${what}: ${report.at(-1)}, allowed ${tol}`);
    }
  }
  const apogee = run.results.apogee / batch.results.apogee - 1;
  report.push(`apogee: ${run.results.apogee.toFixed(0)} against ${batch.results.apogee.toFixed(0)} m (${(apogee * 100).toFixed(3)} %)`);
  assert.ok(Math.abs(apogee) <= tolerance.height, `${what}: ${report.at(-1)}`);
  for (const line of report) t.diagnostic(line);
}

test('the autopilot on the tilt programme, with no push from the air’s side, is fly.ts’s powered flight', (t) => {
  const v = vehicle(
    with_((tr) => tr.body.surfaces.forEach((s) => (s.slope = 0))),
    SITE,
    SEA,
  );
  beside(t, flyLive(v), { speed: 0.002, height: 0.005, climb: 0.1 }, 'the same forces');
});

test('with the air’s push on its nose and fins, it flies a little off fly.ts, by its lift', (t) => {
  beside(t, live, { speed: 0.01, height: 0.02, climb: 0.5 }, 'with lift');
  // which way: the nose is held above the path, so the lift is upward, and it is higher and steeper for it
  assert.ok(live.results.separationGroundClimb > batch.results.separationGroundClimb, 'steeper');
  assert.ok(live.results.apogee > batch.results.apogee, 'and higher');
});

test('under the autopilot the angle of attack stays small through the greatest pressure, and the programme is held', (t) => {
  let worst = 0;
  let off = 0;
  for (const s of live.samples) {
    if (s.phase !== 'powered') continue;
    if (s.t > 30 && s.t < 120) worst = Math.max(worst, s.alpha);
    if (s.t > 2) off = Math.max(off, angleBetween(s.axis, whole.programme(s.t)) / DEG);
  }
  t.diagnostic(`greatest angle of attack between 30 and 120 s: ${worst.toFixed(2)} deg; furthest off the programme: ${off.toFixed(3)} deg`);
  assert.ok(worst < 3, `angle of attack ${worst}`);
  assert.ok(off < 0.5, `off the programme by ${off} deg`);
  const q = Math.max(...live.samples.map((s) => (s.phase === 'powered' ? s.q : 0)));
  near(q / batch.results.exitQ, 1, 0.02, 'and the greatest dynamic pressure is fly.ts’s');
});

test('hands off, the stack does what its static margin says: it is stable, and weathercocks into a gravity turn', (t) => {
  // the centre of pressure (nose and fins as estimated) is behind the centre of mass all the way up
  let s = whole.start();
  const auto = autopilot(whole);
  const handsOff = autopilot(whole, { pitch: false, yaw: false, roll: false });
  let least = Infinity;
  let worst = 0;
  while (s.t < 140) {
    s = whole.tick(s, s.t < 60 ? auto : handsOff);
    least = Math.min(least, whole.margin(s));
    const a = whole.sample(s);
    if (s.t > 60 && a.q > 500) worst = Math.max(worst, a.alpha);
  }
  t.diagnostic(
    `least static margin ${least.toFixed(2)} m; greatest angle of attack hands off from 60 s, in air that matters: ${worst.toFixed(2)} deg`,
  );
  assert.ok(least > 0, 'stable throughout, by these estimates');
  assert.ok(worst < 3, 'so with nobody steering the nose follows the air');
  const end = whole.sample(s);
  assert.ok(
    end.groundClimb < 60 && end.groundClimb > 30,
    `and it has gone on tipping over as gravity turns its path: ${end.groundClimb.toFixed(1)} deg`,
  );
  // the same body with its fins taken off has its centre of pressure ahead: it will not hold its nose to the air
  const finless = vehicle(
    with_((tr) => (tr.body.surfaces = tr.body.surfaces.filter((f) => f.name !== 'fins'))),
    SITE,
    SEA,
  );
  let f = until(finless, finless.start(), autopilot(finless), 60);
  assert.ok(finless.margin(f) < 0, 'unstable without them');
  let swung = 0;
  const loose = autopilot(finless, { pitch: false, yaw: false, roll: false });
  while (f.t < 75) {
    f = finless.tick(f, loose);
    swung = Math.max(swung, finless.sample(f).alpha);
  }
  assert.ok(swung > 20, `and it swings broadside: ${swung.toFixed(0)} deg`);
});

test('a hand on the stick turns it the way the axes say, and the law is the law', () => {
  near(steer(0.01, 0, BOOSTER_GAINS), 0.2, 1e-12, 'a hundredth of a radian out asks for a fifth of full');
  assert.equal(steer(1, 0, BOOSTER_GAINS), 1, 'and it saturates');
  assert.ok(steer(0, 0.1, BOOSTER_GAINS) < 0, 'a rate is opposed');
  assert.deepEqual(blend({ ...HANDS_OFF, pitch: 0.3, throttle: 1 }, { pitch: -1 }), { throttle: 1, pitch: -1, yaw: 0, roll: 0 });
  const at10 = until(whole, whole.start(), autopilot(whole), 10);
  const auto = autopilot(whole);
  const push = (hand) => until(whole, at10, (s) => blend(auto(s), hand), 12);
  const downrange = (s) => dot(turn(s.q, [1, 0, 0]), whole.launch.downrange);
  const left = (s) => dot(turn(s.q, [1, 0, 0]), whole.launch.left);
  assert.ok(downrange(push({ pitch: 1 })) > 0.05, 'pitch +1 tips the nose downrange');
  assert.ok(downrange(push({ pitch: -1 })) < -0.05, 'and -1 uprange');
  assert.ok(left(push({ yaw: 1 })) > 0.05, 'yaw +1 swings it left of the azimuth');
  assert.ok(push({ roll: 1 }).w[0] > 0.01, 'roll +1 turns it right-handed about the nose');
});

test('a pilot’s trim leans the programme the platform holds, by as much as asked and the way the axes say', () => {
  // (the cockpit's stick on the booster: 12 degrees downrange and 5 to the left, put on over four seconds from T+8)
  const v = vehicle(TR, SITE, SEA);
  let trim = { pitch: 0, yaw: 0 };
  const pilot = autopilot(v, { trim: () => trim });
  let s = v.start();
  let most = 0;
  while (s.t < 16 - TICK / 2) {
    if (s.t >= 8 && s.t < 12) trim = { pitch: trim.pitch + 3 * DEG * TICK, yaw: trim.yaw + 1.25 * DEG * TICK };
    s = v.tick(s, pilot);
    most = Math.max(most, angleBetween(v.sample(s).axis, v.launch.up) / DEG);
  }
  const axis = v.sample(s).axis;
  const programme = angleBetween(v.programme(s.t), v.launch.up);
  const downrange = Math.asin(dot(axis, v.launch.downrange)) / DEG;
  const left = Math.asin(dot(axis, v.launch.left)) / DEG;
  near(downrange, 12 + programme / DEG, 0.5, 'tilt downrange, degrees');
  near(left, 5, 0.5, 'swing to the left, degrees');
  assert.ok(most < 14.5, `it does not overshoot the lean: ${most.toFixed(1)} degrees at most`);
});

test('the rest of the flight happens: tower, separation, turnaround, retrofire, the air, parachutes, the sea', (t) => {
  const s = live.state;
  assert.deepEqual(s.shed, { tower: true, booster: true, retropack: true });
  near(s.separation.t, TR.separation.at.value, 1e-9, 'separation on time');
  const share = TR.separation.boosterMass.value / (TR.separation.boosterMass.value + TR.separation.mass.value);
  const after = live.samples.find((x) => x.t > TR.separation.at.value);
  assert.equal(after.phase, 'capsule');
  near(after.mass, TR.separation.mass.value, 1e-9, 'the capsule alone');
  near(
    dot(sub(after.v, s.separation.v), s.separation.axis),
    TR.separation.speed.value * share,
    0.2,
    'pushed off along the axis with its share of 30 ft/s',
  );
  near(s.retroAt, TR.retro.fires[0].value, 1e-9, 'retrofire on time');
  // by retrofire it has turned blunt end first and is holding the retro attitude: the small end back and 20 degrees down
  const firing = live.samples.find((x) => x.t >= TR.retro.fires[0].value + 2);
  const wind = sub(firing.v, cross([0, 0, 7.292115e-5], firing.centre));
  const up = unit(firing.centre);
  const level = unit(sub(wind, scale(up, dot(wind, up))));
  const pitch = TR.retro.pitch.value * DEG;
  const wanted = sub(scale(level, -Math.cos(pitch)), scale(up, Math.sin(pitch)));
  near(angleBetween(firing.axis, wanted) / DEG, 0, 2, 'the retro attitude');
  near(firing.g, (TR.retro.thrust.value * 1) / (TR.separation.mass.value * G0), 0.01, 'one retrorocket, a third of a g');
  // through the air it rides heat shield first without being told to
  const peak = live.samples.reduce((a, b) => (b.phase === 'entry' && b.q > a.q ? b : a), { q: 0 });
  assert.ok(peak.alpha > 175, `blunt end first at the greatest pressure: ${peak.alpha.toFixed(1)} deg`);
  assert.ok(peak.g > 9, `${peak.g.toFixed(1)} g`);
  assert.ok(s.drogueAt < s.mainAt && s.mainAt < s.landing.t, 'drogue, then main, then the sea');
  const r = live.results;
  const b = batch.results;
  for (const k of ['entryAt', 'drogueAt', 'mainAt', 'duration']) near(r[k], b[k], 3, `${k} within three seconds of fly.ts`);
  near(r.entryG / b.entryG, 1, 0.02, 'the same load coming down');
  near(s.landing.vertical, b.landingSpeed, 0.05, 'onto the sea at fly.ts’s speed');
  assert.ok(s.landing.horizontal < 0.5, 'straight down, there being no wind');
  assert.ok(s.landing.lean < 2, 'hanging upright under the parachute');
  assert.equal(live.samples.at(-1).phase, 'landed');
  t.diagnostic(
    `landed at ${s.landing.t.toFixed(1)} s, ${s.landing.vertical.toFixed(2)} m/s down, leaning ${s.landing.lean.toFixed(2)} deg`,
  );
  // nobody turning it round, it still comes through the air blunt end first: the shield's pressure is behind its centre of mass
  const loose = flyLive(whole, autopilot(whole, { pitch: false, yaw: false, roll: false }));
  const worst = loose.samples.reduce((a, x) => (x.phase === 'entry' && x.q > a.q ? x : a), { q: 0 });
  assert.ok(worst.alpha > 150, `left small end first, the air turns it round by the greatest pressure: ${worst.alpha.toFixed(0)} deg`);
  assert.ok(loose.state.landing, 'and it comes down');
});

test('an early cutoff comes back down by the pad, and says how hard', () => {
  let s = until(whole, whole.start(), { ...HANDS_OFF, throttle: 1 }, 3);
  s = until(whole, s, HANDS_OFF, 60);
  assert.ok(s.landing, 'it came down');
  assert.ok(s.landing.t > 3 && s.landing.t < 12, `after ${s.landing.t.toFixed(1)} s`);
  assert.ok(s.landing.vertical > 3, `at ${s.landing.vertical.toFixed(1)} m/s: the verdict is the caller’s`);
  near(whole.sample(s).altitude, whole.sample(whole.start()).altitude, 0.05, 'on the pad’s own level');
  assert.equal(whole.tick(s, { ...HANDS_OFF, throttle: 1 }), s, 'and that is the end of it');
});

test('which of the body’s inputs are not documented', (t) => {
  const found = [];
  const walk = (o, path) => {
    if (o && typeof o === 'object') {
      if (o.confidence && o.confidence !== 'documented') found.push(`${path}${o.name ? ` "${o.name}"` : ''} (${o.confidence})`);
      for (const [k, v] of Object.entries(o)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(TR.body, 'body');
  for (const f of found) t.diagnostic(f);
  assert.deepEqual(found, [
    'body.parts.3 "engine and tail equipment" (estimated)',
    'body.parts.4 "instruments and aft equipment" (estimated)',
    'body.parts.5 "liquid oxygen" (derived)',
    'body.parts.6 "alcohol" (derived)',
    'body.parts.8 "escape tower" (derived)',
    'body.surfaces.0 "nose" (estimated)',
    'body.surfaces.1 "fins" (estimated)',
    'body.control.deflection (estimated)',
    'body.control.station (estimated)',
    'body.control.rollArm (estimated)',
    'body.capsule.centre (estimated)',
    'body.capsule.gyration.roll (estimated)',
    'body.capsule.gyration.across (estimated)',
    'body.capsule.surfaces.0 "heat shield" (estimated)',
    'body.capsule.jets.roll (estimated)',
    'body.capsule.jets.pitch (estimated)',
    'body.capsule.jets.yaw (estimated)',
    'body.capsule.chuteArm (estimated)',
  ]);
  // how far the ones that steer and the ones that lift move the flight: a 5 % rise in each
  const base = live.results;
  for (const [name, change] of [
    ['surfaces: nose slope', (tr) => (tr.body.surfaces[0].slope *= 1.05)],
    ['surfaces: fins slope', (tr) => (tr.body.surfaces[1].slope *= 1.05)],
    ['control.deflection', (tr) => (tr.body.control.deflection.value *= 1.05)],
    ['parts: engine and tail equipment', (tr) => (tr.body.parts[3].to *= 1.05)],
  ]) {
    const r = flyLive(vehicle(with_(change), SITE, SEA)).results;
    t.diagnostic(
      `${name.padEnd(34)} separation speed ${((r.separationSpeed / base.separationSpeed - 1) * 100).toFixed(3)} %, apogee ${((r.apogee / base.apogee - 1) * 100).toFixed(3)} %`,
    );
    near(r.apogee / base.apogee, 1, 0.005, `${name} hardly moves the apogee`);
  }
});
