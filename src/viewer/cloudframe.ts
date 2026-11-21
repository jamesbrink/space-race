import { EARTH_SPHERE } from '../world/bodies.ts';

/**
 * The frame the clouds are worked out in.
 *
 * A layer of cloud is a field on a plane: noise in metres along two axes, a map read at a point of it, streets along
 * a wind. For as far as a flight could be seen from its pad that plane is the site's own horizontal one (the scene's x
 * and z), and a point of the Earth is put straight down onto it. That is no map of a sphere. A quarter of the way
 * round, the Earth stands on edge to the site's plane and everything on it is drawn out along the way there into
 * streaks that run to the horizon (Apollo 8 half an hour up, 89 degrees from the Cape); further, the far side is laid
 * back over the near one.
 *
 * No plane is a map of the whole sphere, so the plane goes with the eye. While the eye is within `CAP` of the site
 * the clouds' frame is the scene's, to the bit: every picture of a site is what it was. Once it leaves, the frame is
 * rolled after it over the Earth, as a ball rolls on a table without slipping or twisting: each time the eye's place
 * over the ground moves, the frame is turned about the Earth's middle by the least turn that carries it there
 * (`turn`), and the plane is moved on by as far as the ground went by (`roll`), so the point of the field under the
 * eye stays over the ground it was over. Whatever can be seen from the eye is then within a few degrees of the
 * frame's pole (14 from 190 km), where putting a point straight down onto the plane shortens nothing by more than a
 * few hundredths.
 *
 * What it costs, and it says so:
 *
 * - Away from under the eye the field slips over the ground as the eye goes: by `1 - cos` of how far round from the
 *   eye a place is, of the eye's own speed over the ground: nothing under the eye, 3 % at the horizon from 190 km. It
 *   is the same for a cloud and its shadow, which are read through the one frame.
 * - Where the frame has been rolled to depends on the way taken, so which cloud stands where far from the site is
 *   not the same from one pass to the next. Which cloud stood where was never known (air.ts). How much cloud there
 *   is at a place is, and is not read through the roll: it is the weather's, read at the place's own bearing from the
 *   site (weather.ts `siteAt`).
 * - The roll would grow without end, and a shader's floats hold a place to half a metre only within the Earth's
 *   radius of nought. Past `SOFT` it is put back the next time nobody could tell (the eye cut or carried a third
 *   of a degree in one frame, or too far out for the day's cloud to be drawn); past `HARD`, whatever is seen: then
 *   which small cloud stands where changes in one frame, the weather they make up staying as it was. At life's pace
 *   in a low orbit that is once in fifty minutes at the most.
 *
 * Pure arithmetic in doubles, with nothing of three.js: tests/cloudframe.test.mjs holds it.
 */

/** How far from the site, as an angle at the Earth's middle, the clouds' frame is the scene's own: 300 km. */
export const CAP = 300_000 / EARTH_SPHERE;
/** A move of the eye's place of more than this in one frame is a cut, radians: back inside `CAP` by one, the frame is the scene's again. */
export const JUMP = (1 * Math.PI) / 180;
/** And one of more than this cannot be followed by the eye from frame to frame, radians: the roll may be put back unseen. */
export const UNSEEN = (0.3 * Math.PI) / 180;
/** The roll is put back when it can be past the first of these, metres, and must be past the second; to the first, behind. */
export const SOFT = 8_000_000;
export const HARD = 16_000_000;

/** A turn about the Earth's middle, as a matrix by rows. */
export type Turn = [number, number, number, number, number, number, number, number, number];

const apply = (m: Turn, x: number, y: number, z: number): [number, number, number] => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

/** `m` times the least turn that carries the unit vector `b` back to `a` (the transpose of the one that carries a to b). */
function turnedBack(m: Turn, a: readonly [number, number, number], b: readonly [number, number, number]): Turn {
  // R = I + [v]x + [v]x^2 / (1 + c), v = a x b, c = a . b; its transpose has -v
  const vx = -(a[1] * b[2] - a[2] * b[1]),
    vy = -(a[2] * b[0] - a[0] * b[2]),
    vz = -(a[0] * b[1] - a[1] * b[0]);
  const k = 1 / (1 + (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const r: Turn = [
    1 - k * (vy * vy + vz * vz),
    -vz + k * vx * vy,
    vy + k * vx * vz,
    vz + k * vx * vy,
    1 - k * (vx * vx + vz * vz),
    -vx + k * vy * vz,
    -vy + k * vx * vz,
    vx + k * vy * vz,
    1 - k * (vx * vx + vy * vy),
  ];
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0] as Turn;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) out[i * 3 + j] = m[i * 3]! * r[j]! + m[i * 3 + 1]! * r[3 + j]! + m[i * 3 + 2]! * r[6 + j]!;
  // (kept a turn: its rows square to one another and of length one, however many thousand steps have gone into it)
  const norm = (i: number): void => {
    const l = Math.hypot(out[i]!, out[i + 1]!, out[i + 2]!);
    out[i]! /= l;
    out[i + 1]! /= l;
    out[i + 2]! /= l;
  };
  norm(0);
  const d = out[0] * out[3] + out[1] * out[4] + out[2] * out[5];
  out[3] -= d * out[0];
  out[4] -= d * out[1];
  out[5] -= d * out[2];
  norm(3);
  out[6] = out[1] * out[5] - out[2] * out[4];
  out[7] = out[2] * out[3] - out[0] * out[5];
  out[8] = out[0] * out[4] - out[1] * out[3];
  return out;
}

