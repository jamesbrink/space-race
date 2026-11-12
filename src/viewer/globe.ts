import * as THREE from 'three';
import {
  add,
  dot,
  ecefToGeodetic,
  geodeticToEcef,
  length,
  type Site,
  scale,
  siteToEcefDirection,
  sub,
  type Vec3,
} from '../world/frames.ts';
import { planeAt, surfaceDirection } from '../world/region.ts';
import { RELIEF, RELIEF_GLSL } from '../world/relief.ts';
import { ellipsoidNormal, gaussianRadius, horizonDistance, seaPoint } from '../world/surface.ts';
import { type Clouds, cloudCutGlsl, cloudMiddle } from './air.ts';
import { ATMOSPHERE_GLSL, atmosphereUniforms } from './atmosphere.ts';
import { fillGlobe, RINGS, remakeAfter, SPOKES } from './globemesh.ts';
import type { Beyond } from './land';
import { CIRRUS_HEIGHT, cumulusBiasGlsl, DECK_HEIGHT, sheetsGlsl, WEATHER_GLSL } from './weather.ts';
import { onWeather, weatherUniforms } from './weathermap.ts';

/**
 * The Earth as a globe, to scale, under a site: the sea and the land seen from height, and
 * downrange where the site's own ground (land.ts) has ended. Nothing here knows which site it is:
 * it is given a place on the Earth (frames.ts: Site) and the height of the sea there, and it is
 * drawn in that site's frame, which is the scene's.
 *
 * **The shape** is the WGS 84 ellipsoid raised to the site's mean sea level (world/surface.ts).
 * It is a mesh round the point under the eye, made in doubles on the CPU: rings at distances
 * h sinh(k i) over the surface (h the eye's height), so each triangle looks about the same size
 * from the eye, near or far, out past the horizon; 192 round. Its vertices are relative to the
 * point under the eye (the mesh's own position), so the GPU only ever sees small numbers. It is
 * made again when the eye has moved a tenth of its height or changed height by a quarter (over the
 * site's own ground, a tenth of the way to that ground's edge if that is more: globemesh.ts): a
 * few milliseconds, and nothing at all while the eye is still.
 *
 * **The map** is land, inland water and ice from Natural Earth (public domain; tools/globe.mjs
 * bakes it): a distance to the shore on the six faces of a cube, looked up by the direction from
 * the Earth's centre, so the coastline is a clean line at any magnification and there is no seam
 * or pole. Over it, the land's own colours (NASA's Blue Marble for May) and the height of the ground and the
 * sea's bed (NOAA's ETOPO 2022), both baked by tools/globe-surface.mjs on the same cube and, finer, on a plane
 * over the site's region: the land is shaded by its relief under the true Sun and the sea is coloured by its
 * depth, so a bank is turquoise and the deep blue. (`RELIEF` is how a height is kept in a byte: relief.ts.)
 *
 * **The site's region** (types.ts: RegionDef) is drawn from a finer map where it covers:
 * OpenStreetMap's coast and larger lakes as they stood on the region's date (tools/globe-region.mjs
 * bakes it), a distance to the shore again, on two planes touching the sphere (world/region.ts):
 * `near`, 160 km square round the site at 39 m a texel, and `wide`, the region, at 155 m. Each
 * is faded in over the coarser map under it, distances mixed rather than colours, so where two
 * maps put a shore a little apart the shore moves across the fade and is never doubled.
 *
 * **The site's ground** is drawn by the site (land.ts) out to its edge, flat. The globe leaves a
 * hole for it (`Hole`) a little inside that edge, and the ground hands over to the globe across a
 * band before it (`beyond`): it bends down to the curve of the sea and takes the globe's colours,
 * so where the two overlap they are the same surface in the same colour, and which of them the
 * depth buffer picks cannot be seen.
 *
 * **The light** is the scene's (the Sun or the Moon as daysky.ts has it over the site), so the
 * globe and the ground agree where they meet; where the Sun is down on the globe itself (from the
 * true Sun, `sun`) the sky's fill goes out, so the night side is dark. The haze is the scene's
 * (air.ts), worked out along the ray with true heights over the curved sea.
 */

/** Distances to the shore are stored to this many texels (tools/globe.mjs: SPREAD). */
const SPREAD = 8;
/** The maps' faces, in the order a cube map takes them. */
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

/** Linear colours, chosen by eye against photographs from orbit (estimated): the sea's is the Cape's offshore water (cape.ts). */
const SEA = new THREE.Color().setRGB(0.018, 0.07, 0.12);
/**
 * The deep sea seen from above the air: what clear ocean water sends back up from within, about 0.3, 1.6 and 4.5
 * per cent of red, green and blue (the reflectance of the clearest waters, Morel and Prieur's Case 1 at low
 * chlorophyll: rounded, estimated). Near black: the blue of the sea from orbit is mostly the air over it and the
 * sky in it, which are drawn as themselves (atmosphere.ts, the reflections). From the ground the sea is `SEA`,
 * the Cape's own, and goes over to this as the eye rises.
 */
const DEEP = new THREE.Color().setRGB(0.003, 0.016, 0.045);
/** In the cel look the sea is a drawing's blue, not the water's own near black. */
const SEA_ABOVE = new THREE.Color().setRGB(0.012, 0.085, 0.27);
/**
 * The sea's roughness to the Sun's glint, seen from above: waves' slopes have a mean square of 0.003 + 0.00512 U
 * for a wind of U m/s (Cox and Munk 1954), 0.039 at the record's 7 m/s, so their spread is 0.2; three's roughness
 * is the square root of that. From the ground it is 0.32, the look the Cape's water was tuned to.
 */
const SEA_ROUGH = Math.sqrt(Math.sqrt(0.003 + 0.00512 * 7));
const LAND = new THREE.Color(0x4f7a42); // (the Cape's canopy seen whole, so the site's ground and the land beyond it are one green: cape.ts PALETTE)
const ICE = new THREE.Color(0xe4eaee);

const vec3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

/** How many banks of pale sand a region may name (tools/globe-surface.mjs: REGIONS). */
const BANKS = 6;
/** The land's cube faces, texels a side (tools/globe.mjs: --size). */
const FACE = 2048;
/** The Earth's mean radius, metres: for turning the cube's texels into distances on the ground, near enough for mixing them. */
const EARTH = 6_371_000;

