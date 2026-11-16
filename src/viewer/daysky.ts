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
import { smoothstep } from '../util/math.ts';

export type RGB = readonly [number, number, number];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const times = (a: RGB, s: number): RGB => [a[0] * s, a[1] * s, a[2] * s];
const plus = (a: RGB, b: RGB): RGB => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

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
const MOON_COLOUR: RGB = [0.58, 0.67, 0.89];
/** The Moon against the Sun as the tuned day weighed them where one hands over to the other (`dayLight`): 0.006 when full and overhead. */
const TUNED_MOON = 0.006;

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

/** Exposure by day, and how many times further the tone mapping's exposure goes by night (the rest is in the light's own levels: `dayLight`). */
const DAY_EXPOSURE = 0.8;
const NIGHT_ADAPTATION = 8;

// ---------------------------------------------------------------------------------------------------------------------
// What light there is, in lux on level ground: documented (docs/sources.md, "The light at night").

/**
 * What a body at this apparent elevation (degrees) above a clear sky puts on level ground, as a share of what falls
 * square on to it above the air: its beam (`direct`, through the air along the slant) and the sky it lights (`sky`).
 * Janiczek and DeYoung, "Computer programs for sun and moon illuminance with contingent tables and diagrams", U.S.
 * Naval Observatory Circular 171 (1987), subroutine ATMOS: a spherical atmosphere of even density fitted to Bemporad's
 * air masses and to the measured illuminance of Jones and Condit (1948) and Brown (1952). The two terms are its own: the
 * beam's e^-0.21 a thickness, and the sky's 0.0289 e^-0.042 a thickness, which goes on lighting the ground after the
 * body has set (twilight). It fits the measurements down to nautical twilight (-12 degrees), and falls away under it.
 * It is given the apparent elevation (the circular refracts the geometric one first; heavens.ts has done that).
 */
export function circular(elevation: number): { direct: number; sky: number } {
  const ha = elevation * DEG;
  const u = Math.sin(ha);
  const x = 753.66156;
  const s = Math.asin((x * Math.cos(ha)) / (x + 1));
  const m = x * (Math.cos(s) - u) + Math.cos(s);
  return { direct: Math.exp(-0.21 * m) * u, sky: 0.0289 * Math.exp(-0.042 * m) * (1 + ((elevation + 90) * u) / 57.29577951) };
}

/** The Sun's light square on to it above the air, lux: the circular's (IS = 133775 M). */
const SUN_LUX = 133_775;

/**
 * Light on level ground from the Sun and the sky it lights, lux, by the Sun's apparent elevation (degrees): the
 * circular's, 124,000 lux with the Sun overhead, 760 as it sets, 3 at -6 degrees, 0.004 at -12. Under the horizon it is
 * all the sky's (twilight); the beam's term, negative there and under a millionth, is left out.
 */
export function sunLux(elevation: number): number {
  const c = circular(elevation);
  return SUN_LUX * Math.max(0, Math.max(c.direct, 0) + c.sky);
}

/**
 * The full Moon's light square on to it above the air, at its mean distance, lux: Krisciunas and Schaefer, "A model of
 * the brightness of moonlight", PASP 103 (1991) 1033, equation 20 at a phase angle of nothing, 10^(-0.4 x 3.84)
 * foot-candles (10.764 lux each): 0.313 lux. (Without the surge of the last few degrees about full, 35 % more.)
 */
const FULL_MOON = 10 ** (-0.4 * 3.84) * 10.764;

/**
 * How much of the full Moon's light a Moon this much lit gives (`lit`: the share of its disc lit, 0 to 1). Not the share
 * of its disc: its ground throws light back the way the Sun's came, so a quarter Moon gives an eleventh of a full one,
 * not a half. Krisciunas and Schaefer, equation 20: fainter by 0.026 |α| + 4e-9 α⁴ magnitudes at a phase angle α
 * (degrees) from full (from Allen, 1976).
 */
export function moonPhase(lit: number): number {
  const alpha = Math.acos(Math.min(1, Math.max(-1, 2 * lit - 1))) / DEG;
  return 10 ** (-0.4 * (0.026 * alpha + 4e-9 * alpha ** 4));
}

/**
 * The Moon's light at the ground at its apparent elevation (degrees) with that much of it lit, lux: its `beam` square on
 * to it and the `sky` it lights on level ground, through the circular's air, as the Sun's are. It rises over its own
 * half degree. Its distance (a tenth either way) is left out.
 */
