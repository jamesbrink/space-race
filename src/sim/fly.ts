/**
 * Flying a ballistic flight: a booster that burns once on a stored tilt programme, and a capsule
 * that separates, fires its retrorockets and comes down under parachutes. The whole of it is
 * integrated from the inputs in a flight's `trajectory` (types.ts): nothing here knows which
 * flight it is, and nothing is adjusted to make a result come out. tests/sim.test.mjs holds it
 * against the flight's documented results.
 *
 * The state is position and velocity in an Earth-centred frame that does not turn (frames.ts's
 * inertial frame, with the Greenwich meridian on +X at liftoff), in doubles, with the mass.
 *
 * Forces
 *   gravity   the Earth's, with its oblateness (J2): bodies.ts's GM and WGS 84's figure.
 *   thrust    along the vehicle's axis: the sea-level thrust plus the nozzle's exit area times
 *             the fall in air pressure. The flow is thrust over (g0 times specific impulse), steady
 *             from liftoff to cutoff: no build-up, no tail-off.
 *   drag      half rho v^2 Cd A against the motion through the air, which turns with the Earth and
 *             moves over it with the day's winds aloft where the trajectory gives them (`winds`:
 *             one sounding, the same all along the flight). Cd by Mach number at no angle of attack.
 *   air       atmosphere.ts.
 *
 * Attitude is prescribed, not flown. Going up, the axis is tilted from the launch vertical toward
 * the launch azimuth by the programme, in inertial space, as a gyro platform holds it. The
 * retrorockets push against the capsule's motion over the ground, pitched below the horizontal.
 * Otherwise the capsule's attitude only matters to its drag, and it is taken heat shield first.
 * A parachute's drag grows evenly from nothing to its full area over the time it takes to fill.
 *
 * Fixed-step fourth-order Runge-Kutta, with each step cut short to end exactly on the next event,
 * so a run is the same run every time.
 */
import type { Curve, Trajectory } from '../types';
import { EARTH, EARTH_ROTATION_RATE, WGS84_A } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  enuAxes,
  fromHorizontal,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { atmosphere } from './atmosphere.ts';
import { blowing, blowOf, upAt, upOver } from './forces.ts';

/** Standard gravity, m/s^2: what a "g" is, and what turns specific impulse into flow. */
export const G0 = 9.80665;
/** The Earth's oblateness: the second zonal harmonic of WGS 84's gravity model (EGM96's C20, unnormalised). */
export const J2 = 1.082_629_989e-3;
/** Sea-level air pressure, Pa: what a sea-level thrust is quoted at. */
export const P0 = 101_325;
/** The Earth's mean radius, m (IUGG): ranges over the ground are measured along a sphere of it. */
export const MEAN_RADIUS = 6_371_008.8;

/** Gravity at a position in an Earth-centred frame whose +Z is the pole, m/s^2. `j2`: the oblateness (0 for a point mass). */
export function gravity(r: Vec3, j2 = J2): Vec3 {
  const d = length(r);
  const k = (1.5 * j2 * WGS84_A * WGS84_A) / (d * d);
  const z2 = (5 * r[2] * r[2]) / (d * d);
  const g = -EARTH.gm.value / (d * d * d);
  return [g * r[0] * (1 + k * (1 - z2)), g * r[1] * (1 + k * (1 - z2)), g * r[2] * (1 + k * (3 - z2))];
}

/**
 * Coast: a position and velocity carried forward under gravity alone, by the same fixed-step
 * Runge-Kutta the flight uses. For orbits, and for checking the integrator against Kepler.
 */
export function coast(r: Vec3, v: Vec3, seconds: number, step = 1, j2 = J2): { r: Vec3; v: Vec3 } {
  const steps = Math.max(1, Math.round(seconds / step));
  const h = seconds / steps;
  const at = (a: Vec3, b: Vec3, k: number): Vec3 => add(a, scale(b, k));
  for (let i = 0; i < steps; i++) {
    const [k1r, k1v] = [v, gravity(r, j2)];
    const [k2r, k2v] = [at(v, k1v, h / 2), gravity(at(r, k1r, h / 2), j2)];
    const [k3r, k3v] = [at(v, k2v, h / 2), gravity(at(r, k2r, h / 2), j2)];
    const [k4r, k4v] = [at(v, k3v, h), gravity(at(r, k3r, h), j2)];
    r = at(r, add(add(k1r, scale(k2r, 2)), add(scale(k3r, 2), k4r)), h / 6);
    v = at(v, add(add(k1v, scale(k2v, 2)), add(scale(k3v, 2), k4v)), h / 6);
  }
  return { r, v };
}

