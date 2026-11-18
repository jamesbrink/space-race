/** A capsule pulled clear by a solid escape motor before handing over to its own landing system. */
import { derived } from '../measure.ts';
import { G0 } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, angleBetween, cross, DEG, dot, type Geodetic, geodeticToEcef, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { elementsOf, type State, step } from '../world/orbit.ts';
import { airAt, airDrag } from './air.ts';
import { isBreakupImpact } from './breakup.ts';
import type { Impact } from './contact.ts';
import { coastEvents, flyDown, flyOrbit, heightsBall, shipOf } from './orbital.ts';
import type { FlightPlan, ServiceAbort, TowerEscape } from './plan.ts';
import { flowOf, givenUp, partingAt } from './staged.ts';

export interface EscapeState extends State {
  t: number;
  axis: Vec3;
  thrust: number;
  g: number;
  q: number;
  mach: number;
  mass: number;
  impact?: Impact;
}

/** Sweep a rounded piece of the escape assembly against posed pad geometry. */
export type EscapeSweep = (
  from: { t: number; r: Vec3 },
  to: { t: number; r: Vec3 },
  radius: number,
) => { fraction: number; normal: Vec3; obstacle: NonNullable<TowerEscape['hull']>['obstacles'][number] } | null;

/**
 * The boost cover and tower stay on through the towerMode. The capped motor curve here uses mean
 * thrust and uniform propellant depletion. A commanded low-altitude pitch and the aerodynamic
 * turnaround are represented by bounded attitude laws, not a rigid-body reconstruction.
 */
export function launchEscape(
  plan: FlightPlan,
  towerMode: TowerEscape,
  start: { t: number; r: Vec3; v: Vec3; axis: Vec3 },
  frame: EarthFrame,
  seaLevel: number,
  sweep?: EscapeSweep,
) {
  const engine = plan.craft[0]!.engines.find((item) => item.id === towerMode.engine)!;
  const tower = plan.craft[0]!.bodies.find((item) => item.id === engine.body)!;
  const capsule = plan.craft[0]!.bodies.find((item) => item.aero)!;
  const burn = engine.burn!.value;
  const thrust = engine.thrust.vacuum.value;
  const pitch = start.t < towerMode.pitch.until.value ? towerMode.pitch.angle.value * DEG : 0;
  const turnAt = start.t + towerMode.canards.value;
  const early = start.t + towerMode.jettison.after.value;
  const east = unit(cross(frame.spin, start.r));
  const preTurn = unit(sub(east, scale(start.axis, dot(east, start.axis))));
  const atmosphere = (s: State, t: number) => airAt(frame, s.r, s.v, t, seaLevel);
  let axis = start.axis;
  let turned: { axis: Vec3; at: number } | null = null;
  const steer = (t: number): Vec3 => {
    const by = pitch * Math.min(1, Math.max(0, (t - start.t) / towerMode.pitch.takes.value));
    return add(scale(start.axis, Math.cos(by)), scale(preTurn, Math.sin(by)));
  };
  const massAt = (t: number) => capsule.mass.value + tower.mass.value - towerMode.propellant.value * Math.min(1, (t - start.t) / burn);
  const push = (s: State, t: number, lit: boolean) => {
    const { wind, air, airspeed } = atmosphere(s, t);
    const drag = airDrag(wind, airspeed, air.density, towerMode.dragArea.value);
    return scale(lit ? add(drag, scale(steer(t), thrust)) : drag, 1 / massAt(t));
  };
  const samples: EscapeState[] = [];
  let state: State = { r: start.r, v: start.v };
  let t = start.t;
  const take = (impact?: Impact) => {
    const { q, mach } = atmosphere(state, t);
    const lit = !impact?.activeBroken && t < start.t + burn - 1e-9;
    samples.push({ ...state, t, axis, thrust: lit ? thrust : 0, mass: massAt(t), g: length(push(state, t, lit)) / G0, q, mach, impact });
  };
  take();
  while (t - start.t < 1_200) {
    const lit = t < start.t + burn - 1e-9;
    const h = atmosphere(state, t).altitude;
    const at = Math.min(t + 0.1, lit ? start.t + burn : Infinity, t < early - 1e-9 ? early : Infinity);
    const previous = state;
    const before = t;
    const oldAxis = axis;
    state = step(state, t, at - t, (s, time) => push(s, time, lit));
    t = at;
    const air = atmosphere(state, t);
    const falling = air.altitude < h;
    if (t >= turnAt && air.mach <= towerMode.turn.mach.value && !turned && air.airspeed > 1)
      turned = { axis: scale(unit(air.wind), -1), at: t };
    if (turned) {
      // Turn without interpolating a zero-length axis when a pad ascent turns back through 180 degrees.
      const aim = steer(t);
      const progress = Math.min(1, (t - turned.at) / towerMode.turn.takes.value);
      const middle = dot(aim, turned.axis) < -0.95 ? preTurn : unit(add(aim, turned.axis));
      axis =
        progress < 0.5
          ? unit(add(scale(aim, 1 - 2 * progress), scale(middle, 2 * progress)))
          : unit(add(scale(middle, 2 - 2 * progress), scale(turned.axis, 2 * progress - 1)));
    } else axis = steer(t);
    if (sweep && towerMode.hull) {
      const hull = towerMode.hull;
      let hit: ReturnType<EscapeSweep> = null;
      let speed = 0;
      for (const { station, radius } of hull.spheres) {
        const from = { t: before, r: add(previous.r, scale(oldAxis, station.value)) };
        const to = { t, r: add(state.r, scale(axis, station.value)) };
        const contact = sweep(from, to, radius.value);
        if (contact && (!hit || contact.fraction < hit.fraction)) {
          const flight = scale(sub(to.r, from.r), 1 / (t - before));
          const closing = -dot(frame.overGround(to.r, flight), contact.normal);
          if (closing > 1e-3) {
            hit = contact;
            speed = closing;
          }
        }
      }
      if (hit) {
        const dt = (t - before) * hit.fraction;
        state = step(previous, before, dt, (s, time) => push(s, time, lit));
        t = before + dt;
        axis = unit(add(scale(oldAxis, 1 - hit.fraction), scale(axis, hit.fraction)));
        const impact: Impact = { on: hit.obstacle.node, name: hit.obstacle.name, t, speed, energy: 0.5 * massAt(t) * speed ** 2 };
        if (isBreakupImpact(impact)) {
          // Leave a failed escape at the strike pose. Structural deformation and falling debris are unmodelled.
          state.v = cross(frame.spin, state.r);
          take({ ...impact, activeBroken: true });
          break;
        }
        // Frictionless, inelastic slide against a fixed structure. Separate by a small clearance
        // so the next sweep can distinguish new contact from the one just resolved.
        state = { r: add(state.r, scale(hit.normal, 0.005)), v: add(state.v, scale(hit.normal, speed)) };
        take(impact);
        continue;
      }
    }
    take();
    if (t >= early - 1e-9 && falling && air.altitude <= towerMode.jettison.height.value) break;
  }
  return samples;
}

