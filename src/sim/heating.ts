/**
 * What the air's heat does to a vehicle: the heat flux at the stagnation point from the air's
 * density and the speed through it, and the temperature of each surface a flight names
 * (`Trajectory.heating`, types.ts) as it takes its share of that flux and radiates. Pure, in
 * doubles, with no three.js; it reads a simulator's samples (fly.ts's or vehicle.ts's) and changes
 * nothing in either flight.
 *
 * Heat flux. Sutton and Graves (NASA TR R-376, 1971): at the stagnation point of a blunt body in
 * air, to a wall far colder than the gas,
 *
 *     q = k sqrt(density / nose radius) speed^3,   k = 1.7415e-4 kg^0.5 / m   (W/m^2, SI)
 *
 * The equation and the constant are quoted from memory, as they are commonly given from that report:
 * the report was not opened and neither is verified against it (docs/sources.md lists it as not read).
 * It is a fit for hypersonic flight; under about Mach 3 it says only that there is next to nothing,
 * which is true. The flux to a wall that has warmed is less by the enthalpy the wall already has,
 * (h0 - hw) / h0, with h0 = cp T + speed^2 / 2 the air's total enthalpy and hw = cp Twall, cp that
 * of cold air: so a skin can be warmed no further than the air brought to rest would be (Mach 3 in
 * the stratosphere is some 600 K), and one hotter than that is cooled.
 *
 * Surfaces. Each is one lump: `arealMass` kilograms of it behind every square metre, all at one
 * temperature (a heat sink an inch thick is not quite: its face runs hotter than its back for the
 * seconds the heat takes to cross it). It takes its `share` of the stagnation flux (`up` flying
 * nose first, `down` blunt end first, mixed by the attitude when a sample has one) and radiates
 * emissivity times sigma (T^4 - T0^4) to surroundings taken to be at the temperature it started
 * at: sunlight and the Earth's own heat are not modelled, and roughly make that so. Conduction into
 * what is behind it is left out. Integrated by Heun's method in steps of a quarter of a second at
 * most, with the heat taken in and radiated summed by the same rule, so the lump holds exactly
 * their difference.
 *
 * The gas. `shockTemperature` is a rough figure for how hot the air is behind the bow shock, for
 * what colour it glows (viewer/entry.ts): the air brought to rest as a perfect gas up to 2,500 K,
 * and beyond that only 15 per cent of the rise, the rest going into pulling its molecules apart.
 * That is a judgement, chosen to give the 6,000 to 7,000 K commonly quoted for an orbital entry
 * (remembered, not looked up), and it is used for colour only.
 */
import type { HeatedSurface, Heating } from '../types';
import { atmosphere } from './atmosphere.ts';
import type { Sample } from './fly.ts';

/** Sutton and Graves's constant for air, kg^0.5 / m, as commonly quoted from NASA TR R-376 (1971): from memory, the report not opened, unverified. */
export const SUTTON_GRAVES = 1.7415e-4;
/** W/(m^2 K^4), CODATA 2018. */
export const STEFAN_BOLTZMANN = 5.670374419e-8;
/** Cold air's specific heat at constant pressure, J/(kg K): 7/2 of the gas constant of the 1976 standard air (287.053), a perfect diatomic gas. */
const CP_AIR = 1004.7;
/** The longest step a surface's temperature is integrated over, s. */
const STEP = 0.25;

/** The heat flux at the stagnation point of a nose of `noseRadius` metres, to a cold wall, W/m^2. Density in kg/m^3, speed through the air in m/s. */
export function stagnationFlux(density: number, airspeed: number, noseRadius: number): number {
  return SUTTON_GRAVES * Math.sqrt(Math.max(0, density) / noseRadius) * Math.abs(airspeed) ** 3;
}

/** The air's total enthalpy at a speed through it, J/kg. */
export function totalEnthalpy(airTemperature: number, airspeed: number): number {
  return CP_AIR * airTemperature + 0.5 * airspeed * airspeed;
}

/** How much of the cold-wall flux a wall at `wall` kelvin takes: 1 for a cold one, 0 at the air's own stagnation temperature, negative above it. */
export function wallFactor(enthalpy: number, wall: number): number {
  return enthalpy > 0 ? 1 - (CP_AIR * wall) / enthalpy : 0;
}

/** Roughly how hot the air is behind the bow shock, K (see the header: a judgement, for colour only). */
export function shockTemperature(airTemperature: number, airspeed: number): number {
  const perfect = totalEnthalpy(airTemperature, airspeed) / CP_AIR;
  return perfect <= 2500 ? perfect : 2500 + 0.15 * (perfect - 2500);
}

/** One surface at an instant. */
export interface SurfaceHeat {
  /** K */
  temperature: number;
  /** The heat flux into it now, W/m^2: its share, to the wall as warm as it is. */
  flux: number;
  /** What the air has put into it and what it has radiated since liftoff, J/m^2: the lump holds their difference. */
  absorbed: number;
  radiated: number;
}