/**
 * GLSL: the globe's colour toward a direction from the Earth's centre (ECEF), with its roughness.
 * Uniforms uGlobeLand, uGlobeIce, and the region's two maps (`regionUniforms`).
 */
const COLOUR = /* glsl */ `
  uniform samplerCube uGlobeLand, uGlobeIce;
  uniform sampler2D uGlobeNear, uGlobeWide;
  uniform mat3 uGlobeNearPlane, uGlobeWidePlane;   // rows: the plane's east, north and middle (world/region.ts)
  uniform vec4 uGlobeNearBox, uGlobeWideBox;   // what each covers on its plane: x0, y0, x1, y1
  uniform float uGlobeAbove;   // how far the eye has risen out of the air, 0 to 1
  uniform vec2 uGlobeNearScale, uGlobeWideScale;   // metres a texel, and how far in from its edge it is faded in (plane units; 0: none)
  uniform samplerCube uGlobeRelief, uGlobeColour;
  uniform sampler2D uGlobeSurfRelief, uGlobeSurfColour;
  uniform mat3 uGlobeSurfPlane;   // the surface region's plane, as the others'
  uniform vec4 uGlobeSurfBox;
  uniform float uGlobeSurfFade;   // how far in from its edge it is faded in (plane units; 0: none)
  ${RELIEF_GLSL}
  float globeField(samplerCube map, vec3 d) { return (texture(map, d).r * 255.0 - 128.0) * ${(SPREAD / 127).toFixed(6)}; }
  // where a direction falls on the surface region's maps, and how much they are to be believed there (w)
  vec2 globeSurf(vec3 d, out float w) {
    vec3 q = uGlobeSurfPlane * d;
    vec2 p = q.xy / max(q.z, 1e-3);
    vec4 box = uGlobeSurfBox;
    float edge = min(min(p.x - box.x, box.z - p.x), min(p.y - box.y, box.w - p.y));
    w = q.z > 0.5 && uGlobeSurfFade > 0.0 ? smoothstep(0.0, uGlobeSurfFade, edge) : 0.0;
    return clamp(vec2((p.x - box.x) / (box.z - box.x), (box.w - p.y) / (box.w - box.y)), 0.0, 1.0);
  }
  // the height of the solid surface toward a direction, metres above the sea (its bed is negative): ETOPO 2022
  float globeRelief(vec3 d) {
    float w;
    vec2 uv = globeSurf(d, w);
    return mix(reliefMetres(texture(uGlobeRelief, d).r * 255.0), reliefMetres(texture(uGlobeSurfRelief, uv).r * 255.0), w);
  }
  // What the sea sends back up from within, by its depth in metres: the deep water's own colour, and over a
  // shallow bed the light that reaches the bed and comes back, which loses its red in a few metres and its green in
  // tens, so a bank of pale sand under 3 m of water is turquoise and under 20 m blue. Twice the water's diffuse
  // attenuation for red, green and blue (clear ocean water, Jerlov type IB: about 0.35, 0.07 and 0.035 a metre) and
  // a bed of carbonate sand (it sends back two fifths of what reaches it) on the banks the region names (\`bank\`,
  // 0 to 1); elsewhere a darker bed under water half as clear (a continental shore's). Estimated from those, not
  // measured here.
  uniform vec4 uGlobeBanks[${BANKS}];   // each a direction from the Earth's centre and the cosine of its radius
  float globeBank(vec3 d) {
    float bank = 0.0;
    for (int i = 0; i < ${BANKS}; i++) bank = max(bank, smoothstep(uGlobeBanks[i].w - 0.0001, uGlobeBanks[i].w + 0.00005, dot(d, uGlobeBanks[i].xyz)));
    return bank;
  }
  vec3 globeWater(float bank, float depth, vec3 deep) {
    vec3 bed = mix(vec3(0.05, 0.06, 0.045), vec3(0.40, 0.42, 0.37), bank);
    return deep + (bed - deep) * exp(-vec3(0.70, 0.14, 0.07) * mix(2.2, 1.0, bank) * max(depth, 2.0));
  }
  // a region's map: the distance to the shore in metres, and how much it is to be believed here (w)
  float regionField(sampler2D map, mat3 plane, vec4 box, vec2 scale, vec3 d, out float w) {
    vec3 q = plane * d;
    vec2 p = q.xy / max(q.z, 1e-3);
    float edge = min(min(p.x - box.x, box.z - p.x), min(p.y - box.y, box.w - p.y));
    w = q.z > 0.5 && scale.y > 0.0 ? smoothstep(0.0, scale.y, edge) : 0.0;
    vec2 uv = vec2((p.x - box.x) / (box.z - box.x), (box.w - p.y) / (box.w - box.y));   // its rows run north to south
    return (texture(map, uv).r * 255.0 - 128.0) * ${(SPREAD / 127).toFixed(6)} * scale.x;
  }
  float globeSea;   // how much of what globeAlbedo last coloured is water
  vec3 globeAlbedo(vec3 d, out float rough) {
    // the land's distance taken as the mean of five lookups half a texel or so apart: a filtered distance's
    // zero bends at every texel, and from orbit those bends were kinks in the shore
    vec3 t1 = normalize(cross(d, abs(d.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0))), t2 = cross(d, t1);
    float r = ${((0.6 * (Math.PI / 2)) / FACE).toExponential(4)};   // radians: 0.6 of a texel of the land's faces, at their middles
    float l = (globeField(uGlobeLand, d) + globeField(uGlobeLand, d + t1 * r) + globeField(uGlobeLand, d - t1 * r)
      + globeField(uGlobeLand, d + t2 * r) + globeField(uGlobeLand, d - t2 * r)) / 5.0;
    // in metres: a face's texel spans 2 / FACE of its plane, which is that times m^2 of arc outward and m across, m the
    // cosine from the face's middle; m^1.5 between the two
    float m = max(max(abs(d.x), abs(d.y)), abs(d.z));
    float texel = ${((2 / FACE) * EARTH).toFixed(3)} * m * sqrt(m);
    l *= texel;
    // the region's maps over it, the wide then the near, each faded in from its edge
    float w;
    float lw = regionField(uGlobeWide, uGlobeWidePlane, uGlobeWideBox, uGlobeWideScale, d, w);
    l = mix(l, lw, w);
    texel = mix(texel, uGlobeWideScale.x, w);
    float ln = regionField(uGlobeNear, uGlobeNearPlane, uGlobeNearBox, uGlobeNearScale, d, w);
    l = mix(l, ln, w);
    texel = mix(texel, uGlobeNearScale.x, w);
    float land = smoothstep(-0.5, 0.5, l / (fwidth(l) * 0.8 + 0.03 * texel));   // the shore: a clean line, one pixel soft
    float i = globeField(uGlobeIce, d);
    float ice = smoothstep(-0.5, 0.5, i / (fwidth(i) * 0.8 + 0.03));
    // the land in its own colours (Blue Marble, May), the sea by its depth (lakes are cut out of the land map, so they are water)
    float ws;
    vec2 suv = globeSurf(d, ws);
    float h = mix(reliefMetres(texture(uGlobeRelief, d).r * 255.0), reliefMetres(texture(uGlobeSurfRelief, suv).r * 255.0), ws);
    vec3 ground = mix(texture(uGlobeColour, d).rgb, texture(uGlobeSurfColour, suv).rgb, ws);
    vec3 deep = mix(${vec3(SEA)}, ${vec3(DEEP)}, uGlobeAbove);
    // (water over ground that is above the sea is a lake: its bed is not known, and it is taken as deep)
    float bank = globeBank(d);
    // (water over ground the relief has at or above the sea is a lagoon or a lake, whose bed is not in the relief: taken
    // as the shallowest water there is, one tone, so a lagoon is not mottled by where the relief happens to dip)
    vec3 water = globeWater(bank, -h, deep);
    // (on a bank, ground the relief has above the sea that no coastline draws is a cay or a shoal awash: land, in its own colour)
    land = max(land, bank * smoothstep(0.3, 0.9, h));
    #ifdef TOON
      // drawn: the land in two greens, the sea in three blues (the deep, the shelf, the banks)
      ground = mix(${vec3(LAND)} * 0.8, ${vec3(LAND)} * 1.15, step(0.07, dot(ground, vec3(0.2126, 0.7152, 0.0722))));
      water = mix(mix(${vec3(SEA_ABOVE)}, ${vec3(SEA_ABOVE)} * vec3(1.5, 1.35, 1.2), step(h, 0.0) * step(-180.0, h)), vec3(0.09, 0.42, 0.50), bank * step(-11.0, h) * step(h, 0.5));
    #else
      // The land's relief, lit by the true Sun: a slope toward it is brighter than level ground and one away from
      // it darker, by as much as its tilt changes the light falling on it. (In the colour, so the site's ground,
      // where it takes these colours, is the same.) The slope from the height a texel away, two ways.
      float eps = mix(${(Math.PI / 2 / FACE).toExponential(4)}, ${(450 / EARTH).toExponential(4)}, ws);
      float hx = globeRelief(normalize(d + t1 * eps)), hy = globeRelief(normalize(d + t2 * eps));
      vec3 sun = uGlobeAxes * uGlobeSun;
      vec3 n = normalize(d - (t1 * (max(hx, 0.0) - max(h, 0.0)) + t2 * (max(hy, 0.0) - max(h, 0.0))) / (eps * ${EARTH.toFixed(1)}));
      float level = dot(d, sun);
      float tilted = clamp(dot(n, sun) / max(level, 0.1), 0.2, 2.0);
      ground *= mix(1.0, tilted, smoothstep(-0.02, 0.08, level));
    #endif
    vec3 c = mix(water, ground, land);
    c = mix(c, ${vec3(ICE)}, ice);
    globeSea = 1.0 - max(land, ice);
    rough = mix(mix(0.32, ${SEA_ROUGH.toFixed(3)}, uGlobeAbove), 0.95, max(land, ice));
    return c;
  }`;

