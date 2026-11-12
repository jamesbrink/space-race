/**
 * The weather round a site, as a map: how much of the sky the cumulus cover, where the high cloud
 * and the middle decks lie, over the two thousand kilometres a flight to 187 km can see.
 *
 * **All of it is estimated.** Nothing here is the analysed weather of any day: no chart or
 * reanalysis has been read. It is a plausible fair-weather morning built from what the repo does
 * know (where the land, the lakes and the sea are, how high the ground is, which way the wind blew
 * at the site) and from how such mornings are organised:
 *
 * - cumulus grow over land that the Sun has warmed, more the further inland, and most over high
 *   ground; lakes and the sea within a few tens of kilometres of a shore stay clear (cool water,
 *   and the sea breeze's sinking air);
 * - over the open ocean the trade cumulus stand in clusters and arcs tens of kilometres across
 *   with clear lanes between, and far from land go over to decks of cells with cracks between;
 * - cover varies over hundreds of kilometres with the weather, and somewhere in two thousand
 *   kilometres there is a front: a band of layered cloud with a cirrus shield ahead of it.
 *
 * What is documented is put in by whoever uses the map, at the site itself: the record's cover
 * there replaces the map's within `NEAR[0]` of the site and gives way to it by `NEAR[1]`
 * (`coverNear`). So the cumulus over the pad are the record's whatever this file does.
 *
 * tools/globe-weather.mjs bakes `weatherAt` into `public/globe/<region>.weather.png`: red the
 * cumulus cover, green the high cloud (cirrus), blue the middle deck (altocumulus near the site,
 * layered cloud in the front), each 0 to 1 as 0 to 255, on the site's own horizontal plane (metres
 * east and north of the site, a point of the globe being put straight down onto it), `SIDE` texels
 * across `EXTENT` metres, rows north to south. No three.js here: the tool and the tests run it.
 */
import { fbm2, hash2, noise2 } from './field.ts';

/** The map's breadth, metres: from 187 km up the horizon is 1,540 km off. */
export const EXTENT = 4_096_000;
/** Texels a side: 4 km each, so a coast's clear slot (25 km) and a lake are a few texels. */
export const SIDE = 1024;
/** Within the first of these distances from the site the cumulus cover is the record's; by the second it is the map's. Metres. */
export const NEAR: readonly [number, number] = [12_000, 40_000];
/** No more of the sky than this is covered by cumulus anywhere: past it the field's noise has no clear air left to cut. */
export const MOST = 0.85;

/** What the map needs to know of a place. */
export interface Place {
  /** Kilometres to the nearest shore: positive on land, negative on the sea and on lakes; it need not be known past 40 km. */
  shore: number;
  /** Height of the ground, metres (the sea's bed is negative). */
  height: number;
}