/** The heating at an instant of a flight. */
export interface Thermal {
  /** Seconds from liftoff. */
  t: number;
  /** The cold-wall heat flux at the stagnation point of the reference nose, W/m^2, and its sum since liftoff, J/m^2. */
  flux: number;
  load: number;
  /** The air's total enthalpy, J/kg, and roughly how hot it is behind the shock, K. */
  enthalpy: number;
  gas: number;
  /** 0 flying nose first, 1 blunt end first. */
  blunt: number;
  /** In the order of `Heating.surfaces`. */
  surfaces: SurfaceHeat[];
}

/** How a sample lies to the air: 0 nose first, 1 blunt end first. A live sample says (`alpha`); the record's rides its booster nose first and comes down blunt end first. */
function bluntness(sample: Sample): number {
  const alpha = (sample as { alpha?: number }).alpha;
  const riding = sample.phase === 'powered' || sample.phase === 'coast';
  if (riding) return 0;
  if (typeof alpha === 'number') return (1 - Math.cos((alpha * Math.PI) / 180)) / 2;
  return sample.phase === 'escape' ? 0 : 1;
}

/** Whether what is out of the air under the booster (a surface with no `up` share) is still covered. */
const covered = (sample: Sample): boolean => sample.phase === 'powered' || sample.phase === 'coast';

/** A surface's share of the stagnation flux as the vehicle lies. */
function shareOf(surface: HeatedSurface, blunt: number, under: boolean): number {
  if (under && !surface.share.up) return 0;
  return (surface.share.up?.value ?? 0) * (1 - blunt) + (surface.share.down?.value ?? 0) * blunt;
}

/** The air's part of an instant: everything but the surfaces. */
function outside(heating: Heating, sample: Sample): { flux: number; enthalpy: number; gas: number; blunt: number } {
  const air = atmosphere(sample.altitude);
  const speed = sample.groundSpeed; // through air that turns with the Earth
  return {
    flux: stagnationFlux(air.density, speed, heating.noseRadius.value),
    enthalpy: totalEnthalpy(air.temperature, speed),
    gas: shockTemperature(air.temperature, speed),
    blunt: bluntness(sample),
  };
}

/** The heating as a flight begins: nothing taken in, everything at `heating.starts`. */
export function begin(heating: Heating, sample: Sample): Thermal {
  const out = outside(heating, sample);
  const under = covered(sample);
  return {
    t: sample.t,
    ...out,
    load: 0,
    surfaces: heating.surfaces.map((s) => ({
      temperature: heating.starts.value,
      flux: out.flux * shareOf(s, out.blunt, under) * wallFactor(out.enthalpy, heating.starts.value),
      absorbed: 0,
      radiated: 0,
    })),
  };
}

/** The heating a sample later: `before` carried on to `sample`, the air between the two taken as changing evenly. */
export function advance(heating: Heating, before: Thermal, sample: Sample): Thermal {
  const out = outside(heating, sample);
  const dt = sample.t - before.t;
  const under = covered(sample);
  if (!(dt > 0)) return { ...before, ...out, t: sample.t };
  const steps = Math.min(400, Math.max(1, Math.ceil(dt / STEP)));
  const h = dt / steps;
  const t0 = heating.starts.value;
  const surfaces = heating.surfaces.map((surface, i): SurfaceHeat => {
    const was = before.surfaces[i]!;
    const capacity = surface.arealMass.value * surface.specificHeat.value;
    const emits = surface.emissivity.value * STEFAN_BOLTZMANN;
    // the flux into the wall and out of it, W/m^2, a fraction `k` of the way from the last sample to this
    const into = (k: number, wall: number): number =>
      (before.flux + (out.flux - before.flux) * k) *
      shareOf(surface, before.blunt + (out.blunt - before.blunt) * k, under) *
      wallFactor(before.enthalpy + (out.enthalpy - before.enthalpy) * k, wall);
    const away = (wall: number): number => emits * (wall ** 4 - t0 ** 4);
    let { temperature, absorbed, radiated } = was;
    for (let n = 0; n < steps; n++) {
      const [in1, out1] = [into(n / steps, temperature), away(temperature)];
      const guess = temperature + (h * (in1 - out1)) / capacity;
      const [in2, out2] = [into((n + 1) / steps, guess), away(guess)];
      absorbed += (h * (in1 + in2)) / 2;
      radiated += (h * (out1 + out2)) / 2;
      temperature += (h * (in1 + in2 - out1 - out2)) / 2 / capacity;
    }
    return { temperature, flux: into(1, temperature), absorbed, radiated };
  });
  return { t: sample.t, ...out, load: before.load + (dt * (before.flux + out.flux)) / 2, surfaces };
}

/** What a flight's heating came to. */
export interface HeatResults {
  /** The greatest cold-wall stagnation flux going up (on the booster) and coming down, W/m^2, and when. */
  exitFlux: number;
  exitFluxAt: number;
  entryFlux: number;
  entryFluxAt: number;
  /** The heat load at the stagnation point going up, and in all, J/m^2. */
  exitLoad: number;
  load: number;
  /** Each surface's highest temperature, K, and when, in the order of `Heating.surfaces`. */
  peaks: { temperature: number; at: number }[];
}

