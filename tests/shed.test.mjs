// src/sim/forces.ts, shed.ts and loads.ts: what a vehicle lets go, flown, and what the air does to
// a vehicle flown badly.
//
// The tolerances were set before any of it was run, from the physics:
//   - momentum across a parting is arithmetic on doubles: a part in 10^12;
//   - a body in no air is fly.ts's `coast` by another integrator and step: a millimetre in a
//     minute's flight at kilometres a second;
//   - a tumbling body's terminal speed is known only as lying between the speeds for its least and
//     its greatest drag area, and that is what is asked of it;
//   - what the record gives (the parting speed, 30 ft/s give or take 3) is held to the arithmetic,
//     since the simulator is given the figure.
// Nothing in the simulator or in a flight's data was changed to bring a figure in.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { autopilot, blend } from '../src/sim/autopilot.ts';
import { coast, fly, G0 } from '../src/sim/fly.ts';
import { airForces, part } from '../src/sim/forces.ts';
import { CAUTION, HOLDS, SNAPS, standing, strain, UNSTRAINED } from '../src/sim/loads.ts';
import { aboutAxis, turn } from '../src/sim/rigid.ts';
import { recordRelease, ShedRun, Sheds, shedder } from '../src/sim/shed.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { add, cross, DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const TR = flight.trajectory;
const SHEDS = TR.body.sheds;
const def = (on) => SHEDS.find((d) => d.on === on);

function with_(change) {
  const tr = structuredClone(TR);
  change(tr);
  return tr;
}
/** Tick a vehicle on under a pilot until `stop` says so; every state on the way goes to `each`. */
function run(v, pilot, stop, each = () => {}) {
  let s = v.start();
  for (;;) {
    const next = v.tick(s, pilot);
    if (next.ticks === s.ticks && next.released === s.released) break;
    each(s, next);
    s = next;
    if (s.landing || stop(s)) break;
  }
  return s;
}

const whole = vehicle(TR, SITE, SEA);
/** The record's programme flown by the autopilot, to the sea: every parting on the way, with the vehicle just before and just after. */
const partings = [];
let peak = { load: 0, t: 0, lateral: 0 };
const landed = run(
  whole,
  autopilot(whole),
  () => false,
  (before, after) => {
    if (after.released.length > before.released.length)
      partings.push({ before, after, gone: after.released.slice(before.released.length) });
    if (after.strain.load > peak.load) peak = { load: after.strain.load, t: after.t, lateral: whole.sample(after).lateral };
  },
);

test('one body made two keeps its momentum, linear and angular, whatever it was doing', () => {
  // a body turning at half a radian a second about an axis across it, 1,000 kg with its centre at 4 m; 300 kg leaves from 9 m, pushed off at 3 m/s
  const q = aboutAxis(unit([1, 2, 3]), 0.7);
  const w = [0.1, 0.5, -0.3];
  const body = { r: [7e6, 1e3, 2e3], v: [100, 7000, -50], q, w, mass: 1000, centre: 4 };
  const { kept, gone } = part(body, { mass: 300, centre: 9 }, 3);
  near(kept.mass, 700, 1e-9, 'what is left');
  near(kept.centre, (1000 * 4 - 300 * 9) / 700, 1e-12, 'its centre of mass');
  const p = add(scale(kept.v, kept.mass), scale(gone.v, gone.mass));
  for (const i of [0, 1, 2]) near(p[i], body.v[i] * 1000, 1e-8, `linear momentum, axis ${i}`);
  const centre = scale(add(scale(kept.r, kept.mass), scale(gone.r, gone.mass)), 1 / 1000);
  for (const i of [0, 1, 2]) near(centre[i], body.r[i], 1e-8, `the pair's centre of mass, axis ${i}`);
  // Angular momentum about that centre: each piece's own (the same rates on its own inertia) and its orbit about the
  // centre. The whole's inertia across is the two pieces' with their offsets, so give them any and build the whole's.
  const [ik, ig] = [900, 250];
  const whole = ik + kept.mass * (kept.centre - 4) ** 2 + ig + gone.mass * (gone.centre - 4) ** 2;
  const [rk, rg] = [200, 60]; // about the long axis they simply add
  const spin = (roll, across) => turn(q, [roll * w[0], across * w[1], across * w[2]]);
  const orbit = (piece) => scale(cross(sub(piece.r, body.r), sub(piece.v, body.v)), piece.mass);
  const after = add(add(spin(rk, ik), spin(rg, ig)), add(orbit(kept), orbit(gone)));
  const before = spin(rk + rg, whole);
  // (7,000 km from the Earth's centre a double places a point to a nanometre, and the arms here are metres: a part in 10^9)
  for (const i of [0, 1, 2]) near(after[i], before[i], 1e-9 * length(before), `angular momentum, axis ${i}`);
  // and they part at the speed asked for, along the axis, the lighter going the faster
  const axis = turn(q, [1, 0, 0]);
  const apart = dot(sub(sub(gone.v, kept.v), turn(q, cross(w, [gone.centre - kept.centre, 0, 0]))), axis);
  near(apart, 3, 1e-12, 'the speed they part at');
});

