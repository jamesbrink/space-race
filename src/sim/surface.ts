/**
 * A lander's legs on the ground of a body: the lunar module's touchdown (Architecture 5). Nothing here knows a flight: the
 * gear is the plan's (`Craft.gear`, sim/plan.ts `GearDef`), the ground a `Ground`, the body's mass properties the record's.
 *
 * The ground (`Ground`): the surface of a body as heights over its sphere and the surface's normal, at a place fixed on the
 * body (its own frame, turning with it): a landing site's `LandingGround` (world/lunar-ground.ts: the nested grids round the
 * LM and the strip along the descent's track) through `bodyGround`, its slope read over `SLOPE`; a sphere or a tilted plane
 * for a test (`sphereGround`, `planeGround`).
 *
 * The lander (`LanderState`): the craft as a rigid body near the ground, flown in the body's fixed frame (its centre of mass
 * and its velocity over the ground, its attitude and body rates), under gravity, the engine's thrust along its +X, its jets'
 * torque (sim/attitude.ts `jetsFor`, as the autopilot or the hand works them) and its legs. Each leg is a footpad on a
 * crushable primary strut: pushed into the ground the pad meets it along the surface's normal, elastically at the gear's
 * stiffness and damping until the strut's load along its axis reaches what its honeycomb crushes at, then plastically at
 * that load, the strut stroking up its axis and keeping the stroke (the stages of `LegDef.crush`: the lunar module's 4,500
 * and 9,500 lb cartridges over 32 in, NASA TN D-6850, fig. 7). Past its last stage a strut is bottomed and stands any load.
 * Across the surface a pad is held where it touched by the gear's stiffness and damping, sideways as down, until that
 * holding asks more than `friction` times its load; then it slides against that (`LanderState.anchors`: where each is held). The work the struts take is kept (`crushed`), so
 * the energy the touchdown brought can be held to it.
 *
 * The contact light: each probe (`GearDef.probe`) hangs `length` below its footpad along the body's -X; the instant the tip of
 * the first reaches the ground the lamp is lit (`lamp`), as the probes' switches lit the lunar contact lights.
 *
 * Tip-over is the rigid body on its pads: nothing decides it but the forces. It has toppled past `TOPPLED` off the local
 * vertical. At rest (`STILL`, for `RESTS` seconds) it has landed (`Landed`): from then it is held where it stands on
 * the body, turning with it (`moonFixed`'s `toFlight` gives its state in the flight's frame at any instant), which is the
 * state an ascent starts from. What it met the ground with, at the first footpad's touch (`Touch`), is held to the gear's
 * limits by sim/verdict.ts `landingVerdict`.
 *
 * Estimated, and ours: `SUB`, the step the contact is flown at; `STILL`, `RESTS` and `TOPPLED`. Simplified: the leg's push is along the surface's normal at its pad (the
 * secondary struts' share, and the pad's own penetration of the soil, are not flown); a footpad is a point; the frame's own
 * turn (the Moon's, 2.7e-6 rad/s) is in the motion of the centre of mass (Coriolis and centrifugal) and not in Euler's
 * equations; the engine's thrust is along the body's +X through the centre of mass (the descent engine's gimbal trim is not
 * flown) and nothing amplifies it near the ground; the jets' plumes on the surface push nothing.
 */
import { MOON } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, cross, DEG, dot, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import type { BodyGround } from '../world/lunar-ground.ts';
import { meanEarthAxes, selenographic } from '../world/moon.ts';
import { type Attitude, type AttitudeControls, type AttitudeState, attitudeOf, inertiaAt, jetsFor } from './attitude.ts';
import type { FlightPlan, GearDef, LandingLimits } from './plan.ts';
import { conjugate, eulerOf, fromAxes, multiply, normalize, type Quat, spin, turn, unturn } from './rigid.ts';

/** The step the legs are flown at, s: a fiftieth of the period of the lander on its legs' stiffness (estimated). */
export const SUB = 1 / 1024;
/** m: the step over which the ground's slope is read for its normal (estimated: finer than a footpad, which is 0.94 m across). */
export const SLOPE = 0.5;
/** m/s and rad/s: slower than these it is still (estimated). */
export const STILL = { speed: 0.02, rate: 0.002 };
/** s of being still after which it has landed (estimated). */
export const RESTS = 1;
/** Degrees off the local vertical past which it has toppled (estimated: further than any lander stands, short of on its side). */
export const TOPPLED = 60;