/** A curve's value at x: straight lines between its points, flat beyond its ends. */
export function along(curve: Curve, x: number): number {
  const p = curve.points;
  if (x <= p[0]![0]) return p[0]![1];
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1]!;
    const [x1, y1] = p[i]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return p[p.length - 1]![1];
}

/** `escape` is the live simulator's only (sim/vehicle.ts): the spacecraft pulled off by its escape rocket, the tower still on. */
export type Phase = 'powered' | 'coast' | 'escape' | 'capsule' | 'entry' | 'drogue' | 'main' | 'landed';

/** The flight at one instant. */
export interface Sample {
  /** Seconds from liftoff. */
  t: number;
  phase: Phase;
  /** Height above the sea, m; distance over the ground from the pad, m. */
  altitude: number;
  range: number;
  /** Speed in the frame that does not turn (space-fixed), and over the turning Earth, m/s. */
  speed: number;
  groundSpeed: number;
  /** Climb angle above the local horizontal in each of those, degrees. */
  climb: number;
  groundClimb: number;
  /** What an accelerometer reads, in g: every force but gravity, over the mass. */
  g: number;
  /** Dynamic pressure, Pa, and Mach number. */
  q: number;
  mach: number;
  /** kg */
  mass: number;
  /** Where it is over: degrees north and east. */
  latitude: number;
  longitude: number;
  /** Position and velocity in the frame that does not turn, m and m/s. */
  r: Vec3;
  v: Vec3;
}

/** What the reports give figures for, as the run has them: ids match a flight's `checks`. */
export interface Results {
  /** The greatest height, m, and when. */
  apogee: number;
  apogeeAt: number;
  /** Distance over the ground from pad to landing, m, and the time of landing, s. */
  range: number;
  duration: number;
  /** Space-fixed and Earth-fixed speed, climb angles and height at capsule separation. */
  separationSpeed: number;
  separationGroundSpeed: number;
  separationClimb: number;
  separationGroundClimb: number;
  separationAltitude: number;
  /** The greatest dynamic pressure, Pa, and reading in g, going up and coming down. */
  exitQ: number;
  exitG: number;
  entryQ: number;
  entryG: number;
  /** When the capsule first feels a twentieth of a g coming down, and when each parachute opens, s. */
  entryAt: number;
  drogueAt: number;
  mainAt: number;
  /** How fast it is falling when it lands, m/s. */
  landingSpeed: number;
}

export interface Flown {
  samples: Sample[];
  results: Results;
}

interface State {
  r: Vec3;
  v: Vec3;
}

/**
 * Fly it. `site` is where it stands at liftoff, and `seaLevel` where the sea is there, in metres
 * above the ellipsoid (the geoid's height, taken as the same all along the flight): heights are
 * above the sea. `step` is the integration step in seconds and `every` how often a sample is kept.
 * The same inputs give the same flight to the last bit.
 *
 * `from` starts the flight at capsule separation instead, with the position and velocity given
 * (in the frame that does not turn, whose axes are the Earth's at liftoff): the capsule's half of
 * the flight can then be flown from the separation the reports give, whatever the booster did.
 */
