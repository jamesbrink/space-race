// The path beyond a low orbit (sim/predict.ts, sim/core/gravity.ts, viewer/pathline.ts): how far ahead a prediction
// looks follows from the orbit it is on, never from a flight or a phase of one; the nearest it comes to the Moon is
// found on the path, and its meeting the Moon or leaving the Earth ends it; and the frame it is drawn in follows from
// the path too. A low orbit's prediction is the one it always was, to the bit.
//
// Bounds from the physics before it was run. A transfer ellipse from 300 km to the stationary radius has a semi-major
// axis of 24,421 km and a period of 10.55 hours (Kepler's third law), past the six hours a prediction looked before. The
// Earth's sphere of influence against the Sun by Laplace's rule is 924,600 km, and the largest orbit it holds takes
// 36.2 days to go round. A coast to the Moon takes about three days: Apollo 10's record lit its service engine for
// lunar orbit insertion at 75:55:54, 110 km over the far side, after one midcourse correction of 14.9 m/s that the run
// does not fly.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as apollo10 } from '../missions/usa/apollo/flights/apollo-10/flight.ts';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { earthJ2, moonOnEarthFlight, RSPHERE, termsOf } from '../src/sim/core/gravity.ts';
import { spacecraft } from '../src/sim/fliers.ts';
import { EARTH_HOLDS, FARTHEST, HORIZONS, lookAhead, propagate, reaches, sphereOf } from '../src/sim/predict.ts';
import { recordOf } from '../src/sim/run.ts';
import { drawnIn, WOUND } from '../src/viewer/pathline.ts';
import { EARTH, EARTH_ROTATION_RATE, MOON, WGS84_A } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { useEphemeris } from '../src/world/ephemeris.ts';
import { add, cross, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';

// (the Moon where the page has it: Meeus's, nothing in the page loads DE440 yet. 40 km of the Moon, which is nothing here)
useEphemeris(null);

const MU = EARTH.gm.value;
const frame = frameOf(vostok1);
const where = { site: siteFrame(vostok1.site), seaLevel: 0, frame };
const quiet = () => ({
  kind: 'coast',
  cutoff: null,
  quiet: Number.NEGATIVE_INFINITY,
  chute: false,
  ground: () => 0,
  burning: () => false,
  push: () => [0, 0, 0],
  next: () => Number.POSITIVE_INFINITY,
  below: () => Number.NEGATIVE_INFINITY,
  arrive: () => ({}),
});
const predicted = (start, gravity, options) => {
  const job = propagate(quiet(), start, gravity ? { ...where, gravity } : where, options);
  job.run();
  return job.result;
};
/** A state at the low end of an ellipse from radius 'low' to radius 'high', inclined 51 degrees. */
const ellipse = (low, high, t = 0) => {
  const speed = Math.sqrt(MU * (2 / low - 2 / (low + high)));
  return { t, r: [low, 0, 0], v: [0, speed * Math.cos(0.89), speed * Math.sin(0.89)] };
};
const LOW = WGS84_A + 300_000;
const STATIONARY = (MU / EARTH_ROTATION_RATE ** 2) ** (1 / 3);
const moon = moonOnEarthFlight(frame);

test('what holds a path: the Earth’s sphere, the Moon’s, and the longest anything is followed', () => {
  assert.ok(Math.abs(EARTH_HOLDS - 924.6e6) < 1e6, `the Earth’s sphere of influence ${(EARTH_HOLDS / 1e6).toFixed(1)} thousand km`);
  assert.ok(Math.abs(FARTHEST / 86_400 - 36.2) < 0.1, `${(FARTHEST / 86_400).toFixed(2)} days round the largest orbit it holds`);
  assert.equal(moon.body.name, 'Moon');
  assert.equal(moon.body.radius, MOON.equatorialRadius.value);
  const sphere = sphereOf(moon.body, 0);
  assert.ok(
    sphere > 60e6 && sphere < 70e6,
    `the Moon’s sphere ${(sphere / 1e6).toFixed(1)} thousand km (Laplace: 66,200 at its mean distance)`,
  );
  assert.equal(earthJ2.body, undefined, 'the central body is not one a path passes');
});

test('a low orbit is looked ahead as it always was, to the bit; and with the Moon pulling it passes nothing', () => {
  const start = ellipse(LOW, LOW + 30_000);
  const period = 2 * Math.PI * Math.sqrt((LOW + 15_000) ** 3 / MU);
  assert.ok(lookAhead(start.r, start.v, 0) < HORIZONS.limit, 'its own orbit asks for less than the six hours');
  assert.ok(Math.abs(lookAhead(start.r, start.v, 0) / period - 1.05) < 1e-9, 'once round and a twentieth more');
  const now = predicted(start);
  const before = predicted(start, undefined, { horizons: { limit: HORIZONS.limit } });
  assert.equal(now.outcome, 'orbit');
  assert.equal(now.horizon, HORIZONS.limit);
  assert.deepEqual(now.points, before.points, 'the path, point for point');
  assert.deepEqual(now.passes, []);
  const pulled = predicted(start, [earthJ2, moon]);
  assert.equal(pulled.outcome, 'orbit');
  assert.deepEqual(pulled.passes, [], 'the nearest a low orbit comes to the Moon is no passing of it');
  assert.equal(reaches(start.r, start.v, 0, [moon.body]), null, 'its ellipse is its own orbit');
});

test('an orbit that takes longer than six hours is still followed once round', (t) => {
  const start = ellipse(LOW, STATIONARY);
  const period = 2 * Math.PI * Math.sqrt(((LOW + STATIONARY) / 2) ** 3 / MU);
  t.diagnostic(`a transfer to the stationary radius: ${(period / 3600).toFixed(2)} h round`);
  assert.ok(period > 10 * 3600 && period < 11 * 3600);
  const p = predicted(start);
  assert.equal(p.outcome, 'orbit', 'once round, not cut off at six hours');
  assert.ok(Math.abs(p.horizon - 1.05 * period) < 1, 'looked ahead as far as its orbit takes, and a twentieth more');
  const span = p.points.at(-1).t - p.points[0].t;
  assert.ok(Math.abs(span / period - 1) < 0.01, `round in ${(span / 3600).toFixed(2)} h`);
  // a time asked for is the time looked ahead, whatever the orbit
  const short = predicted(start, undefined, { limit: 3600 });
  assert.equal(short.outcome, 'limit');
  assert.equal(short.horizon, 3600);
  assert.ok(short.points.at(-1).t <= 3600 + 600);
  // and at the returned points it is still a curve: no piece of it bends more than a few degrees
  let bend = 0;
  for (let i = 1; i < p.points.length; i++) {
    const [a, b] = [p.points[i - 1].v, p.points[i].v];
    bend = Math.max(bend, Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (length(a) * length(b)))));
  }
  assert.ok(bend < (3 * Math.PI) / 180, `the most a piece bends: ${((bend * 180) / Math.PI).toFixed(2)} degrees`);
});

