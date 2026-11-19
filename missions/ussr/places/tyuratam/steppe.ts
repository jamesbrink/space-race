import * as THREE from 'three';
import type { Day } from '../../../../src/viewer/day.ts';
import { breeze } from '../../../../src/viewer/day.ts';
import type { FloraSpec, Species } from '../../../../src/viewer/flora.ts';
import { vec3 } from '../../../../src/viewer/glsl.ts';
import type { Palette } from '../../../../src/viewer/land.ts';

/**
 * The northern desert of the Turan lowland on the lower Syr Darya's right bank, in the second week of April, as a
 * kind of country: what its ground is, what grows on it and how thick, in the look the project asks for (AGENTS.md,
 * "Designed, not photographic"). Nothing here knows a site: Tyuratam's Site 1 (ground.ts) uses it, and so can the
 * next pad on the same steppe (Site 31, the later Soviet flights), each giving its own lie of the land and its own made
 * ground. Sources and confidence are set out in missions/ussr/places/tyuratam/site-1.md, "The ground and what grows", and
 * docs/sources.md, "The steppe at Tyuratam". Its season is the flight's day's (`SEASONS`, `seasonOf`): the April flush
 * below, the summer's reddish-grey once the ephemerals have gone, the autumn's grey after the plants' season, or the
 * thaw's old snow and mud at the end of the winter (site-1.md, "The seasons"). In short, of April:
 *
 * - **The ground** is grey-brown desert loam under a thick clay crust (Chertok's "steppe asphalt", which the builders'
 *   trucks of 1955 to 1957 ground to dust in ruts kilometres wide), with takyrs (bare cracked clay floors) and
 *   solonchaks (salt crusts) in the hollows and small patches of sand on the rises: the soils of the Syr Darya's desert
 *   valley (Veselova and others 2017). Where each lies round a site is the site's (ground.ts: the maps, the Corona
 *   frames and Krechetov's soil map of the cosmodrome, 2015); their colours are estimated.
 * - **What grows**: white-earth wormwood (Artemisia terrae-albae, 8 to 30 cm, grey-white felted) in complexes with
 *   biyurgun (Anabasis salsa), with teresken (Krascheninnikovia ceratoides), saltwort in the hollows and sedge
 *   (Carex physodes) on sand: the communities recorded on the cosmodrome's land (Lednev, plantarium.ru, 2017 and
 *   2018). Total cover some 40 per cent, a third of it wormwood: figures from the same desert 200 km north-west
 *   (Dimeeva and Salmukhanbetova 2025), derived.
 * - **The spring**: in April the ephemerals and ephemeroids (bulbous meadow grass, wild rhubarb, the tulips) make the
 *   steppe "almost green" (Chertok, April 1957); in April 1961 the tulips were out "earlier than usual" (Chertok, of
 *   that month). The tulip is Borszczow's (Tulipa borszczowii), collected by Tyuratam station in 1930, yellow through
 *   orange to scarlet, 10 to 20 cm above the ground (Akhataeva and others 2024). How many to a square metre: estimated.
 */

/**
 * What the summer rests on: memoirs of this place, no botanist's. "The multicolored tulips were gone. The steppe dried out
 * and began to scorch and take on a uniform reddish-gray color" (Chertok, Rockets and People, vol. 2, p. 357, of June
 * 1957); "the steppe had turned green only to become parched and scorched once again in a couple of months" (vol. 3,
 * p. 387); «на ее коричнево-сером фоне ... между сухими кустиками верблюжьей колючки или под большим кружевным шаром
 * перекати-поле» (Mikheev, «Байконур. Ключ на старт!»). The film of 6 August 1961 («Снова к звёздам», 21:42) has bare,
 * pale, cracked earth with sparse dry tufts by the road. That the spring's aspect is the ephemerals' is the floras'
 * (Dimeeva and Salmukhanbetova 2025). Each plant's colour in August is estimated: its tone shifted toward the reddish grey.
 */
const SUMMER =
  'Chertok, vol. 2, p. 357 ("a uniform reddish-gray color", June 1957) and vol. 3, p. 387; Mikheev («коричнево-серый»); the film of 6 August 1961. The colours estimated';

/**
 * What the autumn rests on (Voskhod 1, 12 October 1964): the day dry and frosty, no snow. «Тихое морозное утро,
 * температура — минус 8 градусов ... ветер — 3–4 метра в секунду, видимость — более 20 километров, высокие перистые
 * облака» (Kamanin, «Скрытый космос», 12 October 1964); "During the clear, still night, the temperature fell to minus
 * 10°C" (Chertok, Rockets and People, vol. 3, pp. 238 and 239). Kazalinsk, 96 km west, had rain on 4, 6 and 7 October
 * and none from the 8th to the 14th, the ground "moist" at 03 UTC on the 12th, 7.2 °C at 09 UTC; Kara-Kum and Aralsk
 * "dry" (NOAA ISD 35849099999, 35756099999; GHCN-Daily KZ000035849). The plants are past their season: the wormwood
 * flowers in August and goes grey-green to grey, its spent stems straw; the biyurgun's red fruits and the saltworts'
 * winged fruits (purple, rose or yellowish, turning brown) are of July to September, the teresken's hairs "finally
 * rufescent" (Flora of the USSR, vols. VI and XXVI); the spring's ephemerals long gone. No photograph or film of that
 * morning showing the steppe has been found: each colour is estimated from those descriptions.
 */
