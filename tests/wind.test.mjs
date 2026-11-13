// The day's winds aloft (`trajectory.winds`: the Postlaunch Report's Figure 10.3-1) and what flying through them does.
//
// The wind is an input like any other: a sounding read off a figure, each level with its confidence. Nothing is fitted
// to it. What it does to the flight against the record is stated here, improvements and worsenings both, and held, so
// that a change to the wind or to how it is flown shows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { fly } from '../src/sim/fly.ts';
import { blowOf, upAt, windAt } from '../src/sim/forces.ts';
import { predict } from '../src/sim/predict.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { EARTH_ROTATION_RATE } from '../src/world/bodies.ts';
import { cross, DEG, dot, enuAxes, geodeticToEcef, length, siteFrame, sub } from '../src/world/frames.ts';

const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const TR = flight.trajectory;
const CALM = { ...TR, winds: undefined };
const FT = 0.3048;
const KT = 1852 / 3600;
const NMI = 1852;
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('the sounding: every level a measure with its source, in order of height, the surface as the report’s text has it', () => {
  const { levels, calmAbove } = TR.winds;
  assert.ok(levels.length > 60);
  for (const [i, l] of levels.entries()) {
    assert.ok(l.speed.source && l.from.source && l.speed.confidence && l.from.confidence, `level ${i} says where it is from`);
    assert.ok(l.speed.value >= 0 && l.from.value >= 0 && l.from.value < 360);
    if (i) assert.ok(l.height > levels[i - 1].height, 'in order of height');
  }
  // Postlaunch Report, section 10.3: "Surface winds 12 knots"
  near(levels[0].speed.value / KT, 12, 0.01, 'the figure’s trace meets the surface at the text’s 12 knots');
  assert.equal(calmAbove.confidence, 'estimated');
  // the jet: 60 knots at 50,000 ft, the edge of the figure’s grid
  const jet = levels.reduce((a, b) => (b.speed.value > a.speed.value ? b : a));
  near(jet.height / FT, 50_000, 1);
  near(jet.speed.value / KT, 60, 0.01);
});

test('a wind is named for where it blows from: the air moves the other way, and between levels it swings, it does not spin', () => {
  const m = (speed, from) => ({ speed: { value: speed }, from: { value: from } });
  const blow = blowOf({
    levels: [
      { height: 0, ...m(10, 90) },
      { height: 1000, ...m(10, 350) },
      { height: 2000, ...m(10, 10) },
    ],
    calmAbove: { value: 4000 },
  });
  near(blow(0)[0], -10, 1e-12, 'from the east: the air moves west');
  near(blow(0)[1], 0, 1e-12);
  const north = blow(1500);
  near(north[0], 0, 1e-12, 'halfway from 350 to 010 it is from due north');
  assert.ok(north[1] < -9.8, 'and not from the south by way of 180');
  near(length([...blow(3000), 0]), 5, 1e-9, 'above the top it falls evenly');
  assert.deepEqual([...blow(4000)], [0, 0]);
  assert.deepEqual([...blow(-50)], [...blow(0)], 'the lowest level is held to the surface');
  assert.equal(blowOf(undefined), null, 'no sounding: calm');
});

test('standing on the pad, the air goes by at the surface wind; with no sounding, not at all', () => {
  const r = geodeticToEcef(SITE);
  const v = cross([0, 0, EARTH_ROTATION_RATE], r);
  near(windAt(r, v, 0, SEA).airspeed, 0, 1e-9, 'calm');
  const air = windAt(r, v, 0, SEA, blowOf(TR.winds));
  near(air.airspeed / KT, 12, 0.3, 'twelve knots over the pad');
  near(length(air.ground), 0, 1e-9, 'and it is not moving over the ground');
  // from 070: the air comes at it from east of north
  const axes = enuAxes(SITE);
  assert.ok(dot(air.wind, axes.east) > 0 && dot(air.wind, axes.north) > 0, 'it meets air coming from the north-east');
  assert.ok(Math.abs(dot(air.wind, upAt(r, 0))) < 1e-9, 'level');
});