export function fly(trajectory: Trajectory, site: Geodetic, seaLevel = 0, step = 0.05, every = 0.5, from?: { r: Vec3; v: Vec3 }): Flown {
  const tr = trajectory;
  const cutoff = tr.engine.cutoff.value;
  const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);
  const separation = tr.separation.at.value;
  const retroBurn = tr.retro.burn.value;
  const fires = tr.retro.fires.map((f) => f.value);
  const capsuleDrag = tr.area.value;
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];

  const pad = geodeticToEcef(site);
  const axisAt = axisOf(tr, site);
  const blow = blowOf(tr.winds);

  let t = 0;
  let phase: Phase = 'powered';
  let mass = tr.liftoffMass.value;
  // the parachute now out: the drag area it has when full, the area the one before it had, when it was let out and how long it takes to fill
  let chute = { full: 0, was: 0, at: 0, fills: 1 };
  let state: State = { r: pad, v: cross(spin, pad) }; // standing on the turning Earth

  /** Where the Earth-fixed axes have turned to: the frames coincide at liftoff. */
  const fixed = (r: Vec3, at: number): Vec3 => inertialToEcef(r, EARTH_ROTATION_RATE * at);

  /** Every force but gravity, N, and what the air is doing, at a state. */
  const forces = (s: State, at: number): { force: Vec3; q: number; mach: number; altitude: number } => {
    const place = ecefToGeodetic(fixed(s.r, at));
    const altitude = place.height - seaLevel;
    const air = atmosphere(altitude);
    const ground = sub(s.v, cross(spin, s.r)); // motion over the ground
    const wind = blow ? sub(ground, blowing(blow, place, altitude, at)) : ground; // motion through the air, which turns with the Earth and moves over it as the day's wind has it
    const airspeed = length(wind);
    const mach = airspeed / air.soundSpeed;
    const q = 0.5 * air.density * airspeed * airspeed;
    const riding = phase === 'powered' || phase === 'coast';
    const area = riding
      ? tr.area.value * along(tr.ascentDrag, mach)
      : capsuleDrag * along(tr.entryDrag, mach) +
        chute.was +
        (chute.full - chute.was) * Math.min(1, Math.max(0, (at - chute.at) / chute.fills));
    let force: Vec3 = airspeed > 0 ? scale(wind, (-q * area) / airspeed) : [0, 0, 0];
    if (phase === 'powered') {
      const thrust = tr.engine.thrust.value + (P0 - air.pressure) * tr.engine.exitArea.value;
      force = add(force, scale(axisAt(at), thrust));
    }
    // each retrorocket pushes against the motion over the ground, pitched below the level
    const burning = fires.filter((f) => at >= f && at < f + retroBurn).length;
    if (burning > 0 && !riding) {
      const up = upAt(s.r, at);
      const level = unit(sub(ground, scale(up, dot(ground, up))));
      const pitch = tr.retro.pitch.value * DEG;
      const push = sub(scale(level, -Math.cos(pitch)), scale(up, Math.sin(pitch)));
      force = add(force, scale(push, burning * tr.retro.thrust.value));
    }
    return { force, q, mach, altitude };
  };

  const rate = (s: State, at: number, m: number): State => ({ r: s.v, v: add(gravity(s.r), scale(forces(s, at).force, 1 / m)) });
  const nudge = (s: State, d: State, h: number): State => ({ r: add(s.r, scale(d.r, h)), v: add(s.v, scale(d.v, h)) });
  const massAt = (at: number): number => (phase === 'powered' ? tr.liftoffMass.value - flow * Math.min(at, cutoff) : mass);
  const rk4 = (s: State, at: number, h: number): State => {
    const k1 = rate(s, at, massAt(at));
    const k2 = rate(nudge(s, k1, h / 2), at + h / 2, massAt(at + h / 2));
    const k3 = rate(nudge(s, k2, h / 2), at + h / 2, massAt(at + h / 2));
    const k4 = rate(nudge(s, k3, h), at + h, massAt(at + h));
    return {
      r: add(s.r, scale(add(add(k1.r, scale(k2.r, 2)), add(scale(k3.r, 2), k4.r)), h / 6)),
      v: add(s.v, scale(add(add(k1.v, scale(k2.v, 2)), add(scale(k3.v, 2), k4.v)), h / 6)),
    };
  };

  const sample = (): Sample => {
    const m = massAt(t);
    const f = forces(state, t);
    const here = ecefToGeodetic(fixed(state.r, t));
    const up = upOver(here, t);
    const wind = sub(state.v, cross(spin, state.r));
    const climb = (v: Vec3): number => (length(v) > 1e-9 ? Math.asin(Math.max(-1, Math.min(1, dot(v, up) / length(v)))) / DEG : 90);
    return {
      t,
      phase,
      altitude: f.altitude,
      range: angleBetween(fixed(state.r, t), pad) * MEAN_RADIUS,
      speed: length(state.v),
      groundSpeed: length(wind),
      climb: climb(state.v),
      groundClimb: climb(wind),
      g: length(f.force) / m / G0,
      q: f.q,
      mach: f.mach,
      mass: m,
      latitude: here.latitude,
      longitude: here.longitude,
      r: state.r,
      v: state.v,
    };
  };

  // the instants at which something changes, in order: a step never crosses one
  const marks = [...new Set([cutoff, separation, tr.retropack.at.value, ...fires, ...fires.map((f) => f + retroBurn)])].sort(
    (a, b) => a - b,
  );
  const samples: Sample[] = [sample()];
  const results: Results = {
    apogee: 0,
    apogeeAt: 0,
    range: 0,
    duration: 0,
    separationSpeed: 0,
    separationGroundSpeed: 0,
    separationClimb: 0,
    separationGroundClimb: 0,
    separationAltitude: 0,
    exitQ: 0,
    exitG: 0,
    entryQ: 0,
    entryG: 0,
    entryAt: Number.NaN,
    drogueAt: Number.NaN,
    mainAt: Number.NaN,
    landingSpeed: 0,
  };
  const note = (s: Sample): void => {
    if (s.altitude > results.apogee) {
      results.apogee = s.altitude;
      results.apogeeAt = s.t;
    }
    const goingUp = s.t <= results.apogeeAt;
    if (goingUp) {
      results.exitQ = Math.max(results.exitQ, s.q);
      results.exitG = Math.max(results.exitG, s.g);
    } else if (phase === 'capsule' || phase === 'entry') {
      results.entryQ = Math.max(results.entryQ, s.q);
      // the retrorockets are felt too, but the reports' re-entry figure is the air's
      if (!fires.some((f) => s.t >= f && s.t <= f + retroBurn)) results.entryG = Math.max(results.entryG, s.g);
      if (Number.isNaN(results.entryAt) && s.t > fires[fires.length - 1]! + retroBurn && s.g >= 0.05) {
        results.entryAt = s.t;
        phase = 'entry';
      }
    }
  };

  /** What happens at the instant now reached, if anything does. */
  const arrive = (): void => {
    if (t === cutoff) {
      mass = tr.liftoffMass.value - flow * cutoff;
      phase = 'coast';
    }
    if (t === separation) {
      const s = sample();
      results.separationSpeed = s.speed;
      results.separationGroundSpeed = s.groundSpeed;
      results.separationClimb = s.climb;
      results.separationGroundClimb = s.groundClimb;
      results.separationAltitude = s.altitude;
      // the two are pushed apart along the axis; the capsule's share is the booster's part of the whole
      const share = tr.separation.boosterMass.value / (tr.separation.boosterMass.value + tr.separation.mass.value);
      state = { r: state.r, v: add(state.v, scale(axisAt(t), tr.separation.speed.value * share)) };
      mass = tr.separation.mass.value;
      phase = 'capsule';
    }
    if (t === tr.retropack.at.value) mass = tr.retropack.mass.value;
  };
  if (from) {
    t = separation;
    state = { r: from.r, v: from.v };
    phase = 'coast';
    mass = tr.liftoffMass.value - flow * cutoff;
    samples.length = 0;
    arrive();
    samples.push(sample());
  }

  let kept = t;
  const LIMIT = 4 * 3600; // a flight that has not come down in four hours is not this kind of flight
  for (let landed = false; !landed && t < LIMIT; ) {
    const mark = marks.find((m) => m > t + 1e-9);
    const h = Math.min(step, mark === undefined ? step : mark - t);
    const before = state;
    const heightBefore = forces(state, t).altitude;
    state = rk4(state, t, h);
    t = Math.abs(t + h - (mark ?? Number.NaN)) < 1e-9 ? mark! : t + h;

    arrive();

    // and what happens at a height, coming down
    const height = forces(state, t).altitude;
    const falling = height < heightBefore;
    if (falling && Number.isNaN(results.drogueAt) && height <= tr.drogue.altitude.value && phase !== 'powered' && phase !== 'coast') {
      results.drogueAt = t;
      chute = { full: tr.drogue.dragArea.value, was: 0, at: t, fills: tr.drogue.fills.value };
      phase = 'drogue';
    }
    if (falling && Number.isNaN(results.mainAt) && height <= tr.main.altitude.value && phase === 'drogue') {
      results.mainAt = t;
      chute = { full: tr.main.dragArea.value, was: tr.drogue.dragArea.value, at: t, fills: tr.main.fills.value };
      phase = 'main';
    }
    if (height <= 0 && t > 1) {
      // back to the instant it reached the sea, along the last step
      const part = heightBefore / (heightBefore - height);
      state = nudge(before, { r: scale(sub(state.r, before.r), 1 / h), v: scale(sub(state.v, before.v), 1 / h) }, h * part);
      t = t - h + h * part;
      const last = sample();
      results.landingSpeed = -dot(sub(state.v, cross(spin, state.r)), upAt(state.r, t));
      results.range = last.range;
      results.duration = t;
      phase = 'landed';
      samples.push({ ...last, phase });
      landed = true;
      break;
    }
    const s = sample();
    note(s);
    if (t - kept >= every - 1e-9 || marks.includes(t)) {
      samples.push(s);
      kept = t;
    }
  }
  return { samples, results };
}

