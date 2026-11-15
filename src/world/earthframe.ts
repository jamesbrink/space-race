/**
 * The frame a flight is flown in: Earth-centred, not turning, and how the Earth turns in it. One object, made once from the
 * instant of liftoff, through which every simulator and everything that shows a run goes between where a thing is in space
 * and where it is over the Earth, so no two of them can take the Earth's angle differently.
 *
 * Of date (`ofDate`, the frame flights are flown in): frames.ts's inertial frame of date, +X the true equinox, +Z the true
 * pole. The Earth's angle in it is the Greenwich apparent sidereal time at liftoff (time.ts) and the steady rate from there
 * (bodies.ts `EARTH_ROTATION_RATE`), so the Sun, the Moon, the planets and published orbital elements, all of date, are in
 * it as they are given, and a third body's pull is where it truly is.
 *
 * Fixed at liftoff (`ofDate: false`): the same frame turned back about the pole by the sidereal time at liftoff, so that
 * at t = 0 its axes are the Earth's (+X on the Greenwich meridian). Gravity with J2, the air, the wind and the ground are
 * all symmetric about the pole, so a flight flown in either frame is the same flight to rounding (tests/frame.test.mjs);
 * what is of date (the Sun) is turned into it by `fromDate`.
 *
 * `t` is seconds from liftoff throughout. Positions and velocities in the frame are metres and metres a second; `fixed`
 * means ECEF (frames.ts), and a velocity in ECEF is the one an observer on the ground measures.
 */
import { EARTH_ROTATION_RATE } from './bodies.ts';
import { add, cross, ecefToGeodetic, ecefToInertial, enuAxes, type Geodetic, inertialToEcef, sub, type Vec3 } from './frames.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from './time.ts';

export interface EarthFrame {
  /** Whether this is the inertial frame of date, or that frame turned to the Earth's axes at liftoff. */
  readonly ofDate: boolean;
  /** The Julian date (UT) of liftoff: t = 0. */
  readonly jd0: number;
  /** The Earth's angle in this frame at liftoff, rad: the sidereal time then, or nothing in the frame fixed at liftoff. */
  readonly gast0: number;
  /** The Earth's turning in this frame, rad/s: the vector it turns about at that rate. */
  readonly spin: Vec3;
  /** The Earth's angle in this frame `t` seconds from liftoff, rad: the angle frames.ts turns ECEF by. */
  angle(t: number): number;
  /** A position or direction in this frame as one in ECEF at `t`, and back. */
  toFixed(r: Vec3, t: number): Vec3;
  toInertial(p: Vec3, t: number): Vec3;
  /** A velocity in this frame at a position, as the velocity over the turning ground in ECEF; and back from one, at an ECEF position. */
  velocityToFixed(r: Vec3, v: Vec3, t: number): Vec3;
  velocityToInertial(p: Vec3, v: Vec3, t: number): Vec3;
  /** The motion over the ground (relative to the air that turns with the Earth), in this frame's axes. */
  overGround(r: Vec3, v: Vec3): Vec3;
  /** Where a position in this frame is over the Earth at `t`: degrees north and east, and height above the ellipsoid. */
  place(r: Vec3, t: number): Geodetic;
  /** Up at a place given by its latitude and longitude (the ellipsoid's normal), as a direction in this frame at `t`. */
  upOver(place: { latitude: number; longitude: number }, t: number): Vec3;
  /** The same, at a position in this frame. */
  up(r: Vec3, t: number): Vec3;
  /** A direction or position in frames.ts's inertial frame of date (the ephemeris's: the Sun's, the Moon's), in this frame. */
  fromDate(v: Vec3): Vec3;
  /** The reverse: a direction or position in this frame, in the inertial frame of date. */
  toDate(v: Vec3): Vec3;
  /** The instant `t` seconds from liftoff as a Julian date, UT and TT. */
  jdUT(t: number): number;
  jdTT(t: number): number;
}

/** A frame with no date cannot say where anything of date is. */
const sure = (behind: number): number => {
  if (!Number.isFinite(behind)) throw new Error('a frame with no date of liftoff cannot place what is of date');
  return behind;
};

/** The frame of a flight launched at the Julian date (UT) `jd0`: of date, or turned to the Earth's axes at liftoff. */
export function earthFrame(jd0: number, ofDate = true): EarthFrame {
  const sidereal = Number.isFinite(jd0) ? greenwichSiderealTime(jd0) : Number.NaN;
  if (ofDate && !Number.isFinite(sidereal)) throw new Error('a frame of date needs the instant of liftoff');
  const gast0 = ofDate ? sidereal : 0;
  // how far this frame is turned from the frame of date about the pole: none for the frame of date
  const behind = ofDate ? 0 : sidereal;
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const angle = (t: number): number => gast0 + EARTH_ROTATION_RATE * t;
  const upOver = (place: { latitude: number; longitude: number }, t: number): Vec3 => ecefToInertial(enuAxes(place).up, angle(t));
  return {
    ofDate,
    jd0,
    gast0,
    spin,
    angle,
    toFixed: (r, t) => inertialToEcef(r, angle(t)),
    toInertial: (p, t) => ecefToInertial(p, angle(t)),
    velocityToFixed: (r, v, t) => sub(inertialToEcef(v, angle(t)), cross(spin, inertialToEcef(r, angle(t)))),
    velocityToInertial: (p, v, t) => ecefToInertial(add(v, cross(spin, p)), angle(t)),
    overGround: (r, v) => sub(v, cross(spin, r)),
    place: (r, t) => ecefToGeodetic(inertialToEcef(r, angle(t))),
    upOver,
    up: (r, t) => upOver(ecefToGeodetic(inertialToEcef(r, angle(t))), t),
    fromDate: (v) => (ofDate ? v : inertialToEcef(v, sure(behind))),
    toDate: (v) => (ofDate ? v : ecefToInertial(v, sure(behind))),
    jdUT: (t) => jd0 + t / 86_400,
    jdTT: (t) => terrestrialTime(jd0 + t / 86_400),
  };
}

/**
 * A position or direction in one flight's frame, in another of the same liftoff: they differ by a turn about the pole (the
 * frame of date and the one fixed at liftoff, by the sidereal time then).
 */
export function between(from: EarthFrame, to: EarthFrame): (v: Vec3) => Vec3 {
  const by = to.gast0 - from.gast0;
  return (v) => ecefToInertial(v, by);
}

/** A frame fixed at liftoff whose date is not known: for a ballistic flight flown from a test's own state, with no Sun to place. */
export const LIFTOFF: EarthFrame = earthFrame(Number.NaN, false);

/** Whether flights are flown and shown in the frame of date (true) or the frame fixed at liftoff (false). */
export const OF_DATE = true;

const frames = new Map<string, EarthFrame>();
/** The frame a flight is flown and shown in, made once from its liftoff (`Flight.launch`, ISO 8601 UTC). */
export function frameOf(flight: { launch: string }): EarthFrame {
  let frame = frames.get(flight.launch);
  if (!frame) frames.set(flight.launch, (frame = earthFrame(julianDate(flight.launch), OF_DATE)));
  return frame;
}
