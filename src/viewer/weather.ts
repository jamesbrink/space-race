/**
 * The weather round a site, as a map: how much of the sky the cumulus cover, where the high cloud
 * and the middle decks lie, over the two thousand kilometres a flight to 187 km can see.
 *
 * **All of it is estimated, but for what a day's record says.** Nothing else here is the analysed weather
 * of any day: no chart or reanalysis has been read. It is a plausible fair-weather morning built from what
 * the repo does know (where the land, the lakes and the sea are, how high the ground is, which way the wind
 * blew at the site that day) and from how such mornings are organised:
 *
 * - cumulus grow over land that the Sun has warmed, more the further inland, and most over high
 *   ground; lakes and the sea within a few tens of kilometres of a shore stay clear (cool water,
 *   and the sea breeze's sinking air);
 * - over the open ocean the trade cumulus stand in clusters and arcs tens of kilometres across
 *   with clear lanes between, and far from land go over to decks of cells with cracks between;
 * - cover varies over hundreds of kilometres with the weather, and somewhere in two thousand
 *   kilometres there is a front: a band of layered cloud with a cirrus shield ahead of it.
 *
 * What is documented is the flight's (types.ts: DayWeather; viewer/day.ts), and it holds whatever this file does:
 *
 * - at the site, layer by layer: the record's cumulus cover replaces the map's within `NEAR[0]` of the site and
 *   gives way to it by `NEAR[1]` (`coverNear`); the middle deck's within 40 km, gone by 150 (`deckCoverAt`); the high
 *   cloud's as far as an observer under it judges the sky, and gone by half as far again (day.ts: `reportReach`;
 *   `highCoverAt` in the shaders, and in the map itself);
 * - over a stretch of country the record speaks of ("High cirrus blotted out everything except an area from about
 *   Daytona Beach back inland to Orlando ..."), all over it: `weatherAt` puts the record's cover there in place of
 *   its own (`MapDay.beyond`).
 *
 * **One map is baked for each region and day** (`<region>.<date>.weather.png`), from the flight's own record. Not one
 * map with the day's record blended in as it is drawn, and not parameters to the shaders: a day's weather is not
 * another day's with a number changed (the wind lies another way, so the streets do; the high cloud is over other
 * country), a record's stretch of country is a shape on the map and nothing a uniform says, and a map per day leaves
 * every shader that reads it as it was, with one texture and nothing more to work out for each pixel. So the first
 * day's map is the file it always was, byte for byte, and a later day costs its own file (0.9 MB, asked for once
 * the eye is 1,500 m up: globe.ts) and nothing else. The estimated part of each day's map is taken from another part of the
 * same noise (`MapDay.apart`), so two days do not have the same clusters in the same places.
 *
 * tools/globe-weather.mjs bakes `weatherAt` into `public/globe/<region>.<date>.weather.png`: red the
 * cumulus cover, green the high cloud (cirrus), blue the middle deck (altocumulus near the site,
 * layered cloud in the front), alpha how much of the place is land (so the field can be organised as it is over
 * land and over the sea: `landShare`), each 0 to 1 as 0 to 255, on the site's own horizontal plane (metres
 * east and north of the site, a point of the globe being put straight down onto it), `SIDE` texels
 * across `EXTENT` metres, rows north to south. No three.js here: the tool and the tests run it.
 */
import type { WeatherBeyond } from '../types.ts';
import { type Day, DECK_HEIGHT, reportReach, VEIL_FORWARD } from './day.ts';
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
  /** Where it is, degrees north and east: only a day whose record speaks of a stretch of country asks (MapDay.beyond). */
  latitude?: number;
  longitude?: number;
}

/** What the map is given of a day (day.ts: Day; tools/globe-weather.mjs). */
export interface MapDay {
  /** The way the low wind blows toward, as a unit vector (east, north): streets and the clear air in a lake's lee lie along it. */
  wind: readonly [number, number];
  /** Days from the first map's day: the estimated field is read that many times `APART` away in its noise, so each day has its own. */
  apart: number;
  /** The high cloud the record has at the site: how much of the sky, and how far the report holds (metres: all of it to the first, none by the second). */
  /** `ragged`: fibres, not a veil: the record gives way along a lobed line (`heldDistance`), not a circle. */
  high?: { cover: number; reach: readonly [number, number]; ragged?: true };
  /** What the record says of the sky over a stretch of country. */
  beyond: readonly WeatherBeyond[];
}

/** What the map is given of a day as the viewer has it (day.ts). */
export function mapDayOf(day: Day): MapDay {
  // (a part of the wind's way under a millionth of a millionth is none: a wind from 090 blows toward 270, due west)
  const tidy = (v: number) => Math.round(v * 1e12) / 1e12 || 0;
  return {
    wind: [tidy(Math.sin(day.drift)), tidy(Math.cos(day.drift))],
    apart: day.apart,
    ...(day.high.cover !== null
      ? { high: { cover: day.high.cover, reach: reportReach(day.high.height), ...(day.high.veil ? {} : { ragged: true as const }) } }
      : {}),
    beyond: day.beyond,
  };
}

/** The first map's day: a wind toward 270 (5 May 1961, from 090), and nothing recorded past the site. */
const FIRST_DAY: MapDay = { wind: [-1, 0], apart: 0, beyond: [] };
/** How far apart in the noise two days' fields are read, metres east and north for each day between them: far past anything the noise repeats over. */
const APART: readonly [number, number] = [7_919_000, -4_211_000];
/** A record's stretch of country ends over this many degrees outside its bounds: its edge is not a ruled line. */
const FEATHER = 0.6;

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
 * The weather at a point `east` metres east and `north` metres north of the site, on a day (the first map's, left
 * out). Estimated, but for what the day's record says (`MapDay.high`, `MapDay.beyond`), which is put in last and
 * stands over everything else.
 */
export function weatherAt(east: number, north: number, place: Place, day: MapDay = FIRST_DAY): Weather {
  const wind = day.wind;
  // (where in the noise this day's field is read: the site's own place on the first day)
  const e = east + day.apart * APART[0],
    n = north + day.apart * APART[1];
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
  const thick = smooth(0.5, 0.78, synoptic) * smooth(500 * KM, 950 * KM, Math.hypot(east, north) + 0.5 * (east + north));
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
  const off = (0.94 * north - 0.34 * east - 1050 * KM + wave) / KM; // km north-west of its middle line
  const band = Math.exp(-((off / 190) ** 2));
  const ragged = fbm2(e / (90 * KM) + 7.7, n / (60 * KM) + 4.4, 461, 4) / 0.9375;
  let deck = band * smooth(0.25, 0.6, ragged + 0.5 * band - 0.2);
  // its shield of cirrus reaches 400 km ahead of it, thinning; and patches of cirrus elsewhere, few
  const shield =
    Math.exp(-(((off + 260) / 300) ** 2)) * smooth(0.3, 0.75, fbm2(e / (260 * KM) + 1.3, n / (260 * KM) + 6.1, 471, 3) / 0.875 + 0.25);
  const patches = smooth(0.62, 0.86, fbm2(e / (420 * KM) + 9.9, n / (300 * KM) + 2.6, 481, 3) / 0.875);
  let cirrus = Math.min(1, 0.9 * shield + 0.7 * patches);
  // altocumulus in patches under no front: an eighth of the sky where there is any, on the whole
  const patchy = smooth(0.6, 0.85, fbm2(e / (260 * KM) + 4.2, n / (260 * KM) + 7.3, 491, 3) / 0.875);
  deck = Math.min(1, deck + 0.25 * patchy * (1 - band));
  // under the front's own cloud the cumulus are few: no Sun on the ground
  cumulus *= 1 - 0.7 * deck * band;
  cumulus = Math.min(MOST, Math.max(0, cumulus));

  // The record, over all of that. What was said of a stretch of country, all over it, each in its turn (a later one
  // stands over an earlier where they overlap). "Patches" of low cloud are the field's own clusters, about the cover
  // given (as much again where they are thickest, a third of it between them): how they lay is not recorded.
  for (const b of day.beyond) {
    const k = within(place, b);
    if (k <= 0) continue;
    if (b.high) cirrus += (b.high.value - cirrus) * k;
    if (b.low) cumulus += (Math.min(MOST, b.low.value * (0.35 + 1.3 * smooth(0.3, 0.7, meso))) - cumulus) * k;
  }
  // And last, standing over those, the high cloud the station under it reported, as far as its report holds:
  if (day.high) {
    const held = day.high.ragged ? heldDistance(east, north) : Math.hypot(east, north);
    cirrus += (day.high.cover - cirrus) * (1 - smooth(day.high.reach[0], day.high.reach[1], held));
  }
  return { cumulus, cirrus, deck };
}