export function moonLight(elevation: number, lit: number): { beam: number; sky: number } {
  const above = FULL_MOON * moonPhase(lit) * smoothstep(-0.3, 0.3, elevation);
  const c = circular(Math.max(elevation, -0.3));
  const u = Math.sin(Math.max(elevation, 0) * DEG);
  return { beam: u > 0 ? (above * Math.max(c.direct, 0)) / u : 0, sky: above * Math.max(c.sky, 0) };
}

/** The Moon's on level ground, lux. */
export function moonLux(elevation: number, lit: number): number {
  const m = moonLight(elevation, lit);
  return m.beam * Math.max(0, Math.sin(elevation * DEG)) + m.sky;
}

/**
 * What lights level ground on a clear night with no Moon, far from any town, lux: 0.8 millilux (the U.S. National Park
 * Service's Night Skies programme, "Metrics Guide to Night Skies": the natural sky's horizontal illuminance, with a mean
 * luminance over the whole sky of 250 µcd/m² and 172 at the zenith; Duriscoe, PASP 125 (2013) 1370). Duriscoe's model
 * of it (his 2016 slides) shares it as airglow 48 %, the zodiacal light 28 %, the Galaxy's light 19 % and the stars
 * seen one by one 5 %. The circular's own constant for the night sky is 0.0003 to 0.0005 lux.
 */
export const NIGHT_LUX = {
  airglow: 0.48 * 8e-4,
  zodiacal: 0.28 * 8e-4,
  galaxy: 0.19 * 8e-4,
  stars: 0.05 * 8e-4,
} as const;
/** All of it: 0.8 millilux. */
export const NIGHT_FLOOR = NIGHT_LUX.airglow + NIGHT_LUX.zodiacal + NIGHT_LUX.galaxy + NIGHT_LUX.stars;

/** Twilight on level ground, lux: the Sun's light, once it has set. (Under -18 degrees the circular gives under a hundredth of the night sky's own.) */
export const twilightLux = (elevation: number): number => sunLux(Math.min(elevation, 0));

// ---------------------------------------------------------------------------------------------------------------------
// The eye: how far it opens, and how what it is adapted to is drawn.

/**
 * The luminance (cd/m²) below which a dark-adapted eye opens no further: under it the rods' threshold stands still
 * (Ferwerda, Pattanaik, Shirley and Greenberg, "A model of visual adaptation for realistic image synthesis",
 * SIGGRAPH 1996, the rods' threshold-versus-intensity: flat for log La under -3.94). A darker scene than that is
 * drawn darker, in proportion: the eye has nothing more to give.
 */
export const EYE_LEAST = 10 ** -3.94;
/** How much of the light on it the land gives back: dry steppe, sand and scrub, a fifth. Estimated (concrete is more, the sea less). */
export const LAND_REFLECTANCE = 0.2;

/**
 * The luminance an eye in the open adapts to (cd/m²): the log-mean of the sky's (what the sky sheds on level ground, over
 * π, as a sky of even brightness would) and the land's (what it gives back of all the light on it, over π), half the
 * view each. `sky`: the sky's light on level ground, lux; `lux`: all of the light on it.
 */
export const adaptedTo = (sky: number, lux: number): number => Math.sqrt((sky / Math.PI) * ((LAND_REFLECTANCE * lux) / Math.PI));

/**
 * How the level the eye is adapted to is drawn: the share of each tenfold fall in it the eye does not make up. From
 * sunset on (above the horizon nothing here applies: the day keeps its tuned look) the eye opens by the rest, so it
 * draws what it is adapted to `(adapted / sunset's) ^ NIGHT_KEEP` as bright as it drew sunset's, down to its limit
 * (EYE_LEAST), under which it opens no more. Estimated, for a screen in a lit room: chosen so that a moonless night's
 * land is seen, darker than its sky, and a moonlit night's is plainly brighter than a moonless one's.
 */
export const NIGHT_KEEP = 0.03;

/** How far the eye opens for a scene it is adapted to at `adapted` (cd/m²) beside one at `from`: a factor on the exposure. */
export function opening(adapted: number, from: number): number {
  return (Math.max(adapted, EYE_LEAST) / from) ** (NIGHT_KEEP - 1);
}

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
  /** What there is: the light on level ground, lux (twilight, the Moon's and the night sky's), and the luminance (cd/m²) an eye in the open adapts to under it. */
  lux: number;
  adapted: number;
  /** How many times over what it is the day's scale the natural light is put into the scene, so that the frame's half floats hold a night (1 by day). */
  lifted: number;
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

