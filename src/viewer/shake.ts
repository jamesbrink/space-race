/**
 * Being shaken: how far a camera is turned and moved by what the flight is doing, at an instant of
 * the simulation's clock. Pure, with no three.js: viewer/effects.ts works out what reaches the eye
 * (`Felt`) and lays the result on the camera for the draw only.
 *
 * Four causes, each a level from 0 to 1 and each with its own band of frequencies:
 *
 *   engine   the engine's sound where the eye is. A rocket's jet turns about half a per cent of its
 *            power (thrust times exhaust speed, over two) into sound; spread over a sphere that is
 *            an intensity, and in air of a given density a pressure (`soundPressure`). At 150 m
 *            from a Redstone that is about 128 dB. The level runs evenly in decibels from nothing
 *            at 105 dB to full at 145 dB, since that is how loudness is felt. It thins with the air
 *            the engine is in, and arrives late by the distance over the speed of sound (the
 *            caller's business: effects.ts).
 *   buffet   the air's unsteady pressure on the vehicle, for an eye that rides with it:
 *            `buffetPressure`, a hundredth of the dynamic pressure where the flow is attached and
 *            up to six times that through Mach 1, where the shocks move about. Level: evenly in
 *            the logarithm from 30 Pa to 1,500 Pa.
 *   load     the steady push of a hard deceleration or a hard burn: nothing under 2 g, full at 10 g.
 *   jolts    events: a step in the load (cutoff, a retrorocket, a parachute filling) or something
 *            let go. Each rings for about a second: up in a fiftieth, away over a third.
 *
 * The acoustic efficiency, the pressure coefficients, the decibel ranges and every amplitude below
 * are judgements (`estimated`): they are what makes it read, not measurements of a camera.
 *
 * The motion is a sum of sines at fixed frequencies and phases, so it is smooth, has nothing above
 * 13 Hz (a 60 Hz screen shows that without tearing it into steps), and is a function of the clock's
 * time alone: the same instant shakes the same way, at any frame rate, forwards or back. A clock
 * run faster than life would turn it into flicker, so it fades out between one and three times
 * life. `motion` is the page's Motion setting (1 full, 0.4 reduced, 0 off): at 0 there is none.
 *
 * At its worst (everything at once, which a flight does not do) the camera turns 0.6 degrees in
 * pitch and in yaw, rolls 0.3 degrees and moves 4 cm; the sum is brought under those by a smooth
 * limit, not a clip. The engine alone, on the vehicle, is 0.3 degrees and 1.5 cm.
 */

const DEG = Math.PI / 180;
/** The most the camera is ever turned (pitch and yaw) and rolled, radians, and moved, metres. */
export const MAX_TURN = 0.6 * DEG;
export const MAX_ROLL = 0.3 * DEG;
export const MAX_SHIFT = 0.04;

/** How much of a jet's power becomes sound: the usual half a per cent. Estimated. */
const ACOUSTIC = 0.005;
/** The speed of sound in sea-level air, m/s. */
const SOUND0 = 340.3;
/** The reference pressure decibels are counted from, Pa. */
const P_REF = 2e-5;

/** What reaches the eye at an instant. */
export interface Felt {
  /** The engine's sound there, Pa (root mean square): `soundPressure`. */
  sound: number;
  /** The air's unsteady pressure on the vehicle, Pa, scaled by how far the eye rides with it: `buffetPressure`. */
  buffet: number;
  /** What an accelerometer aboard reads, g, scaled likewise. */
  load: number;
  /** Events still ringing: seconds since each (0 or more), and how hard, 0 to 1, scaled likewise. */
  jolts: readonly { since: number; strength: number }[];
}

/** A camera's displacement: turns in radians about its own right (pitch), up (yaw) and view (roll) axes, and a shift in metres along its right, up and back. */
export interface Shake {
  pitch: number;
  yaw: number;
  roll: number;
  x: number;
  y: number;
  z: number;
}

export const NOTHING: Felt = { sound: 0, buffet: 0, load: 1, jolts: [] };

/**
 * The sound pressure, Pa rms, `distance` metres from an engine of `thrust` newtons and
 * `exhaustSpeed` m/s, in air of `density` kg/m^3 (the air the engine is in: thin air carries
 * little). Spread evenly over a sphere; the ground's reflection and the jet's own direction are
 * left out. Nearer than 10 m is taken as 10 m.
 */
export function soundPressure(thrust: number, exhaustSpeed: number, distance: number, density: number): number {
  const power = ACOUSTIC * 0.5 * thrust * exhaustSpeed;
  const d = Math.max(10, distance);
  const intensity = power / (4 * Math.PI * d * d);
  return Math.sqrt(intensity * Math.max(0, density) * SOUND0);
}

/** Sound pressure in decibels (re 20 micropascals). */
export function decibels(pressure: number): number {
  return pressure > 0 ? 20 * Math.log10(pressure / P_REF) : Number.NEGATIVE_INFINITY;
}

/** The air's unsteady pressure on a vehicle at dynamic pressure `q` (Pa) and Mach number `mach`, Pa rms. */
export function buffetPressure(q: number, mach: number): number {
  const transonic = Math.exp(-(((mach - 1) / 0.35) ** 2));
  return Math.max(0, q) * (0.01 + 0.05 * transonic);
}

