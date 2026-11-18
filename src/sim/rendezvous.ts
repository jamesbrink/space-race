/** LM-active rendezvous from terminal phase initiation. Local-vertical components come from the flight report. */
import type { Flight } from '../types.ts';
import type { DockPair } from './docking.ts';
import { orbitalFix, terminalApproach } from './approach.ts';
import { add, cross, dot, length, scale, sub, unit, type Vec3, DEG } from '../world/frames.ts';
import { aboutAxis, fromAxes, multiply, turn, unturn } from './rigid.ts';

export function startRendezvous(flight: Flight) {
  const op = flight.docking!.rendezvous!;
  const pair = terminalApproach(flight, true),
    [passive, active] = pair.bodies;
  Object.assign(active, orbitalFix(op.fix, flight.launch, op.fix.t.value));
  const up = unit(active.r),
    normal = unit(cross(active.r, active.v)),
    forward = cross(normal, up);
  const sight = add(scale(up, Math.sin(op.elevation.value * DEG)), scale(forward, Math.cos(op.elevation.value * DEG)));
  // Differential height is a difference of radii; intersect the line of sight with the outer sphere.
  const dh = op.height.value,
    r = length(active.r),
    projection = r * Math.sin(op.elevation.value * DEG);
  const distance = (2 * r * dh + dh * dh) / (Math.sqrt(projection * projection + 2 * r * dh + dh * dh) + projection);
  passive.r = add(active.r, scale(sight, distance));
  // Use the subsequent station-keeping tracking fix to obtain speed and flight-path angle.
  // Its backwards-propagated position differs from the simultaneously observed radar geometry.
  const tracking = orbitalFix(flight.docking!.fixes![1]!, flight.launch, op.fix.t.value);
  const measuredUp = unit(tracking.r),
    measuredForward = unit(cross(unit(cross(tracking.r, tracking.v)), measuredUp));
  passive.v = add(
    scale(unit(cross(normal, passive.r)), dot(measuredForward, tracking.v)),
    scale(unit(passive.r), dot(measuredUp, tracking.v)),
  );
  active.q = fromAxes(normal, sight, cross(normal, sight));
  passive.q = multiply(active.q, aboutAxis([0, 0, 1], Math.PI));
  pair.t = op.fix.t.value;
  return pair;
}
export function rendezvousInput(run: DockPair, flight: Flight) {
  const op = flight.docking!.rendezvous!,
    [target, ship] = run.bodies;
  const up = unit(ship.r),
    left = unit(cross(ship.r, ship.v)),
    forward = cross(left, up);
  // Local-vertical coordinates in table 5-I: +X prograde, +Y to the right, +Z downward.
  let demand: Vec3 = [0, 0, 0];
  for (const pulse of op.burns) {
    if (run.t >= pulse.at && run.t < pulse.at + pulse.duration.value) {
      const [x, y, z] = pulse.components;
      demand = scale(add(scale(forward, x.value), add(scale(left, -y.value), scale(up, -z.value))), ship.mass / pulse.duration.value);
    }
  }
  if (run.t >= op.brake) {
    const axis = turn(target.q, [0, 1, 0]);
    const rate = op.closing.value;
    const distance = Math.min(op.hold.value, run.limits.stroke + Math.max(0, op.contact - run.t) * rate);
    const finish = add(target.r, scale(axis, target.port + ship.port + distance));
    const finalRate = distance < op.hold.value ? -rate : 0;
    const time = Math.max(4, op.station - run.t);
    const relative = add(sub(target.v, ship.v), scale(axis, finalRate));
    const approach = sub(finish, ship.r);
    let wish = scale(add(scale(approach, 6 / (time * time)), scale(relative, 4 / time)), ship.mass);
    const range = length(approach) + distance;
    const gate = op.gates.find((g) => range <= g.range.value);
    if (gate && length(approach) > 5) {
      const toward = unit(approach),
        rate = dot(sub(ship.v, target.v), toward);
      // Brake at the recorded range/rate gates. Preserve the trajectory feedback transverse to the line of sight.
      const radial = dot(wish, toward);
      wish = add(wish, scale(toward, Math.min(0, (gate.speed.value - rate) * ship.mass - radial)));
    }
    const authority = 4 * flight.docking!.controls.ahead.value;
    demand = length(wish) > authority ? scale(wish, authority / length(wish)) : wish;
  }
  return unturn(ship.q, demand);
}
