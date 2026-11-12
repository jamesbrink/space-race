// src/sim/heating.ts: the heat flux formula against its published constant and a worked value, the
// lumped surfaces' energy balance, and Mercury-Redstone 3's heating as the simulator flies it.
// No temperature or heating figure measured on that flight is in the sources read, so there is no
// check to hold it to: the figures below are the model's own, pinned so a change is seen.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { atmosphere } from '../src/sim/atmosphere.ts';
import { fly } from '../src/sim/fly.ts';
import {
  advance,
  begin,
  HeatLog,
  heatRun,
  STEFAN_BOLTZMANN,
  SUTTON_GRAVES,
  shockTemperature,
  stagnationFlux,
  thermalAt,
  totalEnthalpy,
  wallFactor,
} from '../src/sim/heating.ts';
import { siteFrame } from '../src/world/frames.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

const heating = flight.trajectory.heating;
const run = fly(flight.trajectory, siteFrame(flight.site), flight.site.seaLevel.value);

test('the stagnation-point heat flux is Sutton and Graves', () => {
  // NASA TR R-376 (1971): for air, K = 1.7415e-4 kg^0.5/m, q = K sqrt(rho / Rn) V^3
  assert.equal(SUTTON_GRAVES, 1.7415e-4);
  // the constant by itself: unit density, unit radius, 1 km/s
  near(stagnationFlux(1, 1000, 1), 174_150, 1e-6, 'unit case');
  // A value worked by hand from the paper's formula (not one printed in it: none was to hand). A 1 m nose at 7.5 km/s in
  // air of 3.0e-4 kg/m^3 (about 60 km): 1.7415e-4 x sqrt(3.0e-4) x 7500^3 = 1.7415e-4 x 0.0173205 x 4.21875e11 = 1.2725 MW/m^2
  near(stagnationFlux(3.0e-4, 7500, 1) / 1e6, 1.2725, 0.0005, 'orbital entry, 1 m nose');
  // it goes as the cube of the speed and the inverse root of the radius
  near(stagnationFlux(1e-3, 4000, 1) / stagnationFlux(1e-3, 2000, 1), 8, 1e-9, 'cube of speed');
  near(stagnationFlux(1e-3, 4000, 4) / stagnationFlux(1e-3, 4000, 1), 0.5, 1e-9, 'root of radius');
  assert.equal(stagnationFlux(0, 5000, 1), 0, 'none without air');
  assert.equal(stagnationFlux(1, 0, 1), 0, 'none standing still');
});

test('a wall takes no heat from air it is as hot as', () => {
  // air at 220 K brought to rest from 900 m/s is at 220 + 900^2 / (2 x 1004.7) = 623 K
  const h = totalEnthalpy(220, 900);
  near(h / 1004.7, 623.1, 0.1, 'stagnation temperature');
  near(wallFactor(h, 300), 1 - 300 / 623.1, 1e-3, 'a cold wall takes most of it');
  near(wallFactor(h, 623.1), 0, 1e-3, 'a wall at the stagnation temperature takes none');
  assert.ok(wallFactor(h, 700) < 0, 'a hotter one is cooled');
  // the gas behind the shock: the perfect gas while that is cool, far under it at orbital speed
  near(shockTemperature(220, 900), 623.1, 0.1, 'slow: the perfect gas');
  const orbital = shockTemperature(220, 7800);
  assert.ok(orbital > 5500 && orbital < 8000, `an orbital entry's shock layer, commonly given as 6,000 to 7,000 K: ${orbital}`);
});

/** A sample that is only what the heating reads. */
const at = (t, altitude, groundSpeed, phase = 'entry') => ({ t, altitude, groundSpeed, phase });
/** One surface to try: 10 kg/m^2 of something with water's quarter of a specific heat. */
const lump = (emissivity, share = 1) => ({
  noseRadius: { value: 1 },
  starts: { value: 300 },
  surfaces: [
    {
      name: 'lump',
      materials: [],
      share: { down: { value: share } },
      arealMass: { value: 10 },
      specificHeat: { value: 1000 },
      emissivity: { value: emissivity },
      limit: { value: 2000 },
    },
  ],
});