/** The surface of a body at a place fixed on it: its height over the body's sphere, m, and its outward normal, a unit vector in the body's frame. */
export interface Ground {
  /** The sphere the heights are over, m. */
  readonly radius: number;
  at(p: Vec3): { height: number; normal: Vec3 };
}

/** The local vertical, east and north at a place on a body, from its centre. */
function axesAt(p: Vec3): { up: Vec3; east: Vec3; north: Vec3 } {
  const up = unit(p);
  const e = cross([0, 0, 1], up);
  const east = length(e) < 1e-12 ? ([0, 1, 0] as Vec3) : unit(e);
  return { up, east, north: cross(up, east) };
}

/** A body's ground (world/lunar-ground.ts `BodyGround`, by selenographic latitude and longitude) as a `Ground`: its normal from its slope over `SLOPE`. */
export function bodyGround(g: BodyGround, radius: number = MOON.equatorialRadius.value): Ground {
  const heightAt = (p: Vec3): number => {
    const { latitude, longitude } = selenographic(p);
    return g.height(latitude, longitude);
  };
  return {
    radius,
    at(p) {
      const { up, east, north } = axesAt(p);
      const h = heightAt(up);
      const k = SLOPE / radius;
      const de = (heightAt(add(up, scale(east, k))) - heightAt(sub(up, scale(east, k)))) / (2 * SLOPE);
      const dn = (heightAt(add(up, scale(north, k))) - heightAt(sub(up, scale(north, k)))) / (2 * SLOPE);
      return { height: h, normal: unit(sub(sub(up, scale(east, de)), scale(north, dn))) };
    },
  };
}

/** The body's sphere at `height` over its radius: level everywhere. */
export function sphereGround(radius: number, height = 0): Ground {
  return { radius, at: (p) => ({ height, normal: unit(p) }) };
}

/**
 * A plane through the place at `height` over the sphere, tilted `slope` degrees down toward `downhill` (degrees from the
 * body's north through east): a slope of a stated steepness, for a test.
 */
export function planeGround(
  radius: number,
  place: { latitude: number; longitude: number },
  height: number,
  slope: number,
  downhill: number,
): Ground {
  const [la, lo] = [place.latitude * DEG, place.longitude * DEG];
  const up: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const { east, north } = axesAt(up);
  const down = add(scale(north, Math.cos(downhill * DEG)), scale(east, Math.sin(downhill * DEG)));
  const normal = unit(add(scale(up, Math.cos(slope * DEG)), scale(down, Math.sin(slope * DEG))));
  const through = scale(up, radius + height);
  return {
    radius,
    at(p) {
      const d = unit(p);
      return { height: dot(normal, through) / dot(normal, d) - radius, normal };
    },
  };
}

/** One leg as it is flown: `LegDef`'s figures, and the probe it carries, m (0: none). */
export interface Leg {
  id: string;
  label: string;
  pad: Vec3;
  strut: Vec3;
  crush: { until: number; load: number }[];
  probe: number;
}

/** The gear as it is flown, from its plan (`GearDef`). */
export interface Gear {
  legs: Leg[];
  friction: number;
  stiffness: number;
  damping: number;
  limits: LandingLimits;
}

export function gearOf(def: GearDef): Gear {
  const probe = def.probe?.length.value ?? 0;
  return {
    legs: def.legs.map((l) => ({
      id: l.id,
      label: l.label,
      pad: l.pad,
      strut: unit(l.strut),
      crush: l.crush.map((c) => ({ until: c.until.value, load: c.load.value })),
      probe: def.probe?.on.includes(l.id) ? probe : 0,
    })),
    friction: def.friction.value,
    stiffness: def.stiffness.value,
    damping: def.damping.value,
    limits: def.limits,
  };
}

/** The load a strut crushes at with `stroke` taken, N: Infinity once it is bottomed. */
export function crushAt(leg: Leg, stroke: number): number {
  for (const c of leg.crush) if (stroke < c.until) return c.load;
  return Infinity;
}

/** How far a strut strokes before it is bottomed, m. */
export const strokeOf = (leg: Leg): number => leg.crush.at(-1)!.until;

