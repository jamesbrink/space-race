import type { OrbitalFix } from '../types/flight.ts';
import type { Flight } from '../types.ts';
import { type EarthFrame, frameOf } from '../world/earthframe.ts';
import { add, cross, DEG, geodeticToEcef, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { coast, type State } from '../world/orbit.ts';
import { type DockBody, DockPair } from './docking.ts';
import { dockPlan } from './dockplan.ts';
import { aboutAxis, conjugate, IDENTITY, multiply, turn, unturn } from './rigid.ts';

/**
 * A tracking fix of the record's as a state at `at`, s from liftoff, in the flight's frame (world/earthframe.ts
 * `frameOf`, the one every flown run is in): the place over the Earth laid in the frame by the Earth's angle in it at
 * the fix's instant, the velocity built on it, and the state coasted from the fix to `at` under the Earth's gravity
 * with J2 (world/orbit.ts, the flown runs' own; no air). Space-fixed heading and flight-path angle are defined relative
 * to the geocentric horizontal, even though the reported latitude and height are geodetic (Apollo 9 MR, table 7-I).
 */
export function orbitalFix(fix: OrbitalFix, frame: EarthFrame, at: number): State {
  const earth = geodeticToEcef({ latitude: fix.latitude.value, longitude: fix.longitude.value, height: fix.height.value });
  const r = frame.toInertial(earth, fix.t.value),
    up = unit(r),
    east = unit(cross([0, 0, 1], up)),
    north = cross(up, east);
  const heading = DEG * fix.heading.value,
    path = DEG * fix.flightPath.value;
  const horizontal = add(scale(north, Math.cos(heading)), scale(east, Math.sin(heading)));
  const v = scale(add(scale(horizontal, Math.cos(path)), scale(up, Math.sin(path))), fix.speed.value);
  return coast({ r, v }, at - fix.t.value);
}

/** An interactive terminal approach near the recorded encounter. The unpublished relative state, inertias and
 * capture tolerances are training assumptions. The documented insertion orbit supplies the reference plane. */
export function terminalApproach(flight: Flight, redock = false, transpose = false) {
  const mission = flight.docking!;
  // Every physical Measure in the operating plan must be eligible for simulation.
  function check(input: unknown) {
    if (!input || typeof input !== 'object') return;
    if ('confidence' in input && 'value' in input) {
      if (input.confidence === 'estimated' || !Number.isFinite(input.value))
        throw Error('Unsupported orbital operation input: ' + ('source' in input ? input.source : 'unknown'));
      return;
    }
    for (const child of Object.values(input)) check(child);
  }
  check(mission);
  const apollo = mission.interface === 'probe';
  const plan = dockPlan(flight, redock);
  const [mass0, mass1] = plan.craft.map((c) => c.mass.value);
  const stroke = apollo ? flight.models[0].dockingPorts?.find((p) => p.role === 'probe')?.captureTravel.value : 6 * 0.0254;
  if (!stroke) throw Error('Missing probe stroke');
  const range = mission.interface === 'shrouded' ? 60 * 0.3048 : 2;
  // MSC-PA-R-69-2 §5.6 p.5-17, and TN D-6854 table II: first and second LM dockings.
  // Gemini SP-138, docking system design and flight performance, typical closure 0.5 ft/s.
  const closing =
    mission.closureSpeed?.value ?? (apollo ? (redock ? 0.1 : 0.3) * 0.3048 : mission.interface === 'shrouded' ? 0 : 0.5 * 0.3048);
  const end = redock ? 99 * 3600 + 2 * 60 + 26 : mission.at;
  const trans = transpose && !redock ? mission.transpose : undefined;
  const start = trans?.at ?? end - (closing ? range / closing : 0);
  const fix = mission.fixes?.[redock ? 1 : 0];
  if (!fix) throw Error('No orbital fix for this docking');
  const orbit = orbitalFix(fix, frameOf(flight), start);
  const properties = mission.massProperties?.[redock ? 1 : 0];
  if (!properties || properties.length !== 2) throw Error('No mass properties for the docking vehicles');
  const body = (mass: number, i: number): DockBody => {
    const p = properties[i]!;
    return {
      ...orbit,
      mass,
      port: p.arm.value,
      inertia: [p.inertia[0].value, p.inertia[1].value, p.inertia[2].value],
      q: IDENTITY,
      w: [0, 0, 0],
    };
  };
  const a = body(mass0, 0),
    b = body(mass1, 1);
  a.q = aboutAxis([0, 0, 1], Math.PI);
  const gap = a.port + b.port + range + stroke;
  if (trans) {
    // Roll datum before transposition is 60 degrees from the final keyed docking orientation.
    a.q = aboutAxis([0, 1, 0], trans.roll.value * DEG);
    a.r = add(b.r, [0, b.port + trans.startGap.value - a.port, 0]);
  } else if (redock) {
    b.r = add(a.r, [0, -gap, 0]);
    b.v = add(a.v, [0, closing, 0]);
  } else {
    a.r = add(b.r, [apollo ? 3.2 * 0.0254 : 0, gap, 0]);
    a.v = add(b.v, [0, -closing, 0]);
  }
  const run = new DockPair(
    a,
    b,
    {
      stroke,
      // Apollo TN D-6854, Requirements, and NTRS 19680015975 p.167, Gemini docking requirements.
      // Ten degrees of roll here is measured relative to the two already keyed mating frames.
      radius: 0.3048,
      tilt: (10 * Math.PI) / 180,
      roll: (10 * Math.PI) / 180,
      closing: 0.3048,
      sideways: 0.5 * 0.3048,
      angular: Math.PI / 180,
      retract: mission.retractTime?.value ?? (apollo ? (redock ? 5 : 10) : 6),
      blocked: mission.interface === 'shrouded',
    },
    start,
  );
  run.plan = plan;
  if (mission.carrier && !redock) {
    const { mass, arm, inertia } = mission.carrier;
    run.mountTarget(mass.value, arm.value, [inertia[0].value, inertia[1].value, inertia[2].value]);
  }
  return run;
}

/** Start a recorded docked burn. A measured duration gives average delivered thrust;
 * otherwise the published nominal thrust and measured Δv give its effective duration. */
export function startDockedBurn(run: DockPair, burn: NonNullable<NonNullable<Flight['docking']>['burns']>[number]) {
  if (!run.coastToBurn(burn.at, burn.yaw.value * DEG, burn.pitch.value * DEG)) return null;
  const m = run.bodies[0].mass + run.bodies[1].mass;
  const duration = burn.duration?.value ?? (m * burn.deltaV.value) / burn.thrust.value;
  return { until: run.t + duration, thrust: (m * burn.deltaV.value) / duration };
}

/** Enter the recorded rotational exercise once the last docked burn has finished. The two vehicles
 * are already at full extension, with the first measured rate. Their subsequent travel is integrated. */
export function startTether(run: DockPair, tether: NonNullable<NonNullable<Flight['docking']>['tether']>) {
  if (!run.coastToBurn(tether.at, 0, 0) || !run.undock(0)) return false;
  const [a, b] = run.bodies,
    m = a.mass + b.mass;
  const separation = turn(b.q, [0, tether.length.value, 0]);
  a.r = add(a.r, scale(separation, b.mass / m));
  b.r = add(b.r, scale(separation, -a.mass / m));
  const spin = turn(b.q, [tether.rotation.value, 0, 0]);
  const relative = cross(spin, sub(a.r, b.r));
  a.v = add(a.v, scale(relative, b.mass / m));
  b.v = add(b.v, scale(relative, -a.mass / m));
  a.w = unturn(a.q, spin);
  b.w = unturn(b.q, spin);
  run.tetherLength = tether.length.value;
  return true;
}

/** Reconstruct the recorded departure and 180° pitch/60° roll; station-keep during the valve checks,
 * then approach at the film-derived rate. This controller reproduces the recorded operations, not the crew's unrecorded valve commands. */
export function transpositionInput(run: DockPair, flight: Flight): { force: Vec3; torque: Vec3 } {
  const mission = flight.docking!,
    t = mission.transpose!,
    [a, b] = run.bodies,
    age = run.t - t.at;
  const elapsedToEnd = mission.at - run.t;
  const closing = 0.3 * 0.3048,
    plane = [0, 1, 0] as const;
  const targetRing = add(b.r, turn(b.q, [0, b.port, 0]));
  const rel = sub(a.r, targetRing);
  const separation = a.port + t.standOff.value;
  const backedAway = t.startGap.value - a.port + t.departing.value * (Math.max(0, age - 5) + Math.min(5, Math.max(0, age)) ** 2 / 10);
  const finalDistance = a.port + run.limits.stroke + Math.max(0, elapsedToEnd) * closing;
  const desired = Math.min(separation, backedAway, finalDistance);
  const speed = desired === finalDistance ? -closing : desired === separation ? 0 : t.departing.value * Math.min(1, age / 5);
  const point = [0.08128 * Math.max(0, Math.min(1, 1 - elapsedToEnd / 200)), desired, 0] as const;
  const accel = add(scale(sub(point, rel), 0.1), scale(sub(scale(plane, speed), sub(a.v, b.v)), 0.65));
  const force = unturn(a.q, scale(accel, a.mass));
  const max = 4 * mission.controls.ahead.value;
  const pitch = age < t.turnAfter.value ? 0 : Math.PI;
  const key = age < t.turnAfter.value || Math.abs(a.q[0]) > 0.1 ? t.roll.value * DEG : 0;
  const goal = multiply(aboutAxis([0, 0, 1], pitch), aboutAxis(plane, key));
  const error = multiply(conjugate(a.q), goal);
  const cap = 2 * mission.controls.attitude.value * a.port;
  const torque: Vec3 = [0, 1, 2].map((i) =>
    Math.max(-cap, Math.min(cap, a.inertia[i] * (0.12 * Math.sign(error[0] || 1) * error[i + 1] - 0.85 * a.w[i]))),
  ) as unknown as Vec3;
  return { force: length(force) > max ? scale(force, max / length(force)) : force, torque };
}

/** The intermittent then continuously firing Gemini VIII chamber. The disturbance is a force at a
 * lever arm, so an undock changes the spin acceleration without changing either craft's angular velocity. */
export function faultInput(run: DockPair, flight: Flight, enabled: boolean) {
  const fault = flight.docking!.fault!;
  const age = run.t - fault.at;
  const on = enabled && age >= 0 && (age < fault.firstPulse || age >= fault.firstPulse + fault.pause) && run.t < fault.isolate;
  const push = on ? fault.force.value : 0;
  const backing = run.phase === 'free' && run.t >= fault.undock && run.t < fault.undock + fault.backAway;
  const force: Vec3 = [push, backing ? -2 * flight.docking!.controls.astern.value : 0, 0];
  const torque: Vec3 = [0, -fault.rollArm.value * push, -fault.axialArm.value * push];
  return { force, torque, on };
}
