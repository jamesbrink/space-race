import * as THREE from 'three';
import type { Vec3 } from '../world/frames.ts';
import { MOON_RADIUS } from '../world/moon.ts';

/**
 * The Moon under the camera: its real ground, lit by the real Sun, from 110 km up to 80,000.
 *
 * **The ground** is the laser altimeter's heights and the wide-angle camera's colour (NASA's CGI
 * Moon Kit; tools/front-moon.mjs bakes them and says how each byte is read): the relief of the
 * whole Moon at 5 km a texel, of the limb the camera looks across at 3.7 km, and of the ground
 * under where it starts at 481 m, each on a plane touching the Moon there and each faded in over
 * the coarser one under it from its edge, so there is no line where one ends.
 *
 * **Its shape** is one mesh of the whole sphere, made round the middle of the finest map: rings
 * about that point that are 500 m apart out to 125 km and then widen by a 250th of their
 * distance each (1,300 rings, 720 round: 1.9 million triangles; half of each on the lighter
 * tier), so the ground is finest where the camera begins and no coarser anywhere than the
 * distance it is seen from needs. The camera looks across the rings, toward the limb they are
 * about, so it is the rings that are close: seen along itself, ground whose shape is coarse that
 * way is a sea of ridges. Each vertex is raised by the height the maps give its direction,
 * in the vertex shader, so the horizon's hills and the far rims of craters are real silhouettes;
 * the light on every pixel is from the maps' slopes, which are finer than the mesh.
 *
 * **Its light.** The Sun's direction is the ephemeris's. How the ground sends light back is the
 * Moon's own way, not a matte ball's: dust that darkens little toward the limb (Lommel and
 * Seeliger's law, mixed with Lambert's by McEwen's lunar-Lambert weight for the phase angle, as
 * remembered from his 1996 fit: estimated), dimmer away from opposition (taken as exp(-g / 60
 * degrees), fitted by eye to the Moon's phase curve between 20 and 60 degrees: estimated), and as
 * bright overall as the Moon is: the colour map is scaled so that its mean is the Moon's normal
 * albedo, 0.12. So beside the Earth it is as dark as it is: asphalt beside cloud.
 *
 * **Its shadows.** A slope turned from the Sun is dark by its own slope everywhere. Under where
 * the camera starts the ground also casts shadows on itself: the finest map holds, for each
 * texel, how high the ground stands toward the Sun as it stood at the page's instant
 * (tools/front-moon.mjs), and a texel whose Sun is lower than that is in shadow, with an edge as
 * soft as the Sun is wide. That is right while the Sun keeps its bearing; as the page's clock
 * runs on it is let go (gone when the Sun has moved 8 degrees, sixteen hours of the world), by
 * when the camera is far out and a shadow is under a pixel.
 *
 * What is simplified: beyond the finest map nothing casts a shadow on its neighbour; below 481 m
 * there is nothing (no small craters, no boulders); the colour is the camera's mosaic, which has
 * the light of its own Sun in it (a crater's wall is brighter there than its floor); no
 * earthshine on the night side.
 */

/** A relief map on a plane touching the Moon, as tools/front-moon.mjs describes it (public/front/moon.json). */
interface PlaneMeta {
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
  /** What it was baked for: the front page's instant and limb, and where the Sun then stood over the Moon (a unit vector in its frame). */
  for: { instant: string; limb: number; sun: [number, number, number] };
}

/** The Moon's normal albedo, seen whole: the colour map's mean is scaled to it. */
const ALBEDO = 0.12;
/** How far in from a plane's edge its map is faded in, as a share of its half breadth. */
const FADE = 0.2;

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