/** How far the air's density falls by e, metres: for `chapman` and `transmission`. */
const SCALE = 8_000;
/**
 * The air seen from above: the limb's layered glow, the blue over the globe, the pale haze toward the horizon,
 * the red where the Sun is setting under it. Drawn on a ball round the eye (so nothing nearer than it is hazed:
 * the vehicle the eye is following) and worked out along each ray through the air by atmosphere.ts: Rayleigh's
 * scattering, the haze's, ozone's absorption, and light scattered more than once.
 */
/** Rayleigh's optical depth straight up from the sea, for 680, 550 and 440 nm: BETA times SCALE. */
const RAYLEIGH = [5.8e-6 * SCALE, 13.5e-6 * SCALE, 33.1e-6 * SCALE] as const;

/**
 * How many times the air straight up a ray toward the Sun goes through, from `height` metres up
 * with the Sun `mu` (a cosine) from the zenith, over an Earth of `radius` and air thinning by e
 * every `scale` metres: the Chapman function, by Schüler's approximation (2012). It is the plain
 * secant overhead, grows to about 38 along the horizon at sea level, and goes on growing smoothly
 * as the Sun sinks under the horizon and the ray passes through the Earth's shadow, so a twilight
 * fades and does not step.
 */
export function chapman(height: number, mu: number, radius: number, scale: number): number {
  const X = radius / scale,
    h = Math.max(height, 0) / scale;
  // the grazing value sqrt(pi x / 2), and between it and 1 overhead Schüler's form; under the horizon, the
  // function's own identity: twice the grazing value at the ray's lowest point, less the value looking up
  const c = Math.sqrt((Math.PI / 2) * (X + h));
  if (mu >= 0) return c / ((c - 1) * mu + 1);
  const x0 = Math.sqrt(1 - mu * mu) * (X + h);
  return 2 * Math.sqrt((Math.PI / 2) * x0) * Math.exp(X + h - x0) - c / (1 - (c - 1) * mu);
}

/** How much of the Sun's green light reaches the sea through the air with it `mu` from the zenith, and `aerosol` of haze straight up. */
export const transmission = (mu: number, aerosol: number, radius: number): number =>
  Math.exp(-(RAYLEIGH[1] + aerosol) * chapman(0, mu, radius, SCALE));