const AUTUMN =
  'Kamanin, «Скрытый космос», 12 October 1964 (frost, minus 8, still, clear); Chertok, vol. 3, pp. 238-239; NOAA ISD and GHCN-Daily at ' +
  'Kazalinsk, Kara-Kum and Aralsk (dry, no snow); Flora of the USSR, vols. VI and XXVI (what each plant is in autumn). The colours estimated';

/**
 * What the end of the winter rests on (Voskhod 2, 18 March 1965). «Март на космодроме начался сырой пасмурной погодой
 * ... Степь была покрыта доживающими последние дни пятнами грязного снега» ("The steppe was covered with patches of
 * dirty snow living out its last days": Chertok, vol. 3, p. 262, of early March); on the 18th "low cloud cover and
 * intermittent drizzling rain" (p. 263). A storm of snow, then rain and snow, from the 10th to the 13th (18 mm at
 * Kazalinsk; the ground "covered completely" on the 12th), a freeze to minus 10 from the 14th to the 16th, snow showers on
 * the 17th and snow grains early on the 18th, then 2.8 °C at 09 UTC under eight eighths of stratocumulus; at Kara-Kum
 * the ground covered on the 17th and under half covered on the 19th (NOAA ISD 35849099999, 35756099999: the ground's state;
 * the snow's depth was not reported). So: old dirty snow in patches over well under half the ground, the rest bare,
 * wet and muddy over frozen ground, the plants dormant and grey; no growth before the April flush is in any source
 * read. Siddiqi (Challenge to Apollo, p. 454) has "a cold and snowy day", citing Kamanin, whose entry for the 18th says
 * nothing of the weather: Chertok, who was there, is followed. How much snow lay at Site 1 is estimated.
 */
const THAW =
  'Chertok, vol. 3, pp. 262-263 (patches of dirty snow in early March; low cloud and drizzle on the 18th); Kamanin, 12 and 16 March 1965; ' +
  'NOAA ISD at Kazalinsk and Kara-Kum (the ground snow-covered on 12 and 17 March, under half on the 19th). The snow’s share, its colour and the plants’ estimated';

/** A colour as an sRGB hex (three converts it to its linear working space). */
const srgb = (hex: number) => new THREE.Color(hex);

/**
 * The ground's colours: estimated, from colour photographs of the cosmodrome's steppe in April, then cleaned as the look
 * asks (each surface one clear tone, a little lighter and cleaner than a photograph's, so they read apart from height).
 */
export const STEPPE = {
  /** The clay crust over grey-brown loam: pale grey-buff, and its darker, sandier shade. */
  loam: srgb(0xbdb39b),
  loamDark: srgb(0xa29781),
  /** A takyr's clay floor: paler and cooler, smooth; the cracks between its polygons. */
  takyr: srgb(0xc3bdab),
  crack: srgb(0x8a8273),
  /** A solonchak's salt crust. */
  salt: srgb(0xdcd9cf),
  /** Sand on the rises: warmer. */
  sand: srgb(0xcbb38a),
  sandDark: srgb(0xb39a73),
  /** Crust ground to dust by wheels: paler than the crust; the ruts pressed into it. */
  dust: srgb(0xd4c9af),
  rut: srgb(0x9d917a),
  /** The ephemerals' short sward: fresh green, and the grey-green where it is thin or the wormwood's felt shows through. */
  herbGreen: srgb(0x87994e),
  herbDry: srgb(0xa6a37e),
  /** The darker loose soil heaped round a shrub's foot. */
  litter: srgb(0x8b806a),
};

/**
 * The steppe's season, by the flight's date: what the spring's plants are by then. The ground does not change; the sward
 * does, and which plants stand. Each season says what it rests on (site-1.md, "The ground and what grows": the seasons).
 */
export interface SteppeSeason {
  name: 'thaw' | 'spring' | 'summer' | 'autumn' | 'winter';
  /** From this day of the year (month and day, 'MM-DD') until the next season's. */
  from: string;
  /** The sward's two tones, where it is thick and where it is thin (`STEPPE.herbGreen`, `herbDry` in the spring). */
  herbGreen: THREE.Color;
  herbDry: THREE.Color;
  /** By species' name (`steppeFlora`): its colours, and its share times this (0: not standing, or not seen, then). */
  species: Record<string, { colours?: [number, number]; share?: number }>;
  /**
   * Snow lying, where the season has it: the share of the ground it covers (0 to 1), in patches metres to tens of metres
   * across that lie longest against the shrubs and go first off the worked ground and the ruts, and its colour (old
   * snow, dirtied). Left out, none: then the ground's shaders are what they were without it, to the letter.
   */
  snow?: { cover: number; colour: THREE.Color };
  /** How wet the bare ground is, 0 to 1: the crust darkened and smoothed by water standing in it (the thaw's mud). Left out, dry. */
  wet?: number;
  confidence: 'documented' | 'derived' | 'estimated';
  source: string;
}

const DORMANT: SteppeSeason['species'] = {
  // nothing of the spring is up: the ephemerals and the tulips are below ground, the dead tufts lie flat
  'meadow-grass': { share: 0 },
  tulip: { share: 0 },
  rhubarb: { share: 0 },
  sedge: { colours: [0x9d927e, 0xaea38e] },
  // the shrubs dormant: the wormwood's felt grey, the biyurgun and the saltworts dry grey-brown
  wormwood: { colours: [0x8e9083, 0xa8a99b] },
  biyurgun: { colours: [0x6c6858, 0x817b68] },
  teresken: { colours: [0x9a978a, 0xb2ae9f] },
  saltwort: { colours: [0x857a68, 0x9a8f7b] },
};

