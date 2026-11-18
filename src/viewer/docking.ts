import { Matrix4, type Object3D } from 'three';
import type { DockingPort } from '../types.ts';

/** The stationary mating ring in spacecraft coordinates, independent of where the spacecraft is in the scene. */
function ringInCraft(craft: Object3D, port: DockingPort): Matrix4 | null {
  const ring = craft.getObjectByName(port.part)?.getObjectByName(port.frame);
  if (!ring) return null;
  ring.updateWorldMatrix(true, false);
  return new Matrix4().copy(craft.matrixWorld).invert().multiply(ring.matrixWorld);
}

/**
 * Placement of the incoming craft relative to the target craft. At hard dock the mating-plane origins coincide,
 * their outward normals oppose one another and their clocking axes agree. At capture the probe is extended by its rated stroke.
 */
export function dockingPose(
  incoming: Object3D,
  from: DockingPort,
  target: Object3D,
  to: DockingPort,
  state: 'capture' | 'docked',
): Matrix4 | null {
  if (from.system !== to.system || from.role === to.role) return null;
  const sourceRing = ringInCraft(incoming, from);
  const targetRing = ringInCraft(target, to);
  if (!sourceRing || !targetRing) return null;
  const probe = from.role === 'probe' ? from : to.role === 'probe' ? to : null;
  if (state === 'capture' && probe) targetRing.multiply(new Matrix4().makeTranslation(0, probe.captureTravel.value, 0));
  return targetRing.multiply(new Matrix4().makeRotationZ(Math.PI)).multiply(sourceRing.invert());
}

/** Bind the retracted probe and its latches in their as-built positions. Approach leaves the nose hooks compressed for entry through the socket lip. */
export function bindDockingProbe(craft: Object3D, port: Extract<DockingPort, { role: 'probe' }>) {
  const ring = craft.getObjectByName(port.part)?.getObjectByName(port.frame);
  const piston = ring?.getObjectByName(port.piston);
  if (!ring || !piston) return null;
  const hinges: { hook: Object3D; open: Object3D['quaternion'] }[] = [];
  for (const name of port.hinges) {
    const hook = ring.getObjectByName(name);
    if (!hook) return null;
    hinges.push({ hook, open: hook.quaternion.clone() });
  }
  const hookTravel = port.captureHooks?.travel.value ?? 0;
  const captureHooks: { hook: Object3D; rest: Object3D['position'] }[] = [];
  for (const name of port.captureHooks?.nodes ?? []) {
    const hook = piston.getObjectByName(name);
    if (!hook) return null;
    captureHooks.push({ hook, rest: hook.position.clone() });
  }
  const retracted = piston.position.clone();
  return (state: 'stowed' | 'approach' | 'capture' | 'docked', closure = 0) => {
    piston.position.copy(retracted);
    if (state === 'approach' || state === 'capture') piston.translateY(port.captureTravel.value * (1 - closure));
    for (const { hook, rest } of captureHooks) {
      hook.position.copy(rest);
      if (state === 'capture' || state === 'docked') hook.translateX(hookTravel);
    }
    for (const { hook, open } of hinges) {
      hook.quaternion.copy(open);
      if (state === 'docked') hook.rotateZ(port.latchRotation.value);
    }
  };
}
