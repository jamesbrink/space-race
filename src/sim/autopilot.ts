/**
 * What flies a vehicle (vehicle.ts) when a hand does not: the gyro platform's job going up (the
 * Redstone's LEV-3 held the tilt programme), the spacecraft's attitude control after it, and the
 * sequencer that sets off each event at the time the record gives. It is not part of the physics:
 * it reads the state and returns the same `Controls` a pilot's hands do, so any axis of it can be
 * switched off or overridden (`blend`).
 *
 * The law is `steer`, and it is the only one: how far the attitude is out, and how fast the
 * error is closing, in; a command between -1 and 1 out.
 */
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import { angleBetween, cross, DEG, dot, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import type { Flown, Results } from './fly.ts';
import { upAt } from './forces.ts';
import { aboutAxis, turn, unturn } from './rigid.ts';
import { type Controls, HANDS_OFF, type LiveSample, type Pilot, TICK, type Vehicle, type VehicleState } from './vehicle.ts';

/** How hard an axis is steered: command per radian of error, and per radian a second of rate. */
export interface Gains {
  attitude: number;
  rate: number;
}

/**
 * The gains. On the booster a full command turns the stack at 0.2 rad/s^2 off the pad (and three
 * times that near cutoff), so these close an error at about 2 rad/s, damped at 0.7; the
 * spacecraft's jets give 0.3 rad/s^2 and close it at 0.8 rad/s. Chosen from those figures, not
 * documented: the LEV-3's own gains were not found.
 */
export const BOOSTER_GAINS: Gains = { attitude: 20, rate: 14 };
export const CAPSULE_GAINS: Gains = { attitude: 2.2, rate: 3.9 };

/**
 * The control law, for one axis. `error` is how far the body must still turn about the axis to
 * be where it is wanted, radians; `rate` is how fast it is turning about it beyond what is
 * wanted, rad/s. The answer is the command, -1 to 1: proportional to the error, less the rate.
 */
export function steer(error: number, rate: number, gains: Gains): number {
  const command = gains.attitude * error - gains.rate * rate;
  return Math.min(1, Math.max(-1, command));
}

export interface AutopilotOptions {
  /** Which axes it steers: all, unless switched off. */
  pitch?: boolean;
  yaw?: boolean;
  roll?: boolean;
  /** Start the engine on the pad. Off, it waits for someone else to. */
  launch?: boolean;
  /** Set off the events at the record's times: cutoff, tower, separation, retrofire, retropack. */
  sequence?: boolean;
  booster?: Gains;
  capsule?: Gains;
  /**
   * A pilot's trim on the booster's programme, radians, asked every tick: `pitch` tips the axis it
   * holds further downrange, `yaw` swings it to the left of the azimuth. So a hand can lean the
   * whole flight one way without taking the stick from the platform.
   */
  trim?: () => { pitch: number; yaw: number };
}

/** The turn, as a vector in the body's axes, that takes the long axis to `wanted` (a direction in the body's axes). */
function turnTo(wanted: Vec3): Vec3 {
  const axis: Vec3 = [0, -wanted[2], wanted[1]]; // +X cross wanted
  const sine = length(axis);
  if (sine < 1e-12) return wanted[0] >= 0 ? [0, 0, 0] : [0, Math.PI, 0]; // end for end: about pitch, by choice
  return scale(axis, Math.atan2(sine, wanted[0]) / sine);
}

/** An autopilot for a vehicle: a `Pilot`, asked every tick. */
export function autopilot(vehicle: Vehicle, options: AutopilotOptions = {}): Pilot {
  const tr = vehicle.trajectory;
  const body = tr.body!;
  const want = { pitch: true, yaw: true, roll: true, launch: true, sequence: true, ...options };
  const boosterGains = options.booster ?? BOOSTER_GAINS;
  const capsuleGains = options.capsule ?? CAPSULE_GAINS;
  const earth: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const late = (at: number, t: number): boolean => t >= at - 1e-9;

  return (s: VehicleState): Controls => {
    const c: Controls = { ...HANDS_OFF, throttle: s.ignited && !s.cutoff ? 1 : 0 };
    if (want.launch && !s.ignited) c.throttle = 1;
    // (after an abort the record's times are for a flight that is no longer being flown: the spacecraft's own sequence has it)
    if (want.sequence && s.abortAt === null) {
      if (late(tr.engine.cutoff.value, s.t)) c.throttle = 0;
      c.tower = body.tower ? late(body.tower.at.value, s.t) : false;
      c.separate = late(tr.separation.at.value, s.t);
      c.retro = late(tr.retro.fires[0]!.value, s.t);
      c.retropack = late(tr.retropack.at.value, s.t);
    }
    if (s.held || s.landing) return c;

    let error: Vec3 = [0, 0, 0];
    let rate: Vec3 = s.w;
    let gains = boosterGains;
    if (!s.shed.booster) {
      if (!s.ignited || s.cutoff) return c; // nothing to steer with
      // the platform: the programme's axis, the rate it is turning at, and the plane it tilts in
      const trim = options.trim?.();
      const { left: port, downrange } = vehicle.launch;
      const leaned = (at: number): Vec3 =>
        trim
          ? turn(aboutAxis(scale(downrange, -1), trim.yaw), turn(aboutAxis(port, trim.pitch), vehicle.programme(at)))
          : vehicle.programme(at);
      const axis = leaned(s.t);
      const turning = scale(cross(axis, leaned(s.t + 0.1)), 1 / 0.1);
      const left = unturn(s.q, vehicle.launch.left);
      error = [Math.atan2(left[2], left[1]), ...turnTo(unturn(s.q, axis)).slice(1)] as unknown as Vec3;
      rate = sub(s.w, unturn(s.q, turning));
    } else {
      gains = capsuleGains;
      // Pulled off on its escape rocket, nothing steers it until the tower has gone: it is the tower's going that switches the
      // rate damping on, and that lasts until the main parachute is out. On any other descent it hangs from the drogue on.
      if (s.abortAt !== null && !s.shed.tower) return c;
      if (s.mainAt !== null || (s.drogueAt !== null && s.abortAt === null)) return c;
      const up = upAt(s.r, s.t);
      const wind = sub(s.v, cross(earth, s.r));
      if (s.enteredAt === null && s.shed.tower && length(wind) > 1) {
        // blunt end first: for retrofire, pitched as the record has it; after the pack has gone, straight into the air
        const level = sub(wind, scale(up, dot(wind, up)));
        const pitch = tr.retro.pitch.value * DEG;
        const wanted =
          s.shed.retropack || length(level) < 1
            ? scale(unit(wind), -1)
            : sub(scale(unit(level), -Math.cos(pitch)), scale(up, Math.sin(pitch)));
        error = turnTo(unturn(s.q, wanted));
        // ...and rolled so that the side that is to face the Earth does (its periscope's: the pilot is then head up).
        // Not while the long axis is within a few degrees of the plumb line: there is then no such roll.
        const keel = body.capsule.earthward;
        const down = unturn(s.q, scale(up, -1));
        if (keel && Math.hypot(down[1], down[2]) > 0.1) {
          const a = keel.value * DEG;
          const side: Vec3 = [0, -Math.sin(a), Math.cos(a)];
          error = [Math.atan2(side[1] * down[2] - side[2] * down[1], side[1] * down[1] + side[2] * down[2]), error[1], error[2]];
        }
      }
      // once the air has it, the jets only damp
    }
    if (want.roll) c.roll = steer(error[0], rate[0], gains);
    if (want.pitch) c.pitch = steer(error[1], rate[1], gains);
    if (want.yaw) c.yaw = steer(error[2], rate[2], gains);
    return c;
  };
}

/** The autopilot's controls with a hand's laid over them: whatever the hand gives wins, axis by axis and event by event. */
export function blend(auto: Controls, hand: Partial<Controls>): Controls {
  const out: Controls = { ...auto };
  for (const [k, v] of Object.entries(hand)) if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  return out;
}

const blank = (): Results => ({
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
});

/**
 * fly.ts's `Results`, kept up as a live flight goes: give it every sample in order (each tick's,
 * for the greatest loads to be the greatest) with the state it came from.
 */
export class Tally {
  readonly results: Results = blank();
  /** An abort, if there was one: when, and the greatest load from then until the tower went, g. */
  abort: { at: number; peakG: number } | null = null;
  /** The greatest load of the whole flight, g, whatever made it. */
  peakG = 0;

  note(s: LiveSample, state: VehicleState, vehicle: Vehicle): void {
    const r = this.results;
    const tr = vehicle.trajectory;
    if (s.altitude > r.apogee) {
      r.apogee = s.altitude;
      r.apogeeAt = s.t;
    }
    if (state.separation && r.separationSpeed === 0) {
      // the stack as it was at the instant they parted, before the push
      const { r: at, v } = state.separation;
      const up = upAt(at, state.separation.t);
      const wind = sub(v, cross([0, 0, EARTH_ROTATION_RATE], at));
      r.separationSpeed = length(v);
      r.separationGroundSpeed = length(wind);
      r.separationClimb = 90 - angleBetween(v, up) / DEG;
      r.separationGroundClimb = 90 - angleBetween(wind, up) / DEG;
      r.separationAltitude = this.last?.altitude ?? s.altitude;
    }
    this.last = s;
    if (!state.landing) this.peakG = Math.max(this.peakG, s.g);
    if (state.abortAt !== null) {
      this.abort ??= { at: state.abortAt, peakG: 0 };
      if (s.phase === 'escape') this.abort.peakG = Math.max(this.abort.peakG, s.g);
    }
    if (s.t <= r.apogeeAt) {
      r.exitQ = Math.max(r.exitQ, s.q);
      r.exitG = Math.max(r.exitG, s.g);
    } else if (s.phase === 'capsule' || s.phase === 'entry') {
      r.entryQ = Math.max(r.entryQ, s.q);
      const first = state.retroAt;
      const last = tr.retro.fires[tr.retro.fires.length - 1]!.value - tr.retro.fires[0]!.value + tr.retro.burn.value;
      // the retrorockets are felt too, but the reports' re-entry figure is the air's
      if (first === null || s.t < first || s.t > first + last) r.entryG = Math.max(r.entryG, s.g);
    }
    if (state.enteredAt !== null) r.entryAt = state.enteredAt;
    if (state.drogueAt !== null) r.drogueAt = state.drogueAt;
    if (state.mainAt !== null) r.mainAt = state.mainAt;
    if (state.landing) {
      r.landingSpeed = state.landing.vertical;
      r.range = s.range;
      r.duration = state.landing.t;
    }
  }

  private last: LiveSample | null = null;
}

/**
 * A whole flight, flown tick by tick by a pilot (the autopilot, unless another is given): the
 * live simulator's answer in fly.ts's own terms, to be laid beside it. A sample is kept every
 * `every` seconds and either side of every change of phase. It stops at the landing, or after `limit` seconds.
 */
export function flyLive(
  vehicle: Vehicle,
  pilot: Pilot = autopilot(vehicle),
  every = 0.5,
  limit = 4 * 3600,
): Flown & { samples: LiveSample[]; state: VehicleState } {
  let state = vehicle.start();
  const tally = new Tally();
  let s = vehicle.sample(state);
  const samples: LiveSample[] = [s];
  let kept = 0;
  while (!state.landing && state.t < limit) {
    const next = vehicle.tick(state, pilot);
    if (next.ticks === state.ticks) break; // nobody lit it
    state = next;
    const before = s;
    s = vehicle.sample(state);
    tally.note(s, state, vehicle);
    const due = state.t - kept >= every - TICK / 2;
    // at a change of phase, the instant it happened at (the tick before) is kept too, as fly.ts keeps its events
    if (s.phase !== before.phase && samples[samples.length - 1] !== before) samples.push(before);
    if (due || s.phase !== before.phase) samples.push(s);
    if (due) kept = state.t;
  }
  return { samples, results: tally.results, state };
}