test('a path that does not close leaves the Earth’s sphere, and ends there', (t) => {
  const leaving = Math.sqrt((2 * MU) / LOW);
  const start = { t: 0, r: [LOW, 0, 0], v: [0, 1.2 * leaving * Math.cos(0.5), 1.2 * leaving * Math.sin(0.5)] };
  assert.equal(lookAhead(start.r, start.v, 0), FARTHEST);
  assert.equal(reaches(start.r, start.v, 0), 'escape');
  const p = predicted(start);
  assert.equal(p.outcome, 'escape');
  const end = p.points.at(-1);
  t.diagnostic(`out of the sphere after ${(end.t / 86_400).toFixed(2)} days, ${p.steps} steps`);
  assert.ok(length(end.r) > EARTH_HOLDS && length(end.r) < 1.2 * EARTH_HOLDS);
  assert.ok(end.t < 5 * 86_400, 'at 1.2 times the speed of escape it is out within days');
});

test('a path aimed at the Moon meets its surface, and ends there', () => {
  const at = moon.body.where(0);
  const going = scale(sub(moon.body.where(1), moon.body.where(-1)), 0.5);
  // 20,000 km off the Moon toward the Earth, falling straight at its centre at 2 km/s past the Moon's own motion
  const off = scale(unit(at), -20e6);
  const start = { t: 0, r: add(at, off), v: add(going, scale(unit(off), -2000)) };
  const p = predicted(start, [earthJ2, moon]);
  assert.equal(p.outcome, 'strike');
  const hit = p.passes.at(-1);
  assert.equal(hit.body, 'Moon');
  assert.equal(hit.strikes, true);
  assert.ok(Math.abs(hit.height) < 1e-3, `on the surface: ${hit.height} m`);
  assert.ok(hit.t > 6000 && hit.t < 10_000, `after ${hit.t.toFixed(0)} s (18,263 km at 2 km/s and more, the Moon pulling)`);
  assert.ok(hit.speed > 2000 && hit.speed < 3200, `at ${hit.speed.toFixed(0)} m/s past the Moon`);
  assert.deepEqual(p.points.at(-1).r, hit.r, 'the path ends where it meets it');
  // the same start a little to the side passes it instead
  const side = unit(cross(off, [0, 0, 1]));
  const by = predicted({ ...start, r: add(start.r, scale(side, 6e6)) }, [earthJ2, moon]);
  assert.notEqual(by.outcome, 'strike');
  assert.equal(by.passes[0].strikes, false);
  assert.ok(by.passes[0].height > 0 && by.passes[0].height < 6e6, `passing ${(by.passes[0].height / 1000).toFixed(0)} km over it`);
});

