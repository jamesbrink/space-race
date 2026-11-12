import * as THREE from 'three';

/**
 * The camera's arithmetic, apart from any page or renderer: how a wheel becomes a zoom, what a zoom
 * may move, how motion eases and coasts by time and not by frame, how a subject is framed and kept
 * in frame. Everything here is a pure function or a small value that is stepped with `dt`, and is
 * tested in node (tests/camera.test.mjs). The rules the rigs are built on:
 *
 *  - Zooming out never moves what the camera turns about (the pivot): it pulls straight back.
 *  - Zooming never changes the direction the pivot is seen from.
 *  - Zooming in goes toward the pointer only when the pointer is on something near and solid
 *    (`anchorOk`); then the point under the pointer stays under it, and the pivot goes toward it.
 *  - Zoom is logarithmic: the same turn of the wheel is the same proportion at 5 cm and at 400 km.
 *  - Easing and coasting are closed forms in time: thirty frames a second and a hundred and
 *    forty-four arrive at the same place.
 */

const Y = new THREE.Vector3(0, 1, 0);

/** Nepers of zoom for a pixel of wheel: a mouse's notch (120) is a sixth closer or further. */
export const WHEEL_RATE = 0.0014;
/** ...and for a pixel of a trackpad's pinch (a wheel event with ctrlKey), which arrives in small numbers. */
export const PINCH_RATE = 0.011;
/** The most one wheel event counts for, pixels: a flick's first events are not a leap. */
export const WHEEL_MOST = 150;
/** The fastest the zoom runs, nepers a second, and the most it may be asked to run on ahead of where it is. */
export const ZOOM_RATE = 3.2;
export const ZOOM_LEAD = 0.55;
/** How quickly the zoom closes on what was asked, seconds (the time to cover 63 % of it). */
export const ZOOM_TAU = 0.085;
/** How long a turn coasts after the hand lets go, seconds (to 37 % of its speed). */
export const COAST_TAU = 0.22;
/** The nearest the eye comes to a surface it has been zoomed toward, metres. */
export const NEAREST = 0.05;
/** A surface under the pointer is near enough to zoom toward if it is no further than this many times the pivot's distance. */
export const ANCHOR_REACH = 2.5;
/** ...and bare ground only if it is this near the pivot, as a fraction of the pivot's distance: the ground the subject stands on, not a field away. */
export const GROUND_REACH = 0.35;

/**
 * What one wheel event asks of the zoom, in nepers (positive: further away). `mode` is the event's
 * deltaMode (0 pixels, 1 lines, 2 pages); `pinch` is its ctrlKey, which is how a trackpad's pinch arrives.
 */
export function wheelZoom(deltaY: number, mode = 0, pinch = false): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
  const pixels = deltaY * (mode === 1 ? 40 : mode === 2 ? 800 : 1);
  if (pinch) return THREE.MathUtils.clamp(pixels, -WHEEL_MOST / 3, WHEEL_MOST / 3) * PINCH_RATE;
  return THREE.MathUtils.clamp(pixels, -WHEEL_MOST, WHEEL_MOST) * WHEEL_RATE;
}

/** `now` gone toward `goal` for `dt` seconds with time constant `tau`: exact for any step, so two half steps are one whole one. */
export function approach(now: number, goal: number, tau: number, dt: number): number {
  return tau <= 0 ? goal : goal + (now - goal) * Math.exp(-dt / tau);
}

/** An angle brought within half a turn of another, so that easing between them goes the short way. */
export function nearAngle(angle: number, to: number): number {
  return to + Math.atan2(Math.sin(angle - to), Math.cos(angle - to));
}

/**
 * A zoom being run: what has been asked for (`goal`) and where it has got to (`now`), both the
 * natural logarithm of a distance (or of anything that is zoomed by proportion). Asking adds to
 * the goal, but never more than ZOOM_LEAD ahead, so a trackpad's flick, which goes on sending
 * events for a second after the fingers have left, cannot wind up a zoom of hundreds of times.
 */
export class Zoom {
  now: number;
  goal: number;
  constructor(now = 0) {
    this.now = this.goal = now;
  }
  /** Put it somewhere at once. */
  set(log: number): void {
    this.now = this.goal = log;
  }
  /** Ask for `nepers` more (positive: out), within `min` and `max` (logarithms). */
  push(nepers: number, min = -Infinity, max = Infinity): void {
    const to = THREE.MathUtils.clamp(this.goal + nepers, this.now - ZOOM_LEAD, this.now + ZOOM_LEAD);
    // (a limit holds the goal only on its own side: a view already beyond one is not thrown back to it)
    this.goal = nepers > 0 ? Math.min(to, Math.max(max, this.goal)) : Math.max(to, Math.min(min, this.goal));
  }
  /** Go on for `dt` seconds. Returns how far it went, in nepers (the factor is its exponential). `calm`: at once, no easing. */
  step(dt: number, calm = false): number {
    const before = this.now;
    if (calm) this.now = this.goal;
    else {
      const eased = approach(this.now, this.goal, ZOOM_TAU, dt);
      this.now += THREE.MathUtils.clamp(eased - this.now, -ZOOM_RATE * dt, ZOOM_RATE * dt);
      if (Math.abs(this.goal - this.now) < 1e-5) this.now = this.goal;
    }
    return this.now - before;
  }
  get moving(): boolean {
    return this.now !== this.goal;
  }
}