export const SEASONS: SteppeSeason[] = [
  {
    // the end of the winter: old snow going in patches, mud, the plants dormant (THAW). From the snow's usual last days
    // (the median last day with snow at Kazalinsk is about 1 March, 1993 to 2025: GHCN-Daily), estimated
    name: 'thaw',
    from: '03-01',
    // last year's sward, flattened and grey under the snow
    herbGreen: srgb(0x9a8f7e),
    herbDry: srgb(0x948a80),
    species: DORMANT,
    snow: { cover: 0.3, colour: srgb(0xd6d3cb) },
    wet: 0.6,
    confidence: 'estimated',
    source: THAW,
  },
  {
    name: 'spring',
    // (from the snow's going: the flush of the second week of April, Vostok 1's, is the only spring day drawn)
    from: '04-01',
    herbGreen: STEPPE.herbGreen,
    herbDry: STEPPE.herbDry,
    species: {},
    confidence: 'documented',
    source:
      'the April flush: the ephemerals and ephemeroids out, the steppe "almost green" (Chertok, April 1957), the tulips "earlier than usual" in April 1961 (Chertok); its colours estimated from colour photographs of the cosmodrome in April',
  },
  {
    name: 'summer',
    from: '06-01',
    // the spring's sward dried where it stood: straw over the crust, paler where thin
    herbGreen: srgb(0xb09f86),
    herbDry: srgb(0xa6988a),
    species: {
      // the ephemerals' tufts dry on their roots as straw; the tulips and the wild rhubarb are below ground till spring
      'meadow-grass': { colours: [0xb3a184, 0xc4b394] },
      sedge: { colours: [0xae9e80, 0xbfb092] },
      tulip: { share: 0 },
      rhubarb: { share: 0 },
      // the wormwood greyer in the drought; the saltworts still green, which turn only in the autumn
      wormwood: { colours: [0x949684, 0xb1b2a0] },
      biyurgun: { colours: [0x6f7558, 0x878c69] },
    },
    confidence: 'estimated',
    source: SUMMER,
  },
  {
    // the autumn: dry and frosty, past every plant's season (AUTUMN). From mid-September, when the saltworts' fruits
    // have turned (Flora of the USSR: July to September), estimated
    name: 'autumn',
    from: '09-15',
    // the summer's straw, greyer and paler after the first rains and frosts
    herbGreen: srgb(0xa99c87),
    herbDry: srgb(0xa1968a),
    species: {
      'meadow-grass': { colours: [0xae9f86, 0xbfb197] },
      sedge: { colours: [0xa99a80, 0xbaab91] },
      tulip: { share: 0 },
      rhubarb: { share: 0 },
      // the wormwood past flowering, grey-green to grey with straw-coloured spent stems
      wormwood: { colours: [0x91937f, 0xacad99] },
      // the biyurgun reddish brown with its dried fruits; the saltworts rusty pink-brown; the teresken's hairs rufous
      biyurgun: { colours: [0x7a6553, 0x92775f] },
      saltwort: { colours: [0x9a6f60, 0xb08a77] },
      teresken: { colours: [0xa8957d, 0xbda88f] },
    },
    confidence: 'estimated',
    source: AUTUMN,
  },
  {
    name: 'winter',
    from: '12-01',
    herbGreen: srgb(0x9a8f7e),
    herbDry: srgb(0x948a80),
    species: DORMANT,
    confidence: 'estimated',
    source:
      'Dormant plants assumed from the March thaw. Dzhusaly and Aralsk reported dry ground on 2 December 1974 (NOAA ISD, IA1), taken for the Soyuz 16 scene.',
  },
];

/** Dated reports of lying snow take precedence over the seasonal ground. */
export function seasonOf(date: string): SteppeSeason {
  if (date.slice(0, 10) === '1969-01-14') {
    return {
      ...SEASONS.find((s) => s.name === 'winter')!,
      snow: { cover: 0.95, colour: srgb(0xe6e8e8) },
      source:
        'Siddiqi, Challenge to Apollo, p. 670, records eyewitnesses describing thick snow over the Soyuz 4 launch area. The coverage and tint are estimated.',
    };
  }
  const day = date.slice(5, 10);
  const sorted = [...SEASONS].sort((a, b) => a.from.localeCompare(b.from));
  return [...sorted].reverse().find((x) => x.from <= day) ?? sorted[sorted.length - 1]!;
}

/** The same as land.ts's Palette (its default ground is not used: `steppeGround` is), for what reads the palette: the far tone, the canopy (none here). */
export const steppePalette = (season: SteppeSeason): Palette => ({
  sand: STEPPE.loam,
  sandDark: STEPPE.loamDark,
  herbDry: season.herbDry,
  herbGreen: season.herbGreen,
  litter: STEPPE.litter,
  leaf: srgb(0x7f8670),
  leafLit: srgb(0xa9ad96),
  leafOther: srgb(0x8b9468),
});