test('Apollo 10’s record, predicted on from after its injection, comes to the Moon near when the record did', (t) => {
  const f = apollo10;
  const run = recordOf(f);
  const site = siteFrame(f.site);
  const sea = f.site.seaLevel.value;
  const frame = frameOf(f);
  const gravity = termsOf(f.plan.gravity, frame);
  assert.ok(
    gravity.some((term) => term.body?.name === 'Moon'),
    'the plan’s gravity names the Moon',
  );
  const cut = run.events.find((e) => e.event === 'tli-cutoff').t;
  const insertion = f.timeline.find((e) => /lunar orbit insertion/.test(e.event)).t;
  assert.equal(insertion, 75 * 3600 + 55 * 60 + 54);
  const from = (at) => {
    const s = run.at(at);
    const start = { t: s.t, r: s.centre ?? s.r, v: s.v, mass: s.mass };
    const job = propagate(spacecraft(f.plan, frame, site, sea, start), start, { site, seaLevel: sea, frame, gravity });
    job.run();
    return { start, p: job.result };
  };
  // as the deck predicts it: from ten minutes after the cutoff, and from 3:46:48, where its owner looked at the map
  const [early, later] = [from(cut + 600), from(3 * 3600 + 46 * 60 + 48)];
  for (const { start, p } of [early, later]) {
    assert.equal(
      reaches(
        start.r,
        start.v,
        start.t,
        gravity.flatMap((x) => (x.body ? [x.body] : [])),
      ),
      'Moon',
      'its ellipse reaches the Moon’s sphere',
    );
    assert.ok(p.horizon > 10 * 86_400, `looked ${(p.horizon / 86_400).toFixed(1)} days ahead, not six hours`);
    const pass = p.passes[0];
    assert.ok(pass, 'it passes the Moon');
    assert.equal(pass.body, 'Moon');
    assert.equal(pass.strikes, false);
    t.diagnostic(
      `from T+${start.t.toFixed(0)}: ${(pass.height / 1000).toFixed(0)} km over the Moon at ${(pass.t / 3600).toFixed(2)} h, ${((pass.t - insertion) / 3600).toFixed(2)} h after the record’s insertion; ${p.steps} steps; then ${p.outcome}`,
    );
    // The Moon's vicinity at the record's time: within four hours of the record's insertion and 5,000 km of the surface.
    // The record came to 110 km at 75:55:54 after a midcourse correction of 14.9 m/s at 26:32:56 that the run does not
    // fly (the stack coasts on whole from the injection), on the injection the run's own S-IVB gave: measured, 3.2 h
    // late and 2,240 km over it.
    assert.ok(Math.abs(pass.t - insertion) < 4 * 3600, `${((pass.t - insertion) / 3600).toFixed(2)} h from the record’s insertion`);
    assert.ok(pass.height > 0 && pass.height < 5_000_000, `${(pass.height / 1000).toFixed(0)} km over the Moon`);
    // and it is drawn among the stars, on the map and off it: beyond the stationary radius, whatever it then does
    const top = Math.max(...p.points.map((q) => length(q.r)));
    const turned = p.impact ? EARTH_ROTATION_RATE * (p.impact.t - p.from) : null;
    assert.ok(top > 380e6, `its far end ${(top / 1e6).toFixed(0)} thousand km from the Earth`);
    assert.equal(drawnIn(turned, top > STATIONARY, true, 'surface'), 'orbit');
    assert.equal(drawnIn(turned, top > STATIONARY, false, 'surface'), 'orbit');
  }
  // the same passing whichever instant it is predicted from: the coast between the two is the run's own
  assert.ok(Math.abs(early.p.passes[0].t - later.p.passes[0].t) < 120, 'the same instant, within two minutes');
  assert.ok(Math.abs(early.p.passes[0].height - later.p.passes[0].height) < 50_000, 'the same height, within 50 km');
});