const VERTEX = /* glsl */ `
  attribute vec3 dir;
  attribute float apart;   // how far this vertex is from its neighbours, metres
  uniform vec3 uEyeAt;     // the eye, in the Moon's frame, metres
  varying vec3 vDir;
  ${MAPS}
  void main() {
    vDir = dir;
    float wWide, wNear;
    vec2 uvWide = onPlane(uWide, uRange[1].z, dir, wWide), uvNear = onPlane(uNear, uRange[2].z, dir, wNear);
    // Each height is the ground's mean over the vertex's own share of it (the map's level whose texel is as far across
    // as the vertices are apart): read at the map's finest, a vertex 3 km from the next took one 481 m texel's height,
    // and the ground seen along itself was a sea of spikes.
    float h = uRange[0].x + uRange[0].y * textureLod(tWhole, onWhole(dir), log2(max(apart / uRange[0].w, 1.0))).b;
    if (wWide > 0.0) h = mix(h, uRange[1].x + uRange[1].y * textureLod(tWide, uvWide, log2(max(apart / uRange[1].w, 1.0))).b, wWide);
    if (wNear > 0.0) h = mix(h, uRange[2].x + uRange[2].y * textureLod(tNearHeight, uvNear, log2(max(apart / uRange[2].w, 1.0))).r, wNear);
    // from the eye: both are a few thousand kilometres or less while the ground is near enough for a metre to show
    vec3 p = dir * (${MOON_RADIUS.toFixed(1)} + h) - uEyeAt;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * p, 1.0);
  }`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uSun;      // toward the Sun, in the Moon's frame
  uniform vec3 uEyeAt;
  uniform vec3 uSunLight; // what a white level surface sends back squarely lit: the Sun's light over pi
  uniform sampler2D tColour, tNearColour;
  uniform float uIn;      // how far the maps have come in since they arrived, 0 to 1
  uniform float uGain;    // the colour map's scale to the Moon's albedo
  uniform vec2 uCast;     // the cast shadows: how much they are believed (the Sun still near where they were worked out for), and the angle their byte spans
  varying vec3 vDir;
  ${MAPS}
  // a plane's east, brought level at a direction (its rows are east, north and middle: a mat3 is indexed by column)
  vec3 levelEast(mat3 plane, vec3 d) {
    vec3 east = vec3(plane[0].x, plane[1].x, plane[2].x);
    return normalize(east - dot(east, d) * d);
  }
  // the ground's normal toward a direction, from a map's slopes along the level directions tx and (a quarter turn on) ty
  vec3 normalFrom(vec3 d, vec3 tx, vec2 s) { return normalize(d - s.x * tx - s.y * cross(d, tx)); }
  void main() {
    vec3 d = normalize(vDir);
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
    n = mix(n, normalFrom(d, levelEast(uWide, d), slopes(texture(tWide, atWide).rg)), wWide);
    vec4 near = texture(tNear, atNear);
    n = mix(n, normalFrom(d, levelEast(uNear, d), slopes(near.rg)), wNear);
    n = normalize(mix(d, n, uIn));
    vec3 albedo = mix(textureGrad(tColour, uv, gx, gy).rgb, texture(tNearColour, atNear).rgb, wNear);
    albedo = mix(vec3(0.30), albedo, uIn) * uGain;
    // toward the eye from this point of the ground (the eye is some way off: the point is taken on the mean sphere)
    vec3 v = normalize(uEyeAt - d * ${MOON_RADIUS.toFixed(1)});
    // (a slope of the map's may face away from the eye where the mesh, which is coarser, shows it all the same: it is
    // taken as seen no more aslant than a third of the level ground's angle there, or Lommel and Seeliger's law has
    // nothing under the line and the slope is a white patch)
    float mu0 = dot(n, uSun), mu = max(dot(n, v), 0.34 * max(dot(d, v), 0.0));
    // (the Sun is half a degree across: the terminator is that soft, on the sphere as on a slope)
    float lit = smoothstep(-0.0046, 0.0046, dot(d, uSun)) * max(mu0, 0.0);
    // what the ground toward the Sun hides of it (the finest map's own horizon that way: tools/front-moon.mjs)
    float sunUp = asin(clamp(dot(d, uSun), -1.0, 1.0));
    lit *= mix(1.0, smoothstep(-0.0046, 0.0046, sunUp - near.b * uCast.y), wNear * uCast.x * uIn);
    float g = degrees(acos(clamp(dot(uSun, v), -1.0, 1.0)));
    float lunar = clamp(1.0 - 0.019 * g + 0.242e-3 * g * g - 1.46e-6 * g * g * g, 0.0, 1.0);
    float sent = lunar * 2.0 * lit / (max(mu0, 0.0) + mu + 1e-4) + (1.0 - lunar) * lit;
    gl_FragColor = vec4(albedo * uSunLight * sent * exp(-g / 60.0), 1.0);
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
  const a = new THREE.Vector3(0, 0, 1).cross(c).normalize();
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

export class FarMoon {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly textures: THREE.Texture[] = [];
  private arrivedAt = 0;
  private gone = false;
  /** Where the Sun stood over the Moon when the finest map's cast shadows were worked out. */
  private castFor: THREE.Vector3 | null = null;

  /** `sunLight`: the Sun's light over pi, as the Earth is given it. `lighter`: half the rings and spokes, and the maps at half size (tier.ts). */
  constructor(base: string, sunLight: THREE.Color, lighter: boolean, anisotropy: number) {
    this.uniforms = {
      uEyeAt: { value: new THREE.Vector3() },
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
      uRange: { value: [new THREE.Vector4(0, 0, 1, 0), new THREE.Vector4(0, 0, 1, 0), new THREE.Vector4(0, 0, 1, 0)] },
      uIn: { value: 0 },
      uGain: { value: 1 },
    };
    this.mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.ShaderMaterial({ name: 'far-moon', uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT }),
    );
    this.mesh.name = 'moon';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    void this.load(base, lighter, anisotropy);
  }

  private keep<T extends THREE.Texture>(texture: T): T {
    this.textures.push(texture);
    return texture;
  }

  private async load(base: string, lighter: boolean, anisotropy: number): Promise<void> {
    const meta = (await (await fetch(`${base}front/moon.json`)).json()) as MoonMeta;
    if (this.gone) return;
    const u = this.uniforms;
    const rows = (p: PlaneMeta): THREE.Matrix3 =>
      new THREE.Matrix3().set(p.east[0], p.east[1], p.east[2], p.north[0], p.north[1], p.north[2], p.centre[0], p.centre[1], p.centre[2]);
    u.uWide!.value = rows(meta.wide);
    u.uNear!.value = rows(meta.near);
    const ranges = u.uRange!.value as THREE.Vector4[];
    ranges[0]!.set(meta.whole.low, meta.whole.high - meta.whole.low, 1, (2 * Math.PI * MOON_RADIUS) / meta.whole.width);
    ranges[1]!.set(meta.wide.low, meta.wide.high - meta.wide.low, meta.wide.half, meta.wide.metres);
    ranges[2]!.set(meta.near.low, meta.near.high - meta.near.low, meta.near.half, meta.near.heightMetres ?? meta.near.metres);
    this.castFor = new THREE.Vector3(...meta.for.sun);
    (u.uCast!.value as THREE.Vector2).y = meta.near.horizon ?? Math.PI / 4;
    u.uGain!.value = ALBEDO / meta.colour.mean;
    const { dirs, apart, index } = lighter ? shell(meta.near.centre, 1000, 0.008, 360) : shell(meta.near.centre, 500, 0.004, 720);
    const geometry = this.mesh.geometry;
    // (three wants a position to count vertices by; the shader places them itself, from the same numbers)
    const directions = new THREE.BufferAttribute(dirs, 3);
    geometry.setAttribute('dir', directions);
    geometry.setAttribute('position', directions);
    geometry.setAttribute('apart', new THREE.BufferAttribute(apart, 1));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    const most = lighter ? 1024 : 4096;
    const put = (name: string, texture: THREE.Texture): void => {
      if (this.gone) return void texture.dispose();
      (u[name]!.value as THREE.Texture).dispose();
      u[name]!.value = this.keep(texture);
    };
    // what the first frame is of first: the ground under the camera, the whole Moon's colour; then the rest
    const [near, nearHeight, nearColour, colour, whole] = await Promise.all([
      picture(`${base}front/${meta.near.file}`, false, most, anisotropy),
      picture(`${base}front/${meta.near.height}`, false, most, 1),
      picture(`${base}front/${meta.near.colour}`, true, most, anisotropy),
      picture(`${base}front/${meta.colour.file}`, true, most, anisotropy),
      picture(`${base}front/${meta.whole.file}`, false, most, anisotropy),
    ]);
    put('tNear', near);
    put('tNearHeight', nearHeight);
    put('tNearColour', nearColour);
    put('tColour', colour);
    put('tWhole', whole);
    this.mesh.visible = !this.gone;
    this.arrivedAt = performance.now();
    put('tWide', await picture(`${base}front/${meta.wide.file}`, false, most, anisotropy));
  }

  get ready(): boolean {
    return this.arrivedAt > 0;
  }

  /** Where the eye and the Sun are, in the Moon's frame. True while its maps are still coming in. */
  place(eye: Vec3, sun: Vec3, now: number): boolean {
    (this.uniforms.uEyeAt!.value as THREE.Vector3).set(eye[0], eye[1], eye[2]);
    const toSun = (this.uniforms.uSun!.value as THREE.Vector3).set(sun[0], sun[1], sun[2]).normalize();
    // the cast shadows are the instant's: believed while the Sun is within 3 degrees of where it stood then, gone by 8
    const moved = this.castFor ? toSun.angleTo(this.castFor) : Math.PI;
    (this.uniforms.uCast!.value as THREE.Vector2).x = 1 - THREE.MathUtils.smoothstep(moved, (3 * Math.PI) / 180, (8 * Math.PI) / 180);
    const k = this.arrivedAt ? Math.min(1, (now - this.arrivedAt) / SURFACING) : 0;
    const coming = k !== this.uniforms.uIn!.value;
    this.uniforms.uIn!.value = k;
    return coming;
  }

  dispose(): void {
    this.gone = true;
    for (const t of this.textures) t.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
