/**
 * What kind of period NASA's published orbits print, and what Gemini's heights are over (sim/orbital.ts `heightsBall`,
 * world/meanelements.ts `periodsOf`, `flownApsisBall`), with no free figure. Each set is its heights, its period and its
 * inclination as printed, and where its perigee stands (the record's injection, or the report's own insertion). On the
 * ball its heights are over, the mean orbit those heights give (its axis the ball plus the mean height) has three
 * periods: nodal (node to node with the perigee where it stands), anomalistic (perigee to perigee) and Kepler (of the
 * mean axis). Each misses the printed period by some seconds; the set's rounding is half the period's last digit and what
 * half the heights' last digit moves a reading by. A set supports the reading nearest its period, and decides for it if
 * that reading is the nearest for every period within its rounding. A record flies the reading its own set supports:
 * `derived` if the set decides, and otherwise `assumed` from a sister set that does, named in its source. None is
 * `estimated`. Gemini IV's and V's final insertion sets fly nowhere: they are the evidence for Gemini 3's.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as gt3 } from '../missions/usa/gemini/flights/gt-3/flight.ts';
import { flight as ma6 } from '../missions/usa/mercury/flights/ma-6-friendship-7/flight.ts';
import { flight as ma7 } from '../missions/usa/mercury/flights/ma-7-aurora-7/flight.ts';
import { flight as ma8 } from '../missions/usa/mercury/flights/ma-8-sigma-7/flight.ts';
import { flight as ma9 } from '../missions/usa/mercury/flights/ma-9-faith-7/flight.ts';
import { heightsBall, perigeeAt } from '../src/sim/orbital.ts';
import { EARTH } from '../src/world/bodies.ts';
import { DEG, geodeticToEcef, siteFrame } from '../src/world/frames.ts';
import { apsisRadius, flownApsisBall, osculatingOf, periodsOf } from '../src/world/meanelements.ts';
import { meanAnomaly } from '../src/world/orbit.ts';

const NMI = 1852;
const READINGS = ['nodal', 'anomalistic', 'kepler'];

/**
 * Each set as printed: heights (nautical miles), period ('min:s' or minutes), inclination (deg), as strings so that the
 * last digit printed is kept. A flight's set is its record's; a report's set places its perigee by the report's own
 * insertion: the geodetic latitude and the flight-path angle at the spacecraft's separation, north-going.
 */
const SETS = [
  {
    id: 'MA-6',
    flight: ma6,
    name: 'Friendship 7, MA-6 report Table 6-I',
    heights: ['86.92', '140.92'],
    period: '88:29',
    inclination: '32.54',
  },
  { id: 'MA-7', flight: ma7, name: 'Aurora 7, TN D-3814 Table XVII', heights: ['86.87', '144.96'], period: '88:32', inclination: '32.55' },
  { id: 'MA-8', flight: ma8, name: 'Sigma 7, TN D-4807 Table XXIII', heights: ['86.94', '152.8'], period: '88:55', inclination: '32.55' },
  {
    id: 'MA-9',
    flight: ma9,
    name: 'Faith 7, SP-45 p. 13 and SP-4201',
    heights: ['87.2', '144.2'],
    period: '88:45',
    inclination: '32.55',
    takes: { from: ['MA-8'], says: 'Sigma 7' },
  },
  {
    id: 'GT-3',
    flight: gt3,
    name: 'Gemini 3, SP-121 Table 4-III and SP-4002',
    heights: ['87.0', '121.0'],
    period: '88.3',
    inclination: '32.6',
    takes: { from: ['GT-4', 'GT-5'], says: 'MSC-G-R-65-3' },
  },
  {
    id: 'GT-4',
    name: 'Gemini IV, final at insertion, MSC-G-R-65-3 Table 4-III',
    heights: ['87.6', '152.2'],
    period: '88.90',
    inclination: '32.53',
    // Table 4-II, spacecraft separation, final: 30.97 deg N, 87.6 nautical miles, flight-path angle 0.07 deg
    at: { latitude: 30.97, height: 87.6, path: 0.07 },
  },
  {
    id: 'GT-5',
    name: 'Gemini V, final at insertion, MSC-G-R-65-4 Table 4.3-II',
    heights: ['87.4', '188.9'],
    period: '89.59',
    inclination: '32.59',
    // Table 4.3-I, spacecraft separation, final: 30.89 deg N, 87.4 nautical miles, flight-path angle 0.0 deg
    at: { latitude: 30.89, height: 87.4, path: 0.0 },
  },
];

