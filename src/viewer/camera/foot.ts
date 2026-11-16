import * as THREE from 'three';
import { ease } from '../../util/math.ts';
import { approach } from './maths.ts';
import type { Pose, Rig } from './rig.ts';
import { neckTurn, shoulderSpot, subject, type Watched, yawPitchOf } from './watch.ts';

/** Where a walker's view is from and how it is turned, worked out by the walker each frame (onfoot/walk.ts `Walker.view`). */
export interface FootView {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
  /** How much of the body's motion reaches the view, 0 to 1 (the walk bar's Motion: full 1, reduced, off 0). Left out, 1. */
  readonly motion?: number;
}

/** How far ahead of the eyes the view is taken to be about, metres (what a walk's end turns about: Cameras.unfoot). */
const AHEAD = 3;

/**
 * How long the view takes to go to what is being run and to come back from it, seconds: with Motion full, and reduced
 * (off, it cuts). And how quickly it keeps up with what it is watching as that moves (the time to cover 63 % of it).
 * Estimated: a head turned, a step taken aside.
 */
const WATCH_SECONDS = { full: 0.9, reduced: 0.3 };
const FOLLOW_TAU = { full: 0.35, reduced: 0.12 };

const sphere = new THREE.Sphere();
const turn = new THREE.Quaternion();
const look = new THREE.Matrix4();

/**
 * On foot (walking.md): the camera through the figure's eyes (`eyes`), or over its shoulder (`shoulder`). The walker
 * moves the view as a body moves (stride, weight, landing, the boom back over the shoulder and in to a wall, a lean to
 * a window, a couch's head) and says where it is; the rig puts the camera there. The hands are the walker's while it
 * walks, so the rig takes none of them, and its lens is the walker's own (it eases it: `Walker.lens`).
 *
 * While something is run by hand (`watch`) the rig watches it: through the eyes the head turns to it, as far as a neck
 * goes (watch.ts `neckTurn`); over the shoulder the camera steps aside and back until the figure is off the line to it
 * and it is framed (`shoulderSpot`). It goes there over WATCH_SECONDS (a cut with Motion off) and comes back the same
 * way when it is let go, or at once the moment the hands take the view (`watch(null, true)`).
 */
export class FootRig implements Rig {
  readonly pivot = new THREE.Vector3();
  readonly busy = false;
  readonly lens = null;
  private view: FootView | null = null;
  readonly id: 'eyes' | 'shoulder';
  /** The frame's shape, width over height (Cameras keeps it). */
  aspect = 1.6;

  /** What is being watched (kept while the view comes back from it), and whether it still is. */
  private watched: Watched | null = null;
  private wants = false;
  /** How far the view has gone to it, 0 (the walker's) to 1. */
  private k = 0;
  /** Where the watching view is and what it looks at, following what is watched (null: not yet placed). */
  private readonly eye = new THREE.Vector3();
  private readonly at = new THREE.Vector3();
  private placed = false;
  private readonly turned = new THREE.Quaternion();
  private fov = 62;

  constructor(id: 'eyes' | 'shoulder') {
    this.id = id;
  }

  /** The walker whose view this is (made after the camera: the stage hands it over). */
  follow(view: FootView): void {
    this.view = view;
  }

  /**
   * Watch something being run by hand (null: stop watching it, and come back to the walker's view as it eases, or
   * `now`, at once: the hands have taken the view, and the walker already looks where the camera does).
   */
  watch(watched: Watched | null, now = false): void {
    if (watched) {
      if (!this.wants || this.watched !== watched) this.placed = this.k > 0 && this.placed;
      this.watched = watched;
      this.wants = true;
      return;
    }
    this.wants = false;
    if (now) this.k = 0;
    if (this.k === 0) {
      this.watched = null;
      this.placed = false;
    }
  }

  /** Is something being watched (the view is going to it or is on it)? */
  get watching(): boolean {
    return this.wants;
  }

  /** How far the view is over to what is watched, 0 to 1 (for tests and the diagnostics). */
  get watchedBy(): number {
    return this.k;
  }

  enter(): void {}

  update(dt: number): void {
    const motion = this.view?.motion ?? 1;
    const seconds = motion >= 1 ? WATCH_SECONDS.full : motion > 0 ? WATCH_SECONDS.reduced : 0;
    const goal = this.wants ? 1 : 0;
    this.k = seconds <= 0 ? goal : THREE.MathUtils.clamp(this.k + (Math.sign(goal - this.k) * dt) / seconds, 0, 1);
    if (!this.wants && this.k === 0) {
      this.watched = null;
      this.placed = false;
    }
    if (!this.watched || !this.view || this.k === 0) return;
    // where it would be now, and the view following it there by time, not by frame
    const tau = motion >= 1 ? FOLLOW_TAU.full : motion > 0 ? FOLLOW_TAU.reduced : 0;
    const eye = new THREE.Vector3();
    const at = subject(this.watched, sphere).center.clone();
    if (this.id === 'shoulder') {
      if (!this.wants) return; // (coming back: from where it was left)
      const { yaw } = yawPitchOf(this.view.quaternion);
      const spot = shoulderSpot(this.watched, yaw, this.fov, this.aspect);
      eye.copy(spot.eye);
      at.copy(spot.at);
    } else eye.copy(this.view.position);
    if (!this.placed) {
      this.eye.copy(eye);
      this.at.copy(at);
      this.placed = true;
    } else {
      this.eye.set(approach(this.eye.x, eye.x, tau, dt), approach(this.eye.y, eye.y, tau, dt), approach(this.eye.z, eye.z, tau, dt));
      this.at.set(approach(this.at.x, at.x, tau, dt), approach(this.at.y, at.y, tau, dt), approach(this.at.z, at.z, tau, dt));
    }
  }

  pose(out: Pose): void {
    if (!this.view) return;
    out.position.copy(this.view.position);
    out.quaternion.copy(this.view.quaternion);
    this.fov = out.fov;
    if (this.k > 0 && this.placed) {
      const u = ease(this.k);
      if (this.id === 'eyes') {
        // the head turned from the way the body faces, as far as a neck goes; the eyes stay where the walker has them
        neckTurn(out.position, this.view.quaternion, this.at, this.turned);
      } else {
        this.turned.setFromRotationMatrix(look.lookAt(this.eye, this.at, THREE.Object3D.DEFAULT_UP));
        out.position.lerp(this.eye, u);
      }
      out.quaternion.slerp(turn.copy(this.turned), u);
    }
    this.pivot.set(0, 0, -AHEAD).applyQuaternion(out.quaternion).add(out.position);
  }

  drag(): void {}
  fling(): void {}
  zoom(): void {}
  twist(): void {}
  home(): void {}
}
