/**
 * What the air does to any rigid body, and what happens to two bodies when one becomes two: the
 * one implementation the vehicle (vehicle.ts) and everything it lets go (shed.ts) are flown by.
 * Doubles, no three.js; nothing here knows any flight.
 *
 * A body is the same all the way round its long axis, +X. The air's force on it has three parts,
 * all in the body's own axes, from its motion through the air there (`through`, m/s):
 *
 *   axial     along the long axis, against the motion along it: half rho V Vx times a drag area,
 *             the one for the end that is leading (`ahead` when +X leads, `astern` when -X does).
 *             End on, that is the whole of the drag, as fly.ts has it. It falls off as the cosine
 *             of the angle and is nothing broadside, where the two areas change over; and it lies
 *             along the axis, not the wind, so a body at an angle is lifted as well as slowed.
 *   normal    each `surfaces` entry (a nose, fins) is pushed against its own sideways motion:
 *             half rho |u| u_side A slope, at its station. Linear in the angle while it is small:
 *             the lift, the weathercock and, since a surface far from the centre of mass moves
 *             sideways as the body turns, the damping.
 *   broadside the cross-flow on the length of the body (`side`): each piece of the stretch is
 *             pushed against its own sideways motion as the square of it, half rho |u_side| u_side
 *             times its share of the side's drag area. Nothing to speak of at a small angle (it
 *             goes as the sine squared), the whole of the drag side on, and what slows a tumble,
 *             since the ends of a turning body move sideways fastest. The stretch is cut into
 *             PIECES of equal length.
 *
 * What is left out: any change of the areas with Mach number other than what the caller gives for
 * the instant, the wake of one part on another, roll damping, and all unsteady flow. A tumbling
 * body's drag is these three summed at each instant, which is the usual approximation and no more.
 */
import type { AeroSurface, Body, MassPart, ShedBody, Winds } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import { add, cross, ecefToGeodetic, ecefToInertial, enuAxes, inertialToEcef, length, scale, sub, type Vec3 } from '../world/frames.ts';
import { type Air, atmosphere } from './atmosphere.ts';
import { type MassProperties, massOf, type Quat, turn } from './rigid.ts';

/** How many pieces a body's side is cut into for the cross-flow. Ten puts the damping of a uniform stretch turning about its middle 2 per cent under the integral. */
export const PIECES = 10;

/** A body as the air sees it at one Mach number. Stations are metres along +X from whatever datum `centre` is given in. */
export interface Shape {
  /** The area `surfaces` slopes are referred to, m^2. */
  area: number;
  /** Drag area (coefficient times area), m^2, with +X leading and with -X leading. */
  ahead: number;
  astern: number;
  surfaces: readonly AeroSurface[];
  side?: { dragArea: number; from: number; to: number } | null;
  /** A second stretch of side, where the body is two things end to end (a spacecraft with its tower on). */
  more?: { dragArea: number; from: number; to: number } | null;
}

/**
 * The air's force (N) and its torque about the centre of mass (N m), both in the body's axes.
 * `through` is the centre of mass's velocity through the air and `w` the body's rates, in its
 * axes; `centre` is the centre of mass's station.
 */
export function airForces(shape: Shape, centre: number, through: Vec3, w: Vec3, density: number): { force: Vec3; torque: Vec3 } {
  const speed = length(through);
  const half = 0.5 * density;
  const fx = -half * speed * through[0] * (through[0] > 0 ? shape.ahead : shape.astern);
  let fy = 0;
  let fz = 0;
  let ty = 0;
  let tz = 0;
  for (const surface of shape.surfaces) {
    const arm = surface.station - centre;
    // this part of the body's own motion through the air: the whole's, and what the turning adds out here
    const uy = through[1] + w[2] * arm;
    const uz = through[2] - w[1] * arm;
    const k = -half * Math.sqrt(through[0] * through[0] + uy * uy + uz * uz) * shape.area * surface.slope;
    fy += k * uy;
    fz += k * uz;
    ty -= arm * k * uz;
    tz += arm * k * uy;
  }
  for (const side of [shape.side, shape.more]) {
    if (!side || !(side.dragArea > 0)) continue;
    const each = side.dragArea / PIECES;
    for (let i = 0; i < PIECES; i++) {
      const arm = side.from + ((i + 0.5) / PIECES) * (side.to - side.from) - centre;
      const uy = through[1] + w[2] * arm;
      const uz = through[2] - w[1] * arm;
      const k = -half * Math.sqrt(uy * uy + uz * uz) * each;
      fy += k * uy;
      fz += k * uz;
      ty -= arm * k * uz;
      tz += arm * k * uy;
    }
  }
  return { force: [fx, fy, fz], torque: [0, ty, tz] };
}

