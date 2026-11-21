// Manoeuvres made on another craft (src/sim/pursuit.ts), on orbits made up here: the target flown on its own forces; a
// burn solved to put it at a stated place at a stated instant; the coelliptic burn; the braking held at a station. Each
// is held to what it is for, by flying on under gravity (world/orbit.ts `step`) and looking. And the three ways a plan
// names its target (sim/plan.ts `TargetDef`): what a joint lets go is the flights' own tests' (apollo-7-flight.test.mjs);
// here, another flight's vehicle is where that flight's record run has it, to the bit after the change of clock and
// frame, and a published orbit is flown from as stated.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coelliptic, flownFrom, placeFrom, reach, stationPush } from '../src/sim/pursuit.ts';
import { EARTH } from '../src/world/bodies.ts';
import { add, cross, dot, length, scale, sub, unit } from '../src/world/frames.ts';
import { coast, step } from '../src/world/orbit.ts';

const GM = EARTH.gm.value;
const NONE = () => [0, 0, 0];
/** A state on a circular orbit of radius `r`, inclined 30 degrees, `angle` radians round from its node. */
function circular(r, angle = 0, climb = 0) {
  const n = [0, -Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)];
  const x = [1, 0, 0];
  const y = cross(n, x);
  const up = add(scale(x, Math.cos(angle)), scale(y, Math.sin(angle)));
  const forward = cross(n, up);
  return { r: scale(up, r), v: add(scale(forward, Math.sqrt(GM / r)), scale(up, climb)) };
}
/** Gravity and a burn flown ahead: 1 s steps through the burn, 10 s after (the `Ahead` a run gives). */
const ahead = (s, from, to, burn) => {
  let x = s;
  let at = from;
  while (at < to - 1e-9) {
    const firing = burn && at < burn.until - 1e-9;
    const h = Math.min(firing ? 1 : 10, (firing ? burn.until : to) - at);
    x = step(x, at, h, firing ? () => scale(burn.line, burn.accel) : undefined);
    at += h;
  }
  return x;
};

test('a target is flown from where it began, and an instant asked for twice is the same state', () => {
  const start = { t: 100, ...circular(6_650_000) };
  const target = flownFrom(start, NONE, () => false);
  assert.equal(target.at(99), undefined, 'nothing before it began');
  assert.deepEqual(target.at(100), { r: start.r, v: start.v });
  const far = target.at(100 + 5400);
  // asked for in another order, and between its kept states
  const other = flownFrom(start, NONE, () => false);
  other.at(100 + 86_400);
  assert.deepEqual(other.at(100 + 5400), far);
  let s = { r: start.r, v: start.v };
  for (let k = 0; k < 540; k++) s = step(s, 0, 10);
  assert.ok(length(sub(far.r, s.r)) < 1e-6, 'its kept states are ten-second steps of gravity');
  const mid = target.at(100 + 5405);
  assert.ok(length(sub(mid.r, step(s, 0, 5).r)) < 1e-3, 'and between two it is within a millimetre of the orbit');
  // one that comes down is gone from then
  const falls = flownFrom(start, NONE, (_, at) => at > 1000);
  assert.ok(falls.at(1000));
  assert.equal(falls.at(1200), undefined);
});

test('where a point is from a craft: ahead along its orbit, above it, and across', () => {
  const craft = circular(6_650_000);
  const there = circular(6_660_000, 0.01);
  const p = placeFrom(craft, there.r);
  assert.ok(Math.abs(p.ahead - 0.01 * 6_660_000) < 1e-3, `ahead ${p.ahead}`);
  assert.ok(Math.abs(p.above - 10_000) < 1e-6, `above ${p.above}`);
  assert.ok(Math.abs(p.across) < 1e-6);
  const behind = placeFrom(craft, circular(6_650_000, -0.001).r);
  assert.ok(behind.ahead < 0 && Math.abs(behind.above) < 1e-6);
});

