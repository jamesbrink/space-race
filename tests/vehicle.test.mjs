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
import { autopilot, BOOSTER_GAINS, blend, flyLive, steer, Tally } from '../src/sim/autopilot.ts';
import { coast, fly, G0, sampleAt } from '../src/sim/fly.ts';
import { aboutAxis, fromAxes, massOf, multiply, turn, unturn } from '../src/sim/rigid.ts';
import { HANDS_OFF, TICK, vehicle } from '../src/sim/vehicle.ts';
import { add, angleBetween, cross, DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const TR = flight.trajectory;
const CALM = { ...TR, winds: undefined };
const LB = 0.45359237;

/** The flight's trajectory with something changed. */
/** The trajectory changed for a test: the day's, or `still` (the day's less its wind). */
function with_(change, still = false) {
  const tr = structuredClone(still ? CALM : TR);
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

test('the engine: cut by command it stays cut, and left alone it runs until a tank is dry', () => {
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
  // The two tanks are drawn down at the engine's mixture ratio (`body.mixture`, estimated: the ratio of the tanks' own
  // loads), so by this flight's figures they empty together when every liquid aboard has gone: 147.0 s. Before the tanks
  // were separate the burn was ended at TM X-53107's nominal 143.5 s (`engine.depletion`); that figure no longer does it.
  const liquids = TR.body.parts.reduce((sum, p) => sum + (p.fluid ? p.mass : 0), 0);
  near(liquids / flow, 147.0, 0.05, 'the liquids aboard last 147.0 s');
  near(dry.mass, TR.liftoffMass.value - liquids, flow * TICK * 1.5, 'it burned everything in the tanks');
  const tanks = whole.sample(dry).tanks;
  assert.ok(tanks.oxidizer < flow * TICK && tanks.fuel < flow * TICK, 'both tanks empty');
  dry = whole.tick(dry, { ...HANDS_OFF, tower: true });
  near(dry.mass, TR.liftoffMass.value - liquids - (4040.28 - 2855.14) * LB, flow * TICK * 1.5, 'and the tower takes 1,185 lb with it');

  // each propellant is its own quantity: with a tenth less alcohol aboard the fuel runs out first, oxygen still in its tank
  const short = with_((tr) => {
    const fuel = tr.body.parts.find((p) => p.propellant === 'fuel');
    tr.liftoffMass.value -= fuel.mass * 0.1;
    fuel.mass *= 0.9;
  });
  const lean = vehicle(short, SITE, SEA);
  const half = whole.sample(until(whole, whole.start(), autopilot(whole, { sequence: false }), 60)).tanks;
  const mix = TR.body.mixture.value;
  near((whole.tanks.oxidizer - half.oxidizer) / (whole.tanks.fuel - half.fuel), mix, 1e-9, 'drawn at the mixture ratio');
  near(whole.tanks.oxidizer - half.oxidizer + whole.tanks.fuel - half.fuel, flow * 60, flow * TICK * 1.5, 'and together they are the flow');
  let out = until(lean, lean.start(), autopilot(lean, { sequence: false }), 150);
  assert.ok(out.cutoff, 'it ran out');
  const before = lean.sample(until(lean, lean.start(), autopilot(lean, { sequence: false }), 130)).tanks;
  near((lean.tanks.fuel * (1 + mix)) / flow, 132.3, 0.05, 'the alcohol lasts 132.3 s');
  assert.ok(before.fuel > 0 && before.oxidizer > before.fuel, 'at 130 s both are still there');
  out = until(lean, out, HANDS_OFF, 151);
  near(out.mass, short.liftoffMass.value - lean.tanks.fuel * (1 + mix), flow * TICK * 1.5, 'the engine stopped when the alcohol did');
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
  // and plain steps, with nothing topped up: the same second, however it is cut, is the same hundred ticks
  const lit = whole.tick(whole.start(), autopilot(whole));
  for (const [n, dt] of [
    [1, 1],
    [100, 0.01],
    [60, 1 / 60],
    [30, 1 / 30],
    [7, 1 / 7],
    [1000, 0.001],
  ]) {
    let s = lit;
    for (let i = 0; i < n; i++) s = whole.step(s, autopilot(whole), dt);
    assert.equal(s.ticks - lit.ticks, 100, `${n} steps of ${dt} s`);
  }
  const [first, ...rest] = ends;
  assert.equal(first.ticks, N);
  for (const other of rest) {
    for (const k of ['r', 'v', 'q', 'w', 'mass', 't']) assert.deepEqual(other[k], first[k], `${k} is the same to the last bit`);
  }
  // and the whole flight twice over
  assert.deepEqual(flyLive(whole).results, live.results);
});

test('turning freely, the spacecraft keeps its angular momentum and energy, and coasts as fly.ts coasts', () => {
  // no air on its sides (neither the heat shield's push nor the cross-flow along its length), so nothing turns it: the drag still acts, through the centre of mass
  const v = vehicle(
    with_((tr) => {
      tr.body.capsule.surfaces.forEach((s) => (s.slope = 0));
      delete tr.body.capsule.side;
    }),
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
  // The centre of pressure (nose and fins as estimated) is behind the centre of mass all the way up. That is the nose's
  // and the fins' push, which goes as the angle: the margin's own statement. So it is asked of the stack without the
  // cross-flow on its side (`body.side`, which goes as the angle squared, acts ahead of the centre of mass and is no
  // part of a static margin) and with nothing to break; what the whole of it does is asked after. All of it in still air:
  // the margin is the airframe's, and a crosswind would turn the nose before the margin had its say (the day's wind is
  // asked at the end).
  const slender = vehicle(
    with_((tr) => {
      delete tr.body.side;
      delete tr.body.limits;
    }, true),
    SITE,
    SEA,
  );
  let s = slender.start();
  const auto = autopilot(slender);
  const handsOff = autopilot(slender, { pitch: false, yaw: false, roll: false });
  let least = Infinity;
  let worst = 0;
  while (s.t < 140) {
    s = slender.tick(s, s.t < 60 ? auto : handsOff);
    least = Math.min(least, slender.margin(s));
    const a = slender.sample(s);
    if (s.t > 60 && a.q > 500) worst = Math.max(worst, a.alpha);
  }
  t.diagnostic(
    `least static margin ${least.toFixed(2)} m; greatest angle of attack hands off from 60 s, in air that matters: ${worst.toFixed(2)} deg`,
  );
  assert.ok(least > 0, 'stable throughout, by these estimates');
  assert.ok(worst < 3, 'so with nobody steering the nose follows the air');
  const end = slender.sample(s);
  assert.ok(
    end.groundClimb < 60 && end.groundClimb > 30,
    `and it has gone on tipping over as gravity turns its path: ${end.groundClimb.toFixed(1)} deg`,
  );
  // With the cross-flow on its side, the margin of a few centimetres is not enough: past a degree or so the side's push,
  // ahead of the centre of mass, outgrows the fins', the nose swings off the wind through the greatest pressure, and
  // the stack breaks (sim/loads.ts). Left to itself from 60 s the vehicle as estimated does not get through: it has to be steered.
  const handsOffFrom = (v, from) => {
    let w = v.start();
    const on = autopilot(v);
    const off = autopilot(v, { pitch: false, yaw: false, roll: false });
    while (w.t < 140 && !w.broke) w = v.tick(w, w.t < from ? on : off);
    return w;
  };
  const still = vehicle(CALM, SITE, SEA);
  const w = handsOffFrom(still, 60);
  assert.ok(w.broke && w.broke.t > 65 && w.broke.t < 95, 'hands off, the whole of it breaks up in the greatest pressure');
  t.diagnostic(
    `with the cross-flow on its side, hands off from 60 s, it breaks up at ${w.broke.t.toFixed(1)} s, ${w.broke.alpha.toFixed(1)} deg off the wind`,
  );
  // In the day's wind it is the low wind across the pad (Figure 10.3-1: 3 to 12 knots from east of north) that finds the
  // side's push: let go from liftoff it is turned off the air within the first minute and breaks. Let go at 60 s, already
  // in the westerly that is behind it, it is not so turned before the greatest pressure, and gets through.
  const early = handsOffFrom(whole, 0);
  assert.ok(early.broke && early.broke.t < 60, 'in the day’s wind, hands off from the pad, it breaks up going through the low wind');
  const late = handsOffFrom(whole, 60);
  t.diagnostic(
    `in the day's wind, hands off: from liftoff it breaks up at ${early.broke.t.toFixed(1)} s, ${early.broke.alpha.toFixed(1)} deg off the wind; from 60 s it ${late.broke ? `breaks up at ${late.broke.t.toFixed(1)} s` : 'gets through'}`,
  );
  // the same body with its fins taken off has its centre of pressure ahead: it will not hold its nose to the air
  const finless = vehicle(
    with_((tr) => {
      tr.body.surfaces = tr.body.surfaces.filter((f) => f.name !== 'fins');
      delete tr.body.limits;
    }, true),
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
  // carried along by the day's surface wind: 12 knots (Postlaunch Report, section 10.3)
  near(s.landing.horizontal, (12 * 1852) / 3600, 0.5, 'moving over the sea with the surface wind');
  assert.ok(s.landing.lean < 2, 'hanging upright under the parachute');
  assert.equal(live.samples.at(-1).phase, 'landed');
  t.diagnostic(
    `landed at ${s.landing.t.toFixed(1)} s, ${s.landing.vertical.toFixed(2)} m/s down, leaning ${s.landing.lean.toFixed(2)} deg`,
  );
  // nobody turning it round, it still comes through the air blunt end first: the shield's pressure is behind its centre of mass
  // (in still air: hands off from the pad the day's wind breaks the stack before it is ever up there)
  const calm = vehicle(CALM, SITE, SEA);
  const loose = flyLive(calm, autopilot(calm, { pitch: false, yaw: false, roll: false }));
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
    'body.parts.5 "liquid oxygen" (estimated)',
    'body.parts.6 "alcohol" (estimated)',
    'body.parts.8 "escape tower" (derived)',
    'body.surfaces.0 "nose" (estimated)',
    'body.surfaces.1 "fins" (estimated)',
    'body.control.deflection (estimated)',
    'body.control.station (estimated)',
    'body.control.rollArm (estimated)',
    'body.engine (estimated)',
    'body.mixture (estimated)',
    'body.escape.toward (estimated)',
    'body.capsule.centre (estimated)',
    'body.capsule.gyration.roll (estimated)',
    'body.capsule.gyration.across (estimated)',
    'body.capsule.surfaces.0 "heat shield" (estimated)',
    'body.capsule.rcs.supplies.0.isp (estimated)',
    'body.capsule.rcs.supplies.1.isp (estimated)',
    ...['pitch', 'yaw', 'roll'].flatMap((axis, a) =>
      ['+', '−'].flatMap((sense, k) =>
        ['automatic high', 'automatic low', 'manual'].map(
          (kind, j) => `body.capsule.rcs.thrusters.${a * 6 + k * 3 + j} "${axis} ${sense}, ${kind}" (estimated)`,
        ),
      ),
    ),
    'body.capsule.base (estimated)',
    'body.capsule.chuteArm (estimated)',
    'body.capsule.earthward (derived)',
    'body.capsule.side.dragArea (estimated)',
    'body.capsule.side.from (estimated)',
    'body.capsule.side.to (estimated)',
    'body.capsule.limits.landingSpeed (estimated)',
    'body.capsule.limits.load (estimated)',
    'body.side.dragArea (estimated)',
    'body.side.to (estimated)',
    'body.sheds.0.radius (estimated)',
    'body.sheds.0.ahead (estimated)',
    'body.sheds.0.astern (estimated)',
    'body.sheds.0.side.dragArea (estimated)',
    'body.sheds.1.ahead (estimated)',
    'body.sheds.1.astern (estimated)',
    'body.sheds.1.side.dragArea (estimated)',
    'body.sheds.1.surfaces.0 "fins" (estimated)',
    'body.sheds.2.to (derived)',
    'body.sheds.2.radius (estimated)',
    'body.sheds.2.mass (derived)',
    'body.sheds.2.centre (estimated)',
    'body.sheds.2.gyration.roll (estimated)',
    'body.sheds.2.gyration.across (estimated)',
    'body.sheds.2.ahead (estimated)',
    'body.sheds.2.astern (estimated)',
    'body.sheds.2.side.dragArea (estimated)',
    'body.sheds.2.side.to (derived)',
    'body.sheds.2.push (estimated)',
    'body.limits.qAlpha (estimated)',
    'body.limits.drogue (estimated)',
    'body.limits.main (estimated)',
    'body.limits.torn (estimated)',
    'body.limits.pull.main (estimated)',
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

// --- an abort on the escape rocket ---------------------------------------------------------------
// Set from the inputs: the rocket's greatest thrust (its curve's, 68,500 lbf) on the spacecraft and tower with the
// retropack dropped (3,764 lb) is 18.2 g, so the greatest load of an abort off the pad is that to half a g (the air there
// adds nothing, and some propellant has gone), and of one at the greatest pressure less than that, by the drag (more than
// 5 g). Under the full main parachute the spacecraft comes down at the record's 29 ft/s, the retropack having gone with
// the abort (SEDR 109-7). What an abort off the pad is held to against the aborts that were flown is tests/abort.test.mjs.
const aborting = (v, at, options = {}) => {
  const auto = autopilot(v, options);
  const tally = new Tally();
  let state = v.start();
  const phases = [];
  const pilot = (s) => blend(auto(s), { abort: s.t >= at - 1e-9 ? true : undefined });
  while (!state.landing && state.t < 3600) {
    const next = v.tick(state, pilot);
    if (next.ticks === state.ticks) break;
    state = next;
    const sample = v.sample(state);
    tally.note(sample, state, v);
    if (phases.at(-1) !== sample.phase) phases.push(sample.phase);
  }
  return { state, tally, phases };
};
const DOWN = 29 * 0.3048;
const RATED = Math.max(...TR.body.escape.curve.points.map((p) => p[1])) / ((TR.retropack.mass.value + (4040.28 - 2855.14) * LB) * G0);

test('an abort on the pad: off on the escape rocket, the tower away at the top, and down under the main parachute', (t) => {
  for (const [what, options, at] of [
    ['before the engine is lit', { launch: false }, 0],
    ['half a second after ignition', {}, 0.5],
  ]) {
    const { state: s, tally, phases } = aborting(whole, at, options);
    assert.ok(s.landing, `${what}: it came down`);
    near(s.abortAt, at, TICK, 'aborted when asked');
    assert.ok(s.cutoff, 'the engine is shut down, and stays so');
    assert.deepEqual(s.shed, { tower: true, booster: true, retropack: true });
    assert.deepEqual(phases.slice(-3), ['drogue', 'main', 'landed'], `${what}: ${phases.join(', ')}`);
    near(tally.abort.peakG, RATED, 0.5, 'the greatest load is the rocket’s on the spacecraft and tower');
    assert.ok(tally.results.apogee > 400 && tally.results.apogee < 1200, `carried to ${tally.results.apogee.toFixed(0)} m`);
    assert.ok(s.mainAt !== null && s.mainAt >= s.abortAt + 1.9, 'the main parachute is out, after the rocket has burned out');
    near(s.landing.vertical / DOWN, 1, 0.05, 'down at the main parachute’s speed');
    assert.ok(s.landing.lean < 5, 'hanging upright');
    t.diagnostic(
      `${what}: ${tally.abort.peakG.toFixed(2)} g, top ${tally.results.apogee.toFixed(0)} m at ${tally.results.apogeeAt.toFixed(1)} s, down at ${s.landing.t.toFixed(1)} s, ${s.landing.vertical.toFixed(2)} m/s`,
    );
  }
});

test('an abort at the greatest pressure: the same, through the air', (t) => {
  const worst = live.samples.reduce((a, b) => (b.phase === 'powered' && b.q > a.q ? b : a));
  const { state: s, tally, phases } = aborting(whole, worst.t);
  assert.ok(s.landing, 'it came down');
  near(s.abortAt, worst.t, TICK, 'aborted at the greatest pressure');
  assert.ok(phases.includes('escape') && phases.at(-2) === 'main', phases.join(', '));
  assert.ok(tally.abort.peakG > 5 && tally.abort.peakG < RATED, `the rocket’s load less the drag: ${tally.abort.peakG.toFixed(2)} g`);
  assert.ok(tally.results.apogee > worst.altitude, 'it went on up');
  assert.deepEqual(s.shed, { tower: true, booster: true, retropack: true });
  assert.ok(s.drogueAt < s.mainAt, 'drogue, then main, at their heights');
  near(s.landing.vertical / DOWN, 1, 0.05, 'down at the main parachute’s speed');
  // what the scene needs of it: the booster left at the abort, the tower later, at the top
  near(s.separation.t, s.abortAt, 1e-9, 'the booster is left at the abort');
  t.diagnostic(
    `at ${worst.t.toFixed(1)} s, ${(worst.q / 1000).toFixed(1)} kPa: ${tally.abort.peakG.toFixed(2)} g, top ${(tally.results.apogee / 1000).toFixed(1)} km, down at ${s.landing.t.toFixed(0)} s, ${s.landing.vertical.toFixed(2)} m/s`,
  );
});

test('an abort is for a tower: without one aboard it is not there to be had, and the rocket cannot be cut or fired twice', () => {
  const later = until(whole, whole.start(), autopilot(whole), 145);
  assert.ok(later.shed.tower);
  assert.equal(whole.tick(later, { ...HANDS_OFF, abort: true }).abortAt, null, 'the tower has gone: no abort');
  // fired, it burns to its end whatever is asked: its impulse is the record's
  let s = until(whole, whole.start(), autopilot(whole), 20);
  const cut = { ...HANDS_OFF, abort: true, tower: true };
  s = whole.tick(s, cut);
  const at = s.abortAt;
  s = until(whole, s, { ...HANDS_OFF, abort: true, tower: true, throttle: 0 }, at + 3);
  assert.equal(s.abortAt, at, 'once');
  assert.ok(s.shed.tower, 'the tower can be let go by hand once the rocket is out');
  const burn = TR.body.escape.burn.value;
  const tail = (2 * (TR.body.escape.impulse.value - TR.body.escape.thrust.value * burn)) / TR.body.escape.thrust.value;
  near(
    burn + tail,
    1.393,
    0.001,
    'by its nominal figures the rocket would be out 1.39 s after it is fired; by its curve, which is what it burns by, at 1.9 s',
  );
  // asked for the tower while the rocket still burns, it is kept
  let early = whole.tick(until(whole, whole.start(), autopilot(whole), 20), cut);
  early = until(whole, early, cut, early.abortAt + 1);
  assert.ok(!early.shed.tower, 'the tower is not let go while its rocket burns');
});

// --- the reaction control system as hardware -----------------------------------------------------
const RCS = TR.body.capsule.rcs;
const alone = () => until(whole, whole.start(), autopilot(whole), TR.separation.at.value + 1);
const burnRate = (i) => 1 / (G0 * RCS.supplies.find((u) => u.name === RCS.thrusters[i].supply).isp.value);

test('each chamber turns and pushes the spacecraft as its place and line say', () => {
  RCS.thrusters.forEach((jet, i) => {
    const { force, torque } = whole.jet(i, jet.thrust);
    near(length(force), jet.thrust, 1e-9, `${jet.name}: its thrust`);
    near(length(jet.push), 1, 1e-12, 'a unit line');
    const k = { roll: 0, pitch: 1, yaw: 2 }[jet.axis];
    const arm = jet.axis === 'roll' ? 0.8 : 1.8;
    near(torque[k], jet.sense * jet.thrust * arm, 1e-9, `${jet.name}: thrust times its arm, in the sense it is named for`);
    for (const other of [0, 1, 2]) if (other !== k) near(torque[other], 0, 1e-9, `${jet.name}: and about no other axis`);
    near(length(sub(torque, cross(jet.at, force))), 0, 1e-12, 'r cross F');
  });
  // flown: a tenth of a second of the big pitch chamber turns it by its torque over the inertia, and shoves it sideways by its thrust over the mass
  const from = alone();
  const quiet = until(whole, from, HANDS_OFF, from.t + 0.1);
  const fired = until(whole, from, { ...HANDS_OFF, pitch: 1 }, from.t + 0.1);
  const big = RCS.thrusters.findIndex((j) => j.axis === 'pitch' && j.sense === 1 && j.supply === 'automatic' && j.thrust > 50);
  assert.deepEqual(
    fired.rcs.firing.map((f, i) => (f > 0 ? i : -1)).filter((i) => i >= 0),
    [big],
    'a full command opens the big chamber and no other',
  );
  const props = whole.mass(from);
  near((fired.w[1] - quiet.w[1]) / 0.1, (RCS.thrusters[big].thrust * 1.8) / props.across, 0.002, 'turning: rad/s^2');
  const shove = sub(fired.v, quiet.v);
  near(length(shove) / 0.1, RCS.thrusters[big].thrust / props.mass, 0.001, 'and pushed: m/s^2');
  assert.ok(dot(unit(shove), turn(from.q, [0, 0, -1])) > 0.99, 'along the chamber’s own line');
  // a small command opens the small chamber; under the dead band, nothing
  const small = whole.tick(from, { ...HANDS_OFF, pitch: 0.1 }).rcs.firing;
  near(Math.max(...small), 1 * 4.4482216, 1e-9, 'the 1 lbf chamber');
  assert.ok(
    whole.tick(from, { ...HANDS_OFF, pitch: 0.04 }).rcs.firing.every((f) => f === 0),
    'inside the dead band',
  );
  // the hand's chambers are throttled, and are the manual system's
  const hand = whole.tick(from, { ...HANDS_OFF, yaw: -0.5, manual: { yaw: true } }).rcs.firing;
  const which = hand.findIndex((f) => f > 0);
  assert.equal(RCS.thrusters[which].name, 'yaw −, manual');
  near(hand[which], (4 + 0.5 * 20) * 4.4482216, 1e-9, 'half way between 4 and 24 lbf');
});

test('the jets burn their thrust over g0 Isp, the spacecraft is lighter by it, and an empty supply steers nothing', () => {
  const from = alone();
  let s = from;
  let impulse = 0;
  const command = { ...HANDS_OFF, pitch: 1, roll: -0.1 };
  for (let i = 0; i < 300; i++) {
    s = whole.tick(s, command);
    impulse += s.rcs.firing.reduce((sum, f, k) => sum + f * burnRate(k), 0) * TICK;
  }
  const used = from.rcs.left[0] - s.rcs.left[0];
  near(used, impulse, 1e-12, 'what left the automatic supply is the impulse over g0 Isp');
  near(used, ((24 + 1) * 4.4482216 * 3) / (G0 * 150), 1e-9, '25 lbf for three seconds at 150 s');
  near(from.mass - s.mass, used, 1e-9, 'and the spacecraft weighs that much less');
  assert.equal(s.rcs.left[1], from.rcs.left[1], 'the manual supply is untouched');

  // nearly empty: the big chambers burn what there is and stop
  // (in still air: flown hands off from the pad, the day's wind would break the stack before it got there)
  const tr = with_((x) => (x.body.capsule.rcs.supplies[0].propellant.value = 0.05), true);
  const dry = vehicle(tr, SITE, SEA);
  let d = until(dry, dry.start(), autopilot(dry, { pitch: false, yaw: false, roll: false }), TR.separation.at.value + 1);
  d = until(dry, d, { ...HANDS_OFF, pitch: 1 }, d.t + 5);
  assert.ok(
    d.rcs.left[0] >= 0 && d.rcs.left[0] < 24 * 4.4482216 * burnRate(0) * TICK,
    `the supply is empty to less than a tick’s burning: ${d.rcs.left[0]}`,
  );
  assert.ok(
    d.rcs.firing.every((f) => f === 0),
    'nothing fires',
  );
  const rate = d.w[1];
  const left = until(dry, d, HANDS_OFF, d.t + 2);
  d = until(dry, d, { ...HANDS_OFF, pitch: -1 }, d.t + 2);
  assert.deepEqual(d.w, left.w, 'and the axis cannot be steered: asked to stop turning, it turns on as if nothing had been asked');
  // the other system has its own tank
  d = until(dry, d, { ...HANDS_OFF, pitch: -1, manual: { pitch: true } }, d.t + 1);
  assert.ok(d.w[1] < rate - 0.1, 'the manual system still answers');
  assert.ok(d.rcs.left[1] < tr.body.capsule.rcs.supplies[1].propellant.value, 'from its own supply');
});

test('with the jets as hardware a flight is still the same flight at any frame rate', () => {
  const from = alone();
  const N = from.ticks + 3000; // the turnaround, on pulsed chambers
  const ends = [() => 1 / 60, (i) => 0.004 + 0.05 * Math.abs(Math.sin(i * 12.9898)), () => 0.25].map((frame) => {
    let s = { ...from };
    const pilot = autopilot(whole);
    for (let i = 0; s.ticks + Math.floor((s.carry + frame(i)) / TICK + 1e-9) <= N; i++) s = whole.step(s, pilot, frame(i));
    while (s.ticks < N) s = whole.tick(s, pilot);
    return s;
  });
  for (const other of ends.slice(1)) {
    for (const k of ['r', 'v', 'q', 'w', 'mass', 't']) assert.deepEqual(other[k], ends[0][k], `${k} is the same to the last bit`);
    assert.deepEqual(other.rcs.left, ends[0].rcs.left, 'and so is what is left in the tanks');
  }
});

test('the autopilot’s whole flight is flown within the peroxide aboard', (t) => {
  // No figure for what MR-3 used has been found in anything read, so there is nothing to hold this to but the tank:
  // set before it was run, the automatic system must turn the spacecraft round, hold the retro attitude and damp the
  // entry on less than its 32 lb, and the manual system, which the autopilot does not work, must be untouched.
  const full = RCS.supplies.map((u) => u.propellant.value);
  const at = (time) => live.samples.find((x) => x.t >= time).rcs.left[0];
  const end = live.state.rcs.left;
  assert.ok(end[0] > 0, 'the automatic supply lasts the flight');
  assert.equal(end[1], full[1], 'the manual supply is untouched');
  const marks = [
    ['the turnaround, to 02:37', TR.separation.at.value, 157],
    ['holding attitude to retrofire', 157, TR.retro.fires[0].value],
    ['retrofire and after, to the pack’s jettison', TR.retro.fires[0].value, TR.retropack.at.value],
    ['to the first of the air', TR.retropack.at.value, live.results.entryAt],
    ['through the entry to the drogue', live.results.entryAt, live.results.drogueAt],
  ];
  for (const [what, from, to] of marks) t.diagnostic(`${what.padEnd(46)} ${(at(from) - at(to)).toFixed(3)} kg`);
  t.diagnostic(
    `in all ${(full[0] - end[0]).toFixed(3)} kg of ${full[0].toFixed(2)} kg (${(((full[0] - end[0]) / full[0]) * 100).toFixed(1)} per cent)`,
  );
});

// --- engines behave as their kind does -----------------------------------------------------------
// No flight in the record has an engine that throttles, so the lever is proved on a fixture: this flight's trajectory
// with an engine nature it never had. It is a test's invention and is not data.
const FIXTURE = (nature) =>
  vehicle(
    // (in still air: these are flown hands off from the pad, which the day's wind does not allow)
    with_((tr) => (tr.body.engine = { confidence: 'estimated', source: 'a test fixture: not a real engine', ...nature }), true),
    SITE,
    SEA,
  );
const FLOW = TR.engine.thrust.value / (G0 * TR.engine.isp.value);

test('a fixed-thrust engine (the A-7) is on or off: any lever above nothing is full thrust', () => {
  const full = until(whole, whole.start(), { ...HANDS_OFF, throttle: 1 }, 5);
  const some = until(whole, whole.start(), { ...HANDS_OFF, throttle: 0.3 }, 5);
  assert.equal(some.throttle, 1, 'it does not throttle');
  assert.deepEqual(some.r, full.r, 'the same flight');
  assert.equal(TR.body.engine.kind, 'liquid');
  assert.equal(TR.body.engine.throttle, undefined);
  assert.equal(TR.body.engine.starts, 1);
});

test('a throttled engine (a fixture) follows its lever within its range, burns in proportion, and is off below its least', () => {
  const v = FIXTURE({ kind: 'liquid', throttle: [0.6, 1], starts: 2 });
  let s = until(v, v.start(), { ...HANDS_OFF, throttle: 1 }, 10);
  const mass = s.mass;
  const at = (lever) => ({ ...HANDS_OFF, throttle: lever });
  s = until(v, s, at(0.8), 12);
  assert.equal(s.throttle, 0.8);
  near(mass - s.mass, FLOW * 0.8 * 2, FLOW * TICK * 1.01, 'the flow is the thrust over g0 Isp: eight tenths of it');
  const main = v.sample(s).burning.find((m) => m.name === 'main').thrust;
  const sea = v.sample(until(v, v.start(), at(0.8), 0.02)).burning[0].thrust;
  near(sea, 0.8 * TR.engine.thrust.value, 50, 'eight tenths of rated thrust at the pad (and 10 N for the pad’s few metres of height)');
  assert.ok(main > sea, 'and the thinner air’s gain on top of it');
  s = v.tick(s, at(2));
  assert.equal(s.throttle, 1, 'no more than its most');
  // below its least it is off, not at three per cent: that is a shutdown
  s = v.tick(s, at(0.3));
  assert.ok(s.cutoff && s.throttle === 0, 'off');
  const coasting = s.mass;
  s = until(v, s, at(0.3), s.t + 1);
  assert.equal(s.mass, coasting, 'nothing burned');
  // it can be started twice: this is the second
  s = v.tick(s, at(0.7));
  assert.ok(!s.cutoff && s.starts === 2 && s.throttle === 0.7, 'lit again');
  s = v.tick(s, at(0));
  s = until(v, s, at(1), s.t + 1);
  assert.ok(s.cutoff && s.starts === 2 && s.throttle === 0, 'and a third start is refused');
});

test('a solid, lit, burns to its end whatever is asked; and so do this flight’s own', () => {
  const v = FIXTURE({ kind: 'solid', starts: 1 });
  let s = until(v, v.start(), { ...HANDS_OFF, throttle: 1 }, 2);
  s = until(v, s, HANDS_OFF, 150);
  assert.ok(s.cutoff, 'it burned out');
  const liquids = TR.body.parts.reduce((sum, p) => sum + (p.fluid ? p.mass : 0), 0);
  near(s.mass, TR.liftoffMass.value - liquids, FLOW * TICK * 1.5, 'having burned all there was, the lever at nothing all the while');
  s = until(v, s, { ...HANDS_OFF, throttle: 1 }, 151);
  assert.equal(s.starts, 1, 'and it is not lit twice');

  // the retrorockets: fired, they burn their time whatever the command does next, and their impulse is thrust times time
  let c = until(whole, whole.start(), autopilot(whole), 200);
  c = whole.tick(c, { ...HANDS_OFF, retro: true });
  const fired = c.retroAt;
  let impulse = 0;
  const lit = new Set();
  while (c.t < fired + 40) {
    for (const m of whole.sample(c).burning) {
      impulse += m.thrust * TICK;
      lit.add(m.name);
    }
    c = whole.tick(c, { ...HANDS_OFF, retro: c.t < fired + 1 });
  }
  assert.equal(c.retroAt, fired, 'fired once');
  assert.deepEqual([...lit], ['retro 1', 'retro 2', 'retro 3']);
  near(impulse / (3 * TR.retro.thrust.value * TR.retro.burn.value), 1, 0.002, 'three motors’ thrust for their burning time');

  // the escape rocket: the integral of its thrust is its recorded impulse
  let a = whole.tick(until(whole, whole.start(), autopilot(whole), 20), { ...HANDS_OFF, abort: true });
  let pull = 0;
  while (a.t < a.abortAt + 2) {
    pull += (whole.sample(a).burning.find((m) => m.name === 'escape')?.thrust ?? 0) * TICK;
    a = whole.tick(a, HANDS_OFF);
  }
  // (by the motor's own curve, which encloses 3 per cent more than the nominal figure: tests/abort.test.mjs holds it to its figure's legend)
  near(pull / TR.body.escape.impulse.value, 1.03, 0.005, 'the escape rocket’s impulse: its curve’s, against the nominal 56,500 lb-s');
});

// --- manual means manual --------------------------------------------------------------------------
test('with the spacecraft’s own sequence off and nobody commanding, there are no parachutes: it hits the sea at its terminal speed', (t) => {
  const record = autopilot(whole);
  const none = flyLive(whole, (s) => ({ ...record(s), automatic: false }));
  const s = none.state;
  assert.ok(s.landing && s.drogueAt === null && s.mainAt === null, 'down, with nothing out');
  // the speed at which the air's drag on the blunt end is its weight, at sea level: set from the inputs, to 2 per cent
  const terminal = Math.sqrt((2 * TR.retropack.mass.value * G0) / (1.225 * TR.area.value * 1.0));
  near(s.landing.vertical / terminal, 1, 0.03, 'terminal speed, heat shield first');
  assert.ok(s.landing.vertical > 80, `${s.landing.vertical.toFixed(0)} m/s`);
  t.diagnostic(
    `no parachutes: the sea at ${s.landing.vertical.toFixed(1)} m/s (terminal ${terminal.toFixed(1)}), ${s.landing.t.toFixed(0)} s`,
  );
  // the main alone, late, still saves it; the drogue alone does not
  const drogueOnly = flyLive(whole, (x) => ({ ...record(x), automatic: false, drogue: x.enteredAt !== null && x.t > 600 }));
  assert.ok(drogueOnly.state.drogueAt !== null && drogueOnly.state.mainAt === null);
  assert.ok(drogueOnly.state.landing.vertical > 40, `under the drogue alone: ${drogueOnly.state.landing.vertical.toFixed(0)} m/s`);
});

test('commanded by hand at the times the automatic flight did them, the events give the same flight', () => {
  const record = autopilot(whole);
  const { drogueAt, mainAt } = live.state;
  // (an event commanded in a tick happens at that tick's start; the barostat's happened at the end of the tick before)
  const hand = flyLive(whole, (s) => ({ ...record(s), automatic: false, drogue: s.t >= drogueAt - 1e-9, main: s.t >= mainAt - 1e-9 }));
  near(hand.state.drogueAt, drogueAt, 1e-9, 'the drogue when it was');
  near(hand.state.mainAt, mainAt, 1e-9, 'the main when it was');
  for (const k of ['r', 'v', 'q', 'w', 'mass']) assert.deepEqual(hand.state[k], live.state[k], `${k} to the last bit`);
  assert.deepEqual(hand.results, live.results);
});

test('what goes wrong when it is done wrong comes of the physics', (t) => {
  const record = autopilot(whole);
  // the tower kept: no parachute can come out past it, so asked for or not there is none
  const towered = flyLive(whole, (s) => ({
    ...record(s),
    tower: false,
    separate: false,
    abort: s.t >= 100,
    automatic: false,
    drogue: true,
    main: true,
  }));
  assert.ok(!towered.state.shed.tower && towered.state.mainAt === null, 'tower on: no parachutes');
  assert.ok(towered.state.landing.vertical > 60, `and it comes down at ${towered.state.landing.vertical.toFixed(0)} m/s`);
  // the retropack kept through the entry: 276 lb heavier all the way down, so it falls faster under the same parachute
  const packed = flyLive(whole, (s) => ({ ...record(s), retropack: false }));
  near(
    packed.state.landing.vertical / live.state.landing.vertical,
    Math.sqrt(TR.separation.mass.value / TR.retropack.mass.value),
    0.01,
    'heavier under the main',
  );
  // Retrofire without turning round: the spacecraft still points as the booster left it, so the rockets push it on
  // instead of holding it back and it lands further out. (The threshold first written here was 5 km, a guess at a push
  // straight along the path; the booster's attitude is 40 degrees off the path by then and the answer is 3 km. The
  // test now asks only for what the physics must give: longer, by more than a kilometre.)
  const hold = autopilot(whole, { pitch: false, yaw: false, roll: false });
  const wrong = flyLive(whole, (s) => (s.shed.booster && s.retroAt === null ? { ...hold(s) } : record(s)));
  assert.ok(
    wrong.results.range > live.results.range + 1000,
    `fired the wrong way round: ${((wrong.results.range - live.results.range) / 1000).toFixed(1)} km long`,
  );
  t.diagnostic(
    `tower kept ${towered.state.landing.vertical.toFixed(0)} m/s; pack kept ${packed.state.landing.vertical.toFixed(2)} m/s; retrofire unturned ${((wrong.results.range - live.results.range) / 1000).toFixed(1)} km long`,
  );
});

test('a tower let go early is not propellant burned: the engine runs as long', () => {
  // the programme flown by the autopilot, the engine never cut by anyone, and the tower let go at ten seconds or not at all
  const v = vehicle(TR, SITE, SEA);
  const auto = autopilot(v, { sequence: false });
  const runOut = (towerAt) => {
    let s = v.start();
    while (!s.cutoff && !s.landing && s.t < 200) s = v.tick(s, { ...auto(s), throttle: 1, tower: s.t >= towerAt });
    return s;
  };
  const [kept, early] = [runOut(Infinity), runOut(10)];
  assert.ok(early.shed.tower && !kept.shed.tower && early.cutoff && kept.cutoff && !early.broke && !kept.broke);
  near(early.t, kept.t, TICK, 'when the tanks run dry, tower or no tower');
});

test('a programme that never tilts still has a launch azimuth: no attitude is lost', () => {
  const v = vehicle(
    with_((tr) => {
      tr.tilt.points = [
        [0, 0],
        [100, 0],
      ];
    }),
    SITE,
    SEA,
  );
  const s = until(v, v.start(), autopilot(v), 20);
  for (const x of [...s.q, ...s.r, ...s.v, ...s.w]) assert.ok(Number.isFinite(x), 'every figure of the state is a number');
  near(dot(v.launch.downrange, v.launch.up), 0, 1e-12, 'downrange is level');
  near(dot(v.launch.downrange, whole.launch.downrange), 1, 1e-12, 'and the same as the tilted programme’s');
  assert.ok(v.sample(s).altitude > 100, 'and it has climbed');
});

test('turning in still air, a body is damped by the air on its fins', () => {
  // the stack held still in the pad's air (which moves with the ground), turning about an axis across it
  const v = vehicle(TR, SITE, SEA);
  const s = until(v, v.start(), autopilot(v), 2);
  const still = { ...s, v: cross([0, 0, 7.292115e-5], s.r), w: [0, 0.3, 0], cutoff: true, throttle: 0 };
  const after = v.tick(still, HANDS_OFF);
  assert.ok(Math.abs(after.w[1]) < 0.3 - 1e-6, `the rate has fallen: ${after.w[1]}`);
});

test('level is the ellipsoid’s: straight up along the plumb line at the pad is a climb of 90 degrees', () => {
  const v = vehicle(TR, SITE, SEA);
  const s = until(v, v.start(), autopilot(v), 1);
  const rising = { ...s, v: add(cross([0, 0, 7.292115e-5], s.r), scale(v.launch.up, 50)) };
  near(v.sample(rising).groundClimb, 90, 0.01, 'the climb angle of a rise along geodetic up');
});