export class CloudFrame {
  /** From the scene's axes to the clouds' frame's, about the Earth's middle. The scene's own until the eye leaves `CAP`. */
  turn: Turn = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  /** What is added to a point's x and z in the clouds' frame for its place on the clouds' plane, metres. */
  readonly roll: [number, number] = [0, 0];
  /** Whether the frame has left the scene's. */
  rolling = false;
  /** The way from the Earth's middle to the eye when it was last followed, in the scene's axes. */
  private last: [number, number, number] = [0, 1, 0];

  /**
   * The eye is at (x, y, z) from the Earth's middle, in the scene's axes (y straight up at the site). `unseen`: none
   * of the day's cloud is drawn from there. True if the frame changed.
   */
  follow(x: number, y: number, z: number, unseen = false): boolean {
    const r = Math.hypot(x, y, z);
    if (!(r > 1)) return false;
    const to: [number, number, number] = [x / r, y / r, z / r];
    const from = this.last;
    const inCap = Math.acos(Math.min(1, to[1])) <= CAP;
    if (!this.rolling && inCap) {
      this.last = to;
      return false;
    }
    const cos = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
    if (cos > 1 - 1e-15) return false;
    const step = Math.acos(Math.max(-1, cos));
    if (this.rolling && inCap && step > JUMP) {
      // (cut back to the site: its own frame, as a page opened there has it)
      this.turn = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      this.roll[0] = this.roll[1] = 0;
      this.rolling = false;
      this.last = to;
      return true;
    }
    this.rolling = true;
    if (cos < -0.99) {
      // (to the far side in one step: by way of a place square to both, since no one least turn goes there)
      const side: [number, number, number] = Math.abs(from[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const d = side[0] * from[0] + side[1] * from[1] + side[2] * from[2];
      const mx = side[0] - d * from[0],
        my = side[1] - d * from[1],
        mz = side[2] - d * from[2];
      const l = Math.hypot(mx, my, mz);
      this.step(from, [mx / l, my / l, mz / l]);
      this.step(this.last, to);
    } else this.step(from, to);
    const most = Math.max(Math.abs(this.roll[0]), Math.abs(this.roll[1]));
    if (most > HARD || (most > SOFT && (unseen || step > UNSEEN))) {
      // (put back behind the way it has come, so that it has the furthest to go before the next)
      this.roll[0] *= -SOFT / most;
      this.roll[1] *= -SOFT / most;
    }
    return true;
  }

  /** Roll the frame from over one place to over another (unit vectors from the Earth's middle, the scene's axes). */
  private step(from: [number, number, number], to: [number, number, number]): void {
    const was = apply(this.turn, from[0], from[1], from[2]);
    const now = apply(this.turn, to[0], to[1], to[2]);
    this.turn = turnedBack(this.turn, from, to);
    // (the ground under the eye keeps its place on the plane: the plane goes on by as far as it went by)
    this.roll[0] += EARTH_SPHERE * (now[0] - was[0]);
    this.roll[1] += EARTH_SPHERE * (now[2] - was[2]);
    this.last = to;
  }

  /** A point (from the Earth's middle, the scene's axes) in the clouds' frame. */
  into(x: number, y: number, z: number): [number, number, number] {
    return apply(this.turn, x, y, z);
  }

  /** Where a point of the Earth (a unit vector from its middle, the scene's axes) is on the clouds' plane, metres: at the sea's level. */
  plane(x: number, y: number, z: number): [number, number] {
    const p = apply(this.turn, x, y, z);
    return [this.roll[0] + EARTH_SPHERE * p[0], this.roll[1] + EARTH_SPHERE * p[2]];
  }
}

/**
 * GLSL: the clouds' frame for a shader. `cloudWorld(world)`: a point of the scene in the clouds' frame, as if the
 * frame's pole were the site (so whatever is worked out for the scene's x and z round the site is worked out there
 * the same); `siteAt(g)`: where a point of the clouds' plane is from the Earth's middle in the scene's own axes, at
 * the sea's level; `fromSite(g)`: how far it is from the site, metres, on the far half of the Earth as far again as
 * it is short of the half way round (never near: a point of the far side has the x and z of one on the near).
 * In the scene's own frame (the turn nothing, the roll nought) each gives back what it was given, to the bit.
 * Guarded: a material can have it from the shared chunk (air.ts) and from the weather's reader (weather.ts).
 */
export const CLOUD_FRAME_GLSL = /* glsl */ `
#ifndef CLOUD_FRAME
#define CLOUD_FRAME
  uniform mat3 uCloudFrame;   // the scene's axes to the clouds' frame's
  uniform mat3 uCloudSite;    // and back
  uniform vec3 uCloudShift;   // what keeps the Earth's middle where it is under that turn
  uniform vec2 uCloudRoll;    // a point of the clouds' frame to its place on the clouds' plane
  vec3 cloudWorld(vec3 world) { return uCloudFrame * world + uCloudShift; }
  vec3 siteAt(vec2 g) {
    vec2 l = g - uCloudRoll;
    return uCloudSite * vec3(l.x, sqrt(max(${(EARTH_SPHERE ** 2).toExponential(10)} - dot(l, l), 0.0)), l.y);
  }
  float siteFar(vec3 s) {
    float d = length(s.xz);
    return s.y < 0.0 ? ${(2 * EARTH_SPHERE).toFixed(1)} - d : d;
  }
  float fromSite(vec2 g) { return siteFar(siteAt(g)); }
#endif`;
