/**
 * Gravity as a sum of terms, for a flight to say what pulls on it: the central body's own (the Earth's with its J2, by
 * default and today on every flight), and a third body's pull as a point mass, as the tidal difference between its pull
 * here and on the central body (the frame is the central body's, which falls toward it too). The default is the Earth
 * with J2 alone, which every simulator has flown by (world/orbit.ts `gravity`), so a flight that names no terms moves by
 * nothing. The Moon's and the Sun's places are JPL's DE440 when it is loaded (world/ephemeris.ts `stateOf`, the Moon to
 * 6 m: `loadEphemeris` before the terms are made), turned into the flight's frame by the frame of date at liftoff
 * (`fromIcrf`), and labelled `derived`; otherwise Meeus's (to 0.017 and 0.01 degrees, 40 km of the Moon), good for where
 * they are in the sky and labelled `estimated` as a pull. Which is chosen when the terms are made, for the flight's date.
 *
 * The central body can be switched (`centralOf`): a flight about the Moon is flown in the Moon's own frame, with the Moon's
 * pull as a point mass at its centre and the Earth's as a third body.
 */
import type { Confidence } from '../../measure.ts';
import { EARTH, MOON, SUN } from '../../world/bodies.ts';
import type { EarthFrame } from '../../world/earthframe.ts';
import { ephemerisOf, moonPosition, stateOf, sunPosition } from '../../world/ephemeris.ts';
import { add, length, scale, sub, type Vec3 } from '../../world/frames.ts';
import { gravity } from '../../world/orbit.ts';

/** One term of gravity: the acceleration at `r` (in the flight's frame, from the central body's centre) at `t` seconds from liftoff, m/s^2. */
export interface GravityTerm {
  readonly name: string;
  readonly confidence: Confidence;
  at(r: Vec3, t: number): Vec3;
}

/** The Earth's own gravity, its point mass and its oblateness (world/orbit.ts: WGS 84's GM and J2). */
export const earthJ2: GravityTerm = { name: 'the Earth, with J2', confidence: 'documented', at: (r) => gravity(r) };

/** A body's pull as a point mass at its centre, where the frame's centre is that body's. */
export function centralPoint(name: string, gm: number): GravityTerm {
  return { name, confidence: 'documented', at: (r) => scale(r, -gm / length(r) ** 3) };
}

/**
 * A third body's pull as a point mass: the difference between its pull at `r` and its pull on the central body (whose
 * frame this is, falling toward it as everything in it does). `where(t)` is its place from the central body's centre in
 * the flight's frame.
 */
export function pointMass(name: string, gm: number, where: (t: number) => Vec3, confidence: Confidence): GravityTerm {
  return {
    name,
    confidence,
    at(r, t) {
      const s = where(t);
      const d = sub(s, r);
      return sub(scale(d, gm / length(d) ** 3), scale(s, gm / length(s) ** 3));
    },
  };
}

/** Whether DE440 answers for a flight: loaded, and its liftoff inside the span baked. */
const jpl = (frame: EarthFrame): boolean => ephemerisOf(frame.jdTT(0)) === 'DE440';

/** Where a body is from the Earth's centre in the flight's frame `t` from liftoff: DE440's geometric place, or Meeus's of date. */
function placeOf(body: 'moon' | 'sun', frame: EarthFrame): { where: (t: number) => Vec3; confidence: Confidence } {
  if (jpl(frame)) return { where: (t) => frame.fromIcrf(stateOf(body, frame.jdTT(t)).r), confidence: 'derived' };
  const meeus = body === 'moon' ? moonPosition : sunPosition;
  return { where: (t) => frame.fromDate(meeus(frame.jdTT(t))), confidence: 'estimated' };
}

/** The Moon pulling on a flight about the Earth: DE440's place (derived) when it is loaded, else Meeus's (estimated). */
export const moonOnEarthFlight = (frame: EarthFrame): GravityTerm => {
  const { where, confidence } = placeOf('moon', frame);
  return pointMass('the Moon', MOON.gm.value, where, confidence);
};

/** The Sun pulling on a flight about the Earth: DE440's place (derived) when it is loaded, else Meeus's (estimated). */
export const sunOnEarthFlight = (frame: EarthFrame): GravityTerm => {
  const { where, confidence } = placeOf('sun', frame);
  return pointMass('the Sun', SUN.gm.value, where, confidence);
};

/** The acceleration the terms sum to, at a place and an instant. One term is that term, to the bit. */
export function fieldOf(terms: readonly GravityTerm[]): (r: Vec3, t: number) => Vec3 {
  if (terms.length === 1) {
    const only = terms[0]!;
    return (r, t) => only.at(r, t);
  }
  return (r, t) => terms.reduce<Vec3>((sum, term) => add(sum, term.at(r, t)), [0, 0, 0]);
}

/** Every flight's gravity today: the Earth with J2. */
export const EARTH_GRAVITY: readonly GravityTerm[] = [earthJ2];

/**
 * The same gravity about another centre: a flight about the Moon has the Moon's point mass at its centre and the Earth (and
 * the Sun) as third bodies. `earthFromMoon(t)` is the Earth's place from the Moon's centre in the flight's frame.
 */
export function centralOf(body: 'earth' | 'moon', frame: EarthFrame): readonly GravityTerm[] {
  if (body === 'earth') return EARTH_GRAVITY;
  const { where: moon, confidence } = placeOf('moon', frame);
  const { where: sun } = placeOf('sun', frame);
  return [
    centralPoint('the Moon', MOON.gm.value),
    pointMass('the Earth', EARTH.gm.value, (t) => scale(moon(t), -1), confidence),
    pointMass('the Sun', SUN.gm.value, (t) => sub(sun(t), moon(t)), confidence),
  ];
}
