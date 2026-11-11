import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { type Clouds, cloudMiddle, cloudNoiseGlsl, cloudRise, cloudUniform, hazeAboveUniform, installedAir } from './air';
import { fieldAs, hash2 } from './field';
import { uOrigin } from './origin';

/**
 * The cumulus as a volume: air.ts's cloud field, heaped into clouds and marched through.
 *
 * A cloud stands where the field's noise is over its cut (`cloudMiddle`, which makes the record's
 * cover), on a flat base at the layer's height, and rises the higher the further the noise is over
 * it, to the layer's full depth in the heart of the biggest: so each is a domed heap, wider at the
 * foot than the top. Its outline is eaten into by billows, round lumps of three sizes (a tiling 3D
 * noise of cells, `billows`), small at the base and big at the top, where a cumulus is cauliflower;
 * the base is left flat. The billows churn slowly upward (`cloudRise`) as the field drifts.
 *
 * Each frame drawn, a ray from the eye through each pixel of a target a quarter the window's pixels
 * is marched through the layer, as far as the scene's depth: through the cloud in steps that
 * lengthen with distance, and over the clear air between clouds in strides (the field is baked
 * round the eye into a texture, with two coarser maps of where there is any cloud at all within a
 * cell and its neighbours, 256 m and 2 km across). At each step inside a cloud the light is marched
 * toward the Sun (Beer and Lambert, with octaves of multiple scattering and a powder term where
 * the cloud is thin), and the sky and the ground light it from above and below. Each step is seen
 * through the haze between it and the eye, as anything else is (air.ts). The layer lies on the
 * Earth's curve, so downrange the clouds stay at their height over the sea.
 *
 * The result is brought up to the frame's size and laid over it after the scene (and its ink).
 * Besides its colour and opacity each low pixel keeps where along its ray the cloud began and where
 * it became half opaque; a pixel of the frame takes cloud from its low neighbours only as far as its
 * own surface lies past those, so the rocket and the gantry cut the clouds on their own edges, not on
 * a coarse pixel's. In the cel look the cloud is a drawing: its opacity is cut at one half and its
 * light in two flat tones, at the frame's resolution, so the edge is clean.
 *
 * Nothing in it moves by itself between frames (no temporal jitter): the march's offset is fixed
 * to the pixel, so a still view of drifting cloud does not shimmer.
 */

/** Texels a side of the baked field, and metres a texel: 131 km across, laid round the eye. */
const SIDE = 4096;
const TEXEL = 32;
const EXTENT = SIDE * TEXEL;
/** The two maps of where there is cloud: cells this many metres across (whole texels of the field). */
const CELL = 128;
/** How many cells round each the map of clear air looks for cloud: so the longest stride over it is 3.8 km. */
const REACH = 24;
/** The bake is centred on multiples of this, which is whole cells and whole tiles of the billows: nothing moves when it is baked again. */
const SNAP = 2048;
/** The field is baked again once the eye is this far over it from the middle of the last bake. */
const REBAKE = 16000;
/** Clouds fade out between these distances from the eye (horizontally), within what is baked. */
const FADE: [number, number] = [32000, 48000];
/** The billows' noise: texels a side, and metres before it repeats. */
const NOISE = 64;
const TILE = 1024;
/** Extinction in the heart of a cloud, per metre: 100 m of cloud dims what is behind it to 5 %. */
const SIGMA = 0.03;
/** The baked field stores the noise's excess over its cut, from BELOW under it to RANGE - BELOW over it. */
const BELOW = 0.1;
const RANGE = 0.4;
/** Excess at which a cloud's top reaches the layer's full depth: the noise's greatest, 0.22 over the cut (its 99th percentile is 0.11). */
const TOWER = 0.2;
/** Metres from a cloud's edge per unit of excess: the reciprocal of the noise's mean slope, 5.3e-4 a metre. */
const SIDE_M = 2000;
/** How far the billows stand out from a cloud's dome at its top, metres (and as far again cut into it). */
const BILLOW = 140;
/** The billows' mean (billows()), about which they stand out and cut in; and how far out they stand at most, as a multiple of their size. */
const LUMPS = 0.54;
const STANDS = 2 * (1 - LUMPS);
/** Billows at a cloud's foot, metres: a fifth of the top's. */
const FOOT = 25;
/**
 * The least excess at which there can be cloud at any height: where the billows at their highest
 * (STANDS times their size) stand out further than the dome is in from its edge. The dome narrows
 * upward faster than the billows grow, so this is at the foot, a little outside the field's edge.
 */