test('every parting of the flight keeps the momentum of the two: tower, booster, retropack', (t) => {
  assert.deepEqual(
    partings.flatMap((p) => p.gone.map((g) => g.on)),
    ['tower', 'separation', 'retropack'],
  );
  for (const { before, gone } of partings) {
    // (a tick's commands take effect at its start: `before` is the vehicle at the event, whole, and the release carries both pieces as they were made)
    const [g] = gone;
    const kept = g.rest;
    const m0 = kept.mass + g.mass;
    near(m0, before.mass, 1e-9 * before.mass, `${g.on}: the two weigh what there was`);
    const p = add(scale(kept.v, kept.mass), scale(g.v, g.mass));
    const scaleOf = m0 * length(before.v);
    for (const i of [0, 1, 2]) near(p[i], m0 * before.v[i], 1e-12 * scaleOf, `${g.on}: linear momentum, axis ${i}`);
    const centre = scale(add(scale(kept.r, kept.mass), scale(g.r, g.mass)), 1 / m0);
    near(length(sub(centre, before.r)), 0, 1e-8, `${g.on}: the pair's centre of mass is where the whole's was`);
    // Angular momentum about that centre. Both keep the whole's rates on their own inertia, so what is left to check is
    // the orbital part: two masses a fixed distance apart on the axis, going round with the body, are their reduced
    // mass times that distance squared times the rate across the axis; the push, along the line between them, adds none.
    const axis = turn(before.q, [1, 0, 0]);
    const orbit = add(
      scale(cross(sub(kept.r, centre), sub(kept.v, before.v)), kept.mass),
      scale(cross(sub(g.r, centre), sub(g.v, before.v)), g.mass),
    );
    const turning = turn(before.q, [0, before.w[1], before.w[2]]);
    const apart = dot(sub(g.r, kept.r), axis);
    const want = scale(turning, ((kept.mass * g.mass) / m0) * apart * apart);
    // (a double places a point this far from the Earth's centre to a nanometre and a half: that, on each piece's momentum about the centre)
    const rounding = 4e-9 * (kept.mass * length(sub(kept.v, before.v)) + g.mass * length(sub(g.v, before.v)));
    near(length(sub(orbit, want)), 0, rounding + 1e-9 * length(want), `${g.on}: the angular momentum of the two about their centre`);
    t.diagnostic(
      `${g.on} at ${g.t.toFixed(2)} s: ${g.mass.toFixed(1)} kg leaves ${kept.mass.toFixed(1)} kg at ${dot(sub(kept.v, g.v), axis).toFixed(3)} m/s along the axis`,
    );
  }
});

test('the booster and the spacecraft part at the record’s 30 ft/s, shared by their masses', () => {
  const { before, gone } = partings.find((p) => p.gone[0].on === 'separation');
  const [booster] = gone;
  const speed = TR.separation.speed.value;
  const m = TR.separation.mass.value;
  // along the axis (across it each piece has what the stack's slow turning gave its own place): the two part at the speed, the booster's share the spacecraft's part of the whole
  const axis = turn(before.q, [1, 0, 0]);
  near(dot(sub(booster.rest.v, booster.v), axis), speed, 1e-9, 'the speed they part at');
  near(-dot(sub(booster.v, before.v), axis), (speed * m) / (m + booster.mass), 1e-9, 'the booster’s own change of speed');
  near(
    booster.mass,
    TR.separation.boosterMass.value,
    0.02 * booster.mass,
    'the booster as it leaves, against the trajectory’s figure for it',
  );
  assert.ok(dot(sub(booster.v, before.v), turn(before.q, [1, 0, 0])) < 0, 'it is pushed back along the axis');
});

