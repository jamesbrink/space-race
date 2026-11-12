/**
 * Daylight: what the Sun's height does to the light and to the sky, from noon through sunset and
 * twilight to night. Everything a ground setting shows that depends on the hour is read from
 * here, so that a dawn launch, a dusk launch and a night launch are lit as themselves and nothing
 * is tuned for one mid-morning.
 *
 * No three.js here: colours are linear [r, g, b]. All of it is `estimated` in the repo's sense
 * (a model fitted by eye to known facts, not a radiative-transfer calculation). The facts:
 *
 * - The direct beam loses 0.06, 0.10 and 0.19 of an optical depth in red, green and blue for
 *   each thickness of air it crosses (Rayleigh scattering, ozone and a clear maritime haze), and
 *   crosses 38 thicknesses at the horizon: so the Sun on the horizon is red and a tenth as strong.
 * - The sky's own light falls about tenfold between a high Sun and sunset, then tenfold for
 *   every three degrees the Sun sinks, to a millionth by the end of nautical twilight (-12).
 *   No screen shows a millionth, and no eye sees it that way: the eye opens up. So the fall is
 *   split between `exposure`, which rises as the light on the ground falls (up to eightfold by
 *   night, as an eye adapts) and the sky's own brightness, which takes the rest, compressed.
 * - Twilight's colour is the lit air along the horizon toward the Sun, orange going red, under a
 *   zenith that stays blue (ozone) while everything else greys.
 */
import { DEG } from '../world/frames.ts';

export type RGB = readonly [number, number, number];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const times = (a: RGB, s: number): RGB => [a[0] * s, a[1] * s, a[2] * s];
const plus = (a: RGB, b: RGB): RGB => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const smooth = (x: number, from: number, to: number): number => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** How many thicknesses of atmosphere a line of sight at this apparent elevation (degrees) crosses: Kasten and Young, 1989. */
export function airmass(elevation: number): number {
  const h = Math.max(elevation, 0);
  return 1 / (Math.sin(h * DEG) + 0.50572 * (h + 6.07995) ** -1.6364);
}

/** Optical depth of one thickness of clear sea-level air, in red, green and blue. */
const DEPTH: RGB = [0.06, 0.1, 0.19];
/** The elevation the hand-tuned daylight was tuned at: Freedom 7's mid-morning. Everything is relative to it. */
const REFERENCE = 50;

/** The direct beam through `thicknesses` of air, relative to the beam at the reference elevation. */
const beam = (thicknesses: number): RGB => {
  const x = thicknesses - airmass(REFERENCE);
  return [Math.exp(-DEPTH[0] * x), Math.exp(-DEPTH[1] * x), Math.exp(-DEPTH[2] * x)];
};

/** Direct sunlight at the reference elevation: warm white (0xffedd0 as linear light) at the stage's strength. */
const SUN_COLOUR: RGB = [1, 0.84, 0.63];
const SUN_STRENGTH = 3.9;
/** Full moonlight overhead as a fraction of that: the true ratio is 1 to 400,000, which no screen can show. */
const MOONLIGHT = 0.006;
const MOON_COLOUR: RGB = [0.58, 0.67, 0.89];

/** The sky by day: overhead and at the horizon. */
const ZENITH_DAY: RGB = [0.025, 0.11, 0.42];
const HORIZON_DAY: RGB = [0.4, 0.58, 0.86];
/** And at dusk, away from the Sun: the zenith keeps its blue, the horizon greys toward lavender. */
const ZENITH_DUSK: RGB = [0.035, 0.085, 0.36];
const HORIZON_DUSK: RGB = [0.4, 0.44, 0.62];
/** The lit air toward a Sun on the horizon, and toward one well below it. */
const GLOW_HIGH: RGB = [1.0, 0.6, 0.26];
const GLOW_LOW: RGB = [1.0, 0.34, 0.1];
/** What is left when the day has gone: starlight and airglow. */
const NIGHT: RGB = [0.0005, 0.0008, 0.0018];