/** What it met the ground with, as its first footpad touched. */
export interface Touch {
  t: number;
  /** Its centre of mass's speed down the local vertical and across it, m/s. */
  vertical: number;
  horizontal: number;
  /** The ground's slope under it, and the body's +X off the local vertical, degrees; its fastest body rate, deg/s. */
  slope: number;
  tilt: number;
  rate: number;
}

/** Where it came to rest on the body, held there from `t`: its centre of mass and attitude in the body's frame. */
export interface Landed {
  t: number;
  p: Vec3;
  q: Quat;
  /** The place under it, degrees, and its height over the sphere, m; the body's +X off the local vertical, degrees. */
  latitude: number;
  longitude: number;
  height: number;
  tilt: number;
}

export interface LanderState {
  t: number;
  /** Its centre of mass and its velocity in the body's fixed frame (over the ground), m and m/s. */
  p: Vec3;
  u: Vec3;
  /** Body to the fixed frame; body rates over the fixed frame, rad/s, in the body's axes. */
  q: Quat;
  w: Vec3;
  mass: number;
  /** Each leg's stroke, m, and the load along its strut now, N. */
  strokes: readonly number[];
  loads: readonly number[];
  /** Where each footpad is held on the ground while it touches (null: off it), in the body's frame. */
  anchors: readonly (Vec3 | null)[];
  /** When the contact light lit, and the first footpad touched (Infinity: not yet). */
  lamp: number;
  touch: Touch | null;
  /** The work the struts have taken crushing, J; what the legs' damping and the pads' sliding have taken, J; what their springs hold now, J. */
  crushed: number;
  damped: number;
  stored: number;
  /** The first leg to have bottomed its strut, or null. */
  bottomed: string | null;
  /** Still since (Infinity: moving); landed; toppled at (Infinity: standing). */
  still: number;
  landed: Landed | null;
  toppled: number;
}

/** The body at its mass: its centre of mass in the craft's axes and datum, m, and its principal moments about its axes, kg m^2. */
export type MassAt = (mass: number) => { centre: Vec3; inertia: Vec3 };

/**
 * The lander of a plan (its first craft's `gear`): its centre of mass between the gear's rows (`GearDef.centres`) and its
 * moments between its thruster set's (sim/attitude.ts `inertiaAt`), at its mass. Null for a craft with no gear or no
 * thruster set given as hardware.
 */
export function landerBody(plan: FlightPlan): MassAt | null {
  const gear = plan.craft[0]?.gear;
  const a = attitudeOf(plan);
  if (!gear || !a) return null;
  const rows = gear.centres
    .map((c) => ({ mass: c.mass.value, moments: [c.at[0].value, c.at[1].value, c.at[2].value] as Vec3 }))
    .sort((x, y) => x.mass - y.mass);
  return (mass) => ({ centre: inertiaAt(rows, mass), inertia: a.inertia(mass) });
}

/** What pushes it besides its legs: the engine's thrust along +X, N, and what it draws, kg/s; the jets' torque, N m in the body's axes. */
export interface LanderPush {
  thrust: number;
  flow: number;
  torque: Vec3;
}

/** The body's own pull and turn: gravity at a place in its fixed frame, m/s^2, and the frame's rate of turn in its own axes, rad/s. */
export interface Field {
  gravity(p: Vec3): Vec3;
  spin: Vec3;
}

/** A body's pull as a point mass's, in its own frame, not turning: for a test. */
export const pointField = (gm: number, spin: Vec3 = [0, 0, 0]): Field => ({ gravity: (p) => scale(p, -gm / length(p) ** 3), spin });

/** Taken up at `t`: its legs unstroked, nothing touched. */
export function landerStart(t: number, p: Vec3, u: Vec3, q: Quat, w: Vec3, mass: number, gear: Gear): LanderState {
  return {
    t,
    p,
    u,
    q,
    w,
    mass,
    strokes: gear.legs.map(() => 0),
    loads: gear.legs.map(() => 0),
    anchors: gear.legs.map(() => null),
    lamp: Infinity,
    touch: null,
    crushed: 0,
    damped: 0,
    stored: 0,
    bottomed: null,
    still: Infinity,
    landed: null,
    toppled: Infinity,
  };
}