test('a surface holds what it took in less what it radiated', () => {
  for (const emissivity of [0, 0.8]) {
    const model = lump(emissivity);
    // a pulse of heating: down through 60 to 40 km at 6 km/s, sampled unevenly
    let state = begin(model, at(0, 70_000, 6000));
    let t = 0;
    for (let i = 1; i <= 80; i++) {
      t += i % 3 === 0 ? 0.5 : 0.1;
      state = advance(model, state, at(t, 70_000 - 400 * i, 6000 - 40 * i));
    }
    const s = state.surfaces[0];
    const stored = 10 * 1000 * (s.temperature - 300);
    assert.ok(s.absorbed > 1e6, `it was heated: ${s.absorbed} J/m^2`);
    near((s.absorbed - s.radiated - stored) / s.absorbed, 0, 1e-9, `energy is conserved at emissivity ${emissivity}`);
    if (emissivity === 0) assert.equal(s.radiated, 0, 'nothing radiated by a surface that cannot');
    else assert.ok(s.radiated > 0 && s.radiated < s.absorbed, 'some of it radiated');
    assert.ok(state.load >= s.absorbed, 'the wall, warming, takes less than the cold-wall load');
  }
});

test('left hot in no air it cools by radiation alone, toward where it started', () => {
  const model = lump(1);
  // heated hard for ten seconds, then out of the air
  let state = begin(model, at(0, 50_000, 7000));
  state = advance(model, state, at(10, 50_000, 7000));
  const hot = state.surfaces[0].temperature;
  assert.ok(hot > 900, `it got hot: ${hot} K`);
  // out of the air at once (the flux between two samples is read evenly, so the second is given the same instant)
  state = advance(model, state, at(10, 400_000, 0, 'capsule'));
  const before = { ...state.surfaces[0] };
  state = advance(model, state, at(11, 400_000, 0, 'capsule'));
  // over a second: sigma T^4 / (m c), within what the fall in temperature over that second changes it
  const rate = (STEFAN_BOLTZMANN * (hot ** 4 - 300 ** 4)) / 10_000;
  near(before.temperature - state.surfaces[0].temperature, rate, 0.08 * rate, 'the first second of cooling');
  for (let t = 12; t < 40_000; t += 20) state = advance(model, state, at(t, 400_000, 0, 'capsule'));
  near(state.surfaces[0].temperature, 300, 5, 'and in the end, where it began');
  assert.ok(state.surfaces[0].temperature >= 300, 'never colder than its surroundings');
});

test('what is under the booster is out of the air, and what flies nose first takes the `up` share', () => {
  const model = lump(0);
  model.surfaces.push({ ...model.surfaces[0], name: 'skin', share: { up: { value: 0.5 } } });
  let state = begin(model, at(0, 30_000, 2000, 'powered'));
  state = advance(model, state, at(5, 30_000, 2000, 'powered'));
  assert.equal(state.surfaces[0].temperature, 300, 'the shield, covered, stays cold');
  assert.ok(state.surfaces[1].temperature > 300, 'the skin warms');
  // a live sample says how it lies: blunt end first is 180 degrees off the wind
  const live = (alpha) => ({ ...at(0, 40_000, 5000), alpha });
  near(begin(model, live(180)).blunt, 1, 1e-12, 'blunt end first');
  near(begin(model, live(0)).blunt, 0, 1e-12, 'nose first');
  near(begin(model, live(90)).blunt, 0.5, 1e-12, 'side on');
});

test('the same heating whether worked all at once or kept up sample by sample, as a flight being flown is', () => {
  const whole = heatRun(heating, run.samples);
  const log = new HeatLog(heating);
  const growing = [];
  for (const s of run.samples.slice(0, 1200)) {
    // (the head is replaced until it is kept: cockpit.ts)
    growing.push({ ...s, altitude: s.altitude + 50 });
    log.upTo(growing);
    growing.pop();
    growing.push(s);
    log.upTo(growing);
  }
  const states = log.upTo(growing);
  assert.equal(states.length, 1200);
  // and what it came to is the same, though the head was replaced at every step (it is not summed again from the start each time)
  assert.deepEqual(log.results, heatRun(heating, run.samples.slice(0, 1200)).results);
  for (const i of [0, 300, 700, 1100, 1199]) {
    assert.deepEqual(states[i], whole.states[i], `state ${i}`);
  }
  // between samples it is read evenly
  const [a, b] = [whole.states[1000], whole.states[1001]];
  near(thermalAt(whole.states, (a.t + b.t) / 2).flux, (a.flux + b.flux) / 2, 1e-9, 'between two samples');
  assert.equal(thermalAt(whole.states, -5), whole.states[0]);
  assert.equal(thermalAt(whole.states, 1e9), whole.states.at(-1));
});

