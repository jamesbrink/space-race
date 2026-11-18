import { Box3, Object3D, PointLight, Quaternion, Vector3 } from 'three';
import { kindOf } from './flames.ts';
import { Plume } from './plume.ts';
import type { Flight } from '../types.ts';
import type { Vec3 } from '../world/frames.ts';

/** Bind to the exhibit's named mouths. Directions are exhaust vectors, opposite the force on the ship.
 * Pulse selection is schematic; the historic valve-by-valve commands were not recorded for the approaches. */
export function dockJets(bodies: Object3D[], jets: NonNullable<NonNullable<Flight['docking']>['jets']>) {
  const zero = new Vector3(),
    down = new Vector3(0, -1, 0),
    rotation = new Quaternion();
  const light = new PointLight(0, 0);
  return jets.map((spec) => {
    const body = bodies[spec.body],
      nozzle = body.getObjectByName(spec.node);
    if (!nozzle) throw Error('Missing orbital nozzle ' + spec.node);
    const p = new Plume(spec.radius, 1, null, light, kindOf(spec.main ? 'amine-nitric' : 'hydrazine-n2o4'));
    const direction = spec.direction ? new Vector3(...spec.direction).normalize() : down.clone();
    if (spec.tip) {
      nozzle.updateWorldMatrix(true, true);
      const box = new Box3().setFromObject(nozzle, true);
      const mouth = box.getCenter(new Vector3());
      mouth.y = box.min.y;
      nozzle.worldToLocal(mouth);
      p.mesh.position.copy(mouth);
    } else p.mesh.position.copy(direction).multiplyScalar(spec.offset ?? 0);
    p.mesh.quaternion.setFromUnitVectors(down, direction);
    nozzle.add(p.mesh);
    return (time: number, active: number, thrust: Vec3, torque: Vec3, main: boolean) => {
      const firing = active === spec.body;
      let on = 0;
      if (spec.main) on = Number(main);
      else if (firing && (Math.hypot(...thrust) > 0.1 || Math.hypot(...torque) > 1)) {
        body.updateWorldMatrix(true, false);
        p.mesh.updateWorldMatrix(true, false);
        const point = body.worldToLocal(p.mesh.getWorldPosition(new Vector3()));
        const force = down
          .clone()
          .applyQuaternion(p.mesh.getWorldQuaternion(rotation))
          .negate()
          .applyQuaternion(body.getWorldQuaternion(new Quaternion()).invert());
        const axis = point.cross(force).normalize();
        const translation = Math.hypot(...thrust) > 0.1 ? zero.fromArray(thrust).normalize().dot(force) : 0;
        const spin = Math.hypot(...torque) > 1 ? zero.fromArray(torque).normalize().dot(axis) : 0;
        on = Number(translation > 0.7 || spin > 0.7);
      }
      p.set(on, 1, time, 1);
    };
  });
}