test('a burn solved to reach the target puts it where it was aimed, whatever the guess', () => {
  const target = flownFrom({ t: 0, ...circular(6_650_000, 0.02) }, NONE, () => false);
  const craft = circular(6_630_000);
  const want = { ahead: 5_000, above: 1_000 };
  const at = 2400;
  for (const guess of [[0, 0, 0], scale(unit(craft.v), 8), scale(unit(craft.r), -5)]) {
    const burn = reach(ahead, target, craft, 0, 0.5, want, at, guess);
    assert.ok(burn, 'a burn is found');
    const end = ahead(craft, 0, at, { line: burn.line, accel: 0.5, until: burn.length });
    const p = placeFrom(end, target.at(at).r);
    assert.ok(Math.abs(p.ahead - want.ahead) < 1 && Math.abs(p.above - want.above) < 1 && Math.abs(p.across) < 1, JSON.stringify(p));
    assert.ok(burn.length > 0 && burn.length < 200, `it burns ${burn.length} s`);
  }
  // nothing to aim at: no burn, and the caller flies the record's
  assert.equal(
    reach(
      ahead,
      flownFrom({ t: 5000, ...circular(6_650_000) }, NONE, () => false),
      craft,
      0,
      0.5,
      want,
      at,
      [0, 0, 0],
    ),
    null,
  );
});

test('the coelliptic burn leaves the height between the two the same all the way round', () => {
  // the target on an orbit with some eccentricity, the craft 15 km below and 150 km behind, climbing a little
  const t0 = circular(6_650_000, 0.03);
  const target = flownFrom({ t: 0, r: t0.r, v: scale(t0.v, 1.004) }, NONE, () => false);
  // (a quarter of an hour on: the target passed over the craft's place a few seconds ago, when it was already flying)
  const T0 = 900;
  const now = target.at(T0);
  const n = [0, -Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)];
  const angle = Math.atan2(dot(now.r, cross(n, [1, 0, 0])), now.r[0]);
  const craft = circular(6_635_000, angle - 150_000 / 6_650_000, 3);
  const dv = coelliptic(target, craft, T0);
  assert.ok(dv && length(dv) < 60, `a burn of ${length(dv)} m/s`);
  const heights = (state) => {
    const out = [];
    let s = state;
    // (the height between them where the craft is: the target taken as it passes over the craft's place)
    for (let t = 0; t <= 5400; t += 300) {
      let over = target.at(T0 + t);
      let dt = 0;
      for (let k = 0; k < 4; k++) {
        dt -= placeFrom(s, over.r).ahead / length(over.r) / (length(cross(over.r, over.v)) / length(over.r) ** 2);
        over = target.at(T0 + t + dt);
      }
      out.push(length(over.r) - length(s.r));
      for (let k = 0; k < 30; k++) s = step(s, 0, 10);
    }
    return out;
  };
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  const [before, after] = [heights(craft), heights({ r: craft.r, v: add(craft.v, dv) })];
  assert.ok(spread(before) > 5_000, `left alone the height between them wanders ${spread(before).toFixed(0)} m`);
  assert.ok(spread(after) < 600, `after the burn it stays within ${spread(after).toFixed(0)} m round a revolution`);
});

test('a braking commanded on the target comes to rest at its station by the instant given, within its thrust, and stays', () => {
  const target = flownFrom({ t: 0, ...circular(6_650_000, 0.001) }, NONE, () => false);
  const want = { ahead: 25, above: 0 };
  // two kilometres behind and a little below, closing at some 7 m/s
  let s = circular(6_649_300, 0.001 - 2000 / 6_650_000);
  s = { r: s.r, v: add(s.v, scale(unit(s.v), 6)) };
  const [by, cap] = [700, 0.06];
  let most = 0;
  let given = 0;
  const range = (state, t) => length(sub(target.at(t).r, state.r));
  for (let t = 0; t < 2000; t += 1) {
    const push = stationPush(target, s, t, want, by, cap);
    most = Math.max(most, length(push));
    given += length(push);
    s = step(s, t, 1, (q, at) => stationPush(target, q, at, want, by, cap));
    if (t + 1 >= by) assert.ok(Math.abs(range(s, t + 1) - 25) < 1.5, `at ${t + 1} s it is ${range(s, t + 1).toFixed(2)} m off`);
  }
  assert.ok(most <= cap + 1e-12, 'never more than the engine gives');
  const p = placeFrom(s, target.at(2000).r);
  assert.ok(
    Math.abs(p.ahead - 25) < 0.5 && Math.abs(p.above) < 0.5,
    `the target ${p.ahead.toFixed(2)} m ahead, ${p.above.toFixed(2)} above`,
  );
  assert.ok(length(sub(target.at(2000).v, s.v)) < 0.05, 'at rest by it');
  assert.ok(given > 6 && given < 14, `it took ${given.toFixed(1)} m/s to stop some 7`);
  // with no target there is nothing to command
  assert.deepEqual(
    stationPush(
      flownFrom({ t: 9999, ...circular(6_650_000) }, NONE, () => false),
      s,
      0,
      want,
      by,
      cap,
    ),
    [0, 0, 0],
  );
});