/** What is left of the old constant night under the sky's colours, let go over the first two degrees under the horizon (above it the tuned day keeps it). */
const NIGHT_GONE = 2;
/**
 * The night sky's own colours for a sky of level 1 (the day's scale): neutral, a little blue, and brighter toward the
 * horizon (the airglow's layer is looked along there: the natural sky's mean is 1.45 times its zenith, 250 against 172
 * µcd/m², NPS). How bright, so that the land and the sky keep their true ratio: what the scene puts on level ground for
 * a sky of level a is its fill (backdrops.ts: 0.28 a in a colour of 0.55) and the reflections of this sky (0.55 of π times
 * its mean), and that is to be π times the sky's mean, as a sky of even brightness sheds: so its mean is 0.11 a. The
 * colour is estimated.
 */
const NIGHT_ZENITH: RGB = [0.072, 0.078, 0.1];
const NIGHT_HORIZON: RGB = [0.13, 0.14, 0.165];

/**
 * The light and the sky for a Sun at this apparent elevation (degrees; negative below the
 * horizon), with the Moon at its own (`null`: not up) and that much of its disc lit.
 *
 * Above the horizon this is the tuned day of the header. From sunset on, what there is follows the light there is
 * (lux on level ground: the circular's twilight, the Moon's by its phase, the night sky's own light), each part in
 * its true proportion to the others, and the eye's law (`opening`) says how far it has opened since sunset: the tone
 * mapping's exposure goes up to its eightfold, and whatever more the eye has opened is put into the light's own levels
 * (`lifted`), as a renderer puts a pre-exposure into its lights so that a dark scene is not lost in its floats.
 */