test('a stack that is turning as it parts, or parts early, still keeps its momentum', () => {
  // turning at a radian a second about an axis across it when the spacecraft is let go; and let go at 100 s, the tanks a third full
  for (const [what, t, w] of [
    ['turning at separation', TR.separation.at.value - 0.1, [0, 1, 0]],
    ['an early separation', 100, [0.02, -0.4, 0.7]],
  ]) {
    const v = vehicle(
      with_((tr) => {
        delete tr.body.limits;
      }),
      SITE,
      SEA,
    );
    const auto = autopilot(v, { sequence: false });
    let s = run(v, auto, (x) => x.t >= t);
    s = { ...s, w };
    const after = v.tick(s, { ...auto(s), separate: true });
    const pieces = after.released.filter((g) => g.t === s.t);
    assert.ok(pieces.length >= 1 && pieces.at(-1).on === 'separation', what);
    // every piece let go in that tick and the spacecraft that went on (the last release's rest): together the stack
    const all = [...pieces, pieces.at(-1).rest];
    const mass = all.reduce((sum, p) => sum + p.mass, 0);
    near(mass, s.mass, 1e-9 * s.mass, `${what}: the pieces weigh what the stack did`);
    const p = all.reduce((sum, x) => add(sum, scale(x.v, x.mass)), [0, 0, 0]);
    const scaleOf = s.mass * length(s.v);
    for (const i of [0, 1, 2]) near(p[i], s.mass * s.v[i], 1e-12 * scaleOf, `${what}: linear momentum, axis ${i}`);
    const centre = scale(
      all.reduce((sum, x) => add(sum, scale(x.r, x.mass)), [0, 0, 0]),
      1 / mass,
    );
    near(length(sub(centre, s.r)), 0, 1e-8, `${what}: the centre of mass of the pieces is the stack's`);
  }
});

test('each staging steps the mass, the centre of mass and the inertia as the parts say', () => {
  for (const { before, after, gone } of partings) {
    const [g] = gone;
    const [was, is] = [whole.mass(before), whole.mass(after)];
    assert.ok(is.mass < was.mass && is.across < was.across && is.roll <= was.roll, `${g.on}: lighter, and easier to turn`);
    if (g.on === 'tower') {
      near(was.mass - is.mass, g.mass, 0.02, 'the tower’s weight goes (and a tick’s propellant, none: the engine is out)');
      assert.ok(is.centre < was.centre, 'the centre of mass moves down the stack');
      near(was.mass * was.centre, is.mass * is.centre + g.mass * g.centre, 1e-6 * was.mass * was.centre, 'by the tower’s own moment');
    }
    if (g.on === 'retropack') {
      near(
        is.centre,
        (g.mass * (TR.body.capsule.centre.value - g.centre)) / is.mass,
        1e-9,
        'the spacecraft’s centre of mass moves toward its small end by the pack’s moment',
      );
    }
  }
});

test('a body let go in no air coasts as fly.ts coasts, and keeps its spin', () => {
  // 300 km up, at 2 km/s, turning at a third of a radian a second about an axis across it
  const r = scale(unit([1, 0.2, 0.5]), 6.678e6);
  const v = scale(unit(cross([0, 0, 1], r)), 2000);
  const release = {
    on: 'separation',
    t: 0,
    r,
    v,
    q: aboutAxis(unit([0, 1, 0]), 0.4),
    w: [0, 0.33, 0],
    mass: 4500,
    roll: 3000,
    across: 180_000,
    centre: 8,
  };
  const body = shedder(TR, SITE, SEA, def('separation'), release);
  let s = body.start();
  while (s.t < 60 - TICK / 2) s = body.tick(s);
  const want = coast(r, v, 60, 0.05);
  near(length(sub(s.r, want.r)), 0, 1e-3, 'where it is after a minute, against coast()');
  near(length(sub(s.v, want.v)), 0, 1e-5, 'and its velocity');
  near(s.w[1], 0.33, 1e-12, 'its rate about the axis it was turning on');
});