/**
 * How far a place is from the site as the record of fibrous high cloud is taken to hold, metres: its distance, longer
 * and shorter by up to a half in lobes 20 to 90 km across, so that the report gives way along a ragged line, as a
 * field of cirrus thins out in sheaves, and not along a circle (which from height, and in the cel look with an edge,
 * was a disc no cloud is). A veil keeps the circle: it covers the whole sky, and its edge is far off and soft. The same
 * in the shaders (`highCoverAt`). Estimated.
 */
export const heldDistance = (east: number, north: number): number =>
  Math.hypot(east, north) *
  (0.5 + (0.55 * noise2(east / 90_000 + 3.7, north / 90_000 + 8.1, 519) + 0.45 * noise2(east / 22_000 + 1.3, north / 22_000 + 4.4, 523)));

/** How far inside a record's stretch of country a place is: 1 within its bounds, 0 from FEATHER degrees outside them (or where the place is not given). */
function within(place: Place, b: WeatherBeyond): number {
  if (place.latitude === undefined || place.longitude === undefined) return 0;
  const lat = smooth(b.south - FEATHER, b.south, place.latitude) * (1 - smooth(b.north, b.north + FEATHER, place.latitude));
  const lon = smooth(b.west - FEATHER, b.west, place.longitude) * (1 - smooth(b.east, b.east + FEATHER, place.longitude));
  return lat * lon;
}

/** How much of a place is land, for the map's fourth channel: all of it a few kilometres in from a shore, none on the water. */
export const landShare = (place: Place): number => smooth(-1.5, 3, place.shore);

/** How much the map is believed `distance` metres from the site: none at the site, where the record is, all of it past NEAR[1]. */
export const believed = (distance: number): number => smooth(NEAR[0], NEAR[1], distance);

/** The cumulus cover `distance` metres from the site: the record's (`site`) there, the map's (`map`) away from it. */
export const coverNear = (site: number, map: number, distance: number): number => site + (map - site) * believed(distance);

/**
 * The high cloud a day's record has over the site, as the shaders are compiled with it: its cover there, its optical
 * depth, whether it is a veil, and between which distances from the site the record gives way to the map (day.ts:
 * reportReach). Null on a day whose record has none there: the map's own cirrus stands, and nothing of this is compiled.
 *
 * **A day's figures are written into the shaders, not handed to them** (a flight is a page: day.ts), and what a day
 * does not have is left out of the text altogether. So on a day with no high cloud in its record the shaders are, to
 * the letter, what they were before any flight gave its day, and Freedom 7's picture with them (tests/weather.test.mjs
 * pins their text). Handed over as uniforms, with every new term nothing on such a day, the same picture came out
 * with the last bit of a pixel or five in a million changed: the compiler fuses and orders the arithmetic by the
 * whole expression, not by what its terms come to.
 */
export const highOf = (day: Day | null | undefined): { cover: number; depth: number; veil: boolean; reach: [number, number] } | null =>
  day && day.high.cover !== null
    ? { cover: day.high.cover, depth: day.high.depth, veil: day.high.veil, reach: reportReach(day.high.height) }
    : null;

/**
 * GLSL: the map read at a point of the site's plane (the scene's x and z, metres), on a day (day.ts).
 * `uWeather`: the bearing of the scene's +X as its sine and cosine, one over the map's breadth, and the record's
 * cumulus cover at the site. `weatherAt(xz)`: cumulus cover (with the record's at the site), high cloud, deck.
 */
export const weatherGlsl = (day: Day | null | undefined): string => {
  const high = highOf(day);
  return /* glsl */ `
  uniform sampler2D tWeather;
  uniform vec4 uWeather;
  uniform float uWeatherIn;   // how far the map has come in since it arrived, 0 to 1: before, the site's cover everywhere
  float gLand;   // how much of the place weatherAt last read is land, 0 to 1 (the map's fourth channel)
  vec3 weatherAt(vec2 xz) {
    vec2 en = vec2(xz.x * uWeather.x + xz.y * uWeather.y, xz.x * uWeather.y - xz.y * uWeather.x);
    vec2 uv = en * uWeather.z + 0.5;
    vec4 map = texture(tWeather, vec2(uv.x, 1.0 - uv.y));
    gLand = map.a;
    vec3 w = mix(vec3(uWeather.w, 0.0, 0.0), map.rgb, uWeatherIn);${
      high
        ? /* glsl */ `
    // (and until the map has come in, the high cloud the record has over the site, everywhere: a sky reported whole is whole)
    w.g = mix(${high.cover.toFixed(3)}, map.g, uWeatherIn);`
        : ''
    }
    w.r = mix(uWeather.w, w.r, smoothstep(${NEAR[0].toFixed(1)}, ${NEAR[1].toFixed(1)}, length(xz)));
    return w;
  }`;
};

/** The scene's x and z of a point `e` east and `n` north of the site, the scene's +X lying on `bearing` (radians from north, clockwise). */
export const toScene = (e: number, n: number, bearing: number): [number, number] => [
  e * Math.sin(bearing) + n * Math.cos(bearing),
  e * Math.cos(bearing) - n * Math.sin(bearing),
];

/**
 * GLSL: what is added to the cumulus's noise (air.ts: cloudNoise) at a place so that, cut where it always is, it
 * covers what the map says there and not the site's cover everywhere: the difference of the two covers' cuts
 * (`cloudCutAt`, air.ts: cloudCutGlsl), and away from the site streets along the wind (a noise 50 km long and 4 km
 * across, as cumulus line up over warm ground and sea in a steady wind; its strength estimated). Nothing at the
 * site. `q`: the place in the field's own frame, in cells; `xz`: in the scene's; `w`: the weather there; `streets`:
 * the streets' part of what is returned.
 * Needs weatherGlsl, cloudCutAt and `<prefix>noise2`; `uWeatherWind`: the low wind's way in the scene's x and z.
 */
