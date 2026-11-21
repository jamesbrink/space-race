// The Moon's gravity and the change of centre (src/world/lunargravity.ts, src/world/moon.ts `principalAxes`,
// src/sim/core/gravity.ts `fieldFor`, src/sim/orbital.ts `flyOrbit`): the field's coefficients against the published
// table, its sum against closed forms and against the potential's gradient summed another way, the Moon's axes against
// the IAU's pole and Meeus's, the same gravity on both sides of the sphere, and a coast flown through the sphere: one
// state across the crossing, the run that changes its centre against one flown about the Earth throughout on rails,
// and Apollo 8's injection as the run flies it, coasted to its nearest to the Moon, against the Mission Report.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { flight as apollo8 } from '../missions/usa/apollo/flights/apollo-8/flight.ts';
import { TLI_PERICYNTHION } from '../missions/usa/apollo/flights/apollo-8/orbital.ts';
import { centreAt, EARTH_FIELD, fieldFor, RSPHERE, recentred, stepAbout, stepIn, termsOf } from '../src/sim/core/gravity.ts';
import { apart, coast, crossing } from '../src/sim/rails.ts';
import { clockAt } from '../src/sim/plan.ts';
import { between, runOf } from '../src/sim/run.ts';
import { flyWhole, steer } from '../src/sim/staged.ts';
import { MOON } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { stateOf, useEphemeris } from '../src/world/ephemeris.ts';
import { add, DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';
import { GRGM900C } from '../src/world/grgm900c.ts';
import { at, harmonicAcceleration, harmonics, LUNAR_DEGREE, lunarGravity, MOON_FIELD, normalisation } from '../src/world/lunargravity.ts';
import { moonAxes, principalAxes } from '../src/world/moon.ts';
import { gravity, step } from '../src/world/orbit.ts';
import { holdChecks, missesOf } from './misses.mjs';

const de440 = new Uint8Array(readFileSync(join(import.meta.dirname, '../public/ephemeris/de440.bin'))).slice().buffer;
const J2000 = 2_451_545.0;

test('the table is GRGM900C’s, cut to its degree: its GM, its radius and its first coefficients as published', () => {
  // (NASA PDS, GRAIL-L-LGRS-5-RDR-V1.0, shadr/gggrx_0900c_sha.tab: the header line and the lines of degree 2 and 3)
  assert.ok(Math.abs(GRGM900C.gm - 4902.79996708864e9) < 0.01, `GM ${GRGM900C.gm}`);
  assert.equal(GRGM900C.radius, 1_738_000);
  assert.equal(GRGM900C.degree, LUNAR_DEGREE);
  assert.equal(GRGM900C.c.length, at(LUNAR_DEGREE, LUNAR_DEGREE) + 1);
  assert.deepEqual([GRGM900C.c[at(0, 0)], GRGM900C.c[at(1, 0)], GRGM900C.c[at(1, 1)]], [1, 0, 0]);
  assert.equal(GRGM900C.c[at(2, 0)], -9.0886616361343905e-5);
  assert.equal(GRGM900C.c[at(2, 1)], -1.94959323612596e-10);
  assert.equal(GRGM900C.s[at(2, 1)], 1.0733325387331199e-9);
  assert.equal(GRGM900C.c[at(2, 2)], 3.46733340854267e-5);
  assert.equal(GRGM900C.c[at(3, 0)], -3.1973529610071702e-6);
  assert.equal(GRGM900C.c[at(3, 1)], 2.6368016319046001e-5);
  assert.equal(GRGM900C.s[at(3, 1)], 5.4545512661968897e-6);
  // unnormalised, the Moon's J2 and C22 as they are quoted (Williams et al. 2014, JGR Planets 119: 2.0331e-4 and 2.2382e-5)
  const j2 = -MOON_FIELD.c[at(2, 0)];
  const c22 = MOON_FIELD.c[at(2, 2)];
  assert.ok(Math.abs(j2 - 2.0331e-4) < 1e-7, `J2 ${j2}`);
  assert.ok(Math.abs(c22 - 2.2382e-5) < 1e-8, `C22 ${c22}`);
  assert.ok(Math.abs(normalisation(2, 0) - Math.sqrt(5)) < 1e-15 && Math.abs(normalisation(2, 2) - Math.sqrt(5 / 12)) < 1e-15);
});

/** The gradient of a potential at a place, by central differences a hundred-thousandth of its distance apart. */
const gradient = (U, p, h = 1e-5 * length(p)) =>
  [0, 1, 2].map((k) => {
    const [a, b] = [[...p], [...p]];
    a[k] -= h;
    b[k] += h;
    return (U(b) - U(a)) / (2 * h);
  });

/** A field's potential summed with fully normalised Legendre functions in latitude and longitude: nothing of Cunningham's in it. */
function potential(table, degree) {
  return (p) => {
    const r = length(p);
    const [sinLat, lon] = [p[2] / r, Math.atan2(p[1], p[0])];
    const cosLat = Math.sqrt(1 - sinLat * sinLat);
    const P = [];
    for (let n = 0; n <= degree; n++) P.push(new Array(n + 1).fill(0));
    P[0][0] = 1;
    for (let n = 1; n <= degree; n++) {
      // (sectorial, then the column down from it: the standard forward recursion of the normalised functions)
      P[n][n] = Math.sqrt(n === 1 ? 3 : (2 * n + 1) / (2 * n)) * cosLat * P[n - 1][n - 1];
      for (let m = 0; m < n; m++) {
        const a = Math.sqrt(((2 * n - 1) * (2 * n + 1)) / ((n - m) * (n + m)));
        const b = n - 2 >= m ? Math.sqrt(((2 * n + 1) * (n + m - 1) * (n - m - 1)) / ((n - m) * (n + m) * (2 * n - 3))) : 0;
        P[n][m] = a * sinLat * P[n - 1][m] - (b ? b * P[n - 2][m] : 0);
      }
    }
    let sum = 0;
    for (let n = 0; n <= degree; n++)
      for (let m = 0; m <= n; m++)
        sum += (table.radius / r) ** n * P[n][m] * (table.c[at(n, m)] * Math.cos(m * lon) + table.s[at(n, m)] * Math.sin(m * lon));
    return (table.gm / r) * sum;
  };
}

const places = [
  [1_848_000, 0, 0],
  [0, 1_900_000, 300_000],
  [-900_000, 700_000, 1_500_000],
  [600_000, -1_200_000, -1_300_000],
  [20_000_000, -30_000_000, 5_000_000],
];

test('the sum is the point mass at degree 0, the closed forms of J2 and C22 at degree 2, and the gradient of the potential summed another way at degree 30', () => {
  const point = harmonics({ gm: GRGM900C.gm, radius: GRGM900C.radius, degree: 0, c: [1], s: [0] });
  for (const p of places) {
    const want = scale(p, -GRGM900C.gm / length(p) ** 3);
    assert.ok(length(sub(harmonicAcceleration(point, p), want)) < 1e-15 * length(want) + 1e-18, 'the point mass');
  }
  // J2 and C22 alone: U = GM/r (1 - J2 (R/r)^2 (3 sin^2 lat - 1)/2 + 3 C22 (R/r)^2 cos^2 lat cos 2 lon), unnormalised
  const two = {
    gm: GRGM900C.gm,
    radius: GRGM900C.radius,
    degree: 2,
    c: [1, 0, 0, GRGM900C.c[at(2, 0)], 0, GRGM900C.c[at(2, 2)]],
    s: [0, 0, 0, 0, 0, 0],
  };
  const [j2, c22] = [-two.c[3] * Math.sqrt(5), two.c[5] * Math.sqrt(5 / 12)];
  const closed = (p) => {
    const r = length(p);
    const k = (two.radius / r) ** 2;
    return (two.gm / r) * (1 - (j2 * k * (3 * (p[2] / r) ** 2 - 1)) / 2 + (3 * c22 * k * (p[0] ** 2 - p[1] ** 2)) / r ** 2);
  };
  let worst = 0;
  for (const p of places) {
    const got = harmonicAcceleration(harmonics(two), p);
    const want = gradient(closed, p);
    worst = Math.max(worst, length(sub(got, want)) / length(want));
    assert.ok(length(sub(got, want)) < 1e-8 * length(want), `degree 2 at ${p}: ${length(sub(got, want)) / length(want)}`);
  }
  // the whole field to its degree, against the potential summed in latitude and longitude
  const U = potential(GRGM900C, LUNAR_DEGREE);
  for (const p of places) {
    const got = lunarGravity(p);
    const want = gradient(U, p);
    worst = Math.max(worst, length(sub(got, want)) / length(want));
    assert.ok(length(sub(got, want)) < 1e-8 * length(want), `degree ${LUNAR_DEGREE} at ${p}: ${length(sub(got, want)) / length(want)}`);
  }
  console.log(`# the sum against the potential's gradient: within ${worst.toExponential(1)} of itself (the differences' own error)`);
  // from degree 2 up it is what the Moon's shape adds: the whole less the point mass
  const p = places[2];
  const shape = harmonicAcceleration(MOON_FIELD, p, 2);
  assert.ok(length(sub(add(shape, scale(p, -GRGM900C.gm / length(p) ** 3)), lunarGravity(p))) < 1e-15);
});

test('the mascons are where they are: over Serenitatis, Imbrium and Crisium the Moon pulls harder than its sphere at 110 km, and the far-side highlands less than they', () => {
  /** How much harder than the point mass the Moon pulls down at 110 km over a place of its own frame, mGal. */
  const anomaly = (latitude, longitude) => {
    const u = [
      Math.cos(latitude * DEG) * Math.cos(longitude * DEG),
      Math.cos(latitude * DEG) * Math.sin(longitude * DEG),
      Math.sin(latitude * DEG),
    ];
    return -dot(harmonicAcceleration(MOON_FIELD, scale(u, 1_738_000 + 110_000), 3), u) * 1e5;
  };
  const maria = { Serenitatis: anomaly(26, 18), Imbrium: anomaly(37, -19), Crisium: anomaly(17, 58) };
  const highlands = anomaly(-20, 150);
  console.log(
    `# at 110 km, degrees 3 to ${LUNAR_DEGREE}: ${Object.entries(maria)
      .map(([k, v]) => `${k} ${v.toFixed(0)}`)
      .join(', ')} mGal; far-side highlands ${highlands.toFixed(0)}`,
  );
  for (const [name, v] of Object.entries(maria)) assert.ok(v > 20 && v > highlands + 20, `${name}: ${v} mGal`);
});

test('the Moon’s principal axes: DE440’s librations within the IAU pole’s and Meeus’s reach, Meeus’s where DE440 is not loaded, and said so', () => {
  useEphemeris(null);
  const meeus = principalAxes(J2000);
  assert.equal(meeus.source, 'Meeus');
  assert.equal(meeus.confidence, 'estimated');
  useEphemeris(de440);
  try {
    for (const jd of [J2000, 2_440_211.5 /* 1968 December 24 */, 2_440_423.4 /* 1969 July 20 */, 2_459_000.5]) {
      const pa = principalAxes(jd);
      assert.equal(pa.source, 'DE440');
      assert.equal(pa.confidence, 'derived');
      const [x, y, z] = pa.axes;
      // a rotation: three unit axes square to each other, right-handed
      assert.ok(
        Math.abs(length(x) - 1) < 1e-12 && Math.abs(dot(x, y)) < 1e-12 && Math.abs(dot(x, z)) < 1e-12 && Math.abs(dot(y, z)) < 1e-12,
      );
      assert.ok(dot([x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]], z) > 1 - 1e-12);
      // Meeus's mean-Earth axes, taken into the ICRF: his 0.03 degrees and the two frames' 0.03 apart
      useEphemeris(null);
      const [mx, , mz] = principalAxes(jd).axes;
      useEphemeris(de440);
      const off = { pole: Math.acos(Math.min(1, dot(z, mz))) / DEG, meridian: Math.acos(Math.min(1, dot(x, mx))) / DEG };
      assert.ok(
        off.pole < 0.08 && off.meridian < 0.08,
        `at ${jd}: the pole ${off.pole} and the prime meridian ${off.meridian} degrees from Meeus's`,
      );
      void moonAxes;
    }
    // the pole at J2000 by the IAU's series (Archinal et al. 2011, the Moon: the terms over 0.02 degrees)
    const [E1, E2, E3, E4, E6, E13] = [125.045, 250.089, 260.008, 176.625, 311.589, 25.053].map((d) => d * DEG);
    const ra =
      269.9949 -
      3.8787 * Math.sin(E1) -
      0.1204 * Math.sin(E2) +
      0.07 * Math.sin(E3) -
      0.0172 * Math.sin(E4) +
      0.0072 * Math.sin(E6) -
      0.0052 * Math.sin(E13);
    const dec =
      66.5392 +
      1.5419 * Math.cos(E1) +
      0.0239 * Math.cos(E2) -
      0.0278 * Math.cos(E3) +
      0.0068 * Math.cos(E4) -
      0.0029 * Math.cos(E6) +
      0.0009 * Math.cos(25.053 * DEG) +
      0.0008 * Math.cos(E13);
    const iau = [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)];
    const pole = principalAxes(J2000).axes[2];
    const away = Math.acos(Math.min(1, dot(pole, iau))) / DEG;
    console.log(
      `# the pole at J2000: ${away.toFixed(4)} degrees from the IAU's series (the mean-Earth pole; the principal axes lie 0.02 from it)`,
    );
    assert.ok(away < 0.05, `${away} degrees`);
  } finally {
    useEphemeris(null);
  }
});

