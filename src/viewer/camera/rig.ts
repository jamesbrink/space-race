import * as THREE from 'three';

/**
 * What a rig is, and what it may ask of the world. A rig is one way of holding the camera: it keeps
 * its own state, is stepped by time, is told what the hands did in the page's terms (pixels dragged,
 * nepers of zoom) and says where the camera is. It never touches the page or the renderer, and knows
 * nothing of any flight: what it turns about, sits in or follows comes through `World`.
 */

/** The rigs there are. `locked` is the chase view held in the vehicle's own frame. */
export type RigId = 'orbit' | 'free' | 'chase' | 'locked' | 'onboard' | 'pad';

/** What each is called on the screen, and what it does, in a line. */
export const RIGS: Record<RigId, { name: string; says: string }> = {
  orbit: { name: 'Orbit view', says: 'Turns about what you choose · drag to turn · wheel zooms' },
  free: { name: 'Free camera', says: 'W A S D fly it · drag looks round' },
  chase: { name: 'Chase view', says: 'Goes with the vehicle, level with the horizon · drag to look round it' },
  locked: { name: 'Chase view · locked', says: 'Turns with the vehicle: it holds still and the world moves' },
  onboard: { name: 'On board', says: 'From the couch · drag to look round · wheel zooms' },
  pad: { name: 'Pad camera', says: 'Stands on the ground and follows the vehicle with a long lens · wheel zooms' },
};

/** Where the camera is and how it is turned; `fov` in degrees, vertical. */
export interface Pose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  fov: number;
}

/** The vehicle a flight carries off the pad, as the camera needs it. */
export interface Craft {
  /** Its own frame in the scene (its origin and turn). */
  matrix: THREE.Matrix4;
  /** The middle of what is left of it, in its own frame, and the radius of a ball round that, metres. */
  centre: THREE.Vector3;
  radius: number;
  /** Changes whenever what is left of it does (it has shed something, or has it back). */
  shape: number;
  /** Off the pad. */
  flying: boolean;
  /** A place inside it to see from (ModelDef.seats), in the scene: null if it has none. */
  seat: THREE.Matrix4 | null;
}

/** What a rig may ask of the world it is in. Lengths are metres in the scene's frame. */
export interface World {
  /** Straight up at a place: the site's +Y on the site, the plumb line beyond it. */
  upAt(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3;
  /** How far a point is above the ground or sea under it, metres (Infinity where there is none). */
  clearance(p: THREE.Vector3): number;
  /** Where the pivot may be taken by hand: no further than `radius` from `centre`. */
  reach(): { centre: THREE.Vector3; radius: number };
  /** The furthest the place is worth being seen from, metres. */
  far(): number;
  /** The lowest the eye goes round a pivot on the ground: radians from straight up. */
  maxPolar(): number;
  /** The flown vehicle, or null if the flight has none. */
  craft(): Craft | null;
}

/** What is common to every rig: stepped by `dt`, told what the hands did, asked where the camera is. */
export interface Rig {
  readonly id: RigId;
  /** What the view is about: the point it turns round or looks at. The depth range is fitted to it. */
  readonly pivot: THREE.Vector3;
  /**
   * Take over from a view as it stands, so that nothing jumps. `resume`: the view being left is not one to carry on
   * from (it was inside the vehicle, or a long lens far away), so come back as this rig was last left.
   */
  enter(from: Pose, pivot: THREE.Vector3, resume?: boolean): void;
  /** `dt` seconds on. `keys` are held (lower case), `fast` is Shift. */
  update(dt: number, keys: ReadonlySet<string>, fast: boolean): void;
  /** Where the camera is now. */
  pose(out: Pose): void;
  /** A drag: pixels moved, in a frame `height` pixels tall. `pan` slides the view instead of turning it. */
  drag(dx: number, dy: number, height: number, pan: boolean): void;
  /** The hand let go with the pointer moving at this many pixels a second. */
  fling(vx: number, vy: number, height: number): void;
  /** Zoom by this many nepers (positive: out); `hit` is the solid thing under the pointer, if any. */
  zoom(nepers: number, hit: THREE.Vector3 | null): void;
  /** Two fingers turned by `angle` radians about the line of sight. */
  twist(angle: number): void;
  /** Back to how the rig starts (0, or C asked again). */
  home(): void;
  /** Whether anything is still moving by itself (easing, coasting, a journey). */
  readonly busy: boolean;
  /** The lens this rig wants, degrees, or null for the stage's own. */
  readonly lens: number | null;
}

export const Y = new THREE.Vector3(0, 1, 0);
export const X = new THREE.Vector3(1, 0, 0);

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();

/** The turn of a camera at `eye` looking at `target` with `up` overhead, then tipped `below` radians down where it stands. */
export function looking(
  eye: THREE.Vector3,
  target: THREE.Vector3,
  up: THREE.Vector3,
  below: number,
  out: THREE.Quaternion,
): THREE.Quaternion {
  out.setFromRotationMatrix(m.lookAt(eye, target, up));
  return below ? out.multiply(q.setFromAxisAngle(X, -below)) : out;
}