export const cumulusBiasGlsl = (prefix: string): string => /* glsl */ `
  uniform vec2 uWeatherWind;
  // Streets 4 km apart and tens of kilometres long, wandering a little: as cumulus stand over Florida and the sea off
  // it on a May afternoon in MODIS's pictures (Aqua, 9 May 2018). What is added to the noise for them at a place of
  // the field (in cells), before how far from the site it is; their strength estimated.
  // Over land (\`land\`, 0 to 1) they are straight and strong, as over Florida; over the sea they are weaker and bend
  // through tens of degrees over a hundred kilometres, as the trades' rows do.
  float cumulusLanes(vec2 q, float land) {
    vec2 lane = vec2(dot(q, uWeatherWind), dot(q, vec2(-uWeatherWind.y, uWeatherWind.x)));
    lane.y += (22.0 - 16.0 * land) * (${prefix}noise2(lane * vec2(0.011, 0.009) + 3.9, 102) - 0.5);
    lane.y += 3.2 * (${prefix}noise2(lane * vec2(0.035, 0.03) + 7.3, 99) - 0.5) + 0.9 * (${prefix}noise2(lane * vec2(0.16, 0.12) + 2.6, 100) - 0.5);
    // (a street is cloud or clear air, with little between: the noise sharpened about its middle)
    // (and in some country more than other: streets come and go over tens of kilometres, none ruled from edge to edge)
    float some = smoothstep(0.3, 0.75, ${prefix}noise2(q * 0.022 + 41.3, 101));
    return mix(0.03 + 0.1 * some, 0.08 + 0.2 * some, land) * (smoothstep(0.3, 0.7, ${prefix}noise2(lane * vec2(0.03, 0.38) + 31.7, 95)) - 0.5);
  }
  // Arcs over the sea: cumulus stand along the edges of old showers' outflows, in curved lines tens of kilometres
  // long round clear air (the walls between cells 40 km across, pushed about so none is a ruled polygon, and only
  // parts of any). 0 to 1: on an arc.
  float cumulusArcs(vec2 q) {
    vec2 g = q / 27.0 + 0.9 * (vec2(${prefix}noise2(q / 21.0 + 6.1, 103), ${prefix}noise2(q / 21.0 + 1.7, 104)) - 0.5);
    ivec2 i = ivec2(floor(g));
    float d1 = 9.0, d2 = 9.0;
    for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
      ivec2 c = i + ivec2(dx, dy);
      float d = distance(g, vec2(c) + vec2(${prefix}hash2(c, 106), ${prefix}hash2(c, 107)));
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return (1.0 - smoothstep(0.02, 0.14, d2 - d1)) * smoothstep(0.35, 0.65, ${prefix}noise2(q / 60.0 + 9.1, 105));
  }
  float cumulusBias(vec2 q, vec2 xz, out vec3 w, out float streets) {
    w = weatherAt(xz);
    float land = gLand;
    float away = smoothstep(${NEAR[0].toFixed(1)}, ${NEAR[1].toFixed(1)}, length(xz));
    streets = away * cumulusLanes(q, land);
    // and clusters of them, 19 and 50 km across, with clearer air between: so the field has every size from a puff
    // to a cluster of cells, and from far off its large shapes stand out more than its small ones (estimated); over
    // the sea, where no warm ground lines them up, the clusters are most of what there is
    streets += away * mix(1.7, 1.0, land) * (0.05 * (${prefix}noise2(q * 0.08 + 11.3, 96) - 0.5) + 0.06 * (${prefix}noise2(q * 0.03 + 23.9, 98) - 0.5));
    if (land < 0.99 && away > 0.0) streets += away * (1.0 - land) * 0.13 * (cumulusArcs(q) - 0.12);
    return cloudCutAt(uWeather.w) - cloudCutAt(w.r) + streets;
  }`;

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
 * How many of the middle deck's cloudlets stand (`stand`: a cloudlet whose chance is under it stands, rising out of the
 * sheet as it passes 0.12 under) for them to cover each share of a patch (`fill` in deckAt, DECK_FILLS), with their
 * breadths as deckAt grows them, their puffs and lumps, and their union and rim as soft as the pixel: for a pixel (on
 * the plane where the cloudlets are 250 m apart: DECK_CELL) of 25, 40, 65 and 90 m. Found by bisection, a JS copy of
 * deckAt's cloudlets (without the place's pushes) over 20,000 points of a square 60 km across. As the pixel grows two
 * cloudlets run together more broadly (so that the crease between them is never under a pixel, which was most of what
 * flickered as the eye climbed), and fewer stand for the same cover. Where a patch is thickest they cover 0.85 to 0.87
 * of it, not 0.9. Measure again after changing a cloudlet's breadth, how they grow or run together, or how their
 * opacity is worked out.
 */
const DECK_FILLS = [0.1, 0.25, 0.4, 0.55, 0.7, 0.9] as const;
const DECK_PRESENCE: readonly (readonly [number, readonly number[]])[] = [
  [25, [0.5216, 0.742, 0.8076, 0.8766, 0.9672, 1.15]],
  [40, [0.4858, 0.7111, 0.7884, 0.8656, 0.966, 1.15]],
  [65, [0.383, 0.5969, 0.6919, 0.7836, 0.9027, 1.15]],
  [90, [0.2607, 0.4691, 0.5764, 0.6792, 0.8144, 1.15]],
];
/** GLSL: a row of DECK_PRESENCE read at `fill`, piecewise even. */
const presenceRow = (row: readonly number[]): string =>
  row
    .slice(1)
    .reduce(
      (acc, p, i) =>
        `mix(${acc}, ${p.toFixed(4)}, clamp((fill - ${DECK_FILLS[i]!.toFixed(3)}) / ${(DECK_FILLS[i + 1]! - DECK_FILLS[i]!).toFixed(3)}, 0.0, 1.0))`,
      row[0]!.toFixed(4),
    );
/** GLSL: the rows of DECK_PRESENCE blended by the pixel `fs`. */
const presenceByPixel = (): string => {
  let e = 's0';
  for (let i = 1; i < DECK_PRESENCE.length; i++)
    e = `mix(${e}, s${i}, smoothstep(${DECK_PRESENCE[i - 1]![0].toFixed(1)}, ${DECK_PRESENCE[i]![0].toFixed(1)}, fs))`;
  return e;
};
/**
 * How far apart the middle deck's cloudlets are, metres: an altocumulus element is 1 to 5 degrees across seen from
 * under it (WMO International Cloud Atlas), 60 to 300 m at 3,600 m; ours are 70 to 220 m across, most of them small,
 * and they stand this far apart. Estimated from that range.
 */
const DECK_CELL = 120;
/** The deck's puffs: how far apart, in its cloudlets' spacing (a third of it), and the mean of their summed field (measured, 200,000 points), which is taken off. */
const DECK_PUFF = 0.34;
const DECK_PUFF_MEAN = 0.3553;
/**
 * GLSL: the middle deck's patches, without its cloudlets: what the deck (sheetsGlsl) is drawn from, and all that its
 * shadow on the ground is drawn from (air.ts, globe.ts: \`deckShadeAt\`). Guarded, since a material can have it twice.
 * `height`: the deck's, metres above the sea, on the day (day.ts).
 */