/**
 * Apollo 8's plan to the spacecraft's parting from the S-IVB and no further, under the Moon's field and the Sun with the
 * centre changing at the guidance computer's sphere (the plan's own gravity): the injection left alone, none of the firings
 * after it flown, which is what the Mission Report's pericynthion for the injection is a solution for.
 */
const parted = apollo8.plan.craft[0].joints.find((j) => j.id === 'spacecraft-separation').at.value;
const lunar = {
  ...apollo8.plan,
  // (by the record's instant: a cut the guidance makes on the state is set off by no clock)
  events: apollo8.plan.events.filter((e) => (e.at?.value ?? clockAt(apollo8.plan, e)) <= parted),
  // (and nothing to come down to: the descent is not flown)
  record: {
    ...Object.fromEntries(Object.entries(apollo8.plan.record).filter(([k]) => k !== 'ground' && k !== 'landing')),
    coastFixes: apollo8.plan.record.coastFixes.filter((f) => f.at.value <= parted),
  },
};
const site = siteFrame(apollo8.site);
const frame = frameOf(apollo8);
const sea = apollo8.site.seaLevel.value;

test('a plan that names nothing is flown under the Earth with J2 to the bit, and one with a sphere under the same gravity on both sides of it', () => {
  assert.equal(fieldFor(undefined, frame), EARTH_FIELD);
  const s = { r: [6_578_000, 100_000, 2_000_000], v: [-1200, 7300, 2100] };
  assert.deepEqual(stepIn(EARTH_FIELD, s, 0, 10), step(s, 0, 10));
  const push = (q) => scale(unit(q.v), -1e-4);
  assert.deepEqual(stepIn(EARTH_FIELD, s, 0, 10, push), step(s, 0, 10, push));
  assert.deepEqual(EARTH_FIELD.at(s.r, 5), gravity(s.r));
  // a Saturn V's to its injection (saturn-v-plan.ts), the Moon a point: the same sum as ever (world/orbit.ts step with the
  // pull added to the push)
  const named = fieldFor({ central: 'earth', terms: ['j2', 'moon'] }, frame);
  assert.equal(named.central, 'earth');
  assert.equal(named.sphere, undefined);
  const pulled = (q, t) => named.others(q.r, t);
  assert.deepEqual(stepIn(named, s, 0, 10), step(s, 0, 10, pulled));
  useEphemeris(de440);
  try {
    const field = fieldFor(lunar.gravity, frame);
    assert.equal(field.sphere, 64_373_760);
    assert.equal(field.confidence, 'derived');
    const [earth, moon] = [field.about('earth'), field.about('moon')];
    // About the Earth and about the Moon the accelerations differ by the Moon's own acceleration about the Earth, which
    // is DE440's: the same bodies are summed on both sides. Three days out, at places round the Moon.
    const t = 2.5 * 86_400;
    const m = field.moon(t);
    const h = 30;
    const accel = scale(sub(field.moon(t + h).v, field.moon(t - h).v), 1 / (2 * h));
    for (const p of [
      [1_848_000, 0, 0],
      [0, -5_000_000, 3_000_000],
      [-40_000_000, 20_000_000, 10_000_000],
    ]) {
      const [aboutEarth, aboutMoon] = [earth.at(add(m.r, p), t), moon.at(p, t)];
      const off = length(sub(sub(aboutEarth, aboutMoon), accel));
      assert.ok(off < 2e-8, `${off} m/s^2 between the two sides at ${p}`);
      // (and a state taken to the other centre and back is itself)
      const there = recentred(earth, { r: add(m.r, p), v: [10, 20, 30] }, t, 'moon');
      assert.ok(length(sub(there.r, p)) < 1e-6 && length(sub(recentred(moon, there, t, 'earth').v, [10, 20, 30])) < 1e-12);
      assert.equal(centreAt(earth, add(m.r, p), t), 'moon');
    }
    assert.equal(centreAt(earth, [7e6, 0, 0], t), 'earth');
    // one step from a state about the Earth, taken about either centre, is the same step to a millimetre
    const near = { r: add(m.r, [3_000_000, 1_000_000, 0]), v: add(m.v, [0, 900, 400]) };
    const off = apart(stepAbout(field, 'earth', near, t, 10), stepAbout(field, 'moon', near, t, 10));
    assert.ok(off.r < 1e-3 && off.v < 1e-6, `${off.r} m, ${off.v} m/s between a step about each centre`);
    assert.equal(termsOf(lunar.gravity, frame).length, 1);
  } finally {
    useEphemeris(null);
  }
});

