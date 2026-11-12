/**
 * What a cabin's instruments read, and where that puts a needle: arithmetic only, no three.js, so it can be tested
 * (tests/gauges.test.mjs). viewer/cabin.ts moves the model's nodes by it.
 *
 * A scale is the model's own (the script that drew the face wrote it into the needle's extras): pairs of value and
 * position, in order of value. Between two pairs the needle goes in proportion; past either end it stays on the stop.
 */
import type { Quantity, Signal } from '../types.ts';

export type Readings = Partial<Record<Quantity, number>>;
export type Signals = Partial<Record<Signal, boolean>>;
type V3 = readonly [number, number, number];

/** Where `value` falls on a scale of (value, position) pairs. `wrap`: the value goes round (a clock's seconds, a heading). */
export function scaleAt(pairs: readonly number[], value: number, wrap = 0): number {
  const n = pairs.length / 2;
  if (n < 1 || !Number.isFinite(value)) return pairs[1] ?? 0;
  const first = pairs[0]!;
  if (wrap > 0) value = first + ((((value - first) % wrap) + wrap) % wrap);
  if (value <= first) return pairs[1]!;
  for (let i = 1; i < n; i++) {
    const v1 = pairs[2 * i]!;
    if (value <= v1) {
      const v0 = pairs[2 * i - 2]!;
      const k = v1 > v0 ? (value - v0) / (v1 - v0) : 1;
      return pairs[2 * i - 1]! + (pairs[2 * i + 1]! - pairs[2 * i - 1]!) * k;
    }
  }
  return pairs[2 * n - 1]!;
}

/** How long before it shows the next figure a counter's wheel starts to turn, as a part of the unit below it. */
const CARRY = 0.25;

/**
 * How far round a counter's wheel is, in digits (3.5 is halfway from 3 to 4): the wheel for 10^place of `value`, of
 * `digits` figures. It stands on its figure and rolls to the next as the wheel below it comes up to nought, as a
 * mechanical counter does; the lowest wheel rolls in the last quarter of each unit.
 */
export function drumAt(value: number, place: number, digits = 10): number {
  const unit = digits ** place;
  const v = Math.max(0, value);
  const figure = Math.floor(v / unit) % digits;
  const through = Math.max(0, (v % unit) - (unit - 1)); // how far through the last unit before this wheel's next figure, 0 to 1
  return figure + Math.min(1, Math.max(0, (through - (1 - CARRY)) / CARRY));
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const less = (a: V3, b: V3, k: number): V3 => [a[0] - b[0] * k, a[1] - b[1] * k, a[2] - b[2] * k];
const unit = (a: V3): V3 | null => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : null;
};
const DEG = 180 / Math.PI;
/** The sine of how far from upright the long axis must be before it has a heading or an uppermost side of its own: a degree. */
const UPRIGHT = 0.0175;

/**
 * A spacecraft's attitude as three angles, degrees, from its axes in any one frame: `nose` its long axis toward the
 * small end, `head` the way the top of the pilot's head points, `up` the plumb line where it is and `downrange` the
 * level direction it is flown along.
 *
 * The convention is this viewer's, chosen to read as Mercury's indicator did where the record gives a figure to hold
 * it to (retrofire at 34 degrees, small end down and trailing, wings level: pitch -34, yaw 0, roll 0), and is not
 * taken from a gyro drawing:
 * - pitch: how far the small end is above the level. Standing on the pad it is 90.
 * - yaw: which way the small end points over the ground, from trailing (0) round to leading (180), positive toward
 *   the left of the way flown. With the long axis upright there is no such way and it reads 0.
 * - roll: how far the pilot's head is turned about the long axis from uppermost, positive clockwise seen from behind
 *   the heat shield. With the long axis upright, "uppermost" is the side away from downrange, which is what it
 *   becomes the moment the vehicle tips over.
 */
export function attitudeOf(nose: V3, head: V3, up: V3, downrange: V3): { pitch: number; yaw: number; roll: number } {
  const u = unit(up) ?? [0, 1, 0];
  const d = unit(less(downrange, u, dot(downrange, u))) ?? [1, 0, 0];
  const left = cross(u, d);
  const n = unit(nose) ?? u;
  const pitch = Math.asin(Math.max(-1, Math.min(1, dot(n, u)))) * DEG;
  const flat = less(n, u, dot(n, u));
  const yaw = Math.hypot(...flat) > UPRIGHT ? Math.atan2(dot(flat, left), -dot(flat, d)) * DEG : 0;
  // (within a degree of upright the uppermost side is taken from downrange: the two agree there, and the first is noise)
  const lean = less(u, n, dot(u, n));
  const top = (Math.hypot(...lean) > UPRIGHT ? unit(lean) : null) ?? unit(less([-d[0], -d[1], -d[2]], n, -dot(d, n))) ?? left;
  const h = unit(less(head, n, dot(head, n))) ?? top;
  const roll = Math.atan2(dot(cross(top, h), n), dot(top, h)) * DEG;
  return { pitch, yaw, roll };
}

/** Body rates, degrees a second about the axes pitch, yaw and roll are turned about, from two attitudes `dt` apart: each as (x, y, z, w) of body to frame. */
export function ratesOf(
  before: readonly [number, number, number, number],
  after: readonly [number, number, number, number],
  dt: number,
): [number, number, number] {
  if (!(dt > 0)) return [0, 0, 0];
  // the turn from one to the other, in the body's own axes: conj(before) * after
  const [ax, ay, az, aw] = [-before[0], -before[1], -before[2], before[3]];
  const [bx, by, bz, bw] = after;
  let x = aw * bx + ax * bw + ay * bz - az * by;
  let y = aw * by - ax * bz + ay * bw + az * bx;
  let z = aw * bz + ax * by - ay * bx + az * bw;
  const w = aw * bw - ax * bx - ay * by - az * bz;
  if (w < 0) [x, y, z] = [-x, -y, -z];
  const s = Math.hypot(x, y, z);
  const angle = 2 * Math.atan2(s, Math.abs(w));
  const k = s > 1e-12 ? (angle / s / dt) * DEG : 0;
  return [x * k, y * k, z * k];
}

/** What has happened by `t`, given when each thing happened (Infinity or absent: not yet). `ready` is the pad before liftoff. */
export function signalsAt(times: Partial<Record<Signal, number>>, t: number, lifted: boolean): Signals {
  const out: Signals = { ready: !lifted };
  for (const key of ['tower', 'separated', 'retro', 'retropack', 'entry', 'drogue', 'main', 'abort'] as const) {
    const at = times[key];
    out[key] = at !== undefined && Number.isFinite(at) && t >= at;
  }
  return out;
}
