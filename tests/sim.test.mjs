// src/sim: the air, gravity and the integrator against what is known in closed form, and then
// Mercury-Redstone 3 flown from flight.ts's `trajectory` against flight.ts's `checks`.
//
// No input is fitted. Where the run misses a documented result by more than its tolerance, the
// miss is written down in src/sim/misses.ts (the debrief reads it too) with the input most likely responsible, and the test holds
// the run to that record: a miss that is not recorded fails, and so does a recorded miss that
// has quietly gone away or grown, so the list cannot drift from the truth either way.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { MISSES as RECORDED } from '../src/sim/misses.ts';
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
  length,
  scale,
  siteFrame,
  unit,
} from '../src/world/frames.ts';

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

/** A rocket with no air to push through and no nozzle to gain from: Freedom 7's numbers, simplified. */
function plain() {
  const tr = structuredClone(flight.trajectory);
  tr.engine.exitArea.value = 0;
  tr.ascentDrag.points = [[0, 0]];
  return tr;
}
const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;

test('the rocket equation: what the accelerometer adds up to is exhaust speed times the log of the mass ratio', () => {
  const tr = plain();
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
  near(samples[0].g, tr.engine.thrust.value / (tr.liftoffMass.value * G0), 1e-9, 'off the pad at thrust over weight: 1.19 g');
});

test('standing on the pad it has the ground’s speed, and the same inputs give the same flight', () => {
  const a = fly(flight.trajectory, SITE, SEA);
  const b = fly(flight.trajectory, SITE, SEA);
  near(a.samples[0].speed, EARTH_ROTATION_RATE * Math.hypot(...geodeticToEcef(SITE).slice(0, 2)), 1e-9, '409 m/s eastward');
  assert.equal(a.samples[0].groundSpeed, 0);
  assert.deepEqual(a.results, b.results);
  assert.equal(a.samples.at(-1).phase, 'landed');
  near(along(flight.trajectory.tilt, 0), 0, 0, 'upright at liftoff');
  near(along(flight.trajectory.tilt, 200), 41, 1e-9, 'and held at 41 degrees after the arrest');
});

const MISSES = RECORDED[flight.id];

function hold(results, misses, skip, t) {
  for (const c of flight.checks) {
    if (skip.includes(c.id)) continue;
    const got = results[c.id];
    assert.ok(Number.isFinite(got), `${c.id}: the run has no such result`);
    const off = got - c.value;
    const line = `${c.label}: ${got.toPrecision(6)} ${c.unit} against ${c.value.toPrecision(6)} (${off >= 0 ? '+' : ''}${((off / c.value) * 100).toFixed(1)} %)`;
    const miss = misses[c.id];
    if (Math.abs(off) <= c.tolerance) {
      assert.ok(!miss, `${c.id} is now within its tolerance: take it off the list of misses. ${line}`);
      t.diagnostic(`ok    ${line}`);
      continue;
    }
    assert.ok(miss, `${c.id} misses and no reason is recorded. ${line}`);
    const measured = miss.absolute ? off : off / c.value;
    assert.ok(
      Math.abs(measured - miss.by) <= miss.slack,
      `${c.id}: the miss has moved from the ${miss.by} recorded to ${measured.toFixed(3)}. ${line}`,
    );
    t.diagnostic(`MISS  ${line}: ${miss.why}`);
  }
}

test('Mercury-Redstone 3, flown whole from its inputs, against the Postlaunch Report', (t) => {
  const { results, samples } = fly(flight.trajectory, SITE, SEA);
  hold(results, MISSES.whole, [], t);
  // what the run gets right going up is the shape: the climb angles at separation, and the two loads
  near(results.separationGroundClimb, 46.47, 1, 'Earth-fixed climb angle at separation');
  near(results.separationClimb, 39.01, 1, 'space-fixed climb angle at separation');
  near(sampleAt(samples, 80).g, 2.05, 0.15, 'about 2 g at 01:20, as the report’s Figure 4.2-5 draws it');
  near(sampleAt(samples, 120).g, 4.0, 0.2, 'and 4 g at 02:00');
});

test('the capsule’s half, flown from the separation the report gives', (t) => {
  // height, Earth-fixed speed, climb and heading at 02:32.3 are the report's; where over the sea it was then is the run's own
  const want = Object.fromEntries(flight.checks.map((c) => [c.id, c.value]));
  const tr = flight.trajectory;
  const at = sampleAt(fly(tr, SITE, SEA).samples, tr.separation.at.value);
  const turn = EARTH_ROTATION_RATE * tr.separation.at.value;
  const place = { latitude: at.latitude, longitude: at.longitude, height: want.separationAltitude + SEA };
  const heading = 105.23; // Postlaunch Report, section 4.2: Earth-fixed heading angle at separation
  const moving = scale(
    enuToEcefDirection(place, fromHorizontal(heading * DEG, want.separationGroundClimb * DEG)),
    want.separationGroundSpeed,
  );
  const r = ecefToInertial(geodeticToEcef(place), turn);
  const v = add(ecefToInertial(moving, turn), cross([0, 0, EARTH_ROTATION_RATE], r));
  const { results } = fly(tr, SITE, SEA, 0.05, 0.5, { r, v });
  // the space-fixed figures follow from the Earth-fixed ones, which is a check on the report and on the frames
  near(results.separationSpeed, want.separationSpeed, 1, 'space-fixed speed from Earth-fixed');
  near(results.separationClimb, want.separationClimb, 0.1, 'space-fixed climb angle from Earth-fixed');
  hold(results, MISSES.capsule, ['exitQ', 'exitG'], t);
  near(results.landingSpeed, 29 * 0.3048, 0.3, 'onto the sea at 29 ft/s');
  near(dot(unit(r), unit(v)), Math.sin(want.separationClimb * DEG), 0.002, 'climbing at 39 degrees in the frame that does not turn');
});