test('in air a tumbling body comes to the terminal speed its weight and drag areas give', (t) => {
  // the retropack let go broadside and turning, 12 km up at 300 m/s straight down
  const d = def('retropack');
  const up = unit([1, 0.3, 0.4]);
  const r = scale(up, 6.378e6 + 12_000);
  const earth = cross([0, 0, 7.292115e-5], r);
  const side = unit(cross(up, [0, 0, 1]));
  const mass = d.mass.value;
  const release = {
    on: 'retropack',
    t: 0,
    r,
    v: add(earth, scale(up, -300)),
    q: aboutAxis(unit(cross([1, 0, 0], side)), Math.acos(side[0])),
    w: [0, 1.5, 0],
    mass,
    roll: mass * d.gyration.roll.value ** 2,
    across: mass * d.gyration.across.value ** 2,
    centre: d.centre.value,
  };
  const body = shedder(TR, SITE, SEA, d, release);
  let s = body.start();
  let first = null;
  // (it turns as it falls, showing the air now one area and now another: what holds it up is taken over the last ten seconds)
  let held = 0;
  let count = 0;
  let lag = 0;
  while (!s.landing && s.t < 40) {
    s = body.tick(s);
    const now = body.feel(s);
    first ??= now;
    if (s.t > 30) {
      held += length(now.force) / (mass * G0);
      // falling into thicker air its terminal speed falls, and it is slowed to keep to it: v^2 / 2H of deceleration, H the air's scale height there
      const scaleHeight = 100 / Math.log(atmosphere(now.altitude).density / atmosphere(now.altitude + 100).density);
      lag += now.airspeed ** 2 / (2 * scaleHeight * G0);
      count++;
    }
  }
  const f = body.feel(s);
  // at terminal speed the drag is the weight: v = sqrt(2 m g / (rho CdA)), for the least and the greatest area it can show the air
  const rho = atmosphere(f.altitude).density;
  const areas = [d.ahead.value, d.astern.value, d.side.dragArea.value];
  const [slow, fast] = [Math.max(...areas), Math.min(...areas)].map((a) => Math.sqrt((2 * mass * G0) / (rho * a)));
  t.diagnostic(
    `after 40 s, ${(f.altitude / 1000).toFixed(1)} km up: ${f.airspeed.toFixed(1)} m/s, between ${slow.toFixed(1)} and ${fast.toFixed(1)}; it began at ${first.airspeed.toFixed(0)}`,
  );
  assert.ok(f.airspeed < first.airspeed, 'it has slowed');
  // (falling into thicker air it runs a little ahead of the terminal speed where it is: 5 per cent is allowed for that)
  assert.ok(f.airspeed >= slow * 0.98 && f.airspeed <= fast * 1.05, `its speed, ${f.airspeed}, lies between ${slow} and ${fast}`);
  t.diagnostic(
    `over the last ten seconds the air’s force is ${(held / count).toFixed(3)} of its weight; ${(1 + lag / count).toFixed(3)} is what keeping to a falling terminal speed takes`,
  );
  near(held / count, 1 + lag / count, 0.1, 'the air holds its weight and slows it as the thickening air requires, to a tenth');
});