/** Cloud over a place: fractions of the sky, 0 to 1. */
export interface Weather {
  cumulus: number;
  cirrus: number;
  deck: number;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const KM = 1000;

/** Cells: the distance to the nearest of one point in every square of a grid, and to the next nearest (in squares). */
function cells(x: number, y: number, seed: number): [number, number] {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let d1 = 9,
    d2 = 9;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const px = ix + i + hash2(ix + i, iy + j, seed),
        py = iy + j + hash2(ix + i, iy + j, seed + 1);
      const d = Math.hypot(px - x, py - y);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  return [d1, d2];
}

/**
 * The weather at a point `e` metres east and `n` metres north of the site. `wind`: the way the
 * low wind blows toward, as a unit vector (east, north): streets and the clear air in a lake's
 * lee lie along it.
 */
export function weatherAt(e: number, n: number, place: Place, wind: readonly [number, number] = [-1, 0]): Weather {
  // the weather's own breadth: several hundred kilometres
  const synoptic = fbm2(e / (700 * KM) + 3.1, n / (700 * KM) + 8.7, 411, 3) / 0.875;
  // clusters and lanes: tens to a couple of hundred kilometres, lying a little along the wind
  const along = e * wind[0] + n * wind[1],
    across = -e * wind[1] + n * wind[0];
  const meso = fbm2(along / (190 * KM) + 5.3, across / (110 * KM) + 1.9, 421, 3) / 0.875;
  const clusters = smooth(0.36, 0.7, meso) ** 1.5;

  const land = smooth(-1.5, 3, place.shore);
  const inland = smooth(3, 38, place.shore);
  // over land: a morning's cumulus, thicker inland and over high ground
  const high = smooth(150, 900, place.height);
  const overLand = (0.07 + 0.13 * inland) * (0.2 + 1.9 * clusters) + 0.3 * high;
  // over the sea: clear beside a shore, then the trades' clusters; and here and there an arc of them along the edge
  // of an old shower's outflow (the walls of cells, pushed about so none is straight, and only parts of any)
  const wx = e + 60 * KM * (fbm2(e / (140 * KM) + 1.1, n / (140 * KM) + 2.2, 433, 3) - 0.44),
    wy = n + 60 * KM * (fbm2(e / (140 * KM) + 8.1, n / (140 * KM) + 5.2, 435, 3) - 0.44);
  const [d1, d2] = cells(wx / (120 * KM) + 40, wy / (120 * KM) + 40, 431);
  const some = smooth(0.5, 0.75, noise2(e / (170 * KM) + 3.3, n / (170 * KM) + 6.6, 437));
  const arcs = smooth(0.2, 0.03, d2 - d1) * some;
  const offshore = smooth(-4, -34, place.shore);
  const trades = (0.01 + 0.19 * clusters + 0.1 * arcs * (0.3 + 0.7 * clusters)) * (0.12 + 0.88 * offshore);
  // far out and to the north-east, decks of cells: closed where the weather thickens, open (rings of cloud round clear
  // air) at their edges; the cells pushed about too, their cracks ragged
  const cx = e + 14 * KM * (fbm2(e / (30 * KM) + 4.1, n / (30 * KM) + 7.2, 445, 3) - 0.44),
    cy = n + 14 * KM * (fbm2(e / (30 * KM) + 2.1, n / (30 * KM) + 9.2, 447, 3) - 0.44);
  const [c1, c2] = cells(cx / (42 * KM) + 11, cy / (42 * KM) + 23, 441);
  const thick = smooth(0.5, 0.78, synoptic) * smooth(500 * KM, 950 * KM, Math.hypot(e, n) + 0.5 * (e + n));
  const decks = thick * offshore;
  const ragged2 = 0.75 + 0.5 * noise2(e / (9 * KM), n / (9 * KM), 443);
  const closedCells = 0.8 * smooth(0.03, 0.3, (c2 - c1) * ragged2);
  const openCells = 0.55 * smooth(0.34, 0.08, (c2 - c1) * ragged2) + 0.04;
  const closed = openCells + (closedCells - openCells) * smooth(0.45, 0.8, thick + 0.25 * noise2(e / (300 * KM), n / (300 * KM), 449));
  let cumulus = land * overLand + (1 - land) * trades;
  cumulus = cumulus + (closed - cumulus) * decks;
  // the weather's breadth over all of it: from a third to half as much again
  cumulus *= 0.3 + 1.3 * synoptic;
  // and broad clear lanes between cloudier country, 150 to 300 km across: what is seen of the weather from 187 km
  const lanes = smooth(0.36, 0.62, fbm2(e / (280 * KM) + 6.6, n / (230 * KM) + 3.9, 495, 3) / 0.875);
  cumulus *= 0.12 + 1.2 * lanes;

  // a front to the north-west: a band 1,000 km off, lying west-south-west to east-north-east, waving
  const wave = 180 * KM * (fbm2(e / (600 * KM) + 2.2, n / (600 * KM) + 9.4, 451, 2) - 0.375);
  const off = (0.94 * n - 0.34 * e - 1050 * KM + wave) / KM; // km north-west of its middle line
  const band = Math.exp(-((off / 190) ** 2));
  const ragged = fbm2(e / (90 * KM) + 7.7, n / (60 * KM) + 4.4, 461, 4) / 0.9375;
  let deck = band * smooth(0.25, 0.6, ragged + 0.5 * band - 0.2);
  // its shield of cirrus reaches 400 km ahead of it, thinning; and patches of cirrus elsewhere, few
  const shield =
    Math.exp(-(((off + 260) / 300) ** 2)) * smooth(0.3, 0.75, fbm2(e / (260 * KM) + 1.3, n / (260 * KM) + 6.1, 471, 3) / 0.875 + 0.25);
  const patches = smooth(0.62, 0.86, fbm2(e / (420 * KM) + 9.9, n / (300 * KM) + 2.6, 481, 3) / 0.875);
  const cirrus = Math.min(1, 0.9 * shield + 0.7 * patches);
  // altocumulus in patches under no front: an eighth of the sky where there is any, on the whole
  const patchy = smooth(0.6, 0.85, fbm2(e / (260 * KM) + 4.2, n / (260 * KM) + 7.3, 491, 3) / 0.875);
  deck = Math.min(1, deck + 0.25 * patchy * (1 - band));
  // under the front's own cloud the cumulus are few: no Sun on the ground
  cumulus *= 1 - 0.7 * deck * band;
  return { cumulus: Math.min(MOST, Math.max(0, cumulus)), cirrus, deck };
}

/** How much the map is believed `distance` metres from the site: none at the site, where the record is, all of it past NEAR[1]. */
export const believed = (distance: number): number => smooth(NEAR[0], NEAR[1], distance);

/** The cumulus cover `distance` metres from the site: the record's (`site`) there, the map's (`map`) away from it. */
export const coverNear = (site: number, map: number, distance: number): number => site + (map - site) * believed(distance);

/**
 * GLSL: the map read at a point of the site's plane (the scene's x and z, metres).
 * `uWeather`: the bearing of the scene's +X as its sine and cosine, one over the map's breadth, and the record's
 * cumulus cover at the site. `weatherAt(xz)`: cumulus cover (with the record's at the site), cirrus, deck.
 */
export const WEATHER_GLSL = /* glsl */ `
  uniform sampler2D tWeather;
  uniform vec4 uWeather;
  vec3 weatherAt(vec2 xz) {
    vec2 en = vec2(xz.x * uWeather.x + xz.y * uWeather.y, xz.x * uWeather.y - xz.y * uWeather.x);
    vec2 uv = en * uWeather.z + 0.5;
    vec3 w = texture(tWeather, vec2(uv.x, 1.0 - uv.y)).rgb;
    w.r = mix(uWeather.w, w.r, smoothstep(${NEAR[0].toFixed(1)}, ${NEAR[1].toFixed(1)}, length(xz)));
    return w;
  }`;

/** The scene's x and z of a point `e` east and `n` north of the site, the scene's +X lying on `bearing` (radians from north, clockwise). */
export const toScene = (e: number, n: number, bearing: number): [number, number] => [
  e * Math.sin(bearing) + n * Math.cos(bearing),
  e * Math.cos(bearing) - n * Math.sin(bearing),
];

/**
 * GLSL: what is added to the cumulus's noise (air.ts: cloudNoise) at a place so that, cut where it always is, it
 * covers what the map says there and not the site's cover everywhere: the difference of the two covers' cuts
 * (`cloudCutAt`, air.ts: cloudCutGlsl), and away from the site streets along the wind (a noise 43 km long and 8 km
 * across, as cumulus line up over warm ground and sea in a steady wind; its strength estimated). Nothing at the
 * site. `q`: the place in the field's own frame, in cells; `xz`: in the scene's; `w`: the weather there; `streets`:
 * the streets' part of what is returned.
 * Needs WEATHER_GLSL, cloudCutAt and `<prefix>noise2`; `uWeatherWind`: the low wind's way in the scene's x and z.
 */
export const cumulusBiasGlsl = (prefix: string): string => /* glsl */ `
  uniform vec2 uWeatherWind;
  float cumulusBias(vec2 q, vec2 xz, out vec3 w, out float streets) {
    w = weatherAt(xz);
    float away = smoothstep(${NEAR[0].toFixed(1)}, ${NEAR[1].toFixed(1)}, length(xz));
    streets = 0.12 * away * (${prefix}noise2(vec2(dot(q, uWeatherWind) * 0.035, dot(q, vec2(-uWeatherWind.y, uWeatherWind.x)) * 0.19) + 31.7, 95) - 0.5);
    // and clusters of them, 19 and 50 km across, with clearer air between: so the field has every size from a puff
    // to a cluster of cells, and from far off its large shapes stand out more than its small ones (estimated)
    streets += away * (0.075 * (${prefix}noise2(q * 0.08 + 11.3, 96) - 0.5) + 0.085 * (${prefix}noise2(q * 0.03 + 23.9, 98) - 0.5));
    return cloudCutAt(uWeather.w) - cloudCutAt(w.r) + streets;
  }`;

/** The heights of the two sheets over the cumulus, metres above the sea: the middle deck (altocumulus at 3,600 m at Patrick at 10:00, NOAA ISD) and the cirrus (estimated). */
export const DECK_HEIGHT = 3600;
export const CIRRUS_HEIGHT = 10_500;

/** The middle deck's own texture at a point of the scene's plane (metres), 0 to 1: patches of kilometres, lumps of hundreds of metres. In GLSL as `deckTex`. */
export const deckTex = (x: number, z: number): number =>
  0.45 * noise2(x / 9000 + 3.7, z / 9000 + 3.7, 501) +
  0.3 * noise2(x / 2300 + 9.1, z / 2300 + 9.1, 502) +
  0.25 * noise2(x / 640 + 5.3, z / 640 + 5.3, 503);

let deckSorted: Float64Array | null = null;
/** The value of the deck's texture that `cover` of the sky lies above: cut there, the deck covers that much. */
export function deckCutAt(cover: number): number {
  if (!deckSorted) {
    deckSorted = new Float64Array(300 * 300);
    for (let i = 0; i < 300; i++) for (let j = 0; j < 300; j++) deckSorted[i * 300 + j] = deckTex(i * 173.3 + 11, j * 191.7 + 5);
    deckSorted.sort();
  }
  const s = deckSorted;
  return s[Math.min(s.length - 1, Math.max(0, Math.floor((1 - cover) * s.length)))]!;
}

const DECK_CUTS = 17;
/**
 * GLSL: the two sheets. `deckAt(xz, fp, cover)`: how opaque the middle deck is at a point of the scene's plane, cut
 * so that `cover` of the sky has any (deckCutAt), with whatever of its texture is finer than a pixel (`fp`, metres)
 * left at its mean, so it never shimmers; thin where there is little of it (altocumulus, seen through), solid in a
 * front's band. `cirrusAt(xz, fp, amount)`: the cirrus, fibres along the high wind (`uWeatherHigh`, a unit vector in
 * the scene's x and z), never more than half opaque. Needs `<prefix>noise2`. Their look is estimated.
 */
export const sheetsGlsl = (prefix: string): string => /* glsl */ `
  uniform vec2 uWeatherHigh;
  const float DECK_CUTS[${DECK_CUTS}] = float[${DECK_CUTS}](${Array.from({ length: DECK_CUTS }, (_, i) => deckCutAt(i / (DECK_CUTS - 1)).toFixed(4)).join(', ')});
  // how much of the sky the middle deck covers at a place: the map's, and round the site an eighth (one eighth of
  // altocumulus at 3,600 m at Patrick at 10:00, NOAA ISD: documented for that hour, taken for the morning)
  float deckCoverAt(vec3 w, vec2 xz) { return mix(0.125, w.b, smoothstep(40000.0, 150000.0, length(xz))); }
  float deckTex(vec2 xz, float fp) {
    float a = ${prefix}noise2(xz / 9000.0 + 3.7, 501);
    float b = mix(${prefix}noise2(xz / 2300.0 + 9.1, 502), 0.5, smoothstep(700.0, 1800.0, fp));
    float c = mix(${prefix}noise2(xz / 640.0 + 5.3, 503), 0.5, smoothstep(200.0, 500.0, fp));
    return 0.45 * mix(a, 0.5, smoothstep(2700.0, 7000.0, fp)) + 0.3 * b + 0.25 * c;
  }
  float deckAt(vec2 xz, float fp, float cover) {
    if (cover <= 0.004) return 0.0;
    float u = clamp(cover, 0.0, 1.0) * ${(DECK_CUTS - 1).toFixed(1)};
    int i = int(min(floor(u), ${(DECK_CUTS - 2).toFixed(1)}));
    float cut = mix(DECK_CUTS[i], DECK_CUTS[i + 1], u - float(i));
    // (far off, where its texture is under a pixel, it is its cover, evenly)
    float even = smoothstep(2700.0, 7000.0, fp);
    float soft = 0.035 + 0.1 * smoothstep(100.0, 2700.0, fp);
    float a = mix(smoothstep(cut - soft, cut + soft, deckTex(xz, fp)), cover, even);
    // Altocumulus is cloudlets two or three hundred metres across with clear air between, closing up toward a patch's
    // middle; a front's deck is solid. (So an eighth of the sky has altocumulus over it, and less than that is hidden.)
    // (each size of them left at its mean where it is under a pixel or two: nothing to shimmer)
    // (each size of them left at its mean before it is as small as two pixels: at one, a cloudlet was a white pixel
    // beside a clear one, and the deck a stipple that would crawl. Past that the deck is its patches, half seen through.)
    // (the noise's own grid turned two ways, or the cloudlets line up in rows and columns)
    vec2 r1 = mat2(0.7986, 0.6018, -0.6018, 0.7986) * xz, r2 = mat2(0.9205, -0.3907, 0.3907, 0.9205) * xz;
    float lets = 0.65 * mix(${prefix}noise2(r1 / 150.0 + 2.9, 504), 0.5, smoothstep(30.0, 75.0, fp))
      + 0.35 * mix(${prefix}noise2(r2 / 55.0 + 6.1, 505), 0.5, smoothstep(11.0, 27.0, fp));
    // (past that, clumps of them a kilometre across, thicker and thinner; and at last only the patch, half seen through)
    float clumps = mix(0.4 + 0.3 * smoothstep(0.3, 0.7, ${prefix}noise2(r2 / 1100.0 + 8.3, 506)), 0.55, smoothstep(400.0, 1100.0, fp));
    lets = mix(smoothstep(0.44, 0.58, lets + 0.4 * (deckTex(xz, fp) - cut)), clumps, smoothstep(30.0, 75.0, fp));
    return a * mix(0.06 + 0.88 * lets, 0.98, smoothstep(0.35, 0.85, cover));
  }
  float cirrusAt(vec2 xz, float fp, float amount) {
    if (amount <= 0.004) return 0.0;
    vec2 p = vec2(dot(xz, uWeatherHigh), dot(xz, vec2(-uWeatherHigh.y, uWeatherHigh.x)));
    // (the fibres wander: none is ruled)
    p.y += 9000.0 * (${prefix}noise2(p / vec2(45000.0, 30000.0) + 3.3, 514) - 0.5);
    float a = ${prefix}noise2(p / vec2(70000.0, 16000.0) + 1.3, 511);
    float b = mix(${prefix}noise2(p / vec2(21000.0, 3200.0) + 7.9, 512), 0.5, smoothstep(1000.0, 2500.0, fp));
    float c = mix(${prefix}noise2(p / vec2(9000.0, 1100.0) + 4.6, 513), 0.5, smoothstep(350.0, 900.0, fp));
    float t = 0.46 * a + 0.36 * b + 0.18 * c;
    return 0.5 * amount * smoothstep(0.36, 0.7, t + 0.25 * (amount - 0.5));
  }`;