const AIR = /* glsl */ `
  uniform vec3 uCentre, uSun;
  uniform float uAlt, uRadius, uWeight;
  varying vec3 vDir;
  ${ATMOSPHERE_GLSL}
  void main() {
    vec3 d = normalize(vDir);
    float b = dot(d, uCentre);
    // where the ray meets the top of the air and the sea: (eye to centre)^2 - R^2 kept in its small form
    float outside = (uAlt - ATM_TOP) * (2.0 * uRadius + uAlt + ATM_TOP);
    float discA = b * b - outside;
    if (discA <= 0.0) discard;
    float t0 = max(0.0, b - sqrt(discA)), t1 = b + sqrt(discA);
    float discG = b * b - uAlt * (2.0 * uRadius + uAlt);
    if (discG > 0.0 && b - sqrt(discG) > 0.0) t1 = b - sqrt(discG);
    if (t1 <= t0) discard;
    vec3 through;
    vec3 light = atmScatter(uCentre, uRadius, d, t0, t1, uSun, through);
    // (what is behind keeps one share for all three colours: the blend has one number for it)
    gl_FragColor = vec4(light * uWeight, mix(1.0, dot(through, vec3(0.3, 0.4, 0.3)), uWeight));
  }`;

/** The square the site's own ground covers, which the globe leaves to it. */
export interface Hole {
  /** From the scene's frame to the ground's own (its mesh's inverse world matrix): the square is axis-aligned there. */
  frame: THREE.Matrix4;
  /** Half the square's side, metres: the globe is drawn only outside it. */
  half: number;
}

/** A cube map of one channel from the six faces tools/globe.mjs writes. */
async function loadCube(name: string): Promise<THREE.CubeTexture> {
  const faces = await Promise.all(
    FACES.map(async (f) => {
      const blob = await (await fetch(`${import.meta.env.BASE_URL}globe/${name}.${f}.png`)).blob();
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const g = canvas.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(bitmap, 0, 0);
      const rgba = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const red = new Uint8Array(bitmap.width * bitmap.height);
      for (let i = 0; i < red.length; i++) red[i] = rgba[i * 4]!;
      return new THREE.DataTexture(red, bitmap.width, bitmap.height, THREE.RedFormat);
    }),
  );
  return cube(faces);
}