/** Half the last digit a figure is printed to. */
const half = (x) => 0.5 * 10 ** -(x.split('.')[1]?.length ?? 0);
const seconds = (p) => (p.includes(':') ? Number(p.split(':')[0]) * 60 + Number(p.split(':')[1]) : Number(p) * 60);
const roundingOf = (p) => (p.includes(':') ? 0.5 : half(p) * 60);

/** Where a set's perigee stands, rad, and the true anomaly at its insertion, rad. */
function placeOf(s) {
  if (s.flight) {
    const o = s.flight.plan.record.orbit;
    return { argp: perigeeAt(s.flight.plan, geodeticToEcef(siteFrame(s.flight.site))), anomaly: o.injection.anomaly.value * DEG };
  }
  const i = Number(s.inclination) * DEG;
  const r = geodeticToEcef({ latitude: s.at.latitude, longitude: 0, height: s.at.height * NMI });
  const u = Math.asin(Math.sin(Math.asin(r[2] / Math.hypot(...r))) / Math.sin(i));
  const [hp, ha] = s.heights.map((h) => Number(h) * NMI);
  const e = (ha - hp) / (2 * (6_378_000 + (hp + ha) / 2));
  // tan path = e sin v / (1 + e cos v), v the anomaly past perigee
  let v = 0;
  for (let k = 0; k < 50; k++) v = Math.asin((Math.tan(s.at.path * DEG) * (1 + e * Math.cos(v))) / e);
  return { argp: u - v, anomaly: v };
}

/** Each reading's period, s, of the mean orbit the heights (m) give over the ball (m). */
function readingsOn(ball, hp, ha, i, argp) {
  const a = ball + (hp + ha) / 2;
  const e = (ha - hp) / (2 * a);
  return { ...periodsOf(a, e, i, argp), a, e };
}

/** A set on a ball (a function of the heights, m, so that a height's rounding moves the ball as it would): each reading's miss, s, the rounding, s, and what it supports. */
function judge(s, ballOf) {
  const i = Number(s.inclination) * DEG;
  const { argp, anomaly } = placeOf(s);
  const [hp, ha] = s.heights.map((h) => Number(h) * NMI);
  const P = seconds(s.period);
  const ball = ballOf(hp, ha, i, argp);
  const got = readingsOn(ball, hp, ha, i, argp);
  const [up, ua] = s.heights.map((h) => (Number(h) + half(h)) * NMI);
  const moved = readingsOn(ballOf(up, ua, i, argp), up, ua, i, argp);
  const rounding = roundingOf(s.period) + Math.max(...READINGS.map((k) => Math.abs(moved[k] - got[k])));
  const miss = Object.fromEntries(READINGS.map((k) => [k, got[k] - P]));
  const [nearest, ...others] = [...READINGS].sort((x, y) => Math.abs(miss[x]) - Math.abs(miss[y]));
  // nearest for every period within the rounding: no midpoint between it and another reading falls within it
  const decides = others.every((k) => Math.abs((miss[nearest] + miss[k]) / 2) > rounding);
  // not a period of the mean orbit and not flown: the Kepler period of the osculating orbit at the insertion, shown
  const osc = osculatingOf({ a: got.a, e: got.e, i, node: 0, argp, mean: meanAnomaly(anomaly, got.e) });
  const atInsertion = 2 * Math.PI * Math.sqrt(osc.a ** 3 / EARTH.gm.value) - P;
  return {
    ball,
    miss,
    rounding,
    nearest,
    decides,
    fits: Math.abs(miss[nearest]) <= rounding,
    atInsertion,
    latitude: Math.asin(Math.sin(i) * Math.sin(argp)),
  };
}

const signed = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;
const line = (s, j) =>
  `${s.id} (${s.name}) over ${(j.ball / 1000).toFixed(1)} km, its perigee at ${(j.latitude / DEG).toFixed(1)} deg: ` +
  `${READINGS.map((k) => `${k} ${signed(j.miss[k])} s`).join(', ')} (rounding ± ${j.rounding.toFixed(2)} s); ` +
  `${j.nearest}${j.fits ? ', within its rounding' : `, ${(Math.abs(j.miss[j.nearest]) - j.rounding).toFixed(1)} s beyond its rounding`}` +
  `${j.decides ? ', and it decides' : ', and it does not decide'}; the osculating orbit’s Kepler period at insertion ${signed(j.atInsertion)} s, not flown`;