test('side on, the air pushes as the sine squared, on the middle of the side; turning, the side damps it', () => {
  const shape = { area: 1, ahead: 0, astern: 0, surfaces: [], side: { dragArea: 10, from: 0, to: 6 } };
  const rho = 1.2;
  for (const alpha of [5, 30, 90]) {
    const through = [100 * Math.cos(alpha * DEG), 0, 100 * Math.sin(alpha * DEG)];
    const { force, torque } = airForces(shape, 2, through, [0, 0, 0], rho);
    near(force[2], -0.5 * rho * 100 * 100 * 10 * Math.sin(alpha * DEG) ** 2, 1e-6, `the push at ${alpha} degrees`);
    // it acts at the middle of the stretch (station 3), a metre ahead of a centre of mass at 2: positive z push ahead of the centre turns the nose toward +z, a torque about -y
    near(torque[1], -1 * force[2], 1e-6, 'and its torque about the centre of mass');
    near(force[0], 0, 1e-12, 'nothing along the axis from the side');
  }
  // turning about its middle in still air: no net force, and a torque against the turning, as the integral says: rho Cd w^2 L^4 / 64 per unit of width, here CdA/L per metre
  const { force, torque } = airForces(shape, 3, [0, 0, 0], [0, 0.5, 0], rho);
  near(Math.hypot(...force), 0, 1e-9, 'no net force on a body turning about its middle');
  const exact = (0.5 * rho * (10 / 6) * 0.5 ** 2 * 6 ** 4) / 32;
  assert.ok(torque[1] < 0, 'the torque is against the turn');
  near(-torque[1], exact, 0.03 * exact, 'and within 3 per cent of the integral');
  assert.ok(-torque[1] < exact, 'from below: the pieces’ middles understate the ends');
});

test('end on, the drag is the curve’s for the end that leads; the capsule at an angle is slowed less and lifted', () => {
  const shape = { area: 2.81, ahead: 1.5, astern: 4.4, surfaces: [], side: null };
  const rho = 0.01;
  const drag = (through) => {
    const f = airForces(shape, 0, through, [0, 0, 0], rho).force;
    return -dot(f, unit(through));
  };
  near(drag([-1000, 0, 0]), 0.5 * rho * 1e6 * 4.4, 1e-9, 'blunt end first: the entry curve’s drag, as fly.ts has it');
  near(drag([1000, 0, 0]), 0.5 * rho * 1e6 * 1.5, 1e-9, 'small end first: the other curve’s');
  const a = 20 * DEG;
  near(
    drag([-1000 * Math.cos(a), 0, 1000 * Math.sin(a)]),
    0.5 * rho * 1e6 * 4.4 * Math.cos(a) ** 2,
    1e-9,
    '20 degrees off: less by the cosine squared',
  );
  near(drag([0, 0, 1000]), 0, 1e-9, 'and broadside the ends give none: that is the side’s');
});

test('the tower leaves on both its rockets, ahead of the stack, and does not come back to it', (t) => {
  const { before, gone } = partings.find((p) => p.gone[0].on === 'tower');
  const body = shedder(TR, SITE, SEA, def('tower'), gone[0]);
  let s = body.start();
  // the stack coasts on from the event (its engine is out by then: the record's order)
  assert.ok(before.cutoff, 'the engine was out when the tower went');
  const rest = gone[0].rest;
  let last = length(sub(gone[0].r, rest.r));
  const first = last;
  // the same tower with no air on it, for the arithmetic of its rocket
  const bare = structuredClone(def('tower'));
  bare.ahead.value = bare.astern.value = bare.side.dragArea.value = 0;
  const airless = shedder(TR, SITE, SEA, bare, gone[0]);
  let a = airless.start();
  for (let i = 1; i <= 800; i++) {
    s = body.tick(s);
    a = airless.tick(a);
    // (the stack is coasted: 65 km up the air slows it by a few millimetres a second in these eight)
    const stack = coast(rest.r, rest.v, s.t - gone[0].t, TICK);
    const gap = length(sub(s.r, stack.r));
    assert.ok(gap > last - 1e-9, `the gap grows at ${s.t.toFixed(2)} s: ${gap} after ${last}`);
    last = gap;
  }
  const gained = length(sub(a.r, coast(rest.r, rest.v, a.t - gone[0].t, TICK).r)) - first;
  // The record's flight fires both: the escape rocket (thrust for its burn, then the rest of its impulse falling evenly
  // to nothing) and the jettison rocket (a plain burn). Each gives its impulse over the tower's mass, and in no air the
  // distance gained is each rocket's share as if given at the middle of its own impulse.
  const motors = def('tower').motors;
  assert.deepEqual(
    motors.map((m) => m.name),
    ['escape rocket', 'tower jettison rocket'],
  );
  let dv = 0;
  let reach = 0;
  for (const m of motors) {
    const f = m.thrust.value;
    const b = m.burn.value;
    const tail = m.impulse ? (2 * (m.impulse.value - f * b)) / f : 0;
    const impulse = f * b + (f * tail) / 2;
    // the middle of the impulse: the flat part's at b / 2, the falling part's a third of the way along it
    const middle = (f * b * (b / 2) + ((f * tail) / 2) * (b + tail / 3)) / impulse;
    dv += impulse / gone[0].mass;
    reach += (impulse / gone[0].mass) * (8 - middle);
  }
  t.diagnostic(
    `eight seconds on it is ${(last - first).toFixed(1)} m further ahead of the stack than it stood (${gained.toFixed(1)} m in no air); its rockets gave it ${dv.toFixed(1)} m/s`,
  );
  near(gained, reach, 0.002 * reach, 'how far ahead in no air, by its rockets’ impulses over its mass');
  assert.ok(dv > 400 && dv < 550, `several hundred metres a second: ${dv.toFixed(1)}`);
  assert.ok(last - first < gained && last - first > 0.9 * gained, 'and in the thin air there, a little less');
});