/** A jolt's strength, 0 to 1, from the step in the load it was, g. */
export function joltStrength(step: number): number {
  return Math.sqrt(Math.min(1, Math.abs(step) / 3));
}

/** Evenly in the logarithm: 0 at `from` and under, 1 at `to` and over. */
const logLevel = (x: number, from: number, to: number): number => (x <= from ? 0 : Math.min(1, Math.log(x / from) / Math.log(to / from)));

/** A jolt's ring, `since` seconds after it: up in a fiftieth of a second, away over a third. Nothing before it. */
function ring(since: number): number {
  return since <= 0 ? 0 : (1 - Math.exp(-since / 0.02)) * Math.exp(-since / 0.35);
}

/** Each cause's level, 0 to 1. */
export function levels(felt: Felt): { engine: number; buffet: number; load: number; jolt: number } {
  return {
    engine: logLevel(felt.sound, 3.56, 356), // 105 dB to 145 dB
    buffet: logLevel(felt.buffet, 30, 1500),
    load: Math.min(1, Math.max(0, (felt.load - 2) / 8)),
    jolt: Math.min(
      1,
      felt.jolts.reduce((sum, j) => sum + j.strength * ring(j.since), 0),
    ),
  };
}

/** Each cause's band (Hz, with each line's weight: they sum to 1) and the most it turns (radians) and moves (m) the camera by itself. */
const CAUSES = {
  engine: { lines: [4.7, 6.9, 9.1, 11.3], weights: [0.3, 0.3, 0.25, 0.15], turn: 0.3 * DEG, shift: 0.015 },
  buffet: { lines: [2.3, 3.7, 5.3, 7.1], weights: [0.35, 0.3, 0.2, 0.15], turn: 0.25 * DEG, shift: 0.015 },
  load: { lines: [1.1, 1.9, 2.9, 4.3], weights: [0.4, 0.3, 0.2, 0.1], turn: 0.12 * DEG, shift: 0.005 },
  jolt: { lines: [7.3, 9.7, 11.9, 13.0], weights: [0.35, 0.3, 0.2, 0.15], turn: 0.45 * DEG, shift: 0.03 },
} as const;
type CauseName = keyof typeof CAUSES;
const NAMES = Object.keys(CAUSES) as CauseName[];
/** The highest frequency in it, Hz: what bounds how far it can move between two frames. */
export const TOP_HZ = 13;

/** A fixed phase for each line of each cause on each of the six axes: the same every time. */
const phase = (cause: number, axis: number, line: number): number => {
  const x = Math.sin(cause * 127.1 + axis * 311.7 + line * 74.7 + 1.3) * 43758.5453;
  return (x - Math.floor(x)) * 2 * Math.PI;
};

/** Smooth noise within -1 to 1 at `t` seconds for one cause on one axis. */
function wave(cause: number, axis: number, t: number): number {
  const { lines, weights } = CAUSES[NAMES[cause]!];
  let sum = 0;
  for (let i = 0; i < lines.length; i++) sum += weights[i]! * Math.sin(2 * Math.PI * lines[i]! * t + phase(cause, axis, i));
  return sum;
}

/** Brought smoothly under `most`: nearly itself while small. */
const limit = (x: number, most: number): number => most * Math.tanh(x / most);

/** How much of it is left with the clock at `rate` times life: all up to 1, none from 3. */
export function atRate(rate: number): number {
  const over = Math.abs(rate) - 1;
  return over <= 0 ? 1 : Math.max(0, 1 - over / 2) ** 2;
}

/**
 * The camera's displacement at `t` seconds of the clock for what is `felt` there. `motion` is the
 * Motion setting, 0 to 1; `rate` the clock's rate.
 */
export function shake(t: number, felt: Felt, motion = 1, rate = 1): Shake {
  const gain = Math.max(0, Math.min(1, motion)) * atRate(rate);
  const out: Shake = { pitch: 0, yaw: 0, roll: 0, x: 0, y: 0, z: 0 };
  if (gain <= 0) return out;
  const level = levels(felt);
  let any = false;
  NAMES.forEach((name, c) => {
    const k = level[name] * gain;
    if (k <= 0) return;
    any = true;
    const { turn, shift } = CAUSES[name];
    out.pitch += k * turn * wave(c, 0, t);
    out.yaw += k * turn * wave(c, 1, t);
    out.roll += k * 0.5 * turn * wave(c, 2, t);
    out.x += k * shift * wave(c, 3, t);
    out.y += k * shift * wave(c, 4, t);
    out.z += k * 0.5 * shift * wave(c, 5, t);
  });
  if (!any) return out;
  out.pitch = limit(out.pitch, MAX_TURN);
  out.yaw = limit(out.yaw, MAX_TURN);
  out.roll = limit(out.roll, MAX_ROLL);
  out.x = limit(out.x, MAX_SHIFT);
  out.y = limit(out.y, MAX_SHIFT);
  out.z = limit(out.z, MAX_SHIFT);
  return out;
}

/** Whether there is anything to shake a camera at all. */
export function still(felt: Felt): boolean {
  const l = levels(felt);
  return l.engine <= 0 && l.buffet <= 0 && l.load <= 0 && l.jolt <= 0;
}