export function dayLight(sunElevation: number, moon: { elevation: number; lit: number } | null): DayLight {
  const sky = level(sunElevation);

  // the Sun's disc is half a degree across: it sets over that half degree, not at an instant
  const showing = smoothstep(-0.3, 0.3, sunElevation);
  const sun = times(beam(airmass(sunElevation)), showing);
  const sunStrength = Math.max(sun[0] * SUN_COLOUR[0], sun[1] * SUN_COLOUR[1], sun[2] * SUN_COLOUR[2]);
  // What there is, lux on level ground: twilight, the Moon's light (square on to it, and on the ground), the night's.
  const twilight = twilightLux(sunElevation);
  const moonlight = moon ? moonLight(moon.elevation, moon.lit) : { beam: 0, sky: 0 };
  const moonUp = Math.sin(Math.max(moon?.elevation ?? 0, 0) * DEG);
  // (by day the Sun's beam and its sky, as the circular has them; from sunset, its sky alone)
  const sunly =
    sunElevation < 0
      ? { beam: 0, sky: twilight }
      : ((c) => ({ beam: SUN_LUX * Math.max(c.direct, 0), sky: SUN_LUX * c.sky }))(circular(sunElevation));
  const skyLux = sunly.sky + moonlight.sky + NIGHT_FLOOR;
  const lux = skyLux + sunly.beam + moonlight.beam * moonUp;
  const adapted = adaptedTo(skyLux, lux);
  // the eye opens as the light on the ground falls: level ground under a low Sun gets the sine of its height, then only
  // the sky (the tuned day's measure of it, on the day's scale); it makes up a third of each tenfold loss
  const ground = 0.8 * sunStrength * (Math.sin(Math.max(sunElevation, 0) * DEG) / Math.sin(REFERENCE * DEG)) + 0.2 * sky;
  const dayAdaptation = Math.min(NIGHT_ADAPTATION, Math.max(0.9, Math.max(ground, 1e-6) ** -0.3));
  const dusk = smoothstep(-10, 4, -sunElevation);
  const glowing = smoothstep(-9, 0, -sunElevation) * (1 - smoothstep(2, 14, -sunElevation));
  // cloud tops stand above half the air, so the Sun that reaches them is less reddened and sets later
  const aloft = times(beam(airmass(Math.max(sunElevation, 0) + 1.5) * 0.5 + 0.5), smoothstep(-2.5, 0.5, sunElevation));

  // The levels: by day the tuned ones. From sunset, each part of the sky is the light it sheds on the ground over
  // sunset's (on the day's scale: sunset's sky is 0.5), all lifted alike so that they keep their proportions.
  let skyTwilight = sky;
  let skyNight = 0;
  let skyMoon = 0;
  let moonStrength = 0;
  let exposure = DAY_EXPOSURE * dayAdaptation;
  let lifted = 1;
  if (sunElevation < 0) {
    // On the tuned day's scale a sky of level L puts 0.2 L on level ground and a beam of strength b (of the Sun's at its
    // reference) 0.8 b sin h / sin 50: at sunset the sky is 0.5 for the circular's 757 lux. So a lux is `perLux` of sky.
    const sunset = twilightLux(0);
    const perLux = level(0) / sunset;
    skyTwilight = perLux * twilight;
    skyNight = perLux * NIGHT_FLOOR;
    skyMoon = perLux * moonlight.sky;
    const direct = (0.2 * perLux * moonlight.beam * Math.sin(REFERENCE * DEG)) / 0.8;
    // How far the eye has opened since sunset (the tuned day's exposure there: the sky alone on the ground), by its law:
    // the tone mapping's exposure takes it as far as eightfold, the light's own levels the rest.
    const atSunset = DAY_EXPOSURE * Math.min(NIGHT_ADAPTATION, Math.max(0.9, (0.2 * level(0)) ** -0.3));
    const gain = atSunset * opening(adapted, adaptedTo(sunset + NIGHT_FLOOR, sunset + NIGHT_FLOOR));
    exposure = Math.min(DAY_EXPOSURE * NIGHT_ADAPTATION, gain);
    lifted = gain / exposure;
    // (the Sun's own last rays, in the half degree its disc takes to set, are the tuned day's; lifted is 1 there)
    moonStrength = direct * lifted;
    skyTwilight *= lifted;
    skyNight *= lifted;
    skyMoon *= lifted;
  }
  // (by day as the tuned day had it, to the bit; from sunset what the exposure has come to)
  const adaptation = sunElevation < 0 ? exposure / DAY_EXPOSURE : dayAdaptation;
  // the old constant floor of the tuned day: kept above the horizon, let go over the first degrees under it
  const floor = times(NIGHT, smoothstep(-NIGHT_GONE, 0, sunElevation));
  const skyAll = skyTwilight + skyNight + skyMoon;

  // One direct light stands for both, so where the Sun hands over to the Moon it passes through
  // nothing: the shadows swing round in the dark, not in plain sight. Only near the hand-over,
  // where neither is three times the other, is it much dimmed.
  // (weighed by day against the Moon as the tuned day had it, a 0.006 of the Sun when full and overhead, so that the
  // Sun's light by day is that day's to the bit; handed to the Moon's light as it is over the half degree the Sun sets in)
  const tuned = moon && moon.elevation > 0 ? TUNED_MOON * moon.lit * Math.exp(-0.18 * (airmass(moon.elevation) - 1)) : 0;
  const weighed = moonStrength + (tuned - moonStrength) * showing;
  const handover = 1 - (Math.min(sunStrength, weighed) / Math.max(sunStrength, weighed, 1e-12)) ** 2;
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

  const dayZenith = mix(ZENITH_DAY, ZENITH_DUSK, dusk);
  const dayHorizon = mix(HORIZON_DAY, HORIZON_DUSK, dusk);
  // (a moonlit sky is sunlight scattered as the day's is, as faint as the Moon's light: dusk's colours)
  const zenith = plus(plus(plus(times(dayZenith, skyTwilight), times(NIGHT_ZENITH, skyNight)), times(ZENITH_DUSK, skyMoon)), floor);
  const horizon = plus(plus(plus(times(dayHorizon, skyTwilight), times(NIGHT_HORIZON, skyNight)), times(HORIZON_DUSK, skyMoon)), floor);
  // the glow comes up as the Sun nears the horizon, reddens as it goes under, and is gone by -14; it fades more slowly
  // than the sky it stands against, which is why twilight has colour at all (as the tuned day had it to the sky's level)
  const glowShape = glowing * 0.55 * sky ** 0.55;
  const glow = times(
    mix(GLOW_HIGH, GLOW_LOW, smoothstep(-2, 6, -sunElevation)),
    skyTwilight === sky ? glowShape : sky > 0 ? (glowShape * skyTwilight) / sky : 0,
  );
  // (and by night, as the tuned night had it, three times as bright as the night sky's zenith: what the airglow over it
  // and the land under it give it. Estimated)
  const cloud = plus(
    plus(plus(times(aloft, 0.82 * lifted), times([1, 1, 1.05], 0.18 * skyAll)), times(NIGHT_ZENITH, 3 * skyNight)),
    times(floor, 3),
  );

  return {
    light,
    sun,
    zenith,
    horizon,
    glow,
    cloud,
    ambient: sunElevation < 0 ? skyAll : Math.max(sky, 0.004),
    exposure,
    adaptation,
    haze: plus(
      plus(plus(times(dayHorizon, 0.96 * skyTwilight), times(NIGHT_HORIZON, 0.96 * skyNight)), times(HORIZON_DUSK, 0.96 * skyMoon)),
      floor,
    ),
    limitingMagnitude: limitingMagnitude(sunElevation),
    lux,
    adapted,
    lifted,
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