const EARTH_SPIN: Vec3 = [0, 0, EARTH_ROTATION_RATE];

/** The air's own motion over the ground at a height, m above the sea: metres a second toward the east and toward the north. */
export type Blow = (altitude: number) => readonly [east: number, north: number];

const DEG = Math.PI / 180;

/**
 * A sounding as something to fly through (types.ts: `Winds`): each level's wind turned into the way the air moves
 * (a wind FROM 090 moves the air west), straight lines between levels in those parts, the lowest held to the
 * surface, and from the highest falling evenly to nothing at `calmAbove`. Null where there is no sounding: calm.
 */
export function blowOf(winds: Winds | undefined | null): Blow | null {
  if (!winds?.levels.length) return null;
  const levels = winds.levels
    .map((l) => ({ h: l.height, e: -l.speed.value * Math.sin(l.from.value * DEG), n: -l.speed.value * Math.cos(l.from.value * DEG) }))
    .sort((a, b) => a.h - b.h);
  const top = levels[levels.length - 1]!;
  const calm = Math.max(top.h, winds.calmAbove.value);
  const still = [0, 0] as const;
  return (altitude) => {
    if (altitude >= calm) return still;
    if (altitude <= levels[0]!.h) return [levels[0]!.e, levels[0]!.n];
    if (altitude >= top.h) {
      const k = (calm - altitude) / (calm - top.h);
      return [top.e * k, top.n * k];
    }
    let lo = 0;
    let hi = levels.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (levels[mid]!.h <= altitude) lo = mid;
      else hi = mid;
    }
    const a = levels[lo]!;
    const b = levels[hi]!;
    const k = (altitude - a.h) / (b.h - a.h);
    return [a.e + (b.e - a.e) * k, a.n + (b.n - a.n) * k];
  };
}

/** The air at a place and what a body moving through it there meets: `r` and `v` in the frame that does not turn, `at` seconds from liftoff. */
export interface Wind {
  /** Height above the sea, m. */
  altitude: number;
  air: Air;
  /** The motion through the air (which turns with the Earth, and moves over it as the day's wind has it), m/s in the frame, and its size. */
  wind: Vec3;
  airspeed: number;
  /** The motion over the ground, m/s in the frame: the same thing where there is no wind. */
  ground: Vec3;
  mach: number;
  /** Dynamic pressure, Pa. */
  q: number;
}

export function windAt(r: Vec3, v: Vec3, at: number, seaLevel: number, blow: Blow | null = null): Wind {
  const place = ecefToGeodetic(inertialToEcef(r, EARTH_ROTATION_RATE * at));
  const altitude = place.height - seaLevel;
  const air = atmosphere(altitude);
  const ground = sub(v, cross(EARTH_SPIN, r));
  const wind = blow ? sub(ground, blowing(blow, place, altitude, at)) : ground;
  const airspeed = length(wind);
  return { altitude, air, wind, airspeed, mach: airspeed / air.soundSpeed, q: 0.5 * air.density * airspeed * airspeed, ground };
}

/** The air's motion over the ground at a place, as a vector in the frame that does not turn: level there, by the compass there. */
export function blowing(blow: Blow, place: { latitude: number; longitude: number }, altitude: number, at: number): Vec3 {
  const [east, north] = blow(altitude);
  if (east === 0 && north === 0) return [0, 0, 0];
  const axes = enuAxes(place);
  return ecefToInertial(add(scale(axes.east, east), scale(axes.north, north)), EARTH_ROTATION_RATE * at);
}