/** Degrees between two unit vectors. */
const between = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / DEG;

/** How deep a point in the body's frame is under the ground, m along the surface's normal (negative: above it), and the normal. */
function depthOf(ground: Ground, x: Vec3): { depth: number; normal: Vec3 } {
  const r = length(x);
  const g = ground.at(x);
  return { depth: (ground.radius + g.height - r) * dot(g.normal, scale(x, 1 / r)), normal: g.normal };
}

/** Where a leg's footpad is, with its stroke taken, in the body's frame. */
const padAt = (s: Pick<LanderState, 'p' | 'q'>, leg: Leg, stroke: number, centre: Vec3): { arm: Vec3; x: Vec3 } => {
  const arm = sub(add(leg.pad, scale(leg.strut, stroke)), centre);
  return { arm, x: add(s.p, turn(s.q, arm)) };
};

/**
 * Flown `h` seconds on in steps of `SUB`: gravity, the push, and each leg against the ground. Landed, it is held where it
 * stands (nothing moves it but a push that lifts it: an engine's thrust over its weight lets it go again).
 */
export function stepLander(
  gear: Gear,
  ground: Ground,
  massAt: MassAt,
  field: Field,
  s0: LanderState,
  push: LanderPush,
  h: number,
): LanderState {
  let s = s0;
  if (s.landed) {
    const weight = s.mass * length(field.gravity(s.p));
    if (push.thrust <= weight) return { ...s, t: s.t + h, mass: s.mass - push.flow * h };
    s = { ...s, landed: null, still: Infinity };
  }
  const n = Math.max(1, Math.ceil(h / SUB - 1e-9));
  const dt = h / n;
  for (let i = 0; i < n; i++) s = sub1(gear, ground, massAt, field, s, push, dt);
  return s;
}

