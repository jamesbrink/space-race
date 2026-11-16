import * as THREE from 'three';

/**
 * Watching something run by hand, on foot (walking.md, "What a part does can be worked by hand"; camera.md): the
 * arithmetic of where the on-foot rigs (foot.ts) look while a function is being operated, apart from any page or
 * renderer, and tested in node (tests/watch.test.mjs). Through the eyes the head turns to what is moving, within what a
 * neck does; over the shoulder the camera steps aside and back so the figure is not between the eye and what is moving,
 * and far enough back for it to be framed, as far as a person standing by would. Nothing here knows a flight or a part.
 */

/** What is being run, as the camera needs it: handed to the on-foot rigs by whoever runs it (onfoot.ts `OnFoot.operate`). */
export interface Watched {
  /** The moving thing's bounds as it is now, and where it will be a few seconds on the way it is going (the same while still); scene frame. */
  readonly now: THREE.Box3;
  readonly ahead: THREE.Box3;
  /** Its bounds over the whole of its travel, from one end to the other. */
  readonly travel: THREE.Box3;
  /** The figure running it: where its feet are, its height and half its width, metres. */
  readonly feet: THREE.Vector3;
  readonly height: number;
  readonly radius: number;
  /** How far along a ray (`dir` a unit vector) from `from` is clear of anything solid, up to `far` (Infinity: all of it). */
  clear(from: THREE.Vector3, dir: THREE.Vector3, far: number): number;
}

/**
 * How far a head turns from the way the body faces, radians: about 80 degrees each way with the eyes' share, and from
 * 55 degrees down to 66 up (a neck's flexion and extension with the eyes', which is what a boom overhead asks of it).
 * Estimated, from the usual ranges of motion (about 70 to 80 degrees of rotation, 50 to 60 of flexion and extension).
 */
export const NECK = { side: THREE.MathUtils.degToRad(80), down: THREE.MathUtils.degToRad(55), up: THREE.MathUtils.degToRad(66) };

/**
 * Where over the shoulder the camera may stand to watch, metres from the head: behind it (away from what is watched),
 * to the side and above. A person standing by, not a crane: estimated, to look right.
 */
export const BACKS = [2.4, 3.4, 4.8, 6.5] as const;
export const ASIDES = [1.1, 1.7, 2.5] as const;
export const RISE = 0.6;
/** How far clear of the figure the line from the eye to what is watched must pass, beyond its half-width, metres. */
export const FIGURE_CLEAR = 0.2;
/** How near a surface the camera may stand, metres. */
export const WALL_CLEAR = 0.35;
/** The share of the frame's half-height (and half-width) what is watched may take, at most, to count as framed. */
export const FILL = 0.85;

const UP = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3();
const w = new THREE.Vector3();
const e = new THREE.Euler(0, 0, 0, 'YXZ');
const box = new THREE.Box3();

/** The middle and radius of what is to be framed: where it is and where it is going (`now` with `ahead`). */
export function subject(watched: Watched, out: THREE.Sphere): THREE.Sphere {
  return box.copy(watched.now).union(watched.ahead).getBoundingSphere(out);
}

/** The least distance between two segments, `a0`-`a1` and `b0`-`b1`. */
export function segmentGap(a0: THREE.Vector3, a1: THREE.Vector3, b0: THREE.Vector3, b1: THREE.Vector3): number {
  const d1 = v.subVectors(a1, a0);
  const d2 = w.subVectors(b1, b0);
  const r = new THREE.Vector3().subVectors(a0, b0);
  const a = d1.dot(d1);
  const e2 = d2.dot(d2);
  const f = d2.dot(r);
  let s: number;
  let t: number;
  if (a <= 1e-12 && e2 <= 1e-12) return r.length();
  if (a <= 1e-12) {
    s = 0;
    t = THREE.MathUtils.clamp(f / e2, 0, 1);
  } else {
    const c = d1.dot(r);
    if (e2 <= 1e-12) {
      t = 0;
      s = THREE.MathUtils.clamp(-c / a, 0, 1);
    } else {
      const b = d1.dot(d2);
      const denom = a * e2 - b * b;
      s = denom > 1e-12 ? THREE.MathUtils.clamp((b * f - c * e2) / denom, 0, 1) : 0;
      t = (b * s + f) / e2;
      if (t < 0) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
      }
    }
  }
  const p = new THREE.Vector3().copy(a0).addScaledVector(d1, s);
  const q = new THREE.Vector3().copy(b0).addScaledVector(d2, t);
  return p.distanceTo(q);
}

/** Does the figure (a capsule from a hand's breadth over its feet to the top of its head) stand on the line from `eye` to `at`? */
export function figureBlocks(watched: Pick<Watched, 'feet' | 'height' | 'radius'>, eye: THREE.Vector3, at: THREE.Vector3): boolean {
  const foot = new THREE.Vector3(watched.feet.x, watched.feet.y + 0.1, watched.feet.z);
  const head = new THREE.Vector3(watched.feet.x, watched.feet.y + watched.height, watched.feet.z);
  return segmentGap(foot, head, eye, at) < watched.radius + FIGURE_CLEAR;
}

/** Is a ball of `radius` at `centre` within `fill` of a frame of vertical lens `fovV` (degrees) and `aspect`, seen from `eye`? */
export function fits(eye: THREE.Vector3, centre: THREE.Vector3, radius: number, fovV: number, aspect: number, fill = FILL): boolean {
  const d = eye.distanceTo(centre);
  if (d <= radius) return false;
  const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(fovV) / 2) * Math.min(1, aspect));
  return Math.asin(radius / d) <= half * fill;
}

