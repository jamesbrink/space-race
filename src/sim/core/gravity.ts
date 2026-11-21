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
 *
 * What an integrator is handed is a `Field` (`fieldFor`, from a plan's `GravityDef`): the central body's own gravity
 * and the other bodies' pull, kept apart so that a step sums them as it always has (the central body's, plus everything
 * else's push with the others' pull in it), and a plan that names nothing is flown to the bit as before. A plan that
 * gives a sphere (`GravityDef.sphere`: the guidance computer's `RSPHERE`) is flown about the Earth outside it and about
 * the Moon inside it: the same bodies summed on both sides (the Earth with J2, the Moon's field from GRAIL in its
 * principal axes, the Sun where it is named), only the centre the state is from changing (`Field.about`,
 * `recentred`), at the instant the coast crosses it (orbital.ts `flyOrbit`).
 */
import { type Confidence, doc, type Measure } from '../../measure.ts';
import { EARTH, MOON, SUN } from '../../world/bodies.ts';
import type { EarthFrame } from '../../world/earthframe.ts';
import { ephemerisOf, moonPosition, stateOf, sunPosition } from '../../world/ephemeris.ts';
import { add, dot, length, scale, sub, type Vec3 } from '../../world/frames.ts';
import { lunarGravity } from '../../world/lunargravity.ts';
import { principalAxes } from '../../world/moon.ts';
import { gravity, type State } from '../../world/orbit.ts';
import { ttLessUT } from '../../world/time.ts';
import { acceleration, rk4 } from './rk4.ts';

/** One term of gravity: the acceleration at `r` (in the flight's frame, from the central body's centre) at `t` seconds from liftoff, m/s^2. */
export interface GravityTerm {
  readonly name: string;
  readonly confidence: Confidence;
  at(r: Vec3, t: number): Vec3;
  /** The body it is the pull of (or, of a whole field as one term, the one in it), where that is another body than the central one, with a surface a path can pass or meet (`Passed`). */
  readonly body?: Passed;
}

/**
 * Another body a path may pass or meet, as whoever follows a path past it needs it (sim/predict.ts: the nearest it
 * comes, and whether it meets the surface): its name, its GM, m^3/s^2, its radius, m, and where its centre is from the
 * central body's in the flight's frame, `t` seconds from liftoff.
 */
export interface Passed {
  readonly name: string;
  readonly gm: number;
  readonly radius: number;
  where(t: number): Vec3;
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
 * the flight's frame. `body` (its name and radius) says it has a surface, for whoever follows a path past it.
 */
export function pointMass(
  name: string,
  gm: number,
  where: (t: number) => Vec3,
  confidence: Confidence,
  body?: { name: string; radius: number },
): GravityTerm {
  return {
    name,
    confidence,
    ...(body ? { body: { name: body.name, gm, radius: body.radius, where } } : {}),
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
  return pointMass('the Moon', MOON.gm.value, where, confidence, { name: MOON.name, radius: MOON.equatorialRadius.value });
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

/**
 * What a plan's gravity names (sim/plan.ts `GravityDef`) besides the Earth's own, which world/orbit.ts's step flies: the
 * third bodies' pull summed, at a place in the flight's frame and an instant, m/s^2; null where it names none (every flight
 * about the Earth that leaves it no further than its orbit), so nothing is added and nothing moves.
 */
export function thirdOf(
  def: { central: 'earth' | 'moon'; terms: readonly ('j2' | 'moon' | 'sun')[] } | undefined,
  frame: EarthFrame,
): ((r: Vec3, t: number) => Vec3) | null {
  if (!def) return null;
  if (def.central !== 'earth') throw new Error('a flight about the Moon is not flown by the coast about the Earth');
  const terms = [
    ...(def.terms.includes('moon') ? [moonOnEarthFlight(frame)] : []),
    ...(def.terms.includes('sun') ? [sunOnEarthFlight(frame)] : []),
  ];
  return terms.length ? fieldOf(terms) : null;
}

/** The terms a plan's gravity names, the Earth with J2 first, for the predicted path (sim/predict.ts `Ground.gravity`). */
export function termsOf(
  def: { central: 'earth' | 'moon'; terms: readonly ('j2' | 'moon' | 'sun')[] } | undefined,
  frame: EarthFrame,
): readonly GravityTerm[] {
  if (!def) return EARTH_GRAVITY;
  // (a plan with a sphere: its whole field about the Earth as one term, the same bodies as are summed on either side of it;
  // and the Moon in it as a body with a surface, so a path is followed past it and ends on it: sim/predict.ts `Pass`)
  if ('sphere' in def && def.sphere) {
    const field = fieldFor(def as GravityNamed, frame);
    const earth = field.about ? field.about('earth') : field;
    const moon = def.terms.includes('moon') ? moonOnEarthFlight(frame).body : undefined;
    return [
      {
        name: 'the flight’s gravity, about the Earth',
        confidence: earth.confidence,
        at: (r, t) => earth.at(r, t),
        ...(moon ? { body: moon } : {}),
      },
    ];
  }
  return [
    earthJ2,
    ...(def.terms.includes('moon') ? [moonOnEarthFlight(frame)] : []),
    ...(def.terms.includes('sun') ? [sunOnEarthFlight(frame)] : []),
  ];
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

/**
 * The radius about the Moon's centre at which the Apollo guidance computer's coasting integration changed its origin,
 * m: 64,373.76 km, which is 40,000 statute miles. Documented: the flown programme's own constant (Colossus 2A, Comanche
 * 055, ORBITAL INTEGRATION, p. 1354: `RSPHERE 2DEC 64373.76 E3 B-29`, in metres), compared with the distance from the
 * Moon at each step (pp. 1345 and 1346, `CHKSWTCH` and `ORIGCHNG`); Luminary's is the same routine. A sphere of
 * influence by Laplace's rule, the Earth's and the Moon's masses and their mean distance, is 66,200 km: the computer's
 * round figure is within 3 per cent of it, and is what is flown.
 */
export const RSPHERE: Measure = doc(
  64_373_760,
  'Colossus 2A (Comanche 055), ORBITAL INTEGRATION, p. 1354 (RSPHERE 2DEC 64373.76 E3 B-29) and pp. 1345-1346 (CHKSWTCH, ORIGCHNG); www.ibiblio.org/apollo',
);

/** What a plan's gravity names (sim/plan.ts `GravityDef`, which this is the shape of). */
export interface GravityNamed {
  central: 'earth' | 'moon';
  terms: readonly ('j2' | 'moon' | 'sun')[];
  sphere?: Measure;
}

/**
 * Gravity as an integrator takes it: about a centre, the central body's own and the other bodies' apart. A step's
 * acceleration is `own` plus everything else's push with `others` added to the push, in that order, as every simulator
 * has summed it (core/rk4.ts `acceleration`).
 */
export interface Field {
  /** The body the state is from the centre of. */
  readonly central: 'earth' | 'moon';
  /** Its own gravity at `r` (from its centre, in the flight's axes) at `t` seconds from liftoff, m/s^2. */
  own(r: Vec3, t: number): Vec3;
  /** Every other body's pull there, each as the difference from its pull on the central body; null where none is named. */
  readonly others: ((r: Vec3, t: number) => Vec3) | null;
  /** The whole of it: `own` and `others`. */
  at(r: Vec3, t: number): Vec3;
  /** How far the whole is to be trusted: the least of its terms'. */
  readonly confidence: Confidence;
  /** The radius about the Moon's centre the centre changes at, m: only a field made with one (`GravityDef.sphere`). */
  readonly sphere?: number;
  /** The same gravity about the other centre, and the Moon's place and velocity from the Earth's centre in the flight's axes: only a field with a sphere. */
  about?(central: 'earth' | 'moon'): Field;
  moon?(t: number): { r: Vec3; v: Vec3 };
}

const whole = (own: Field['own'], others: Field['others']): Field['at'] => (others ? (r, t) => add(own(r, t), others(r, t)) : own);

/** Every flight's field until one names more: the Earth with J2, to the bit what world/orbit.ts `gravity` gives. */
export const EARTH_FIELD: Field = {
  central: 'earth',
  own: (r) => gravity(r),
  others: null,
  at: (r) => gravity(r),
  confidence: 'documented',
};

const least = (all: readonly Confidence[]): Confidence =>
  (['estimated', 'derived', 'assumed', 'documented'] as const).find((c) => all.includes(c)) ?? 'documented';

/**
 * The Moon's own gravity at a place from its centre in the flight's axes: its field to `LUNAR_DEGREE`
 * (world/lunargravity.ts) in its principal axes, which are turned into the flight's frame at the instant
 * (world/moon.ts `principalAxes`: DE440's librations, or Meeus's mean axes where it is not loaded).
 */
function moonOwn(frame: EarthFrame): { at: (p: Vec3, t: number) => Vec3; confidence: Confidence } {
  let last = Number.NaN;
  let axes: [Vec3, Vec3, Vec3] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const turned = (t: number): [Vec3, Vec3, Vec3] => {
    // (a step asks at the same instant more than once)
    if (t !== last) {
      const m = principalAxes(frame.jdTT(t)).axes;
      axes = [frame.fromIcrf(m[0]), frame.fromIcrf(m[1]), frame.fromIcrf(m[2])];
      last = t;
    }
    return axes;
  };
  return {
    at(p, t) {
      const [x, y, z] = turned(t);
      const a = lunarGravity([dot(p, x), dot(p, y), dot(p, z)]);
      return add(add(scale(x, a[0]), scale(y, a[1])), scale(z, a[2]));
    },
    confidence: principalAxes(frame.jdTT(0)).confidence,
  };
}

/**
 * The field a plan's gravity names, for the flight's frame (`def` left out: `EARTH_FIELD`). About the Earth with no
 * sphere it is what was always flown: the Earth with J2, and the third bodies' pull as `thirdOf` sums it. With a sphere
 * (and the Moon among its terms) the Moon's pull is its whole field on both sides, the Earth's its point mass and J2 on
 * both, and `about` gives the other side: about the Moon, the Moon's own field, the Earth's pull there less its pull
 * on the Moon's centre, and the Sun's the same way. The Moon's and the Sun's places are `stateOf`'s (DE440's where it
 * is loaded, derived; else Meeus's, estimated).
 */
export function fieldFor(def: GravityNamed | undefined, frame: EarthFrame): Field {
  if (!def) return EARTH_FIELD;
  if (!def.sphere || !def.terms.includes('moon')) {
    if (def.central !== 'earth') throw new Error('a flight about the Moon names the sphere it is flown about the Moon within');
    const others = thirdOf(def, frame);
    const own: Field['own'] = (r) => gravity(r);
    const of = [
      earthJ2,
      ...(def.terms.includes('moon') ? [moonOnEarthFlight(frame)] : []),
      ...(def.terms.includes('sun') ? [sunOnEarthFlight(frame)] : []),
    ];
    return { central: 'earth', own, others, at: whole(own, others), confidence: least(of.map((x) => x.confidence)) };
  }
  // (the instant in two parts, liftoff and the seconds of TT since: a Julian date in one double steps by 40 microseconds,
  // 4 cm of the Moon, and a state taken to the Moon's centre and back would step with it)
  const [tt0, lead0] = [frame.jdTT(0), ttLessUT(frame.jdUT(0))];
  const body = (which: 'moon' | 'sun') => (t: number) => {
    const s = stateOf(which, tt0, 'earth', t + ttLessUT(frame.jdUT(t)) - lead0);
    return { r: frame.fromIcrf(s.r), v: frame.fromIcrf(s.v) };
  };
  const moon = body('moon');
  const sun = def.terms.includes('sun') ? body('sun') : null;
  const lunar = moonOwn(frame);
  const confidence = least([stateOf('moon', frame.jdTT(0)).confidence, lunar.confidence]);
  const [gmMoon, gmSun] = [MOON.gm.value, SUN.gm.value];
  /** A point mass's pull at `r` from the centre, less its pull on the centre: it is at `s` from there. */
  const tide = (gm: number, r: Vec3, s: Vec3): Vec3 => {
    const d = sub(s, r);
    return sub(scale(d, gm / length(d) ** 3), scale(s, gm / length(s) ** 3));
  };
  const earthOwn: Field['own'] = (r) => gravity(r);
  const fields: Record<'earth' | 'moon', Field> = {
    earth: {
      central: 'earth',
      own: earthOwn,
      // (the Moon's whole field where the craft is, less the Moon's pull on the Earth's centre, a point's)
      others: (r, t) => {
        const s = moon(t).r;
        const pull = sub(lunar.at(sub(r, s), t), scale(s, gmMoon / length(s) ** 3));
        return sun ? add(pull, tide(gmSun, r, sun(t).r)) : pull;
      },
      at: (r, t) => add(earthOwn(r, t), fields.earth.others!(r, t)),
      confidence,
      sphere: def.sphere.value,
      about: (central) => fields[central],
      moon,
    },
    moon: {
      central: 'moon',
      own: (p, t) => lunar.at(p, t),
      // (the Earth's pull, J2 and all, where the craft is, less its pull on the Moon's centre)
      others: (p, t) => {
        const s = moon(t).r;
        const pull = sub(gravity(add(p, s)), gravity(s));
        return sun ? add(pull, tide(gmSun, p, sub(sun(t).r, s))) : pull;
      },
      at: (p, t) => add(lunar.at(p, t), fields.moon.others!(p, t)),
      confidence,
      sphere: def.sphere.value,
      about: (central) => fields[central],
      moon,
    },
  };
  return fields[def.central];
}

/**
 * A state about one centre as the same state about the other, at `t`: the Moon's place and velocity from the Earth's
 * taken off (`to` the Moon) or put on (`to` the Earth). The axes are the flight's on both sides.
 */
export function recentred<S extends { r: Vec3; v: Vec3 }>(field: Field, s: S, t: number, to: 'earth' | 'moon'): S {
  if (field.central === to || !field.moon) return s;
  const m = field.moon(t);
  return to === 'moon' ? { ...s, r: sub(s.r, m.r), v: sub(s.v, m.v) } : { ...s, r: add(s.r, m.r), v: add(s.v, m.v) };
}

/** Which centre a state about the Earth is flown about under `field`, at `t`: the Moon within the field's sphere of it, the Earth otherwise. */
export function centreAt(field: Field, r: Vec3, t: number): 'earth' | 'moon' {
  if (field.sphere === undefined || !field.moon) return field.central;
  return length(sub(r, field.moon(t).r)) < field.sphere ? 'moon' : 'earth';
}

/**
 * One fixed step (core/rk4.ts) of `h` seconds from a state about the field's centre at `t`, pushed by `push` (everything
 * but gravity, m/s^2: nothing, on a coast): the central body's own gravity, plus the push with the other bodies' pull in
 * it. Under `EARTH_FIELD` it is world/orbit.ts `step`, to the bit.
 */
export function stepIn(field: Field, s: State, t: number, h: number, push?: (s: State, t: number) => Vec3): State {
  const others = field.others;
  const rest = !others
    ? push
    : push
      ? (q: State, at: number): Vec3 => add(push(q, at), others(q.r, at))
      : (q: State, at: number): Vec3 => others(q.r, at);
  return rk4(s, t, h, (q, at) => acceleration(field.own(q.r, at), rest ? rest(q, at) : null));
}

/**
 * The same step for a field with a sphere, from a state about the Earth to a state about the Earth: flown about the Earth
 * (`central` 'earth'), or about the Moon (the state recentred, stepped under the field about the Moon, and brought back;
 * `push` is asked with the state about the Earth either way). One side for the whole step: the caller ends a step on the
 * instant the sphere is crossed.
 */
export function stepAbout(
  field: Field,
  central: 'earth' | 'moon',
  s: State,
  t: number,
  h: number,
  push?: (s: State, t: number) => Vec3,
): State {
  const side = field.about ? field.about(central) : field;
  if (side.central === 'earth') return stepIn(side, s, t, h, push);
  const back = (q: State, at: number): State => recentred(side, q, at, 'earth');
  return back(stepIn(side, recentred(field.about!('earth'), s, t, 'moon'), t, h, push && ((q, at) => push(back(q, at), at))), t + h);
}