const REACHES = Math.min(
  ...Array.from({ length: 101 }, (_, i) => {
    const y = i / 100;
    return (TOWER * SIDE_M * y ** (4 / 3) - STANDS * (FOOT + (BILLOW - FOOT) * y)) / SIDE_M;
  }),
);
/** The Earth's mean radius: the layer is a shell this far plus its height from the centre under the site. */
const EARTH = 6_371_000;

const VERTEX = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** The cloud noise baked round the eye: its excess over the cut, from -BELOW to RANGE - BELOW, as 0 to 1. */
const bakeShader = (c: Clouds) => /* glsl */ `
  precision highp float; precision highp int;
  uniform vec2 uCorner;
  out vec4 oValue;
  ${fieldAs('bake_')}
  ${cloudNoiseGlsl(c, 'bake_')}
  void main() {
    float n = cloudNoise(uCorner + gl_FragCoord.xy * ${TEXEL.toFixed(1)});
    oValue = vec4(clamp((n - ${cloudMiddle(c).toFixed(4)} + ${BELOW.toFixed(3)}) / ${RANGE.toFixed(3)}, 0.0, 1.0), 0.0, 0.0, 1.0);
  }`;

/**
 * Where there is cloud, coarsely, for striding over clear air: the largest value over each block of
 * the texture below (`uMode` 0, `uBlock` texels a side); then how many cells away the nearest one
 * with any cloud in it is, in one row (1) and then in any direction (2: the larger of the two
 * offsets, so a square), up to REACH cells, as a count out of 255.
 */
const REDUCE = /* glsl */ `
  precision highp float; precision highp int;
  uniform sampler2D tFrom;
  uniform int uMode, uBlock;
  uniform float uOccupied;
  out vec4 oValue;
  void main() {
    ivec2 at = ivec2(gl_FragCoord.xy), size = textureSize(tFrom, 0);
    float m = 0.0;
    if (uMode == 0) {
      for (int y = 0; y < uBlock; y++) for (int x = 0; x < uBlock; x++) m = max(m, texelFetch(tFrom, at * uBlock + ivec2(x, y), 0).r);
    } else if (uMode == 1) {
      m = ${REACH + 1}.0;
      for (int x = -${REACH}; x <= ${REACH}; x++)
        if (texelFetch(tFrom, clamp(at + ivec2(x, 0), ivec2(0), size - 1), 0).r > uOccupied) m = min(m, float(abs(x)));
      m /= 255.0;
    } else {
      m = ${REACH + 1}.0;
      for (int y = -${REACH}; y <= ${REACH}; y++)
        m = min(m, max(float(abs(y)), texelFetch(tFrom, clamp(at + ivec2(0, y), ivec2(0), size - 1), 0).r * 255.0));
      m /= 255.0;
    }
    oValue = vec4(m, 0.0, 0.0, 1.0);
  }`;

/** What the march and the composite share: the scene's depth, as distance along the ray. */
const DEPTH = /* glsl */ `
  uniform sampler2D tDepth;
  uniform mat4 uProjInv;
  uniform vec2 uRange;
  // the ray through a point of the frame, in the camera's frame
  vec3 viewRay(vec2 uv) {
    vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    return normalize(v.xyz / v.w);
  }
  // how far along that ray the scene's surface is; the sky is endlessly far
  float sceneDistance(float depth, vec3 ray) {
    if (depth >= 1.0) return 1e9;
    float z = depth * 2.0 - 1.0;
    float n = uRange.x, f = uRange.y;
    return 2.0 * n * f / (f + n - z * (f - n)) / max(-ray.z, 1e-4);
  }`;

