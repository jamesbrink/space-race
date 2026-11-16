import * as THREE from 'three';
import type { Pose, Rig } from './rig.ts';

/** Where a walker's view is from and how it is turned, worked out by the walker each frame (onfoot/walk.ts `Walker.view`). */
export interface FootView {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
}

/** How far ahead of the eyes the view is taken to be about, metres (what a walk's end turns about: Cameras.unfoot). */
const AHEAD = 3;

/**
 * On foot (walking.md): the camera through the figure's eyes (`eyes`), or over its shoulder (`shoulder`). The walker
 * moves the view as a body moves (stride, weight, landing, the boom back over the shoulder and in to a wall, a lean to
 * a window, a couch's head) and says where it is; the rig puts the camera there. The hands are the walker's while it
 * walks, so the rig takes none of them, and its lens is the walker's own (it eases it: `Walker.lens`).
 */
export class FootRig implements Rig {
  readonly pivot = new THREE.Vector3();
  readonly busy = false;
  readonly lens = null;
  private view: FootView | null = null;
  readonly id: 'eyes' | 'shoulder';

  constructor(id: 'eyes' | 'shoulder') {
    this.id = id;
  }

  /** The walker whose view this is (made after the camera: the stage hands it over). */
  follow(view: FootView): void {
    this.view = view;
  }

  enter(): void {}
  update(): void {}

  pose(out: Pose): void {
    if (!this.view) return;
    out.position.copy(this.view.position);
    out.quaternion.copy(this.view.quaternion);
    this.pivot.set(0, 0, -AHEAD).applyQuaternion(out.quaternion).add(out.position);
  }

  drag(): void {}
  fling(): void {}
  zoom(): void {}
  twist(): void {}
  home(): void {}
}
