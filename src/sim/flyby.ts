/** Gemini X revisited a second, passive spacecraft. All three vehicles retain their own inertial states. */
import type { Flight } from '../types.ts';
import { add, cross, length, scale, sub, unit, DEG, type Vec3 } from '../world/frames.ts';
import { coast, step, type State } from '../world/orbit.ts';
import { EARTH } from '../world/bodies.ts';
import { aboutAxis, fromAxes, multiply, turn, unturn } from './rigid.ts';
import { DockPair } from './docking.ts';

type Visit = NonNullable<NonNullable<Flight['docking']>['visit']>;
const axes = (state: State) => {
  const up = unit(state.r),
    left = unit(cross(state.r, state.v));
  return { up, left, forward: cross(left, up) };
};
function heading(s: State, pitch: number, yaw: number) {
  const { up, left, forward } = axes(s);
  return add(
    scale(up, Math.sin(pitch * DEG)),
    scale(add(scale(forward, Math.cos(yaw * DEG)), scale(left, -Math.sin(yaw * DEG))), Math.cos(pitch * DEG)),
  );
}

/** Propagate through measured OAMS corrections, with fixed inertial pointing during each short firing. */
function maneuver(state: State, time: number, burn: Visit['corrections'][number]) {
  let now = coast(state, burn.at - time);
  const acceleration = scale(heading(now, burn.pitch.value, burn.yaw.value), burn.dv.value / burn.duration.value);
  for (let t = 0; t < burn.duration.value; t += 1) now = step(now, burn.at + t, Math.min(1, burn.duration.value - t), () => acceleration);
  return now;
}

export function startVisit(run: DockPair, visit: Visit) {
  if (run.phase !== 'hard' || run.t > visit.shaping[0]!.at) return null;
  for (const firing of visit.shaping) {
    // Gemini reports yaw positive to the right of the flight track; the simulator uses the positive orbit normal.
    if (!run.coastToBurn(firing.at, -firing.yaw.value * DEG, firing.pitch.value * DEG)) return null;
    const mass = run.bodies[0].mass + run.bodies[1].mass;
    run.advance(firing.duration.value, 1, [0, (mass * firing.dv.value) / firing.duration.value, 0]);
  }
  if (!run.coastToBurn(visit.separate, Math.PI, 0) || !run.undock(0)) return null;
  const [ship, own] = run.bodies;
  let state: State = ship,
    time = run.t;
  for (const burn of visit.corrections) {
    state = maneuver(state, time, burn);
    time = burn.at + burn.duration.value;
  }
  Object.assign(ship, coast(state, visit.at - time));
  Object.assign(own, coast(own, visit.at - run.t));
  const { up, forward, left } = axes(ship);
  const optical = add(scale(forward, Math.cos(visit.elevation.value * DEG)), scale(up, Math.sin(visit.elevation.value * DEG)));
  const r = add(ship.r, scale(optical, visit.range.value)),
    radial = unit(r);
  // The optical observation gives position only. The passive target is in the reported nearly circular, coplanar orbit.
  const v = scale(unit(cross(left, radial)), Math.sqrt(EARTH.gm.value / length(r)));
  const dormant = { ...own, r, v, mass: visit.mass.value, q: fromAxes(left, radial, cross(left, radial)), w: [0, 0, 0] as Vec3 };
  const pair = new DockPair(ship, dormant, { ...run.limits, blocked: true }, visit.at);
  pair.released = own;
  return pair;
}

/** The reported optical midcourses are finite firings; the crew's final intermittent braking
 * commands were not telemetered valve by valve. A bounded feedback law represents those commands. */
export function flybyInput(run: DockPair, visit: Visit, thrust: number) {
  const [a, b] = run.bodies;
  let force: Vec3 = [0, 0, 0];
  for (const burn of visit.terminal) {
    if (run.t >= burn.at && run.t < burn.at + burn.duration.value)
      force = scale(heading(a, burn.pitch.value, burn.yaw.value), (a.mass * burn.dv.value) / burn.duration.value);
  }
  if (run.t >= visit.brake) {
    const desired = add(b.r, turn(b.q, [0, -b.port, visit.radius.value + visit.gap.value + a.port]));
    const d = sub(desired, a.r),
      v = sub(b.v, a.v);
    const remaining = Math.max(2, visit.hold - run.t);
    // Constant-acceleration arrival with zero relative speed, bounded by paired translation thrusters.
    const wish = scale(add(scale(d, 6 / (remaining * remaining)), scale(v, 4 / remaining)), a.mass);
    force = length(wish) > thrust ? scale(wish, thrust / length(wish)) : wish;
  }
  return unturn(a.q, force);
}

/** Chapter of the EVA uses the crew's observed longitudinal angle and close stand-off.
 * The original target still coasts from its separation state. */
export function stationKeep(run: DockPair, visit: Visit) {
  if (!run.released || run.t > visit.eva) return false;
  const [a, b] = run.bodies,
    dt = visit.eva - run.t;
  Object.assign(b, coast(b, dt));
  Object.assign(run.released, coast(run.released, dt));
  a.q = multiply(b.q, aboutAxis([1, 0, 0], -visit.attitude.value * DEG));
  a.r = sub(add(b.r, turn(b.q, [0, -b.port, visit.radius.value + visit.gap.value])), turn(a.q, [0, a.port, 0]));
  a.v = [...b.v];
  a.w = [0, 0, 0];
  run.t = visit.eva;
  return true;
}