// (the Gemini flights that went up to a target, each with the target's flight and the last instant it was at it, s on
// its own clock: the docking, or for the ATDA, which could not be docked with, the last leaving, 22:59)
const MEETINGS = [
  ['gt-8', 'gatv-5003'],
  ['gt-9a', 'atda', 22 * 3600 + 59 * 60],
  ['gt-10', 'gatv-5005'],
  ['gt-11', 'gatv-5006'],
  ['gt-12', 'gatv-5001'],
];
const gemini = async (name) => (await import(`../missions/usa/gemini/flights/${name}/flight.ts`)).flight;

test('a target that is another flight’s vehicle is where that flight’s record run has it, to the bit', async () => {
  const { orbitalFlown, recordOf } = await import('../src/sim/run.ts');
  const { metOf, targetOf } = await import('../src/sim/staged.ts');
  const { enrolled } = await import('../src/sim/roster.ts');
  const { frameOf } = await import('../src/world/earthframe.ts');
  const { targetAt } = await import('../src/sim/orbital-target.ts');
  const crewed = await gemini('gt-8');
  const other = await gemini('gatv-5003');
  assert.equal(enrolled(other.id), other, 'a target’s flight is known by its id as soon as it is loaded');
  const def = { flight: other.id, label: 'GATV-5003' };
  const frame = frameOf(crewed);
  const theirs = frameOf(other);
  const met = metOf(def, frame, 0);
  // the two clocks: Gemini VIII left 1 h 40 min 59.262 s after its target
  const later = (Date.parse(crewed.launch) - Date.parse(other.launch)) / 1000;
  assert.equal(later, 6059.262);
  assert.equal(met.from, -later, 'it is there from its own liftoff');
  assert.equal(metOf(def, frame, 0), met, 'one craft for a target and a frame, whoever asks');
  assert.equal(targetOf({ target: def }, frame, 0, undefined), met, 'and it is the plan’s target whatever the ascent');
  assert.equal(met.at(-later - 1), undefined, 'nothing before the other flight left the pad');
  // that flight's record, flown once: the states its run flew, which the run on show is made from
  const whole = orbitalFlown(other);
  const run = recordOf(other);
  const states = [...whole.ascent.samples, ...whole.coast.samples.filter((s) => s.t >= whole.ascent.samples.at(-1).t)];
  assert.equal(states.length, run.samples.length, 'the run on show has a sample for each');
  const turned = (v) => frame.fromIcrf(theirs.toIcrf(v));
  let held = 0;
  const every = Math.max(1, Math.floor(states.length / 80));
  states.forEach((s, i) => {
    const t = s.t - later;
    // (an instant of Gemini VIII's clock that is this state's own to the bit, and not the instant of the parting,
    // which has a state either side)
    if (i % every || t + later !== s.t || states[i + 1]?.t === s.t) return;
    assert.deepEqual(met.at(t), { r: turned(s.r), v: turned(s.v) }, `at ${s.t} s of the target’s flight`);
    assert.deepEqual(run.samples[i].v, s.v, 'which is the velocity the run on show has there');
    held++;
  });
  assert.ok(held > 40, `${held} instants held`);
  // the turn between the two frames, each of its own liftoff's date 101 minutes apart, is next to nothing, but it is made
  const x = [EARTH.equatorialRadius.value, 0, 0];
  const turn = length(sub(turned(x), x));
  // (a hundredth of an arcsecond of precession: a third of a metre at the Earth's radius)
  assert.ok(turn > 0.1 && turn < 1, `the frames ${turn} m apart at the Earth’s radius`);
  assert.ok(Math.abs(length(turned(x)) - length(x)) < 1e-8);
  // between two states kept at either end of a quiet stretch of its coast (the rest let go: sim/rails.ts), it is the
  // orbit flown: gravity carries the first to it, a second at a time (the air at its height moves it millimetres)
  const k = states.findIndex((s) => s.t > 3 * 3600 && s.rails);
  const [a, b] = [states[k], states[k + 1]];
  assert.ok(b.t - a.t > 60, `a stretch of ${(b.t - a.t).toFixed(0)} s`);
  const half = (b.t - a.t) / 2;
  const mid = met.at(a.t + half - later);
  const miss = length(sub(mid.r, turned(coast(a, half, 1).r)));
  assert.ok(miss < 0.05, `${(miss * 100).toFixed(1)} cm from the state flown on ${half.toFixed(0)} s`);
  assert.deepEqual(met.at(b.t - later), { r: turned(b.r), v: turned(b.v) }, 'and the kept state at its end');
  // it is the flight's target at any instant, whatever a run of the flight did
  const plan = { target: def };
  const state = targetAt({ plan, site: crewed.site }, { frame, launchAborted: true }, 1000);
  assert.deepEqual(state, metOf(def, frame, crewed.site.seaLevel.value).at(1000));
  // and it ends where that flight's coast does
  const end = states.at(-1).t;
  assert.ok(met.at(end - later - 1));
  assert.equal(met.at(end - later + 1), undefined);
  // a flight nobody has enrolled, and one that is not flown into orbit, cannot be met
  assert.throws(() => metOf({ flight: 'no/such/flight', label: 'none' }, frame, 0), /not been enrolled/);
  const { flight: freedom7 } = await import('../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts');
  (await import('../src/sim/roster.ts')).enrol(freedom7);
  assert.throws(() => metOf({ flight: freedom7.id, label: 'Freedom 7' }, frame, 0), /not flown into orbit/);
});