test('Mercury-Redstone 3: the heating the simulator flies', () => {
  const started = performance.now();
  const { states, results } = heatRun(heating, run.samples);
  const took = performance.now() - started;
  // (about 8 ms on a quiet machine: the bound is for a busy one, and catches only a change of order)
  assert.ok(took < 1000, `cheap enough to work out as the page opens: ${took.toFixed(1)} ms for ${run.samples.length} samples`);
  const [shield, afterbody, cylinder, booster] = results.peaks;
  console.log(
    `  going up: ${(results.exitFlux / 1000).toFixed(1)} kW/m2 at ${results.exitFluxAt.toFixed(1)} s, ${(results.exitLoad / 1e6).toFixed(2)} MJ/m2\n` +
      `  coming down: ${(results.entryFlux / 1000).toFixed(1)} kW/m2 at ${results.entryFluxAt.toFixed(1)} s; in all ${(results.load / 1e6).toFixed(2)} MJ/m2\n` +
      heating.surfaces
        .map((s, i) => `  ${s.name}: ${results.peaks[i].temperature.toFixed(1)} K at ${results.peaks[i].at.toFixed(1)} s`)
        .join('\n'),
  );
  // (the whole flight's run, which ends its powered flight 4 % fast: tests/sim.test.mjs. Flux goes as the cube of speed)
  near(results.entryFlux / 1000, 78.8, 1.5, 'peak stagnation flux coming down, kW/m2');
  near(results.entryFluxAt, 510, 2, 'when');
  near(results.exitFlux / 1000, 17.0, 0.5, 'peak stagnation flux going up, kW/m2');
  near(results.load / 1e6, 2.62, 0.08, 'heat load at the stagnation point, MJ/m2');
  near(shield.temperature, 313.3, 1, 'the heat shield at its hottest, K');
  near(afterbody.temperature, 394, 4, 'the afterbody shingles at their hottest, K');
  assert.ok(afterbody.at < flight.trajectory.separation.at.value, 'which is going up, on the booster, not coming down');
  near(booster.temperature, 310, 2, 'the booster skin at its hottest, K');
  assert.ok(cylinder.temperature < 310);
  // a suborbital flight asks almost nothing of a heat sink made for more: a rise of 13 K against the 1,260 K to melting
  assert.ok(shield.temperature - heating.starts.value < 0.02 * (heating.surfaces[0].limit.value - heating.starts.value));
  // the heat sink's rise is the heat it took over what it can hold, radiation being nothing at that temperature
  const last = states.at(-1).surfaces[0];
  near(
    last.absorbed / (heating.surfaces[0].arealMass.value * heating.surfaces[0].specificHeat.value),
    last.temperature - 300,
    0.5,
    'rise from the heat taken in',
  );
  // nothing heats above where it flies slowly: at the greatest dynamic pressure going up the flux is a few kW/m2
  const maxQ = run.samples.reduce((a, b) => (b.t < 140 && b.q > a.q ? b : a));
  const there = states[run.samples.indexOf(maxQ)];
  assert.ok(there.flux < 6000, `at the greatest dynamic pressure going up, ${there.flux.toFixed(0)} W/m2`);
  assert.ok(atmosphere(maxQ.altitude).density > 0.2);
});

test('every heating input says how sure it is', () => {
  const measures = [heating.noseRadius, heating.starts];
  for (const s of heating.surfaces) measures.push(...Object.values(s.share), s.arealMass, s.specificHeat, s.emissivity, s.limit);
  for (const m of measures) {
    assert.ok(['documented', 'derived', 'estimated'].includes(m.confidence));
    assert.ok(m.source.length > 20, `a source for ${m.value}`);
  }
  // the judgements, and how far a tenth more of each moves the shield's and the afterbody's peak
  const base = heatRun(heating, run.samples).results.peaks;
  const weigh = (label, change) => {
    const model = structuredClone(heating);
    change(model);
    const peaks = heatRun(model, run.samples).results.peaks;
    console.log(
      `  ${label} +10 %: shield ${(peaks[0].temperature - base[0].temperature).toFixed(2)} K, afterbody ${(peaks[1].temperature - base[1].temperature).toFixed(2)} K`,
    );
  };
  weigh('shield share', (m) => void (m.surfaces[0].share.down.value *= 1.1));
  weigh('afterbody share going up', (m) => void (m.surfaces[1].share.up.value *= 1.1));
  weigh('emissivities', (m) => m.surfaces.forEach((s) => void (s.emissivity.value = Math.min(1, s.emissivity.value * 1.1))));
  weigh('starting temperature', (m) => void (m.starts.value *= 1.1));
});