export const deckPatchGlsl = (prefix: string, height: number): string => /* glsl */ `
#ifndef DECK_PATCH
#define DECK_PATCH
  const float DECK_CUTS[${DECK_CUTS}] = float[${DECK_CUTS}](${Array.from({ length: DECK_CUTS }, (_, i) => deckCutAt(i / (DECK_CUTS - 1)).toFixed(4)).join(', ')});
  float deckTex(vec2 xz, float fp) {
    // (each size of it on a grid turned its own way, and the place pushed about by a kilometre: on one grid, cut at a
    // level, a patch's outline ran in straight runs and corners, a blocky mask beside the cumulus)
    xz += 420.0 * (vec2(${prefix}noise2(xz / 1300.0 + 2.1, 523), ${prefix}noise2(xz / 1300.0 + 8.8, 524)) - 0.5);
    xz += 1100.0 * (vec2(${prefix}noise2(xz / 3700.0 + 5.9, 521), ${prefix}noise2(xz / 3700.0 + 1.4, 522)) - 0.5);
    float a = ${prefix}noise2(mat2(0.9063, 0.4226, -0.4226, 0.9063) * xz / 9000.0 + 3.7, 501);
    float b = mix(${prefix}noise2(mat2(0.5446, 0.8387, -0.8387, 0.5446) * xz / 2300.0 + 9.1, 502), 0.5, smoothstep(700.0, 1800.0, fp));
    float c = mix(${prefix}noise2(mat2(0.9703, -0.2419, 0.2419, 0.9703) * xz / 640.0 + 5.3, 503), 0.5, smoothstep(200.0, 500.0, fp));
    return 0.45 * mix(a, 0.5, smoothstep(2700.0, 7000.0, fp)) + 0.3 * b + 0.25 * c;
  }
  // How much of a patch of the deck its cloudlets cover at a place (\`tex\`: deckTex there): thick clumps a kilometre
  // across and thinner air between them, mottled again at 400 m while that is two pixels or more, more toward a
  // patch's middle and where the map's deck is thick (a front's). So from far off a patch is dappled, and near to it
  // is the cloudlets that make that share.
  float deckFill(vec2 xz, float fp, float tex, float cut, float cover) {
    float mottle = mix(${prefix}noise2(mat2(0.7986, 0.6018, -0.6018, 0.7986) * xz / 420.0 + 3.1, 510), 0.5, smoothstep(170.0, 420.0, fp));
    float dense = ${prefix}noise2(mat2(0.9205, -0.3907, 0.3907, 0.9205) * xz / 1100.0 + 8.3, 506);
    float fill = 0.1 + 0.8 * smoothstep(0.28, 0.72, 0.6 * dense + 0.4 * mottle + 0.8 * (tex - cut) + 0.6 * smoothstep(0.3, 0.8, cover) - 0.09);
    return mix(fill, 0.55, smoothstep(400.0, 1100.0, fp));
  }
  // How much of the patch is cloud at a place (\`tex\`, \`cut\`: its texture and the level cut there, as deckPatch
  // gives them), 0 to 1. \`a\`: deckPatch.
  float deckPatch(vec2 xz, float fp, float cover, out float tex, out float cut) {
    float u = clamp(cover, 0.0, 1.0) * ${(DECK_CUTS - 1).toFixed(1)};
    int i = int(min(floor(u), ${(DECK_CUTS - 2).toFixed(1)}));
    cut = mix(DECK_CUTS[i], DECK_CUTS[i + 1], u - float(i));
    // (far off, where its texture is under a pixel, it is its cover, evenly)
    float even = smoothstep(2700.0, 7000.0, fp);
    float soft = 0.06 + 0.1 * smoothstep(60.0, 300.0, fp) + 0.03 * smoothstep(300.0, 2700.0, fp);   // (a patch thins to nothing over a few hundred metres: no hard rim)
    // (what of its texture is under a pixel and left at its mean is not forgotten: the edge is as much softer as that
    // part's spread, 2.2 of its standard deviations, so a patch seen aslant thins to its cover and does not shrink)
    vec3 left = vec3(smoothstep(2700.0, 7000.0, fp), smoothstep(700.0, 1800.0, fp), smoothstep(200.0, 500.0, fp));
    soft += 2.2 * sqrt(0.046 * dot(vec3(0.2025, 0.09, 0.0625), left * (2.0 - left)));
    tex = deckTex(xz, fp);
    return mix(smoothstep(cut - soft, cut + soft, tex), cover, even);
  }
  // How much of the Sun the deck takes from a point \`world\` of the scene (its frame, metres; \`seaY\`: the sea's height
  // in it) toward \`toLight\`: the deck where the ray to the Sun crosses it, as its patches with the share of each that
  // is cloud, 0.7 of the light under all of it. Not its cloudlets: they are read as if a pixel were 120 m, the
  // patches' dapple, which is what the shadow of a deck of cloudlets 70 to 220 m across is from far above (the Sun's
  // disc blurs it by 33 m; estimated). \`cover\`: deckCoverAt there.
  float deckShadeAt(vec3 world, vec3 toLight, float seaY, float cover) {
    if (toLight.y <= 0.02 || cover <= 0.004) return 1.0;
    vec2 pd = world.xz + toLight.xz / toLight.y * (seaY + ${height.toFixed(1)} - world.y);
    float tex, cut;
    float a = deckPatch(pd, 120.0, cover, tex, cut);
    if (a <= 0.0) return 1.0;
    float fill = deckFill(pd, 120.0, tex, cut, cover);
    return 1.0 - 0.7 * a * mix(0.94 * fill, 0.98, smoothstep(0.62, 0.9, cover));
  }
#endif`;
/**
 * GLSL: the two sheets. `deckAt(xz, fp, cover)`: how opaque the middle deck is at a point of the scene's plane, cut
 * so that `cover` of the sky has any (deckCutAt), with whatever of its texture is finer than a pixel (`fp`, metres)
 * left at its mean, so it never shimmers; thin where there is little of it (altocumulus, seen through), solid in a
 * front's band. `cirrusAt(xz, fp, amount)`: the cirrus, fibres along the high wind (`uWeatherHigh`, a unit vector in
 * the scene's x and z), never more than half opaque. `deckCoverAt(w, xz)`: how much of the sky the deck's patches
 * cover at a place, the day's record round the site and the map's beyond.
 *
 * And on a day whose record has high cloud over the site (`highOf`), only then: `highCoverAt(w, xz)`: how much of it
 * there is at a place, the record's as far as its report holds and the map's beyond; `highAt(xz, fp, amount)`: the
 * high cloud as the day has it: those fibres, or where the record has cirrostratus and most of the sky is covered, a
 * veil (`veilAt`: a smooth sheet as deep as the record's, faintly streaked); `veilShade(cover, mu)`: what it leaves
 * of the Sun's light for what is under it (day.ts: veilShade). Needs `<prefix>noise2` and weatherGlsl. Their look is
 * estimated.
 */
