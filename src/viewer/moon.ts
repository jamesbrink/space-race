import * as THREE from 'three';
import type { Vec3 } from '../world/frames.ts';
import { MOON_RADIUS } from '../world/moon.ts';
import { CRATERS, EARTHSHINE, groundGlsl, LIGHT_GLSL } from './moonground.ts';
import { MoonRocks } from './moonrocks.ts';
import { type ApronGround, SiteGround, type SiteMeta } from './moonsite.ts';

/**
 * The Moon as a body: its real ground, lit by the real Sun, seen from 40 m up to 100,000 km (the front page's, under its
 * camera: app/front/scene.ts). It knows nothing of the page that shows it: it is handed the folder its bake is in, the
 * Sun's light, the tier, and each frame the eye, the Sun and the Earth in the Moon's own frame.
 *
 * **The ground** is the laser altimeter's heights and the wide-angle camera's colour (NASA's CGI
 * Moon Kit; tools/front-moon.mjs bakes them and says how each byte is read): the relief of the
 * whole Moon at 5 km a texel, of the limb the camera looks across at 3.7 km, and of the ground
 * behind that limb at 481 m, each on a plane touching the Moon there and each faded in over
 * the coarser one under it from its edge, so there is no line where one ends.
 *
 * **Below that it is made** (moonground.ts): the altimeter's map ends at 481 m, and from 40 m a
 * pixel is a hand's breadth. On the finest map's ground every pixel also has the craters under
 * two kilometres, in the numbers the Moon has of each size, each with its slope, the shadow in
 * its bowl and the part its near rim hides, and the soil's grain; and round where the camera
 * starts there are blocks lying on it, real shapes with real shadows (moonrocks.ts). All of it is
 * estimated, fixed to the ground and the same on every visit, and none of it is switched on or
 * off: a crater is drawn while it is a few pixels tall and fades out below that, so as the
 * camera goes out it is the altimeter's ground that is left.
 *
 * **Its shape** is two meshes. One is the whole sphere, made round the middle of the finest map:
 * rings about that point that are 500 m apart out to 125 km and then widen by a 250th of their
 * distance each (1,300 rings, 720 round: 1.9 million triangles; half of each on the lighter
 * tier), so the ground is no coarser anywhere than the distance it is seen from needs. The
 * camera looks across the rings, toward the limb they are about, so it is the rings that are
 * close: seen along itself, ground whose shape is coarse that way is a sea of ridges. Each
 * vertex is raised by the height the maps give its direction, in the vertex shader, so the
 * horizon's hills and the far rims of craters are real silhouettes; the light on every pixel is
 * from the maps' slopes, which are finer than the mesh. The other is the ground within 30 km of
 * where the camera starts (the apron: rings about the site a fiftieth further each, from 2 m),
 * whose heights are the altimeter's read whole and in doubles (moonsite.ts), placed from the
 * site and not from the Moon's centre, so that from 40 m the ground is where it is to a
 * centimetre; the sphere is not drawn where the apron is, and the apron's outer ring takes the
 * sphere's own heights so that the two meet.
 *
 * **Its light.** The Sun's direction is the ephemeris's. How the ground sends light back is the
 * Moon's own way, not a matte ball's (moonground.ts, `LIGHT_GLSL`): Lommel and Seeliger's law
 * with the Moon's phase curve and its surge at opposition, and as bright overall as the Moon
 * is: the colour map is scaled so that its mean is the Moon's albedo, 0.12. So beside the Earth
 * it is as dark as it is: asphalt beside cloud. In a shadow there is what the sunlit ground about
 * it throws in, a few per cent, and the Earth's light, which is a twelve-thousandth of the
 * Sun's and is there without being seen.
 *
 * **Its shadows.** A slope turned from the Sun is dark by its own slope everywhere. On the finest
 * map the ground also casts shadows on itself: the map holds, for each texel, how high the
 * ground stands toward the Sun as it stood at the page's instant (tools/front-moon.mjs), and a
 * texel whose Sun is lower than that is in shadow, with an edge as soft as the Sun is wide. That
 * is right while the Sun keeps its bearing; as the page's clock runs on it is let go (gone when
 * the Sun has moved 8 degrees, sixteen hours of the world), by when the camera is far out and a
 * shadow is under a pixel. The made craters' shadows and the blocks' follow the Sun as it is.
 *
 * What is simplified: beyond the finest map nothing casts a shadow on its neighbour; below 481 m
 * nothing is the Moon's own (the craters, the grain and the blocks are made, and the made craters
 * are light and shadow on the pixel: they have no depth, lift no horizon, and do not shadow each
 * other or the blocks); the colour is the camera's mosaic, which has the light of its own Sun in
 * it (a crater's wall is brighter there than its floor) and is 1.1 km a texel under the camera,
 * so the ground at the start is one grey; the apron's ground between the altimeter's points
 * (481 m apart) is a smooth curve through them.
 */

