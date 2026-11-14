import * as THREE from 'three';
import type { Day } from './day.ts';
import { breeze } from './day.ts';
import type { FloraSpec, Species } from './flora';
import type { Palette } from './land';

/**
 * The northern desert of the Turan lowland on the lower Syr Darya's right bank, in the second week of April, as a
 * kind of country: what its ground is, what grows on it and how thick, in the look the project asks for (AGENTS.md,
 * "Designed, not photographic"). Nothing here knows a site: Tyuratam's Site 1 (tyuratam.ts) uses it, and so can the
 * next pad on the same steppe (Site 31, the later Soviet flights), each giving its own lie of the land and its own made
 * ground. Sources and confidence are set out in missions/ussr/vostok/sites/site-1.md, "The ground and what grows", and
 * docs/sources.md, "The steppe at Tyuratam". In short:
 *
 * - **The ground** is grey-brown desert loam under a thick clay crust (Chertok's "steppe asphalt", which the builders'
 *   trucks of 1955 to 1957 ground to dust in ruts kilometres wide), with takyrs (bare cracked clay floors) and
 *   solonchaks (salt crusts) in the hollows and small patches of sand on the rises: the soils of the Syr Darya's desert
 *   valley (Veselova and others 2017). Where each lies here, how big and its colours are estimated: no soil map of the
 *   cosmodrome has been read.
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

/** A colour as an sRGB hex (three converts it to its linear working space). */
const srgb = (hex: number) => new THREE.Color(hex);
const vec3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

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
  dust: srgb(0xc3b8a0),
  rut: srgb(0x9d917a),
  /** The ephemerals' short sward: fresh green, and the grey-green where it is thin or the wormwood's felt shows through. */
  herbGreen: srgb(0x87994e),
  herbDry: srgb(0xa6a37e),
  /** The darker loose soil heaped round a shrub's foot. */
  litter: srgb(0x8b806a),
};

/** The same as land.ts's Palette (its default ground is not used: `STEPPE_GROUND` is), for what reads the palette: the far tone, the canopy (none here). */
export const STEPPE_PALETTE: Palette = {
  sand: STEPPE.loam,
  sandDark: STEPPE.loamDark,
  herbDry: STEPPE.herbDry,
  herbGreen: STEPPE.herbGreen,
  litter: STEPPE.litter,
  leaf: srgb(0x7f8670),
  leafLit: srgb(0xa9ad96),
  leafOther: srgb(0x8b9468),
};

/** The steppe seen whole, as the globe keeps it round the site from height (globe.ts `tone`): crust, sward and wormwood together. */
export const STEPPE_TONE = STEPPE.loam.clone().lerp(STEPPE.herbGreen, 0.3).lerp(STEPPE.litter, 0.15);
/** And in the cel look (globe.ts `celLand`): the ground's flat tone. */
export const STEPPE_CEL = STEPPE.loam.clone().multiplyScalar(1.02).lerp(STEPPE.herbGreen, 0.2);

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
  void steppe(vec2 p, float low, out float shrub, out float herb, out float takyr, out float salt, out float sand, out float zone) {
    // the pans: where a field tens to hundreds of metres across is over its cut, more readily in the hollows
    float pans = fbm2(p * 0.0045, 62, 3) + 0.08 * low + 0.02 * (noise2(p * 0.03, 66) - 0.5);
    takyr = smoothstep(0.655, 0.665, pans);
    float margin = smoothstep(0.61, 0.655, pans) * (1.0 - takyr);
    salt = takyr * smoothstep(0.7, 0.72, pans + 0.04 * (noise2(p * 0.05, 64) - 0.5)) * step(0.45, noise2(p * 0.004, 65));
    // sand on the rises, away from the pans
    sand = smoothstep(0.6, 0.66, fbm2(p * 0.006, 63, 3) - 0.12 * low) * (1.0 - smoothstep(0.45, 0.55, pans));
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
export const STEPPE_GROUND = /* glsl */ `
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
    vec3 green = mix(${vec3(STEPPE.herbDry)}, ${vec3(STEPPE.herbGreen)}, smoothstep(0.25, 0.75, noise(vec3(p * 0.07, 11.0)) * 0.7 + clump * 0.3));
    green *= 0.86 + 0.28 * (clump - 0.5) * seen(0.2) + 0.1 * (noise(vec3(p * 3.1, 12.0)) - 0.5) * seen(0.08);
    g.albedo = mix(g.albedo, green, 0.85 * sward);
    g.bump += 0.008 * sward * (clump - 0.5) * seen(0.2);
    // round the shrubs' feet: the loose darker soil the wind heaps there (its edge goes to its mean under two pixels)
    float under = smoothstep(0.25, 0.65, shrub + 0.25 * (noise(vec3(p * 0.8, 14.0)) - 0.5) * seen(2.5));
    g.albedo = mix(g.albedo, ${vec3(STEPPE.litter)} * (0.85 + 0.3 * noise(vec3(p * 3.0, 15.0))), 0.15 * under * (1.0 - dusty));
    return g;
  }`;

/**
 * GLSL: the steppe in the cel look (land.ts `LandSpec.cel`): each ground one flat tone chosen by its map with an edge
 * that wanders like a brush's, a darker tone in patches tens of metres across, and near the eye the marks a pen makes:
 * the takyr's polygons drawn, a stipple on the crust, short strokes where the sward is, the ruts as lines.
 */
export const STEPPE_CEL_GROUND = /* glsl */ `
  vec3 groundCel(vec2 p, vec4 A, vec4 B, float roofed) {
    float wander = noise(vec3(p * 0.08, 50.0)) - 0.5;
    vec3 c = ${vec3(STEPPE.loam)} * 1.06;
    c = mix(c, mix(${vec3(STEPPE.loam)}, ${vec3(STEPPE.sand)}, 0.4) * 1.04, step(0.45, B.b + 0.3 * wander));
    float grassed = step(0.42, A.g + 0.35 * wander) * (1.0 - step(0.45, B.r + 0.3 * wander));
    c = mix(c, mix(${vec3(STEPPE.herbDry)}, ${vec3(STEPPE.herbGreen)}, 0.45) * 1.1, grassed);
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
  return {
    spacing: { woody: 1.25, herb: 1.1, tree: 40 },
    stature: () => 1,
    wind: breeze(day), // the day's wind at the ground: the flight's record (its `weather`)
    species,
  };
}
