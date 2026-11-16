/**
 * The air at a point, for every simulator (fly.ts, vehicle.ts, shed.ts, staged.ts, stagedlive.ts, orbital.ts's coast,
 * fliers.ts) and the scene: where the point is over in the flight's frame (world/earthframe.ts), its height above the sea,
 * the 1976 standard air there (atmosphere.ts), and the motion through that air, which turns with the Earth and moves over
 * it as the day's winds aloft have it (`FlightPlan.winds`, one sounding for the whole flight; calm where there is none).
 */
import type { Aloft, Winds } from '../types.ts';
import { aloftAt } from '../world/aloft.ts';
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

/**
 * Whether the simulator flies the day's air (`FlightPlan.aloft`, the column over the pad: docs/agents/world.md, "The air
 * aloft") where a plan has one. Off, every plan flies the 1976 standard atmosphere and its record's sounding (or calm),
 * as it did before the day's air was read: for weighing what the day's air does (tools/figures.mjs, tests/air.test.mjs).
 */
export const DAY_AIR = { on: true };

/** Above this height, m, the standard's air is the standard's own: between the column's top and here it is scaled by the column's density and temperature over the standard's at the top, eased to 1. */
export const COLUMN_EASED = 70_000;

/**
 * The air a plan flies through: its properties at a height above the sea (`air`), the air's own motion over the ground
 * (`blow`), and whether either leans on the day's column (`column`: figures that do are `derived`, on the standard alone
 * `estimated`).
 */
export interface Sky {
  air(altitude: number): Air;
  blow: Blow | null;
  column: boolean;
}

/**
 * No wind at all, said as a sounding (`FlightPlan.winds`): a plan that gives it flies air that turns with the Earth and no
 * more, whatever its column's wind. (A plan that gives no sounding flies its column's wind, where it has a column.)
 */
export const STILL: Winds = { levels: [], calmAbove: { value: 0, confidence: 'documented', source: 'no wind: still air' } };

/** The 1976 standard atmosphere and calm air: a plan with no air of its own. */
export const STANDARD: Sky = { air: atmosphere, blow: null, column: false };

/**
 * The air a plan flies through (`Sky`). Where the plan carries the day's column (`FlightPlan.aloft`) and `DAY_AIR` is on,
 * the column's air within it (world/aloft.ts `aloftAt`); below its lowest level and above its top, the standard's scaled by
 * the column's density and temperature over the standard's at that end (the pressure by the gas law), the ratios held below the ground and eased to 1 by `COLUMN_EASED`
 * above the top, so nothing steps; the temperature, and so the speed of sound, the standard's there. The wind is the
 * record's own sounding where it has one (`FlightPlan.winds`, documented; `STILL` for none at all), else the column's,
 * held below its lowest level and falling evenly to nothing at `COLUMN_EASED`, else calm. Without a column it is the standard and the record's
 * sounding, as every plan flew before the day's air was read.
 */
export function skyOf(plan: { winds?: Winds; aloft?: Aloft } | null | undefined): Sky {
  if (!plan) return STANDARD;
  const had = skies.get(plan);
  if (had && had.on === DAY_AIR.on) return had.sky;
  const sky = skyFrom(plan);
  skies.set(plan, { on: DAY_AIR.on, sky });
  return sky;
}
const skies = new WeakMap<object, { on: boolean; sky: Sky }>();
function skyFrom(plan: { winds?: Winds; aloft?: Aloft }): Sky {
  const sounding = blowOf(plan?.winds);
  const aloft = DAY_AIR.on ? plan.aloft : undefined;
  if (!aloft || aloft.levels.length < 2) return sounding ? { air: atmosphere, blow: sounding, column: false } : STANDARD;
  const levels = aloft.levels;
  const [low, top] = [levels[0]!.height.value, levels[levels.length - 1]!.height.value];
  // (the column's density and temperature over the standard's at an end; the pressure follows, by the gas law, so the air
  // outside the column is the standard's with the column's departure from it at that end carried on)
  const ratio = (h: number): [density: number, temperature: number] => {
    const [day, standard] = [aloftAt(aloft, h)!, atmosphere(h)];
    return [day.density / standard.density, day.temperature / standard.temperature];
  };
  const [below, above] = [ratio(low), ratio(top)];
  const scaled = (a: Air, [d, t]: readonly [number, number]): Air => {
    if (d === 1 && t === 1) return a;
    const temperature = a.temperature * t;
    return { density: a.density * d, pressure: a.pressure * d * t, temperature, soundSpeed: a.soundSpeed * Math.sqrt(t) };
  };
  const air = (altitude: number): Air => {
    const day = aloftAt(aloft, altitude);
    if (day)
      return {
        density: day.density,
        pressure: day.pressure,
        temperature: day.temperature,
        soundSpeed: Math.sqrt(1.4 * 287.053 * day.temperature),
      };
    const standard = atmosphere(altitude);
    if (altitude < low) return scaled(standard, below);
    if (altitude >= COLUMN_EASED) return standard;
    const k = (COLUMN_EASED - altitude) / (COLUMN_EASED - top);
    return scaled(standard, [1 + (above[0] - 1) * k, 1 + (above[1] - 1) * k]);
  };
  const winds = levels.filter((l) => l.wind);
  const own = aloftAt(aloft, low)?.wind;
  const highest = winds.length ? aloftAt(aloft, winds[winds.length - 1]!.height.value)?.wind : null;
  const column: Blow | null =
    own && highest
      ? (altitude) => {
          if (altitude <= low) return own;
          const day = aloftAt(aloft, altitude)?.wind;
          if (day) return day;
          const h = winds[winds.length - 1]!.height.value;
          if (altitude >= COLUMN_EASED) return [0, 0];
          const k = (COLUMN_EASED - altitude) / (COLUMN_EASED - h);
          return [highest[0] * k, highest[1] * k];
        }
      : null;
  return { air, blow: plan.winds ? sounding : column, column: true };
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

/** The air at a point `r` moving at `v` (the flight's frame), `at` seconds from liftoff, the sea `seaLevel` m above the ellipsoid, in the plan's `sky` (`skyOf`; the standard and calm where none is given). */
export function airAt(frame: EarthFrame, r: Vec3, v: Vec3, at: number, seaLevel: number, sky: Sky = STANDARD): AirHere {
  const place = frame.place(r, at);
  const altitude = place.height - seaLevel;
  const air = sky.air(altitude);
  const blow = sky.blow;
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