/** The steppe seen whole, as the globe keeps it round the site from height (globe.ts `tone`): crust, sward and wormwood together. */
export const steppeTone = (season: SteppeSeason) => {
  const tone = STEPPE.loam.clone().lerp(season.herbGreen, 0.3).lerp(STEPPE.litter, 0.15);
  if (season.wet) tone.multiplyScalar(1 - 0.28 * season.wet);
  return season.snow ? tone.lerp(season.snow.colour, season.snow.cover) : tone;
};
/** And in the cel look (globe.ts `celLand`): the ground's flat tone. */
export const steppeCel = (season: SteppeSeason) => {
  const tone = STEPPE.loam.clone().multiplyScalar(1.02).lerp(season.herbGreen, 0.2);
  if (season.wet) tone.multiplyScalar(1 - 0.2 * season.wet);
  return season.snow ? tone.lerp(season.snow.colour, season.snow.cover) : tone;
};

/**
 * Where snow lies (`SteppeSeason.snow`): GLSL `float snowField(vec2 p, float shrub, float bared)`, a field of drifts
 * metres to tens of metres across, higher against the shrubs that hold it and lower where the ground was worked bare (bared,
 * 0 to 1: the worked ground and the ruts); and the cut over which it lies so that about `cover` of open ground is under it.
 * The field's three noises (each about uniform on 0 to 1) are taken as summing to a spread of 0.13 about 0.5: the cut is
 * its quantile at 1 - cover by a logistic's, good to a few hundredths of cover (estimated, as the cover is).
 */
const snowGlsl = (season: SteppeSeason): { field: string; cut: number } | null => {
  if (!season.snow) return null;
  const c = Math.min(0.99, Math.max(0.01, season.snow.cover));
  return {
    field: /* glsl */ `
  float snowField(vec2 p, float shrub, float bared) {
    float drift = noise(vec3(p * 0.045, 60.0)) * 0.55 + noise(vec3(p * 0.21, 61.0)) * 0.3 + noise(vec3(p * 1.1, 62.0)) * 0.15;
    return drift + 0.12 * smoothstep(0.2, 0.6, shrub) - 0.3 * bared;
  }`,
    cut: 0.5 + 0.13 * 0.5513 * Math.log((1 - c) / c),
  };
};

/**
 * GLSL for the cover's bake: `void steppe(vec2 p, float low, out ...)`, the steppe's own cover at p (metres) where the
 * site says the ground lies `low` (0 on the rises, 1 in the broad hollows: water stands there after the snow).
 * - takyr: bare clay floors in the hollows' pans, tens to a few hundred metres across, with crisp edges;
 * - salt: a crust in the lowest middles of some of them;
 * - sand: patches on the rises;
 * - shrub: the wormwood and biyurgun's cover, some 0.3 to 0.4 of the ground on the loam, thin on the pans;
 * - herb: the spring sward, over half the loam, patchy, little on the pans;
 * - zone: what the ground is, for which species grow (STEPPE_FLORA): 0 sand, 0.5 loam, 0.8 a pan's margin, 1 the pan.
 * Needs FIELD (fbm2, noise2).
 */
export const STEPPE_COVER = /* glsl */ `
  void steppeOn(vec2 p, float takyr, float margin, float salt, float sand, out float shrub, out float herb, out float zone);
  void steppe(vec2 p, float low, out float shrub, out float herb, out float takyr, out float salt, out float sand, out float zone) {
    // the pans: where a field tens to hundreds of metres across is over its cut, more readily in the hollows
    float pans = fbm2(p * 0.0045, 62, 3) + 0.08 * low + 0.02 * (noise2(p * 0.03, 66) - 0.5);
    takyr = smoothstep(0.655, 0.665, pans);
    float margin = smoothstep(0.61, 0.655, pans) * (1.0 - takyr);
    salt = takyr * smoothstep(0.7, 0.72, pans + 0.04 * (noise2(p * 0.05, 64) - 0.5)) * step(0.45, noise2(p * 0.004, 65));
    // sand on the rises, away from the pans
    sand = smoothstep(0.6, 0.66, fbm2(p * 0.006, 63, 3) - 0.12 * low) * (1.0 - smoothstep(0.45, 0.55, pans));
    steppeOn(p, takyr, margin, salt, sand, shrub, herb, zone);
  }
  // Where a map places the ground's kinds (a site's soil map): how far inside a mapped pan, salt crust and sand patch p
  // is, metres (negative outside; very negative where nothing is mapped near). Each edge wanders a few metres as a
  // drawn edge does not; the pan keeps its crisp rim and its ring of biyurgun.
  void steppeMapped(vec2 p, float panIn, float saltIn, float sandIn, out float shrub, out float herb, out float takyr, out float salt, out float sand, out float zone) {
    float wander = 7.0 * (noise2(p * 0.025, 66) - 0.5) + 2.5 * (noise2(p * 0.09, 67) - 0.5);
    takyr = smoothstep(-0.6, 0.6, panIn + wander);
    float margin = smoothstep(-28.0, 0.0, panIn + wander) * (1.0 - takyr);
    salt = smoothstep(-0.6, 0.6, saltIn + 0.8 * wander + 3.0 * (noise2(p * 0.05, 64) - 0.5));
    takyr = max(takyr, salt);
    sand = smoothstep(-6.0, 6.0, sandIn + 2.0 * wander) * (1.0 - takyr);
    steppeOn(p, takyr, margin, salt, sand, shrub, herb, zone);
  }
  void steppeOn(vec2 p, float takyr, float margin, float salt, float sand, out float shrub, out float herb, out float zone) {
    // the shrubs: thicker and thinner over tens of metres, gaps of a few metres between clumps
    shrub = 0.36 + 0.22 * (fbm2(p * 0.03, 31, 3) - 0.5) - 0.12 * smoothstep(0.55, 0.75, noise2(p * 0.12, 33));
    shrub = mix(shrub, 0.24, sand);
    shrub = mix(shrub, 0.45, margin);   // the biyurgun's ring round a pan
    shrub *= 1.0 - 0.92 * takyr;
    // the spring sward: patchy over tens of metres, thin on sand, all but none on a pan
    herb = 0.5 + 0.45 * (fbm2(p * 0.018, 34, 3) - 0.5) + 0.12 * (noise2(p * 0.1, 35) - 0.5);
    herb = mix(herb, 0.3, sand);
    herb *= 1.0 - 0.9 * takyr;
    herb = clamp(herb, 0.0, 1.0);
    zone = mix(mix(0.5, 0.0, smoothstep(0.3, 0.7, sand)), 0.8, margin);
    zone = mix(zone, 1.0, takyr);
  }`;

