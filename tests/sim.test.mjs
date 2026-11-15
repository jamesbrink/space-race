// src/sim: the air, gravity and the integrator against what is known in closed form, and then
// every ballistic flight (tests/ballistic.mjs: Mercury-Redstone 3 and 4) flown from its flight.ts's `trajectory` against its `checks`.
//
// No input is fitted. Where the run misses a documented result by more than its tolerance, the
// miss is written down in src/sim/misses.ts (the debrief reads it too) with the input most likely responsible, and the test holds
// the run to that record (tests/misses.mjs `holdChecks`): a miss that is not recorded fails, and so does a recorded miss that
// has quietly gone away or grown, so the list cannot drift from the truth either way.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { along, coast, fly, G0, gravity, J2, sampleAt } from '../src/sim/fly.ts';
import { EARTH, EARTH_ROTATION_RATE, WGS84_A } from '../src/world/bodies.ts';
import {
  add,
  cross,
  DEG,
  dot,
  ecefToInertial,
  enuToEcefDirection,
  fromHorizontal,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  siteFrame,
  sub,
  unit,
} from '../src/world/frames.ts';
import { BALLISTIC } from './ballistic.mjs';
import { holdChecks, missesOf } from './misses.mjs';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('the air is the 1976 standard atmosphere', () => {
  // U.S. Standard Atmosphere 1976, Table I: temperature K, pressure Pa, density kg/m^3
  for (const [h, t, p, rho] of [
    [0, 288.15, 101325, 1.225],
    [5000, 255.676, 54048, 0.73643],
    [11000, 216.774, 22700, 0.3648],
    [20000, 216.65, 5529.3, 0.08891],
    [32000, 228.49, 889.06, 0.013555],
    [50000, 270.65, 79.779, 0.0010269],
    [60000, 247.021, 21.958, 0.00030968],
    [80000, 198.639, 1.0524, 0.000018458],
  ]) {
    const air = atmosphere(h);
    near(air.temperature, t, 0.05, `temperature at ${h} m`);
    near(air.pressure / p, 1, 0.002, `pressure at ${h} m`);
    near(air.density / rho, 1, 0.002, `density at ${h} m`);
  }
  near(atmosphere(0).soundSpeed, 340.29, 0.01, 'the speed of sound at sea level');
  // above the defined layers: the table, joined on without a step
  near(atmosphere(85999).density / atmosphere(86000).density, 1, 0.01, 'no step at 86 km');
  near(atmosphere(100_000).density, 5.604e-7, 1e-10, '100 km');
  near(atmosphere(150_000).density, 2.076e-9, 1e-12, '150 km');
  assert.ok(atmosphere(300_000).density < atmosphere(200_000).density / 5, 'and thinning beyond the table');
  let last = Infinity;
  for (let h = -100; h < 400_000; h += 500) {
    const d = atmosphere(h).density;
    assert.ok(d < last && d > 0, `thinner with height at ${h}`);
    last = d;
  }
});

test('gravity: a point mass, flattened', () => {
  const equator = gravity([WGS84_A, 0, 0]);
  const pole = gravity([0, 0, 6356752.3142]);
  // WGS 84's normal gravity is 9.7803 at the equator and 9.8322 at the poles; the equator's includes
  // the spin (0.0339), which this does not
  near(-equator[0], 9.7803 + 0.0339, 0.001, 'at the equator');
  near(-pole[2], 9.8322, 0.001, 'at the pole');
  near(length(gravity([WGS84_A, 0, 0], 0)), EARTH.gm.value / WGS84_A ** 2, 1e-12, 'with no flattening, GM over r squared');
});