/** Start the ordinary capsule descent at the tower's release, giving the low abort its own timers. */
export function planAfterEscape(plan: FlightPlan, towerMode: TowerEscape, jettison: number): FlightPlan {
  const out = partingAt(givenUp(plan), jettison);
  delete out.record!.coastFixes;
  // On the low-altitude abort the mains must still wait for the drogues. Model the quoted
  // fourteen seconds of low-altitude sequencing as a minimum delay from forward-cover release.
  const mains = out.events.find((e) =>
    e.do.some((a) => 'deploy' in a && out.craft[0]!.chutes.find((c) => c.id === a.deploy)?.instead?.length),
  );
  const cover = out.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === towerMode.cover));
  if (cover) {
    cover.when = cover.when.map((w) => ('height' in w ? { ...w, height: 0 } : w));
    if (mains) mains.when.push({ after: cover.id, wait: towerMode.mainsAfterCover.value });
  }
  return out;
}

/** Give a separated spacecraft its abort translation before the service module is released. */
export function withEscapeTranslation(plan: FlightPlan, engine: string, at: number, duration: number, axis: Vec3): FlightPlan {
  const out = partingAt(givenUp(plan), at + duration);
  delete out.record!.coastFixes;
  const held = 'abort-translation-axis';
  const source = plan.record?.aborts?.find((mode) => mode.escape?.separate?.motor?.engine === engine)?.until.source ?? 'Abort procedure';
  out.attitude.push({
    id: held,
    label: 'Abort translation axis',
    source,
    hold: { aim: 'fixed', vector: axis, sense: 1, confidence: 'derived' },
  });
  out.events.push(
    {
      id: 'abort-translation',
      label: 'Service module escape translation',
      when: [{ time: at }],
      do: [{ attitude: held }, { ignite: engine }],
      automatic: true,
      source,
    },
    {
      id: 'abort-translation-cutoff',
      label: 'Service module escape translation complete',
      when: [{ time: at + duration }],
      do: [{ cut: engine }],
      automatic: true,
      source,
    },
  );
  return out;
}

/**
 * Reconstruct the late aborts using the plan's SPS and reserve. The fixed-axis burn
 * is solved from the launch vehicle's actual state. The Apollo guidance programs
 * and target tables are not available, so this solves for the published range
 * or a stated perigee target with the ordinary simulator.
 */