export const sheetsGlsl = (prefix: string, day: Day | null | undefined): string => {
  const deck = day?.deck ?? { cover: 0, height: DECK_HEIGHT };
  const high = highOf(day);
  return /* glsl */ `
  uniform vec2 uWeatherHigh;
  ${deckPatchGlsl(prefix, deck.height)}
  // how much of the sky the middle deck's patches cover at a place: the map's, and round the site what makes the
  // record's cover of cloud that day (day.ts: deckPatches). On 5 May 1961 0.30, which is an eighth of the sky in
  // cloud (one okta of altocumulus at 3,600 m at Patrick at 10:00, NOAA ISD: documented for that hour, taken for
  // the morning), since its cloudlets cover some 0.45 of a patch there
  float deckCoverAt(vec3 w, vec2 xz) { return mix(${deck.cover.toFixed(2)}, w.b, smoothstep(40000.0, 150000.0, length(xz))); }
  float gDeckThick;   // how thick the middle deck is where deckAt last looked: 0 at a cloudlet's rim, 1 at its heart
  vec2 gDeckSlope;    // and how its top slopes there (rise over run, along the scene's x and z): 0 where it is too fine to light
  vec3 gDeckSun = vec3(0.0, 0.0, 1e3);   // toward the Sun along the scene's x and z (a unit vector), and the tangent of its height: set before deckAt
  bool gDeckCel = false;   // the deck is drawn in the cel look: set before deckAt
  float gDeckNear;   // how much of the deck where deckAt last looked is its cloudlets, not their mean (0 to 1)
  float gDeckBody;   // its opacity as its cloudlets alone, and as their mean alone: deckAt's is the two mixed by gDeckNear
  float gDeckMean;
  float gDeckShade = 1.0;   // how much of the Sun reaches the deck where deckAt last looked: under one where a cloudlet beside it shades it
  // the level a cloudlet's chance must be under for it to stand, for its cloudlets to cover \`fill\` with the pixel
  // \`fs\` (on their 250 m plane): DECK_PRESENCE
  float deckStand(float fill, float fs) {
    ${DECK_PRESENCE.map(([, row], i) => `float s${i} = ${presenceRow(row)};`).join('\n    ')}
    return ${presenceByPixel()};
  }
  float deckAt(vec2 xz, float fp, float cover) {
    if (cover <= 0.004) return 0.0;
    float tex, cut;
    float a = deckPatch(xz, fp, cover, tex, cut);
    // Altocumulus is cloudlets a hundred or two metres across with clear air between, closing up toward a patch's
    // middle; a front's deck is solid. (So round the site its patches are over 0.3 of the sky, and an eighth is cloud.)
    // The cloudlets are left at their mean (the share of the patch they cover) before one is two or three pixels
    // across: at one, a cloudlet was a white pixel beside a clear one, and the deck a stipple that would crawl.
    vec2 r1 = mat2(0.7986, 0.6018, -0.6018, 0.7986) * xz, r2 = mat2(0.9205, -0.3907, 0.3907, 0.9205) * xz;
    float fill = deckFill(xz, fp, tex, cut, cover);
    float lets = fill;
    gDeckThick = fill;
    gDeckSlope = vec2(0.0);
    gDeckShade = 1.0;
    // The cloudlets' own detail is worked out on a plane shrunk to their size: \`xs\` and \`fs\` are the place and the
    // pixel as if the cloudlets were 250 m apart, which is what every figure below was made and measured for.
    vec2 xs = xz * ${(250 / DECK_CELL).toFixed(4)};
    float fs = fp * ${(250 / DECK_CELL).toFixed(4)};
    // (a drawing's cloudlets are cut sharp at half their opacity, so they are left at their mean at three and a half times
    // the pixel a shaded deck's are, gDeckCel: under four pixels across, a cut cloudlet came and went as the eye moved; and
    // clouds.ts draws that mean as a paler sea, not cut, which was a white sheet with the sea in holes)
    float near = gDeckCel ? 1.0 - smoothstep(10.0, 24.0, fs) : 1.0 - smoothstep(35.0, 90.0, fs);
    float body = fill;
    if (near > 0.0 && a > 0.0) {   // (only where there is deck: most of the sky has none)
      // Altocumulus from above is cloudlets a hundred or two metres across (an element of it is 1 to 5 degrees wide
      // from the ground under it, WMO International Cloud Atlas: at 3,600 m, 60 to 300 m), so that from 7 to 25 km up a
      // patch is a fine grain and from 3 to 5 km its cloudlets are each to be seen: tufts standing apart with the sea
      // between them where the patch is thin, run together into a lumpy field with dark creases where it is thick
      // (photographs from airliners: altocumulus floccus over the Atlantic, and a field of altocumulus over Henry
      // County, Illinois, Wikimedia Commons; docs/sources.md). Not a mosaic of plates with ruled lanes between, which
      // is what cells that each fill their ground were, and not puddles a kilometre across.
      // So: on a scatter of points DECK_CELL apart, a dome at each that stands (how many stand is what makes them cover
      // \`fill\`: DECK_PRESENCE, measured), of a breadth by chance (the small ones many), a little broader where the
      // patch is thicker, run together where they meet (a smooth union, its crease never finer than a pixel); lobed
      // by the place pushed about, and heaped of puffs (below). Its slope is kept (gDeckSlope) so its light is the
      // light on a lumpy top: bright toward the Sun, grey on the far side (clouds.ts), and so is what of it lies in
      // the shadow of the cloudlet beside it toward the Sun (gDeckShade). Their sizes and shape estimated.
      vec2 rs1 = r1 * ${(250 / DECK_CELL).toFixed(4)}, rs2 = r2 * ${(250 / DECK_CELL).toFixed(4)};
      vec2 lp = rs1 / 250.0 + 0.35 * vec2(${prefix}noise2(rs2 / 900.0 + 2.9, 504), ${prefix}noise2(rs2 / 900.0 + 7.4, 505));
      vec2 at = lp;   // (where the puffs are read: pushed only as broadly as they are apart, or they fold over into creases)
      lp += 0.3 * (vec2(${prefix}noise2(rs1 / 310.0 + 1.9, 517), ${prefix}noise2(rs1 / 310.0 + 6.2, 518)) - 0.5);
      if (fs < 15.0) lp += 0.12 * (1.0 - smoothstep(7.5, 15.0, fs)) * (vec2(${prefix}noise2(xs / 90.0 + 4.4, 515), ${prefix}noise2(xs / 90.0 + 9.7, 516)) - 0.5);
      // Whether a cloudlet stands, and how broad it is, is by the share at its own middle, not the pixel's: by the
      // pixel's, a cloudlet over a place where the share changed quickly (toward a patch's edge) grew on one side and
      // shrank on the other, and one whose chance the share passed there was a disc with a straight side. The share is
      // smooth over a cloudlet, so it is taken as changing evenly: its slope here, from two more readings of its
      // clumps and mottle (the patch's own texture is taken as it is here: reading it twice more cost a third of the
      // deck's time, and toward a patch's edge, where it changes most, the patch thins the deck away anyway).
      vec2 slopeFill = vec2(deckFill(xz + vec2(60.0, 0.0), fp, tex, cut, cover), deckFill(xz + vec2(0.0, 60.0), fp, tex, cut, cover)) - fill;
      slopeFill = mat2(0.7986, 0.6018, -0.6018, 0.7986) * slopeFill * ${(DECK_CELL / 60).toFixed(4)};   // (for a step of one cloudlet's spacing on their grid)
      // The cloudlet beside it toward the Sun: the place a fraction of a cloudlet's spacing that way (on their grid), and
      // how far a ray to the Sun climbs over that step. A dome's height here is its breadth (\`r\`): a cloudlet is about
      // half as deep as it is broad, estimated.
      vec2 toSun = mat2(0.7986, 0.6018, -0.6018, 0.7986) * gDeckSun.xy * 0.3;
      float rise = 0.3 * gDeckSun.z;
      bool shading = fs < 30.0;
      // (two run together over five pixels' worth at the least: a narrower crease flickered as the eye moved. In a
      // drawing, which cuts them at half, over three: so broad a union ran them into one sheet there)
      float k = gDeckCel ? 0.12 + 3.0 * fs / 250.0 : 0.12 + 5.0 * fs / 250.0;
      float h = -1.0, hs = -1.0;
      vec2 g = vec2(0.0);
      ivec2 lj = ivec2(floor(lp));
      float sinkCel = 0.0;
      for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
        ivec2 c = lj + ivec2(dx, dy);
        vec2 d = lp - (vec2(c) + 0.5 + 0.7 * (vec2(${prefix}hash2(c, 507), ${prefix}hash2(c, 508)) - 0.5));
        float there = clamp(fill - dot(slopeFill, d), 0.1, 0.9);
        // (and it grows out of nothing as the share passes its chance, at its own steepness: flattened, a half-grown
        // cloudlet was a blur)
        float born = smoothstep(0.0, 0.12, deckStand(there, fs) - ${prefix}hash2(c, 509));
        if (born <= 0.0) continue;
        float u = ${prefix}hash2(c, 519);
        float r = min((0.3 + 0.4 * u * u * u) * (0.8 + 1.4 * there), 0.9) * (0.35 + 0.65 * born);
        // (in a drawing a cloudlet under three pixels across is not drawn, cut sharp it came and went as the eye moved;
        // the paler sea its patch is washed with holds it: clouds.ts)
        if (gDeckCel) {
          float seen = smoothstep(1.0, 1.6, r * 250.0 / max(fs, 1e-3));
          if (seen <= 0.0) continue;
          sinkCel = 1.0 - seen;
        }
        float sink = 1.05 * r * (1.0 - born) + 1.05 * r * sinkCel;
        float hb = r - dot(d, d) / r - sink;
        float s = clamp(0.5 + 0.5 * (hb - h) / k, 0.0, 1.0);
        h = mix(h, hb, s) + k * s * (1.0 - s);
        g = mix(g, -2.0 * d / r, s);
        if (shading) {
          vec2 e = d + toSun;
          float hl = r - dot(e, e) / r - sink;
          float sl = clamp(0.5 + 0.5 * (hl - hs) / k, 0.0, 1.0);
          hs = mix(hs, hl, sl) + k * sl * (1.0 - sl);
        }
      }
      // (in the shadow where the deck toward the Sun stands higher than a ray from here to the Sun has climbed: the
      // creases of a thick patch, and the sides of a cloudlet beside a taller one; soft over a pixel's worth)
      if (shading) gDeckShade = 1.0 - 0.6 * smoothstep(0.0, 0.1 + 4.0 * fs / 250.0, hs - h - rise) * smoothstep(-0.05, 0.1, h) * (1.0 - smoothstep(12.0, 30.0, fs));
      // Each heaped of puffs a third of a cloudlet's spacing apart while they are four pixels across (a cauliflower's
      // knobs, its rim scalloped where they stand out of it), the field's mean taken off so the cover is the same with
      // and without them. The puffs are added, not the highest taken: where the highest was taken each met the next
      // in a crease, and lit, the creases were cracks across every cloudlet; each is a smooth bump (the cube of its
      // falloff: with the square, lit, its foot was a ring).
      float billow = 0.6 * (1.0 - smoothstep(9.0, 20.0, fs));
      if (billow > 0.0) {
        vec2 pp = at / ${DECK_PUFF.toFixed(2)};
        ivec2 pj = ivec2(floor(pp));
        float ph = 0.0;
        vec2 pg = vec2(0.0);
        for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
          ivec2 c = pj + ivec2(dx, dy);
          vec2 d = pp - (vec2(c) + 0.5 + 0.8 * (vec2(${prefix}hash2(c, 526), ${prefix}hash2(c, 528)) - 0.5));
          float r = 0.55 + 0.4 * ${prefix}hash2(c, 527);
          float q = max(1.0 - dot(d, d) / (r * r), 0.0);
          ph += r * q * q * q;
          pg -= 6.0 * q * q * d / r;
        }
        h += billow * ${DECK_PUFF.toFixed(2)} * (ph - ${DECK_PUFF_MEAN.toFixed(4)});
        g += 0.6 * billow * pg;   // (lit by less than their whole slope: by all of it each knob was a facet, the tops rock)
      }
      // (the slope in the scene's x and z: the cloudlets' grid is turned from it)
      g = g * mat2(0.7986, 0.6018, -0.6018, 0.7986);
      // and its rim frayed by lumps a fifth of a cloudlet's spacing across while they are two pixels (not lit by their
      // slope: a value noise's slope has creases along its lattice, and lit, the tops were crumpled paper)
      float fine = 1.0 - smoothstep(6.0, 15.0, fs);
      if (fine > 0.0) h += fine * 0.12 * (${prefix}noise2(xs / 45.0 + 2.7, 525) - 0.5);
      // (its rim as soft as two pixels are broad: the dome falls by about two of its units a unit at its rim; as soft as
      // one, its edge flickered as the eye moved)
      float blur = gDeckCel ? 0.03 + fs / 250.0 : 0.06 + 4.0 * fs / 250.0;
      float thick = smoothstep(0.02, 0.45, h);
      // (thin and grey at its rim, thinning to nothing over the outer fifth of it or so: it frays, it is not cut out)
      body = smoothstep(-blur, 0.3 + blur, h) * (0.4 + 0.6 * thick);
      lets = mix(fill, body, near);
      gDeckThick = mix(fill, thick, near);
      // (lit by its slope only while a cloudlet is several pixels across: smaller, its light is its mean)
      gDeckSlope = 1.3 * g * near * (1.0 - smoothstep(12.0, 30.0, fs));
    }
    float solid = smoothstep(0.62, 0.9, cover);
    gDeckNear = near;
    gDeckBody = a * mix(0.94 * body, 0.98, solid);
    gDeckMean = a * mix(0.94 * fill, 0.98, solid);
    return a * mix(0.94 * lets, 0.98, solid);
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
  }${
    high
      ? /* glsl */ `
  // The high cloud of the day's record. How much of the sky it covers at a place: the record's as far as its report
  // holds from the site, the map's beyond.
  ${
    high.veil
      ? `float highCoverAt(vec3 w, vec2 xz) { return mix(${high.cover.toFixed(3)}, w.g, smoothstep(${high.reach[0].toFixed(1)}, ${high.reach[1].toFixed(1)}, length(xz))); }`
      : `// (fibres: given way along a ragged line, as the map has it: heldDistance)
  float highHeld(vec2 xz) {
    vec2 en = vec2(xz.x * uWeather.x + xz.y * uWeather.y, xz.x * uWeather.y - xz.y * uWeather.x);
    return length(en) * (0.5 + (0.55 * ${prefix}noise2(en / 90000.0 + vec2(3.7, 8.1), 519) + 0.45 * ${prefix}noise2(en / 22000.0 + vec2(1.3, 4.4), 523)));
  }
  float highCoverAt(vec3 w, vec2 xz) { return mix(${high.cover.toFixed(3)}, w.g, smoothstep(${high.reach[0].toFixed(1)}, ${high.reach[1].toFixed(1)}, highHeld(xz))); }`
  }
  // What it leaves of the Sun's light for what is under it, covering \`cover\` of the sky with the Sun \`mu\` up (its
  // sine): half its depth along the slant (day.ts: veilShade).
  float veilShade(float cover, float mu) { return exp(-${((1 - VEIL_FORWARD) * high.depth).toFixed(4)} * cover / max(mu, 0.08)); }${
    high.veil
      ? /* glsl */ `
  // Cirrostratus: a veil over the whole sky, smooth and milky, through which the Sun's disc shows. How opaque it is
  // looked straight through: the record's optical depth where it covers, a little more and less in broad streaks
  // along the high wind (tens of kilometres long: a veil is not ruled flat, and has no holes either). Estimated but
  // for the depth.
  float veilAt(vec2 xz, float fp, float amount) {
    vec2 p = vec2(dot(xz, uWeatherHigh), dot(xz, vec2(-uWeatherHigh.y, uWeatherHigh.x)));
    p.y += 9000.0 * (${prefix}noise2(p / vec2(45000.0, 30000.0) + 3.3, 514) - 0.5);
    float a = ${prefix}noise2(p / vec2(70000.0, 16000.0) + 1.3, 511);
    float b = mix(${prefix}noise2(p / vec2(21000.0, 3200.0) + 7.9, 512), 0.5, smoothstep(1000.0, 2500.0, fp));
    return 1.0 - exp(-${high.depth.toFixed(4)} * amount * (0.78 + 0.3 * a + 0.14 * b));
  }
  // How much of a veil the high cloud is where it covers \`amount\` of the sky: none of one under half, all of one from nine tenths
  float veilShare(float amount) { return smoothstep(0.5, 0.9, amount); }
  float highAt(vec2 xz, float fp, float amount) {
    if (amount <= 0.004) return 0.0;
    return mix(cirrusAt(xz, fp, amount), veilAt(xz, fp, amount), veilShare(amount));
  }`
      : /* glsl */ `
  // (cirrus: fibres, however much of the sky they cover)
  float veilShare(float amount) { return 0.0; }
  float highAt(vec2 xz, float fp, float amount) { return cirrusAt(xz, fp, amount); }`
  }`
      : ''
  }`;
};