/** A speed that dies away by itself: what a turn does after the hand lets go. */
export class Coast {
  v = 0;
  /** Go on for `dt` seconds: how far it carried. Exact for any step. */
  step(dt: number, tau = COAST_TAU): number {
    if (this.v === 0) return 0;
    const k = Math.exp(-dt / tau);
    const gone = this.v * tau * (1 - k);
    this.v *= k;
    if (Math.abs(this.v) < 1e-4) this.v = 0;
    return gone;
  }
}

/**
 * Whether a surface the pointer is on may be zoomed toward: there is one, it is in front of the
 * eye, and it is near (no further than ANCHOR_REACH times the pivot's distance). A thing (a model,
 * a building) draws the zoom from anywhere that near. Bare ground (`ground`) does only where it
 * is beside the pivot (within GROUND_REACH of the pivot's distance): zooming back in with the
 * pointer left over an empty field goes to the subject, not to the field. The sky gives no
 * surface, and the far ground and the globe are too far, so none of them is ever zoomed toward.
 */
export function anchorOk(eye: THREE.Vector3, pivot: THREE.Vector3, hit: THREE.Vector3 | null, ground = false): hit is THREE.Vector3 {
  if (!hit) return false;
  const far = eye.distanceTo(hit);
  const scale = eye.distanceTo(pivot);
  if (ground && hit.distanceTo(pivot) > Math.max(GROUND_REACH * scale, 1)) return false;
  return far > 1e-6 && far <= Math.max(ANCHOR_REACH * scale, 3);
}

/**
 * Zoom by `factor` (under 1: closer). `pivot` and `eye` are changed in place. Without an anchor, or
 * going out, the pivot stays and the eye moves along its line to it, between `min` and `max` from it
 * (a view already nearer than `min` is not pushed out, only not let nearer). With an anchor, going
 * in, both are drawn toward the anchor in proportion, so the anchor stays where it is on the screen
 * and the direction of view does not change; the eye stops NEAREST short of the anchor.
 * Returns the factor it could apply.
 */
export function zoomBy(
  pivot: THREE.Vector3,
  eye: THREE.Vector3,
  factor: number,
  anchor: THREE.Vector3 | null,
  min: number,
  max: number,
): number {
  const distance = eye.distanceTo(pivot);
  if (!(distance > 0) || !Number.isFinite(factor) || factor <= 0) return 1;
  if (anchor && factor < 1) {
    const toAnchor = eye.distanceTo(anchor);
    const f = toAnchor <= NEAREST ? 1 : Math.max(factor, NEAREST / toAnchor);
    pivot.sub(anchor).multiplyScalar(f).add(anchor);
    eye.sub(anchor).multiplyScalar(f).add(anchor);
    return f;
  }
  const to = factor < 1 ? Math.max(distance * factor, Math.min(distance, min)) : Math.min(distance * factor, Math.max(distance, max));
  eye
    .sub(pivot)
    .multiplyScalar(to / distance)
    .add(pivot);
  return to / distance;
}

/** The turn that takes +Y to `up`: the frame the angles round a pivot are measured in. */
export function frameOf(up: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromUnitVectors(Y, up);
}

/**
 * From the pivot to the eye: `theta` round the vertical from +Z toward +X, `phi` down from straight
 * up, `distance` metres, in the frame `turn` (frameOf the local vertical, or a vehicle's own turn).
 */
export function offsetOf(theta: number, phi: number, distance: number, turn: THREE.Quaternion, out = new THREE.Vector3()): THREE.Vector3 {
  const s = Math.sin(phi);
  return out
    .set(s * Math.sin(theta), Math.cos(phi), s * Math.cos(theta))
    .multiplyScalar(distance)
    .applyQuaternion(turn);
}

/** The angles and distance of an offset from the pivot, in the frame `turn`: offsetOf's inverse. */
export function anglesOf(offset: THREE.Vector3, turn: THREE.Quaternion): { theta: number; phi: number; distance: number } {
  const o = offset.clone().applyQuaternion(turn.clone().invert());
  const distance = o.length();
  return {
    theta: Math.atan2(o.x, o.z),
    phi: distance > 0 ? Math.acos(THREE.MathUtils.clamp(o.y / distance, -1, 1)) : Math.PI / 2,
    distance,
  };
}

