import { Group, type Object3D } from 'three';
import { gravityOn, MOON } from '../world/bodies.ts';
import type { LunarDrivingGround } from './lunar-driving-ground.ts';
import { type Motion, type Road, Vehicle } from './onfoot/drive.ts';
import type { Corner } from './onfoot/suspension.ts';

type Ground = Pick<LunarDrivingGround, 'height' | 'radius'> & { blocked?(x: number, z: number): boolean };
export type RoverParking = Pick<Motion, 'x' | 'z' | 'heading'> & { distance: number };

/**
 * The rover as the gallery's quick drive has it (ui/rover.ts): the shared vehicle (onfoot/drive.ts `Vehicle`, its
 * four-wheel steering and its suspension, under the Moon's gravity) on the rover's site's ground, which it asks through a
 * `Road`: the ground's height, and the LM and the edge of the grids as what is in its way. The model is its GLB's scene,
 * with the vehicle's node `LRV` in it (lunar_rover.py, lrv_deploy.py), which is what moves (`body`).
 */
export class LunarRover {
  /** What is put in the scene: the model as loaded. */
  readonly holder = new Group();
  /** The vehicle's node: what moves, and what the riders sit in. */
  readonly body: Object3D;
  readonly eye: Object3D;
  readonly vehicle: Vehicle;
  private readonly road: Road;

  constructor(model: Object3D, ground: Ground, parked?: RoverParking) {
    this.holder.add(model);
    this.body = model.getObjectByName('LRV') ?? model;
    this.eye = need(model, 'LRV_DriverEye');
    if (parked) {
      this.body.position.set(parked.x, ground.height(parked.x, parked.z), parked.z);
      this.body.rotation.set(0, parked.heading, 0);
    } else this.body.position.y = ground.height(this.body.position.x, this.body.position.z);
    this.holder.updateMatrixWorld(true);
    this.vehicle = new Vehicle(this.body);
    this.vehicle.gravity = gravityOn(MOON);
    this.vehicle.distance = parked?.distance ?? 0;
    // (what is in its way: the LM, and the edge of the ground there is)
    const blocked = (x: number, z: number) => Boolean(ground.blocked?.(x, z)) || Math.hypot(x, z) >= ground.radius - 2;
    this.road = {
      ground: (x, z) => ground.height(x, z),
      ahead: (from, way, far) => {
        for (let d = 0; d <= far; d += 0.1) if (blocked(from.x + way.x * d, from.z + way.z * d)) return d;
        return null;
      },
    };
    // stood on its wheels where it is
    this.vehicle.stand(this.road);
  }

  get motion(): Motion {
    return this.vehicle.motion;
  }
  get distance(): number {
    return this.vehicle.distance;
  }
  get wheels(): Corner[] {
    return this.vehicle.corners;
  }

  /** A frame at the controls: `pedal` forward (1) or back (-1), `steering` left (1) or right (-1), and the brake. */
  drive(pedal: number, steering: number, brake: boolean, dt: number): void {
    const speed = this.vehicle.motion.speed;
    // (the brake is the hand controller pulled back against the way it goes: held stopped, it does not back)
    this.vehicle.drive(brake ? (speed > 0 ? -1 : speed < 0 ? 1 : 0) : pedal, steering, dt, this.road);
  }
}

function need(root: Object3D, name: string): Object3D {
  const part = root.getObjectByName(name);
  if (!part) throw new Error('Rover model is missing ' + name);
  return part;
}