/**
 * GLSL: the steppe's ground (land.ts `LandSpec.ground`). Its maps: A (shrub, herb, bare, zone), B (worked, salt, sand,
 * takyr). The site's `shared` defines `float rutsAt(vec2 p, out vec2 along)`: how much the ground at p lies in ruts
 * worn by wheels, 0 to 1, and the way they run.
 */
export const steppeGround = (season: SteppeSeason) => /* glsl */ `${snowGlsl(season)?.field ?? ''}
  // the nearest crack of a floor cracked into polygons size metres across, metres; and the polygon's own shade, 0 to 1
  float steppeCracks(vec2 p, float size, out float tone) {
    vec2 c = p / size, i = floor(c), f = c - i;
    float d1 = 8.0, d2 = 8.0;
    vec2 m1 = vec2(0.0), m2 = vec2(0.0), best = vec2(0.0);
    for (int y = -1; y <= 1; y++)
      for (int x = -1; x <= 1; x++) {
        ivec2 n = ivec2(i) + ivec2(x, y);
        vec2 o = vec2(float(x), float(y)) + vec2(hash2(n, 81), hash2(n, 82)) * 0.8 + 0.1 - f;
        float d = dot(o, o);
        if (d < d1) { d2 = d1; m2 = m1; d1 = d; m1 = o; best = vec2(n); }
        else if (d < d2) { d2 = d; m2 = o; }
      }
    tone = hash2(ivec2(best), 83);
    return dot(0.5 * (m1 + m2), normalize(m2 - m1)) * size;
  }
  Ground ground(vec2 p, vec4 A, vec4 B) {
    float shrub = A.r, herb = A.g, worked = B.r, salt = B.g, sand = B.b, takyr = B.a;
    Ground g;
    g.water = 0.0;
    g.rough = 1.0;
    // the crust: paler and darker over tens of metres where the clay lies thicker or the loam is sandier; scuffs; grains
    float drift = noise(vec3(p * 0.03, 1.0)) * 0.7 + noise(vec3(p * 0.17, 2.0)) * 0.3;
    vec3 soil = mix(${vec3(STEPPE.loamDark)}, ${vec3(STEPPE.loam)}, 0.45 + 0.55 * drift);
    // (each grain is worked out only where it can be made out: past that its share is nought)
    float tread = 0.5, grain = 0.5;
    if (seen(0.12) > 0.0) tread = noise(vec3(p * 2.4, 5.0)) * 0.6 + noise(vec3(p * 7.0, 6.0)) * 0.4;
    if (seen(0.004) > 0.0) grain = noise(vec3(p * 160.0, 2.0)) * 0.6 + noise(vec3(p * 430.0, 4.0)) * 0.4;
    soil *= 1.0 + 0.14 * (tread - 0.5) * seen(0.12) + 0.2 * (grain - 0.5) * seen(0.004);
    g.bump = 0.02 * (tread - 0.5) * seen(0.12);
    // sand: warmer, in low ripples across the wind where it is loose and bare
    vec3 sandy = mix(${vec3(STEPPE.sandDark)}, ${vec3(STEPPE.sand)}, drift) * (1.0 + 0.2 * (grain - 0.5) * seen(0.004));
    float rip = 0.0, ripples = sand * (1.0 - smoothstep(0.05, 0.4, herb)) * seen(0.06);
    if (ripples > 0.0) {
      float warp = noise(vec3(p * 0.6, 8.0)) * 0.35 + noise(vec3(p * 2.3, 8.5)) * 0.04;
      rip = sin((p.x + warp + 0.08 * p.y) * 62.8);
      ripples *= smoothstep(0.3, 0.7, noise(vec3(p * 0.18, 8.9)));
    }
    sandy *= 1.0 + 0.04 * rip * ripples;
    g.bump += 0.003 * rip * ripples;
    soil = mix(soil, sandy, smoothstep(0.15, 0.75, sand));
    // a takyr: a smooth pale floor of clay cracked into polygons a hand or two across, each a shade apart, the
    // cracks dark and their edges curled a little (the size estimated; no source gives it). Each scale only where it can be made out.
    if (takyr > 0.0) {
      vec3 floor_ = ${vec3(STEPPE.takyr)} * (0.97 + 0.06 * noise(vec3(p * 0.04, 3.0)));
      float tone = 0.5, edge = 1.0;
      if (seen(0.04) > 0.0) edge = steppeCracks(p, 0.42, tone);
      floor_ *= 1.0 + 0.07 * (tone - 0.5) * seen(0.3);
      float crack = (1.0 - smoothstep(0.006, 0.016, edge)) * seen(0.03);
      floor_ = mix(floor_, ${vec3(STEPPE.crack)}, crack);
      soil = mix(soil, floor_, takyr);
      g.bump = mix(g.bump, (0.004 * smoothstep(0.0, 0.08, edge) - 0.006 * crack) * seen(0.04), takyr);
      g.rough = mix(g.rough, 0.9, takyr);
    }
    // a salt crust: white, in puffy patches a stride across where it is thin
    float crust = smoothstep(0.25, 0.75, salt + 0.35 * (noise(vec3(p * 0.7, 7.0)) - 0.5) * seen(1.5));
    vec3 white = ${vec3(STEPPE.salt)} * (0.94 + 0.1 * mix(0.5, noise(vec3(p * 4.0, 8.0)), seen(0.25)));
    soil = mix(soil, white, crust);
    g.bump = mix(g.bump, 0.006 * (noise(vec3(p * 4.0, 8.0)) - 0.5) * seen(0.25), crust);
    // ground the wheels have worked: the crust ground to pale dust, and in it the ruts, each a wheel's track pressed
    // darker, two of them 1.6 m apart, braided along the way the traffic went (the site's rutsAt), coming and going
    vec2 along;
    float rutted = rutsAt(p, along);
    float tyres = 0.0;
    if (max(rutted, worked) * seen(0.3) > 0.0) {
      vec2 across = vec2(-along.y, along.x);
      float a = dot(p, across) + 7.0 * noise(vec3(p * 0.02, 26.0));
      float lane = floor(a / 4.5);
      float f = a - (lane + 0.5) * 4.5;
      float wheel = 1.0 - smoothstep(0.1, 0.22, abs(abs(f) - 0.8));
      float runs = smoothstep(0.42, 0.6, noise(vec3(dot(p, along) * 0.015, lane, 27.0)));
      tyres = wheel * runs * (0.55 + 0.45 * noise(vec3(p * 0.6, 29.0))) * rutted;
      // on the site's own worked ground, as land.ts's default has it: tracks every way
      for (int k = 0; k < 2; k++) {
        float an = 0.7 + 1.9 * float(k);
        vec2 dir = vec2(cos(an), sin(an));
        float acr = dot(p, vec2(-dir.y, dir.x)) + 9.0 * noise(vec3(p * 0.025, 26.0 + float(k)));
        float ln = floor(acr / 23.0);
        float ff = acr - (ln + 0.5) * 23.0;
        float wh = 1.0 - smoothstep(0.06, 0.15, abs(abs(ff) - 0.75));
        float rn = smoothstep(0.45, 0.6, noise(vec3(dot(p, dir) * 0.03, ln, 27.0 + float(k))));
        tyres = max(tyres, wh * rn * (0.5 + 0.5 * noise(vec3(p * 0.7, 29.0 + float(k)))) * worked);
      }
      tyres *= seen(0.3);
    }
    float dusty = max(worked, 0.8 * rutted);
    vec3 dust = ${vec3(STEPPE.dust)} * (0.95 + 0.1 * noise(vec3(p * 0.3, 30.0)));
    soil = mix(soil, dust, dusty * (1.0 - crust) * (1.0 - 0.6 * takyr));
    soil = mix(soil, ${vec3(STEPPE.rut)}, 0.7 * tyres);
    g.bump += -0.015 * tyres;
    g.albedo = soil;
    // the spring sward: clumps of a hand's breadth to a stride, the crust between where it is thin; no blades, tone
    float clump = noise(vec3(p * 1.7, 9.0)) * 0.6 + noise(vec3(p * 5.5, 10.0)) * 0.4;
    float sward = smoothstep(clump - 0.3, clump + 0.2, herb * 1.2 + 0.25 * (noise(vec3(p * 9.0, 41.0)) - 0.5) * seen(0.1));
    sward = mix(herb, sward, seen(0.35)) * (1.0 - 0.85 * dusty) * (1.0 - crust);
    vec3 green = mix(${vec3(season.herbDry)}, ${vec3(season.herbGreen)}, smoothstep(0.25, 0.75, noise(vec3(p * 0.07, 11.0)) * 0.7 + clump * 0.3));
    green *= 0.86 + 0.28 * (clump - 0.5) * seen(0.2) + 0.1 * (noise(vec3(p * 3.1, 12.0)) - 0.5) * seen(0.08);
    g.albedo = mix(g.albedo, green, 0.85 * sward);
    g.bump += 0.008 * sward * (clump - 0.5) * seen(0.2);
    // round the shrubs' feet: the loose darker soil the wind heaps there (its edge goes to its mean under two pixels)
    float under = smoothstep(0.25, 0.65, shrub + 0.25 * (noise(vec3(p * 0.8, 14.0)) - 0.5) * seen(2.5));
    g.albedo = mix(g.albedo, ${vec3(STEPPE.litter)} * (0.85 + 0.3 * noise(vec3(p * 3.0, 15.0))), 0.15 * under * (1.0 - dusty));${season.wet ? wetGlsl(season.wet) : ''}${season.snow ? lyingGlsl(season) : ''}
    return g;
  }`;