test('the integrator against Kepler: a circular orbit closes, and an ellipse keeps its energy and comes round on time', () => {
  const mu = EARTH.gm.value;
  const r0 = WGS84_A + 400_000;
  const circular = Math.sqrt(mu / r0);
  const period = 2 * Math.PI * Math.sqrt(r0 ** 3 / mu);
  near(period / 60, 92.56, 0.01, 'a 400 km orbit takes 92.6 minutes');
  const round = coast([r0, 0, 0], [0, circular * Math.cos(51.6 * DEG), circular * Math.sin(51.6 * DEG)], period, 1, 0);
  near(length(add(round.r, [-r0, 0, 0])), 0, 1, 'back where it started, to a metre');
  // Freedom 7's coast is an ellipse that meets the ground: take one that does not, with the same apogee
  const apogee = WGS84_A + 187_400;
  const perigee = WGS84_A + 120_000;
  const a = (apogee + perigee) / 2;
  const vApogee = Math.sqrt(mu * (2 / apogee - 1 / a));
  const energy = (r, v) => dot(v, v) / 2 - mu / length(r);
  const half = coast([apogee, 0, 0], [0, vApogee, 0], Math.PI * Math.sqrt(a ** 3 / mu), 1, 0);
  near(length(half.r), perigee, 1, 'half a period later it is at perigee');
  near(energy(half.r, half.v) / energy([apogee, 0, 0], [0, vApogee, 0]), 1, 1e-10, 'with the energy it began with');
  near(length(cross(half.r, half.v)) / (apogee * vApogee), 1, 1e-10, 'and the angular momentum');
});

test('the Earth’s flattening turns an orbit’s plane at the textbook rate', () => {
  // nodal regression: -1.5 n J2 (Re / a)^2 cos i for a circular orbit: about 5 degrees a day at 400 km and 51.6 degrees
  const mu = EARTH.gm.value;
  const a = WGS84_A + 400_000;
  const incl = 51.6 * DEG;
  const n = Math.sqrt(mu / a ** 3);
  const expected = -1.5 * n * J2 * (WGS84_A / a) ** 2 * Math.cos(incl);
  const speed = Math.sqrt(mu / a);
  const node = (r, v) => {
    const h = cross(r, v);
    return Math.atan2(h[0], -h[1]);
  };
  const seconds = 20 * ((2 * Math.PI) / n);
  const after = coast([a, 0, 0], [0, speed * Math.cos(incl), speed * Math.sin(incl)], seconds, 2);
  near(node(after.r, after.v) / seconds / expected, 1, 0.02, 'nodal regression');
  near((expected * 86400) / DEG, -5.0, 0.1, 'which is five degrees a day');
});

const FREEDOM_7 = 'usa/mercury/mr-3-freedom-7';
assert.ok(
  BALLISTIC.some((f) => f.id === FREEDOM_7),
  'Freedom 7 is among the ballistic flights',
);

/** A rocket with no air to push through and no nozzle to gain from: the flight's numbers, simplified. */
function plain(flight) {
  const tr = structuredClone(flight.trajectory);
  tr.engine.exitArea.value = 0;
  tr.ascentDrag.points = [[0, 0]];
  return tr;
}
const siteOf = (flight) => ({ SITE: siteFrame(flight.site), SEA: flight.site.seaLevel.value });