function sub1(gear: Gear, ground: Ground, massAt: MassAt, field: Field, s: LanderState, push: LanderPush, dt: number): LanderState {
  const { centre, inertia } = massAt(s.mass);
  const m = s.mass;
  const strokes = s.strokes.slice();
  const loads = s.strokes.map(() => 0);
  const anchors = s.anchors.slice();
  let force: Vec3 = scale(turn(s.q, [1, 0, 0]), push.thrust);
  let torque: Vec3 = push.torque;
  let crushed = s.crushed;
  let damped = s.damped;
  let stored = 0;
  let bottomed = s.bottomed;
  let touching = false;
  let lamp = s.lamp;
  // (a leg's damping, on its share of the mass: the four as one)
  const c = 2 * gear.damping * Math.sqrt((gear.stiffness * m) / gear.legs.length);
  gear.legs.forEach((leg, i) => {
    const stroke = strokes[i]!;
    const { arm, x } = padAt(s, leg, stroke, centre);
    const { depth, normal } = depthOf(ground, x);
    if (leg.probe > 0 && !Number.isFinite(lamp)) {
      // (the probe's tip, hanging its length below the footpad along the body's -X: lit as it reaches the ground, at the
      // instant within the step its depth crosses nought, the motion taken as straight over the step)
      const tip = add(x, turn(s.q, [-leg.probe, 0, 0]));
      const d0 = depthOf(ground, tip).depth;
      if (d0 >= 0) lamp = s.t;
      else {
        const v = add(s.u, turn(s.q, cross(s.w, add(arm, [-leg.probe, 0, 0]))));
        const d1 = depthOf(ground, add(tip, scale(v, dt))).depth;
        if (d1 >= 0) lamp = s.t + (dt * d0) / (d0 - d1);
      }
    }
    if (depth <= 0) {
      anchors[i] = null;
      return;
    }
    touching = true;
    const v = add(s.u, turn(s.q, cross(s.w, arm)));
    const vn = dot(v, normal);
    const along = Math.max(0.1, dot(normal, turn(s.q, leg.strut)));
    const crush = crushAt(leg, stroke);
    // (the strut's load along its axis is the normal push's share along it: so the push it crushes at is its load over that)
    const cap = crush / along;
    let load = Math.max(0, gear.stiffness * depth - c * vn);
    let elastic = depth;
    if (load > cap) {
      // crushing: the honeycomb, in series with the leg's spring and damper, gives as soon as their push reaches its load,
      // by as much over the step as holds that push at it: K (d - x) + c (-vn - x / dt) = cap, x along the normal
      const x = Math.max(0, (load - cap) / (gear.stiffness + c / dt));
      const more = x / along;
      strokes[i] = stroke + more;
      crushed += crush * more;
      elastic = depth - x;
      damped += (cap - gear.stiffness * elastic) * (-vn - x / dt) * dt;
      load = cap;
      if (strokes[i]! >= strokeOf(leg) && bottomed === null) bottomed = leg.id;
    } else if (load > 0) damped += c * vn * vn * dt;
    loads[i] = load * along;
    // sideways: held where it touched, by the leg's stiffness and damping, up to friction times its load; past that it slides
    const anchor = anchors[i] ?? x;
    const slide = sub(v, scale(normal, vn));
    const off = sub(x, anchor);
    const shift = sub(off, scale(normal, dot(off, normal)));
    let drag = sub(scale(shift, -gear.stiffness), scale(slide, c));
    const most = gear.friction * load;
    const held = length(drag);
    if (held > most) {
      drag = held > 0 ? scale(drag, most / held) : drag;
      // (the hold moved along with the slide: what is left of the spring is what friction holds)
      anchors[i] = add(x, scale(drag, 1 / gear.stiffness));
      damped += -dot(drag, slide) * dt;
      stored += dot(drag, drag) / (2 * gear.stiffness);
    } else {
      anchors[i] = anchor;
      damped += c * dot(slide, slide) * dt;
      stored += (gear.stiffness * dot(shift, shift)) / 2;
    }
    stored += (gear.stiffness * Math.max(0, elastic) ** 2) / 2;
    const f = add(scale(normal, load), drag);
    force = add(force, f);
    torque = add(torque, cross(arm, unturn(s.q, f)));
  });
  // the centre of mass, over the turning frame; the body on Euler's equations (semi-implicit: rates first)
  const a = sub(
    sub(add(field.gravity(s.p), scale(force, 1 / m)), scale(cross(field.spin, s.u), 2)),
    cross(field.spin, cross(field.spin, s.p)),
  );
  const u = add(s.u, scale(a, dt));
  const p = add(s.p, scale(u, dt));
  const w = add(s.w, scale(eulerOf(s.w, torque, inertia), dt));
  const dq = spin(s.q, w);
  const q = normalize([s.q[0] + dq[0] * dt, s.q[1] + dq[1] * dt, s.q[2] + dq[2] * dt, s.q[3] + dq[3] * dt]);
  const t = s.t + dt;
  const up = unit(p);
  let touch = s.touch;
  if (touching && !touch) {
    const vertical = -dot(s.u, up);
    touch = {
      t: s.t,
      vertical,
      horizontal: length(add(s.u, scale(up, vertical))),
      slope: between(ground.at(s.p).normal, up),
      tilt: between(turn(s.q, [1, 0, 0]), up),
      rate: Math.max(...s.w.map(Math.abs)) / DEG,
    };
  }
  const tilt = between(turn(q, [1, 0, 0]), up);
  const toppled = Number.isFinite(s.toppled) ? s.toppled : tilt > TOPPLED ? t : Infinity;
  const still = touching && length(u) < STILL.speed && length(w) < STILL.rate ? Math.min(s.still, t) : Infinity;
  let landed: Landed | null = null;
  if (touching && t - still >= RESTS && !Number.isFinite(toppled)) {
    const place = selenographic(p);
    landed = { t, p, q, latitude: place.latitude, longitude: place.longitude, height: ground.at(p).height, tilt };
  }
  return {
    t,
    p,
    u: landed ? [0, 0, 0] : u,
    q,
    w: landed ? [0, 0, 0] : w,
    mass: m - push.flow * dt,
    strokes,
    loads,
    anchors,
    lamp,
    touch,
    crushed,
    damped,
    stored,
    bottomed,
    still,
    landed,
    toppled,
  };
}

/**
 * A step of `h` seconds with the jets worked as `controls` ask (sim/attitude.ts `jetsFor`: the autopilot under Hold, or the
 * hand direct), their torque flown on the lander with its legs' and its engine's push (`engine`: thrust along +X, N, and
 * what it draws, kg/s). The attitude's own state (what the autopilot holds, what is left in each supply, the pulses owed) is
 * kept beside the lander's, its attitude and rates the lander's: the autopilot holds the attitude in the body's fixed frame,
 * whose own turn (the Moon's, 2.7e-6 rad/s) is left out of it.
 */