const marchShader = (scale: number) => /* glsl */ `
  precision highp float; precision highp int; precision highp sampler3D;
  ${DEPTH}
  uniform sampler2D tField, tClear;
  uniform sampler3D tBillows;
  uniform mat3 uTurn;        // the camera's turn: its frame to the world's
  uniform vec2 uLow;         // this target's size, pixels
  uniform vec2 uEye;         // the eye in the baked field's frame, metres from its corner
  uniform float uEyeH;       // the eye's height above the sea
  uniform float uRe;         // the Earth's radius plus that
  uniform vec3 uUp;          // straight up at the eye
  uniform vec2 uLayer;       // the clouds' base and greatest top above the sea
  uniform float uRise;       // how far the billows have risen
  uniform float uDome;       // a dome's height for each metre^(3/4) in from its edge
  uniform vec3 uSun, uSunLight, uSkyLight, uGroundLight, uHaze;
  uniform float uHazeDensity;
  uniform float uPixel;      // radians a low pixel
  uniform float uCel;
  in vec2 vUv;
  layout(location = 0) out vec4 oColour;   // light sent toward the eye (premultiplied), and opacity
  layout(location = 1) out vec4 oInfo;     // where the cloud began, where it was half opaque; its light (cel) and haze, per opacity

  #define EXTENT ${EXTENT.toFixed(1)}
  #define TILE ${TILE.toFixed(1)}
  #define SIGMA ${SIGMA.toFixed(4)}
  #define EARTH ${EARTH.toFixed(1)}

  // the height above the sea of a point v from the eye, on the Earth's curve (in the small form: floats hold it)
  float heightAt(vec3 v) {
    float s = 2.0 * uRe * dot(uUp, v) + dot(v, v);
    return uEyeH + s / (sqrt(uRe * uRe + s) + uRe);
  }
  // where the ray meets the sphere h above the sea: the nearer and further crossing; x > y if it misses
  vec2 shell(float h, float ud) {
    float b = uRe * ud;
    float c = (uEyeH - h) * (uRe + EARTH + h);
    float disc = b * b - c;
    if (disc < 0.0) return vec2(1.0, -1.0);
    float q = -(b + (b >= 0.0 ? 1.0 : -1.0) * sqrt(disc));
    float t0 = q, t1 = c / q;
    return vec2(min(t0, t1), max(t0, t1));
  }

  // how far inside a cloud the point v from the eye is, metres, roughly (negative outside); f: the same point in the
  // baked field's frame; y: its height in the layer, 0 at the base to 1 at the greatest top
  float inside(vec3 v, vec2 f, float lod, out float y) {
    float depth = uLayer.y - uLayer.x;
    float h = heightAt(v) - uLayer.x;
    y = h / depth;
    if (h < 0.0) return h;
    if (y > 1.0) return (1.0 - y) * depth;
    float x = texture(tField, f / EXTENT).r * ${RANGE.toFixed(3)} - ${BELOW.toFixed(3)};
    // the heap: a dome on the field, rising from its edge as the 3/4 power of the distance in from it, so steeply at
    // first and then rounding over; the biggest (the noise furthest over its cut) reaching the layer's full depth.
    // Measured across (metres in from its side at this height), so the sides are as sharp as the top.
    float heap = x * ${SIDE_M.toFixed(1)} - pow(h / uDome, 4.0 / 3.0);
    if (heap <= -${STANDS.toFixed(3)} * mix(${FOOT.toFixed(1)}, ${BILLOW.toFixed(1)}, y)) return heap; // (no billow reaches out so far)
    // and billows heaped on it and cut into it, bigger the higher up: lumps of 200, 95 and 45 m, so a cumulus is
    // cauliflower at the top and only scalloped at the foot
    vec3 b = textureLod(tBillows, vec3(f.x, h - uRise, f.y) / TILE, lod).rgb;
    float sd = heap + mix(${FOOT.toFixed(1)}, ${BILLOW.toFixed(1)}, y) * 2.0 * (dot(b, vec3(0.45, 0.33, 0.22)) - ${LUMPS.toFixed(3)});
    return min(sd, h); // the base is flat
  }
  // the cloud's extinction there, per metre: rising over \`ramp\` metres from its surface, and fading out far from the eye
  float density(vec3 v, float ramp, float lod, out float y) {
    float sd = inside(v, uEye + v.xz, lod, y);
    return SIGMA * smoothstep(0.0, ramp, sd) * (1.0 - smoothstep(${FADE[0].toFixed(1)}, ${FADE[1].toFixed(1)}, length(v.xz)));
  }

  float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }
  // forward scattering with a little back: so the side toward the Sun is bright and a thin edge against it glows
  float phase(float c, float g) { return mix(hg(c, g), hg(c, -0.2), 0.3); }

  // the fraction of the light lost to the haze between the eye and a point at height h above the sea and d away (air.ts: airFog)
  float hazeLost(float h, float d) {
    float a = max(uEyeH, 0.0) / ${scale.toFixed(1)};
    float b = max(h, 0.0) / ${scale.toFixed(1)};
    float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
    return 1.0 - exp(-uHazeDensity * d * mean);
  }

  void main() {
    vec2 px = 0.5 / uLow;
    // the furthest of the scene under this pixel: the frame's pixels nearer than the cloud are cut out when it is laid over
    float depth = max(max(texture(tDepth, vUv + vec2(-0.5, -0.5) * px).x, texture(tDepth, vUv + vec2(0.5, -0.5) * px).x),
                      max(texture(tDepth, vUv + vec2(-0.5, 0.5) * px).x, texture(tDepth, vUv + vec2(0.5, 0.5) * px).x));
    vec3 ray = viewRay(vUv);
    float far = sceneDistance(depth, ray);
    vec3 dir = normalize(uTurn * ray);
    oColour = vec4(0.0);
    oInfo = vec4(6e4, 6e4, 0.0, 0.0);

    // the stretch of the ray inside the layer
    float ud = dot(uUp, dir);
    vec2 base = shell(uLayer.x, ud), top = shell(uLayer.y, ud);
    float t0, t1;
    if (uEyeH < uLayer.x) {
      t0 = base.y;
      t1 = top.y;
    } else if (uEyeH < uLayer.y) {
      t0 = 0.0;
      t1 = base.x <= base.y && base.x > 0.0 ? base.x : top.y;
    } else {
      if (top.x > top.y || top.y < 0.0) return;
      t0 = max(top.x, 0.0);
      t1 = base.x <= base.y && base.x > 0.0 ? base.x : top.y;
    }
    // and no further than the haze lets anything through: 3 % of a cloud's light at the middle of the layer
    float a = max(uEyeH, 0.0) / ${scale.toFixed(1)}, b = 0.5 * (uLayer.x + uLayer.y) / ${scale.toFixed(1)};
    float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
    t1 = min(min(t1, far), 3.5 / max(uHazeDensity * mean, 1e-9));
    if (t1 <= t0) return;

    float cosT = dot(dir, uSun);
    vec3 phases = vec3(phase(cosT, 0.6), phase(cosT, 0.3), phase(cosT, 0.15));
    float powderMix = 0.5 - 0.5 * cosT;   // thin cloud is darker seen with the Sun behind
    float sunGain = 1.25;
    vec3 white = uSunLight + uSkyLight;
    float whiteLum = max(dot(white, vec3(0.2126, 0.7152, 0.0722)), 1e-5);
    float across = length(dir.xz);

    float T = 1.0, lit = 0.0, haze = 0.0, front = 6e4, mid = 6e4;
    vec3 colour = vec3(0.0);
    // Outside a cloud the ray strides over clear air; where it crosses into one the surface is found exactly
    // (bisection), and the march goes on from there in steps laid from the surface, short at first. So every pixel's
    // steps lie the same way through the cloud's skin as its neighbours': no rings, and nothing to hide with noise.
    float t = t0, was = t0;
    int deep = -1; // steps taken since the surface, or -1 while outside
    for (int i = 0; i < 256; i++) {
      if (t >= t1 || T < 0.01) break;
      vec3 v = dir * t;
      float st = clamp(t * 0.004, 6.0, 120.0);
      float lod = max(log2(max(t * uPixel, 1.0) / ${(TILE / NOISE).toFixed(1)}), 0.0);
      float y;
      if (deep < 0) {
        vec2 cell = (uEye + v.xz) / EXTENT;
        // the nearest cloud is k cells off: so the next k - 1 cells across, less a texel the field's filter reaches, are clear
        float k = texture(tClear, cell).r * 255.0;
        if (k >= 2.0) {
          t += across > 1e-4 ? ((k - 1.0) * ${CELL.toFixed(1)} - ${TEXEL.toFixed(1)}) / across : 1e9;
          was = t;
          continue;
        }
        float sd = inside(v, uEye + v.xz, lod, y);
        // (close to a surface the steps shorten, so a lump thinner than a step is not caught one frame and missed the next)
        if (sd <= 0.0) { was = t; t += max(min(st, 0.25 * st - 0.5 * sd), -0.8 * sd); continue; }
        float a = was, b = t;
        for (int k = 0; k < 6; k++) {
          float m = 0.5 * (a + b);
          vec3 w = dir * m;
          if (inside(w, uEye + w.xz, lod, y) > 0.0) b = m;
          else a = m;
        }
        t = a;
        deep = 0;
      }
      float step = st * min(0.25 + 0.35 * float(deep), 1.6);
      v = dir * (t + 0.5 * step);
      float ramp = max(18.0, st);
      float d = density(v, ramp, lod, y);
      if (d > 0.0) {
        // toward the Sun: how much cloud the light has come through
        float tau = 0.0, s = 0.0, yy;
        for (int k = 0; k < 5; k++) {
          float ds = 12.0 * exp2(float(k));
          s += ds * 0.5;
          tau += density(v + uSun * s, ramp, lod + float(k) * 0.5, yy) * ds;
          s += ds * 0.5;
        }
        // octaves of scattering: each deeper one less dimmed and less forward
        float sun = phases.x * exp(-tau) + 0.4 * phases.y * exp(-tau * 0.35) + 0.12 * phases.z * exp(-tau * 0.12);
        sun *= mix(1.0, 1.0 - exp(-d * 100.0), powderMix) * sunGain;
        // the sky's light is shut out of the creases between billows and from under more cloud
        vec3 up = v + uUp * 50.0;
        float open = 1.0 - 0.5 * smoothstep(0.0, 60.0, inside(up, uEye + up.xz, lod + 1.0, yy));
        vec3 light = uSunLight * sun + (uSkyLight * (0.3 + 0.6 * y) + uGroundLight * 0.25 * (1.0 - y)) * open;
        float hz = hazeLost(y * (uLayer.y - uLayer.x) + uLayer.x, t);
        float a = 1.0 - exp(-d * min(step, t1 - t));
        float w = T * a;
        colour += w * mix(light, uHaze, hz);
        lit += w * dot(light, vec3(0.2126, 0.7152, 0.0722)) / whiteLum;
        haze += w * hz;
        T *= 1.0 - a;
        if (front > 5e4 && T < 0.98) front = t;
        if (mid > 5e4 && T < 0.5) mid = t;
      }
      t += step;
      if (d <= 0.0 && inside(v, uEye + v.xz, lod, y) < -ramp) {
        deep = -1; // out again
        was = t;
      } else deep++;
    }
    float opacity = 1.0 - T;
    if (opacity < 1e-4) return;
    oColour = vec4(colour, opacity);
    oInfo = vec4(front, max(mid, front + 1.0), lit / opacity, haze / opacity);
  }`;