/** Something let go, as it is the instant it leaves: a rigid body's whole state and what it weighs where. */
export interface Release {
  /** The event that let it go (`ShedBody.on`), and when, seconds from liftoff. */
  on: string;
  t: number;
  /** Its centre of mass in the frame that does not turn, its attitude (body to frame) and its body rates. */
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
  /** kg; kg m^2 about its long axis and across it; and where its centre of mass was on the stack, m from the base. */
  mass: number;
  roll: number;
  across: number;
  centre: number;
  /** What it left, the same instant: the two together are what there was. */
  rest?: { r: Vec3; v: Vec3; mass: number };
  /** The vehicle had already aborted on its escape rocket when this left: a motor of the body's marked `unless: 'abort'` is spent. */
  aborted?: boolean;
  /** It was let go onto something standing still under it (the booster on its pad, under a retropack an abort drops): it stays where it is. */
  stands?: boolean;
}

/**
 * One rigid body becomes two. `whole` is the body as it was (its centre of mass at station
 * `centre`); `gone` is the piece that leaves, by its mass and the station of its own centre of
 * mass. Both pieces keep the body's attitude and rates, and each centre of mass keeps the velocity
 * it had as part of the turning whole (v + w x r), so linear momentum, and angular momentum about
 * the pair's centre of mass, are what they were. Then the two are pushed apart along the axis at
 * `push` m/s, shared by their masses, which changes neither.
 */
export function part(
  whole: { r: Vec3; v: Vec3; q: Quat; w: Vec3; mass: number; centre: number },
  gone: { mass: number; centre: number },
  push = 0,
): { kept: { r: Vec3; v: Vec3; mass: number; centre: number }; gone: { r: Vec3; v: Vec3; mass: number; centre: number } } {
  const keptMass = whole.mass - gone.mass;
  // where the rest's centre of mass must be, for the whole's to have been where it was
  const keptCentre = (whole.mass * whole.centre - gone.mass * gone.centre) / keptMass;
  const axis = turn(whole.q, [1, 0, 0]);
  const away = keptCentre >= gone.centre ? 1 : -1;
  const piece = (centre: number, kick: number): { r: Vec3; v: Vec3 } => {
    const arm = centre - whole.centre;
    return {
      r: add(whole.r, scale(axis, arm)),
      v: add(add(whole.v, turn(whole.q, cross(whole.w, [arm, 0, 0]))), scale(axis, kick)),
    };
  };
  return {
    kept: { ...piece(keptCentre, (away * push * gone.mass) / whole.mass), mass: keptMass, centre: keptCentre },
    gone: { ...piece(gone.centre, (-away * push * keptMass) / whole.mass), mass: gone.mass, centre: gone.centre },
  };
}

const NOTHING_GONE: ReadonlySet<string> = new Set();

/**
 * What a shed body weighs where: the stack's own parts that lie within its stretch (their liquids
 * `filled` as they are at that instant), or, where the stack's parts do not divide that finely,
 * the body's own `mass`, `centre` and `gyration`.
 */
export function pieceOf(body: Body, def: ShedBody, filled: number | ((part: MassPart) => number)): MassProperties {
  const within = body.parts.filter((p) => {
    const middle = (p.from + p.to) / 2;
    return middle >= def.from.value && middle <= def.to.value;
  });
  if (within.length) return massOf(within, body.radius.value, filled, NOTHING_GONE);
  if (!def.mass || !def.centre || !def.gyration) {
    throw new Error(`${def.name}: none of the stack's parts lies within it, so it needs a mass, a centre and radii of gyration of its own`);
  }
  const mass = def.mass.value;
  return { mass, centre: def.centre.value, roll: mass * def.gyration.roll.value ** 2, across: mass * def.gyration.across.value ** 2 };
}

/**
 * Up at a place: the ellipsoid's normal there (frames.ts: what level is measured from), as a direction in the frame that
 * does not turn, `at` seconds from liftoff. Not the line from the Earth's centre, which at 28 degrees north leans a
 * sixth of a degree from it: climb angles, the retro attitude and a landing's vertical speed are all measured from this.
 */
export function upAt(r: Vec3, at: number): Vec3 {
  return upOver(ecefToGeodetic(inertialToEcef(r, EARTH_ROTATION_RATE * at)), at);
}

/** The same, over a place already known by its latitude and longitude. */
export function upOver(place: { latitude: number; longitude: number }, at: number): Vec3 {
  return ecefToInertial(enuAxes(place).up, EARTH_ROTATION_RATE * at);
}