test('the instant something changes sign is found by bisection', () => {
  const at0 = crossing((t) => Math.cos(t), 1, 2, 1e-9);
  assert.ok(Math.abs(at0 - Math.PI / 2) < 1e-9);
  assert.ok(Math.cos(at0) <= 0, 'on the far side of it');
  assert.ok(Math.abs(crossing((t) => t - 0.25, 0, 1, 1e-9) - 0.25) < 1e-9);
});

test('Apollo 8’s injection as the run flies it, coasted through the sphere to the Moon: one state across the crossing, the same coast on rails about the Earth, and its pericynthion against the Mission Report', () => {
  useEphemeris(de440);
  try {
    // (the ascent on the law the record's run solved; the coast from where it leaves the stack, three days)
    const whole = flyWhole(lunar, site, frame, sea, steer(lunar, site, frame, sea), 1);
    const { samples, results, crossings } = whole.coast;
    assert.ok(crossings?.length >= 1 && crossings[0].to === 'moon', 'it comes within the sphere');
    const field = fieldFor(lunar.gravity, frame).about('earth');
    const into = crossings[0].t;
    const k = samples.findIndex((s) => s.t === into);
    assert.ok(k > 0, 'a sample is kept at the crossing');
    // at the crossing it is on the sphere, within what a microsecond of its flight is
    const distance = (s) => length(sub(s.r, field.moon(s.t).r));
    assert.ok(Math.abs(distance(samples[k]) - RSPHERE.value) < 0.01, `${distance(samples[k]) - RSPHERE.value} m from the sphere`);
    assert.equal(samples[k - 1].central, undefined);
    assert.equal(samples[k].central, 'moon');
    console.log(
      `# into the sphere at ${(into / 3600).toFixed(3)} h, ${(distance(samples[k]) / 1000).toFixed(2)} km from the Moon; ${samples.length} samples kept of the coast`,
    );
    // one state across it: a millisecond either side, the place has moved by the velocity and the velocity by gravity, and no more
    const [a, b] = [between(samples, into - 5e-4), between(samples, into + 5e-4)];
    const here = samples[k];
    assert.ok(length(sub(sub(b.r, a.r), scale(here.v, 1e-3))) < 1e-5, 'no step in place');
    assert.ok(length(sub(sub(b.v, a.v), scale(field.at(here.r, into), 1e-3))) < 1e-7, 'no step in velocity');
    // a run of it says where it is about the body it is then flown about; its samples stay from the Earth's centre
    const run = runOf(apollo8, {
      samples,
      duration: Infinity,
      cutoff: 0,
      dropped: [],
      live: true,
      out: { drogue: Infinity, main: Infinity },
      field: fieldFor(lunar.gravity, frame),
      crossings,
    });
    const [outside, inside] = [run.centred(into - 3600), run.centred(into + 3600)];
    assert.equal(outside.central, 'earth');
    assert.deepEqual(outside.r, between(samples, into - 3600).r);
    assert.equal(inside.central, 'moon');
    assert.ok(
      length(inside.r) < RSPHERE.value && length(inside.r) > RSPHERE.value - 3600 * 2000,
      `${length(inside.r)} m from the Moon an hour in`,
    );
    assert.ok(length(sub(add(inside.r, field.moon(into + 3600).r), between(samples, into + 3600).r)) < 1e-6);
    // the same coast flown about the Earth throughout, by the adaptive pair, from ten hours before the crossing to the
    // last sample: the run that changed its centre is the same flight
    const from = samples.findLast((s) => s.t < into - 36_000);
    const last = samples.at(-1);
    const railed = coast(from, from.t, last.t, termsOf(lunar.gravity, frame));
    const off = apart(railed, last);
    console.log(
      `# ${((last.t - from.t) / 3600).toFixed(1)} h through the crossing: the run and the coast on rails about the Earth end ${off.r.toFixed(2)} m and ${(off.v * 1000).toFixed(3)} mm/s apart (${railed.steps} steps)`,
    );
    assert.ok(off.r < 50 && off.v < 0.05, `${off.r} m, ${off.v} m/s`);
    // its nearest to the Moon, against the report's solution for the injection: the separation manoeuvres and the
    // midcourse corrections are not flown
    assert.ok(Number.isFinite(results.pericynthion), 'a nearest approach');
    console.log(
      `# pericynthion ${(results.pericynthion / 1852).toFixed(1)} n. mi. at ${(results.pericynthionAt / 3600).toFixed(3)} h${results.moonImpactAt === undefined ? '' : `, striking the Moon at ${(results.moonImpactAt / 3600).toFixed(3)} h`}; the report: -130.2 n. mi. at 69.233 h`,
    );
    holdChecks(TLI_PERICYNTHION, (id) => results[id], missesOf(apollo8.id, 'lunar'), {
      name: 'Apollo 8, the injection coasted to the Moon',
    });
    assert.ok(MOON.equatorialRadius.value > 1.7e6);
  } finally {
    useEphemeris(null);
  }
});

test('the Moon’s place is DE440’s in a field with a sphere, and Meeus’s is said to be estimated', () => {
  useEphemeris(null);
  assert.equal(fieldFor(lunar.gravity, frame).confidence, 'estimated');
  assert.equal(stateOf('moon', frame.jdTT(0)).source, 'Meeus');
});