test('after an abort the escape rocket is spent: the tower goes on its jettison rocket alone', () => {
  const { gone } = partings.find((p) => p.gone[0].on === 'tower');
  const bare = structuredClone(def('tower'));
  bare.ahead.value = bare.astern.value = bare.side.dragArea.value = 0;
  const speedGained = (release) => {
    const body = shedder(TR, SITE, SEA, bare, release);
    let s = body.start();
    for (let i = 1; i <= 800; i++) s = body.tick(s);
    const stack = coast(release.rest.r, release.rest.v, s.t - release.t, TICK);
    return length(sub(s.v, stack.v));
  };
  const jettison = bare.motors.find((m) => !m.unless);
  near(
    speedGained({ ...gone[0], aborted: true }),
    (jettison.thrust.value * jettison.burn.value) / gone[0].mass,
    0.05,
    'the jettison rocket’s impulse over its mass',
  );
  assert.ok(speedGained(gone[0]) > 40 * speedGained({ ...gone[0], aborted: true }), 'and on a good flight the escape rocket fires with it');
});

test('the shed bodies of the record’s programme come down, and say where', (t) => {
  const sheds = new Sheds(TR, SITE, SEA);
  sheds.follow(landed);
  assert.equal(sheds.all.length, 3);
  for (const body of sheds.all) {
    const end = body.finish();
    const s = body.now;
    t.diagnostic(
      `${body.shedder.def.name}: apogee ${(s.apogee / 1852).toFixed(1)} n. mi., greatest pressure ${(s.peakQ / 1000).toFixed(1)} kPa, down at ${end.t.toFixed(1)} s, ` +
        `${(end.range / 1852).toFixed(1)} n. mi. from the pad (${end.latitude.toFixed(3)} N, ${(-end.longitude).toFixed(3)} W) at ${end.speed.toFixed(0)} m/s`,
    );
    assert.ok(end.t > body.from && Number.isFinite(end.speed) && end.vertical > 0, 'it came down, falling');
    assert.ok(s.apogee > 150_000, 'having gone over the top with the spacecraft');
  }
  // the retropack is light for its size: it is the slowest of the three at the sea
  const speed = (on) => sheds.get(on).now.landing.speed;
  assert.ok(speed('retropack') < speed('tower') && speed('retropack') < speed('separation'), 'the retropack falls slowest');
  t.diagnostic(
    `the spacecraft itself: down at ${landed.landing.t.toFixed(1)} s at ${landed.landing.latitude.toFixed(3)} N, ${(-landed.landing.longitude).toFixed(3)} W`,
  );
});

