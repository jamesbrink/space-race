/** Start both spacecraft from independent navigation fixes. All motion and control are in Earth orbit. */
import type { Flight } from '../types.ts';
import { add, cross, dot, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { coast } from '../world/orbit.ts';
import { orbitalFix, terminalApproach } from './approach.ts';
import type { DockPair } from './docking.ts';
import { heading, maneuver } from './flyby.ts';
import { aboutAxis, fromAxes, multiply, turn, unturn } from './rigid.ts';

export function startTransfer(flight: Flight) {
  const op = flight.docking!.transfer!,
    run = terminalApproach(flight),
    [a, b] = run.bodies;
  run.t = op.fix.t.value;
  Object.assign(a, orbitalFix(op.fix, flight.launch, run.t));
  Object.assign(b, orbitalFix(flight.docking!.fixes![0], flight.launch, run.t));
  if (op.radar) {
    // Reconstruct the target epoch from the observed relative fix before the run starts.
    // This uses the crew's measured burns up to the observation and the tracked target's local velocity.
    let chaser = { r: a.r, v: a.v },
      clock = run.t;
    for (const impulse of op.burns) {
      if (impulse.at >= op.radar.at) break;
      chaser = maneuver(chaser, clock, impulse);
      clock = impulse.at + impulse.duration.value;
    }
    chaser = coast(chaser, op.radar.at - clock);
    const sight = heading(chaser, op.radar.elevation.value, 0);
    const observed = add(chaser.r, scale(sight, op.radar.range.value));
    const prior = coast(b, op.radar.at - run.t);
    const normal = unit(cross(prior.r, prior.v)),
      velocity = add(
        scale(unit(cross(normal, observed)), dot(prior.v, unit(cross(normal, prior.r)))),
        scale(unit(observed), dot(prior.v, unit(prior.r))),
      );
    Object.assign(b, coast({ r: observed, v: velocity }, run.t - op.radar.at));
  }
  const axis = unit(sub(a.r, b.r)),
    x = unit(cross(axis, b.v));
  b.q = fromAxes(x, axis, cross(x, axis));
  a.q = multiply(b.q, aboutAxis([0, 0, 1], Math.PI));
  return run;
}
/** During quiet intervals only, advance both navigated states to the next maneuver on the record. */
export function nextTransfer(run: DockPair, flight: Flight) {
  const op = flight.docking!.transfer!;
  if (
    run.phase !== 'free' ||
    run.t >= op.brake ||
    op.burns.some((b) => run.t >= b.at && run.t < b.at + b.duration.value) ||
    run.bodies.some((b) => length(b.w) > 1e-8)
  )
    return false;
  const end = Math.min(op.brake, op.burns.find((b) => b.at > run.t)?.at ?? Infinity);
  for (const body of run.bodies) Object.assign(body, coast(body, end - run.t));
  run.t = end;
  return true;
}
export function transferInput(run: DockPair, flight: Flight) {
  const op = flight.docking!.transfer!,
    [a, b] = run.bodies;
  const burn = op.burns.find((x) => run.t >= x.at && run.t < x.at + x.duration.value);
  let push: Vec3 = burn ? scale(heading(a, burn.pitch.value, burn.yaw.value), (a.mass * burn.dv.value) / burn.duration.value) : [0, 0, 0];
  if (run.t >= op.brake) {
    const axis = turn(b.q, [0, 1, 0]);
    const blocked = run.limits.blocked,
      closing = flight.docking!.closureSpeed?.value ?? 0.5 * 0.3048;
    const range = blocked ? op.hold.value : Math.min(op.hold.value, run.limits.stroke + Math.max(0, flight.docking!.at - run.t) * closing);
    const speed = !blocked && range < op.hold.value ? -closing : 0;
    const remaining = Math.max(5, op.station - run.t);
    const target = add(b.r, scale(axis, b.port + a.port + range));
    const velocity = add(b.v, scale(axis, speed));
    const control = scale(add(scale(sub(target, a.r), 6 / (remaining * remaining)), scale(sub(velocity, a.v), 4 / remaining)), a.mass);
    const cap = 2 * flight.docking!.controls.ahead.value;
    push = length(control) > cap ? scale(control, cap / length(control)) : control;
  }
  return unturn(a.q, push);
}