test('which inputs are not documented, and how far each moves the results', (t) => {
  const tr0 = flight.trajectory;
  const base = fly(tr0, SITE, SEA).results;
  const inputs = [
    ['ascentDrag (estimated)', (tr) => tr.ascentDrag.points.forEach((p) => (p[1] *= 1.05)), tr0.ascentDrag.confidence],
    ['tilt programme (estimated)', (tr) => tr.tilt.points.forEach((p) => (p[1] *= 1.05)), tr0.tilt.confidence],
    ['engine.exitArea (derived)', (tr) => (tr.engine.exitArea.value *= 1.05), tr0.engine.exitArea.confidence],
    ['separation.boosterMass (derived)', (tr) => (tr.separation.boosterMass.value *= 1.05), tr0.separation.boosterMass.confidence],
    ['retro.pitch (derived)', (tr) => (tr.retro.pitch.value *= 1.05), tr0.retro.pitch.confidence],
    ['drogue.dragArea (estimated)', (tr) => (tr.drogue.dragArea.value *= 1.05), tr0.drogue.dragArea.confidence],
    ['main.dragArea (derived)', (tr) => (tr.main.dragArea.value *= 1.05), tr0.main.dragArea.confidence],
    ['area (derived)', (tr) => (tr.area.value *= 1.05), tr0.area.confidence],
    ['drogue.fills (estimated)', (tr) => (tr.drogue.fills.value *= 1.05), tr0.drogue.fills.confidence],
    ['main.fills (estimated)', (tr) => (tr.main.fills.value *= 1.05), tr0.main.fills.confidence],
    ['engine.thrust (documented)', (tr) => (tr.engine.thrust.value *= 1.05), tr0.engine.thrust.confidence],
    ['engine.isp (documented)', (tr) => (tr.engine.isp.value *= 1.05), tr0.engine.isp.confidence],
    ['liftoffMass (documented)', (tr) => (tr.liftoffMass.value *= 1.05), tr0.liftoffMass.confidence],
    ['winds (documented)', (tr) => tr.winds.levels.forEach((l) => (l.speed.value *= 1.05)), tr0.winds.levels[0].speed.confidence],
    ['winds.calmAbove (estimated)', (tr) => (tr.winds.calmAbove.value *= 1.05), tr0.winds.calmAbove.confidence],
  ];
  const shown = ['separationSpeed', 'apogee', 'range', 'entryG', 'duration'];
  t.diagnostic(`a 5 % rise in each input moves, in per cent: ${shown.join(', ')}`);
  const moved = {};
  for (const [name, change, confidence] of inputs) {
    assert.ok(name.includes(confidence), `${name}: flight.ts now says ${confidence}`);
    const tr = structuredClone(tr0);
    change(tr);
    const r = fly(tr, SITE, SEA).results;
    moved[name] = shown.map((id) => (r[id] / base[id] - 1) * 100);
    t.diagnostic(`${name.padEnd(34)} ${moved[name].map((x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`.padStart(7)).join('')}`);
  }
  // the two estimated inputs that matter are the ones the misses are laid to
  assert.ok(moved['ascentDrag (estimated)'][0] < -0.3, 'more drag, less speed');
  assert.ok(Math.abs(moved['drogue.dragArea (estimated)'][1]) < 0.01, 'the drogue has no say in the apogee');
  assert.ok(moved['main.dragArea (derived)'][4] > 0.5, 'a bigger main parachute, a longer flight');
  // where the wind is taken to die away above the sounding is past mattering: the air there is a hundredth of the surface's
  assert.ok(
    moved['winds.calmAbove (estimated)'].every((x) => Math.abs(x) < 0.01),
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
  // every one of them is weighed above (but the engine's run-dry time, which only the live simulator reads)
  const weighed = new Set(inputs.map(([name]) => name.split(' (')[0].replace('tilt programme', 'tilt')));
  for (const e of estimated) {
    const name = e.split(' ')[0];
    assert.ok(weighed.has(name) || name === 'engine.depletion', `${name} is not documented and is not weighed`);
  }
  assert.deepEqual(estimated.map((e) => e.split(' ')[0]).sort(), [
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
  ]);
});