/** The way the figure faces and looks, from a view's turn: radians about the vertical (0 looks along -Z) and above the horizon. */
export function yawPitchOf(q: THREE.Quaternion): { yaw: number; pitch: number } {
  e.setFromQuaternion(q, 'YXZ');
  return { yaw: e.y, pitch: e.x };
}

/**
 * Through the eyes: the head turned from the view `from` (the walker's own, the way the body faces) toward `at`, as
 * far as a neck goes (NECK), with no roll. Writes the turn and returns how far short of `at` it had to stop, radians
 * about the vertical (0: it is looking straight at it).
 */
export function neckTurn(eye: THREE.Vector3, from: THREE.Quaternion, at: THREE.Vector3, out: THREE.Quaternion): number {
  const { yaw } = yawPitchOf(from);
  const d = v.subVectors(at, eye);
  const level = Math.hypot(d.x, d.z);
  const toYaw = level > 1e-6 ? Math.atan2(-d.x, -d.z) : yaw;
  const toPitch = Math.atan2(d.y, level);
  const off = Math.atan2(Math.sin(toYaw - yaw), Math.cos(toYaw - yaw));
  const side = THREE.MathUtils.clamp(off, -NECK.side, NECK.side);
  const pitch = THREE.MathUtils.clamp(toPitch, -NECK.down, NECK.up);
  out.setFromEuler(e.set(pitch, yaw + side, 0, 'YXZ'));
  return off - side;
}

/**
 * What a camera at `eye` watching `at` looks at so that the figure is in the frame too, where both can be: turned from
 * `at` toward the figure's chest by as little as brings the chest within FILL of the frame's edge, if that leaves `at`
 * within it as well; else `at` itself (what is being run comes first). A person watching what they are running.
 */
export function withFigure(
  watched: Pick<Watched, 'feet' | 'height'>,
  eye: THREE.Vector3,
  at: THREE.Vector3,
  fovV: number,
  aspect: number,
): THREE.Vector3 {
  const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(fovV) / 2) * Math.min(1, aspect)) * FILL;
  const distance = eye.distanceTo(at);
  const toAt = new THREE.Vector3().subVectors(at, eye).normalize();
  const toChest = new THREE.Vector3(watched.feet.x, watched.feet.y + 0.6 * watched.height, watched.feet.z).sub(eye).normalize();
  const apart = toAt.angleTo(toChest);
  if (!(distance > 0) || apart <= half || apart > 2 * half) return at.clone();
  const turn = new THREE.Quaternion().setFromUnitVectors(toAt, toChest);
  const part = new THREE.Quaternion().slerp(turn, (apart - half) / apart);
  return toAt.applyQuaternion(part).multiplyScalar(distance).add(eye);
}

/** Where over the shoulder the camera stands to watch, and why: see `shoulderSpot`. */
export interface Spot {
  readonly eye: THREE.Vector3;
  /** What it looks at: the middle of what is framed. */
  readonly at: THREE.Vector3;
  /** Nothing of the figure is on the line to what is watched. */
  readonly clear: boolean;
  /** What is watched is all in the frame. */
  readonly framed: boolean;
}

/**
 * Over the shoulder: where a camera standing by the figure sees what it is running. It stands behind the head (away
 * from what is watched, over the ground), to one side and a little above, at the nearest of BACKS and ASIDES from which
 * nothing of the figure is on the line to what is watched or to where it is now, nothing solid is between the head and
 * it, and the whole of what is watched is in the frame; failing that, the furthest back with the figure out of the way;
 * failing that, the one that leaves the figure furthest from the line. `facing` is the way the figure
 * looks (radians about the vertical), used when what is watched is straight overhead; `side` is the shoulder tried
 * first, 1 the right and -1 the left.
 */
export function shoulderSpot(watched: Watched, facing: number, fovV: number, aspect: number, side = 1): Spot {
  const ball = subject(watched, new THREE.Sphere());
  const now = watched.now.getCenter(new THREE.Vector3());
  const head = new THREE.Vector3(watched.feet.x, watched.feet.y + watched.height, watched.feet.z);
  const to = new THREE.Vector3(ball.center.x - head.x, 0, ball.center.z - head.z);
  // (straight overhead the ground gives no way to stand back from it: back from the way the figure faces)
  if (to.lengthSq() < 0.25) to.set(-Math.sin(facing), 0, -Math.cos(facing));
  to.normalize();
  const right = new THREE.Vector3().crossVectors(to, UP).normalize();
  const dir = new THREE.Vector3();
  const eye = new THREE.Vector3();
  let fallback: { spot: Spot; back: number } | null = null;
  let best: { spot: Spot; gap: number } | null = null;
  for (const s of [side, -side])
    for (const back of BACKS)
      for (const aside of ASIDES) {
        eye
          .copy(head)
          .addScaledVector(to, -back)
          .addScaledVector(right, aside * s)
          .addScaledVector(UP, RISE);
        // nothing solid between the head and where the camera would stand: else it stands short of it
        dir.subVectors(eye, head);
        const length = dir.length();
        dir.divideScalar(length);
        const free = watched.clear(head, dir, length + WALL_CLEAR);
        if (free < length + WALL_CLEAR) eye.copy(head).addScaledVector(dir, Math.max(0, free - WALL_CLEAR));
        const clear = !figureBlocks(watched, eye, ball.center) && !figureBlocks(watched, eye, now);
        const framed = fits(eye, ball.center, ball.radius, fovV, aspect);
        const spot = { eye: eye.clone(), at: withFigure(watched, eye, ball.center, fovV, aspect), clear, framed };
        if (clear && framed) return spot;
        if (clear && (!fallback || back > fallback.back)) fallback = { spot, back };
        if (!clear) {
          const gap = segmentGap(watched.feet, head, eye, ball.center);
          if (!best || gap > best.gap) best = { spot, gap };
        }
      }
  return fallback?.spot ?? best!.spot;
}