/** The thaw's mud (`SteppeSeason.wet`): the bare crust darker and smoother where water stands in it, the sward less so. */
const wetGlsl = (wet: number) => /* glsl */ `
    // the bare ground wet: darker, smoother, a sheen where it is wettest (the thaw's mud over frozen ground)
    float soaked = ${wet.toFixed(3)} * (1.0 - 0.6 * sward) * (0.75 + 0.5 * noise(vec3(p * 0.06, 64.0)));
    g.albedo *= 1.0 - 0.35 * soaked;
    g.rough = mix(g.rough, 0.55, soaked);`;

/** Snow lying in patches (`SteppeSeason.snow`), dirtied, a little uneven in tone near the eye. */
const lyingGlsl = (season: SteppeSeason) => /* glsl */ `
    // old snow lying in patches, dirtied; its edge soft, as a thin layer's is
    float lying = smoothstep(${(snowGlsl(season)!.cut - 0.02).toFixed(4)}, ${(snowGlsl(season)!.cut + 0.02).toFixed(4)}, snowField(p, shrub, max(dusty, tyres)));
    vec3 snow = ${vec3(season.snow!.colour)} * (0.95 + 0.08 * noise(vec3(p * 0.9, 65.0)) * seen(0.2));
    g.albedo = mix(g.albedo, snow, lying);
    g.rough = mix(g.rough, 0.6, lying);
    g.bump = mix(g.bump, 0.003 * (noise(vec3(p * 4.0, 66.0)) - 0.5) * seen(0.2), lying);`;