const windy = fly(TR, SITE, SEA);
const still = fly(CALM, SITE, SEA);

test('under its parachute the spacecraft goes with the wind', (t) => {
  const drift = (run) => {
    const main = run.samples.find((s) => s.phase === 'main');
    const end = run.samples.at(-1);
    const a = geodeticToEcef({ latitude: main.latitude, longitude: main.longitude, height: 0 });
    const b = geodeticToEcef({ latitude: end.latitude, longitude: end.longitude, height: 0 });
    const d = sub(b, a);
    const axes = enuAxes(end);
    return { metres: length(d), east: dot(d, axes.east), north: dot(d, axes.north), seconds: end.t - main.t };
  };
  const calm = drift(still);
  const day = drift(windy);
  assert.ok(calm.metres < 60, `in calm air it comes straight down: ${calm.metres.toFixed(0)} m`);
  // set from the sounding: about five minutes under the parachute from 10,000 ft through 2 to 7 knots, more from the east than not
  assert.ok(day.metres > 300 && day.metres < 1500, `in the day's wind it is carried ${day.metres.toFixed(0)} m`);
  assert.ok(day.east < 0, 'to the west: the low wind is from the east');
  // and it lands moving with the surface wind
  const end = windy.samples.at(-1);
  near(end.groundSpeed, Math.hypot(8.8, 12 * KT), 1.5, 'its speed over the ground at the surface is the fall and the wind together');
  t.diagnostic(
    `drift under the main parachute: ${day.metres.toFixed(0)} m (${day.east.toFixed(0)} E, ${day.north.toFixed(0)} N) in ${day.seconds.toFixed(0)} s`,
  );
});

test('what the day’s wind does to the flight, against the record: stated, both ways', (t) => {
  const want = Object.fromEntries(flight.checks.map((c) => [c.id, c.value]));
  const pct = (run, id) => ((run.results[id] / want[id] - 1) * 100).toFixed(2);
  for (const id of ['apogee', 'range', 'exitQ', 'separationSpeed', 'entryG']) {
    t.diagnostic(`${id}: ${pct(still, id)} % of the record in calm air, ${pct(windy, id)} % in the day's wind`);
  }
  // Held, so that they cannot move unnoticed (each a difference between the two runs; the wind is mostly a tail wind):
  near(
    (windy.results.apogee - still.results.apogee) / NMI,
    0.12,
    0.05,
    'the apogee is 0.12 nautical miles higher: worse, it was already high',
  );
  near((windy.results.range - still.results.range) / NMI, 1.08, 0.3, 'the range a mile longer: worse');
  near(
    (windy.results.exitQ - still.results.exitQ) / 47.880259,
    -10.4,
    2,
    'the greatest dynamic pressure 10 lb/sq ft less, the jet being behind it: worse (556 against the record’s 586)',
  );
  near(windy.results.separationSpeed - still.results.separationSpeed, 2.9, 1, 'and it separates 3 m/s faster: worse');
});

const liveDay = flyLive(vehicle(TR, SITE, SEA));
const liveCalm = flyLive(vehicle(CALM, SITE, SEA));
/** What the Postlaunch Report plots as its angle of attack (Figure 4.2-8): the gyros' pitch less the Earth-fixed flight-path angle, degrees. */
const gyro = (s) => Math.asin(dot(s.axis, upAt(s.r, s.t))) / DEG - s.groundClimb;