/** The ball each set is read on: a flight's own (its record's), and Gemini IV's and V's on the rule Gemini 3's record states. */
const recordBall = (s) => (s.flight ? () => heightsBall(s.flight.plan, siteFrame(s.flight.site)) : flownApsisBall);
const judged = new Map(SETS.map((s) => [s.id, judge(s, recordBall(s))]));

test('each set is printed as its record has it', () => {
  for (const s of SETS.filter((x) => x.flight)) {
    const o = s.flight.plan.record.orbit;
    assert.ok(Math.abs(o.perigee.value - Number(s.heights[0]) * NMI) < 1e-6, `${s.id} perigee`);
    assert.ok(Math.abs(o.apogee.value - Number(s.heights[1]) * NMI) < 1e-6, `${s.id} apogee`);
    assert.ok(Math.abs(o.period.value - seconds(s.period)) < 1e-6, `${s.id} period`);
    assert.equal(o.inclination.value, Number(s.inclination), `${s.id} inclination`);
  }
});

test('each NASA record flies the reading of its period its own heights support: derived where its set decides, assumed from a sister set that does', () => {
  for (const s of SETS) {
    const j = judged.get(s.id);
    console.log(`  # ${line(s, j)}`);
    if (!s.flight) continue;
    const kind = s.flight.plan.record.orbit.kind;
    assert.ok(kind, `${s.id}: the record says what its period is`);
    assert.equal(kind.is, j.nearest, `${s.id}: flies ${kind.is}, its own set is nearest ${j.nearest}`);
    assert.notEqual(kind.confidence, 'estimated', `${s.id}: the reading rests on figures`);
    if (j.decides) assert.equal(kind.confidence, 'derived', `${s.id}: its own set decides`);
    else {
      assert.equal(kind.confidence, 'assumed', `${s.id}: its own set does not decide`);
      assert.ok(s.takes, `${s.id}: its own set does not decide, and it takes no sister's`);
      const sisters = s.takes.from.map((from) => judged.get(from));
      assert.ok(
        sisters.every((x) => x.nearest === kind.is),
        `${s.id}: ${s.takes.from.join(' and ')} are nearest ${sisters.map((x) => x.nearest)}`,
      );
      assert.ok(
        sisters.some((x) => x.decides),
        `${s.id}: one of ${s.takes.from.join(' and ')} decides`,
      );
      assert.ok(kind.source.includes(s.takes.says), `${s.id}: its source names the sister's`);
    }
  }
});

test('Gemini’s heights are the apsides flown over the oblate earth: on it each Gemini set is nearest the anomalistic period and far nearer than on the ellipsoid as mean heights; the equatorial radius is within a kilometre of it', () => {
  const equatorial = ma6.plan.record.orbit.radius.value;
  const balls = {
    'the equatorial radius, mean heights (Friendship 7’s ball)': () => equatorial,
    'the ellipsoid under the apsis, mean heights (the trial reverted)': (hp, ha, i, argp) => apsisRadius(i, argp),
    'the oblate earth, the apsides flown (the reports’ final elements)': flownApsisBall,
  };
  assert.equal(gt3.plan.record.orbit.over?.is, 'oblate', 'Gemini 3’s record states the reports’ oblate earth');
  for (const id of ['GT-3', 'GT-4', 'GT-5']) {
    const s = SETS.find((x) => x.id === id);
    const on = Object.fromEntries(Object.entries(balls).map(([name, ball]) => [name, judge(s, ball)]));
    for (const [name, j] of Object.entries(on)) console.log(`  # ${id} on ${name}: ${line(s, j)}`);
    const [plain, ellipsoid, oblate] = Object.values(on);
    assert.equal(oblate.nearest, 'anomalistic', `${id}: on the oblate earth`);
    assert.ok(
      Math.abs(oblate.miss.anomalistic) < Math.abs(ellipsoid.miss[ellipsoid.nearest]) - 1,
      `${id}: nearer than as mean heights over the ellipsoid`,
    );
    // (the apsides' lift, some 6 km at 30 degrees, is nearly the ellipsoid's fall from the equator there: so Friendship 7's
    // equatorial radius, its heights read as mean apsides, is within a kilometre of the reports' reduction)
    assert.ok(Math.abs(oblate.ball - plain.ball) < 1000, `${id}: ${oblate.ball} against ${plain.ball}`);
  }
});