/** Laid over the frame where it is: premultiplied, blended onto what is there (one, one minus alpha). */
const COMPOSITE = /* glsl */ `
  precision highp float; precision highp int;
  ${DEPTH}
  uniform sampler2D tCloud, tInfo;
  uniform vec3 uSunLight, uSkyLight, uHaze;
  uniform float uCel;
  in vec2 vUv;
  out vec4 oColour;
  void main() {
    ivec2 size = textureSize(tCloud, 0);
    vec2 p = vUv * vec2(size) - 0.5;
    vec2 i0 = floor(p), fr = p - i0;
    ivec2 at[4];
    vec4 c[4];
    float any = 0.0;
    for (int k = 0; k < 4; k++) {
      at[k] = clamp(ivec2(i0) + ivec2(k & 1, k >> 1), ivec2(0), size - 1);
      c[k] = texelFetch(tCloud, at[k], 0);
      any += c[k].a;
    }
    // (the real look has no derivatives to keep, so most of the frame, under no cloud, stops here)
    if (uCel < 0.5 && any <= 0.0) discard;
    float d = sceneDistance(texture(tDepth, vUv).x, viewRay(vUv));
    vec4 cloud = vec4(0.0);
    float lit = 0.0, haze = 0.0;
    for (int k = 0; k < 4; k++) {
      vec4 info = texelFetch(tInfo, at[k], 0);
      // only the cloud this pixel's own surface lies beyond
      float w = ((k & 1) == 1 ? fr.x : 1.0 - fr.x) * ((k >> 1) == 1 ? fr.y : 1.0 - fr.y) * smoothstep(info.x, info.y, d);
      cloud += w * c[k];
      lit += w * c[k].a * info.z;
      haze += w * c[k].a * info.w;
    }
    if (uCel < 0.5) {
      oColour = cloud;
      return;
    }
    // drawn: cut at half opacity, in two tones, at this resolution
    float a = cloud.a;
    float edge = max(fwidth(a), 1e-3);
    float alpha = smoothstep(0.5 - edge, 0.5 + edge, a);
    float l = lit / max(a, 1e-4);
    float le = max(fwidth(l), 1e-3);
    vec3 tone = mix(uSkyLight * 1.1 + uSunLight * 0.35, uSunLight * 0.95 + uSkyLight, smoothstep(0.62 - le, 0.62 + le, l));
    tone = mix(tone, uHaze, haze / max(a, 1e-4));
    if (alpha <= 0.0) discard;
    oColour = vec4(tone * alpha, alpha);
  }`;