/** The sky's own brightness against a high Sun's, by the Sun's elevation: [degrees, fraction], compressed as the header says. */
const SKY_LEVEL: [number, number][] = [
  [-18, 0],
  [-12, 0.006],
  [-9, 0.03],
  [-6, 0.12],
  [-3, 0.3],
  [0, 0.5],
  [5, 0.8],
  [12, 1],
];

function level(elevation: number): number {
  if (elevation <= SKY_LEVEL[0]![0]) return SKY_LEVEL[0]![1];
  for (let i = 1; i < SKY_LEVEL.length; i++) {
    const [e0, v0] = SKY_LEVEL[i - 1]!;
    const [e1, v1] = SKY_LEVEL[i]!;
    if (elevation <= e1) return v0 + ((v1 - v0) * (elevation - e0)) / (e1 - e0);
  }
  return 1;
}

/** Exposure by day, and how many times further the eye opens by night. */
const DAY_EXPOSURE = 0.8;
const NIGHT_ADAPTATION = 8;

export interface DayLight {
  /** The one direct light: the Sun while any of it shows, then the Moon if it is up. */
  light: { from: 'sun' | 'moon' | 'none'; colour: RGB; intensity: number };
  /** The Sun's beam against the reference, per channel: tints its disc and the glare round it. */
  sun: RGB;
  /** Sky colours for the shader: overhead, at the horizon, and the twilight glow toward the Sun. */
  zenith: RGB;
  horizon: RGB;
  glow: RGB;
  /** The light on the clouds: the Sun's, less dimmed than at the ground, plus the sky's. */
  cloud: RGB;
  /** The sky's light on the ground, as a fraction of a high Sun's day: scales the fill and the reflections. */
  ambient: number;
  /** Tone-mapping exposure, and how far it has been raised over the day's (stars are drawn divided by this). */
  exposure: number;
  adaptation: number;
  /** The colour distance fades to: the horizon's, away from the Sun. */
  haze: RGB;
  /** The faintest star that shows. */
  limitingMagnitude: number;
}

/**
 * The faintest magnitude that shows, by how high the Sun is (degrees): Venus alone by day, for
 * someone who knows where to look; Jupiter and Sirius about sunset; first-magnitude stars by the
 * end of civil twilight; everything by the end of astronomical twilight.
 */
export function limitingMagnitude(sunElevation: number): number {
  const steps: [number, number][] = [
    [-18, 6.5],
    [-12, 4.5],
    [-6, 1.5],
    [0, -2.5],
    [5, -3.8],
  ];
  if (sunElevation <= steps[0]![0]) return steps[0]![1];
  for (let i = 1; i < steps.length; i++) {
    const [e0, m0] = steps[i - 1]!;
    const [e1, m1] = steps[i]!;
    if (sunElevation <= e1) return m0 + ((m1 - m0) * (sunElevation - e0)) / (e1 - e0);
  }
  return steps[steps.length - 1]![1];
}

/**
 * The light and the sky for a Sun at this apparent elevation (degrees; negative below the
 * horizon), with the Moon at its own (`null`: not up) and that much of its disc lit.
 */