test('a plan whose gravity has a sphere keeps the Moon as a body a path passes, and the same passing', (t) => {
  const f = apollo10;
  const run = recordOf(f);
  const site = siteFrame(f.site);
  const sea = f.site.seaLevel.value;
  const frame = frameOf(f);
  const cut = run.events.find((e) => e.event === 'tli-cutoff').t;
  const s = run.at(cut + 600);
  const start = { t: s.t, r: s.centre ?? s.r, v: s.v, mass: s.mass };
  const passOf = (gravity) => {
    const job = propagate(spacecraft(f.plan, frame, site, sea, start), start, { site, seaLevel: sea, frame, gravity });
    job.run();
    return job.result.passes[0];
  };
  // (the whole field, the Moon's own about its centre within the sphere, as the one term the predictor is given)
  const whole = termsOf({ ...f.plan.gravity, sphere: RSPHERE }, frame);
  assert.equal(whole.length, 1);
  assert.equal(whole[0].body?.name, 'Moon', 'the one term names the Moon it holds');
  const [summed, sphered] = [passOf(termsOf(f.plan.gravity, frame)), passOf(whole)];
  assert.ok(sphered, 'it passes the Moon under the whole field too');
  t.diagnostic(
    `summed: ${(summed.height / 1000).toFixed(0)} km at ${(summed.t / 3600).toFixed(3)} h; the whole field: ${(sphered.height / 1000).toFixed(0)} km at ${(sphered.t / 3600).toFixed(3)} h`,
  );
  // (the Moon's field beyond its point mass, its degree 2 and on, is worth little at 2,000 km over it and less on the way)
  assert.ok(Math.abs(sphered.t - summed.t) < 600, 'the same instant, within ten minutes');
  assert.ok(Math.abs(sphered.height - summed.height) < 200_000, 'the same height, within 200 km');
});

test('the frame a path is drawn in follows from the path', () => {
  // comes down within three hours of the Earth's turning: over the ground, where it comes down, on the map too
  assert.equal(drawnIn(0.3, false, false, 'orbit'), 'surface');
  assert.equal(drawnIn(0.3, false, true, 'orbit'), 'surface');
  assert.equal(drawnIn(WOUND, true, true, 'orbit'), 'surface');
  // comes down days from now: among the stars (over the ground it would be wound round the Earth once a day)
  assert.equal(drawnIn(2 * Math.PI * 7, true, false, 'surface'), 'orbit');
  assert.equal(drawnIn(1.01 * WOUND, false, true, 'surface'), 'orbit');
  // does not come down: the navball's frame near the Earth, among the stars on the map and beyond the stationary radius
  assert.equal(drawnIn(null, false, false, 'surface'), 'surface');
  assert.equal(drawnIn(null, false, false, 'orbit'), 'orbit');
  assert.equal(drawnIn(null, false, true, 'surface'), 'orbit');
  assert.equal(drawnIn(null, true, false, 'surface'), 'orbit');
  // three hours of the Earth's turning
  assert.ok(Math.abs(WOUND / EARTH_ROTATION_RATE / 3600 - 2.99) < 0.01);
});