/**
 * The billows: three octaves of round lumps (cellular noise made into balls: 1 at a lump's heart,
 * falling to 0 in the creases between), 5, 11 and 23 to a tile, in red, green and blue; each has a
 * mean of 0.54 (LUMPS). It repeats every NOISE texels.
 */
function billows(): THREE.Data3DTexture {
  const n = NOISE;
  const data = new Uint8Array(n * n * n * 4);
  [5, 11, 23].forEach((cells, channel) => {
    const points = new Float32Array(cells * cells * cells * 3);
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++)
        for (let k = 0; k < cells; k++) {
          const at = ((i * cells + j) * cells + k) * 3;
          for (let a = 0; a < 3; a++) points[at + a] = hash2(i * cells + j, k, 700 + channel * 3 + a);
        }
    const per = n / cells; // texels a cell
    const wrap = (c: number) => ((c % cells) + cells) % cells;
    for (let z = 0; z < n; z++)
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const px = (x + 0.5) / per,
            py = (y + 0.5) / per,
            pz = (z + 0.5) / per;
          const cx = Math.floor(px),
            cy = Math.floor(py),
            cz = Math.floor(pz);
          let best = 9;
          for (let dz = -1; dz <= 1; dz++)
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const at = ((wrap(cx + dx) * cells + wrap(cy + dy)) * cells + wrap(cz + dz)) * 3;
                const ex = cx + dx + points[at]! - px,
                  ey = cy + dy + points[at + 1]! - py,
                  ez = cz + dz + points[at + 2]! - pz;
                best = Math.min(best, ex * ex + ey * ey + ez * ez);
              }
          data[((z * n + y) * n + x) * 4 + channel] = Math.round(255 * Math.sqrt(Math.max(0, 1 - best * 2.2))); // a ball, not a cone
        }
  });
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const texture = new THREE.Data3DTexture(data, n, n, n);
  texture.format = THREE.RGBAFormat;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const target = (size: number, linear: boolean) =>
  new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RedFormat,
    type: THREE.UnsignedByteType,
    minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
    magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
    depthBuffer: false,
    generateMipmaps: false,
  });