export function withServiceAbort(
  plan: FlightPlan,
  mode: ServiceAbort,
  from: State & { t: number },
  axis: Vec3,
  frame: EarthFrame,
  site: Geodetic,
  seaLevel: number,
): { plan: FlightPlan; duration: number; achieved: number } {
  const base = withEscapeTranslation(plan, mode.translation.engine, from.t, mode.translation.duration.value, axis);
  const longer = mode.goal.kind === 'orbit';
  const target = mode.goal.target.value;
  const engine = base.craft[0]!.engines.find((e) => e.id === mode.engine)!;
  const tank = base.craft[0]!.tanks.find((t) => engine.tanks.includes(t.id))!;
  const burnAt = from.t + mode.translation.duration.value;
  const flow = flowOf(engine) * engine.count;
  const vExhaust = engine.isp!.vacuum.value * G0;
  const mass = mode.mass.value;
  const reserve = longer ? mass * -Math.expm1(-engine.deltaV!.value / vExhaust) : 0;
  const maximum = Math.max(0, ((tank.usable ?? tank.load).value - reserve) / flow);
  base.record!.orbit!.mass = mode.mass;
  // The recorded manual entry guidance was clocked to eleven days after launch.
  // The contingency entry keeps the lift-up setting of the retimed module separation.
  const banks = new Set(base.attitude.filter((hold) => 'bank' in hold.hold).map((hold) => hold.id));
  base.events = base.events.filter(
    (event) =>
      event.do.some((action) => 'separate' in action) || !event.do.some((action) => 'attitude' in action && banks.has(action.attitude)),
  );
  const pad = geodeticToEcef(site);
  const radius = heightsBall(base, site);
  const source = 'Abort burn solved from the live separation state, SPS thrust and impulse, and the target in the flight plan';
  const prepare = (duration: number) => {
    const at = burnAt + duration;
    const branch = partingAt(base, longer ? Number.MAX_SAFE_INTEGER : at);
    if (duration <= 1e-6) return branch;
    const held = 'abort-service-axis';
    branch.attitude.push({
      id: held,
      label: 'SPS abort attitude',
      source,
      hold: { aim: 'velocity', sense: longer ? 1 : -1, confidence: 'derived' },
    });
    const delivered = -vExhaust * Math.log1p((-flow * duration) / mass);
    const deorbit = coastEvents(branch).on;
    branch.events.splice(
      branch.events.indexOf(deorbit!),
      0,
      {
        id: 'abort-service-ignition',
        label: 'SPS abort firing',
        when: [{ time: burnAt }],
        do: [{ attitude: held }, { ignite: mode.engine, flown: derived(delivered, source) }],
        automatic: true,
        source,
      },
      { id: 'abort-service-cutoff', label: 'SPS abort cutoff', when: [{ time: at }], do: [{ cut: mode.engine }], automatic: true, source },
    );
    return branch;
  };
  const evaluate = (duration: number): number => {
    const branch = prepare(duration);
    const stop = longer ? (shipOf(branch).moves.find((move) => move.engine === mode.engine)?.off ?? burnAt) : Infinity;
    const coast = flyOrbit(branch, site, frame, seaLevel, 120, from, undefined, undefined, false, stop);
    if (longer) {
      const at = coast.samples.at(-1);
      if (!at) return -Infinity;
      const orbit = elementsOf(at.r, at.v);
      return orbit.a * (1 - orbit.e) - radius;
    }
    const last = coast.samples.at(-1)!;
    if (last.phase !== 'down') return Infinity;
    const descent = flyDown(branch, frame, seaLevel, last);
    const landing = Object.values(descent.landed)[0];
    if (!landing) return Infinity;
    return angleBetween(pad, geodeticToEcef({ ...landing, height: 0 })) * radius;
  };

  // Search the available burn durations using the direction permitted by the
  // chosen mode. If the goal cannot be reached, keep the closest endpoint.
  const lightest = longer ? 0 : Math.min(0.5, maximum);
  let lower = lightest;
  let upper = maximum;
  const lo = evaluate(lower);
  const residual = (value: number) => (longer ? value - target : target - value);
  if (residual(lo) >= 0) return { plan: prepare(lower), duration: lower, achieved: lo };
  const hi = evaluate(upper);
  if (residual(hi) < 0) return { plan: prepare(upper), duration: upper, achieved: hi };
  while (upper - lower > 0.05) {
    const mid = (lower + upper) / 2;
    const value = evaluate(mid);
    if (residual(value) >= 0) upper = mid;
    else lower = mid;
  }
  return { plan: prepare(upper), duration: upper, achieved: evaluate(upper) };
}