function cube(faces: THREE.DataTexture[]): THREE.CubeTexture {
  const texture = new THREE.CubeTexture(faces as unknown as HTMLImageElement[]);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/** A cube of one value everywhere (by default 0, which the land's map reads as sea), or of one colour, until the maps arrive. */
function empty(value: number | THREE.Color = 0, colorSpace: THREE.ColorSpace = THREE.NoColorSpace): THREE.CubeTexture {
  if (typeof value === 'number') return cube(FACES.map(() => new THREE.DataTexture(new Uint8Array([value]), 1, 1, THREE.RedFormat)));
  const rgba = new Uint8Array([Math.round(value.r * 255), Math.round(value.g * 255), Math.round(value.b * 255), 255]);
  const texture = cube(FACES.map(() => new THREE.DataTexture(rgba, 1, 1, THREE.RGBAFormat)));
  texture.format = THREE.RGBAFormat;
  texture.colorSpace = colorSpace;
  return texture;
}
const blank2D = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
blank2D.needsUpdate = true;

/** Whether this is a small screen: the globe's colours and relief are then loaded at half their size (a quarter of the memory). */
const small = (): boolean =>
  typeof screen !== 'undefined' && Math.max(screen.width, screen.height) * (globalThis.devicePixelRatio ?? 1) < 1300;

/** A picture from public/globe/ as the browser decodes it, untouched; at half size on a small screen. */
async function picture(file: string): Promise<ImageBitmap> {
  const blob = await (await fetch(`${import.meta.env.BASE_URL}globe/${file}`)).blob();
  const options: ImageBitmapOptions = { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' };
  const whole = await createImageBitmap(blob, options);
  if (!small()) return whole;
  const half = await createImageBitmap(whole, {
    ...options,
    resizeWidth: whole.width >> 1,
    resizeHeight: whole.height >> 1,
    resizeQuality: 'high',
  });
  whole.close();
  return half;
}

/** A cube map of colours from the six faces tools/globe-surface.mjs writes (sRGB). */
async function loadColourCube(name: string): Promise<THREE.CubeTexture> {
  const faces = await Promise.all(FACES.map((f) => picture(`${name}.${f}.jpg`)));
  const texture = new THREE.CubeTexture(faces as unknown as HTMLImageElement[]);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/** One of a surface region's maps as a texture: its relief (one channel, as it is) or its colours (sRGB). */
async function loadSurface(file: string, colour: boolean): Promise<THREE.Texture> {
  const texture = new THREE.Texture((await picture(file)) as unknown as HTMLImageElement);
  texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** One of a region's maps as tools/globe-region.mjs describes it (public/globe/<region>.json). */
interface RegionLevel {
  name: 'near' | 'wide';
  file: string;
  /** The middle of its plane: latitude and longitude, degrees. */
  centre: [number, number];
  /** What it covers on the plane: x0, x1, y0, y1. */
  box: [number, number, number, number];
  width: number;
  height: number;
  /** Metres a texel. */
  metres: number;
  /** How far in from its edge it is faded in, plane units. */
  fade: number;
}

/** The uniforms a region's map is drawn by, empty (weighed at nothing) until it arrives. */
function regionUniforms(prefix: 'Near' | 'Wide'): Record<string, THREE.IUniform> {
  const blank = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat);
  blank.needsUpdate = true;
  return {
    [`uGlobe${prefix}`]: { value: blank },
    [`uGlobe${prefix}Plane`]: { value: new THREE.Matrix3() },
    [`uGlobe${prefix}Box`]: { value: new THREE.Vector4(0, 0, 1, 1) },
    [`uGlobe${prefix}Scale`]: { value: new THREE.Vector2(1, 0) },
  };
}

/** A region's map as a texture of one channel: the PNG decoded by the browser and uploaded as it is. */
async function loadRegion(level: RegionLevel): Promise<THREE.Texture> {
  const blob = await (await fetch(`${import.meta.env.BASE_URL}globe/${level.file}`)).blob();
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' });
  const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8; // seen edge-on from low down; three keeps it to what the GPU allows
  texture.needsUpdate = true;
  return texture;
}

export class Globe {
  /** Everything the globe draws: the surface, and the air seen from above (`air`). */
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  /** The air seen from above (AIR). */
  readonly air: THREE.Mesh;
  /** How much of the air is drawn: 0 at the ground, where the sky (backdrops.ts) is the air, to 1 above it. Set by the setting. */
  thin = 0;
  private readonly airUniforms: Record<string, THREE.IUniform>;
  /** Toward the true Sun, in the scene's frame: where it is down on the globe, the night side is dark. */
  readonly sun = new THREE.Vector3(0, 1, 0);
  private readonly site: Site;
  private readonly seaLevel: number;
  /** The site's origin in ECEF, and its axes. */
  private readonly origin: Vec3;
  private readonly axes: [Vec3, Vec3, Vec3];
  /** The sphere that fits the sea round the site: its radius. */
  private readonly radius: number;
  private readonly positions: THREE.BufferAttribute;
  private readonly normals: THREE.BufferAttribute;
  private readonly earth: THREE.BufferAttribute;
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** What the mesh was made for: the eye's point under it and its height. */
  private madeAt: Vec3 | null = null;
  private madeHeight = 0;
  /** What follows from where the eye is, kept while it stays there: it is asked for several times a frame (`eyed`). */
  private readonly eye = {
    x: Number.NaN,
    y: Number.NaN,
    z: Number.NaN,
    ecef: [0, 0, 0] as Vec3,
    height: 0,
    latitude: 0,
    normal: [0, 0, 1] as Vec3,
    under: [0, 0, 0] as Vec3,
  };
  private arrived = false;
  private readonly hole: Hole | null;
  /** Whether the site's air has cumulus (air.ts), whose shadows fall on the globe too. */
  private readonly clouds: Clouds | null;

  /**
   * `seaLevel`: the sea's height above the ellipsoid at the site (SiteDef.seaLevel); `hole`: the site's own ground;
   * `region`: the name of the site's region's maps (RegionDef.name), if it has them.
   */
  constructor(
    site: Site,
    seaLevel: number,
    hole: Hole | null,
    haze: { scale: number; clouds?: unknown } | null,
    region: string | null = null,
  ) {
    this.site = site;
    this.seaLevel = seaLevel;
    this.hole = hole;
    this.clouds = (haze?.clouds as Clouds | undefined) ?? null;
    onWeather(() => {
      this.arrived = true;
    });
    this.origin = geodeticToEcef(site);
    this.axes = [siteToEcefDirection(site, [1, 0, 0]), siteToEcefDirection(site, [0, 1, 0]), siteToEcefDirection(site, [0, 0, 1])];
    this.radius = gaussianRadius(site.latitude);

    const vertices = (RINGS + 1) * (SPOKES + 1);
    const geometry = new THREE.BufferGeometry();
    this.positions = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.normals = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.earth = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('normal', this.normals);
    geometry.setAttribute('aEarth', this.earth);
    const index: number[] = [];
    const at = (i: number, j: number) => i * (SPOKES + 1) + j;
    for (let i = 0; i < RINGS; i++)
      for (let j = 0; j < SPOKES; j++) index.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1));
    geometry.setIndex(index);

    const o = this.origin;
    const m = this.axes;
    this.uniforms = {
      uGlobeLand: { value: empty() },
      uGlobeIce: { value: empty() },
      uGlobeSun: { value: this.sun },
      // from the scene's frame to ECEF: the site's origin, and its axes as the columns of a matrix
      uGlobeOrigin: { value: new THREE.Vector3(o[0], o[1], o[2]) },
      uGlobeAxes: { value: new THREE.Matrix3().set(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]) },
      uGlobeSeaLevel: { value: seaLevel },
      uGlobeHole: { value: hole ? hole.frame : new THREE.Matrix4() },
      uGlobeHalf: { value: hole ? hole.half : -1 },
      uGlobeHaze: { value: haze?.scale ?? 1400 },
      uGlobeAbove: { value: 0 },
      ...regionUniforms('Near'),
      ...regionUniforms('Wide'),
      ...weatherUniforms,
      ...atmosphereUniforms,
      // the relief and the land's colours (tools/globe-surface.mjs): until they arrive, a deep sea and the one green
      uGlobeRelief: { value: empty(RELIEF.sea - 50) },
      uGlobeColour: { value: empty(LAND.clone().convertLinearToSRGB(), THREE.SRGBColorSpace) },
      uGlobeSurfRelief: { value: blank2D },
      uGlobeSurfColour: { value: blank2D },
      uGlobeSurfPlane: { value: new THREE.Matrix3() },
      uGlobeSurfBox: { value: new THREE.Vector4(0, 0, 1, 1) },
      uGlobeSurfFade: { value: 0 },
      uGlobeBanks: { value: Array.from({ length: BANKS }, () => new THREE.Vector4(0, 0, 1, 2)) },
    };

    const material = new THREE.MeshStandardMaterial({ name: 'globe', roughness: 1, metalness: 0 });
    this.shade(material);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'globe';
    this.mesh.frustumCulled = false; // made round the eye: something of it is always in view when it is shown
    this.mesh.raycast = () => {}; // nothing to pick: what is clicked is the place, not the planet
    this.mesh.visible = false;
    this.mesh.renderOrder = 2; // after the site's ground (land.ts: 1), so what that covers is not shaded
    this.group.add(this.mesh);

    this.airUniforms = {
      uCentre: { value: new THREE.Vector3() },
      uSun: { value: this.sun },
      uAlt: { value: 0 },
      uRadius: { value: this.radius },
      uWeight: { value: 0 },
      ...atmosphereUniforms,
    };
    this.air = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 32),
      new THREE.ShaderMaterial({
        name: 'air',
        uniforms: this.airUniforms,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: AIR,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        // what is behind keeps what the air lets through (alpha), and the air's own light is added
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
      }),
    );
    this.air.name = 'air';
    this.air.frustumCulled = false;
    this.air.raycast = () => {};
    this.air.renderOrder = 10;
    this.air.visible = false;
    this.group.add(this.air);

    void Promise.all([loadCube('land'), loadCube('ice')]).then(([land, ice]) => {
      this.uniforms.uGlobeLand!.value = land;
      this.uniforms.uGlobeIce!.value = ice;
      this.arrived = true;
    });
    void Promise.all([loadCube('relief'), loadColourCube('colour')]).then(([relief, colour]) => {
      this.uniforms.uGlobeRelief!.value = relief;
      this.uniforms.uGlobeColour!.value = colour;
      this.arrived = true;
    });
    if (region) void this.loadRegion(region);
    if (region) void this.loadSurface(region);
  }

  /** The site's region's relief and colours (tools/globe-surface.mjs), finer than the globe's: drawn once they have arrived. */
  private async loadSurface(name: string): Promise<void> {
    const res = await fetch(`${import.meta.env.BASE_URL}globe/${name}.surface.json`);
    if (!res.ok) return;
    const meta = (await res.json()) as {
      centre: [number, number];
      box: [number, number, number, number];
      relief: { file: string };
      colour: { file: string };
      fade: number;
      banks?: [number, number, number][];
    };
    const [relief, colour] = await Promise.all([loadSurface(meta.relief.file, false), loadSurface(meta.colour.file, true)]);
    const { east: e, north: n, centre: c } = planeAt(meta.centre[0], meta.centre[1]);
    const u = this.uniforms;
    u.uGlobeSurfRelief!.value = relief;
    u.uGlobeSurfColour!.value = colour;
    (u.uGlobeSurfPlane!.value as THREE.Matrix3).set(e[0], e[1], e[2], n[0], n[1], n[2], c[0], c[1], c[2]);
    const [x0, x1, y0, y1] = meta.box;
    (u.uGlobeSurfBox!.value as THREE.Vector4).set(x0, y0, x1, y1);
    u.uGlobeSurfFade!.value = meta.fade;
    (meta.banks ?? []).slice(0, BANKS).forEach(([latitude, longitude, km], i) => {
      const dir = surfaceDirection(latitude, longitude);
      (u.uGlobeBanks!.value as THREE.Vector4[])[i]!.set(dir[0], dir[1], dir[2], Math.cos((km * 1000) / EARTH));
    });
    this.arrived = true;
  }

  /** The site's region's maps: each drawn once it has arrived. */
  private async loadRegion(name: string): Promise<void> {
    const meta = (await (await fetch(`${import.meta.env.BASE_URL}globe/${name}.json`)).json()) as { spread: number; levels: RegionLevel[] };
    if (meta.spread !== SPREAD) throw new Error(`globe/${name}.json: distances kept to ${meta.spread} texels, not ${SPREAD}`);
    await Promise.all(
      meta.levels.map(async (level) => {
        const texture = await loadRegion(level);
        const prefix = level.name === 'near' ? 'Near' : 'Wide';
        const { east: e, north: n, centre: c } = planeAt(level.centre[0], level.centre[1]);
        const u = this.uniforms;
        u[`uGlobe${prefix}`]!.value = texture;
        (u[`uGlobe${prefix}Plane`]!.value as THREE.Matrix3).set(e[0], e[1], e[2], n[0], n[1], n[2], c[0], c[1], c[2]);
        const [x0, x1, y0, y1] = level.box;
        (u[`uGlobe${prefix}Box`]!.value as THREE.Vector4).set(x0, y0, x1, y1);
        (u[`uGlobe${prefix}Scale`]!.value as THREE.Vector2).set(level.metres, level.fade);
        this.arrived = true;
      }),
    );
  }

  /** GLSL and uniforms for the site's ground to hand over to the globe across its last stretch (land.ts: Land.meet). */
  get beyond(): Beyond {
    const y0 = this.seaLevel - this.site.height; // the sea under the site's origin, in its frame
    const R = this.radius.toFixed(1);
    return {
      uniforms: this.uniforms,
      // the sea's height under a point of the scene (its x and z), on the sphere that fits it round the site
      vertex: /* glsl */ `
        float beyondHeight(vec3 p) {
          float r = length(p.xz);
          return ${y0.toFixed(3)} - r * r / (${R} + sqrt(${R} * ${R} - r * r));
        }`,
      fragment: /* glsl */ `
        uniform vec3 uGlobeOrigin, uGlobeSun;
        uniform mat3 uGlobeAxes;
        ${COLOUR}
        vec3 beyondAlbedo(vec3 p, out float rough) { return globeAlbedo(normalize(uGlobeOrigin + uGlobeAxes * p), rough); }`,
    };
  }

  /** Where the hole for the site's ground ends, as a distance from its middle in its frame: the ground has handed over by then. */
  get holeEdge(): number {
    return this.hole?.half ?? 0;
  }

  /** The eye's height above the sea, metres (geodetic, as the simulator measures it). */
  altitude(eye: THREE.Vector3): number {
    return this.eyed(eye).height - this.seaLevel;
  }

  /** The eye in ECEF, its height and latitude, the ellipsoid's normal there and the point of the sea under it: worked out once for each place it is. */
  private eyed(eye: THREE.Vector3): Globe['eye'] {
    const c = this.eye;
    if (eye.x !== c.x || eye.y !== c.y || eye.z !== c.z) {
      c.x = eye.x;
      c.y = eye.y;
      c.z = eye.z;
      c.ecef = this.toEcef(eye);
      const g = ecefToGeodetic(c.ecef);
      c.height = g.height;
      c.latitude = g.latitude;
      c.normal = ellipsoidNormal(c.ecef);
      c.under = seaPoint(c.ecef, this.seaLevel);
    }
    return c;
  }

  /** How far the eye is inside the hole the site's ground fills (to its nearest edge), metres; 0 outside it. Nothing of the globe nearer than this is drawn. */
  private inside(eye: THREE.Vector3): number {
    if (!this.hole) return 0;
    const m = this.hole.frame.elements;
    const x = m[0]! * eye.x + m[4]! * eye.y + m[8]! * eye.z + m[12]!,
      z = m[2]! * eye.x + m[6]! * eye.y + m[10]! * eye.z + m[14]!;
    return Math.max(0, this.hole.half - Math.max(Math.abs(x), Math.abs(z)));
  }

  /** Straight up from the sea under the eye, in the scene's frame. */
  up(eye: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const n = this.eyed(eye).normal;
    const [ex, ey, ez] = this.axes;
    return out.set(dot(ex, n), dot(ey, n), dot(ez, n));
  }

  /** How far off the furthest part of the globe in view is: its horizon, metres; 0 while it is not drawn. */
  reach(eye: THREE.Vector3): number {
    return this.mesh.visible ? 1.05 * horizonDistance(this.altitude(eye), this.radius) + 1000 : 0;
  }

  /** Where the eye is (the scene's frame): the mesh is made round it. True if what is drawn changed. */
  attend(eye: THREE.Vector3): boolean {
    let changed = false;
    if (this.arrived) {
      this.arrived = false;
      changed = true;
    }
    const height = Math.max(0, this.altitude(eye));
    // the globe is all under the site's ground while the horizon is nearer than its edge
    const shown = !this.hole || Math.hypot(eye.x, eye.z) + horizonDistance(height, this.radius) > 0.9 * this.hole.half;
    if (shown !== this.mesh.visible) {
      this.mesh.visible = shown;
      changed = true;
    }
    if (this.uniforms.uGlobeAbove!.value !== this.thin) {
      this.uniforms.uGlobeAbove!.value = this.thin;
      changed = true;
    }
    // the air: a ball round the eye, inside the far plane and outside whatever is being followed
    const thin = this.thin > 0.01;
    if (thin !== this.air.visible) {
      this.air.visible = thin;
      changed = true;
    }
    if (thin) {
      const u = this.airUniforms;
      // the sphere that fits the sea under the eye: its centre, from the eye
      const sphere = gaussianRadius(this.eyed(eye).latitude);
      const under = this.eyed(eye).under;
      const centre = this.toSite(sub(under, scale(ellipsoidNormal(under), sphere)));
      u.uCentre!.value.set(centre[0] - eye.x, centre[1] - eye.y, centre[2] - eye.z);
      u.uRadius!.value = sphere;
      u.uAlt!.value = height;
      if (u.uWeight!.value !== this.thin) changed = true;
      u.uWeight!.value = this.thin;
      this.air.position.copy(eye);
      this.air.scale.setScalar(THREE.MathUtils.clamp(0.1 * height, 300, 30_000));
    }
    if (!shown) return changed;
    const under = this.eyed(eye).under;
    const made = this.madeAt;
    const h = Math.max(height, 30);
    // (over the site's own ground the eye may go further before the mesh is made again: what would change is under that ground)
    if (
      made &&
      length(sub(under, made)) < remakeAfter(this.madeHeight, this.inside(eye), this.radius) &&
      h > 0.8 * this.madeHeight &&
      h < 1.25 * this.madeHeight
    )
      return changed;
    this.make(under, h);
    return true;
  }

  private toEcef(p: THREE.Vector3): Vec3 {
    const [ex, ey, ez] = this.axes;
    return add(this.origin, add(add(scale(ex, p.x), scale(ey, p.y)), scale(ez, p.z)));
  }

  private toSite(q: Vec3): Vec3 {
    const d = sub(q, this.origin);
    return [dot(this.axes[0], d), dot(this.axes[1], d), dot(this.axes[2], d)];
  }

  /** Make the mesh round the point of the sea `under` the eye, which is `height` above it. */
  private make(under: Vec3, height: number): void {
    this.madeAt = under;
    this.madeHeight = height;
    const anchor = fillGlobe(
      under,
      height,
      this.radius,
      this.seaLevel,
      this.origin,
      this.axes,
      this.positions.array as Float32Array,
      this.normals.array as Float32Array,
      this.earth.array as Float32Array,
    );
    this.mesh.position.set(anchor[0], anchor[1], anchor[2]);
    this.positions.needsUpdate = true;
    this.normals.needsUpdate = true;
    this.earth.needsUpdate = true;
    this.mesh.updateMatrixWorld();
  }

  private shade(material: THREE.MeshStandardMaterial): void {
    const uniforms = this.uniforms;
    const c = this.clouds;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          attribute vec3 aEarth;
          varying vec3 vEarth;
          varying vec3 vGlobeSite;
          varying vec3 vGlobeNormal;`,
        )
        .replace(
          '#include <fog_vertex>',
          /* glsl */ `#include <fog_vertex>
          vEarth = aEarth;
          vGlobeSite = (modelMatrix * vec4(transformed, 1.0)).xyz + uOrigin;
          vGlobeNormal = normal;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          varying vec3 vEarth;
          varying vec3 vGlobeSite;
          varying vec3 vGlobeNormal;
          uniform vec3 uGlobeSun, uGlobeOrigin;
          uniform mat3 uGlobeAxes;
          uniform mat4 uGlobeHole;
          uniform float uGlobeHalf, uGlobeSeaLevel, uGlobeHaze;
          ${ATMOSPHERE_GLSL}
          float globeRough;
          ${COLOUR}
          // height above the sea of a point of the scene, metres: radially over the ellipsoid, which at these heights is the same as along its normal
          float globeHeight(vec3 p) {
            vec3 q = uGlobeOrigin + uGlobeAxes * p;
            float s = sqrt(dot(q.xy, q.xy) / ${(6378137 ** 2).toExponential(10)} + q.z * q.z / ${(6356752.314245 ** 2).toExponential(10)});
            return length(q) * (1.0 - 1.0 / s) - uGlobeSeaLevel;
          }`,
        )
        .replace(
          '#include <fog_pars_fragment>',
          /* glsl */ `#include <fog_pars_fragment>
          ${
            c
              ? /* glsl */ `#ifdef USE_FOG
          ${WEATHER_GLSL}
          ${cloudCutGlsl()}
          ${cumulusBiasGlsl('air_')}
          ${sheetsGlsl('air_')}
          // How much of the Sun's light reaches a point of the globe through the clouds over it: the cumulus as the
          // weather has them there (clouds.ts draws the same field: farCumulus), the middle deck and the cirrus, each
          // read where the ray toward the Sun crosses its height. \`mu\`: the Sun's height there, as a cosine from
          // straight up; \`fp\`: metres a pixel. Where a cloud's shadow is under a pixel the cover dims it evenly.
          float globeShade(vec3 world, vec3 sun, float mu, float fp) {
            if (mu <= 0.02) return 1.0;
            vec2 lean = sun.xz / max(mu, 0.08);
            vec2 p = world.xz + lean * ${(c.height + 0.5 * c.depth).toFixed(1)};
            vec3 w;
            float streets;
            float bias = cumulusBias((p - uCloudDrift.xz) / ${c.size.toFixed(1)}, p, w, streets);
            float soft = 0.25 * fp / ${c.size.toFixed(1)};
            float dark = smoothstep(${(cloudMiddle(c) - 0.02).toFixed(3)} - soft, ${(cloudMiddle(c) + 0.03).toFixed(3)} + soft, cloudNoise(p - uCloudDrift.xz) + bias);
            float fine = 1.0 - smoothstep(${(2 * c.size).toFixed(1)}, ${(8 * c.size).toFixed(1)}, fp);
            float gather = air_noise2((p - uCloudDrift.xz) / ${c.size.toFixed(1)} * 0.23 + vec2(1.7, 5.3), 94) - 0.5;
            float even = clamp(w.r * exp(fine * (5.0 * gather + 20.0 * streets)), 0.0, 1.0);
            float shade = 1.0 - 0.8 * mix(dark, even, smoothstep(${(0.08 * c.size).toFixed(1)}, ${(0.5 * c.size).toFixed(1)}, fp));
            vec2 pd = world.xz + lean * ${DECK_HEIGHT.toFixed(1)};
            shade *= 1.0 - 0.7 * deckAt(pd, fp, deckCoverAt(weatherAt(pd), pd));
            vec2 pc = world.xz + lean * ${CIRRUS_HEIGHT.toFixed(1)};
            return shade * (1.0 - 0.5 * cirrusAt(pc, fp, weatherAt(pc).g));
          }
          #endif`
              : ''
          }`,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          // the site's own ground is drawn there (but not on the far side of the Earth, whose x and z are the same)
          if (uGlobeHalf > 0.0 && vGlobeSite.y > -3000.0) {
            vec2 q = (uGlobeHole * vec4(vGlobeSite, 1.0)).xz;
            if (max(abs(q.x), abs(q.y)) < uGlobeHalf) discard;
          }
          diffuseColor.rgb = globeAlbedo(normalize(vEarth), globeRough);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          /* glsl */ `#include <roughnessmap_fragment>
          roughnessFactor = globeRough;`,
        )
        .replace(
          '#include <lights_physical_fragment>',
          /* glsl */ `#include <lights_physical_fragment>
          #ifndef TOON
            // water sends back 2 % of what meets it squarely, not a painted surface's 4
            material.specularColor = mix(material.specularColor, vec3(0.02), globeSea * uGlobeAbove);
          #endif`,
        )
        .replace(
          '#include <lights_fragment_end>',
          /* glsl */ `#include <lights_fragment_end>
          {
            // where the Sun is down here the sky gives no light (the scene's sky is the site's)
            float day = smoothstep(-0.1, 0.06, dot(normalize(vGlobeNormal), uGlobeSun));
            reflectedLight.indirectDiffuse *= mix(0.02, 1.0, day);
            reflectedLight.indirectSpecular *= mix(0.02, 1.0, day);
          }
          #if NUM_DIR_LIGHTS > 0
          {
            // away from the site, the true Sun through the air over each place in place of the scene's light
            float away = uGlobeHalf > 0.0 ? smoothstep(uGlobeHalf, 3.0 * uGlobeHalf, length(vGlobeSite)) : 1.0;
            // the cumulus's shadows (air.ts: cloudShade), on the scene's light as the shared chunk has already put
            // them, and on the Sun's; worked out here, outside the branch, so the pixel's footprint is measured evenly
            float sceneShade = 1.0, sunShade = 1.0;
            ${
              this.clouds
                ? `#ifdef USE_FOG
            float footprint = length(fwidth(vFogWorld.xz));
            sceneShade = cloudShade(vFogWorld, transpose(mat3(viewMatrix)) * directionalLights[0].direction, footprint);
            sunShade = globeShade(vFogWorld, uGlobeSun, dot(normalize(vGlobeNormal), uGlobeSun), footprint);
            #endif`
                : ''
            }
            if (away > 0.0) {
              ReflectedLight scene = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
              IncidentLight light;
              getDirectionalLightInfo(directionalLights[0], light);
              RE_Direct(light, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, scene);
              ReflectedLight sun = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
              float mu = dot(normalize(vGlobeNormal), uGlobeSun);
              light.direction = normalize((viewMatrix * vec4(uGlobeSun, 0.0)).xyz);
              light.color = uAtmSunLight * atmSunAt(0.0, mu);
              light.visible = true;
              RE_Direct(light, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, sun);
              reflectedLight.directDiffuse += away * (sun.directDiffuse * sunShade - scene.directDiffuse * sceneShade);
              reflectedLight.directSpecular += away * (sun.directSpecular * sunShade - scene.directSpecular * sceneShade);
            }
          }
          #endif`,
        )
        .replace(
          '#include <fog_fragment>',
          /* glsl */ `
          #if defined( USE_FOG ) && defined( FOG_EXP2 )
          {
            // the haze (air.ts), its density falling by e every uGlobeHaze metres of height over the curved sea:
            // the ray in six pieces, each with its height taken as changing evenly along it
            vec3 eye = cameraPosition + uOrigin;
            float len = distance(eye, vGlobeSite) / 6.0;
            float tau = 0.0;
            float a = max(globeHeight(eye), 0.0) / uGlobeHaze;
            for (int k = 1; k <= 6; k++) {
              // (the end is on the sea: its height is 0, not what the flat triangle under it says)
              float b = k == 6 ? 0.0 : max(globeHeight(mix(eye, vGlobeSite, float(k) / 6.0)), 0.0) / uGlobeHaze;
              tau += len * (abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a));
              a = b;
            }
            // The scene's haze colour is the haze seen along the ground, warmed by the long path through it. Seen from
            // above (as the sky gives way to the air, uGlobeAbove) the haze is lit from over it: as bright, not warm, a
            // little blue; and over the night side, unlit. Without this the daytime limb had a brown line along it.
            // And far dimmer: from the ground the haze is seen against the light, lit by what it scatters forward along a
            // long path; from above it sends back up only what it scatters backward, a third as much or less (aerosol
            // phase functions; estimated), so the sea from orbit is the dark blue it is under a veil, not a pale grey.
            vec3 haze = hazeSeen();   // (air.ts: hazeAboveUniform, which is uGlobeAbove)
            haze *= mix(1.0, smoothstep(-0.15, 0.1, dot(normalize(vGlobeNormal), uGlobeSun)), uGlobeAbove);
            // (and less of it the further the eye is out of the air: from above, the haze is the air's own, drawn by the ball)
            gl_FragColor.rgb = mix(gl_FragColor.rgb, haze, (1.0 - exp(-fogDensity * tau)) * (1.0 - uGlobeAbove));
          }
          #endif`,
        );
    };
    material.customProgramCacheKey = () => 'globe';
  }
}