/**
 * The vehicle's axis going up, in the frame that does not turn: tilted from the launch vertical
 * toward the launch azimuth by the programme, as the gyro platform holds it. Both directions are
 * fixed in inertial space at liftoff.
 */
export function axisOf(trajectory: Trajectory, site: Geodetic): (t: number) => Vec3 {
  const axes = enuAxes(site);
  const [e, n] = fromHorizontal(trajectory.azimuth.value * DEG, 0);
  const up0 = axes.up;
  const downrange0 = unit(add(scale(axes.east, e), scale(axes.north, n)));
  return (t) => {
    const tilt = along(trajectory.tilt, t) * DEG;
    return add(scale(up0, Math.cos(tilt)), scale(downrange0, Math.sin(tilt)));
  };
}

const runs = new WeakMap<Trajectory, Map<string, Flown>>();
/** The flight flown once, whoever asks first: the readout and the scene show the same run. */
export function flownOnce(trajectory: Trajectory, site: Geodetic, seaLevel = 0): Flown {
  // (the same hardware flown from another place, or over another sea, is another flight)
  const where = `${site.latitude},${site.longitude},${site.height},${seaLevel}`;
  let from = runs.get(trajectory);
  if (!from) runs.set(trajectory, (from = new Map()));
  let run = from.get(where);
  if (!run) from.set(where, (run = fly(trajectory, site, seaLevel)));
  return run;
}