/**
 * GLSL: the steppe in the cel look (land.ts `LandSpec.cel`): each ground one flat tone chosen by its map with an edge
 * that wanders like a brush's, a darker tone in patches tens of metres across, and near the eye the marks a pen makes:
 * the takyr's polygons drawn, a stipple on the crust, short strokes where the sward is, the ruts as lines.
 */
export const steppeCelGround = (season: SteppeSeason) => /* glsl */ `
  vec3 groundCel(vec2 p, vec4 A, vec4 B, float roofed) {
    float wander = noise(vec3(p * 0.08, 50.0)) - 0.5;
    vec3 c = ${vec3(STEPPE.loam)} * 1.06;
    c = mix(c, mix(${vec3(STEPPE.loam)}, ${vec3(STEPPE.sand)}, 0.4) * 1.04, step(0.45, B.b + 0.3 * wander));
    float grassed = step(0.42, A.g + 0.35 * wander) * (1.0 - step(0.45, B.r + 0.3 * wander));
    c = mix(c, mix(${vec3(season.herbDry)}, ${vec3(season.herbGreen)}, 0.45) * 1.1, grassed);
    float pan = step(0.5, B.a + 0.15 * wander);
    c = mix(c, ${vec3(STEPPE.takyr)} * 1.08, pan);
    c = mix(c, ${vec3(STEPPE.salt)}, step(0.55, B.g + 0.2 * wander));
    vec2 along;
    float rutted = rutsAt(p, along);
    c = mix(c, ${vec3(STEPPE.dust)} * 1.08, step(0.45, max(B.r, 0.8 * rutted) + 0.3 * wander));
    c *= 1.0 - 0.08 * step(0.62, noise(vec3(p * 0.03, 51.0)));
    // the pen: a takyr's polygons outlined; on the crust a stipple, in the sward short strokes in tufts
    float mark = 0.0;
    if (seen(0.05) > 0.0) {
      float tone;
      float edge = pan > 0.5 ? steppeCracks(p, 0.42, tone) : 1.0;
      mark = max(mark, (1.0 - smoothstep(0.008, 0.02, edge)) * pan);
      vec2 tc = p * 3.0, ti = floor(tc), tf = tc - ti;
      float th = hash(vec3(ti, 52.0));
      vec2 to = vec2(hash(vec3(ti, 53.0)), hash(vec3(ti, 54.0))) * 0.6 + 0.2;
      float ta = 1.2 + 0.7 * (th - 0.5);
      vec2 td = vec2(cos(ta), sin(ta)), tq = tf - to;
      float stroke = (1.0 - smoothstep(0.02, 0.05, abs(tq.x * td.y - tq.y * td.x))) * step(abs(dot(tq, td)), 0.12) * step(0.55, th);
      float dot_ = (1.0 - smoothstep(0.025, 0.05, length(tq))) * step(0.82, th);
      mark = max(mark, mix(dot_, stroke, grassed) * (1.0 - pan));
      mark *= seen(0.06);
    }${
      season.wet
        ? `
    c *= 1.0 - ${(0.2 * season.wet).toFixed(3)};   // the thaw's mud: the ground a shade darker`
        : ''
    }${
      season.snow
        ? `
    // the snow: one flat tone, its edge where the field crosses the cut, no pen inside it (snowField: the ground's, before this)
    float lying = step(${snowGlsl(season)!.cut.toFixed(4)}, snowField(p, A.r, max(B.r, 0.8 * rutted)));
    c = mix(c, ${vec3(season.snow.colour)} * 1.04, lying);
    mark *= 1.0 - lying;`
        : ''
    }
    return mix(c, c * 0.68, mark);
  }`;

const c = srgb;

/**
 * What grows, by the ground (the cover's zone: 0 sand, 0.5 loam, 0.8 a pan's margin, 1 the pan) and in which layer
 * (the shrubs in the cover's shrub channel, the spring plants in its herb channel). The species are those recorded on
 * the cosmodrome's land and at Tyuratam (above); their forms are designed; heights are the floras', shares and colours estimated.
 */
export function steppeFlora(day: Day): FloraSpec {
  const species: Species[] = [
    {
      // white-earth wormwood: a low grey-white felted dome, the commonest plant there is
      name: 'wormwood',
      form: { kind: 'shrub', masses: [6, 9], spread: 1.6 },
      layer: 'woody',
      abundance: [
        [0, 0.45],
        [0.5, 1],
        [0.8, 0.35],
        [1, 0],
      ],
      height: [0.12, 0.3],
      colours: [c(0x8c977a), c(0xaab296)],
      near: 25,
      reach: 170,
      sway: 0.25,
      rough: 0.95,
    },
    {
      // biyurgun: small, dark grey-green, jointed; in complexes with the wormwood and round the pans
      name: 'biyurgun',
      form: { kind: 'shrub', masses: [3, 5], spread: 1.1 },
      layer: 'woody',
      abundance: [
        [0, 0.05],
        [0.5, 0.4],
        [0.8, 1],
        [1, 0.1],
      ],
      height: [0.08, 0.2],
      colours: [c(0x6b7557), c(0x86906a)],
      near: 22,
      reach: 130,
      sway: 0.15,
      rough: 0.9,
    },
    {
      // teresken: a taller silvery shrub, here and there on the loam and the sand
      name: 'teresken',
      form: { kind: 'shrub', masses: [4, 6], spread: 1.1 },
      layer: 'woody',
      abundance: [
        [0, 0.2],
        [0.5, 0.1],
        [0.8, 0],
      ],
      height: [0.35, 0.7],
      colours: [c(0xa1a68e), c(0xbcbea6)],
      near: 30,
      reach: 260,
      sway: 0.3,
      rough: 0.9,
    },
    {
      // saltwort in the hollows: yellow-green, round the pans' margins
      name: 'saltwort',
      form: { kind: 'shrub', masses: [3, 4], spread: 1.0 },
      layer: 'woody',
      abundance: [
        [0.5, 0],
        [0.8, 0.45],
        [1, 0.3],
      ],
      height: [0.15, 0.35],
      colours: [c(0x8a9456), c(0xa3aa68)],
      near: 22,
      reach: 140,
      sway: 0.35,
      rough: 0.85,
    },
    {
      // bulbous meadow grass and the other ephemerals: low fresh tufts, most of the spring's green
      name: 'meadow-grass',
      form: { kind: 'shrub', masses: [2, 3], spread: 0.9 },
      layer: 'herb',
      abundance: [
        [0, 0.3],
        [0.5, 1],
        [0.8, 0.5],
        [1, 0],
      ],
      height: [0.05, 0.12],
      colours: [c(0x7d9a4a), c(0x9cb062)],
      near: 16,
      reach: 45,
      sway: 0.5,
      rough: 0.85,
    },
    {
      // sedge on the sand
      name: 'sedge',
      form: { kind: 'shrub', masses: [2, 3], spread: 1.2 },
      layer: 'herb',
      abundance: [
        [0, 1],
        [0.4, 0.15],
        [0.5, 0],
      ],
      height: [0.08, 0.16],
      colours: [c(0x99a062), c(0xb2b277)],
      near: 16,
      reach: 45,
      sway: 0.5,
      rough: 0.85,
    },
    {
      // Borszczow's tulip, yellow through orange to scarlet, out early in April 1961
      name: 'tulip',
      form: { kind: 'flower', leaves: [2, 3], cup: 0.16, leaf: c(0x71865a) },
      layer: 'herb',
      abundance: [
        [0, 0.12],
        [0.5, 0.1],
        [0.8, 0.03],
        [1, 0],
      ],
      height: [0.12, 0.2],
      colours: [c(0xd2301c), c(0xf0c22a)],
      near: 20,
      reach: 70,
      sway: 0.45,
      rough: 0.6,
    },
    {
      // wild rhubarb: broad round leaves flat on the clay
      name: 'rhubarb',
      form: { kind: 'rosette', leaves: [2, 4] },
      layer: 'herb',
      abundance: [
        [0.3, 0],
        [0.5, 0.06],
        [0.8, 0.04],
        [1, 0],
      ],
      height: [0.35, 0.6],
      colours: [c(0x6b8646), c(0x87a056)],
      near: 22,
      reach: 80,
      sway: 0.1,
      rough: 0.7,
    },
  ];
  // the season's changes: colours, and what is not standing (or not seen) then
  const season = seasonOf(day.date);
  const seasonal = species.flatMap((sp): Species[] => {
    const change = season.species[sp.name];
    if (!change) return [sp];
    if (change.share === 0) return [];
    return [
      {
        ...sp,
        ...(change.colours ? { colours: [c(change.colours[0]), c(change.colours[1])] as [THREE.Color, THREE.Color] } : {}),
        ...(change.share !== undefined ? { abundance: sp.abundance.map(([z, a]): [number, number] => [z, a * change.share!]) } : {}),
      },
    ];
  });
  return {
    spacing: { woody: 1.25, herb: 1.1, tree: 40 },
    stature: () => 1,
    wind: breeze(day), // the day's wind at the ground: the flight's record (its `weather`)
    species: seasonal,
  };
}
