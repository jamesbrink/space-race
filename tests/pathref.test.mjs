// The record's run as a line of reference (src/viewer/pathref.ts): a curve of a few thousand points kept by its
// curvature, which no sample of the record lies off; its key events found in the run and named by what the run does
// there; and how much of it is drawn at an instant. Each rule is checked on paths made here, then on the records of a
// lob, a flight into orbit by one launch vehicle and by another.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventOf } from '../src/sim/plan.ts';
import { recordOf } from '../src/sim/run.ts';
import { curveAt, sweepOf, sweptTo } from '../src/viewer/pathline.ts';
import { apsesOf, REF_BACK, REF_KNOTS, REF_OFF, recordMarks, referenceCurve, windowOf } from '../src/viewer/pathref.ts';
import { EARTH, WGS84_A } from '../src/world/bodies.ts';

const MU = EARTH.gm.value;
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

/** A Kepler orbit in a plane tilted by `tilt` about x: its state at `t` (periapsis at t = 0). */
function kepler(a, e, tilt = 0) {
  const n = Math.sqrt(MU / a ** 3);
  return (t) => {
    const M = n * t;
    let E = M;
    for (let k = 0; k < 30; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const b = a * Math.sqrt(1 - e * e);
    const x = a * (Math.cos(E) - e);
    const y = b * Math.sin(E);
    const Edot = n / (1 - e * Math.cos(E));
    const vx = -a * Math.sin(E) * Edot;
    const vy = b * Math.cos(E) * Edot;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    return { r: [x, y * c, y * s], v: [vx, vy * c, vy * s] };
  };
}
const period = (a) => 2 * Math.PI * Math.sqrt(a ** 3 / MU);
const run = (state, t0, t1, dt, more = () => ({})) => {
  const out = [];
  for (let t = t0; t <= t1 + 1e-9; t += dt) out.push({ t, ...state(t), ...more(t) });
  return out;
};
/** The furthest any sample lies from the curve, m. */
const worst = (curve, samples) => {
  const p = [0, 0, 0];
  let off = 0;
  let hint = 0;
  for (const s of samples) {
    hint = curveAt(curve, s.t, p, 0, hint);
    const r = s.centre ?? s.r;
    off = Math.max(off, Math.hypot(p[0] - r[0], p[1] - r[1], p[2] - r[2]));
  }
  return off;
};

test('a record is kept as a few points by its curvature, and no sample of it lies off the curve', () => {
  const a = WGS84_A + 250_000;
  const orbit = kepler(a, 0.01, 0.57);
  const samples = run(orbit, 0, 3 * period(a), 10);
  const c = referenceCurve(samples);
  assert.ok(c.n < samples.length / 4, `${c.n} points of ${samples.length} samples`);
  assert.ok(c.n > 3 * 30, `an orbit is not three chords: ${c.n}`);
  assert.ok(worst(c, samples) <= REF_OFF, `${worst(c, samples)} m`);
  assert.equal(c.t[0], samples[0].t);
  assert.equal(c.t[c.n - 1], samples.at(-1).t);
  // (with no velocities given the way is taken from the neighbours, and the same holds)
  const bare = samples.map(({ t, r }) => ({ t, r }));
  const d = referenceCurve(bare);
  assert.ok(worst(d, bare) <= REF_OFF, `${worst(d, bare)} m with no velocities`);
  assert.ok(d.n < samples.length / 2, `${d.n} points with no velocities`);
});

test('where the path turns it keeps more points than where it runs straight, never evenly', () => {
  // a straight run at a steady speed, then a quarter turn of a circle at that speed, then straight again
  const v = 2000;
  const R = 50_000;
  const turn = ((Math.PI / 2) * R) / v;
  const state = (t) => {
    if (t < 300) return { r: [7e6 + v * (t - 300), 0, 0], v: [v, 0, 0] };
    if (t < 300 + turn) {
      const th = (v * (t - 300)) / R;
      return { r: [7e6 + R * Math.sin(th), R * (1 - Math.cos(th)), 0], v: [v * Math.cos(th), v * Math.sin(th), 0] };
    }
    return { r: [7e6 + R, R + v * (t - 300 - turn), 0], v: [0, v, 0] };
  };
  const samples = run(state, 0, 600 + turn, 0.5);
  const c = referenceCurve(samples);
  const inTurn = [...c.t.subarray(0, c.n)].filter((t) => t > 300 && t < 300 + turn).length;
  const straight = c.n - inTurn;
  assert.ok(inTurn >= 20, `${inTurn} points round the turn`);
  // (a few of them where the turn begins and ends: the acceleration steps there, and the curve is held to the samples)
  assert.ok(straight <= 16 && straight < inTurn, `${straight} points along the straights`);
  assert.ok(worst(c, samples) <= REF_OFF, `${worst(c, samples)} m`);
});

test('it has a point where something happened, drops samples out of order, and never keeps more than it may', () => {
  const a = WGS84_A + 200_000;
  const samples = run(kepler(a, 0, 0.5), 0, period(a), 10);
  const must = [1234.5, 2000, 4000.1];
  const c = referenceCurve(samples, must);
  const knots = [...c.t.subarray(0, c.n)];
  for (const m of must) {
    const first = samples.find((s) => s.t >= m).t;
    assert.ok(knots.includes(first), `a point at ${first}, the first sample at or after ${m}`);
  }
  // a run keeps two samples at the instant something changes, and a rewound one would go back: neither is laid
  const twice = [...samples.slice(0, 50), { ...samples[49] }, { ...samples[20] }, ...samples.slice(50)];
  const e = referenceCurve(twice);
  for (let i = 1; i < e.n; i++) assert.ok(e.t[i] > e.t[i - 1], `in order at ${i}`);
  // a flight of days: let out until it fits
  const long = run(kepler(a, 0.005, 0.9), 0, 80 * period(a), 20);
  const f = referenceCurve(long);
  assert.ok(f.n <= REF_KNOTS, `${f.n} points`);
  assert.ok(worst(f, long) <= 50, `${worst(f, long)} m over eighty revolutions`);
  const few = referenceCurve(samples, [], 40);
  assert.ok(few.n <= 40, `${few.n} points when 40 is the most`);
});

test('its highest points are where it stops climbing away from the centre', () => {
  const a = WGS84_A + 400_000;
  const P = period(a);
  const c = referenceCurve(run(kepler(a, 0.02, 0.4), 0, 2.6 * P, 10));
  const apses = apsesOf(c);
  assert.equal(apses.length, 3);
  apses.forEach((t, i) => near(t, (i + 0.5) * P, 1, `apoapsis ${i + 1}`));
  // a top it hardly comes down from before climbing on is not one: an ascent levelling off into its orbit
  const a2 = WGS84_A + 200_000;
  const low = kepler(a2, 0.004, 0.4);
  const P2 = period(a2);
  const dip = (t) => {
    // (a climb to a top 400 m over where the orbit starts, down onto the orbit at its lowest, then round it)
    if (t >= 300) return low(t - 300);
    const s = low(0);
    const k = 1 + (400 * (1 - ((t - 150) / 150) ** 2)) / Math.hypot(...s.r);
    const d = low(t - 300);
    return { r: d.r.map((x) => x * k), v: d.v };
  };
  const levelled = apsesOf(referenceCurve(run(dip, 0, 300 + P2, 5).map(({ t, r }) => ({ t, r }))));
  assert.equal(levelled.length, 1);
  near(levelled[0], 300 + 0.5 * P2, 5, 'the orbit’s own top, not the dip before it');
  // (a circle has none worth the name; a climb with no top has none)
  assert.equal(apsesOf(referenceCurve(run((t) => ({ r: [7e6 + 100 * t, 0, 0], v: [100, 0, 0] }), 0, 100, 1))).length, 0);
});

test('its events are the engines’, taken together and named by what the run does there', () => {
  // A run made for it: two stages (the second lit as the first is cut), a cutoff into orbit, a burn that raises the
  // orbit, then a retrofire in three motors that brings it down, and a landing.
  const a = WGS84_A + 200_000;
  const up = kepler(a, 0, 0.5);
  const higher = kepler(a + 150_000, 0.011, 0.5);
  const down = kepler(a - 150_000, 0.024, 0.5);
  const powered = (t) => (t >= 0 && t < 300) || (t >= 2000 && t < 2030) || (t >= 5000 && t < 5030);
  const state = (t) => {
    // (under power going up it gains speed; the states only have to say what the marks ask: energy and the lowest point)
    if (t < 300) {
      const s = up(t);
      const k = 0.2 + (0.8 * t) / 300;
      return { r: s.r, v: s.v.map((x) => x * k) };
    }
    if (t < 2030) return up(t);
    if (t < 5030) return higher(t);
    return down(t);
  };
  const samples = run(state, 0, 6000, 1, (t) => ({ powered: powered(t) }));
  const does = {
    liftoff: [{ ignite: 'first' }],
    'first-off': [{ cut: 'first' }],
    'second-on': [{ ignite: 'second' }],
    staging: [{ separate: 'interstage' }],
    tower: [{ separate: 'tower' }],
    'second-off': [{ cut: 'second' }],
    raise: [{ ignite: 'oams' }],
    'raise-off': [{ cut: 'oams' }],
    'retro-1': [{ ignite: 'retro-1' }],
    'retro-2': [{ ignite: 'retro-2' }],
    'retro-3': [{ ignite: 'retro-3' }],
    'retro-off': [{ cut: 'retro-3' }],
    chute: [{ deploy: 'main' }],
  };
  const events = [
    { event: 'liftoff', t: 0 },
    { event: 'first-off', t: 150 },
    { event: 'second-on', t: 151 },
    { event: 'staging', t: 152 },
    { event: 'tower', t: 180 },
    { record: 'a-mark', t: 250 },
    { event: 'second-off', t: 300 },
    { event: 'raise', t: 2000 },
    { event: 'raise-off', t: 2030 },
    { event: 'retro-1', t: 5000 },
    { event: 'retro-2', t: 5005 },
    { event: 'retro-3', t: 5010 },
    { event: 'retro-off', t: 5030 },
    { event: 'chute', t: 5900 },
    { event: 'never', t: Infinity },
  ];
  const marks = recordMarks(events, (id) => does[id], samples, 6000, MU, WGS84_A);
  assert.deepEqual(
    marks.map((m) => [m.kind, m.t]),
    [
      ['staging', 150],
      ['cutoff', 300],
      ['burn', 2000],
      ['retro', 5000],
      ['down', 6000],
    ],
  );
  // (a run that has not come down has no landing to mark)
  assert.ok(!recordMarks(events, (id) => does[id], samples, Infinity, MU, WGS84_A).some((m) => m.kind === 'down'));
});

test('what of it is drawn: all of a lob from the pad, and of an orbit an arc behind and once round ahead', () => {
  // a lob: a quarter of an hour, a few degrees round the Earth (an arc of an orbit that ends, which is all the rule asks)
  const slow = WGS84_A + 180_000;
  const lob = referenceCurve(run(kepler(8 * slow, 0, 0.5), 3000, 3900, 1));
  const lsw = sweepOf(lob);
  for (const now of [3000, 3400, 3900, 5000]) {
    const w = windowOf(lob, lsw, now, REF_BACK, 0.5, 0.5);
    assert.deepEqual(w, { from: 3000, lead: 0, to: 3900, over: 0 }, `at ${now}`);
  }
  // an orbit of several revolutions
  const a = WGS84_A + 250_000;
  const P = period(a);
  const c = referenceCurve(run(kepler(a, 0, 0.5), 0, 4 * P, 10));
  const sw = sweepOf(c);
  const short = 0.7;
  const fade = 0.5;
  const start = windowOf(c, sw, 0, REF_BACK, short, fade);
  assert.equal(start.from, 0);
  assert.equal(start.lead, 0);
  near(start.to, P * (1 - short / (2 * Math.PI)), 2, 'once round from the start, less what it stops short by');
  near(start.over, (P * fade) / (2 * Math.PI), 2, 'and goes out before that');
  const now = 1.5 * P;
  const w = windowOf(c, sw, now, REF_BACK, short, fade);
  near(sweptTo(c, sw, now) - sweptTo(c, sw, w.from), REF_BACK, 1e-3, 'an arc behind');
  assert.ok(w.lead > 0 && w.lead < now - w.from, 'coming in over part of it');
  near(w.to, now + P * (1 - short / (2 * Math.PI)), 2, 'once round ahead');
  // what is behind never reaches what is ahead: the line does not lie over itself
  assert.ok(sweptTo(c, sw, w.to) - sweptTo(c, sw, w.from) < 2 * Math.PI, 'less than once round in all');
  // in its last revolution it ends where the record ends, with no fade: it came down there
  const late = windowOf(c, sw, 3.5 * P, REF_BACK, short, fade);
  assert.equal(late.to, c.t[c.n - 1]);
  assert.equal(late.over, 0);
});

const flights = await Promise.all(
  ['usa/mercury/flights/mr-3-freedom-7', 'usa/mercury/flights/ma-6-friendship-7', 'ussr/vostok/flights/vostok-1'].map(
    async (f) => (await import(`../missions/${f}/flight.ts`)).flight,
  ),
);

test('the records of a lob and of two flights into orbit: a few hundred points no sample lies off, and their events by one rule', () => {
  const want = {
    'mr-3-freedom-7': ['cutoff', 'retro', 'down'],
    'ma-6-friendship-7': ['staging', 'cutoff', 'retro', 'down'],
    'vostok-1': ['staging', 'cutoff', 'retro', 'down'],
  };
  for (const flight of flights) {
    const id = flight.id.split('/').at(-1);
    const record = recordOf(flight);
    const samples = record.track();
    const marks = recordMarks(record.events, (e) => eventOf(flight.plan, e)?.do, record.samples, record.duration, MU, WGS84_A);
    assert.deepEqual(
      marks.map((m) => m.kind),
      want[id],
      id,
    );
    const c = referenceCurve(
      samples,
      marks.map((m) => m.t),
    );
    assert.ok(c.n <= 1500 && c.n < samples.length, `${id}: ${c.n} points of ${samples.length}`);
    // (a run's two samples at one instant, either side of a change: the first is the one laid)
    const laid = samples.filter((s, i) => i === 0 || s.t > samples[i - 1].t + 1e-9);
    assert.ok(worst(c, laid) <= REF_OFF, `${id}: ${worst(c, laid)} m off the curve`);
    // it starts at the pad and ends where the record came down
    assert.equal(c.t[0], samples[0].t);
    near(c.t[c.n - 1], record.duration, 1e-6, `${id}: its end`);
    const apses = apsesOf(c);
    assert.ok(apses.length >= 1, `${id}: a highest point`);
  }
});