/**
 * How much wider than the field's two fine octaves a cell's own chance of standing is spread. At 1 the cells stand
 * where the noise is over its cut and nowhere else, in clumps with empty sea between; MODIS has small cells between
 * the clumps too (Aqua, 9 May 2018, off Florida). Estimated.
 */
const SCATTER = 1.6;
/**
 * What is added to the field for the cells at each level it is cut at (the cut less the bias), so that with SCATTER
 * they cover what was asked: found by bisection over a wide patch (cover 0.85, 0.6, 0.45, 0.2, 0.05 and 0.005 from
 * the lowest level up: a JS copy of cumulusCells, 250,000 points each). Measure again after changing SCATTER, a
 * cell's breadth or how many stand.
 */
const SCATTER_SHIFT: readonly (readonly [number, number])[] = [
  [0.4001, 0.0765],
  [0.4899, 0.0098],
  [0.5334, -0.0086],
  [0.6125, -0.035],
  [0.699, -0.0539],
  [0.7825, -0.0715],
];

/**
 * What keeps a field's cover through the morph from the noise's shape to the cells (cellsMorph, cellsBlend), in the
 * noise's units: measured, a frame's mean level over one patch of sea from 60 to 110 km within 2.5 % of its level before.
 */
const MORPH = 0.053;
/** Far cumulus are drawn as cells where a pixel of the field is between these many metres across and more: nearer, as the field itself, which the volume is heaped on. */
export const CELLS: readonly [number, number] = [45, 90];