/** A relief map on a plane touching the Moon, as tools/front-moon.mjs describes it (public/front/moon.json, public/lunar/<site>.moon.json). */
export interface PlaneMeta {
  file: string;
  /** Its colour, where it has its own (the finest). */
  colour?: string;
  /** A texel's size at its middle, metres. */
  metres: number;
  /** Its heights, where they are kept apart from its slopes (the finest), with their texel's size; and the angle its cast shadows' byte spans, radians. */
  height?: string;
  heightMetres?: number;
  horizon?: number;
  centre: [number, number, number];
  east: [number, number, number];
  north: [number, number, number];
  /** Half its breadth on the plane (the tangent of the angle from its middle). */
  half: number;
  /** The range its heights' bytes span, metres above the Moon's reference sphere. */
  low: number;
  high: number;
}
export interface MoonMeta {
  colour: { file: string; mean: number };
  whole: { file: string; width: number; low: number; high: number };
  wide: PlaneMeta;
  near: PlaneMeta;
  /** The ground round where the camera starts, whole (moonsite.ts). */
  site: SiteMeta;
  /** What it was baked for: the front page's instant and limb, and where the Sun then stood over the Moon (a unit vector in its frame). */
  for: { instant: string; limb: number; site: [number, number]; sun: [number, number, number] };
}

/** The Moon's normal albedo, seen whole: the colour map's mean is scaled to it. */
const ALBEDO = 0.12;
/** How far in from a plane's edge its map is faded in, as a share of its half breadth. */
const FADE = 0.2;
/** The apron: how far from the site it reaches, metres; its first ring; how much further each ring is than the last; how many spokes. */
const APRON = { reach: 30_000, first: 2, grow: 1.02, spokes: 384 };
/** The camera's height over the site above which no block is in any picture (they are all within 6 km of the point under it), metres. */
const ROCKS_BELOW = 2500;

/** GLSL: where a direction falls on a plane's map and how much it is to be believed there (w), and a map's slope and height as numbers. */
const MAPS = /* glsl */ `
  uniform sampler2D tWhole, tWide, tNear, tNearHeight;
  uniform mat3 uWide, uNear;     // rows: a plane's east, north and middle
  uniform vec4 uRange[3];        // each map's lowest height and its span, metres (x, y), its plane's half breadth (z) and a texel's size, metres (w): whole, wide, near
  vec2 onPlane(mat3 plane, float half_, vec3 d, out float w) {
    vec3 q = plane * d;
    vec2 p = q.xy / max(q.z, 1e-3);
    float edge = half_ - max(abs(p.x), abs(p.y));
    w = q.z > 0.2 ? smoothstep(0.0, ${FADE.toFixed(2)} * half_, edge) : 0.0;
    return clamp(vec2(0.5 + 0.5 * p.x / half_, 0.5 - 0.5 * p.y / half_), 0.0, 1.0);
  }
  vec2 onWhole(vec3 d) { return vec2(atan(d.y, d.x) / 6.2831853 + 0.5, 0.5 - asin(clamp(d.z, -1.0, 1.0)) / 3.14159265); }
  // a slope from its byte: 128 + 127 sign(s) sqrt(|s|)
  vec2 slopes(vec2 v) { vec2 s = (v * 255.0 - 128.0) / 127.0; return sign(s) * s * s; }`;

/** GLSL: a direction's height above the reference sphere, metres, as the maps have it for a vertex `apart` metres from its neighbours. */
const RELIEF = /* glsl */ `
  float relief(vec3 dir, float apart) {
    float wWide, wNear;
    vec2 uvWide = onPlane(uWide, uRange[1].z, dir, wWide), uvNear = onPlane(uNear, uRange[2].z, dir, wNear);
    // Each height is the ground's mean over the vertex's own share of it (the map's level whose texel is as far across
    // as the vertices are apart): read at the map's finest, a vertex 3 km from the next took one 481 m texel's height,
    // and the ground seen along itself was a sea of spikes.
    float h = uRange[0].x + uRange[0].y * textureLod(tWhole, onWhole(dir), log2(max(apart / uRange[0].w, 1.0))).b;
    if (wWide > 0.0) h = mix(h, uRange[1].x + uRange[1].y * textureLod(tWide, uvWide, log2(max(apart / uRange[1].w, 1.0))).b, wWide);
    if (wNear > 0.0) h = mix(h, uRange[2].x + uRange[2].y * textureLod(tNearHeight, uvNear, log2(max(apart / uRange[2].w, 1.0))).r, wNear);
    return h;
  }`;

/** The sphere's vertices: each from the Moon's centre, by its direction and the maps' height. */
const VERTEX = /* glsl */ `
  attribute vec3 dir;
  attribute float apart;   // how far this vertex is from its neighbours, metres
  uniform vec3 uEyeAt;     // the eye, in the Moon's frame, metres
  uniform mat3 uSite;      // rows: the site's east, north and up
  uniform mat3 uCentre;    // the mesh's rings, made about +Z, turned to be about where they are wanted (the front page: as made)
  uniform mat3 uTurn;      // from the Moon's frame to the scene's (the front page draws in the Moon's: none)
  varying vec3 vDir, vP;
  varying vec2 vQ;
  ${MAPS}
  ${RELIEF}
  void main() {
    vec3 d = uCentre * dir;
    vDir = d;
    vQ = ${MOON_RADIUS.toFixed(1)} * (uSite * d).xy;
    // from the eye: both are a few thousand kilometres or less while the ground is near enough for a metre to show
    vec3 p = d * (${MOON_RADIUS.toFixed(1)} + relief(d, apart)) - uEyeAt;
    vP = p;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * (uTurn * p), 1.0);
  }`;