export function stepWithJets(
  gear: Gear,
  ground: Ground,
  massAt: MassAt,
  field: Field,
  a: Attitude,
  s: LanderState,
  att: AttitudeState,
  controls: AttitudeControls,
  engine: { thrust: number; flow: number },
  h: number,
): { lander: LanderState; att: AttitudeState } {
  const now: AttitudeState = { ...att, t: s.t, q: s.q, w: s.w };
  const f = jetsFor(a, now, { ...controls, mass: s.mass }, h);
  const lander = stepLander(gear, ground, massAt, field, s, { ...engine, torque: f.torque }, h);
  return {
    lander,
    att: { t: lander.t, q: lander.q, w: lander.w, ref: f.auto ? f.ref : lander.q, left: f.left, firing: f.firing, owed: f.owed },
  };
}

/** What a lander's motion holds of energy over the ground: its kinetic energy and its height's in a uniform pull of `g` m/s^2, J. */
export const energyOf = (s: LanderState, inertia: Vec3, g: number, radius: number): number =>
  0.5 * s.mass * dot(s.u, s.u) +
  0.5 * (inertia[0] * s.w[0] ** 2 + inertia[1] * s.w[1] ** 2 + inertia[2] * s.w[2] ** 2) +
  s.mass * g * (length(s.p) - radius);

/**
 * A body's fixed frame (the Moon's mean-Earth/polar-axis frame, world/moon.ts `meanEarthAxes`, in which its maps and landing
 * sites are) against a flight's frame: its axes in the flight's at an instant, its rate of turn, and a state taken from one to
 * the other. `moon`: the body's centre from the Earth's, in the flight's frame (core/gravity.ts `Field.moon`, `moonIn`).
 */
export function moonFixed(frame: EarthFrame, moon: (t: number) => { r: Vec3; v: Vec3 }) {
  const axes = (t: number): [Vec3, Vec3, Vec3] => {
    const m = meanEarthAxes(frame.jdTT(t)).axes;
    return [frame.fromIcrf(m[0]), frame.fromIcrf(m[1]), frame.fromIcrf(m[2])];
  };
  /** Its rate of turn, in its own axes, rad/s: from its axes a second either side. */
  const spinAt = (t: number): Vec3 => {
    const [a, b, e] = [axes(t - 1), axes(t + 1), axes(t)];
    let w: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) w = add(w, scale(cross(e[i]!, sub(b[i]!, a[i]!)), 0.25));
    return [dot(w, e[0]), dot(w, e[1]), dot(w, e[2])];
  };
  const toFixedV = (e: [Vec3, Vec3, Vec3], v: Vec3): Vec3 => [dot(v, e[0]), dot(v, e[1]), dot(v, e[2])];
  const toFlightV = (e: [Vec3, Vec3, Vec3], v: Vec3): Vec3 => add(add(scale(e[0], v[0]), scale(e[1], v[1])), scale(e[2], v[2]));
  return {
    axes,
    spin: spinAt,
    /** A state in the flight's frame (from the Earth's centre) as one in the body's fixed frame: place, velocity over the ground, attitude. */
    toFixed(r: Vec3, v: Vec3, q: Quat, t: number): { p: Vec3; u: Vec3; q: Quat } {
      const e = axes(t);
      const c = moon(t);
      const p = toFixedV(e, sub(r, c.r));
      return { p, u: sub(toFixedV(e, sub(v, c.v)), cross(spinAt(t), p)), q: multiply(conjugate(fromAxes(...e)), q) };
    },
    /** And back: what a lander held on the body is in the flight's frame at `t`, turning with it. */
    toFlight(p: Vec3, u: Vec3, q: Quat, t: number): { r: Vec3; v: Vec3; q: Quat } {
      const e = axes(t);
      const c = moon(t);
      return { r: add(c.r, toFlightV(e, p)), v: add(c.v, toFlightV(e, add(u, cross(spinAt(t), p)))), q: multiply(fromAxes(...e), q) };
    },
  };
}