/** How far off a subject `span` metres across is framed to fill `fill` of the frame's height, through a lens of `fov` degrees. */
export function fitDistance(span: number, fov: number, fill: number): number {
  return span / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2)) / fill;
}

/**
 * How far below the pivot the camera aims, radians, so that the pivot is seen in the middle of the
 * part of the frame the controls leave clear (`inset`: the fraction of the frame's height they
 * cover at the bottom). It is a turn of the camera where it stands, so it changes neither the
 * distance nor the direction the pivot is seen from, at any zoom.
 */
export function aimBelow(inset: number, fov: number): number {
  return Math.atan(inset * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
}

/** A flight of the camera: where the pivot and the eye's offset from it start and end. */
export interface Journey {
  pivot0: THREE.Vector3;
  pivot1: THREE.Vector3;
  offset0: THREE.Vector3;
  offset1: THREE.Vector3;
  t: number;
  seconds: number;
}

/** How long a journey takes: longer for further, up to a limit. */
export function journeySeconds(pivot0: THREE.Vector3, offset0: THREE.Vector3, pivot1: THREE.Vector3, offset1: THREE.Vector3): number {
  const far =
    pivot0.distanceTo(pivot1) +
    Math.abs(offset1.length() - offset0.length()) +
    offset0.angleTo(offset1) * Math.min(offset0.length(), offset1.length());
  return THREE.MathUtils.clamp(0.7 + 0.55 * Math.log2(1 + far / 4), 0.9, 2.8);
}

/** Eased at both ends, 0 to 1. */
export function ease(t: number): number {
  const k = THREE.MathUtils.clamp(t, 0, 1);
  return k * k * k * (k * (k * 6 - 15) + 10);
}

/**
 * Where a journey is at `j.t` (0 to 1): the pivot slides, the offset swings round and changes
 * length separately (lengths blend by ratio, so a long pull back starts gently): an arc, not a
 * straight line through the subject.
 */
export function journeyAt(j: Journey, pivot: THREE.Vector3, offset: THREE.Vector3): void {
  const k = ease(j.t);
  pivot.lerpVectors(j.pivot0, j.pivot1, k);
  const from = j.offset0.length();
  const to = j.offset1.length();
  const turn = new THREE.Quaternion().setFromUnitVectors(
    j.offset0.clone().divideScalar(from || 1),
    j.offset1.clone().divideScalar(to || 1),
  );
  offset.copy(j.offset0).applyQuaternion(new THREE.Quaternion().slerp(turn, k));
  offset.setLength(from * (to / (from || 1)) ** k);
}

/**
 * The least sideways move (of pivot and eye together) that brings `centre` back inside the middle
 * `keep` of the frame, for a camera at `eye` turned `turn`; zero if it is inside already. Used when
 * something moved by itself (a part sliding off, a vehicle shedding a stage): the hand-set distance
 * and direction are kept, and the view moves only if the subject would be lost, and then only as
 * far as it must.
 */
export function nudgeIntoFrame(
  eye: THREE.Vector3,
  turn: THREE.Quaternion,
  fov: number,
  aspect: number,
  centre: THREE.Vector3,
  keep = 0.8,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const p = centre.clone().sub(eye).applyQuaternion(turn.clone().invert());
  const depth = -p.z;
  if (!(depth > 1e-6))
    return out
      .copy(centre)
      .sub(eye)
      .addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(turn), -Math.max(1, p.length()));
  const tall = depth * Math.tan(THREE.MathUtils.degToRad(fov / 2)) * keep;
  const wide = tall * aspect;
  const dx = p.x - THREE.MathUtils.clamp(p.x, -wide, wide);
  const dy = p.y - THREE.MathUtils.clamp(p.y, -tall, tall);
  return out.set(dx, dy, 0).applyQuaternion(turn);
}

/**
 * The lens a tracking camera uses, degrees: narrow enough that a subject of `radius` at `distance`
 * fills `fill` of the frame's height, within what a lens can be (`min` to `max`).
 */
export function trackFov(radius: number, distance: number, fill: number, min: number, max: number): number {
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(radius / fill / Math.max(distance, 1e-3)));
  return THREE.MathUtils.clamp(fov, min, max);
}

/**
 * One pose blended into another that is still moving: what is left of the difference between the
 * old view and the new one at the moment of handing over (`delta`), added to the new view and
 * fading with `k` (0 to 1, eased by the caller). The new rig is in charge from the first frame, so
 * input moves it at once and nothing jumps.
 */
export function blendPose(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  deltaP: THREE.Vector3,
  deltaQ: THREE.Quaternion,
  k: number,
): void {
  position.addScaledVector(deltaP, 1 - k);
  quaternion.multiply(new THREE.Quaternion().slerp(deltaQ, 1 - k));
}