for (const flight of BALLISTIC) {
  const { SITE, SEA } = siteOf(flight);
  const name = `${flight.designation} (${flight.callsign})`;

  test(`${name}: the rocket equation: what the accelerometer adds up to is exhaust speed times the log of the mass ratio`, () => {
    const tr = plain(flight);
    const { samples } = fly(tr, SITE, SEA, 0.05, 0.05);
    const cutoff = tr.engine.cutoff.value;
    const burn = samples.filter((s) => s.t <= cutoff && s.phase === 'powered');
    let felt = 0;
    for (let i = 1; i < burn.length; i++) felt += ((burn[i].g + burn[i - 1].g) / 2) * G0 * (burn[i].t - burn[i - 1].t);
    const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);
    const left = tr.liftoffMass.value - flow * cutoff;
    const ideal = G0 * tr.engine.isp.value * Math.log(tr.liftoffMass.value / left);
    near(felt / ideal, 1, 2e-3, 'felt velocity against Tsiolkovsky');
    near(sampleAt(samples, cutoff - 0.1).mass, left, flow * 0.2, 'and the mass at cutoff is what the flow leaves');
    near(samples[0].g, tr.engine.thrust.value / (tr.liftoffMass.value * G0), 1e-9, 'off the pad at thrust over weight');
  });

  test(`${name}: standing on the pad it has the ground’s speed, and the same inputs give the same flight`, () => {
    const a = fly(flight.trajectory, SITE, SEA);
    const b = fly(flight.trajectory, SITE, SEA);
    near(a.samples[0].speed, EARTH_ROTATION_RATE * Math.hypot(...geodeticToEcef(SITE).slice(0, 2)), 1e-9, '409 m/s eastward');
    assert.equal(a.samples[0].groundSpeed, 0);
    assert.deepEqual(a.results, b.results);
    assert.equal(a.samples.at(-1).phase, 'landed');
    near(along(flight.trajectory.tilt, 0), 0, 0, 'upright at liftoff');
    near(along(flight.trajectory.tilt, 200), 41, 1e-9, 'and held at 41 degrees after the arrest');
  });

  test(`${name}, flown whole from its inputs, against the record`, (t) => {
    const { results, samples } = fly(flight.trajectory, SITE, SEA);
    holdChecks(flight.checks, (id) => results[id], missesOf(flight.id, 'whole'), { name: flight.callsign, log: (l) => t.diagnostic(l) });
    // what the run gets right going up is the shape: the climb angles at separation, and the two loads (Freedom 7's report has the figures)
    if (flight.id !== FREEDOM_7) return;
    near(results.separationGroundClimb, 46.47, 1, 'Earth-fixed climb angle at separation');
    near(results.separationClimb, 39.01, 1, 'space-fixed climb angle at separation');
    near(sampleAt(samples, 80).g, 2.05, 0.15, 'about 2 g at 01:20, as the report’s Figure 4.2-5 draws it');
    near(sampleAt(samples, 120).g, 4.0, 0.2, 'and 4 g at 02:00');
  });

  test(`${name}: the capsule’s half, flown from the separation the record gives`, (t) => {
    // the Earth-fixed speed at the instant is the record's, and so are the height, climb and heading where it gives them;
    // what it does not give (and where over the sea it was then) is the run's own, and the diagnostics say which
    const want = Object.fromEntries(flight.checks.map((c) => [c.id, c.value]));
    const tr = flight.trajectory;
    const run = fly(tr, SITE, SEA).results;
    const at = sampleAt(fly(tr, SITE, SEA).samples, tr.separation.at.value);
    const own = [];
    const record = (id) => {
      if (want[id] !== undefined) return want[id];
      own.push(id);
      return run[id];
    };
    const turn = EARTH_ROTATION_RATE * tr.separation.at.value;
    const place = { latitude: at.latitude, longitude: at.longitude, height: record('separationAltitude') + SEA };
    if (!tr.separation.heading) own.push('heading');
    const heading = tr.separation.heading?.value ?? headingOf(at);
    const climb = record('separationGroundClimb');
    const moving = scale(enuToEcefDirection(place, fromHorizontal(heading * DEG, climb * DEG)), want.separationGroundSpeed);
    const r = ecefToInertial(geodeticToEcef(place), turn);
    const v = add(ecefToInertial(moving, turn), cross([0, 0, EARTH_ROTATION_RATE], r));
    if (own.length) t.diagnostic(`the record gives no ${own.join(', ')} at separation: the run’s own are taken`);
    const { results } = fly(tr, SITE, SEA, 0.05, 0.5, { r, v });
    // the space-fixed figures follow from the Earth-fixed ones, which is a check on the record and on the frames
    if (want.separationClimb !== undefined) {
      near(results.separationSpeed, want.separationSpeed, 1, 'space-fixed speed from Earth-fixed');
      near(results.separationClimb, want.separationClimb, 0.1, 'space-fixed climb angle from Earth-fixed');
    }
    const skip = ['exitQ', 'exitG', ...(want.separationAltitude === undefined ? ['separationSpeed'] : [])];
    holdChecks(
      flight.checks.filter((c) => !skip.includes(c.id)),
      (id) => results[id],
      missesOf(flight.id, 'capsule'),
      { name: flight.callsign, log: (l) => t.diagnostic(l) },
    );
    near(results.landingSpeed, 29 * 0.3048, 0.3, 'onto the sea at 29 ft/s');
    if (want.separationClimb !== undefined)
      near(
        dot(unit(r), unit(v)),
        Math.sin(want.separationClimb * DEG),
        0.002,
        'climbing as the record has it in the frame that does not turn',
      );
  });

  test(`${name}: which inputs are not documented, and how far each moves the results`, (t) => {
    const tr0 = flight.trajectory;
    const base = fly(tr0, SITE, SEA).results;
    const c = (m) => m.confidence;
    const inputs = [
      ['ascentDrag', (tr) => tr.ascentDrag.points.forEach((p) => (p[1] *= 1.05)), c(tr0.ascentDrag)],
      ['tilt', (tr) => tr.tilt.points.forEach((p) => (p[1] *= 1.05)), c(tr0.tilt)],
      ['engine.exitArea', (tr) => (tr.engine.exitArea.value *= 1.05), c(tr0.engine.exitArea)],
      ['separation.mass', (tr) => (tr.separation.mass.value *= 1.05), c(tr0.separation.mass)],
      ['separation.boosterMass', (tr) => (tr.separation.boosterMass.value *= 1.05), c(tr0.separation.boosterMass)],
      ['separation.speed', (tr) => (tr.separation.speed.value *= 1.05), c(tr0.separation.speed)],
      ['retro.fires', (tr) => tr.retro.fires.forEach((f) => (f.value *= 1.05)), c(tr0.retro.fires.at(-1))],
      ['retro.pitch', (tr) => (tr.retro.pitch.value *= 1.05), c(tr0.retro.pitch)],
      ['retropack.mass', (tr) => (tr.retropack.mass.value *= 1.05), c(tr0.retropack.mass)],
      ['drogue.dragArea', (tr) => (tr.drogue.dragArea.value *= 1.05), c(tr0.drogue.dragArea)],
      ['main.dragArea', (tr) => (tr.main.dragArea.value *= 1.05), c(tr0.main.dragArea)],
      ['area', (tr) => (tr.area.value *= 1.05), c(tr0.area)],
      ['drogue.fills', (tr) => (tr.drogue.fills.value *= 1.05), c(tr0.drogue.fills)],
      ['main.fills', (tr) => (tr.main.fills.value *= 1.05), c(tr0.main.fills)],
      ['engine.thrust', (tr) => (tr.engine.thrust.value *= 1.05), c(tr0.engine.thrust)],
      ['engine.isp', (tr) => (tr.engine.isp.value *= 1.05), c(tr0.engine.isp)],
      ['liftoffMass', (tr) => (tr.liftoffMass.value *= 1.05), c(tr0.liftoffMass)],
      ['winds', (tr) => tr.winds.levels.forEach((l) => (l.speed.value *= 1.05)), c(tr0.winds.levels[0].speed)],
      ['winds.calmAbove', (tr) => (tr.winds.calmAbove.value *= 1.05), c(tr0.winds.calmAbove)],
    ];
    const shown = ['separationSpeed', 'apogee', 'range', 'entryG', 'duration'];
    t.diagnostic(`a 5 % rise in each input moves, in per cent: ${shown.join(', ')}`);
    const moved = {};
    for (const [name, change, confidence] of inputs) {
      const tr = structuredClone(tr0);
      change(tr);
      const r = fly(tr, SITE, SEA).results;
      moved[name] = shown.map((id) => (r[id] / base[id] - 1) * 100);
      t.diagnostic(
        `${`${name} (${confidence})`.padEnd(34)} ${moved[name].map((x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`.padStart(7)).join('')}`,
      );
    }
    // the two estimated inputs that matter are the ones the misses are laid to
    assert.ok(moved.ascentDrag[0] < -0.3, 'more drag, less speed');
    assert.ok(Math.abs(moved['drogue.dragArea'][1]) < 0.01, 'the drogue has no say in the apogee');
    assert.ok(moved['main.dragArea'][4] > 0.5, 'a bigger main parachute, a longer flight');
    // where the wind is taken to die away above the sounding is past mattering: the air there is a hundredth of the surface's or
    // less (a twentieth more height to die away in moves MR-4's entry load, under 24 m/s at 31 km, by 0.03 per cent)
    assert.ok(
      moved['winds.calmAbove'].every((x) => Math.abs(x) < 0.1),
      'the calm above the sounding has no say',
    );
    // nothing in the trajectory is marked documented that the record calls a guess
    const estimated = [];
    const walk = (o, path) => {
      if (o && typeof o === 'object') {
        if (o.confidence && o.confidence !== 'documented') estimated.push(`${path} (${o.confidence})`);
        // `body` is the live simulator's (sim/vehicle.ts): fly() does not read it, and tests/vehicle.test.mjs lists what in it is not documented
        // `heating` is sim/heating.ts's: fly() does not read it either, and tests/heating.test.mjs holds every figure in it to a confidence and weighs the judgements
        for (const [k, v] of Object.entries(o)) if (k !== 'points' && k !== 'body' && k !== 'heating') walk(v, path ? `${path}.${k}` : k);
      }
    };
    walk(tr0, '');
    t.diagnostic(`not documented: ${estimated.join(', ')}`);
    // every one of them is weighed above (but the engine's run-dry time, which only the live simulator reads); a retrorocket's
    // time is weighed with the others
    const weighed = new Set(inputs.map(([name]) => name));
    const names = [...new Set(estimated.map((e) => e.split(' ')[0].replace(/^retro\.fires\.\d+$/, 'retro.fires')))].sort();
    for (const name of names)
      assert.ok(weighed.has(name) || name === 'engine.depletion', `${flight.callsign}: ${name} is not documented and is not weighed`);
    assert.deepEqual(names, NOT_DOCUMENTED[flight.id], `${flight.callsign}: the inputs that are not documented`);
  });
}

/** What each flight's record does not give, input by input: a change here is a change in what the simulator stands on, and is to be argued. */
const NOT_DOCUMENTED = {
  [FREEDOM_7]: [
    'area',
    'ascentDrag',
    'drogue.dragArea',
    'drogue.fills',
    'engine.depletion',
    'engine.exitArea',
    'main.dragArea',
    'main.fills',
    'retro.pitch',
    'separation.boosterMass',
    'tilt',
    'winds.calmAbove',
  ],
  // No. 11's weights are not in anything read (its Postlaunch Memorandum Report), nor the posigrades' push on MR-4
  'usa/mercury/mr-4-liberty-bell-7': [
    'area',
    'ascentDrag',
    'drogue.dragArea',
    'drogue.fills',
    'engine.depletion',
    'engine.exitArea',
    'main.dragArea',
    'main.fills',
    'retro.fires',
    'retropack.mass',
    'separation.boosterMass',
    'separation.mass',
    'separation.speed',
    'tilt',
    'winds.calmAbove',
  ],
};

/** The heading over the ground of a sample's motion, degrees true. */
function headingOf(s) {
  const place = { latitude: s.latitude, longitude: s.longitude, height: 0 };
  const east = enuToEcefDirection(place, fromHorizontal(90 * DEG, 0));
  const north = enuToEcefDirection(place, fromHorizontal(0, 0));
  const turn = EARTH_ROTATION_RATE * s.t;
  // the sample's velocity over the ground, in the Earth's axes
  const wind = sub(s.v, cross([0, 0, EARTH_ROTATION_RATE], s.r));
  const g = inertialToEcef(wind, turn);
  return (((Math.atan2(dot(g, east), dot(g, north)) / DEG) % 360) + 360) % 360;
}