/**
 * The drag area (coefficient times reference area), m^2, of what is flying at a Mach number: the
 * stack going up nose first (`riding`), or the spacecraft alone, heat shield first. Parachutes are
 * `chuteArea`'s. For what looks ahead from a state (predict.ts): the same curves the flight is flown from.
 */
export function dragArea(trajectory: Trajectory, riding: boolean, mach: number): number {
  return trajectory.area.value * along(riding ? trajectory.ascentDrag : trajectory.entryDrag, mach);
}

/** A parachute's drag area at `at`, m^2: growing evenly from the one before it (`was`) to its own (`full`) over the time it takes to fill. */
export function chuteArea(chute: { full: number; was: number; at: number; fills: number }, at: number): number {
  return chute.was + (chute.full - chute.was) * Math.min(1, Math.max(0, (at - chute.at) / chute.fills));
}

/** The engine's thrust in air of a pressure, N: the sea-level thrust plus the nozzle's exit area times the fall in pressure. */
export function thrustIn(trajectory: Trajectory, pressure: number): number {
  return trajectory.engine.thrust.value + (P0 - pressure) * trajectory.engine.exitArea.value;
}

/** The flight at an instant between samples: the nearest kept sample at or before `t`. */
export function sampleAt(samples: readonly Sample[], t: number): Sample {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid - 1;
  }
  return samples[lo]!;
}