test('a shed body’s flight is the same however it is asked for, and is kept for showing again', () => {
  const release = partings.find((p) => p.gone[0].on === 'separation').gone[0];
  const make = () => new ShedRun(shedder(TR, SITE, SEA, def('separation'), release));
  const [a, b] = [make(), make()];
  a.upTo(release.t + 400);
  for (let t = release.t; t < release.t + 400; t += 0.0166) b.upTo(t); // a frame at a time
  b.upTo(release.t + 400);
  assert.deepEqual(b.now, a.now);
  // shown again at an earlier instant, it is where it was
  const then = a.at(release.t + 37.3);
  const fresh = make();
  assert.deepEqual(fresh.at(release.t + 37.3), then);
  assert.equal(a.at(release.t - 1), null, 'it is nowhere before it left');
  // between kept states the cubic is within a centimetre of the flight itself
  const body = shedder(TR, SITE, SEA, def('separation'), release);
  let s = body.start();
  while (s.t < release.t + 37.3 - TICK / 2) s = body.tick(s);
  near(length(sub(then.r, s.r)), 0, 0.01, 'the kept flight against the flight');
});

test('let go standing on the pad, the booster stays where it stands', () => {
  // an abort before the engine is lit
  const v = vehicle(TR, SITE, SEA);
  const s = v.tick(v.start(), { throttle: 0, pitch: 0, yaw: 0, roll: 0, abort: true });
  assert.equal(s.released.length, 1);
  const body = new ShedRun(shedder(TR, SITE, SEA, def('separation'), s.released[0]));
  assert.ok(body.now.landing, 'it is down from the first');
  const later = body.at(600);
  assert.ok(later.down);
  // carried round with the Earth: 600 s on it is where the pad has gone
  const moved = length(sub(later.r, s.released[0].r));
  // (the chord of the arc the pad has gone through)
  const from = s.released[0].r;
  near(moved, 2 * Math.hypot(from[0], from[1]) * Math.sin((7.292115e-5 * 600) / 2), 0.01, 'it has gone round with the ground');
});

test('a release made from the record’s run starts the booster where the spacecraft left it, 30 ft/s slower along the axis', () => {
  const batch = fly(TR, SITE, SEA);
  const at = TR.separation.at.value;
  const s = batch.samples.find((x) => x.t === at);
  const axis = whole.programme(at);
  const release = recordRelease(TR, def('separation'), at, s.r, s.v, axis, true);
  near(dot(sub(s.v, release.v), axis), TR.separation.speed.value, 1e-9, 'slower along the axis by the parting speed');
  near(release.mass, TR.separation.boosterMass.value, 0.02 * release.mass, 'the booster’s mass, from the parts, against the trajectory’s');
  near(dot(turn(release.q, [1, 0, 0]), axis), 1, 1e-12, 'pointing as the programme has the stack');
  const tower = recordRelease(TR, def('tower'), TR.body.tower.at.value, s.r, s.v, axis, true);
  near(length(sub(tower.v, s.v)), 0, 1e-12, 'the tower leaves with the stack’s own velocity: its rocket does the rest');
});

test('the structure: caution from four fifths of the limit, gone after half a second over it or at once at half as much again', () => {
  assert.equal(standing(0.5), 'safe');
  assert.equal(standing(CAUTION), 'caution');
  assert.equal(standing(1.01), 'over');
  let s = UNSTRAINED;
  let fails = false;
  for (let i = 0; i < Math.round(HOLDS / TICK) - 1; i++) ({ strain: s, fails } = strain(s, 1.2, TICK));
  assert.ok(!fails, 'not yet, a tick short of the time it holds');
  ({ strain: s, fails } = strain(s, 1.2, TICK));
  assert.ok(fails, 'gone at the time');
  // under the limit again in between, the count starts afresh
  s = strain(strain(UNSTRAINED, 1.2, 0.4).strain, 0.9, TICK).strain;
  assert.equal(s.over, 0);
  assert.ok(strain(UNSTRAINED, SNAPS, TICK).fails, 'and at once at SNAPS');
  near(s.most, 1.2, 1e-12, 'the most it has been is remembered');
});

test('on the record’s programme the stack goes through the greatest pressure with room to spare', (t) => {
  assert.equal(landed.broke, null);
  assert.ok(!landed.torn.drogue && !landed.torn.main, 'and both parachutes open inside what they can take');
  t.diagnostic(
    `the bending load is at most ${(100 * peak.load).toFixed(1)} per cent of the limit, at ${peak.t.toFixed(1)} s, with ${peak.lateral.toFixed(3)} g across the axis`,
  );
  assert.ok(peak.load < CAUTION, `no warning is raised: the most is ${peak.load} of the limit`);
});