test('the report’s angle of attack going up (Figure 4.2-8) is the wind’s doing: about 1.5 degrees at 01:32', (t) => {
  // The record, read off the figure to 0.3 of a degree and 2 s: near nothing to 00:25, a peak of about +1.5 degrees at
  // about 01:32, inside a measurement band the figure draws at about a degree. The tolerance, a degree and ten seconds,
  // was set from that band before either run was looked at.
  const peak = (run) =>
    run.samples.filter((s) => s.phase === 'powered' && s.t >= 25 && s.t <= 120).reduce((a, b) => (gyro(b) > gyro(a) ? b : a));
  const day = peak(liveDay);
  const calm = peak(liveCalm);
  near(gyro(day), 1.5, 1, 'the greatest, in the day’s wind');
  near(day.t, 92, 10, 'and when');
  t.diagnostic(
    `pitch less flight-path angle: greatest ${gyro(day).toFixed(2)} degrees at ${day.t.toFixed(0)} s in the day's wind; ${gyro(calm).toFixed(2)} at ${calm.t.toFixed(0)} s in calm air (the record: about 1.5 at about 92 s)`,
  );
  // in calm air there is no such peak there: the wind is what makes it
  assert.ok(Math.abs(calm.t - 92) > 10 || gyro(calm) < gyro(day) - 0.4, 'calm air does not give the figure’s peak');
});

test('the wind bends the stack more, and it stands: the load through the jet against the limit', (t) => {
  const most = (run) => run.samples.filter((s) => s.phase === 'powered').reduce((a, b) => (b.strain > a.strain ? b : a));
  const day = most(liveDay);
  const calm = most(liveCalm);
  assert.ok(day.strain > 1.5 * calm.strain, 'more than in calm air');
  assert.ok(day.strain < 0.5, `well inside the limit: ${(100 * day.strain).toFixed(0)} per cent`);
  assert.equal(liveDay.state.broke, null);
  // the limit is an estimate, and so is this figure's meaning: it is held so that it is seen to move
  near(day.strain, 0.26, 0.05, 'a quarter of the limit');
  assert.ok(day.t > 75 && day.t < 95, `as it climbs through the jet: ${day.t.toFixed(0)} s`);
  t.diagnostic(
    `bending load: ${(100 * day.strain).toFixed(1)} per cent of the limit at ${day.t.toFixed(0)} s in the day's wind, ${(100 * calm.strain).toFixed(1)} per cent at ${calm.t.toFixed(0)} s in calm air`,
  );
});

test('the autopilot holds the programme through it: the attitude stays the gyros’, the path is what gives', () => {
  const v = vehicle(TR, SITE, SEA);
  let worst = 0;
  for (const s of liveDay.samples) {
    if (s.phase !== 'powered' || s.t < 10 || s.t > 140) continue;
    worst = Math.max(worst, Math.acos(Math.min(1, dot(s.axis, v.programme(s.t)))) / DEG);
  }
  assert.ok(worst < 0.2, `never more than ${worst.toFixed(3)} degrees off the programme`);
  assert.ok(autopilot);
});

test('the predicted path is flown through the same wind', () => {
  // from the top of the drogue's fall: where it will come down, with and without the wind
  const at = windy.samples.find((s) => s.phase === 'main');
  const start = { t: at.t, r: at.r, v: at.v, mass: at.mass, phase: 'main' };
  const day = predict(TR, SITE, SEA, start);
  const calm = predict(CALM, SITE, SEA, start);
  assert.ok(day.impact && calm.impact, 'both come down');
  const a = geodeticToEcef({ latitude: day.impact.latitude, longitude: day.impact.longitude, height: 0 });
  const b = geodeticToEcef({ latitude: calm.impact.latitude, longitude: calm.impact.longitude, height: 0 });
  const apart = length(sub(a, b));
  assert.ok(apart > 300 && apart < 1500, `the two predictions are ${apart.toFixed(0)} m apart: the drift`);
  // and the prediction is where the flight then goes
  const end = windy.samples.at(-1);
  const c = geodeticToEcef({ latitude: end.latitude, longitude: end.longitude, height: 0 });
  assert.ok(length(sub(a, c)) < 150, `the predicted landing is ${length(sub(a, c)).toFixed(0)} m from the flown one`);
});