const raw = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

/** Marks the scene's depth as it stands straight after the scene is drawn, for the clouds laid over later. Goes after the scene's pass. */
export class DepthMark extends Pass {
  texture: THREE.DepthTexture | null = null;
  constructor() {
    super();
    this.needsSwap = false;
  }
  render(_renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget): void {
    this.texture = read.depthTexture;
  }
}

/**
 * The clouds' pass: marches them and lays them over the frame. It goes after the ink and before
 * the outline and bloom; `mark` goes straight after the scene. Does nothing where no air with
 * clouds is installed (air.ts) or the scene has no haze (a studio, orbit).
 */
export class CloudPass extends Pass {
  readonly mark = new DepthMark();
  /** The cel look: cut at half opacity, two flat tones. */
  cel = false;
  private readonly quad = new FullScreenQuad();
  private readonly low = new THREE.WebGLRenderTarget(1, 1, {
    count: 2,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  private readonly field = target(SIDE, true);
  private readonly cells = target(SIDE / (CELL / TEXEL), false);
  private readonly row = target(SIDE / (CELL / TEXEL), false);
  private readonly clearAir = target(SIDE / (CELL / TEXEL), false);
  private bakeMaterial: THREE.RawShaderMaterial | null = null;
  private march: THREE.RawShaderMaterial | null = null;
  private readonly reduce = raw(REDUCE, {
    tFrom: { value: null },
    uMode: { value: 0 },
    uBlock: { value: CELL / TEXEL },
    uOccupied: { value: (BELOW + REACHES) / RANGE - 0.5 / 255 },
  });
  private readonly composite: THREE.RawShaderMaterial;
  private readonly uniforms = {
    tDepth: { value: null as THREE.Texture | null },
    uProjInv: { value: new THREE.Matrix4() },
    uRange: { value: new THREE.Vector2(0.1, 1000) },
    tField: { value: this.field.texture },
    tClear: { value: this.clearAir.texture },
    tBillows: { value: null as THREE.Data3DTexture | null },
    uTurn: { value: new THREE.Matrix3() },
    uLow: { value: new THREE.Vector2(1, 1) },
    uEye: { value: new THREE.Vector2() },
    uEyeH: { value: 0 },
    uRe: { value: EARTH },
    uUp: { value: new THREE.Vector3(0, 1, 0) },
    uLayer: { value: new THREE.Vector2(720, 1370) },
    uRise: cloudRise,
    uDome: { value: 1 },
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uSunLight: { value: new THREE.Color() },
    uSkyLight: { value: new THREE.Color() },
    uGroundLight: { value: new THREE.Color() },
    uHaze: { value: new THREE.Color() },
    uHazeDensity: { value: 0 },
    uPixel: { value: 0.001 },
    uCel: { value: 0 },
    tCloud: { value: this.low.textures[0]! },
    tInfo: { value: this.low.textures[1]! },
  };
  /** What was baked: for which clouds, round which point of the field (its frame, metres). */
  private baked: { clouds: Clouds; x: number; z: number } | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private sky: THREE.HemisphereLight | null = null;
  private readonly eye = new THREE.Vector3();
  private readonly turn = new THREE.Matrix4();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    super();
    this.composite = raw(COMPOSITE, this.uniforms);
    this.composite.blending = THREE.CustomBlending;
    this.composite.blendSrc = THREE.OneFactor;
    this.composite.blendDst = THREE.OneMinusSrcAlphaFactor;
    this.composite.blendSrcAlpha = THREE.ZeroFactor;
    this.composite.blendDstAlpha = THREE.OneFactor;
    this.composite.transparent = true;
    this.needsSwap = false;
  }

  /** Half the window's size each way in CSS pixels (a quarter of its pixels on a plain screen, a sixteenth on a dense one). */
  private fit(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget): void {
    const step = 2 * Math.max(1, renderer.getPixelRatio());
    const w = Math.max(1, Math.ceil(frame.width / step)),
      h = Math.max(1, Math.ceil(frame.height / step));
    if (w === this.low.width && h === this.low.height) return;
    this.low.setSize(w, h);
    this.uniforms.uLow.value.set(w, h);
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    const air = installedAir();
    const clouds = air?.clouds;
    const fog = this.scene.fog as THREE.FogExp2 | null;
    if (!air || !clouds || !fog || !this.mark.texture) return;
    this.fit(renderer, readBuffer);
    const u = this.uniforms;
    const camera = this.camera;
    // the eye in the scene's frame: the scene is drawn from it (origin.ts), so it is the origin's place plus the camera's
    const o = uOrigin.value;
    const eye = this.eye.set(camera.position.x + o.x, camera.position.y + o.y, camera.position.z + o.z);
    const fx = eye.x - cloudUniform.value.x,
      fz = eye.z - cloudUniform.value.z;
    this.bake(renderer, clouds, fx, fz);
    const baked = this.baked!;
    u.uEye.value.set(fx - baked.x + EXTENT / 2, fz - baked.z + EXTENT / 2);
    // the Earth's centre lies under the site's origin, its radius below the sea
    const cy = eye.y - (air.base - EARTH);
    const r = Math.hypot(eye.x, cy, eye.z);
    u.uEyeH.value = r - EARTH;
    u.uRe.value = r;
    u.uUp.value.set(eye.x / r, cy / r, eye.z / r);
    u.uLayer.value.set(clouds.height, clouds.height + clouds.depth);
    u.uDome.value = clouds.depth / (TOWER * SIDE_M) ** 0.75;
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uRange.value.set(camera.near, camera.far);
    u.uTurn.value.setFromMatrix4(this.turn.extractRotation(camera.matrixWorld));
    u.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / u.uLow.value.y;
    u.tDepth.value = this.mark.texture;
    u.uCel.value = Number(this.cel);
    this.light(fog);

    this.march ??= raw(marchShader(air.scale), u);
    u.tBillows.value ??= billows();
    renderer.setRenderTarget(this.low);
    this.quad.material = this.march;
    this.quad.render(renderer);

    // over the frame as it stands, in place
    // (the depth is the scene's still: it need not be resolved out of the multisampled buffer again)
    const autoClear = renderer.autoClear,
      resolve = readBuffer.resolveDepthBuffer;
    renderer.autoClear = false;
    readBuffer.resolveDepthBuffer = false;
    renderer.setRenderTarget(readBuffer);
    this.quad.material = this.composite;
    this.quad.render(renderer);
    renderer.autoClear = autoClear;
    readBuffer.resolveDepthBuffer = resolve;
  }

  /** Bake the field round the eye (x, z in the field's frame) if it has gone far over the last bake. */
  private bake(renderer: THREE.WebGLRenderer, clouds: Clouds, x: number, z: number): void {
    const b = this.baked;
    if (b && b.clouds === clouds && Math.abs(x - b.x) < REBAKE && Math.abs(z - b.z) < REBAKE) return;
    const cx = Math.round(x / SNAP) * SNAP,
      cz = Math.round(z / SNAP) * SNAP;
    if (!b || b.clouds !== clouds) {
      this.bakeMaterial?.dispose();
      this.bakeMaterial = raw(bakeShader(clouds), { uCorner: { value: new THREE.Vector2() } });
    }
    this.baked = { clouds, x: cx, z: cz };
    const bake = this.bakeMaterial!;
    (bake.uniforms.uCorner!.value as THREE.Vector2).set(cx - EXTENT / 2, cz - EXTENT / 2);
    const was = renderer.getRenderTarget();
    this.quad.material = bake;
    renderer.setRenderTarget(this.field);
    this.quad.render(renderer);
    // where there is any cloud: the largest value in each cell; then how far each cell is from one with any
    this.quad.material = this.reduce;
    const pass = (from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, mode: number) => {
      this.reduce.uniforms.tFrom!.value = from.texture;
      this.reduce.uniforms.uMode!.value = mode;
      renderer.setRenderTarget(to);
      this.quad.render(renderer);
    };
    pass(this.field, this.cells, 0);
    pass(this.cells, this.row, 1);
    pass(this.row, this.clearAir, 2);
    renderer.setRenderTarget(was);
  }

  /** The scene's light: its Sun (or Moon), its sky and what the ground sends up, and the haze as seen from where the eye is. */
  private light(fog: THREE.FogExp2): void {
    if (!this.sun || !this.sky)
      this.scene.traverse((o) => {
        if ((o as THREE.DirectionalLight).isDirectionalLight && !this.sun) this.sun = o as THREE.DirectionalLight;
        if ((o as THREE.HemisphereLight).isHemisphereLight && !this.sky) this.sky = o as THREE.HemisphereLight;
      });
    const u = this.uniforms;
    if (this.sun) {
      u.uSun.value.subVectors(this.sun.position, this.sun.target.position).normalize();
      u.uSunLight.value.copy(this.sun.color).multiplyScalar(this.sun.intensity / Math.PI);
    }
    if (this.sky) {
      u.uSkyLight.value.copy(this.sky.color).multiplyScalar(this.sky.intensity);
      u.uGroundLight.value.copy(this.sky.groundColor).multiplyScalar(this.sky.intensity);
    }
    // air.ts's hazeSeen: from above, the haze sends back a neutral third of its light
    const c = fog.color;
    const grey = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const above = hazeAboveUniform.value.x;
    u.uHaze.value.setRGB(
      c.r + (grey * 0.86 * 0.33 - c.r) * above,
      c.g + (grey * 0.95 * 0.33 - c.g) * above,
      c.b + (grey * 1.1 * 0.33 - c.b) * above,
    );
    u.uHazeDensity.value = fog.density;
  }

  dispose(): void {
    for (const t of [this.low, this.field, this.cells, this.row, this.clearAir]) t.dispose();
    this.uniforms.tBillows.value?.dispose();
    this.quad.dispose();
  }
}