/** A whole flight's heating: the state at every sample, and what it came to. */
export function heatRun(heating: Heating, samples: readonly Sample[]): { states: Thermal[]; results: HeatResults } {
  const log = new HeatLog(heating);
  const states = [...log.upTo(samples)];
  return { states, results: log.results };
}

/**
 * A flight's heating kept up with its samples as they come: for a flight being flown, whose last
 * sample is replaced until it is kept (cockpit.ts). Ask with the run's samples whenever they may
 * have grown; what was worked out for samples that are still there is not worked out again.
 */
export class HeatLog {
  private readonly heating: Heating;
  private readonly states: Thermal[] = [];
  private readonly seen: Sample[] = [];
  private source: readonly Sample[] | null = null;
  results: HeatResults;
  /** What it had come to before the last sample taken in, and how many samples that covers: the last is the one a flight being flown replaces every tick. */
  private settled: HeatResults;
  private settledTo = -1;

  constructor(heating: Heating) {
    this.heating = heating;
    this.results = blank(heating.surfaces.length);
    this.settled = this.results;
  }

  upTo(samples: readonly Sample[]): readonly Thermal[] {
    const { states, seen } = this;
    if (samples !== this.source || (samples.length > 0 && seen.length > 0 && seen[0] !== samples[0])) {
      this.source = samples;
      states.length = seen.length = 0;
      this.results = blank(this.heating.surfaces.length);
      this.settledTo = -1;
    }
    // what is no longer there (the head, replaced; a flight begun again) is dropped
    let keep = Math.min(seen.length, samples.length);
    while (keep > 0 && seen[keep - 1] !== samples[keep - 1]) keep--;
    if (keep < seen.length) {
      states.length = seen.length = keep;
      // (only the head gone, as on every tick of a flight being flown: what it had come to before it was kept, so the
      // whole history is not gone through again every frame)
      this.results = keep === this.settledTo ? copy(this.settled) : summarise(this.heating, states, seen);
    }
    for (let i = seen.length; i < samples.length; i++) {
      const sample = samples[i]!;
      if (i === samples.length - 1) {
        this.settled = copy(this.results);
        this.settledTo = i;
      }
      const state = i === 0 ? begin(this.heating, sample) : advance(this.heating, states[i - 1]!, sample);
      states.push(state);
      seen.push(sample);
      note(this.results, state, sample, states[i - 1]);
    }
    return states;
  }
}

const copy = (r: HeatResults): HeatResults => ({ ...r, peaks: r.peaks.map((p) => ({ ...p })) });

function blank(surfaces: number): HeatResults {
  return {
    exitFlux: 0,
    exitFluxAt: 0,
    entryFlux: 0,
    entryFluxAt: 0,
    exitLoad: 0,
    load: 0,
    peaks: Array.from({ length: surfaces }, () => ({ temperature: 0, at: 0 })),
  };
}

function note(results: HeatResults, state: Thermal, sample: Sample, before: Thermal | undefined): void {
  if (covered(sample)) {
    if (state.flux > results.exitFlux) [results.exitFlux, results.exitFluxAt] = [state.flux, state.t];
    results.exitLoad = state.load;
  } else if (state.flux > results.entryFlux) [results.entryFlux, results.entryFluxAt] = [state.flux, state.t];
  results.load = state.load;
  state.surfaces.forEach((s, i) => {
    const peak = results.peaks[i];
    if (peak && (s.temperature > peak.temperature || !before)) [peak.temperature, peak.at] = [s.temperature, state.t];
  });
}

function summarise(heating: Heating, states: readonly Thermal[], samples: readonly Sample[]): HeatResults {
  const results = blank(heating.surfaces.length);
  states.forEach((state, i) => void note(results, state, samples[i]!, states[i - 1]));
  return results;
}

/** The heating at `t` between a run's states: flux, gas and temperatures read evenly between the two either side. */
export function thermalAt(states: readonly Thermal[], t: number): Thermal | null {
  if (!states.length) return null;
  let lo = 0;
  let hi = states.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (states[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = states[lo]!;
  const b = states[hi]!;
  if (t <= a.t || b.t <= a.t) return a;
  if (t >= b.t) return b;
  const k = (t - a.t) / (b.t - a.t);
  const mix = (x: number, y: number): number => x + (y - x) * k;
  return {
    t,
    flux: mix(a.flux, b.flux),
    load: mix(a.load, b.load),
    enthalpy: mix(a.enthalpy, b.enthalpy),
    gas: mix(a.gas, b.gas),
    blunt: mix(a.blunt, b.blunt),
    surfaces: a.surfaces.map((s, i) => {
      const o = b.surfaces[i]!;
      return {
        temperature: mix(s.temperature, o.temperature),
        flux: mix(s.flux, o.flux),
        absorbed: mix(s.absorbed, o.absorbed),
        radiated: mix(s.radiated, o.radiated),
      };
    }),
  };
}