/** The apron's: each from the site's ground, where it was put in doubles; its outer rings brought to the sphere's own heights. */
const APRON_VERTEX = /* glsl */ `
  attribute vec3 dir;
  attribute vec2 q;        // its place on the site's plane, metres east and north
  attribute float ground;  // its height above the reference sphere, metres
  attribute float apart;
  uniform vec3 uEyeSite;   // the eye, from the site's ground, in the Moon's frame, metres
  uniform mat3 uTurn;
  varying vec3 vDir, vP;
  varying vec2 vQ;
  ${MAPS}
  ${RELIEF}
  void main() {
    vDir = dir;
    vQ = q;
    float meet = smoothstep(0.7, 0.95, length(q) / ${APRON.reach.toFixed(1)});
    vec3 p = position - uEyeSite;
    if (meet > 0.0) p += dir * (meet * (relief(dir, apart) - ground));
    vP = p;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * (uTurn * p), 1.0);
  }`;

const fragment = (apron: boolean, octaves: number, grains: number): string => /* glsl */ `
  uniform vec3 uSun;      // toward the Sun, in the Moon's frame
  uniform mat3 uSite;
  uniform sampler2D tColour, tNearColour;
  uniform float uIn;      // how far the maps have come in since they arrived, 0 to 1
  uniform float uGain;    // the colour map's scale to the Moon's albedo
  uniform vec2 uCast;     // the cast shadows: how much they are believed (the Sun still near where they were worked out for), and the angle their byte spans
  uniform float uMade;    // whether the site's ground is known (the made ground is drawn)
  uniform float uDetail;  // how far the finest maps are in (a flight's: they fade as they are changed for another site's)
  uniform float uFade;    // how much of what is behind it is covered (a flight's: it comes in as the eye leaves the air)
  uniform float uCel;     // drawn as the cel look draws: the light in flat tones
  varying vec3 vDir, vP;
  varying vec2 vQ;
  ${MAPS}
  ${LIGHT_GLSL}
  ${groundGlsl(octaves, grains)}
  // a plane's east, brought level at a direction (its rows are east, north and middle: a mat3 is indexed by column)
  vec3 levelEast(mat3 plane, vec3 d) {
    vec3 east = vec3(plane[0].x, plane[1].x, plane[2].x);
    return normalize(east - dot(east, d) * d);
  }
  // the ground's normal toward a direction, from a map's slopes along the level directions tx and (a quarter turn on) ty
  vec3 normalFrom(vec3 d, vec3 tx, vec2 s) { return normalize(d - s.x * tx - s.y * cross(d, tx)); }
  void main() {
    vec3 d = normalize(vDir);
    ${
      apron
        ? ''
        : `// (the apron is drawn there)
    if (uMade > 0.5 && dot(vQ, vQ) < ${(0.9 * APRON.reach) ** 2}.0 && d.x * uSite[0].z + d.y * uSite[1].z + d.z * uSite[2].z > 0.5) discard;`
    }
    // the whole Moon's map: its seam is at 180 degrees, in the middle of the far side, so its gradient is taken from
    // a longitude that has no seam there
    vec2 uv = onWhole(d);
    vec2 flat_ = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
    bool seam = abs(uv.x - 0.5) > 0.25;
    vec2 gx = seam ? dFdx(flat_) : dFdx(uv), gy = seam ? dFdy(flat_) : dFdy(uv);
    vec3 east = normalize(cross(vec3(0.0, 0.0, 1.0), d));
    vec3 n = normalFrom(d, east, slopes(textureGrad(tWhole, uv, gx, gy).rg));
    // (each read whether or not it counts, so that its gradient is taken evenly across where it begins)
    float wWide, wNear;
    vec2 atWide = onPlane(uWide, uRange[1].z, d, wWide), atNear = onPlane(uNear, uRange[2].z, d, wNear);
    wWide *= uDetail;
    wNear *= uDetail;
    n = mix(n, normalFrom(d, levelEast(uWide, d), slopes(texture(tWide, atWide).rg)), wWide);
    vec4 near = texture(tNear, atNear);
    n = mix(n, normalFrom(d, levelEast(uNear, d), slopes(near.rg)), wNear);
    n = normalize(mix(d, n, uIn));
    vec3 albedo = mix(textureGrad(tColour, uv, gx, gy).rgb, texture(tNearColour, atNear).rgb, wNear);
    albedo = mix(vec3(0.30), albedo, uIn) * uGain;
    vec3 v = normalize(-vP);
    // what the ground toward the Sun hides of it (the finest map's own horizon that way: tools/front-moon.mjs)
    float sunUp = asin(clamp(dot(d, uSun), -1.0, 1.0));
    float shade = mix(1.0, smoothstep(-0.0046, 0.0046, sunUp - near.b * uCast.y), wNear * uCast.x * uIn);
    // the made ground, on the finest map: the craters under two kilometres and the soil's grain (moonground.ts)
    float made = wNear * uMade * uIn;
    vec2 qx = dFdx(vQ), qy = dFdy(vQ);
    if (made > 0.0) {
      vec3 tx = levelEast(uSite, d), ty = cross(d, tx);
      vec2 slope;
      float lit, bright;
      float long_ = max(length(qx), length(qy));
      ground(vQ, long_, abs(qx.x * qy.y - qx.y * qy.x) / (long_ * long_ + 1e-12), vec3(dot(uSun, tx), dot(uSun, ty), dot(uSun, n)), vec3(dot(v, tx), dot(v, ty), dot(v, n)), slope, lit, bright);
      n = normalize(n - made * (slope.x * tx + slope.y * ty));
      shade *= mix(1.0, lit, made);
      albedo *= 1.0 + made * bright;
    }
    vec3 sent = moonlight(albedo, n, d, v, uSun, shade, 0.0);
    if (uCel > 0.5) {
      // the cel look's tones (look.ts TONES: shade, a half tone, full light), by how much of the light level ground
      // square to the Sun would send the pixel has
      float full = dot(albedo * uSunLight, vec3(0.2126, 0.7152, 0.0722));
      float k = dot(sent, vec3(0.2126, 0.7152, 0.0722)) / max(full, 1e-6);
      sent = albedo * uSunLight * (k < 0.12 ? 0.04 : k < 0.45 ? 0.42 : k < 0.8 ? 0.78 : 1.0);
    }
    gl_FragColor = vec4(sent, uFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/**
 * The mesh's directions and triangles: rings about `centre`, `SPOKES` round, the first at `fine` metres and each
 * further by `fine` until the spacing is a `grow`th of the distance, then by that; to the far side of the sphere.
 */
function shell(centre: Vec3, fine: number, grow: number, spokes: number): { dirs: Float32Array; apart: Float32Array; index: Uint32Array } {
  const rings: number[] = [0];
  const all = Math.PI * MOON_RADIUS;
  for (let at = fine; at < all; at += Math.max(fine, grow * at)) rings.push(at);
  rings.push(all);
  // two directions across the centre's
  const c = new THREE.Vector3(centre[0], centre[1], centre[2]).normalize();
  const a = new THREE.Vector3(0, 0, 1).cross(c);
  // (about the pole itself, any direction across will do)
  if (a.lengthSq() < 1e-12) a.set(1, 0, 0);
  a.normalize();
  const b = new THREE.Vector3().crossVectors(c, a);
  const dirs = new Float32Array(rings.length * (spokes + 1) * 3);
  const apart = new Float32Array(rings.length * (spokes + 1));
  let k = 0;
  for (const [i, ring] of rings.entries()) {
    const [ct, st] = [Math.cos(ring / MOON_RADIUS), Math.sin(ring / MOON_RADIUS)];
    // how far its vertices are from the next ring's: the camera looks across the rings (they are about the limb it
    // looks toward), so that is the way the ground's shape must be right; along a ring they may be further apart
    const gap = (rings[Math.min(i + 1, rings.length - 1)]! - rings[Math.max(i - 1, 0)]!) / 2;
    for (let j = 0; j <= spokes; j++) {
      apart[i * (spokes + 1) + j] = gap;
      const [ca, sa] = [Math.cos((2 * Math.PI * j) / spokes), Math.sin((2 * Math.PI * j) / spokes)];
      dirs[k++] = c.x * ct + (a.x * ca + b.x * sa) * st;
      dirs[k++] = c.y * ct + (a.y * ca + b.y * sa) * st;
      dirs[k++] = c.z * ct + (a.z * ca + b.z * sa) * st;
    }
  }
  const index = new Uint32Array((rings.length - 1) * spokes * 6);
  k = 0;
  const at = (i: number, j: number): number => i * (spokes + 1) + j;
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < spokes; j++) {
      // (anticlockwise seen from outside)
      index[k++] = at(i, j);
      index[k++] = at(i + 1, j);
      index[k++] = at(i, j + 1);
      index[k++] = at(i, j + 1);
      index[k++] = at(i + 1, j);
      index[k++] = at(i + 1, j + 1);
    }
  return { dirs, apart, index };
}

/** A picture as a texture, as it is in the file (the relief's bytes are numbers). `side`: the most texels a side on the GPU. */
async function picture(url: string, srgb: boolean, most: number, anisotropy: number): Promise<THREE.Texture> {
  const blob = await (await fetch(url)).blob();
  const options: ImageBitmapOptions = { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' };
  let bitmap = await createImageBitmap(blob, options);
  const fit = Math.min(1, most / Math.max(bitmap.width, bitmap.height));
  if (fit < 1) {
    const smaller = await createImageBitmap(bitmap, {
      ...options,
      resizeWidth: Math.round(bitmap.width * fit),
      resizeHeight: Math.round(bitmap.height * fit),
      resizeQuality: 'high',
    });
    bitmap.close();
    bitmap = smaller;
  }
  const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // (the ground is seen along itself at the horizon: without this a texel there is the mean of a hundred)
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  texture.onUpdate = () => {
    bitmap.close();
    texture.onUpdate = null;
  };
  return texture;
}

/** One grey texel: level ground at the reference sphere, until a map arrives. */
function flat(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([128, 128, 0, 255]), 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

const SURFACING = 1200;

/** The apron's vertices: rings about the site, each `grow` further than the last, from `first` metres to `reach`. */
function apron(
  site: ApronGround,
  spokes: number,
  grow: number,
): { position: Float32Array; dirs: Float32Array; q: Float32Array; ground: Float32Array; apart: Float32Array; index: Uint32Array } {
  const rings: number[] = [0];
  for (let r = APRON.first; r < APRON.reach; r *= grow) rings.push(r);
  rings.push(APRON.reach);
  const count = rings.length * (spokes + 1);
  const position = new Float32Array(count * 3),
    dirs = new Float32Array(count * 3),
    q = new Float32Array(count * 2),
    ground = new Float32Array(count),
    apart = new Float32Array(count);
  let k = 0;
  for (const [i, ring] of rings.entries()) {
    const gap = (rings[Math.min(i + 1, rings.length - 1)]! - rings[Math.max(i - 1, 0)]!) / 2;
    for (let j = 0; j <= spokes; j++, k++) {
      const [x, y] = [ring * Math.cos((2 * Math.PI * j) / spokes), ring * Math.sin((2 * Math.PI * j) / spokes)];
      position.set(site.point(x, y), k * 3);
      dirs.set(site.direction(x, y), k * 3);
      q.set([x, y], k * 2);
      ground[k] = site.meta.ground + site.height(x, y);
      apart[k] = gap;
    }
  }
  const index = new Uint32Array((rings.length - 1) * spokes * 6);
  k = 0;
  const at = (i: number, j: number): number => i * (spokes + 1) + j;
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < spokes; j++) {
      // (anticlockwise seen from above: east to north)
      index[k++] = at(i, j);
      index[k++] = at(i + 1, j);
      index[k++] = at(i + 1, j + 1);
      index[k++] = at(i, j);
      index[k++] = at(i + 1, j + 1);
      index[k++] = at(i, j + 1);
    }
  return { position, dirs, q, ground, apart, index };
}

/**
 * A landing site's finest map and its ground, for the flight scene (viewer/flightmoon.ts): its moon.json's `near` entry
 * (tools/front-moon.mjs `--sites`), the folder its maps are in, and the ground round the site whole (the apron's).
 */
export interface MoonDetail {
  id: string;
  dir: string;
  near: PlaneMeta;
  ground: ApronGround;
}

/** How long a site's finest maps take to go out as another's come in, milliseconds, each way. */
const CHANGING = 800;
/**
 * The flight's Moon is drawn on a coarse mesh (`COARSE`: 40,000 triangles) from where the most its relief (10 km) can
 * lift its edge is a quarter of a pixel at a long lens, and on the fine one nearer: no edge is seen to change.
 */
const COARSE = { fine: 15_000, grow: 0.02, spokes: 128, beyond: 40_000_000 };
const Z: Vec3 = [0, 0, 1];

export class MoonBody {
  /** All of it: the sphere, the apron, the blocks and their shadows. */
  readonly group = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly apron: THREE.Mesh;
  /** A flight's: the sphere coarse, for far off (`COARSE`). */
  private readonly coarse: THREE.Mesh | null = null;
  private site: ApronGround | null = null;
  private clear: SiteGround | null = null;
  private rocks: MoonRocks | null = null;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly textures: THREE.Texture[] = [];
  private arrivedAt = 0;
  private gone = false;
  /** Where the Sun stood over the Moon when the finest map's cast shadows were worked out (the front page's); or, a site's, toward the east. */
  private castFor: THREE.Vector3 | null = null;
  private castEast = false;
  /** The bearing the blocks are laid out about, radians anticlockwise from the site's east. */
  private toward = 0;
  /** A flight's: the site whose finest maps are drawn, the one asked for, and when the change began. */
  private detailOf: MoonDetail | null = null;
  private wanted: MoonDetail | null = null;
  private changing = 0;
  private goingAt = 0;
  private readonly flight: boolean;
  private readonly lighter: boolean;
  private readonly anisotropy: number;
  /** The near map's own textures, let go when another site's come in. */
  private readonly nearTextures = new Set<THREE.Texture>();

  /**
   * `dir`: the folder its bake is in (`moon.json` and its maps: tools/front-moon.mjs). `sunLight`: the Sun's light over
   * pi, as the Earth is given it. `lighter`: half the rings and spokes, and the maps at half size (tier.ts). `flight`: the
   * flight scene's Moon (viewer/flightmoon.ts): only the whole Moon's maps are read from `dir`, its finest maps and ground
   * are a landing site's, given when it is near (`detail`), its rings are turned to be about the point under the eye, it
   * is drawn over what is behind it by `fade`, and it has no blocks.
   */
  constructor(dir: string, sunLight: THREE.Color, lighter: boolean, anisotropy: number, flight = false) {
    this.flight = flight;
    this.lighter = lighter;
    this.anisotropy = anisotropy;
    this.uniforms = {
      uEyeAt: { value: new THREE.Vector3() },
      uEyeSite: { value: new THREE.Vector3() },
      uSite: { value: new THREE.Matrix3() },
      uCentre: { value: new THREE.Matrix3() },
      uTurn: { value: new THREE.Matrix3() },
      uEarth: { value: new THREE.Vector4(1, 0, 0, 0) },
      uMade: { value: 0 },
      uDetail: { value: 1 },
      uFade: { value: 1 },
      uCel: { value: 0 },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uSunLight: { value: sunLight },
      tWhole: { value: this.keep(flat()) },
      tWide: { value: this.keep(flat()) },
      tNear: { value: this.keep(flat()) },
      tNearHeight: { value: this.keep(flat()) },
      uCast: { value: new THREE.Vector2(0, Math.PI / 4) },
      tColour: { value: this.keep(flat()) },
      tNearColour: { value: this.keep(flat()) },
      uWide: { value: new THREE.Matrix3() },
      uNear: { value: new THREE.Matrix3() },
      // (no plane until there is one: a half breadth of nothing has no texel inside it)
      uRange: { value: [new THREE.Vector4(0, 0, 1, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
      uIn: { value: 0 },
      uGain: { value: 1 },
    };
    // (the finest craters and grain are left out on a lighter machine: its pixels are larger than they are)
    const [octaves, grains] = lighter ? [11, 10] : [CRATERS.octaves, 12];
    const material = (name: string, vertexShader: string, apron: boolean): THREE.ShaderMaterial => {
      const m = new THREE.ShaderMaterial({ name, uniforms: this.uniforms, vertexShader, fragmentShader: fragment(apron, octaves, grains) });
      // (a flight's is laid over what is behind it as it comes in: its own alpha, `uFade`)
      if (flight) {
        m.blending = THREE.CustomBlending;
        m.blendSrc = THREE.SrcAlphaFactor;
        m.blendDst = THREE.OneMinusSrcAlphaFactor;
      }
      return m;
    };
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material('far-moon', VERTEX, false));
    this.mesh.name = 'moon';
    this.apron = new THREE.Mesh(new THREE.BufferGeometry(), material('moon-apron', APRON_VERTEX, true));
    this.apron.name = 'moon-apron';
    const meshes = [this.mesh, this.apron];
    if (flight) {
      this.coarse = new THREE.Mesh(new THREE.BufferGeometry(), this.mesh.material);
      this.coarse.name = 'moon-coarse';
      meshes.push(this.coarse);
    }
    for (const [order, mesh] of meshes.entries()) {
      mesh.frustumCulled = false;
      mesh.renderOrder = 2 + Math.min(order, 1);
      mesh.visible = false;
      // (nothing of it is picked or solid: its places are the shader's)
      mesh.raycast = () => {};
      this.group.add(mesh);
    }
    void this.load(dir, lighter, anisotropy);
  }

  private keep<T extends THREE.Texture>(texture: T): T {
    this.textures.push(texture);
    return texture;
  }

  /** The mesh's directions and triangles into a geometry. */
  private static shaped(geometry: THREE.BufferGeometry, made: { dirs: Float32Array; apart: Float32Array; index: Uint32Array }): void {
    // (three wants a position to count vertices by; the shader places them itself, from the same numbers)
    const directions = new THREE.BufferAttribute(made.dirs, 3);
    geometry.setAttribute('dir', directions);
    geometry.setAttribute('position', directions);
    geometry.setAttribute('apart', new THREE.BufferAttribute(made.apart, 1));
    geometry.setIndex(new THREE.BufferAttribute(made.index, 1));
  }

  private put(name: string, texture: THREE.Texture): void {
    if (this.gone) return void texture.dispose();
    const u = this.uniforms;
    const was = u[name]!.value as THREE.Texture;
    was.dispose();
    this.nearTextures.delete(was);
    u[name]!.value = this.keep(texture);
  }

  private async load(dir: string, lighter: boolean, anisotropy: number): Promise<void> {
    const meta = (await (await fetch(`${dir}moon.json`)).json()) as MoonMeta;
    if (this.gone) return;
    const u = this.uniforms;
    const ranges = u.uRange!.value as THREE.Vector4[];
    ranges[0]!.set(meta.whole.low, meta.whole.high - meta.whole.low, 1, (2 * Math.PI * MOON_RADIUS) / meta.whole.width);
    u.uGain!.value = ALBEDO / meta.colour.mean;
    const most = lighter ? 1024 : 4096;
    if (this.flight) {
      // the whole Moon alone, its rings about +Z (turned each frame to be about the point under the eye: `place`)
      MoonBody.shaped(this.mesh.geometry, lighter ? shell(Z, 1000, 0.008, 360) : shell(Z, 500, 0.004, 720));
      MoonBody.shaped(this.coarse!.geometry, shell(Z, COARSE.fine, COARSE.grow, COARSE.spokes));
      const [colour, whole] = await Promise.all([
        picture(`${dir}${meta.colour.file}`, true, most, anisotropy),
        picture(`${dir}${meta.whole.file}`, false, most, anisotropy),
      ]);
      this.put('tColour', colour);
      this.put('tWhole', whole);
      this.arrivedAt = performance.now();
      if (this.wanted) void this.change(this.wanted);
      return;
    }
    const rows = (p: PlaneMeta): THREE.Matrix3 =>
      new THREE.Matrix3().set(p.east[0], p.east[1], p.east[2], p.north[0], p.north[1], p.north[2], p.centre[0], p.centre[1], p.centre[2]);
    u.uWide!.value = rows(meta.wide);
    u.uNear!.value = rows(meta.near);
    ranges[1]!.set(meta.wide.low, meta.wide.high - meta.wide.low, meta.wide.half, meta.wide.metres);
    ranges[2]!.set(meta.near.low, meta.near.high - meta.near.low, meta.near.half, meta.near.heightMetres ?? meta.near.metres);
    this.castFor = new THREE.Vector3(...meta.for.sun);
    (u.uCast!.value as THREE.Vector2).y = meta.near.horizon ?? Math.PI / 4;
    const s = meta.site;
    // (the Earth's bearing from the site as the bake found it: the camera looks at the Earth)
    this.toward = s.towardEarth;
    u.uSite!.value = siteRows(s);
    MoonBody.shaped(this.mesh.geometry, lighter ? shell(meta.near.centre, 1000, 0.008, 360) : shell(meta.near.centre, 500, 0.004, 720));
    // the ground round the site, whole: the apron's heights and the blocks' are read from it
    const grid = new Int16Array(await (await fetch(`${dir}${s.file}`)).arrayBuffer());
    if (this.gone) return;
    const site = (this.site = this.clear = new SiteGround(s, grid));
    this.shapeApron(site, lighter);
    // the blocks, about the bearing the Earth stood on at the instant the bake was for (the camera looks at the Earth)
    this.rocks = new MoonRocks(site, this.toward, lighter, {
      uEyeSite: u.uEyeSite!,
      uSun: u.uSun!,
      uSunLight: u.uSunLight!,
      uEarth: u.uEarth!,
    });
    this.group.add(this.rocks.group);
    u.uMade!.value = 1;
    // what the first frame is of first: the ground under the camera, the whole Moon's colour; then the rest
    const [near, nearHeight, nearColour, colour, whole] = await Promise.all([
      picture(`${dir}${meta.near.file}`, false, most, anisotropy),
      picture(`${dir}${meta.near.height}`, false, most, 1),
      picture(`${dir}${meta.near.colour}`, true, most, anisotropy),
      picture(`${dir}${meta.colour.file}`, true, most, anisotropy),
      picture(`${dir}${meta.whole.file}`, false, most, anisotropy),
    ]);
    this.put('tNear', near);
    this.put('tNearHeight', nearHeight);
    this.put('tNearColour', nearColour);
    this.put('tColour', colour);
    this.put('tWhole', whole);
    this.mesh.visible = this.apron.visible = !this.gone;
    this.arrivedAt = performance.now();
    this.put('tWide', await picture(`${dir}${meta.wide.file}`, false, most, anisotropy));
  }

  /** The apron's mesh, about a site's ground. */
  private shapeApron(site: ApronGround, lighter: boolean): void {
    const a = lighter ? apron(site, APRON.spokes / 2, APRON.grow ** 2) : apron(site, APRON.spokes, APRON.grow);
    const g = this.apron.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(a.position, 3));
    g.setAttribute('dir', new THREE.BufferAttribute(a.dirs, 3));
    g.setAttribute('q', new THREE.BufferAttribute(a.q, 2));
    g.setAttribute('ground', new THREE.BufferAttribute(a.ground, 1));
    g.setAttribute('apart', new THREE.BufferAttribute(a.apart, 1));
    g.setIndex(new THREE.BufferAttribute(a.index, 1));
    g.computeBoundingSphere();
  }

  /**
   * A flight's: draw this landing site's finest maps and its ground (or none). The ones on show go out over `CHANGING` and
   * these come in over as long once they are here, so no map is cut in or out.
   */
  detail(to: MoonDetail | null): void {
    if (!this.flight || to?.id === this.wanted?.id) return;
    this.wanted = to;
    this.goingAt = performance.now();
    if (this.arrivedAt) void this.change(to);
  }

  /** The site's id whose maps are drawn, or are coming. */
  get detailed(): string | null {
    return this.wanted?.id ?? null;
  }

  private async change(to: MoonDetail | null): Promise<void> {
    const most = this.lighter ? 1024 : 4096;
    const maps = to
      ? await Promise.all([
          picture(`${to.dir}${to.near.file}`, false, most, this.anisotropy),
          picture(`${to.dir}${to.near.height}`, false, most, 1),
          picture(`${to.dir}${to.near.colour}`, true, most, this.anisotropy),
        ])
      : null;
    // (asked for another meanwhile, or let go)
    if (this.gone || this.wanted !== to) {
      for (const m of maps ?? []) m.dispose();
      return;
    }
    // the ones on show go out first
    while (this.detailOf && (this.uniforms.uDetail!.value as number) > 0) {
      await new Promise((r) => setTimeout(r, 50));
      if (this.gone || this.wanted !== to) {
        for (const m of maps ?? []) m.dispose();
        return;
      }
    }
    const u = this.uniforms;
    this.detailOf = to;
    this.changing = performance.now();
    if (!to || !maps) {
      u.uMade!.value = 0;
      this.site = null;
      this.apron.visible = false;
      return;
    }
    const near = to.near;
    u.uNear!.value = new THREE.Matrix3().set(...near.east, ...near.north, ...near.centre);
    (u.uRange!.value as THREE.Vector4[])[2]!.set(near.low, near.high - near.low, near.half, near.heightMetres ?? near.metres);
    (u.uCast!.value as THREE.Vector2).y = near.horizon ?? Math.PI / 4;
    this.castEast = true;
    const names = ['tNear', 'tNearHeight', 'tNearColour'];
    for (const [i, map] of maps.entries()) {
      this.put(names[i]!, map);
      this.nearTextures.add(map);
    }
    this.site = to.ground;
    u.uSite!.value = siteRows(to.ground.meta);
    this.shapeApron(to.ground, this.lighter);
    u.uMade!.value = 1;
    this.apron.visible = this.mesh.visible || (this.coarse?.visible ?? false);
  }

  get ready(): boolean {
    return this.arrivedAt > 0;
  }

  /** How near the ground comes to an eye `over` metres above the site along the front page's path, metres; none while it is not known, or beyond what was worked out. */
  clearance(over: number): number | null {
    return this.clear?.clearance(over) ?? null;
  }

  /** How many blocks lie round the site (none until its ground has arrived). */
  get blocks(): number {
    return this.rocks?.count ?? 0;
  }

  /** A flight's: how much of what is behind it is covered, 0 to 1, and whether it is drawn at all. */
  fade(share: number): void {
    this.uniforms.uFade!.value = share;
    this.group.visible = share > 0;
  }

  /** A flight's: the turn from the Moon's frame to the scene's (its columns: the Moon's axes in the scene). */
  turn(m: THREE.Matrix3): void {
    (this.uniforms.uTurn!.value as THREE.Matrix3).copy(m);
  }

  /** The cel look: its light in flat tones. */
  cel(on: boolean): void {
    this.uniforms.uCel!.value = on ? 1 : 0;
  }

  /**
   * Where the eye, the Sun and the Earth are, in the Moon's frame (the eye in metres from its centre; the others'
   * directions), and the share of the Earth's face that is lit. True while its maps are still coming in, or
   * something of it has just come into or gone out of the picture.
   */
  place(eye: Vec3, sun: Vec3, earth: Vec3, earthLit: number, now: number): boolean {
    (this.uniforms.uEyeAt!.value as THREE.Vector3).set(eye[0], eye[1], eye[2]);
    const toSun = (this.uniforms.uSun!.value as THREE.Vector3).set(sun[0], sun[1], sun[2]).normalize();
    const e = Math.hypot(earth[0], earth[1], earth[2]);
    (this.uniforms.uEarth!.value as THREE.Vector4).set(earth[0] / e, earth[1] / e, earth[2] / e, EARTHSHINE * earthLit);
    const cast = this.uniforms.uCast!.value as THREE.Vector2;
    if (this.castEast) {
      // a site's cast shadows are worked out toward the east at every texel: believed while the Sun's bearing over the map
      // is within 3 degrees of east (the lunar morning every LM came down in), gone by 8, and never with the Sun in the west
      const plane = this.uniforms.uNear!.value as THREE.Matrix3;
      const r = plane.elements; // (column-major: the rows set are east, north, middle)
      const [east, north] = [toSun.x * r[0]! + toSun.y * r[3]! + toSun.z * r[6]!, toSun.x * r[1]! + toSun.y * r[4]! + toSun.z * r[7]!];
      const off = east > 0 ? Math.abs(Math.atan2(north, east)) : Math.PI;
      cast.x = 1 - THREE.MathUtils.smoothstep(off, (3 * Math.PI) / 180, (8 * Math.PI) / 180);
    } else {
      // the cast shadows are the instant's: believed while the Sun is within 3 degrees of where it stood then, gone by 8
      const moved = this.castFor ? toSun.angleTo(this.castFor) : Math.PI;
      cast.x = 1 - THREE.MathUtils.smoothstep(moved, (3 * Math.PI) / 180, (8 * Math.PI) / 180);
    }
    const k = this.arrivedAt ? Math.min(1, (now - this.arrivedAt) / SURFACING) : 0;
    let coming = k !== this.uniforms.uIn!.value;
    this.uniforms.uIn!.value = k;
    if (this.flight) coming = this.aim(eye, now) || coming;
    if (this.site) {
      // from the site's ground, in doubles: near it the difference is a few metres, and a float holds it to a hair
      const o = this.site.origin;
      const from = (this.uniforms.uEyeSite!.value as THREE.Vector3).set(eye[0] - o[0], eye[1] - o[1], eye[2] - o[2]);
      const up = this.site.meta.up;
      const sunUp = toSun.x * up[0] + toSun.y * up[1] + toSun.z * up[2];
      // (no block is in any picture from above this: they are under the camera, which looks to the horizon)
      if (this.rocks?.show(from.length() < ROCKS_BELOW && this.mesh.visible, sunUp)) coming = true;
    }
    return coming;
  }

  /**
   * A flight's, each frame: the rings turned to be about the point under the eye (so the mesh is finest where the eye is,
   * wherever it goes round), the coarse mesh from far off and the fine one nearer, and a site's finest maps eased out
   * and in as they are changed. True while something of that is under way.
   */
  private aim(eye: Vec3, now: number): boolean {
    if (!this.arrivedAt) return false;
    const r = Math.hypot(eye[0], eye[1], eye[2]);
    const under = new THREE.Vector3(eye[0] / r, eye[1] / r, eye[2] / r);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), under);
    (this.uniforms.uCentre!.value as THREE.Matrix3).setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
    const far = r - MOON_RADIUS > COARSE.beyond;
    this.mesh.visible = !far;
    this.coarse!.visible = far;
    this.apron.visible = this.site !== null && !far;
    // the finest maps: out while another's are wanted, in once they are here
    const u = this.uniforms.uDetail!;
    const was = u.value as number;
    const going = this.wanted !== this.detailOf;
    const since = (now - this.changing) / CHANGING;
    u.value = going
      ? Math.min(was, Math.max(0, 1 - (now - this.goingAt) / CHANGING))
      : this.detailOf
        ? Math.min(1, Math.max(was, since))
        : 0;
    return u.value !== was;
  }

  dispose(): void {
    this.gone = true;
    for (const t of this.textures) t.dispose();
    for (const mesh of [this.mesh, this.apron, ...(this.coarse ? [this.coarse] : [])]) mesh.geometry.dispose();
    for (const mesh of [this.mesh, this.apron]) (mesh.material as THREE.Material).dispose();
    this.rocks?.dispose();
  }
}

/** A site's east, north and up as the rows of a matrix. */
function siteRows(s: { east: Vec3; north: Vec3; up: Vec3 }): THREE.Matrix3 {
  return new THREE.Matrix3().set(s.east[0], s.east[1], s.east[2], s.north[0], s.north[1], s.north[2], s.up[0], s.up[1], s.up[2]);
}
