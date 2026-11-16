/**
 * The air at a point, for every simulator (fly.ts, vehicle.ts, shed.ts, staged.ts, stagedlive.ts, orbital.ts's coast,
 * fliers.ts) and the scene: where the point is over in the flight's frame (world/earthframe.ts), its height above the sea,
 * the 1976 standard air there (atmosphere.ts), and the motion through that air, which turns with the Earth and moves over
 * it as the day's winds aloft have it (`FlightPlan.winds`, one sounding for the whole flight; calm where there is none).
 */
import type { Winds } from '../types.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, cross, enuAxes, type Geodetic, length, scale, sub, type Vec3 } from '../world/frames.ts';
import { type Air, atmosphere } from './atmosphere.ts';

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

/** The air at a place and what a body moving through it there meets: `r` and `v` in the flight's frame (world/earthframe.ts), `at` seconds from liftoff. */
export interface AirHere {
  /** Where it is over, and its height above the sea, m. */
  here: Geodetic;
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

/** The air at a point `r` moving at `v` (the flight's frame), `at` seconds from liftoff, the sea `seaLevel` m above the ellipsoid. */
export function airAt(frame: EarthFrame, r: Vec3, v: Vec3, at: number, seaLevel: number, blow: Blow | null = null): AirHere {
  const place = frame.place(r, at);
  const altitude = place.height - seaLevel;
  const air = atmosphere(altitude);
  const ground = sub(v, cross(frame.spin, r));
  const wind = blow ? sub(ground, blowing(frame, blow, place, altitude, at)) : ground;
  const airspeed = length(wind);
  return {
    here: place,
    altitude,
    air,
    wind,
    airspeed,
    mach: airspeed / air.soundSpeed,
    q: 0.5 * air.density * airspeed * airspeed,
    ground,
  };
}

/** The air's motion over the ground at a place, as a vector in the flight's frame: level there, by the compass there. */
export function blowing(frame: EarthFrame, blow: Blow, place: { latitude: number; longitude: number }, altitude: number, at: number): Vec3 {
  const [east, north] = blow(altitude);
  if (east === 0 && north === 0) return [0, 0, 0];
  const axes = enuAxes(place);
  return frame.toInertial(add(scale(axes.east, east), scale(axes.north, north)), at);
}

/**
 * The air's drag on a point moving through it at `wind` (its motion through the air, `airspeed` its size), in air of
 * `density`, kg/m^3, for a drag area (coefficient times area) `dragArea`, m^2: -1/2 rho |w| w CdA, N, against the motion
 * through the air. The one drag every point-mass flier and every parachute is flown by (forces.ts `airForces` is a rigid
 * body's, by its ends, fins and side).
 */
export function airDrag(wind: Vec3, airspeed: number, density: number, dragArea: number): Vec3 {
  return scale(wind, -0.5 * density * airspeed * dragArea);
}
