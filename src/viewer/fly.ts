import * as THREE from 'three';

/**
 * How the view is moved when nobody is being walked as. `orbit` turns about a subject; `fly` is a
 * camera on its own, looking where it is pointed and going where it is sent. The C key steps
 * through them (ui.ts). A mode that follows a vehicle in flight will be a third name here.
 */
export type CameraMode = 'orbit' | 'fly';
export const CAMERA_MODES: CameraMode[] = ['orbit', 'fly'];

const UP = new THREE.Vector3(0, 1, 0);
/** Radians of turn per pixel dragged. */
const LOOK = 0.0035;
/** Metres per second near the ground, and how much faster per metre of height: far to go when high up, fine control when low. */
const SPEED = 4;
const SPEED_PER_METRE = 0.8;
const FASTEST = 200;
/** How much faster with Shift held. */
export const BOOST = 5;

/** How fast the camera flies at a given height above the ground, m/s. */
export function flySpeed(height: number, fast: boolean): number {
  return Math.min(FASTEST, SPEED + SPEED_PER_METRE * Math.max(0, height)) * (fast ? BOOST : 1);
}

/**
 * The free camera. It keeps a heading and a pitch; keys move it along its own line of sight and
 * sideways, a drag or the arrows turn it. It has no subject, so it never drifts and never frames.
 */
export class Flyer {
  private yaw = 0;
  private pitch = 0;
  /** A flight of the camera (to something clicked) was under way last frame: it has just landed. */
  private arrived = false;

  /** Take the heading the camera has now, on entering the mode or after it has been flown somewhere. */
  read(camera: THREE.Camera): void {
    const d = camera.getWorldDirection(new THREE.Vector3());
    this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
  }

  /** A drag: the scene follows the hand, as it does when orbiting. */
  look(dx: number, dy: number): void {
    this.yaw += dx * LOOK;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * LOOK, -1.5, 1.5);
  }

  /** Move by the keys held. `floor` is the lowest the camera may go. Returns whether anything moved. */
  drive(camera: THREE.Camera, held: ReadonlySet<string>, fast: boolean, dt: number, floor: number, ground: number): boolean {
    if (!held.size) return false;
    const has = (...keys: string[]) => Number(keys.some((k) => held.has(k)));
    this.yaw += (has('arrowleft') - has('arrowright')) * 1.2 * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch + (has('arrowup') - has('arrowdown')) * 0.9 * dt, -1.5, 1.5);
    const forward = this.direction();
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
    const step = new THREE.Vector3()
      .addScaledVector(forward, has('w', 'r', '+', '=') - has('s', 'f', '-'))
      .addScaledVector(right, has('d') - has('a'))
      .addScaledVector(UP, has('e') - has('q'));
    if (step.lengthSq() > 1) step.normalize();
    camera.position.addScaledVector(step, flySpeed(camera.position.y - ground, fast) * dt);
    camera.position.y = Math.max(floor, camera.position.y);
    return true;
  }

  /** The wheel: forward and back along the line of sight. */
  dolly(camera: THREE.Camera, notches: number, floor: number, ground: number): void {
    camera.position.addScaledVector(this.direction(), -notches * 0.25 * flySpeed(camera.position.y - ground, false));
    camera.position.y = Math.max(floor, camera.position.y);
  }

  /**
   * Point the camera, and keep `target` (what orbiting would turn about) a little way ahead of it,
   * so the depth range and a return to orbiting have something to go on. While the camera is being
   * flown somewhere (`journey`) it looks at where it is going, and takes its heading from that.
   */
  aim(camera: THREE.Camera, target: THREE.Vector3, journey: boolean): void {
    if (journey || this.arrived) {
      camera.lookAt(target);
      this.read(camera);
    } else {
      camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      const ahead = THREE.MathUtils.clamp(camera.position.distanceTo(target), 2, 60);
      target.copy(camera.position).addScaledVector(this.direction(), ahead);
    }
    this.arrived = journey;
  }

  private direction(): THREE.Vector3 {
    const c = Math.cos(this.pitch);
    return new THREE.Vector3(-Math.sin(this.yaw) * c, Math.sin(this.pitch), -Math.cos(this.yaw) * c);
  }
}