export function dayLight(sunElevation: number, moon: { elevation: number; lit: number } | null): DayLight {
  const sky = level(sunElevation);

  // the Sun's disc is half a degree across: it sets over that half degree, not at an instant
  const showing = smooth(sunElevation, -0.3, 0.3);
  const sun = times(beam(airmass(sunElevation)), showing);
  const sunStrength = Math.max(sun[0] * SUN_COLOUR[0], sun[1] * SUN_COLOUR[1], sun[2] * SUN_COLOUR[2]);
  // moonlight is there all along; it shows once the sky has let go
  const moonStrength = moon && moon.elevation > 0 ? MOONLIGHT * moon.lit * Math.exp(-0.18 * (airmass(moon.elevation) - 1)) : 0;
  // One direct light stands for both, so where the Sun hands over to the Moon it passes through
  // nothing: the shadows swing round in the dark, not in plain sight. Only near the hand-over,
  // where neither is three times the other, is it much dimmed.
  const handover = 1 - (Math.min(sunStrength, moonStrength) / Math.max(sunStrength, moonStrength, 1e-12)) ** 2;
  const light: DayLight['light'] =
    sunStrength * SUN_STRENGTH > 1e-4 && sunStrength >= moonStrength
      ? {
          from: 'sun',
          colour: [(sun[0] * SUN_COLOUR[0]) / sunStrength, (sun[1] * SUN_COLOUR[1]) / sunStrength, (sun[2] * SUN_COLOUR[2]) / sunStrength],
          intensity: SUN_STRENGTH * sunStrength * handover,
        }
      : moonStrength > 0
        ? { from: 'moon', colour: MOON_COLOUR, intensity: SUN_STRENGTH * moonStrength * handover }
        : { from: 'none', colour: MOON_COLOUR, intensity: 0 };
  // The eye opens as the light on the ground falls: level ground under a low Sun gets the sine of
  // its height, then only the sky. It makes up a third of each tenfold loss, as far as eight times.
  const ground = 0.8 * sunStrength * (Math.sin(Math.max(sunElevation, 0) * DEG) / Math.sin(REFERENCE * DEG)) + 0.2 * sky;
  const adaptation = Math.min(NIGHT_ADAPTATION, Math.max(0.9, Math.max(ground, 1e-6) ** -0.3));

  const dusk = smooth(-sunElevation, -10, 4);
  const zenith = plus(times(mix(ZENITH_DAY, ZENITH_DUSK, dusk), sky), NIGHT);
  const horizon = plus(times(mix(HORIZON_DAY, HORIZON_DUSK, dusk), sky), NIGHT);
  // the glow comes up as the Sun nears the horizon, reddens as it goes under, and is gone by -14;
  // it fades more slowly than the sky it stands against, which is why twilight has colour at all
  const glowing = smooth(-sunElevation, -9, 0) * (1 - smooth(-sunElevation, 2, 14));
  const glow = times(mix(GLOW_HIGH, GLOW_LOW, smooth(-sunElevation, -2, 6)), glowing * 0.55 * sky ** 0.55);
  // cloud tops stand above half the air, so the Sun that reaches them is less reddened and sets later
  const aloft = times(beam(airmass(Math.max(sunElevation, 0) + 1.5) * 0.5 + 0.5), smooth(sunElevation, -2.5, 0.5));
  const cloud = plus(plus(times(aloft, 0.82), times([1, 1, 1.05], 0.18 * sky)), times(NIGHT, 3));

  return {
    light,
    sun,
    zenith,
    horizon,
    glow,
    cloud,
    ambient: Math.max(sky, 0.004),
    exposure: DAY_EXPOSURE * adaptation,
    adaptation,
    haze: plus(times(mix(HORIZON_DAY, HORIZON_DUSK, dusk), 0.96 * sky), NIGHT),
    limitingMagnitude: limitingMagnitude(sunElevation),
  };
}

/** The faintest star an eye set by a sunlit Earth and a sunlit vehicle picks out of a black sky. Estimated. */
export const DAY_ADAPTED = 5.2;

/**
 * The faintest star that shows from a height, given the faintest that shows from the ground under the same Sun
 * (`ground`: limitingMagnitude) and how much of the air is still above the eye (`air`: 1 at the sea, 0 above it all).
 *
 * Physical: by day stars are lost in the sky's own light, which is sunlight scattered by the air above the eye, so
 * it dims as that air thins; against a bright ground a point is seen when it is a set fraction of the ground under
 * it (Weber's law), so each 2.512 times less sky shows stars a magnitude fainter. For the look: where that ends.
 * With no sky left the limit is the eye's own, set by what else it is looking at: by day `DAY_ADAPTED` (the sky as
 * it is, not as a pilot's sunlit eye had it: Shepard saw no stars through his periscope); by night the ground's
 * own limit, 6.5.
 */
export function starLimit(ground: number, air: number): number {
  return Math.min(Math.max(ground, DAY_ADAPTED), ground - 2.5 * Math.log10(Math.max(air, 1e-6)));
}