test('a programme leaned 15 degrees through the greatest pressure breaks the stack at its joint, and the pieces keep its momentum', (t) => {
  const v = vehicle(TR, SITE, SEA);
  const lean = { pitch: 0, yaw: 0 };
  const auto = autopilot(v, { trim: () => lean });
  let event = null;
  const end = run(
    v,
    (s) => {
      lean.pitch = s.t >= 70 && s.t <= 90 ? 15 * DEG : 0;
      return auto(s);
    },
    (s) => s.t > 100,
    (before, after) => {
      if (after.broke && !before.broke) event = { before, after };
    },
  );
  assert.ok(end.broke, 'it broke');
  const { before, after } = event;
  t.diagnostic(
    `broke at ${after.broke.t.toFixed(2)} s: bending load ${(100 * after.broke.load).toFixed(0)} per cent of the limit at ${(after.broke.q / 1000).toFixed(1)} kPa, ${after.broke.alpha.toFixed(1)} degrees off the wind`,
  );
  assert.equal(after.broke.joint, 'separation');
  assert.ok(after.broke.t > 70 && after.broke.t < 90, 'while it was leaned');
  assert.ok(after.broke.load > 1, 'over the limit');
  assert.ok(after.cutoff && after.shed.booster, 'the engine is out and the booster gone its own way');
  assert.ok(after.abortAt !== null && !after.shed.tower, 'the spacecraft is pulled clear on its escape rocket, the tower still aboard');
  const booster = after.released.at(-1);
  assert.equal(booster.on, 'separation');
  // The break is found at the end of a tick and made of the stack as that tick left it: the same tick flown by a stack
  // that cannot break is the whole the two pieces must add up to.
  const unbreakable = vehicle(
    with_((tr) => {
      delete tr.body.limits;
    }),
    SITE,
    SEA,
  );
  const stack = unbreakable.tick(before, after.controls);
  const mk = after.mass;
  near(mk + booster.mass, stack.mass, 1e-9 * stack.mass, 'the two weigh what the stack did');
  const p = add(scale(after.v, mk), scale(booster.v, booster.mass));
  const centre = scale(add(scale(after.r, mk), scale(booster.r, booster.mass)), 1 / stack.mass);
  near(length(sub(centre, stack.r)), 0, 1e-7, 'the pieces’ centre of mass is where the unbroken stack’s is');
  const scaleOf = stack.mass * length(stack.v);
  for (const i of [0, 1, 2]) near(p[i], stack.mass * stack.v[i], 1e-12 * scaleOf, `linear momentum, axis ${i}`);
  // and it is the same break every time
  const again = run(
    vehicle(TR, SITE, SEA),
    (() => {
      const l = { pitch: 0, yaw: 0 };
      const a = autopilot(v, { trim: () => l });
      return (s) => {
        l.pitch = s.t >= 70 && s.t <= 90 ? 15 * DEG : 0;
        return a(s);
      };
    })(),
    (s) => s.t > 100,
  );
  assert.deepEqual(again.broke, end.broke);
});

test('a parachute let out in more pressure than it can take tears, and does not save the flight', (t) => {
  // the drogue let out by hand as the air comes on hard, well above its height
  const v = vehicle(TR, SITE, SEA);
  const auto = autopilot(v);
  let early = false;
  const end = run(
    v,
    (s) => {
      const c = auto(s);
      const q = s.shed.booster && s.enteredAt !== null ? v.sample(s).q : 0;
      if (q > 2 * TR.body.limits.drogue.value) early = true;
      return early ? blend(c, { drogue: true, main: true }) : c;
    },
    () => false,
  );
  assert.ok(end.torn.drogue && end.torn.main, 'both tore');
  near(end.chute.full, TR.main.dragArea.value * TR.body.limits.torn.value, 1e-9, 'what is left of the main is a twentieth of it');
  t.diagnostic(
    `it met the sea at ${end.landing.vertical.toFixed(1)} m/s, where a good main brings it down at ${landed.landing.vertical.toFixed(1)}`,
  );
  assert.ok(end.landing.vertical > 3 * landed.landing.vertical, 'and it comes down hard');
});