test('each Gemini target’s own run covers the flight that went up to it', async () => {
  const { metOf } = await import('../src/sim/staged.ts');
  const { frameOf } = await import('../src/world/earthframe.ts');
  for (const [name, target, until] of MEETINGS) {
    const crewed = await gemini(name);
    const other = await gemini(target);
    const met = metOf({ flight: other.id, label: other.callsign }, frameOf(crewed), 0);
    const last = until ?? crewed.docking.at;
    assert.ok(met.at(last), `${other.callsign} is there ${(last / 3600).toFixed(2)} h into ${crewed.designation}`);
    assert.ok(met.at(last + 3600), 'and an hour after');
    // (and the stated limit is its record's: three days from its own liftoff)
    assert.equal(other.plan.record.coastUntil.value, 3 * 86_400);
    const later = (Date.parse(crewed.launch) - Date.parse(other.launch)) / 1000;
    assert.ok(met.at(3 * 86_400 - later - 1) && !met.at(3 * 86_400 - later + 1), 'flown to its stated limit and no further');
  }
});

test('a target given as a published orbit is flown from it as stated, on and back', async () => {
  const { orbitTarget } = await import('../src/sim/orbital.ts');
  const { elementsState, fixState } = await import('../src/sim/pursuit.ts');
  const { earthFrame } = await import('../src/world/earthframe.ts');
  const { DEG } = await import('../src/world/frames.ts');
  const { meanOf } = await import('../src/world/meanelements.ts');
  const { elementsOf, stateOf } = await import('../src/world/orbit.ts');
  const { julianDate } = await import('../src/world/time.ts');
  const said = (value) => ({ value, confidence: 'documented', source: 'made up here' });
  // a flight that left at 22:20:26.648, and a tracking vector given 1,200 s into another's elapsed time, which left at 20:39:46.131
  const frame = earthFrame(julianDate('1966-07-18T22:20:26.648Z'));
  const epoch = '1966-07-18T20:39:46.131Z';
  const zero = -6040.517;
  const fix = {
    t: said(1200),
    latitude: said(12.5),
    longitude: said(-140),
    height: said(298_000),
    speed: said(7730),
    heading: said(75),
    flightPath: said(0.02),
  };
  const airless = orbitTarget({ orbit: { fix }, epoch, label: 'made up', mass: said(3000), dragArea: said(0) }, frame, 0);
  const start = fixState(fix, frame, zero);
  assert.equal(start.t, zero + 1200, 'its instant on this flight’s clock');
  assert.equal(airless.from, start.t);
  assert.deepEqual(airless.at(start.t), { r: start.r, v: start.v });
  // as stated: over that place at that height, at that speed on that heading and path
  const place = frame.place(start.r, start.t);
  assert.ok(Math.abs(place.latitude - 12.5) < 1e-9 && Math.abs(place.longitude + 140) < 1e-9 && Math.abs(place.height - 298_000) < 1e-6);
  const up = unit(start.r);
  const east = unit(cross([0, 0, 1], up));
  const north = cross(up, east);
  assert.ok(Math.abs(length(start.v) - 7730) < 1e-9);
  assert.ok(Math.abs(Math.asin(dot(start.v, up) / 7730) / DEG - 0.02) < 1e-9, 'the path above the geocentric level');
  assert.ok(Math.abs(Math.atan2(dot(start.v, east), dot(start.v, north)) / DEG - 75) < 1e-9, 'the heading, east of north');
  // on from it: ten-second steps of gravity, with no air on a drag area of nothing
  let s = { r: start.r, v: start.v };
  for (let k = 0; k < 540; k++) s = step(s, 0, 10);
  assert.ok(length(sub(airless.at(start.t + 5400).r, s.r)) < 1e-6, 'its kept states are ten-second steps of gravity');
  // back from it: the same steps the other way, so flying on from an earlier state comes back to the vector
  const before = airless.at(start.t - 3000);
  assert.ok(before, 'it was there before the record gave it');
  let again = before;
  for (let k = 0; k < 300; k++) again = step(again, 0, 10);
  assert.ok(length(sub(again.r, start.r)) < 0.01, `back and on again ${length(sub(again.r, start.r))} m from the vector`);
  assert.deepEqual(airless.at(start.t - 3000), before, 'and an instant asked for twice is the same state');
  // with air: the same vector, on 44 m^2 at 3,000 kg, is lower after a day than the airless one
  const dragged = orbitTarget({ orbit: { fix }, epoch, label: 'made up', mass: said(3000), dragArea: said(44) }, frame, 0);
  const axis = (target) => elementsOf(target.at(start.t + 86_400).r, target.at(start.t + 86_400).v).a;
  assert.ok(axis(dragged) < axis(airless) - 100, `the air took ${(axis(airless) - axis(dragged)).toFixed(0)} m off its axis in a day`);

  // an element set, osculating, of the true equator and equinox of its date, at the flight's own liftoff: the state
  // world/orbit.ts gives for it, the frame being of that date
  const el = { a: 6_680_000, e: 0.004, i: 28.87 * DEG, node: 40 * DEG, argp: 100 * DEG, nu: 10 * DEG };
  const set = (over) => ({
    t: said(0),
    axis: said(el.a),
    eccentricity: said(el.e),
    inclination: said(28.87),
    node: said(40),
    perigee: said(100),
    anomaly: said(10),
    anomalyIs: 'true',
    kind: { is: 'osculating', confidence: 'documented', source: 'made up here' },
    frame: 'of-date',
    ...over,
  });
  const own = elementsState(set(), frame);
  assert.ok(length(sub(own.r, stateOf(el).r)) < 1e-7 && length(sub(own.v, stateOf(el).v)) < 1e-10);
  // the same set dated 120 days before: the equinox it is counted from was then some 16 arcseconds back
  const dated = elementsState(set({ t: said(-120 * 86_400) }), frame);
  const turn = length(sub(dated.r, own.r)) / el.a / (DEG / 3600);
  assert.ok(turn > 5 && turn < 21, `turned ${turn.toFixed(2)} arcseconds`);
  // in the ICRF: turned by the whole precession since J2000, a third of a degree by 1966
  const icrf = elementsState(set({ frame: 'icrf' }), frame);
  const since = length(sub(icrf.r, own.r)) / el.a / DEG;
  assert.ok(since > 0.2 && since < 0.5, `turned ${since.toFixed(3)} degrees from J2000`);
  // the mean anomaly for the true, on the same orbit
  const E = 2 * Math.atan(Math.sqrt((1 - el.e) / (1 + el.e)) * Math.tan(el.nu / 2));
  const byMean = elementsState(set({ anomaly: said((E - el.e * Math.sin(E)) / DEG), anomalyIs: 'mean' }), frame);
  assert.ok(length(sub(byMean.r, own.r)) < 1e-5);
  // mean elements (Kozai's): the state whose mean elements they are
  const meant = elementsState(set({ kind: { is: 'mean', confidence: 'documented', source: 'made up here' } }), frame);
  const back = meanOf({ r: meant.r, v: meant.v });
  assert.ok(Math.abs(back.a - el.a) < 1e-3 && Math.abs(back.e - el.e) < 1e-9 && Math.abs(back.i - el.i) < 1e-9);
  assert.ok(length(sub(meant.r, own.r)) > 1000, 'which is not the osculating orbit of the same figures');
  assert.throws(
    () => elementsState(set({ frame: 'icrf', kind: { is: 'mean', confidence: 'documented', source: 'made up here' } }), frame),
    /mean elements are of the true equator of date/,
  );
  // and a target given by an element set is flown from that state
  const byElements = orbitTarget(
    { orbit: { elements: set() }, epoch: '1966-07-18T22:20:26.648Z', label: 'made up', mass: said(3000), dragArea: said(0) },
    frame,
    0,
  );
  assert.deepEqual(byElements.at(0), { r: own.r, v: own.v });
});