/**
 * GLSL: the cumulus field as cells, for clouds seen from far above. Cut at a level, the field's noise is a torn
 * shape; a fair-weather cumulus seen from orbit is a rounded cell, and a field of them popcorn: very many, most of
 * them a few hundred metres across and low, a few broad and high (MODIS, Aqua, 9 May 2018, off Florida; astronauts'
 * photographs). So where a cloud is a few pixels across (`cellsShare`, by the pixel's breadth on the field) the
 * field is read through its cells instead: two grids of points, 0.2 of a cloud apart (300 m) and 0.5, each point
 * pushed about. At a point where the field is over its cut there is a cell: a dome, most of them small (150 to 700 m
 * across, by chance, the small ones many), broader the further over the cut; on the coarser grid, only well inside
 * a cloud, the broad heaps. A small cell is low, so it is thin and grey and half seen through (clouds.ts); cells
 * that overlap run together.
 *
 * `cumulusCells(q, bias, cut, fpq)` (`fpq`: a pixel's breadth, in cells): how far the field stands over its cut at
 * `q` (in cells of the field; `bias` as cumulusBias gives it), in the noise's own units, as the noise would say it:
 * so whoever heaps a cloud on the noise heaps the same cloud on this. `gCell` is left as the breadth (radius, in
 * cells of the field) of the cell found there.
 *
 * Whether a cell stands is by the field at its own middle, so no cell is cut by the field's edge. The field there
 * is its two coarse octaves, worked out at the middle itself from their corners round `q` (`cellsCorners`: twenty-five
 * readings for all eighteen points; taken instead from the value and slope at `q`, the same cell stood for one
 * pixel and not for its neighbour, and specks came and went as the eye rose), and for its two fine octaves, which
 * are finer than the cells are apart, a chance of the cell's own with their spread. A cell comes up from nothing as
 * the field passes its cut, and one too small for the pixel is not drawn as itself but spread (`gHaze`). The weather's bias and the streets are the pixel's:
 * across a cell 300 m broad they hardly change. The cover is the field's: a cell's own chance is spread
 * wider than the fine octaves (SCATTER), and the level moved to make up for it (SCATTER_SHIFT), so the cells cover
 * what was asked from 0.005 to 0.85 (measured in a frame from 150 km: 0.107 of a patch of sea where the noise's own
 * shapes covered 0.105, 0.185 for 0.187 over land). Their shape and sizes are estimated.
 */
export const cumulusCellsGlsl = (prefix: string): string => /* glsl */ `
  float cellsShare(float fp) { return smoothstep(${CELLS[0].toFixed(1)}, ${CELLS[1].toFixed(1)}, fp); }
  // Half way between the noise's shape and the cells the two do not stand in the same places, and what is over the
  // cut in both is less than either: a field lost a third of its cover half way. What is added to keep it: most half
  // way, nothing at either end (MORPH).
  float cellsMorph(float cells) { return ${MORPH.toFixed(3)} * 4.0 * cells * (1.0 - cells); }
  // The field over its cut on the way from the noise's own shapes (\`x\`) to the cells (\`c\`), \`cells\` from 0 to 1. Not
  // a mean of the two: half way, that was the noise's shapes gone soft with the cells standing on them, two pictures
  // at once. A cloud is taken apart instead. First what of it is not a cell goes (the lower of the two: gaps open in
  // it from its edge inward, and it is left as the cells that stand in it); then the cells that stand where it had
  // no cloud come up, each from its heart. So at every height there is one field, and nothing fades through another.
  float cellsBlend(float x, float c, float cells) {
    float both = min(x, c);
    return (cells < 0.5 ? mix(x, both, smoothstep(0.0, 0.5, cells)) : mix(both, c, smoothstep(0.5, 1.0, cells))) + cellsMorph(cells);
  }
  // (smooth union: where two domes meet they run together into one mass with a crease, not two balls)
  float gJoin;   // how broadly two cells run together: more as a pixel takes in more of them, so the crease between two is never finer than a pixel
  float cellsJoin(float a, float b) { float h = max(gJoin - abs(a - b), 0.0) / gJoin; return max(a, b) + h * h * 0.25 * gJoin; }
  // The field's two coarse sizes at any place near \`q\`, exactly, for the price of reading their corners once: the
  // noise is its corners' chances blended (field.ts), so with the corners round \`q\` kept (three by three of the
  // broad size, four by four of the other) it can be worked out at each cell's own middle with no more reading.
  ivec2 gN0, gN1;
  float gH0[9], gH1[16];
  void cellsCorners(vec2 q) {
    gN0 = ivec2(floor(q * 0.23 + vec2(1.7, 5.3) - 0.5));
    gN1 = ivec2(floor(q)) - 1;
    for (int k = 0; k < 9; k++) gH0[k] = ${prefix}hash2(gN0 + ivec2(k % 3, k / 3), 94);
    for (int k = 0; k < 16; k++) gH1[k] = ${prefix}hash2(gN1 + ivec2(k & 3, k >> 2), 91);
  }
  float cellsCoarse(vec2 at) {
    vec2 x0 = at * 0.23 + vec2(1.7, 5.3) - vec2(gN0), x1 = at - vec2(gN1);
    ivec2 i0 = clamp(ivec2(floor(x0)), ivec2(0), ivec2(1)), i1 = clamp(ivec2(floor(x1)), ivec2(0), ivec2(2));
    vec2 f0 = clamp(x0 - vec2(i0), 0.0, 1.0), f1 = clamp(x1 - vec2(i1), 0.0, 1.0);
    vec2 u0 = f0 * f0 * (3.0 - 2.0 * f0), u1 = f1 * f1 * (3.0 - 2.0 * f1);
    int k0 = i0.y * 3 + i0.x, k1 = i1.y * 4 + i1.x;
    return 0.3 * mix(mix(gH0[k0], gH0[k0 + 1], u0.x), mix(gH0[k0 + 3], gH0[k0 + 4], u0.x), u0.y)
      + 0.33 * mix(mix(gH1[k1], gH1[k1 + 1], u1.x), mix(gH1[k1 + 4], gH1[k1 + 5], u1.x), u1.y);
  }
  float gCell;   // the breadth (radius, in cells of the field) of the cell cumulusCells last found
  float gHaze;   // how much of the pixel the cells too small to draw cover there, as cumulusCells last found it (0 to 1 or so)
  float cumulusCells(vec2 q, float bias, float cut, float fpq) {
    const float G = 0.2, GB = 0.5;
    // (the place pushed about, so no cell is a ruled circle: a cumulus is lobed; the finer push only where it is seen)
    vec2 p = q + 0.05 * (vec2(${prefix}noise2(q * 4.3 + 4.7, 603), ${prefix}noise2(q * 4.3 + 9.2, 604)) - 0.5);
    if (fpq < 0.05) p += 0.02 * (1.0 - smoothstep(0.025, 0.05, fpq)) * (vec2(${prefix}noise2(q * 11.0 + 1.3, 605), ${prefix}noise2(q * 11.0 + 6.6, 606)) - 0.5);
    // the field's coarse part here (cloudNoise's first two octaves) over its cut, and its slope
    float base, lift;
    cellsCorners(q);
    base = cellsCoarse(q) + 0.04 + bias - cut;
    lift = 0.04 + bias - cut;
    // (the cells' own chance is spread wider than the field's fine octaves, so that small cells stand between the
    // clumps as well as in them; cut at the same level that would cover too much, so the level is moved by what makes
    // the cells cover what was asked: SCATTER_SHIFT, measured)
    {
      float level = cut - bias, shift = ${SCATTER_SHIFT[0]![1].toFixed(4)};
      ${SCATTER_SHIFT.slice(1)
        .map(
          ([c, s], i) =>
            `shift = mix(shift, ${s.toFixed(4)}, clamp((level - ${SCATTER_SHIFT[i]![0].toFixed(4)}) / ${(c - SCATTER_SHIFT[i]![0]).toFixed(4)}, 0.0, 1.0));`,
        )
        .join('\n      ')}
      base += shift;
      lift += shift;
    }
    float best = -0.1;
    gHaze = 0.0;
    gJoin = 0.03 + 1.2 * fpq;
    // (the breadth of the cell here, as a mean of those that reach here weighed steeply by how high each stands: the
    // breadth of the highest alone stepped where two cells met, and what was lit by it flickered there as the eye rose)
    float breadth = 0.0, weight = 1e-6;
    ivec2 i = ivec2(floor(p / G));
    for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
      ivec2 c = i + ivec2(dx, dy);
      vec2 pc = (vec2(c) + 0.5 + 0.9 * (vec2(${prefix}hash2(c, 601), ${prefix}hash2(c, 602)) - 0.5)) * G;
      float e = (cellsCoarse(pc) + lift) + 0.165 + ${(0.21 * SCATTER).toFixed(3)} * (${prefix}hash2(c, 621) - 0.5) + ${(0.12 * SCATTER).toFixed(3)} * (${prefix}hash2(c, 622) - 0.5);
      if (e <= -0.04) continue;
      // (a cell comes up from nothing as the field passes its cut there, over a little of it either way: the bias is
      // the pixel's own, so at a cut made sharp a cell stood for one pixel and not for the next, and was sliced)
      float born = smoothstep(-0.04, 0.04, e);
      e = max(e, 0.0);
      // (most cells small, a few broad: the cube of a chance; and broader the further the field is over its cut. The
      // 1.12 is what makes them cover what the field does: measured, see above)
      float u = ${prefix}hash2(c, 607);
      float rr = min(1.12 * (0.25 + 0.9 * u * u * u) * min(0.55 + 6.0 * e, 1.0), 1.0);
      vec2 d = p - pc;
      // (a cell as high as it is broad, to the power the dome has: a puff is low)
      float v = 0.16 * rr * sqrt(rr) * (1.0 - dot(d, d) / (rr * rr * G * G));
      // A cell under a pixel and a half across is not drawn as itself: read at a pixel's middle it was there or not
      // by where the middle fell, a white pixel that came and went as the eye moved (47 a frame from 187 km, where
      // most cells are under a pixel). It sinks away as it gets that small, and what it covered is spread over the
      // pixels round it instead, as much in all (gHaze): a field of them is a soft grain, and its cover is kept.
      float seen = smoothstep(1.0, 3.0, rr * G / max(fpq, 1e-5));
      seen *= born;
      if (seen < 1.0) {
        float wide = max(rr * G, min(2.0 * fpq, G));
        gHaze += (born - seen) * 2.0 * (rr * rr * G * G) / (wide * wide) * max(1.0 - dot(d, d) / (wide * wide), 0.0);
        if (v > -0.1) v = mix(-0.1, v, seen);   // (down to where no cell stands; what is outside it is as it was)
      }
      float wt = max(v + 0.1, 0.0); wt *= wt; wt *= wt;
      breadth += wt * rr * G;
      weight += wt;
      best = cellsJoin(best, v);
    }
    // the broad heaps, well inside a cloud
    if (base > -0.2) {
      ivec2 j = ivec2(floor(p / GB));
      for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++) {
        ivec2 c = j + ivec2(dx, dy);
        vec2 pc = (vec2(c) + 0.5 + 0.9 * (vec2(${prefix}hash2(c, 631), ${prefix}hash2(c, 632)) - 0.5)) * GB;
        float e = (cellsCoarse(pc) + lift) + 0.115 + ${(0.21 * SCATTER).toFixed(3)} * (${prefix}hash2(c, 641) - 0.5) + ${(0.12 * SCATTER).toFixed(3)} * (${prefix}hash2(c, 642) - 0.5);
        if (e <= -0.04) continue;
        float born = smoothstep(-0.04, 0.04, e);
        e = max(e, 0.0);
        float rr = min((0.3 + 0.5 * ${prefix}hash2(c, 637)) * min(0.5 + 8.0 * e, 1.0), 1.0);
        vec2 d = p - pc;
        float v = 0.2 * rr * (1.0 - dot(d, d) / (rr * rr * GB * GB));
        if (v > -0.1) v = mix(-0.1, v, born);
        float wt = max(v + 0.1, 0.0); wt *= wt; wt *= wt;
        breadth += wt * rr * GB;
        weight += wt;
        best = cellsJoin(best, v);
      }
    }
    gCell = breadth / weight;
    // The rim worn by finer lumps, 100 and 40 m, each left out before it is under two pixels: a cumulus's edge is
    // ragged and thins to haze, and none of its lobes is a clean ball. Only near the rim: a heap's heart is whole.
    if (fpq < 0.06 && best > -0.05) {
      float rim = 1.0 - smoothstep(0.0, 0.05, best);
      best -= rim * (0.022 * (1.0 - smoothstep(0.025, 0.06, fpq)) * (${prefix}noise2(q * 15.0 + 2.2, 608) - 0.35)
        + 0.014 * (1.0 - smoothstep(0.01, 0.024, fpq)) * (${prefix}noise2(q * 37.0 + 7.1, 609) - 0.35));
    }
    return best;
  }`;