test('each Agena’s run is on its report’s orbit but not in its plane, and a little ahead; the ATDA’s is not on its own orbit', async () => {
  // Each crewed flight's docking chapter has its target's insertion vector from the mission report's trajectory table
  // (`docking.fixes[0]`). Carried on under gravity (no air) to the docking, it is what the target's own run is set beside:
  // not the truth to better than the table's last digits (a foot a second is 5 km a revolution), but the record's own.
  // What is held here is what the targets' runs miss it by, each with its cause (src/sim/misses.ts, target-plan.ts): a
  // flight that goes up to a target is given the report's orbit (`TargetDef.orbit`) until these are put right.
  const { metOf } = await import('../src/sim/staged.ts');
  const { orbitalFix } = await import('../src/sim/approach.ts');
  const { frameOf } = await import('../src/world/earthframe.ts');
  const { angleBetween, DEG } = await import('../src/world/frames.ts');
  const { meanOf } = await import('../src/world/meanelements.ts');
  for (const [name, target, until] of MEETINGS) {
    const crewed = await gemini(name);
    const other = await gemini(target);
    const frame = frameOf(crewed);
    const met = metOf({ flight: other.id, label: other.callsign }, frame, 0);
    const fix = crewed.docking.fixes[0];
    // a minute past the vector's instant, when every run's engine is off
    const t = fix.t.value + 60;
    const [run, vector] = [met.at(t), orbitalFix(fix, frame, t)];
    const axis = (s) => meanOf({ r: frame.toDate(s.r), v: frame.toDate(s.v) }).a;
    const long = axis(run) - axis(vector);
    const pole = (s) => unit(cross(s.r, s.v));
    const tilt = angleBetween(pole(run), pole(vector)) / DEG;
    const last = until ?? crewed.docking.at;
    const ahead = -placeFrom(met.at(last), orbitalFix(fix, frame, last).r).ahead;
    if (target === 'atda') {
      // the Atlas's verniers leave it 9.5 km of semi-major axis long (misses.ts, the ATDA's apogee and period): it falls
      // back some 90 km a revolution, less what the air of three days takes off its orbit. Its plane is the vector's
      assert.ok(long > 8000 && long < 11_000, `the ATDA’s axis ${long.toFixed(0)} m long`);
      assert.ok(ahead < -2_000_000, `the ATDA ${(ahead / 1000).toFixed(0)} km along from its vector by the last leaving`);
      assert.ok(tilt < 0.02, `the ATDA’s plane ${tilt.toFixed(3)} degrees from its vector’s`);
      continue;
    }
    // the record's orbit: the mean semi-major axis within 50 m of the vector's (half a foot a second is 260 m)
    assert.ok(Math.abs(long) < 50, `${other.callsign}: its axis ${long.toFixed(1)} m from its vector’s`);
    // ahead of the vector along it by what the ascent was long downrange, with the little the air adds by then (the
    // vector is carried on without air): 20 to 39 km, which is 2.6 to 5 s of its motion
    assert.ok(ahead > 10_000 && ahead < 45_000, `${other.callsign}: ${(ahead / 1000).toFixed(1)} km ahead of its vector at the docking`);
    // and not in its plane: the law reaches the record's inclination from the plane through the pad, and at 28.87 degrees
    // from a pad at 28.49 the node that leaves is anybody's (0.3 to 1.3 degrees off): 0.13 to 0.63 degrees between the
    // planes, 15 to 74 km across at most, 18 to 86 m/s to turn one into the other
    assert.ok(tilt > 0.1 && tilt < 0.7, `${other.callsign}: its plane ${tilt.toFixed(3)} degrees from its vector’s`);
  }
});
